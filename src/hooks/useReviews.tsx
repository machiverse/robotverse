import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface Review {
  id: string;
  reviewer_id: string;
  reviewed_user_id: string | null;
  item_id: string | null;
  item_type: string;
  deal_type: string;
  reviewer_role: string;
  overall_rating: number;
  service_quality_rating: number | null;
  communication_rating: number | null;
  delivery_rating: number | null;
  feedback_text: string | null;
  reviewer_name: string | null;
  reviewer_company: string | null;
  reviewer_avatar_url: string | null;
  status: string;
  is_verified: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  admin_notes: string | null;
  hidden_reason: string | null;
}

export function useReviews(itemId?: string, itemType?: string) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [averageRating, setAverageRating] = useState(0);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('reviews')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (itemId && itemType) {
        query = query.eq('item_id', itemId).eq('item_type', itemType);
      }

      const { data, error } = await query;
      if (error) throw error;

      const reviewData = (data || []) as unknown as Review[];
      setReviews(reviewData);

      if (reviewData.length > 0) {
        const avg = reviewData.reduce((sum, r) => sum + r.overall_rating, 0) / reviewData.length;
        setAverageRating(Math.round(avg * 10) / 10);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  }, [itemId, itemType]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const submitReview = useCallback(async (reviewData: {
    item_id?: string;
    item_type: string;
    deal_type: string;
    reviewed_user_id?: string;
    overall_rating: number;
    service_quality_rating?: number;
    communication_rating?: number;
    delivery_rating?: number;
    feedback_text?: string;
  }) => {
    if (!user) {
      toast({ title: 'Please log in', description: 'You must be logged in to submit a review.', variant: 'destructive' });
      return false;
    }

    try {
      // Get user profile for name/company
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, company_name, avatar_url')
        .eq('user_id', user.id)
        .single();

      const { error } = await supabase.from('reviews').insert({
        reviewer_id: user.id,
        item_id: reviewData.item_id || null,
        item_type: reviewData.item_type,
        deal_type: reviewData.deal_type,
        reviewed_user_id: reviewData.reviewed_user_id || null,
        reviewer_role: 'buyer',
        overall_rating: reviewData.overall_rating,
        service_quality_rating: reviewData.service_quality_rating || null,
        communication_rating: reviewData.communication_rating || null,
        delivery_rating: reviewData.delivery_rating || null,
        feedback_text: reviewData.feedback_text || null,
        reviewer_name: profile?.full_name || user.email?.split('@')[0] || 'Anonymous',
        reviewer_company: profile?.company_name || null,
        reviewer_avatar_url: profile?.avatar_url || null,
        status: 'published',
      } as any);

      if (error) throw error;

      toast({ title: 'Review submitted!', description: 'Thank you for your feedback.' });
      fetchReviews();
      return true;
    } catch (error: any) {
      console.error('Error submitting review:', error);
      toast({ title: 'Error', description: error.message || 'Failed to submit review.', variant: 'destructive' });
      return false;
    }
  }, [user, toast, fetchReviews]);

  return { reviews, loading, averageRating, totalReviews: reviews.length, submitReview, refetch: fetchReviews };
}

export function useFeaturedTestimonials() {
  const [testimonials, setTestimonials] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        const { data, error } = await supabase
          .from('reviews')
          .select('*')
          .eq('status', 'published')
          .gte('overall_rating', 4)
          .order('is_featured', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw error;
        setTestimonials((data || []) as unknown as Review[]);
      } catch (error) {
        console.error('Error fetching testimonials:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTestimonials();
  }, []);

  return { testimonials, loading };
}

export function useAdminReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAllReviews = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReviews((data || []) as unknown as Review[]);
    } catch (error) {
      console.error('Error fetching admin reviews:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllReviews();
  }, [fetchAllReviews]);

  const updateReviewStatus = useCallback(async (reviewId: string, status: string, reason?: string) => {
    try {
      const updateData: any = { status };
      if (reason) updateData.hidden_reason = reason;

      const { error } = await supabase
        .from('reviews')
        .update(updateData)
        .eq('id', reviewId);

      if (error) throw error;
      toast({ title: 'Review updated', description: `Review status changed to ${status}.` });
      fetchAllReviews();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  }, [toast, fetchAllReviews]);

  const toggleFeatured = useCallback(async (reviewId: string, isFeatured: boolean) => {
    try {
      const { error } = await supabase
        .from('reviews')
        .update({ is_featured: !isFeatured } as any)
        .eq('id', reviewId);

      if (error) throw error;
      toast({ title: isFeatured ? 'Unfeatured' : 'Featured', description: `Review ${isFeatured ? 'removed from' : 'added to'} featured.` });
      fetchAllReviews();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  }, [toast, fetchAllReviews]);

  const stats = {
    total: reviews.length,
    published: reviews.filter(r => r.status === 'published').length,
    hidden: reviews.filter(r => r.status === 'hidden').length,
    flagged: reviews.filter(r => r.status === 'flagged').length,
    averageRating: reviews.length > 0 ? Math.round((reviews.reduce((s, r) => s + r.overall_rating, 0) / reviews.length) * 10) / 10 : 0,
  };

  return { reviews, loading, stats, updateReviewStatus, toggleFeatured, refetch: fetchAllReviews };
}
