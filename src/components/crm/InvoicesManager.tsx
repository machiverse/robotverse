import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FileText, Send, Eye, Trash2, CheckCircle, Clock, XCircle, DollarSign, Download } from "lucide-react";
import { useSellerCRM, type Invoice, type InvoiceItem } from "@/hooks/useSellerCRM";
import { format } from "date-fns";

interface InvoicesManagerProps {
  sellerId: string;
}

const STATUS_CONFIG: Record<Invoice["status"], { label: string; color: string; bg: string; icon: any }> = {
  draft: {
    label: "Draft",
    color: "text-muted-foreground",
    bg: "bg-muted dark:bg-foreground",
    icon: FileText,
  },
  sent: {
    label: "Sent",
    color: "text-primary",
    bg: "bg-primary/10 dark:bg-primary/30",
    icon: Send,
  },
  viewed: {
    label: "Viewed",
    color: "text-primary",
    bg: "bg-primary/10 dark:bg-primary/30",
    icon: Eye,
  },
  paid: {
    label: "Paid",
    color: "text-success",
    bg: "bg-success/10 dark:bg-success/30",
    icon: CheckCircle,
  },
  cancelled: {
    label: "Cancelled",
    color: "text-red-700",
    bg: "bg-red-100 dark:bg-red-900/30",
    icon: XCircle,
  },
  overdue: {
    label: "Overdue",
    color: "text-orange-700",
    bg: "bg-orange-100 dark:bg-orange-900/30",
    icon: Clock,
  },
};

const InvoicesManager = ({ sellerId }: InvoicesManagerProps) => {
  const { invoices, leads, createInvoice, updateInvoice } = useSellerCRM();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedLead, setSelectedLead] = useState<string>("");

  const [invoiceForm, setInvoiceForm] = useState({
    buyer_name: "",
    buyer_email: "",
    buyer_phone: "",
    buyer_company: "",
    buyer_address: "",
    items: [{ name: "", description: "", quantity: 1, unit_price: 0, total: 0 }] as InvoiceItem[],
    tax_rate: 18,
    discount_amount: 0,
    notes: "",
    terms: "Payment due within 30 days of invoice date.",
    due_date: "",
  });

  const unlockedLeads = leads.filter((l) => l.is_unlocked);

  const handleLeadSelect = (leadId: string) => {
    setSelectedLead(leadId);
    const lead = leads.find((l) => l.id === leadId);
    if (lead) {
      setInvoiceForm((prev) => ({
        ...prev,
        buyer_name: lead.buyer_name || "",
        buyer_email: lead.buyer_email || "",
        buyer_phone: lead.buyer_phone || "",
        buyer_company: lead.buyer_company || "",
      }));
    }
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...invoiceForm.items];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === "quantity" || field === "unit_price") {
      newItems[index].total = (newItems[index].quantity || 0) * (newItems[index].unit_price || 0);
    }
    setInvoiceForm((prev) => ({ ...prev, items: newItems }));
  };

  const addItem = () => {
    setInvoiceForm((prev) => ({
      ...prev,
      items: [...prev.items, { name: "", description: "", quantity: 1, unit_price: 0, total: 0 }],
    }));
  };

  const removeItem = (index: number) => {
    setInvoiceForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const calculateTotals = () => {
    const subtotal = invoiceForm.items.reduce((sum, item) => sum + (item.total || 0), 0);
    const taxAmount = (subtotal * invoiceForm.tax_rate) / 100;
    const total = subtotal + taxAmount - (invoiceForm.discount_amount || 0);
    return { subtotal, taxAmount, total };
  };

  const handleCreateInvoice = async () => {
    const { subtotal, taxAmount, total } = calculateTotals();

    await createInvoice({
      lead_id: selectedLead || undefined,
      buyer_name: invoiceForm.buyer_name,
      buyer_email: invoiceForm.buyer_email,
      buyer_phone: invoiceForm.buyer_phone,
      buyer_company: invoiceForm.buyer_company,
      buyer_address: invoiceForm.buyer_address,
      items: invoiceForm.items,
      subtotal,
      tax_rate: invoiceForm.tax_rate,
      tax_amount: taxAmount,
      discount_amount: invoiceForm.discount_amount,
      total_amount: total,
      notes: invoiceForm.notes,
      terms: invoiceForm.terms,
      due_date: invoiceForm.due_date || null,
      status: "draft",
    });

    setShowCreateModal(false);
    resetForm();
  };

  const handleSendInvoice = async (invoiceId: string) => {
    await updateInvoice(invoiceId, { status: "sent" });
  };

  const handleMarkPaid = async (invoiceId: string) => {
    await updateInvoice(invoiceId, {
      status: "paid",
      paid_at: new Date().toISOString(),
    });
  };

  const resetForm = () => {
    setSelectedLead("");
    setInvoiceForm({
      buyer_name: "",
      buyer_email: "",
      buyer_phone: "",
      buyer_company: "",
      buyer_address: "",
      items: [{ name: "", description: "", quantity: 1, unit_price: 0, total: 0 }],
      tax_rate: 18,
      discount_amount: 0,
      notes: "",
      terms: "Payment due within 30 days of invoice date.",
      due_date: "",
    });
  };

  const { subtotal, taxAmount, total } = calculateTotals();

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">Invoices & billing</h3>
          <p className="text-sm text-muted-foreground">Issue invoices for qualified leads and track payment status.</p>
        </div>
        <Button size="sm" onClick={() => setShowCreateModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New invoice
        </Button>
      </div>

      {/* Invoices list */}
      {invoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <FileText className="h-10 w-10 text-muted-foreground" />
          <h3 className="text-base font-semibold">No invoices yet</h3>
          <p className="max-w-md text-sm text-muted-foreground">
            Create your first invoice for a lead. All invoices will appear here with status and amounts.
          </p>
          <Button size="sm" onClick={() => setShowCreateModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create invoice
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map((invoice) => {
            const statusConfig = STATUS_CONFIG[invoice.status];
            const StatusIcon = statusConfig.icon;

            return (
              <div
                key={invoice.id}
                className="bg-card border-muted/60 flex flex-col rounded-lg border p-4 text-sm shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-mono text-xs font-semibold uppercase text-muted-foreground">
                        {invoice.invoice_number}
                      </span>
                      <Badge
                        className={`${statusConfig.bg} ${statusConfig.color} border-0 inline-flex items-center gap-1 text-[11px]`}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {statusConfig.label}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium">{invoice.buyer_name || "Unnamed buyer"}</p>
                    {invoice.buyer_company && <p className="text-xs text-muted-foreground">{invoice.buyer_company}</p>}
                  </div>

                  <div className="text-right space-y-1">
                    <p className="text-lg font-semibold">₹{invoice.total_amount.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">
                      Issued: {format(new Date(invoice.created_at), "MMM d, yyyy")}
                    </p>
                    {invoice.due_date && (
                      <p className="text-xs text-muted-foreground">
                        Due: {format(new Date(invoice.due_date), "MMM d, yyyy")}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2 border-t pt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedInvoice(invoice);
                      setShowViewModal(true);
                    }}
                  >
                    <Eye className="mr-1 h-3 w-3" />
                    View
                  </Button>

                  {invoice.status === "draft" && (
                    <Button size="sm" onClick={() => handleSendInvoice(invoice.id)}>
                      <Send className="mr-1 h-3 w-3" />
                      Send
                    </Button>
                  )}

                  {(invoice.status === "sent" || invoice.status === "viewed") && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-success"
                      onClick={() => handleMarkPaid(invoice.id)}
                    >
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Mark paid
                    </Button>
                  )}

                  <Button size="sm" variant="ghost">
                    <Download className="mr-1 h-3 w-3" />
                    PDF
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Invoice Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">Create invoice</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 pt-2 text-sm">
            {/* Lead selection */}
            {unlockedLeads.length > 0 && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Link to lead (optional)</label>
                <Select value={selectedLead} onValueChange={handleLeadSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a lead..." />
                  </SelectTrigger>
                  <SelectContent>
                    {unlockedLeads.map((lead) => (
                      <SelectItem key={lead.id} value={lead.id}>
                        {lead.buyer_name} · {lead.buyer_company}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Buyer details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Buyer name *</label>
                <Input
                  value={invoiceForm.buyer_name}
                  onChange={(e) =>
                    setInvoiceForm((prev) => ({
                      ...prev,
                      buyer_name: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Company</label>
                <Input
                  value={invoiceForm.buyer_company}
                  onChange={(e) =>
                    setInvoiceForm((prev) => ({
                      ...prev,
                      buyer_company: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Email</label>
                <Input
                  type="email"
                  value={invoiceForm.buyer_email}
                  onChange={(e) =>
                    setInvoiceForm((prev) => ({
                      ...prev,
                      buyer_email: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Phone</label>
                <Input
                  value={invoiceForm.buyer_phone}
                  onChange={(e) =>
                    setInvoiceForm((prev) => ({
                      ...prev,
                      buyer_phone: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Address</label>
                <Textarea
                  rows={2}
                  value={invoiceForm.buyer_address}
                  onChange={(e) =>
                    setInvoiceForm((prev) => ({
                      ...prev,
                      buyer_address: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            {/* Items */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Line items</label>
              <div className="space-y-3">
                {invoiceForm.items.map((item, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <Input
                      placeholder="Item name"
                      value={item.name}
                      onChange={(e) => updateItem(index, "name", e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 0)}
                      className="w-20"
                    />
                    <Input
                      type="number"
                      placeholder="Price"
                      value={item.unit_price}
                      onChange={(e) => updateItem(index, "unit_price", parseFloat(e.target.value) || 0)}
                      className="w-28"
                    />
                    <div className="w-24 py-2 text-right font-medium">₹{(item.total || 0).toLocaleString()}</div>
                    {invoiceForm.items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="mt-1 text-red-600"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="mr-1 h-4 w-4" />
                  Add item
                </Button>
              </div>
            </div>

            {/* Totals */}
            <div className="space-y-2 border-t pt-4 text-sm">
              <div className="flex items-center justify-between">
                <span>Subtotal</span>
                <span>₹{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>Tax</span>
                  <Input
                    type="number"
                    value={invoiceForm.tax_rate}
                    onChange={(e) =>
                      setInvoiceForm((prev) => ({
                        ...prev,
                        tax_rate: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="h-7 w-16 text-xs"
                  />
                  <span>%</span>
                </div>
                <span>₹{taxAmount.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>Discount</span>
                  <Input
                    type="number"
                    value={invoiceForm.discount_amount}
                    onChange={(e) =>
                      setInvoiceForm((prev) => ({
                        ...prev,
                        discount_amount: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="h-7 w-24 text-xs"
                  />
                </div>
                <span>-₹{(invoiceForm.discount_amount || 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between border-t pt-2 text-base font-semibold">
                <span>Total</span>
                <span>₹{total.toLocaleString()}</span>
              </div>
            </div>

            {/* Due date & notes */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Due date</label>
                <Input
                  type="date"
                  value={invoiceForm.due_date}
                  onChange={(e) =>
                    setInvoiceForm((prev) => ({
                      ...prev,
                      due_date: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Notes for buyer</label>
              <Textarea
                rows={2}
                value={invoiceForm.notes}
                onChange={(e) =>
                  setInvoiceForm((prev) => ({
                    ...prev,
                    notes: e.target.value,
                  }))
                }
                placeholder="Additional instructions or terms for this invoice…"
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowCreateModal(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreateInvoice} disabled={!invoiceForm.buyer_name}>
              <DollarSign className="mr-2 h-4 w-4" />
              Create invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Invoice Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">Invoice {selectedInvoice?.invoice_number}</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4 pt-2 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold">Bill to</h4>
                  <p className="font-medium">{selectedInvoice.buyer_name}</p>
                  {selectedInvoice.buyer_company && (
                    <p className="text-xs text-muted-foreground">{selectedInvoice.buyer_company}</p>
                  )}
                  {selectedInvoice.buyer_email && (
                    <p className="text-xs text-muted-foreground">{selectedInvoice.buyer_email}</p>
                  )}
                  {selectedInvoice.buyer_phone && (
                    <p className="text-xs text-muted-foreground">{selectedInvoice.buyer_phone}</p>
                  )}
                </div>
                <div className="text-right space-y-1">
                  <Badge
                    className={`${STATUS_CONFIG[selectedInvoice.status].bg} ${STATUS_CONFIG[selectedInvoice.status].color} border-0`}
                  >
                    {STATUS_CONFIG[selectedInvoice.status].label}
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    Date: {format(new Date(selectedInvoice.created_at), "MMM d, yyyy")}
                  </p>
                  {selectedInvoice.due_date && (
                    <p className="text-xs text-muted-foreground">
                      Due: {format(new Date(selectedInvoice.due_date), "MMM d, yyyy")}
                    </p>
                  )}
                </div>
              </div>

              <div className="overflow-hidden rounded-lg border">
                <table className="w-full text-xs">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-3 text-left font-medium">Item</th>
                      <th className="p-3 text-right font-medium">Qty</th>
                      <th className="p-3 text-right font-medium">Price</th>
                      <th className="p-3 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoice.items.map((item, index) => (
                      <tr key={index} className="border-t">
                        <td className="p-3">{item.name}</td>
                        <td className="p-3 text-right">{item.quantity}</td>
                        <td className="p-3 text-right">₹{item.unit_price.toLocaleString()}</td>
                        <td className="p-3 text-right">₹{item.total.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <div className="w-64 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>₹{selectedInvoice.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax ({selectedInvoice.tax_rate}%)</span>
                    <span>₹{selectedInvoice.tax_amount.toLocaleString()}</span>
                  </div>
                  {selectedInvoice.discount_amount > 0 && (
                    <div className="flex justify-between">
                      <span>Discount</span>
                      <span>
                        -₹
                        {selectedInvoice.discount_amount.toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-2 text-sm font-semibold">
                    <span>Total</span>
                    <span>₹{selectedInvoice.total_amount.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {selectedInvoice.notes && (
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold">Notes</h4>
                  <p className="text-xs text-muted-foreground">{selectedInvoice.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InvoicesManager;
