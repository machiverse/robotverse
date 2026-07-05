-- 1) API keys
CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  key_prefix text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  scopes text[] NOT NULL DEFAULT ARRAY['read']::text[],
  is_partner boolean NOT NULL DEFAULT false,
  partner_name text,
  rate_limit_per_hour integer NOT NULL DEFAULT 1000,
  revoked_at timestamptz,
  last_used_at timestamptz,
  request_count bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_api_keys_user ON public.api_keys(user_id);
CREATE INDEX idx_api_keys_hash ON public.api_keys(key_hash);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_keys TO authenticated;
GRANT ALL ON public.api_keys TO service_role;

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own api keys" ON public.api_keys FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Users create own api keys" ON public.api_keys FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Users update own api keys" ON public.api_keys FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Users delete own api keys" ON public.api_keys FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

-- 2) API key usage (rolling hourly)
CREATE TABLE public.api_key_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id uuid NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
  hour_bucket timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(api_key_id, hour_bucket)
);
CREATE INDEX idx_api_key_usage_key_hour ON public.api_key_usage(api_key_id, hour_bucket DESC);

GRANT SELECT ON public.api_key_usage TO authenticated;
GRANT ALL ON public.api_key_usage TO service_role;

ALTER TABLE public.api_key_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own key usage" ON public.api_key_usage FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.api_keys k WHERE k.id = api_key_id AND (k.user_id = auth.uid() OR public.is_admin())));

-- 3) API webhooks
CREATE TABLE public.api_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id uuid NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
  url text NOT NULL,
  events text[] NOT NULL DEFAULT ARRAY[]::text[],
  secret text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  last_delivered_at timestamptz,
  failure_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_api_webhooks_key ON public.api_webhooks(api_key_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_webhooks TO authenticated;
GRANT ALL ON public.api_webhooks TO service_role;

ALTER TABLE public.api_webhooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own webhooks" ON public.api_webhooks FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.api_keys k WHERE k.id = api_key_id AND (k.user_id = auth.uid() OR public.is_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.api_keys k WHERE k.id = api_key_id AND (k.user_id = auth.uid() OR public.is_admin())));

-- 4) Webhook deliveries log
CREATE TABLE public.api_webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id uuid NOT NULL REFERENCES public.api_webhooks(id) ON DELETE CASCADE,
  event text NOT NULL,
  payload jsonb NOT NULL,
  status_code integer,
  response_body text,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  success boolean NOT NULL DEFAULT false
);
CREATE INDEX idx_webhook_deliveries_webhook ON public.api_webhook_deliveries(webhook_id, attempted_at DESC);

GRANT SELECT ON public.api_webhook_deliveries TO authenticated;
GRANT ALL ON public.api_webhook_deliveries TO service_role;

ALTER TABLE public.api_webhook_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own webhook deliveries" ON public.api_webhook_deliveries FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.api_webhooks w
    JOIN public.api_keys k ON k.id = w.api_key_id
    WHERE w.id = webhook_id AND (k.user_id = auth.uid() OR public.is_admin())
  ));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.tg_api_keys_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER api_keys_touch BEFORE UPDATE ON public.api_keys
  FOR EACH ROW EXECUTE FUNCTION public.tg_api_keys_touch();
CREATE TRIGGER api_webhooks_touch BEFORE UPDATE ON public.api_webhooks
  FOR EACH ROW EXECUTE FUNCTION public.tg_api_keys_touch();