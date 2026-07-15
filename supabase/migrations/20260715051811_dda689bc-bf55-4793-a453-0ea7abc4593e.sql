
ALTER TABLE public.community_posts DROP CONSTRAINT IF EXISTS community_posts_status_check;
ALTER TABLE public.community_posts ADD CONSTRAINT community_posts_status_check CHECK (status = ANY (ARRAY['draft'::text, 'scheduled'::text, 'published'::text, 'archived'::text]));

DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.community_posts;
CREATE POLICY "Posts are viewable by everyone or author"
ON public.community_posts
FOR SELECT
USING (status = 'published' OR auth.uid() = author_id);
