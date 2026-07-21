
CREATE TABLE IF NOT EXISTS public.auction_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id uuid NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  actor_id uuid,
  action text NOT NULL,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.auction_audit_log TO authenticated;
GRANT ALL ON public.auction_audit_log TO service_role;

ALTER TABLE public.auction_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers view own auction audit log"
  ON public.auction_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.auctions a
      WHERE a.id = auction_audit_log.auction_id AND a.seller_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_auction_audit_log_auction ON public.auction_audit_log(auction_id, created_at DESC);
