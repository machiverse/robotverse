# RobotVerse SEO — Implementation Notes (Phase 3, safe wins)

This PR is intentionally narrow: **document everything; ship only safe, non-structural code changes**. No URL changes, no routing changes, no business-logic edits.

## Changes shipped in this PR

### 1. `index.html` — sitewide head rewrite
- **Title** now leads with the primary commercial intent: `Used Industrial Robots India | Buy FANUC, ABB, KUKA, Yaskawa | RobotVerse` (66 chars — within Google's pixel budget on desktop, may truncate on mobile but the brand fallback is on the right side, so the keyword load is preserved).
- **Meta description** rewritten to include India, the four anchor brands, form factors (6-axis, SCARA, cobots), and conversion levers (verified sellers, spare parts, financing, logistics). 232 chars — within the typical 230–280 visible range.
- **Keywords meta** rewritten for India + brand + form-factor coverage. (Google ignores `<meta keywords>`, but Bing and several internal scoring tools still use it; keeping it accurate is free.)
- **og:title / og:description** mirrored so social-preview crawlers (LinkedIn, Slack, Facebook — which don't execute JS) see the new copy. Per the `head-meta` guidance, per-route Helmet/SEOHead tags still override these for JS-executing crawlers like Googlebot.

### 2. `src/pages/RobotDetails.tsx` — Product page title/description
Rewrote the `<SEOHead>` props so each robot detail page reads:

- **Title:** `Used FANUC M-20iA 20kg Payload Industrial Robot for Sale in India | RobotVerse` (template; "Used" suppressed when `condition === 'new'`).
- **Description:** brand + model + payload + reach + type + location + conversion CTAs (quotation, inspection, financing, logistics).
- **Keywords:** brand-India, brand+model, used brand, type, payload-kg payload, generic India fallbacks.
- **Product JSON-LD** unchanged — `generateProductSchema` already covers `name`, `brand`, `offers`, `itemCondition`, etc.

### 3. Markdown deliverables under `/seo/`
- `seo-audit.md` — Phase 1 audit (Semrush data + on-page review + gap list).
- `keyword-map.md` — Phase 2 keyword → URL map with proposed (not implemented) new routes.
- `implementation-notes.md` — this file.
- `robobook-outlines.md` — Phase 4 article outlines.

## Deliberately NOT changed in this PR

| Area | Why deferred | Recommended next step |
|---|---|---|
| Robot detail URLs (`/robots/:uuid`) | Changing URLs needs DB slug column + 301 from UUID + sitemap regen + Search Console resubmission. Trade-off: short-term ranking dip during the swap. | Add `slug` column to `robots` table, populate `{brand}-{model}-{payloadkg}-{shortId}`, route `/robots/:slug`, redirect from `/robots/:uuid`. |
| `/robots/:brand/used`, `/robots/payload/:kg`, `/robots/application/:app` | New routes need React Router entries, page templates, sitemap registration, and content. Out of scope for "safe wins only". | Reuse `LandingPageLayout`; query `robots` with filters; add to dynamic sitemap edge function (`sitemap?kind=urls`). |
| Canonical for duplicate pairs (`/robobook` vs `/community`, `/robobook/:id` vs `/community/:id` vs `/blogs/:id` vs `/blog/:id`) | Requires deciding which is canonical and adding `<link rel="canonical">` to the non-canonical side. Should be a single coordinated PR. | Decide canonical = `/robobook` and `/robobook/:id`; in `Blogs.tsx` and `CommunityPostDetails.tsx`, force canonical to `/robobook…` regardless of which alias the user landed on. |
| Performance: image pipeline, LCP preload, favicon sizing | Non-trivial Vite config work. | Add `vite-imagetools`, generate WebP/AVIF, preload `<link rel="preload">` for hero image, ship sized favicon set (16, 32, 180, 192, 512). |
| `<img>` explicit `width`/`height` to remove CLS | Sweeping change across many components. | Audit `ResponsiveImage` to enforce intrinsic dimensions from DB metadata. |
| RoboBook → marketplace internal linking | Needs an editorial pass + a component (e.g. `<RelatedRobots brand="FANUC" payload="20kg" />`) editors can drop into MDX. | Build the component, retrofit top 10 articles. |
| `/robots/:id` H1 ("robot.name") rewriting to brand-model-payload format | Cosmetic on the page; SEO benefit small relative to risk of UI breakage. | One-line change once visual QA is approved. |

## Tracking the impact

1. Trigger an SEO rescan in the Lovable SEO tab a few days after merge.
2. Re-run `semrush--domain_analysis` for `robotverse.in` in DB `in` in ~4 weeks. Expect movement on `used industrial robots`, `industrial robot marketplace`, and brand+India tail.
3. Submit the updated sitemap (`https://cmahwgetrqczytnijbuk.supabase.co/functions/v1/sitemap`) in Google Search Console.

## Reminders for whoever picks up Phase 4+

- The project domain in `head-meta` knowledge is `robot-verse.lovable.app`, but the live production canonical is **`https://www.robotverse.in`**. Keep canonical and `og:url` on the production domain — already correct in `index.html`, and per-route SEO components resolve to it via `window.location.origin` on prod.
- Robot detail pages with `condition === 'new'` get a different title prefix than used. Verify the DB enum values match the lower-case `'new'` check.
- Don't reintroduce a placeholder OG image — the `head-meta` knowledge file says a missing OG is better than a logo-as-OG. Generate a proper 1200×630 social card before re-enabling.
