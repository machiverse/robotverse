import { useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import EnhancedHeader from "@/components/EnhancedHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Newspaper, RefreshCw, Search } from "lucide-react";
import NewsCard from "@/components/robobook/NewsCard";
import { timeAgo, useRobotNews } from "@/components/robobook/newsApi";
import { useDebouncedUrlParam, useUrlParam } from "@/hooks/useUrlState";
import { cn } from "@/lib/utils";

const PAGE = 30;

// RoboBook → Industry News: industrial robot and automation news from IFR,
// trade publications and news sites, refreshed every 4 hours.
export default function RobotNews() {
  const { data, isLoading, isError, refetch, isFetching } = useRobotNews();
  const [category, setCategory] = useUrlParam<string>("category", "all");
  const [source, setSource] = useUrlParam<string>("source", "all");
  const [query, setQuery] = useDebouncedUrlParam("search", "", 300);
  const [shown, setShown] = useUrlParam<string>("show", String(PAGE));

  const items = useMemo(() => data?.items ?? [], [data]);
  const categories = useMemo(() => {
    const m = new Map<string, number>();
    items.forEach((i) => m.set(i.category, (m.get(i.category) || 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [items]);
  const sources = useMemo(() => {
    const m = new Map<string, number>();
    items.forEach((i) => m.set(i.source, (m.get(i.source) || 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (i) =>
        (category === "all" || i.category === category) &&
        (source === "all" || i.source === source) &&
        (!q || `${i.title} ${i.summary} ${i.source}`.toLowerCase().includes(q)),
    );
  }, [items, category, source, query]);
  const limit = Math.max(PAGE, Number(shown) || PAGE);

  const chip = (active: boolean) =>
    cn(
      "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
      active ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/60",
    );

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Industrial Robot News & Trends | RoboBook | RobotVerse</title>
        <meta
          name="description"
          content="Latest industrial robot, cobot and factory automation news: IFR reports, market trends, product launches and case studies, updated every 4 hours on RobotVerse."
        />
        <link rel="canonical" href="https://www.robotverse.in/robobook/news" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "Industrial Robot News & Trends",
            url: "https://www.robotverse.in/robobook/news",
            isPartOf: { "@type": "WebSite", name: "RobotVerse", url: "https://www.robotverse.in" },
          })}
        </script>
      </Helmet>
      <EnhancedHeader />
      <main className="container mx-auto px-4 py-8">
        <Link to="/robobook" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> RoboBook
        </Link>
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-primary">
              <Newspaper className="h-7 w-7" /> Industry News
            </h1>
            <p className="mt-2 text-muted-foreground">
              Industrial robots, cobots and factory automation: IFR reports, market trends, launches and case studies.
            </p>
            {data?.updatedAt && (
              <p className="mt-1 text-xs text-muted-foreground">
                Updated {timeAgo(data.updatedAt)} · refreshes every 4 hours · {items.length} stories from {sources.length}+ sources
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search news…" className="pl-9" aria-label="Search news" />
            </div>
            <Button variant="outline" size="icon" onClick={() => refetch()} aria-label="Reload news" disabled={isFetching}>
              <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
            </Button>
          </div>
        </div>

        {categories.length > 0 && (
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="News topics">
            <button role="tab" aria-selected={category === "all"} className={chip(category === "all")} onClick={() => setCategory("all")}>
              All news <span className="ml-1 opacity-70">{items.length}</span>
            </button>
            {categories.map(([name, count]) => (
              <button key={name} role="tab" aria-selected={category === name} className={chip(category === name)} onClick={() => setCategory(name)}>
                {name} <span className="ml-1 opacity-70">{count}</span>
              </button>
            ))}
          </div>
        )}
        {sources.length > 1 && (
          <div className="mb-6 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="mr-1 text-muted-foreground">Source:</span>
            <button className={chip(source === "all")} onClick={() => setSource("all")}>
              All
            </button>
            {sources.map(([name]) => (
              <button key={name} className={chip(source === name)} onClick={() => setSource(name)}>
                {name}
              </button>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="grid gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : isError || items.length === 0 ? (
          <div className="py-16 text-center">
            <Newspaper className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
            <p className="font-semibold">News is being collected. Please check back in a few minutes.</p>
            <Button className="mt-4" variant="outline" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">No stories match these filters.</div>
        ) : (
          <>
            <div className="grid gap-4">
              {filtered.slice(0, limit).map((item) => (
                <NewsCard key={item.id} item={item} />
              ))}
            </div>
            {filtered.length > limit && (
              <div className="mt-6 text-center">
                <Button variant="outline" onClick={() => setShown(String(limit + PAGE))}>
                  Show more ({filtered.length - limit} more)
                </Button>
              </div>
            )}
          </>
        )}
        <p className="mt-8 text-xs text-muted-foreground">
          Headlines and short summaries link to the original publishers; all rights remain with them.
        </p>
      </main>
    </div>
  );
}
