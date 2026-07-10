
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
    body := '{"batch_size": 20}'::jsonb
  ) AS request_id;
  $$
);
