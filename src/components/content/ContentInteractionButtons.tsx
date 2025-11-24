import { Button } from '@/components/ui/button';
import { MessageCircle, Share2 } from 'lucide-react';
import { ContentLikeButton } from './ContentLikeButton';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface ContentInteractionButtonsProps {
  likeCount: number;
  commentCount: number;
  userHasLiked: boolean;
  onLike: () => Promise<boolean>;
  onCommentClick: () => void;
  onShare?: () => void;
  disabled?: boolean;
}

export const ContentInteractionButtons = ({
  likeCount,
  commentCount,
  userHasLiked,
  onLike,
  onCommentClick,
  onShare,
  disabled = false
}: ContentInteractionButtonsProps) => {
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
    
    if (onShare) {
      onShare();
    }
  };

  return (
    <div className="flex items-center gap-1">
      <ContentLikeButton
        likeCount={likeCount}
        userHasLiked={userHasLiked}
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
          <span className="font-medium">Share</span>
        </Button>
      )}
    </div>
  );
};
