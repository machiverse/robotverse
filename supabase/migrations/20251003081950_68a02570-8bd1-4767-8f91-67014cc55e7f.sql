-- Add rating and completed_jobs columns to services table if they don't exist
DO $$ 
BEGIN
  -- Add rating column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'services' 
    AND column_name = 'rating'
  ) THEN
    ALTER TABLE public.services ADD COLUMN rating numeric DEFAULT 0;
    COMMENT ON COLUMN public.services.rating IS 'Average service rating (0-5)';
  END IF;

  -- Add completed_jobs column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'services' 
    AND column_name = 'completed_jobs'
  ) THEN
    ALTER TABLE public.services ADD COLUMN completed_jobs integer DEFAULT 0;
    COMMENT ON COLUMN public.services.completed_jobs IS 'Number of completed service projects';
  END IF;
END $$;