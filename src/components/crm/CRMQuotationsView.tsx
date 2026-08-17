import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FileText, Plus, Search, DollarSign, Download, Eye, Send, MoreHorizontal, Calendar, Building2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { downloadQuotationPDF, type QuotationPDFData } from "@/utils/quotationPdfGenerator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { useCRM, CRMQuotation } from "@/hooks/useCRM";
import CreateQuotationModal from "./CreateQuotationModal";

interface CRMQuotationsViewProps {
  crmData: ReturnType<typeof useCRM>;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-primary/10 text-primary dark:bg-primary/30 dark:text-primary",
  viewed: "bg-primary/10 text-primary dark:bg-primary/30 dark:text-primary",
  accepted: "bg-success/10 text-success dark:bg-success/30 dark:text-success",
  rejected: "bg-destructive/10 text-destructive",
  expired: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
};

const CRMQuotationsView = ({ crmData }: CRMQuotationsViewProps) => {
  const { quotations, fetchQuotations } = crmData;
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editQuotation, setEditQuotation] = useState<CRMQuotation | null>(null);
  const [sellerProfile, setSellerProfile] = useState<any>(null);

  // Fetch seller profile for PDF generation
  useState(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("full_name, company_name, email, phone, mobile_number, location, company_logo_url")
        .eq("user_id", user.id)
        .single();
      if (data) setSellerProfile(data);
    };
    fetchProfile();
  });

  const filteredQuotations = quotations.filter((q) =>
    q.buyer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.quotation_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.buyer_company?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDownloadPDF = async (quotation: CRMQuotation) => {
    try {
      const pdfData: QuotationPDFData = {
        quotationNumber: quotation.quotation_number,
        createdAt: quotation.created_at,
        validUntil: quotation.valid_until,
        sellerName: sellerProfile?.full_name || "",
        sellerCompany: sellerProfile?.company_name || "",
        sellerEmail: sellerProfile?.email || user?.email || null,
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

  const handleSendQuotation = async (quotation: CRMQuotation) => {
    try {
      await supabase
        .from("crm_quotations")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", quotation.id);

      // Look up buyer's user_id from profiles by email
      if (quotation.buyer_email) {
        const { data: buyerProfile } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("email", quotation.buyer_email)
          .single();

        // Create notification for buyer if they exist in the system
        if (buyerProfile?.user_id) {
          await supabase.from("chat_notifications").insert({
            user_id: buyerProfile.user_id,
            conversation_id: quotation.id,
            notification_type: "quotation_received",
            is_read: false,
          });
        }
      }

      // Download PDF
      await handleDownloadPDF(quotation);

      toast({ title: "Quotation sent successfully!" });
      fetchQuotations();
    } catch (error: any) {
      toast({ title: "Error sending quotation", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Quotations ({quotations.length})</h2>
          <p className="text-sm text-muted-foreground">Create and manage quotations for your leads</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search quotations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Quotation
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{quotations.length}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Draft</p>
                <p className="text-2xl font-bold">{quotations.filter(q => q.status === 'draft').length}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sent</p>
                <p className="text-2xl font-bold">{quotations.filter(q => ['sent', 'viewed'].includes(q.status)).length}</p>
              </div>
              <Send className="h-8 w-8 text-primary/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Accepted</p>
                <p className="text-2xl font-bold">{quotations.filter(q => q.status === 'accepted').length}</p>
              </div>
              <DollarSign className="h-8 w-8 text-success/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quotations List */}
      <div className="space-y-3">
        {filteredQuotations.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mb-2 opacity-50" />
              <p className="text-lg font-medium">No quotations found</p>
              <p className="text-sm">Create your first quotation to get started</p>
              <Button className="mt-4" onClick={() => setCreateModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Quotation
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredQuotations.map((quotation) => (
            <Card key={quotation.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  {/* Left: Info */}
                  <div className="flex items-start gap-4">
                    <div className="rounded-full bg-primary/10 p-3">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{quotation.quotation_number}</p>
                        <Badge className={STATUS_COLORS[quotation.status] || STATUS_COLORS.draft}>
                          {quotation.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Building2 className="h-3.5 w-3.5" />
                        <span>{quotation.buyer_name}</span>
                        {quotation.buyer_company && <span>• {quotation.buyer_company}</span>}
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
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Amount</p>
                      <p className="text-xl font-bold text-primary">
                        ₹{quotation.total_amount.toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {quotation.status === "draft" && (
                        <Button size="sm" onClick={() => handleSendQuotation(quotation)}>
                          <Send className="h-4 w-4 mr-1" />
                          Send
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleDownloadPDF(quotation)}>
                            <Download className="h-4 w-4 mr-2" />
                            Download PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setEditQuotation(quotation);
                            setCreateModalOpen(true);
                          }}>
                            <Eye className="h-4 w-4 mr-2" />
                            View / Edit
                          </DropdownMenuItem>
                          {quotation.status === "draft" && (
                            <DropdownMenuItem onClick={() => handleSendQuotation(quotation)}>
                              <Send className="h-4 w-4 mr-2" />
                              Send Quotation
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      <CreateQuotationModal
        open={createModalOpen}
        onOpenChange={(open) => {
          setCreateModalOpen(open);
          if (!open) setEditQuotation(null);
        }}
        onSuccess={() => fetchQuotations()}
        existingQuotation={editQuotation || undefined}
      />
    </div>
  );
};

export default CRMQuotationsView;
