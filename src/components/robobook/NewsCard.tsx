import { ExternalLink, Newspaper } from "lucide-react";
import { cn } from "@/lib/utils";
import { outboundLink, timeAgo, type NewsItem } from "./newsApi";

// One news story, in the same card grammar as RoboBook articles.
// Opens the full article on the publisher's site in a new tab.
export default function NewsCard({ item, compact = false }: { item: NewsItem; compact?: boolean }) {
  return (
    <a
      href={outboundLink(item.link)}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className={cn(
        "group flex h-full overflow-hidden rounded-xl border border-border/70 bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)] transition-colors duration-150 hover:border-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        compact ? "w-72 shrink-0 flex-col" : "flex-col sm:flex-row sm:items-stretch",
      )}
    >
      <div className={cn("relative shrink-0 overflow-hidden bg-muted", compact ? "aspect-[16/9] w-full" : "aspect-[16/9] w-full sm:aspect-auto sm:w-60")}>
        {item.image ? (
          <img
            src={item.image}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={(e) => (e.currentTarget.style.display = "none")}
            className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full min-h-[120px] w-full items-end bg-gradient-to-br from-primary/[0.08] to-primary/[0.18] p-4">
            <Newspaper className="h-8 w-8 text-primary/50" strokeWidth={1.5} />
          </div>
        )}
      </div>
      <div className={cn("flex min-w-0 flex-1 flex-col gap-2", compact ? "p-4" : "p-5")}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-primary">
          {item.category !== "General" ? item.category : "Industry news"}
          <span className="text-foreground/40">
            {" · "}
            {item.source} · {timeAgo(item.published)}
          </span>
        </p>
        <h3
          className={cn(
            "font-semibold text-foreground transition-colors duration-150 group-hover:text-primary",
            compact ? "line-clamp-3 text-sm leading-snug" : "line-clamp-2 text-lg leading-snug tracking-[-0.01em]",
          )}
        >
          {item.title}
        </h3>
        {!compact && item.summary && <p className="line-clamp-2 max-w-[65ch] text-sm leading-relaxed text-foreground/65">{item.summary}</p>}
        <span className="mt-auto inline-flex items-center gap-1 pt-1 text-xs font-medium text-foreground/60 group-hover:text-primary">
          Read on {item.source.length > 28 ? "publisher site" : item.source} <ExternalLink className="h-3 w-3" />
        </span>
      </div>
    </a>
  );
}
