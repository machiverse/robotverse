## Goal
Make every robot, spare part, service, and RoboBook/blog page (plus their category/brand/location landing pages) fully optimized for Google and other crawlers automatically — no manual SEO work per item.

## Phase 1 — Auto Meta + JSON-LD on every content page
Wire the existing `useAutoSEO` / `SEOHead` system into pages that are missing it or using only static defaults:

- Robot detail (`RobotDetails`), listings (`Robots`, `RobotCategory`, `SellerRobots`)
- Spare parts (`SparePartDetails`, `Parts`, `SpareCategory`)
- Services (`ServiceDetails`, `Services`, `ServiceCategory`)
- RoboBook + Blogs (`BlogDetails`, `Blogs`, `RoboBookCategory`)
- Landing pages (`BrandRobots`, `CityRobots`, `ApplicationRobots`, `UsedBrandRobots`, `CompareRobots`, `BrandParts`, `CategoryParts`, `CityServices`)

Each page will emit: dynamic `<title>`, meta description, keywords (from `useDynamicSEOKeywords` + content fields), canonical, OG/Twitter tags with a real image, and JSON-LD (`Product` / `Service` / `Article` / `ItemList` + `BreadcrumbList`). Location + brand + category words are auto-injected from the row itself.

## Phase 2 — Crawler coverage (sitemap + robots)
Rebuild `supabase/functions/generate-sitemap-auto` and the `/sitemap.xml` route so it emits, on every request/refresh:

- All static routes
- Every published robot, spare part, service, blog, robobook article
- Every brand landing page, city landing page, category landing page, application landing page
- Split into sub-sitemaps + a sitemap index (robots / parts / services / content / landing) so it scales past 50k URLs

Update `public/robots.txt` to point at the sitemap index and keep admin/auth/dashboard paths disallowed.

## Phase 3 — AI SEO analyzer (background)
New edge function `seo-auto-optimize` using Lovable AI Gateway:

- Triggered on insert/update of `robots`, `spare_parts`, `services`, `blogs` via DB trigger enqueueing into existing `seo_jobs` table
- For each row: generate optimized title, meta description, keyword list, FAQ schema, image alt text, and an SEO score
- Writes results to `seo_metadata` / `seo_image_metadata` (already exist)
- Frontend SEO components read from `seo_metadata` first, fall back to auto-generated values

Admin SEO Dashboard (`dashboard/admin/SEODashboard`) gets: queue status, per-page scores, and a "Re-analyze all" button.

## Technical details
- No new tables needed — `seo_metadata`, `seo_image_metadata`, `seo_jobs` already exist. Only new triggers + edge function.
- Uses Lovable AI Gateway (`google/gemini-2.5-flash`) — cheap, fast, structured JSON output.
- Sitemap served through existing edge function; cached 1h.
- All new SEO reads are read-only public (no RLS changes).
- Rolled out phase-by-phase; Phase 1 alone already delivers most of the ranking benefit.

## Deliverables per phase
1. ~15 page files updated + 1 shared `PageSEO` wrapper component
2. Rewritten sitemap edge function + updated `robots.txt`
3. New `seo-auto-optimize` edge function + DB trigger + admin panel wiring

Shall I start with Phase 1?
