import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Search, Download, Eye, Calendar, Building2, DollarSign, Clock, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { downloadQuotationPDF, type QuotationPDFData } from "@/utils/quotationPdfGenerator";

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

  // Fetch quotations received by buyer
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

        // Fetch seller profiles for each quotation
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

        // Mark as viewed if not already
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

  const handleAcceptQuotation = async (quotationId: string) => {
    try {
      const { error } = await supabase
        .from("crm_quotations")
        .update({ status: "accepted", accepted_at: new Date().toISOString() })
        .eq("id", quotationId);

      if (error) throw error;

      setQuotations(prev => prev.map(q => 
        q.id === quotationId 
          ? { ...q, status: "accepted", accepted_at: new Date().toISOString() }
          : q
      ));

      toast({ title: "Quotation accepted successfully" });
      setDetailsOpen(false);
    } catch (error: any) {
      toast({ title: "Error accepting quotation", description: error.message, variant: "destructive" });
    }
  };

  const handleRejectQuotation = async (quotationId: string) => {
    try {
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

      toast({ title: "Quotation rejected" });
      setDetailsOpen(false);
    } catch (error: any) {
      toast({ title: "Error rejecting quotation", description: error.message, variant: "destructive" });
    }
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
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{quotation.quotation_number}</p>
                          <Badge className={status.color}>
                            {status.icon}
                            <span className="ml-1">{status.label}</span>
                          </Badge>
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
                    {STATUS_CONFIG[selectedQuotation.status]?.label}
                  </Badge>
                </div>

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
              </div>

              {/* Actions */}
              {["sent", "viewed"].includes(selectedQuotation.status) && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <Button variant="outline" onClick={() => handleDownloadPDF(selectedQuotation)}>
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                  <div className="flex gap-3">
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
                      Accept Quotation
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BuyerQuotationsView;
