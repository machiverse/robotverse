import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, ExternalLink, Share2, QrCode, Eye, Clock, CheckCircle2, Link2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SITE_URL } from "@/utils/blogSeo";

export function buildPreviewUrl(token: string) {
  return `${SITE_URL}/preview/${token}`;
}

interface PreviewLinkCardProps {
  token?: string | null;
  status?: string | null;
  liveUrl?: string | null;
  previewViewCount?: number | null;
  previewLastViewedAt?: string | null;
  title?: string;
  className?: string;
}

const PreviewLinkCard = ({
  token,
  status,
  liveUrl,
  previewViewCount,
  previewLastViewedAt,
  title,
  className,
}: PreviewLinkCardProps) => {
  const [copied, setCopied] = useState(false);
  if (!token) return null;

  const previewUrl = buildPreviewUrl(token);
  const isPublished = status === "published";
  const shareTitle = title || "Post preview";

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copy failed");
    }
  };

  const openPreview = () => window.open(previewUrl, "_blank", "noopener,noreferrer");

  const share = async () => {
    const nav = navigator as any;
    if (nav.share) {
      try {
        await nav.share({ title: shareTitle, url: previewUrl });
        return;
      } catch {
        /* user cancelled */
      }
    }
    await copy(previewUrl);
  };

  return (
    <Card className={`border-primary/20 bg-primary/5 ${className || ""}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Shareable Preview URL</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={
                isPublished
                  ? "border-success/30 text-success"
                  : status === "scheduled"
                  ? "border-amber-500/40 text-amber-600"
                  : "border-primary/30 text-primary"
              }
            >
              {isPublished ? (
                <CheckCircle2 className="h-3 w-3 mr-1" />
              ) : (
                <Clock className="h-3 w-3 mr-1" />
              )}
              {(status || "draft").toString().toUpperCase()}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Input
            readOnly
            value={previewUrl}
            onFocus={(e) => e.currentTarget.select()}
            className="font-mono text-xs h-9 bg-background"
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => copy(previewUrl)}
            className="gap-1.5"
          >
            <Copy className="h-3.5 w-3.5" />
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={openPreview} className="gap-1.5">
            <ExternalLink className="h-3.5 w-3.5" /> Open
          </Button>
          <Button size="sm" variant="outline" onClick={share} className="gap-1.5">
            <Share2 className="h-3.5 w-3.5" /> Share
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1.5">
                <QrCode className="h-3.5 w-3.5" /> QR
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-4" align="end">
              <div className="flex flex-col items-center gap-2">
                <QRCodeSVG value={previewUrl} size={180} includeMargin />
                <p className="text-xs text-muted-foreground text-center max-w-[180px]">
                  Scan to open the preview on your phone
                </p>
              </div>
            </PopoverContent>
          </Popover>

          <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              {previewViewCount ?? 0} preview views
            </span>
            {previewLastViewedAt && (
              <span className="hidden sm:flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {format(new Date(previewLastViewedAt), "MMM d, p")}
              </span>
            )}
          </div>
        </div>

        {isPublished && liveUrl && (
          <div className="flex items-center gap-2 pt-2 border-t border-border/50">
            <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
            <span className="text-xs text-muted-foreground shrink-0">Live URL:</span>
            <a
              href={liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono truncate text-primary hover:underline"
            >
              {liveUrl}
            </a>
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto h-7 px-2"
              onClick={() => copy(liveUrl)}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {!isPublished && (
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Anyone with this link can view a live preview before publishing. Once published, this URL
            automatically redirects to the live post — no need to reshare.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default PreviewLinkCard;
