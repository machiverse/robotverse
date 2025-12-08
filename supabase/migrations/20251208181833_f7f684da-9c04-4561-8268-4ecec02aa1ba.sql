-- Create sequence for invoice numbers first
CREATE SEQUENCE IF NOT EXISTS invoice_sequence START 1;

-- Create seller_leads table for CRM functionality
CREATE TABLE IF NOT EXISTS public.seller_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL,
  buyer_id UUID,
  buyer_name TEXT,
  buyer_email TEXT,
  buyer_phone TEXT,
  buyer_company TEXT,
  item_id UUID,
  item_type TEXT NOT NULL DEFAULT 'general',
  item_name TEXT,
  source TEXT DEFAULT 'view',
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'quoted', 'negotiating', 'closed_won', 'closed_lost')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  notes TEXT,
  next_follow_up DATE,
  last_contacted_at TIMESTAMP WITH TIME ZONE,
  expected_value NUMERIC,
  currency TEXT DEFAULT 'INR',
  tags TEXT[],
  is_unlocked BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create seller_invoices table
CREATE TABLE IF NOT EXISTS public.seller_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE DEFAULT ('INV-' || EXTRACT(year FROM now()) || '-' || lpad((nextval('invoice_sequence'::regclass))::text, 6, '0')),
  seller_id UUID NOT NULL,
  lead_id UUID REFERENCES public.seller_leads(id) ON DELETE SET NULL,
  buyer_id UUID,
  buyer_name TEXT NOT NULL,
  buyer_email TEXT,
  buyer_phone TEXT,
  buyer_company TEXT,
  buyer_address TEXT,
  items JSONB NOT NULL DEFAULT '[]',
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax_rate NUMERIC DEFAULT 18,
  tax_amount NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'paid', 'cancelled', 'overdue')),
  due_date DATE,
  paid_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  terms TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create lead_activities table for tracking follow-ups and communication
CREATE TABLE IF NOT EXISTS public.lead_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.seller_leads(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('note', 'call', 'email', 'meeting', 'follow_up', 'status_change', 'invoice_sent', 'chat')),
  title TEXT NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  is_completed BOOLEAN DEFAULT false,
  reminder_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create seller_credit_transactions table
CREATE TABLE IF NOT EXISTS public.seller_credit_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL,
  lead_id UUID REFERENCES public.seller_leads(id) ON DELETE SET NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'unlock', 'refund', 'bonus')),
  credits_amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add credits column to profiles if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'credits_balance') THEN
    ALTER TABLE public.profiles ADD COLUMN credits_balance INTEGER DEFAULT 0;
  END IF;
END $$;

-- Enable RLS on all new tables
ALTER TABLE public.seller_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_credit_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for seller_leads
DROP POLICY IF EXISTS "Sellers can view their own leads" ON public.seller_leads;
DROP POLICY IF EXISTS "Sellers can create their own leads" ON public.seller_leads;
DROP POLICY IF EXISTS "Sellers can update their own leads" ON public.seller_leads;
DROP POLICY IF EXISTS "Sellers can delete their own leads" ON public.seller_leads;
CREATE POLICY "Sellers can view their own leads" ON public.seller_leads FOR SELECT USING (auth.uid() = seller_id);
CREATE POLICY "Sellers can create their own leads" ON public.seller_leads FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Sellers can update their own leads" ON public.seller_leads FOR UPDATE USING (auth.uid() = seller_id);
CREATE POLICY "Sellers can delete their own leads" ON public.seller_leads FOR DELETE USING (auth.uid() = seller_id);

-- RLS policies for seller_invoices
DROP POLICY IF EXISTS "Sellers can view their own invoices" ON public.seller_invoices;
DROP POLICY IF EXISTS "Sellers can create their own invoices" ON public.seller_invoices;
DROP POLICY IF EXISTS "Sellers can update their own invoices" ON public.seller_invoices;
DROP POLICY IF EXISTS "Sellers can delete their own invoices" ON public.seller_invoices;
CREATE POLICY "Sellers can view their own invoices" ON public.seller_invoices FOR SELECT USING (auth.uid() = seller_id);
CREATE POLICY "Sellers can create their own invoices" ON public.seller_invoices FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Sellers can update their own invoices" ON public.seller_invoices FOR UPDATE USING (auth.uid() = seller_id);
CREATE POLICY "Sellers can delete their own invoices" ON public.seller_invoices FOR DELETE USING (auth.uid() = seller_id);

-- RLS policies for lead_activities
DROP POLICY IF EXISTS "Sellers can view their own activities" ON public.lead_activities;
DROP POLICY IF EXISTS "Sellers can create their own activities" ON public.lead_activities;
DROP POLICY IF EXISTS "Sellers can update their own activities" ON public.lead_activities;
DROP POLICY IF EXISTS "Sellers can delete their own activities" ON public.lead_activities;
CREATE POLICY "Sellers can view their own activities" ON public.lead_activities FOR SELECT USING (auth.uid() = seller_id);
CREATE POLICY "Sellers can create their own activities" ON public.lead_activities FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Sellers can update their own activities" ON public.lead_activities FOR UPDATE USING (auth.uid() = seller_id);
CREATE POLICY "Sellers can delete their own activities" ON public.lead_activities FOR DELETE USING (auth.uid() = seller_id);

-- RLS policies for seller_credit_transactions
DROP POLICY IF EXISTS "Sellers can view their own transactions" ON public.seller_credit_transactions;
DROP POLICY IF EXISTS "System can create transactions" ON public.seller_credit_transactions;
CREATE POLICY "Sellers can view their own transactions" ON public.seller_credit_transactions FOR SELECT USING (auth.uid() = seller_id);
CREATE POLICY "System can create transactions" ON public.seller_credit_transactions FOR INSERT WITH CHECK (true);

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_seller_leads_updated_at ON public.seller_leads;
DROP TRIGGER IF EXISTS update_seller_invoices_updated_at ON public.seller_invoices;
CREATE TRIGGER update_seller_leads_updated_at BEFORE UPDATE ON public.seller_leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_seller_invoices_updated_at BEFORE UPDATE ON public.seller_invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to convert view to lead
CREATE OR REPLACE FUNCTION public.convert_view_to_lead(
  p_view_id UUID,
  p_seller_id UUID
) RETURNS UUID AS $$
DECLARE
  v_view RECORD;
  v_lead_id UUID;
BEGIN
  SELECT * INTO v_view FROM public.button_interactions WHERE id = p_view_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'View not found';
  END IF;
  
  INSERT INTO public.seller_leads (
    seller_id, buyer_id, buyer_name, buyer_email, buyer_phone, buyer_company,
    item_id, item_type, item_name, source, status
  ) VALUES (
    p_seller_id, v_view.user_id, v_view.user_name, v_view.user_email, 
    v_view.user_mobile, v_view.user_company, v_view.item_id, 
    COALESCE(v_view.item_type, 'general'), 
    (v_view.additional_data->>'item_name')::TEXT, 
    'view', 'new'
  )
  RETURNING id INTO v_lead_id;
  
  RETURN v_lead_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to deduct credits for unlocking buyer info
CREATE OR REPLACE FUNCTION public.unlock_buyer_with_credits(
  p_seller_id UUID,
  p_lead_id UUID,
  p_item_type TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_credits_needed INTEGER;
  v_current_balance INTEGER;
BEGIN
  IF p_item_type = 'robots' THEN
    v_credits_needed := 10;
  ELSE
    v_credits_needed := 5;
  END IF;
  
  SELECT COALESCE(credits_balance, 0) INTO v_current_balance 
  FROM public.profiles WHERE user_id = p_seller_id;
  
  IF v_current_balance < v_credits_needed THEN
    RETURN FALSE;
  END IF;
  
  UPDATE public.profiles 
  SET credits_balance = credits_balance - v_credits_needed 
  WHERE user_id = p_seller_id;
  
  UPDATE public.seller_leads
  SET is_unlocked = true
  WHERE id = p_lead_id;
  
  INSERT INTO public.seller_credit_transactions (
    seller_id, lead_id, transaction_type, credits_amount, 
    balance_after, description
  ) VALUES (
    p_seller_id, p_lead_id, 'unlock', -v_credits_needed, 
    v_current_balance - v_credits_needed, 
    'Unlocked buyer information for ' || p_item_type
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;