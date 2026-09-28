import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Newspaper } from "lucide-react";
import NewsCard from "./NewsCard";
import { useRobotNews } from "./newsApi";

// "Latest industry news" row at the top of RoboBook, linking to the full news page.
export default function IndustryNewsStrip() {
  const { data, isLoading, isError } = useRobotNews();
  const items = data?.items.slice(0, 8) ?? [];
  if (isError || (!isLoading && items.length === 0)) return null;

  return (
    <section className="rounded-xl border border-border bg-card p-4" aria-labelledby="industry-news-heading">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 id="industry-news-heading" className="flex items-center gap-2 text-lg font-semibold">
          <Newspaper className="h-5 w-5 text-primary" /> Latest industry news
        </h2>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/robobook/news">
            All news <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-64 w-72 shrink-0 animate-pulse rounded-xl bg-muted" />)
          : items.map((item) => <NewsCard key={item.id} item={item} compact />)}
      </div>
    </section>
  );
}
