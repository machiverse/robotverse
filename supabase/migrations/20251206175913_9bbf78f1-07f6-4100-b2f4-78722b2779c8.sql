-- Create buyer access requests table for seller-to-admin approval workflow
CREATE TABLE public.buyer_access_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL,
  buyer_id UUID NOT NULL,
  inquiry_id UUID NOT NULL,
  inquiry_type TEXT NOT NULL, -- 'robot', 'spare_part', 'service', 'logistics', 'finance'
  item_id UUID,
  item_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  admin_notes TEXT,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.buyer_access_requests ENABLE ROW LEVEL SECURITY;

-- Sellers can view their own access requests
CREATE POLICY "Sellers can view their own access requests"
ON public.buyer_access_requests
FOR SELECT
USING (auth.uid() = seller_id);

-- Sellers can create access requests
CREATE POLICY "Sellers can create access requests"
ON public.buyer_access_requests
FOR INSERT
WITH CHECK (auth.uid() = seller_id);

-- Admins can view all access requests
CREATE POLICY "Admins can view all access requests"
ON public.buyer_access_requests
FOR SELECT
USING (is_admin());

-- Admins can update access requests (approve/reject)
CREATE POLICY "Admins can update access requests"
ON public.buyer_access_requests
FOR UPDATE
USING (is_admin());

-- Create indexes for faster queries
CREATE INDEX idx_buyer_access_requests_seller_id ON public.buyer_access_requests(seller_id);
CREATE INDEX idx_buyer_access_requests_status ON public.buyer_access_requests(status);
CREATE INDEX idx_buyer_access_requests_inquiry_id ON public.buyer_access_requests(inquiry_id);

-- Create unique constraint to prevent duplicate requests
CREATE UNIQUE INDEX idx_unique_access_request ON public.buyer_access_requests(seller_id, inquiry_id);

-- Trigger to update updated_at
CREATE TRIGGER update_buyer_access_requests_updated_at
BEFORE UPDATE ON public.buyer_access_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to check if seller has approved access to a buyer inquiry
CREATE OR REPLACE FUNCTION public.has_buyer_access(p_seller_id uuid, p_inquiry_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.buyer_access_requests
    WHERE seller_id = p_seller_id
      AND inquiry_id = p_inquiry_id
      AND status = 'approved'
  )
$$;

-- Function to get masked or real buyer info based on access
CREATE OR REPLACE FUNCTION public.get_buyer_info(
  p_seller_id uuid,
  p_inquiry_id uuid,
  p_buyer_name text,
  p_company_name text,
  p_mobile_number text,
  p_email text
)
RETURNS TABLE(
  buyer_name text,
  company_name text,
  mobile_number text,
  email text,
  has_access boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF has_buyer_access(p_seller_id, p_inquiry_id) THEN
    RETURN QUERY SELECT 
      p_buyer_name,
      p_company_name,
      p_mobile_number,
      p_email,
      true;
  ELSE
    RETURN QUERY SELECT 
      'XXXXX'::text,
      'XXXXX'::text,
      'XXXXX'::text,
      'XXXXX'::text,
      false;
  END IF;
END;
$$;