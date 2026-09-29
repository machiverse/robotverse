// supabase/functions/directory-photo-harvest/index.ts
//
// Finds a REAL photo for every Directory catalogue item (robots first), copies it
// into our storage and records it in public.directory_robot_images, so the
// Directory cards show real product photos instead of CAD renders.
//
// POST JSON:
//   { action: "status", kind? }                          -> counts per status (anyone)
//   { action: "run", kind?, offset?, limit?, retry?, ids? } -> harvest a batch (admin)
//   { action: "manual", kind?, id, imageUrl, pageUrl? }  -> store a photo the admin picked (admin)
//   { action: "reject", kind?, id }                      -> hide a wrong photo (admin)
//   { action: "list", kind?, status?, limit? }           -> recent rows for review (anyone)
//
// Search order per model:
//   1. The manufacturer's own website (Google restricted to the brand's sites, and its product pages)
//   2. Anywhere on the web for the exact model: Google Custom Search (if GOOGLE_CSE_KEY + GOOGLE_CSE_CX
//      are set), Bing images, DuckDuckGo images, then Wikimedia Commons (free-licence photos)
//   3. The model series (e.g. M-20iD for M-20iD/25) when the exact variant has no photo anywhere
// Candidates from the manufacturer's site, or naming the model, rank first.
// Each accepted photo is checked with AI vision (LOVABLE_API_KEY) to be a real
// product photo of that kind of equipment, resized (large + card thumbnail) and
// stored in the public "robot-images" bucket at directory/<kind>/<id>-photo[-sm].jpg.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Image } from "https://deno.land/x/imagescript@1.2.17/mod.ts";

const SITE_URL = (Deno.env.get("PUBLIC_SITE_URL") ?? "https://www.robotverse.in").replace(/\/$/, "");
const BUCKET = "robot-images";
const TABLE = "directory_robot_images";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });
const service = () => createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

/** Official websites per brand, used to prefer and to find manufacturer photos. */
const OEM_SITES: Record<string, string[]> = {
  KUKA: ["kuka.com"], Fanuc: ["fanuc.eu", "fanucamerica.com", "fanuc.co.jp", "fanucindia.com"], ABB: ["abb.com"],
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
  "Delta Electronics": ["deltaww.com"], "Schneider Electric": ["se.com"], Adept: ["omron.com"], "Codian Robotics": ["codian-robotics.com"],
};

type Item = { id: string; b: string; m: string; n: string; t?: string; c?: string };
type Candidate = { img: string; page?: string; title?: string; source: string };

/* ------------------------------------------------------------- utils */

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const hostOf = (u?: string) => {
  try {
    return u ? new URL(u).hostname.replace(/^www\./, "") : "";
  } catch {
    return "";
  }
};
const decodeEntities = (s: string) =>
  s.replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const BAD_URL = /logo|icon|favicon|sprite|banner|avatar|placeholder|badge|flag|\.svg|\.gif|thumbnail_default|qr[-_]?code/i;

async function get(url: string, ms = 12000, init: RequestInit = {}) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctl.signal, headers: { "User-Agent": UA, "Accept-Language": "en", ...(init.headers ?? {}) } });
  } finally {
    clearTimeout(t);
  }
}

/* ----------------------------------------------------------- sources */

async function googleImages(q: string, site?: string): Promise<Candidate[]> {
  const key = Deno.env.get("GOOGLE_CSE_KEY");
  const cx = Deno.env.get("GOOGLE_CSE_CX");
  if (!key || !cx) return [];
  const restrict = site ? `&siteSearch=${encodeURIComponent(site)}&siteSearchFilter=i` : "";
  const u = `https://www.googleapis.com/customsearch/v1?key=${key}&cx=${cx}&searchType=image&num=10&safe=active${restrict}&q=${encodeURIComponent(q)}`;
  const r = await get(u).catch(() => null);
  if (!r?.ok) return [];
  const d = await r.json();
  return (d.items ?? []).map((i: Record<string, any>) => ({ img: i.link, page: i.image?.contextLink, title: i.title, source: "google" }));
}

async function bingImages(q: string): Promise<Candidate[]> {
  const u = `https://www.bing.com/images/search?q=${encodeURIComponent(q)}&form=HDRSC2&qft=+filterui:imagesize-large&first=1`;
  const r = await get(u).catch(() => null);
  if (!r?.ok) return [];
  const html = await r.text();
  const out: Candidate[] = [];
  for (const m of html.matchAll(/class="iusc"[^>]*\sm="([^"]+)"/g)) {
    try {
      const meta = JSON.parse(decodeEntities(m[1]));
      if (meta.murl) out.push({ img: meta.murl, page: meta.purl, title: meta.t, source: "bing" });
    } catch {
      /* skip */
    }
    if (out.length >= 15) break;
  }
  return out;
}

async function ddgImages(q: string): Promise<Candidate[]> {
  // DuckDuckGo image results: a page token (vqd) first, then the JSON results.
  const page = await get(`https://duckduckgo.com/?q=${encodeURIComponent(q)}&iax=images&ia=images`).catch(() => null);
  if (!page?.ok) return [];
  const vqd = (await page.text()).match(/vqd=["']?([\d-]+)/)?.[1];
  if (!vqd) return [];
  const r = await get(`https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(q)}&vqd=${vqd}&f=,,,,,&p=1`, 12000, {
    headers: { Referer: "https://duckduckgo.com/", Accept: "application/json" },
  }).catch(() => null);
  if (!r?.ok) return [];
  const d = await r.json().catch(() => ({}));
  return (d.results ?? []).slice(0, 15).map((x: Record<string, string>) => ({ img: x.image, page: x.url, title: x.title, source: "duckduckgo" }));
}

async function wikimedia(q: string): Promise<Candidate[]> {
  // Free-licence photos on Wikimedia Commons.
  const u = `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=8&gsrsearch=${encodeURIComponent(q)}&prop=imageinfo&iiprop=url|mime&iiurlwidth=1200&origin=*`;
  const r = await get(u).catch(() => null);
  if (!r?.ok) return [];
  const d = await r.json().catch(() => ({}));
  return Object.values((d.query?.pages ?? {}) as Record<string, any>)
    .map((p) => ({ img: p.imageinfo?.[0]?.thumburl ?? p.imageinfo?.[0]?.url, page: p.imageinfo?.[0]?.descriptionurl, title: p.title, source: "wikimedia" }))
    .filter((c) => c.img && /jpe?g|png|webp/i.test(c.img));
}

/** Product pages on the brand's official sites: og:image plus large product images that name the model. */
async function oemPage(item: Item, model = item.m): Promise<Candidate[]> {
  const sites = OEM_SITES[item.b] ?? [];
  const out: Candidate[] = [];
  const token = norm(model.split(/[\/\s]/)[0]);
  for (const site of sites.slice(0, 2)) {
    const r = await get(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(`site:${site} ${model}`)}`).catch(() => null);
    if (!r?.ok) continue;
    const html = await r.text();
    const links = [...html.matchAll(/uddg=([^&"]+)/g)].map((m) => decodeURIComponent(m[1])).filter((l) => sites.some((s) => hostOf(l).endsWith(s)));
    for (const page of [...new Set(links)].slice(0, 2)) {
      const pr = await get(page).catch(() => null);
      if (!pr?.ok) continue;
      const ph = await pr.text();
      const title = ph.match(/<title>([^<]*)/i)?.[1];
      const og = ph.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i)?.[1] ?? ph.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)/i)?.[1];
      if (og) out.push({ img: new URL(decodeEntities(og), page).toString(), page, title, source: "oem-page" });
      for (const m of ph.matchAll(/<img[^>]+(?:data-src|src)=["']([^"']+\.(?:jpe?g|png|webp)[^"']*)["'][^>]*>/gi)) {
        const src = decodeEntities(m[1]);
        if (token.length >= 3 && norm(`${src} ${m[0]}`).includes(token)) {
          try {
            out.push({ img: new URL(src, page).toString(), page, title, source: "oem-page" });
          } catch {
            /* bad url */
          }
        }
        if (out.length >= 8) break;
      }
    }
    if (out.length) break;
  }
  return out;
}

/** Rank: manufacturer site first, then candidates naming the model; drop logos and icons. */
function rank(item: Item, cands: Candidate[]) {
  const sites = OEM_SITES[item.b] ?? [];
  const model = norm(item.m);
  const modelBase = norm(item.m.split(/[\/\s]/)[0]);
  const seen = new Set<string>();
  return cands
    .filter((c) => c.img && /^https?:\/\//.test(c.img) && !BAD_URL.test(c.img) && !seen.has(c.img) && (seen.add(c.img), true))
    .map((c) => {
      const text = norm(`${c.title ?? ""} ${c.img} ${c.page ?? ""}`);
      let score = 0;
      if (sites.some((s) => hostOf(c.page).endsWith(s) || hostOf(c.img).endsWith(s))) score += 50;
      if (text.includes(model)) score += 40;
      else if (modelBase.length >= 3 && text.includes(modelBase)) score += 20;
      if (text.includes(norm(item.b))) score += 10;
      if (c.source === "oem-page") score += 15;
      if (/ebay|aliexpress|alibaba|amazon|pinterest|youtube|facebook|instagram/.test(hostOf(c.page) + hostOf(c.img))) score -= 30;
      return { ...c, score };
    })
    .filter((c) => c.score >= 20)
    .sort((a, b) => b.score - a.score);
}

/* ------------------------------------------------------- verification */

async function verify(item: Item, kind: string, bytes: Uint8Array, mime: string): Promise<{ ok: boolean; note: string; checked: boolean }> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return { ok: true, note: "not verified (no AI key)", checked: false };
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  const dataUrl = `data:${mime};base64,${btoa(bin)}`;
  const what = kind === "robots" ? `industrial robot "${item.n}" (${item.t ?? "robot"})` : kind === "tools" ? `robot end-of-arm tool "${item.n}" (${item.c ?? "tool"})` : `robot external axis / positioner "${item.n}"`;
  const r = await get("https://ai.gateway.lovable.dev/v1/chat/completions", 25000, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      temperature: 0,
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Is this image a real product photo or official product image of a ${what}? It must clearly show the equipment itself (not a logo, chart, drawing, screenshot, document, person-only photo or a different kind of machine). Reply ONLY JSON: {"ok": true|false, "note": "short reason"}`,
            },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
    }),
  }).catch(() => null);
  if (!r?.ok) return { ok: true, note: `not verified (AI ${r?.status ?? "unreachable"})`, checked: false };
  try {
    const d = await r.json();
    const txt = String(d.choices?.[0]?.message?.content ?? "").replace(/```json|```/g, "");
    const j = JSON.parse(txt.slice(txt.indexOf("{"), txt.lastIndexOf("}") + 1));
    return { ok: !!j.ok, note: String(j.note ?? "").slice(0, 200), checked: true };
  } catch {
    return { ok: true, note: "not verified (unreadable AI answer)", checked: false };
  }
}

/* ----------------------------------------------------------- storing */

async function download(url: string) {
  const r = await get(url, 15000, { headers: { Accept: "image/avif,image/webp,image/*,*/*;q=0.8" } }).catch(() => null);
  if (!r?.ok) return null;
  const mime = (r.headers.get("content-type") ?? "").split(";")[0].trim();
  if (!/^image\/(jpeg|jpg|png|webp)$/.test(mime)) return null;
  const buf = new Uint8Array(await r.arrayBuffer());
  if (buf.length < 12_000 || buf.length > 8_000_000) return null;
  return { buf, mime };
}

/** Large (≤ 1000 px) and card (≤ 420 px) JPEG copies; falls back to the original if it cannot be decoded. */
async function resize(buf: Uint8Array, mime: string) {
  try {
    const img = await Image.decode(buf);
    if (img.width < 250 || img.height < 180) return null; // too small to be a product photo
    const fit = (max: number) => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      return img.clone().resize(Math.round(img.width * k), Math.round(img.height * k));
    };
    return { large: await fit(1000).encodeJPEG(84), small: await fit(420).encodeJPEG(80), mime: "image/jpeg", ext: "jpg" };
  } catch {
    return { large: buf, small: buf, mime, ext: mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg" };
  }
}

async function store(sb: ReturnType<typeof service>, kind: string, id: string, buf: Uint8Array, mime: string) {
  const sized = await resize(buf, mime);
  if (!sized) return null;
  const base = `directory/${kind}/${id}-photo`;
  const up = async (path: string, data: Uint8Array) => {
    const { error } = await sb.storage.from(BUCKET).upload(path, data, { contentType: sized.mime, upsert: true, cacheControl: "31536000" });
    if (error) throw error;
    return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  };
  const v = Date.now().toString(36);
  const image_url = `${await up(`${base}.${sized.ext}`, sized.large)}?v=${v}`;
  const thumb_url = `${await up(`${base}-sm.${sized.ext}`, sized.small)}?v=${v}`;
  return { image_url, thumb_url, storage_path: `${base}.${sized.ext}`, bytes: sized.large.length };
}

/* ----------------------------------------------------------- harvest */

/** Series name, e.g. "M-20iD/25" -> "M-20iD", "IRB 6700-150/3.20" -> "IRB 6700", "KR 210 R2700-2" -> "KR 210". */
function family(model: string) {
  const m = model.trim();
  const byDash = m.match(/^([A-Za-z]{1,5}[\s-]?\d{2,5}[A-Za-z]{0,4})/)?.[1];
  return byDash && byDash.length < m.length ? byDash : m.split(/[\/]/)[0].trim();
}

async function harvestOne(sb: ReturnType<typeof service>, kind: string, item: Item, deadline: number) {
  const noun = kind === "robots" ? "robot" : kind === "tools" ? "gripper tool" : "positioner";
  const base = { catalog_id: item.id, kind, brand: item.b, model: item.m, name: item.n, updated_at: new Date().toISOString() };
  const notes: string[] = [];
  const tried = new Set<string>();

  const attempt = async (cands: Candidate[], label: string, familyOnly = false) => {
    for (const c of cands.filter((c) => !tried.has(c.img)).slice(0, 4)) {
      if (Date.now() > deadline) return null;
      tried.add(c.img);
      const file = await download(c.img);
      if (!file) {
        notes.push(`${label}: download failed (${hostOf(c.img)})`);
        continue;
      }
      const check = await verify(item, kind, file.buf, file.mime);
      if (!check.ok) {
        notes.push(`${label}: vision rejected (${check.note})`);
        continue;
      }
      const saved = await store(sb, kind, item.id, file.buf, file.mime).catch((e) => {
        notes.push(`store failed: ${e?.message ?? e}`);
        return null;
      });
      if (!saved) continue;
      return {
        ...base, ...saved, status: "found", source: `${c.source}${familyOnly ? " (series photo)" : ""}`, source_image_url: c.img,
        source_page_url: c.page ?? null, verified: check.checked, verify_note: `${label}: ${check.note}`,
      };
    }
    return null;
  };

  const sites = OEM_SITES[item.b] ?? [];
  const exact = [`"${item.b}" "${item.m}"`, `${item.b} ${item.m} ${noun}`, `${item.m} industrial ${noun}`];

  // Stage 1: the manufacturer's own website.
  const oemCands = rank(item, [
    ...(sites.length ? await googleImages(`${item.m}`, sites[0]) : []),
    ...(await oemPage(item)),
  ]);
  let row = await attempt(oemCands, "manufacturer site");
  if (row) return row;

  // Stage 2: anywhere on the web, exact model.
  for (const q of exact) {
    if (Date.now() > deadline) break;
    const [g, b, d] = await Promise.all([googleImages(q), bingImages(q), ddgImages(q)]);
    row = await attempt(rank(item, [...g, ...b, ...d]), "web search");
    if (row) return row;
  }
  if (Date.now() < deadline) {
    row = await attempt(rank(item, await wikimedia(`${item.b} ${item.m}`)), "Wikimedia Commons");
    if (row) return row;
  }

  // Stage 3: the model series, when this exact variant has no photo anywhere.
  const fam = family(item.m);
  if (fam && fam !== item.m && Date.now() < deadline) {
    const famItem = { ...item, m: fam };
    const q = `${item.b} ${fam} ${noun}`;
    const [g, b, d, o] = await Promise.all([googleImages(q), bingImages(q), ddgImages(q), oemPage(item, fam)]);
    row = await attempt(rank(famItem, [...o, ...g, ...b, ...d]), `series ${fam}`, true);
    if (row) return row;
  }

  return { ...base, status: tried.size ? "rejected" : "not_found", verify_note: notes.slice(0, 5).join(" | ") || "no candidate photos found in any source" };
}

async function catalogue(kind: string): Promise<Item[]> {
  const r = await get(`${SITE_URL}/directory/${kind}.json`, 20000);
  if (!r.ok) throw new Error(`Could not load ${kind} catalogue from ${SITE_URL}`);
  return r.json();
}

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

/* ------------------------------------------------------------ server */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "status");
    const kind = ["robots", "tools", "axes"].includes(body.kind) ? body.kind : "robots";
    const sb = service();

    if (action === "status") {
      const items = await catalogue(kind);
      const { data } = await sb.from(TABLE).select("status").eq("kind", kind).limit(10000);
      const counts: Record<string, number> = { total: items.length, pending: items.length };
      for (const r of data ?? []) {
        counts[r.status] = (counts[r.status] ?? 0) + 1;
        counts.pending -= 1;
      }
      return json(counts);
    }
    if (action === "list") {
      let q = sb.from(TABLE).select("*").eq("kind", kind).order("updated_at", { ascending: false }).limit(Math.min(200, Number(body.limit) || 50));
      if (body.status) q = q.eq("status", String(body.status));
      const { data, error } = await q;
      if (error) throw error;
      return json({ rows: data });
    }

    if (!(await isAdmin(req))) return json({ error: "Admins only." }, 403);

    if (action === "run") {
      const items = await catalogue(kind);
      const { data: done } = await sb.from(TABLE).select("catalog_id,status,attempts").eq("kind", kind).limit(10000);
      const state = new Map((done ?? []).map((r) => [r.catalog_id, r]));
      const limit = Math.max(1, Math.min(6, Number(body.limit) || 3));
      // Stay well inside the edge function time limit; unfinished items are picked up next batch.
      const deadline = Date.now() + 110_000;
      const wanted = Array.isArray(body.ids) && body.ids.length
        ? items.filter((i) => body.ids.includes(i.id))
        : items.filter((i) => {
            const s = state.get(i.id);
            if (!s) return true;
            return body.retry ? ["not_found", "rejected", "error"].includes(s.status) && (s.attempts ?? 0) < 3 : false;
          });
      const batch = wanted.slice(0, limit);
      const results = [];
      // Two at a time; deep search can take several seconds per model.
      for (let i = 0; i < batch.length && Date.now() < deadline - 20_000; i += 2) {
        const part = await Promise.all(
          batch.slice(i, i + 2).map((item) =>
            harvestOne(sb, kind, item, deadline).catch((e) => ({
              catalog_id: item.id, kind, brand: item.b, model: item.m, name: item.n, status: "error",
              verify_note: String(e?.message ?? e).slice(0, 300), updated_at: new Date().toISOString(),
            })),
          ),
        );
        for (const row of part) {
          const attempts = ((state.get(row.catalog_id)?.attempts as number) ?? 0) + 1;
          await sb.from(TABLE).upsert({ ...row, attempts });
          results.push({ id: row.catalog_id, name: row.name, status: row.status, image: (row as any).thumb_url ?? null, note: (row as any).verify_note ?? "" });
        }
      }
      return json({ processed: results.length, remaining: Math.max(0, wanted.length - batch.length), results });
    }

    if (action === "manual") {
      const items = await catalogue(kind);
      const item = items.find((i) => i.id === body.id);
      if (!item) return json({ error: "Unknown catalogue id" }, 400);
      const file = await download(String(body.imageUrl ?? ""));
      if (!file) return json({ error: "Could not download that image (JPG/PNG/WebP, 12 KB–8 MB)." }, 400);
      const saved = await store(sb, kind, item.id, file.buf, file.mime);
      if (!saved) return json({ error: "Image too small to use." }, 400);
      const row = {
        catalog_id: item.id, kind, brand: item.b, model: item.m, name: item.n, ...saved, status: "manual", source: "manual",
        source_image_url: body.imageUrl, source_page_url: body.pageUrl ?? null, verified: true, verify_note: "chosen by admin", updated_at: new Date().toISOString(),
      };
      await sb.from(TABLE).upsert(row);
      return json({ ok: true, row });
    }

    if (action === "reject") {
      await sb.from(TABLE).update({ status: "rejected", verify_note: "hidden by admin", updated_at: new Date().toISOString() }).eq("catalog_id", String(body.id));
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("directory-photo-harvest", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
