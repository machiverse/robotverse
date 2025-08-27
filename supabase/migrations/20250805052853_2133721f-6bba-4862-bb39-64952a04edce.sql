-- Add missing fields to spare_parts table for comprehensive part management
ALTER TABLE public.spare_parts 
ADD COLUMN brand text,
ADD COLUMN model text,
ADD COLUMN condition text DEFAULT 'new',
ADD COLUMN state text,
ADD COLUMN pincode text,
ADD COLUMN duty_amount numeric DEFAULT 0,
ADD COLUMN shipping_amount numeric DEFAULT 0,
ADD COLUMN is_international boolean DEFAULT false;