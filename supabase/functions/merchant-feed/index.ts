// Google Merchant Center RSS 2.0 product feed (robots + spare parts).
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { clampWords, SITE_URL } from "../_shared/seoText.ts";

const CATEGORY = "Business &amp; Industrial &gt; Manufacturing";

const esc = (v: unknown) =>
  String(v ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");

const stripTags = (s: unknown) =>
  String(s ?? "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

const abs = (u: string) => {
  const s = u.trim();
  if (!s) return "";
  if (s.startsWith("https://")) return s;
  if (s.startsWith("http://")) return "https://" + s.slice(7);
  if (s.startsWith("//")) return "https:" + s;
  return `${SITE_URL}${s.startsWith("/") ? "" : "/"}${s}`;
};

const imagesOf = (images: unknown): string[] => {
  const arr = Array.isArray(images) ? images : typeof images === "string" && images ? [images] : [];
  return arr.map((x) => abs(String(x ?? ""))).filter(Boolean);
};

const condition = (c?: string | null) => {
  const v = String(c ?? "").toLowerCase();
  if (v === "new" || v.startsWith("brand")) return "new";
  if (v.includes("refurb")) return "refurbished";
  return "used";
};

const cityOf = (loc?: string | null) => String(loc ?? "").split(",")[0].trim();

// Title parts mirror robotTitle()/partTitle() in _shared/seoText.ts, minus the " | RobotVerse" suffix.
const robotFeedTitle = (r: any) => {
  const cond = condition(r.condition);
  const lead = cond === "new" ? "New" : cond === "refurbished" ? "Refurbished" : "Used";
  return clampWords([
    lead, r.brand, r.model || r.name, r.robot_type ? (/robot|cobot/i.test(r.robot_type) ? r.robot_type : `${r.robot_type} Robot`) : "Robot",
    r.payload_capacity ? `${r.payload_capacity}kg Payload` : "",
    r.reach ? `${r.reach}mm Reach` : "",
  ].filter(Boolean).join(" "), 150);
};
const partFeedTitle = (p: any) =>
  clampWords([p.brand, p.name || p.part_number || "Robot Spare Part", p.part_number && p.name ? p.part_number : ""]
    .filter(Boolean).join(" "), 150);

const describe = (base: unknown, specs: [string, unknown][]) => {
  const specText = specs.filter(([, v]) => v != null && String(v).trim() !== "")
    .map(([k, v]) => `${k}: ${stripTags(v)}`).join(". ");
  const text = [stripTags(base), specText].filter(Boolean).join(" ");
  return text.length > 5000 ? text.slice(0, 5000) : text;
};

function item(o: {
  id: string; title: string; description: string; link: string; images: string[];
  price: number; currency: string; cond: string; brand?: string; mpn?: string;
  productType: string; city: string;
}) {
  const [main, ...rest] = o.images;
  const t = (k: string, v: unknown) => `<g:${k}>${esc(v)}</g:${k}>`;
  return [
    "<item>",
    t("id", o.id),
    t("title", o.title),
    t("description", o.description || o.title),
    t("link", o.link),
    t("image_link", main),
    ...rest.slice(0, 10).map((u) => t("additional_image_link", u)),
    t("price", `${o.price.toFixed(2)} ${o.currency}`),
    t("availability", "in_stock"),
    t("condition", o.cond),
    o.brand ? t("brand", o.brand) : "",
    o.mpn ? t("mpn", o.mpn) : t("identifier_exists", "no"),
    `<g:google_product_category>${CATEGORY}</g:google_product_category>`,
    t("product_type", o.productType),
    "<g:shipping><g:country>IN</g:country><g:service>Freight</g:service><g:price>0 INR</g:price></g:shipping>",
    o.brand ? t("custom_label_0", o.brand) : "",
    o.city ? t("custom_label_1", o.city) : "",
    "</item>",
  ].filter(Boolean).join("");
}

async function fetchAll(q: () => any) {
  const out: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await q().range(from, from + 999);
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: sup } = await sb.from("profiles").select("user_id").neq("account_status", "active");
    const suppressed = new Set((sup ?? []).map((r: any) => r.user_id));

    const robots = (await fetchAll(() => sb.from("robots").select("*").eq("availability", "available").order("id")))
      .filter((r) => !suppressed.has(r.seller_id));
    const parts = (await fetchAll(() => sb.from("spare_parts").select("*").gt("quantity", 0).order("id")))
      .filter((p) => !suppressed.has(p.seller_id));

    let noPrice = 0, noImage = 0, robotsIn = 0, partsIn = 0;
    const items: string[] = [];

    for (const r of robots) {
      const price = Number(r.price);
      if (!(price > 0)) { noPrice++; continue; }
      const imgs = imagesOf(r.images);
      if (!imgs.length) { noImage++; continue; }
      robotsIn++;
      items.push(item({
        id: `robot-${r.id}`, title: robotFeedTitle(r),
        description: describe(r.description, [
          ["Payload", r.payload_capacity ? `${r.payload_capacity} kg` : null],
          ["Reach", r.reach ? `${r.reach} mm` : null],
          ["Year", r.year_manufactured], ["Controller", r.controller_type],
          ["Condition", r.condition ? String(r.condition).replace(/[-_]+/g, " ") : null],
          ["Location", r.location],
        ]),
        link: `${SITE_URL}/robots/${r.id}`, images: imgs, price,
        currency: String(r.currency || "INR").toUpperCase(), cond: condition(r.condition),
        brand: r.brand || undefined, mpn: r.model || undefined,
        productType: `Industrial Robots > ${r.robot_type || "Robot"}`, city: cityOf(r.location),
      }));
    }

    for (const p of parts) {
      const price = Number(p.price);
      if (!(price > 0)) { noPrice++; continue; }
      const imgs = imagesOf(p.images);
      if (!imgs.length) { noImage++; continue; }
      partsIn++;
      items.push(item({
        id: `part-${p.id}`, title: partFeedTitle(p),
        description: describe(p.description, [
          ["Part number", p.part_number], ["Compatible with", p.compatible_models ?? p.compatibility],
          ["Condition", p.condition ? String(p.condition).replace(/[-_]+/g, " ") : null],
          ["Location", p.location],
        ]),
        link: `${SITE_URL}/parts/${p.id}`, images: imgs, price,
        currency: String(p.currency || "INR").toUpperCase(), cond: condition(p.condition),
        brand: p.brand || undefined, mpn: p.part_number || undefined,
        productType: `Robot Spare Parts > ${p.category || p.main_category || "Spare Part"}`, city: cityOf(p.location),
      }));
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
<title>RobotVerse Industrial Robots and Spare Parts</title>
<link>${SITE_URL}</link>
<description>New, used and refurbished industrial robots and robot spare parts from verified sellers in India.</description>
${items.join("\n")}
</channel>
</rss>`;

    const headers = new Headers(corsHeaders);
    headers.set("Content-Type", "application/xml; charset=utf-8");
    headers.set("Cache-Control", "public, max-age=3600");
    headers.set("x-skipped-no-price", String(noPrice));
    headers.set("x-skipped-no-image", String(noImage));
    headers.set("x-included-robots", String(robotsIn));
    headers.set("x-included-parts", String(partsIn));
    headers.set("Access-Control-Expose-Headers", "x-skipped-no-price, x-skipped-no-image, x-included-robots, x-included-parts");
    return new Response(xml, { headers });
  } catch (e) {
    console.error("merchant-feed failed", e);
    return new Response(JSON.stringify({ error: "feed_failed", details: String((e as any)?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
