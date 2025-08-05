-- Create loan_products table for storing custom loan products
CREATE TABLE public.loan_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL,
  product_name TEXT NOT NULL,
  loan_type TEXT NOT NULL,
  professional_types TEXT[] DEFAULT '{}',
  description TEXT,
  min_amount NUMERIC DEFAULT 0,
  max_amount NUMERIC NOT NULL,
  min_interest_rate NUMERIC DEFAULT 0,
  max_interest_rate NUMERIC DEFAULT 0,
  min_tenure_months INTEGER DEFAULT 1,
  max_tenure_months INTEGER DEFAULT 12,
  processing_fee_percentage NUMERIC DEFAULT 0,
  eligibility_criteria TEXT,
  required_documents TEXT[] DEFAULT '{}',
  collateral_required BOOLEAN DEFAULT false,
  quick_approval BOOLEAN DEFAULT false,
  digital_process BOOLEAN DEFAULT false,
  prepayment_allowed BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.loan_products ENABLE ROW LEVEL SECURITY;

-- Create policies for loan products
CREATE POLICY "Finance providers can view their own products" 
ON public.loan_products 
FOR SELECT 
USING (provider_id = auth.uid());

CREATE POLICY "Finance providers can create their own products" 
ON public.loan_products 
FOR INSERT 
WITH CHECK (provider_id = auth.uid());

CREATE POLICY "Finance providers can update their own products" 
ON public.loan_products 
FOR UPDATE 
USING (provider_id = auth.uid());

CREATE POLICY "Finance providers can delete their own products" 
ON public.loan_products 
FOR DELETE 
USING (provider_id = auth.uid());

-- Anyone can view active loan products (for marketplace)
CREATE POLICY "Anyone can view active loan products" 
ON public.loan_products 
FOR SELECT 
USING (is_active = true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_loan_products_updated_at
BEFORE UPDATE ON public.loan_products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();