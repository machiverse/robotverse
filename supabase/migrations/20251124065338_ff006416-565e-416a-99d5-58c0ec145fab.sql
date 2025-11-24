-- Fix complete_user_profile to properly store all registration data
-- The issue is that COALESCE preserves NULL values when it should update them

DROP FUNCTION IF EXISTS public.complete_user_profile(uuid, text, text, text, text, text, text, text, text[], text, text, text[], boolean, text[], text[], text[], boolean);

CREATE OR REPLACE FUNCTION public.complete_user_profile(
  p_user_id uuid,
  p_email text,
  p_full_name text DEFAULT NULL,
  p_company_name text DEFAULT NULL,
  p_mobile_number text DEFAULT NULL,
  p_location text DEFAULT NULL,
  p_user_type text DEFAULT 'buyer',
  p_account_type text DEFAULT 'buyer',
  p_seller_roles text[] DEFAULT '{}',
  p_logistics_type text DEFAULT NULL,
  p_logistics_region text DEFAULT NULL,
  p_transport_modes text[] DEFAULT '{}',
  p_warehouse_storage boolean DEFAULT false,
  p_finance_type text[] DEFAULT '{}',
  p_financing_for text[] DEFAULT '{}',
  p_target_audience text[] DEFAULT '{}',
  p_government_scheme_support boolean DEFAULT false
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
AS $function$
DECLARE
  existing_profile_id UUID;
  user_roles_array TEXT[];
  service_categories_array TEXT[];
  primary_user_type_value public.user_type_enum;
BEGIN
  -- Input validation
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID cannot be null';
  END IF;
  
  IF p_email IS NULL OR trim(p_email) = '' THEN
    RAISE EXCEPTION 'Email cannot be null or empty';
  END IF;
  
  RAISE LOG 'Processing profile for user_id: %, account_type: %, seller_roles: %',
    p_user_id, p_account_type, p_seller_roles;

  -- Determine user roles and primary type based on account type
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

  RAISE LOG 'Determined user_roles_array: %, primary_user_type: %', user_roles_array, primary_user_type_value;

  -- Check if profile already exists
  SELECT profiles.id INTO existing_profile_id
  FROM public.profiles 
  WHERE profiles.user_id = p_user_id;
  
  IF existing_profile_id IS NOT NULL THEN
    RAISE LOG 'Updating existing profile: %', existing_profile_id;
    
    -- Update existing profile - ALWAYS use new values if provided
    UPDATE public.profiles SET
      email = COALESCE(NULLIF(trim(p_email), ''), profiles.email),
      full_name = COALESCE(NULLIF(trim(p_full_name), ''), profiles.full_name),
      -- For these fields, use new value even if it's NULL (user might be clearing them)
      -- But only if we're completing registration (not just updating)
      company_name = NULLIF(trim(p_company_name), ''),
      mobile_number = NULLIF(trim(p_mobile_number), ''),
      phone = NULLIF(trim(p_mobile_number), ''),
      location = NULLIF(trim(p_location), ''),
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
    
    RAISE LOG 'Profile updated for user_id: %', p_user_id;
    
  ELSE
    RAISE LOG 'Creating new profile for user_id: %', p_user_id;
    
    -- Create new profile
    INSERT INTO public.profiles (
      user_id, email, full_name, company_name, mobile_number, phone,
      location, user_type, account_type, user_roles, seller_roles,
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
      p_user_type, 
      p_account_type, 
      user_roles_array, 
      CASE WHEN p_account_type = 'seller' THEN user_roles_array ELSE ARRAY[]::TEXT[] END,
      primary_user_type_value, 
      user_roles_array[1], 
      service_categories_array,
      CASE WHEN p_account_type = 'logistics' THEN p_logistics_type ELSE NULL END,
      CASE WHEN p_account_type = 'logistics' THEN NULLIF(trim(p_logistics_region), '') ELSE NULL END,
      CASE WHEN p_account_type = 'logistics' THEN COALESCE(p_transport_modes, ARRAY[]::TEXT[]) ELSE ARRAY[]::TEXT[] END,
      CASE WHEN p_account_type = 'logistics' THEN p_warehouse_storage ELSE false END,
      CASE WHEN p_account_type = 'finance' THEN COALESCE(p_finance_type, ARRAY[]::TEXT[]) ELSE ARRAY[]::TEXT[] END,
      CASE WHEN p_account_type = 'finance' THEN COALESCE(p_financing_for, ARRAY[]::TEXT[]) ELSE ARRAY[]::TEXT[] END,
      CASE WHEN p_account_type = 'finance' THEN COALESCE(p_target_audience, ARRAY[]::TEXT[]) ELSE ARRAY[]::TEXT[] END,
      CASE WHEN p_account_type = 'finance' THEN p_government_scheme_support ELSE false END,
      true, 
      true, 
      NOW(),
      NOW(),
      NOW()
    );
    
    RAISE LOG 'New profile created for user_id: %', p_user_id;
  END IF;

  -- Return the complete profile data
  RETURN QUERY
  SELECT 
    p.id as profile_id,
    p.user_id,
    p.email,
    p.full_name,
    p.company_name,
    p.mobile_number,
    p.location,
    p.account_type,
    p.user_roles,
    p.registration_complete,
    p.created_at,
    p.updated_at
  FROM public.profiles p
  WHERE p.user_id = p_user_id;
  
  RAISE LOG 'Profile operation completed for user_id: %', p_user_id;
  
END;
$function$;