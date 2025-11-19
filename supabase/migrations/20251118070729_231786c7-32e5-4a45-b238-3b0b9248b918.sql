-- Add admin policies for chat monitoring

-- Allow admins to view all chat sessions
CREATE POLICY "Admins can view all chat sessions"
ON public.chat_sessions
FOR SELECT
TO authenticated
USING (
  is_admin()
);

-- Allow admins to view all chat messages
CREATE POLICY "Admins can view all chat messages"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (
  is_admin()
);

-- Create a helper function to get conversation details with user info
CREATE OR REPLACE FUNCTION public.get_chat_conversations_with_users()
RETURNS TABLE (
  session_id UUID,
  user1_id UUID,
  user2_id UUID,
  user1_name TEXT,
  user1_email TEXT,
  user2_name TEXT,
  user2_email TEXT,
  item_id UUID,
  item_name TEXT,
  item_type TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  status TEXT,
  message_count BIGINT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    cs.id as session_id,
    cs.user1_id,
    cs.user2_id,
    p1.full_name as user1_name,
    p1.email as user1_email,
    p2.full_name as user2_name,
    p2.email as user2_email,
    cs.item_id,
    cs.item_name,
    cs.item_type,
    cs.last_message_at,
    cs.created_at,
    cs.status,
    COALESCE(
      (SELECT COUNT(*) FROM chat_messages WHERE chat_session_id = cs.id),
      0
    ) as message_count
  FROM chat_sessions cs
  LEFT JOIN profiles p1 ON cs.user1_id = p1.user_id
  LEFT JOIN profiles p2 ON cs.user2_id = p2.user_id
  WHERE is_admin()
  ORDER BY cs.last_message_at DESC NULLS LAST;
$$;

-- Create a helper function to get messages for a specific conversation
CREATE OR REPLACE FUNCTION public.get_chat_messages_for_session(p_session_id UUID)
RETURNS TABLE (
  message_id UUID,
  sender_id UUID,
  sender_name TEXT,
  sender_email TEXT,
  message_content TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  is_read BOOLEAN,
  is_blocked BOOLEAN,
  blocked_reason TEXT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    cm.id as message_id,
    cm.sender_id,
    p.full_name as sender_name,
    p.email as sender_email,
    cm.message_content,
    cm.created_at,
    cm.is_read,
    cm.is_blocked,
    cm.blocked_reason
  FROM chat_messages cm
  LEFT JOIN profiles p ON cm.sender_id = p.user_id
  WHERE cm.chat_session_id = p_session_id
  AND is_admin()
  ORDER BY cm.created_at ASC;
$$;