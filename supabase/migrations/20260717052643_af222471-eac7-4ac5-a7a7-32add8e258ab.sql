
ALTER TYPE public.auction_status ADD VALUE IF NOT EXISTS 'cancelled';

ALTER TABLE public.auctions
  ADD COLUMN IF NOT EXISTS item_location text,
  ADD COLUMN IF NOT EXISTS inspection_details text,
  ADD COLUMN IF NOT EXISTS payment_terms text,
  ADD COLUMN IF NOT EXISTS delivery_terms text,
  ADD COLUMN IF NOT EXISTS warranty_period text,
  ADD COLUMN IF NOT EXISTS terms_and_conditions text;
