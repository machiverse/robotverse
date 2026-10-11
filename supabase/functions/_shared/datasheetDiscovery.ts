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
// Includes ASP.NET media links such as Motoman's ".../GP25.pdf.aspx".
const pdfPath = (url: string) => /\.pdf(?:\.aspx)?(?:[?#]|$)|[?&](?:file|format)=pdf/i.test(url);

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

/** Manufacturer sitemaps listing one product page per model (each page links its datasheet). */
export const SITEMAPS: Record<string, string[]> = {
  "Yaskawa Motoman": ["https://www.motoman.com/sitemap.xml"],
};
const slugOf = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Product pages whose last path segment is exactly this model (gp25, not gp25-12); used-robot pages excluded. */
export function sitemapProductPages(locations: string[], item: DatasheetModel): string[] {
  const slug = slugOf(item.m);
  return locations.filter((location) => {
    try {
      const path = new URL(location).pathname.toLowerCase();
      return !/\/used\//.test(path) && slugOf(decodeURIComponent(path.split("/").filter(Boolean).pop() ?? "")) === slug;
    } catch { return false; }
  }).sort((a, b) => Number(!a.includes("/en-us/")) - Number(!b.includes("/en-us/"))).slice(0, 2);
}

/** "IRB 6700-200/2.60" → "irb-6700": the family page that covers several variants. */
export function familySlug(model: string): string | null {
  const family = model.match(/^(.*?\d[A-Za-z0-9 ]*?)[-/]/)?.[1];
  const slug = family ? slugOf(family) : "";
  return slug.length >= 4 && slug !== slugOf(model) ? slug : null;
}

/** Family product pages, used only when no page exists for the exact model. */
export function sitemapFamilyPages(locations: string[], item: DatasheetModel): string[] {
  const slug = familySlug(item.m);
  if (!slug) return [];
  return locations.filter((location) => {
    try {
      const path = new URL(location).pathname.toLowerCase();
      return !/\/used\//.test(path) && slugOf(decodeURIComponent(path.split("/").filter(Boolean).pop() ?? "")) === slug;
    } catch { return false; }
  }).sort((a, b) => Number(!/\/en[-/]/.test(a)) - Number(!/\/en[-/]/.test(b))).slice(0, 2);
}

/** Saved per-brand page lists, so the large sitemaps are read once rather than by every run. */
export type SitemapStore = { read(brand: string): Promise<string[] | null>; write(brand: string, pages: string[]): Promise<void> };
let sitemapStore: SitemapStore | null = null;
export const setSitemapStore = (store: SitemapStore | null) => { sitemapStore = store; sitemapCache.clear(); };
/** Only pages that can match a model: the last path segment has a digit, and it is not news or similar. */
const productLike = (location: string) => {
  try {
    const path = new URL(location).pathname.toLowerCase();
    return /\d/.test(path.split("/").filter(Boolean).pop() ?? "") && !/news|blog|press|event|career|job|webinar|case-stud|legal|privacy|cookie/.test(path);
  } catch { return false; }
};

const sitemapCache = new Map<string, Promise<string[]>>();
/** Every page address in a manufacturer's sitemap (and its child sitemaps), cached per worker. */
function sitemapLocations(brand: string, deadline: number): Promise<string[]> {
  if (!sitemapCache.has(brand)) {
    const load = async () => {
      const saved = await sitemapStore?.read(brand).catch(() => null);
      if (saved) return saved;
      const out: string[] = [];
      // Known sitemaps, else those robots.txt lists for each approved domain, else /sitemap.xml.
      const queue = [...(SITEMAPS[brand] ?? [])];
      if (!queue.length) {
        for (const domain of (OEM_SITES[brand] ?? []).slice(0, 2)) {
          const host = `https://www.${domain.replace(/^www\./, "")}`;
          try {
            const robots = new TextDecoder().decode((await readResponse(`${host}/robots.txt`, brand, 200_000, false, deadline)).bytes);
            queue.push(...[...robots.matchAll(/^\s*sitemap:\s*(\S+)/gim)].map((match) => match[1]).filter((url) => isOfficialUrl(url, brand)));
          } catch { /* No robots.txt: fall back to /sitemap.xml. */ }
          queue.push(`${host}/sitemap.xml`);
        }
      }
      const seen = new Set<string>();
      for (let fetched = 0; queue.length && fetched < 16; fetched++) {
        const next = queue.shift()!;
        if (seen.has(next)) { fetched--; continue; }
        seen.add(next);
        let response;
        try { response = await readResponse(next, brand, 8_000_000, false, deadline); }
        catch { continue; } // A missing or blocked sitemap: try the next one.
        let bytes = response.bytes;
        if (bytes[0] === 0x1f && bytes[1] === 0x8b) // gzipped sitemap (.xml.gz)
          bytes = new Uint8Array(await new Response(new Blob([bytes as Uint8Array<ArrayBuffer>]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer());
        const xml = new TextDecoder().decode(bytes);
        const locations = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((match) => decode(match[1]));
        // Product and English child sitemaps first; image, video and news sitemaps never list products.
        const priority = (url: string) => (/product|robot/i.test(url) ? 0 : 2) + (/[/_-]en(?:[/_.-]|$)/i.test(url) ? 0 : 1);
        if (/<sitemapindex/i.test(xml)) queue.unshift(...locations.filter((location) => !/image|video|news|blog|press|event/i.test(location)).sort((a, b) => priority(a) - priority(b)));
        else out.push(...locations.filter(productLike));
      }
      const pages = [...new Set(out)];
      await sitemapStore?.write(brand, pages).catch(() => undefined); // Empty lists are saved too: no re-reading.
      return pages;
    };
    const promise = load();
    promise.catch(() => sitemapCache.delete(brand));
    sitemapCache.set(brand, promise);
  }
  return sitemapCache.get(brand)!;
}

/** Known datasheet addresses, tried before any search. */
export function directCandidates(item: DatasheetModel): DatasheetCandidate[] {
  const slug = item.m.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (item.b === "Fanuc") return [{ url: `https://www.fanucamerica.com/uploads/files/data-sheets/${slug}-datasheet.pdf`, title: `${item.m} datasheet`, source: "manufacturer-direct" }];
  return [];
}

/**
 * Datasheet links on a product page. On a family page (several variants), links need not name
 * the exact model: the PDF text check then proves the model is in the document.
 */
export function productPdfLinks(html: string, pageUrl: string, item: DatasheetModel, family = false): DatasheetCandidate[] {
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
      else if (family && pdfPath(url) && isOfficialUrl(url, item.b) && !/manual|maintenance|instruction|handbuch|spare.parts/i.test(`${url} ${label}`))
        out.push({ ...candidate, title: `${label} (family)`, source: "manufacturer-family" });
    } catch { /* Ignore malformed links. */ }
  }
  const rank = (c: DatasheetCandidate) => candidateScore(c, item) * 10 + (/data[-_ ]?sheet|specification|technical/i.test(`${c.url} ${c.title}`) ? 5 : 0);
  return out.sort((a, b) => rank(b) - rank(a));
}

export async function verifyOfficialPdf(candidate: DatasheetCandidate, item: DatasheetModel, verifyModel: PdfModelVerifier, deadline = Infinity, trace: string[] = []): Promise<DatasheetResult | null> {
  // A known address built from the exact model on the manufacturer's site is itself the proof.
  const direct = candidate.source === "manufacturer-direct";
  // Family brochures need not name the variant in their address; their text must (below).
  const family = candidate.source === "manufacturer-family" && isOfficialUrl(candidate.url, item.b);
  const name = candidate.url.split("/").pop()?.slice(0, 60);
  if (candidateScore(candidate, item) < 0 && !family) return null;
  const response = await readResponse(candidate.url, item.b, 12_000_000, false, deadline);
  if (!hasPdfSignature(response.bytes)) { trace.push(`${name}: not a PDF (${response.bytes.length} bytes)`); return null; }
  // A manufacturer PDF whose own address names the exact model (".../GP25.pdf") is proof enough;
  // reading PDF text is costly, so it is reserved for family brochures and vaguer links.
  let file = response.url;
  try { file = decodeURIComponent(new URL(response.url).pathname.split("/").pop() ?? ""); } catch { /* keep the URL */ }
  const named = matchesModel(file, item.m);
  if (!direct && !named && !await verifyModel(response.bytes, item)) { trace.push(`${name}: model not in PDF text`); return null; }
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
  // Search engines mostly block or ignore servers, so search is only a short last resort.
  const queries = [`site:${domains[0]} ${item.m} datasheet pdf`];
  // Known addresses first: no search needed.
  for (const candidate of directCandidates(item)) {
    try {
      const pdf = await verifyOfficialPdf(candidate, item, verifyModel, deadline, trace);
      if (pdf) return pdf;
    } catch (error) { trace.push(`direct: ${error instanceof Error ? error.message : "failed"}`); }
    tried.add(candidate.url);
  }
  // Then the model's own product page from the manufacturer's sitemap, and the PDFs it links.
  {
    try {
      const locations = await sitemapLocations(item.b, deadline);
      const exact = sitemapProductPages(locations, item);
      const pages = exact.length ? exact : sitemapFamilyPages(locations, item);
      if (!pages.length) trace.push(`sitemap: ${locations.length} pages, none for this model`);
      for (const pageUrl of pages) {
        const page = await readResponse(pageUrl, item.b, 3_000_000, false, deadline);
        const links = productPdfLinks(new TextDecoder().decode(page.bytes), page.url, item, !exact.length).slice(0, 4);
        if (!links.length) trace.push(`sitemap: no datasheet link on ${new URL(pageUrl).pathname.slice(-40)}`);
        for (const link of links) {
          tried.add(link.url.replace(/[?#].*$/, ""));
          const verified = await verifyOfficialPdf(link, item, verifyModel, deadline, trace);
          if (verified) return { ...verified, source: "manufacturer-sitemap" };
        }
      }
    } catch (error) { trace.push(`sitemap: ${error instanceof Error ? error.message : "failed"}`); }
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
