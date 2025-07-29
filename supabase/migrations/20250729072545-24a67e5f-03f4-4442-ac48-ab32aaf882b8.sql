-- Add user_roles array column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS user_roles text[] DEFAULT '{}';

-- Update existing profiles to have user_roles based on their current user_type and account_type
UPDATE public.profiles 
SET user_roles = CASE 
  WHEN user_type = 'buyer' OR account_type = 'buyer' THEN ARRAY['buyer']
  WHEN user_type = 'seller' OR account_type = 'seller' THEN 
    CASE 
      WHEN seller_roles IS NOT NULL AND array_length(seller_roles, 1) > 0 THEN seller_roles
      ELSE ARRAY['robot_seller']
    END
  WHEN user_type = 'service_provider' OR account_type = 'service' THEN ARRAY['service_provider']
  WHEN user_type = 'logistics_provider' OR account_type = 'logistics' THEN ARRAY['logistics_provider']
  WHEN user_type = 'finance_provider' OR account_type = 'finance' THEN ARRAY['finance_provider']
  ELSE ARRAY['buyer']
END
WHERE user_roles = '{}' OR user_roles IS NULL;

-- Create index for better performance on user_roles queries
CREATE INDEX IF NOT EXISTS idx_profiles_user_roles ON public.profiles USING GIN(user_roles);