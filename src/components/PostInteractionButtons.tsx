import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Heart, MessageCircle, Share2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface PostInteractionButtonsProps {
  postId: string;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  userLiked: boolean;
  onLike: () => Promise<void>;
  onShare: () => Promise<void>;
  onCommentClick: () => void;
  disabled?: boolean;
}

const PostInteractionButtons = ({
  postId,
  likeCount,
  commentCount,
  shareCount,
  userLiked,
  onLike,
  onShare,
  onCommentClick,
  disabled = false
}: PostInteractionButtonsProps) => {
  const { user } = useAuth();
  const [isLiking, setIsLiking] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      toast.error('Please sign in to like posts');
      return;
    }
    
    if (isLiking || disabled) return;

    try {
      setIsLiking(true);
      await onLike();
    } finally {
      setIsLiking(false);
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isSharing || disabled) return;

    try {
      setIsSharing(true);
      await onShare();
    } finally {
      setIsSharing(false);
    }
  };

  const handleComment = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      toast.error('Please sign in to comment');
      return;
    }
    
    onCommentClick();
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleLike}
        disabled={isLiking || disabled}
        className={`h-9 px-3 rounded-full transition-all hover:scale-105 ${
          userLiked 
            ? 'text-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-950 dark:hover:bg-red-900' 
            : 'hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950'
        }`}
      >
        <Heart className={`h-4 w-4 mr-1 ${userLiked ? 'fill-current' : ''}`} />
        <span className="font-medium">{likeCount}</span>
      </Button>

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

      <Button
        variant="ghost"
        size="sm"
        onClick={handleShare}
        disabled={isSharing || disabled}
        className="h-9 px-3 rounded-full hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-950 transition-all hover:scale-105"
      >
        <Share2 className="h-4 w-4 mr-1" />
        <span className="font-medium">{shareCount}</span>
      </Button>
    </div>
  );
};

export default PostInteractionButtons;