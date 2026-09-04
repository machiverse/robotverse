-- ===== block_reasons: controlled taxonomy =====
CREATE TABLE IF NOT EXISTS public.block_reasons (
  code text PRIMARY KEY,
  label text NOT NULL,
  category text NOT NULL CHECK (category IN ('fraud','conduct','quality','compliance','inactive')),
  severity text NOT NULL CHECK (severity IN ('warning','suspension','permanent')),
  requires_evidence boolean DEFAULT true,
  description text,
  sort_order integer DEFAULT 0
);
GRANT SELECT ON public.block_reasons TO anon, authenticated;
GRANT ALL ON public.block_reasons TO service_role;
ALTER TABLE public.block_reasons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "block_reasons_public_read" ON public.block_reasons;
CREATE POLICY "block_reasons_public_read" ON public.block_reasons FOR SELECT USING (true);
DROP POLICY IF EXISTS "block_reasons_admin_write" ON public.block_reasons;
CREATE POLICY "block_reasons_admin_write" ON public.block_reasons FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

INSERT INTO public.block_reasons (code, label, category, severity, description, sort_order) VALUES
('fake_listing','Fake or misrepresented listing','fraud','permanent','Listed equipment that does not exist, or specs materially different from reality',10),
('payment_fraud','Payment fraud','fraud','permanent','Took payment without delivering, or attempted chargeback fraud',20),
('identity_fraud','False identity or company details','fraud','permanent','GST, PAN or company registration details do not match the claimed entity',30),
('stolen_goods','Suspected stolen or encumbered equipment','fraud','permanent','Equipment ownership cannot be established or is subject to a lien',40),
('off_platform','Repeatedly circumventing the platform','conduct','suspension','Systematically moving deals off-platform after using RobotVerse leads',50),
('harassment','Harassment or abusive conduct','conduct','permanent','Abusive messages to other users or to RobotVerse staff',60),
('spam','Spam or bulk unsolicited contact','conduct','suspension','Mass messaging users unrelated to their enquiries',70),
('repeated_no_show','Repeated failure to respond or honour quotes','quality','suspension','Three or more confirmed instances of abandoning an active deal',80),
('spec_misrepresent','Materially inaccurate specifications','quality','suspension','Payload, hours, controller or condition materially misstated',90),
('unsafe_equipment','Safety or compliance violation','compliance','permanent','Selling equipment with removed safety systems or invalid certification',100),
('sanctions_export','Export control or sanctions concern','compliance','permanent','Counterparty or destination raises export control issues',110),
('duplicate_account','Duplicate or ban-evasion account','conduct','permanent','Account created to evade an existing block',120)
ON CONFLICT (code) DO NOTHING;

-- ===== user_moderation: enforcement record (admin only) =====
CREATE TABLE IF NOT EXISTS public.user_moderation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_role text,
  action text NOT NULL CHECK (action IN ('warning','suspension','permanent_block','reinstated')),
  reason_code text REFERENCES public.block_reasons(code),
  reason_notes text NOT NULL,
  evidence_urls text[],
  related_listing_ids uuid[],
  related_ticket_ids uuid[],
  suspension_until timestamptz,
  is_active boolean DEFAULT true,
  appeal_status text DEFAULT 'none' CHECK (appeal_status IN ('none','submitted','under_review','upheld','overturned')),
  appeal_submitted_at timestamptz,
  appeal_text text,
  appeal_decided_at timestamptz,
  appeal_decided_by uuid,
  appeal_decision_notes text,
  actioned_by uuid NOT NULL,
  actioned_at timestamptz NOT NULL DEFAULT now(),
  reversed_by uuid,
  reversed_at timestamptz,
  reversal_reason text,
  email_sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_moderation_user_active ON public.user_moderation (user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_moderation_actioned_at ON public.user_moderation (actioned_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_moderation TO authenticated;
GRANT ALL ON public.user_moderation TO service_role;
ALTER TABLE public.user_moderation ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_moderation_admin_all" ON public.user_moderation;
CREATE POLICY "user_moderation_admin_all" ON public.user_moderation FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ===== user_trust: positive public signals only =====
CREATE TABLE IF NOT EXISTS public.user_trust (
  user_id uuid PRIMARY KEY,
  kyc_verified boolean DEFAULT false,
  gst_verified boolean DEFAULT false,
  company_verified boolean DEFAULT false,
  completed_transactions integer DEFAULT 0,
  avg_response_hours numeric,
  listings_verified integer DEFAULT 0,
  disputes_raised integer DEFAULT 0,
  disputes_upheld integer DEFAULT 0,
  member_since date,
  trust_tier text DEFAULT 'unverified' CHECK (trust_tier IN ('unverified','basic','verified','premium')),
  updated_at timestamptz DEFAULT now()
);
GRANT SELECT ON public.user_trust TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.user_trust TO authenticated;
GRANT ALL ON public.user_trust TO service_role;
ALTER TABLE public.user_trust ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_trust_public_read" ON public.user_trust;
CREATE POLICY "user_trust_public_read" ON public.user_trust FOR SELECT USING (true);
DROP POLICY IF EXISTS "user_trust_admin_insert" ON public.user_trust;
CREATE POLICY "user_trust_admin_insert" ON public.user_trust FOR INSERT TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "user_trust_admin_update" ON public.user_trust;
CREATE POLICY "user_trust_admin_update" ON public.user_trust FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "user_trust_admin_delete" ON public.user_trust;
CREATE POLICY "user_trust_admin_delete" ON public.user_trust FOR DELETE TO authenticated USING (public.is_admin());

DROP TRIGGER IF EXISTS trg_user_trust_updated_at ON public.user_trust;
CREATE TRIGGER trg_user_trust_updated_at BEFORE UPDATE ON public.user_trust
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== my_moderation_status: self-view, never exposes notes/evidence =====
-- security_invoker=false (default) is intentional: the underlying table is admin-only,
-- so the view runs as owner and is restricted to the caller's own rows by the WHERE clause.
CREATE OR REPLACE VIEW public.my_moderation_status AS
  SELECT id AS case_id, action, reason_code, suspension_until, appeal_status,
         appeal_submitted_at, appeal_decided_at, actioned_at
  FROM public.user_moderation
  WHERE user_id = auth.uid() AND is_active = true;
GRANT SELECT ON public.my_moderation_status TO authenticated;

-- ===== helper: is the user currently restricted (used by client gate via view) =====
CREATE OR REPLACE FUNCTION public.is_user_restricted(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_moderation
    WHERE user_id = _user_id AND is_active = true
      AND (action = 'permanent_block' OR (action = 'suspension' AND (suspension_until IS NULL OR suspension_until > now())))
  );
$$;

-- ===== appeal submission by the affected user (one appeal, within 14 days) =====
CREATE OR REPLACE FUNCTION public.submit_moderation_appeal(_case_id uuid, _appeal_text text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE rec public.user_moderation%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _appeal_text IS NULL OR length(trim(_appeal_text)) < 20 THEN
    RAISE EXCEPTION 'Please provide at least 20 characters describing your appeal';
  END IF;
  SELECT * INTO rec FROM public.user_moderation WHERE id = _case_id AND user_id = auth.uid() AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Case not found'; END IF;
  IF rec.appeal_status <> 'none' THEN RAISE EXCEPTION 'An appeal has already been submitted for this case'; END IF;
  IF rec.actioned_at < now() - interval '14 days' THEN RAISE EXCEPTION 'The 14-day appeal window for this case has closed'; END IF;
  UPDATE public.user_moderation
     SET appeal_status = 'submitted', appeal_text = left(_appeal_text, 4000), appeal_submitted_at = now()
   WHERE id = _case_id;
END;
$$;
REVOKE ALL ON FUNCTION public.submit_moderation_appeal(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.submit_moderation_appeal(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_restricted(uuid) TO authenticated, anon;