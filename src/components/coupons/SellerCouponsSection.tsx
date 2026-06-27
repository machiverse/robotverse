import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, BarChart3, Power, Ticket, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useSellerCoupons, type Coupon } from "@/hooks/useCoupons";
import CouponFormDialog from "./CouponFormDialog";

export default function SellerCouponsSection() {
  const { coupons, usagesByCoupon, loading, createCoupon, updateCoupon, deleteCoupon, toggleActive } = useSellerCoupons();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);

  const totals = useMemo(() => {
    let totalDiscount = 0;
    let totalUses = 0;
    Object.values(usagesByCoupon).forEach((arr) => {
      arr.forEach((u) => { totalDiscount += Number(u.discount_amount); totalUses += 1; });
    });
    return { totalDiscount, totalUses };
  }, [usagesByCoupon]);

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase">Active Coupons</p>
          <p className="text-2xl font-semibold">{coupons.filter((c) => c.is_active && !c.admin_disabled).length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase">Total Redemptions</p>
          <p className="text-2xl font-semibold">{totals.totalUses}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase">Total Discount Given</p>
          <p className="text-2xl font-semibold">₹{totals.totalDiscount.toLocaleString("en-IN")}</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Ticket className="w-5 h-5" /> My Coupons</CardTitle>
            <CardDescription>Create and manage discount codes for your buyers.</CardDescription>
          </div>
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Create Coupon
          </Button>
        </CardHeader>
        <CardContent>
          {coupons.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Ticket className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>No coupons yet. Create your first one to offer discounts.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Validity</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.map((c) => {
                  const uses = usagesByCoupon[c.id] || [];
                  const totalDisc = uses.reduce((s, u) => s + Number(u.discount_amount), 0);
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono font-semibold">{c.code}</TableCell>
                      <TableCell>{c.name}</TableCell>
                      <TableCell>
                        {c.discount_type === "percentage"
                          ? `${c.discount_value}%${c.max_discount_amount ? ` (max ₹${c.max_discount_amount})` : ""}`
                          : `₹${Number(c.discount_value).toLocaleString("en-IN")}`}
                      </TableCell>
                      <TableCell className="text-xs">
                        {format(new Date(c.start_date), "dd MMM")} → {format(new Date(c.expiry_date), "dd MMM yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs">
                          <div>{c.times_used}{c.usage_limit > 0 ? ` / ${c.usage_limit}` : ""}</div>
                          {totalDisc > 0 && <div className="text-muted-foreground">₹{totalDisc.toLocaleString("en-IN")} given</div>}
                        </div>
                      </TableCell>
                      <TableCell>
                        {c.admin_disabled ? (
                          <Badge variant="destructive">Disabled</Badge>
                        ) : c.is_active ? (
                          <Badge>Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" title="Toggle active" onClick={() => toggleActive(c)}>
                            <Power className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" title="Edit" onClick={() => { setEditing(c); setFormOpen(true); }}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" title="Delete" className="text-destructive" onClick={() => deleteCoupon(c.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CouponFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
        onSubmit={(input) => editing ? updateCoupon(editing.id, input) : createCoupon(input)}
      />
    </div>
  );
}
