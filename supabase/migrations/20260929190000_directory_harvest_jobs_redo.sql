-- Directory photo harvest: allow a job to search again models that already have a photo.
-- Only touches the new directory_harvest_jobs table added today.
ALTER TABLE public.directory_harvest_jobs ADD COLUMN IF NOT EXISTS redo boolean NOT NULL DEFAULT false;
