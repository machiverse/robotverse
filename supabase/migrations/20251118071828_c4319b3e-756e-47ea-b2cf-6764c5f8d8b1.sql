-- Clean up orphaned chat_notifications that reference non-existent chat_sessions
DELETE FROM public.chat_notifications
WHERE conversation_id NOT IN (SELECT id FROM public.chat_sessions);

-- Add missing foreign key relationship between chat_notifications and chat_sessions
ALTER TABLE public.chat_notifications
ADD CONSTRAINT chat_notifications_conversation_id_fkey
FOREIGN KEY (conversation_id) REFERENCES public.chat_sessions(id) ON DELETE CASCADE;

-- Create function to get unread message count for a user
CREATE OR REPLACE FUNCTION public.get_unread_message_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(DISTINCT cm.chat_session_id)::INTEGER
  FROM chat_messages cm
  INNER JOIN chat_sessions cs ON cm.chat_session_id = cs.id
  WHERE (cs.user1_id = p_user_id OR cs.user2_id = p_user_id)
  AND cm.sender_id != p_user_id
  AND cm.is_read = false;
$$;

-- Create function to get user's unread conversations with last message
CREATE OR REPLACE FUNCTION public.get_unread_conversations(p_user_id UUID)
RETURNS TABLE (
  session_id UUID,
  conversation_partner_id UUID,
  conversation_partner_name TEXT,
  conversation_partner_email TEXT,
  item_name TEXT,
  item_type TEXT,
  last_message_content TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE,
  unread_count BIGINT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    cs.id as session_id,
    CASE 
      WHEN cs.user1_id = p_user_id THEN cs.user2_id
      ELSE cs.user1_id
    END as conversation_partner_id,
    CASE 
      WHEN cs.user1_id = p_user_id THEN p2.full_name
      ELSE p1.full_name
    END as conversation_partner_name,
    CASE 
      WHEN cs.user1_id = p_user_id THEN p2.email
      ELSE p1.email
    END as conversation_partner_email,
    cs.item_name,
    cs.item_type,
    (
      SELECT message_content 
      FROM chat_messages 
      WHERE chat_session_id = cs.id 
      ORDER BY created_at DESC 
      LIMIT 1
    ) as last_message_content,
    cs.last_message_at,
    (
      SELECT COUNT(*)
      FROM chat_messages cm
      WHERE cm.chat_session_id = cs.id
      AND cm.sender_id != p_user_id
      AND cm.is_read = false
    ) as unread_count
  FROM chat_sessions cs
  LEFT JOIN profiles p1 ON cs.user1_id = p1.user_id
  LEFT JOIN profiles p2 ON cs.user2_id = p2.user_id
  WHERE (cs.user1_id = p_user_id OR cs.user2_id = p_user_id)
  AND EXISTS (
    SELECT 1 
    FROM chat_messages cm
    WHERE cm.chat_session_id = cs.id
    AND cm.sender_id != p_user_id
    AND cm.is_read = false
  )
  ORDER BY cs.last_message_at DESC NULLS LAST;
$$;