-- Fix security warnings from the linter

-- Fix search_path for the function to make it immutable
CREATE OR REPLACE FUNCTION public.get_provider_public_info(provider_user_id uuid)
RETURNS TABLE(
  user_id uuid,
  full_name text,
  company_name text,
  location text,
  user_type text,
  account_type text,
  service_categories text[],
  user_roles text[],
  registration_complete boolean
) 
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
  SELECT 
    p.user_id,
    p.full_name,
    p.company_name,
    p.location,
    p.user_type,
    p.account_type,
    p.service_categories,
    p.user_roles,
    p.registration_complete
  FROM public.profiles p
  WHERE p.user_id = provider_user_id
  AND p.user_id IN (
    SELECT DISTINCT robots.seller_id FROM robots
    UNION
    SELECT DISTINCT spare_parts.seller_id FROM spare_parts
    UNION
    SELECT DISTINCT services.provider_id FROM services
    UNION
    SELECT DISTINCT logistics_services.provider_id FROM logistics_services
    UNION
    SELECT DISTINCT loan_products.provider_id FROM loan_products
    UNION
    SELECT DISTINCT loan_schemes.provider_id FROM loan_schemes
  );
$$;