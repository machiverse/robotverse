import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { StarRating } from './StarRating';
import { format } from 'date-fns';
import type { Review } from '@/hooks/useReviews';

interface ReviewCardProps {
  review: Review;
  showItemType?: boolean;
}

const dealTypeLabels: Record<string, string> = {
  robot: 'Robot',
  spare_parts: 'Spare Parts',
  service: 'Service',
};

export function ReviewCard({ review, showItemType = false }: ReviewCardProps) {
  const initials = (review.reviewer_name || 'A')
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={review.reviewer_avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-foreground text-sm">{review.reviewer_name || 'Anonymous'}</p>
            {review.reviewer_company && (
              <p className="text-xs text-muted-foreground">{review.reviewer_company}</p>
            )}
          </div>
        </div>
        <div className="text-right">
          <StarRating rating={review.overall_rating} size="sm" />
          <p className="text-xs text-muted-foreground mt-1">
            {format(new Date(review.created_at), 'MMM d, yyyy')}
          </p>
        </div>
      </div>

      {review.feedback_text && (
        <p className="text-sm text-muted-foreground leading-relaxed">"{review.feedback_text}"</p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {showItemType && (
          <Badge variant="secondary" className="text-xs">
            {dealTypeLabels[review.deal_type] || review.deal_type}
          </Badge>
        )}
        {review.is_verified && (
          <Badge variant="outline" className="text-xs text-success border-success/30">
            ✓ Verified
          </Badge>
        )}
        {review.is_featured && (
          <Badge className="text-xs bg-yellow-500/20 text-yellow-400 border-yellow-400/30">
            ★ Featured
          </Badge>
        )}
      </div>

      {(review.service_quality_rating || review.communication_rating || review.delivery_rating) && (
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border">
          {review.service_quality_rating && (
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Quality</p>
              <p className="text-sm font-semibold text-foreground">{review.service_quality_rating}/5</p>
            </div>
          )}
          {review.communication_rating && (
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Communication</p>
              <p className="text-sm font-semibold text-foreground">{review.communication_rating}/5</p>
            </div>
          )}
          {review.delivery_rating && (
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Delivery</p>
              <p className="text-sm font-semibold text-foreground">{review.delivery_rating}/5</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
