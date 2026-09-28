import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Copy, Download, Linkedin, MessageCircle, Share2 } from "lucide-react";
import { posterShareUrl, type TrainingPoster } from "./trainingApi";

// Share a training poster: native share sheet, WhatsApp, LinkedIn, copy link, download.
export default function PosterShare({ poster, compact = false }: { poster: TrainingPoster; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  const url = posterShareUrl(poster.id);
  const i = poster.info;
  const text = [i.title, i.organizer, i.dates, i.location].filter(Boolean).join(" · ");

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Copy this link", url);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: i.title || "Training poster", text, url });
        return;
      } catch {
        /* cancelled: fall back to copying */
      }
    }
    copy();
  }

  const size = compact ? "sm" : "default";
  return (
    <div className="flex flex-wrap gap-2">
      <Button size={size} variant="outline" onClick={share}>
        <Share2 className="mr-1.5 h-4 w-4" /> Share
      </Button>
      <Button size={size} variant="outline" asChild>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on WhatsApp"
        >
          <MessageCircle className="h-4 w-4 text-emerald-500" />
          {!compact && <span className="ml-1.5">WhatsApp</span>}
        </a>
      </Button>
      <Button size={size} variant="outline" asChild>
        <a
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on LinkedIn"
        >
          <Linkedin className="h-4 w-4 text-sky-600" />
          {!compact && <span className="ml-1.5">LinkedIn</span>}
        </a>
      </Button>
      <Button size={size} variant="outline" onClick={copy} aria-label="Copy link">
        {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
        {!compact && <span className="ml-1.5">{copied ? "Copied" : "Copy link"}</span>}
      </Button>
      {!compact && (
        <Button size={size} variant="outline" asChild>
          <a href={poster.image} download target="_blank" rel="noopener noreferrer">
            <Download className="mr-1.5 h-4 w-4" /> Poster
          </a>
        </Button>
      )}
    </div>
  );
}
