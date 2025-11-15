import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
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

interface ChatNotification {
  id: string;
  conversation_id: string;
  notification_type: string;
  is_read: boolean;
  created_at: string;
  chat_sessions: {
    id: string;
    item_name: string;
  };
}

interface GeneralNotification {
  id: string;
  user_id: string;
  notification_type: string;
  title: string;
  message: string;
  reference_id: string | null;
  reference_type: string | null;
  is_read: boolean;
  created_at: string;
}

type CombinedNotification = (ChatNotification | GeneralNotification) & {
  displayTitle: string;
  displayMessage: string;
  displayType: 'chat' | 'general';
}

export const NotificationCenter = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<CombinedNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  const fetchNotifications = async () => {
    if (!user) return;

    // Fetch chat notifications
    const { data: chatData } = await supabase
      .from('chat_notifications')
      .select(`
        *,
        chat_sessions (
          id,
          item_name
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    // Fetch general notifications (robot views, etc.)
    const { data: generalData } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    // Combine and format notifications
    const combined: CombinedNotification[] = [];

    if (chatData) {
      chatData.forEach((notif: any) => {
        combined.push({
          ...notif,
          displayTitle: 'New Message',
          displayMessage: `New message about ${notif.chat_sessions?.item_name || 'item'}`,
          displayType: 'chat' as const,
        });
      });
    }

    if (generalData) {
      generalData.forEach((notif: GeneralNotification) => {
        combined.push({
          ...notif,
          displayTitle: notif.title,
          displayMessage: notif.message,
          displayType: 'general' as const,
        });
      });
    }

    // Sort by created_at
    combined.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    setNotifications(combined.slice(0, 20));
    setUnreadCount(combined.filter(n => !n.is_read).length);
  };

  useEffect(() => {
    if (!user) return;

    fetchNotifications();

    // Subscribe to chat notifications
    const chatChannel = supabase
      .channel(`chat_notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          playNotificationSound();
          fetchNotifications();
        }
      )
      .subscribe();

    // Subscribe to general notifications (robot views, etc.)
    const generalChannel = supabase
      .channel(`general_notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          playNotificationSound();
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(chatChannel);
      supabase.removeChannel(generalChannel);
    };
  }, [user]);

  const markAsRead = async (notification: CombinedNotification) => {
    if (notification.displayType === 'chat') {
      await supabase
        .from('chat_notifications')
        .update({ is_read: true })
        .eq('id', notification.id);
    } else {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notification.id);
    }

    fetchNotifications();
  };

  const handleNotificationClick = async (notification: CombinedNotification) => {
    await markAsRead(notification);
    setOpen(false);
    
    if (notification.displayType === 'chat') {
      // Navigate to chat
      const chatNotif = notification as any;
      const { data } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('id', chatNotif.conversation_id)
        .single();

      if (data) {
        const session = data as any;
        const otherUserId = session.user1_id === user?.id ? session.user2_id : session.user1_id;
        navigate(`/chat?other_user=${otherUserId}&item=${session.item_id}&type=${session.item_type}&name=${encodeURIComponent(session.item_name || '')}`);
      }
    } else {
      // Navigate based on reference type
      const generalNotif = notification as GeneralNotification;
      if (generalNotif.reference_type === 'robot' && generalNotif.reference_id) {
        navigate(`/robots/${generalNotif.reference_id}`);
      }
    }
  };

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
        </div>
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No notifications
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 cursor-pointer hover:bg-accent transition-colors ${
                    !notification.is_read ? 'bg-accent/50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        {notification.displayTitle}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {notification.displayMessage}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(notification.created_at), 'MMM dd, HH:mm')}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <Badge variant="secondary" className="ml-2">
                        New
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
