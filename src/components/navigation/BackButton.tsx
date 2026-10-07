import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSmartBack } from "@/hooks/useSmartBack";
import { cn } from "@/lib/utils";

interface BackButtonProps {
  fallbackPath?: string;
  label?: string;
}

/** Back bar under a page header: previous page inside the site, else the fallback. */
export default function BackButton({ fallbackPath, label = "Back" }: BackButtonProps) {
  const back = useSmartBack(fallbackPath);
  return (
    <div className="container mx-auto px-4 py-3 border-b border-border bg-card/50">
      <Button variant="ghost" size="sm" onClick={back} className="gap-2 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        {label}
      </Button>
    </div>
  );
}

/** Compact round back arrow for headers and toolbars. */
export function BackIconButton({ fallbackPath, className, label = "Go back" }: { fallbackPath?: string; className?: string; label?: string }) {
  const back = useSmartBack(fallbackPath);
  return (
    <button
      type="button"
      onClick={back}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground/80 transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <ArrowLeft className="h-5 w-5" />
    </button>
  );
}
