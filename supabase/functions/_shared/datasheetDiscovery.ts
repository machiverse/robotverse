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

type Engine = "bingrss" | "bing" | "duckduckgo";
const ENGINES: Record<Engine, (query: string) => string> = {
  // Bing first: it answers Supabase's servers; DuckDuckGo shows them a challenge page.
  // Its RSS format keeps site: filters that the HTML page ignores for servers.
  bingrss: (q) => `https://www.bing.com/search?format=rss&q=${encodeURIComponent(q)}`,
  bing: (q) => `https://www.bing.com/search?q=${encodeURIComponent(q)}&setlang=en&cc=us`,
  duckduckgo: (q) => `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`,
};

/** The real destination of a search-engine link (DuckDuckGo, Bing and Yahoo wrap their results). */
export function unwrapResultLink(href: string): string | null {
  try {
    const link = new URL(decode(href), "https://html.duckduckgo.com");
    const ddg = link.searchParams.get("uddg");
    if (ddg) return ddg;
    const bing = link.hostname.endsWith("bing.com") ? link.searchParams.get("u") : null;
    // Bing also wraps its own relative links (/images/search...): resolve them, callers drop them.
    if (bing?.startsWith("a1")) return new URL(atob(bing.slice(2).replace(/-/g, "+").replace(/_/g, "/")), "https://www.bing.com").href;
    const yahoo = link.hostname.endsWith("yahoo.com") ? link.pathname.match(/\/RU=([^/]+)\//)?.[1] : null;
    if (yahoo) return decodeURIComponent(yahoo);
    return /^https?:$/.test(link.protocol) ? link.href : null;
  } catch {
    return null;
  }
}

/**
 * Every outbound result link on a search page, whatever the engine's layout: callers keep
 * only links on approved manufacturer domains that name the model, so page chrome is harmless.
 */
export function parseSearchResults(html: string, engine: Engine): DatasheetCandidate[] {
  const out = new Map<string, DatasheetCandidate>();
  // RSS results: <item><title>…</title><link>…</link></item>
  for (const match of html.matchAll(/<item>[\s\S]*?<title>([\s\S]*?)<\/title>[\s\S]*?<link>([\s\S]*?)<\/link>/gi)) {
    const url = unwrapResultLink(match[2].trim());
    if (url) out.set(url, { url, title: strip(match[1]), source: engine });
  }
  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const url = unwrapResultLink(match[1]);
    let host = "";
    try { host = url ? new URL(url).hostname : ""; } catch { /* Skip malformed links. */ }
    if (!url || !host || /(?:^|\.)(?:duckduckgo|bing|yahoo|mojeek|microsoft|msn)\.com$/i.test(host)) continue;
    const previous = out.get(url);
    const title = strip(match[2]);
    if (!previous || title.length > previous.title.length) out.set(url, { url, title, source: engine });
  }
  return [...out.values()];
}

/** Known datasheet addresses, tried before any search. */
export function directCandidates(item: DatasheetModel): DatasheetCandidate[] {
  const slug = item.m.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (item.b === "Fanuc") return [{ url: `https://www.fanucamerica.com/uploads/files/data-sheets/${slug}-datasheet.pdf`, title: `${item.m} datasheet`, source: "manufacturer-direct" }];
  return [];
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
  // A known address built from the exact model on the manufacturer's site is itself the proof.
  const direct = candidate.source === "manufacturer-direct";
  const name = candidate.url.split("/").pop()?.slice(0, 60);
  if (candidateScore(candidate, item) < 0) return null;
  const response = await readResponse(candidate.url, item.b, 12_000_000, false, deadline);
  if (!hasPdfSignature(response.bytes)) { trace.push(`${name}: not a PDF (${response.bytes.length} bytes)`); return null; }
  if (!direct && !await verifyModel(response.bytes, item)) { trace.push(`${name}: model not in PDF text`); return null; }
  return { url: response.url, title: candidate.title, source: candidate.source,
    host: new URL(response.url).hostname, status: "found", checkedAt: new Date().toISOString(), bytes: response.bytes };
}

export async function discoverDatasheet(item: DatasheetModel, verifyModel: PdfModelVerifier): Promise<DatasheetResult> {
  const checkedAt = new Date().toISOString();
  const deadline = Date.now() + 60_000;
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
  // Known addresses first: no search needed.
  for (const candidate of directCandidates(item)) {
    try {
      const pdf = await verifyOfficialPdf(candidate, item, verifyModel, deadline, trace);
      if (pdf) return pdf;
    } catch (error) { trace.push(`direct: ${error instanceof Error ? error.message : "failed"}`); }
    tried.add(candidate.url);
  }
  for (const query of queries) {
    if (Date.now() > deadline - 15_000) break;
    const candidates = new Map<string, DatasheetCandidate>();
    for (const engine of Object.keys(ENGINES) as Engine[]) {
      const endpoint = ENGINES[engine](query);
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
        trace.push(`${engine} "${query.slice(0, 40)}": ${results.length} links, ${candidates.size} usable${candidates.size ? "" : ` (${[...new Set(results.map((r) => new URL(r.url).hostname))].slice(0, 3).join(", ")})`}`);
        if (candidates.size) break;
      } catch (error) { trace.push(`${engine}: ${error instanceof Error ? error.message : "failed"}`); }
      // Engines can block servers; the next one is only tried when this one found nothing usable.
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
  const direct = trace.filter((line) => line.startsWith("direct") || line.includes("datasheet.pdf"));
  const why = [...new Set([...direct, ...trace.slice(-8)])].join(" | ").slice(0, 1500);
  if (!successfulSearches) throw new Error(`Manufacturer search unavailable; retry later. ${why}`);
  if (unavailable) throw new Error(`Manufacturer downloads unavailable; retry later. ${why}`);
  return { url: null, status: "not_found", checkedAt, note: `No matching official PDF found. ${why}` };
}
