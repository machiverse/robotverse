import { Button } from "@/components/ui/button";
import { Linkedin, Facebook, Twitter, MessageCircle, Link2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface BlogShareBarProps {
  url: string;
  title: string;
  excerpt?: string;
  postId?: string;
  table?: "blogs" | "community_posts";
  className?: string;
}

const BlogShareBar = ({ url, title, excerpt, postId, table = "blogs", className }: BlogShareBarProps) => {
  const text = `${title}${excerpt ? ` — ${excerpt}` : ""}`;
  const enc = encodeURIComponent;

  const links = {
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`,
    twitter: `https://twitter.com/intent/tweet?url=${enc(url)}&text=${enc(title)}`,
    whatsapp: `https://wa.me/?text=${enc(`${text} ${url}`)}`,
  };

  const incrementShare = async () => {
    if (!postId) return;
    try {
      // Best-effort share count increment
      await supabase.rpc("increment_share_count" as never, { p_post_id: postId } as never).catch(() => null);
    } catch {
      // ignore — non-critical
    }
  };

  const open = (href: string) => {
    incrementShare();
    window.open(href, "_blank", "noopener,noreferrer");
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const items = [
    { label: "Share on LinkedIn", icon: Linkedin, onClick: () => open(links.linkedin), color: "hover:text-[#0a66c2]" },
    { label: "Share on Facebook", icon: Facebook, onClick: () => open(links.facebook), color: "hover:text-[#1877f2]" },
    { label: "Share on Twitter/X", icon: Twitter, onClick: () => open(links.twitter), color: "hover:text-foreground" },
    { label: "Share on WhatsApp", icon: MessageCircle, onClick: () => open(links.whatsapp), color: "hover:text-[#25d366]" },
    { label: "Copy link", icon: Link2, onClick: copy, color: "hover:text-primary" },
  ];

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className || ""}`}>
      <span className="text-sm font-medium text-muted-foreground mr-1">Share:</span>
      {items.map(({ label, icon: Icon, onClick, color }) => (
        <Button
          key={label}
          type="button"
          variant="outline"
          size="icon"
          aria-label={label}
          title={label}
          onClick={onClick}
          className={`h-9 w-9 transition-colors ${color}`}
        >
          <Icon className="h-4 w-4" />
        </Button>
      ))}
    </div>
  );
};

export default BlogShareBar;
