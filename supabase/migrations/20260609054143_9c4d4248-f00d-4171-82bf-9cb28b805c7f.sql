GRANT SELECT ON public.community_posts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.community_posts TO authenticated;
GRANT ALL ON public.community_posts TO service_role;
GRANT SELECT ON public.blogs TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.blogs TO authenticated;
GRANT ALL ON public.blogs TO service_role;