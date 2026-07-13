import { Button } from "@/components/ui/button";
import { Link2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CopySearchLinkButtonProps {
  className?: string;
  label?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
}

/**
 * Copies the current browser URL (with active filters/search/sort) to
 * clipboard so users can share their exact search state.
 */
const CopySearchLinkButton = ({
  className,
  label = "Copy Search Link",
  variant = "outline",
  size = "sm",
}: CopySearchLinkButtonProps) => {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Search link copied successfully.");
    } catch {
      // Fallback for older browsers
      try {
        const el = document.createElement("textarea");
        el.value = window.location.href;
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
        toast.success("Search link copied successfully.");
      } catch {
        toast.error("Failed to copy link");
      }
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleCopy}
      aria-label={label}
      className={cn("gap-2 whitespace-normal min-w-fit w-auto", className)}
    >
      <Link2 className="w-4 h-4" />
      {label}
    </Button>
  );
};

export default CopySearchLinkButton;
