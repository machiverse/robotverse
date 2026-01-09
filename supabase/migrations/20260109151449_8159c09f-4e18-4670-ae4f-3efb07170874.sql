-- Create subscription_plans table
CREATE TABLE public.subscription_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_name TEXT NOT NULL,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('basic', 'standard', 'premium')),
  monthly_price NUMERIC NOT NULL DEFAULT 0,
  annual_price NUMERIC DEFAULT NULL,
  monthly_credits INTEGER NOT NULL DEFAULT 0,
  features JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create seller_credits table
CREATE TABLE public.seller_credits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_balance INTEGER NOT NULL DEFAULT 0,
  total_earned INTEGER NOT NULL DEFAULT 0,
  total_spent INTEGER NOT NULL DEFAULT 0,
  subscription_plan_id UUID REFERENCES public.subscription_plans(id),
  subscription_status TEXT DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 'cancelled', 'expired')),
  subscription_start_date TIMESTAMP WITH TIME ZONE,
  subscription_end_date TIMESTAMP WITH TIME ZONE,
  next_credit_refresh TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(seller_id)
);

-- Create credit_transactions table
CREATE TABLE public.credit_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'subscription_credit', 'lead_unlock', 'refund', 'bonus', 'expired')),
  credits_amount INTEGER NOT NULL,
  balance_before INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  description TEXT,
  reference_id UUID,
  reference_type TEXT,
  payment_id TEXT,
  payment_status TEXT DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create credit_packs table for pay-as-you-go purchases
CREATE TABLE public.credit_packs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pack_name TEXT NOT NULL,
  credits_amount INTEGER NOT NULL,
  price NUMERIC NOT NULL,
  bonus_credits INTEGER DEFAULT 0,
  is_popular BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unlocked_leads table to track which leads sellers have unlocked
CREATE TABLE public.unlocked_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.seller_leads(id) ON DELETE CASCADE,
  credits_used INTEGER NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(seller_id, lead_id)
);

-- Enable RLS on all tables
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unlocked_leads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscription_plans (public read)
CREATE POLICY "Anyone can view active subscription plans"
ON public.subscription_plans FOR SELECT
USING (is_active = true);

-- RLS Policies for seller_credits
CREATE POLICY "Sellers can view their own credits"
ON public.seller_credits FOR SELECT
USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can insert their own credits record"
ON public.seller_credits FOR INSERT
WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update their own credits"
ON public.seller_credits FOR UPDATE
USING (auth.uid() = seller_id);

-- RLS Policies for credit_transactions
CREATE POLICY "Sellers can view their own transactions"
ON public.credit_transactions FOR SELECT
USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can insert their own transactions"
ON public.credit_transactions FOR INSERT
WITH CHECK (auth.uid() = seller_id);

-- RLS Policies for credit_packs (public read)
CREATE POLICY "Anyone can view active credit packs"
ON public.credit_packs FOR SELECT
USING (is_active = true);

-- RLS Policies for unlocked_leads
CREATE POLICY "Sellers can view their unlocked leads"
ON public.unlocked_leads FOR SELECT
USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can insert unlocked leads"
ON public.unlocked_leads FOR INSERT
WITH CHECK (auth.uid() = seller_id);

-- Insert default subscription plans
INSERT INTO public.subscription_plans (plan_name, plan_type, monthly_price, annual_price, monthly_credits, features) VALUES
('Basic', 'basic', 999, 9990, 10, '["10 lead unlocks/month", "Basic CRM access", "Email support", "Lead management"]'),
('Standard', 'standard', 2499, 24990, 30, '["30 lead unlocks/month", "Full CRM access", "Priority support", "Advanced analytics", "Export leads"]'),
('Premium', 'premium', 4999, 49990, 100, '["100 lead unlocks/month", "Full CRM + API access", "Dedicated support", "Custom reports", "Bulk operations", "Team access"]');

-- Insert default credit packs
INSERT INTO public.credit_packs (pack_name, credits_amount, price, bonus_credits, is_popular) VALUES
('Starter Pack', 5, 599, 0, false),
('Value Pack', 15, 1499, 2, true),
('Business Pack', 30, 2499, 5, false),
('Enterprise Pack', 100, 6999, 20, false);

-- Create function to initialize seller credits
CREATE OR REPLACE FUNCTION public.initialize_seller_credits()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.seller_credits (seller_id, current_balance)
  VALUES (NEW.id, 0)
  ON CONFLICT (seller_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-create seller credits on user creation
CREATE TRIGGER on_auth_user_created_credits
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.initialize_seller_credits();