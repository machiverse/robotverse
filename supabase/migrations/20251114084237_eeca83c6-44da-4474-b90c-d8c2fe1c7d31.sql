-- Fix the validate_chat_message function to set search_path
CREATE OR REPLACE FUNCTION public.validate_chat_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  restricted_patterns TEXT[] := ARRAY[
    '@[\w.-]+\.\w+',                           -- Email patterns
    '\d{10}',                                   -- 10 digit phone
    '\d{5}[-.\s]?\d{5}',                       -- Phone with separator
    'https?://',                                -- URLs
    'whatsapp|wa\.me|watsapp',                 -- WhatsApp
    'facebook|instagram|twitter|telegram',     -- Social media
    'email me|mail me|contact me at',          -- Email requests
    'call me|phone number|mobile number'       -- Phone requests
  ];
  pattern TEXT;
BEGIN
  -- Check message_content against restricted patterns
  FOREACH pattern IN ARRAY restricted_patterns
  LOOP
    IF NEW.message_content ~* pattern THEN
      NEW.is_blocked := TRUE;
      NEW.blocked_reason := 'Message contains restricted information. Please discuss only robot-related topics.';
      RETURN NEW;
    END IF;
  END LOOP;
  
  -- Update last_message_at in chat_sessions
  UPDATE chat_sessions
  SET last_message_at = NOW()
  WHERE id = NEW.chat_session_id;
  
  RETURN NEW;
END;
$function$;