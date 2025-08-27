-- Add unique constraint on robot_id to prevent duplicate analysis
ALTER TABLE robot_ai_analysis ADD CONSTRAINT unique_robot_analysis UNIQUE (robot_id);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_robot_ai_analysis_robot_id ON robot_ai_analysis(robot_id);