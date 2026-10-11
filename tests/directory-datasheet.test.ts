import assert from "node:assert/strict";
import { candidateScore, hasPdfSignature, isOfficialUrl, isStoredDatasheet, matchesModel } from "../supabase/functions/_shared/datasheetPolicy";
import { directCandidates, discoverDatasheet, familySlug, sitemapFamilyPages, sitemapProductPages, parseSearchResults, productPdfLinks, unwrapResultLink, verifyOfficialPdf } from "../supabase/functions/_shared/datasheetDiscovery";

const model = { id: "RVRobot1517", b: "Universal Robots", m: "UR10e", n: "Universal Robots UR10e" };
const candidate = { url: "https://www.universal-robots.com/download/UR10e-datasheet.pdf", title: "UR10e datasheet", source: "manufacturer-page" };
assert.ok(isOfficialUrl(candidate.url, model.b));
assert.ok(isOfficialUrl("https://library.e.abb.com/data.pdf", "ABB"));
for (const url of ["https://evilabb.com/IRB120.pdf", "https://abb.com.evil.test/IRB120.pdf", "http://abb.com/IRB120.pdf", "https://user:password@abb.com/IRB120.pdf", "https://abb.com:8443/IRB120.pdf", "javascript:alert(1)"]) {
  assert.equal(isOfficialUrl(url, "ABB"), false, url);
}
assert.ok(matchesModel("UR-10e datasheet", "UR10e"));
assert.ok(matchesModel("IRB_120_datasheet.pdf", "IRB 120"));
assert.equal(matchesModel("UR10e datasheet", "UR10"), false);
assert.equal(matchesModel("IRB 1200 brochure", "IRB 120"), false);
assert.equal(matchesModel("M-20iD/35", "M-20iD/25"), false);
assert.equal(candidateScore({ ...candidate, url: "https://reseller.test/UR10e.pdf" }, model), -1);
assert.equal(candidateScore({ ...candidate, title: "UR10e maintenance manual" }, model), -1);
assert.equal(candidateScore({ ...candidate, url: "https://www.universal-robots.com/UR20.pdf", title: "UR20 datasheet" }, model), -1);
assert.ok(isStoredDatasheet("https://cmahwgetrqczytnijbuk.supabase.co/storage/v1/object/public/robot-images/directory/datasheets/verified-v2/pdf/robots/RVRobot0558.pdf"));
assert.equal(isStoredDatasheet("https://evil.test/storage/v1/object/public/robot-images/directory/datasheets/verified-v2/pdf/robots/x.pdf"), false);
assert.equal(isStoredDatasheet("https://cmahwgetrqczytnijbuk.supabase.co/storage/v1/object/public/robot-images/other.pdf"), false);
assert.ok(hasPdfSignature(new TextEncoder().encode("%PDF-1.7\n")));
assert.equal(hasPdfSignature(new TextEncoder().encode("<html>not a pdf")), false);

const links = productPdfLinks('<title>UR10e robot</title><a href="/downloads/data.pdf">Technical data</a><a href="https://reseller.test/UR10e.pdf">Datasheet</a><a href="/manual.pdf">Operating manual</a>', "https://www.universal-robots.com/products/ur10e/", model);
assert.equal(links.length, 1);
assert.equal(links[0].url, "https://www.universal-robots.com/downloads/data.pdf");
assert.equal(productPdfLinks('<title>All robots</title><a href="/downloads/data.pdf">Technical data</a>', candidate.url, model).length, 0);
const results = parseSearchResults('<a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fwww.universal-robots.com%2FUR10e.pdf">UR10e datasheet</a>', "duckduckgo");
assert.equal(results[0].url, "https://www.universal-robots.com/UR10e.pdf");
const bingWrapped = `https://www.bing.com/ck/a?!&&p=abc&u=a1${btoa("https://www.universal-robots.com/UR10e.pdf").replace(/=+$/, "")}&ntb=1`;
const bingResults = parseSearchResults(`<li class="b_algo"><h2><a href="${bingWrapped.replace(/&/g, "&amp;")}">UR10e datasheet</a></h2></li>`, "bing");
assert.equal(bingResults[0].url, "https://www.universal-robots.com/UR10e.pdf");
// Bing wraps its own relative links too; they must not break the page's other results.
const bingInternal = `https://www.bing.com/ck/a?!&&u=a1${btoa("/images/search?q=UR10e").replace(/=+$/, "")}`;
assert.equal(parseSearchResults(`<a href="${bingInternal}">Images</a><a href="${bingWrapped}">UR10e datasheet</a>`, "bing").length, 1);
assert.equal(unwrapResultLink("https://r.search.yahoo.com/_ylt=A0/RV=2/RE=1/RO=10/RU=https%3a%2f%2fwww.kuka.com%2fkr6.pdf/RK=2/RS=x-"), "https://www.kuka.com/kr6.pdf");
assert.equal(directCandidates({ id: "x", b: "Fanuc", m: "M-20iD/25", n: "" })[0].url, "https://www.fanucamerica.com/uploads/files/data-sheets/m-20id-25-datasheet.pdf");
assert.equal(directCandidates(model).length, 0);
const gp25 = { id: "RVRobot1434", b: "Yaskawa Motoman", m: "GP25", n: "Yaskawa Motoman GP25" };
assert.deepEqual(sitemapProductPages([
  "https://www.motoman.com/en-us/products/robots/industrial/assembly-handling/gp-series/gp250",
  "https://www.motoman.com/en-us/products/robots/industrial/assembly-handling/gp-series/gp25-12",
  "https://www.motoman.com/en-us/products/robots/used/hs-277-demo-gp25",
  "https://www.motoman.com/en-us/products/robots/industrial/assembly-handling/gp-series/gp25",
], gp25), ["https://www.motoman.com/en-us/products/robots/industrial/assembly-handling/gp-series/gp25"]);
const motomanLinks = productPdfLinks('<h1>GP25</h1><a href="/getdoc/x/Sales-Quote.aspx?model=GP25">Quote</a><a href="/getmedia/ee92/GP25.pdf.aspx">Spec Sheet</a>', "https://www.motoman.com/en-us/products/gp25", gp25);
assert.deepEqual(motomanLinks.map((link) => link.url), ["https://www.motoman.com/getmedia/ee92/GP25.pdf.aspx"]);
assert.equal(familySlug("IRB 6700-200/2.60"), "irb-6700");
assert.equal(familySlug("KR 210 R2700-2"), "kr-210-r2700");
assert.equal(familySlug("GP25"), null);
const irb = { id: "RVRobot0087", b: "ABB", m: "IRB 6700-200/2.60", n: "ABB IRB 6700-200/2.60" };
assert.deepEqual(sitemapFamilyPages(["https://new.abb.com/products/robotics/robots/articulated-robots/irb-6700", "https://new.abb.com/products/robotics/robots/articulated-robots/irb-6700-inverted"], irb),
  ["https://new.abb.com/products/robotics/robots/articulated-robots/irb-6700"]);
const familyLinks = productPdfLinks('<h1>IRB 6700</h1><a href="https://library.e.abb.com/public/a26/IRB_6700_EN.pdf">Data sheet</a><a href="https://library.e.abb.com/public/b1/IRB6700_manual.pdf">Product manual</a>', "https://new.abb.com/products/irb-6700", irb, true);
assert.deepEqual(familyLinks.map((link) => link.source), ["manufacturer-family"]);
assert.equal(productPdfLinks('<a href="https://library.e.abb.com/public/a26/IRB_6700_EN.pdf">Data sheet</a>', "https://new.abb.com/products/irb-6700", irb).length, 0, "exact-model pages stay strict");
const rss = parseSearchResults("<rss><channel><item><title>UR10e datasheet</title><link>https://www.universal-robots.com/UR10e.pdf</link></item></channel></rss>", "bingrss");
assert.equal(rss[0].url, "https://www.universal-robots.com/UR10e.pdf");

const originalFetch = globalThis.fetch;
const verifyModel = async () => true;
try {
  globalThis.fetch = (async () => new Response("%PDF-1.7\n", { headers: { "Content-Type": "application/octet-stream" } })) as typeof fetch;
  assert.equal((await verifyOfficialPdf(candidate, model, verifyModel))?.status, "found");
  assert.equal(await verifyOfficialPdf(candidate, model, async () => false), null, "A PDF for a different model must be rejected");
  // The Content-Type alone must never make an HTML error page pass verification.
  globalThis.fetch = (async () => new Response("<html>error</html>", { headers: { "Content-Type": "application/pdf" } })) as typeof fetch;
  assert.equal(await verifyOfficialPdf(candidate, model, verifyModel), null);
  let calls = 0;
  globalThis.fetch = (async () => {
    calls++;
    return new Response(null, { status: 302, headers: { Location: "https://reseller.test/UR10e.pdf" } });
  }) as typeof fetch;
  await assert.rejects(() => verifyOfficialPdf(candidate, model, verifyModel), /Non-manufacturer/);
  assert.equal(calls, 1, "A redirect must not fetch a non-manufacturer host");
  globalThis.fetch = (async () => { throw new Error("offline"); }) as typeof fetch;
  await assert.rejects(() => discoverDatasheet(model, verifyModel), /search unavailable/);
  assert.equal((await discoverDatasheet({ ...model, b: "Unreviewed brand" }, verifyModel)).status, "unsupported");
  globalThis.fetch = (async () => new Response('<html><p>No results found</p></html>')) as typeof fetch;
  assert.equal((await discoverDatasheet(model, verifyModel)).status, "not_found");
  // A successful discovery must inspect bytes and preserve the manufacturer's URL.
  globalThis.fetch = (async (input) => String(input).includes("UR10e-datasheet.pdf")
    ? new Response("%PDF-1.7\n")
    : new Response(`<a class="result__a" href="${candidate.url}">UR10e datasheet</a>`)) as typeof fetch;
  assert.equal((await discoverDatasheet(model, verifyModel)).url, candidate.url);
  // FANUC datasheets have a known address: found without any search.
  const fanuc = { id: "RVRobot0558", b: "Fanuc", m: "M-20iD/25", n: "Fanuc M-20iD/25" };
  const queries: string[] = [];
  globalThis.fetch = (async (input) => {
    const url = String(input);
    if (url.endsWith(".pdf")) return new Response("%PDF-1.7\n");
    queries.push(url);
    return new Response("<p>No results</p>");
  }) as typeof fetch;
  assert.equal((await discoverDatasheet(fanuc, verifyModel)).url, "https://www.fanucamerica.com/uploads/files/data-sheets/m-20id-25-datasheet.pdf");
  assert.equal(queries.length, 0);
  assert.equal((await discoverDatasheet(fanuc, async () => false)).status, "found", "a direct manufacturer address needs no text match");
  // Search engines return nothing for several site: filters joined with OR, so each
  // manufacturer website is searched on its own; the standard model beats special editions.
  const kuka = { id: "RVRobot0907", b: "KUKA", m: "KR 210 R2700-2", n: "KUKA KR 210 R2700-2" };
  const standard = "https://www.kuka.com/-/media/kuka-downloads/kr-210-r2700-2-datasheet.pdf";
  const food = "https://www.kuka.com/-/media/kuka-downloads/kr-210-r2700-2-foundry-datasheet.pdf";
  globalThis.fetch = (async (input) => {
    const url = String(input);
    if (url.endsWith(".pdf")) return new Response("%PDF-1.7\n");
    const query = new URL(url).searchParams.get("q") ?? "";
    queries.push(query);
    if (query.includes(" OR ") || !query.includes("site:kuka.com")) return new Response("<p>No results</p>");
    return new Response(`<a class="result__a" href="${food}">KR 210 R2700-2 Foundry datasheet</a><a class="result__a" href="${standard}">KR 210 R2700-2 datasheet</a>`);
  }) as typeof fetch;
  assert.equal((await discoverDatasheet(kuka, verifyModel)).url, standard);
  assert.ok(queries.every((query) => !query.includes(" OR ")));
  // Yaskawa: sitemap → product page → its PDF link, with no search at all.
  const searched: string[] = [];
  globalThis.fetch = (async (input) => {
    const url = String(input);
    if (url.endsWith("sitemap.xml")) return new Response("<urlset><url><loc>https://www.motoman.com/en-us/products/robots/industrial/assembly-handling/gp-series/gp25</loc></url></urlset>");
    if (url.endsWith("/gp25")) return new Response('<h1>GP25</h1><a href="/getmedia/ee92/GP25.pdf.aspx">Spec Sheet</a>');
    if (url.endsWith("GP25.pdf.aspx")) return new Response("%PDF-1.7\n");
    searched.push(url);
    return new Response("<p>No results</p>");
  }) as typeof fetch;
  const yaskawa = await discoverDatasheet({ id: "RVRobot1434", b: "Yaskawa Motoman", m: "GP25", n: "Yaskawa Motoman GP25" }, verifyModel);
  assert.equal(yaskawa.url, "https://www.motoman.com/getmedia/ee92/GP25.pdf.aspx");
  assert.equal(yaskawa.source, "manufacturer-sitemap");
  assert.equal(searched.length, 0);
  // ABB: no page for the exact variant, so the family page's brochure is read; the PDF text decides.
  globalThis.fetch = (async (input) => {
    const url = String(input);
    if (url.endsWith("sitemap.xml")) return new Response("<urlset><url><loc>https://www.abb.com/global/en/robots/irb-6700</loc></url></urlset>");
    if (url.endsWith("/irb-6700")) return new Response('<h1>IRB 6700</h1><a href="https://library.e.abb.com/public/a26/IRB_6700_EN.pdf">Data sheet</a>');
    if (url.endsWith(".pdf")) return new Response("%PDF-1.7\n");
    return new Response("<p>No results</p>");
  }) as typeof fetch;
  assert.equal((await discoverDatasheet(irb, verifyModel)).url, "https://library.e.abb.com/public/a26/IRB_6700_EN.pdf");
  assert.equal((await discoverDatasheet(irb, async () => false)).status, "not_found", "a family brochure without the variant is rejected");
} finally { globalThis.fetch = originalFetch; }
console.log("directory datasheets: official hosts, model matching, redirects, PDF bytes and lookup outcomes passed");
