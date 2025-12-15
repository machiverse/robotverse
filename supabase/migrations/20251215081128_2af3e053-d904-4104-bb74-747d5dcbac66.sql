-- Give all existing users 100 free credits
UPDATE public.profiles 
SET credits_balance = 100 
WHERE credits_balance IS NULL OR credits_balance < 100;

-- Set default credits_balance to 100 for new users
ALTER TABLE public.profiles 
ALTER COLUMN credits_balance SET DEFAULT 100;