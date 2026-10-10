import assert from "node:assert/strict";
import { candidateScore, hasPdfSignature, isOfficialUrl, matchesModel } from "../supabase/functions/_shared/datasheetPolicy";
import { discoverDatasheet, parseSearchResults, productPdfLinks, verifyOfficialPdf } from "../supabase/functions/_shared/datasheetDiscovery";

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
assert.ok(hasPdfSignature(new TextEncoder().encode("%PDF-1.7\n")));
assert.equal(hasPdfSignature(new TextEncoder().encode("<html>not a pdf")), false);

const links = productPdfLinks('<title>UR10e robot</title><a href="/downloads/data.pdf">Technical data</a><a href="https://reseller.test/UR10e.pdf">Datasheet</a><a href="/manual.pdf">Operating manual</a>', "https://www.universal-robots.com/products/ur10e/", model);
assert.equal(links.length, 1);
assert.equal(links[0].url, "https://www.universal-robots.com/downloads/data.pdf");
assert.equal(productPdfLinks('<title>All robots</title><a href="/downloads/data.pdf">Technical data</a>', candidate.url, model).length, 0);
const results = parseSearchResults('<a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fwww.universal-robots.com%2FUR10e.pdf">UR10e datasheet</a>', "duckduckgo");
assert.equal(results[0].url, "https://www.universal-robots.com/UR10e.pdf");

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
} finally { globalThis.fetch = originalFetch; }
console.log("directory datasheets: official hosts, model matching, redirects, PDF bytes and lookup outcomes passed");
