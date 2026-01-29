-- Drop and recreate the function with correct column names
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
  v_current_balance INTEGER;
  v_new_balance INTEGER;
  v_lead_id UUID;
  v_item_name TEXT;
  v_credits_required INTEGER := 10;
BEGIN
  -- Fetch the quote request details with correct column names
  SELECT 
    id, user_id, seller_id, item_id, item_type, item_name,
    user_name, email_address, mobile_number, company_name
  INTO v_request
  FROM public.user_requests
  WHERE id = p_request_id AND seller_id = p_seller_id;

  IF v_request IS NULL THEN
    RAISE EXCEPTION 'Quote request not found or access denied';
  END IF;

  -- Check if already converted to a lead
  IF EXISTS (
    SELECT 1 FROM public.seller_leads 
    WHERE seller_id = p_seller_id 
    AND buyer_id = v_request.user_id 
    AND item_id = v_request.item_id
    AND source = 'quote_request'
  ) THEN
    -- Return existing lead id
    SELECT id INTO v_lead_id FROM public.seller_leads 
    WHERE seller_id = p_seller_id 
    AND buyer_id = v_request.user_id 
    AND item_id = v_request.item_id
    AND source = 'quote_request'
    LIMIT 1;
    RETURN v_lead_id;
  END IF;

  -- Check seller credits
  SELECT current_balance INTO v_current_balance
  FROM public.seller_credits
  WHERE seller_id = p_seller_id;

  IF v_current_balance IS NULL OR v_current_balance < v_credits_required THEN
    RAISE EXCEPTION 'Insufficient credits. You need % credits to unlock.', v_credits_required;
  END IF;

  v_new_balance := v_current_balance - v_credits_required;
  v_item_name := COALESCE(v_request.item_name, 'Unknown Item');

  -- Create the lead with correct field mappings
  INSERT INTO public.seller_leads (
    seller_id,
    buyer_id,
    buyer_name,
    buyer_email,
    buyer_phone,
    buyer_company,
    item_id,
    item_type,
    item_name,
    source,
    status,
    is_unlocked,
    unlocked_at
  ) VALUES (
    p_seller_id,
    v_request.user_id,
    v_request.user_name,
    v_request.email_address,  -- Correct column name
    v_request.mobile_number,  -- Correct column name
    v_request.company_name,
    v_request.item_id,
    COALESCE(v_request.item_type, 'general'),
    v_item_name,
    'quote_request',
    'new',
    true,
    NOW()
  )
  RETURNING id INTO v_lead_id;

  -- Record credit transaction
  INSERT INTO public.credit_transactions (
    seller_id,
    transaction_type,
    credits_amount,
    balance_before,
    balance_after,
    description,
    reference_id,
    reference_type
  ) VALUES (
    p_seller_id,
    'quote_unlock',
    -v_credits_required,
    v_current_balance,
    v_new_balance,
    'Unlocked quote request for ' || v_item_name,
    v_request.id::TEXT,
    'quote_request'
  );

  -- Update seller credits
  UPDATE public.seller_credits
  SET 
    current_balance = v_new_balance,
    total_spent = total_spent + v_credits_required,
    updated_at = NOW()
  WHERE seller_id = p_seller_id;

  -- Create unlocked contact record
  INSERT INTO public.unlocked_contacts (
    user_id,
    seller_id,
    item_id,
    item_type,
    credits_used
  ) VALUES (
    p_seller_id,
    v_request.user_id,
    v_request.item_id,
    COALESCE(v_request.item_type, 'quote_request'),
    v_credits_required
  )
  ON CONFLICT DO NOTHING;

  -- Update quote request status
  UPDATE public.user_requests
  SET status = 'unlocked', updated_at = NOW()
  WHERE id = p_request_id;

  RETURN v_lead_id;
END;
$$;