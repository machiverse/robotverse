import { Clock, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const isPriceAvailable = (price?: number | null) => !!price && price > 0;

const normalize = (condition?: string | null) => (condition || "").toLowerCase().replace(/[\s-]/g, "_");

export const isNewCondition = (condition?: string | null) => normalize(condition) === "new";

/** Compact clickable pill used on listing cards when no price is published. */
export const RequestQuotePill = ({
  onClick,
  className,
  label = "Request for Quote",
}: {
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  label?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/5 px-2.5 py-1",
      "text-xs font-semibold text-primary transition-colors hover:bg-primary/10 hover:border-primary/60",
      "whitespace-normal min-w-fit w-auto text-left",
      className
    )}
  >
    <FileText className="w-3.5 h-3.5 shrink-0" />
    {label}
  </button>
);

/** Small muted lead-time hint shown under a published price on listing cards. */
export const CardLeadTimeNote = ({ condition }: { condition?: string | null }) => {
  if (!isNewCondition(condition)) return null;
  return <p className="text-[11px] text-muted-foreground">Lead time: Contact seller</p>;
};

/** Detail-page lead time info row. */
export const LeadTimeInfoBox = ({ condition, className }: { condition?: string | null; className?: string }) => {
  const isNew = isNewCondition(condition);
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg border px-3 py-2 text-sm",
        isNew
          ? "border-border bg-muted/40 text-muted-foreground"
          : "border-success/30 bg-success/10 text-success",
        className
      )}
    >
      <Clock className="w-4 h-4 mt-0.5 shrink-0" />
      <span className="font-medium">
        {isNew ? "Lead Time: Contact seller for delivery timeline" : "Ready to ship — available for immediate dispatch"}
      </span>
    </div>
  );
};

/** Prominent detail-page quote CTA used when no price is published. */
export const RequestQuoteButton = ({
  onClick,
  label = "Request for Quote",
  variant = "default",
  size = "lg",
  className,
}: {
  onClick: () => void;
  label?: string;
  variant?: "default" | "outline";
  size?: "default" | "lg" | "sm";
  className?: string;
}) => (
  <Button variant={variant} size={size} onClick={onClick} className={cn("w-full", className)}>
    <FileText className="w-4 h-4 mr-2" />
    {label}
  </Button>
);
