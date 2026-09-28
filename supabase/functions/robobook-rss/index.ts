// RoboBook RSS 2.0 feed of published articles, blogs, videos and posts.
//
//   /functions/v1/robobook-rss                          -> latest 50 posts
//   /functions/v1/robobook-rss?category=Cobots          -> one category
//   /functions/v1/robobook-rss?type=video&limit=100     -> one post type, up to 200
//   /functions/v1/robobook-rss?list=categories          -> JSON list of category feeds
//
// Read only: selects published rows, writes nothing. The service role bypasses
// RLS, so only published posts are selected and suppressed accounts are skipped.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getSuppressedUserIds } from "../_shared/suppressed.ts";
import { BLOG_CATEGORIES, blogCategoryOf, blogCategorySlug } from "../_shared/blogCategories.ts";

const SITE_URL = (Deno.env.get("PUBLIC_SITE_URL") ?? "https://www.robotverse.in").replace(/\/$/, "");
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    // Characters XML 1.0 does not allow
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");

const plain = (html: unknown) =>
  String(html ?? "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const summary = (p: Row) => {
  const text = plain(p.excerpt) || plain(p.content);
  return text.length > 400 ? `${text.slice(0, 397).trimEnd()}…` : text;
};

type Row = Record<string, any>;

function imageOf(p: Row): string | null {
  const url = p.og_image || p.video_thumbnail || p.image_url || (p.media_type === "image" ? p.media_url : null);
  if (!url || typeof url !== "string") return null;
  return url.startsWith("http") ? url : `${SITE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

const mimeOf = (url: string) =>
  /\.png(\?|$)/i.test(url) ? "image/png" : /\.webp(\?|$)/i.test(url) ? "image/webp" : /\.gif(\?|$)/i.test(url) ? "image/gif" : "image/jpeg";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const wantCategory = (url.searchParams.get("category") || "").trim();
    const wantType = (url.searchParams.get("type") || "").trim();
    const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit")) || 50));

    const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const suppressed = new Set(await getSuppressedUserIds(admin));

    // Enough rows to fill a category feed after filtering.
    const pool = wantCategory ? 1000 : limit;
    const [community, blogs] = await Promise.all([
      admin
        .from("community_posts")
        .select("*")
        .eq("status", "published")
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(pool),
      !wantType || wantType === "blog"
        ? admin.from("blogs").select("*").eq("status", "published").order("published_at", { ascending: false, nullsFirst: false }).limit(pool)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (community.error) console.error("robobook-rss community_posts", community.error.message);
    if (blogs.error) console.error("robobook-rss blogs", blogs.error.message);

    let posts: Row[] = [
      ...(community.data ?? []).map((p: Row) => ({ ...p, _path: `/robobook/${p.slug || p.id}`, _type: p.post_type || "blog" })),
      ...(blogs.data ?? []).map((p: Row) => ({ ...p, _path: `/blog/${p.slug || p.id}`, _type: "blog" })),
    ]
      .filter((p) => !suppressed.has(p.author_id))
      .map((p) => ({ ...p, _category: blogCategoryOf(p), _date: new Date(p.published_at || p.created_at || Date.now()) }));

    if (url.searchParams.get("list") === "categories") {
      const counts = new Map<string, number>();
      posts.forEach((p) => counts.set(p._category, (counts.get(p._category) || 0) + 1));
      const feedBase = `${url.origin}${url.pathname}`;
      const list = [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count, feed: `${feedBase}?category=${encodeURIComponent(name)}`, page: `${SITE_URL}/robobook?category=${encodeURIComponent(name)}` }));
      return new Response(JSON.stringify({ all: feedBase, categories: list }, null, 2), {
        headers: { ...corsHeaders, "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=900" },
      });
    }

    if (wantType) posts = posts.filter((p) => p._type === wantType);
    if (wantCategory) {
      const want = wantCategory.toLowerCase();
      posts = posts.filter((p) => p._category.toLowerCase() === want || blogCategorySlug(p._category) === want);
    }
    posts.sort((a, b) => b._date.getTime() - a._date.getTime());
    posts = posts.slice(0, limit);

    // Author names in one request
    const ids = [...new Set(posts.map((p) => p.author_id).filter(Boolean))];
    const names = new Map<string, string>();
    if (ids.length) {
      const { data } = await admin.from("profiles").select("user_id, full_name, company_name").in("user_id", ids);
      (data ?? []).forEach((pr: Row) => names.set(pr.user_id, pr.full_name || pr.company_name || "RobotVerse"));
    }

    const categoryName = wantCategory
      ? BLOG_CATEGORIES.find((c) => c.name.toLowerCase() === wantCategory.toLowerCase() || blogCategorySlug(c.name) === wantCategory.toLowerCase())?.name ?? wantCategory
      : "";
    const blurb = BLOG_CATEGORIES.find((c) => c.name === categoryName)?.blurb;
    const title = categoryName ? `RoboBook: ${categoryName} | RobotVerse` : "RoboBook | RobotVerse";
    const pageLink = categoryName ? `${SITE_URL}/robobook?category=${encodeURIComponent(categoryName)}` : `${SITE_URL}/robobook`;
    const self = `${url.origin}${url.pathname}${url.search}`;
    const lastBuild = (posts[0]?._date ?? new Date()).toUTCString();

    const items = posts
      .map((p) => {
        const link = `${SITE_URL}${p._path}`;
        const img = imageOf(p);
        const tags = Array.isArray(p.tags) ? p.tags.filter(Boolean) : [];
        return `    <item>
      <title>${esc(p.title || summary(p).slice(0, 90) || "RoboBook post")}</title>
      <link>${esc(link)}</link>
      <guid isPermaLink="true">${esc(link)}</guid>
      <pubDate>${p._date.toUTCString()}</pubDate>
      <dc:creator>${esc(names.get(p.author_id) || "RobotVerse")}</dc:creator>
      <category>${esc(p._category)}</category>
${tags.map((t: string) => `      <category>${esc(t)}</category>`).join("\n")}
      <description>${esc(summary(p))}</description>
${img ? `      <enclosure url="${esc(img)}" type="${mimeOf(img)}" length="0" />\n      <media:content url="${esc(img)}" medium="image" />` : ""}
    </item>`;
      })
      .join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${esc(title)}</title>
    <link>${esc(pageLink)}</link>
    <atom:link href="${esc(self)}" rel="self" type="application/rss+xml" />
    <description>${esc(blurb ? `${blurb}. Articles from RoboBook, the RobotVerse industrial robotics community.` : "Articles, guides, videos and news on industrial robots and automation from RoboBook, the RobotVerse community.")}</description>
    <language>en-in</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <ttl>60</ttl>
    <image>
      <url>${SITE_URL}/robotverse-logo.jpg</url>
      <title>${esc(title)}</title>
      <link>${esc(pageLink)}</link>
    </image>
${items}
  </channel>
</rss>
`;
    return new Response(xml, {
      headers: { ...corsHeaders, "content-type": "application/rss+xml; charset=utf-8", "cache-control": "public, max-age=900, s-maxage=1800" },
    });
  } catch (e) {
    console.error("robobook-rss", e);
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><error>${esc(e instanceof Error ? e.message : "error")}</error>`, {
      status: 500,
      headers: { ...corsHeaders, "content-type": "application/xml; charset=utf-8" },
    });
  }
});
