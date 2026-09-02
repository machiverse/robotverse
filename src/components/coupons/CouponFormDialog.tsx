import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Bot, Search, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Coupon, CouponInput } from "@/hooks/useCoupons";

interface SellerRobot {
  id: string;
  name: string;
  brand: string | null;
  model: string | null;
  price: number | null;
  images: string[] | null;
  availability: string | null;
}

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
  const { user } = useAuth();
  const [form, setForm] = useState<CouponInput>(empty);
  const [saving, setSaving] = useState(false);
  const [sellerRobots, setSellerRobots] = useState<SellerRobot[]>([]);
  const [robotSearch, setRobotSearch] = useState("");
  const [loadingRobots, setLoadingRobots] = useState(false);

  useEffect(() => {
    if (initial) {
      const { id, seller_id, times_used, admin_disabled, created_at, updated_at, ...rest } = initial as any;
      setForm(rest);
    } else {
      setForm(empty);
    }
    setRobotSearch("");
  }, [initial, open]);

  // Fetch the seller's own robot listings once dialog opens
  useEffect(() => {
    if (!open || !user) return;
    let cancel = false;
    (async () => {
      setLoadingRobots(true);
      const { data } = await supabase
        .from("robots")
        .select("id,name,brand,model,price,images,availability")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });
      if (!cancel) {
        setSellerRobots((data || []) as SellerRobot[]);
        setLoadingRobots(false);
      }
    })();
    return () => { cancel = true; };
  }, [open, user]);

  const sellerBrands = useMemo(
    () => Array.from(new Set(sellerRobots.map((r) => r.brand).filter(Boolean) as string[])).sort(),
    [sellerRobots],
  );

  const filteredRobots = useMemo(() => {
    const q = robotSearch.trim().toLowerCase();
    if (!q) return sellerRobots;
    return sellerRobots.filter((r) =>
      [r.name, r.brand, r.model].filter(Boolean).some((v) => v!.toLowerCase().includes(q)),
    );
  }, [sellerRobots, robotSearch]);

  const toggleRobot = (id: string) => {
    setForm((f) => {
      const has = f.applicable_robot_ids.includes(id);
      return { ...f, applicable_robot_ids: has ? f.applicable_robot_ids.filter((x) => x !== id) : [...f.applicable_robot_ids, id] };
    });
  };

  const toggleBrand = (brand: string) => {
    setForm((f) => {
      const has = f.applicable_brands.includes(brand);
      return { ...f, applicable_brands: has ? f.applicable_brands.filter((x) => x !== brand) : [...f.applicable_brands, brand] };
    });
  };

  const selectAllFiltered = () => {
    setForm((f) => {
      const set = new Set(f.applicable_robot_ids);
      filteredRobots.forEach((r) => set.add(r.id));
      return { ...f, applicable_robot_ids: Array.from(set) };
    });
  };
  const clearAllRobots = () => setForm((f) => ({ ...f, applicable_robot_ids: [] }));

  const set = <K extends keyof CouponInput>(k: K, v: CouponInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!/^[A-Z0-9_-]{3,20}$/.test(form.code.toUpperCase())) {
      alert("Code must be 3–20 chars: A-Z, 0-9, _ or -");
      return;
    }
    if (form.discount_value <= 0) { alert("Discount value must be > 0"); return; }
    if (form.discount_type === "percentage" && form.discount_value > 100) { alert("Percentage cannot exceed 100"); return; }
    if (new Date(form.expiry_date) <= new Date(form.start_date)) { alert("Expiry must be after start"); return; }
    if (form.applies_to === "robots" && form.applicable_robot_ids.length === 0) {
      alert("Select at least one robot for this coupon"); return;
    }
    if (form.applies_to === "brands" && form.applicable_brands.length === 0) {
      alert("Select at least one brand for this coupon"); return;
    }
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
            <div className="md:col-span-2 rounded-lg border p-3 space-y-3 bg-muted/30">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Label className="flex items-center gap-2">
                  <Bot className="w-4 h-4" /> Pick from your listed robots
                  <Badge variant="secondary">{form.applicable_robot_ids.length} selected</Badge>
                </Label>
                <div className="flex items-center gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={selectAllFiltered} disabled={!filteredRobots.length}>
                    Select all{robotSearch ? " filtered" : ""}
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={clearAllRobots} disabled={!form.applicable_robot_ids.length}>
                    Clear
                  </Button>
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Search by name, brand or model..."
                  value={robotSearch}
                  onChange={(e) => setRobotSearch(e.target.value)}
                />
              </div>
              <div className="max-h-72 overflow-y-auto rounded-md border bg-background divide-y">
                {loadingRobots ? (
                  <div className="p-4 text-sm text-muted-foreground">Loading your robots...</div>
                ) : filteredRobots.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground">
                    {sellerRobots.length === 0 ? "You haven't listed any robots yet." : "No robots match your search."}
                  </div>
                ) : (
                  filteredRobots.map((r) => {
                    const checked = form.applicable_robot_ids.includes(r.id);
                    return (
                      <label key={r.id} className="flex items-center gap-3 p-2 cursor-pointer hover:bg-muted/40">
                        <Checkbox checked={checked} onCheckedChange={() => toggleRobot(r.id)} />
                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center overflow-hidden shrink-0">
                          {r.images?.[0] ? (
                            <img src={r.images[0]} alt={r.name} className="w-full h-full object-cover" />
                          ) : (
                            <Bot className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate flex items-center gap-2">
                            {r.name}
                            {checked && <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {[r.brand, r.model].filter(Boolean).join(" · ")}
                            {r.price ? ` · ₹${Number(r.price).toLocaleString("en-IN")}` : ""}
                          </div>
                        </div>
                        {r.availability && (
                          <Badge variant="outline" className="text-[10px] capitalize">{r.availability}</Badge>
                        )}
                      </label>
                    );
                  })
                )}
              </div>
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
            <div className="md:col-span-2 rounded-lg border p-3 space-y-2 bg-muted/30">
              <Label className="flex items-center gap-2">
                Pick brands from your listings
                <Badge variant="secondary">{form.applicable_brands.length} selected</Badge>
              </Label>
              {sellerBrands.length === 0 ? (
                <p className="text-sm text-muted-foreground">No brands found in your listings.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {sellerBrands.map((b) => {
                    const active = form.applicable_brands.includes(b);
                    return (
                      <button
                        type="button"
                        key={b}
                        onClick={() => toggleBrand(b)}
                        className={`px-3 py-1 rounded-full border text-sm transition ${
                          active ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"
                        }`}
                      >
                        {b}
                      </button>
                    );
                  })}
                </div>
              )}
              <Input
                placeholder="Add other brand and press Enter"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const v = (e.target as HTMLInputElement).value.trim();
                    if (v && !form.applicable_brands.includes(v)) {
                      set("applicable_brands", [...form.applicable_brands, v]);
                      (e.target as HTMLInputElement).value = "";
                    }
                  }
                }}
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
