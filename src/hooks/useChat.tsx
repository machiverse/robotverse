import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  message_content: string;
  is_read: boolean;
  is_blocked: boolean;
  blocked_reason?: string;
  created_at: string;
}

export interface ChatConversation {
  id: string;
  chat_id: string;
  buyer_id: string;
  seller_id: string;
  item_id?: string;
  item_type: string;
  item_name?: string;
  status: string;
  last_message_at: string;
  created_at: string;
}

export const useChat = (conversationId?: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  // Fetch messages for a conversation
  const fetchMessages = async (convId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);

      // Mark messages as read
      if (user && data) {
        const unreadMessages = data.filter(msg => msg.sender_id !== user.id && !msg.is_read);
        if (unreadMessages.length > 0) {
          await supabase
            .from('chat_messages')
            .update({ is_read: true })
            .in('id', unreadMessages.map(msg => msg.id));
        }
      }
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      toast({
        title: 'Error',
        description: 'Failed to load messages',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch conversation details
  const fetchConversation = async (convId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('id', convId)
        .single();

      if (error) throw error;
      setConversation(data);
    } catch (error: any) {
      console.error('Error fetching conversation:', error);
    }
  };

  // Create or get existing conversation
  const createOrGetConversation = async (
    sellerId: string,
    itemId: string,
    itemType: 'robot' | 'spare_part' | 'service',
    itemName: string
  ): Promise<string | null> => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to start a chat',
        variant: 'destructive',
      });
      return null;
    }

    try {
      // Check if conversation already exists
      const { data: existing, error: fetchError } = await supabase
        .from('chat_conversations')
        .select('id')
        .eq('buyer_id', user.id)
        .eq('seller_id', sellerId)
        .eq('item_id', itemId)
        .single();

      if (existing) {
        return existing.id;
      }

      // Create new conversation
      const { data, error } = await supabase
        .from('chat_conversations')
        .insert({
          buyer_id: user.id,
          seller_id: sellerId,
          item_id: itemId,
          item_type: itemType,
          item_name: itemName,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Chat Started',
        description: `You can now chat about ${itemName}`,
      });

      return data.id;
    } catch (error: any) {
      console.error('Error creating conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to start chat',
        variant: 'destructive',
      });
      return null;
    }
  };

  // Send a message
  const sendMessage = async (content: string) => {
    if (!user || !conversationId || !content.trim()) return;

    try {
      setSending(true);

      // Check for contact info in message
      const { data: hasContactInfo, error: filterError } = await supabase
        .rpc('filter_contact_info', { message: content });

      if (hasContactInfo) {
        toast({
          title: 'Message Blocked',
          description: 'Your message contains contact information. Please communicate only within the platform.',
          variant: 'destructive',
        });
        return;
      }

      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          message_content: content,
        })
        .select()
        .single();

      if (error) throw error;

      // Add message to local state
      setMessages(prev => [...prev, data]);

      return data;
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  // Subscribe to new messages in conversation
  useEffect(() => {
    if (!conversationId) return;

    fetchMessages(conversationId);
    fetchConversation(conversationId);

    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          setMessages(prev => {
            // Avoid duplicates
            if (prev.find(msg => msg.id === newMessage.id)) {
              return prev;
            }
            return [...prev, newMessage];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  return {
    messages,
    conversation,
    loading,
    sending,
    sendMessage,
    createOrGetConversation,
  };
};
