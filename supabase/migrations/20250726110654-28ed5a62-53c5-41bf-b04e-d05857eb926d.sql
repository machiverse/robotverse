-- Update user_type column to support the new role structure
-- Add new user types to support the comprehensive marketplace
UPDATE profiles SET user_type = 'buyer' WHERE account_type = 'buyer';
UPDATE profiles SET user_type = 'seller' WHERE account_type = 'seller';
UPDATE profiles SET user_type = 'logistics_provider' WHERE account_type = 'logistics';
UPDATE profiles SET user_type = 'finance_provider' WHERE account_type = 'finance';

-- Create enum for user types to ensure data consistency
CREATE TYPE public.user_type_enum AS ENUM (
  'buyer',
  'robot_seller',
  'parts_seller', 
  'service_provider',
  'logistics_provider',
  'finance_provider'
);

-- Create enum for seller roles
CREATE TYPE public.seller_role_enum AS ENUM (
  'robot_seller',
  'parts_seller',
  'service_provider'
);

-- Add a new column for precise user type classification
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS primary_user_type public.user_type_enum;

-- Update primary_user_type based on existing data
UPDATE profiles SET primary_user_type = 'buyer' WHERE user_type = 'buyer';
UPDATE profiles SET primary_user_type = 'robot_seller' WHERE user_type = 'seller' AND 'robot_seller' = ANY(seller_roles);
UPDATE profiles SET primary_user_type = 'parts_seller' WHERE user_type = 'seller' AND 'parts_seller' = ANY(seller_roles);
UPDATE profiles SET primary_user_type = 'service_provider' WHERE user_type = 'seller' AND 'service_provider' = ANY(seller_roles);
UPDATE profiles SET primary_user_type = 'logistics_provider' WHERE user_type = 'logistics_provider';
UPDATE profiles SET primary_user_type = 'finance_provider' WHERE user_type = 'finance_provider';

-- For sellers with multiple roles, set primary_user_type to the first role they selected
UPDATE profiles 
SET primary_user_type = CASE 
  WHEN 'robot_seller' = ANY(seller_roles) THEN 'robot_seller'::public.user_type_enum
  WHEN 'parts_seller' = ANY(seller_roles) THEN 'parts_seller'::public.user_type_enum  
  WHEN 'service_provider' = ANY(seller_roles) THEN 'service_provider'::public.user_type_enum
  ELSE primary_user_type
END
WHERE user_type = 'seller' AND primary_user_type IS NULL;