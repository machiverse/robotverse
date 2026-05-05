
-- 1. PROFILES: Remove overly permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can view profiles count for statistics" ON public.profiles;

-- Provide a safe aggregate count function for public statistics
CREATE OR REPLACE FUNCTION public.get_public_profile_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int FROM public.profiles;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_profile_count() TO anon, authenticated;

-- 2. SUBSCRIPTIONS: Lock down INSERT/UPDATE
DROP POLICY IF EXISTS "Service can insert subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Service can update subscriptions" ON public.subscriptions;

-- Only service role (webhook) can write. No public RLS write access.
-- (Service role bypasses RLS automatically.)

-- 3. RAZORPAY WEBHOOK EVENTS: Admins only for visibility; service role still bypasses
DROP POLICY IF EXISTS "Service can manage webhook events" ON public.razorpay_webhook_events;

CREATE POLICY "Admins can view webhook events"
ON public.razorpay_webhook_events
FOR SELECT
USING (public.is_admin_user());

-- 4. STORAGE: robot-documents owner-only update/delete
DROP POLICY IF EXISTS "Robot owners can update their documents" ON storage.objects;
DROP POLICY IF EXISTS "Robot owners can delete their documents" ON storage.objects;

CREATE POLICY "Robot owners can update their documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'robot-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Robot owners can delete their documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'robot-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Also tighten upload to require owner-prefixed path
DROP POLICY IF EXISTS "Robot owners can upload documents" ON storage.objects;
CREATE POLICY "Robot owners can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'robot-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 5. CONTACT UNLOCK: Server-side credit validation
CREATE OR REPLACE FUNCTION public.unlock_contact_with_credits(
  p_seller_id uuid,
  p_item_id uuid,
  p_item_type text,
  p_item_name text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_current_balance integer;
  v_new_balance integer;
  v_total_spent integer;
  v_credits_required constant integer := 5;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF v_user_id = p_seller_id THEN
    RETURN jsonb_build_object('status', 'self', 'new_balance', NULL);
  END IF;

  -- Already unlocked?
  IF EXISTS (
    SELECT 1 FROM public.unlocked_contacts
    WHERE user_id = v_user_id
      AND seller_id = p_seller_id
      AND item_id = p_item_id
      AND item_type = p_item_type
  ) THEN
    RETURN jsonb_build_object('status', 'already_unlocked');
  END IF;

  -- Lock and read balance
  SELECT current_balance, total_spent INTO v_current_balance, v_total_spent
  FROM public.seller_credits
  WHERE seller_id = v_user_id
  FOR UPDATE;

  IF v_current_balance IS NULL THEN
    -- Initialise with starter balance for new users
    INSERT INTO public.seller_credits (seller_id, current_balance, total_earned, total_spent)
    VALUES (v_user_id, 100, 100, 0)
    RETURNING current_balance, total_spent INTO v_current_balance, v_total_spent;
  END IF;

  IF v_current_balance < v_credits_required THEN
    RAISE EXCEPTION 'Insufficient credits: % required, % available',
      v_credits_required, v_current_balance
      USING ERRCODE = 'P0001';
  END IF;

  v_new_balance := v_current_balance - v_credits_required;

  UPDATE public.seller_credits
  SET current_balance = v_new_balance,
      total_spent = COALESCE(total_spent, 0) + v_credits_required,
      updated_at = now()
  WHERE seller_id = v_user_id;

  INSERT INTO public.unlocked_contacts (
    user_id, seller_id, item_id, item_type, credits_used
  ) VALUES (
    v_user_id, p_seller_id, p_item_id, p_item_type, v_credits_required
  );

  INSERT INTO public.credit_transactions (
    seller_id, transaction_type, credits_amount,
    balance_before, balance_after,
    description, reference_id, reference_type
  ) VALUES (
    v_user_id, 'contact_unlock', -v_credits_required,
    v_current_balance, v_new_balance,
    'Unlocked contact for ' || p_item_type || COALESCE(': ' || p_item_name, ''),
    p_item_id, p_item_type
  );

  RETURN jsonb_build_object(
    'status', 'success',
    'new_balance', v_new_balance
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.unlock_contact_with_credits(uuid, uuid, text, text) TO authenticated;

-- Remove direct insert path so the RPC is the only way
DROP POLICY IF EXISTS "Users can unlock contacts" ON public.unlocked_contacts;
