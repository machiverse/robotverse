
-- Reviews and Ratings table
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reviewer_id UUID NOT NULL,
  reviewed_user_id UUID,
  item_id UUID,
  item_type TEXT NOT NULL CHECK (item_type IN ('robot', 'spare_part', 'service')),
  deal_type TEXT NOT NULL CHECK (deal_type IN ('robot', 'spare_parts', 'service')),
  reviewer_role TEXT NOT NULL CHECK (reviewer_role IN ('buyer', 'seller', 'service_provider')),
  
  -- Rating fields
  overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
  service_quality_rating INTEGER CHECK (service_quality_rating >= 1 AND service_quality_rating <= 5),
  communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
  delivery_rating INTEGER CHECK (delivery_rating >= 1 AND delivery_rating <= 5),
  
  -- Content
  feedback_text TEXT,
  reviewer_name TEXT,
  reviewer_company TEXT,
  reviewer_avatar_url TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'hidden', 'flagged', 'removed')),
  is_verified BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  
  -- Admin
  admin_notes TEXT,
  hidden_reason TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can view published reviews
CREATE POLICY "Anyone can view published reviews"
ON public.reviews FOR SELECT
USING (status = 'published');

-- Admins can view all reviews
CREATE POLICY "Admins can view all reviews"
ON public.reviews FOR SELECT
USING (is_admin());

-- Authenticated users can create reviews
CREATE POLICY "Users can create reviews"
ON public.reviews FOR INSERT
WITH CHECK (auth.uid() = reviewer_id);

-- Users can update their own reviews
CREATE POLICY "Users can update their own reviews"
ON public.reviews FOR UPDATE
USING (auth.uid() = reviewer_id);

-- Admins can update any review
CREATE POLICY "Admins can update any review"
ON public.reviews FOR UPDATE
USING (is_admin());

-- Admins can delete reviews
CREATE POLICY "Admins can delete reviews"
ON public.reviews FOR DELETE
USING (is_admin());

-- Indexes
CREATE INDEX idx_reviews_item ON public.reviews (item_id, item_type);
CREATE INDEX idx_reviews_reviewed_user ON public.reviews (reviewed_user_id);
CREATE INDEX idx_reviews_status ON public.reviews (status);
CREATE INDEX idx_reviews_featured ON public.reviews (is_featured) WHERE is_featured = true;

-- Trigger for updated_at
CREATE TRIGGER update_reviews_updated_at
BEFORE UPDATE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
