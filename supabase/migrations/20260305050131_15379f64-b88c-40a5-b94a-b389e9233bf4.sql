
-- Add seller_model_type to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS seller_model_type TEXT DEFAULT 'subscription' 
CHECK (seller_model_type IN ('subscription', 'commission'));

-- Create deals table for tracking transactions
CREATE TABLE IF NOT EXISTS public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  buyer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  buyer_name TEXT NOT NULL,
  buyer_email TEXT,
  buyer_phone TEXT,
  buyer_company TEXT,
  product_id UUID,
  product_type TEXT,
  product_name TEXT NOT NULL,
  quote_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  deal_status TEXT NOT NULL DEFAULT 'lead_generated' 
    CHECK (deal_status IN ('lead_generated', 'quote_sent', 'negotiation', 'deal_won', 'deal_lost')),
  commission_rate NUMERIC(5,2) NOT NULL DEFAULT 5.00,
  commission_amount NUMERIC(12,2) GENERATED ALWAYS AS (CASE WHEN deal_status = 'deal_won' THEN quote_value * commission_rate / 100 ELSE 0 END) STORED,
  admin_verified BOOLEAN DEFAULT false,
  admin_verified_at TIMESTAMPTZ,
  admin_verified_by UUID REFERENCES auth.users(id),
  admin_notes TEXT,
  closing_date DATE,
  deal_number TEXT NOT NULL DEFAULT ('DEAL-' || generate_random_string(8)),
  notes TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create commission invoices table
CREATE TABLE IF NOT EXISTS public.commission_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL DEFAULT ('RV-INV-' || generate_random_string(8)),
  deal_value NUMERIC(12,2) NOT NULL,
  commission_rate NUMERIC(5,2) NOT NULL DEFAULT 5.00,
  commission_amount NUMERIC(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'paid', 'overdue', 'cancelled')),
  due_date DATE,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_invoices ENABLE ROW LEVEL SECURITY;

-- Deals policies: sellers see their own, admins see all
CREATE POLICY "Sellers can view own deals" ON public.deals
  FOR SELECT TO authenticated
  USING (seller_id = auth.uid() OR public.is_admin());

CREATE POLICY "Sellers can insert own deals" ON public.deals
  FOR INSERT TO authenticated
  WITH CHECK (seller_id = auth.uid());

CREATE POLICY "Sellers can update own deals" ON public.deals
  FOR UPDATE TO authenticated
  USING (seller_id = auth.uid() OR public.is_admin());

CREATE POLICY "Admins can delete deals" ON public.deals
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- Commission invoices policies
CREATE POLICY "Sellers can view own invoices" ON public.commission_invoices
  FOR SELECT TO authenticated
  USING (seller_id = auth.uid() OR public.is_admin());

CREATE POLICY "System can insert invoices" ON public.commission_invoices
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR seller_id = auth.uid());

CREATE POLICY "Admins can update invoices" ON public.commission_invoices
  FOR UPDATE TO authenticated
  USING (public.is_admin());

-- Trigger for updated_at
CREATE TRIGGER update_deals_updated_at
  BEFORE UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_commission_invoices_updated_at
  BEFORE UPDATE ON public.commission_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to auto-generate commission invoice when deal is won and admin verified
CREATE OR REPLACE FUNCTION public.generate_commission_invoice()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.deal_status = 'deal_won' AND NEW.admin_verified = true 
     AND (OLD.admin_verified = false OR OLD.deal_status != 'deal_won') THEN
    INSERT INTO public.commission_invoices (
      deal_id, seller_id, deal_value, commission_rate, commission_amount, due_date
    ) VALUES (
      NEW.id, NEW.seller_id, NEW.quote_value, NEW.commission_rate,
      NEW.quote_value * NEW.commission_rate / 100,
      (CURRENT_DATE + INTERVAL '30 days')::date
    )
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_generate_commission_invoice
  AFTER UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.generate_commission_invoice();
