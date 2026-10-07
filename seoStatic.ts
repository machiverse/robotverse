/**
 * Build-time SEO snapshot (Vite plugin).
 *
 * Crawlers that do not run JavaScript (GPTBot, ClaudeBot, PerplexityBot, Bingbot's first pass…)
 * otherwise receive the same index.html — the homepage title — for every URL. After the app is
 * built, this plugin:
 *   1. writes the live sitemaps from the `sitemap` edge function as static files
 *      (/sitemap.xml index + /sitemap-pages.xml, -robots, -parts, -blogs, -images);
 *   2. writes /<path>/index.html for every public URL in them, with that page's own title,
 *      description, canonical, Open Graph, robots and JSON-LD from the `seo-render` function,
 *      and the same text content inside <noscript> (identical to what users see — no cloaking);
 *   3. writes /llms-full.txt: every public page title and URL for AI assistants.
 * The SPA still boots normally on every page. Data comes from the database at publish time, so
 * every new robot, part, service or post is included automatically on the next publish; between
 * publishes the live sitemap function (listed in robots.txt) keeps search engines current.
 *
 * Never fails the build: without network or on any error it logs and leaves dist/ as it was.
 */
import fs from "node:fs/promises";
import path from "node:path";
import type { Plugin } from "vite";

const SITE = "https://www.robotverse.in";
const KINDS = ["pages", "robots", "parts", "blogs", "models", "images"] as const;
const MAX_PAGES = 8000;
const CONCURRENCY = 12;
const BUDGET_MS = 240_000;
const REQ_TIMEOUT_MS = 10_000;

type Snapshot = {
  status?: number;
  title?: string;
  description?: string;
  canonical?: string;
  image?: string;
  ogType?: string;
  robots?: string;
  jsonld?: unknown;
  bodyHtml?: string;
};

const escAttr = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escText = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function get(url: string, key: string, deadline: number): Promise<string | null> {
  if (Date.now() > deadline) return null;
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), REQ_TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: ctl.signal });
    return res.ok ? await res.text() : null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** Put one page's head tags and readable content into the built index.html. */
export function renderPage(template: string, s: Snapshot): string {
  const title = escText(s.title);
  const desc = escAttr(s.description);
  const canon = escAttr(s.canonical);
  const img = escAttr(s.image || `${SITE}/og-image.jpg`);
  let html = template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`)
    .replace(/<meta\s+name="description"[\s\S]*?\/>/, `<meta name="description" content="${desc}" />`)
    .replace(/<meta\s+name="robots"[\s\S]*?\/>/, `<meta name="robots" content="${escAttr(s.robots || "index,follow")}" />`)
    .replace(/<link\s+rel="canonical"[\s\S]*?\/>/, `<link rel="canonical" href="${canon}" />`)
    .replace(/<meta\s+property="og:title"[\s\S]*?\/>/, `<meta property="og:title" content="${escAttr(s.title)}" />`)
    .replace(/<meta\s+property="og:description"[\s\S]*?\/>/, `<meta property="og:description" content="${desc}" />`)
    .replace(/<meta\s+property="og:type"[\s\S]*?\/>/, `<meta property="og:type" content="${escAttr(s.ogType || "website")}" />`)
    .replace(/<meta\s+property="og:url"[\s\S]*?\/>/, `<meta property="og:url" content="${canon}" />`)
    .replace(/<meta\s+property="og:image"\s+content=[\s\S]*?\/>/, `<meta property="og:image" content="${img}" />`)
    .replace(/<meta\s+name="twitter:title"[\s\S]*?\/>/, `<meta name="twitter:title" content="${escAttr(s.title)}" />`)
    .replace(/<meta\s+name="twitter:description"[\s\S]*?\/>/, `<meta name="twitter:description" content="${desc}" />`)
    .replace(/<meta\s+name="twitter:image"[\s\S]*?\/>/, `<meta name="twitter:image" content="${img}" />`);
  if (s.jsonld) {
    const json = JSON.stringify(s.jsonld).replace(/</g, "\\u003c");
    html = html.replace("</head>", `  <script type="application/ld+json" data-seo-page>${json}</script>\n  </head>`);
  }
  if (s.bodyHtml) html = html.replace(/<div id="root"><\/div>/, `<div id="root"></div>\n    <noscript>${s.bodyHtml}</noscript>`);
  return html;
}

export default function seoStatic(env: Record<string, string>): Plugin {
  let outDir = "dist";
  return {
    name: "robotverse-seo-static",
    apply: "build",
    configResolved(c) {
      outDir = path.resolve(c.root, c.build.outDir);
    },
    async closeBundle() {
      const base = (env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
      const key = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || "";
      if (env.SEO_PRERENDER === "0" || !base || !key) return;
      const started = Date.now();
      const deadline = started + BUDGET_MS;
      const fn = (name: string, q: string) => `${base}/functions/v1/${name}?${q}`;
      try {
        const template = await fs.readFile(path.join(outDir, "index.html"), "utf8");

        // 1. Static sitemaps.
        const urls: string[] = [];
        const written: string[] = [];
        for (const kind of KINDS) {
          const xml = await get(fn("sitemap", `kind=${kind}`), key, deadline);
          if (!xml || !xml.includes("<loc>")) continue;
          await fs.writeFile(path.join(outDir, `sitemap-${kind}.xml`), xml);
          written.push(kind);
          if (kind !== "images") for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) urls.push(m[1].replace(/&amp;/g, "&"));
        }
        if (!written.length) {
          console.log("[seo-static] sitemap not reachable — skipped (site builds as before)");
          return;
        }
        const today = new Date().toISOString().slice(0, 10);
        await fs.writeFile(
          path.join(outDir, "sitemap.xml"),
          `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
            written.map((k) => `  <sitemap><loc>${SITE}/sitemap-${k}.xml</loc><lastmod>${today}</lastmod></sitemap>`).join("\n") +
            `\n</sitemapindex>\n`,
        );

        // 2. Per-page HTML with its own head and content.
        const paths = [...new Set(urls.map((u) => { try { return new URL(u).pathname; } catch { return ""; } }))]
          .filter((p) => p && p !== "/" && !p.includes(".."))
          .slice(0, MAX_PAGES);
        const index: { path: string; title: string }[] = [];
        let next = 0;
        let done = 0;
        const worker = async () => {
          while (next < paths.length && Date.now() < deadline) {
            const p = paths[next++];
            const raw = await get(fn("seo-render", `path=${encodeURIComponent(p)}`), key, deadline);
            if (!raw) continue;
            let snap: Snapshot;
            try {
              snap = JSON.parse(raw);
            } catch {
              continue;
            }
            if (snap.status !== 200 || !snap.title || /noindex/.test(snap.robots || "")) continue;
            const dir = path.join(outDir, ...decodeURIComponent(p).split("/").filter(Boolean));
            if (!dir.startsWith(outDir)) continue;
            await fs.mkdir(dir, { recursive: true });
            await fs.writeFile(path.join(dir, "index.html"), renderPage(template, snap));
            index.push({ path: p, title: snap.title });
            done++;
          }
        };
        await Promise.all(Array.from({ length: CONCURRENCY }, worker));

        // 3. Full page list for AI assistants.
        if (index.length) {
          index.sort((a, b) => a.path.localeCompare(b.path));
          const groups: Record<string, string> = { directory: "Robot, tool and axis specifications", robots: "Industrial robots", parts: "Robot spare parts", services: "Robotics services", blog: "Articles", blogs: "Articles", robobook: "RoboBook", auctions: "Auctions", "robot-talent": "Jobs", financing: "Financing", logistics: "Logistics" };
          const by = new Map<string, string[]>();
          for (const e of index) {
            const g = groups[e.path.split("/")[1]] ?? "Pages";
            by.set(g, [...(by.get(g) ?? []), `- [${e.title.replace(/[[\]]/g, "")}](${SITE}${e.path})`]);
          }
          const body = [...by.entries()].map(([g, lines]) => `## ${g}\n\n${lines.join("\n")}`).join("\n\n");
          await fs.writeFile(
            path.join(outDir, "llms-full.txt"),
            `# RobotVerse — every public page\n\n> India's marketplace for new, used and refurbished industrial robots, robot spare parts, automation services, auctions, logistics and financing. Updated ${today}. Summary: ${SITE}/llms.txt\n\n${body}\n`,
          );
        }
        console.log(`[seo-static] sitemaps: ${written.join(", ")} · pages with their own HTML: ${done}/${paths.length} · ${Math.round((Date.now() - started) / 1000)} s`);
      } catch (e) {
        console.log("[seo-static] skipped:", e instanceof Error ? e.message : e);
      }
    },
  };
}
