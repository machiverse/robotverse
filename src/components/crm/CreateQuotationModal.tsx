import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, FileText, Send, Download, Eye, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays } from "date-fns";
import { downloadQuotationPDF, type QuotationPDFData } from "@/utils/quotationPdfGenerator";
import type { CRMQuotation, QuotationItem } from "@/hooks/useCRM";

interface CreateQuotationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  leadData?: {
    leadId: string;
    buyerName: string;
    buyerEmail: string;
    buyerPhone: string;
    buyerCompany: string;
    buyerAddress?: string;
    productName?: string;
    productPrice?: number;
    productBrand?: string;
    productModel?: string;
  };
  existingQuotation?: CRMQuotation;
}

interface SellerProfile {
  full_name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  mobile_number: string | null;
  location: string | null;
  company_logo_url: string | null;
}

const DEFAULT_TERMS = `1. This quotation is valid for 30 days from the date of issue.
2. Prices are exclusive of applicable taxes unless otherwise stated.
3. Payment terms: 50% advance, 50% before delivery.
4. Delivery timeline will be confirmed upon order confirmation.
5. All disputes are subject to jurisdiction of Indian courts.`;

const CreateQuotationModal = ({
  open,
  onOpenChange,
  onSuccess,
  leadData,
  existingQuotation,
}: CreateQuotationModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sellerProfile, setSellerProfile] = useState<SellerProfile | null>(null);

  // Form state
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerCompany, setBuyerCompany] = useState("");
  const [buyerAddress, setBuyerAddress] = useState("");
  const [validUntil, setValidUntil] = useState(format(addDays(new Date(), 30), "yyyy-MM-dd"));
  const [items, setItems] = useState<QuotationItem[]>([]);
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState(0);
  const [taxRate, setTaxRate] = useState(18); // GST default
  const [shippingAmount, setShippingAmount] = useState(0);
  const [termsConditions, setTermsConditions] = useState(DEFAULT_TERMS);
  const [notes, setNotes] = useState("");
  const [currency] = useState("INR");

  // Fetch seller profile
  useEffect(() => {
    const fetchSellerProfile = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("full_name, company_name, email, phone, mobile_number, location, company_logo_url")
        .eq("user_id", user.id)
        .single();
      if (data) setSellerProfile(data);
    };
    fetchSellerProfile();
  }, [user]);

  // Initialize form with lead data
  useEffect(() => {
    if (leadData && open) {
      setBuyerName(leadData.buyerName || "");
      setBuyerEmail(leadData.buyerEmail || "");
      setBuyerPhone(leadData.buyerPhone || "");
      setBuyerCompany(leadData.buyerCompany || "");
      setBuyerAddress(leadData.buyerAddress || "");
      
      if (leadData.productName) {
        setItems([{
          name: leadData.productName,
          description: leadData.productBrand && leadData.productModel 
            ? `${leadData.productBrand} - ${leadData.productModel}` 
            : undefined,
          quantity: 1,
          unit_price: leadData.productPrice || 0,
          total: leadData.productPrice || 0,
        }]);
      }
    }
  }, [leadData, open]);

  // Initialize with existing quotation
  useEffect(() => {
    if (existingQuotation && open) {
      setBuyerName(existingQuotation.buyer_name || "");
      setBuyerEmail(existingQuotation.buyer_email || "");
      setBuyerPhone(existingQuotation.buyer_phone || "");
      setBuyerCompany(existingQuotation.buyer_company || "");
      setBuyerAddress(existingQuotation.buyer_address || "");
      setItems(existingQuotation.items || []);
      setDiscountType((existingQuotation.discount_type as "percentage" | "fixed") || "percentage");
      setDiscountValue(existingQuotation.discount_value || 0);
      setTaxRate(existingQuotation.tax_rate || 18);
      setShippingAmount(existingQuotation.shipping_amount || 0);
      setTermsConditions(existingQuotation.terms_conditions || DEFAULT_TERMS);
      setNotes(existingQuotation.notes || "");
      if (existingQuotation.valid_until) {
        setValidUntil(format(new Date(existingQuotation.valid_until), "yyyy-MM-dd"));
      }
    }
  }, [existingQuotation, open]);

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = discountType === "percentage" 
    ? (subtotal * discountValue) / 100 
    : discountValue;
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = (taxableAmount * taxRate) / 100;
  const totalAmount = taxableAmount + taxAmount + shippingAmount;

  // Type alias for field updates
  type ItemField = keyof QuotationItem;

  // Item handlers
  const addItem = () => {
    setItems([...items, { name: "", quantity: 1, unit_price: 0, total: 0 }]);
  };

  const updateItem = (index: number, field: ItemField, value: string | number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    
    // Recalculate total
    if (field === "quantity" || field === "unit_price") {
      updated[index].total = updated[index].quantity * updated[index].unit_price;
    }
    
    setItems(updated);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Generate PDF data
  const getPDFData = (quotationNumber: string): QuotationPDFData => ({
    quotationNumber,
    createdAt: new Date().toISOString(),
    validUntil,
    sellerName: sellerProfile?.full_name || "",
    sellerCompany: sellerProfile?.company_name || "",
    sellerEmail: sellerProfile?.email || user?.email || null,
    sellerPhone: sellerProfile?.phone || sellerProfile?.mobile_number || null,
    sellerAddress: sellerProfile?.location || null,
    sellerLogoUrl: sellerProfile?.company_logo_url || null,
    sellerGST: null,
    buyerName,
    buyerCompany,
    buyerEmail,
    buyerPhone,
    buyerAddress,
    items: items.map(item => ({
      name: item.name,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      total: item.total,
    })),
    subtotal,
    discountType,
    discountValue,
    discountAmount,
    taxRate,
    taxAmount,
    shippingAmount,
    totalAmount,
    currency,
    termsConditions,
    notes,
  });

  // Preview PDF
  const handlePreview = async () => {
    if (items.length === 0) {
      toast({ title: "Please add at least one item", variant: "destructive" });
      return;
    }
    
    try {
      const tempNumber = `PREVIEW-${Date.now()}`;
      await downloadQuotationPDF(getPDFData(tempNumber));
    } catch (error) {
      toast({ title: "Error generating preview", variant: "destructive" });
    }
  };

  // Save and send quotation
  const handleSend = async () => {
    if (!user || !sellerProfile) return;
    
    if (items.length === 0) {
      toast({ title: "Please add at least one item", variant: "destructive" });
      return;
    }

    if (!buyerName || !buyerEmail) {
      toast({ title: "Buyer name and email are required", variant: "destructive" });
      return;
    }

    setSending(true);
    try {
      // Generate quotation number
      const quotationNumber = `QT-${Date.now().toString(36).toUpperCase()}`;

      // Save quotation to database
      const { data: quotation, error: quotationError } = await supabase
        .from("crm_quotations")
        .insert({
          seller_id: user.id,
          lead_id: leadData?.leadId || null,
          quotation_number: quotationNumber,
          buyer_name: buyerName,
          buyer_email: buyerEmail,
          buyer_phone: buyerPhone,
          buyer_company: buyerCompany,
          buyer_address: buyerAddress,
          items: JSON.stringify(items),
          subtotal,
          discount_type: discountType,
          discount_value: discountValue,
          discount_amount: discountAmount,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          shipping_amount: shippingAmount,
          total_amount: totalAmount,
          currency,
          valid_until: validUntil,
          terms_conditions: termsConditions,
          notes,
          status: "sent",
          sent_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (quotationError) throw quotationError;

      // Look up buyer's user_id from profiles by email
      const { data: buyerProfile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("email", buyerEmail)
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

      // Send email notification to buyer
      try {
        const { error: emailError } = await supabase.functions.invoke('send-quotation-notification', {
          body: {
            buyerEmail: buyerEmail,
            buyerName: buyerName,
            sellerName: sellerProfile.full_name,
            sellerCompany: sellerProfile.company_name || '',
            quotationNumber: quotationNumber,
            totalAmount: totalAmount,
            validUntil: validUntil,
            items: items.map(item => ({
              name: item.name,
              quantity: item.quantity,
              total: item.total,
            })),
          },
        });
        
        if (emailError) {
          console.error("Email notification error:", emailError);
          // Don't fail the whole operation if email fails
        } else {
          console.log("Email notification sent successfully");
        }
      } catch (emailErr) {
        console.error("Failed to send email notification:", emailErr);
        // Continue with the flow even if email fails
      }

      // Download the PDF for the seller
      await downloadQuotationPDF(getPDFData(quotationNumber));

      toast({
        title: "Quotation sent successfully!",
        description: `Quotation ${quotationNumber} has been created and notification sent to the buyer.`,
      });

      onSuccess?.();
      onOpenChange(false);
      
      // Reset form
      setBuyerName("");
      setBuyerEmail("");
      setBuyerPhone("");
      setBuyerCompany("");
      setBuyerAddress("");
      setItems([]);
      setDiscountValue(0);
      setNotes("");

    } catch (error: any) {
      console.error("Error sending quotation:", error);
      toast({
        title: "Error sending quotation",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {existingQuotation ? "Edit Quotation" : "Create New Quotation"}
          </DialogTitle>
          <DialogDescription>
            Fill in the details below to generate a professional quotation PDF.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Buyer Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Buyer Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="buyerName">Name *</Label>
                <Input
                  id="buyerName"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="Buyer name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="buyerCompany">Company</Label>
                <Input
                  id="buyerCompany"
                  value={buyerCompany}
                  onChange={(e) => setBuyerCompany(e.target.value)}
                  placeholder="Company name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="buyerEmail">Email *</Label>
                <Input
                  id="buyerEmail"
                  type="email"
                  value={buyerEmail}
                  onChange={(e) => setBuyerEmail(e.target.value)}
                  placeholder="buyer@company.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="buyerPhone">Phone</Label>
                <Input
                  id="buyerPhone"
                  value={buyerPhone}
                  onChange={(e) => setBuyerPhone(e.target.value)}
                  placeholder="+91 XXXXX XXXXX"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="buyerAddress">Address</Label>
                <Textarea
                  id="buyerAddress"
                  value={buyerAddress}
                  onChange={(e) => setBuyerAddress(e.target.value)}
                  placeholder="Full address"
                  rows={2}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Items / Products
              </h3>
              <Button variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-1" /> Add Item
              </Button>
            </div>

            {items.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <FileText className="h-10 w-10 mb-2 opacity-50" />
                  <p>No items added yet</p>
                  <Button variant="link" onClick={addItem} className="mt-2">
                    Add your first item
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {items.map((item, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="grid grid-cols-12 gap-3 items-start">
                        <div className="col-span-5 space-y-2">
                          <Label>Item Name</Label>
                          <Input
                            value={item.name}
                            onChange={(e) => updateItem(index, "name", e.target.value)}
                            placeholder="Product/Service name"
                          />
                          <Input
                            value={item.description || ""}
                            onChange={(e) => updateItem(index, "description", e.target.value)}
                            placeholder="Description (optional)"
                            className="text-sm"
                          />
                        </div>
                        <div className="col-span-2 space-y-2">
                          <Label>Qty</Label>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 1)}
                          />
                        </div>
                        <div className="col-span-2 space-y-2">
                          <Label>Unit Price</Label>
                          <Input
                            type="number"
                            min="0"
                            value={item.unit_price}
                            onChange={(e) => updateItem(index, "unit_price", parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div className="col-span-2 space-y-2">
                          <Label>Total</Label>
                          <div className="h-9 px-3 py-2 bg-muted rounded-md font-medium">
                            ₹{item.total.toLocaleString()}
                          </div>
                        </div>
                        <div className="col-span-1 pt-7">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(index)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Pricing */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Pricing Options
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Discount Type</Label>
                  <Select value={discountType} onValueChange={(v) => setDiscountType(v as "percentage" | "fixed")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="fixed">Fixed Amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Discount Value</Label>
                  <Input
                    type="number"
                    min="0"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tax Rate (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={taxRate}
                    onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Shipping (₹)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={shippingAmount}
                    onChange={(e) => setShippingAmount(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Valid Until</Label>
                <Input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Summary
              </h3>
              <Card className="bg-muted/30">
                <CardContent className="p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>₹{subtotal.toLocaleString()}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-emerald-600 dark:text-emerald-400">
                      <span>Discount {discountType === "percentage" ? `(${discountValue}%)` : ""}</span>
                      <span>-₹{discountAmount.toLocaleString()}</span>
                    </div>
                  )}
                  {taxAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Tax ({taxRate}%)</span>
                      <span>₹{taxAmount.toLocaleString()}</span>
                    </div>
                  )}
                  {shippingAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Shipping</span>
                      <span>₹{shippingAmount.toLocaleString()}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span className="text-primary">₹{totalAmount.toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <Separator />

          {/* Terms & Notes */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="terms">Terms & Conditions</Label>
              <Textarea
                id="terms"
                value={termsConditions}
                onChange={(e) => setTermsConditions(e.target.value)}
                rows={6}
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={6}
                placeholder="Any additional notes for the buyer..."
                className="text-sm"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="outline" onClick={handlePreview}>
            <Eye className="h-4 w-4 mr-2" />
            Preview PDF
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={sending}>
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Quotation
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateQuotationModal;
