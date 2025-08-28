-- First, drop the problematic policy
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create a security definer function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE u.id = auth.uid()
    AND (
      u.email = ANY(ARRAY['mark.it@keyleerkorb.com', 'mynameisrajan@gmail.com'])
      OR EXISTS (
        SELECT 1 FROM profiles p 
        WHERE p.user_id = u.id 
        AND (
          p.account_type = 'admin' 
          OR (p.user_roles IS NOT NULL AND 'admin' = ANY(p.user_roles))
        )
      )
    )
  );
$$;

-- Create admin policy using the security definer function
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (public.is_admin_user());