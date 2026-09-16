import { useState } from "react";
import { FileText, Download, Play } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import ResponsiveMedia from "@/components/ResponsiveMedia";
import { MediaItem, formatFileSize } from "@/lib/postMedia";
import { cn } from "@/lib/utils";

interface PostMediaGalleryProps {
  items: MediaItem[];
  title?: string;
  videoDuration?: number;
  autoplay?: boolean;
  className?: string;
  /** compact = feed card, full = details page */
  variant?: 'compact' | 'full';
}

const PostMediaGallery = ({
  items,
  title,
  videoDuration,
  autoplay = false,
  className,
  variant = 'compact',
}: PostMediaGalleryProps) => {
  const [lightbox, setLightbox] = useState<string | null>(null);

  if (!items || items.length === 0) return null;

  const images = items.filter((i) => i.type === 'image');
  const videos = items.filter((i) => i.type === 'video');
  const docs = items.filter((i) => i.type === 'document');

  const gridCols =
    images.length === 1 ? 'grid-cols-1' : images.length === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3';

  return (
    <div className={cn("space-y-3", className)}>
      {videos.map((video) => (
        <div key={video.url} className="relative overflow-hidden rounded-lg bg-muted/30">
          <ResponsiveMedia
            src={video.url}
            type="video"
            alt={title || 'Post video'}
            title={title}
            videoDuration={videoDuration}
            autoplay={autoplay}
            controls
            className="w-full h-auto max-h-[500px] object-cover"
          />
          {!autoplay && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-foreground/50 rounded-full p-3">
                <Play className="h-8 w-8 text-primary-foreground" />
              </div>
            </div>
          )}
        </div>
      ))}

      {images.length > 0 && (
        <div className={cn("grid gap-2", gridCols)}>
          {images.map((img, index) => (
            <button
              key={img.url}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setLightbox(img.url);
              }}
              className={cn(
                "group relative overflow-hidden rounded-lg bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                images.length === 1 ? (variant === 'full' ? 'aspect-[16/10]' : 'aspect-[4/3]') : 'aspect-square'
              )}
            >
              <img
                src={img.url}
                alt={img.name || `${title || 'Post image'} ${index + 1}`}
                loading={index === 0 ? 'eager' : 'lazy'}
                decoding="async"
                className="h-full w-full object-cover transition-opacity duration-150 ease-out group-hover:opacity-90"
              />
            </button>
          ))}
        </div>
      )}

      {docs.length > 0 && (
        <ul className="space-y-2">
          {docs.map((doc) => (
            <li key={doc.url}>
              <a
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded bg-primary/10 text-primary">
                  <FileText className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{doc.name || 'Attachment'}</span>
                  <span className="block text-xs text-muted-foreground">
                    {[doc.name?.split('.').pop()?.toUpperCase(), formatFileSize(doc.size)].filter(Boolean).join(' • ') || 'Document'}
                  </span>
                </span>
                <Download className="h-4 w-4 text-muted-foreground" />
              </a>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!lightbox} onOpenChange={(open) => !open && setLightbox(null)}>
        <DialogContent className="max-w-4xl p-2">
          {lightbox && (
            <img src={lightbox} alt={title || 'Post image'} className="max-h-[80vh] w-full rounded object-contain" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PostMediaGallery;
