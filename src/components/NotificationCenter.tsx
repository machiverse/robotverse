import React, { useState, useEffect, useCallback } from "react";
import { Bell, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { playNotificationSound } from "@/utils/notificationSound";

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
  const [processedMessageIds, setProcessedMessageIds] = useState<Set<string>>(new Set());
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);

  const fetchUnreadConversations = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc("get_unread_conversations", {
        p_user_id: user.id,
      });

      if (error) {
        console.error("Error fetching unread conversations:", error);
        return;
      }

      // Deduplicate by session_id - keep only the latest message per conversation
      const uniqueConversations = Array.from(
        new Map((data || []).map((conv: UnreadConversation) => [conv.session_id, conv])).values(),
      );

      setUnreadConversations(uniqueConversations);

      // Calculate total unread count
      const total = uniqueConversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0);
      setTotalUnreadCount(total);
      setLastFetchTime(Date.now());
    } catch (error) {
      console.error("Error fetching unread conversations:", error);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // Initial fetch
    fetchUnreadConversations();

    let messageDebounceTimer: NodeJS.Timeout;
    let readDebounceTimer: NodeJS.Timeout;

    // Subscribe to new messages
    const messagesChannel = supabase
      .channel(`user-messages:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
        },
        async (payload) => {
          const newMessage = payload.new as any;
          const messageId = newMessage.id;

          // Prevent duplicate processing of the same message
          if (processedMessageIds.has(messageId)) {
            return;
          }

          // Only process if message is NOT from current user
          if (newMessage.sender_id !== user.id) {
            try {
              // Verify this message belongs to a conversation where current user is participant
              const { data: session, error: sessionError } = await supabase
                .from("chat_sessions")
                .select("user1_id, user2_id")
                .eq("id", newMessage.chat_session_id)
                .single();

              if (sessionError) {
                console.error("Error fetching session:", sessionError);
                return;
              }

              if (session && (session.user1_id === user.id || session.user2_id === user.id)) {
                // Mark this message as processed
                setProcessedMessageIds((prev) => new Set(prev).add(messageId));

                // Play notification sound
                playNotificationSound();

                // Clear existing debounce timer and set new one
                clearTimeout(messageDebounceTimer);
                messageDebounceTimer = setTimeout(() => {
                  fetchUnreadConversations();
                }, 300);
              }
            } catch (error) {
              console.error("Error processing new message:", error);
            }
          }
        },
      )
      .subscribe();

    // Subscribe to messages being marked as read
    const readChannel = supabase
      .channel(`user-read-messages:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_messages",
          filter: `is_read=eq.true`,
        },
        () => {
          clearTimeout(readDebounceTimer);
          readDebounceTimer = setTimeout(() => {
            fetchUnreadConversations();
          }, 300);
        },
      )
      .subscribe();

    // Cleanup function
    return () => {
      clearTimeout(messageDebounceTimer);
      clearTimeout(readDebounceTimer);
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(readChannel);
    };
  }, [user, processedMessageIds, fetchUnreadConversations]);

  const handleNotificationClick = async (conversation: UnreadConversation) => {
    setOpen(false);

    // Navigate to chat with proper parameters
    const queryParams = new URLSearchParams({
      other_user: conversation.conversation_partner_id,
      item: conversation.item_id || "",
      type: conversation.item_type,
      name: conversation.item_name || "Chat",
    });

    navigate(`/chat?${queryParams.toString()}`);
  };

  const handleMarkAsRead = async (e: React.MouseEvent, conversation: UnreadConversation) => {
    e.stopPropagation();

    try {
      // Update all unread messages in this conversation to read
      const { error } = await supabase
        .from("chat_messages")
        .update({ is_read: true })
        .eq("chat_session_id", conversation.session_id)
        .eq("recipient_id", user?.id);

      if (error) {
        console.error("Error marking messages as read:", error);
        return;
      }

      // Fetch updated conversations
      await fetchUnreadConversations();
    } catch (error) {
      console.error("Error:", error);
    }
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
              {totalUnreadCount > 9 ? "9+" : totalUnreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Unread Messages
          </h3>
          {unreadConversations.length > 0 && (
            <span className="text-xs font-medium text-muted-foreground">
              {unreadConversations.length} conversation{unreadConversations.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {unreadConversations.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">No unread messages</div>
          ) : (
            <div className="divide-y">
              {unreadConversations.map((conversation) => (
                <div key={conversation.session_id} className="p-4 hover:bg-accent transition-colors group">
                  <div onClick={() => handleNotificationClick(conversation)} className="cursor-pointer">
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {conversation.conversation_partner_name || conversation.conversation_partner_email}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{conversation.item_name}</p>
                      </div>
                      {conversation.unread_count > 0 && (
                        <Badge variant="destructive" className="ml-2 flex-shrink-0">
                          {conversation.unread_count}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-1">
                      {conversation.last_message_content}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {conversation.last_message_at
                        ? format(new Date(conversation.last_message_at), "MMM dd, HH:mm")
                        : "Just now"}
                    </p>
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
