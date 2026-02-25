import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { StarRating } from './StarRating';

interface WriteReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    overall_rating: number;
    service_quality_rating?: number;
    communication_rating?: number;
    delivery_rating?: number;
    feedback_text?: string;
  }) => Promise<boolean>;
  itemName?: string;
}

export function WriteReviewModal({ open, onOpenChange, onSubmit, itemName }: WriteReviewModalProps) {
  const [overallRating, setOverallRating] = useState(0);
  const [qualityRating, setQualityRating] = useState(0);
  const [communicationRating, setCommunicationRating] = useState(0);
  const [deliveryRating, setDeliveryRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (overallRating === 0) return;
    setSubmitting(true);
    const success = await onSubmit({
      overall_rating: overallRating,
      service_quality_rating: qualityRating || undefined,
      communication_rating: communicationRating || undefined,
      delivery_rating: deliveryRating || undefined,
      feedback_text: feedbackText || undefined,
    });
    setSubmitting(false);
    if (success) {
      setOverallRating(0);
      setQualityRating(0);
      setCommunicationRating(0);
      setDeliveryRating(0);
      setFeedbackText('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Write a Review{itemName ? ` for ${itemName}` : ''}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-4">
          <div className="space-y-2">
            <Label className="text-foreground">Overall Rating *</Label>
            <StarRating rating={overallRating} size="lg" interactive onRatingChange={setOverallRating} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Service Quality</Label>
              <StarRating rating={qualityRating} size="sm" interactive onRatingChange={setQualityRating} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Communication</Label>
              <StarRating rating={communicationRating} size="sm" interactive onRatingChange={setCommunicationRating} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Delivery</Label>
              <StarRating rating={deliveryRating} size="sm" interactive onRatingChange={setDeliveryRating} />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">Your Feedback</Label>
            <Textarea
              placeholder="Share your experience..."
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={overallRating === 0 || submitting}>
            {submitting ? 'Submitting...' : 'Submit Review'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
