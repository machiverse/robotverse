import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface Coupon {
  id: string;
  seller_id: string;
  code: string;
  name: string;
  description: string | null;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_order_amount: number;
  max_discount_amount: number | null;
  start_date: string;
  expiry_date: string;
  usage_limit: number;
  usage_limit_per_customer: number;
  times_used: number;
  applies_to: "all" | "robots" | "categories" | "brands";
  applicable_robot_ids: string[];
  applicable_categories: string[];
  applicable_brands: string[];
  is_active: boolean;
  admin_disabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface CouponUsage {
  id: string;
  coupon_id: string;
  customer_id: string;
  robot_id: string | null;
  original_price: number;
  discount_amount: number;
  final_price: number;
  order_reference: string | null;
  created_at: string;
}

export type CouponInput = Omit<
  Coupon,
  "id" | "seller_id" | "times_used" | "admin_disabled" | "created_at" | "updated_at"
>;

const sb = supabase as any;

export function useSellerCoupons() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [usagesByCoupon, setUsagesByCoupon] = useState<Record<string, CouponUsage[]>>({});
  const [loading, setLoading] = useState(true);

  const fetchCoupons = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await sb
      .from("seller_coupons")
      .select("*")
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      toast({ variant: "destructive", title: "Failed to load coupons", description: error.message });
    } else {
      setCoupons((data || []) as Coupon[]);
      const ids = (data || []).map((c: Coupon) => c.id);
      if (ids.length) {
        const { data: usages } = await sb
          .from("coupon_usages")
          .select("*")
          .in("coupon_id", ids);
        const map: Record<string, CouponUsage[]> = {};
        (usages || []).forEach((u: CouponUsage) => {
          (map[u.coupon_id] ||= []).push(u);
        });
        setUsagesByCoupon(map);
      } else {
        setUsagesByCoupon({});
      }
    }
    setLoading(false);
  }, [user, toast]);

  useEffect(() => { fetchCoupons(); }, [fetchCoupons]);

  const createCoupon = async (input: CouponInput) => {
    if (!user) return { error: "Not authenticated" };
    const payload = { ...input, code: input.code.toUpperCase().trim(), seller_id: user.id };
    const { error } = await sb.from("seller_coupons").insert(payload);
    if (error) { toast({ variant: "destructive", title: "Create failed", description: error.message }); return { error }; }
    toast({ title: "Coupon created" });
    await fetchCoupons();
    return {};
  };

  const updateCoupon = async (id: string, patch: Partial<CouponInput>) => {
    const p: any = { ...patch };
    if (p.code) p.code = p.code.toUpperCase().trim();
    const { error } = await sb.from("seller_coupons").update(p).eq("id", id);
    if (error) { toast({ variant: "destructive", title: "Update failed", description: error.message }); return { error }; }
    toast({ title: "Coupon updated" });
    await fetchCoupons();
    return {};
  };

  const deleteCoupon = async (id: string) => {
    if (!confirm("Delete this coupon?")) return;
    const { error } = await sb.from("seller_coupons").delete().eq("id", id);
    if (error) { toast({ variant: "destructive", title: "Delete failed", description: error.message }); return; }
    toast({ title: "Coupon deleted" });
    await fetchCoupons();
  };

  const toggleActive = async (c: Coupon) => updateCoupon(c.id, { is_active: !c.is_active } as any);

  return { coupons, usagesByCoupon, loading, fetchCoupons, createCoupon, updateCoupon, deleteCoupon, toggleActive };
}

// Public helper: list valid coupons for a specific robot/seller
export function useRobotCoupons(robotId?: string, sellerId?: string) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!sellerId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await sb
        .from("seller_coupons")
        .select("*")
        .eq("seller_id", sellerId)
        .eq("is_active", true)
        .eq("admin_disabled", false)
        .gte("expiry_date", new Date().toISOString());
      const list = ((data || []) as Coupon[]).filter((c) => {
        if (c.applies_to === "all") return true;
        if (!robotId) return true;
        if (c.applies_to === "robots") return c.applicable_robot_ids.includes(robotId);
        return true; // categories/brands evaluated server-side at apply
      });
      if (!cancelled) { setCoupons(list); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [robotId, sellerId]);

  return { coupons, loading };
}

export async function validateCoupon(params: {
  code: string; sellerId: string; robotId?: string; amount: number;
}) {
  const { data, error } = await sb.rpc("validate_and_apply_coupon", {
    p_code: params.code,
    p_seller_id: params.sellerId,
    p_robot_id: params.robotId ?? null,
    p_order_amount: params.amount,
  });
  if (error) return { valid: false, error: error.message };
  return data as any;
}

export async function recordCouponUsage(params: {
  couponId: string; robotId?: string; originalPrice: number; orderReference?: string;
}) {
  const { data, error } = await sb.rpc("record_coupon_usage", {
    p_coupon_id: params.couponId,
    p_robot_id: params.robotId ?? null,
    p_original_price: params.originalPrice,
    p_order_reference: params.orderReference ?? null,
  });
  if (error) return { success: false, error: error.message };
  return data as any;
}
