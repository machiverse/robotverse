import { useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { playNotificationSound } from '@/utils/notificationSound';

/**
 * Global hook to listen for incoming chat messages and play notification sounds
 * Works even when chat window is not open
 */
export const useChatNotifications = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Subscribe to all messages where user is buyer or seller
    const channel = supabase
      .channel(`user-chat-notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        async (payload) => {
          const newMessage = payload.new as any;
          
          // Only play sound if message is NOT from current user
          if (newMessage.sender_id !== user.id) {
            // Verify this message belongs to a conversation where current user is participant
            const { data: session } = await supabase
              .from('chat_sessions')
              .select('user1_id, user2_id')
              .eq('id', newMessage.chat_session_id)
              .single();

            if (session && (session.user1_id === user.id || session.user2_id === user.id)) {
              playNotificationSound();
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);
};
