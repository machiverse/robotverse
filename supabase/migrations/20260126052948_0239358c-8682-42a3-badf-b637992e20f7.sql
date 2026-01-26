-- Update convert_view_to_lead function to correctly extract item_name from additional_data
CREATE OR REPLACE FUNCTION public.convert_view_to_lead(p_view_id UUID, p_seller_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_view RECORD;
  v_lead_id UUID;
  v_credits_balance INT;
  v_item_name TEXT;
BEGIN
  -- Get the view record
  SELECT * INTO v_view FROM public.button_interactions WHERE id = p_view_id;
  
  IF v_view IS NULL THEN
    RAISE EXCEPTION 'View not found';
  END IF;
  
  -- Check if seller has enough credits (10 credits for view conversion)
  SELECT current_balance INTO v_credits_balance FROM public.seller_credits WHERE seller_id = p_seller_id;
  
  IF v_credits_balance IS NULL OR v_credits_balance < 10 THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;
  
  -- Extract item_name from additional_data - check multiple possible paths
  v_item_name := COALESCE(
    v_view.additional_data->>'item_name',                           -- Direct item_name
    v_view.additional_data->'item_details'->>'name',                -- Nested in item_details.name
    v_view.additional_data->>'product_name',                        -- Alternative product_name
    v_view.button_name                                              -- Fallback to button_name
  );
  
  -- Insert the lead
  INSERT INTO public.seller_leads (
    seller_id, buyer_id, buyer_name, buyer_email, buyer_phone, buyer_company,
    buyer_location, item_id, item_type, item_name, source, status, is_unlocked
  ) VALUES (
    p_seller_id, v_view.user_id, v_view.user_name, v_view.user_email, 
    v_view.user_mobile, v_view.user_company, v_view.user_location,
    v_view.item_id, COALESCE(v_view.item_type, 'general'), 
    v_item_name,
    'view', 'new', true
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
    seller_id, transaction_type, credits_amount, balance_before, balance_after,
    description, reference_id, reference_type
  ) VALUES (
    p_seller_id, 'lead_conversion', -10, v_credits_balance, v_credits_balance - 10,
    'Converted product view to lead', v_lead_id::TEXT, 'lead'
  );
  
  RETURN v_lead_id;
END;
$$;