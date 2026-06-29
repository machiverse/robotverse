
-- =========================================================================
-- Phase 1: AI-SEO Platform Foundation
-- =========================================================================

-- 1. seo_metadata --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.seo_metadata (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type    text NOT NULL, -- 'robot' | 'spare_part' | 'service' | 'blog' | 'profile' | 'community_post' | 'category' | 'brand' | 'landing' | 'auction'
  content_id      text NOT NULL, -- text so we can key categories/brands/landing pages by slug too
  slug            text,
  title           text,
  meta_title      text,
  meta_description text,
  focus_keyword   text,
  keywords        text[] DEFAULT '{}',
  canonical_url   text,
  og_title        text,
  og_description  text,
  og_image        text,
  og_type         text,
  twitter_title   text,
  twitter_description text,
  twitter_image   text,
  twitter_card    text,
  jsonld          jsonb DEFAULT '[]'::jsonb,
  breadcrumb      jsonb DEFAULT '[]'::jsonb,
  faq             jsonb DEFAULT '[]'::jsonb,
  summary         text,
  highlights      jsonb DEFAULT '[]'::jsonb,
  ai_blocks       jsonb DEFAULT '{}'::jsonb, -- AEO/GEO: applications, industries, specs, pros, cons, use_cases, maintenance, buying_guide, comparison
  related         jsonb DEFAULT '{}'::jsonb, -- {robots:[], parts:[], services:[], blogs:[]}
  internal_links  jsonb DEFAULT '[]'::jsonb,
  external_links  jsonb DEFAULT '[]'::jsonb,
  tags            text[] DEFAULT '{}',
  rich_description text,
  content_hash    text,
  model           text,
  prompt_version  int DEFAULT 1,
  lang            text DEFAULT 'en',
  status          text DEFAULT 'pending', -- pending|completed|failed
  generated_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (content_type, content_id, lang)
);

CREATE INDEX IF NOT EXISTS seo_metadata_lookup_idx ON public.seo_metadata (content_type, content_id);
CREATE INDEX IF NOT EXISTS seo_metadata_slug_idx ON public.seo_metadata (slug);
CREATE INDEX IF NOT EXISTS seo_metadata_hash_idx ON public.seo_metadata (content_hash);

GRANT SELECT ON public.seo_metadata TO anon, authenticated;
GRANT ALL ON public.seo_metadata TO service_role;
ALTER TABLE public.seo_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "seo_metadata public read"
  ON public.seo_metadata FOR SELECT
  USING (true);

-- writes happen via edge functions running as service_role; no other policies.

-- 2. seo_jobs ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.seo_jobs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type    text NOT NULL,
  content_id      text NOT NULL,
  action          text NOT NULL DEFAULT 'generate', -- generate|regenerate|delete
  status          text NOT NULL DEFAULT 'pending',  -- pending|processing|completed|failed|skipped
  priority        int  NOT NULL DEFAULT 5,
  attempts        int  NOT NULL DEFAULT 0,
  last_error      text,
  payload         jsonb DEFAULT '{}'::jsonb,
  requested_by    uuid,
  started_at      timestamptz,
  finished_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS seo_jobs_pending_idx
  ON public.seo_jobs (status, priority, created_at)
  WHERE status IN ('pending','failed');
CREATE INDEX IF NOT EXISTS seo_jobs_target_idx
  ON public.seo_jobs (content_type, content_id);

GRANT ALL ON public.seo_jobs TO service_role;
ALTER TABLE public.seo_jobs ENABLE ROW LEVEL SECURITY;
-- No anon / authenticated policies: queue is service-role only.

-- 3. seo_image_metadata --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.seo_image_metadata (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type    text NOT NULL,
  content_id      text NOT NULL,
  image_url       text NOT NULL,
  alt             text,
  title           text,
  caption         text,
  description     text,
  width           int,
  height          int,
  mime_type       text,
  is_primary      boolean DEFAULT false,
  position        int DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (content_type, content_id, image_url)
);

CREATE INDEX IF NOT EXISTS seo_image_metadata_lookup_idx
  ON public.seo_image_metadata (content_type, content_id);

GRANT SELECT ON public.seo_image_metadata TO anon, authenticated;
GRANT ALL ON public.seo_image_metadata TO service_role;
ALTER TABLE public.seo_image_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "seo_image_metadata public read"
  ON public.seo_image_metadata FOR SELECT
  USING (true);

-- 4. shared updated_at trigger ------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS seo_metadata_set_updated_at ON public.seo_metadata;
CREATE TRIGGER seo_metadata_set_updated_at
  BEFORE UPDATE ON public.seo_metadata
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

DROP TRIGGER IF EXISTS seo_jobs_set_updated_at ON public.seo_jobs;
CREATE TRIGGER seo_jobs_set_updated_at
  BEFORE UPDATE ON public.seo_jobs
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

DROP TRIGGER IF EXISTS seo_image_metadata_set_updated_at ON public.seo_image_metadata;
CREATE TRIGGER seo_image_metadata_set_updated_at
  BEFORE UPDATE ON public.seo_image_metadata
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 5. enqueue helper ------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enqueue_seo_job(
  p_content_type text,
  p_content_id   text,
  p_action       text DEFAULT 'generate',
  p_priority     int  DEFAULT 5,
  p_payload      jsonb DEFAULT '{}'::jsonb,
  p_requested_by uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  -- collapse duplicate pending jobs for the same target
  UPDATE public.seo_jobs
     SET priority = LEAST(priority, p_priority),
         updated_at = now()
   WHERE content_type = p_content_type
     AND content_id   = p_content_id
     AND status = 'pending'
   RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    INSERT INTO public.seo_jobs (content_type, content_id, action, priority, payload, requested_by)
    VALUES (p_content_type, p_content_id, p_action, p_priority, COALESCE(p_payload, '{}'::jsonb), p_requested_by)
    RETURNING id INTO v_id;
  END IF;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.enqueue_seo_job(text,text,text,int,jsonb,uuid) TO authenticated, service_role;

-- Manual regenerate, ownership-checked, callable from the app.
CREATE OR REPLACE FUNCTION public.request_seo_regenerate(
  p_content_type text,
  p_content_id   text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_owns boolean := false;
  v_admin boolean := false;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'auth required';
  END IF;

  -- Admin override
  BEGIN
    v_admin := public.has_role(v_uid, 'admin'::public.app_role);
  EXCEPTION WHEN undefined_function OR undefined_object THEN
    v_admin := false;
  END;

  IF NOT v_admin THEN
    IF p_content_type = 'robot' THEN
      SELECT EXISTS (SELECT 1 FROM public.robots WHERE id::text = p_content_id AND seller_id = v_uid) INTO v_owns;
    ELSIF p_content_type = 'spare_part' THEN
      SELECT EXISTS (SELECT 1 FROM public.spare_parts WHERE id::text = p_content_id AND seller_id = v_uid) INTO v_owns;
    ELSIF p_content_type = 'service' THEN
      SELECT EXISTS (SELECT 1 FROM public.services WHERE id::text = p_content_id AND provider_id = v_uid) INTO v_owns;
    ELSIF p_content_type = 'blog' THEN
      SELECT EXISTS (SELECT 1 FROM public.blogs WHERE id::text = p_content_id AND author_id = v_uid) INTO v_owns;
    ELSIF p_content_type = 'community_post' THEN
      SELECT EXISTS (SELECT 1 FROM public.community_posts WHERE id::text = p_content_id AND user_id = v_uid) INTO v_owns;
    ELSIF p_content_type = 'profile' THEN
      v_owns := (p_content_id = v_uid::text);
    END IF;

    IF NOT v_owns THEN
      RAISE EXCEPTION 'not authorized to regenerate SEO for % %', p_content_type, p_content_id;
    END IF;
  END IF;

  RETURN public.enqueue_seo_job(p_content_type, p_content_id, 'regenerate', 1, '{"force":true}'::jsonb, v_uid);
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_seo_regenerate(text,text) TO authenticated;

-- 6. content-hash helpers ------------------------------------------------
CREATE OR REPLACE FUNCTION public.seo_hash(p text)
RETURNS text
LANGUAGE sql IMMUTABLE
AS $$ SELECT md5(coalesce(p,'')) $$;

-- 7. per-table triggers --------------------------------------------------
-- ROBOTS
CREATE OR REPLACE FUNCTION public.tg_seo_enqueue_robot()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.enqueue_seo_job('robot', NEW.id::text, 'generate', 3);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.title IS DISTINCT FROM OLD.title
       OR NEW.description IS DISTINCT FROM OLD.description
       OR NEW.brand IS DISTINCT FROM OLD.brand
       OR NEW.model IS DISTINCT FROM OLD.model
       OR NEW.category IS DISTINCT FROM OLD.category
       OR NEW.application IS DISTINCT FROM OLD.application
       OR NEW.payload IS DISTINCT FROM OLD.payload
       OR NEW.reach IS DISTINCT FROM OLD.reach
       OR NEW.condition IS DISTINCT FROM OLD.condition
       OR NEW.year_of_manufacture IS DISTINCT FROM OLD.year_of_manufacture
       OR NEW.images IS DISTINCT FROM OLD.images THEN
      PERFORM public.enqueue_seo_job('robot', NEW.id::text, 'generate', 5);
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.seo_metadata WHERE content_type='robot' AND content_id = OLD.id::text;
    DELETE FROM public.seo_image_metadata WHERE content_type='robot' AND content_id = OLD.id::text;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS robots_seo_enqueue ON public.robots;
CREATE TRIGGER robots_seo_enqueue
  AFTER INSERT OR UPDATE OR DELETE ON public.robots
  FOR EACH ROW EXECUTE FUNCTION public.tg_seo_enqueue_robot();

-- SPARE PARTS
CREATE OR REPLACE FUNCTION public.tg_seo_enqueue_spare_part()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.enqueue_seo_job('spare_part', NEW.id::text, 'generate', 3);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.name IS DISTINCT FROM OLD.name
       OR NEW.description IS DISTINCT FROM OLD.description
       OR NEW.brand IS DISTINCT FROM OLD.brand
       OR NEW.category IS DISTINCT FROM OLD.category
       OR NEW.part_number IS DISTINCT FROM OLD.part_number
       OR NEW.compatible_robots IS DISTINCT FROM OLD.compatible_robots
       OR NEW.images IS DISTINCT FROM OLD.images THEN
      PERFORM public.enqueue_seo_job('spare_part', NEW.id::text, 'generate', 5);
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.seo_metadata WHERE content_type='spare_part' AND content_id = OLD.id::text;
    DELETE FROM public.seo_image_metadata WHERE content_type='spare_part' AND content_id = OLD.id::text;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS spare_parts_seo_enqueue ON public.spare_parts;
CREATE TRIGGER spare_parts_seo_enqueue
  AFTER INSERT OR UPDATE OR DELETE ON public.spare_parts
  FOR EACH ROW EXECUTE FUNCTION public.tg_seo_enqueue_spare_part();

-- SERVICES
CREATE OR REPLACE FUNCTION public.tg_seo_enqueue_service()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.enqueue_seo_job('service', NEW.id::text, 'generate', 3);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.title IS DISTINCT FROM OLD.title
       OR NEW.description IS DISTINCT FROM OLD.description
       OR NEW.category IS DISTINCT FROM OLD.category
       OR NEW.images IS DISTINCT FROM OLD.images THEN
      PERFORM public.enqueue_seo_job('service', NEW.id::text, 'generate', 5);
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.seo_metadata WHERE content_type='service' AND content_id = OLD.id::text;
    DELETE FROM public.seo_image_metadata WHERE content_type='service' AND content_id = OLD.id::text;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS services_seo_enqueue ON public.services;
CREATE TRIGGER services_seo_enqueue
  AFTER INSERT OR UPDATE OR DELETE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.tg_seo_enqueue_service();

-- BLOGS
CREATE OR REPLACE FUNCTION public.tg_seo_enqueue_blog()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'published' THEN
      PERFORM public.enqueue_seo_job('blog', NEW.id::text, 'generate', 2);
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF (OLD.status <> 'published' AND NEW.status = 'published')
       OR NEW.title IS DISTINCT FROM OLD.title
       OR NEW.content IS DISTINCT FROM OLD.content
       OR NEW.excerpt IS DISTINCT FROM OLD.excerpt
       OR NEW.featured_image IS DISTINCT FROM OLD.featured_image
       OR NEW.category IS DISTINCT FROM OLD.category THEN
      IF NEW.status = 'published' THEN
        PERFORM public.enqueue_seo_job('blog', NEW.id::text, 'generate', 4);
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.seo_metadata WHERE content_type='blog' AND content_id = OLD.id::text;
    DELETE FROM public.seo_image_metadata WHERE content_type='blog' AND content_id = OLD.id::text;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS blogs_seo_enqueue ON public.blogs;
CREATE TRIGGER blogs_seo_enqueue
  AFTER INSERT OR UPDATE OR DELETE ON public.blogs
  FOR EACH ROW EXECUTE FUNCTION public.tg_seo_enqueue_blog();

-- PROFILES (company/seller pages)
CREATE OR REPLACE FUNCTION public.tg_seo_enqueue_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.enqueue_seo_job('profile', NEW.user_id::text, 'generate', 6);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.company_name IS DISTINCT FROM OLD.company_name
       OR NEW.full_name IS DISTINCT FROM OLD.full_name
       OR NEW.bio IS DISTINCT FROM OLD.bio
       OR NEW.specializations IS DISTINCT FROM OLD.specializations
       OR NEW.city IS DISTINCT FROM OLD.city
       OR NEW.state IS DISTINCT FROM OLD.state
       OR NEW.country IS DISTINCT FROM OLD.country
       OR NEW.avatar_url IS DISTINCT FROM OLD.avatar_url THEN
      PERFORM public.enqueue_seo_job('profile', NEW.user_id::text, 'generate', 6);
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.seo_metadata WHERE content_type='profile' AND content_id = OLD.user_id::text;
    DELETE FROM public.seo_image_metadata WHERE content_type='profile' AND content_id = OLD.user_id::text;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS profiles_seo_enqueue ON public.profiles;
CREATE TRIGGER profiles_seo_enqueue
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_seo_enqueue_profile();

-- COMMUNITY POSTS
CREATE OR REPLACE FUNCTION public.tg_seo_enqueue_community_post()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.enqueue_seo_job('community_post', NEW.id::text, 'generate', 6);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.title IS DISTINCT FROM OLD.title
       OR NEW.content IS DISTINCT FROM OLD.content THEN
      PERFORM public.enqueue_seo_job('community_post', NEW.id::text, 'generate', 7);
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.seo_metadata WHERE content_type='community_post' AND content_id = OLD.id::text;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS community_posts_seo_enqueue ON public.community_posts;
CREATE TRIGGER community_posts_seo_enqueue
  AFTER INSERT OR UPDATE OR DELETE ON public.community_posts
  FOR EACH ROW EXECUTE FUNCTION public.tg_seo_enqueue_community_post();
