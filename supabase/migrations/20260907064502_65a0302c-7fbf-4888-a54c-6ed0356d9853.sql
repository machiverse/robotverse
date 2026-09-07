-- 1. Moderation state on profiles, separate from business state
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS content_suppressed_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_account_status_check') THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_account_status_check
      CHECK (account_status IN ('active','suspended','blocked'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_account_status ON public.profiles(account_status);

-- 2. Suppression predicate. STABLE + SECURITY DEFINER so it can be used inside
-- RLS policies without recursion (same pattern as public.is_admin()).
CREATE OR REPLACE FUNCTION public.is_user_active(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN check_user_id IS NULL THEN true
    ELSE COALESCE(
      (SELECT p.account_status = 'active' FROM public.profiles p WHERE p.user_id = check_user_id LIMIT 1),
      true
    )
  END
$$;

GRANT EXECUTE ON FUNCTION public.is_user_active(uuid) TO anon, authenticated, service_role;

-- 3. RLS cascade on every publicly rendered content table.
--    Pattern: (existing published/active condition) AND is_user_active(owner)
--             OR owner = auth.uid()  (own dashboard)
--             OR is_admin()          (review + restore)

-- robots
DROP POLICY IF EXISTS "Anyone can view robots" ON public.robots;
CREATE POLICY "Anyone can view robots" ON public.robots FOR SELECT
USING (public.is_user_active(seller_id) OR seller_id = auth.uid() OR public.is_admin());

-- spare_parts
DROP POLICY IF EXISTS "Anyone can view spare parts" ON public.spare_parts;
CREATE POLICY "Anyone can view spare parts" ON public.spare_parts FOR SELECT
USING (public.is_user_active(seller_id) OR seller_id = auth.uid() OR public.is_admin());

-- services
DROP POLICY IF EXISTS "Anyone can view services" ON public.services;
CREATE POLICY "Anyone can view services" ON public.services FOR SELECT
USING (public.is_user_active(provider_id) OR provider_id = auth.uid() OR public.is_admin());

-- logistics_services
DROP POLICY IF EXISTS "Anyone can view active services" ON public.logistics_services;
CREATE POLICY "Anyone can view active services" ON public.logistics_services FOR SELECT
USING ((is_active = true AND public.is_user_active(provider_id)) OR provider_id = auth.uid() OR public.is_admin());

-- loan_products
DROP POLICY IF EXISTS "Anyone can view active loan products" ON public.loan_products;
CREATE POLICY "Anyone can view active loan products" ON public.loan_products FOR SELECT
USING ((is_active = true AND public.is_user_active(provider_id)) OR provider_id = auth.uid() OR public.is_admin());

-- loan_schemes
DROP POLICY IF EXISTS "Anyone can view active schemes" ON public.loan_schemes;
CREATE POLICY "Anyone can view active schemes" ON public.loan_schemes FOR SELECT
USING ((is_active = true AND public.is_user_active(provider_id)) OR provider_id = auth.uid() OR public.is_admin());

-- coverage_areas
DROP POLICY IF EXISTS "Anyone can view active coverage areas" ON public.coverage_areas;
CREATE POLICY "Anyone can view active coverage areas" ON public.coverage_areas FOR SELECT
USING ((is_active = true AND public.is_user_active(provider_id)) OR provider_id = auth.uid() OR public.is_admin());

-- blogs
DROP POLICY IF EXISTS "Anyone can view published blogs" ON public.blogs;
CREATE POLICY "Anyone can view published blogs" ON public.blogs FOR SELECT
USING ((status = 'published' AND public.is_user_active(author_id)) OR author_id = auth.uid() OR public.is_admin());

-- community_posts
DROP POLICY IF EXISTS "Posts are viewable by everyone or author" ON public.community_posts;
CREATE POLICY "Posts are viewable by everyone or author" ON public.community_posts FOR SELECT
USING ((status = 'published' AND public.is_user_active(author_id)) OR auth.uid() = author_id OR public.is_admin());

-- blog_comments
DROP POLICY IF EXISTS "Anyone can view comments for published blogs" ON public.blog_comments;
CREATE POLICY "Anyone can view comments for published blogs" ON public.blog_comments FOR SELECT
USING (
  (blog_id IN (SELECT b.id FROM public.blogs b WHERE b.status = 'published') AND public.is_user_active(user_id))
  OR user_id = auth.uid() OR public.is_admin()
);

-- post_comments
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.post_comments;
CREATE POLICY "Comments are viewable by everyone" ON public.post_comments FOR SELECT
USING (public.is_user_active(user_id) OR user_id = auth.uid() OR public.is_admin());

-- reviews
DROP POLICY IF EXISTS "Anyone can view published reviews" ON public.reviews;
CREATE POLICY "Anyone can view published reviews" ON public.reviews FOR SELECT
USING ((status = 'published' AND public.is_user_active(reviewer_id)) OR reviewer_id = auth.uid() OR public.is_admin());

-- auctions
DROP POLICY IF EXISTS "Anyone can view auctions" ON public.auctions;
CREATE POLICY "Anyone can view auctions" ON public.auctions FOR SELECT
USING (public.is_user_active(seller_id) OR seller_id = auth.uid() OR public.is_admin());

-- auction_bids
DROP POLICY IF EXISTS "View bids on open auctions" ON public.auction_bids;
CREATE POLICY "View bids on open auctions" ON public.auction_bids FOR SELECT
USING (
  (
    public.is_user_active(bidder_id)
    AND (
      EXISTS (SELECT 1 FROM public.auctions a WHERE a.id = auction_bids.auction_id AND a.auction_type = 'open')
      OR EXISTS (SELECT 1 FROM public.auctions a WHERE a.id = auction_bids.auction_id AND a.seller_id = auth.uid())
    )
  )
  OR auth.uid() = bidder_id
  OR public.is_admin()
);

-- talent_jobs
DROP POLICY IF EXISTS "Anyone can view open jobs" ON public.talent_jobs;
CREATE POLICY "Anyone can view open jobs" ON public.talent_jobs FOR SELECT
USING ((status = 'open' AND public.is_user_active(employer_id)) OR auth.uid() = employer_id OR public.is_admin());

-- training_programs
DROP POLICY IF EXISTS "Anyone can view active training" ON public.training_programs;
CREATE POLICY "Anyone can view active training" ON public.training_programs FOR SELECT
USING ((status = 'active' AND public.is_user_active(trainer_id)) OR auth.uid() = trainer_id OR public.is_admin());

-- job_seeker_profiles
DROP POLICY IF EXISTS "Anyone authenticated can view active seeker profiles" ON public.job_seeker_profiles;
CREATE POLICY "Anyone authenticated can view active seeker profiles" ON public.job_seeker_profiles FOR SELECT
TO authenticated
USING ((is_active = true AND public.is_user_active(user_id)) OR user_id = auth.uid() OR public.is_admin());

-- seller_coupons
DROP POLICY IF EXISTS "Authenticated can view active coupons" ON public.seller_coupons;
CREATE POLICY "Authenticated can view active coupons" ON public.seller_coupons FOR SELECT
TO authenticated
USING (
  (is_active = true AND admin_disabled = false AND now() >= start_date AND now() <= expiry_date
   AND public.is_user_active(seller_id))
  OR auth.uid() = seller_id
);

-- profiles: public seller profile rows
DROP POLICY IF EXISTS "Public can view seller profile rows" ON public.profiles;
CREATE POLICY "Public can view seller profile rows" ON public.profiles FOR SELECT
TO anon, authenticated
USING (
  account_status = 'active'
  AND user_id IN (
    SELECT DISTINCT robots.seller_id FROM public.robots WHERE robots.seller_id IS NOT NULL
    UNION SELECT DISTINCT spare_parts.seller_id FROM public.spare_parts WHERE spare_parts.seller_id IS NOT NULL
    UNION SELECT DISTINCT services.provider_id FROM public.services WHERE services.provider_id IS NOT NULL
    UNION SELECT DISTINCT logistics_services.provider_id FROM public.logistics_services WHERE logistics_services.provider_id IS NOT NULL
    UNION SELECT DISTINCT loan_products.provider_id FROM public.loan_products WHERE loan_products.provider_id IS NOT NULL
    UNION SELECT DISTINCT loan_schemes.provider_id FROM public.loan_schemes WHERE loan_schemes.provider_id IS NOT NULL
  )
);
