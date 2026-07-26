
ALTER TABLE public.auction_bids
  ADD COLUMN IF NOT EXISTS bidder_name text,
  ADD COLUMN IF NOT EXISTS bidder_company text,
  ADD COLUMN IF NOT EXISTS bidder_email text,
  ADD COLUMN IF NOT EXISTS bidder_phone text,
  ADD COLUMN IF NOT EXISTS bidder_location text;

CREATE OR REPLACE FUNCTION public.tg_auction_bids_snapshot_bidder()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p RECORD;
BEGIN
  SELECT full_name, company_name, email, phone, mobile_number, location
    INTO p
    FROM public.profiles
   WHERE user_id = NEW.bidder_id
   LIMIT 1;

  IF FOUND THEN
    NEW.bidder_name := COALESCE(NEW.bidder_name, p.full_name);
    NEW.bidder_company := COALESCE(NEW.bidder_company, p.company_name);
    NEW.bidder_email := COALESCE(NEW.bidder_email, p.email);
    NEW.bidder_phone := COALESCE(NEW.bidder_phone, p.phone, p.mobile_number);
    NEW.bidder_location := COALESCE(NEW.bidder_location, p.location);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auction_bids_snapshot_bidder ON public.auction_bids;
CREATE TRIGGER auction_bids_snapshot_bidder
  BEFORE INSERT ON public.auction_bids
  FOR EACH ROW EXECUTE FUNCTION public.tg_auction_bids_snapshot_bidder();

-- Backfill any existing rows missing snapshot data
UPDATE public.auction_bids b
   SET bidder_name = COALESCE(b.bidder_name, p.full_name),
       bidder_company = COALESCE(b.bidder_company, p.company_name),
       bidder_email = COALESCE(b.bidder_email, p.email),
       bidder_phone = COALESCE(b.bidder_phone, p.phone, p.mobile_number),
       bidder_location = COALESCE(b.bidder_location, p.location)
  FROM public.profiles p
 WHERE p.user_id = b.bidder_id
   AND (b.bidder_name IS NULL OR b.bidder_email IS NULL);
