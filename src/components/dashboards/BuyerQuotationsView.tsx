import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FileText, Search, Download, Eye, Calendar, Building2, DollarSign, Clock, CheckCircle, XCircle, MessageSquareMore, History, Star } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { downloadQuotationPDF, type QuotationPDFData } from "@/utils/quotationPdfGenerator";
import { WriteReviewModal } from "@/components/reviews/WriteReviewModal";
import { useReviews } from "@/hooks/useReviews";

interface ReceivedQuotation {
  id: string;
  quotation_number: string;
  seller_id: string;
  buyer_name: string;
  buyer_email: string | null;
  buyer_company: string | null;
  items: any[];
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  shipping_amount: number;
  total_amount: number;
  currency: string;
  valid_until: string | null;
  terms_conditions: string | null;
  notes: string | null;
  status: string;
  sent_at: string | null;
  viewed_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  revision_history: any;
  version: number | null;
  created_at: string;
  seller_profile?: {
    full_name: string;
    company_name: string | null;
    email: string | null;
    phone: string | null;
    mobile_number: string | null;
    location: string | null;
    company_logo_url: string | null;
  };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft: { label: "Draft", color: "bg-muted text-muted-foreground", icon: <FileText className="h-3 w-3" /> },
  sent: { label: "Received", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: <Clock className="h-3 w-3" /> },
  viewed: { label: "Viewed", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400", icon: <Eye className="h-3 w-3" /> },
  accepted: { label: "Accepted", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", icon: <CheckCircle className="h-3 w-3" /> },
  rejected: { label: "Rejected", color: "bg-destructive/10 text-destructive", icon: <XCircle className="h-3 w-3" /> },
  negotiation: { label: "Negotiation", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: <MessageSquareMore className="h-3 w-3" /> },
  expired: { label: "Expired", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400", icon: <Calendar className="h-3 w-3" /> },
};

const BuyerQuotationsView = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [quotations, setQuotations] = useState<ReceivedQuotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedQuotation, setSelectedQuotation] = useState<ReceivedQuotation | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [negotiateOpen, setNegotiateOpen] = useState(false);
  const [negotiateMessage, setNegotiateMessage] = useState("");
  const [negotiatePrice, setNegotiatePrice] = useState("");
  const [negotiating, setNegotiating] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewQuotation, setReviewQuotation] = useState<ReceivedQuotation | null>(null);
  const { submitReview } = useReviews();

  useEffect(() => {
    const fetchQuotations = async () => {
      if (!user?.email) return;
      
      try {
        const { data, error } = await supabase
          .from("crm_quotations")
          .select("*")
          .eq("buyer_email", user.email)
          .order("created_at", { ascending: false });

        if (error) throw error;

        const quotationsWithSeller = await Promise.all(
          (data || []).map(async (q) => {
            const { data: sellerData } = await supabase
              .from("profiles")
              .select("full_name, company_name, email, phone, mobile_number, location, company_logo_url")
              .eq("user_id", q.seller_id)
              .single();
            
            return {
              ...q,
              items: typeof q.items === 'string' ? JSON.parse(q.items) : q.items,
              seller_profile: sellerData || undefined,
            } as ReceivedQuotation;
          })
        );

        setQuotations(quotationsWithSeller);

        const unviewedIds = quotationsWithSeller
          .filter(q => q.status === "sent" && !q.viewed_at)
          .map(q => q.id);

        if (unviewedIds.length > 0) {
          await supabase
            .from("crm_quotations")
            .update({ viewed_at: new Date().toISOString(), status: "viewed" })
            .in("id", unviewedIds);
        }
      } catch (error) {
        console.error("Error fetching quotations:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuotations();
  }, [user]);

  const filteredQuotations = quotations.filter((q) =>
    q.quotation_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.seller_profile?.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.seller_profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleViewDetails = (quotation: ReceivedQuotation) => {
    setSelectedQuotation(quotation);
    setDetailsOpen(true);
  };

  const handleDownloadPDF = async (quotation: ReceivedQuotation) => {
    try {
      const pdfData: QuotationPDFData = {
        quotationNumber: quotation.quotation_number,
        createdAt: quotation.created_at,
        validUntil: quotation.valid_until,
        sellerName: quotation.seller_profile?.full_name || "",
        sellerCompany: quotation.seller_profile?.company_name || "",
        sellerEmail: quotation.seller_profile?.email || null,
        sellerPhone: quotation.seller_profile?.phone || quotation.seller_profile?.mobile_number || null,
        sellerAddress: quotation.seller_profile?.location || null,
        sellerLogoUrl: quotation.seller_profile?.company_logo_url || null,
        sellerGST: null,
        buyerName: quotation.buyer_name,
        buyerCompany: quotation.buyer_company,
        buyerEmail: quotation.buyer_email,
        buyerPhone: null,
        buyerAddress: null,
        items: quotation.items.map((item: any) => ({
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          total: item.total,
        })),
        subtotal: quotation.subtotal,
        discountAmount: quotation.discount_amount,
        taxRate: 0,
        taxAmount: quotation.tax_amount,
        shippingAmount: quotation.shipping_amount,
        totalAmount: quotation.total_amount,
        currency: quotation.currency,
        termsConditions: quotation.terms_conditions,
        notes: quotation.notes,
      };

      await downloadQuotationPDF(pdfData);
      toast({ title: "PDF downloaded successfully" });
    } catch (error) {
      toast({ title: "Error downloading PDF", variant: "destructive" });
    }
  };

  const notifySeller = async (quotation: ReceivedQuotation, action: "accepted" | "rejected" | "negotiation", message?: string) => {
    try {
      const buyerName = user?.user_metadata?.full_name || user?.email || "A buyer";
      
      let title = "";
      let notifMessage = "";
      
      if (action === "negotiation") {
        title = "Quotation Negotiation Request";
        notifMessage = `${buyerName} has requested negotiation on quotation ${quotation.quotation_number} (₹${quotation.total_amount.toLocaleString('en-IN')})${message ? ` - "${message}"` : ""}`;
      } else {
        title = `Quotation ${action.charAt(0).toUpperCase() + action.slice(1)}`;
        notifMessage = `${buyerName} has ${action} quotation ${quotation.quotation_number} (₹${quotation.total_amount.toLocaleString('en-IN')})`;
      }

      // Insert into notifications table
      try {
        await supabase.from("notifications").insert({
          user_id: quotation.seller_id,
          title,
          message: notifMessage,
          notification_type: `quote_${action}`,
          reference_id: quotation.id,
          reference_type: "quotation",
          is_read: false,
        });
      } catch {
        // Silently fail if notifications table issue
      }

      // Send email notification to seller
      try {
        const { data: sellerProfile } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("user_id", quotation.seller_id)
          .single();

        if (sellerProfile?.email) {
          await supabase.functions.invoke("send-quotation-notification", {
            body: {
              buyerEmail: sellerProfile.email,
              buyerName: sellerProfile.full_name || "Seller",
              sellerName: buyerName,
              sellerCompany: quotation.buyer_company || "",
              quotationNumber: quotation.quotation_number,
              totalAmount: quotation.total_amount,
              validUntil: quotation.valid_until || "",
              items: [],
              notificationType: action,
              negotiationMessage: message || "",
            },
          });
        }
      } catch {
        console.log("Email notification skipped");
      }
    } catch (err) {
      console.error("Error notifying seller:", err);
    }
  };

  const handleAcceptQuotation = async (quotationId: string) => {
    try {
      const quotation = quotations.find(q => q.id === quotationId);
      const { error } = await supabase
        .from("crm_quotations")
        .update({ status: "accepted", accepted_at: new Date().toISOString() })
        .eq("id", quotationId);

      if (error) throw error;

      // Increment seller's completed sales count
      if (quotation?.seller_id) {
        await supabase.rpc("increment_seller_sales", { p_seller_id: quotation.seller_id });
      }

      setQuotations(prev => prev.map(q => 
        q.id === quotationId 
          ? { ...q, status: "accepted", accepted_at: new Date().toISOString() }
          : q
      ));

      if (quotation) await notifySeller(quotation, "accepted");

      toast({ title: "Quotation accepted successfully" });
      setDetailsOpen(false);

      // Prompt buyer to leave a review
      if (quotation) {
        setReviewQuotation(quotation);
        setReviewOpen(true);
      }
    } catch (error: any) {
      toast({ title: "Error accepting quotation", description: error.message, variant: "destructive" });
    }
  };

  const handleReviewSubmit = async (data: any) => {
    if (!reviewQuotation) return false;
    return submitReview({
      ...data,
      item_id: reviewQuotation.id,
      item_type: 'quotation',
      deal_type: 'robot',
      reviewed_user_id: reviewQuotation.seller_id,
    });
  };

  const handleRejectQuotation = async (quotationId: string) => {
    try {
      const quotation = quotations.find(q => q.id === quotationId);
      const { error } = await supabase
        .from("crm_quotations")
        .update({ status: "rejected", rejected_at: new Date().toISOString() })
        .eq("id", quotationId);

      if (error) throw error;

      setQuotations(prev => prev.map(q => 
        q.id === quotationId 
          ? { ...q, status: "rejected", rejected_at: new Date().toISOString() }
          : q
      ));

      if (quotation) await notifySeller(quotation, "rejected");

      toast({ title: "Quotation rejected" });
      setDetailsOpen(false);
    } catch (error: any) {
      toast({ title: "Error rejecting quotation", description: error.message, variant: "destructive" });
    }
  };

  const handleNegotiate = async () => {
    if (!selectedQuotation) return;
    setNegotiating(true);
    
    try {
      const negotiationEntry = {
        action: "buyer_negotiation",
        timestamp: new Date().toISOString(),
        proposed_price: negotiatePrice ? Number(negotiatePrice) : null,
        message: negotiateMessage,
        buyer_name: user?.user_metadata?.full_name || user?.email || "Buyer",
        previous_amount: selectedQuotation.total_amount,
      };

      const existingHistory = Array.isArray(selectedQuotation.revision_history) 
        ? selectedQuotation.revision_history 
        : [];

      const { error } = await supabase
        .from("crm_quotations")
        .update({ 
          status: "negotiation",
          rejection_reason: negotiateMessage,
          revision_history: [...existingHistory, negotiationEntry],
        })
        .eq("id", selectedQuotation.id);

      if (error) throw error;

      setQuotations(prev => prev.map(q => 
        q.id === selectedQuotation.id 
          ? { ...q, status: "negotiation", rejection_reason: negotiateMessage, revision_history: [...existingHistory, negotiationEntry] }
          : q
      ));

      const fullMessage = negotiatePrice 
        ? `Proposed price: ₹${Number(negotiatePrice).toLocaleString('en-IN')}. ${negotiateMessage}`
        : negotiateMessage;

      await notifySeller(selectedQuotation, "negotiation", fullMessage);

      toast({ title: "Negotiation request sent to seller" });
      setNegotiateOpen(false);
      setDetailsOpen(false);
      setNegotiateMessage("");
      setNegotiatePrice("");
    } catch (error: any) {
      toast({ title: "Error sending negotiation", description: error.message, variant: "destructive" });
    } finally {
      setNegotiating(false);
    }
  };

  const getRevisionHistory = (quotation: ReceivedQuotation) => {
    if (!quotation.revision_history) return [];
    if (Array.isArray(quotation.revision_history)) return quotation.revision_history;
    return [];
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Received Quotations</h2>
          <p className="text-sm text-muted-foreground">
            View and manage quotations sent to you by sellers
          </p>
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search quotations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Quotations List */}
      {filteredQuotations.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">No quotations received</p>
            <p className="text-sm">Quotations from sellers will appear here</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredQuotations.map((quotation) => {
            const status = STATUS_CONFIG[quotation.status] || STATUS_CONFIG.sent;
            const history = getRevisionHistory(quotation);
            
            return (
              <Card key={quotation.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    {/* Left: Basic Info */}
                    <div className="flex items-start gap-4">
                      <div className="rounded-full bg-primary/10 p-3">
                        <FileText className="h-6 w-6 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold">{quotation.quotation_number}</p>
                          <Badge className={status.color}>
                            {status.icon}
                            <span className="ml-1">{status.label}</span>
                          </Badge>
                          {(quotation.version || 1) > 1 && (
                            <Badge variant="outline" className="text-xs">
                              v{quotation.version}
                            </Badge>
                          )}
                          {history.length > 0 && (
                            <Badge variant="outline" className="text-xs cursor-pointer" onClick={() => { setSelectedQuotation(quotation); setHistoryOpen(true); }}>
                              <History className="h-3 w-3 mr-1" />
                              {history.length} updates
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Building2 className="h-3.5 w-3.5" />
                          <span>{quotation.seller_profile?.company_name || quotation.seller_profile?.full_name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{format(new Date(quotation.created_at), "dd MMM yyyy")}</span>
                          {quotation.valid_until && (
                            <>
                              <span>•</span>
                              <span>Valid until {format(new Date(quotation.valid_until), "dd MMM yyyy")}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Amount & Actions */}
                    <div className="flex flex-col items-end gap-3">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Total Amount</p>
                        <p className="text-xl font-bold text-primary">
                          ₹{quotation.total_amount.toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleViewDetails(quotation)}>
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDownloadPDF(quotation)}>
                          <Download className="h-4 w-4 mr-1" />
                          PDF
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Quotation Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedQuotation && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Quotation {selectedQuotation.quotation_number}
                  {(selectedQuotation.version || 1) > 1 && (
                    <Badge variant="outline">v{selectedQuotation.version}</Badge>
                  )}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Seller Info */}
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground uppercase tracking-wide font-medium">From</p>
                    <p className="font-semibold text-lg">
                      {selectedQuotation.seller_profile?.company_name || selectedQuotation.seller_profile?.full_name}
                    </p>
                    {selectedQuotation.seller_profile?.email && (
                      <p className="text-sm text-muted-foreground">{selectedQuotation.seller_profile.email}</p>
                    )}
                    {(selectedQuotation.seller_profile?.phone || selectedQuotation.seller_profile?.mobile_number) && (
                      <p className="text-sm text-muted-foreground">
                        {selectedQuotation.seller_profile.phone || selectedQuotation.seller_profile.mobile_number}
                      </p>
                    )}
                  </div>
                  <Badge className={STATUS_CONFIG[selectedQuotation.status]?.color}>
                    {STATUS_CONFIG[selectedQuotation.status]?.icon}
                    <span className="ml-1">{STATUS_CONFIG[selectedQuotation.status]?.label}</span>
                  </Badge>
                </div>

                {/* Negotiation message if in negotiation */}
                {selectedQuotation.status === "negotiation" && selectedQuotation.rejection_reason && (
                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-300 flex items-center gap-2">
                      <MessageSquareMore className="h-4 w-4" />
                      Your Negotiation Request
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">{selectedQuotation.rejection_reason}</p>
                  </div>
                )}

                <Separator />

                {/* Items Table */}
                <div>
                  <p className="text-sm text-muted-foreground uppercase tracking-wide font-medium mb-3">Items</p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-center">Qty</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedQuotation.items.map((item: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell>
                            <p className="font-medium">{item.name}</p>
                            {item.description && (
                              <p className="text-sm text-muted-foreground">{item.description}</p>
                            )}
                          </TableCell>
                          <TableCell className="text-center">{item.quantity}</TableCell>
                          <TableCell className="text-right">₹{item.unit_price?.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-medium">₹{item.total?.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Totals */}
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal</span>
                      <span>₹{selectedQuotation.subtotal.toLocaleString()}</span>
                    </div>
                    {selectedQuotation.discount_amount > 0 && (
                      <div className="flex justify-between text-sm text-emerald-600">
                        <span>Discount</span>
                        <span>-₹{selectedQuotation.discount_amount.toLocaleString()}</span>
                      </div>
                    )}
                    {selectedQuotation.tax_amount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Tax</span>
                        <span>₹{selectedQuotation.tax_amount.toLocaleString()}</span>
                      </div>
                    )}
                    {selectedQuotation.shipping_amount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Shipping</span>
                        <span>₹{selectedQuotation.shipping_amount.toLocaleString()}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span className="text-primary">₹{selectedQuotation.total_amount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Terms */}
                {selectedQuotation.terms_conditions && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm text-muted-foreground uppercase tracking-wide font-medium mb-2">
                        Terms & Conditions
                      </p>
                      <p className="text-sm whitespace-pre-wrap">{selectedQuotation.terms_conditions}</p>
                    </div>
                  </>
                )}

                {/* Notes */}
                {selectedQuotation.notes && (
                  <div>
                    <p className="text-sm text-muted-foreground uppercase tracking-wide font-medium mb-2">
                      Additional Notes
                    </p>
                    <p className="text-sm italic">{selectedQuotation.notes}</p>
                  </div>
                )}

                {/* Revision History inline */}
                {getRevisionHistory(selectedQuotation).length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm text-muted-foreground uppercase tracking-wide font-medium mb-3 flex items-center gap-2">
                        <History className="h-4 w-4" /> Negotiation & Revision History
                      </p>
                      <div className="space-y-3">
                        {getRevisionHistory(selectedQuotation).map((entry: any, idx: number) => (
                          <div key={idx} className="border rounded-lg p-3 bg-muted/30">
                            <div className="flex items-center justify-between mb-1">
                              <Badge variant="outline" className="text-xs capitalize">
                                {entry.action?.replace(/_/g, " ") || "Update"}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {entry.timestamp ? format(new Date(entry.timestamp), "dd MMM yyyy, hh:mm a") : ""}
                              </span>
                            </div>
                            {entry.message && <p className="text-sm mt-1">{entry.message}</p>}
                            {entry.proposed_price && (
                              <p className="text-sm font-medium text-primary mt-1">
                                Proposed: ₹{Number(entry.proposed_price).toLocaleString('en-IN')}
                              </p>
                            )}
                            {entry.previous_amount && (
                              <p className="text-xs text-muted-foreground">
                                Previous amount: ₹{Number(entry.previous_amount).toLocaleString('en-IN')}
                              </p>
                            )}
                            {entry.new_amount && (
                              <p className="text-sm font-semibold text-emerald-600">
                                Updated to: ₹{Number(entry.new_amount).toLocaleString('en-IN')}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Actions - show for sent, viewed, and negotiation statuses */}
              {["sent", "viewed", "negotiation"].includes(selectedQuotation.status) && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <Button variant="outline" onClick={() => handleDownloadPDF(selectedQuotation)}>
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline"
                      className="text-amber-700 border-amber-300 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-700 dark:hover:bg-amber-950/30"
                      onClick={() => {
                        setNegotiateOpen(true);
                      }}
                    >
                      <MessageSquareMore className="h-4 w-4 mr-2" />
                      Negotiate
                    </Button>
                    <Button 
                      variant="outline" 
                      className="text-destructive border-destructive hover:bg-destructive/10"
                      onClick={() => handleRejectQuotation(selectedQuotation.id)}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                    <Button onClick={() => handleAcceptQuotation(selectedQuotation.id)}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Accept
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Negotiate Dialog */}
      <Dialog open={negotiateOpen} onOpenChange={setNegotiateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquareMore className="h-5 w-5 text-amber-600" />
              Request Negotiation
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Current quotation amount: <span className="font-bold text-foreground">₹{selectedQuotation?.total_amount.toLocaleString()}</span>
            </p>
            <div className="space-y-2">
              <Label htmlFor="proposed-price">Your Proposed Price (₹)</Label>
              <Input
                id="proposed-price"
                type="number"
                placeholder="Enter your proposed amount..."
                value={negotiatePrice}
                onChange={(e) => setNegotiatePrice(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="negotiate-message">Message to Seller *</Label>
              <Textarea
                id="negotiate-message"
                placeholder="Explain your negotiation request... (e.g., need bulk discount, budget constraints, competitive pricing)"
                value={negotiateMessage}
                onChange={(e) => setNegotiateMessage(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNegotiateOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleNegotiate}
              disabled={!negotiateMessage.trim() || negotiating}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {negotiating ? "Sending..." : "Send Negotiation Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Negotiation History — {selectedQuotation?.quotation_number}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {selectedQuotation && getRevisionHistory(selectedQuotation).map((entry: any, idx: number) => (
              <div key={idx} className="border rounded-lg p-3 bg-muted/30">
                <div className="flex items-center justify-between mb-1">
                  <Badge variant="outline" className="text-xs capitalize">
                    {entry.action?.replace(/_/g, " ") || "Update"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {entry.timestamp ? format(new Date(entry.timestamp), "dd MMM yyyy, hh:mm a") : ""}
                  </span>
                </div>
                {entry.message && <p className="text-sm mt-1">{entry.message}</p>}
                {entry.proposed_price && (
                  <p className="text-sm font-medium text-primary mt-1">
                    Proposed: ₹{Number(entry.proposed_price).toLocaleString('en-IN')}
                  </p>
                )}
                {entry.previous_amount && (
                  <p className="text-xs text-muted-foreground">
                    Previous: ₹{Number(entry.previous_amount).toLocaleString('en-IN')}
                  </p>
                )}
                {entry.new_amount && (
                  <p className="text-sm font-semibold text-emerald-600">
                    Updated: ₹{Number(entry.new_amount).toLocaleString('en-IN')}
                  </p>
                )}
              </div>
            ))}
            {selectedQuotation && getRevisionHistory(selectedQuotation).length === 0 && (
              <p className="text-center text-muted-foreground py-4">No history available</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Review Modal after acceptance */}
      <WriteReviewModal
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        onSubmit={handleReviewSubmit}
        itemName={reviewQuotation?.seller_profile?.company_name || reviewQuotation?.seller_profile?.full_name || "Seller"}
      />
    </div>
  );
};

export default BuyerQuotationsView;
