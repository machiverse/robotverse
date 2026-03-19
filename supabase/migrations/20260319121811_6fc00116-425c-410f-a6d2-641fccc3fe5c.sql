-- Add city and full_address columns to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_address text;

-- Create index on city for faster filtering
CREATE INDEX IF NOT EXISTS idx_profiles_city ON public.profiles (city);

-- Backfill city for existing profiles from location field
UPDATE public.profiles 
SET city = initcap(split_part(trim(location), ',', 1))
WHERE city IS NULL 
AND location IS NOT NULL 
AND trim(location) != '';

-- Update the complete_user_profile function to accept city and full_address
CREATE OR REPLACE FUNCTION public.complete_user_profile(
  p_user_id uuid,
  p_email text,
  p_full_name text DEFAULT NULL::text,
  p_company_name text DEFAULT NULL::text,
  p_mobile_number text DEFAULT NULL::text,
  p_location text DEFAULT NULL::text,
  p_user_type text DEFAULT 'buyer'::text,
  p_account_type text DEFAULT 'buyer'::text,
  p_seller_roles text[] DEFAULT '{}'::text[],
  p_logistics_type text DEFAULT NULL::text,
  p_logistics_region text DEFAULT NULL::text,
  p_transport_modes text[] DEFAULT '{}'::text[],
  p_warehouse_storage boolean DEFAULT false,
  p_finance_type text[] DEFAULT '{}'::text[],
  p_financing_for text[] DEFAULT '{}'::text[],
  p_target_audience text[] DEFAULT '{}'::text[],
  p_government_scheme_support boolean DEFAULT false,
  p_city text DEFAULT NULL::text,
  p_full_address text DEFAULT NULL::text
)
RETURNS TABLE(
  profile_id uuid,
  user_id uuid,
  email text,
  full_name text,
  company_name text,
  mobile_number text,
  location text,
  account_type text,
  user_roles text[],
  registration_complete boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  existing_profile_id UUID;
  user_roles_array TEXT[];
  service_categories_array TEXT[];
  primary_user_type_value public.user_type_enum;
  v_city TEXT;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID cannot be null';
  END IF;
  
  IF p_email IS NULL OR trim(p_email) = '' THEN
    RAISE EXCEPTION 'Email cannot be null or empty';
  END IF;

  -- Normalize city to title case
  v_city := CASE 
    WHEN p_city IS NOT NULL AND trim(p_city) != '' 
    THEN initcap(trim(p_city))
    WHEN p_location IS NOT NULL AND trim(p_location) != ''
    THEN initcap(split_part(trim(p_location), ',', 1))
    ELSE NULL
  END;

  CASE p_account_type
    WHEN 'seller' THEN
      user_roles_array := CASE 
        WHEN p_seller_roles IS NOT NULL AND cardinality(p_seller_roles) > 0 THEN p_seller_roles 
        ELSE ARRAY['robot_seller']::TEXT[] 
      END;
      primary_user_type_value := CASE
        WHEN 'service_provider' = ANY(COALESCE(p_seller_roles, ARRAY[]::TEXT[])) THEN 'service_provider'
        WHEN 'spare_parts_seller' = ANY(COALESCE(p_seller_roles, ARRAY[]::TEXT[])) THEN 'spare_parts_seller'
        ELSE 'robot_seller'
      END;
      service_categories_array := CASE
        WHEN 'service_provider' = ANY(COALESCE(p_seller_roles, ARRAY[]::TEXT[])) THEN ARRAY['maintenance', 'repair', 'installation']::TEXT[]
        ELSE ARRAY[]::TEXT[]
      END;
    WHEN 'logistics' THEN
      user_roles_array := ARRAY['logistics_provider']::TEXT[];
      primary_user_type_value := 'logistics_provider';
      service_categories_array := ARRAY[]::TEXT[];
    WHEN 'finance' THEN
      user_roles_array := ARRAY['finance_provider']::TEXT[];
      primary_user_type_value := 'finance_provider';
      service_categories_array := ARRAY[]::TEXT[];
    ELSE
      user_roles_array := ARRAY['buyer']::TEXT[];
      primary_user_type_value := 'buyer';
      service_categories_array := ARRAY[]::TEXT[];
  END CASE;

  SELECT profiles.id INTO existing_profile_id
  FROM public.profiles 
  WHERE profiles.user_id = p_user_id;
  
  IF existing_profile_id IS NOT NULL THEN
    UPDATE public.profiles SET
      email = COALESCE(NULLIF(trim(p_email), ''), profiles.email),
      full_name = COALESCE(NULLIF(trim(p_full_name), ''), profiles.full_name),
      company_name = NULLIF(trim(p_company_name), ''),
      mobile_number = NULLIF(trim(p_mobile_number), ''),
      phone = NULLIF(trim(p_mobile_number), ''),
      location = NULLIF(trim(p_location), ''),
      city = COALESCE(v_city, profiles.city),
      full_address = COALESCE(NULLIF(trim(p_full_address), ''), profiles.full_address),
      user_type = p_user_type,
      account_type = p_account_type,
      user_roles = user_roles_array,
      seller_roles = CASE WHEN p_account_type = 'seller' THEN user_roles_array ELSE COALESCE(profiles.seller_roles, ARRAY[]::TEXT[]) END,
      primary_user_type = primary_user_type_value,
      primary_role = user_roles_array[1],
      service_categories = service_categories_array,
      logistics_type = CASE WHEN p_account_type = 'logistics' THEN p_logistics_type ELSE profiles.logistics_type END,
      logistics_region = CASE WHEN p_account_type = 'logistics' THEN NULLIF(trim(p_logistics_region), '') ELSE profiles.logistics_region END,
      transport_modes = CASE WHEN p_account_type = 'logistics' THEN COALESCE(p_transport_modes, ARRAY[]::TEXT[]) ELSE COALESCE(profiles.transport_modes, ARRAY[]::TEXT[]) END,
      warehouse_storage = CASE WHEN p_account_type = 'logistics' THEN p_warehouse_storage ELSE COALESCE(profiles.warehouse_storage, false) END,
      finance_type = CASE WHEN p_account_type = 'finance' THEN COALESCE(p_finance_type, ARRAY[]::TEXT[]) ELSE COALESCE(profiles.finance_type, ARRAY[]::TEXT[]) END,
      financing_for = CASE WHEN p_account_type = 'finance' THEN COALESCE(p_financing_for, ARRAY[]::TEXT[]) ELSE COALESCE(profiles.financing_for, ARRAY[]::TEXT[]) END,
      target_audience = CASE WHEN p_account_type = 'finance' THEN COALESCE(p_target_audience, ARRAY[]::TEXT[]) ELSE COALESCE(profiles.target_audience, ARRAY[]::TEXT[]) END,
      government_scheme_support = CASE WHEN p_account_type = 'finance' THEN p_government_scheme_support ELSE COALESCE(profiles.government_scheme_support, false) END,
      registration_complete = true,
      mou_agreed = true,
      mou_agreed_at = COALESCE(profiles.mou_agreed_at, NOW()),
      updated_at = NOW()
    WHERE profiles.user_id = p_user_id;
  ELSE
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
      RAISE EXCEPTION 'User % does not exist in auth.users yet. Please retry after a moment.', p_user_id;
    END IF;
    
    INSERT INTO public.profiles (
      user_id, email, full_name, company_name, mobile_number, phone,
      location, city, full_address, user_type, account_type, user_roles, seller_roles,
      primary_user_type, primary_role, service_categories,
      logistics_type, logistics_region, transport_modes, warehouse_storage,
      finance_type, financing_for, target_audience, government_scheme_support,
      registration_complete, mou_agreed, mou_agreed_at, created_at, updated_at
    ) VALUES (
      p_user_id, 
      NULLIF(trim(p_email), ''),
      NULLIF(trim(p_full_name), ''),
      NULLIF(trim(p_company_name), ''),
      NULLIF(trim(p_mobile_number), ''),
      NULLIF(trim(p_mobile_number), ''),
      NULLIF(trim(p_location), ''),
      v_city,
      NULLIF(trim(p_full_address), ''),
      p_user_type, p_account_type, user_roles_array, 
      CASE WHEN p_account_type = 'seller' THEN user_roles_array ELSE ARRAY[]::TEXT[] END,
      primary_user_type_value, user_roles_array[1], service_categories_array,
      CASE WHEN p_account_type = 'logistics' THEN p_logistics_type ELSE NULL END,
      CASE WHEN p_account_type = 'logistics' THEN NULLIF(trim(p_logistics_region), '') ELSE NULL END,
      CASE WHEN p_account_type = 'logistics' THEN COALESCE(p_transport_modes, ARRAY[]::TEXT[]) ELSE ARRAY[]::TEXT[] END,
      CASE WHEN p_account_type = 'logistics' THEN p_warehouse_storage ELSE false END,
      CASE WHEN p_account_type = 'finance' THEN COALESCE(p_finance_type, ARRAY[]::TEXT[]) ELSE ARRAY[]::TEXT[] END,
      CASE WHEN p_account_type = 'finance' THEN COALESCE(p_financing_for, ARRAY[]::TEXT[]) ELSE ARRAY[]::TEXT[] END,
      CASE WHEN p_account_type = 'finance' THEN COALESCE(p_target_audience, ARRAY[]::TEXT[]) ELSE ARRAY[]::TEXT[] END,
      CASE WHEN p_account_type = 'finance' THEN p_government_scheme_support ELSE false END,
      true, true, NOW(), NOW(), NOW()
    );
  END IF;

  RETURN QUERY
  SELECT 
    p.id as profile_id, p.user_id, p.email, p.full_name, p.company_name,
    p.mobile_number, p.location, p.account_type, p.user_roles,
    p.registration_complete, p.created_at, p.updated_at
  FROM public.profiles p
  WHERE p.user_id = p_user_id;
END;
$$;