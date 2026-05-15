
-- Add SEO + publishing columns to community_posts (used for blogs)
ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS meta_title text,
  ADD COLUMN IF NOT EXISTS meta_description text,
  ADD COLUMN IF NOT EXISTS focus_keywords text[],
  ADD COLUMN IF NOT EXISTS seo_tags text[],
  ADD COLUMN IF NOT EXISTS featured_image text,
  ADD COLUMN IF NOT EXISTS featured_image_alt text,
  ADD COLUMN IF NOT EXISTS featured_image_caption text,
  ADD COLUMN IF NOT EXISTS canonical_url text,
  ADD COLUMN IF NOT EXISTS reading_time_minutes int,
  ADD COLUMN IF NOT EXISTS scheduled_publish_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_draft boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS category text;

CREATE UNIQUE INDEX IF NOT EXISTS community_posts_slug_unique ON public.community_posts(slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS community_posts_published_at_idx ON public.community_posts(published_at DESC) WHERE post_type = 'blog';
CREATE INDEX IF NOT EXISTS community_posts_category_idx ON public.community_posts(category) WHERE post_type = 'blog';

-- Slugify helper
CREATE OR REPLACE FUNCTION public.slugify(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT trim(both '-' from regexp_replace(lower(coalesce(input, '')), '[^a-z0-9]+', '-', 'g'));
$$;

-- Generate unique slug
CREATE OR REPLACE FUNCTION public.generate_unique_blog_slug(_title text, _id uuid)
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
  IF base = '' OR base IS NULL THEN
    base := 'post';
  END IF;
  candidate := base;
  WHILE EXISTS (SELECT 1 FROM public.community_posts WHERE slug = candidate AND id <> coalesce(_id, '00000000-0000-0000-0000-000000000000'::uuid)) LOOP
    n := n + 1;
    candidate := base || '-' || n;
  END LOOP;
  RETURN candidate;
END;
$$;

-- Reading time calc (~ 200 wpm)
CREATE OR REPLACE FUNCTION public.calc_reading_time(_content text)
RETURNS int
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT GREATEST(1, ceil(array_length(regexp_split_to_array(coalesce(regexp_replace(_content, '<[^>]+>', ' ', 'g'), ''), '\s+'), 1)::numeric / 200))::int;
$$;

-- Trigger to auto-fill slug + reading time on blog posts
CREATE OR REPLACE FUNCTION public.community_posts_seo_autofill()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.post_type = 'blog' THEN
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
      NEW.slug := public.generate_unique_blog_slug(NEW.title, NEW.id);
    END IF;
    IF NEW.content IS NOT NULL THEN
      NEW.reading_time_minutes := public.calc_reading_time(NEW.content);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_community_posts_seo_autofill ON public.community_posts;
CREATE TRIGGER trg_community_posts_seo_autofill
  BEFORE INSERT OR UPDATE ON public.community_posts
  FOR EACH ROW EXECUTE FUNCTION public.community_posts_seo_autofill();

-- Backfill slugs for existing blog rows
UPDATE public.community_posts
SET slug = public.generate_unique_blog_slug(title, id)
WHERE post_type = 'blog' AND (slug IS NULL OR slug = '');
