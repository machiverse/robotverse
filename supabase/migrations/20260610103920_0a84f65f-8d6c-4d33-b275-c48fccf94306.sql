GRANT SELECT ON public.community_posts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.community_posts TO authenticated;
GRANT ALL ON public.community_posts TO service_role;

GRANT SELECT ON public.blogs TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.blogs TO authenticated;
GRANT ALL ON public.blogs TO service_role;

GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

GRANT EXECUTE ON FUNCTION public.increment_community_post_view_count(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_blog_view_count(uuid) TO anon, authenticated;