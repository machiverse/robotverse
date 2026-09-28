// supabase/functions/robot-news/index.ts
//
// RoboBook → Industry News: industrial robot and automation news collected from
// public RSS feeds (IFR via Google News, trade publications) and refreshed every 4 hours.
//
//   GET                -> { updatedAt, nextUpdateAt, items, sources }
//   GET ?refresh=1     -> refresh now (at most once every 15 minutes)
//
// No database or scheduler: the collected list is one JSON file in the public
// "robot-images" bucket (news/robot-news.json). When it is older than 4 hours the
// next visitor's request refreshes it. Only headline, source, date, a short
// summary and the link are kept; readers open the full story on the publisher's site.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { blogCategoryOf } from "../_shared/blogCategories.ts";

const BUCKET = "robot-images";
const PATH = "news/robot-news.json";
const REFRESH_MS = 4 * 60 * 60 * 1000;
const MIN_FORCE_MS = 15 * 60 * 1000;
const KEEP_DAYS = 45;
const MAX_ITEMS = 300;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const gnews = (q: string) => `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-IN&gl=IN&ceid=IN:en`;

// name, url, whether every item is on-topic (dedicated robotics feeds) or needs the keyword filter
const FEEDS: [string, string, boolean][] = [
  ["IFR (International Federation of Robotics)", gnews('"International Federation of Robotics" OR "IFR" robots'), false],
  ["Industrial robots · Google News", gnews('"industrial robot" OR "industrial robots" OR cobot'), false],
  ["Robotics India · Google News", gnews("robotics automation India manufacturing"), false],
  ["The Robot Report", "https://www.therobotreport.com/feed/", true],
  ["Robotics & Automation News", "https://roboticsandautomationnews.com/feed/", true],
  ["IEEE Spectrum Robotics", "https://spectrum.ieee.org/feeds/topic/robotics.rss", true],
  ["Automation World", "https://www.automationworld.com/rss.xml", false],
  ["Robotics 24/7", "https://www.robotics247.com/rss/", true],
];

const RELEVANT =
  /\b(robot\w*|cobot\w*|automation|automated|palletiz\w*|welding|end effector|gripper|machine tending|industry 4\.0|smart factory|ifr|fanuc|kuka|abb robotics|yaskawa|universal robots|kawasaki robotics|staubli|doosan robotics|techman|denso wave|epson robots)\b/i;
const OFF_TOPIC = /\b(robotic surgery|surgical robot|robot vacuum|robotaxi|humanoid dance|toy robot)\b/i;

export interface NewsItem {
  id: string;
  title: string;
  link: string;
  source: string;
  published: string;
  summary: string;
  image: string | null;
  category: string;
}

const admin = () => createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
const publicUrl = () => `${Deno.env.get("SUPABASE_URL")}/storage/v1/object/public/${BUCKET}/${PATH}`;

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", "#39": "'", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", ndash: "–", mdash: "—", hellip: "…" };
const decode = (s: string) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z0-9#]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
const strip = (html: string) => decode(decode(html)).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

const tag = (block: string, name: string) => {
  const m = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i").exec(block);
  return m ? m[1] : "";
};
const attr = (block: string, name: string, a: string) => {
  const m = new RegExp(`<${name}\\b[^>]*\\b${a}=["']([^"']+)["']`, "i").exec(block);
  return m ? decode(m[1]) : "";
};

function imageOf(block: string): string | null {
  const candidates = [
    attr(block, "media:content", "url"),
    attr(block, "media:thumbnail", "url"),
    /type=["']image/i.test(block) ? attr(block, "enclosure", "url") : "",
    (/<img[^>]+src=["']([^"']+)["']/i.exec(decode(tag(block, "content:encoded") || tag(block, "description"))) || [])[1] || "",
  ];
  const url = candidates.find((u) => /^https:\/\//.test(u) && !/(feedburner|pixel|1x1|spacer)/i.test(u));
  return url || null;
}

async function hash(s: string) {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].slice(0, 8).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function parseFeed(xml: string, feedName: string, dedicated: boolean): Promise<NewsItem[]> {
  const blocks = xml.match(/<item\b[\s\S]*?<\/item>|<entry\b[\s\S]*?<\/entry>/gi) || [];
  const out: NewsItem[] = [];
  for (const b of blocks.slice(0, 60)) {
    let title = strip(tag(b, "title"));
    let link = decode(tag(b, "link")).trim() || attr(b, "link", "href");
    const dateRaw = tag(b, "pubDate") || tag(b, "published") || tag(b, "updated") || tag(b, "dc:date");
    const date = new Date(strip(dateRaw));
    if (!title || !/^https?:\/\//.test(link) || isNaN(date.getTime())) continue;
    // Google News titles end with " - Publisher"; use that as the source.
    let source = strip(tag(b, "source")) || feedName;
    if (feedName.includes("Google News") || feedName.startsWith("IFR")) {
      const m = / - ([^-]{2,60})$/.exec(title);
      if (m) {
        source = source === feedName ? m[1].trim() : source;
        title = title.slice(0, m.index).trim();
      }
    }
    const summaryFull = strip(tag(b, "description") || tag(b, "summary") || tag(b, "content"));
    const summary = summaryFull.length > 280 ? `${summaryFull.slice(0, 277).trimEnd()}…` : summaryFull;
    const text = `${title} ${summaryFull}`;
    if (OFF_TOPIC.test(text)) continue;
    if (!dedicated && !RELEVANT.test(text)) continue;
    link = link.replace(/[?&]utm_[^&]+/g, "");
    out.push({
      id: await hash(title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()),
      title,
      link,
      source,
      published: date.toISOString(),
      summary: summary === title ? "" : summary,
      image: imageOf(b),
      category: blogCategoryOf({ title, excerpt: summaryFull }),
    });
  }
  return out;
}

async function fetchFeed([name, url, dedicated]: [string, string, boolean]) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 9000);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": "RobotVerse-News/1.0 (+https://www.robotverse.in/robobook/news)", Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml" } });
    if (!r.ok) return { name, ok: false, items: [] as NewsItem[] };
    return { name, ok: true, items: await parseFeed(await r.text(), name, dedicated) };
  } catch {
    return { name, ok: false, items: [] as NewsItem[] };
  } finally {
    clearTimeout(t);
  }
}

type Stored = { updatedAt: string; items: NewsItem[]; sources: { name: string; ok: boolean; count: number }[] };

async function readStored(): Promise<Stored | null> {
  try {
    const r = await fetch(`${publicUrl()}?t=${Date.now()}`, { headers: { "Cache-Control": "no-cache" } });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}

async function refresh(previous: Stored | null): Promise<Stored> {
  const results = await Promise.all(FEEDS.map(fetchFeed));
  const cutoff = Date.now() - KEEP_DAYS * 86_400_000;
  const byId = new Map<string, NewsItem>();
  // New items first, then previously stored ones, so stories stay listed between refreshes.
  for (const it of [...results.flatMap((r) => r.items), ...(previous?.items ?? [])]) {
    if (new Date(it.published).getTime() < cutoff || new Date(it.published).getTime() > Date.now() + 86_400_000) continue;
    const existing = byId.get(it.id);
    if (!existing) {
      byId.set(it.id, it);
      continue;
    }
    // Same story twice: prefer the publisher's own link over a Google News redirect, keep any image.
    const viaGoogle = (n: NewsItem) => n.link.includes("news.google.");
    const best = viaGoogle(existing) && !viaGoogle(it) ? it : existing;
    byId.set(it.id, { ...best, image: best.image || existing.image || it.image });
  }
  const items = [...byId.values()].sort((a, b) => b.published.localeCompare(a.published)).slice(0, MAX_ITEMS);
  const stored: Stored = {
    updatedAt: new Date().toISOString(),
    items,
    sources: results.map((r) => ({ name: r.name, ok: r.ok, count: r.items.length })),
  };
  // Keep the previous list if every feed failed this time.
  if (!results.some((r) => r.items.length) && previous?.items?.length) return { ...previous, updatedAt: new Date().toISOString() };
  const { error } = await admin()
    .storage.from(BUCKET)
    .upload(PATH, new TextEncoder().encode(JSON.stringify(stored)), { contentType: "application/json", cacheControl: "300", upsert: true });
  if (error) console.error("robot-news upload", error.message);
  return stored;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const url = new URL(req.url);
    let data = await readStored();
    const age = data ? Date.now() - new Date(data.updatedAt).getTime() : Infinity;
    const force = url.searchParams.get("refresh") === "1" && age > MIN_FORCE_MS;
    if (!data || age > REFRESH_MS || force) data = await refresh(data);
    const next = new Date(new Date(data.updatedAt).getTime() + REFRESH_MS).toISOString();
    return new Response(JSON.stringify({ ...data, nextUpdateAt: next }), {
      headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "public, max-age=600" },
    });
  } catch (e) {
    console.error("robot-news", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "error", items: [] }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
