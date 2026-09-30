-- Directory "Parts & Components": OEM robot parts, EOAT, sensors, cameras, motors, drives, software...
-- NEW tables only; no existing table is created, altered or dropped.

-- One row per OEM product found on the manufacturer's / distributor's web pages.
CREATE TABLE IF NOT EXISTS public.directory_parts (
  id              text PRIMARY KEY,                 -- RVPart-<brand>-<model> slug
  category        text NOT NULL,                    -- e.g. Robot Parts / Devices / Tools / Software
  subcategory     text NOT NULL,                    -- e.g. Motors & Gearboxes
  component_type  text NOT NULL,                    -- e.g. Servo Motors
  brand           text NOT NULL,
  model           text NOT NULL,
  name            text NOT NULL,
  description     text,
  specs           jsonb NOT NULL DEFAULT '{}'::jsonb,
  applications    text[] NOT NULL DEFAULT '{}',
  compatible_with text[] NOT NULL DEFAULT '{}',
  image_url       text,
  thumb_url       text,
  source_url      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS directory_parts_cat_idx ON public.directory_parts (category, subcategory, component_type);
CREATE INDEX IF NOT EXISTS directory_parts_brand_idx ON public.directory_parts (brand);

GRANT SELECT ON public.directory_parts TO anon, authenticated;
GRANT ALL ON public.directory_parts TO service_role;
ALTER TABLE public.directory_parts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Directory parts are public" ON public.directory_parts;
CREATE POLICY "Directory parts are public" ON public.directory_parts FOR SELECT USING (true);

-- Work list for the search: one row per (component type, brand) to look up.
CREATE TABLE IF NOT EXISTS public.directory_parts_seeds (
  id              text PRIMARY KEY,
  category        text NOT NULL,
  subcategory     text NOT NULL,
  component_type  text NOT NULL,
  brand           text NOT NULL,
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'working', 'done', 'error')),
  found           integer NOT NULL DEFAULT 0,
  attempts        integer NOT NULL DEFAULT 0,
  note            text,
  updated_at      timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.directory_parts_seeds TO service_role;
ALTER TABLE public.directory_parts_seeds ENABLE ROW LEVEL SECURITY; -- no policies: server only

-- Once a minute, work through the next few seeds (does nothing when all are done).
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
SELECT cron.unschedule('directory-parts-harvest-tick')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'directory-parts-harvest-tick');
SELECT cron.schedule(
  'directory-parts-harvest-tick',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://cmahwgetrqczytnijbuk.supabase.co/functions/v1/directory-parts-harvest',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"action": "tick"}'::jsonb
  );
  $$
);
