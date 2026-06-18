
DROP FUNCTION IF EXISTS public.place_auction_bid(uuid, uuid, numeric) CASCADE;

CREATE OR REPLACE FUNCTION public.place_auction_bid(
  p_auction_id uuid,
  p_bidder_id uuid,
  p_bid_amount numeric
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auction public.auctions%ROWTYPE;
  v_min_required numeric;
  v_extended boolean := false;
  v_now timestamptz := now();
BEGIN
  SELECT * INTO v_auction FROM public.auctions WHERE id = p_auction_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Auction not found');
  END IF;

  IF v_auction.seller_id = p_bidder_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sellers cannot bid on their own auction');
  END IF;

  IF v_auction.status IN ('ended','sold','cancelled') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Auction has ended');
  END IF;

  IF v_now < v_auction.start_time THEN
    RETURN jsonb_build_object('success', false, 'error', 'Auction has not started yet');
  END IF;

  IF v_now > v_auction.end_time THEN
    PERFORM public.finalize_auction(p_auction_id);
    RETURN jsonb_build_object('success', false, 'error', 'Auction has ended');
  END IF;

  v_min_required := CASE
    WHEN COALESCE(v_auction.current_highest_bid,0) = 0 THEN v_auction.starting_price
    ELSE v_auction.current_highest_bid + COALESCE(v_auction.min_increment, 100)
  END;

  IF p_bid_amount < v_min_required THEN
    RETURN jsonb_build_object('success', false, 'error',
      'Bid must be at least ' || v_min_required::text);
  END IF;

  INSERT INTO public.auction_bids(auction_id, bidder_id, bid_amount)
  VALUES (p_auction_id, p_bidder_id, p_bid_amount);

  IF (v_auction.end_time - v_now) < interval '5 minutes'
     AND v_auction.extensions_count < 3 THEN
    UPDATE public.auctions
    SET end_time = end_time + interval '5 minutes',
        original_end_time = COALESCE(original_end_time, v_auction.end_time),
        extensions_count = extensions_count + 1
    WHERE id = p_auction_id;
    v_extended := true;
    INSERT INTO public.auction_audit_log(auction_id, actor_id, action, after_data)
    VALUES (p_auction_id, p_bidder_id, 'auto_extend',
            jsonb_build_object('reason','last_minute_bid','extensions', v_auction.extensions_count + 1));
  END IF;

  UPDATE public.auctions
  SET current_highest_bid = p_bid_amount,
      highest_bidder_id = p_bidder_id,
      total_bids = COALESCE(total_bids,0) + 1,
      total_bidders = (SELECT COUNT(DISTINCT bidder_id) FROM public.auction_bids WHERE auction_id = p_auction_id),
      status = 'live',
      updated_at = now()
  WHERE id = p_auction_id;

  RETURN jsonb_build_object('success', true, 'extended', v_extended, 'new_highest_bid', p_bid_amount);
END;
$$;
GRANT EXECUTE ON FUNCTION public.place_auction_bid(uuid, uuid, numeric) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_end_auction(p_auction_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'not authorized');
  END IF;
  UPDATE public.auctions SET end_time = now() - interval '1 second' WHERE id = p_auction_id;
  RETURN public.finalize_auction(p_auction_id);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_end_auction(uuid) TO authenticated;
