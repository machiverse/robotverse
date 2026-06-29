import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Ban, Power, Trash2, Loader2, Ticket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const sb = supabase as any;

export default function AdminCouponsPanel() {
  const { toast } = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await sb
      .from("seller_coupons")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast({ variant: "destructive", title: "Failed", description: error.message });
    setRows(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = rows.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.code?.toLowerCase().includes(q) || r.name?.toLowerCase().includes(q) || r.seller_id?.includes(q);
  });

  const toggleAdminDisable = async (id: string, current: boolean) => {
    const { error } = await sb.from("seller_coupons").update({ admin_disabled: !current }).eq("id", id);
    if (error) toast({ variant: "destructive", title: "Failed", description: error.message });
    else { toast({ title: !current ? "Coupon disabled" : "Coupon re-enabled" }); load(); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this coupon permanently?")) return;
    const { error } = await sb.from("seller_coupons").delete().eq("id", id);
    if (error) toast({ variant: "destructive", title: "Failed", description: error.message });
    else { toast({ title: "Deleted" }); load(); }
  };

  const totalRedemptions = rows.reduce((s, r) => s + (r.times_used || 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase">Total Coupons</p>
          <p className="text-2xl font-semibold">{rows.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase">Disabled by Admin</p>
          <p className="text-2xl font-semibold">{rows.filter((r) => r.admin_disabled).length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase">Total Redemptions</p>
          <p className="text-2xl font-semibold">{totalRedemptions}</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2"><Ticket className="w-5 h-5" /> All Seller Coupons</CardTitle>
              <CardDescription>Search, disable, or delete fraudulent coupons.</CardDescription>
            </div>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-10" placeholder="Search code, name, seller id..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No coupons found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Seller</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Used</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono font-semibold">{c.code}</TableCell>
                    <TableCell>{c.name}</TableCell>
                    <TableCell className="text-xs font-mono">{c.seller_id.slice(0, 8)}…</TableCell>
                    <TableCell>{c.discount_type === "percentage" ? `${c.discount_value}%` : `₹${c.discount_value}`}</TableCell>
                    <TableCell>{c.times_used}{c.usage_limit > 0 ? `/${c.usage_limit}` : ""}</TableCell>
                    <TableCell className="text-xs">{format(new Date(c.expiry_date), "dd MMM yyyy")}</TableCell>
                    <TableCell>
                      {c.admin_disabled ? <Badge variant="destructive">Disabled</Badge>
                        : c.is_active ? <Badge>Active</Badge>
                        : <Badge variant="secondary">Inactive</Badge>}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" title={c.admin_disabled ? "Re-enable" : "Disable"} onClick={() => toggleAdminDisable(c.id, c.admin_disabled)}>
                          {c.admin_disabled ? <Power className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => remove(c.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
