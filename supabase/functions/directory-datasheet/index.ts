// Official PDF discovery. Writes only new datasheet files in the existing storage bucket.
import { createClient } from "npm:@supabase/supabase-js@2.99.1";
import { discoverDatasheet, fetchOfficial, setSitemapStore, type DatasheetResult } from "../_shared/datasheetDiscovery.ts";
import { datasheetLinksPath, hasPdfSignature, isOfficialUrl, isStoredDatasheet, matchesModel, OEM_SITES, type DatasheetLinks, type DatasheetModel } from "../_shared/datasheetPolicy.ts";
import { researchedSources } from "../_shared/datasheetSources.ts";
import { DatasheetFiles } from "../_shared/datasheetFiles.ts";
import { pdfContainsModel, pdfText } from "../_shared/datasheetPdf.ts";

const SITE_URL = (Deno.env.get("PUBLIC_SITE_URL") ?? "https://www.robotverse.in").replace(/\/$/, "");
const KINDS = ["robots", "tools", "axes", "parts"] as const;
type Kind = (typeof KINDS)[number];
type Row = DatasheetResult & { brand: string; model: string; catalog_id: string; v?: number; src?: string };
// Bump when discovery improves, so earlier "not found" outcomes are searched again.
const SEARCH_VERSION = 22;
type Job = { kind: Kind; run_id: string; done: number; total: number; redo: boolean; running: boolean; updatedAt: string; last_error: string | null; v?: number; at?: string; started?: string; seq?: number };
const BUCKET = "robot-images";
// Separate prefix preserves all existing legacy datasheet files and database data.
const DIR = "directory/datasheets/verified-v2";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const service = () => createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", { auth: { persistSession: false } });
const message = (error: unknown) => error instanceof Error ? error.message : "Datasheet lookup failed";
const files = () => new DatasheetFiles(service().storage.from(BUCKET));
const readJson = <T>(path: string): Promise<T | null> => files().read<T>(path);
const writeJson = (path: string, value: unknown, upsert = true) => files().write(path, value, upsert);
const resultPath = (kind: Kind, id: string) => `${DIR}/${kind}/${id}.json`;
const jobPath = (kind: Kind) => `${DIR}/jobs/${kind}.json`;
const indexPath = (kind: Kind) => `${DIR}/index-${kind}.json`;
const readResult = (kind: Kind, id: string) => readJson<Row>(resultPath(kind, id));
const pdfPath = (kind: Kind, id: string) => `${DIR}/pdf/${kind}/${id}.pdf`;
/** Fingerprint of the researched sources a model was checked against: new research makes it stale. */
const sourcesKey = (item: DatasheetModel) => {
  const text = researchedSources(item).map((source) => source.url).join("|");
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) | 0;
  return `${text.length}:${hash}`;
};
async function saveResult(kind: Kind, item: DatasheetModel, { bytes: _bytes, ...result }: DatasheetResult): Promise<Row> {
  const row: Row = { ...result, brand: item.b, model: item.m, catalog_id: item.id, v: SEARCH_VERSION, src: sourcesKey(item) };
  await writeJson(resultPath(kind, item.id), row);
  return row;
}
/** Keep our own copy of the verified PDF so the button never depends on the manufacturer's site. */
async function storePdf(kind: Kind, id: string, bytes: Uint8Array) {
  const path = pdfPath(kind, id);
  await files().writePdf(path, bytes);
  return service().storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
/** The link the button opens: our stored copy, else the manufacturer's PDF. */
const openUrl = (row: { url: string | null; file?: string }) => row.file && isStoredDatasheet(row.file) ? row.file : row.url;

// Manufacturer page lists from sitemaps, refreshed weekly.
const sitemapPath = (brand: string) => `${DIR}/sitemaps/${brand.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.json`;
setSitemapStore({
  read: async (brand) => {
    const saved = await readJson<{ at: string; pages: string[] }>(sitemapPath(brand));
    return saved && Date.now() - new Date(saved.at).getTime() < 7 * 86400_000 ? saved.pages : null;
  },
  write: (brand, pages) => writeJson(sitemapPath(brand), { at: new Date().toISOString(), pages }),
});

async function readIndex(kind: Kind) {
  return (await readJson<Record<string, Row>>(indexPath(kind))) ?? {};
}
// Only the collection worker writes the shared index. Visitor lookups write their
// own per-model files, so parallel visitors cannot overwrite one another's results.
async function indexResult(kind: Kind, row: Row) {
  const index = await readIndex(kind);
  index[row.catalog_id] = row;
  await writeJson(indexPath(kind), index);
  // The page reads this small public file directly, so the button is ready without calling the function.
  await writeJson(datasheetLinksPath(kind), linksOf(Object.values(index))).catch(() => { /* The index action still answers. */ });
}
/** What the button needs: the PDF to open for each model, and the models with no official datasheet. */
function linksOf(rows: Row[]): DatasheetLinks {
  const found = rows.filter((row) => row.status === "found" && row.url && isOfficialUrl(row.url, row.brand) && Date.now() - new Date(row.checkedAt).getTime() < 30 * 86400_000);
  const none = rows.filter((row) => (row.status === "not_found" || (row.status === "unsupported" && !OEM_SITES[row.brand]?.length)) && row.v === SEARCH_VERSION);
  return { at: new Date().toISOString(), found: Object.fromEntries(found.map((row) => [row.catalog_id, openUrl(row) ?? row.url!])), none: none.map((row) => row.catalog_id) };
}

async function loadParts(): Promise<DatasheetModel[]> {
  const out: DatasheetModel[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await service().from("directory_parts").select("id, brand, model, name").order("id").range(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...data.map((row) => ({ id: String(row.id), b: String(row.brand ?? ""), m: String(row.model || row.name || ""), n: String(row.name || row.model || "") })));
    if (data.length < 1000) return out;
  }
}
const catalogues: Partial<Record<Kind, Promise<DatasheetModel[]>>> = {};
const loadCatalogue = (kind: Kind): Promise<DatasheetModel[]> => (catalogues[kind] ??= (async () => {
  if (kind === "parts") return loadParts();
  const response = await fetch(`${SITE_URL}/directory/${kind}.json`, { signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`Catalogue unavailable: HTTP ${response.status}`);
  const data: unknown = await response.json();
  if (!Array.isArray(data) || !data.length || !data.every((item) => item && [item.id, item.b, item.m, item.n].every((value) => typeof value === "string"))) throw new Error("Invalid or empty catalogue");
  return data.sort((a, b) => a.id.localeCompare(b.id)) as DatasheetModel[];
})().catch((error) => { delete catalogues[kind]; throw error; }));

function fresh(row: Row, item: DatasheetModel) {
  if (row.model !== item.m || row.brand !== item.b) return false;
  if (row.url && !isOfficialUrl(row.url, item.b)) return false;
  // Found before PDFs were stored: fetch again to keep a copy.
  if (row.status === "found" && !row.file) return false;
  if (row.status === "unsupported" && OEM_SITES[item.b]?.length) return false;
  if (row.status !== "found" && row.v !== SEARCH_VERSION) return false;
  // Researched sources were added for this model since it was checked: check again.
  if (row.status !== "found" && row.src !== sourcesKey(item)) return false;
  const ttl = row.status === "found" ? 30 * 86400_000 : row.status === "error" ? 60_000 : 21 * 86400_000;
  return Date.now() - new Date(row.checkedAt).getTime() < ttl;
}
/**
 * A researched PDF (see datasheetSources.ts), downloaded once: our stored copy plus its text, so
 * every model of a family is checked against the saved text instead of parsing the PDF again.
 * Failed downloads are retried after a day.
 */
type Doc = { url: string; file?: string; text?: string; links?: string[]; error?: string; parsing?: boolean; at: string };
/** New downloads allowed per request: PDF parsing is the costly part of the CPU limit. */
let downloadBudget = 2;
class Pending extends Error {}
// Reading PDF text is what uses up a run's CPU allowance, so the automatic search reads only a
// few candidate PDFs per run; a model cut short is saved as "error" and checked again later.
let parseBudget = 3;
let parseLimitHit = false;
const verifyPdf = (bytes: Uint8Array, item: DatasheetModel) => {
  if (parseBudget-- <= 0) {
    parseLimitHit = true;
    return Promise.reject(new Error("PDF reading limit for this run reached"));
  }
  return pdfContainsModel(bytes, item);
};
const docPath = async (url: string) => {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-1", new TextEncoder().encode(url)));
  return `${DIR}/docs/${[...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 24)}.json`;
};
// Loaded pages and PDF texts, kept for the life of the worker: many models share one brochure.
const docMemo = new Map<string, Doc>();
const usable = (saved: Doc | null | undefined) => saved && (saved.text !== undefined || saved.links !== undefined || Date.now() - new Date(saved.at).getTime() < 86400_000);
/** A researched product page, read once: the official PDF links on it (brochures, data sheets). */
async function loadPage(url: string, brand: string): Promise<Doc> {
  const path = await docPath(url);
  const saved = docMemo.get(path) ?? await readJson<Doc>(path);
  if (usable(saved)) { docMemo.set(path, saved!); return saved!; }
  if (downloadBudget-- <= 0) throw new Pending();
  const at = new Date().toISOString();
  let doc: Doc;
  try {
    const response = await fetchOfficial(url, brand);
    const html = new TextDecoder().decode(response.bytes);
    const links = [...html.matchAll(/href=["']([^"']+)["']/gi)].map((match) => { try { return new URL(match[1].replace(/&amp;/g, "&"), response.url).href; } catch { return ""; } })
      .filter((link) => /\.pdf(?:[?#]|$)/i.test(link) && isOfficialUrl(link, brand) && !/manual|maintenance|instruction|handbuch|spare.parts|annual|report|training|[23]d|drawing|cad|working.?area|dimension|certificate|declaration/i.test(link));
    doc = { url: response.url, links: [...new Set(links)].slice(0, 12), at };
  } catch (error) { doc = { url, error: message(error), at }; }
  await writeJson(path, doc);
  return doc;
}
async function loadDoc(url: string, brand: string): Promise<Doc> {
  const path = await docPath(url);
  let saved = docMemo.get(path) ?? await readJson<Doc>(path);
  // A parse that never finished (the run was stopped, e.g. at the CPU limit): do not try again.
  if (saved?.parsing && Date.now() - new Date(saved.at).getTime() > 3 * 60_000) {
    saved = { url, error: "PDF too large to read", at: new Date().toISOString() };
    await writeJson(path, saved);
  }
  if (usable(saved) && !saved!.parsing) { docMemo.set(path, saved!); return saved!; }
  if (saved?.parsing) throw new Pending(); // Another run is reading it right now.
  if (downloadBudget-- <= 0) throw new Pending();
  const key = path.split("/").pop()!.replace(".json", "");
  const at = new Date().toISOString();
  let doc: Doc;
  try {
    // Search-indexed links can carry an expired signature (ABB's "x-sign"): retry without it.
    const response = await fetchOfficial(url, brand).catch((error) => {
      const plain = url.replace(/[?&]x-sign=[^&]*/, "").replace(/\?$/, "");
      if (plain === url) throw error;
      return fetchOfficial(plain, brand);
    });
    if (!hasPdfSignature(response.bytes)) throw new Error(`not a PDF (${response.bytes.length} bytes)`);
    await writeJson(path, { url, parsing: true, at: new Date().toISOString() });
    // Catalogues list models deep inside; each researched PDF is read once and its text kept.
    const text = (await pdfText(response.bytes, 40)).slice(0, 600_000);
    const copy = `${DIR}/pdf/docs/${key}.pdf`;
    await files().writePdf(copy, response.bytes);
    doc = { url: response.url, file: service().storage.from(BUCKET).getPublicUrl(copy).data.publicUrl, text, at };
  } catch (error) { doc = { url, error: message(error), at }; }
  await writeJson(path, doc);
  return doc;
}

/** The first researched PDF that really lists this model (in its text or its file name). */
async function tryResearched(item: DatasheetModel): Promise<{ result: DatasheetResult | null; notes: string[] }> {
  const notes: string[] = [];
  // Product pages contribute the PDFs they link, checked after the directly listed PDFs.
  // Order: PDFs listed for this model or family, then PDFs on its product pages, then broad brochures.
  const sources: { url: string; trust: boolean; family?: string; strip?: string }[] = [];
  const fallbacks: { url: string; trust: boolean; family?: string; strip?: string }[] = [];
  const pages: string[] = [];
  for (const source of researchedSources(item)) {
    if (source.page) pages.push(source.url);
    else (source.fallback ? fallbacks : sources).push(source);
  }
  for (const pageUrl of pages) {
    if (!isOfficialUrl(pageUrl, item.b)) { notes.push(`${pageUrl.slice(0, 60)}: not an approved manufacturer domain`); continue; }
    const page = await loadPage(pageUrl, item.b);
    if (page.error) notes.push(`${pageUrl.slice(-40)}: ${page.error}`);
    for (const link of page.links ?? []) if (!sources.some((source) => source.url === link)) sources.push({ url: link, trust: false });
  }
  sources.push(...fallbacks.filter((fallback) => !sources.some((source) => source.url === fallback.url)));
  // A family datasheet that does not list this exact variant (e.g. an older brochure): used only
  // when no researched PDF names the exact model.
  let familyDoc: { doc: Doc; name: string } | null = null;
  for (const { url, trust, family, strip } of sources) {
    const model = strip ? item.m.replace(new RegExp(strip, "i"), "").trim() || item.m : item.m;
    if (!isOfficialUrl(url, item.b)) { notes.push(`${url.slice(0, 60)}: not an approved manufacturer domain`); continue; }
    const doc = await loadDoc(url, item.b);
    let name = doc.url;
    try { name = decodeURIComponent(new URL(doc.url).pathname.split("/").pop() ?? doc.url); } catch { /* keep the URL */ }
    if (doc.error) { notes.push(`${name.slice(0, 60)}: ${doc.error}`); continue; }
    if (doc.file && (trust || matchesModel(name, model) || matchesModel(doc.text ?? "", model)))
      return { notes, result: { url: doc.url, file: doc.file, title: name, source: "researched", host: new URL(doc.url).hostname, status: "found", checkedAt: new Date().toISOString() } };
    if (!familyDoc && doc.file && family && matchesModel(doc.text ?? "", family)) familyDoc = { doc, name };
    notes.push(`${name.slice(0, 60)}: model not in this PDF`);
  }
  if (familyDoc) {
    const { doc, name } = familyDoc;
    return { notes, result: { url: doc.url, file: doc.file, title: `${name} (family datasheet)`, source: "researched-family", host: new URL(doc.url).hostname, status: "found", checkedAt: new Date().toISOString() } };
  }
  return { result: null, notes };
}

async function find(kind: Kind, id: string, refresh: boolean): Promise<DatasheetResult & { cached: boolean; source_url?: string | null }> {
  const item = (await loadCatalogue(kind)).find((entry) => entry.id === id);
  if (!item) throw new Error("Unknown model");
  if (!refresh) {
    const known = await readResult(kind, id);
    if (known && fresh(known, item)) return { ...known, url: openUrl(known), source_url: known.url, cached: true };
  }
  let result: DatasheetResult;
  // Researched manufacturer PDFs first, then the automatic lookup.
  const researched = await tryResearched(item).catch((error) => {
    if (error instanceof Pending) throw error; // More datasheets to download first: retried by the next run.
    return { result: null, notes: [message(error)] };
  });
  if (researched.result) result = researched.result;
  else {
    parseLimitHit = false;
    try { result = await discoverDatasheet(item, verifyPdf); }
    catch (error) { result = { url: null, status: "error", note: message(error), checkedAt: new Date().toISOString() }; }
    if (parseLimitHit && result.status === "not_found") result = { ...result, status: "error", note: `Not fully checked (PDF reading limit). ${result.note ?? ""}`.slice(0, 2000) };
    if (researched.notes.length) result.note = `Researched: ${researched.notes.join("; ")} | ${result.note ?? ""}`.slice(0, 2000);
  }
  if (result.status === "found" && result.bytes) {
    try { result.file = await storePdf(kind, item.id, result.bytes); }
    catch (error) { result.note = `PDF copy not stored: ${message(error)}`; /* The manufacturer link still works. */ }
  }
  await saveResult(kind, item, result);
  const { bytes: _bytes, ...response } = result;
  return { ...response, url: openUrl(response), source_url: response.url, cached: false };
}

async function isAdmin(req: Request) {
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return false;
  const client = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data } = await client.auth.getUser();
  if (!data.user) return false;
  const first = await client.rpc("is_admin_user");
  if (!first.error && first.data === true) return true;
  const second = await client.rpc("has_role", { _user_id: data.user.id, _role: "admin" });
  return !second.error && second.data === true;
}
declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void } | undefined;
const background = (promise: Promise<unknown>) => {
  const safe = promise.catch((error) => console.error("directory-datasheet collection", message(error)));
  if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(safe);
};

// Each invocation collects models for up to ~70 s, saving progress after every model,
// then hands over to a fresh invocation. If a handoff fails, the next status read resumes.
// Edge functions allow ~2 s of CPU per request (background work included), so each run
// handles a few models and hands over; a run that is killed is resumed after 4 minutes.
const SWEEP_BUDGET_MS = 40_000;
const SWEEP_MODELS = 4;
// Storage can serve a cached older copy of the job file for a short while after it is written,
// so runs never rely on reading back their own writes: each run receives its job state directly
// (from startJob, or in the handoff message), and only stops for a run that started later.
const supersededBy = async (job: Job) => {
  const latest = await readJson<Job>(jobPath(job.kind));
  return !!latest && latest.run_id !== job.run_id && new Date(latest.started ?? latest.updatedAt).getTime() > new Date(job.started ?? 0).getTime();
};
async function sweep(kind: Kind, start: Job) {
  const started = Date.now();
  downloadBudget = 2;
  parseBudget = 3;
  const from = start.done;
  const runId = start.run_id;
  const redo = start.redo;
  let job: Job = { ...start, kind };
  // One run per handoff: a duplicate finds the claim taken (a database-level check). The sequence
  // number advances even when the position does not (a model still waiting on downloads).
  const claimPath = `${DIR}/claims/${runId}/${from}-${start.seq ?? 0}.json`;
  try { await writeJson(claimPath, { claimedAt: new Date().toISOString() }, false); }
  catch (error) {
    if (/already exists|duplicate/i.test(message(error))) return;
    throw error;
  }
  if (await supersededBy(job)) return;
  const catalogue = await loadCatalogue(kind);
  let next = from;
  let failure: string | null = start.last_error ?? null;
  while (next < catalogue.length && next - from < SWEEP_MODELS && Date.now() - started < SWEEP_BUDGET_MS) {
    const item = catalogue[next];
    // Record which model is in progress, so a run that dies shows where.
    job = { ...job, at: item.id, updatedAt: new Date().toISOString() };
    await writeJson(jobPath(kind), job);
    let fresh = false;
    try {
      fresh = !(await find(kind, item.id, redo)).cached;
      const row = await readResult(kind, item.id);
      if (row) await indexResult(kind, row);
    } catch (error) {
      // Its datasheets are still downloading (a few per run): check the same model again next run.
      if (error instanceof Pending) break;
      failure = `${item.id}: ${message(error)}`; // One model's failure never stops the run.
    }
    next++;
    if (await supersededBy(job)) return; // A newer run took over.
    job = { ...job, done: next, running: next < job.total, last_error: failure, updatedAt: new Date().toISOString() };
    await writeJson(jobPath(kind), job);
    // A model that needed a new search used much of this run's CPU: the next one gets a fresh run.
    if (fresh) break;
  }
  if (next >= catalogue.length) return;
  try {
    const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/directory-datasheet`, {
      method: "POST", signal: AbortSignal.timeout(15_000),
      // The gateway rejects an apikey that differs from the bearer key ("Conflicting API keys").
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`, apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "" },
      body: JSON.stringify({ action: "continue", kind, job: { ...job, done: next, seq: (start.seq ?? 0) + 1 } }),
    });
    const text = await response.text();
    if (!response.ok || !text.includes('"ok":true')) throw new Error(`Collection handoff failed (HTTP ${response.status}: ${text.slice(0, 120)}); it resumes on the next status check`);
  } catch (error) {
    await writeJson(jobPath(kind), { ...job, done: next, last_error: message(error), updatedAt: new Date().toISOString() });
  }
}

/** A run that has not saved progress for 4 minutes has stopped (failed handoff, timeout). */
const stalled = (job: Job) => job.done < job.total && (job.running || !!job.last_error) && Date.now() - new Date(job.updatedAt).getTime() > 4 * 60_000;

async function startJob(kind: Kind, redo: boolean) {
  const catalogue = await loadCatalogue(kind);
  if (!catalogue.length) return json({ error: "Catalogue is empty" }, 400);
  const previous = await readJson<Job>(jobPath(kind));
  const outdated = previous?.v !== SEARCH_VERSION;
  if (!outdated && previous?.running && !stalled(previous) && Date.now() - new Date(previous.updatedAt).getTime() < 5 * 60_000)
    return json({ error: "Collection is already running" }, 409);
  const resume = !redo && !outdated && previous && previous.total === catalogue.length && previous.done < previous.total;
  // A run that died while on a model (e.g. over the CPU limit) skips that model when resumed.
  const skip = resume && stalled(previous) && previous.at === catalogue[previous.done]?.id ? 1 : 0;
  if (skip) {
    // Recorded, so the button offers the manufacturer search instead of a check that stops the run.
    const item = catalogue[previous!.done];
    const row = await saveResult(kind, item, { url: null, status: "not_found", checkedAt: new Date().toISOString(), note: "Not checked automatically: checking this model stopped the collection run" });
    await indexResult(kind, row).catch(() => { /* The saved result still answers a click on this model. */ });
  }
  const job: Job = { kind, run_id: crypto.randomUUID(), done: resume ? previous.done + skip : 0,
    total: catalogue.length, redo: resume ? previous.redo : redo, running: true,
    updatedAt: new Date().toISOString(), started: new Date().toISOString(), v: SEARCH_VERSION,
    last_error: skip ? `Skipped ${previous!.at}: the run stopped while checking it` : null };
  await writeJson(jobPath(kind), job);
  background(sweep(kind, job));
  return json({ started: true, kind, redo: job.redo, from: job.done });
}

/**
 * Each catalogue is collected automatically the first time, again from the start whenever the
 * search improves (new SEARCH_VERSION), and resumed when a run stalls. Other runs are admin-only.
 */
async function ensureCollecting(kind: Kind) {
  const job = await readJson<Job>(jobPath(kind));
  // A finished run is repeated daily: found datasheets are kept, and models whose researched
  // sources changed (or whose "not found" is old) are checked again.
  const finishedLongAgo = job && job.done >= job.total && Date.now() - new Date(job.updatedAt).getTime() > 86400_000;
  if (!job || job.v !== SEARCH_VERSION || stalled(job) || finishedLongAgo) await startJob(kind, false);
}

Deno.serve(async (req) => {
  downloadBudget = 2;
  parseBudget = 3;
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (!["GET", "POST"].includes(req.method)) return json({ error: "Method not allowed" }, 405);
  try {
    const url = new URL(req.url);
    const body: Record<string, unknown> = req.method === "POST" ? await req.json() : {};
    const param = (name: string) => body[name] ?? url.searchParams.get(name);
    const action = String(param("action") ?? "find");
    const kind = String(param("kind") ?? "robots") as Kind;
    if (!KINDS.includes(kind)) return json({ error: "Unknown kind" }, 400);
    if (action === "find") {
      const id = String(param("id") ?? "");
      if (!/^[A-Za-z0-9_-]{3,64}$/.test(id)) return json({ error: "Missing or invalid id" }, 400);
      const refresh = String(param("refresh")) === "true";
      if (refresh && !await isAdmin(req)) return json({ error: "Admins only" }, 403);
      let result;
      try { result = await find(kind, id, refresh); }
      catch (error) {
        if (error instanceof Pending) return json({ url: null, status: "error", note: "Datasheets for this model are still being collected; retry shortly" }, 503);
        throw error;
      }
      return json(result, result.status === "error" ? 503 : 200);
    }
    if (action === "index" || action === "status") {
      const rows = Object.values(await readIndex(kind));
      const valid = rows.filter((row) => row.status === "found" && row.url && isOfficialUrl(row.url, row.brand));
      // Visitors' index reads keep collection going: a stalled or outdated run resumes in the background.
      if (action === "index") background(ensureCollecting(kind));
      if (action === "index") {
        const links = linksOf(rows);
        return json({ index: links.found, none: links.none });
      }
      await ensureCollecting(kind);
      const job = await readJson<Job>(jobPath(kind));
      const counts = Object.fromEntries(["not_found", "unsupported", "error"].map((status) => [status, rows.filter((row) => row.status === status).length]));
      return json({ kind, withDatasheet: valid.length, total: (await loadCatalogue(kind)).length, counts, job });
    }
    if (action === "start") {
      if (!await isAdmin(req)) return json({ error: "Admins only" }, 403);
      const redo = String(param("redo")) === "true";
      return startJob(kind, redo);
    }
    if (action === "continue") {
      const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (!key || req.headers.get("Authorization") !== `Bearer ${key}`) return json({ error: "Forbidden" }, 403);
      const job = body.job as Job | undefined;
      if (!job || job.kind !== kind || !Number.isSafeInteger(job.done) || job.done < 0 || !/^[0-9a-f-]{36}$/i.test(String(job.run_id))) return json({ error: "Invalid continuation" }, 400);
      background(sweep(kind, job));
      return json({ ok: true });
    }
    return json({ error: "Unknown action" }, 400);
  } catch (error) { return json({ error: message(error) }, 500); }
});
