-- Fix function security issues by setting proper search_path

-- Update the get_logistics_data function
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
    
    ELSE
      result := '[]'::JSON;
  END CASE;

  RETURN COALESCE(result, '[]'::JSON);
END;$function$;

-- Update the generate_random_string function
CREATE OR REPLACE FUNCTION public.generate_random_string(length integer)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT := '';
    i INTEGER := 0;
BEGIN
    FOR i IN 1..length LOOP
        result := result || substr(chars, floor(random() * length(chars))::integer + 1, 1);
    END LOOP;
    RETURN result;
END;
$function$;

-- Update the update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;