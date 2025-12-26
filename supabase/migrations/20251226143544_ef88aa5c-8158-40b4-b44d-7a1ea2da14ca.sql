-- Add component_type column to spare_parts table
ALTER TABLE public.spare_parts 
ADD COLUMN IF NOT EXISTS component_type text;

-- Add category column to store the top-level category (Robot Parts, Devices, Tools, Software)
ALTER TABLE public.spare_parts 
ADD COLUMN IF NOT EXISTS category text;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_spare_parts_category ON public.spare_parts(category);
CREATE INDEX IF NOT EXISTS idx_spare_parts_subcategory ON public.spare_parts(main_category);
CREATE INDEX IF NOT EXISTS idx_spare_parts_component_type ON public.spare_parts(component_type);