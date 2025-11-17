-- Add main_category and sub_category fields to spare_parts table
ALTER TABLE spare_parts 
ADD COLUMN IF NOT EXISTS main_category text,
ADD COLUMN IF NOT EXISTS sub_category text,
ADD COLUMN IF NOT EXISTS custom_category text;