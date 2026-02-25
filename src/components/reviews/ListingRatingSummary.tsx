import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { StarRating } from './StarRating';
import { ReviewCard } from './ReviewCard';
import { WriteReviewModal } from './WriteReviewModal';
import { useReviews } from '@/hooks/useReviews';
import { useAuth } from '@/hooks/useAuth';
import { MessageSquare } from 'lucide-react';

interface ListingRatingSummaryProps {
  itemId: string;
  itemType: 'robot' | 'spare_part' | 'service';
  dealType: 'robot' | 'spare_parts' | 'service';
  itemName?: string;
  reviewedUserId?: string;
  maxReviews?: number;
}

export function ListingRatingSummary({ itemId, itemType, dealType, itemName, reviewedUserId, maxReviews = 5 }: ListingRatingSummaryProps) {
  const { reviews, loading, averageRating, totalReviews, submitReview } = useReviews(itemId, itemType);
  const { user } = useAuth();
  const [showWriteReview, setShowWriteReview] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const displayedReviews = showAll ? reviews : reviews.slice(0, maxReviews);

  const handleSubmit = async (data: any) => {
    return submitReview({
      ...data,
      item_id: itemId,
      item_type: itemType,
      deal_type: dealType,
      reviewed_user_id: reviewedUserId,
    });
  };

  if (loading) {
    return <div className="py-4 text-center text-muted-foreground text-sm">Loading reviews...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Summary header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <StarRating rating={averageRating} size="md" showValue />
          <span className="text-sm text-muted-foreground">
            ({totalReviews} {totalReviews === 1 ? 'review' : 'reviews'})
          </span>
        </div>
        {user && (
          <Button size="sm" variant="outline" onClick={() => setShowWriteReview(true)}>
            <MessageSquare className="h-4 w-4 mr-1.5" />
            Write a Review
          </Button>
        )}
      </div>

      {/* Reviews list */}
      {displayedReviews.length > 0 ? (
        <div className="space-y-3">
          {displayedReviews.map(review => (
            <ReviewCard key={review.id} review={review} />
          ))}
          {!showAll && reviews.length > maxReviews && (
            <Button variant="ghost" className="w-full text-primary" onClick={() => setShowAll(true)}>
              Show all {totalReviews} reviews
            </Button>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-6">No reviews yet. Be the first to leave a review!</p>
      )}

      <WriteReviewModal
        open={showWriteReview}
        onOpenChange={setShowWriteReview}
        onSubmit={handleSubmit}
        itemName={itemName}
      />
    </div>
  );
}
