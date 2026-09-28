import { Badge } from "@/components/ui/badge";
import { ExternalLink, Newspaper } from "lucide-react";
import { cn } from "@/lib/utils";
import { outboundLink, timeAgo, type NewsItem } from "./newsApi";

// One news story. Opens the full article on the publisher's site in a new tab.
export default function NewsCard({ item, compact = false }: { item: NewsItem; compact?: boolean }) {
  return (
    <a
      href={outboundLink(item.link)}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className={cn(
        "group flex h-full overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/50",
        compact ? "w-72 shrink-0 flex-col" : "flex-col sm:flex-row",
      )}
    >
      <div className={cn("relative shrink-0 overflow-hidden bg-gradient-to-br from-primary/10 to-primary/20", compact ? "h-36 w-full" : "h-44 w-full sm:h-36 sm:w-56 sm:self-center sm:rounded-lg sm:ml-3")}>
        {item.image ? (
          <img
            src={item.image}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={(e) => (e.currentTarget.style.display = "none")}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Newspaper className="h-10 w-10 text-primary/60" />
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="font-semibold text-foreground/80">{item.source}</span>
          <span>·</span>
          <span>{timeAgo(item.published)}</span>
          {!compact && item.category !== "General" && (
            <Badge variant="secondary" className="ml-auto text-[10px]">
              {item.category}
            </Badge>
          )}
        </div>
        <h3 className={cn("font-semibold leading-snug group-hover:text-primary", compact ? "line-clamp-3 text-sm" : "line-clamp-2 text-base")}>
          {item.title}
        </h3>
        {!compact && item.summary && <p className="line-clamp-2 text-sm text-muted-foreground">{item.summary}</p>}
        <span className="mt-auto inline-flex items-center gap-1 text-xs font-medium text-primary">
          Read on {item.source.length > 28 ? "publisher site" : item.source} <ExternalLink className="h-3 w-3" />
        </span>
      </div>
    </a>
  );
}
