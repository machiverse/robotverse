-- Add policy for admin users to view all profiles
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND (
      p.account_type = 'admin'
      OR p.email = ANY(ARRAY['mark.it@keyleerkorb.com', 'mynameisrajan@gmail.com'])
      OR (p.user_roles IS NOT NULL AND 'admin' = ANY(p.user_roles))
    )
  )
);