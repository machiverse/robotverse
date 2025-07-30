-- Create service_categories table for organizing services
CREATE TABLE public.service_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access to service categories
CREATE POLICY "Service categories are viewable by everyone" 
ON public.service_categories 
FOR SELECT 
USING (true);

-- Create policy for admin management (if needed later)
CREATE POLICY "Only admins can manage service categories" 
ON public.service_categories 
FOR ALL 
USING (false); -- For now, disable all write access

-- Insert default service categories
INSERT INTO public.service_categories (name, description) VALUES
('Maintenance & Repair', 'Services for robot maintenance and repair'),
('Installation & Setup', 'Services for robot installation and setup'),
('Programming & Software', 'Services for robot programming and software development'),
('Training & Consulting', 'Services for training and consulting'),
('Specialized Services', 'Specialized robot services and custom solutions');

-- Add RLS policies to states table if it doesn't have them
CREATE POLICY IF NOT EXISTS "States are viewable by everyone" 
ON public.states 
FOR SELECT 
USING (true);