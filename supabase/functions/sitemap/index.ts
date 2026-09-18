// Dynamic sitemap generator backed by public.seo_metadata.
// Returns:
//   ?kind=index   -> sitemap index referencing the three children (default)
//   ?kind=urls    -> standard urlset built from seo_metadata
//   ?kind=images  -> image sitemap (image:image entries from og_image / twitter_image)
//   ?kind=news    -> Google News sitemap (last 48h of blogs + community_posts)
// Note: bot-facing HTML snapshots for these URLs are served by the sibling
// `prerender` function: /functions/v1/prerender?path=<url-encoded path>


import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SITE_URL = (Deno.env.get("PUBLIC_SITE_URL") ?? "https://www.robotverse.in").replace(/\/$/, "");
const FN_URL = `${Deno.env.get("SUPABASE_URL")}/functions/v1/sitemap`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const xmlHeaders = {
  ...corsHeaders,
  "Content-Type": "application/xml; charset=utf-8",
  "Cache-Control": "public, max-age=600, s-maxage=3600",
};

// Map content_type -> public URL path. Returns null when not publicly indexable.
function pathFor(contentType: string, slugOrId: string): string | null {
  switch (contentType) {
    case "robot":          return `/robots/${slugOrId}`;
    case "spare_part":     return `/parts/${slugOrId}`;
    case "service":        return `/services/${slugOrId}`;
    case "blog":           return `/blogs/${slugOrId}`;
    case "community_post": return `/robobook/${slugOrId}`;
    case "profile":        return `/seller/${slugOrId}`;
    default:               return null;
  }
}

function xmlEscape(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]!));
}

async function fetchAll(supabase: ReturnType<typeof createClient>, query: () => any) {
  const pageSize = 1000;
  let from = 0;
  const all: any[] = [];
  while (true) {
    const { data, error } = await query().range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

// Moderation: this function uses the service role and therefore bypasses RLS,
// so it must apply the same suppression filter the database applies to browsers.
// Content owned by an account whose profiles.account_status is not 'active' is
// excluded. Suppression is reversible — nothing is deleted.
async function getSuppressed(supabase: ReturnType<typeof createClient>) {
  const users = new Set<string>();
  const ids = new Set<string>();
  try {
    const { data: sup } = await supabase.from("profiles").select("user_id").neq("account_status", "active");
    (sup ?? []).forEach((r: any) => r.user_id && users.add(r.user_id));
    if (users.size === 0) return { users, ids };
    const list = Array.from(users);
    const owned: Array<[string, string]> = [
      ["robots", "seller_id"],
      ["spare_parts", "seller_id"],
      ["services", "provider_id"],
      ["blogs", "author_id"],
      ["community_posts", "author_id"],
    ];
    for (const [table, col] of owned) {
      const { data } = await supabase.from(table).select("id").in(col, list);
      (data ?? []).forEach((r: any) => r.id && ids.add(r.id));
    }
  } catch (e) {
    console.error("suppression lookup failed:", e);
  }
  return { users, ids };
}

async function buildIndex(): Promise<string> {
  const now = new Date().toISOString();
  const children = ["urls", "images", "news"]
    .map((k) => `  <sitemap><loc>${FN_URL}?kind=${k}</loc><lastmod>${now}</lastmod></sitemap>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${children}
</sitemapindex>`;
}

async function buildUrls(supabase: ReturnType<typeof createClient>): Promise<string> {
  const { users: supUsers, ids: supIds } = await getSuppressed(supabase);
  const notSup = (list: string[]) => `(${list.join(",") || "00000000-0000-0000-0000-000000000000"})`;
  const rows = await fetchAll(supabase, () =>
    supabase
      .from("seo_metadata")
      .select("content_type, content_id, slug, canonical_url, updated_at")
      .eq("status", "published")
      .order("updated_at", { ascending: false })
  );

  const staticPages = [
    { p: "/", pr: "1.0", cf: "daily" },
    { p: "/robots", pr: "0.9", cf: "daily" },
    { p: "/parts", pr: "0.9", cf: "daily" },
    { p: "/services", pr: "0.8", cf: "weekly" },
    { p: "/blogs", pr: "0.8", cf: "daily" },
    { p: "/robobook", pr: "0.7", cf: "daily" },
    { p: "/logistics", pr: "0.7", cf: "weekly" },
    { p: "/financing", pr: "0.7", cf: "weekly" },
    { p: "/buyer-guide", pr: "0.6", cf: "monthly" },
    { p: "/seller-guide", pr: "0.6", cf: "monthly" },
    { p: "/contact", pr: "0.5", cf: "monthly" },
  ];

  // Programmatic landing pages — derived from distinct brands/cities/categories.
  const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const landing: string[] = [];

  const [{ data: robotsRows }, { data: partsRows }, { data: servicesRows }] = await Promise.all([
    supabase.from("robots").select("brand, location").not("seller_id", "in", notSup(Array.from(supUsers))).limit(2000),
    supabase.from("spare_parts").select("brand, category").not("seller_id", "in", notSup(Array.from(supUsers))).limit(2000),
    supabase.from("services").select("service_type, location").not("provider_id", "in", notSup(Array.from(supUsers))).limit(2000),
  ]);

  const robotBrands = new Set<string>();
  const cities = new Set<string>();
  (robotsRows ?? []).forEach((r: any) => {
    if (r.brand) robotBrands.add(slugify(r.brand));
    if (r.location) cities.add(slugify(r.location.split(",")[0]));
  });
  robotBrands.forEach((b) => landing.push(`/robots/brand/${b}`));
  cities.forEach((c) => c && landing.push(`/robots/city/${c}`));

  const partBrands = new Set<string>();
  const partCats = new Set<string>();
  (partsRows ?? []).forEach((p: any) => {
    if (p.brand) partBrands.add(slugify(p.brand));
    if (p.category) partCats.add(slugify(p.category));
  });
  partBrands.forEach((b) => landing.push(`/parts/brand/${b}`));
  partCats.forEach((c) => landing.push(`/parts/category/${c}`));

  const serviceTypes = new Set<string>();
  const serviceCities = new Set<string>();
  (servicesRows ?? []).forEach((s: any) => {
    if (s.service_type) serviceTypes.add(slugify(s.service_type));
    if (s.location) serviceCities.add(slugify(s.location.split(",")[0]));
  });
  serviceCities.forEach((c) => {
    if (!c) return;
    serviceTypes.forEach((t) => landing.push(`/services/${c}/${t}`));
  });

  const now = new Date().toISOString();
  const staticXml = staticPages
    .map((s) => `  <url><loc>${SITE_URL}${s.p}</loc><lastmod>${now}</lastmod><changefreq>${s.cf}</changefreq><priority>${s.pr}</priority></url>`)
    .concat(
      landing.map((p) => `  <url><loc>${SITE_URL}${p}</loc><lastmod>${now}</lastmod><changefreq>weekly</changefreq><priority>0.6</priority></url>`)
    )
    .join("\n");

  const dynXml = rows
    .filter((r: any) => !supIds.has(r.content_id) && !(r.content_type === "profile" && supUsers.has(r.content_id)))
    .map((r: any) => {
      const path = r.canonical_url
        ? null
        : pathFor(r.content_type, r.slug || r.content_id);
      const loc = r.canonical_url
        ? (r.canonical_url.startsWith("http") ? r.canonical_url : `${SITE_URL}${r.canonical_url}`)
        : path
        ? `${SITE_URL}${path}`
        : null;
      if (!loc) return null;
      return `  <url><loc>${xmlEscape(loc)}</loc><lastmod>${new Date(r.updated_at).toISOString()}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`;
    })
    .filter(Boolean)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticXml}
${dynXml}
</urlset>`;
}

async function buildImages(supabase: ReturnType<typeof createClient>): Promise<string> {
  const { users: supUsers, ids: supIds } = await getSuppressed(supabase);
  const rows = await fetchAll(supabase, () =>
    supabase
      .from("seo_metadata")
      .select("content_type, content_id, slug, canonical_url, og_image, twitter_image, title, meta_title")
      .eq("status", "published")
      .or("og_image.not.is.null,twitter_image.not.is.null")
  );

  const entries = rows
    .filter((r: any) => !supIds.has(r.content_id) && !(r.content_type === "profile" && supUsers.has(r.content_id)))
    .map((r: any) => {
      const img = r.og_image || r.twitter_image;
      if (!img) return null;
      const path = r.canonical_url ?? pathFor(r.content_type, r.slug || r.content_id);
      if (!path) return null;
      const loc = path.startsWith("http") ? path : `${SITE_URL}${path}`;
      const caption = xmlEscape(r.meta_title || r.title || "");
      return `  <url>
    <loc>${xmlEscape(loc)}</loc>
    <image:image>
      <image:loc>${xmlEscape(img)}</image:loc>
      ${caption ? `<image:caption>${caption}</image:caption>` : ""}
    </image:image>
  </url>`;
    })
    .filter(Boolean)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${entries}
</urlset>`;
}

async function buildNews(supabase: ReturnType<typeof createClient>): Promise<string> {
  const { users: supUsers, ids: supIds } = await getSuppressed(supabase);
  // News sitemap should only contain articles from the last 48 hours.
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const rows = await fetchAll(supabase, () =>
    supabase
      .from("seo_metadata")
      .select("content_type, content_id, slug, canonical_url, title, meta_title, lang, updated_at, generated_at")
      .eq("status", "published")
      .in("content_type", ["blog", "community_post"])
      .gte("updated_at", since)
      .order("updated_at", { ascending: false })
  );

  const entries = rows
    .filter((r: any) => !supIds.has(r.content_id) && !(r.content_type === "profile" && supUsers.has(r.content_id)))
    .map((r: any) => {
      const path = r.canonical_url ?? pathFor(r.content_type, r.slug || r.content_id);
      if (!path) return null;
      const loc = path.startsWith("http") ? path : `${SITE_URL}${path}`;
      const title = xmlEscape(r.meta_title || r.title || "Untitled");
      const lang = (r.lang || "en").split("-")[0];
      const pub = new Date(r.generated_at || r.updated_at).toISOString();
      return `  <url>
    <loc>${xmlEscape(loc)}</loc>
    <news:news>
      <news:publication>
        <news:name>RobotVerse</news:name>
        <news:language>${lang}</news:language>
      </news:publication>
      <news:publication_date>${pub}</news:publication_date>
      <news:title>${title}</news:title>
    </news:news>
  </url>`;
    })
    .filter(Boolean)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${entries}
</urlset>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const kind = url.searchParams.get("kind") || "index";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let xml: string;
    switch (kind) {
      case "urls":   xml = await buildUrls(supabase); break;
      case "images": xml = await buildImages(supabase); break;
      case "news":   xml = await buildNews(supabase); break;
      case "index":
      default:       xml = await buildIndex(); break;
    }

    return new Response(xml, { headers: xmlHeaders });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    console.error("sitemap error:", msg);
    return new Response(`<!-- sitemap error: ${msg} -->`, {
      status: 500,
      headers: xmlHeaders,
    });
  }
});
