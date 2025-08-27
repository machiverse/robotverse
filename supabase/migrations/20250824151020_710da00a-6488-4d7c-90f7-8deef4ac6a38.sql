-- Create admin user and add to ADMIN_EMAILS list
-- First, let's check if the admin user already exists
INSERT INTO auth.users (email, email_confirmed_at, created_at, updated_at)
VALUES ('mynameisrajan@gmail.com', now(), now(), now())
ON CONFLICT (email) DO NOTHING;

-- Create or update profile for admin user
INSERT INTO public.profiles (
  user_id,
  email,
  full_name,
  account_type,
  user_type,
  user_roles,
  registration_complete,
  mou_agreed,
  mou_agreed_at,
  created_at,
  updated_at
)
SELECT 
  u.id,
  'mynameisrajan@gmail.com',
  'Rajan Admin',
  'admin',
  'admin',
  ARRAY['admin']::text[],
  true,
  true,
  now(),
  now(),
  now()
FROM auth.users u
WHERE u.email = 'mynameisrajan@gmail.com'
ON CONFLICT (user_id) 
DO UPDATE SET
  account_type = 'admin',
  user_type = 'admin',
  user_roles = ARRAY['admin']::text[],
  registration_complete = true,
  mou_agreed = true,
  updated_at = now();