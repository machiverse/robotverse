-- Update handle_new_user trigger to check if profile already exists
-- This prevents minimal profile creation when profile was already created at signup

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  existing_profile_count INTEGER;
BEGIN
  -- Check if profile already exists (could be created immediately at signup)
  SELECT COUNT(*) INTO existing_profile_count
  FROM public.profiles
  WHERE user_id = NEW.id;
  
  -- Only create minimal profile if it doesn't exist
  IF existing_profile_count = 0 THEN
    INSERT INTO public.profiles (
      user_id,
      email,
      full_name,
      registration_complete,
      mou_agreed,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      false,
      false,
      now(),
      now()
    );
    
    RAISE LOG 'Created minimal profile for user %', NEW.id;
  ELSE
    RAISE LOG 'Profile already exists for user %, skipping minimal profile creation', NEW.id;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't block user creation
    RAISE LOG 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;