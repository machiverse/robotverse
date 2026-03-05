import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Handshake, CheckCircle, Clock, Search, IndianRupee, 
  TrendingUp, FileText, Users, Loader2, ShieldCheck
} from "lucide-react";
import { format } from "date-fns";

const AdminDealsCommission = () => {
  const { toast } = useToast();
  const [deals, setDeals] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchDeals();
    fetchInvoices();
  }, []);

  const fetchDeals = async () => {
    const { data, error } = await supabase
      .from("deals" as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setDeals(data as any);
    setLoading(false);
  };

  const fetchInvoices = async () => {
    const { data } = await supabase
      .from("commission_invoices" as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setInvoices(data as any);
  };

  const verifyDeal = async (dealId: string) => {
    const { error } = await supabase
      .from("deals" as any)
      .update({ 
        admin_verified: true, 
        admin_verified_at: new Date().toISOString() 
      } as any)
      .eq("id", dealId);

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Deal Verified", description: "Commission invoice will be generated if deal is won." });
      fetchDeals();
      setTimeout(fetchInvoices, 1000);
    }
  };

  const updateInvoiceStatus = async (invoiceId: string, status: string) => {
    const updateData: any = { status };
    if (status === "paid") updateData.paid_at = new Date().toISOString();

    const { error } = await supabase
      .from("commission_invoices" as any)
      .update(updateData)
      .eq("id", invoiceId);

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Updated", description: `Invoice status changed to ${status}` });
      fetchInvoices();
    }
  };

  const filteredDeals = deals.filter(d => {
    const matchSearch = !search || 
      d.buyer_name?.toLowerCase().includes(search.toLowerCase()) ||
      d.product_name?.toLowerCase().includes(search.toLowerCase()) ||
      d.deal_number?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || d.deal_status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Stats
  const totalPlatformSales = deals.filter(d => d.deal_status === "deal_won").reduce((s, d) => s + Number(d.quote_value), 0);
  const totalCommissionEarned = deals.filter(d => d.deal_status === "deal_won" && d.admin_verified).reduce((s, d) => s + Number(d.commission_amount), 0);
  const activeDeals = deals.filter(d => !["deal_won", "deal_lost"].includes(d.deal_status)).length;
  const pendingVerification = deals.filter(d => d.deal_status === "deal_won" && !d.admin_verified).length;

  const statusColors: Record<string, string> = {
    lead_generated: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    quote_sent: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    negotiation: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    deal_won: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    deal_lost: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  };

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Deals & Commission Management</h2>
        <p className="text-sm text-muted-foreground">Monitor all platform deals, verify transactions, and manage commission invoices.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { title: "Total Platform Sales", value: `₹${totalPlatformSales.toLocaleString("en-IN")}`, icon: IndianRupee, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
          { title: "Commission Earned", value: `₹${totalCommissionEarned.toLocaleString("en-IN")}`, icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/30" },
          { title: "Active Deals", value: activeDeals, icon: Handshake, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
          { title: "Pending Verification", value: pendingVerification, icon: ShieldCheck, color: pendingVerification > 0 ? "text-orange-600" : "text-muted-foreground", bg: pendingVerification > 0 ? "bg-orange-50 dark:bg-orange-950/30" : "bg-muted/30" },
        ].map((stat) => (
          <Card key={stat.title} className="border-muted/60 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-semibold">{stat.value}</p>
                </div>
                <div className={`rounded-lg p-2 ${stat.bg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Deals Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2"><Handshake className="h-5 w-5" /> All Deals</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search deals..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 w-[200px]" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="lead_generated">Lead Generated</SelectItem>
                  <SelectItem value="quote_sent">Quote Sent</SelectItem>
                  <SelectItem value="negotiation">Negotiation</SelectItem>
                  <SelectItem value="deal_won">Deal Won</SelectItem>
                  <SelectItem value="deal_lost">Deal Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Deal #</TableHead>
                  <TableHead>Buyer</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Deal Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Verified</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDeals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No deals found</TableCell>
                  </TableRow>
                ) : filteredDeals.map((deal) => (
                  <TableRow key={deal.id}>
                    <TableCell className="font-mono text-sm">{deal.deal_number}</TableCell>
                    <TableCell>
                      <div>{deal.buyer_name}</div>
                      <div className="text-xs text-muted-foreground">{deal.buyer_company}</div>
                    </TableCell>
                    <TableCell>{deal.product_name}</TableCell>
                    <TableCell className="text-right font-medium">₹{Number(deal.quote_value).toLocaleString("en-IN")}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[deal.deal_status] || ""}>{deal.deal_status.replace(/_/g, " ")}</Badge>
                    </TableCell>
                    <TableCell>
                      {deal.admin_verified ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {deal.deal_status === "deal_won" ? `₹${Number(deal.commission_amount).toLocaleString("en-IN")}` : "-"}
                    </TableCell>
                    <TableCell className="text-xs">{format(new Date(deal.created_at), "dd MMM yyyy")}</TableCell>
                    <TableCell>
                      {deal.deal_status === "deal_won" && !deal.admin_verified && (
                        <Button size="sm" variant="outline" onClick={() => verifyDeal(deal.id)} className="gap-1 text-xs">
                          <ShieldCheck className="h-3 w-3" /> Verify
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Commission Invoices */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Commission Invoices</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead className="text-right">Deal Value</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No invoices yet</TableCell>
                  </TableRow>
                ) : invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-sm">{inv.invoice_number}</TableCell>
                    <TableCell className="text-right">₹{Number(inv.deal_value).toLocaleString("en-IN")}</TableCell>
                    <TableCell className="text-right font-medium">₹{Number(inv.commission_amount).toLocaleString("en-IN")}</TableCell>
                    <TableCell>
                      <Badge variant={inv.status === "paid" ? "default" : "secondary"}>{inv.status}</Badge>
                    </TableCell>
                    <TableCell>{inv.due_date ? format(new Date(inv.due_date), "dd MMM yyyy") : "-"}</TableCell>
                    <TableCell>
                      {inv.status !== "paid" && inv.status !== "cancelled" && (
                        <Select value="" onValueChange={(v) => updateInvoiceStatus(inv.id, v)}>
                          <SelectTrigger className="w-[110px] h-8 text-xs"><SelectValue placeholder="Update" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sent">Mark Sent</SelectItem>
                            <SelectItem value="paid">Mark Paid</SelectItem>
                            <SelectItem value="overdue">Mark Overdue</SelectItem>
                            <SelectItem value="cancelled">Cancel</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDealsCommission;
