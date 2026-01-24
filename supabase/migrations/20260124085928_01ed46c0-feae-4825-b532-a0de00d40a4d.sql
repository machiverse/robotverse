-- Update the initialize_seller_credits function to give 100 free credits to all new users
CREATE OR REPLACE FUNCTION public.initialize_seller_credits()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.seller_credits (seller_id, current_balance, total_earned)
  VALUES (NEW.id, 100, 100)
  ON CONFLICT (seller_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update existing users who have 0 or less credits to have 100 credits (one-time retroactive update)
UPDATE public.seller_credits 
SET current_balance = 100, total_earned = GREATEST(total_earned, 100)
WHERE current_balance < 100 AND total_spent = 0;