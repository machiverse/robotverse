
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE TABLE IF NOT EXISTS public.bid_email_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auction_id UUID NOT NULL,
  bid_id UUID,
  recipient_user_id UUID,
  recipient_email TEXT NOT NULL,
  email_type TEXT NOT NULL CHECK (email_type IN ('bid_confirmation','outbid_notification')),
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
  error_message TEXT,
  retry_count INT NOT NULL DEFAULT 0,
  bid_amount NUMERIC,
  highest_bid_amount NUMERIC,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.bid_email_log TO authenticated;
GRANT ALL ON public.bid_email_log TO service_role;

ALTER TABLE public.bid_email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all bid email logs"
  ON public.bid_email_log FOR SELECT
  TO authenticated
  USING (public.is_admin_user());

CREATE POLICY "Users can view own bid email logs"
  ON public.bid_email_log FOR SELECT
  TO authenticated
  USING (recipient_user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_bid_email_log_auction ON public.bid_email_log(auction_id);
CREATE INDEX IF NOT EXISTS idx_bid_email_log_status ON public.bid_email_log(status);
CREATE INDEX IF NOT EXISTS idx_bid_email_log_recipient ON public.bid_email_log(recipient_user_id);
