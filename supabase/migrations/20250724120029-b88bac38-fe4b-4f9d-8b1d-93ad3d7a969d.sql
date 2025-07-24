-- Add new columns to profiles table for enhanced user data
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mobile_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_type TEXT CHECK (account_type IN ('buyer', 'seller', 'logistics', 'finance'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS seller_roles TEXT[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS logistics_type TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS logistics_region TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS transport_modes TEXT[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS warehouse_storage BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS finance_type TEXT[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS financing_for TEXT[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS target_audience TEXT[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS government_scheme_support BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mou_agreed BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mou_agreed_at TIMESTAMP WITH TIME ZONE;

-- Create robots table for robot listings
CREATE TABLE public.robots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  model TEXT,
  robot_type TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  location TEXT,
  availability TEXT DEFAULT 'available',
  price DECIMAL(12,2),
  currency TEXT DEFAULT 'INR',
  technical_specifications JSONB DEFAULT '{}',
  category_tags TEXT[] DEFAULT '{}',
  images TEXT[] DEFAULT '{}',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on robots table
ALTER TABLE public.robots ENABLE ROW LEVEL SECURITY;

-- Create policies for robots table
CREATE POLICY "Anyone can view robots" 
ON public.robots 
FOR SELECT 
USING (true);

CREATE POLICY "Sellers can create their own robot listings" 
ON public.robots 
FOR INSERT 
WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update their own robot listings" 
ON public.robots 
FOR UPDATE 
USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can delete their own robot listings" 
ON public.robots 
FOR DELETE 
USING (auth.uid() = seller_id);

-- Create spare_parts table
CREATE TABLE public.spare_parts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  part_number TEXT,
  compatible_robots TEXT[] DEFAULT '{}',
  quantity INTEGER NOT NULL DEFAULT 1,
  location TEXT,
  price DECIMAL(12,2),
  currency TEXT DEFAULT 'INR',
  specifications JSONB DEFAULT '{}',
  category_tags TEXT[] DEFAULT '{}',
  images TEXT[] DEFAULT '{}',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on spare_parts table
ALTER TABLE public.spare_parts ENABLE ROW LEVEL SECURITY;

-- Create policies for spare_parts table
CREATE POLICY "Anyone can view spare parts" 
ON public.spare_parts 
FOR SELECT 
USING (true);

CREATE POLICY "Sellers can create their own spare parts listings" 
ON public.spare_parts 
FOR INSERT 
WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update their own spare parts listings" 
ON public.spare_parts 
FOR UPDATE 
USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can delete their own spare parts listings" 
ON public.spare_parts 
FOR DELETE 
USING (auth.uid() = seller_id);

-- Create services table
CREATE TABLE public.services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  service_type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  location TEXT,
  price_range TEXT,
  specializations TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on services table
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Create policies for services table
CREATE POLICY "Anyone can view services" 
ON public.services 
FOR SELECT 
USING (true);

CREATE POLICY "Providers can create their own services" 
ON public.services 
FOR INSERT 
WITH CHECK (auth.uid() = provider_id);

CREATE POLICY "Providers can update their own services" 
ON public.services 
FOR UPDATE 
USING (auth.uid() = provider_id);

CREATE POLICY "Providers can delete their own services" 
ON public.services 
FOR DELETE 
USING (auth.uid() = provider_id);

-- Create document_uploads table for storing uploaded documents
CREATE TABLE public.document_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on document_uploads table
ALTER TABLE public.document_uploads ENABLE ROW LEVEL SECURITY;

-- Create policies for document_uploads table
CREATE POLICY "Users can view their own documents" 
ON public.document_uploads 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can upload their own documents" 
ON public.document_uploads 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Add triggers for updated_at timestamps
CREATE TRIGGER update_robots_updated_at
BEFORE UPDATE ON public.robots
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_spare_parts_updated_at
BEFORE UPDATE ON public.spare_parts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_services_updated_at
BEFORE UPDATE ON public.services
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_robots_seller_id ON public.robots(seller_id);
CREATE INDEX idx_robots_robot_type ON public.robots(robot_type);
CREATE INDEX idx_robots_location ON public.robots(location);
CREATE INDEX idx_spare_parts_seller_id ON public.spare_parts(seller_id);
CREATE INDEX idx_services_provider_id ON public.services(provider_id);
CREATE INDEX idx_profiles_account_type ON public.profiles(account_type);
CREATE INDEX idx_profiles_location ON public.profiles(location);