-- Make robot_id nullable since chat_sessions is used for multiple item types
ALTER TABLE chat_sessions ALTER COLUMN robot_id DROP NOT NULL;

-- Drop the foreign key constraint on robot_id if it exists
-- (This allows robot_id to reference robots, spare_parts, or services based on item_type)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name LIKE '%robot_id%' 
        AND table_name = 'chat_sessions'
        AND constraint_type = 'FOREIGN KEY'
    ) THEN
        ALTER TABLE chat_sessions DROP CONSTRAINT IF EXISTS chat_sessions_robot_id_fkey;
    END IF;
END $$;

-- Add a comment to clarify the usage
COMMENT ON COLUMN chat_sessions.robot_id IS 'Generic item_id that can reference robots, spare_parts, or services based on item_type';