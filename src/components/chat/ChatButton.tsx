import React from 'react';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface ChatButtonProps {
  sellerId: string;
  itemId: string;
  itemType: 'robot' | 'spare_part' | 'service';
  itemName: string;
  onChatStart?: (conversationId: string) => void;
  variant?: 'default' | 'outline' | 'secondary';
  className?: string;
}

export const ChatButton: React.FC<ChatButtonProps> = ({
  sellerId,
  itemId,
  itemType,
  itemName,
  onChatStart,
  variant = 'default',
  className = '',
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleChatClick = async () => {
    if (!user) {
      toast({
        title: 'Login Required',
        description: 'Please log in to chat with sellers',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }

    // Don't allow chatting with yourself
    if (user.id === sellerId) {
      toast({
        title: 'Cannot Chat',
        description: 'You cannot chat with yourself',
        variant: 'destructive',
      });
      return;
    }

    // Navigate to chat page with params
    navigate(`/chat?seller=${sellerId}&item=${itemId}&type=${itemType}&name=${encodeURIComponent(itemName)}`);
  };

  return (
    <Button
      variant={variant}
      className={className}
      onClick={handleChatClick}
    >
      <MessageCircle className="h-4 w-4 mr-2" />
      {user ? 'Chat with Seller' : 'Login to Chat'}
    </Button>
  );
};
