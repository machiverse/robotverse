-- Update RLS policy to allow viewing seller profiles for marketplace functionality
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;

-- Create a new policy that allows users to see seller profiles when viewing marketplace listings
CREATE POLICY "Users can view seller profiles and their own profile" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() = user_id OR -- Users can see their own profile
  user_id IN ( -- Or they can see profiles of users who are sellers (have listed robots, parts, or services)
    SELECT DISTINCT seller_id FROM robots 
    UNION 
    SELECT DISTINCT seller_id FROM spare_parts 
    UNION 
    SELECT DISTINCT provider_id FROM services
  )
);