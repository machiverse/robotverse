-- Remove duplicate entries, keeping only the latest one for each robot_id
DELETE FROM robot_ai_analysis 
WHERE id NOT IN (
    SELECT DISTINCT ON (robot_id) id 
    FROM robot_ai_analysis 
    ORDER BY robot_id, created_at DESC
);

-- Now add the unique constraint
ALTER TABLE robot_ai_analysis ADD CONSTRAINT unique_robot_analysis UNIQUE (robot_id);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_robot_ai_analysis_robot_id ON robot_ai_analysis(robot_id);