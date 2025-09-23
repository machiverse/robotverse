-- Create blog_likes table for blog post likes
CREATE TABLE public.blog_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blog_id UUID NOT NULL REFERENCES public.blogs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(blog_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.blog_likes ENABLE ROW LEVEL SECURITY;

-- Create policies for blog likes
CREATE POLICY "Authenticated users can create blog likes" 
ON public.blog_likes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Blog likes are viewable by everyone" 
ON public.blog_likes 
FOR SELECT 
USING (true);

CREATE POLICY "Users can delete their own blog likes" 
ON public.blog_likes 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_blog_likes_blog_id ON public.blog_likes(blog_id);
CREATE INDEX idx_blog_likes_user_id ON public.blog_likes(user_id);