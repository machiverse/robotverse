
ALTER TABLE public.auctions
  ADD COLUMN IF NOT EXISTS batch_id uuid,
  ADD COLUMN IF NOT EXISTS unit_number integer,
  ADD COLUMN IF NOT EXISTS batch_size integer;

CREATE INDEX IF NOT EXISTS idx_auctions_batch_id ON public.auctions(batch_id);
