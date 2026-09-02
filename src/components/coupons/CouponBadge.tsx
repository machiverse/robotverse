import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tag, Copy, Check } from "lucide-react";
import { useRobotCoupons } from "@/hooks/useCoupons";
import { format } from "date-fns";

interface Props {
  sellerId?: string;
  robotId?: string;
}

export default function CouponBadge({ sellerId, robotId }: Props) {
  const { coupons } = useRobotCoupons(robotId, sellerId);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  if (!sellerId || coupons.length === 0) return null;

  const copy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs"
      >
        <Badge className="bg-success hover:bg-success gap-1">
          <Tag className="w-3 h-3" />
          {coupons.length} Offer{coupons.length > 1 ? "s" : ""} available
        </Badge>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Tag className="w-5 h-5" /> Available Offers</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {coupons.map((c) => (
              <div key={c.id} className="rounded-lg border p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-primary">{c.code}</span>
                  <Button size="sm" variant="ghost" onClick={() => copy(c.code)}>
                    {copied === c.code ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-sm font-medium">{c.name}</p>
                {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}
                <p className="text-xs">
                  <span className="text-success font-semibold">
                    {c.discount_type === "percentage" ? `${c.discount_value}% off` : `₹${Number(c.discount_value).toLocaleString("en-IN")} off`}
                  </span>
                  {c.min_order_amount > 0 && <span className="text-muted-foreground"> · Min ₹{Number(c.min_order_amount).toLocaleString("en-IN")}</span>}
                </p>
                <p className="text-[11px] text-muted-foreground">Valid till {format(new Date(c.expiry_date), "dd MMM yyyy")}</p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
