-- Fix the create_complete_user_profile function to handle JSON properly
CREATE OR REPLACE FUNCTION public.create_complete_user_profile(
  p_user_id uuid,
  p_email text,
  p_full_name text DEFAULT '',
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
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  profile_id UUID;
  user_roles_array text[];
  service_categories_array text[];
  primary_user_type_value text;
BEGIN
  -- Determine user roles and primary type based on account type
  CASE p_account_type
    WHEN 'seller' THEN
      user_roles_array := CASE 
        WHEN array_length(p_seller_roles, 1) > 0 THEN p_seller_roles 
        ELSE ARRAY['robot_seller']::text[] 
      END;
      primary_user_type_value := CASE
        WHEN 'service_provider' = ANY(p_seller_roles) THEN 'service_provider'
        WHEN 'spare_parts_seller' = ANY(p_seller_roles) THEN 'spare_parts_seller'
        ELSE 'robot_seller'
      END;
      service_categories_array := CASE
        WHEN 'service_provider' = ANY(p_seller_roles) THEN ARRAY['maintenance', 'repair', 'installation']::text[]
        ELSE ARRAY[]::text[]
      END;
    WHEN 'logistics' THEN
      user_roles_array := ARRAY['logistics_provider']::text[];
      primary_user_type_value := 'logistics_provider';
      service_categories_array := ARRAY[]::text[];
    WHEN 'finance' THEN
      user_roles_array := ARRAY['finance_provider']::text[];
      primary_user_type_value := 'finance_provider';
      service_categories_array := ARRAY[]::text[];
    ELSE
      user_roles_array := ARRAY['buyer']::text[];
      primary_user_type_value := 'buyer';
      service_categories_array := ARRAY[]::text[];
  END CASE;

  INSERT INTO public.profiles (
    user_id,
    email,
    full_name,
    company_name,
    mobile_number,
    phone,
    location,
    user_type,
    account_type,
    user_roles,
    seller_roles,
    primary_user_type,
    primary_role,
    service_categories,
    logistics_type,
    logistics_region,
    transport_modes,
    warehouse_storage,
    finance_type,
    financing_for,
    target_audience,
    government_scheme_support,
    registration_complete,
    mou_agreed,
    mou_agreed_at,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    p_email,
    p_full_name,
    p_company_name,
    p_mobile_number,
    p_mobile_number,
    p_location,
    p_user_type,
    p_account_type,
    user_roles_array,
    CASE WHEN p_account_type = 'seller' THEN user_roles_array ELSE ARRAY[]::text[] END,
    primary_user_type_value::public.user_type_enum,
    user_roles_array[1],
    service_categories_array,
    p_logistics_type,
    p_logistics_region,
    COALESCE(p_transport_modes, ARRAY[]::text[]),
    COALESCE(p_warehouse_storage, false),
    COALESCE(p_finance_type, ARRAY[]::text[]),
    COALESCE(p_financing_for, ARRAY[]::text[]),
    COALESCE(p_target_audience, ARRAY[]::text[]),
    COALESCE(p_government_scheme_support, false),
    true,
    true,
    now(),
    now(),
    now()
  )
  RETURNING id INTO profile_id;
  
  RETURN profile_id;
END;
$$;