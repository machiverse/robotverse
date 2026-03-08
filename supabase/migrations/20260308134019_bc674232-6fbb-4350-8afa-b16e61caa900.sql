
-- User Product Requests table
CREATE TABLE public.user_product_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_type TEXT NOT NULL CHECK (product_type IN ('robot', 'spare_part', 'service')),
  product_name TEXT NOT NULL,
  brand TEXT,
  specifications TEXT,
  quantity INTEGER DEFAULT 1,
  budget TEXT,
  location TEXT,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  status TEXT NOT NULL DEFAULT 'new_request' CHECK (status IN ('new_request', 'seller_assigned', 'quote_submitted', 'negotiation', 'closed', 'completed')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Request Assignments table (admin assigns sellers to requests)
CREATE TABLE public.request_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES public.user_product_requests(id) ON DELETE CASCADE NOT NULL,
  seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  assigned_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'quote_submitted', 'completed')),
  seller_notes TEXT,
  quotation_amount NUMERIC,
  quotation_details TEXT,
  product_details TEXT,
  response_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_product_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_assignments ENABLE ROW LEVEL SECURITY;

-- RLS for user_product_requests
CREATE POLICY "Users can view their own requests" ON public.user_product_requests
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own requests" ON public.user_product_requests
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all requests" ON public.user_product_requests
  FOR SELECT TO authenticated USING (public.is_admin());

CREATE POLICY "Admins can update all requests" ON public.user_product_requests
  FOR UPDATE TO authenticated USING (public.is_admin());

-- RLS for request_assignments
CREATE POLICY "Sellers can view their assignments" ON public.request_assignments
  FOR SELECT TO authenticated USING (seller_id = auth.uid());

CREATE POLICY "Sellers can update their assignments" ON public.request_assignments
  FOR UPDATE TO authenticated USING (seller_id = auth.uid());

CREATE POLICY "Admins can manage all assignments" ON public.request_assignments
  FOR ALL TO authenticated USING (public.is_admin());

-- Auto-update timestamps
CREATE TRIGGER update_user_product_requests_updated_at
  BEFORE UPDATE ON public.user_product_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_request_assignments_updated_at
  BEFORE UPDATE ON public.request_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to auto-create lead when request is submitted
CREATE OR REPLACE FUNCTION public.auto_create_lead_from_request()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Create notification for all admins
  INSERT INTO public.notifications (user_id, notification_type, title, message, reference_id, reference_type, is_read)
  SELECT p.user_id, 'user_request', 'New Product Request', 
    'A user submitted a request for ' || NEW.product_type || ': ' || NEW.product_name,
    NEW.id, 'user_product_request', false
  FROM public.profiles p
  WHERE p.account_type = 'admin' OR 'admin' = ANY(p.user_roles);
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_admin_on_product_request
  AFTER INSERT ON public.user_product_requests
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_lead_from_request();

-- Function to notify seller when assigned
CREATE OR REPLACE FUNCTION public.notify_seller_on_assignment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_request RECORD;
BEGIN
  SELECT product_name, product_type INTO v_request
  FROM public.user_product_requests WHERE id = NEW.request_id;
  
  INSERT INTO public.notifications (user_id, notification_type, title, message, reference_id, reference_type, is_read)
  VALUES (NEW.seller_id, 'request_assignment', 'New Request Assigned to You',
    'You have been assigned a ' || v_request.product_type || ' request for: ' || v_request.product_name,
    NEW.request_id, 'user_product_request', false);
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_seller_on_request_assignment
  AFTER INSERT ON public.request_assignments
  FOR EACH ROW EXECUTE FUNCTION public.notify_seller_on_assignment();
