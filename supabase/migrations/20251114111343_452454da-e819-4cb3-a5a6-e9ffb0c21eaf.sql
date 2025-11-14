-- Drop any triggers that reference the _new functions
DROP TRIGGER IF EXISTS update_chat_session_timestamp_new_trigger ON chat_messages;
DROP TRIGGER IF EXISTS create_chat_notification_new_trigger ON chat_messages;

-- Drop the outdated _new functions that reference non-existent table
DROP FUNCTION IF EXISTS update_chat_session_timestamp_new();
DROP FUNCTION IF EXISTS create_chat_notification_new();

-- Ensure we have the correct triggers on chat_messages
DROP TRIGGER IF EXISTS update_chat_session_timestamp_trigger ON chat_messages;
DROP TRIGGER IF EXISTS create_chat_notification_trigger ON chat_messages;

-- Create trigger to update chat_sessions timestamp when new message is sent
CREATE TRIGGER update_chat_session_timestamp_trigger
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_session_timestamp();

-- Create trigger to generate notifications when new message is sent
CREATE TRIGGER create_chat_notification_trigger
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION create_chat_notification();