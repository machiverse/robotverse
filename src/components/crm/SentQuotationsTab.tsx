import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  FileText, Search, Eye, Clock, User, Building,
  CheckCircle, XCircle, RefreshCw, IndianRupee, Send,
  Calendar, TrendingUp, FileSpreadsheet, Loader2, Pencil
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";
import CreateQuotationModal from "./CreateQuotationModal";

interface Quotation {
  id: string;
  quotation_number: string;
  buyer_name: string;
  buyer_company: string | null;
  buyer_email: string | null;
  buyer_phone: string | null;
  items: any;
  subtotal: number;
  tax_rate: number | null;
  tax_amount: number | null;
  discount_amount: number | null;
  shipping_amount: number | null;
  total_amount: number;
  status: string | null;
  notes: string | null;
  terms_conditions: string | null;
  valid_until: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  created_at: string;
  currency: string | null;
}

interface SentQuotationsTabProps {
  compact?: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  draft: { label: "Draft", color: "text-gray-700 dark:text-gray-300", bg: "bg-gray-100 dark:bg-gray-800", icon: FileText },
  sent: { label: "Sent", color: "text-blue-700 dark:text-blue-300", bg: "bg-blue-100 dark:bg-blue-900/30", icon: Send },
  viewed: { label: "Viewed", color: "text-purple-700 dark:text-purple-300", bg: "bg-purple-100 dark:bg-purple-900/30", icon: Eye },
  accepted: { label: "Accepted", color: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-100 dark:bg-emerald-900/30", icon: CheckCircle },
  rejected: { label: "Rejected", color: "text-red-700 dark:text-red-300", bg: "bg-red-100 dark:bg-red-900/30", icon: XCircle },
};

const SentQuotationsTab = ({ compact = false }: SentQuotationsTabProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [editQuotation, setEditQuotation] = useState<Quotation | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const handleEditQuotation = (q: Quotation) => {
    setEditQuotation(q);
    setShowEditModal(true);
    setShowDetail(false);
  };

  const mapToExistingQuotation = (q: Quotation): any => ({
    ...q,
    items: getItemsList(q.items),
    discount_type: "fixed",
    discount_value: q.discount_amount || 0,
    version: 1,
    parent_quotation_id: q.id,
  });

  useEffect(() => {
    if (user) fetchQuotations();
  }, [user]);

  const fetchQuotations = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("crm_quotations")
        .select("*")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setQuotations(data || []);
    } catch (error) {
      console.error("Error fetching quotations:", error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = quotations.filter((q) => {
    const matchesSearch = !searchQuery ||
      q.buyer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.buyer_company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.quotation_number?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || q.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getItemsList = (items: unknown): any[] => {
    if (Array.isArray(items)) return items;
    if (typeof items === "string") {
      try { const parsed = JSON.parse(items); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
    }
    return [];
  };

  // Stats
  const totalValue = quotations.reduce((s, q) => s + (q.total_amount || 0), 0);
  const sentCount = quotations.filter(q => q.status === "sent").length;
  const acceptedCount = quotations.filter(q => q.status === "accepted").length;
  const pendingCount = quotations.filter(q => q.status === "sent" || q.status === "viewed").length;
  const acceptanceRate = quotations.length > 0 ? Math.round((acceptedCount / quotations.length) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin mr-2 text-primary" />
        <span className="text-muted-foreground">Loading quotations...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { title: "Total Quotations", value: quotations.length, icon: FileSpreadsheet, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
          { title: "Total Value", value: `₹${totalValue.toLocaleString("en-IN")}`, icon: IndianRupee, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
          { title: "Pending Response", value: pendingCount, icon: Clock, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30" },
          { title: "Acceptance Rate", value: `${acceptanceRate}%`, icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/30" },
        ].map((stat) => (
          <Card key={stat.title} className="border-muted/60">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2 ${stat.bg}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{stat.title}</p>
                  <p className="text-lg font-bold">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by buyer, company, or quote #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="viewed">Viewed</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={fetchQuotations}>
          <RefreshCw className="w-4 h-4 mr-1" /> Refresh
        </Button>
      </div>

      {/* Quotations Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <FileSpreadsheet className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
          <h3 className="text-lg font-semibold mb-1">No quotations found</h3>
          <p className="text-sm text-muted-foreground">
            {quotations.length === 0
              ? "You haven't sent any quotations yet. Submit quotes from the Quote Requests or Leads tab."
              : "No quotations match your current filters."}
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="font-semibold">Quote #</TableHead>
                <TableHead className="font-semibold">Buyer</TableHead>
                <TableHead className="font-semibold">Items</TableHead>
                <TableHead className="text-right font-semibold">Amount</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Date</TableHead>
                <TableHead className="text-right font-semibold">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((q) => {
                const items = getItemsList(q.items);
                const config = STATUS_CONFIG[q.status || "draft"] || STATUS_CONFIG.draft;
                const StatusIcon = config.icon;

                return (
                  <TableRow key={q.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => { setSelectedQuotation(q); setShowDetail(true); }}>
                    <TableCell>
                      <span className="font-mono text-xs font-medium text-primary">{q.quotation_number}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-sm flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-muted-foreground" />
                          {q.buyer_name}
                        </span>
                        {q.buyer_company && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <Building className="w-3 h-3" />
                            {q.buyer_company}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        {items.slice(0, 2).map((item, i) => (
                          <span key={i} className="text-xs text-muted-foreground truncate max-w-[180px]">
                            {item.name || item.product_name || "Item"} × {item.quantity || 1}
                          </span>
                        ))}
                        {items.length > 2 && (
                          <span className="text-[10px] text-muted-foreground">+{items.length - 2} more</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-semibold text-sm">
                        ₹{Number(q.total_amount || 0).toLocaleString("en-IN")}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${config.bg} ${config.color} border-0 text-[11px] font-medium gap-1`}>
                        <StatusIcon className="w-3 h-3" />
                        {config.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs">{format(new Date(q.created_at), "MMM dd, yyyy")}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(q.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleEditQuotation(q); }} title="Edit & Resend">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedQuotation(q); setShowDetail(true); }}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Detail Modal */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              Quotation Details
            </DialogTitle>
          </DialogHeader>
          {selectedQuotation && (() => {
            const items = getItemsList(selectedQuotation.items);
            const config = STATUS_CONFIG[selectedQuotation.status || "draft"] || STATUS_CONFIG.draft;
            const StatusIcon = config.icon;

            return (
              <ScrollArea className="max-h-[70vh]">
                <div className="space-y-5 p-1">
                  {/* Header Info */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-mono text-sm font-bold text-primary">{selectedQuotation.quotation_number}</p>
                      <p className="text-xs text-muted-foreground">
                        Created {format(new Date(selectedQuotation.created_at), "PPP 'at' p")}
                      </p>
                    </div>
                    <Badge className={`${config.bg} ${config.color} border-0 text-xs font-medium gap-1.5 px-3 py-1`}>
                      <StatusIcon className="w-3.5 h-3.5" />
                      {config.label}
                    </Badge>
                  </div>

                  <Separator />

                  {/* Buyer Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Buyer Name</p>
                      <p className="text-sm font-medium">{selectedQuotation.buyer_name}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Company</p>
                      <p className="text-sm font-medium">{selectedQuotation.buyer_company || "N/A"}</p>
                    </div>
                  </div>

                  <Separator />

                  {/* Items */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Line Items</p>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/40">
                            <TableHead className="text-xs">Item</TableHead>
                            <TableHead className="text-xs text-right">Qty</TableHead>
                            <TableHead className="text-xs text-right">Unit Price</TableHead>
                            <TableHead className="text-xs text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map((item, i) => (
                            <TableRow key={i}>
                              <TableCell className="text-sm">{item.name || item.product_name || "Item"}</TableCell>
                              <TableCell className="text-sm text-right">{item.quantity || 1}</TableCell>
                              <TableCell className="text-sm text-right">₹{Number(item.unit_price || item.price || 0).toLocaleString("en-IN")}</TableCell>
                              <TableCell className="text-sm text-right font-medium">
                                ₹{Number((item.quantity || 1) * (item.unit_price || item.price || 0)).toLocaleString("en-IN")}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>₹{Number(selectedQuotation.subtotal || 0).toLocaleString("en-IN")}</span>
                    </div>
                    {selectedQuotation.tax_amount && selectedQuotation.tax_amount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tax ({selectedQuotation.tax_rate || 18}%)</span>
                        <span>₹{Number(selectedQuotation.tax_amount).toLocaleString("en-IN")}</span>
                      </div>
                    )}
                    {selectedQuotation.discount_amount && selectedQuotation.discount_amount > 0 && (
                      <div className="flex justify-between text-sm text-emerald-600">
                        <span>Discount</span>
                        <span>-₹{Number(selectedQuotation.discount_amount).toLocaleString("en-IN")}</span>
                      </div>
                    )}
                    {selectedQuotation.shipping_amount && selectedQuotation.shipping_amount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Shipping</span>
                        <span>₹{Number(selectedQuotation.shipping_amount).toLocaleString("en-IN")}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between text-base font-bold">
                      <span>Total Amount</span>
                      <span className="text-primary">₹{Number(selectedQuotation.total_amount || 0).toLocaleString("en-IN")}</span>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Timeline</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 text-sm">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        <span className="text-muted-foreground">Created</span>
                        <span className="ml-auto text-xs">{format(new Date(selectedQuotation.created_at), "PPP p")}</span>
                      </div>
                      {selectedQuotation.sent_at && (
                        <div className="flex items-center gap-3 text-sm">
                          <div className="w-2 h-2 rounded-full bg-indigo-500" />
                          <span className="text-muted-foreground">Sent</span>
                          <span className="ml-auto text-xs">{format(new Date(selectedQuotation.sent_at), "PPP p")}</span>
                        </div>
                      )}
                      {selectedQuotation.viewed_at && (
                        <div className="flex items-center gap-3 text-sm">
                          <div className="w-2 h-2 rounded-full bg-purple-500" />
                          <span className="text-muted-foreground">Viewed by Buyer</span>
                          <span className="ml-auto text-xs">{format(new Date(selectedQuotation.viewed_at), "PPP p")}</span>
                        </div>
                      )}
                      {selectedQuotation.accepted_at && (
                        <div className="flex items-center gap-3 text-sm">
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span className="text-muted-foreground">Accepted</span>
                          <span className="ml-auto text-xs">{format(new Date(selectedQuotation.accepted_at), "PPP p")}</span>
                        </div>
                      )}
                      {selectedQuotation.rejected_at && (
                        <div className="flex items-center gap-3 text-sm">
                          <div className="w-2 h-2 rounded-full bg-red-500" />
                          <span className="text-muted-foreground">Rejected</span>
                          <span className="ml-auto text-xs">{format(new Date(selectedQuotation.rejected_at), "PPP p")}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Notes */}
                  {selectedQuotation.notes && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Notes</p>
                      <div className="bg-muted/30 rounded-lg p-3">
                        <p className="text-sm whitespace-pre-wrap">{selectedQuotation.notes}</p>
                      </div>
                    </div>
                  )}

                  {/* Edit & Resend Button */}
                  <div className="flex gap-2 pt-2">
                    <Button 
                      className="flex-1" 
                      onClick={() => handleEditQuotation(selectedQuotation)}
                    >
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit & Resend Quotation
                    </Button>
                  </div>

                  {/* Valid Until */}
                  {selectedQuotation.valid_until && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>Valid until {format(new Date(selectedQuotation.valid_until), "PPP")}</span>
                    </div>
                  )}
                </div>
              </ScrollArea>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Edit Quotation Modal */}
      {editQuotation && (
        <CreateQuotationModal
          open={showEditModal}
          onOpenChange={(open) => {
            setShowEditModal(open);
            if (!open) setEditQuotation(null);
          }}
          onSuccess={() => {
            fetchQuotations();
            setShowEditModal(false);
            setEditQuotation(null);
          }}
          existingQuotation={mapToExistingQuotation(editQuotation)}
        />
      )}
    </div>
  );
};

export default SentQuotationsTab;
