-- Create table for user requests/interactions
CREATE TABLE public.user_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  seller_id UUID NOT NULL,
  request_type TEXT NOT NULL, -- 'get_quote', 'contact', 'apply_loan', etc.
  item_type TEXT NOT NULL, -- 'robot', 'spare_part', 'service', 'logistics', 'financing'
  item_id UUID,
  item_name TEXT,
  user_name TEXT NOT NULL,
  company_name TEXT,
  mobile_number TEXT,
  email_address TEXT NOT NULL,
  location TEXT,
  requirements TEXT,
  urgency TEXT DEFAULT 'medium',
  additional_data JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'responded', 'closed'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can create their own requests" 
ON public.user_requests 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own requests" 
ON public.user_requests 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Sellers can view requests for their items" 
ON public.user_requests 
FOR SELECT 
USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can update request status" 
ON public.user_requests 
FOR UPDATE 
USING (auth.uid() = seller_id);

-- Create table for seller notifications
CREATE TABLE public.seller_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL,
  request_id UUID REFERENCES public.user_requests(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL DEFAULT 'new_request',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for notifications
ALTER TABLE public.seller_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers can view their own notifications" 
ON public.seller_notifications 
FOR SELECT 
USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can update their notification read status" 
ON public.seller_notifications 
FOR UPDATE 
USING (auth.uid() = seller_id);

-- Create function to automatically create notifications
CREATE OR REPLACE FUNCTION public.create_seller_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.seller_notifications (
    seller_id, 
    request_id, 
    title, 
    message
  ) VALUES (
    NEW.seller_id, 
    NEW.id,
    'New ' || NEW.request_type || ' request',
    'You have received a new ' || NEW.request_type || ' request from ' || NEW.user_name || ' for ' || NEW.item_name
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for notifications
CREATE TRIGGER trigger_create_seller_notification
  AFTER INSERT ON public.user_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.create_seller_notification();

-- Add updated_at trigger
CREATE TRIGGER update_user_requests_updated_at
  BEFORE UPDATE ON public.user_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();