import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type ContentType =
  | "robot"
  | "spare_part"
  | "service"
  | "blog"
  | "profile"
  | "community_post";

interface Props {
  contentType: ContentType;
  contentId: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  label?: string;
}

/**
 * Manually re-queues an item for AI SEO regeneration.
 * Backed by the public.request_seo_regenerate() SQL function (owner/admin only).
 * The seo-generator edge function (cron every minute) drains the queue.
 */
export const RegenerateSEOButton = ({
  contentType,
  contentId,
  variant = "outline",
  size = "sm",
  className,
  label = "Regenerate AI SEO",
}: Props) => {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc("request_seo_regenerate", {
        _content_type: contentType,
        _content_id: contentId,
      });
      if (error) throw error;

      // Kick the generator immediately (best-effort; cron will catch any miss).
      supabase.functions
        .invoke("seo-generator", {
          body: { source: "manual", batch_size: 5 },
        })
        .catch(() => {});

      toast({
        title: "SEO regeneration queued",
        description:
          "AI will refresh meta, schema, FAQs and social cards within a minute.",
      });
    } catch (err: any) {
      toast({
        title: "Could not queue regeneration",
        description: err?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Sparkles className="h-4 w-4" />
      )}
      <span className="ml-2 whitespace-normal">{label}</span>
    </Button>
  );
};

export default RegenerateSEOButton;
