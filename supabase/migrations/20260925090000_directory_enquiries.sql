-- Leads captured from the public /directory page. Rows are written by the
-- send-directory-enquiry edge function using the service role.
CREATE TABLE IF NOT EXISTS public.directory_enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  company text,
  role text,
  interests text[] NOT NULL DEFAULT '{}',
  section text,
  item_name text,
  message text,
  page_url text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.directory_enquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view directory enquiries"
  ON public.directory_enquiries FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can update directory enquiries"
  ON public.directory_enquiries FOR UPDATE
  USING (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_directory_enquiries_created_at
  ON public.directory_enquiries (created_at DESC);
