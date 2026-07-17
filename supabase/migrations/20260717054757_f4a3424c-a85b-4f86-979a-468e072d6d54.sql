
ALTER TABLE public.auctions
  ADD COLUMN IF NOT EXISTS extensions_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS original_end_time timestamptz,
  ADD COLUMN IF NOT EXISTS first_bid_at timestamptz,
  ADD COLUMN IF NOT EXISTS admin_status text;
