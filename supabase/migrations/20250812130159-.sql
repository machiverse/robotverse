-- Remove all existing conflicting INSERT policies on profiles table
DROP POLICY IF EXISTS "Allow profile creation" ON public.profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Insert own profile" ON public.profiles;

-- Create a new INSERT policy that allows both user inserts and trigger inserts
-- This policy allows:
-- 1. Users to create their own profiles when authenticated
-- 2. The trigger function to create profiles during signup (when auth.uid() is NULL)
CREATE POLICY "Enable profile creation for users and triggers" ON public.profiles
FOR INSERT 
WITH CHECK (
  -- Allow authenticated users to create their own profile
  (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  OR 
  -- Allow trigger function to create profiles (no auth context during signup)
  (auth.uid() IS NULL)
);

-- Also clean up duplicate SELECT policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Select own profile" ON public.profiles;

-- Create a single SELECT policy for own profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT 
USING (auth.uid() = user_id);

-- Clean up duplicate UPDATE policies
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Update own profile" ON public.profiles;

-- Create a single UPDATE policy
CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Show the final policies
SELECT policyname, cmd, permissive, with_check, qual 
FROM pg_policies 
WHERE tablename = 'profiles' 
ORDER BY cmd, policyname;