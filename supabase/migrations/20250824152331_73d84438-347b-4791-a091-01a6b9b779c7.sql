-- Fix RLS policies for admin access to button interactions
-- Allow admins to view all button interactions
DROP POLICY IF EXISTS "Admins can view all interactions" ON public.button_interactions;

CREATE POLICY "Admins can view all interactions" 
ON public.button_interactions 
FOR SELECT 
TO authenticated
USING (
  -- Allow if user is admin by email or account type
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND (
      profiles.account_type = 'admin' OR
      profiles.email IN ('mark.it@keyleerkorb.com', 'mynameisrajan@gmail.com') OR
      (profiles.user_roles IS NOT NULL AND 'admin' = ANY(profiles.user_roles))
    )
  )
  -- Or allow users to see their own interactions
  OR auth.uid() = user_id
);