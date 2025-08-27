-- Create loan_applications table
CREATE TABLE public.loan_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id TEXT NOT NULL DEFAULT ('LA' || EXTRACT(year FROM now()) || LPAD((nextval('request_sequence'::regclass))::text, 6, '0')),
  applicant_id UUID,
  provider_id UUID,
  applicant_name TEXT NOT NULL,
  applicant_email TEXT,
  applicant_phone TEXT,
  business_type TEXT,
  loan_type TEXT NOT NULL,
  amount_requested NUMERIC NOT NULL,
  purpose TEXT,
  monthly_income NUMERIC,
  credit_score INTEGER,
  business_vintage_months INTEGER,
  collateral_offered TEXT,
  status TEXT DEFAULT 'pending',
  applied_date DATE DEFAULT CURRENT_DATE,
  documents_submitted TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create loan_schemes table
CREATE TABLE public.loan_schemes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL,
  scheme_name TEXT NOT NULL,
  scheme_type TEXT NOT NULL,
  description TEXT,
  interest_rate_min NUMERIC NOT NULL,
  interest_rate_max NUMERIC NOT NULL,
  max_amount NUMERIC NOT NULL,
  min_tenure_months INTEGER DEFAULT 1,
  max_tenure_months INTEGER NOT NULL,
  processing_fee_percentage NUMERIC DEFAULT 0,
  eligibility_criteria TEXT,
  features TEXT[] DEFAULT '{}',
  is_government_scheme BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.loan_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_schemes ENABLE ROW LEVEL SECURITY;

-- Policies for loan_applications
CREATE POLICY "Applicants can view their own applications" 
ON public.loan_applications 
FOR SELECT 
USING (applicant_id = auth.uid());

CREATE POLICY "Providers can view applications for their schemes" 
ON public.loan_applications 
FOR SELECT 
USING (provider_id = auth.uid());

CREATE POLICY "Users can create loan applications" 
ON public.loan_applications 
FOR INSERT 
WITH CHECK (applicant_id = auth.uid());

CREATE POLICY "Providers can update application status" 
ON public.loan_applications 
FOR UPDATE 
USING (provider_id = auth.uid());

-- Policies for loan_schemes
CREATE POLICY "Providers can manage their own schemes" 
ON public.loan_schemes 
FOR ALL 
USING (provider_id = auth.uid());

CREATE POLICY "Anyone can view active schemes" 
ON public.loan_schemes 
FOR SELECT 
USING (is_active = true);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_loan_applications_updated_at
BEFORE UPDATE ON public.loan_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_loan_schemes_updated_at
BEFORE UPDATE ON public.loan_schemes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();