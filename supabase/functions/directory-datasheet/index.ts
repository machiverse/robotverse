// Official PDF discovery. Writes only new datasheet files in the existing storage bucket.
import { createClient } from "npm:@supabase/supabase-js@2.99.1";
import { discoverDatasheet, type DatasheetResult } from "../_shared/datasheetDiscovery.ts";
import { isOfficialUrl, OEM_SITES, type DatasheetModel } from "../_shared/datasheetPolicy.ts";
import { DatasheetFiles } from "../_shared/datasheetFiles.ts";
import { pdfContainsModel } from "../_shared/datasheetPdf.ts";

const SITE_URL = (Deno.env.get("PUBLIC_SITE_URL") ?? "https://www.robotverse.in").replace(/\/$/, "");
const KINDS = ["robots", "tools", "axes", "parts"] as const;
type Kind = (typeof KINDS)[number];
type Row = DatasheetResult & { brand: string; model: string; catalog_id: string };
type Job = { kind: Kind; run_id: string; done: number; total: number; redo: boolean; running: boolean; updatedAt: string; last_error: string | null };
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
const saveResult = (kind: Kind, item: DatasheetModel, result: DatasheetResult) =>
  writeJson(resultPath(kind, item.id), { ...result, brand: item.b, model: item.m, catalog_id: item.id });

async function readIndex(kind: Kind) {
  return (await readJson<Record<string, Row>>(indexPath(kind))) ?? {};
}
// Only the collection worker writes the shared index. Visitor lookups write their
// own per-model files, so parallel visitors cannot overwrite one another's results.
async function indexResult(kind: Kind, row: Row) {
  const index = await readIndex(kind);
  index[row.catalog_id] = row;
  await writeJson(indexPath(kind), index);
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
  if (row.status === "unsupported" && OEM_SITES[item.b]?.length) return false;
  const ttl = row.status === "found" ? 30 * 86400_000 : row.status === "error" ? 60_000 : 21 * 86400_000;
  return Date.now() - new Date(row.checkedAt).getTime() < ttl;
}
async function find(kind: Kind, id: string, refresh: boolean): Promise<DatasheetResult & { cached: boolean }> {
  const item = (await loadCatalogue(kind)).find((entry) => entry.id === id);
  if (!item) throw new Error("Unknown model");
  if (!refresh) {
    const known = await readResult(kind, id);
    if (known && fresh(known, item)) return { ...known, cached: true };
  }
  let result: DatasheetResult;
  try { result = await discoverDatasheet(item, pdfContainsModel); }
  catch (error) { result = { url: null, status: "error", note: message(error), checkedAt: new Date().toISOString() }; }
  await saveResult(kind, item, result);
  return { ...result, cached: false };
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

// One model per invocation. Progress and claims are datasheet-only storage files.
async function sweep(kind: Kind, runId: string, from: number, redo: boolean) {
  const job = await readJson<Job>(jobPath(kind));
  if (!job || job.run_id !== runId || !job.running || job.done !== from) return;
  const claimPath = `${DIR}/claims/${runId}/${from}.json`;
  try { await writeJson(claimPath, { claimedAt: new Date().toISOString() }, false); }
  catch (error) {
    if (/already exists|duplicate/i.test(message(error))) return;
    throw error;
  }
  let next = from;
  let failure: string | null = null;
  try {
    const catalogue = await loadCatalogue(kind);
    if (from < catalogue.length) {
      const item = catalogue[from];
      await find(kind, item.id, redo);
      const row = await readResult(kind, item.id);
      if (row) await indexResult(kind, row);
      next = from + 1;
    }
  } catch (error) { failure = message(error); }
  const latest = await readJson<Job>(jobPath(kind));
  if (!latest || latest.run_id !== runId) return;
  const updated = { ...latest, done: next, running: !failure && next < latest.total,
    last_error: failure, updatedAt: new Date().toISOString() };
  await writeJson(jobPath(kind), updated);
  if (!updated.running) return;
  try {
    const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/directory-datasheet`, {
      method: "POST", signal: AbortSignal.timeout(15_000),
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`, apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "" },
      body: JSON.stringify({ action: "continue", kind, from: next, runId, redo }),
    });
    const accepted = await response.json();
    if (!response.ok || accepted.ok !== true) throw new Error("Collection handoff failed; resume from the admin panel");
  } catch (error) {
    const current = await readJson<Job>(jobPath(kind));
    if (current?.run_id === runId && current.done === next)
      await writeJson(jobPath(kind), { ...current, running: false, last_error: message(error), updatedAt: new Date().toISOString() });
  }
}

Deno.serve(async (req) => {
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
      const result = await find(kind, id, refresh);
      return json(result, result.status === "error" ? 503 : 200);
    }
    if (action === "index" || action === "status") {
      const rows = Object.values(await readIndex(kind));
      const valid = rows.filter((row) => row.status === "found" && row.url && isOfficialUrl(row.url, row.brand));
      if (action === "index") return json({ index: Object.fromEntries(valid.filter((row) => Date.now() - new Date(row.checkedAt).getTime() < 30 * 86400_000).map((row) => [row.catalog_id, row.url])) });
      const job = await readJson<Job>(jobPath(kind));
      const counts = Object.fromEntries(["not_found", "unsupported", "error"].map((status) => [status, rows.filter((row) => row.status === status).length]));
      return json({ kind, withDatasheet: valid.length, total: (await loadCatalogue(kind)).length, counts, job });
    }
    if (action === "start") {
      if (!await isAdmin(req)) return json({ error: "Admins only" }, 403);
      const redo = String(param("redo")) === "true";
      const catalogue = await loadCatalogue(kind);
      if (!catalogue.length) return json({ error: "Catalogue is empty" }, 400);
      const previous = await readJson<Job>(jobPath(kind));
      if (previous?.running && Date.now() - new Date(previous.updatedAt).getTime() < 5 * 60_000)
        return json({ error: "Collection is already running" }, 409);
      const resume = !redo && previous && previous.total === catalogue.length && previous.done < previous.total;
      const job: Job = { kind, run_id: crypto.randomUUID(), done: resume ? previous.done : 0,
        total: catalogue.length, redo: resume ? previous.redo : redo, running: true,
        updatedAt: new Date().toISOString(), last_error: null };
      await writeJson(jobPath(kind), job);
      background(sweep(kind, job.run_id, job.done, job.redo));
      return json({ started: true, kind, redo: job.redo, from: job.done });
    }

    if (action === "continue") {
      const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (!key || req.headers.get("Authorization") !== `Bearer ${key}`) return json({ error: "Forbidden" }, 403);
      const from = Number(param("from"));
      const runId = String(param("runId") ?? "");
      if (!Number.isSafeInteger(from) || from < 0 || !/^[0-9a-f-]{36}$/i.test(runId)) return json({ error: "Invalid continuation" }, 400);
      background(sweep(kind, runId, from, String(param("redo")) === "true"));
      return json({ ok: true });
    }
    return json({ error: "Unknown action" }, 400);
  } catch (error) { return json({ error: message(error) }, 500); }
});
