import { candidateScore, hasPdfSignature, isOfficialUrl, matchesModel, OEM_SITES, type DatasheetCandidate, type DatasheetModel } from "./datasheetPolicy.ts";

export type DatasheetResult = {
  url: string | null;
  status: "found" | "not_found" | "unsupported" | "error";
  title?: string | null;
  source?: string;
  host?: string;
  note?: string;
  checkedAt: string;
};
export type PdfModelVerifier = (bytes: Uint8Array, item: DatasheetModel) => Promise<boolean>;

const decode = (text: string) => text.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const strip = (text: string) => decode(text.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const pdfPath = (url: string) => /\.pdf(?:[?#]|$)|[?&](?:file|format)=pdf/i.test(url);

/** Bound both the request and its body, including servers that ignore Range. */
async function readResponse(url: string, brand?: string, maxBytes = 2_000_000, prefixOnly = false, deadline = Infinity) {
  const controller = new AbortController();
  const remaining = Math.min(12_000, deadline - Date.now());
  if (remaining <= 0) throw new Error("Discovery timed out; retry later");
  const timer = setTimeout(() => controller.abort(), remaining);
  try {
    let current = url;
    for (let redirects = 0; redirects <= 5; redirects++) {
      if (brand && !isOfficialUrl(current, brand)) throw new Error("Non-manufacturer URL rejected");
      const response = await fetch(current, {
        redirect: "manual", signal: controller.signal,
        headers: { "User-Agent": "RobotVerse-Datasheets/1.0", ...(prefixOnly ? { Range: "bytes=0-1023" } : {}) },
      });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        await response.body?.cancel();
        if (!location) throw new Error("Missing redirect destination");
        current = new URL(location, current).href;
        // Search pages may only redirect inside their own DNS domain.
        if (!brand && new URL(current).hostname !== new URL(url).hostname) throw new Error("Unexpected search redirect");
        continue;
      }
      if (!response.ok) { await response.body?.cancel(); throw new Error(`HTTP ${response.status}`); }
      const reader = response.body?.getReader();
      if (!reader) throw new Error("Empty response");
      const chunks: Uint8Array[] = [];
      let size = 0;
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const remaining = maxBytes - size;
          if (value.length > remaining && !prefixOnly) throw new Error("Response too large");
          const chunk = value.subarray(0, remaining);
          chunks.push(chunk); size += chunk.length;
          if (size >= maxBytes) break;
        }
      } finally { await reader.cancel(); }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      return { url: current, bytes };
    }
    throw new Error("Too many redirects");
  } finally { clearTimeout(timer); }
}

export function parseSearchResults(html: string, engine: "duckduckgo" | "bing"): DatasheetCandidate[] {
  const pattern = engine === "duckduckgo"
    ? /class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g
    : /<li class="b_algo"[\s\S]*?<h2[^>]*><a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  const out: DatasheetCandidate[] = [];
  for (const match of html.matchAll(pattern)) {
    try {
      let url = decode(match[1]);
      const wrapped = new URL(url, "https://html.duckduckgo.com").searchParams.get("uddg");
      if (wrapped) url = wrapped;
      out.push({ url, title: strip(match[2]), source: engine });
    } catch { /* Ignore malformed results. */ }
  }
  return out;
}

export function productPdfLinks(html: string, pageUrl: string, item: DatasheetModel): DatasheetCandidate[] {
  const heading = [...html.matchAll(/<(?:title|h1)\b[^>]*>([\s\S]*?)<\/(?:title|h1)>/gi)].map((match) => strip(match[1])).join(" ");
  const pageMatches = matchesModel(heading, item.m);
  const out: DatasheetCandidate[] = [];
  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    try {
      const url = new URL(decode(match[1]), pageUrl).href;
      const label = strip(match[2]);
      if (!pdfPath(url) && !/datasheet|brochure|specification|download/i.test(`${url} ${label}`)) continue;
      // Only inherit model context for actual datasheet/brochchure links, never all downloads.
      const title = pageMatches && /datasheet|brochure|specification|technical data/i.test(label) ? `${item.m} ${label}` : label;
      const candidate = { url, title, source: "manufacturer-page" };
      if (candidateScore(candidate, item) >= 0) out.push(candidate);
    } catch { /* Ignore malformed links. */ }
  }
  return out;
}

export async function verifyOfficialPdf(candidate: DatasheetCandidate, item: DatasheetModel, verifyModel: PdfModelVerifier, deadline = Infinity): Promise<DatasheetResult | null> {
  if (candidateScore(candidate, item) < 0) return null;
  const response = await readResponse(candidate.url, item.b, 12_000_000, false, deadline);
  if (!hasPdfSignature(response.bytes)) return null;
  if (!await verifyModel(response.bytes, item)) return null;
  return { url: response.url, title: candidate.title, source: candidate.source,
    host: new URL(response.url).hostname, status: "found", checkedAt: new Date().toISOString() };
}

export async function discoverDatasheet(item: DatasheetModel, verifyModel: PdfModelVerifier): Promise<DatasheetResult> {
  const checkedAt = new Date().toISOString();
  const deadline = Date.now() + 110_000;
  const domains = OEM_SITES[item.b] ?? [];
  if (!domains.length) return { url: null, status: "unsupported", checkedAt, note: "Manufacturer domain needs review" };
  const candidates = new Map<string, DatasheetCandidate>();
  let successfulSearches = 0;
  // Search engines discover URLs; every accepted file must still be on an approved OEM domain.
  for (const engine of ["duckduckgo", "bing"] as const) {
    const query = `${domains.map((domain) => `site:${domain}`).join(" OR ")} "${item.m}" datasheet PDF`;
    const endpoint = engine === "duckduckgo" ? `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}` : `https://www.bing.com/search?q=${encodeURIComponent(query)}&setlang=en`;
    try {
      const response = await readResponse(endpoint, undefined, 2_000_000, false, deadline);
      const html = new TextDecoder().decode(response.bytes);
      if (/captcha|anomaly-modal|verify you are human/i.test(html)) throw new Error("Search challenge");
      successfulSearches++;
      for (const candidate of parseSearchResults(html, engine)) {
        if (candidateScore(candidate, item) >= 0) candidates.set(candidate.url, candidate);
      }
    } catch { /* Try the other search provider. */ }
  }
  if (!successfulSearches) throw new Error("Manufacturer search unavailable; retry later");
  const ranked = [...candidates.values()].sort((a, b) => candidateScore(b, item) - candidateScore(a, item)).slice(0, 4);
  let unavailable = false;
  for (const candidate of ranked) {
    try {
      const pdf = await verifyOfficialPdf(candidate, item, verifyModel, deadline);
      if (pdf) return pdf;
      if (pdfPath(candidate.url)) continue;
      const page = await readResponse(candidate.url, item.b, 2_000_000, false, deadline);
      const links = productPdfLinks(new TextDecoder().decode(page.bytes), page.url, item).slice(0, 3);
      for (const link of links) {
        const verified = await verifyOfficialPdf(link, item, verifyModel, deadline);
        if (verified) return verified;
      }
    } catch { unavailable = true; }
  }
  if (unavailable) throw new Error("Manufacturer downloads unavailable; retry later");
  return { url: null, status: "not_found", checkedAt, note: "No matching official PDF found" };
}
