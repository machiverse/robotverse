-- Function to create notification when new message is received
CREATE OR REPLACE FUNCTION create_chat_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_conversation RECORD;
  v_recipient_id UUID;
BEGIN
  -- Get conversation details by checking both chat_sessions and chat_conversations
  SELECT 
    COALESCE(cs.buyer_id, cc.buyer_id) as buyer_id,
    COALESCE(cs.seller_id, cc.seller_id) as seller_id,
    COALESCE(cs.id, cc.id) as conversation_id
  INTO v_conversation
  FROM chat_sessions cs
  FULL OUTER JOIN chat_conversations cc ON cs.id = NEW.chat_session_id OR cc.id = NEW.chat_session_id
  WHERE cs.id = NEW.chat_session_id OR cc.id = NEW.chat_session_id
  LIMIT 1;

  -- Determine recipient (opposite of sender)
  IF NEW.sender_id::uuid = v_conversation.buyer_id THEN
    v_recipient_id := v_conversation.seller_id;
  ELSIF NEW.sender_id::uuid = v_conversation.seller_id THEN
    v_recipient_id := v_conversation.buyer_id;
  ELSE
    -- If sender is neither buyer nor seller, don't create notification
    RETURN NEW;
  END IF;

  -- Don't create notification for system messages
  IF NEW.is_system_message = true THEN
    RETURN NEW;
  END IF;

  -- Create notification for the recipient
  INSERT INTO chat_notifications (
    user_id,
    conversation_id,
    message_id,
    notification_type,
    is_read
  ) VALUES (
    v_recipient_id,
    v_conversation.conversation_id,
    NEW.id,
    'new_message',
    false
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new messages
DROP TRIGGER IF EXISTS trigger_create_chat_notification ON chat_messages;
CREATE TRIGGER trigger_create_chat_notification
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION create_chat_notification();

-- Add index for faster notification queries
CREATE INDEX IF NOT EXISTS idx_chat_notifications_user_unread 
  ON chat_notifications(user_id, is_read, created_at DESC);