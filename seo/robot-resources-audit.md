# Additive industrial robotics SEO audit

Date: 2026-10-10. Site: https://www.robotverse.in.

This review covers repository evidence and the new resource implementation. It does not establish current Google rankings, Search Console coverage, production deployment or live listing availability. Historical visibility figures in `seo/seo-audit.md` should not be treated as current measurements.

## Existing foundation

The site already provides per-route metadata, robot and spare-part listings, brand/category/application landing pages, model specifications, visible FAQs, live sitemaps and optional build-time HTML snapshots. Adding more meta-keywords would not address the main discovery and content gaps; Google does not use the meta-keywords tag for ranking.

The checked catalogue contains 1,546 robot models across 98 robot manufacturers, plus 216 tool models and 107 external-axis models. The combined index contains 1,869 distinct model URLs across 130 manufacturer groups. No duplicate model paths or manufacturer navigation anchors were found.

## Additions and preservation

The new `/robot-guides` hub links to three explanatory guides and a complete model index:

- `/robot-guides/industrial-robots`: process selection, robot types, payload/reach, used equipment inspection and cell integration.
- `/robot-guides/robot-spare-parts`: part-number identification, motors/drives/reducers/encoders, controller/pendant/cable compatibility and replacement planning.
- `/robot-guides/robot-directory`: model variants, datasheets, specification interpretation, tooling/external axes and purchase verification.
- `/robot-guides/model-index`: manufacturer groups linking to every robot, tool and external-axis specification page in the current local catalogues.

The guides contain roughly 480–507 words each, with visible contextual links and FAQs. They do not promise inventory, prices, warranties, ratings or universal compatibility. Guide structured data describes only the visible page, breadcrumb and FAQ content; hub and index structured data describe their visible collections.

App changes add routes. `useCanonicalHead` adds a branch for only the new resource paths; the old route handling remains intact. Public footers add resource navigation. Because the main robot/parts listing and detail pages do not use that footer, those four pages also receive an additive resource section. Detail sections are inside successful content branches, below existing FAQs, and do not appear in their error/loading branches. Existing visible content and metadata are retained.

The separate build plugin `robotResourcesStatic.tsx` creates five resource HTML pages using the same React content as the browser, without a network dependency. Each page has both a directory index and a `.html` representation so clean URLs work with extension fallback as well as directory-index hosts. It creates `sitemap-robot-resources.xml` with the five new pages and all 1,869 model destinations. `robots.txt` gains the separate sitemap entry and retains all earlier directives and sitemap entries. For existing generated public HTML, the plugin appends no-JavaScript resource navigation and retains the existing head. Existing sitemap and live snapshot behavior remain separate.

No migrations, catalogue edits, dependency changes or database mutations form part of these additions.

## Destination review

All 29 links within the guides were checked against the local route classifier, documented application guide slugs and the actual spare-parts taxonomy. No private, retired or unsupported destination was found. Links cover the existing robot/parts/directory/service pages, buyer guidance, comparisons, Automation Studio, application pages and valid category/subcategory/component filters.

The index generates the existing `/directory/robot/:slug`, `/directory/tool/:slug` and `/directory/axis/:slug` routes from the catalogue names. All 1,869 paths are unique. Its manufacturer navigation anchors are also unique.

Some supported `/spares/...` filter pages deliberately receive `noindex,follow` from the existing `seo-render` function when no matching listing exists. These are valid browsing destinations, and linking to them does not guarantee their indexation or indicate stock. Their current inventory and HTTP responses were not probed in this audit.

## Existing findings preserved for a separate task

- `src/pages/Directory.tsx` declares a non-www canonical, while the shared canonical builder and snapshots use www. Multiple existing metadata writers can influence the final browser head; the new content does not add another writer to existing routes.
- `DirectoryModelPage.tsx` supplies client title/description/canonical metadata, while Product/FAQ/Breadcrumb data is available through `supabase/functions/seo-render/index.ts`. Its existing structured-data coverage therefore depends on the snapshot workflow.
- Parts brand/category landing pages use a three-listing client indexing threshold, while the existing sitemap includes groups with one listing. This can produce sitemap entries for pages that the client marks noindex.
- The existing `seoStatic.ts` workflow tolerates network failures and can skip some or all snapshots. A successful application build alone does not demonstrate full old-page HTML coverage. The new offline guide pages and model index do not replace that existing workflow.
- Some existing spare-parts FAQs assert default warranties or fulfillment conditions. New guides instead instruct users to verify individual seller terms.

## Review validation

- Scoped ESLint passed for the new content, resource components, resource page and additive canonical hook.
- Baseline comparison found no added ESLint diagnostics in the four existing robot/parts pages. Their existing diagnostics remain: 49 errors and six warnings across those files.
- Pure-helper checks verified all 29 guide destinations, 1,869 unique model URLs, 130 unique manufacturer anchors, route lookup and the three-node guide schema graph.
- Application and Vite configuration TypeScript checks passed. Production build passed and generated all five new resource pages plus the separate sitemap. The existing live snapshot service was unreachable during this build, so old page snapshots were skipped by its unchanged workflow.
- `tests/robot-resources.test.ts` passed: complete catalogue coverage, unique model URLs and manufacturer anchors, matching visible/schema FAQs, crawlable model links, 1,874 sitemap URLs, and exact preservation of the original HTML head when adding navigation.
- Chromium with JavaScript checked all five new routes: correct titles, exactly one canonical and robots tag, visible content, matching structured data, all 1,869 model links and no page errors. Existing `/robots`, `/parts`, `/directory` and an ABB CRB 1300 model retained the title, description and canonical from the pre-change builders. Guide schema was removed when navigating to an old page within the app.
- Chromium without JavaScript checked all five clean resource URLs through production preview: visible guide/FAQ content, correct metadata, the complete model index and 1,874 sitemap entries. Production snapshot-to-app navigation also removed the guide schema correctly.

Search engines decide whether and where to index and rank pages. These additions improve useful content and internal discovery; they cannot guarantee first-place results for every robot-related query. Current search performance needs production crawl checks and owner-accessible Search Console/Bing Webmaster reporting after publication.
