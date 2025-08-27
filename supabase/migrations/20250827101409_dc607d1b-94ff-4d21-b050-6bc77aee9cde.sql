-- Create blogs table for the blog feature
CREATE TABLE public.blogs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  content text NOT NULL,
  excerpt text,
  tags text[] DEFAULT '{}',
  image_url text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  author_id uuid NOT NULL,
  view_count integer DEFAULT 0,
  like_count integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  published_at timestamp with time zone
);

-- Enable Row Level Security
ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;

-- Create policies for blogs
CREATE POLICY "Anyone can view published blogs" 
ON public.blogs 
FOR SELECT 
USING (status = 'published');

CREATE POLICY "Authors can view their own blogs" 
ON public.blogs 
FOR SELECT 
USING (auth.uid() = author_id);

CREATE POLICY "Authenticated users can create blogs" 
ON public.blogs 
FOR INSERT 
WITH CHECK (auth.uid() = author_id AND auth.uid() IS NOT NULL);

CREATE POLICY "Authors can update their own blogs" 
ON public.blogs 
FOR UPDATE 
USING (auth.uid() = author_id);

CREATE POLICY "Authors can delete their own blogs" 
ON public.blogs 
FOR DELETE 
USING (auth.uid() = author_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_blog_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  
  -- Set published_at when status changes to published
  IF NEW.status = 'published' AND OLD.status != 'published' THEN
    NEW.published_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_blogs_updated_at
BEFORE UPDATE ON public.blogs
FOR EACH ROW
EXECUTE FUNCTION public.update_blog_updated_at();

-- Create blog views tracking table
CREATE TABLE public.blog_views (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blog_id uuid NOT NULL REFERENCES public.blogs(id) ON DELETE CASCADE,
  user_id uuid,
  ip_address text,
  viewed_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS for blog views
ALTER TABLE public.blog_views ENABLE ROW LEVEL SECURITY;

-- Create policy for blog views (anyone can track views)
CREATE POLICY "Anyone can track blog views" 
ON public.blog_views 
FOR INSERT 
WITH CHECK (true);

-- Create function to increment blog view count
CREATE OR REPLACE FUNCTION public.increment_blog_view_count(p_blog_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_count INTEGER;
BEGIN
  -- Update the view count
  UPDATE public.blogs 
  SET view_count = view_count + 1 
  WHERE id = p_blog_id 
  RETURNING view_count INTO current_count;
  
  RETURN COALESCE(current_count, 0);
END;
$$;

-- Create indexes for better performance
CREATE INDEX idx_blogs_status_published_at ON public.blogs(status, published_at DESC);
CREATE INDEX idx_blogs_author_id ON public.blogs(author_id);
CREATE INDEX idx_blogs_tags ON public.blogs USING GIN(tags);
CREATE INDEX idx_blog_views_blog_id ON public.blog_views(blog_id);