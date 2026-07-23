CREATE OR REPLACE FUNCTION public.tg_seo_enqueue_robot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.enqueue_seo_job('robot', NEW.id::text, 'generate', 3);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.name IS DISTINCT FROM OLD.name
       OR NEW.description IS DISTINCT FROM OLD.description
       OR NEW.brand IS DISTINCT FROM OLD.brand
       OR NEW.model IS DISTINCT FROM OLD.model
       OR NEW.robot_type IS DISTINCT FROM OLD.robot_type
       OR NEW.applications IS DISTINCT FROM OLD.applications
       OR NEW.payload_capacity IS DISTINCT FROM OLD.payload_capacity
       OR NEW.reach IS DISTINCT FROM OLD.reach
       OR NEW.condition IS DISTINCT FROM OLD.condition
       OR NEW.year_manufactured IS DISTINCT FROM OLD.year_manufactured
       OR NEW.images IS DISTINCT FROM OLD.images THEN
      PERFORM public.enqueue_seo_job('robot', NEW.id::text, 'generate', 5);
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.seo_metadata WHERE content_type = 'robot' AND content_id = OLD.id::text;
    DELETE FROM public.seo_image_metadata WHERE content_type = 'robot' AND content_id = OLD.id::text;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;