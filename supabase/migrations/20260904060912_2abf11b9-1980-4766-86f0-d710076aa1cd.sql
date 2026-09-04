-- ============================================================
-- Procurement Intelligence layer (additive)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.robot_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oem text NOT NULL,
  model text NOT NULL,
  series text,
  payload_kg numeric NOT NULL,
  reach_mm integer NOT NULL,
  axes smallint DEFAULT 6,
  controller_gen text[],
  mounting text[],
  ip_rating text,
  repeatability_mm numeric,
  robot_weight_kg numeric,
  power_kva numeric,
  supply_voltage text,
  applications text[],
  lifecycle_status text CHECK (lifecycle_status IN ('current','legacy','obsolete')),
  spares_risk text CHECK (spares_risk IN ('low','medium','high')),
  successor_model text,
  datasheet_url text,
  verified_on date NOT NULL DEFAULT current_date,
  created_at timestamptz DEFAULT now(),
  UNIQUE (oem, model)
);
CREATE INDEX IF NOT EXISTS robot_models_payload_idx ON public.robot_models (payload_kg);
CREATE INDEX IF NOT EXISTS robot_models_reach_idx ON public.robot_models (reach_mm);
CREATE INDEX IF NOT EXISTS robot_models_applications_gin ON public.robot_models USING GIN (applications);

GRANT SELECT ON public.robot_models TO anon, authenticated;
GRANT ALL ON public.robot_models TO service_role;
ALTER TABLE public.robot_models ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "robot_models_public_select" ON public.robot_models;
CREATE POLICY "robot_models_public_select" ON public.robot_models FOR SELECT USING (true);

-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.external_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid REFERENCES public.robot_models(id) ON DELETE SET NULL,
  raw_model_text text NOT NULL,
  year integer,
  condition_grade text,
  asking_price numeric,
  currency text DEFAULT 'EUR',
  location_country text,
  seller_name text,
  source_platform text NOT NULL,
  source_url text NOT NULL,
  verified_on date NOT NULL DEFAULT current_date,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS external_listings_model_idx ON public.external_listings (model_id);

GRANT SELECT ON public.external_listings TO anon, authenticated;
GRANT ALL ON public.external_listings TO service_role;
ALTER TABLE public.external_listings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "external_listings_public_select" ON public.external_listings;
CREATE POLICY "external_listings_public_select" ON public.external_listings FOR SELECT USING (true);

CREATE OR REPLACE VIEW public.external_listings_view
WITH (security_invoker = true) AS
SELECT
  el.*,
  (current_date - el.verified_on) > 30 AS is_stale,
  (current_date - el.verified_on) AS days_old
FROM public.external_listings el;
GRANT SELECT ON public.external_listings_view TO anon, authenticated, service_role;

-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dealer_network (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  country text,
  region text,
  oem_specialties text[],
  payload_focus text,
  contact_email text,
  contact_phone text,
  typical_lead_days integer,
  relationship text CHECK (relationship IN ('partner','contacted','cold')),
  notes text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dealer_network_oem_gin ON public.dealer_network USING GIN (oem_specialties);

-- Confidential: no anon grant at all. Admin-only read via RLS.
GRANT SELECT ON public.dealer_network TO authenticated;
GRANT ALL ON public.dealer_network TO service_role;
ALTER TABLE public.dealer_network ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dealer_network_admin_select" ON public.dealer_network;
CREATE POLICY "dealer_network_admin_select" ON public.dealer_network
  FOR SELECT TO authenticated USING (public.is_admin());

-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sourcing_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  requested_oem text,
  requested_model text,
  required_payload_kg numeric,
  required_reach_mm integer,
  application text,
  budget_min numeric,
  budget_max numeric,
  buyer_location text,
  timeline text,
  matched_tier smallint,
  result_count integer,
  source_channel text DEFAULT 'site_ai',
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sourcing_signals_created_idx ON public.sourcing_signals (created_at DESC);

GRANT INSERT ON public.sourcing_signals TO anon;
GRANT SELECT, INSERT ON public.sourcing_signals TO authenticated;
GRANT ALL ON public.sourcing_signals TO service_role;
ALTER TABLE public.sourcing_signals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sourcing_signals_anyone_insert" ON public.sourcing_signals;
CREATE POLICY "sourcing_signals_anyone_insert" ON public.sourcing_signals
  FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "sourcing_signals_admin_select" ON public.sourcing_signals;
CREATE POLICY "sourcing_signals_admin_select" ON public.sourcing_signals
  FOR SELECT TO authenticated USING (public.is_admin());

-- ============================================================
-- SEED: robot_models (12 reference rows)
-- WARNING: every row below MUST be verified against the OEM datasheet
-- before production use. Figures not confidently known are NULL, never guessed.
-- ============================================================
INSERT INTO public.robot_models
  (oem, model, series, payload_kg, reach_mm, axes, controller_gen, mounting, ip_rating, repeatability_mm, robot_weight_kg, power_kva, supply_voltage, applications, lifecycle_status, spares_risk, successor_model, datasheet_url, verified_on)
VALUES
  ('FANUC','R-2000iC/165F','R-2000iC',165,2655,6,ARRAY['R-30iB','R-30iB Plus'],ARRAY['floor'],'IP54 body / IP67 wrist',0.05,1090,NULL,'380-575 V AC, 50/60 Hz',ARRAY['spot_weld','material_handling','machine_tending'],'current','low',NULL,'https://www.fanuc.eu/eu-en/product/robot/r-2000ic-165f',current_date),
  ('FANUC','R-2000iC/210F','R-2000iC',210,2655,6,ARRAY['R-30iB','R-30iB Plus'],ARRAY['floor'],'IP54 body / IP67 wrist',0.05,1240,NULL,'380-575 V AC, 50/60 Hz',ARRAY['spot_weld','material_handling','machine_tending'],'current','low',NULL,'https://www.fanuc.eu/eu-en/product/robot/r-2000ic-210f',current_date),
  ('FANUC','M-710iC/50','M-710iC',50,2050,6,ARRAY['R-30iA','R-30iB','R-30iB Plus'],ARRAY['floor','ceiling','angle'],'IP67',0.07,560,NULL,'380-575 V AC, 50/60 Hz',ARRAY['material_handling','machine_tending','palletizing','arc_weld'],'current','low',NULL,'https://www.fanuc.eu/eu-en/product/robot/m-710ic-50',current_date),
  ('FANUC','M-900iB/360','M-900iB',360,2655,6,ARRAY['R-30iB','R-30iB Plus'],ARRAY['floor'],'IP54 body / IP67 wrist',0.10,NULL,NULL,'380-575 V AC, 50/60 Hz',ARRAY['material_handling','palletizing','spot_weld'],'current','low',NULL,'https://www.fanuc.eu/eu-en/product/robot/m-900ib-360',current_date),
  ('FANUC','M-20iA','M-20iA',20,1811,6,ARRAY['R-30iA','R-30iB','R-30iB Plus'],ARRAY['floor','ceiling','angle','wall'],'IP67',0.08,250,NULL,'380-575 V AC, 50/60 Hz',ARRAY['material_handling','machine_tending','arc_weld','dispensing'],'current','low',NULL,'https://www.fanuc.eu/eu-en/product/robot/m-20ia',current_date),
  ('ABB','IRB 6640-235/2.55','IRB 6640',235,2550,6,ARRAY['IRC5'],ARRAY['floor'],'IP67',0.05,NULL,NULL,'200-600 V AC, 50/60 Hz',ARRAY['spot_weld','material_handling','machine_tending'],'legacy','medium','IRB 6700-235/2.65','https://new.abb.com/products/robotics/robots/articulated-robots/irb-6640',current_date),
  ('ABB','IRB 2600-20/1.65','IRB 2600',20,1650,6,ARRAY['IRC5','OmniCore'],ARRAY['floor','wall','inverted','tilted'],'IP67',0.04,272,NULL,'200-600 V AC, 50/60 Hz',ARRAY['arc_weld','material_handling','machine_tending'],'current','low',NULL,'https://new.abb.com/products/robotics/robots/articulated-robots/irb-2600',current_date),
  ('ABB','IRB 4600-60/2.05','IRB 4600',60,2050,6,ARRAY['IRC5','OmniCore'],ARRAY['floor','inverted','tilted'],'IP67',0.05,425,NULL,'200-600 V AC, 50/60 Hz',ARRAY['arc_weld','material_handling','machine_tending','dispensing'],'current','low',NULL,'https://new.abb.com/products/robotics/robots/articulated-robots/irb-4600',current_date),
  ('KUKA','KR 210 R2700','KR QUANTEC',210,2700,6,ARRAY['KR C4','KR C5'],ARRAY['floor','ceiling'],'IP65',0.06,NULL,NULL,'400 V AC, 50/60 Hz',ARRAY['spot_weld','material_handling','palletizing','machine_tending'],'current','low',NULL,'https://www.kuka.com/en-in/products/robotics-systems/industrial-robots/kr-quantec',current_date),
  ('KUKA','KR 16 R2010','KR CYBERTECH nano',16,2013,6,ARRAY['KR C4','KR C5'],ARRAY['floor','ceiling','wall'],'IP65',0.04,235,NULL,'400 V AC, 50/60 Hz',ARRAY['arc_weld','material_handling','machine_tending'],'current','low',NULL,'https://www.kuka.com/en-in/products/robotics-systems/industrial-robots/kr-cybertech',current_date),
  ('Yaskawa','MH50 II','MH',50,2061,6,ARRAY['DX200','YRC1000'],ARRAY['floor','ceiling','wall'],'IP67',0.07,550,NULL,NULL,ARRAY['material_handling','machine_tending','palletizing'],'legacy','medium','GP50','https://www.motoman.com/en-us/products/robots/industrial/assembly-handling/mh-series/mh50-ii',current_date),
  ('Yaskawa','GP180','GP',180,2702,6,ARRAY['YRC1000'],ARRAY['floor'],'IP67',0.05,NULL,NULL,NULL,ARRAY['spot_weld','material_handling','palletizing','machine_tending'],'current','low',NULL,'https://www.motoman.com/en-us/products/robots/industrial/assembly-handling/gp-series/gp180',current_date)
ON CONFLICT (oem, model) DO NOTHING;