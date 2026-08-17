import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Check, X, Tag } from "lucide-react";
import { validateCoupon } from "@/hooks/useCoupons";

interface Props {
  sellerId: string;
  robotId?: string;
  amount: number;
  onApplied?: (result: { couponId: string; code: string; discount: number; finalPrice: number }) => void;
  onCleared?: () => void;
}

export default function CouponApplyBox({ sellerId, robotId, amount, onApplied, onCleared }: Props) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const apply = async () => {
    if (!code.trim()) return;
    setLoading(true); setError(null);
    const res: any = await validateCoupon({ code: code.trim(), sellerId, robotId, amount });
    setLoading(false);
    if (!res?.valid) {
      setError(res?.error || "Invalid coupon");
      setResult(null);
      onCleared?.();
    } else {
      setResult(res);
      onApplied?.({
        couponId: res.coupon_id,
        code: res.code,
        discount: Number(res.discount_amount),
        finalPrice: Number(res.final_price),
      });
    }
  };

  const clear = () => { setCode(""); setResult(null); setError(null); onCleared?.(); };

  return (
    <div className="rounded-lg border p-3 space-y-2 bg-muted/30">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Tag className="w-4 h-4" /> Have a coupon code?
      </div>
      <div className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Enter code"
          className="font-mono uppercase"
          disabled={!!result}
        />
        {result ? (
          <Button variant="outline" onClick={clear}>Remove</Button>
        ) : (
          <Button onClick={apply} disabled={loading || !code.trim()}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
          </Button>
        )}
      </div>

      {error && (
        <p className="text-xs text-destructive flex items-center gap-1"><X className="w-3 h-3" /> {error}</p>
      )}

      {result && (
        <div className="text-sm space-y-1 pt-1 border-t">
          <p className="text-success flex items-center gap-1 text-xs">
            <Check className="w-3 h-3" /> Coupon "{result.code}" applied
          </p>
          <div className="flex justify-between"><span className="text-muted-foreground">Original</span><span>₹{Number(amount).toLocaleString("en-IN")}</span></div>
          <div className="flex justify-between text-success"><span>Discount</span><span>− ₹{Number(result.discount_amount).toLocaleString("en-IN")}</span></div>
          <div className="flex justify-between font-semibold"><span>Final Price</span><span>₹{Number(result.final_price).toLocaleString("en-IN")}</span></div>
        </div>
      )}
    </div>
  );
}
