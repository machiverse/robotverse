import React, { useState, useEffect, useRef } from 'react';
import { Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useChat } from '@/hooks/useChat';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

interface ChatWindowProps {
  conversationId: string;
  onClose?: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  conversationId,
  onClose,
}) => {
  const { user } = useAuth();
  const { messages, conversation, loading, sending, sendMessage } = useChat(conversationId);
  const [newMessage, setNewMessage] = useState('');
  const [otherPartyName, setOtherPartyName] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch other party profile
  useEffect(() => {
    const fetchOtherParty = async () => {
      if (!conversation || !user) return;

      const otherPartyId = conversation.buyer_id === user.id 
        ? conversation.seller_id 
        : conversation.buyer_id;

      const { data } = await supabase
        .from('profiles')
        .select('full_name, company_name')
        .eq('user_id', otherPartyId)
        .single();

      if (data) {
        setOtherPartyName(data.company_name || data.full_name || 'User');
      }
    };

    fetchOtherParty();
  }, [conversation, user]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    await sendMessage(newMessage);
    setNewMessage('');
  };

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{otherPartyName}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {conversation?.item_name}
            </p>
            <p className="text-xs text-muted-foreground">
              Session ID: {conversation?.id}
            </p>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
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
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => {
                const isOwnMessage = message.sender_id === user?.id;
                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        isOwnMessage
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      {message.is_blocked && (
                        <p className="text-xs text-destructive mb-1">
                          [Message Blocked: {message.blocked_reason}]
                        </p>
                      )}
                      <p className="text-sm whitespace-pre-wrap">
                        {message.message_content}
                      </p>
                      <p
                        className={`text-xs mt-1 ${
                          isOwnMessage
                            ? 'text-primary-foreground/70'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {format(new Date(message.created_at), 'HH:mm')}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        <form onSubmit={handleSendMessage} className="border-t p-4">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              disabled={sending}
              className="flex-1"
            />
            <Button type="submit" disabled={sending || !newMessage.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Note: Messages containing contact information will be blocked
          </p>
        </form>
      </CardContent>
    </Card>
  );
};
