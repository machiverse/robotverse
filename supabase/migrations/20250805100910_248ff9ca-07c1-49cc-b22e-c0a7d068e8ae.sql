-- Fix function search path by updating the existing function with proper search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = 'public';

-- Update existing logistics data function to be more secure
CREATE OR REPLACE FUNCTION public.get_logistics_data(table_name text, provider_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
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
END;$function$