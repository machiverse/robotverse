-- Fix remaining functions to have secure search_path
CREATE OR REPLACE FUNCTION public.get_provider_public_info(provider_user_id uuid)
RETURNS TABLE(user_id uuid, full_name text, company_name text, location text, user_type text, account_type text, service_categories text[], user_roles text[], registration_complete boolean)
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    p.user_id,
    p.full_name,
    p.company_name,
    p.location,
    p.user_type,
    p.account_type,
    p.service_categories,
    p.user_roles,
    p.registration_complete
  FROM public.profiles p
  WHERE p.user_id = provider_user_id
  AND p.user_id IN (
    SELECT DISTINCT robots.seller_id FROM robots
    UNION
    SELECT DISTINCT spare_parts.seller_id FROM spare_parts
    UNION
    SELECT DISTINCT services.provider_id FROM services
    UNION
    SELECT DISTINCT logistics_services.provider_id FROM logistics_services
    UNION
    SELECT DISTINCT loan_products.provider_id FROM loan_products
    UNION
    SELECT DISTINCT loan_schemes.provider_id FROM loan_schemes
  );
$function$;

CREATE OR REPLACE FUNCTION public.get_provider_business_info(provider_user_id uuid)
RETURNS TABLE(user_id uuid, full_name text, company_name text, location text, service_categories text[], user_roles text[], user_type text, account_type text, registration_complete boolean)
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    p.user_id,
    p.full_name,
    p.company_name,
    p.location,
    p.service_categories,
    p.user_roles,
    p.user_type,
    p.account_type,
    p.registration_complete
  FROM public.profiles p
  WHERE p.user_id = provider_user_id
  AND p.user_id IN (
    SELECT DISTINCT robots.seller_id FROM robots
    UNION
    SELECT DISTINCT spare_parts.seller_id FROM spare_parts
    UNION
    SELECT DISTINCT services.provider_id FROM services
    UNION
    SELECT DISTINCT logistics_services.provider_id FROM logistics_services
    UNION
    SELECT DISTINCT loan_products.provider_id FROM loan_products
    UNION
    SELECT DISTINCT loan_schemes.provider_id FROM loan_schemes
  );
$function$;

CREATE OR REPLACE FUNCTION public.get_public_provider_profile(provider_user_id uuid)
RETURNS TABLE(user_id uuid, full_name text, company_name text, location text, user_type text, account_type text, service_categories text[], user_roles text[], registration_complete boolean)
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    p.user_id,
    p.full_name,
    p.company_name,
    p.location,
    p.user_type,
    p.account_type,
    p.service_categories,
    p.user_roles,
    p.registration_complete
  FROM public.profiles p
  WHERE p.user_id = provider_user_id
  AND p.user_id IN (
    SELECT DISTINCT robots.seller_id FROM robots
    UNION
    SELECT DISTINCT spare_parts.seller_id FROM spare_parts
    UNION
    SELECT DISTINCT services.provider_id FROM services
    UNION
    SELECT DISTINCT logistics_services.provider_id FROM logistics_services
    UNION
    SELECT DISTINCT loan_products.provider_id FROM loan_products
    UNION
    SELECT DISTINCT loan_schemes.provider_id FROM loan_schemes
  );
$function$;

CREATE OR REPLACE FUNCTION public.get_logistics_data(table_name text, provider_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$DECLARE
  result JSON;
BEGIN
  -- Check if table exists
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = get_logistics_data.table_name
  ) THEN
    RETURN '[]'::JSON;
  END IF;

  -- Execute dynamic query based on table name
  CASE table_name
    WHEN 'logistics_shipments' THEN
      EXECUTE format('SELECT json_agg(row_to_json(t)) FROM (SELECT * FROM %I WHERE provider_id = $1 ORDER BY created_at DESC) t', table_name)
      INTO result USING provider_id;
    
    WHEN 'logistics_fleet' THEN
      EXECUTE format('SELECT json_agg(row_to_json(t)) FROM (SELECT * FROM %I WHERE provider_id = $1 ORDER BY created_at DESC) t', table_name)
      INTO result USING provider_id;
    
    WHEN 'logistics_coverage' THEN
      EXECUTE format('SELECT json_agg(row_to_json(t)) FROM (SELECT * FROM %I WHERE provider_id = $1 AND is_active = true ORDER BY zone_type) t', table_name)
      INTO result USING provider_id;
    
    WHEN 'logistics_services' THEN
      EXECUTE format('SELECT json_agg(row_to_json(t)) FROM (SELECT * FROM %I WHERE provider_id = $1 ORDER BY created_at DESC) t', table_name)
      INTO result USING provider_id;
    
    ELSE
      result := '[]'::JSON;
  END CASE;

  RETURN COALESCE(result, '[]'::JSON);
END;$function$;

CREATE OR REPLACE FUNCTION public.create_user_profile(p_user_id uuid, p_email text, p_full_name text DEFAULT ''::text, p_company_name text DEFAULT NULL::text, p_mobile_number text DEFAULT NULL::text, p_location text DEFAULT NULL::text, p_user_type text DEFAULT 'buyer'::text, p_account_type text DEFAULT 'buyer'::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  profile_id UUID;
BEGIN
  INSERT INTO public.profiles (
    user_id,
    email,
    full_name,
    company_name,
    mobile_number,
    location,
    user_type,
    account_type,
    user_roles,
    registration_complete
  ) VALUES (
    p_user_id,
    p_email,
    p_full_name,
    p_company_name,
    p_mobile_number,
    p_location,
    p_user_type,
    p_account_type,
    ARRAY[p_user_type]::text[],
    true
  )
  RETURNING id INTO profile_id;
  
  RETURN profile_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_complete_user_profile(p_user_id uuid, p_email text, p_full_name text DEFAULT ''::text, p_company_name text DEFAULT NULL::text, p_mobile_number text DEFAULT NULL::text, p_location text DEFAULT NULL::text, p_user_type text DEFAULT 'buyer'::text, p_account_type text DEFAULT 'buyer'::text, p_seller_roles text[] DEFAULT '{}'::text[], p_logistics_type text DEFAULT NULL::text, p_logistics_region text DEFAULT NULL::text, p_transport_modes text[] DEFAULT '{}'::text[], p_warehouse_storage boolean DEFAULT false, p_finance_type text[] DEFAULT '{}'::text[], p_financing_for text[] DEFAULT '{}'::text[], p_target_audience text[] DEFAULT '{}'::text[], p_government_scheme_support boolean DEFAULT false)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;