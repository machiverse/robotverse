-- Update view count tracking for blogs and community posts

-- Function to increment blog view count
CREATE OR REPLACE FUNCTION public.increment_blog_view_count(p_blog_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  current_count INTEGER;
BEGIN
  -- Update the view count
  UPDATE public.blogs 
  SET view_count = COALESCE(view_count, 0) + 1 
  WHERE id = p_blog_id 
  RETURNING view_count INTO current_count;
  
  RETURN COALESCE(current_count, 0);
END;
$function$;

-- Function to increment community post view count
CREATE OR REPLACE FUNCTION public.increment_community_post_view_count(p_post_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  current_count INTEGER;
BEGIN
  -- Update the view count
  UPDATE public.community_posts 
  SET view_count = COALESCE(view_count, 0) + 1 
  WHERE id = p_post_id 
  RETURNING view_count INTO current_count;
  
  RETURN COALESCE(current_count, 0);
END;
$function$;