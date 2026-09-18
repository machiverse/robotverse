import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Download, Play } from "lucide-react";
import ResponsiveMedia from "@/components/ResponsiveMedia";
import { PostMediaItem, formatFileSize, splitPostMedia } from "./postMedia";

interface PostMediaGalleryProps {
  items: PostMediaItem[];
  title?: string;
  /** Cap how many image/video tiles are rendered; remaining count shows as an overlay. */
  maxVisuals?: number;
  className?: string;
  /** Compact grid used inside feed cards. */
  compact?: boolean;
}

const PostMediaGallery = ({
  items,
  title,
  maxVisuals,
  className = "",
  compact = false,
}: PostMediaGalleryProps) => {
  const { visuals, documents } = splitPostMedia(items);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (visuals.length === 0 && documents.length === 0) return null;

  const shown = typeof maxVisuals === 'number' ? visuals.slice(0, maxVisuals) : visuals;
  const hiddenCount = visuals.length - shown.length;

  const gridClass =
    shown.length === 1
      ? 'grid-cols-1'
      : shown.length === 2
      ? 'grid-cols-2'
      : shown.length === 3
      ? 'grid-cols-2 sm:grid-cols-3'
      : 'grid-cols-2 sm:grid-cols-3';

  return (
    <div className={`space-y-3 ${className}`}>
      {shown.length === 1 && shown[0].type === 'video' ? (
        <div className="overflow-hidden rounded-lg bg-muted/30">
          <ResponsiveMedia
            src={shown[0].url}
            type="video"
            alt={title || 'Post video'}
            title={title}
            controls
            className="w-full"
          />
        </div>
      ) : shown.length === 1 && !compact ? (
        <div className="overflow-hidden rounded-lg bg-muted/30">
          <ResponsiveMedia src={shown[0].url} type="image" alt={title || 'Post media'} title={title} className="w-full" />
        </div>
      ) : (
        shown.length > 0 && (
          <div className={`grid gap-2 ${gridClass}`}>
            {shown.map((item, index) => (
              <button
                type="button"
                key={item.url}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setLightboxIndex(index);
                }}
                className="group relative overflow-hidden rounded-lg border border-border/60 bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <div className="aspect-[4/3] w-full">
                  {item.type === 'video' ? (
                    <video src={item.url} className="h-full w-full object-cover" muted playsInline preload="metadata" />
                  ) : (
                    <img
                      src={item.url}
                      alt={item.name || title || 'Post media'}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                {item.type === 'video' && (
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <span className="rounded-full bg-foreground/50 p-2">
                      <Play className="h-5 w-5 text-background" />
                    </span>
                  </span>
                )}
                {hiddenCount > 0 && index === shown.length - 1 && (
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-foreground/60 text-lg font-semibold text-background">
                    +{hiddenCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        )
      )}

      {documents.length > 0 && (
        <div className="space-y-2">
          {documents.map((doc) => (
            <a
              key={doc.url}
              href={doc.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 hover:border-primary/50"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{doc.name || 'Attachment'}</span>
                <span className="block text-xs text-muted-foreground">
                  {formatFileSize(doc.size) || 'Document'} · Opens in a new tab
                </span>
              </span>
              <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
            </a>
          ))}
        </div>
      )}

      <Dialog open={lightboxIndex !== null} onOpenChange={(open) => !open && setLightboxIndex(null)}>
        <DialogContent className="max-w-4xl p-2">
          {lightboxIndex !== null && visuals[lightboxIndex] && (
            <div className="space-y-3">
              {visuals[lightboxIndex].type === 'video' ? (
                <video src={visuals[lightboxIndex].url} controls className="max-h-[75vh] w-full rounded" />
              ) : (
                <img
                  src={visuals[lightboxIndex].url}
                  alt={visuals[lightboxIndex].name || title || 'Post media'}
                  className="max-h-[75vh] w-full rounded object-contain"
                />
              )}
              {visuals.length > 1 && (
                <div className="flex items-center justify-between px-2 pb-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setLightboxIndex((i) => ((i! - 1 + visuals.length) % visuals.length))}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {lightboxIndex + 1} / {visuals.length}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setLightboxIndex((i) => ((i! + 1) % visuals.length))}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PostMediaGallery;
