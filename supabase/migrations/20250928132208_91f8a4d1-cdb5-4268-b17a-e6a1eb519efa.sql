-- Update the get_item_view_count function to combine counts from both tables for robots
CREATE OR REPLACE FUNCTION public.get_item_view_count(p_item_id uuid, p_item_type text)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  view_count INTEGER := 0;
  legacy_count INTEGER := 0;
BEGIN
  -- Get count from new item_view_counts table
  SELECT total_views INTO view_count
  FROM public.item_view_counts
  WHERE item_id = p_item_id AND item_type = p_item_type;
  
  -- For robots, also check the legacy robot_view_counts table
  IF p_item_type = 'robots' THEN
    SELECT total_views INTO legacy_count
    FROM public.robot_view_counts
    WHERE robot_id = p_item_id;
  END IF;
  
  -- Return combined count
  RETURN COALESCE(view_count, 0) + COALESCE(legacy_count, 0);
END;
$function$