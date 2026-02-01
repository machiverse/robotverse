import { useState, useEffect } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  FileText,
  Download,
  Eye,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  Plus,
  MoreHorizontal,
  DollarSign,
  Calendar,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { downloadQuotationPDF, type QuotationPDFData } from "@/utils/quotationPdfGenerator";
import type { CRMQuotation, QuotationItem } from "@/hooks/useCRM";

interface LeadQuotationHistoryProps {
  leadId: string;
  sellerId: string;
  onCreateQuotation: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft: { label: "Draft", color: "bg-muted text-muted-foreground", icon: <FileText className="h-3.5 w-3.5" /> },
  sent: { label: "Sent", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: <Send className="h-3.5 w-3.5" /> },
  viewed: { label: "Viewed", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400", icon: <Eye className="h-3.5 w-3.5" /> },
  accepted: { label: "Accepted", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", icon: <CheckCircle className="h-3.5 w-3.5" /> },
  rejected: { label: "Rejected", color: "bg-destructive/10 text-destructive", icon: <XCircle className="h-3.5 w-3.5" /> },
  expired: { label: "Expired", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400", icon: <Clock className="h-3.5 w-3.5" /> },
};

const LeadQuotationHistory = ({ leadId, sellerId, onCreateQuotation }: LeadQuotationHistoryProps) => {
  const { toast } = useToast();
  const [quotations, setQuotations] = useState<CRMQuotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [sellerProfile, setSellerProfile] = useState<any>(null);

  useEffect(() => {
    fetchQuotations();
    fetchSellerProfile();
  }, [leadId, sellerId]);

  const fetchQuotations = async () => {
    try {
      const { data, error } = await supabase
        .from("crm_quotations")
        .select("*")
        .eq("lead_id", leadId)
        .eq("seller_id", sellerId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mapped = (data || []).map((q) => ({
        ...q,
        items: (q.items as unknown as QuotationItem[]) || [],
      })) as CRMQuotation[];

      setQuotations(mapped);
    } catch (error) {
      console.error("Error fetching quotations:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSellerProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, company_name, email, phone, mobile_number, location, company_logo_url")
      .eq("user_id", sellerId)
      .single();
    if (data) setSellerProfile(data);
  };

  const handleDownloadPDF = async (quotation: CRMQuotation) => {
    try {
      const pdfData: QuotationPDFData = {
        quotationNumber: quotation.quotation_number,
        createdAt: quotation.created_at,
        validUntil: quotation.valid_until,
        sellerName: sellerProfile?.full_name || "",
        sellerCompany: sellerProfile?.company_name || "",
        sellerEmail: sellerProfile?.email || null,
        sellerPhone: sellerProfile?.phone || sellerProfile?.mobile_number || null,
        sellerAddress: sellerProfile?.location || null,
        sellerLogoUrl: sellerProfile?.company_logo_url || null,
        sellerGST: null,
        buyerName: quotation.buyer_name,
        buyerCompany: quotation.buyer_company,
        buyerEmail: quotation.buyer_email,
        buyerPhone: quotation.buyer_phone,
        buyerAddress: quotation.buyer_address,
        items: quotation.items.map((item) => ({
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          total: item.total,
        })),
        subtotal: quotation.subtotal,
        discountType: quotation.discount_type,
        discountValue: quotation.discount_value,
        discountAmount: quotation.discount_amount,
        taxRate: quotation.tax_rate,
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Quotations ({quotations.length})</h3>
        <Button size="sm" onClick={onCreateQuotation}>
          <Plus className="mr-1.5 h-4 w-4" />
          New Quotation
        </Button>
      </div>

      {quotations.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mb-3 opacity-50" />
            <p className="font-medium">No quotations yet</p>
            <p className="text-sm mt-1">Create your first quotation for this lead</p>
            <Button className="mt-4" size="sm" onClick={onCreateQuotation}>
              <Plus className="mr-1.5 h-4 w-4" />
              Create Quotation
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {quotations.map((quotation) => {
            const statusConfig = STATUS_CONFIG[quotation.status] || STATUS_CONFIG.draft;

            return (
              <Card key={quotation.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: Info */}
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{quotation.quotation_number}</span>
                          <Badge className={`${statusConfig.color} border-0 gap-1`}>
                            {statusConfig.icon}
                            {statusConfig.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {format(new Date(quotation.created_at), "dd MMM yyyy")}
                          </span>
                          {quotation.valid_until && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              Valid until {format(new Date(quotation.valid_until), "dd MMM")}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {quotation.items.length} item{quotation.items.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>

                    {/* Right: Amount & Actions */}
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Amount</p>
                        <p className="text-lg font-bold text-primary flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          ₹{quotation.total_amount.toLocaleString()}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleDownloadPDF(quotation)}>
                            <Download className="h-4 w-4 mr-2" />
                            Download PDF
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LeadQuotationHistory;
