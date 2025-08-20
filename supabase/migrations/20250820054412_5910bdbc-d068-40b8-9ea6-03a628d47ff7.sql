-- Fix security issues by setting search_path for functions
-- Update handle_new_user function with proper search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert a complete profile record with better defaults
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
    false, -- Will be updated when they complete their profile
    false, -- Will be set to true when profile is completed
    now(),
    now()
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't block user creation
    RAISE LOG 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Update complete_user_profile function with proper search_path
CREATE OR REPLACE FUNCTION public.complete_user_profile(
  p_user_id UUID,
  p_email TEXT,
  p_full_name TEXT DEFAULT NULL,
  p_company_name TEXT DEFAULT NULL,
  p_mobile_number TEXT DEFAULT NULL,
  p_location TEXT DEFAULT NULL,
  p_user_type TEXT DEFAULT 'buyer',
  p_account_type TEXT DEFAULT 'buyer',
  p_seller_roles TEXT[] DEFAULT '{}',
  p_logistics_type TEXT DEFAULT NULL,
  p_logistics_region TEXT DEFAULT NULL,
  p_transport_modes TEXT[] DEFAULT '{}',
  p_warehouse_storage BOOLEAN DEFAULT false,
  p_finance_type TEXT[] DEFAULT '{}',
  p_financing_for TEXT[] DEFAULT '{}',
  p_target_audience TEXT[] DEFAULT '{}',
  p_government_scheme_support BOOLEAN DEFAULT false
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_id UUID;
  user_roles_array TEXT[];
  service_categories_array TEXT[];
  primary_user_type_value public.user_type_enum;
BEGIN
  -- Determine user roles and primary type based on account type
  CASE p_account_type
    WHEN 'seller' THEN
      user_roles_array := CASE 
        WHEN array_length(p_seller_roles, 1) > 0 THEN p_seller_roles 
        ELSE ARRAY['robot_seller']::TEXT[] 
      END;
      primary_user_type_value := CASE
        WHEN 'service_provider' = ANY(p_seller_roles) THEN 'service_provider'
        WHEN 'spare_parts_seller' = ANY(p_seller_roles) THEN 'spare_parts_seller'
        ELSE 'robot_seller'
      END;
      service_categories_array := CASE
        WHEN 'service_provider' = ANY(p_seller_roles) THEN ARRAY['maintenance', 'repair', 'installation']::TEXT[]
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

  -- Update the existing profile with complete information
  UPDATE public.profiles SET
    email = p_email,
    full_name = COALESCE(p_full_name, full_name),
    company_name = p_company_name,
    mobile_number = p_mobile_number,
    phone = p_mobile_number,
    location = p_location,
    user_type = p_user_type,
    account_type = p_account_type,
    user_roles = user_roles_array,
    seller_roles = CASE WHEN p_account_type = 'seller' THEN user_roles_array ELSE ARRAY[]::TEXT[] END,
    primary_user_type = primary_user_type_value,
    primary_role = user_roles_array[1],
    service_categories = service_categories_array,
    logistics_type = p_logistics_type,
    logistics_region = p_logistics_region,
    transport_modes = COALESCE(p_transport_modes, ARRAY[]::TEXT[]),
    warehouse_storage = COALESCE(p_warehouse_storage, false),
    finance_type = COALESCE(p_finance_type, ARRAY[]::TEXT[]),
    financing_for = COALESCE(p_financing_for, ARRAY[]::TEXT[]),
    target_audience = COALESCE(p_target_audience, ARRAY[]::TEXT[]),
    government_scheme_support = COALESCE(p_government_scheme_support, false),
    registration_complete = true,
    mou_agreed = true,
    mou_agreed_at = NOW(),
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING id INTO profile_id;
  
  -- If no profile was updated, create a new one
  IF profile_id IS NULL THEN
    INSERT INTO public.profiles (
      user_id, email, full_name, company_name, mobile_number, phone,
      location, user_type, account_type, user_roles, seller_roles,
      primary_user_type, primary_role, service_categories,
      logistics_type, logistics_region, transport_modes, warehouse_storage,
      finance_type, financing_for, target_audience, government_scheme_support,
      registration_complete, mou_agreed, mou_agreed_at, created_at, updated_at
    ) VALUES (
      p_user_id, p_email, p_full_name, p_company_name, p_mobile_number, p_mobile_number,
      p_location, p_user_type, p_account_type, user_roles_array, 
      CASE WHEN p_account_type = 'seller' THEN user_roles_array ELSE ARRAY[]::TEXT[] END,
      primary_user_type_value, user_roles_array[1], service_categories_array,
      p_logistics_type, p_logistics_region, COALESCE(p_transport_modes, ARRAY[]::TEXT[]), 
      COALESCE(p_warehouse_storage, false), COALESCE(p_finance_type, ARRAY[]::TEXT[]),
      COALESCE(p_financing_for, ARRAY[]::TEXT[]), COALESCE(p_target_audience, ARRAY[]::TEXT[]),
      COALESCE(p_government_scheme_support, false), true, true, NOW(), NOW(), NOW()
    )
    RETURNING id INTO profile_id;
  END IF;
  
  RETURN profile_id;
END;
$$;