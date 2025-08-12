-- Check if there's a trigger causing issues and remove the problematic handle_new_user trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Check and drop the handle_new_user function as it might be causing JSON issues
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create a simpler trigger that won't cause JSON syntax errors
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only create a minimal profile to avoid JSON issues
  -- Let the frontend handle complete profile creation
  INSERT INTO public.profiles (
    user_id,
    email,
    full_name,
    registration_complete
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    false
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();