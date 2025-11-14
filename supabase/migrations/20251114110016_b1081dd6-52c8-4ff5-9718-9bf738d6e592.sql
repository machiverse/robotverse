-- Step 1: Create new normalized chat_sessions table
CREATE TABLE IF NOT EXISTS public.chat_sessions_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID NOT NULL, -- Always the smaller UUID
  user2_id UUID NOT NULL, -- Always the larger UUID
  item_id UUID,
  item_type TEXT NOT NULL CHECK (item_type IN ('robot', 'spare_part', 'service')),
  item_name TEXT,
  product_details JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'active',
  last_message_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT chat_sessions_new_users_check CHECK (user1_id < user2_id),
  CONSTRAINT chat_sessions_new_unique_conversation UNIQUE (user1_id, user2_id, item_id, item_type)
);

-- Step 2: Create new chat_messages table
CREATE TABLE IF NOT EXISTS public.chat_messages_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_session_id UUID NOT NULL REFERENCES public.chat_sessions_new(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  message_content TEXT NOT NULL,
  product_metadata JSONB DEFAULT '{}'::jsonb,
  is_blocked BOOLEAN DEFAULT false,
  blocked_reason TEXT,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Step 3: Migrate data from old chat_sessions to new (normalize buyer/seller to user1/user2)
-- Skip conversations where buyer_id == seller_id (invalid self-conversations)
INSERT INTO public.chat_sessions_new (
  id, user1_id, user2_id, item_id, item_type, item_name, 
  status, last_message_at, created_at, updated_at
)
SELECT 
  cs.id,
  LEAST(cs.buyer_id, cs.seller_id) as user1_id,
  GREATEST(cs.buyer_id, cs.seller_id) as user2_id,
  CASE 
    WHEN cs.robot_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
    THEN cs.robot_id::uuid 
    ELSE NULL 
  END as item_id,
  cs.item_type,
  cs.item_name,
  cs.status,
  cs.last_message_at,
  cs.created_at,
  cs.updated_at
FROM public.chat_sessions cs
WHERE cs.buyer_id != cs.seller_id  -- Skip invalid self-conversations
ON CONFLICT (user1_id, user2_id, item_id, item_type) DO NOTHING;

-- Step 4: Migrate messages from old to new
INSERT INTO public.chat_messages_new (
  id, chat_session_id, sender_id, message_content, 
  is_blocked, blocked_reason, is_read, created_at, updated_at
)
SELECT 
  m.id,
  m.chat_session_id,
  m.sender_id,
  m.message_content,
  m.is_blocked,
  m.blocked_reason,
  m.is_read,
  m.created_at,
  m.updated_at
FROM public.chat_messages m
WHERE EXISTS (
  SELECT 1 FROM public.chat_sessions_new csn 
  WHERE csn.id = m.chat_session_id
)
ON CONFLICT (id) DO NOTHING;

-- Step 5: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_sessions_new_users ON public.chat_sessions_new(user1_id, user2_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_new_item ON public.chat_sessions_new(item_id, item_type);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_new_last_message ON public.chat_sessions_new(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_new_session ON public.chat_messages_new(chat_session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_new_sender ON public.chat_messages_new(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_new_unread ON public.chat_messages_new(chat_session_id, is_read) WHERE is_read = false;

-- Step 6: Enable RLS
ALTER TABLE public.chat_sessions_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages_new ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS policies for chat_sessions_new
CREATE POLICY "Users can view their own sessions"
ON public.chat_sessions_new
FOR SELECT
TO authenticated
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can create sessions"
ON public.chat_sessions_new
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Participants can update sessions"
ON public.chat_sessions_new
FOR UPDATE
TO authenticated
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Step 8: Create RLS policies for chat_messages_new
CREATE POLICY "Users can view messages in their sessions"
ON public.chat_messages_new
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.chat_sessions_new
    WHERE id = chat_messages_new.chat_session_id
    AND (user1_id = auth.uid() OR user2_id = auth.uid())
  )
);

CREATE POLICY "Users can send messages"
ON public.chat_messages_new
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM public.chat_sessions_new
    WHERE id = chat_messages_new.chat_session_id
    AND (user1_id = auth.uid() OR user2_id = auth.uid())
  )
);

CREATE POLICY "Users can mark messages as read"
ON public.chat_messages_new
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.chat_sessions_new
    WHERE id = chat_messages_new.chat_session_id
    AND (user1_id = auth.uid() OR user2_id = auth.uid())
  )
);

-- Step 9: Create trigger to update last_message_at
CREATE OR REPLACE FUNCTION public.update_chat_session_timestamp_new()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.chat_sessions_new
  SET last_message_at = NOW(), updated_at = NOW()
  WHERE id = NEW.chat_session_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_chat_session_timestamp_new_trigger
AFTER INSERT ON public.chat_messages_new
FOR EACH ROW
EXECUTE FUNCTION public.update_chat_session_timestamp_new();

-- Step 10: Create trigger for chat notifications
CREATE OR REPLACE FUNCTION public.create_chat_notification_new()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session RECORD;
  v_recipient_id UUID;
BEGIN
  -- Get session details
  SELECT user1_id, user2_id, id as conversation_id
  INTO v_session
  FROM chat_sessions_new
  WHERE id = NEW.chat_session_id;

  IF v_session IS NULL THEN
    RETURN NEW;
  END IF;

  -- Determine recipient (opposite of sender)
  IF NEW.sender_id = v_session.user1_id THEN
    v_recipient_id := v_session.user2_id;
  ELSIF NEW.sender_id = v_session.user2_id THEN
    v_recipient_id := v_session.user1_id;
  ELSE
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
$$;

CREATE TRIGGER create_chat_notification_new_trigger
AFTER INSERT ON public.chat_messages_new
FOR EACH ROW
EXECUTE FUNCTION public.create_chat_notification_new();

-- Step 11: Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_sessions_new;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages_new;

-- Step 12: Rename tables (archive old, promote new)
ALTER TABLE public.chat_sessions RENAME TO chat_sessions_old;
ALTER TABLE public.chat_messages RENAME TO chat_messages_old;
ALTER TABLE public.chat_sessions_new RENAME TO chat_sessions;
ALTER TABLE public.chat_messages_new RENAME TO chat_messages;