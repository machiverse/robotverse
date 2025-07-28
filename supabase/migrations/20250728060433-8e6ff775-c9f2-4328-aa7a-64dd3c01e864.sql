-- Add service_categories column to profiles table for storing selected service categories
ALTER TABLE public.profiles 
ADD COLUMN service_categories TEXT[] DEFAULT '{}';

-- Add comment to explain the column
COMMENT ON COLUMN public.profiles.service_categories IS 'Array of service categories that a service provider offers (e.g., installation, maintenance, etc.)';