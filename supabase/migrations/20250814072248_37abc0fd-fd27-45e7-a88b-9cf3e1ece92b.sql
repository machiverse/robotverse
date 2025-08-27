-- Add company logo field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN company_logo_url text;