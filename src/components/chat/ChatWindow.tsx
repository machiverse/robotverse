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

  useEffect(() => {
    scrollToBottom();
    
    // Play notification sound for new messages from other party
    if (messages.length > previousMessageCountRef.current && messages.length > 0) {
      const latestMessage = messages[messages.length - 1];
      
      // Only play sound if the message is from the other person
      if (latestMessage.sender_id !== user?.id) {
        playNotificationSound();
      }
    }
    
    previousMessageCountRef.current = messages.length;
  }, [messages, user?.id]);

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

        // Determine other party ID
        const otherPartyId = conversation.buyer_id === user.id ? conversation.seller_id : conversation.buyer_id;

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
    <Card className="h-[600px] flex flex-col shadow-lg overflow-hidden">
      {/* Header - WhatsApp Style */}
      <CardHeader className="border-b bg-[#008069] dark:bg-[#1f2c33] py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Profile Picture */}
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold flex-shrink-0">
              {fetchingParty ? "..." : otherPartyName.charAt(0).toUpperCase()}
            </div>
            
            {/* Name and Status */}
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base text-white truncate font-medium">
                {fetchingParty ? "Loading..." : otherPartyName}
              </CardTitle>
              <p className="text-xs text-white/80 truncate">{conversation?.item_name || "Chat"}</p>
            </div>
          </div>
          
          {onClose && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose} 
              className="ml-2 text-white hover:bg-white/10" 
              aria-label="Close chat"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
      </CardHeader>

      {/* Messages Area */}
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden bg-[#efeae2] dark:bg-[#0b141a]">
        {/* Blocked Messages Warning */}
        {hasBlockedMessages && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800 p-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-800 dark:text-yellow-300">Some messages were blocked for containing restricted information.</p>
          </div>
        )}

        {/* Messages List - WhatsApp pattern background */}
        <ScrollArea className="flex-1 p-4" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.02'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}>
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
            <div className="space-y-2">
              {messages.map((message, index) => {
                const isOwnMessage = message.sender_id === user?.id;
                const prevMessage = index > 0 ? messages[index - 1] : null;
                const showAvatar = !prevMessage || prevMessage.sender_id !== message.sender_id;

                return (
                  <div 
                    key={message.id} 
                    className={`flex ${isOwnMessage ? "justify-end" : "justify-start"} animate-in slide-in-from-bottom-2 duration-200`}
                  >
                    <div className={`flex items-end gap-1 ${isOwnMessage ? "flex-row-reverse" : "flex-row"}`}>
                      {/* Avatar placeholder */}
                      <div className={`w-6 h-6 ${showAvatar ? "opacity-100" : "opacity-0"}`}>
                        {!isOwnMessage && (
                          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                            {otherPartyName.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>

                      {/* Message bubble */}
                      <div
                        className={`max-w-[70%] rounded-2xl px-3 py-2 shadow-sm ${
                          isOwnMessage 
                            ? "bg-[#005c4b] text-white rounded-br-sm" 
                            : "bg-white dark:bg-muted text-foreground rounded-bl-sm border border-border/50"
                        }`}
                      >
                        {/* Blocked Message Warning */}
                        {message.is_blocked && (
                          <div className="flex items-center gap-1 mb-2 px-2 py-1 rounded bg-destructive/20">
                            <AlertCircle className="h-3 w-3 text-destructive flex-shrink-0" />
                            <p className="text-xs text-destructive font-medium">
                              Blocked: {message.blocked_reason || "Contains restricted info"}
                            </p>
                          </div>
                        )}

                        {/* Message Content */}
                        <p className="text-[14px] leading-[1.4] whitespace-pre-wrap break-words">
                          {message.message_content}
                        </p>

                        {/* Timestamp and Status */}
                        <div className={`flex items-center justify-end gap-1 mt-1`}>
                          <p
                            className={`text-[11px] ${
                              isOwnMessage ? "text-white/70" : "text-muted-foreground/70"
                            }`}
                          >
                            {format(new Date(message.created_at), "HH:mm")}
                          </p>
                          {isOwnMessage && (
                            <span className="text-white/70 text-xs">✓✓</span>
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
        <form onSubmit={handleSendMessage} className="border-t bg-[#f0f2f5] dark:bg-[#1f2c33] p-3">
          <div className="flex items-center gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message"
              disabled={sending}
              className="flex-1 rounded-full bg-white dark:bg-[#2a3942] border-0 focus-visible:ring-1 focus-visible:ring-[#00a884]"
              maxLength={1000}
              aria-label="Message input"
            />
            <Button 
              type="submit" 
              disabled={sending || !newMessage.trim()} 
              className="rounded-full w-10 h-10 p-0 bg-[#00a884] hover:bg-[#008069] text-white" 
              aria-label="Send message"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>

          {/* Helper Text */}
          <div className="flex items-center justify-between mt-2 px-2">
            <p className="text-[11px] text-muted-foreground">Messages with contact info will be blocked</p>
            <p className="text-[11px] text-muted-foreground">{newMessage.length}/1000</p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
