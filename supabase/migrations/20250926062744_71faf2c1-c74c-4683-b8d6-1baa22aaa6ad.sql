-- Create comment likes table for supporting likes on comments
CREATE TABLE public.comment_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL,
  user_id UUID,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id),
  UNIQUE(comment_id, session_id)
);

-- Add indexes for better performance
CREATE INDEX idx_comment_likes_comment_id ON public.comment_likes(comment_id);
CREATE INDEX idx_comment_likes_user_id ON public.comment_likes(user_id);
CREATE INDEX idx_comment_likes_session_id ON public.comment_likes(session_id);

-- Enable RLS
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

-- Create policies for comment likes
CREATE POLICY "Anyone can view comment likes" 
ON public.comment_likes 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create comment likes" 
ON public.comment_likes 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can delete their own comment likes" 
ON public.comment_likes 
FOR DELETE 
USING (
  (auth.uid() = user_id) OR 
  (auth.uid() IS NULL AND session_id IS NOT NULL)
);

-- Update post_likes table to support anonymous likes via session_id
ALTER TABLE public.post_likes ADD COLUMN session_id TEXT;

-- Add unique constraint for anonymous users
ALTER TABLE public.post_likes ADD CONSTRAINT unique_post_session_like 
UNIQUE(post_id, session_id);

-- Update post_likes RLS policies to allow anonymous likes
DROP POLICY IF EXISTS "Users can delete their own blog likes" ON public.post_likes;
DROP POLICY IF EXISTS "Authenticated users can create likes" ON public.post_likes;

CREATE POLICY "Anyone can create post likes" 
ON public.post_likes 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can delete their own post likes" 
ON public.post_likes 
FOR DELETE 
USING (
  (auth.uid() = user_id) OR 
  (auth.uid() IS NULL AND session_id IS NOT NULL)
);

-- Create function to update comment like counts
CREATE OR REPLACE FUNCTION public.update_comment_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.post_comments 
    SET like_count = like_count + 1 
    WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.post_comments 
    SET like_count = GREATEST(like_count - 1, 0) 
    WHERE id = OLD.comment_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for comment like count updates
CREATE TRIGGER update_comment_like_count_trigger
  AFTER INSERT OR DELETE ON public.comment_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_comment_like_count();