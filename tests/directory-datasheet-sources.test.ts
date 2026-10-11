import assert from "node:assert/strict";
import { DATASHEET_SOURCES, researchedUrls } from "../supabase/functions/_shared/datasheetSources";
import { isOfficialUrl } from "../supabase/functions/_shared/datasheetPolicy";

// Family prefixes match whole tokens only, and exact-model entries come first.
const saved = DATASHEET_SOURCES.ABB;
DATASHEET_SOURCES.ABB = [
  { match: "IRB 120", urls: ["https://library.e.abb.com/irb120.pdf"] },
  { match: "IRB 6700", urls: ["https://library.e.abb.com/irb6700.pdf"] },
  { match: "IRB 6700-200/2.60", urls: ["https://library.e.abb.com/irb6700-200.pdf"] },
];
const abb = (m: string) => researchedUrls({ id: "x", b: "ABB", m, n: `ABB ${m}` });
assert.deepEqual(abb("IRB 6700-200/2.60"), ["https://library.e.abb.com/irb6700-200.pdf", "https://library.e.abb.com/irb6700.pdf"]);
assert.deepEqual(abb("IRB 6700-150/3.20"), ["https://library.e.abb.com/irb6700.pdf"]);
assert.deepEqual(abb("IRB 1200-7/0.7"), [], "IRB 120 must not match IRB 1200");
assert.deepEqual(abb("IRB 120"), ["https://library.e.abb.com/irb120.pdf"]);
if (saved) DATASHEET_SOURCES.ABB = saved; else delete DATASHEET_SOURCES.ABB;

// Every researched link is on an approved manufacturer domain for its brand.
for (const [brand, sources] of Object.entries(DATASHEET_SOURCES))
  for (const source of sources)
    for (const url of source.urls) assert.ok(isOfficialUrl(url, brand), `${brand} ${source.match}: ${url} is not an approved domain`);
console.log(`researched datasheet sources: matching rules and ${Object.values(DATASHEET_SOURCES).flat().length} official sources passed`);
