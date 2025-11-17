-- Drop the trigger first with CASCADE to remove dependencies
DROP TRIGGER IF EXISTS trigger_create_chat_notification ON chat_messages CASCADE;
DROP TRIGGER IF EXISTS on_chat_message_created ON chat_messages CASCADE;

-- Now drop the function with CASCADE
DROP FUNCTION IF EXISTS create_chat_notification() CASCADE;

-- Create simplified notification function without FULL JOIN
CREATE OR REPLACE FUNCTION public.create_chat_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_session RECORD;
  v_recipient_id UUID;
BEGIN
  -- Don't create notification for system messages
  IF NEW.is_system_message = true THEN
    RETURN NEW;
  END IF;

  -- Get session details from chat_sessions table only
  SELECT 
    buyer_id,
    seller_id,
    id as conversation_id
  INTO v_session
  FROM chat_sessions
  WHERE id = NEW.chat_session_id
  LIMIT 1;

  -- If no session found, try chat_conversations as fallback
  IF v_session IS NULL THEN
    SELECT 
      buyer_id,
      seller_id,
      id as conversation_id
    INTO v_session
    FROM chat_conversations
    WHERE id = NEW.chat_session_id
    LIMIT 1;
  END IF;

  -- If still no session found, return
  IF v_session IS NULL THEN
    RETURN NEW;
  END IF;

  -- Determine recipient (opposite of sender)
  IF NEW.sender_id::uuid = v_session.buyer_id THEN
    v_recipient_id := v_session.seller_id;
  ELSIF NEW.sender_id::uuid = v_session.seller_id THEN
    v_recipient_id := v_session.buyer_id;
  ELSE
    -- If sender is neither buyer nor seller, don't create notification
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
    v_session.conversation_id,
    NEW.id,
    'new_message',
    false
  );

  RETURN NEW;
END;
$function$;

-- Recreate the trigger
CREATE TRIGGER trigger_create_chat_notification
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION create_chat_notification();