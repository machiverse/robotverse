-- Update subscription_plans with new pricing as requested
UPDATE public.subscription_plans SET monthly_price = 999, annual_price = 9990, monthly_credits = 500 WHERE plan_type = 'basic';
UPDATE public.subscription_plans SET monthly_price = 2999, annual_price = 29990, monthly_credits = 1500 WHERE plan_type = 'standard';
UPDATE public.subscription_plans SET monthly_price = 4999, annual_price = 49990, monthly_credits = 3000 WHERE plan_type = 'premium';

-- Add Razorpay columns to subscription_plans if not exist
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS razorpay_plan_id TEXT;

-- Update credit packs with new pricing (₹500, ₹1000, ₹2000, ₹5000)
UPDATE public.credit_packs SET pack_name = '₹500 Credits', credits_amount = 500, price = 500, bonus_credits = 0 WHERE id = '7e78e216-4498-45d8-8fb4-7c641af17876';
UPDATE public.credit_packs SET pack_name = '₹1,000 Credits', credits_amount = 1000, price = 1000, bonus_credits = 0 WHERE id = '8943ec66-6a0a-46dc-a2e6-e214b670ec49';
UPDATE public.credit_packs SET pack_name = '₹2,000 Credits', credits_amount = 2000, price = 2000, bonus_credits = 0 WHERE id = '8f966611-e706-40ae-a5b6-5e6fcde2a079';
UPDATE public.credit_packs SET pack_name = '₹5,000 Credits', credits_amount = 5000, price = 5000, bonus_credits = 0 WHERE id = '74d3c166-a1e3-4d47-846c-de1414318c88';

-- Create subscriptions table for tracking user subscriptions with Razorpay
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.subscription_plans(id),
  plan_name TEXT NOT NULL DEFAULT 'free',
  razorpay_subscription_id TEXT,
  razorpay_customer_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  amount INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  billing_cycle TEXT DEFAULT 'monthly',
  start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_date TIMESTAMP WITH TIME ZONE,
  next_billing_date TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_active_subscription UNIQUE (user_id)
);

-- Create razorpay_orders table to track credit purchase orders
CREATE TABLE IF NOT EXISTS public.razorpay_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  razorpay_order_id TEXT NOT NULL UNIQUE,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  credits INTEGER NOT NULL,
  pack_id UUID REFERENCES public.credit_packs(id),
  status TEXT NOT NULL DEFAULT 'created',
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create webhook_events table to track Razorpay webhooks
CREATE TABLE IF NOT EXISTS public.razorpay_webhook_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.razorpay_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.razorpay_webhook_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscriptions
CREATE POLICY "Users can view their own subscription" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service can insert subscriptions" ON public.subscriptions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service can update subscriptions" ON public.subscriptions
  FOR UPDATE USING (true);

-- RLS Policies for razorpay_orders
CREATE POLICY "Users can view their own orders" ON public.razorpay_orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service can insert orders" ON public.razorpay_orders
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service can update orders" ON public.razorpay_orders
  FOR UPDATE USING (true);

-- RLS for webhook events (service only)
CREATE POLICY "Service can manage webhook events" ON public.razorpay_webhook_events
  FOR ALL USING (true);

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_razorpay_orders_updated_at ON public.razorpay_orders;
CREATE TRIGGER update_razorpay_orders_updated_at
  BEFORE UPDATE ON public.razorpay_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();