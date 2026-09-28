import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ExternalLink, Newspaper } from "lucide-react";
import { cn } from "@/lib/utils";
import { outboundLink, timeAgo, useRobotNews, type NewsItem } from "./newsApi";

const SLIDES = 5;
const INTERVAL = 6000;

// Magazine-style lead: the current story large on the left, a numbered index of
// the top five on the right. Advances every 6 s, pauses on hover or keyboard focus,
// and stays still for visitors who prefer reduced motion.
export default function NewsLeadCarousel() {
  const { data, isLoading, isError } = useRobotNews();
  const items = (data?.items ?? []).slice(0, SLIDES);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  useEffect(() => {
    if (paused || reduced || items.length < 2) return;
    const t = window.setTimeout(() => setActive((i) => (i + 1) % items.length), INTERVAL);
    return () => window.clearTimeout(t);
  }, [active, paused, reduced, items.length]);

  if (isError || (!isLoading && items.length === 0)) return null;

  if (isLoading) {
    return (
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="aspect-[16/9] animate-pulse rounded-2xl bg-muted lg:aspect-auto lg:h-[340px]" />
        <div className="space-y-3">
          {Array.from({ length: SLIDES }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  const current = items[Math.min(active, items.length - 1)];

  return (
    <section
      ref={rootRef}
      aria-roledescription="carousel"
      aria-label="Latest industry news"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => !rootRef.current?.contains(e.relatedTarget as Node) && setPaused(false)}
      className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]"
    >
      <LeadStory item={current} key={current.id} />

      <div className="flex flex-col">
        <div className="mb-2 flex items-baseline justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/60">Industry news</p>
          <Link
            to="/robobook/news"
            className="inline-flex items-center gap-1 rounded text-xs font-medium text-primary transition-colors duration-150 hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            All news <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <ol className="flex flex-1 flex-col divide-y divide-border/60">
          {items.map((it, i) => {
            const on = i === active;
            return (
              <li key={it.id} className="relative">
                <button
                  type="button"
                  onClick={() => setActive(i)}
                  aria-current={on ? "true" : undefined}
                  className={cn(
                    "group grid w-full grid-cols-[2rem_1fr] items-start gap-2 py-3 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    on ? "text-foreground" : "text-foreground/60 hover:text-foreground/85",
                  )}
                >
                  <span className={cn("text-lg font-semibold leading-6 tabular-nums tracking-tight", on ? "text-primary" : "text-foreground/30")}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0">
                    <span className="line-clamp-2 text-sm font-medium leading-snug">{it.title}</span>
                    <span className="mt-0.5 block text-[11px] text-foreground/45">
                      {it.source} · {timeAgo(it.published)}
                    </span>
                  </span>
                </button>
                {on && !reduced && items.length > 1 && (
                  <span
                    key={`${it.id}-${paused}`}
                    aria-hidden
                    className="absolute bottom-0 left-8 right-0 h-px origin-left bg-primary"
                    style={{
                      animation: paused ? "none" : `rv-progress ${INTERVAL}ms linear forwards`,
                      transform: paused ? "scaleX(0)" : undefined,
                    }}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </div>
      <style>{`@keyframes rv-progress { from { transform: scaleX(0) } to { transform: scaleX(1) } }
        @keyframes rv-lead-in { from { opacity: 0; transform: scale(1.02) } to { opacity: 1; transform: scale(1) } }
        @media (prefers-reduced-motion: reduce) { @keyframes rv-lead-in { from { opacity: 0 } to { opacity: 1 } } }`}</style>
    </section>
  );
}

function LeadStory({ item }: { item: NewsItem }) {
  return (
    <a
      href={outboundLink(item.link)}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="group relative isolate flex min-h-[280px] overflow-hidden rounded-2xl bg-[hsl(222_40%_12%)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:h-[340px]"
      style={{ animation: "rv-lead-in 300ms cubic-bezier(0.16, 1, 0.3, 1)" }}
    >
      {item.image ? (
        <img
          src={item.image}
          alt=""
          referrerPolicy="no-referrer"
          onError={(e) => (e.currentTarget.style.display = "none")}
          className="absolute inset-0 -z-10 h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.02]"
        />
      ) : (
        <div aria-hidden className="absolute inset-0 -z-10 flex items-center justify-end pr-10">
          <Newspaper className="h-40 w-40 text-white/[0.06]" strokeWidth={1} />
        </div>
      )}
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-[hsl(222_45%_7%/0.96)] via-[hsl(222_45%_7%/0.7)] to-[hsl(222_45%_7%/0.1)]" />
      <div aria-hidden className="absolute inset-0 -z-10 hidden bg-gradient-to-r from-[hsl(222_45%_7%/0.6)] to-transparent sm:block" />
      <div className="mt-auto max-w-[62ch] p-6 sm:p-8">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/70">
          {item.category !== "General" ? `${item.category} · ` : ""}
          {item.source}
        </p>
        <h2 className="text-balance text-2xl font-semibold leading-tight tracking-[-0.02em] text-[hsl(210_40%_98%)] sm:text-[28px]">
          {item.title}
        </h2>
        {item.summary && <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-white/70">{item.summary}</p>}
        <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-white/85">
          {timeAgo(item.published)} · Read the story <ExternalLink className="h-3.5 w-3.5" />
        </span>
      </div>
    </a>
  );
}
