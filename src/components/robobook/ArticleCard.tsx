import { Link } from "react-router-dom";
import { BookOpen, Eye, FileText, Heart, Image as ImageIcon, MessageCircle, PlayCircle, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { normalizePostMedia } from "@/components/post/postMedia";
import { buildRoboBookPostPath, calcReadingTime } from "@/utils/blogSeo";

export interface ArticleCardPost {
  id: string;
  slug?: string | null;
  post_type: "blog" | "video" | "short_post" | "media";
  title?: string;
  content?: string;
  excerpt?: string;
  media_url?: string;
  media_type?: string;
  media_items?: unknown;
  video_thumbnail?: string;
  display_category?: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  created_at: string;
  published_at?: string;
  status?: string;
  profiles?: { full_name: string; company_name?: string; avatar_url?: string } | null;
}

const TYPE: Record<ArticleCardPost["post_type"], { label: string; Icon: typeof BookOpen }> = {
  blog: { label: "Article", Icon: BookOpen },
  video: { label: "Video", Icon: Video },
  short_post: { label: "Post", Icon: FileText },
  media: { label: "Media", Icon: ImageIcon },
};

const plain = (html?: string) => (html ?? "").replace(/<[^>]+>/g, " ").replace(/&nbsp;|&amp;/g, " ").replace(/\s+/g, " ").trim();

function coverOf(p: ArticleCardPost): string | null {
  if (p.video_thumbnail) return p.video_thumbnail;
  const media = normalizePostMedia(p.media_items, p.media_url, p.media_type);
  return media.find((m) => m.type === "image")?.url ?? null;
}

const initials = (name?: string) =>
  (name || "RobotVerse")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

// RoboBook post as an editorial card, in the same visual grammar as the news cards.
// `featured` lays the first post out wide: cover left, text right.
export default function ArticleCard({ post, featured = false }: { post: ArticleCardPost; featured?: boolean }) {
  const cover = coverOf(post);
  const type = TYPE[post.post_type] ?? TYPE.blog;
  const text = plain(post.excerpt) || plain(post.content);
  const title = post.title || text.slice(0, 90) || "RoboBook post";
  const minutes = post.post_type === "blog" ? calcReadingTime(plain(post.content)) : null;
  const date = new Date(post.published_at || post.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const author = post.profiles?.full_name || post.profiles?.company_name || "RobotVerse member";

  return (
    <Link
      to={buildRoboBookPostPath(post.slug || post.id)}
      className={cn(
        "group flex h-full overflow-hidden rounded-xl border border-border/70 bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)] transition-colors duration-150 hover:border-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.995]",
        featured ? "flex-col md:col-span-2 md:flex-row" : "flex-col",
      )}
    >
      <div
        className={cn(
          "relative shrink-0 overflow-hidden bg-muted",
          featured ? "aspect-[16/9] md:aspect-auto md:w-[55%]" : "aspect-[16/9]",
        )}
      >
        {cover ? (
          <img
            src={cover}
            alt=""
            loading="lazy"
            decoding="async"
            onError={(e) => (e.currentTarget.style.display = "none")}
            className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-end bg-gradient-to-br from-primary/[0.08] to-primary/[0.18] p-4">
            <type.Icon className="h-9 w-9 text-primary/50" strokeWidth={1.5} />
          </div>
        )}
        {post.post_type === "video" && (
          <PlayCircle className="absolute left-3 top-3 h-7 w-7 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]" strokeWidth={1.5} />
        )}
        {post.status && post.status !== "published" && (
          <span className="absolute right-3 top-3 rounded-md bg-background/90 px-2 py-0.5 text-[11px] font-medium capitalize">{post.status}</span>
        )}
      </div>

      <div className={cn("flex min-w-0 flex-1 flex-col", featured ? "gap-3 p-6 md:p-8" : "gap-2 p-5")}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-primary">
          {post.display_category && post.display_category !== "General" ? post.display_category : type.label}
          <span className="text-foreground/40">
            {" · "}
            {type.label}
            {minutes ? ` · ${minutes} min read` : ""}
          </span>
        </p>
        <h3
          className={cn(
            "font-semibold text-foreground transition-colors duration-150 group-hover:text-primary",
            featured ? "line-clamp-3 text-2xl leading-tight tracking-[-0.02em]" : "line-clamp-2 text-lg leading-snug tracking-[-0.01em]",
          )}
        >
          {title}
        </h3>
        {text && text !== title && (
          <p className={cn("max-w-[65ch] text-sm leading-relaxed text-foreground/65", featured ? "line-clamp-4" : "line-clamp-2")}>{text}</p>
        )}

        <div className="mt-auto flex items-center gap-2.5 pt-3 text-xs text-foreground/50">
          {post.profiles?.avatar_url ? (
            <img src={post.profiles.avatar_url} alt="" className="h-6 w-6 rounded-full object-cover" />
          ) : (
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
              {initials(author)}
            </span>
          )}
          <span className="min-w-0 truncate font-medium text-foreground/75">{author}</span>
          <span>·</span>
          <span className="shrink-0">{date}</span>
          <span className="ml-auto flex shrink-0 items-center gap-3 tabular-nums">
            <span className="inline-flex items-center gap-1" title="Views">
              <Eye className="h-3.5 w-3.5" /> {post.view_count || 0}
            </span>
            <span className="inline-flex items-center gap-1" title="Likes">
              <Heart className="h-3.5 w-3.5" /> {post.like_count || 0}
            </span>
            <span className="hidden items-center gap-1 sm:inline-flex" title="Comments">
              <MessageCircle className="h-3.5 w-3.5" /> {post.comment_count || 0}
            </span>
          </span>
        </div>
      </div>
    </Link>
  );
}
