import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  FileText, 
  Send, 
  Eye,
  Trash2,
  CheckCircle,
  Clock,
  XCircle,
  DollarSign,
  Download
} from 'lucide-react';
import { useSellerCRM, type Invoice, type InvoiceItem, type Lead } from '@/hooks/useSellerCRM';
import { format } from 'date-fns';

interface InvoicesManagerProps {
  sellerId: string;
}

const STATUS_CONFIG: Record<Invoice['status'], { label: string; color: string; bg: string; icon: any }> = {
  draft: { label: 'Draft', color: 'text-gray-700', bg: 'bg-gray-100 dark:bg-gray-800', icon: FileText },
  sent: { label: 'Sent', color: 'text-blue-700', bg: 'bg-blue-100 dark:bg-blue-900/30', icon: Send },
  viewed: { label: 'Viewed', color: 'text-purple-700', bg: 'bg-purple-100 dark:bg-purple-900/30', icon: Eye },
  paid: { label: 'Paid', color: 'text-green-700', bg: 'bg-green-100 dark:bg-green-900/30', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'text-red-700', bg: 'bg-red-100 dark:bg-red-900/30', icon: XCircle },
  overdue: { label: 'Overdue', color: 'text-orange-700', bg: 'bg-orange-100 dark:bg-orange-900/30', icon: Clock }
};

const InvoicesManager = ({ sellerId }: InvoicesManagerProps) => {
  const { invoices, leads, createInvoice, updateInvoice } = useSellerCRM();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedLead, setSelectedLead] = useState<string>('');
  
  const [invoiceForm, setInvoiceForm] = useState({
    buyer_name: '',
    buyer_email: '',
    buyer_phone: '',
    buyer_company: '',
    buyer_address: '',
    items: [{ name: '', description: '', quantity: 1, unit_price: 0, total: 0 }] as InvoiceItem[],
    tax_rate: 18,
    discount_amount: 0,
    notes: '',
    terms: 'Payment due within 30 days of invoice date.',
    due_date: ''
  });

  const unlockedLeads = leads.filter(l => l.is_unlocked);

  const handleLeadSelect = (leadId: string) => {
    setSelectedLead(leadId);
    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      setInvoiceForm(prev => ({
        ...prev,
        buyer_name: lead.buyer_name || '',
        buyer_email: lead.buyer_email || '',
        buyer_phone: lead.buyer_phone || '',
        buyer_company: lead.buyer_company || ''
      }));
    }
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...invoiceForm.items];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].total = newItems[index].quantity * newItems[index].unit_price;
    }
    setInvoiceForm(prev => ({ ...prev, items: newItems }));
  };

  const addItem = () => {
    setInvoiceForm(prev => ({
      ...prev,
      items: [...prev.items, { name: '', description: '', quantity: 1, unit_price: 0, total: 0 }]
    }));
  };

  const removeItem = (index: number) => {
    setInvoiceForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const calculateTotals = () => {
    const subtotal = invoiceForm.items.reduce((sum, item) => sum + item.total, 0);
    const taxAmount = (subtotal * invoiceForm.tax_rate) / 100;
    const total = subtotal + taxAmount - invoiceForm.discount_amount;
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
      status: 'draft'
    });

    setShowCreateModal(false);
    resetForm();
  };

  const handleSendInvoice = async (invoiceId: string) => {
    await updateInvoice(invoiceId, { status: 'sent' });
  };

  const handleMarkPaid = async (invoiceId: string) => {
    await updateInvoice(invoiceId, { 
      status: 'paid',
      paid_at: new Date().toISOString()
    });
  };

  const resetForm = () => {
    setSelectedLead('');
    setInvoiceForm({
      buyer_name: '',
      buyer_email: '',
      buyer_phone: '',
      buyer_company: '',
      buyer_address: '',
      items: [{ name: '', description: '', quantity: 1, unit_price: 0, total: 0 }],
      tax_rate: 18,
      discount_amount: 0,
      notes: '',
      terms: 'Payment due within 30 days of invoice date.',
      due_date: ''
    });
  };

  const { subtotal, taxAmount, total } = calculateTotals();

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold">Invoices</h3>
          <p className="text-sm text-muted-foreground">Create and manage invoices for your leads</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Invoice
        </Button>
      </div>

      {/* Invoices List */}
      {invoices.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No invoices yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first invoice to start tracking payments
          </p>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Invoice
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
                className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-card"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-mono font-semibold">{invoice.invoice_number}</span>
                      <Badge className={`${statusConfig.bg} ${statusConfig.color} border-0 flex items-center gap-1`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig.label}
                      </Badge>
                    </div>
                    <p className="font-medium">{invoice.buyer_name}</p>
                    <p className="text-sm text-muted-foreground">{invoice.buyer_company}</p>
                  </div>

                  <div className="text-right">
                    <p className="text-xl font-bold">₹{invoice.total_amount.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(invoice.created_at), 'MMM d, yyyy')}
                    </p>
                    {invoice.due_date && (
                      <p className="text-xs text-muted-foreground">
                        Due: {format(new Date(invoice.due_date), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4 pt-3 border-t">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      setSelectedInvoice(invoice);
                      setShowViewModal(true);
                    }}
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    View
                  </Button>
                  {invoice.status === 'draft' && (
                    <Button 
                      size="sm"
                      onClick={() => handleSendInvoice(invoice.id)}
                    >
                      <Send className="w-3 h-3 mr-1" />
                      Send
                    </Button>
                  )}
                  {(invoice.status === 'sent' || invoice.status === 'viewed') && (
                    <Button 
                      size="sm"
                      variant="outline"
                      className="text-green-600"
                      onClick={() => handleMarkPaid(invoice.id)}
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Mark Paid
                    </Button>
                  )}
                  <Button size="sm" variant="ghost">
                    <Download className="w-3 h-3 mr-1" />
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Invoice</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Select Lead or Manual Entry */}
            {unlockedLeads.length > 0 && (
              <div>
                <label className="text-sm text-muted-foreground">Select from Leads (Optional)</label>
                <Select value={selectedLead} onValueChange={handleLeadSelect}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Choose a lead..." />
                  </SelectTrigger>
                  <SelectContent>
                    {unlockedLeads.map((lead) => (
                      <SelectItem key={lead.id} value={lead.id}>
                        {lead.buyer_name} - {lead.buyer_company}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Buyer Details */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground">Buyer Name *</label>
                <Input
                  value={invoiceForm.buyer_name}
                  onChange={(e) => setInvoiceForm(prev => ({ ...prev, buyer_name: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Company</label>
                <Input
                  value={invoiceForm.buyer_company}
                  onChange={(e) => setInvoiceForm(prev => ({ ...prev, buyer_company: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Email</label>
                <Input
                  type="email"
                  value={invoiceForm.buyer_email}
                  onChange={(e) => setInvoiceForm(prev => ({ ...prev, buyer_email: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Phone</label>
                <Input
                  value={invoiceForm.buyer_phone}
                  onChange={(e) => setInvoiceForm(prev => ({ ...prev, buyer_phone: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm text-muted-foreground">Address</label>
                <Textarea
                  value={invoiceForm.buyer_address}
                  onChange={(e) => setInvoiceForm(prev => ({ ...prev, buyer_address: e.target.value }))}
                  className="mt-1"
                  rows={2}
                />
              </div>
            </div>

            {/* Line Items */}
            <div>
              <label className="text-sm text-muted-foreground">Items</label>
              <div className="space-y-3 mt-2">
                {invoiceForm.items.map((item, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <Input
                      placeholder="Item name"
                      value={item.name}
                      onChange={(e) => updateItem(index, 'name', e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                      className="w-20"
                    />
                    <Input
                      type="number"
                      placeholder="Price"
                      value={item.unit_price}
                      onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                      className="w-28"
                    />
                    <div className="w-24 text-right font-medium py-2">
                      ₹{item.total.toLocaleString()}
                    </div>
                    {invoiceForm.items.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(index)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addItem}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Item
                </Button>
              </div>
            </div>

            {/* Totals */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>₹{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm items-center">
                <div className="flex items-center gap-2">
                  <span>Tax</span>
                  <Input
                    type="number"
                    value={invoiceForm.tax_rate}
                    onChange={(e) => setInvoiceForm(prev => ({ ...prev, tax_rate: parseFloat(e.target.value) || 0 }))}
                    className="w-16 h-7 text-sm"
                  />
                  <span>%</span>
                </div>
                <span>₹{taxAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm items-center">
                <div className="flex items-center gap-2">
                  <span>Discount</span>
                  <Input
                    type="number"
                    value={invoiceForm.discount_amount}
                    onChange={(e) => setInvoiceForm(prev => ({ ...prev, discount_amount: parseFloat(e.target.value) || 0 }))}
                    className="w-24 h-7 text-sm"
                  />
                </div>
                <span>-₹{invoiceForm.discount_amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total</span>
                <span>₹{total.toLocaleString()}</span>
              </div>
            </div>

            {/* Due Date & Notes */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground">Due Date</label>
                <Input
                  type="date"
                  value={invoiceForm.due_date}
                  onChange={(e) => setInvoiceForm(prev => ({ ...prev, due_date: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Notes</label>
              <Textarea
                value={invoiceForm.notes}
                onChange={(e) => setInvoiceForm(prev => ({ ...prev, notes: e.target.value }))}
                className="mt-1"
                rows={2}
                placeholder="Additional notes..."
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => { setShowCreateModal(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleCreateInvoice} disabled={!invoiceForm.buyer_name}>
              Create Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Invoice Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Invoice {selectedInvoice?.invoice_number}</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Bill To</h4>
                  <p>{selectedInvoice.buyer_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedInvoice.buyer_company}</p>
                  <p className="text-sm text-muted-foreground">{selectedInvoice.buyer_email}</p>
                  <p className="text-sm text-muted-foreground">{selectedInvoice.buyer_phone}</p>
                </div>
                <div className="text-right">
                  <Badge className={`${STATUS_CONFIG[selectedInvoice.status].bg} ${STATUS_CONFIG[selectedInvoice.status].color} border-0`}>
                    {STATUS_CONFIG[selectedInvoice.status].label}
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-2">
                    Date: {format(new Date(selectedInvoice.created_at), 'MMM d, yyyy')}
                  </p>
                  {selectedInvoice.due_date && (
                    <p className="text-sm text-muted-foreground">
                      Due: {format(new Date(selectedInvoice.due_date), 'MMM d, yyyy')}
                    </p>
                  )}
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-3 text-sm">Item</th>
                      <th className="text-right p-3 text-sm">Qty</th>
                      <th className="text-right p-3 text-sm">Price</th>
                      <th className="text-right p-3 text-sm">Total</th>
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
                <div className="w-64 space-y-1 text-sm">
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
                      <span>-₹{selectedInvoice.discount_amount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total</span>
                    <span>₹{selectedInvoice.total_amount.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {selectedInvoice.notes && (
                <div>
                  <h4 className="font-semibold mb-1">Notes</h4>
                  <p className="text-sm text-muted-foreground">{selectedInvoice.notes}</p>
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