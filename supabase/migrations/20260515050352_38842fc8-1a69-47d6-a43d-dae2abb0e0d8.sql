
ALTER TABLE public.blogs
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS meta_title text,
  ADD COLUMN IF NOT EXISTS meta_description text,
  ADD COLUMN IF NOT EXISTS focus_keywords text[],
  ADD COLUMN IF NOT EXISTS seo_tags text[],
  ADD COLUMN IF NOT EXISTS featured_image_alt text,
  ADD COLUMN IF NOT EXISTS featured_image_caption text,
  ADD COLUMN IF NOT EXISTS canonical_url text,
  ADD COLUMN IF NOT EXISTS reading_time_minutes int,
  ADD COLUMN IF NOT EXISTS scheduled_publish_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_draft boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS comment_count int NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS blogs_slug_unique ON public.blogs(slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS blogs_published_at_idx ON public.blogs(published_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS blogs_category_idx ON public.blogs(category);

CREATE OR REPLACE FUNCTION public.generate_unique_blogs_slug(_title text, _id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base text;
  candidate text;
  n int := 0;
BEGIN
  base := public.slugify(_title);
  IF base = '' OR base IS NULL THEN base := 'post'; END IF;
  candidate := base;
  WHILE EXISTS (SELECT 1 FROM public.blogs WHERE slug = candidate AND id <> coalesce(_id, '00000000-0000-0000-0000-000000000000'::uuid)) LOOP
    n := n + 1;
    candidate := base || '-' || n;
  END LOOP;
  RETURN candidate;
END;
$$;

CREATE OR REPLACE FUNCTION public.blogs_seo_autofill()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.generate_unique_blogs_slug(NEW.title, NEW.id);
  END IF;
  IF NEW.content IS NOT NULL THEN
    NEW.reading_time_minutes := public.calc_reading_time(NEW.content);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_blogs_seo_autofill ON public.blogs;
CREATE TRIGGER trg_blogs_seo_autofill
  BEFORE INSERT OR UPDATE ON public.blogs
  FOR EACH ROW EXECUTE FUNCTION public.blogs_seo_autofill();

UPDATE public.blogs
SET slug = public.generate_unique_blogs_slug(title, id)
WHERE slug IS NULL OR slug = '';
