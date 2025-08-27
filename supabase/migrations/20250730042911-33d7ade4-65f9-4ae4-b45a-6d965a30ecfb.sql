-- Update the handle_new_user function to not create incomplete profiles
-- This will prevent the automatic creation of profiles with only email and name
-- The Auth.tsx component will handle complete profile creation after email confirmation

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = ''
AS $$
BEGIN
  -- Don't create a profile automatically anymore
  -- Let the frontend handle complete profile creation after email confirmation
  -- This prevents incomplete profiles with only email and name
  
  -- Just return the new user without creating a profile
  RETURN new;
END;
$$;