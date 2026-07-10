
-- Ensure required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Drain the SEO job queue every 2 minutes by invoking the seo-generator edge function
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'drain-seo-jobs-queue') THEN
    PERFORM cron.unschedule('drain-seo-jobs-queue');
  END IF;
END $$;

SELECT cron.schedule(
  'drain-seo-jobs-queue',
  '*/2 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://cmahwgetrqczytnijbuk.supabase.co/functions/v1/seo-generator',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtYWh3Z2V0cnFjenl0bmlqYnVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzNTUxNDYsImV4cCI6MjA2ODkzMTE0Nn0.zmC3yOwfW5qw7mRzTt01AiP-xTWUEz7I5zn0Aoieerg"}'::jsonb,
    body := '{"batch": 25}'::jsonb
  ) AS request_id;
  $$
);

-- Backfill: enqueue every existing content row so the AI writes SEO metadata for all of them
INSERT INTO public.seo_jobs (content_type, content_id, action, priority, status)
SELECT 'robot', id::text, 'generate', 5, 'pending' FROM public.robots
ON CONFLICT DO NOTHING;

INSERT INTO public.seo_jobs (content_type, content_id, action, priority, status)
SELECT 'spare_part', id::text, 'generate', 5, 'pending' FROM public.spare_parts
ON CONFLICT DO NOTHING;

INSERT INTO public.seo_jobs (content_type, content_id, action, priority, status)
SELECT 'service', id::text, 'generate', 5, 'pending' FROM public.services
ON CONFLICT DO NOTHING;

INSERT INTO public.seo_jobs (content_type, content_id, action, priority, status)
SELECT 'blog', id::text, 'generate', 5, 'pending' FROM public.blogs
ON CONFLICT DO NOTHING;

INSERT INTO public.seo_jobs (content_type, content_id, action, priority, status)
SELECT 'community_post', id::text, 'generate', 5, 'pending' FROM public.community_posts
ON CONFLICT DO NOTHING;
