# RobotVerse SEO + AEO Master Plan

Status legend: **DONE** = live in this codebase · **PARTIAL** = exists, needs extension · **BLOCKED** = needs SSR migration · **TODO** = not built

---

## 0. The one architectural blocker

This project is a **client-rendered Vite + React SPA**. All head tags (`<title>`, meta, JSON-LD) are injected after hydration. Googlebot executes JS and will see them; **ChatGPT, Perplexity, ClaudeBot, LinkedIn, WhatsApp and Facebook do not** — they read the raw `index.html` only.

IndiaMART ranks the way it does because every listing is server-rendered HTML. To match that, the app needs SSR. Lovable supports this: type `/` in chat and choose **Migrate to TanStack Start** ([what the upgrade gives you](https://lovable.dev/blog/building-apps-using-tanstack-start)). Items marked BLOCKED below only fully work after that.

Mitigation already in place: the `aeo-render` edge function serves pre-rendered HTML for bots, and `AEOContentBlock` writes FAQ/summary content into the real DOM rather than hiding it in JS-only meta.

---

## 1. Automatic SEO for new listings — **PARTIAL/DONE**

Existing pipeline:

| Piece | Where |
|---|---|
| `seo_metadata` table (37 cols: title, description, canonical, og, jsonld, faq, summary, highlights) | database |
| `seo_jobs` queue table | database |
| `tg_seo_enqueue_robot / _spare_part / _service / _blog / _community_post / _profile` triggers | database |
| `enqueue_seo_job()`, `request_seo_regenerate()`, `seo_hash()`, `slugify()` | database functions |
| `seo-generator` edge function (AI writes title/description/FAQ/JSON-LD) | `supabase/functions/seo-generator` |
| `pg_cron` job draining `seo_jobs` | database |
| Admin UI | `src/pages/dashboard/admin/SEODashboard.tsx`, `RegenerateSEOButton.tsx` |

So: **any new robot/part/service/blog already auto-generates meta title, description, canonical, OG tags and JSON-LD within a cron cycle.**

Remaining TODO: per-row `auto_seo_enabled` boolean on `seo_metadata` so admins can pin hand-written copy (see §11).

## 2. AEO for AI crawlers — **DONE (this change)**

- `public/llms.txt` — catalog structure map for GPTBot/Perplexity/Claude. **new**
- `public/robots.txt` — GPTBot, OAI-SearchBot, ChatGPT-User, PerplexityBot, ClaudeBot, Claude-Web, Google-Extended, CCBot, anthropic-ai all `Allow: /`. Already present.
- `AEOContentBlock` (summary + highlights + `<details>` FAQ + FAQPage JSON-LD) now renders on **`/robots/:id`** and **`/parts/:id`**. **new**
- Comparison tables: `/robot-comparison` + `CompareRobots` landing pages. Already present.
- Entity markup (brand/model/category/application): `generateProductSchema` in `src/utils/seoSchemas.ts`.

Next: drop `<AEOContentBlock />` into `ServiceDetails`, `AuctionDetail`, `BlogDetails`, and the landing pages under `src/pages/landing/`. Copy the block from `src/pages/SparePartDetails.tsx` and swap the FAQ generator.

## 3. IndiaMART-style instant indexing — **PARTIAL**

Working today: new rows appear in category/brand pages immediately (live Supabase queries), and the dynamic sitemap edge function reads `seo_metadata` so new URLs show up on next fetch.

TODO:
- **Related/Similar items** — add a `RelatedListings` component querying same brand → same category → same price band, limit 5, rendered as real `<a href>` links (crawlable internal linking, §8).
- **Google Indexing API** — the `google_search_console` connector is available. On publish, call `POST /v1/urlNotifications:publish` with `{"url": "...", "type": "URL_UPDATED"}` from an edge function triggered by the same DB trigger that enqueues the SEO job. Note: Google officially honours the Indexing API for `JobPosting` and `BroadcastEvent` only — treat it as best-effort for product URLs and rely on sitemap ping as the primary signal.
- **7-day homepage carousel** — add `featured_until timestamptz` to `robots`, default `now() + interval '7 days'` on insert, and sort `HomeRobotListings` by it.

## 4. Dynamic JSON-LD — **DONE/PARTIAL**

Generators live in `src/utils/seo/modernSchemas.ts`: Organization, WebSite (+SearchAction), Product, Offer, FAQPage, Breadcrumb, ItemList, Service, Article, LocalBusiness.

Coverage: homepage ✅, robot detail ✅ (Product + FAQ + Breadcrumb after this change), part detail ✅, service detail ✅, landing pages ✅ (`LandingPageLayout`).
Gaps: `AggregateRating` is only wired where `reviews` exist — extend `generateProductSchema` to read the `reviews` aggregate; auction pages need `Offer` with `priceSpecification` min/max.

## 5. Content auto-generation — **DONE**

`src/utils/seo/programmaticSEO.ts` generates the 150-word description, feature bullets, spec table, applications and FAQs deterministically; `seo-generator` upgrades them with AI. "Related spare parts" and "maintenance tips" sections are TODO and should reuse the same file.

## 6. URL structure — **PARTIAL (deliberately not migrated)**

Live SEO routes: `/robots/brand/:brand`, `/robots/:brand/used`, `/robots/application/:application`, `/robots/city/:city`, `/parts/category/:category`, `/services/city/:city`.

The requested `/industrial-robots/fanuc-m710ic-20-used-mumbai` form means changing the canonical ID route. That is a **breaking migration** and is intentionally not done. When you want it:
1. Add a `slug` column to `robots` populated by `slugify(brand||' '||model||' '||condition||' '||city)` with a uniqueness suffix.
2. Serve both `/robots/:id` and `/robots/:slug`, canonical → slug.
3. 301 old URLs at the edge, resubmit sitemaps.

`rel="next"/"prev"` pagination tags: TODO (add to `SEOHead` props, emit on `/robots`, `/parts`).

## 7. Performance & crawlability — **PARTIAL / BLOCKED**

Done: lazy image loading + generated alt text (`SEOImageWrapper`, `generateImageAlt`), preload hints, mobile-first Tailwind layout, Cloudflare Web Analytics.
Blocked on SSR: server-rendered product data, sub-2s LCP for bots.

## 8. Sitemaps & internal linking — **DONE/PARTIAL**

- `supabase/functions/sitemap` serves the dynamic sitemap from `seo_metadata` (`?kind=urls|images|news`), referenced from `robots.txt`.
- `generate-sitemap-auto` runs on cron.
- TODO: split into a `<sitemapindex>` of products / categories / brands / services / auctions / blog once URL count crosses ~10k, and ping `https://www.google.com/ping?sitemap=` after each regeneration.
- TODO: the 3–5 related-item internal links from §3.

## 9. Rich/featured snippets — **PARTIAL**

Spec tables and FAQ `<details>` lists are now in the DOM on listing pages. TODO: numbered "How it works" lists on service pages, definition lists for technical terms in RoboBook, and auction `priceSpecification` ranges.

## 10. India localisation — **PARTIAL**

Done: city landing pages, `INDIAN_CITIES_SEO` keyword sets, `LocalBusiness` schema on the homepage, `areaServed: IN`.
TODO: `hreflang` alternates (only if Hindi content actually ships — do not emit `hreflang` for untranslated pages), WhatsApp click-to-chat on listing pages.

---

## 11. Recommended next migration (single SQL change)

```sql
ALTER TABLE public.seo_metadata
  ADD COLUMN IF NOT EXISTS auto_seo_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS manual_override jsonb;
```
Then have `seo-generator` skip rows where `auto_seo_enabled = false`, and expose the toggle plus a "regenerate selected" bulk action in `SEODashboard.tsx`.

## 12. Deployment checklist

1. Publish the app so `/llms.txt` and `/robots.txt` are live at the root.
2. Verify the domain in Google Search Console (meta-tag method) and submit the sitemap edge-function URLs.
3. Confirm the `seo_jobs` cron is draining: `select status, count(*) from seo_jobs group by 1;`
4. Validate a listing page in Google's Rich Results Test and schema.org validator.
5. Fetch `https://robotverse.in/llms.txt` and one `/robots/:id` with `curl -A GPTBot` to confirm the AEO block is in the served HTML (this is where SSR matters).
6. Re-run the Lovable SEO scan.
