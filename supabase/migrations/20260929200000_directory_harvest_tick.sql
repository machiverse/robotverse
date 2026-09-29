-- Directory photo harvest: a once-a-minute timer that restarts a stalled background search.
-- No tables are created or changed; it only schedules a call to the directory-photo-harvest
-- function's "tick" action, which does nothing unless a search job is running and has gone quiet.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule('directory-photo-harvest-tick')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'directory-photo-harvest-tick');

SELECT cron.schedule(
  'directory-photo-harvest-tick',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://cmahwgetrqczytnijbuk.supabase.co/functions/v1/directory-photo-harvest',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"action": "tick", "kind": "robots"}'::jsonb
  );
  $$
);
