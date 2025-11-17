-- Create missing profile for the logged in user
INSERT INTO public.profiles (
  user_id,
  email,
  full_name,
  registration_complete,
  mou_agreed,
  created_at,
  updated_at
) VALUES (
  '662dcf6e-4b3d-46d4-82c7-c3425cf60c52',
  'manju.it@keyleerkorb.com',
  'Manikandan Mani',
  false,
  false,
  now(),
  now()
) ON CONFLICT (user_id) DO NOTHING;