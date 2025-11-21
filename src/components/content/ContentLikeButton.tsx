import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface ContentLikeButtonProps {
  likeCount: number;
  userHasLiked: boolean;
  onToggleLike: () => Promise<boolean>;
  disabled?: boolean;
  size?: 'sm' | 'lg';
}

export const ContentLikeButton = ({
  likeCount,
  userHasLiked,
  onToggleLike,
  disabled = false,
  size = 'sm'
}: ContentLikeButtonProps) => {
  const { user } = useAuth();
  const [isLiking, setIsLiking] = useState(false);

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      toast.error('Please sign in to like');
      return;
    }
    
    if (isLiking || disabled) return;

    try {
      setIsLiking(true);
      await onToggleLike();
    } finally {
      setIsLiking(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size={size}
      onClick={handleLike}
      disabled={isLiking || disabled}
      className={`h-9 px-3 rounded-full transition-all hover:scale-105 ${
        userHasLiked 
          ? 'text-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-950 dark:hover:bg-red-900' 
          : 'hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950'
      }`}
    >
      <Heart className={`h-4 w-4 mr-1 ${userHasLiked ? 'fill-current' : ''}`} />
      <span className="font-medium">{likeCount}</span>
    </Button>
  );
};
