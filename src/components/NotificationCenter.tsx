import React, { useState, useEffect } from 'react';
import { Bell, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { playNotificationSound } from '@/utils/notificationSound';

interface UnreadConversation {
  session_id: string;
  conversation_partner_id: string;
  conversation_partner_name: string;
  conversation_partner_email: string;
  item_id: string;
  item_name: string;
  item_type: string;
  last_message_content: string;
  last_message_at: string;
  unread_count: number;
}

export const NotificationCenter = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [unreadConversations, setUnreadConversations] = useState<UnreadConversation[]>([]);
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  const fetchUnreadConversations = async () => {
    if (!user) return;

    try {
      // Fetch unread conversations using the new function
      const { data, error } = await supabase.rpc('get_unread_conversations', {
        p_user_id: user.id,
      });

      if (error) {
        console.error('Error fetching unread conversations:', error);
        return;
      }

      setUnreadConversations(data || []);
      
      // Calculate total unread count
      const total = (data || []).reduce((sum, conv) => sum + (conv.unread_count || 0), 0);
      setTotalUnreadCount(total);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  useEffect(() => {
    if (!user) return;

    fetchUnreadConversations();

    // Subscribe to new messages
    const messagesChannel = supabase
      .channel(`user-messages:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        async (payload) => {
          const newMessage = payload.new as any;
          
          // Only process if message is NOT from current user
          if (newMessage.sender_id !== user.id) {
            // Verify this message belongs to a conversation where current user is participant
            const { data: session } = await supabase
              .from('chat_sessions')
              .select('user1_id, user2_id')
              .eq('id', newMessage.chat_session_id)
              .single();

            if (session && (session.user1_id === user.id || session.user2_id === user.id)) {
              playNotificationSound();
              fetchUnreadConversations();
            }
          }
        }
      )
      .subscribe();

    // Subscribe to messages being marked as read
    const readChannel = supabase
      .channel(`user-read-messages:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `is_read=eq.true`,
        },
        () => {
          fetchUnreadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(readChannel);
    };
  }, [user]);

  const handleNotificationClick = async (conversation: UnreadConversation) => {
    setOpen(false);
    
    // Navigate to chat with proper parameters
    const queryParams = new URLSearchParams({
      other_user: conversation.conversation_partner_id,
      item: conversation.item_id || '', // Use actual item_id from conversation
      type: conversation.item_type,
      name: conversation.item_name || 'Chat',
    });
    
    navigate(`/chat?${queryParams.toString()}`);
  };

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {totalUnreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 border-b">
          <h3 className="font-semibold flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Unread Messages
          </h3>
        </div>
        <ScrollArea className="h-[400px]">
          {unreadConversations.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No unread messages
            </div>
          ) : (
            <div className="divide-y">
              {unreadConversations.map((conversation) => (
                <div
                  key={conversation.session_id}
                  onClick={() => handleNotificationClick(conversation)}
                  className="p-4 cursor-pointer hover:bg-accent transition-colors"
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {conversation.conversation_partner_name || conversation.conversation_partner_email}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {conversation.item_name}
                      </p>
                    </div>
                    {conversation.unread_count > 0 && (
                      <Badge variant="destructive" className="ml-2">
                        {conversation.unread_count}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-1">
                    {conversation.last_message_content}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {conversation.last_message_at 
                      ? format(new Date(conversation.last_message_at), 'MMM dd, HH:mm')
                      : 'Just now'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};