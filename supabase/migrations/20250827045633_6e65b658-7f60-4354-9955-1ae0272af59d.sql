-- Add missing controller_type column to robots table
ALTER TABLE public.robots 
ADD COLUMN IF NOT EXISTS controller_type TEXT;