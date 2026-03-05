import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  Plus, CheckCircle, Clock, Loader2,
  IndianRupee, Target, Handshake, FileText
} from "lucide-react";
import { format } from "date-fns";

interface Deal {
  id: string;
  deal_number: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  buyer_company: string;
  product_name: string;
  product_type: string;
  quote_value: number;
  deal_status: string;
  commission_rate: number;
  commission_amount: number;
  admin_verified: boolean;
  closing_date: string | null;
  notes: string;
  created_at: string;
}

interface CommissionInvoice {
  id: string;
  invoice_number: string;
  deal_value: number;
  commission_amount: number;
  status: string;
  due_date: string | null;
  created_at: string;
}

const CommissionDealsSection = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [invoices, setInvoices] = useState<CommissionInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDeal, setShowCreateDeal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [dealTab, setDealTab] = useState("overview");

  const [newDeal, setNewDeal] = useState({
    buyer_name: "", buyer_email: "", buyer_phone: "", buyer_company: "",
    product_name: "", product_type: "robot", quote_value: "", notes: "",
  });

  useEffect(() => {
    if (user) { fetchDeals(); fetchInvoices(); }
  }, [user]);

  const fetchDeals = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("deals" as any).select("*")
      .eq("seller_id", user.id).order("created_at", { ascending: false });
    if (data) setDeals(data as any);
    setLoading(false);
  };

  const fetchInvoices = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("commission_invoices" as any).select("*")
      .eq("seller_id", user.id).order("created_at", { ascending: false });
    if (data) setInvoices(data as any);
  };

  const handleCreateDeal = async () => {
    if (!user || !newDeal.buyer_name || !newDeal.product_name || !newDeal.quote_value) {
      toast({ variant: "destructive", title: "Error", description: "Fill all required fields" });
      return;
    }
    setCreating(true);
    try {
      const { error } = await supabase.from("deals" as any).insert({
        seller_id: user.id, buyer_name: newDeal.buyer_name,
        buyer_email: newDeal.buyer_email, buyer_phone: newDeal.buyer_phone,
        buyer_company: newDeal.buyer_company, product_name: newDeal.product_name,
        product_type: newDeal.product_type, quote_value: parseFloat(newDeal.quote_value),
        notes: newDeal.notes,
      } as any);
      if (error) throw error;
      toast({ title: "Deal Created", description: "New deal added" });
      setShowCreateDeal(false);
      setNewDeal({ buyer_name: "", buyer_email: "", buyer_phone: "", buyer_company: "", product_name: "", product_type: "robot", quote_value: "", notes: "" });
      fetchDeals();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally { setCreating(false); }
  };

  const updateDealStatus = async (dealId: string, status: string) => {
    try {
      const updateData: any = { deal_status: status };
      if (status === "deal_won") updateData.closing_date = new Date().toISOString().split("T")[0];
      const { error } = await supabase.from("deals" as any).update(updateData).eq("id", dealId);
      if (error) throw error;
      toast({ title: "Updated", description: `Deal status changed to ${status.replace(/_/g, " ")}` });
      fetchDeals(); fetchInvoices();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const totalDeals = deals.length;
  const dealsWon = deals.filter(d => d.deal_status === "deal_won").length;
  const activeQuotes = deals.filter(d => ["quote_sent", "negotiation"].includes(d.deal_status)).length;
  const totalSalesValue = deals.filter(d => d.deal_status === "deal_won").reduce((s, d) => s + Number(d.quote_value), 0);
  const totalCommission = deals.filter(d => d.deal_status === "deal_won").reduce((s, d) => s + Number(d.commission_amount), 0);
  const pendingInvoices = invoices.filter(i => i.status === "pending").length;

  const statusColors: Record<string, string> = {
    lead_generated: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    quote_sent: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    negotiation: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    deal_won: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    deal_lost: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  };

  if (loading) {
    return <div className="flex h-32 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { title: "Total Deals", value: totalDeals, icon: Handshake, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
          { title: "Active Quotes", value: activeQuotes, icon: Target, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30" },
          { title: "Deals Won", value: dealsWon, icon: CheckCircle, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/30" },
          { title: "Total Sales", value: `₹${totalSalesValue.toLocaleString("en-IN")}`, icon: IndianRupee, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
          { title: "Commission (5%)", value: `₹${totalCommission.toLocaleString("en-IN")}`, icon: FileText, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/30" },
          { title: "Pending Invoices", value: pendingInvoices, icon: FileText, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950/30" },
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

      {/* Deals & Invoices */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Deal Tracker</CardTitle>
            <CardDescription>Manage deals and view commission invoices</CardDescription>
          </div>
          <Button onClick={() => setShowCreateDeal(true)} size="sm"><Plus className="h-4 w-4 mr-2" /> New Deal</Button>
        </CardHeader>
        <Tabs value={dealTab} onValueChange={setDealTab}>
          <div className="px-6">
            <TabsList>
              <TabsTrigger value="overview"><Handshake className="mr-2 h-4 w-4" /> Deals</TabsTrigger>
              <TabsTrigger value="invoices">
                <FileText className="mr-2 h-4 w-4" /> Invoices
                {pendingInvoices > 0 && <Badge variant="destructive" className="ml-2 h-5 px-1.5 text-[11px]">{pendingInvoices}</Badge>}
              </TabsTrigger>
            </TabsList>
          </div>
          <CardContent className="p-0">
            <TabsContent value="overview" className="m-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Deal #</TableHead>
                      <TableHead>Buyer</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Quote Value</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Verified</TableHead>
                      <TableHead className="text-right">Commission</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deals.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No deals yet. Click "New Deal" to create one.
                        </TableCell>
                      </TableRow>
                    ) : deals.map((deal) => (
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
                          {deal.admin_verified ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Clock className="h-4 w-4 text-muted-foreground" />}
                        </TableCell>
                        <TableCell className="text-right">
                          {deal.deal_status === "deal_won" ? `₹${Number(deal.commission_amount).toLocaleString("en-IN")}` : "-"}
                        </TableCell>
                        <TableCell>
                          {deal.deal_status !== "deal_won" && deal.deal_status !== "deal_lost" && (
                            <Select value="" onValueChange={(v) => updateDealStatus(deal.id, v)}>
                              <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="Update" /></SelectTrigger>
                              <SelectContent>
                                {deal.deal_status === "lead_generated" && <SelectItem value="quote_sent">Quote Sent</SelectItem>}
                                {["lead_generated", "quote_sent"].includes(deal.deal_status) && <SelectItem value="negotiation">Negotiation</SelectItem>}
                                <SelectItem value="deal_won">Deal Won</SelectItem>
                                <SelectItem value="deal_lost">Deal Lost</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
            <TabsContent value="invoices" className="m-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead className="text-right">Deal Value</TableHead>
                      <TableHead className="text-right">Commission (5%)</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No invoices yet. Invoices are generated when deals are won and verified by admin.
                        </TableCell>
                      </TableRow>
                    ) : invoices.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono text-sm">{inv.invoice_number}</TableCell>
                        <TableCell className="text-right">₹{Number(inv.deal_value).toLocaleString("en-IN")}</TableCell>
                        <TableCell className="text-right font-medium">₹{Number(inv.commission_amount).toLocaleString("en-IN")}</TableCell>
                        <TableCell><Badge variant={inv.status === "paid" ? "default" : "secondary"}>{inv.status}</Badge></TableCell>
                        <TableCell>{inv.due_date ? format(new Date(inv.due_date), "dd MMM yyyy") : "-"}</TableCell>
                        <TableCell>{format(new Date(inv.created_at), "dd MMM yyyy")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      {/* Create Deal Modal */}
      <Dialog open={showCreateDeal} onOpenChange={setShowCreateDeal}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Create New Deal</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Buyer Name *</Label>
                <Input value={newDeal.buyer_name} onChange={(e) => setNewDeal({ ...newDeal, buyer_name: e.target.value })} placeholder="Buyer name" />
              </div>
              <div className="space-y-2">
                <Label>Company</Label>
                <Input value={newDeal.buyer_company} onChange={(e) => setNewDeal({ ...newDeal, buyer_company: e.target.value })} placeholder="Company" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={newDeal.buyer_email} onChange={(e) => setNewDeal({ ...newDeal, buyer_email: e.target.value })} placeholder="Email" />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={newDeal.buyer_phone} onChange={(e) => setNewDeal({ ...newDeal, buyer_phone: e.target.value })} placeholder="Phone" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Product Name *</Label>
                <Input value={newDeal.product_name} onChange={(e) => setNewDeal({ ...newDeal, product_name: e.target.value })} placeholder="Robot / Part name" />
              </div>
              <div className="space-y-2">
                <Label>Product Type</Label>
                <Select value={newDeal.product_type} onValueChange={(v) => setNewDeal({ ...newDeal, product_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="robot">Industrial Robot</SelectItem>
                    <SelectItem value="automation">Automation System</SelectItem>
                    <SelectItem value="spare_part">Spare Part</SelectItem>
                    <SelectItem value="service">Service</SelectItem>
                    <SelectItem value="refurbished">Refurbished Equipment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Quote Value (₹) *</Label>
              <Input type="number" value={newDeal.quote_value} onChange={(e) => setNewDeal({ ...newDeal, quote_value: e.target.value })} placeholder="e.g. 1000000" />
              {newDeal.quote_value && (
                <p className="text-xs text-muted-foreground">
                  Robotverse Commission (5%): ₹{(parseFloat(newDeal.quote_value) * 0.05).toLocaleString("en-IN")}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input value={newDeal.notes} onChange={(e) => setNewDeal({ ...newDeal, notes: e.target.value })} placeholder="Optional notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDeal(false)}>Cancel</Button>
            <Button onClick={handleCreateDeal} disabled={creating}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create Deal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CommissionDealsSection;
