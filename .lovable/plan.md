
# RobotVerse Automated AI-SEO Roadmap

Goal: every robot, spare part, service, blog, profile, category, brand and landing page is automatically optimized for Google, Bing, ChatGPT, Gemini, Claude, Perplexity and Copilot — with zero seller effort. Built on the existing Supabase + Lovable AI Gateway stack, using your hybrid generation strategy.

## Architecture overview

```text
Seller publishes content
        │
        ▼
INSERT/UPDATE on robots / spare_parts / services / blogs / profiles
        │
        ▼ (DB trigger)
seo_jobs queue (pending → processing → completed/failed)
        │
        ▼ (pg_cron every 1 min  +  on-demand invoke)
Edge fn: seo-generator  ── Lovable AI Gateway (gemini-3-flash)
        │                       ├─ titles, meta, slug, OG, twitter
        │                       ├─ FAQ, summary, highlights, AEO/GEO blocks
        │                       ├─ JSON-LD, breadcrumbs, image alt/title/caption
        │                       └─ keywords, related links
        ▼
seo_metadata table (1 row per content item, content_hash for dedupe)
        │
        ├──► Edge fn: sitemap-generator  → public sitemap + image + news sitemaps
        └──► Edge fn: indexing-pinger    → IndexNow + Google Indexing API + Bing
        ▼
Frontend (react-helmet-async + UniversalSEOHead) reads seo_metadata
Fallback: render with on-the-fly defaults + enqueue job if missing
```

Key design choices:
- **Hybrid generation** as you specified: async on INSERT, smart-diff on UPDATE (only regenerate when title/description/specs/brand/category/images/applications change — not price/stock/contact), render-time fallback, manual "Regenerate AI SEO" button.
- **Content hashing** (sha256 of significant fields) to skip AI calls when nothing meaningful changed and to detect duplicates across listings.
- **Single `seo_metadata` table** keyed by `(content_type, content_id)` so every entity inherits the system without per-table columns.
- **Job queue** with retry, status, and error logs for reliability and cost visibility.

## Phase 1 — Foundation (DB + queue + render)

1. Migration:
   - `seo_metadata` table — content_type, content_id, slug, title, meta_description, focus_keyword, canonical_url, og_*, twitter_*, jsonld jsonb, faq jsonb, summary, highlights jsonb, ai_blocks jsonb (AEO/GEO), image_seo jsonb, related jsonb, content_hash, generated_at, model, version.
   - `seo_jobs` table — content_type, content_id, status (pending/processing/completed/failed), attempts, last_error, payload, priority, created_at.
   - `seo_image_metadata` table — image_url, alt, title, caption, description, content_type, content_id.
   - DB triggers on `robots`, `spare_parts`, `services`, `blogs`, `profiles`, `community_posts` → enqueue job on INSERT; on UPDATE compare significant columns and enqueue only when changed.
   - RLS: seo_metadata public SELECT; jobs service_role only.
2. Frontend rendering pass:
   - Wire `UniversalSEOHead` (already exists) to read from `seo_metadata` on every detail page (RobotDetails, SparePartDetails, ServiceDetails, BlogDetails, talent, financing, logistics).
   - Fallback generator (`src/utils/seo/fallback.ts`) builds sensible defaults from the row if seo_metadata row is missing, and fires a client → edge call to enqueue.
   - Breadcrumbs + Product/Article/FAQ JSON-LD rendered from `jsonld` column.

## Phase 2 — AI generation engine

3. Edge function `seo-generator`:
   - Pulls up to N pending jobs, marks processing, calls Lovable AI Gateway `google/gemini-3-flash-preview` with a strict JSON schema (Output object) producing every SEO field listed in your spec (title, meta, slug, focus keyword, OG/Twitter, JSON-LD, FAQ, AEO answer blocks, GEO summary/highlights/applications/industries/specs/use cases/pros/cons/maintenance/buying guide, image alt/title/caption per image, keyword set, related entity ids).
   - Dedupe: skip call if content_hash unchanged; if hash matches another listing exactly, copy & lightly rewrite via cheaper prompt.
   - Writes `seo_metadata`, updates job status, logs errors, supports retries (max 3 with backoff).
4. Edge function `seo-regenerate` — auth-protected endpoint used by the seller dashboard and admin "Regenerate AI SEO" buttons; bypasses hash check.
5. pg_cron job: every minute invoke `seo-generator` to drain the queue.

## Phase 3 — Sitemap, robots, indexing automation

6. Edge function `sitemap-generator`:
   - Emits `/sitemap.xml` (index), `/sitemap-robots.xml`, `/sitemap-parts.xml`, `/sitemap-services.xml`, `/sitemap-blogs.xml` (news), `/sitemap-images.xml`, `/sitemap-categories.xml`, `/sitemap-brands.xml`, `/sitemap-landing.xml`.
   - Triggered by job completion + nightly cron.
   - Served via Supabase function URL, with redirect from `/sitemap.xml` (route handler) so robots.txt advertises a clean URL.
7. `public/robots.txt` — add `Sitemap: https://www.robotverse.in/sitemap.xml`, keep current allow rules, block /admin, /dashboard, /auth.
8. Edge function `indexing-pinger`:
   - On seo_metadata insert/update → push URL to IndexNow (key file at `/<key>.txt`) and Google Indexing API (service account JSON in secret).
   - Batches per minute, respects per-day quotas, logs results.

## Phase 4 — Category, brand, landing & search SEO

9. Dynamic landing-page generator:
   - DB table `landing_pages` (slug, type=city/brand/category/combo, params, seo fields).
   - Worker pre-creates pages like `/used-robots-in-india`, `/fanuc-robots-chennai`, `/abb-robots-germany`, `/spare-parts/fanuc-servo-motor`, populated by `seo-generator`.
   - Routes added in `src/App.tsx`: `/landing/:slug`, `/brand/:brand`, `/category/:slug`, `/search` (already), `/used-robots-in-:city`.
10. Category & brand pages reuse the same `seo_metadata` pipeline (content_type = 'category' | 'brand' | 'landing').
11. Search results page: server-rendered title/description from query, schema=`SearchResultsPage` + `SearchAction`.

## Phase 5 — Image SEO & performance

12. On image upload (existing `enhanced-image-upload` function):
    - Generate AI alt/title/caption, store in `seo_image_metadata`.
    - Convert to WebP, generate responsive srcset, write to storage.
    - Add to image sitemap.
13. Shared `<SEOImage />` component using `loading="lazy"`, `decoding="async"`, srcset, alt from metadata.

## Phase 6 — AEO / GEO / Discover polish

14. Every detail page renders the AI-generated AEO/GEO blocks (Quick Summary, Key Features, Applications, Specs, Pros, Cons, FAQ accordion, Comparison table, Buying Guide) — these are what AI search engines quote.
15. Author + datePublished + dateModified on blogs for Google Discover.
16. Auto-blog suggester: cron job inspects new robots/brands without blog coverage and queues `blog_draft` jobs that AI fills in for admin approval.

## Phase 7 — Monitoring & guardrails

17. Admin SEO dashboard:
    - Per-content SEO status, last generated, model, tokens, error.
    - Bulk regenerate by content_type / brand / date range.
    - Lighthouse + schema validation snapshot per URL (via PageSpeed Insights API).
18. Duplicate detector: nightly job flags content_hash collisions and queues rewrite jobs.
19. Cost dashboard: AI Gateway usage by content_type.

## Phase 8 — Future-ready

20. `lang` column on seo_metadata for future multilingual SEO.
21. `seo_metadata.version` lets us re-run the prompt globally when we improve it without losing history.
22. New entity types (auctions, training, talent jobs) drop in by adding a trigger + prompt template — no other code changes.

## Technical details

- **Models**: `google/gemini-3-flash-preview` default; fallback to `google/gemini-3.1-flash-lite` for cheap rewrites/dedupes; `google/gemini-3.1-pro-preview` for 800-1500 word rich descriptions on flagship robots only.
- **Secrets needed** (will request via add_secret when we reach Phase 3):
  - `GOOGLE_INDEXING_SERVICE_ACCOUNT_JSON`
  - `INDEXNOW_KEY` (also written to `public/<key>.txt`)
  - `BING_WEBMASTER_API_KEY` (optional)
  - `PAGESPEED_API_KEY` (optional, Phase 7)
- **Domain**: canonical base `https://www.robotverse.in` (per project memory).
- **No SSR**: react-helmet-async covers Google/Bing/ChatGPT (they execute JS); social-preview crawlers will see the sitewide `index.html` OG fallback. SSR/edge rendering is out of scope here; can be revisited as Phase 9 if needed.
- **Backward compatibility**: existing `useAutoSEO`, `UniversalSEOHead`, `src/utils/seo/*` keep working; the new pipeline writes into the format those utilities already consume.
- **Rollout**: ship Phase 1+2 first, backfill existing rows via one-time admin "Generate SEO for all" job, then enable Phase 3 indexing pings so we don't ping Google with empty metadata.

## Suggested build order (each is a separate message after you approve)

1. Phase 1 migration + frontend reads + fallback.
2. Phase 2 `seo-generator` + `seo-regenerate` + cron + dashboard buttons.
3. Phase 3 sitemap + robots + IndexNow + Google Indexing (needs secrets).
4. Phase 4 landing/category/brand expansion.
5. Phase 5 image SEO.
6. Phase 6 AEO/GEO render + blog suggester.
7. Phase 7 monitoring.

Approve the plan and I'll start with Phase 1.
