
ALTER TABLE public.api_keys
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS plaintext_key text;

ALTER TABLE public.api_keys ALTER COLUMN key_prefix DROP NOT NULL;
ALTER TABLE public.api_keys ALTER COLUMN key_hash DROP NOT NULL;

-- Existing keys pre-dating this workflow are considered approved
UPDATE public.api_keys SET status = 'approved', approved_at = COALESCE(approved_at, created_at)
WHERE status = 'pending' AND key_hash IS NOT NULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'api_keys_status_check') THEN
    ALTER TABLE public.api_keys ADD CONSTRAINT api_keys_status_check
      CHECK (status IN ('pending','approved','rejected'));
  END IF;
END $$;
