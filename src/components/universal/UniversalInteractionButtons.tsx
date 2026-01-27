import { Button } from '@/components/ui/button';
import { MessageCircle, Share2 } from 'lucide-react';
import { UniversalLikeButton } from './UniversalLikeButton';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface UniversalInteractionButtonsProps {
  likeCount: number;
  commentCount: number;
  shareCount: number;
  userLiked: boolean;
  onLike: () => Promise<boolean>;
  onShare?: () => Promise<boolean>;
  onCommentClick: () => void;
  disabled?: boolean;
}

export const UniversalInteractionButtons = ({
  likeCount,
  commentCount,
  shareCount,
  userLiked,
  onLike,
  onShare,
  onCommentClick,
  disabled = false
}: UniversalInteractionButtonsProps) => {
  const { user } = useAuth();

  const handleComment = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      toast.error('Please sign in to comment');
      return;
    }
    
    onCommentClick();
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      toast.error('Please sign in to share');
      return;
    }
    
    if (onShare) {
      const success = await onShare();
      if (!success) {
        toast.error('Failed to share');
      }
    }
  };

  return (
    <div className="flex items-center gap-1">
      <UniversalLikeButton
        likeCount={likeCount}
        userLiked={userLiked}
        onToggleLike={onLike}
        disabled={disabled}
      />

      <Button 
        variant="ghost" 
        size="sm" 
        onClick={handleComment}
        disabled={disabled}
        className="h-9 px-3 rounded-full hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 transition-all hover:scale-105"
      >
        <MessageCircle className="h-4 w-4 mr-1" />
        <span className="font-medium">{commentCount}</span>
      </Button>

      {onShare && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleShare}
          disabled={disabled}
          className="h-9 px-3 rounded-full hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-950 transition-all hover:scale-105"
        >
          <Share2 className="h-4 w-4 mr-1" />
          <span className="font-medium">{shareCount}</span>
        </Button>
      )}
    </div>
  );
};
