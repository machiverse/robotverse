import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { Coupon, CouponInput } from "@/hooks/useCoupons";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Coupon | null;
  onSubmit: (input: CouponInput) => Promise<{ error?: any } | void>;
}

const empty: CouponInput = {
  code: "",
  name: "",
  description: "",
  discount_type: "percentage",
  discount_value: 10,
  min_order_amount: 0,
  max_discount_amount: null,
  start_date: new Date().toISOString(),
  expiry_date: new Date(Date.now() + 30 * 86400000).toISOString(),
  usage_limit: 0,
  usage_limit_per_customer: 0,
  applies_to: "all",
  applicable_robot_ids: [],
  applicable_categories: [],
  applicable_brands: [],
  is_active: true,
};

function toLocal(iso: string) {
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

export default function CouponFormDialog({ open, onOpenChange, initial, onSubmit }: Props) {
  const [form, setForm] = useState<CouponInput>(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initial) {
      const { id, seller_id, times_used, admin_disabled, created_at, updated_at, ...rest } = initial as any;
      setForm(rest);
    } else {
      setForm(empty);
    }
  }, [initial, open]);

  const set = <K extends keyof CouponInput>(k: K, v: CouponInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!/^[A-Z0-9_-]{3,20}$/.test(form.code.toUpperCase())) {
      alert("Code must be 3–20 chars: A-Z, 0-9, _ or -");
      return;
    }
    if (form.discount_value <= 0) { alert("Discount value must be > 0"); return; }
    if (form.discount_type === "percentage" && form.discount_value > 100) { alert("Percentage cannot exceed 100"); return; }
    if (new Date(form.expiry_date) <= new Date(form.start_date)) { alert("Expiry must be after start"); return; }
    setSaving(true);
    const res = await onSubmit(form);
    setSaving(false);
    if (!res || !("error" in res) || !res.error) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Coupon" : "Create Coupon"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Coupon Code *</Label>
            <Input value={form.code} onChange={(e) => set("code", e.target.value.toUpperCase())} placeholder="WELCOME20" />
          </div>
          <div>
            <Label>Name *</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Welcome offer" />
          </div>
          <div className="md:col-span-2">
            <Label>Description</Label>
            <Textarea value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} rows={2} />
          </div>
          <div>
            <Label>Discount Type *</Label>
            <Select value={form.discount_type} onValueChange={(v) => set("discount_type", v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Percentage (%)</SelectItem>
                <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Discount Value *</Label>
            <Input type="number" value={form.discount_value} onChange={(e) => set("discount_value", parseFloat(e.target.value) || 0)} />
          </div>
          <div>
            <Label>Min Order Amount</Label>
            <Input type="number" value={form.min_order_amount} onChange={(e) => set("min_order_amount", parseFloat(e.target.value) || 0)} />
          </div>
          <div>
            <Label>Max Discount {form.discount_type === "percentage" ? "(cap)" : "(ignored)"}</Label>
            <Input
              type="number"
              value={form.max_discount_amount ?? ""}
              onChange={(e) => set("max_discount_amount", e.target.value ? parseFloat(e.target.value) : null)}
              disabled={form.discount_type !== "percentage"}
            />
          </div>
          <div>
            <Label>Start Date *</Label>
            <Input type="datetime-local" value={toLocal(form.start_date)} onChange={(e) => set("start_date", new Date(e.target.value).toISOString())} />
          </div>
          <div>
            <Label>Expiry Date *</Label>
            <Input type="datetime-local" value={toLocal(form.expiry_date)} onChange={(e) => set("expiry_date", new Date(e.target.value).toISOString())} />
          </div>
          <div>
            <Label>Total Usage Limit (0 = unlimited)</Label>
            <Input type="number" value={form.usage_limit} onChange={(e) => set("usage_limit", parseInt(e.target.value) || 0)} />
          </div>
          <div>
            <Label>Limit Per Customer (0 = unlimited)</Label>
            <Input type="number" value={form.usage_limit_per_customer} onChange={(e) => set("usage_limit_per_customer", parseInt(e.target.value) || 0)} />
          </div>
          <div>
            <Label>Applies To</Label>
            <Select value={form.applies_to} onValueChange={(v) => set("applies_to", v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Robots</SelectItem>
                <SelectItem value="robots">Selected Robots</SelectItem>
                <SelectItem value="categories">Selected Categories</SelectItem>
                <SelectItem value="brands">Selected Brands</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3 pt-6">
            <Switch checked={form.is_active} onCheckedChange={(v) => set("is_active", v)} />
            <Label>Active</Label>
          </div>

          {form.applies_to === "robots" && (
            <div className="md:col-span-2">
              <Label>Robot IDs (comma separated)</Label>
              <Input
                value={form.applicable_robot_ids.join(",")}
                onChange={(e) => set("applicable_robot_ids", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
                placeholder="uuid,uuid"
              />
            </div>
          )}
          {form.applies_to === "categories" && (
            <div className="md:col-span-2">
              <Label>Categories (comma separated)</Label>
              <Input
                value={form.applicable_categories.join(",")}
                onChange={(e) => set("applicable_categories", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
                placeholder="industrial,collaborative"
              />
            </div>
          )}
          {form.applies_to === "brands" && (
            <div className="md:col-span-2">
              <Label>Brands (comma separated)</Label>
              <Input
                value={form.applicable_brands.join(",")}
                onChange={(e) => set("applicable_brands", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
                placeholder="ABB,FANUC"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>{saving ? "Saving..." : initial ? "Save Changes" : "Create Coupon"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
