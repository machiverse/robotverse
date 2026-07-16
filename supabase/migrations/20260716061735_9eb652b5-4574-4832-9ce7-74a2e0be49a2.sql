
-- Add preview token + analytics to blogs
ALTER TABLE public.blogs
  ADD COLUMN IF NOT EXISTS preview_token uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS preview_view_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS preview_last_viewed_at timestamptz;

ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS preview_token uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS preview_view_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS preview_last_viewed_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS blogs_preview_token_key ON public.blogs(preview_token);
CREATE UNIQUE INDEX IF NOT EXISTS community_posts_preview_token_key ON public.community_posts(preview_token);

-- Security-definer RPC to fetch a post by preview token, regardless of status,
-- so unauthenticated recipients of the link can view the draft/scheduled preview.
CREATE OR REPLACE FUNCTION public.get_post_by_preview_token(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row jsonb;
  v_profile jsonb;
  v_author uuid;
  v_source text;
BEGIN
  SELECT to_jsonb(cp.*), cp.author_id, 'community_posts'
    INTO v_row, v_author, v_source
  FROM public.community_posts cp
  WHERE cp.preview_token = p_token
  LIMIT 1;

  IF v_row IS NULL THEN
    SELECT to_jsonb(b.*), b.author_id, 'blogs'
      INTO v_row, v_author, v_source
    FROM public.blogs b
    WHERE b.preview_token = p_token
    LIMIT 1;
  END IF;

  IF v_row IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT to_jsonb(p) INTO v_profile
  FROM (
    SELECT full_name, company_name, avatar_url
    FROM public.profiles
    WHERE user_id = v_author
    LIMIT 1
  ) p;

  RETURN jsonb_build_object(
    'source', v_source,
    'post', v_row,
    'profile', v_profile
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_post_by_preview_token(uuid) TO anon, authenticated;

-- Increment preview view analytics
CREATE OR REPLACE FUNCTION public.increment_preview_view(p_token uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.community_posts
     SET preview_view_count = COALESCE(preview_view_count,0) + 1,
         preview_last_viewed_at = now()
   WHERE preview_token = p_token;

  IF NOT FOUND THEN
    UPDATE public.blogs
       SET preview_view_count = COALESCE(preview_view_count,0) + 1,
           preview_last_viewed_at = now()
     WHERE preview_token = p_token;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_preview_view(uuid) TO anon, authenticated;
