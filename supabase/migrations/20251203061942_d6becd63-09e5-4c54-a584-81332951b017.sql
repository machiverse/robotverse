-- Drop the problematic trigger that references non-existent user_id column
DROP TRIGGER IF EXISTS trigger_robot_view_notification ON public.item_view_counts;