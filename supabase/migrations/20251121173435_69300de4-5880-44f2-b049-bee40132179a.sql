-- Create unified content interactions table
CREATE TABLE IF NOT EXISTS public.content_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('blog', 'community_post', 'video')),
  user_id UUID NOT NULL,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('like', 'comment')),
  comment_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure like is unique per user per content
  UNIQUE(content_id, user_id, interaction_type, comment_text) 
    DEFERRABLE INITIALLY DEFERRED,
  
  -- Validate comment has text
  CONSTRAINT comment_has_text CHECK (
    (interaction_type = 'comment' AND comment_text IS NOT NULL AND length(trim(comment_text)) > 0)
    OR interaction_type = 'like'
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_content_interactions_content ON public.content_interactions(content_id, content_type);
CREATE INDEX IF NOT EXISTS idx_content_interactions_user ON public.content_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_content_interactions_type ON public.content_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_content_interactions_created ON public.content_interactions(created_at DESC);

-- Enable RLS
ALTER TABLE public.content_interactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view interactions"
  ON public.content_interactions FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can create interactions"
  ON public.content_interactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
  ON public.content_interactions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND interaction_type = 'comment')
  WITH CHECK (auth.uid() = user_id AND interaction_type = 'comment');

CREATE POLICY "Users can delete their own interactions"
  ON public.content_interactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to update interaction counters
CREATE OR REPLACE FUNCTION public.update_content_counters()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Update like count
    IF NEW.interaction_type = 'like' THEN
      IF NEW.content_type = 'blog' THEN
        UPDATE public.blogs 
        SET like_count = COALESCE(like_count, 0) + 1 
        WHERE id = NEW.content_id;
      ELSIF NEW.content_type = 'community_post' OR NEW.content_type = 'video' THEN
        UPDATE public.community_posts 
        SET like_count = COALESCE(like_count, 0) + 1 
        WHERE id = NEW.content_id;
      END IF;
    -- Update comment count
    ELSIF NEW.interaction_type = 'comment' THEN
      IF NEW.content_type = 'blog' THEN
        UPDATE public.blogs 
        SET like_count = COALESCE(like_count, 0) + 1 
        WHERE id = NEW.content_id;
      ELSIF NEW.content_type = 'community_post' OR NEW.content_type = 'video' THEN
        UPDATE public.community_posts 
        SET comment_count = COALESCE(comment_count, 0) + 1 
        WHERE id = NEW.content_id;
      END IF;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    -- Update like count
    IF OLD.interaction_type = 'like' THEN
      IF OLD.content_type = 'blog' THEN
        UPDATE public.blogs 
        SET like_count = GREATEST(COALESCE(like_count, 0) - 1, 0) 
        WHERE id = OLD.content_id;
      ELSIF OLD.content_type = 'community_post' OR OLD.content_type = 'video' THEN
        UPDATE public.community_posts 
        SET like_count = GREATEST(COALESCE(like_count, 0) - 1, 0) 
        WHERE id = OLD.content_id;
      END IF;
    -- Update comment count
    ELSIF OLD.interaction_type = 'comment' THEN
      IF OLD.content_type = 'blog' THEN
        UPDATE public.blogs 
        SET like_count = GREATEST(COALESCE(like_count, 0) - 1, 0) 
        WHERE id = OLD.content_id;
      ELSIF OLD.content_type = 'community_post' OR OLD.content_type = 'video' THEN
        UPDATE public.community_posts 
        SET comment_count = GREATEST(COALESCE(comment_count, 0) - 1, 0) 
        WHERE id = OLD.content_id;
      END IF;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger
DROP TRIGGER IF EXISTS update_content_counters_trigger ON public.content_interactions;
CREATE TRIGGER update_content_counters_trigger
  AFTER INSERT OR DELETE ON public.content_interactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_content_counters();

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION public.update_content_interaction_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_content_interaction_timestamp_trigger ON public.content_interactions;
CREATE TRIGGER update_content_interaction_timestamp_trigger
  BEFORE UPDATE ON public.content_interactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_content_interaction_timestamp();