-- Create a function to get total profiles count that's publicly accessible
CREATE OR REPLACE FUNCTION public.get_total_profiles_count()
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COUNT(*)::integer FROM profiles;
$$;

-- Add RLS policy to allow anyone to access total count function
-- (The function itself handles the security by only returning a count)

-- Also add a policy to allow anyone to view the count of profiles for statistics
CREATE POLICY "Anyone can view profiles count for statistics" 
ON public.profiles 
FOR SELECT 
USING (true);