# RobotVerse Keyword Map — Phase 2

_Indian B2B industrial robotics marketplace. Every page targets one primary keyword and 2–4 secondary keywords. Because RobotVerse is still building authority, the focus should stay on lower-difficulty long-tail commercial queries first, while broader head terms remain medium-term targets._

_Additive rollout only in this phase: no URL migrations are shipped here. Existing pages remain live; new routes are proposed and prioritized for staged implementation._

## Strategy principles

- Prioritize **high-intent commercial queries** over broad informational head terms.
- Build indexable landing pages only where RobotVerse can provide **real value**: actual relevant listings, useful intro copy, FAQs, internal links, and a clear CTA.
- Avoid route explosion from faceted or near-faceted combinations; Google warns that excessive faceted URLs can slow discovery of important pages and waste crawl resources.[cite:60][cite:56]
- Treat brand, payload-band, and application pages as the first scalable SEO expansion. Delay highly granular combinations until the catalog and internal-link graph are stronger.[cite:52][cite:60]
- Canonical rules must be defined before launching overlapping page types, because Google may choose a different canonical than the preferred one if content overlap is too high or the signals are inconsistent.[cite:69][cite:68]

## Rollout priority

### Phase 2A — safe expansion

Launch or strengthen these first:

- `/`
- `/robots`
- `/robots/brand/:brand`
- `/robobook`
- `/buyer-guide`
- `/seller-guide`
- `/ai-assistant`

### Phase 2B — additive programmatic pages

Launch next, once templates and QA rules are ready:

- `/robots/:brand/used`
- `/robots/application/:app`
- `/robots/payload/:band`
- selective `/robots/:brand/:model` pages for top models only

### Later phases

Delay these until catalog depth, crawl efficiency, and internal linking are stronger:

- `/robots/reach/:mm`
- `/robots/city/:city/:brand`
- mass brand-model expansion across the full catalog
- UUID-to-slug migration for robot detail URLs

## Page-type map

| Page type            | URL pattern                                               | Primary keyword                                     | Secondary keywords                                                                              | Status                | Notes                                                                                            |
| -------------------- | --------------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------ |
| Home                 | `/`                                                       | industrial robot marketplace India                  | buy industrial robots India · used industrial robots India · robot trading platform India       | Existing              | Trust and breadth page; must link to brands, payload bands, applications, and RoboBook           |
| Robots listing       | `/robots`                                                 | used industrial robots for sale India               | buy industrial robot India · 6 axis robot India · refurbished industrial robot                  | Existing              | Main commercial hub; faceted UX is fine, but only selected SEO landing pages should be indexable |
| Robot detail         | `/robots/:id` _(future slug path later)_                  | `{Brand} {Model} {payload}kg used industrial robot` | `{Brand} {Model} for sale India` · `used {Brand} robot India` · `{robot_type} {payload}kg`      | Existing              | Current production path remains; future slug migration should be separate                        |
| Brand category       | `/robots/brand/:brand`                                    | `{Brand} industrial robot India`                    | `used {Brand} robot India` · `{Brand} robot price India` · `buy {Brand} robot India`            | Existing / priority   | Rich copy, FAQ, related models, and RoboBook links needed                                        |
| Brand + condition    | `/robots/:brand/used` _(proposed)_                        | `used {Brand} robot India`                          | `refurbished {Brand} robot` · `second hand {Brand} robot India` · `buy used {Brand} robot`      | Proposed / Phase 2B   | High-intent page with manageable overlap if canonical strategy is clear                          |
| Brand + model        | `/robots/:brand/:model` _(proposed)_                      | `{Brand} {Model} for sale India`                    | `{Brand} {Model} price India` · `{Brand} {Model} specifications` · `used {Brand} {Model}`       | Proposed / selective  | Launch only for top searched models with enough listings and unique copy                         |
| Payload band         | `/robots/payload/:band` _(proposed)_                      | `{band} payload industrial robot India`             | `{band} robot India` · `industrial robots by payload` · `used {band} payload robot`             | Proposed / Phase 2B   | Prefer bands over exact kg URLs in early rollout                                                 |
| Reach category       | `/robots/reach/:mm` _(proposed, experimental)_            | `{mm} mm reach industrial robot`                    | `{mm}mm reach robot India` · `industrial robot reach {mm}`                                      | Proposed / later      | Lower-priority and likely thinner; do not launch early                                           |
| Application          | `/robots/application/:app` _(proposed)_                   | `{application} robot India`                         | `{application} automation India` · `robots for {application}` · `used robots for {application}` | Proposed / Phase 2B   | Good fit for B2B intent, especially welding, pick-and-place, palletizing                         |
| Type / form-factor   | `/robots/type/:type` _(proposed)_                         | `{type} robot India`                                | `{type} robot price India` · `{type} robot for sale` · `used {type} robot India`                | Proposed / later      | Launch after brand and application templates are proven                                          |
| City + brand         | `/robots/city/:city/:brand` _(proposed, late-stage only)_ | `{Brand} robot dealer {city}`                       | `used {Brand} robot {city}` · `{Brand} robot service {city}`                                    | Proposed / late       | Only for cities with genuine supply, service, or logistics relevance                             |
| Spare parts brand    | `/parts/brand/:brand`                                     | `{Brand} robot spare parts India`                   | `{Brand} controller parts` · `{Brand} teach pendant India`                                      | Existing              | Keep tightly commercial; add brand FAQs and compatibility guidance                               |
| Spare parts category | `/parts/category/:cat`                                    | `{category} for industrial robots`                  | `{category} India` · `industrial robot {category}`                                              | Existing              | Good long-tail opportunity if category taxonomy is clean                                         |
| Services + city      | `/services/:city/:type`                                   | `{service type} services {city}`                    | `industrial robot {service} {city}` · `{Brand} robot {service} {city}`                          | Existing              | Best when city and service availability are real, not generic                                    |
| RoboBook hub         | `/robobook`                                               | industrial robotics guides India                    | robot buying guide India · industrial automation blog · used robot insights India               | Existing              | Educational hub; should feed commercial pages via internal links                                 |
| RoboBook article     | `/robobook/:slug`                                         | per article                                         | supporting long-tail variants                                                                   | Existing / ongoing    | One clear intent per article; avoid mixed-intent posts                                           |
| Pricing              | `/pricing`                                                | seller subscription industrial robot marketplace    | list robot for sale India · industrial robot listing platform                                   | Existing / if live    | Commercial page for sellers; keep concise and conversion-led                                     |
| Buyer guide          | `/buyer-guide`                                            | how to buy used industrial robot India              | used robot inspection checklist · used robot import duty India · buy FANUC robot India          | Proposed / high value | Strong TOFU-MOFU page with commercial assist intent                                              |
| Seller guide         | `/seller-guide`                                           | how to sell used industrial robot India             | sell FANUC robot India · sell ABB robot India · industrial robot resale India                   | Proposed / high value | Good for seller acquisition and trust building                                                   |
| AI Assistant         | `/ai-assistant`                                           | AI industrial robot recommender India               | find right industrial robot · robot specification comparison AI · industrial robot selector     | Existing              | Utility page that can target problem-solution search intent                                      |

## Brand coverage

Prioritize the following brand families for India-focused commercial visibility:

- FANUC
- ABB
- KUKA
- Yaskawa
- Kawasaki
- Mitsubishi
- Universal Robots
- Denso
- Stäubli
- Comau
- Nachi
- Epson

For each priority brand:

1. Ensure `/robots/brand/:brand` exists and is included in the sitemap.
2. Add a strong intro block that explains typical applications, payload ranges, common Indian buyer use cases, and why buyers search for that brand.
3. Launch `/robots/:brand/used` before mass-launching model pages.
4. Create model pages only for the top 5–10 models once catalog support and search demand justify them.
5. Publish at least one RoboBook article per major brand that links into the brand page and, later, its best model pages.

## Payload bands

Use payload **bands**, not exact-kg pages, for the first rollout.

Recommended route set:

- `/robots/payload/under-5-kg`
- `/robots/payload/5-10-kg`
- `/robots/payload/10-20-kg`
- `/robots/payload/20-50-kg`
- `/robots/payload/50-100-kg`
- `/robots/payload/100-kg-plus`

Each page should:

- explain the kinds of applications suited to that payload band,
- surface relevant robots from multiple brands,
- include FAQs,
- link to related application and brand pages,
- provide a “request sourcing help” CTA if inventory is thin.

## Application clusters

Recommended first application routes:

- `/robots/application/pick-and-place`
- `/robots/application/welding`
- `/robots/application/palletizing`
- `/robots/application/material-handling`
- `/robots/application/machine-tending`
- `/robots/application/assembly`
- `/robots/application/painting`
- `/robots/application/packaging`
- `/robots/application/inspection`

Priority order for early rollout:

1. pick-and-place
2. welding
3. palletizing
4. machine-tending
5. material-handling

These pages work best when they include:

- a plain-language explanation of the application,
- key robot selection criteria,
- recommended payload/type ranges,
- links to suitable brand and payload pages,
- and a CTA to request matching help.

## Indexability threshold

A proposed programmatic page should only be indexable when it meets a minimum usefulness threshold.

### Minimum threshold for indexable landing pages

A page should ideally have at least:

- 3–5 relevant listings, or a strong fallback experience if listings are sparse,
- unique intro copy tailored to the brand, payload band, or application,
- at least 2–4 meaningful internal links,
- a useful FAQ block,
- and a non-empty commercial CTA such as quote request, alert signup, or sourcing assistance.

### If the page is too thin

If a page does not yet meet the threshold:

- keep it out of the sitemap, or
- set it to `noindex`, or
- canonicalize it to the broader parent page if that is the cleaner user outcome.

Do not mass-index low-value combinations purely because the route exists.

## Canonical and overlap rules

Before launching overlapping route families, define the ranking target for each page type.

### Preferred positioning

- `/robots/brand/:brand` = broad brand-intent page
- `/robots/:brand/used` = used-brand commercial page
- `/robots/:brand/:model` = specific model-intent page
- `/robots/payload/:band` = payload-led discovery page
- `/robots/application/:app` = use-case intent page

### Guardrails

- Do not let multiple pages target the exact same phrase without distinct user value.
- Use self-referencing canonicals on pages intended to rank individually.
- If two routes serve nearly identical intent and inventory, consolidate rather than competing with yourself.
- Use Search Console URL Inspection to verify which URL Google actually selects as canonical after launch.[cite:69]

## Crawl-control notes

Google advises care with faceted navigation because excessive crawlable combinations can consume resources and slow discovery of more important pages.[cite:60][cite:56]

For RobotVerse, that means:

- keep route patterns consistent,
- avoid endless filter combinations,
- return proper not-found handling for empty states where appropriate,
- and resist launching too many route families at once.

The goal is a **curated set of indexable landing pages**, not exposing every possible filter combination to search engines.

## Migration and safety notes

- No URL changes are shipped in this phase.
- Existing `/robots/:id` pages remain the live product detail URLs.
- Brand, payload, and application pages are additive.
- A future migration from UUID detail URLs to slug-based URLs should be handled in a dedicated release with:
  - database slug support,
  - 301 redirects,
  - sitemap regeneration,
  - and Search Console monitoring.

## Content requirements for thin catalogs

Even when the catalog is sparse, proposed landing pages must still feel useful.

Each page should include:

- a custom intro paragraph,
- 3–5 bullet buying considerations,
- a small FAQ,
- related brand/application/payload links,
- and a fallback CTA such as:
  - request alerts,
  - request sourcing assistance,
  - ask the AI assistant,
  - or contact the team for matching help.

This ensures the page is still relevant and conversion-capable even before inventory depth is strong.

## Internal linking plan

### From the home page

Link to:

- top brand pages,
- top payload bands,
- top applications,
- RoboBook hub,
- buyer guide,
- seller guide.

### From `/robots`

Link to:

- brand pages,
- used-brand pages,
- payload bands,
- application pages,
- top robot details.

### From brand pages

Link to:

- used-brand page,
- top models,
- relevant applications,
- brand-specific RoboBook articles.

### From RoboBook articles

Link contextually to:

- relevant brand pages,
- payload pages,
- application pages,
- and matching robot detail pages where appropriate.

## Recommended first implementation set

Implement first:

1. `/robots/brand/:brand`
2. `/robots/:brand/used`
3. `/robots/application/pick-and-place`
4. `/robots/application/welding`
5. `/robots/application/palletizing`
6. `/robots/payload/under-5-kg`
7. `/robots/payload/5-10-kg`
8. `/robots/payload/10-20-kg`
9. `/buyer-guide`
10. `/seller-guide`

Delay until later:

- `/robots/reach/:mm`
- `/robots/city/:city/:brand`
- bulk `/robots/:brand/:model` generation
- UUID-to-slug migration

## Success criteria

This keyword-map phase is working if RobotVerse gains:

- stronger rankings for used industrial robot and brand-led India queries,
- more impressions on long-tail commercial searches,
- better internal-link paths from educational content to listing pages,
- and a scalable SEO structure without runaway crawl bloat or duplicate-page clusters.[cite:60][cite:56][cite:69]
