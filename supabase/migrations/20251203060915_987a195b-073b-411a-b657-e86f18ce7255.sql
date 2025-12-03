-- Drop the conflicting text-based function (keep only the UUID version)
DROP FUNCTION IF EXISTS public.increment_item_view_count(text, text);

-- Recreate the function with proper SECURITY DEFINER to ensure it works for all users
CREATE OR REPLACE FUNCTION public.increment_item_view_count(p_item_id uuid, p_item_type text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_count INTEGER;
BEGIN
  -- Insert or update the view count
  INSERT INTO public.item_view_counts (item_id, item_type, total_views)
  VALUES (p_item_id, p_item_type, 1)
  ON CONFLICT (item_id, item_type)
  DO UPDATE SET 
    total_views = item_view_counts.total_views + 1,
    updated_at = now()
  RETURNING total_views INTO current_count;
  
  RETURN current_count;
END;
$function$;