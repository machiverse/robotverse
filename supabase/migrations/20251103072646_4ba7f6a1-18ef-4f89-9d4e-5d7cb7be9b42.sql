-- Create sequence for chat IDs first
CREATE SEQUENCE IF NOT EXISTS chat_sequence START 1;

-- Create chat conversations table
CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id TEXT UNIQUE NOT NULL DEFAULT ('RV-CHAT-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(NEXTVAL('chat_sequence')::TEXT, 6, '0')),
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id UUID,
  item_type TEXT NOT NULL CHECK (item_type IN ('robot', 'spare_part', 'service')),
  item_name TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'archived')),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(buyer_id, seller_id, item_id)
);

-- Create chat messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  is_blocked BOOLEAN DEFAULT FALSE,
  blocked_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chat notifications table
CREATE TABLE IF NOT EXISTS public.chat_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  notification_type TEXT DEFAULT 'new_message' CHECK (notification_type IN ('new_message', 'chat_started', 'chat_closed')),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_conversations_buyer ON public.chat_conversations(buyer_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_seller ON public.chat_conversations(seller_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_item ON public.chat_conversations(item_id, item_type);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON public.chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON public.chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_notifications_user ON public.chat_notifications(user_id);

-- Enable RLS on all chat tables
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_conversations
CREATE POLICY "Users can view their own conversations"
  ON public.chat_conversations FOR SELECT
  TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Buyers can create conversations"
  ON public.chat_conversations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Participants can update conversations"
  ON public.chat_conversations FOR UPDATE
  TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- RLS Policies for chat_messages
CREATE POLICY "Users can view messages in their conversations"
  ON public.chat_messages FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM public.chat_conversations 
      WHERE buyer_id = auth.uid() OR seller_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages in their conversations"
  ON public.chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    conversation_id IN (
      SELECT id FROM public.chat_conversations 
      WHERE buyer_id = auth.uid() OR seller_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own messages"
  ON public.chat_messages FOR UPDATE
  TO authenticated
  USING (sender_id = auth.uid());

-- RLS Policies for chat_notifications
CREATE POLICY "Users can view their own notifications"
  ON public.chat_notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
  ON public.chat_notifications FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);

CREATE POLICY "Users can update their notifications"
  ON public.chat_notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Function to update conversation timestamp
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.chat_conversations
  SET last_message_at = NOW(), updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to update conversation timestamp on new message
CREATE TRIGGER update_conversation_on_message
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_timestamp();

-- Function to create notification on new message
CREATE OR REPLACE FUNCTION create_message_notification()
RETURNS TRIGGER AS $$
DECLARE
  recipient_id UUID;
BEGIN
  -- Get the recipient (the other party in conversation)
  SELECT CASE 
    WHEN buyer_id = NEW.sender_id THEN seller_id 
    ELSE buyer_id 
  END INTO recipient_id
  FROM public.chat_conversations
  WHERE id = NEW.conversation_id;
  
  -- Create notification for recipient
  INSERT INTO public.chat_notifications (user_id, conversation_id, message_id, notification_type)
  VALUES (recipient_id, NEW.conversation_id, NEW.id, 'new_message');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create notification on new message
CREATE TRIGGER create_notification_on_message
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION create_message_notification();

-- Function to filter contact information in messages
CREATE OR REPLACE FUNCTION filter_contact_info(message TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check for phone numbers (various formats)
  IF message ~* '\+?[0-9]{10,15}' OR 
     message ~* '\d{3}[-.\s]?\d{3}[-.\s]?\d{4}' THEN
    RETURN TRUE;
  END IF;
  
  -- Check for email addresses
  IF message ~* '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}' THEN
    RETURN TRUE;
  END IF;
  
  -- Check for common contact keywords
  IF message ~* '\b(whatsapp|telegram|call me|email me|contact me at)\b' THEN
    RETURN TRUE;
  END IF;
  
  -- Check for URLs
  IF message ~* 'https?://|www\.' THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Admin function to view all conversations
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() 
    AND (
      account_type = 'admin' 
      OR email IN ('mark.it@keyleerkorb.com', 'mynameisrajan@gmail.com')
      OR 'admin' = ANY(user_roles)
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Admin policies
CREATE POLICY "Admins can view all conversations"
  ON public.chat_conversations FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can view all messages"
  ON public.chat_messages FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can view all notifications"
  ON public.chat_notifications FOR SELECT
  TO authenticated
  USING (is_admin());