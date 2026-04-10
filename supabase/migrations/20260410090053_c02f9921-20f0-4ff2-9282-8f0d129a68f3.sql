
-- Create auction status enum
CREATE TYPE public.auction_status AS ENUM ('upcoming', 'live', 'ended', 'sold', 'not_sold');
CREATE TYPE public.auction_type AS ENUM ('open', 'sealed');

-- Create auctions table
CREATE TABLE public.auctions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL,
  robot_id UUID REFERENCES public.robots(id) ON DELETE SET NULL,
  auction_title TEXT NOT NULL,
  description TEXT,
  auction_type public.auction_type NOT NULL DEFAULT 'open',
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  starting_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  min_increment NUMERIC(12,2) NOT NULL DEFAULT 100,
  reserve_price NUMERIC(12,2),
  buy_now_price NUMERIC(12,2),
  auto_extend_minutes INTEGER DEFAULT 5,
  current_highest_bid NUMERIC(12,2) DEFAULT 0,
  highest_bidder_id UUID,
  total_bids INTEGER DEFAULT 0,
  total_bidders INTEGER DEFAULT 0,
  status public.auction_status NOT NULL DEFAULT 'upcoming',
  currency TEXT NOT NULL DEFAULT 'INR',
  images TEXT[],
  is_featured BOOLEAN DEFAULT false,
  winner_id UUID,
  winner_notified BOOLEAN DEFAULT false,
  seller_accepted BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create auction_bids table
CREATE TABLE public.auction_bids (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auction_id UUID NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  bidder_id UUID NOT NULL,
  bid_amount NUMERIC(12,2) NOT NULL,
  is_winning_bid BOOLEAN DEFAULT false,
  is_auto_bid BOOLEAN DEFAULT false,
  max_auto_bid NUMERIC(12,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create auction_watchlist table
CREATE TABLE public.auction_watchlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auction_id UUID NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(auction_id, user_id)
);

-- Indexes
CREATE INDEX idx_auctions_status ON public.auctions(status);
CREATE INDEX idx_auctions_seller ON public.auctions(seller_id);
CREATE INDEX idx_auctions_end_time ON public.auctions(end_time);
CREATE INDEX idx_auction_bids_auction ON public.auction_bids(auction_id);
CREATE INDEX idx_auction_bids_bidder ON public.auction_bids(bidder_id);
CREATE INDEX idx_auction_watchlist_user ON public.auction_watchlist(user_id);

-- Enable RLS
ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_watchlist ENABLE ROW LEVEL SECURITY;

-- Auctions policies
CREATE POLICY "Anyone can view auctions" ON public.auctions FOR SELECT USING (true);
CREATE POLICY "Sellers can create auctions" ON public.auctions FOR INSERT TO authenticated WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Sellers can update own auctions" ON public.auctions FOR UPDATE TO authenticated USING (auth.uid() = seller_id);
CREATE POLICY "Sellers can delete own auctions" ON public.auctions FOR DELETE TO authenticated USING (auth.uid() = seller_id);

-- Bids policies
CREATE POLICY "View bids on open auctions" ON public.auction_bids FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.auctions WHERE id = auction_id AND auction_type = 'open')
  OR auth.uid() = bidder_id
  OR EXISTS (SELECT 1 FROM public.auctions WHERE id = auction_id AND seller_id = auth.uid())
);
CREATE POLICY "Authenticated users can place bids" ON public.auction_bids FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = bidder_id
  AND NOT EXISTS (SELECT 1 FROM public.auctions WHERE id = auction_id AND seller_id = auth.uid())
);

-- Watchlist policies
CREATE POLICY "Users can view own watchlist" ON public.auction_watchlist FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can add to watchlist" ON public.auction_watchlist FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove from watchlist" ON public.auction_watchlist FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_auctions_updated_at
  BEFORE UPDATE ON public.auctions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_crm_updated_at();

-- Function to place a bid with validation
CREATE OR REPLACE FUNCTION public.place_auction_bid(
  p_auction_id UUID,
  p_bidder_id UUID,
  p_bid_amount NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auction RECORD;
  v_bid_id UUID;
  v_new_bidders INTEGER;
BEGIN
  -- Get auction details with lock
  SELECT * INTO v_auction FROM auctions WHERE id = p_auction_id FOR UPDATE;
  
  IF v_auction IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Auction not found');
  END IF;
  
  IF v_auction.status != 'live' AND NOT (v_auction.status = 'upcoming' AND v_auction.start_time <= now()) THEN
    RETURN json_build_object('success', false, 'error', 'Auction is not currently live');
  END IF;
  
  IF v_auction.end_time < now() THEN
    RETURN json_build_object('success', false, 'error', 'Auction has ended');
  END IF;
  
  IF v_auction.seller_id = p_bidder_id THEN
    RETURN json_build_object('success', false, 'error', 'Cannot bid on your own auction');
  END IF;
  
  -- Check minimum bid
  IF p_bid_amount < GREATEST(v_auction.starting_price, COALESCE(v_auction.current_highest_bid, 0) + v_auction.min_increment) THEN
    RETURN json_build_object('success', false, 'error', 
      'Bid must be at least ' || (GREATEST(v_auction.starting_price, COALESCE(v_auction.current_highest_bid, 0) + v_auction.min_increment))::TEXT);
  END IF;
  
  -- Insert bid
  INSERT INTO auction_bids (auction_id, bidder_id, bid_amount)
  VALUES (p_auction_id, p_bidder_id, p_bid_amount)
  RETURNING id INTO v_bid_id;
  
  -- Count unique bidders
  SELECT COUNT(DISTINCT bidder_id) INTO v_new_bidders FROM auction_bids WHERE auction_id = p_auction_id;
  
  -- Update auction
  UPDATE auctions SET
    current_highest_bid = p_bid_amount,
    highest_bidder_id = p_bidder_id,
    total_bids = total_bids + 1,
    total_bidders = v_new_bidders,
    status = 'live',
    -- Auto-extend if bid in last N minutes
    end_time = CASE 
      WHEN v_auction.auto_extend_minutes IS NOT NULL 
        AND v_auction.end_time - now() < (v_auction.auto_extend_minutes || ' minutes')::INTERVAL
      THEN v_auction.end_time + (v_auction.auto_extend_minutes || ' minutes')::INTERVAL
      ELSE v_auction.end_time
    END,
    updated_at = now()
  WHERE id = p_auction_id;
  
  -- Mark previous winning bids as not winning
  UPDATE auction_bids SET is_winning_bid = false WHERE auction_id = p_auction_id AND id != v_bid_id;
  UPDATE auction_bids SET is_winning_bid = true WHERE id = v_bid_id;
  
  RETURN json_build_object('success', true, 'bid_id', v_bid_id, 'bid_amount', p_bid_amount);
END;
$$;
