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
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  className?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const ChatButton: React.FC<ChatButtonProps> = ({
  sellerId,
  itemId,
  itemType,
  itemName,
  variant = 'default',
  className = '',
  size = 'default',
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleChatClick = async () => {
    // Check if user is logged in
    if (!user) {
      toast({
        title: 'Login Required',
        description: 'Please log in to chat with sellers',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }

    // Prevent self-chat
    if (user.id === sellerId) {
      toast({
        title: 'Cannot Chat',
        description: 'You cannot chat with yourself',
        variant: 'destructive',
      });
      return;
    }

    // Navigate to chat page with parameters
    const params = new URLSearchParams({
      seller: sellerId,
      item: itemId,
      type: itemType,
      name: itemName,
    });

    navigate(`/chat?${params.toString()}`);
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleChatClick}
    >
      <MessageCircle className="h-4 w-4 mr-2" />
      {user ? 'Chat with Seller' : 'Login to Chat'}
    </Button>
  );
};
