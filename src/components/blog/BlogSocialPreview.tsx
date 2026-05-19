import { Card } from "@/components/ui/card";
import { Globe } from "lucide-react";

interface BlogSocialPreviewProps {
  url: string;
  title: string;
  description: string;
  image?: string;
  siteName?: string;
}

const truncate = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trim() + "…" : s);

const BlogSocialPreview = ({
  url,
  title,
  description,
  image,
  siteName = "robotverse.in",
}: BlogSocialPreviewProps) => {
  const safeTitle = title || "Untitled blog post";
  const safeDesc = description || "Add a meta description to control how this post looks on Google and social.";

  return (
    <div className="space-y-6">
      {/* Google SERP */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">Google search preview</p>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Globe className="h-3.5 w-3.5" />
            <span>{siteName}</span>
            <span>›</span>
            <span className="truncate">{url.replace(/^https?:\/\/[^/]+/, "")}</span>
          </div>
          <h3 className="mt-1 text-lg text-[#1a0dab] leading-snug font-normal">
            {truncate(safeTitle, 60)}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground leading-snug">
            {truncate(safeDesc, 160)}
          </p>
        </Card>
      </div>

      {/* LinkedIn / Facebook style card */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">LinkedIn / Facebook preview</p>
        <Card className="overflow-hidden">
          {image ? (
            <div className="aspect-[1.91/1] bg-muted">
              <img src={image} alt="" className="w-full h-full object-cover" loading="lazy" />
            </div>
          ) : (
            <div className="aspect-[1.91/1] bg-muted flex items-center justify-center text-muted-foreground text-sm">
              No featured image
            </div>
          )}
          <div className="p-3 bg-muted/30">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{siteName}</p>
            <p className="font-semibold leading-snug mt-0.5 line-clamp-2">{truncate(safeTitle, 90)}</p>
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{truncate(safeDesc, 140)}</p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default BlogSocialPreview;
