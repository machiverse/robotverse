-- Check current RLS policies on profiles table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'profiles';

-- The issue is that RLS policies are blocking the trigger function from inserting profiles
-- We need to allow the trigger function (which runs as SECURITY DEFINER) to insert profiles
-- Let's update the policies to allow this

-- First, let's see what the current INSERT policy looks like and fix it
DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Insert own profile" ON public.profiles;

-- Create a proper INSERT policy that allows both user inserts and trigger inserts
CREATE POLICY "Allow profile creation" ON public.profiles
FOR INSERT 
WITH CHECK (
  -- Allow if user is creating their own profile
  auth.uid() = user_id 
  OR 
  -- Allow if this is being called from a trigger (no auth context)
  auth.uid() IS NULL
);

-- Also ensure we have proper SELECT policy
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Select own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT 
USING (auth.uid() = user_id);

-- Keep the business info policy for public access
-- This allows public access to provider profiles for marketplace functionality