CREATE TABLE IF NOT EXISTS public.directory_harvest_jobs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind        text NOT NULL DEFAULT 'robots' CHECK (kind IN ('robots', 'tools', 'axes')),
  token       text NOT NULL DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  status      text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'stopped', 'done', 'error')),
  retry       boolean NOT NULL DEFAULT false,
  step        integer NOT NULL DEFAULT 0,
  processed   integer NOT NULL DEFAULT 0,
  found       integer NOT NULL DEFAULT 0,
  last_note   text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS directory_harvest_jobs_kind_idx ON public.directory_harvest_jobs (kind, created_at DESC);
GRANT ALL ON public.directory_harvest_jobs TO service_role;
ALTER TABLE public.directory_harvest_jobs ENABLE ROW LEVEL SECURITY;