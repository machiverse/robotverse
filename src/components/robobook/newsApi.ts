// RoboBook → Industry News, collected by the "robot-news" edge function every 4 hours.
import { useQuery } from "@tanstack/react-query";

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

export interface NewsFeed {
  updatedAt: string;
  nextUpdateAt: string;
  items: NewsItem[];
  sources: { name: string; ok: boolean; count: number }[];
}

const NEWS_URL = `${import.meta.env.VITE_SUPABASE_URL || "https://cmahwgetrqczytnijbuk.supabase.co"}/functions/v1/robot-news`;

async function fetchNews(): Promise<NewsFeed> {
  const r = await fetch(NEWS_URL);
  if (!r.ok) throw new Error(`News unavailable (${r.status})`);
  const data = await r.json();
  return { updatedAt: data.updatedAt, nextUpdateAt: data.nextUpdateAt, items: data.items ?? [], sources: data.sources ?? [] };
}

export const useRobotNews = () =>
  useQuery({ queryKey: ["robot-news"], queryFn: fetchNews, staleTime: 10 * 60_000, refetchOnWindowFocus: false, retry: 1 });

export function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  if (s < 86400 * 7) return `${Math.round(s / 86400)} d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/** Opens the publisher's page; tagged so publishers see RobotVerse as the referrer. */
export const outboundLink = (link: string) => {
  try {
    const u = new URL(link);
    if (!u.hostname.includes("news.google.")) u.searchParams.set("utm_source", "robotverse.in");
    return u.toString();
  } catch {
    return link;
  }
};
