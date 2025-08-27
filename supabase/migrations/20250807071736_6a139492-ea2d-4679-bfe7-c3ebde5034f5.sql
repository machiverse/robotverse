-- Update RLS policy to include all provider types (logistics and finance providers)
DROP POLICY IF EXISTS "Users can view seller profiles and their own profile" ON public.profiles;

CREATE POLICY "Users can view provider profiles and their own profile" 
ON public.profiles 
FOR SELECT 
USING (
  (auth.uid() = user_id) OR 
  (user_id IN ( 
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
  ))
);