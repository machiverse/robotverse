// supabase/functions/directory-datasheet/index.ts
//
// Finds the official PDF datasheet (or product brochure) for each Directory model and remembers it,
// so the Directory and model pages can offer a "Datasheet (PDF)" button.
//
// Results live in the public "robot-images" storage bucket (no database tables):
//   directory/datasheets/<kind>/<id>.json   one result per model { url, title, source, host, checkedAt } or { url: null, … }
//   directory/datasheets/index-<kind>.json  { "<id>": "<pdf url>" } for every model with a datasheet
//
// GET or POST (JSON body or query string):
//   { action: "find", kind, id, refresh? }   -> find (or return the remembered) datasheet for one model (anyone)
//   { action: "start", kind?, redo? }        -> find datasheets for every model in the background (admin)
//   { action: "status", kind? }              -> how many models have a datasheet (anyone)
//   { action: "continue", kind, from, redo, token } -> next background batch (internal)
//
// Search order per model: the manufacturer's own websites, then the open web (DuckDuckGo, Bing).
// Only links that really return a PDF and mention the model or its series are accepted; datasheets,
// spec sheets and brochures rank above manuals. We link to the manufacturer's file — nothing is copied.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE_URL = (Deno.env.get("PUBLIC_SITE_URL") ?? "https://www.robotverse.in").replace(/\/$/, "");
const BUCKET = "robot-images";
const DIR = "directory/datasheets";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const NONE_TTL_DAYS = 21;
const BATCH = 6;
const KINDS = ["robots", "tools", "axes", "parts"] as const;
type Kind = (typeof KINDS)[number];

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });
const service = () => createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

/** Official websites per brand (same list the photo harvest uses, trimmed to the main ones). */
const OEM_SITES: Record<string, string[]> = {
  KUKA: ["kuka.com"], Fanuc: ["fanuc.eu", "fanucamerica.com", "fanuc.co.jp", "fanucindia.com"], ABB: ["abb.com", "library.e.abb.com"],
  "Yaskawa Motoman": ["motoman.com", "yaskawa.eu.com", "yaskawa.com"], Kawasaki: ["kawasakirobotics.com", "kawasakirobot.com"],
  Comau: ["comau.com"], Estun: ["estun.com", "estunrobotics.com"], Mitsubishi: ["mitsubishielectric.com"], Staubli: ["staubli.com"],
  "Techman Robot": ["tm-robot.com"], Omron: ["omron.com", "ia.omron.com", "industrial.omron.eu"], "Hyundai Robotics": ["hyundai-robotics.com"],
  Epson: ["epson.com", "epson.eu"], Brooks: ["brooks.com"], INOVANCE: ["inovance.eu", "inovance.com"], Nachi: ["nachi.com", "nachirobotics.com"],
  Rokae: ["rokae.com"], Dobot: ["dobot-robots.com", "dobot.cc"], Denso: ["densorobotics.com", "denso-wave.com"], AUBO: ["aubo-cobot.com", "aubo-robotics.com"],
  Efort: ["efort.com.cn", "efortrobot.com"], JAKA: ["jaka.com", "jakarobotics.com"], "Doosan Robotics": ["doosanrobotics.com"],
  "Shibaura Machine": ["shibaura-machine.co.jp"], "OTC Daihen": ["otc-daihen.de", "daihen-usa.com"], Siasun: ["siasun.com"], Neura: ["neura-robotics.com"],
  DUCO: ["ducorobots.com"], "Elite Robots": ["eliterobots.com"], "Universal Robots": ["universal-robots.com"], HIWIN: ["hiwin.com", "hiwin.tw"],
  Panasonic: ["panasonic.com"], uFactory: ["ufactory.cc", "ufactory.us"], Kinova: ["kinovarobotics.com"], Flexiv: ["flexiv.com"],
  Yamaha: ["yamaha-motor.com", "global.yamaha-motor.com"], CLOOS: ["cloos.de"], "Kassow Robots": ["kassowrobots.com"],
  "Rainbow Robotics": ["rainbow-robotics.com"], Neuromeka: ["neuromeka.com"], FAIRINO: ["frtech.fr", "fairino.com"], Hanwha: ["hanwharobotics.com"],
  "Delta Electronics": ["deltaww.com"], Schunk: ["schunk.com"], OnRobot: ["onrobot.com"], Robotiq: ["robotiq.com"], Schmalz: ["schmalz.com"],
  Zimmer: ["zimmer-group.com"], Festo: ["festo.com"], Piab: ["piab.com"], ATI: ["ati-ia.com"], Binzel: ["binzel-abicor.com"], Fronius: ["fronius.com"],
  Gudel: ["gudel.com"], "Güdel": ["gudel.com"],
};

type Item = { id: string; b: string; m: string; n: string };
type Result = { url: string | null; title?: string | null; source?: string; host?: string; checkedAt: string };
type Cand = { url: string; title: string; source: string };

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const hostOf = (u: string) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};
const decode = (s: string) => s.replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const strip = (s: string) => decode(s.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

async function get(url: string, ms = 12000, init: RequestInit = {}) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctl.signal, headers: { "User-Agent": UA, "Accept-Language": "en", ...(init.headers ?? {}) } });
  } finally {
    clearTimeout(t);
  }
}

/* ------------------------------------------------------------ search */

async function duck(q: string): Promise<Cand[]> {
  const r = await get(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`).catch(() => null);
  if (!r?.ok) return [];
  const html = await r.text();
  const out: Cand[] = [];
  for (const m of html.matchAll(/class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
    const href = decode(m[1]);
    const real = href.match(/uddg=([^&]+)/)?.[1];
    out.push({ url: real ? decodeURIComponent(real) : href, title: strip(m[2]), source: "duckduckgo" });
  }
  return out;
}

async function bing(q: string): Promise<Cand[]> {
  const r = await get(`https://www.bing.com/search?q=${encodeURIComponent(q)}&setlang=en`).catch(() => null);
  if (!r?.ok) return [];
  const html = await r.text();
  const out: Cand[] = [];
  for (const m of html.matchAll(/<li class="b_algo"[\s\S]*?<h2[^>]*><a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
    out.push({ url: decode(m[1]), title: strip(m[2]), source: "bing" });
  }
  return out;
}

const isPdfUrl = (u: string) => /\.pdf(\?|#|$)/i.test(u) || /[?&](file|format)=pdf/i.test(u);

/** Model tokens: exact model ("m20id25") and its series ("m20id"). */
const tokens = (it: Item) => {
  const exact = norm(it.m);
  const series = norm(it.m.split(/[\/\s]/)[0]);
  return { exact, series: series.length >= 3 ? series : exact };
};

function score(c: Cand, it: Item): number {
  const t = tokens(it);
  const hay = norm(`${c.url} ${c.title}`);
  if (!hay.includes(t.series) && !hay.includes(t.exact)) return -1;
  let s = 0;
  if (hay.includes(t.exact)) s += 4;
  const host = hostOf(c.url);
  if ((OEM_SITES[it.b] ?? []).some((d) => host.endsWith(d))) s += 6;
  const text = `${c.url} ${c.title}`.toLowerCase();
  if (/data[-_ ]?sheet|datasheet|spec(ification)?s?[-_ ]?sheet|product[-_ ]?sheet|leaflet|brochure|flyer/.test(text)) s += 3;
  if (/specification|technical[-_ ]data|spec/.test(text)) s += 1;
  if (/manual|maintenance|operator|instruction|handbuch/.test(text)) s -= 1;
  if (/price|quote|invoice|catalogue-full|tender/.test(text)) s -= 3;
  // Special editions (food, cleanroom, washdown…) only when the model itself is one.
  const variant = /food|clean[-_ ]?room|wash|foundry|explosion|atex|paint/.exec(text)?.[0];
  if (variant && !norm(it.n).includes(norm(variant))) s -= 1;
  return s;
}

/** True when the URL answers with a PDF (header or %PDF magic). */
async function isPdf(url: string): Promise<boolean> {
  try {
    const r = await get(url, 10000, { headers: { Range: "bytes=0-1023" } });
    if (!r.ok && r.status !== 206) return false;
    const type = r.headers.get("content-type") ?? "";
    if (/pdf/i.test(type)) {
      await r.body?.cancel();
      return true;
    }
    const buf = new Uint8Array(await r.arrayBuffer());
    return buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46; // %PDF
  } catch {
    return false;
  }
}

async function search(it: Item): Promise<Result> {
  const now = new Date().toISOString();
  const brandWord = it.b.split(" ")[0];
  const sites = OEM_SITES[it.b] ?? [];
  const queries: Array<() => Promise<Cand[]>> = [
    ...sites.slice(0, 2).map((s) => () => duck(`site:${s} ${it.m} datasheet pdf`)),
    () => duck(`"${it.m}" ${brandWord} datasheet filetype:pdf`),
    () => bing(`"${it.m}" ${brandWord} datasheet filetype:pdf`),
    () => duck(`${it.n} specifications pdf`),
  ];
  const seen = new Set<string>();
  const ranked: Array<Cand & { s: number }> = [];
  for (const q of queries) {
    const cands = await q().catch(() => [] as Cand[]);
    for (const c of cands) {
      if (!/^https?:\/\//.test(c.url) || !isPdfUrl(c.url) || seen.has(c.url)) continue;
      seen.add(c.url);
      const s = score(c, it);
      if (s >= 0) ranked.push({ ...c, s });
    }
    // Stop early once the manufacturer's own datasheet is among the candidates.
    if (ranked.some((c) => c.s >= 9)) break;
  }
  ranked.sort((a, b) => b.s - a.s);
  for (const c of ranked.slice(0, 4)) {
    if (await isPdf(c.url)) return { url: c.url, title: c.title || null, source: c.source, host: hostOf(c.url), checkedAt: now };
  }
  return { url: null, checkedAt: now };
}

/* ----------------------------------------------------------- storage */

const itemPath = (kind: Kind, id: string) => `${DIR}/${kind}/${id}.json`;
const indexPath = (kind: Kind) => `${DIR}/index-${kind}.json`;

async function readJson<T>(path: string): Promise<T | null> {
  const { data } = await service().storage.from(BUCKET).download(path);
  if (!data) return null;
  try {
    return JSON.parse(await data.text()) as T;
  } catch {
    return null;
  }
}
async function writeJson(path: string, value: unknown) {
  await service()
    .storage.from(BUCKET)
    .upload(path, new Blob([JSON.stringify(value)], { type: "application/json" }), { upsert: true, contentType: "application/json", cacheControl: "300" });
}
async function addToIndex(kind: Kind, updates: Record<string, string | null>) {
  const index = (await readJson<Record<string, string>>(indexPath(kind))) ?? {};
  for (const [id, url] of Object.entries(updates)) {
    if (url) index[id] = url;
    else delete index[id];
  }
  await writeJson(indexPath(kind), index);
  return Object.keys(index).length;
}

/** Spare parts and components live in the directory_parts table (read only). */
async function loadParts(): Promise<Item[]> {
  const out: Item[] = [];
  for (let from = 0; from < 50000; from += 1000) {
    const { data, error } = await service().from("directory_parts").select("id, brand, model, name").order("id").range(from, from + 999);
    if (error || !data) break;
    // deno-lint-ignore no-explicit-any
    out.push(...(data as any[]).map((p) => ({ id: String(p.id), b: String(p.brand ?? ""), m: String(p.model || p.name || ""), n: String(p.name || `${p.brand} ${p.model}`) })));
    if (data.length < 1000) break;
  }
  return out;
}

const catalogue: Partial<Record<Kind, Promise<Item[]>>> = {};
const loadCatalogue = (kind: Kind) =>
  (catalogue[kind] ??= (kind === "parts"
    ? loadParts()
    : get(`${SITE_URL}/directory/${kind}.json`, 20000).then((r) => (r.ok ? (r.json() as Promise<Item[]>) : []))
  ).catch(() => {
    delete catalogue[kind];
    return [] as Item[];
  }));

const fresh = (r: Result | null) =>
  !!r && (r.url !== null || Date.now() - new Date(r.checkedAt).getTime() < NONE_TTL_DAYS * 86400_000);

async function find(kind: Kind, id: string, refresh: boolean): Promise<Result & { cached: boolean }> {
  if (!refresh) {
    const known = await readJson<Result>(itemPath(kind, id));
    if (fresh(known)) return { ...known!, cached: true };
  }
  const it = (await loadCatalogue(kind)).find((i) => i.id === id);
  if (!it) throw new Error("Unknown model");
  const r = await search(it);
  await writeJson(itemPath(kind, id), r);
  await addToIndex(kind, { [id]: r.url });
  return { ...r, cached: false };
}

/* ------------------------------------------------------ admin + jobs */

async function isAdmin(req: Request) {
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return false;
  const userClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", { global: { headers: { Authorization: auth } } });
  const { data: u } = await userClient.auth.getUser();
  if (!u?.user) return false;
  const a = await userClient.rpc("is_admin_user");
  if (!a.error && a.data === true) return true;
  const b = await userClient.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
  return !b.error && b.data === true;
}

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void } | undefined;
const background = (p: Promise<unknown>) => {
  const safe = p.catch((e) => console.error("directory-datasheet background", e));
  if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(safe);
};
const FN_URL = `${Deno.env.get("SUPABASE_URL") ?? ""}/functions/v1/directory-datasheet`;
const jobToken = () => (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "").slice(-24);

/** One batch of the background sweep, then hand over to a fresh invocation for the next one. */
async function sweep(kind: Kind, from: number, redo: boolean) {
  const list = await loadCatalogue(kind);
  const batch = list.slice(from, from + BATCH);
  const updates: Record<string, string | null> = {};
  for (const it of batch) {
    try {
      const known = redo ? null : await readJson<Result>(itemPath(kind, it.id));
      if (fresh(known)) continue;
      const r = await search(it);
      await writeJson(itemPath(kind, it.id), r);
      updates[it.id] = r.url;
    } catch (e) {
      console.error("datasheet", it.id, e);
    }
  }
  const found = Object.keys(updates).length ? await addToIndex(kind, updates) : null;
  await writeJson(`${DIR}/job-${kind}.json`, { kind, done: Math.min(from + BATCH, list.length), total: list.length, found, updatedAt: new Date().toISOString(), running: from + BATCH < list.length });
  const next = from + BATCH;
  if (next < list.length) {
    await fetch(FN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`, apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "" },
      body: JSON.stringify({ action: "continue", kind, from: next, redo, token: jobToken() }),
    }).catch((e) => console.error("datasheet continue", e));
  }
}

/* ----------------------------------------------------------- handler */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = new URL(req.url);
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const p = (k: string) => (body as Record<string, unknown>)[k] ?? url.searchParams.get(k) ?? undefined;
    const action = String(p("action") ?? "find");
    const kind = String(p("kind") ?? "robots") as Kind;
    if (!KINDS.includes(kind)) return json({ error: "Unknown kind" }, 400);

    if (action === "find") {
      const id = String(p("id") ?? "");
      if (!/^[A-Za-z0-9_-]{3,64}$/.test(id)) return json({ error: "Missing or invalid id" }, 400);
      return json(await find(kind, id, String(p("refresh") ?? "") === "true"));
    }
    if (action === "status") {
      const index = (await readJson<Record<string, string>>(indexPath(kind))) ?? {};
      const job = await readJson<Record<string, unknown>>(`${DIR}/job-${kind}.json`);
      return json({ kind, withDatasheet: Object.keys(index).length, total: (await loadCatalogue(kind)).length, job });
    }
    if (action === "start") {
      if (!(await isAdmin(req))) return json({ error: "Admins only" }, 403);
      const redo = String(p("redo") ?? "") === "true";
      background(sweep(kind, 0, redo));
      return json({ started: true, kind, redo });
    }
    if (action === "continue") {
      if (String(p("token") ?? "") !== jobToken() || !jobToken()) return json({ error: "Forbidden" }, 403);
      background(sweep(kind, Number(p("from") ?? 0), p("redo") === true || p("redo") === "true"));
      return json({ ok: true });
    }
    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "failed" }, 500);
  }
});
