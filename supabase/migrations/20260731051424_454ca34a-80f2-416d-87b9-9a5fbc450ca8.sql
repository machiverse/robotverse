ALTER TABLE public.bid_email_log ADD COLUMN IF NOT EXISTS robot_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS bid_email_log_unique_event
  ON public.bid_email_log (bid_id, recipient_user_id, email_type);