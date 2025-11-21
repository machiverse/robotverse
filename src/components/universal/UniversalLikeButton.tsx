import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface UniversalLikeButtonProps {
  likeCount: number;
  userLiked: boolean;
  onToggleLike: () => Promise<boolean>;
  disabled?: boolean;
  size?: 'sm' | 'lg';
  variant?: 'default' | 'ghost';
}

export const UniversalLikeButton = ({
  likeCount,
  userLiked,
  onToggleLike,
  disabled = false,
  size = 'sm',
  variant = 'ghost',
}: UniversalLikeButtonProps) => {
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
      const success = await onToggleLike();
      if (!success) {
        toast.error('Failed to update like');
      }
    } finally {
      setIsLiking(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
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
  );
};
