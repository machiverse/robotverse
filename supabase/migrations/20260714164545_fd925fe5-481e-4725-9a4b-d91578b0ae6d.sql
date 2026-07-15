
CREATE OR REPLACE FUNCTION public.publish_scheduled_community_posts()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.community_posts
  SET status = 'published',
      is_draft = false,
      published_at = COALESCE(scheduled_publish_at, now()),
      updated_at = now()
  WHERE status = 'scheduled'
    AND scheduled_publish_at IS NOT NULL
    AND scheduled_publish_at <= now();
$$;
