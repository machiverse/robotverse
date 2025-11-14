-- Drop existing tables if they have conflicts
DROP TABLE IF EXISTS public.chat_messages CASCADE;
DROP TABLE IF EXISTS public.chat_sessions CASCADE;

-- Create chat_sessions table
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id UUID NOT NULL,
  seller_id UUID NOT NULL,
  robot_id TEXT,
  item_type TEXT NOT NULL CHECK (item_type IN ('robot', 'spare_part', 'service')),
  item_name TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'archived')),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(buyer_id, seller_id, robot_id, item_type)
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  message_content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  is_blocked BOOLEAN DEFAULT FALSE,
  blocked_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_chat_messages_session ON public.chat_messages(chat_session_id);
CREATE INDEX idx_chat_messages_sender ON public.chat_messages(sender_id);
CREATE INDEX idx_chat_messages_created ON public.chat_messages(created_at DESC);
CREATE INDEX idx_chat_sessions_buyer ON public.chat_sessions(buyer_id);
CREATE INDEX idx_chat_sessions_seller ON public.chat_sessions(seller_id);
CREATE INDEX idx_chat_sessions_users ON public.chat_sessions(buyer_id, seller_id);

-- Enable RLS
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_sessions
CREATE POLICY "users_can_view_own_chats"
  ON public.chat_sessions
  FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "buyers_can_create_chats"
  ON public.chat_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "participants_can_update_session"
  ON public.chat_sessions
  FOR UPDATE
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- RLS Policies for chat_messages
CREATE POLICY "users_can_view_conversation_messages"
  ON public.chat_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_sessions
      WHERE chat_sessions.id = chat_messages.chat_session_id
      AND (chat_sessions.buyer_id = auth.uid() OR chat_sessions.seller_id = auth.uid())
    )
  );

CREATE POLICY "users_can_send_messages"
  ON public.chat_messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.chat_sessions
      WHERE chat_sessions.id = chat_session_id
      AND (chat_sessions.buyer_id = auth.uid() OR chat_sessions.seller_id = auth.uid())
    )
  );

CREATE POLICY "users_can_mark_messages_read"
  ON public.chat_messages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_sessions
      WHERE chat_sessions.id = chat_messages.chat_session_id
      AND (chat_sessions.buyer_id = auth.uid() OR chat_sessions.seller_id = auth.uid())
    )
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;

-- Helper function and trigger
CREATE OR REPLACE FUNCTION public.update_chat_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.chat_sessions
  SET last_message_at = NOW(), updated_at = NOW()
  WHERE id = NEW.chat_session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_chat_session_timestamp
AFTER INSERT ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_chat_session_timestamp();