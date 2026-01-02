-- =====================================================
-- COMPREHENSIVE CRM SYSTEM DATABASE SCHEMA
-- =====================================================

-- 1. Create ENUM types for CRM
DO $$ BEGIN
  CREATE TYPE public.lead_source_type AS ENUM (
    'website', 'inquiry', 'referral', 'exhibition', 'partner', 'direct', 'chat', 'phone', 'email', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.lead_type AS ENUM (
    'robot', 'spare_parts', 'tools', 'services', 'software', 'logistics', 'finance', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.opportunity_stage AS ENUM (
    'qualification', 'needs_analysis', 'proposal', 'negotiation', 'closed_won', 'closed_lost'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Create CRM Accounts table (for long-term customer management)
CREATE TABLE IF NOT EXISTS public.crm_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_name TEXT NOT NULL,
  account_type TEXT DEFAULT 'customer', -- customer, prospect, partner, vendor
  industry TEXT,
  company_size TEXT, -- small, medium, large, enterprise
  website TEXT,
  phone TEXT,
  email TEXT,
  billing_address TEXT,
  shipping_address TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'India',
  pincode TEXT,
  gst_number TEXT,
  pan_number TEXT,
  annual_revenue NUMERIC,
  currency TEXT DEFAULT 'INR',
  description TEXT,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  total_orders INTEGER DEFAULT 0,
  total_revenue NUMERIC DEFAULT 0,
  last_order_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create CRM Contacts table (multiple contacts per account)
CREATE TABLE IF NOT EXISTS public.crm_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.crm_accounts(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  mobile TEXT,
  designation TEXT,
  department TEXT,
  is_primary BOOLEAN DEFAULT false,
  is_decision_maker BOOLEAN DEFAULT false,
  linkedin_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Enhanced seller_leads table - Add missing columns
ALTER TABLE public.seller_leads 
  ADD COLUMN IF NOT EXISTS lead_source TEXT DEFAULT 'website',
  ADD COLUMN IF NOT EXISTS lead_type TEXT DEFAULT 'robot',
  ADD COLUMN IF NOT EXISTS product_category TEXT,
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS expected_close_date DATE,
  ADD COLUMN IF NOT EXISTS contact_person_name TEXT,
  ADD COLUMN IF NOT EXISTS contact_designation TEXT,
  ADD COLUMN IF NOT EXISTS industry_type TEXT,
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.crm_accounts(id),
  ADD COLUMN IF NOT EXISTS converted_to_opportunity BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS opportunity_id UUID,
  ADD COLUMN IF NOT EXISTS lost_reason TEXT,
  ADD COLUMN IF NOT EXISTS qualification_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0;

-- 5. Create Opportunities table
CREATE TABLE IF NOT EXISTS public.crm_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_number TEXT NOT NULL DEFAULT (('OPP-' || EXTRACT(year FROM now()) || '-' || lpad((nextval('invoice_sequence'::regclass))::text, 6, '0'))),
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.crm_accounts(id),
  lead_id UUID REFERENCES public.seller_leads(id),
  opportunity_name TEXT NOT NULL,
  description TEXT,
  stage TEXT DEFAULT 'qualification',
  probability INTEGER DEFAULT 10, -- percentage
  expected_value NUMERIC,
  weighted_value NUMERIC GENERATED ALWAYS AS (expected_value * probability / 100) STORED,
  currency TEXT DEFAULT 'INR',
  expected_close_date DATE,
  actual_close_date DATE,
  products JSONB DEFAULT '[]'::jsonb, -- Array of {product_id, product_type, name, quantity, unit_price, total}
  competitors TEXT[],
  next_step TEXT,
  win_reason TEXT,
  loss_reason TEXT,
  assigned_to UUID REFERENCES auth.users(id),
  is_closed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Create Quotations table
CREATE TABLE IF NOT EXISTS public.crm_quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_number TEXT NOT NULL DEFAULT (('QT-' || EXTRACT(year FROM now()) || '-' || lpad((nextval('invoice_sequence'::regclass))::text, 6, '0'))),
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES public.crm_opportunities(id),
  lead_id UUID REFERENCES public.seller_leads(id),
  account_id UUID REFERENCES public.crm_accounts(id),
  buyer_name TEXT NOT NULL,
  buyer_email TEXT,
  buyer_phone TEXT,
  buyer_company TEXT,
  buyer_address TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  discount_type TEXT DEFAULT 'percentage', -- percentage or fixed
  discount_value NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  tax_rate NUMERIC DEFAULT 18,
  tax_amount NUMERIC DEFAULT 0,
  shipping_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'INR',
  valid_until DATE,
  terms_conditions TEXT,
  notes TEXT,
  status TEXT DEFAULT 'draft', -- draft, sent, viewed, accepted, rejected, expired
  version INTEGER DEFAULT 1,
  parent_quotation_id UUID REFERENCES public.crm_quotations(id),
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Create Sales Tasks table
CREATE TABLE IF NOT EXISTS public.crm_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES auth.users(id),
  lead_id UUID REFERENCES public.seller_leads(id),
  opportunity_id UUID REFERENCES public.crm_opportunities(id),
  account_id UUID REFERENCES public.crm_accounts(id),
  task_type TEXT NOT NULL, -- call, email, meeting, site_visit, follow_up, demo, proposal, other
  subject TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium', -- low, medium, high, urgent
  status TEXT DEFAULT 'pending', -- pending, in_progress, completed, cancelled
  due_date TIMESTAMPTZ,
  reminder_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  outcome TEXT,
  duration_minutes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Create Activity/Interaction Logs
CREATE TABLE IF NOT EXISTS public.crm_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.seller_leads(id),
  opportunity_id UUID REFERENCES public.crm_opportunities(id),
  account_id UUID REFERENCES public.crm_accounts(id),
  contact_id UUID REFERENCES public.crm_contacts(id),
  activity_type TEXT NOT NULL, -- call, email, whatsapp, meeting, site_visit, note, status_change, quotation_sent, demo
  subject TEXT NOT NULL,
  description TEXT,
  outcome TEXT, -- positive, negative, neutral, no_answer
  duration_minutes INTEGER,
  call_direction TEXT, -- inbound, outbound
  email_subject TEXT,
  email_body TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  logged_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Create Document Management table
CREATE TABLE IF NOT EXISTS public.crm_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.seller_leads(id),
  opportunity_id UUID REFERENCES public.crm_opportunities(id),
  account_id UUID REFERENCES public.crm_accounts(id),
  quotation_id UUID REFERENCES public.crm_quotations(id),
  document_type TEXT NOT NULL, -- quotation, invoice, contract, brochure, proposal, other
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  version INTEGER DEFAULT 1,
  is_approved BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Create CRM Pipeline Stages (customizable)
CREATE TABLE IF NOT EXISTS public.crm_pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stage_name TEXT NOT NULL,
  stage_order INTEGER NOT NULL,
  stage_type TEXT DEFAULT 'lead', -- lead or opportunity
  color TEXT DEFAULT '#3B82F6',
  is_won_stage BOOLEAN DEFAULT false,
  is_lost_stage BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  probability INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_crm_accounts_seller ON public.crm_accounts(seller_id);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_seller ON public.crm_contacts(seller_id);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_account ON public.crm_contacts(account_id);
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_seller ON public.crm_opportunities(seller_id);
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_account ON public.crm_opportunities(account_id);
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_lead ON public.crm_opportunities(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_quotations_seller ON public.crm_quotations(seller_id);
CREATE INDEX IF NOT EXISTS idx_crm_quotations_opportunity ON public.crm_quotations(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_seller ON public.crm_tasks(seller_id);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_due_date ON public.crm_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_crm_activity_logs_seller ON public.crm_activity_logs(seller_id);
CREATE INDEX IF NOT EXISTS idx_crm_activity_logs_lead ON public.crm_activity_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_seller_leads_account ON public.seller_leads(account_id);
CREATE INDEX IF NOT EXISTS idx_seller_leads_opportunity ON public.seller_leads(opportunity_id);

-- 12. Enable RLS on all new tables
ALTER TABLE public.crm_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_pipeline_stages ENABLE ROW LEVEL SECURITY;

-- 13. Create RLS policies for CRM tables
-- Accounts
CREATE POLICY "Sellers can manage their own accounts" ON public.crm_accounts FOR ALL USING (seller_id = auth.uid());
CREATE POLICY "Admins can view all accounts" ON public.crm_accounts FOR SELECT USING (is_admin());

-- Contacts
CREATE POLICY "Sellers can manage their own contacts" ON public.crm_contacts FOR ALL USING (seller_id = auth.uid());
CREATE POLICY "Admins can view all contacts" ON public.crm_contacts FOR SELECT USING (is_admin());

-- Opportunities
CREATE POLICY "Sellers can manage their own opportunities" ON public.crm_opportunities FOR ALL USING (seller_id = auth.uid());
CREATE POLICY "Admins can view all opportunities" ON public.crm_opportunities FOR SELECT USING (is_admin());

-- Quotations
CREATE POLICY "Sellers can manage their own quotations" ON public.crm_quotations FOR ALL USING (seller_id = auth.uid());
CREATE POLICY "Admins can view all quotations" ON public.crm_quotations FOR SELECT USING (is_admin());

-- Tasks
CREATE POLICY "Sellers can manage their own tasks" ON public.crm_tasks FOR ALL USING (seller_id = auth.uid());
CREATE POLICY "Assigned users can view their tasks" ON public.crm_tasks FOR SELECT USING (assigned_to = auth.uid());
CREATE POLICY "Admins can view all tasks" ON public.crm_tasks FOR SELECT USING (is_admin());

-- Activity Logs
CREATE POLICY "Sellers can manage their own activity logs" ON public.crm_activity_logs FOR ALL USING (seller_id = auth.uid());
CREATE POLICY "Admins can view all activity logs" ON public.crm_activity_logs FOR SELECT USING (is_admin());

-- Documents
CREATE POLICY "Sellers can manage their own documents" ON public.crm_documents FOR ALL USING (seller_id = auth.uid());
CREATE POLICY "Admins can view all documents" ON public.crm_documents FOR SELECT USING (is_admin());

-- Pipeline Stages
CREATE POLICY "Sellers can manage their own pipeline stages" ON public.crm_pipeline_stages FOR ALL USING (seller_id = auth.uid());

-- 14. Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_crm_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS update_crm_accounts_updated_at ON public.crm_accounts;
CREATE TRIGGER update_crm_accounts_updated_at BEFORE UPDATE ON public.crm_accounts FOR EACH ROW EXECUTE FUNCTION public.update_crm_updated_at();

DROP TRIGGER IF EXISTS update_crm_contacts_updated_at ON public.crm_contacts;
CREATE TRIGGER update_crm_contacts_updated_at BEFORE UPDATE ON public.crm_contacts FOR EACH ROW EXECUTE FUNCTION public.update_crm_updated_at();

DROP TRIGGER IF EXISTS update_crm_opportunities_updated_at ON public.crm_opportunities;
CREATE TRIGGER update_crm_opportunities_updated_at BEFORE UPDATE ON public.crm_opportunities FOR EACH ROW EXECUTE FUNCTION public.update_crm_updated_at();

DROP TRIGGER IF EXISTS update_crm_quotations_updated_at ON public.crm_quotations;
CREATE TRIGGER update_crm_quotations_updated_at BEFORE UPDATE ON public.crm_quotations FOR EACH ROW EXECUTE FUNCTION public.update_crm_updated_at();

DROP TRIGGER IF EXISTS update_crm_tasks_updated_at ON public.crm_tasks;
CREATE TRIGGER update_crm_tasks_updated_at BEFORE UPDATE ON public.crm_tasks FOR EACH ROW EXECUTE FUNCTION public.update_crm_updated_at();

DROP TRIGGER IF EXISTS update_crm_documents_updated_at ON public.crm_documents;
CREATE TRIGGER update_crm_documents_updated_at BEFORE UPDATE ON public.crm_documents FOR EACH ROW EXECUTE FUNCTION public.update_crm_updated_at();