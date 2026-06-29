# RobotVerse SEO — Implementation Notes (Phase 3, safe wins)

This PR is intentionally narrow: document the broader SEO plan, but ship only safe, non-structural on-page changes. It does not modify routes, URLs, canonical strategy, data models, or business logic.

## Scope of this PR

### Included

- Sitewide homepage metadata refresh in `index.html`
- Robot detail page metadata improvements in `src/pages/RobotDetails.tsx`
- SEO planning documents under `/seo/`

### Excluded

- URL or route changes
- Canonical consolidation across duplicate content paths
- New landing-page templates
- Internal-linking systems
- Performance refactors
- Database or sitemap architecture changes

## Changes shipped

### 1. `index.html` — sitewide fallback metadata refresh

Updated the default document-level metadata used when route-level SEO tags are absent or before client-side rendering takes over.

#### Updated fields

- `<title>` now targets the primary marketplace intent for India-focused industrial robot searches.
- `<meta name="description">` now summarizes brand coverage, robot categories, and buyer trust signals.
- `<meta name="keywords">` was rewritten for internal consistency, even though it is not relied on as a primary Google ranking signal.
- `og:title` and `og:description` were aligned with the revised homepage positioning so social crawlers receive stronger default preview text.

#### Why this helps

- Improves default metadata quality for homepage discovery and branded/social sharing.
- Aligns the homepage snippet with commercial search intent such as used industrial robots, brand-led searches, and India-focused B2B demand.
- Keeps route-level SEO components free to override these defaults where more specific metadata exists.

#### Guardrails

- This PR does not assume exact title or description length guarantees in Google search results.
- The priority is relevance, clarity, uniqueness, and early keyword placement, not strict character-count targeting.

### 2. `src/pages/RobotDetails.tsx` — product metadata rewrite

Updated `<SEOHead>` inputs so robot detail pages produce stronger product-specific titles, descriptions, and keywords.

#### Title pattern

- Template now emphasizes:
  - condition where relevant,
  - brand,
  - model,
  - payload,
  - industrial robot intent,
  - India sales intent,
  - RobotVerse branding.

Example pattern:
`Used {Brand} {Model} {Payload} Industrial Robot for Sale in India | RobotVerse`

If `condition === 'new'`, the “Used” prefix is removed.

#### Description pattern

Descriptions now combine the most commercially useful fields available on the page, including:

- brand
- model
- payload
- reach
- robot type
- location
- commercial CTAs such as quote, inspection, financing, and logistics

#### Keywords pattern

Keyword generation now prioritizes:

- brand + India
- brand + model
- used-brand intent where applicable
- robot type
- payload-led phrases
- generic industrial robot marketplace terms for India

#### Schema status

- Product JSON-LD was not reworked in this PR.
- Existing `generateProductSchema` logic was retained because it already covers core `Product` fields such as `name`, `brand`, `offers`, and `itemCondition`.

#### Why this helps

- Makes each robot detail page more specific to long-tail buyer searches.
- Improves metadata uniqueness across product pages.
- Reinforces structured product context for search engines through the existing JSON-LD layer.

### 3. `/seo/` markdown deliverables

Added planning and audit documents to keep strategic SEO work separate from this low-risk implementation pass.

#### Files added

- `/seo/seo-audit.md` — Phase 1 findings, including ranking and on-page issues
- `/seo/keyword-map.md` — Phase 2 keyword-to-page strategy and proposed route ideas
- `/seo/implementation-notes.md` — implementation summary for this PR
- `/seo/robobook-outlines.md` — article outlines with heading structure and linking guidance

#### Why this helps

- Preserves decision context for future SEO phases.
- Lets larger route/content changes be reviewed before implementation.
- Reduces the risk of mixing strategy work with production code changes in the same PR.

## Explicitly deferred

| Area                                                                                | Why deferred                                                    | Recommended next step                                        |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------ |
| Robot detail slugs                                                                  | Requires DB, redirect, sitemap, and Search Console coordination | Add slug support and redirect plan in a dedicated PR         |
| New brand/payload/application routes                                                | Requires templates, routing, content, and canonical planning    | Implement as a separate programmatic SEO phase               |
| Canonical consolidation across `/robobook`, `/community`, `/blogs`, `/blog` aliases | Requires a single content-source decision                       | Choose one canonical path family and enforce it consistently |
| Large internal-linking blocks                                                       | Needs editorial logic and reusable components                   | Build reusable related-links/related-robots components       |
| Performance work                                                                    | Broader frontend QA required                                    | Run dedicated performance pass with image and bundle review  |
| Global image dimension cleanup                                                      | Wide component impact                                           | Standardize intrinsic image metadata and rendering rules     |

## Impact tracking

1. Re-run the Lovable SEO scan after deployment.
2. Check Google Search Console for:
   - indexed page changes,
   - title/snippet rewrites,
   - CTR changes on homepage and robot detail pages,
   - impressions for brand, payload, and “used industrial robots India” queries.
3. Re-run Semrush in a few weeks to compare ranking movement on the target commercial terms.
4. Re-submit the production sitemap in Search Console after deployment if needed.

## Notes for the next phase

- Keep production SEO signals on `https://www.robotverse.in`, not the Lovable preview domain.
- Verify `condition` values in the data layer before relying on title-prefix logic for “new” vs. “used”.
- Do not add a placeholder OG image; only enable one when a proper 1200×630 social card exists.
- Route, canonical, and sitemap changes should be grouped into a dedicated follow-up PR with QA and rollback planning.
