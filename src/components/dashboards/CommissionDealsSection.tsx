import { Fragment, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  Plus, CheckCircle, Clock, Loader2,
  Target, Handshake, FileText, ChevronDown, ChevronUp,
  Package, Calendar, FileCheck, IndianRupee, CreditCard
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
  is_virtual_quote?: boolean;
}

interface CRMQuotationRow {
  id: string;
  quotation_number: string;
  buyer_name: string;
  buyer_email: string | null;
  buyer_phone: string | null;
  buyer_company: string | null;
  items: any;
  status: string | null;
  total_amount: number | null;
  created_at: string;
  notes: string | null;
}

interface QuotationDetails {
  quotation_number: string;
  items: any[];
  valid_until: string | null;
  terms_conditions: string | null;
  notes: string | null;
  status: string | null;
  sent_at: string | null;
  created_at: string;
  subtotal: number;
  total_amount: number;
  tax_rate: number | null;
  tax_amount: number | null;
  discount_amount: number | null;
  shipping_amount: number | null;
  currency: string | null;
  buyer_name: string;
  buyer_company: string | null;
  buyer_email: string | null;
  buyer_phone: string | null;
}

const CommissionDealsSection = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDeal, setShowCreateDeal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [expandedDeal, setExpandedDeal] = useState<string | null>(null);
  const [quotationDetails, setQuotationDetails] = useState<Record<string, QuotationDetails | null>>({});
  const [loadingQuotation, setLoadingQuotation] = useState<string | null>(null);

  const [newDeal, setNewDeal] = useState({
    buyer_name: "", buyer_email: "", buyer_phone: "", buyer_company: "",
    product_name: "", product_type: "robot", notes: "",
  });

  useEffect(() => {
    if (user) { fetchDeals(); }
  }, [user]);

  const extractQuotationNumber = (value?: string | null) => {
    if (!value) return null;
    const match = value.match(/QT-[A-Z0-9]+/i);
    return match ? match[0].toUpperCase() : null;
  };

  const mapQuotationStatusToDealStatus = (status?: string | null): Deal["deal_status"] => {
    const normalized = (status || "").toLowerCase();
    if (normalized === "sent" || normalized === "draft") return "quote_sent";
    if (normalized === "accepted") return "deal_won";
    if (normalized === "rejected") return "deal_lost";
    return "negotiation";
  };

  const getItemsList = (items: unknown): any[] => {
    if (Array.isArray(items)) return items;
    if (typeof items === "string") {
      try {
        const parsed = JSON.parse(items);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const fetchDeals = async () => {
    if (!user) return;

    const [{ data: dealsData }, { data: quotationsData }] = await Promise.all([
      supabase
        .from("deals" as any)
        .select("*")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("crm_quotations")
        .select("id, quotation_number, buyer_name, buyer_email, buyer_phone, buyer_company, items, status, total_amount, created_at, notes")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

    const realDeals = ((dealsData || []) as unknown) as Deal[];
    const usedQuotationNumbers = new Set(
      realDeals
        .map((deal) => extractQuotationNumber(`${deal.notes || ""} ${deal.deal_number || ""}`))
        .filter((value): value is string => Boolean(value))
    );

    const virtualDeals = (((quotationsData || []) as unknown) as CRMQuotationRow[])
      .filter((quote) => !usedQuotationNumbers.has((quote.quotation_number || "").toUpperCase()))
      .map((quote) => {
        const items = getItemsList(quote.items);
        const productName = items.length
          ? items.map((item: any) => item?.name).filter(Boolean).join(", ")
          : "Quotation Item";

        return {
          id: `quotation-${quote.id}`,
          deal_number: quote.quotation_number,
          buyer_name: quote.buyer_name,
          buyer_email: quote.buyer_email || "",
          buyer_phone: quote.buyer_phone || "",
          buyer_company: quote.buyer_company || "",
          product_name: productName,
          product_type: "robot",
          quote_value: Number(quote.total_amount || 0),
          deal_status: mapQuotationStatusToDealStatus(quote.status),
          commission_rate: 5,
          commission_amount: 0,
          admin_verified: false,
          closing_date: null,
          notes: `Quotation ${quote.quotation_number} sent${quote.notes ? `. ${quote.notes}` : ""}`,
          created_at: quote.created_at,
          is_virtual_quote: true,
        } as Deal;
      });

    const mergedDeals = [...realDeals, ...virtualDeals].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    setDeals(mergedDeals);
    setLoading(false);
  };

  const fetchQuotationDetails = async (deal: Deal) => {
    const qtInfo = getQuotationInfo(deal);
    if (!qtInfo.quotationNumber || quotationDetails[deal.id]) return;

    setLoadingQuotation(deal.id);
    try {
      const { data } = await supabase
        .from("crm_quotations")
        .select("quotation_number, items, valid_until, terms_conditions, notes, status, sent_at, created_at, subtotal, total_amount, tax_rate, tax_amount, discount_amount, shipping_amount, currency, buyer_name, buyer_company, buyer_email, buyer_phone")
        .eq("seller_id", user?.id)
        .eq("quotation_number", qtInfo.quotationNumber)
        .maybeSingle();

      if (data) {
        // Parse items if it's a string
        let parsedItems = data.items;
        if (typeof parsedItems === "string") {
          try { parsedItems = JSON.parse(parsedItems); } catch { parsedItems = []; }
        }
        setQuotationDetails(prev => ({
          ...prev,
          [deal.id]: { ...data, items: Array.isArray(parsedItems) ? parsedItems : [] } as QuotationDetails,
        }));
      } else {
        setQuotationDetails(prev => ({ ...prev, [deal.id]: null }));
      }
    } catch (err) {
      console.error("Error fetching quotation:", err);
    } finally {
      setLoadingQuotation(null);
    }
  };

  const handleExpandDeal = (deal: Deal) => {
    if (expandedDeal === deal.id) {
      setExpandedDeal(null);
    } else {
      setExpandedDeal(deal.id);
      const qtInfo = getQuotationInfo(deal);
      if (qtInfo.isFromQuote && !quotationDetails[deal.id]) {
        fetchQuotationDetails(deal);
      }
    }
  };

  const handleCreateDeal = async () => {
    if (!user || !newDeal.buyer_name || !newDeal.product_name) {
      toast({ variant: "destructive", title: "Error", description: "Fill all required fields" });
      return;
    }
    setCreating(true);
    try {
      const { error } = await supabase.from("deals" as any).insert({
        seller_id: user.id, buyer_name: newDeal.buyer_name,
        buyer_email: newDeal.buyer_email, buyer_phone: newDeal.buyer_phone,
        buyer_company: newDeal.buyer_company, product_name: newDeal.product_name,
        product_type: newDeal.product_type,
        notes: newDeal.notes,
      } as any);
      if (error) throw error;
      toast({ title: "Deal Created", description: "New deal added" });
      setShowCreateDeal(false);
      setNewDeal({ buyer_name: "", buyer_email: "", buyer_phone: "", buyer_company: "", product_name: "", product_type: "robot", notes: "" });
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
      fetchDeals();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const totalDeals = deals.length;
  const dealsWon = deals.filter(d => d.deal_status === "deal_won").length;
  const activeQuotes = deals.filter(d => ["quote_sent", "negotiation"].includes(d.deal_status)).length;
  const totalPlatformCommission = deals
    .filter(d => d.deal_status === "deal_won")
    .reduce((sum, d) => sum + (d.quote_value * 0.05), 0);

  const statusColors: Record<string, string> = {
    lead_generated: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    quote_sent: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    negotiation: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    deal_won: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    deal_lost: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  };

  const getQuotationInfo = (deal: Deal) => {
    const quotationNumber =
      extractQuotationNumber(deal.deal_number) ||
      extractQuotationNumber(deal.notes) ||
      null;

    return {
      quotationNumber,
      isFromQuote: Boolean(quotationNumber),
    };
  };

  if (loading) {
    return <div className="flex h-32 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { title: "Total Deals", value: totalDeals, icon: Handshake, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
          { title: "Active Quotes", value: activeQuotes, icon: Target, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30" },
          { title: "Deals Won", value: dealsWon, icon: CheckCircle, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/30" },
          { title: "Platform Commission (5%)", value: `₹${totalPlatformCommission.toLocaleString("en-IN")}`, icon: FileText, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
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
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Deal Tracker</CardTitle>
            <CardDescription>Quotes sent from Lead Manager appear here automatically — click a row to view quote details</CardDescription>
          </div>
          <Button onClick={() => setShowCreateDeal(true)} size="sm"><Plus className="h-4 w-4 mr-2" /> New Deal</Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Deal #</TableHead>
                  <TableHead>Buyer</TableHead>
                  <TableHead>Product</TableHead>
                   <TableHead className="text-right">Deal Value</TableHead>
                   <TableHead className="text-right">Commission (5%)</TableHead>
                   <TableHead>Source</TableHead>
                   <TableHead>Status</TableHead>
                   <TableHead>Verified</TableHead>
                   <TableHead>Date</TableHead>
                   <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                      No deals yet. Send a quotation from Lead Manager or click "New Deal" to create one.
                    </TableCell>
                  </TableRow>
                ) : deals.map((deal) => {
                  const qtInfo = getQuotationInfo(deal);
                  const isExpanded = expandedDeal === deal.id;
                  const qtDetails = quotationDetails[deal.id];

                  return (
                    <Fragment key={deal.id}>
                      <TableRow
                        key={deal.id}
                        className={`${qtInfo.isFromQuote ? "cursor-pointer" : ""} transition-colors ${isExpanded ? "bg-muted/40" : ""}`}
                        onClick={() => qtInfo.isFromQuote && handleExpandDeal(deal)}
                      >
                        <TableCell className="w-8 px-2">
                          {qtInfo.isFromQuote && (
                            isExpanded
                              ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                              : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{deal.deal_number}</TableCell>
                        <TableCell>
                          <div className="font-medium">{deal.buyer_name}</div>
                          {deal.buyer_company && <div className="text-xs text-muted-foreground">{deal.buyer_company}</div>}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{deal.product_name}</TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {deal.quote_value > 0 ? `₹${Number(deal.quote_value).toLocaleString("en-IN")}` : "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-emerald-600 font-medium">
                          {deal.quote_value > 0 ? `₹${(deal.quote_value * 0.05).toLocaleString("en-IN")}` : "—"}
                        </TableCell>
                        <TableCell>
                          {qtInfo.isFromQuote ? (
                            <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 text-xs">
                              <FileText className="h-3 w-3 mr-1" />
                              {qtInfo.quotationNumber}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">Manual</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[deal.deal_status] || ""}>{deal.deal_status.replace(/_/g, " ")}</Badge>
                        </TableCell>
                        <TableCell>
                          {deal.admin_verified ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Clock className="h-4 w-4 text-muted-foreground" />}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(deal.created_at), "dd MMM yyyy")}
                        </TableCell>
                        <TableCell>
                          {!deal.is_virtual_quote && deal.deal_status !== "deal_won" && deal.deal_status !== "deal_lost" && (
                            <Select value="" onValueChange={(v) => updateDealStatus(deal.id, v)}>
                              <SelectTrigger className="w-[130px] h-8 text-xs" onClick={(e) => e.stopPropagation()}><SelectValue placeholder="Update" /></SelectTrigger>
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

                      {/* Expanded Quotation Details Row */}
                      {isExpanded && qtInfo.isFromQuote && (
                        <TableRow key={`${deal.id}-details`} className="bg-muted/20 hover:bg-muted/30">
                          <TableCell colSpan={11} className="p-0">
                            <div className="px-6 py-4 space-y-4">
                              {loadingQuotation === deal.id ? (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                                  <Loader2 className="h-4 w-4 animate-spin" /> Loading quotation details...
                                </div>
                              ) : qtDetails ? (
                                <>
                                  {/* Quotation Header */}
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <FileCheck className="h-5 w-5 text-indigo-600" />
                                      <h4 className="font-semibold text-sm">Quotation: {qtDetails.quotation_number}</h4>
                                      <Badge variant="outline" className="text-xs capitalize">{qtDetails.status}</Badge>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                      {qtDetails.sent_at && (
                                        <span className="flex items-center gap-1">
                                          <Calendar className="h-3.5 w-3.5" />
                                          Sent: {format(new Date(qtDetails.sent_at), "dd MMM yyyy")}
                                        </span>
                                      )}
                                      {qtDetails.valid_until && (
                                        <span className="flex items-center gap-1">
                                          <Clock className="h-3.5 w-3.5" />
                                          Valid until: {format(new Date(qtDetails.valid_until), "dd MMM yyyy")}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Quoted Items */}
                                 {qtDetails.items && qtDetails.items.length > 0 && (
                                     <div className="rounded-lg border border-border/60 overflow-hidden">
                                       <Table>
                                         <TableHeader>
                                           <TableRow className="bg-muted/50">
                                             <TableHead className="text-xs py-2">Item</TableHead>
                                             <TableHead className="text-xs py-2">Description</TableHead>
                                             <TableHead className="text-xs py-2 text-center">Qty</TableHead>
                                             <TableHead className="text-xs py-2 text-right">Unit Price</TableHead>
                                             <TableHead className="text-xs py-2 text-right">Total</TableHead>
                                           </TableRow>
                                         </TableHeader>
                                         <TableBody>
                                           {qtDetails.items.map((item: any, idx: number) => (
                                             <TableRow key={idx} className="text-sm">
                                               <TableCell className="py-2">
                                                 <div className="flex items-center gap-2">
                                                   <Package className="h-3.5 w-3.5 text-muted-foreground" />
                                                   <span className="font-medium">{item.name || "—"}</span>
                                                 </div>
                                               </TableCell>
                                               <TableCell className="py-2 text-muted-foreground text-xs">
                                                 {item.description || "—"}
                                               </TableCell>
                                               <TableCell className="py-2 text-center">{item.quantity || 1}</TableCell>
                                               <TableCell className="py-2 text-right font-mono text-xs">
                                                 {item.unitPrice != null || item.unit_price != null
                                                   ? `₹${Number(item.unitPrice || item.unit_price || 0).toLocaleString()}`
                                                   : "—"}
                                               </TableCell>
                                               <TableCell className="py-2 text-right font-mono text-xs font-medium">
                                                 {item.total != null
                                                   ? `₹${Number(item.total).toLocaleString()}`
                                                   : item.unitPrice || item.unit_price
                                                     ? `₹${(Number(item.unitPrice || item.unit_price || 0) * Number(item.quantity || 1)).toLocaleString()}`
                                                     : "—"}
                                               </TableCell>
                                             </TableRow>
                                           ))}
                                         </TableBody>
                                       </Table>
                                     </div>
                                   )}

                                   {/* Financial Summary & Commission */}
                                   <div className="flex flex-col md:flex-row justify-end gap-4">
                                     <div className="w-full md:w-80 space-y-1.5 text-sm rounded-lg border border-border/60 p-3">
                                       <div className="flex justify-between text-muted-foreground">
                                         <span>Subtotal</span>
                                         <span className="font-mono">₹{Number(qtDetails.subtotal || 0).toLocaleString()}</span>
                                       </div>
                                       {(qtDetails.discount_amount ?? 0) > 0 && (
                                         <div className="flex justify-between text-muted-foreground">
                                           <span>Discount</span>
                                           <span className="font-mono text-green-600">-₹{Number(qtDetails.discount_amount).toLocaleString()}</span>
                                         </div>
                                       )}
                                       {(qtDetails.tax_amount ?? 0) > 0 && (
                                         <div className="flex justify-between text-muted-foreground">
                                           <span>Tax {qtDetails.tax_rate ? `(${qtDetails.tax_rate}%)` : ""}</span>
                                           <span className="font-mono">₹{Number(qtDetails.tax_amount).toLocaleString()}</span>
                                         </div>
                                       )}
                                       {(qtDetails.shipping_amount ?? 0) > 0 && (
                                         <div className="flex justify-between text-muted-foreground">
                                           <span>Shipping</span>
                                           <span className="font-mono">₹{Number(qtDetails.shipping_amount).toLocaleString()}</span>
                                         </div>
                                       )}
                                       <div className="flex justify-between font-semibold border-t border-border/60 pt-1.5">
                                         <span>Deal Amount</span>
                                         <span className="font-mono">₹{Number(qtDetails.total_amount || 0).toLocaleString()}</span>
                                       </div>
                                     </div>

                                     {/* RobotVerse Commission Card */}
                                     <div className="w-full md:w-80 rounded-lg border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 space-y-3">
                                       <div className="flex items-center gap-2">
                                         <IndianRupee className="h-4 w-4 text-emerald-600" />
                                         <h5 className="font-semibold text-sm text-emerald-800 dark:text-emerald-300">RobotVerse Platform Commission</h5>
                                       </div>
                                       <div className="space-y-1.5 text-sm">
                                         <div className="flex justify-between text-muted-foreground">
                                           <span>Deal ID</span>
                                           <span className="font-mono text-xs">{deal.deal_number}</span>
                                         </div>
                                         <div className="flex justify-between text-muted-foreground">
                                           <span>Deal Amount</span>
                                           <span className="font-mono">₹{Number(qtDetails.total_amount || 0).toLocaleString()}</span>
                                         </div>
                                         <div className="flex justify-between text-muted-foreground">
                                           <span>Commission Rate</span>
                                           <span className="font-mono">5%</span>
                                         </div>
                                         <div className="flex justify-between font-bold text-emerald-700 dark:text-emerald-400 border-t border-emerald-200 dark:border-emerald-800 pt-1.5">
                                           <span>Commission Amount</span>
                                           <span className="font-mono">₹{(Number(qtDetails.total_amount || 0) * 0.05).toLocaleString()}</span>
                                         </div>
                                       </div>
                                       {deal.deal_status === "deal_won" && (
                                         <Button
                                           size="sm"
                                           className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                                           onClick={(e) => {
                                             e.stopPropagation();
                                             toast({
                                               title: "Payment Initiated",
                                               description: `Commission payment of ₹${(Number(qtDetails.total_amount || 0) * 0.05).toLocaleString()} for Deal ${deal.deal_number} will be processed via Razorpay.`,
                                             });
                                           }}
                                         >
                                           <CreditCard className="h-4 w-4" />
                                           Pay ₹{(Number(qtDetails.total_amount || 0) * 0.05).toLocaleString()} Commission
                                         </Button>
                                       )}
                                       {deal.deal_status !== "deal_won" && (
                                         <p className="text-xs text-muted-foreground italic">Commission payable when deal is marked as Won.</p>
                                       )}
                                     </div>
                                   </div>

                                   {/* Notes & Terms */}
                                   {qtDetails.notes && (
                                     <div className="text-sm">
                                       <span className="font-medium text-muted-foreground">Notes: </span>
                                       <span>{qtDetails.notes}</span>
                                     </div>
                                   )}
                                   {qtDetails.terms_conditions && (
                                     <div className="text-sm">
                                       <span className="font-medium text-muted-foreground">Terms & Conditions: </span>
                                       <span className="text-xs text-muted-foreground whitespace-pre-line">{qtDetails.terms_conditions}</span>
                                     </div>
                                   )}
                    </>
                              ) : (
                                <p className="text-sm text-muted-foreground py-2">Quotation details not found.</p>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
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
