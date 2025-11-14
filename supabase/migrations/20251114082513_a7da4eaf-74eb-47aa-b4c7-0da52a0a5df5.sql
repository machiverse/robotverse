-- Fix security warning for search_path
CREATE OR REPLACE FUNCTION public.update_chat_session_timestamp()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.chat_sessions
  SET last_message_at = NOW(), updated_at = NOW()
  WHERE id = NEW.chat_session_id;
  RETURN NEW;
END;
$$;