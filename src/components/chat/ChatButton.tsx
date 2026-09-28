import React from 'react';
import { pushEvent } from '@/lib/analytics';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface ChatButtonProps {
  otherUserId: string;
  itemId: string;
  itemType: 'robot' | 'spare_part' | 'service';
  itemName: string;
  productDetails?: Record<string, any>;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  className?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const ChatButton: React.FC<ChatButtonProps> = ({
  otherUserId,
  itemId,
  itemType,
  itemName,
  productDetails,
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
        description: 'Please log in to start a chat',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }

    // Prevent self-chat
    if (user.id === otherUserId) {
      toast({
        title: 'Cannot Chat',
        description: 'You cannot chat with yourself',
        variant: 'destructive',
      });
      return;
    }

    pushEvent('contact_seller', { item_id: itemId, item_type: itemType === 'spare_part' ? 'part' : itemType, method: 'chat' });
    // Navigate to chat page with parameters
    const params = new URLSearchParams({
      other_user: otherUserId,
      item: itemId,
      type: itemType,
      name: itemName,
    });

    if (productDetails) {
      params.set('details', JSON.stringify(productDetails));
    }

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
      {user ? 'Start Chat' : 'Login to Chat'}
    </Button>
  );
};
