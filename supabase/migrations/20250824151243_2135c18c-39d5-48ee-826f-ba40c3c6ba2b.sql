-- Create or update admin user profile (avoid auth.users direct manipulation)
-- This will only work if the user already exists in auth.users
-- The user mynameisrajan@gmail.com needs to sign up first

-- Update profile to admin for existing user if they exist
UPDATE public.profiles 
SET 
  account_type = 'admin',
  user_type = 'admin', 
  user_roles = ARRAY['admin']::text[],
  primary_user_type = 'admin',
  registration_complete = true,
  mou_agreed = true,
  mou_agreed_at = now(),
  updated_at = now()
WHERE email = 'mynameisrajan@gmail.com';

-- If the profile doesn't exist, we'll need the user to sign up first
-- Then this will be handled by the handle_new_user trigger