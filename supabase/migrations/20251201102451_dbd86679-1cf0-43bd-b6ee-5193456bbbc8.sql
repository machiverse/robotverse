-- Fix the increment_item_view_count function to not reference user_id
-- The item_view_counts table doesn't have a user_id column

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS increment_item_view_count(TEXT, TEXT);

-- Recreate the function without user_id references
CREATE OR REPLACE FUNCTION increment_item_view_count(
  p_item_id TEXT,
  p_item_type TEXT
) RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Insert or update the view count
  INSERT INTO item_view_counts (item_id, item_type, total_views)
  VALUES (p_item_id, p_item_type, 1)
  ON CONFLICT (item_id, item_type)
  DO UPDATE SET 
    total_views = item_view_counts.total_views + 1,
    updated_at = NOW();
  
  -- Get the updated count
  SELECT total_views INTO v_count
  FROM item_view_counts
  WHERE item_id = p_item_id AND item_type = p_item_type;
  
  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql;

-- Ensure the unique constraint exists for item_id and item_type
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'item_view_counts_item_id_item_type_key'
  ) THEN
    ALTER TABLE item_view_counts 
    ADD CONSTRAINT item_view_counts_item_id_item_type_key 
    UNIQUE (item_id, item_type);
  END IF;
END $$;