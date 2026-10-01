// Reads the public RoboDK library (robots, tools, axes) so the Directory catalogues can be
// checked for missing models. Read-only; only RoboDK's own hosts are fetched.
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });
const BUNDLE = "https://cdn.robodk.com/library-robots/bundlerdklib.js";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const q = new URL(req.url).searchParams;
  const action = q.get("action") ?? "peek";
  try {
    if (action === "peek") {
      const url = q.get("url") ?? BUNDLE;
      if (!/^https:\/\/(cdn\.)?robodk\.com\//.test(url)) return json({ error: "only robodk.com" }, 400);
      const body = await (await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } })).text();
      const keys = (q.get("q") ?? "UR5e,IRB 6700,fetch(,.json,https://").split(",");
      const span = Math.min(Number(q.get("span") ?? 300), 2000);
      return json({
        len: body.length,
        hits: keys.map((k) => {
          const idxs: number[] = [];
          let i = body.indexOf(k);
          while (i >= 0 && idxs.length < 3) { idxs.push(i); i = body.indexOf(k, i + 1); }
          return { k, count: body.split(k).length - 1, snips: idxs.map((x) => body.slice(Math.max(0, x - span), x + span)) };
        }),
      });
    }
    if (action === "missing") {
      // Every library item: {MT:"R"|"E"|..., N, F, I, IS, B, M, T, A, R, P, W, E, AP:[...]}
      const body = await (await fetch(BUNDLE, { headers: { "User-Agent": "Mozilla/5.0" } })).text();
      const items: Record<string, unknown>[] = [];
      for (const m of body.matchAll(/\{MT:"([A-Z]+)",([^{}]*?)\}/g)) {
        const o: Record<string, unknown> = { MT: m[1] };
        for (const f of m[2].matchAll(/(\w+):("(?:[^"\\]|\\.)*"|\[[^\]]*\]|-?[\d.]+(?:e-?\d+)?|!0|!1)/g)) {
          const v = f[2];
          o[f[1]] = v.startsWith('"') ? JSON.parse(v) : v.startsWith("[") ? JSON.parse(v) : v === "!0" ? true : v === "!1" ? false : Number(v);
        }
        items.push(o);
      }
      const types: Record<string, number> = {};
      items.forEach((o) => (types[o.MT as string] = (types[o.MT as string] ?? 0) + 1));
      const mt = q.get("mt");
      if (!mt) return json({ total: items.length, types, sample: Object.fromEntries(Object.keys(types).map((t) => [t, items.find((o) => o.MT === t)])) });
      // Compare with what the site already lists (by image name and by brand + model).
      const kind = q.get("kind") ?? "robots";
      const have: { b: string; m: string; img?: string }[] = await (await fetch(`https://www.robotverse.in/directory/${kind}.json`)).json().catch(() => []);
      const key = (b: unknown, m: unknown) => `${b} ${m}`.toLowerCase().replace(/[^a-z0-9]/g, "");
      const imgs = new Set(have.map((h) => h.img).filter(Boolean));
      const keys = new Set(have.map((h) => key(h.b, h.m)));
      const missing = items.filter((o) => o.MT === mt && !imgs.has(o.I as string) && !keys.has(key(o.B, o.M)));
      const off = Number(q.get("offset") ?? 0), lim = Math.min(Number(q.get("limit") ?? 400), 800);
      return json({ have: have.length, inLibrary: items.filter((o) => o.MT === mt).length, missing: missing.length, rows: missing.slice(off, off + lim).map(({ F: _f, N: _n, ...r }) => r) });
    }
    return json({ error: "unknown action" }, 400);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
