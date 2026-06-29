# RobotVerse SEO Audit — Phase 1

_Date: 2026-06-29 · Target market: India · Domain: https://www.robotverse.in_

## 1. Executive snapshot (Semrush, database `in`)

| Metric | Value |
|---|---|
| Indexed organic keywords (India) | 16 |
| Estimated organic traffic | ~1 visit/month |
| Indexed Adwords keywords | 0 |
| Best ranking keyword | "buy robot" — position 14 (vol 390/mo) |
| Other page-1-adjacent | "robots for sale" #21, "robot machine price" #15, "robobooks" #17 |

**Reading.** The domain is brand-new in Google's index. Almost every target keyword (`fanuc robot india`, `abb robot price india`, `used industrial robots india`, `industrial robot marketplace`) returns **no Semrush data** — meaning either ultra-low volume in India or no historical SERP coverage. The keywords that *do* track are generic ("buy robot", "robots for sale", "robot store"), so RobotVerse currently competes in the consumer/hobby robot space, not B2B industrial. That is the single biggest gap to close.

**Authority.** Semrush sees the project as a low-authority new site. With AS in the 0–20 band, realistic near-term targets are KDI < 30 long-tail brand+model and city+brand phrases — not head terms like "industrial robots".

## 2. Direct organic competitors (India)

Semrush surfaces no strong direct competitor (top relevance ≈ 0.36). The two true B2B threats showing up at all are:

- **galexonrobotics.in** — 43 keywords, 139 visits/mo. Used-robot dealer, ranks for brand+model terms.
- **robostore.com** — 33 keywords, 72 visits/mo. Robot-product directory.

Broader B2B aggregators (`tradeindia.com`, `exportersindia.com`, `aajjo.com`) dominate "industrial robot India" SERPs. **Strategy implication:** beat aggregators on *specificity* — brand+model+payload+city pages they can't match with generic listings.

## 3. On-page audit

### 3.1 `index.html` (sitewide head)
| Check | Before | After (this PR) |
|---|---|---|
| Title | "RobotVerse - Advanced Industrial Robots Marketplace \| Buy, Sell & Service" (no India, no brands) | "Used Industrial Robots India \| Buy FANUC, ABB, KUKA, Yaskawa \| RobotVerse" |
| Meta description | Generic worldwide pitch | India + brands + 6-axis/SCARA/cobots + payload/reach |
| Canonical | ✅ `https://robotverse.in` | unchanged |
| Organization JSON-LD | ✅ present | unchanged |
| og:image | `/robotverse-logo.png` (logo, not a social card) | unchanged — see implementation notes |

### 3.2 Per-route head (`react-helmet` / `UniversalSEOHead` / `SEOHead`)
- `/` Home — ✅ `UniversalSEOHead` with India keywords & schemas.
- `/robots` — ✅ `UniversalSEOHead` `pageType="robots"`. H1 present.
- `/robots/:id` (RobotDetails) — ✅ `SEOHead` + Product JSON-LD. **Title rewritten in this PR** to include "Used", payload, "for sale in India".
- `/robobook` — ✅ `SEOMetaTags` with structured data + BreadcrumbList.
- `/ai-assistant` — ✅ `UniversalSEOHead`.
- `/parts`, `/services`, `/logistics`, `/financing`, `/auctions`, `/robot-talent`, brand/city landing pages — heads in place via `UniversalSEOHead` / page templates.
- `/auth`, `/dashboard/*`, `/crm`, `/chat`, `/profile-settings` — correctly **disallowed in robots.txt** (no indexable head needed).

### 3.3 Headings
- Single H1 per page on Home, Robots, RoboBook, AI Assistant, landing templates — ✅.
- RobotDetails H1 = robot name. Acceptable; consider `{Brand} {Model} — {payload}kg Industrial Robot` for keyword density (see implementation notes).

### 3.4 Internal linking
- Home → `/robots`, `/parts`, `/services`, brand landing pages via `MarketplaceCategories` / `ProfessionalCategories`.
- `/robots` → robot detail pages, brand pages.
- RoboBook articles → mostly orphaned from marketplace. **Gap:** no contextual links from blog content into `/robots/brand/:brand` or `/robots/category/:cat`. Highest-impact unfixed gap.
- Footer covers utility pages.

### 3.5 URL structure
- Marketplace: `/robots/:id` uses **UUIDs** (`/robots/65d376d1-...`). Loses keyword signal in the URL and in Semrush rank attribution. Migration to `/robots/{brand}-{model}-{payload}kg-{shortId}` recommended (additive, with redirect from UUID) — covered as a future phase, not in this PR.
- Programmatic: `/robots/brand/:brand`, `/robots/city/:city` — ✅ clean.
- Spares: `/spares/:category/:subcategory/:componentType` — ✅ clean.
- Lowercase, hyphenated — ✅.

### 3.6 Canonical & duplicates
- `/robots` filter params (`sortBy`, `viewMode`, `page`) are blocked in `robots.txt`. ✅
- `/robobook` and `/community` render the same `Blogs` component — canonical should pin one. Currently each uses `window.location.href`; this can split equity. Recommendation in implementation notes: canonical `/community/*` → `/robobook/*`.
- `/blogs/:id`, `/blog/:id`, `/community/:id`, `/robobook/:id` all map to similar content — same canonical caveat.

### 3.7 Sitemap & robots
- Dynamic sitemap edge function serving urls/images/news. ✅
- `public/sitemap.xml` static file still ships; harmless but stale.
- `robots.txt` allows the big AI crawlers (GPTBot, PerplexityBot, ClaudeBot, Google-Extended), blocks dashboards. ✅

### 3.8 Core Web Vitals — quick wins
- Hero & robot images: no explicit `width`/`height` on most `<img>` — CLS risk.
- LCP image not preloaded in `index.html`.
- Favicon = full logo PNG (heavy, no proper 32×32 / 16×16 / apple-touch sizes).
- No `vite-imagetools` / WebP/AVIF pipeline for user-uploaded images.

### 3.9 Mobile friendliness
- Tailwind responsive — generally fine. Spot-check on `/robots` shows the filter sidebar collapsing correctly; product cards use aspect-square per design memory.

## 4. Top 10 keywords currently ranking (India)

| Keyword | Vol | Pos | URL |
|---|---|---|---|
| buy robot | 390 | 14 | / |
| robobooks | 590 | 17 | /robobook |
| robots for sale | 210 | 21 | / |
| robot machine price | 140 | 15 | /robots |
| robotic equipment | 170 | 50 | / |
| robot store | 320 | 57 | / |
| in robot | 110 | 69 | /robobook |
| industrial robot | 590 | 64 | /blogs/... |
| robot work envelope | 140 | 63 | /robobook |
| robot machine | 1,600 | 41 | /robots/... |

## 5. Gaps & missed opportunities

1. **Brand + India queries** (`fanuc robot india`, `abb robot india`, `kuka robot india`, `yaskawa robot india`) — **not ranking at all**. Brand landing pages exist (`/robots/brand/:brand`) but aren't indexed yet; need internal links + sitemap inclusion + content depth.
2. **Brand + model queries** (`fanuc m-20ia for sale`, `abb irb 2600 used`) — no dedicated URL exists per model. Either generate `/robots/:brand/:model` or rewrite `/robots/:id` to a model-slug URL.
3. **Payload / reach queries** (`20 kg payload industrial robot`, `6 axis robot 1.8m reach`) — no category page exists. Build `/robots/payload/:kg` and `/robots/reach/:mm`.
4. **Application queries** (`pick and place robot india` — vol 20, KDI very easy) — no `/robots/application/:app` page.
5. **City + brand combos** (`fanuc robot pune`, `abb robot chennai`) — only generic `/robots/city/:city` exists.
6. **RoboBook → marketplace internal links** — articles do not deep-link to brand/payload pages, leaving long-tail equity stranded.
7. **`industrial robot` (590/mo, pos 64)** ranks via a blog post URL, not `/`. Either redirect or strengthen the home page H1 around the term.

See `keyword-map.md` for the proposed keyword → URL plan and `implementation-notes.md` for the safe edits already shipped in this PR plus the next-step plan.
