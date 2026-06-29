// aeo-render: server-side HTML renderer for AI crawlers (GPTBot,
// PerplexityBot, ClaudeBot, Google-Extended, etc).
//
// Reads seo_metadata for the requested path and returns a self-contained
// HTML document with title, meta, JSON-LD, summary, highlights, and FAQ
// baked into the body — no JS execution required.
//
// Usage:
//   GET /functions/v1/aeo-render?path=/robots/<id>
//
// Optional reverse-proxy / CDN rewrite: route AI-bot user-agents to this
// function instead of the SPA.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SITE_URL = (Deno.env.get("PUBLIC_SITE_URL") ?? "https://www.robotverse.in").replace(/\/$/, "");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function xmlEscape(s: string): string {
  return String(s ?? "").replace(/[<>&'"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&#39;", '"': "&quot;" }[c]!)
  );
}

function pathToLookup(path: string): { content_type: string; key: string } | null {
  const segs = path.split("?")[0].split("/").filter(Boolean);
  if (segs.length < 2) return null;
  const [a, b, c] = segs;
  if (a === "robots" && b && b !== "city" && b !== "brand" && b !== "compare") return { content_type: "robot", key: b };
  if (a === "parts" && b && b !== "brand" && b !== "category") return { content_type: "spare_part", key: b };
  if (a === "services" && b) return { content_type: "service", key: b };
  if ((a === "blogs" || a === "blog") && b) return { content_type: "blog", key: b };
  if (a === "robobook" && b && b !== "create") return { content_type: "community_post", key: b };
  return null;
}

function renderHtml(meta: any, path: string): string {
  const url = `${SITE_URL}${path}`;
  const title = meta.meta_title || meta.title || "RobotVerse";
  const desc = meta.meta_description || meta.summary || "";
  const ogImage = meta.og_image || meta.twitter_image || "";
  const faq = Array.isArray(meta.faq) ? meta.faq : [];
  const highlights = Array.isArray(meta.highlights) ? meta.highlights : [];
  const jsonld = meta.jsonld;

  const faqSchema = faq.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faq.map((q: any) => ({
          "@type": "Question",
          name: q.question,
          acceptedAnswer: { "@type": "Answer", text: q.answer },
        })),
      }
    : null;

  return `<!doctype html>
<html lang="${xmlEscape(meta.lang || "en")}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${xmlEscape(title)}</title>
<meta name="description" content="${xmlEscape(desc)}" />
<link rel="canonical" href="${xmlEscape(meta.canonical_url || url)}" />
<meta property="og:title" content="${xmlEscape(title)}" />
<meta property="og:description" content="${xmlEscape(desc)}" />
<meta property="og:url" content="${xmlEscape(url)}" />
${ogImage ? `<meta property="og:image" content="${xmlEscape(ogImage)}" />` : ""}
<meta name="twitter:card" content="summary_large_image" />
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : ""}
${faqSchema ? `<script type="application/ld+json">${JSON.stringify(faqSchema)}</script>` : ""}
</head>
<body>
<main>
<h1>${xmlEscape(title)}</h1>
${desc ? `<p>${xmlEscape(desc)}</p>` : ""}
${meta.rich_description ? `<section><h2>Description</h2><div>${xmlEscape(meta.rich_description)}</div></section>` : ""}
${meta.summary ? `<section><h2>Overview</h2><p>${xmlEscape(meta.summary)}</p></section>` : ""}
${highlights.length ? `<section><h2>Key highlights</h2><ul>${highlights
  .map((h: any) => `<li>${typeof h === "string" ? xmlEscape(h) : `<strong>${xmlEscape(h.title || "")}</strong> ${xmlEscape(h.text || "")}`}</li>`)
  .join("")}</ul></section>` : ""}
${faq.length ? `<section><h2>Frequently asked questions</h2>${faq
  .map((q: any) => `<article><h3>${xmlEscape(q.question)}</h3><p>${xmlEscape(q.answer)}</p></article>`)
  .join("")}</section>` : ""}
<p><a href="${xmlEscape(url)}">View the interactive page on RobotVerse</a></p>
</main>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const path = url.searchParams.get("path") ?? "/";
    const lookup = pathToLookup(path);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let meta: any = null;
    if (lookup) {
      const { data } = await supabase
        .from("seo_metadata")
        .select("*")
        .eq("content_type", lookup.content_type)
        .or(`content_id.eq.${lookup.key},slug.eq.${lookup.key}`)
        .eq("status", "published")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      meta = data;
    }

    if (!meta) {
      meta = {
        title: "RobotVerse — India's Industrial Robot Marketplace",
        meta_description:
          "Buy and sell used industrial robots, spare parts, and services. Verified sellers, transparent pricing, end-to-end logistics.",
      };
    }

    const html = renderHtml(meta, path);
    return new Response(html, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=300, s-maxage=1800",
        "X-Robots-Tag": "index, follow",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    console.error("aeo-render error:", msg);
    return new Response(`<!-- aeo-render error: ${msg} -->`, {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "text/html" },
    });
  }
});
