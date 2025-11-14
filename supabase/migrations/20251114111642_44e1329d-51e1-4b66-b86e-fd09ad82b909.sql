-- Fix create_chat_notification function to remove is_system_message check
CREATE OR REPLACE FUNCTION public.create_chat_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_session RECORD;
  v_recipient_id UUID;
BEGIN
  -- Get session details from chat_sessions table
  SELECT 
    user1_id,
    user2_id,
    id as conversation_id
  INTO v_session
  FROM chat_sessions
  WHERE id = NEW.chat_session_id
  LIMIT 1;

  -- If no session found, return
  IF v_session IS NULL THEN
    RETURN NEW;
  END IF;

  -- Determine recipient (opposite of sender)
  IF NEW.sender_id::uuid = v_session.user1_id THEN
    v_recipient_id := v_session.user2_id;
  ELSIF NEW.sender_id::uuid = v_session.user2_id THEN
    v_recipient_id := v_session.user1_id;
  ELSE
    -- If sender is neither user1 nor user2, don't create notification
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