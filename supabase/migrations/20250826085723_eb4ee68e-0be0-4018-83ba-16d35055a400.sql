-- Fix view tracking by updating interaction_type constraint to allow 'view'
ALTER TABLE user_interactions DROP CONSTRAINT user_interactions_interaction_type_check;

-- Add new constraint that includes 'view' interaction type
ALTER TABLE user_interactions ADD CONSTRAINT user_interactions_interaction_type_check 
CHECK (interaction_type = ANY (ARRAY['contact'::text, 'application_submit'::text, 'view'::text]));