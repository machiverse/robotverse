
-- Enums
DO $$ BEGIN
  CREATE TYPE public.coupon_discount_type AS ENUM ('percentage','fixed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.coupon_applies_to AS ENUM ('all','robots','categories','brands');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- seller_coupons table
CREATE TABLE IF NOT EXISTS public.seller_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  description text,
  discount_type public.coupon_discount_type NOT NULL,
  discount_value numeric(14,2) NOT NULL CHECK (discount_value > 0),
  min_order_amount numeric(14,2) NOT NULL DEFAULT 0,
  max_discount_amount numeric(14,2),
  start_date timestamptz NOT NULL DEFAULT now(),
  expiry_date timestamptz NOT NULL,
  usage_limit integer NOT NULL DEFAULT 0, -- 0 = unlimited
  usage_limit_per_customer integer NOT NULL DEFAULT 0,
  times_used integer NOT NULL DEFAULT 0,
  applies_to public.coupon_applies_to NOT NULL DEFAULT 'all',
  applicable_robot_ids uuid[] NOT NULL DEFAULT '{}',
  applicable_categories text[] NOT NULL DEFAULT '{}',
  applicable_brands text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  admin_disabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT seller_coupons_code_per_seller UNIQUE (seller_id, code),
  CONSTRAINT seller_coupons_dates_valid CHECK (expiry_date > start_date),
  CONSTRAINT seller_coupons_pct_max CHECK (discount_type <> 'percentage' OR discount_value <= 100)
);

CREATE INDEX IF NOT EXISTS idx_seller_coupons_seller ON public.seller_coupons(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_coupons_code ON public.seller_coupons(code);
CREATE INDEX IF NOT EXISTS idx_seller_coupons_active ON public.seller_coupons(is_active, admin_disabled);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.seller_coupons TO authenticated;
GRANT ALL ON public.seller_coupons TO service_role;

ALTER TABLE public.seller_coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers manage own coupons"
  ON public.seller_coupons FOR ALL
  USING (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Authenticated can view active coupons"
  ON public.seller_coupons FOR SELECT
  TO authenticated
  USING (is_active = true AND admin_disabled = false AND now() BETWEEN start_date AND expiry_date);

CREATE POLICY "Admins manage all coupons"
  ON public.seller_coupons FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- coupon_usages table
CREATE TABLE IF NOT EXISTS public.coupon_usages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES public.seller_coupons(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  robot_id uuid,
  original_price numeric(14,2) NOT NULL,
  discount_amount numeric(14,2) NOT NULL,
  final_price numeric(14,2) NOT NULL,
  order_reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coupon_usages_coupon ON public.coupon_usages(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usages_customer ON public.coupon_usages(coupon_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usages_seller ON public.coupon_usages(seller_id);

GRANT SELECT, INSERT ON public.coupon_usages TO authenticated;
GRANT ALL ON public.coupon_usages TO service_role;

ALTER TABLE public.coupon_usages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customer inserts own usage"
  ON public.coupon_usages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customer reads own usages"
  ON public.coupon_usages FOR SELECT TO authenticated
  USING (auth.uid() = customer_id);

CREATE POLICY "Seller reads own coupon usages"
  ON public.coupon_usages FOR SELECT TO authenticated
  USING (auth.uid() = seller_id);

CREATE POLICY "Admin reads all usages"
  ON public.coupon_usages FOR SELECT
  USING (public.is_admin());

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_seller_coupons_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_seller_coupons_updated_at ON public.seller_coupons;
CREATE TRIGGER trg_seller_coupons_updated_at
  BEFORE UPDATE ON public.seller_coupons
  FOR EACH ROW EXECUTE FUNCTION public.touch_seller_coupons_updated_at();

-- Validate coupon (preview, no recording)
CREATE OR REPLACE FUNCTION public.validate_and_apply_coupon(
  p_code text,
  p_seller_id uuid,
  p_robot_id uuid,
  p_order_amount numeric
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_coupon public.seller_coupons%ROWTYPE;
  v_robot record;
  v_uid uuid := auth.uid();
  v_customer_uses integer;
  v_discount numeric(14,2);
  v_final numeric(14,2);
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Sign in to apply a coupon');
  END IF;

  SELECT * INTO v_coupon FROM public.seller_coupons
    WHERE seller_id = p_seller_id AND upper(code) = upper(p_code)
    LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid coupon code');
  END IF;

  IF v_coupon.admin_disabled THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Coupon has been disabled');
  END IF;
  IF NOT v_coupon.is_active THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Coupon is inactive');
  END IF;
  IF now() < v_coupon.start_date THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Coupon not started yet');
  END IF;
  IF now() > v_coupon.expiry_date THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Coupon has expired');
  END IF;
  IF v_coupon.usage_limit > 0 AND v_coupon.times_used >= v_coupon.usage_limit THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Coupon usage limit reached');
  END IF;
  IF v_coupon.min_order_amount > 0 AND p_order_amount < v_coupon.min_order_amount THEN
    RETURN jsonb_build_object('valid', false, 'error',
      'Minimum order amount is ₹' || v_coupon.min_order_amount::text);
  END IF;

  IF v_coupon.usage_limit_per_customer > 0 THEN
    SELECT count(*) INTO v_customer_uses FROM public.coupon_usages
      WHERE coupon_id = v_coupon.id AND customer_id = v_uid;
    IF v_customer_uses >= v_coupon.usage_limit_per_customer THEN
      RETURN jsonb_build_object('valid', false, 'error', 'You have already used this coupon');
    END IF;
  END IF;

  IF v_coupon.applies_to <> 'all' AND p_robot_id IS NOT NULL THEN
    SELECT id, seller_id, robot_type, brand INTO v_robot
      FROM public.robots WHERE id = p_robot_id;
    IF v_coupon.applies_to = 'robots' AND NOT (p_robot_id = ANY(v_coupon.applicable_robot_ids)) THEN
      RETURN jsonb_build_object('valid', false, 'error', 'Coupon not valid for this robot');
    ELSIF v_coupon.applies_to = 'categories' AND NOT (v_robot.robot_type = ANY(v_coupon.applicable_categories)) THEN
      RETURN jsonb_build_object('valid', false, 'error', 'Coupon not valid for this category');
    ELSIF v_coupon.applies_to = 'brands' AND NOT (v_robot.brand = ANY(v_coupon.applicable_brands)) THEN
      RETURN jsonb_build_object('valid', false, 'error', 'Coupon not valid for this brand');
    END IF;
  END IF;

  IF v_coupon.discount_type = 'percentage' THEN
    v_discount := round(p_order_amount * v_coupon.discount_value / 100, 2);
    IF v_coupon.max_discount_amount IS NOT NULL AND v_discount > v_coupon.max_discount_amount THEN
      v_discount := v_coupon.max_discount_amount;
    END IF;
  ELSE
    v_discount := LEAST(v_coupon.discount_value, p_order_amount);
  END IF;

  v_final := GREATEST(p_order_amount - v_discount, 0);

  RETURN jsonb_build_object(
    'valid', true,
    'coupon_id', v_coupon.id,
    'code', v_coupon.code,
    'discount_type', v_coupon.discount_type,
    'discount_value', v_coupon.discount_value,
    'discount_amount', v_discount,
    'final_price', v_final,
    'original_price', p_order_amount
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_and_apply_coupon(text,uuid,uuid,numeric) TO authenticated;

-- Record coupon usage
CREATE OR REPLACE FUNCTION public.record_coupon_usage(
  p_coupon_id uuid,
  p_robot_id uuid,
  p_original_price numeric,
  p_order_reference text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_coupon public.seller_coupons%ROWTYPE;
  v_result jsonb;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO v_coupon FROM public.seller_coupons WHERE id = p_coupon_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Coupon not found');
  END IF;

  v_result := public.validate_and_apply_coupon(v_coupon.code, v_coupon.seller_id, p_robot_id, p_original_price);
  IF NOT (v_result->>'valid')::boolean THEN
    RETURN jsonb_build_object('success', false, 'error', v_result->>'error');
  END IF;

  INSERT INTO public.coupon_usages (
    coupon_id, seller_id, customer_id, robot_id,
    original_price, discount_amount, final_price, order_reference
  ) VALUES (
    v_coupon.id, v_coupon.seller_id, v_uid, p_robot_id,
    p_original_price,
    (v_result->>'discount_amount')::numeric,
    (v_result->>'final_price')::numeric,
    p_order_reference
  );

  UPDATE public.seller_coupons SET times_used = times_used + 1 WHERE id = v_coupon.id;

  RETURN jsonb_build_object('success', true,
    'discount_amount', v_result->>'discount_amount',
    'final_price', v_result->>'final_price');
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_coupon_usage(uuid,uuid,numeric,text) TO authenticated;
