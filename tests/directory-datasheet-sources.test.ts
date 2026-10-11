import assert from "node:assert/strict";
import { DATASHEET_SOURCES, researchedSources, researchedUrls } from "../supabase/functions/_shared/datasheetSources";
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
DATASHEET_SOURCES.ABB.push({ match: "CRB 15000", urls: ["https://library.e.abb.com/gofa.pdf"], trust: true });
assert.deepEqual(researchedSources({ id: "x", b: "ABB", m: "CRB 15000 GoFa 12", n: "" }), [{ url: "https://library.e.abb.com/gofa.pdf", trust: true, family: "CRB 15000" }]);
// Pattern sources (KUKA names carry no family) and product pages.
DATASHEET_SOURCES.ABB.push({ match: "large", urls: [], pattern: "^IRB 66\\d\\d", pages: ["https://new.abb.com/products/irb-66xx"] });
assert.deepEqual(researchedSources({ id: "x", b: "ABB", m: "IRB 6650S-125/3.5", n: "" }), [{ url: "https://new.abb.com/products/irb-66xx", trust: false, page: true }]);
assert.deepEqual(researchedSources({ id: "x", b: "ABB", m: "IRB 7600-150/3.5", n: "" }), []);
assert.ok(researchedSources({ id: "x", b: "Kawasaki", m: "RS007N", n: "" }).some((s) => s.page && s.url === "https://kawasakirobotics.com/products-robots/rs007n/"));
assert.equal(researchedSources({ id: "x", b: "INOVANCE", m: "IR-S10-60Z20S-INT", n: "" })[0].family, "IR-S10");
assert.equal(researchedUrls({ id: "x", b: "Universal Robots", m: "UR10e", n: "" })[0], "https://www.universal-robots.com/media/1807466/ur10e_e-series_datasheets_web.pdf");
assert.ok(researchedUrls({ id: "x", b: "Universal Robots", m: "UR10e", n: "" }).includes("https://www.universal-robots.com/manuals/EN/TechSheets/UR10e_techsheet_pdf_online/UR10e_techsheet_en.pdf"));
assert.ok(researchedSources({ id: "x", b: "Doosan Robotics", m: "M1013 White", n: "" }).some((s) => s.url === "https://www.doosanrobotics.com/en/product-solutions/product/m-series/m1013/"));
if (saved) DATASHEET_SOURCES.ABB = saved; else delete DATASHEET_SOURCES.ABB;

// Every researched link is on an approved manufacturer domain for its brand.
for (const [brand, sources] of Object.entries(DATASHEET_SOURCES))
  for (const source of sources)
    for (const url of [...source.urls, ...(source.pages ?? [])]) assert.ok(isOfficialUrl(url, brand), `${brand} ${source.match}: ${url} is not an approved domain`);
console.log(`researched datasheet sources: matching rules and ${Object.values(DATASHEET_SOURCES).flat().length} official sources passed`);
