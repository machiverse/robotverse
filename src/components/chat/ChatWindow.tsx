import React, { useState, useEffect, useRef } from "react";
import { Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useChat } from "@/hooks/useChat";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { playNotificationSound } from "@/utils/notificationSound";

interface ChatWindowProps {
  conversationId: string;
  onClose?: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ conversationId, onClose }) => {
  const { user } = useAuth();
  const { messages, conversation, loading, sending, sendMessage } = useChat(conversationId);
  const [newMessage, setNewMessage] = useState("");
  const [otherPartyName, setOtherPartyName] = useState("Loading...");
  const [fetchingParty, setFetchingParty] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const previousMessageCountRef = useRef(messages.length);

  /**
   * Auto-scroll to bottom when new messages arrive
   */
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Scroll to bottom whenever messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle notification sound for new messages from other party
  useEffect(() => {
    if (messages.length > previousMessageCountRef.current && messages.length > 0) {
      const latestMessage = messages[messages.length - 1];
      
      // Only play sound if the message is from the other person
      if (latestMessage.sender_id !== user?.id) {
        console.log("Playing notification sound for received message");
        playNotificationSound();
      }
    }
    
    previousMessageCountRef.current = messages.length;
  }, [messages, user?.id]);

  /**
   * Mark all messages in this conversation as read when window is opened
   */
  useEffect(() => {
    const markMessagesAsRead = async () => {
      if (!conversationId || !user?.id) return;

      try {
        // Mark all unread messages in this conversation as read
        await supabase
          .from('chat_messages')
          .update({ is_read: true, read_at: new Date().toISOString() })
          .eq('chat_session_id', conversationId)
          .neq('sender_id', user.id)
          .eq('is_read', false);
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    };

    markMessagesAsRead();
  }, [conversationId, user?.id]);

  /**
   * Fetch other party's profile information
   */
  useEffect(() => {
    let isMounted = true;

    const fetchOtherParty = async () => {
      try {
        setFetchingParty(true);
        setError(null);

        if (!conversation || !user?.id) {
          setOtherPartyName("User");
          return;
        }

        // Determine other party ID (the one who is not current user)
        const conv = conversation as any;
        const otherPartyId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id;

        if (!otherPartyId) {
          setOtherPartyName("User");
          return;
        }

        // Fetch other party's profile
        const { data, error: fetchError } = await supabase
          .from("profiles")
          .select("full_name, company_name")
          .eq("user_id", otherPartyId)
          .single();

        if (fetchError) {
          console.warn("Error fetching profile:", fetchError);
          setOtherPartyName("User");
          return;
        }

        if (!isMounted) return;

        const displayName = data?.company_name || data?.full_name || "User";
        setOtherPartyName(displayName);
      } catch (err) {
        console.error("Error fetching other party:", err);
        if (isMounted) {
          setOtherPartyName("User");
          setError("Could not load user information");
        }
      } finally {
        if (isMounted) {
          setFetchingParty(false);
        }
      }
    };

    fetchOtherParty();

    return () => {
      isMounted = false;
    };
  }, [conversation, user?.id]);

  /**
   * Handle form submission to send message
   */
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || sending) {
      return;
    }

    try {
      setError(null);
      
      // Client-side validation
      const { filterChatMessage } = await import("@/utils/chatContentFilter");
      const filterResult = filterChatMessage(newMessage);
      
      if (filterResult.isBlocked) {
        setError(`Message blocked: ${filterResult.reason}. Please keep all communication within the platform.`);
        return;
      }

      const result = await sendMessage(newMessage);

      if (result) {
        setNewMessage("");
        // Force scroll to bottom after sending
        setTimeout(scrollToBottom, 100);
      } else {
        setError("Failed to send message. Please try again.");
      }
    } catch (err) {
      console.error("Error sending message:", err);
      setError("An unexpected error occurred while sending the message.");
    }
  };

  /**
   * Check for blocked messages warning
   */
  const hasBlockedMessages = messages.some((msg) => msg.is_blocked);

  return (
    <Card className="h-[600px] flex flex-col shadow-lg overflow-hidden border-border/50 bg-background">
      {/* Header - WhatsApp Style */}
      <CardHeader className="border-b border-border bg-primary py-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Profile Picture */}
            <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center text-primary-foreground font-semibold flex-shrink-0 border-2 border-primary-foreground/30">
              {fetchingParty ? "..." : otherPartyName.charAt(0).toUpperCase()}
            </div>
            
            {/* Name and Item */}
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base text-primary-foreground truncate font-semibold">
                {fetchingParty ? "Loading..." : otherPartyName}
              </CardTitle>
              <p className="text-xs text-primary-foreground/90 truncate font-medium">{conversation?.item_name || "Chat"}</p>
            </div>
          </div>
          
          {onClose && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose} 
              className="ml-2 text-primary-foreground hover:bg-primary-foreground/10 rounded-full" 
              aria-label="Close chat"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
      </CardHeader>

      {/* Messages Area - WhatsApp Style */}
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden bg-muted/30">
        {/* Blocked Messages Warning */}
        {hasBlockedMessages && (
          <div className="bg-destructive/10 border-b border-destructive/20 p-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-xs text-destructive">Some messages were blocked for containing restricted information.</p>
          </div>
        )}

        {/* Messages List - WhatsApp Style */}
        <ScrollArea className="flex-1 p-4">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p>No messages yet.</p>
              <p className="text-sm">Start the conversation below!</p>
            </div>
          ) : (
            <div className="space-y-1">
              {messages.map((message, index) => {
                const isOwnMessage = message.sender_id === user?.id;
                const prevMessage = index > 0 ? messages[index - 1] : null;
                const showAvatar = !prevMessage || prevMessage.sender_id !== message.sender_id;
                const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;
                const isLastInGroup = !nextMessage || nextMessage.sender_id !== message.sender_id;

                return (
                  <div 
                    key={message.id} 
                    className={`flex ${isOwnMessage ? "justify-end" : "justify-start"} ${isLastInGroup ? "mb-3" : "mb-0.5"} animate-in slide-in-from-bottom-2 duration-200`}
                  >
                    <div className={`flex items-end gap-2 max-w-[75%] ${isOwnMessage ? "flex-row-reverse" : "flex-row"}`}>
                      {/* Avatar - only show for first message in group from other person */}
                      {!isOwnMessage && (
                        <div className={`w-8 h-8 flex-shrink-0 ${showAvatar ? "opacity-100" : "opacity-0"}`}>
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center text-xs font-semibold text-primary">
                            {otherPartyName.charAt(0).toUpperCase()}
                          </div>
                        </div>
                      )}

                      {/* Message bubble - WhatsApp Style */}
                      <div
                        className={`rounded-lg px-3 py-2 shadow-xs transition-all ${
                          isOwnMessage 
                            ? "bg-[hsl(var(--primary))] text-primary-foreground rounded-br-none" 
                            : "bg-card text-foreground rounded-bl-none border border-border/50"
                        }`}
                      >
                        {/* Blocked Message Warning */}
                        {message.is_blocked && (
                          <div className="flex items-center gap-1 mb-1 px-2 py-1 rounded bg-destructive/20">
                            <AlertCircle className="h-3 w-3 text-destructive flex-shrink-0" />
                            <p className="text-xs text-destructive font-medium">
                              Blocked: {message.blocked_reason || "Contains restricted info"}
                            </p>
                          </div>
                        )}

                        {/* Message Content - Ensure full visibility on both sides */}
                        <p className="text-[14.2px] leading-[1.5] whitespace-pre-wrap break-words overflow-visible">
                          {message.message_content}
                        </p>

                        {/* Timestamp and Read Status - WhatsApp Style */}
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <span
                            className={`text-[11px] font-normal ${
                              isOwnMessage ? "text-primary-foreground/80" : "text-muted-foreground/80"
                            }`}
                          >
                            {format(new Date(message.created_at), "HH:mm")}
                          </span>
                          {isOwnMessage && (
                            <span className="text-primary-foreground/80 text-sm leading-none">
                              {message.is_read ? "✓✓" : "✓"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Error Message */}
        {error && (
          <div className="bg-destructive/10 border-t border-destructive/20 p-3 flex items-gap-2">
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}

        {/* Message Input Form - WhatsApp Style */}
        <form onSubmit={handleSendMessage} className="border-t border-border bg-background p-3">
          <div className="flex items-center gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              disabled={sending}
              className="flex-1 rounded-full bg-muted/50 border-border/50 focus-visible:ring-primary focus-visible:border-primary transition-all h-10"
              maxLength={1000}
              aria-label="Message input"
            />
            <Button 
              type="submit" 
              disabled={sending || !newMessage.trim()} 
              size="icon"
              className="rounded-full h-10 w-10 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all disabled:opacity-50" 
              aria-label="Send message"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>

          {/* Helper Text */}
          <div className="flex items-center justify-between mt-2 px-1">
            <p className="text-[10px] text-muted-foreground">🔒 Contact info will be blocked</p>
            <p className="text-[10px] text-muted-foreground">{newMessage.length}/1000</p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
