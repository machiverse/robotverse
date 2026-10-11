import { candidateScore, hasPdfSignature, isOfficialUrl, matchesModel, OEM_SITES, type DatasheetCandidate, type DatasheetModel } from "./datasheetPolicy.ts";

export type DatasheetResult = {
  url: string | null;
  status: "found" | "not_found" | "unsupported" | "error";
  title?: string | null;
  source?: string;
  host?: string;
  note?: string;
  checkedAt: string;
  /** Our stored copy of the PDF (public storage URL). */
  file?: string;
  /** The verified PDF bytes, for storing a copy; never written to the result JSON. */
  bytes?: Uint8Array;
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
      const link = new URL(url, "https://html.duckduckgo.com");
      const wrapped = link.searchParams.get("uddg");
      if (wrapped) url = wrapped;
      // Bing wraps results as bing.com/ck/a?...&u=a1<base64url of the real URL>.
      const bing = link.hostname.endsWith("bing.com") ? link.searchParams.get("u") : null;
      if (bing?.startsWith("a1")) url = atob(bing.slice(2).replace(/-/g, "+").replace(/_/g, "/"));
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

export async function verifyOfficialPdf(candidate: DatasheetCandidate, item: DatasheetModel, verifyModel: PdfModelVerifier, deadline = Infinity, trace: string[] = []): Promise<DatasheetResult | null> {
  const name = candidate.url.split("/").pop()?.slice(0, 60);
  if (candidateScore(candidate, item) < 0) return null;
  const response = await readResponse(candidate.url, item.b, 12_000_000, false, deadline);
  if (!hasPdfSignature(response.bytes)) { trace.push(`${name}: not a PDF (${response.bytes.length} bytes)`); return null; }
  if (!await verifyModel(response.bytes, item)) { trace.push(`${name}: model not in PDF text`); return null; }
  return { url: response.url, title: candidate.title, source: candidate.source,
    host: new URL(response.url).hostname, status: "found", checkedAt: new Date().toISOString(), bytes: response.bytes };
}

export async function discoverDatasheet(item: DatasheetModel, verifyModel: PdfModelVerifier): Promise<DatasheetResult> {
  const checkedAt = new Date().toISOString();
  const deadline = Date.now() + 110_000;
  const domains = OEM_SITES[item.b] ?? [];
  if (!domains.length) return { url: null, status: "unsupported", checkedAt, note: "Manufacturer domain needs review" };
  let successfulSearches = 0;
  let unavailable = false;
  const tried = new Set<string>();
  // Short reasons, saved with "not found" results so failed lookups can be diagnosed.
  const trace: string[] = [];
  // One search per manufacturer website: search engines return nothing for several
  // site: filters joined with OR. A general search follows; it still only accepts PDFs
  // on approved manufacturer domains.
  const queries = [
    ...domains.slice(0, 4).map((domain) => `site:${domain} ${item.m} datasheet pdf`),
    `"${item.m}" ${item.b.split(" ")[0]} datasheet filetype:pdf`,
  ];
  for (const query of queries) {
    if (Date.now() > deadline - 15_000) break;
    const candidates = new Map<string, DatasheetCandidate>();
    for (const engine of ["duckduckgo", "bing"] as const) {
      const endpoint = engine === "duckduckgo" ? `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}` : `https://www.bing.com/search?q=${encodeURIComponent(query)}&setlang=en`;
      try {
        const response = await readResponse(endpoint, undefined, 2_000_000, false, deadline);
        const html = new TextDecoder().decode(response.bytes);
        if (/captcha|anomaly-modal|verify you are human/i.test(html)) throw new Error("Search challenge");
        successfulSearches++;
        const results = parseSearchResults(html, engine);
        for (const candidate of results) {
          const key = candidate.url.replace(/[?#].*$/, "");
          if (!tried.has(key) && candidateScore(candidate, item) >= 0) candidates.set(key, candidate);
        }
        trace.push(`${engine} "${query.slice(0, 50)}": ${results.length} results, ${candidates.size} usable`);
        // The second engine is only a fallback when the first finds nothing usable.
        if (candidates.size) break;
      } catch (error) { trace.push(`${engine}: ${error instanceof Error ? error.message : "failed"}`); }
    }
    const ranked = [...candidates.entries()].sort(([, a], [, b]) => candidateScore(b, item) - candidateScore(a, item)).slice(0, 4);
    for (const [key, candidate] of ranked) {
      tried.add(key);
      try {
        const pdf = await verifyOfficialPdf(candidate, item, verifyModel, deadline, trace);
        if (pdf) return pdf;
        if (pdfPath(candidate.url)) continue;
        const page = await readResponse(candidate.url, item.b, 2_000_000, false, deadline);
        const links = productPdfLinks(new TextDecoder().decode(page.bytes), page.url, item).slice(0, 3);
        for (const link of links) {
          const verified = await verifyOfficialPdf(link, item, verifyModel, deadline, trace);
          if (verified) return verified;
        }
      } catch (error) { unavailable = true; trace.push(`${key.split("/").pop()?.slice(0, 60)}: ${error instanceof Error ? error.message : "failed"}`); }
    }
  }
  const why = trace.slice(-8).join(" | ").slice(0, 900);
  if (!successfulSearches) throw new Error(`Manufacturer search unavailable; retry later. ${why}`);
  if (unavailable) throw new Error(`Manufacturer downloads unavailable; retry later. ${why}`);
  return { url: null, status: "not_found", checkedAt, note: `No matching official PDF found. ${why}` };
}
