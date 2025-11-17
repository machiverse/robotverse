-- Create trigger to update blog like counts
CREATE OR REPLACE FUNCTION public.update_blog_counters()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'blog_likes' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE public.blogs 
      SET like_count = like_count + 1 
      WHERE id = NEW.blog_id;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE public.blogs 
      SET like_count = GREATEST(like_count - 1, 0) 
      WHERE id = OLD.blog_id;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for blog likes
CREATE TRIGGER update_blog_likes_counter
  AFTER INSERT OR DELETE ON public.blog_likes
  FOR EACH ROW EXECUTE FUNCTION public.update_blog_counters();