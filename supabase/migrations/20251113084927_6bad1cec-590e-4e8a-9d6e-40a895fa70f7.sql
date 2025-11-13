-- Fix foreign key constraint on chat_notifications
-- First, drop the old foreign key constraint
ALTER TABLE chat_notifications 
  DROP CONSTRAINT IF EXISTS chat_notifications_conversation_id_fkey;

-- Clear all existing notifications to start fresh
TRUNCATE TABLE chat_notifications;

-- Add new foreign key constraint that references chat_sessions
ALTER TABLE chat_notifications 
  ADD CONSTRAINT chat_notifications_conversation_id_fkey 
  FOREIGN KEY (conversation_id) 
  REFERENCES chat_sessions(id) 
  ON DELETE CASCADE;