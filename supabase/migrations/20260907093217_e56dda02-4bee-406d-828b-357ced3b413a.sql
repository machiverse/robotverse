CREATE OR REPLACE FUNCTION public.sync_account_status_from_moderation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target uuid := COALESCE(NEW.user_id, OLD.user_id);
  latest record;
BEGIN
  SELECT action, suspension_until INTO latest
  FROM public.user_moderation
  WHERE user_id = target
    AND is_active = true
    AND action IN ('warning','suspension','permanent_block')
    AND (action <> 'suspension' OR suspension_until IS NULL OR suspension_until > now())
  ORDER BY (action = 'permanent_block') DESC, actioned_at DESC
  LIMIT 1;

  IF latest.action = 'permanent_block' THEN
    UPDATE public.profiles
      SET account_status = 'blocked',
          content_suppressed_at = COALESCE(content_suppressed_at, now())
      WHERE user_id = target;
  ELSIF latest.action = 'suspension' THEN
    UPDATE public.profiles
      SET account_status = 'suspended',
          content_suppressed_at = COALESCE(content_suppressed_at, now())
      WHERE user_id = target;
  ELSE
    UPDATE public.profiles
      SET account_status = 'active',
          content_suppressed_at = NULL
      WHERE user_id = target;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_account_status ON public.user_moderation;
CREATE TRIGGER trg_sync_account_status
AFTER INSERT OR UPDATE ON public.user_moderation
FOR EACH ROW EXECUTE FUNCTION public.sync_account_status_from_moderation();

-- Reconcile existing records
UPDATE public.profiles p
SET account_status = 'blocked',
    content_suppressed_at = COALESCE(p.content_suppressed_at, now())
WHERE EXISTS (
  SELECT 1 FROM public.user_moderation m
  WHERE m.user_id = p.user_id AND m.is_active = true AND m.action = 'permanent_block'
) AND p.account_status <> 'blocked';

UPDATE public.profiles p
SET account_status = 'suspended',
    content_suppressed_at = COALESCE(p.content_suppressed_at, now())
WHERE p.account_status = 'active'
  AND EXISTS (
    SELECT 1 FROM public.user_moderation m
    WHERE m.user_id = p.user_id AND m.is_active = true AND m.action = 'suspension'
      AND (m.suspension_until IS NULL OR m.suspension_until > now())
  );