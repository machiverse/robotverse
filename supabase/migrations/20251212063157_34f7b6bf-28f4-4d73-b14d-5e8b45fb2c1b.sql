-- Update the convert_view_to_lead function to:
-- 1. Check if seller has at least 10 credits
-- 2. Deduct 10 credits from seller
-- 3. Create the lead with is_unlocked = true (buyer info visible)
-- 4. Delete the view from button_interactions
-- 5. Log credit transaction

CREATE OR REPLACE FUNCTION public.convert_view_to_lead(p_view_id UUID, p_seller_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_view RECORD;
  v_lead_id UUID;
  v_credits_balance INTEGER;
  v_credits_cost INTEGER := 10;
  v_new_balance INTEGER;
BEGIN
  -- Check seller's credit balance
  SELECT credits_balance INTO v_credits_balance 
  FROM public.profiles 
  WHERE user_id = p_seller_id;
  
  IF v_credits_balance IS NULL OR v_credits_balance < v_credits_cost THEN
    RAISE EXCEPTION 'Insufficient credits. You need 10 credits to convert a view to lead.';
  END IF;
  
  -- Get the view
  SELECT * INTO v_view FROM public.button_interactions WHERE id = p_view_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'View not found';
  END IF;
  
  -- Deduct credits from seller
  v_new_balance := v_credits_balance - v_credits_cost;
  UPDATE public.profiles 
  SET credits_balance = v_new_balance, updated_at = now()
  WHERE user_id = p_seller_id;
  
  -- Create lead with is_unlocked = true (buyer info immediately visible)
  INSERT INTO public.seller_leads (
    seller_id, buyer_id, buyer_name, buyer_email, buyer_phone, buyer_company,
    item_id, item_type, item_name, source, status, is_unlocked
  ) VALUES (
    p_seller_id, v_view.user_id, v_view.user_name, v_view.user_email, 
    v_view.user_mobile, v_view.user_company, v_view.item_id, 
    COALESCE(v_view.item_type, 'general'), 
    (v_view.additional_data->>'item_name')::TEXT, 
    'view', 'new', true
  )
  RETURNING id INTO v_lead_id;
  
  -- Log credit transaction
  INSERT INTO public.seller_credit_transactions (
    seller_id, lead_id, transaction_type, credits_amount, balance_after, description
  ) VALUES (
    p_seller_id, v_lead_id, 'debit', v_credits_cost, v_new_balance, 
    'Lead conversion: ' || COALESCE(v_view.user_name, 'Unknown buyer')
  );
  
  -- Delete the view from button_interactions
  DELETE FROM public.button_interactions WHERE id = p_view_id;
  
  RETURN v_lead_id;
END;
$$;