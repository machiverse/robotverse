-- Update convert_view_to_lead function to fetch profile data
CREATE OR REPLACE FUNCTION public.convert_view_to_lead(p_view_id uuid, p_seller_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_view RECORD;
  v_profile RECORD;
  v_lead_id uuid;
  v_credits_needed integer := 10;
  v_current_balance integer;
  v_buyer_name text;
  v_buyer_email text;
  v_buyer_phone text;
  v_buyer_company text;
  v_buyer_location text;
BEGIN
  -- Get view details
  SELECT * INTO v_view FROM button_interactions WHERE id = p_view_id AND seller_id = p_seller_id;
  
  IF v_view IS NULL THEN
    RAISE EXCEPTION 'View not found or unauthorized';
  END IF;
  
  -- Check credits
  SELECT COALESCE(credits_balance, 0) INTO v_current_balance FROM profiles WHERE user_id = p_seller_id;
  
  IF v_current_balance < v_credits_needed THEN
    RAISE EXCEPTION 'Insufficient credits. Need % credits, have %', v_credits_needed, v_current_balance;
  END IF;
  
  -- Try to get profile data if user_id exists
  IF v_view.user_id IS NOT NULL THEN
    SELECT full_name, email, mobile_number, company_name, location 
    INTO v_profile 
    FROM profiles 
    WHERE user_id = v_view.user_id;
    
    IF v_profile IS NOT NULL THEN
      v_buyer_name := COALESCE(v_view.user_name, v_profile.full_name);
      v_buyer_email := COALESCE(v_view.user_email, v_profile.email);
      v_buyer_phone := COALESCE(v_view.user_mobile, v_profile.mobile_number);
      v_buyer_company := COALESCE(v_view.user_company, v_profile.company_name);
      v_buyer_location := COALESCE(v_view.user_location, v_profile.location);
    ELSE
      v_buyer_name := v_view.user_name;
      v_buyer_email := v_view.user_email;
      v_buyer_phone := v_view.user_mobile;
      v_buyer_company := v_view.user_company;
      v_buyer_location := v_view.user_location;
    END IF;
  ELSE
    v_buyer_name := v_view.user_name;
    v_buyer_email := v_view.user_email;
    v_buyer_phone := v_view.user_mobile;
    v_buyer_company := v_view.user_company;
    v_buyer_location := v_view.user_location;
  END IF;
  
  -- Create lead with profile data
  INSERT INTO seller_leads (
    seller_id,
    buyer_id,
    buyer_name,
    buyer_email,
    buyer_phone,
    buyer_company,
    buyer_location,
    item_id,
    item_type,
    item_name,
    source,
    status,
    is_unlocked
  ) VALUES (
    p_seller_id,
    v_view.user_id,
    v_buyer_name,
    v_buyer_email,
    v_buyer_phone,
    v_buyer_company,
    v_buyer_location,
    v_view.item_id,
    COALESCE(v_view.item_type, 'robots'),
    NULL,
    'product_view',
    'new',
    true
  ) RETURNING id INTO v_lead_id;
  
  -- Deduct credits
  UPDATE profiles SET credits_balance = credits_balance - v_credits_needed WHERE user_id = p_seller_id;
  
  -- Log transaction
  INSERT INTO seller_credit_transactions (seller_id, credits_amount, transaction_type, description, balance_after, lead_id)
  VALUES (p_seller_id, v_credits_needed, 'unlock', 'Credits used to convert view to lead', v_current_balance - v_credits_needed, v_lead_id);
  
  -- Delete the view from button_interactions
  DELETE FROM button_interactions WHERE id = p_view_id;
  
  RETURN v_lead_id;
END;
$$;