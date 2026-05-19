import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { showNotificationWithSound, requestNotificationPermission } from '@/utils/notificationSound';

/**
 * Global hook to listen for incoming chat messages and play notification sounds
 * Works even when chat window is not open
 * Plays sound on desktop, tablet, and mobile devices
 */
export const useChatNotifications = () => {
  const { user } = useAuth();
  const [notificationPermission, setNotificationPermission] = useState<boolean>(false);

  // Request notification permission on mount
  useEffect(() => {
    const setupNotifications = async () => {
      const hasPermission = await requestNotificationPermission();
      setNotificationPermission(hasPermission);
      
      if (hasPermission) {
        console.log('✅ Chat notifications enabled');
      } else {
        console.log('⚠️ Chat notifications permission not granted (sound will still play)');
      }
    };

    if (user) {
      setupNotifications();
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    console.log('🔔 Setting up real-time chat notifications for user:', user.id);

    let channel: ReturnType<typeof supabase.channel> | null = null;

    try {
    // Unique channel name per mount prevents "cannot add postgres_changes
    // callbacks ... after subscribe()" when the effect remounts (StrictMode,
    // auth state changes, post-email-verification redirect, etc.)
    const channelName = `user-chat-notifications:${user.id}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
    channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as any,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        async (payload) => {
          const newMessage = payload.new as any;
          
          // Only play sound if message is NOT from current user
          if (newMessage.sender_id !== user.id) {
            console.log('📨 New message received from another user');
            
            // Verify this message belongs to a conversation where current user is participant
            const { data: session } = await supabase
              .from('chat_sessions')
              .select('user1_id, user2_id, item_name, item_type')
              .eq('id', newMessage.chat_session_id)
              .single();

            if (session && (session.user1_id === user.id || session.user2_id === user.id)) {
              console.log('✅ Message verified - playing notification');
              
              // Get sender info for notification
              const senderId = session.user1_id === user.id ? session.user2_id : session.user1_id;
              const { data: senderProfile } = await supabase
                .from('profiles')
                .select('full_name, company_name')
                .eq('user_id', senderId)
                .single();

              const senderName = senderProfile?.company_name || senderProfile?.full_name || 'Someone';
              const itemName = session.item_name ? ` about ${session.item_name}` : '';
              
              // Play sound and show notification
              showNotificationWithSound(
                `New message from ${senderName}`,
                `${newMessage.message_content.substring(0, 100)}${newMessage.message_content.length > 100 ? '...' : ''}`,
                '/robotverse-logo.png'
              );
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('🔌 Chat notification subscription status:', status);
      });
    } catch (err) {
      console.error('Failed to set up chat notifications channel:', err);
    }

    return () => {
      console.log('🔌 Cleaning up chat notifications');
      if (channel) {
        try { supabase.removeChannel(channel); } catch (e) { console.warn(e); }
      }
    };
  }, [user]);

  return { notificationPermission };
};
