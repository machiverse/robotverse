import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
  showValue?: boolean;
}

const sizeClasses = {
  sm: 'h-3.5 w-3.5',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};

export function StarRating({ rating, maxRating = 5, size = 'md', interactive = false, onRatingChange, showValue = false }: StarRatingProps) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: maxRating }, (_, i) => {
        const starValue = i + 1;
        const filled = starValue <= rating;
        const halfFilled = starValue - 0.5 <= rating && starValue > rating;

        return (
          <button
            key={i}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onRatingChange?.(starValue)}
            className={cn(
              'transition-colors',
              interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'
            )}
          >
            <Star
              className={cn(
                sizeClasses[size],
                filled ? 'fill-yellow-400 text-yellow-400' : halfFilled ? 'fill-yellow-400/50 text-yellow-400' : 'text-muted-foreground/30'
              )}
            />
          </button>
        );
      })}
      {showValue && (
        <span className="ml-1 text-sm font-medium text-muted-foreground">{rating.toFixed(1)}</span>
      )}
    </div>
  );
}
