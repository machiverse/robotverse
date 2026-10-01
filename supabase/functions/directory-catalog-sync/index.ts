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
    return json({ error: "unknown action" }, 400);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
