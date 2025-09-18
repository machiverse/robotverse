-- Create blog_shares table for blog post shares
CREATE TABLE public.blog_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blog_id UUID NOT NULL REFERENCES public.blogs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_to TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(blog_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.blog_shares ENABLE ROW LEVEL SECURITY;

-- Create policies for blog shares
CREATE POLICY "Authenticated users can create blog shares" 
ON public.blog_shares 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Blog shares are viewable by everyone" 
ON public.blog_shares 
FOR SELECT 
USING (true);

-- Create indexes for better performance
CREATE INDEX idx_blog_shares_blog_id ON public.blog_shares(blog_id);
CREATE INDEX idx_blog_shares_user_id ON public.blog_shares(user_id);

-- Update the existing trigger function to handle blog shares
CREATE OR REPLACE FUNCTION public.update_blog_counters()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'blog_likes' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE public.blogs 
      SET like_count = like_count + 1 
      WHERE id = NEW.blog_id;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE public.blogs 
      SET like_count = GREATEST(like_count - 1, 0) 
      WHERE id = OLD.blog_id;
    END IF;
  ELSIF TG_TABLE_NAME = 'blog_shares' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE public.blogs 
      SET share_count = COALESCE(share_count, 0) + 1 
      WHERE id = NEW.blog_id;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE public.blogs 
      SET share_count = GREATEST(COALESCE(share_count, 0) - 1, 0) 
      WHERE id = OLD.blog_id;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for blog shares
CREATE TRIGGER update_blog_shares_counter
  AFTER INSERT OR DELETE ON public.blog_shares
  FOR EACH ROW EXECUTE FUNCTION public.update_blog_counters();

-- Add share_count column to blogs table if it doesn't exist
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS share_count INTEGER DEFAULT 0;