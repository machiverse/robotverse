# RobotVerse SEO Audit — Phase 1

_Date: 2026-06-29_  
_Target market: India_  
_Domain: https://www.robotverse.in_

## 1. Executive snapshot

This audit combines third-party keyword visibility data, live-site inspection, and codebase review. Semrush metrics should be treated as directional rather than absolute, especially for a low-authority domain and low-volume long-tail industrial queries.

### India organic snapshot

| Metric                                            | Value                                                 |
| ------------------------------------------------- | ----------------------------------------------------- |
| Indexed organic keywords (Semrush India database) | 16                                                    |
| Estimated organic traffic                         | ~1 visit/month                                        |
| Indexed Google Ads keywords                       | 0                                                     |
| Best ranking keyword                              | `buy robot` — position 14                             |
| Other visible terms                               | `robots for sale`, `robot machine price`, `robobooks` |

### Reading

The domain appears to be early in Google’s organic discovery cycle. Current visible keywords skew toward broad or ambiguous robot terms rather than industrial B2B buying intent, which suggests RobotVerse is not yet strongly associated with brand-led, payload-led, or used-industrial-robot commercial searches.

### Strategic implication

The immediate SEO objective is not “rank for industrial robots” broadly. The realistic near-term goal is to build topical relevance and indexation around:

- brand + India,
- brand + model,
- used-brand,
- payload-band,
- application,
- and city + brand long-tail phrases.

## 2. Competitive picture

Semrush does not show a strong direct, high-overlap competitor set yet, which is common for a new or lightly indexed domain. However, the practical SERP competition in India is likely to come from:

- industrial aggregators,
- used-equipment listing sites,
- and brand or integrator pages with stronger trust signals.

### Strategic implication

RobotVerse should not try to beat broad marketplaces on generic head terms immediately. The better path is to win on specificity:

- brand + model,
- payload + application,
- city + brand,
- and high-intent used-robot pages.

## 3. On-page audit

### 3.1 `index.html` and sitewide fallback metadata

| Check                | Observation                                                                                | Priority |
| -------------------- | ------------------------------------------------------------------------------------------ | -------- |
| Title                | Generic marketplace wording before rewrite; now more aligned to India + industrial intent  | High     |
| Meta description     | Improved in the current PR; should emphasize relevance and click value over length targets | High     |
| Canonical            | Present                                                                                    | Medium   |
| Organization JSON-LD | Present                                                                                    | Medium   |
| og:image             | Uses logo image rather than a purpose-built social card                                    | Medium   |

### 3.2 Per-route metadata coverage

Metadata components are present across major public page types, which is a strong base:

- Home
- Robots listing
- Robot detail
- RoboBook
- AI Assistant
- Parts
- Services
- Financing
- Logistics
- Auctions
- Talent
- landing templates

Admin, auth, dashboard, CRM, and similar utility routes are appropriately excluded from public indexing.

### 3.3 Heading structure

Most major pages appear to use a single H1, which is the correct pattern. Robot detail pages currently use the robot name as H1; this is acceptable, but a more descriptive pattern with brand, model, and payload could improve keyword alignment if implemented safely.

### 3.4 Internal linking

Current internal linking is functional at the marketplace level:

- Home links into robots, parts, services, and landing pages.
- Robots listing links to robot detail and some category pages.

The main weakness is RoboBook:

- many articles do not contextually link into relevant commercial pages,
- blog authority is not being routed effectively into brand, payload, or application pages.

This is one of the highest-impact on-site improvements available without structural risk.

### 3.5 URL structure

Strengths:

- lowercase,
- readable landing-page paths,
- clean brand and city route patterns.

Weakness:

- robot detail URLs currently use UUID-based paths (`/robots/:id`), which are technically valid but weak for keyword signaling, memorability, and third-party attribution.

Recommendation:

- keep current URLs for now,
- plan a future slug migration only in a dedicated release with redirects and sitemap updates.

### 3.6 Canonicalization and duplicate URL groups

This is one of the most important unresolved technical SEO issues.

Potential duplicate or near-duplicate path groups include:

- `/robobook`
- `/community`
- `/blogs/:id`
- `/blog/:id`
- `/community/:id`
- `/robobook/:id`

If these pages expose the same or substantially similar content, canonical signals must be unified. Otherwise, Google may choose its own canonical, split crawl attention, or dilute ranking signals across duplicates.

Recommendation:

- choose one canonical article family,
- choose one canonical hub path,
- update canonicals, internal links, sitemap URLs, and navigation to match that decision consistently.

### 3.7 Sitemap and robots

Strengths:

- dynamic sitemap exists,
- robots.txt blocks non-public areas,
- crawl access is available to major search and AI crawlers.

Improvement areas:

- remove or replace stale static sitemap files if they no longer reflect production truth,
- ensure only canonical public URLs are emitted in the sitemap,
- ensure future proposed route families are not added before content quality thresholds are met.

### 3.8 Performance and Core Web Vitals quick wins

Observed opportunities:

- many images appear to lack explicit `width` and `height`,
- likely CLS risk from image layout instability,
- no clear LCP image preload strategy,
- favicon/social asset set appears incomplete for production polish,
- no visible modern image pipeline for user-uploaded assets.

These are not emergency blockers for indexing, but they matter for crawl efficiency, UX, and long-term competitive quality.

### 3.9 Mobile readiness

The responsive layout foundation appears sound. Key marketplace pages seem mobile-adapted, but this should still be validated with real-page Lighthouse or PageSpeed runs on:

- `/`
- `/robots`
- `/robobook`
- one robot detail page

## 4. Current ranking footprint

Current rankings suggest Google has only weak or early confidence in RobotVerse’s B2B industrial relevance. The domain is visible for a small set of broad or ambiguous robot terms, but it is not yet strongly associated with:

- used industrial robots India,
- FANUC / ABB / KUKA / Yaskawa + India,
- payload-led robot searches,
- application-led industrial robot searches.

This is the core relevance gap.

## 5. Main gaps and missed opportunities

### 5.1 Brand + India intent is not established

Brand landing pages exist or are planned, but search visibility for terms like:

- `fanuc robot india`
- `abb robot india`
- `kuka robot india`
- `yaskawa robot india`

is not yet materially visible in the current dataset.

### 5.2 Brand + model intent lacks dedicated SEO targets

There is no strong model-led route layer yet. That makes it harder to target searches such as:

- `fanuc m-20ia for sale`
- `abb irb 2600 used`
- `kuka kr 60 price india`

### 5.3 Payload and application pages are missing

Commercially valuable route families such as:

- `/robots/payload/:band`
- `/robots/application/:app`

are not yet live as indexable SEO targets.

### 5.4 RoboBook does not support marketplace discovery strongly enough

Educational content exists, but internal links into relevant product and landing pages are limited. This leaves topical relevance and link equity underused.

### 5.5 Duplicate path families may weaken indexing efficiency

Without a single canonical article family, blog-related signals can fragment across multiple route aliases.

### 5.6 Home page relevance needs reinforcement

If broad industrial-intent terms are being captured by blog posts rather than the homepage or core marketplace pages, that suggests the primary commercial pages need stronger topical clarity, internal links, and supporting copy.

## 6. Priority actions

### Safe wins now

- Strengthen homepage, robots, and RoboBook metadata.
- Improve robot detail metadata.
- Add contextual RoboBook links into brand, payload, and application pages.
- Clean up canonical strategy across blog/community/article aliases.
- Ensure sitemap outputs only preferred canonical URLs.

### Next structured SEO expansion

- Launch brand-used pages.
- Launch payload-band pages.
- Launch application pages.
- Add selective brand-model pages for top opportunities only.

### Later technical phase

- Migrate robot detail URLs from UUID to slug format with redirects.
- Improve image pipeline and layout stability.
- Standardize social preview assets.

## 7. Search Console actions

After deployment of SEO changes:

1. Submit the preferred sitemap in Google Search Console.
2. Use URL Inspection for a small set of priority URLs:
   - homepage,
   - `/robots`,
   - `/robobook`,
   - 2–3 brand pages,
   - 2–3 robot detail pages.
3. Request recrawl only for the most important updated URLs, not every page.
4. Monitor:
   - Page Indexing report,
   - canonical selection,
   - crawl status,
   - excluded pages,
   - and impressions for priority long-tail queries.
5. Re-check whether duplicate article paths are being indexed instead of preferred canonicals.

## 8. Summary

RobotVerse has a solid technical base for SEO, but the domain is still at the earliest stage of topical and commercial relevance in Google’s index. The fastest gains will come from:

- clearer keyword targeting,
- stronger canonical consolidation,
- better internal linking from RoboBook into marketplace pages,
- and controlled rollout of high-intent landing pages rather than broad route expansion.
