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

  /**
   * Auto-scroll to bottom when new messages arrive
   */
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
    <Card className="h-[600px] flex flex-col shadow-lg">
      {/* Header */}
      <CardHeader className="border-b bg-gradient-to-r from-background to-muted/50">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate">{fetchingParty ? "Loading..." : otherPartyName}</CardTitle>
            <p className="text-sm text-muted-foreground truncate">{conversation?.item_name || "Chat"}</p>
            <p className="text-xs text-muted-foreground/70 truncate">ID: {conversation?.id}</p>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="ml-2" aria-label="Close chat">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      {/* Messages Area */}
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {/* Blocked Messages Warning */}
        {hasBlockedMessages && (
          <div className="bg-yellow-50 border-b border-yellow-200 p-3 flex items-gap-2">
            <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-800">Some messages were blocked for containing restricted information.</p>
          </div>
        )}

        {/* Messages List */}
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
            <div className="space-y-4">
              {messages.map((message) => {
                const isOwnMessage = message.sender_id === user?.id;

                return (
                  <div key={message.id} className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        isOwnMessage ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                      }`}
                    >
                      {/* Blocked Message Warning */}
                      {message.is_blocked && (
                        <div className="flex items-center gap-1 mb-2 p-2 rounded bg-opacity-50 bg-destructive/20">
                          <AlertCircle className="h-3 w-3 text-destructive flex-shrink-0" />
                          <p className="text-xs text-destructive font-medium">
                            Blocked: {message.blocked_reason || "Contains restricted info"}
                          </p>
                        </div>
                      )}

                      {/* Message Content */}
                      <p className="text-sm whitespace-pre-wrap break-words">{message.message_content}</p>

                      {/* Timestamp */}
                      <p
                        className={`text-xs mt-2 ${
                          isOwnMessage ? "text-primary-foreground/70" : "text-muted-foreground"
                        }`}
                      >
                        {format(new Date(message.created_at), "HH:mm")}
                      </p>
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

        {/* Message Input Form */}
        <form onSubmit={handleSendMessage} className="border-t p-4 bg-background">
          <div className="flex gap-2 mb-3">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              disabled={sending}
              className="flex-1"
              maxLength={1000}
              aria-label="Message input"
            />
            <Button type="submit" disabled={sending || !newMessage.trim()} className="px-4" aria-label="Send message">
              <Send className="h-4 w-4" />
            </Button>
          </div>

          {/* Helper Text */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Messages with contact info will be blocked</p>
            <p className="text-xs text-muted-foreground">{newMessage.length}/1000</p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
