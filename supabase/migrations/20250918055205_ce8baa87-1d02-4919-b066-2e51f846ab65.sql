-- Update published_at for existing blogs that don't have it set
UPDATE public.blogs 
SET published_at = created_at 
WHERE status = 'published' AND published_at IS NULL;

-- Ensure view_count and like_count are not null
UPDATE public.blogs 
SET view_count = COALESCE(view_count, 0),
    like_count = COALESCE(like_count, 0)
WHERE view_count IS NULL OR like_count IS NULL;