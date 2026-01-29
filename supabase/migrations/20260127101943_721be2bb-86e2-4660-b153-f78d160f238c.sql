-- Create function to convert quote request to lead when unlocked
CREATE OR REPLACE FUNCTION public.convert_quote_to_lead(
  p_request_id UUID,
  p_seller_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request RECORD;
  v_lead_id UUID;
  v_credits_balance INTEGER;
  v_item_name TEXT;
BEGIN
  -- Get the quote request details from user_requests
  SELECT 
    id, user_id, user_name, user_email, user_phone, user_company,
    item_id, item_type, item_name, created_at
  INTO v_request
  FROM public.user_requests
  WHERE id = p_request_id 
    AND seller_id = p_seller_id
    AND request_type = 'get_quote';
  
  IF v_request IS NULL THEN
    RAISE EXCEPTION 'Quote request not found';
  END IF;
  
  -- Check if seller has enough credits (10 credits for quote unlock)
  SELECT current_balance INTO v_credits_balance FROM public.seller_credits WHERE seller_id = p_seller_id;
  
  IF v_credits_balance IS NULL OR v_credits_balance < 10 THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;
  
  -- Check if this quote request is already converted to a lead
  SELECT id INTO v_lead_id FROM public.seller_leads 
  WHERE seller_id = p_seller_id 
    AND source = 'quote_request' 
    AND (item_id = v_request.item_id OR item_id = v_request.id::text);
  
  IF v_lead_id IS NOT NULL THEN
    -- Already converted, just return existing lead ID
    RETURN v_lead_id;
  END IF;
  
  -- Get item name
  v_item_name := COALESCE(v_request.item_name, 'Quote Request');
  
  -- Insert the lead
  INSERT INTO public.seller_leads (
    seller_id, buyer_id, buyer_name, buyer_email, buyer_phone, buyer_company,
    item_id, item_type, item_name, source, status, is_unlocked
  ) VALUES (
    p_seller_id, 
    v_request.user_id, 
    v_request.user_name, 
    v_request.user_email, 
    v_request.user_phone, 
    v_request.user_company,
    v_request.item_id, 
    COALESCE(v_request.item_type, 'general'), 
    v_item_name,
    'quote_request', 
    'new', 
    true
  )
  RETURNING id INTO v_lead_id;
  
  -- Deduct credits
  UPDATE public.seller_credits 
  SET current_balance = current_balance - 10,
      total_spent = total_spent + 10,
      updated_at = NOW()
  WHERE seller_id = p_seller_id;
  
  -- Log credit transaction
  INSERT INTO public.credit_transactions (
    seller_id, transaction_type, credits_amount, 
    balance_before, balance_after, description,
    reference_id, reference_type
  ) VALUES (
    p_seller_id, 'quote_unlock', -10,
    v_credits_balance, v_credits_balance - 10,
    'Unlocked quote request from ' || COALESCE(v_request.user_name, 'Unknown') || ' for ' || v_item_name,
    p_request_id::text, 'quote_request'
  );
  
  -- Insert unlock record
  INSERT INTO public.unlocked_contacts (
    user_id, seller_id, item_id, item_type, credits_used
  ) VALUES (
    p_seller_id, v_request.user_id, COALESCE(v_request.item_id, v_request.id::text), 'quote_request', 10
  );
  
  RETURN v_lead_id;
END;
$$;