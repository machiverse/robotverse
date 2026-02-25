-- Step 1: Add new columns to subscription_plans
ALTER TABLE public.subscription_plans 
ADD COLUMN robot_limit INTEGER DEFAULT 2,
ADD COLUMN spare_part_limit INTEGER DEFAULT 5,
ADD COLUMN service_limit INTEGER DEFAULT 1,
ADD COLUMN has_lead_manager_access BOOLEAN DEFAULT false,
ADD COLUMN has_advanced_analytics BOOLEAN DEFAULT false,
ADD COLUMN support_level TEXT DEFAULT 'none';