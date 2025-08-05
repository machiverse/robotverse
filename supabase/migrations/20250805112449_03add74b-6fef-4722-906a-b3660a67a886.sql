-- Update loan_products table to support multiple loan types and remove professional_types
ALTER TABLE public.loan_products 
DROP COLUMN professional_types,
ALTER COLUMN loan_type TYPE TEXT[] USING ARRAY[loan_type];