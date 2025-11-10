import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import EnhancedHeader from '@/components/EnhancedHeader';
import Footer from '@/components/Footer';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useChat } from '@/hooks/useChat';
import { Skeleton } from '@/components/ui/skeleton';

const Chat = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createOrGetConversation } = useChat();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const sellerId = searchParams.get('seller');
  const itemId = searchParams.get('item');
  const itemType = searchParams.get('type') as 'robot' | 'spare_part' | 'service';
  const itemName = searchParams.get('name') || '';

  useEffect(() => {
    const initChat = async () => {
      if (!user) {
        navigate('/auth');
        return;
      }

      if (!sellerId || !itemId || !itemType) {
        navigate('/');
        return;
      }

      setLoading(true);
      const convId = await createOrGetConversation(
        sellerId,
        itemId,
        itemType,
        decodeURIComponent(itemName)
      );

      if (convId) {
        setConversationId(convId);
      } else {
        navigate(-1);
      }
      setLoading(false);
    };

    initChat();
  }, [user, sellerId, itemId, itemType, itemName]);

  return (
    <div className="min-h-screen flex flex-col">
      <EnhancedHeader />
      <main className="flex-1 container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {loading ? (
          <div className="max-w-4xl mx-auto">
            <Skeleton className="h-[600px] w-full" />
          </div>
        ) : conversationId ? (
          <div className="max-w-4xl mx-auto">
            <ChatWindow conversationId={conversationId} />
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Failed to load chat</p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Chat;
