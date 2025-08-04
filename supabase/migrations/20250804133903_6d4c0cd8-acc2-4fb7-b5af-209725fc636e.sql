-- Check for tables with RLS enabled but no policies
SELECT schemaname, tablename 
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN (
  SELECT tablename 
  FROM pg_tables t
  WHERE schemaname = 'public'
  AND EXISTS (
    SELECT 1 FROM pg_class c 
    JOIN pg_namespace n ON c.relnamespace = n.oid 
    WHERE c.relname = t.tablename 
    AND n.nspname = 'public' 
    AND c.relrowsecurity = true
  )
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies p 
    WHERE p.schemaname = 'public' 
    AND p.tablename = t.tablename
  )
);

-- Add missing RLS policy for states table if it has RLS enabled
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c 
    JOIN pg_namespace n ON c.relnamespace = n.oid 
    WHERE c.relname = 'states' 
    AND n.nspname = 'public' 
    AND c.relrowsecurity = true
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'states'
  ) THEN
    EXECUTE 'CREATE POLICY "States are viewable by everyone" ON public.states FOR SELECT USING (true)';
  END IF;
END $$;