
-- Add seller stats columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS completed_sales INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS average_rating NUMERIC(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0;

-- Function to increment seller sales count
CREATE OR REPLACE FUNCTION public.increment_seller_sales(p_seller_id uuid)
RETURNS void
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

-- Function to recalculate seller average rating from reviews
CREATE OR REPLACE FUNCTION public.update_seller_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seller_id UUID;
  v_avg NUMERIC(3,2);
  v_count INTEGER;
BEGIN
  -- Get seller_id from the reviewed_user_id
  v_seller_id := COALESCE(NEW.reviewed_user_id, OLD.reviewed_user_id);
  
  IF v_seller_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Calculate new average
  SELECT 
    COALESCE(ROUND(AVG(overall_rating)::numeric, 2), 0),
    COUNT(*)
  INTO v_avg, v_count
  FROM reviews 
  WHERE reviewed_user_id = v_seller_id 
  AND status = 'published';
  
  -- Update profile
  UPDATE profiles 
  SET average_rating = v_avg,
      total_reviews = v_count,
      updated_at = NOW()
  WHERE user_id = v_seller_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger to auto-update seller rating on review changes
DROP TRIGGER IF EXISTS trigger_update_seller_rating ON reviews;
CREATE TRIGGER trigger_update_seller_rating
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW
EXECUTE FUNCTION update_seller_rating();
