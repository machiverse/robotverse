CREATE TABLE IF NOT EXISTS public.directory_robot_images (
  catalog_id        text PRIMARY KEY,
  kind              text NOT NULL DEFAULT 'robots' CHECK (kind IN ('robots', 'tools', 'axes')),
  brand             text,
  model             text,
  name              text,
  status            text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'found', 'manual', 'not_found', 'rejected', 'error')),
  image_url         text,
  thumb_url         text,
  storage_path      text,
  source_image_url  text,
  source_page_url   text,
  source            text,
  bytes             integer,
  verified          boolean NOT NULL DEFAULT false,
  verify_note       text,
  attempts          integer NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS directory_robot_images_status_idx ON public.directory_robot_images (kind, status);

GRANT SELECT ON public.directory_robot_images TO anon;
GRANT SELECT ON public.directory_robot_images TO authenticated;
GRANT ALL ON public.directory_robot_images TO service_role;

ALTER TABLE public.directory_robot_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Directory photos are public" ON public.directory_robot_images;
CREATE POLICY "Directory photos are public"
  ON public.directory_robot_images FOR SELECT
  USING (true);