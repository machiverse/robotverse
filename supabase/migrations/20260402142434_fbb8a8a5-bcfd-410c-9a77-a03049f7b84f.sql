
-- Fix: Make increment_seller_sales a SECURITY DEFINER function so buyers can trigger it
CREATE OR REPLACE FUNCTION public.increment_seller_sales(p_seller_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles 
  SET completed_sales = COALESCE(completed_sales, 0) + 1,
      updated_at = NOW()
  WHERE user_id = p_seller_id;
END;
$$;

-- Also fix update_seller_rating to be SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.update_seller_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seller_id UUID;
  v_avg NUMERIC(3,2);
  v_count INTEGER;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_seller_id := OLD.seller_id;
  ELSE
    v_seller_id := NEW.seller_id;
  END IF;

  SELECT COALESCE(AVG(rating), 0), COUNT(*)
  INTO v_avg, v_count
  FROM reviews
  WHERE seller_id = v_seller_id;

  UPDATE profiles
  SET average_rating = v_avg,
      total_reviews = v_count,
      updated_at = NOW()
  WHERE user_id = v_seller_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- Sync existing accepted quotations: count accepted quotes per seller and update
UPDATE profiles p
SET completed_sales = sub.cnt
FROM (
  SELECT seller_id, COUNT(*) as cnt 
  FROM crm_quotations 
  WHERE status = 'accepted' 
  GROUP BY seller_id
) sub
WHERE p.user_id = sub.seller_id;
