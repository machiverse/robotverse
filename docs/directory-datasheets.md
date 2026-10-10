# Official robot datasheets

The robot directory has 1,546 models across 98 brands. Each model page and directory detail dialog offers a **Datasheet (PDF)** button. Verified links open the manufacturer's PDF in a new tab. PDF files are not copied or embedded; this also avoids manufacturer iframe restrictions.

## Datasheet files and discovery

No database migrations, new tables, or writes to existing application tables are needed. Datasheet metadata and progress are saved only under `directory/datasheets/verified-v2/` in the existing `robot-images` storage bucket. Existing datasheet JSON files, robot records, and other storage files are preserved.

Each model has a separate result JSON file containing its verified URL, brand, model, source, check time, and outcome. Parallel visitor lookups write independent files. The collection worker builds a separate index for fast direct links; results discovered individually are remembered in the current page and included in the index when collection processes that model. Collection progress and duplicate-batch claims are also datasheet JSON files. Resume is best-effort storage-based progress, without database transactions or SQL functions.

Only HTTPS URLs on reviewed manufacturer domains are accepted. Downloads and their redirects must stay on those domains. The PDF signature and extracted document text are checked; the requested complete model must appear. Brochures covering multiple models are acceptable when they name the requested model. Files stay on manufacturer websites and open in a new tab; only links and verification metadata are stored.

Downloads are limited to 12 MB and text inspection to 50 pages. Network discovery has a 110-second deadline, with a maximum 12 seconds per request including its body. Scanned PDFs without readable model text, oversized documents, and unapproved CDN hosts are not automatically accepted. Found results expire after 30 days, negative results after 21 days, and transient errors after 60 seconds. Network failures offer retry.

## Activate and collect

The migration and database test from the earlier implementation were removed before deployment. No remote database changes were made.

Supabase health is reachable, but the deployed datasheet function returns HTTP 404. After network-domain additions were saved, the live catalogue and a representative manufacturer website became reachable (HTTP 200). Full manufacturer coverage is not yet validated. Required catalogue, search-provider, and reviewed manufacturer domains are saved in the environment draft. The secure SUPABASE_ACCESS_TOKEN requirement and api.supabase.com destination are also saved for deployment; no token value is injected yet. Review and save the draft in environment settings, enter the token securely, and publish the environment. Draft persistence alone does not prove publication or credential availability.

With authorized Supabase deployment access, deploy only this function and the frontend:

```sh
supabase functions deploy directory-datasheet --project-ref cmahwgetrqczytnijbuk
npm run build
```

Do not run database migrations or `supabase db push` for this feature. Credentials must be configured securely, never included in chat or tracked files. The edge function uses Supabase's existing injected service-role variables to write datasheet files. `PUBLIC_SITE_URL` defaults to `https://www.robotverse.in`, which must serve `/directory/*.json`.

Sign in as an admin, visit `/admin/directory-photos`, and click **Find all** for robots. Every catalogue model receives an outcome: verified PDF, not found, manufacturer review needed, or lookup error. Use **Resume** for interrupted collection or **Search again** for refresh. Validate saved links by opening their model pages and checking the model inside each document. Completing a sweep does not imply every model has a publicly available PDF.

Both the checkout and live catalogue contain 1,546 robot records. The user selected all robots in this checkout; this is the collection target. Do not add invented records to reach 1,576 or report unchecked models as verified.

## Remaining manufacturer coverage

Approved domains currently cover 1,371 robot models. The following 34 brands account for the remaining 175 models. They are recorded as `unsupported` until their current official domains are researched and added; no reseller or guessed PDF is attached:

Agilebot, AUCTECH, autonox Robotics, BORUNTE, Chiehey, cpcRobot, CPR, CROBOTP, CRS, ESI, Foxbot, GMF, GSK, HSR, Huayan Han's, IIMT, Inovo Robotics, LBBBD, Leantec, Ligent, MCI, MIP Robotics, NEWKer, Peitian, PULOON, PUMA, QJAR, RealMan, Robotphoenix, RRRobotica, Servotronix, TANGCHENG, Toney, Turin.

Add reviewed manufacturer domains in `supabase/functions/_shared/datasheetPolicy.ts`, redeploy the function and frontend, then rerun collection. Newly supported brands bypass an earlier `unsupported` cache result. Approved-domain coverage is not a count of retrieved PDFs; live collection determines availability. Not every discontinued robot has a publicly available datasheet.

## Validation

From the repository root, with Bun and Deno installed:

```sh
for file in tests/*.test.ts; do bun run "$file" || exit; done
deno check --node-modules-dir=none --no-config --no-lock supabase/functions/directory-datasheet/index.ts
deno test --allow-read --allow-env --node-modules-dir=none --no-config --no-lock supabase/functions/directory-datasheet/pdf_test.ts
npm run build
```

Storage tests verify that writes stay inside the new datasheet prefix, independent concurrent results survive, and legacy files remain unchanged. PDF tests parse generated valid PDFs and reject sibling models and invalid documents. Discovery tests mock network responses to exercise host boundaries, unsafe redirects, HTML masquerading as PDF, manufacturer page links, and error outcomes. Browser validation uses mocked Supabase responses to verify first-click PDF navigation, saved direct links, retries, and manufacturer-search fallback; it does not establish live backend availability.
