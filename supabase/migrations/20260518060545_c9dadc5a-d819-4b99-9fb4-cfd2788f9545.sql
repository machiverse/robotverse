-- Remove the helper view (security_definer linter error) and use column-level grants instead
DROP VIEW IF EXISTS public.public_business_profiles;

-- Restore a narrow row-level public SELECT but combine with column grants below
DROP POLICY IF EXISTS "Public can view seller profile rows" ON public.profiles;
CREATE POLICY "Public can view seller profile rows"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (
  user_id IN (
    SELECT DISTINCT seller_id FROM public.robots WHERE seller_id IS NOT NULL
    UNION
    SELECT DISTINCT seller_id FROM public.spare_parts WHERE seller_id IS NOT NULL
    UNION
    SELECT DISTINCT provider_id FROM public.services WHERE provider_id IS NOT NULL
    UNION
    SELECT DISTINCT provider_id FROM public.logistics_services WHERE provider_id IS NOT NULL
    UNION
    SELECT DISTINCT provider_id FROM public.loan_products WHERE provider_id IS NOT NULL
    UNION
    SELECT DISTINCT provider_id FROM public.loan_schemes WHERE provider_id IS NOT NULL
  )
);

-- Restrict anonymous column access to non-sensitive fields only
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (
  user_id,
  full_name,
  company_name,
  avatar_url,
  location,
  city,
  user_type,
  primary_user_type,
  account_type,
  company_logo_url,
  completed_sales,
  average_rating,
  total_reviews
) ON public.profiles TO anon;