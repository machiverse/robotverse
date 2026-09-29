-- Real product photos for the Directory catalogue (robots, tools, axes).
-- NEW table only: no existing table is changed.
--
-- One row per catalogue item (RobotVerse ID such as RVRobot0001). The
-- directory-photo-harvest edge function finds a real photo of the model,
-- copies it into the public "robot-images" storage bucket and records it here.
-- The Directory shows image_url when status is 'found' or 'manual'.

CREATE TABLE IF NOT EXISTS public.directory_robot_images (
  catalog_id        text PRIMARY KEY,
  kind              text NOT NULL DEFAULT 'robots' CHECK (kind IN ('robots', 'tools', 'axes')),
  brand             text,
  model             text,
  name              text,
  status            text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'found', 'manual', 'not_found', 'rejected', 'error')),
  image_url         text,          -- public URL in our storage (what the website shows)
  thumb_url         text,          -- smaller copy for Directory cards
  storage_path      text,          -- robot-images/<storage_path>
  source_image_url  text,          -- where the photo was found
  source_page_url   text,          -- product page it came from (credit)
  source            text,          -- google | bing | oem-page | manual
  bytes             integer,
  verified          boolean NOT NULL DEFAULT false,  -- AI vision check: shows this kind of robot
  verify_note       text,
  attempts          integer NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS directory_robot_images_status_idx ON public.directory_robot_images (kind, status);

ALTER TABLE public.directory_robot_images ENABLE ROW LEVEL SECURITY;

-- Everyone can read the photo list (the Directory is public).
DROP POLICY IF EXISTS "Directory photos are public" ON public.directory_robot_images;
CREATE POLICY "Directory photos are public"
  ON public.directory_robot_images FOR SELECT
  USING (true);

-- No insert/update/delete policies: only the harvest edge function (service role)
-- writes, after checking the caller is an admin.
