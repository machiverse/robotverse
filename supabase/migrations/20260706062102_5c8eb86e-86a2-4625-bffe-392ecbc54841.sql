GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_keys TO authenticated;
GRANT ALL ON public.api_keys TO service_role;
GRANT SELECT ON public.api_key_usage TO authenticated;
GRANT ALL ON public.api_key_usage TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_webhooks TO authenticated;
GRANT ALL ON public.api_webhooks TO service_role;
GRANT SELECT ON public.api_webhook_deliveries TO authenticated;
GRANT ALL ON public.api_webhook_deliveries TO service_role;