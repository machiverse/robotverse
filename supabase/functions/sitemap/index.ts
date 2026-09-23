// Dynamic sitemap generator.
// Returns:
//   (no kind)     -> <sitemapindex> referencing the child sitemaps
//   ?kind=pages   -> static pages + brand/city landing pages (with real listings)
//   ?kind=robots  -> every active robot detail URL
//   ?kind=parts   -> every active spare part detail URL + part brand pages
//   ?kind=blogs   -> every published blog + RoboBook post URL
//   ?kind=images  -> image sitemap (image:image entries from og_image / twitter_image)
//   ?kind=news    -> Google News sitemap (last 48h of blogs + community_posts)
// Note: bot-facing HTML snapshots for these URLs are served by the sibling
// `prerender` function: /functions/v1/prerender?path=<url-encoded path>

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SITE_URL = (Deno.env.get("PUBLIC_SITE_URL") ?? "https://www.robotverse.in").replace(/\/$/, "");
const SITEMAP_URL = `${SITE_URL}/sitemap.xml`;

// Fixed lastmod for hand-built static pages — never "now", which would tell
// crawlers the whole site changes on every fetch.
const STATIC_LASTMOD = "2026-09-23";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const xmlHeaders = () =>
  new Headers({
    ...corsHeaders,
    "content-type": "application/xml; charset=utf-8",
    "cache-control": "public, max-age=600, s-maxage=3600",
  });

type Client = ReturnType<typeof createClient>;

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// City aliases collapsed onto one canonical slug.
const CITY_ALIASES: Record<string, string> = {
  bangalore: "bengaluru",
  bengaluru: "bengaluru",
  bombay: "mumbai",
  madras: "chennai",
  calcutta: "kolkata",
  gurgaon: "gurugram",
};
const citySlug = (raw: string) => {
  const base = slugify(raw.split(",")[0] ?? "");
  return CITY_ALIASES[base] ?? base;
};

// Paths that must never appear in the sitemap (thin, duplicate, or out of market).
const EXCLUDED_PATHS = new Set([
  "/robots/city/germany",
  "/robots/city/dresden",
  "/robots/city/tokyo",
  "/parts/brand/st-ubli",
  "/parts/brand/markenlos",
  "/robots/brand/other",
]);

function xmlEscape(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]!));
}

function urlTag(path: string, lastmod?: string | null): string | null {
  if (EXCLUDED_PATHS.has(path)) return null;
  const loc = path.startsWith("http") ? path : `${SITE_URL}${path}`;
  const mod = lastmod ? `<lastmod>${lastmod}</lastmod>` : "";
  return `  <url><loc>${xmlEscape(loc)}</loc>${mod}</url>`;
}

const isoDay = (value?: string | null) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

function urlset(entries: Array<string | null>, extraNs = ""): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${extraNs}>
${entries.filter(Boolean).join("\n")}
</urlset>`;
}

async function fetchAll(supabase: Client, query: () => any) {
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
async function getSuppressed(supabase: Client) {
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

const notIn = (list: string[]) => `(${list.join(",") || "00000000-0000-0000-0000-000000000000"})`;

async function activeRobots(supabase: Client, supUsers: Set<string>) {
  return await fetchAll(supabase, () =>
    supabase
      .from("robots")
      .select("id, brand, location, updated_at, created_at")
      .eq("availability", "available")
      .not("seller_id", "in", notIn(Array.from(supUsers)))
  );
}

async function activeParts(supabase: Client, supUsers: Set<string>) {
  return await fetchAll(supabase, () =>
    supabase
      .from("spare_parts")
      .select("id, brand, category, updated_at, created_at")
      .not("seller_id", "in", notIn(Array.from(supUsers)))
  );
}

async function activeServices(supabase: Client, supUsers: Set<string>) {
  return await fetchAll(supabase, () =>
    supabase
      .from("services")
      .select("id, location, updated_at, created_at")
      .not("provider_id", "in", notIn(Array.from(supUsers)))
  );
}

async function buildPages(supabase: Client): Promise<string> {
  const { users: supUsers } = await getSuppressed(supabase);
  const [robots, parts, services] = await Promise.all([
    activeRobots(supabase, supUsers),
    activeParts(supabase, supUsers),
    activeServices(supabase, supUsers),
  ]);

  const staticPaths = [
    "/",
    "/robots",
    "/parts",
    "/services",
    "/robobook",
    "/logistics",
    "/financing",
    "/buyer-guide",
    "/seller-guide",
    "/contact",
    "/pricing",
  ];

  // Only emit a landing page when it has at least one real active listing.
  const count = (rows: any[], key: (r: any) => string | null) => {
    const map = new Map<string, number>();
    rows.forEach((r) => {
      const k = key(r);
      if (!k) return;
      map.set(k, (map.get(k) ?? 0) + 1);
    });
    return map;
  };

  const robotBrands = count(robots, (r) => (r.brand ? slugify(r.brand) : null));
  const robotCities = count(robots, (r) => (r.location ? citySlug(r.location) : null));
  const partBrands = count(parts, (p) => (p.brand ? slugify(p.brand) : null));
  const partCats = count(parts, (p) => (p.category ? slugify(p.category) : null));
  // Service city pages only — no multi-service combination doorway URLs.
  const serviceCities = count(services, (s) => (s.location ? citySlug(s.location) : null));

  const landing: string[] = [];
  const push = (map: Map<string, number>, prefix: string) => {
    map.forEach((n, slug) => {
      if (slug && n > 0) landing.push(`${prefix}${slug}`);
    });
  };
  push(robotBrands, "/robots/brand/");
  push(robotCities, "/robots/city/");
  push(partBrands, "/parts/brand/");
  push(partCats, "/parts/category/");
  push(serviceCities, "/services/");

  return urlset([
    ...staticPaths.map((p) => urlTag(p, STATIC_LASTMOD)),
    ...landing.map((p) => urlTag(p, STATIC_LASTMOD)),
  ]);
}

async function buildRobots(supabase: Client): Promise<string> {
  const { users: supUsers } = await getSuppressed(supabase);
  const rows = await activeRobots(supabase, supUsers);
  return urlset(rows.map((r) => urlTag(`/robots/${r.id}`, isoDay(r.updated_at ?? r.created_at))));
}

async function buildParts(supabase: Client): Promise<string> {
  const { users: supUsers } = await getSuppressed(supabase);
  const rows = await activeParts(supabase, supUsers);
  const brands = new Set<string>();
  rows.forEach((p) => p.brand && brands.add(slugify(p.brand)));
  return urlset([
    ...rows.map((p) => urlTag(`/parts/${p.id}`, isoDay(p.updated_at ?? p.created_at))),
    ...Array.from(brands).map((b) => urlTag(`/parts/brand/${b}`, STATIC_LASTMOD)),
  ]);
}

async function buildBlogs(supabase: Client): Promise<string> {
  const { ids: supIds } = await getSuppressed(supabase);
  const [blogs, posts] = await Promise.all([
    fetchAll(supabase, () =>
      supabase.from("blogs").select("id, slug, status, updated_at, created_at, published_at").eq("status", "published")
    ),
    fetchAll(supabase, () =>
      supabase
        .from("community_posts")
        .select("id, slug, status, updated_at, created_at, published_at")
        .eq("status", "published")
    ),
  ]);

  const entries = [
    ...blogs
      .filter((b) => !supIds.has(b.id))
      .map((b) => urlTag(`/blog/${b.slug || b.id}`, isoDay(b.updated_at ?? b.published_at ?? b.created_at))),
    ...posts
      .filter((p) => !supIds.has(p.id))
      .map((p) => urlTag(`/robobook/${p.slug || p.id}`, isoDay(p.updated_at ?? p.published_at ?? p.created_at))),
  ];
  return urlset(entries);
}

// Map content_type -> public URL path. Returns null when not publicly indexable.
function pathFor(contentType: string, slugOrId: string): string | null {
  switch (contentType) {
    case "robot": return `/robots/${slugOrId}`;
    case "spare_part": return `/parts/${slugOrId}`;
    case "service": return `/services/${slugOrId}`;
    case "blog": return `/blog/${slugOrId}`;
    case "community_post": return `/robobook/${slugOrId}`;
    default: return null;
  }
}

async function buildImages(supabase: Client): Promise<string> {
  const { users: supUsers, ids: supIds } = await getSuppressed(supabase);
  const rows = await fetchAll(supabase, () =>
    supabase
      .from("seo_metadata")
      .select("content_type, content_id, slug, canonical_url, og_image, twitter_image, title, meta_title, updated_at")
      .eq("status", "published")
      .or("og_image.not.is.null,twitter_image.not.is.null")
  );

  const entries = rows
    .filter((r: any) => !supIds.has(r.content_id) && !(r.content_type === "profile" && supUsers.has(r.content_id)))
    .map((r: any) => {
      const img = r.og_image || r.twitter_image;
      if (!img) return null;
      const path = r.canonical_url ?? pathFor(r.content_type, r.slug || r.content_id);
      if (!path || EXCLUDED_PATHS.has(path)) return null;
      const loc = path.startsWith("http") ? path : `${SITE_URL}${path}`;
      const caption = xmlEscape(r.meta_title || r.title || "");
      const mod = isoDay(r.updated_at);
      return `  <url>
    <loc>${xmlEscape(loc)}</loc>${mod ? `\n    <lastmod>${mod}</lastmod>` : ""}
    <image:image>
      <image:loc>${xmlEscape(img)}</image:loc>
      ${caption ? `<image:caption>${caption}</image:caption>` : ""}
    </image:image>
  </url>`;
    });

  return urlset(entries, `\n        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"`);
}

async function buildNews(supabase: Client): Promise<string> {
  const { users: supUsers, ids: supIds } = await getSuppressed(supabase);
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
      if (!path || EXCLUDED_PATHS.has(path)) return null;
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
    });

  return urlset(entries, `\n        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"`);
}

const hasUrls = (xml: string) => xml.includes("<loc>");

async function buildIndex(supabase: Client): Promise<string> {
  const children = ["pages", "robots", "parts", "blogs"];
  // images / news are only advertised when they actually contain URLs.
  const optional = await Promise.all([
    buildImages(supabase).then((xml) => (hasUrls(xml) ? "images" : null)).catch(() => null),
    buildNews(supabase).then((xml) => (hasUrls(xml) ? "news" : null)).catch(() => null),
  ]);
  optional.forEach((k) => k && children.push(k));

  const body = children
    .map((k) => `  <sitemap><loc>${xmlEscape(`${SITEMAP_URL}?kind=${k}`)}</loc></sitemap>`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</sitemapindex>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const kind = new URL(req.url).searchParams.get("kind") || "index";

    let xml: string;
    switch (kind) {
      case "pages": xml = await buildPages(supabase); break;
      case "robots": xml = await buildRobots(supabase); break;
      case "parts": xml = await buildParts(supabase); break;
      case "blogs": xml = await buildBlogs(supabase); break;
      case "images": xml = await buildImages(supabase); break;
      case "news": xml = await buildNews(supabase); break;
      case "index":
      default: xml = await buildIndex(supabase); break;
    }

    return new Response(xml, { headers: xmlHeaders() });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    console.error("sitemap error:", msg);
    return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<!-- sitemap error: ${xmlEscape(msg)} -->`, {
      status: 500,
      headers: xmlHeaders(),
    });
  }
});
