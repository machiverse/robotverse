-- Add container pricing columns to logistics_services table
ALTER TABLE public.logistics_services 
ADD COLUMN container_20ft_min numeric,
ADD COLUMN container_20ft_max numeric, 
ADD COLUMN container_40ft_min numeric,
ADD COLUMN container_40ft_max numeric;