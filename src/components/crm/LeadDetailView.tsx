import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  X,
  Phone,
  Mail,
  Building2,
  Calendar,
  MessageSquare,
  FileText,
  Loader2,
  User,
  Package,
  MapPin,
  Clock,
  MessageCircle,
  FileSpreadsheet,
  ChevronDown,
  Plus,
  Send,
  Edit2,
  Save,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

import { type Lead, type LeadActivity } from "@/hooks/useSellerCRM";

interface LeadDetailViewProps {
  lead: Lead;
  activities: LeadActivity[];
  onClose: () => void;
  onStatusChange: (leadId: string, status: Lead["status"]) => Promise<boolean | void>;
  onAddActivity: (
    leadId: string,
    activityType: "call" | "email" | "meeting" | "note" | "follow_up" | "invoice_sent" | "status_change",
    title: string,
    description?: string
  ) => Promise<any>;
  onUpdateNotes: (leadId: string, notes: string) => Promise<boolean | void>;
  onScheduleFollowUp: (leadId: string, date: string, notes?: string) => Promise<boolean | void>;
  onSendQuotation: (data: {
    items: { name: string; quantity: number; unit_price: number }[];
    notes: string;
  }) => Promise<void>;
}

const STATUS_CONFIG: Record<Lead["status"], { label: string; color: string; bg: string }> = {
  new: { label: "New", color: "text-blue-700", bg: "bg-blue-100 dark:bg-blue-900/30" },
  contacted: { label: "Contacted", color: "text-yellow-700", bg: "bg-yellow-100 dark:bg-yellow-900/30" },
  quoted: { label: "Quoted", color: "text-purple-700", bg: "bg-purple-100 dark:bg-purple-900/30" },
  negotiating: { label: "Negotiating", color: "text-orange-700", bg: "bg-orange-100 dark:bg-orange-900/30" },
  closed_won: { label: "Won", color: "text-green-700", bg: "bg-green-100 dark:bg-green-900/30" },
  closed_lost: { label: "Lost", color: "text-red-700", bg: "bg-red-100 dark:bg-red-900/30" },
};

const PRIORITY_CONFIG: Record<Lead["priority"], { label: string; color: string }> = {
  low: { label: "Low", color: "text-gray-600" },
  medium: { label: "Medium", color: "text-blue-600" },
  high: { label: "High", color: "text-orange-600" },
  urgent: { label: "Urgent", color: "text-red-600" },
};

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  call: <Phone className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  meeting: <Calendar className="h-4 w-4" />,
  note: <FileText className="h-4 w-4" />,
  follow_up: <Clock className="h-4 w-4" />,
  invoice_sent: <FileSpreadsheet className="h-4 w-4" />,
  status_change: <ChevronDown className="h-4 w-4" />,
};

const LeadDetailView = ({
  lead,
  activities,
  onClose,
  onStatusChange,
  onAddActivity,
  onUpdateNotes,
  onScheduleFollowUp,
  onSendQuotation,
}: LeadDetailViewProps) => {
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notes, setNotes] = useState(lead.notes || "");
  const [savingNotes, setSavingNotes] = useState(false);
  
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [activityType, setActivityType] = useState<"call" | "email" | "meeting" | "note">("note");
  const [activityTitle, setActivityTitle] = useState("");
  const [activityDescription, setActivityDescription] = useState("");
  const [addingActivity, setAddingActivity] = useState(false);

  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpNotes, setFollowUpNotes] = useState("");
  const [schedulingFollowUp, setSchedulingFollowUp] = useState(false);

  const [showQuotationModal, setShowQuotationModal] = useState(false);
  const [quotationItems, setQuotationItems] = useState([
    { name: lead.item_name || "", quantity: 1, unit_price: 0 },
  ]);
  const [quotationNotes, setQuotationNotes] = useState("");
  const [sendingQuotation, setSendingQuotation] = useState(false);

  const statusConfig = STATUS_CONFIG[lead.status];
  const priorityConfig = PRIORITY_CONFIG[lead.priority];

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      await onUpdateNotes(lead.id, notes);
      setIsEditingNotes(false);
    } finally {
      setSavingNotes(false);
    }
  };

  const handleAddActivity = async () => {
    if (!activityTitle.trim()) return;
    setAddingActivity(true);
    try {
      await onAddActivity(lead.id, activityType, activityTitle, activityDescription);
      setShowAddActivity(false);
      setActivityTitle("");
      setActivityDescription("");
    } finally {
      setAddingActivity(false);
    }
  };

  const handleScheduleFollowUp = async () => {
    if (!followUpDate) return;
    setSchedulingFollowUp(true);
    try {
      await onScheduleFollowUp(lead.id, followUpDate, followUpNotes);
      setShowFollowUpModal(false);
      setFollowUpDate("");
      setFollowUpNotes("");
    } finally {
      setSchedulingFollowUp(false);
    }
  };

  const handleSendQuotation = async () => {
    setSendingQuotation(true);
    try {
      await onSendQuotation({ items: quotationItems, notes: quotationNotes });
      setShowQuotationModal(false);
      setQuotationItems([{ name: lead.item_name || "", quantity: 1, unit_price: 0 }]);
      setQuotationNotes("");
    } finally {
      setSendingQuotation(false);
    }
  };

  const handleWhatsApp = () => {
    if (lead.buyer_phone) {
      const phone = lead.buyer_phone.replace(/\D/g, "");
      window.open(`https://wa.me/${phone}`, "_blank");
    }
  };

  const handleEmail = () => {
    if (lead.buyer_email) {
      window.open(`mailto:${lead.buyer_email}`, "_blank");
    }
  };

  const handleCall = () => {
    if (lead.buyer_phone) {
      window.open(`tel:${lead.buyer_phone}`, "_blank");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background">
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="border-b bg-card px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold">
                  {lead.is_unlocked ? lead.buyer_name : "XXXXX"}
                </h1>
                <p className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5" />
                  {lead.is_unlocked ? lead.buyer_company : "XXXXX"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={`${statusConfig.bg} ${statusConfig.color} border-0`}>
                {statusConfig.label}
              </Badge>
              <Badge variant="outline" className={priorityConfig.color}>
                {priorityConfig.label}
              </Badge>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <div className="mx-auto max-w-5xl p-6">
            <div className="grid gap-6 md:grid-cols-3">
              {/* Left column - Lead info & actions */}
              <div className="space-y-6 md:col-span-2">
                {/* Contact info */}
                <Card className="p-4">
                  <h2 className="mb-3 text-sm font-medium">Contact Information</h2>
                  {lead.is_unlocked ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <button className="text-primary hover:underline" onClick={handleCall}>
                          {lead.buyer_phone}
                        </button>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <button className="text-primary hover:underline" onClick={handleEmail}>
                          {lead.buyer_email}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Contact information is locked. Unlock this lead to view details.
                    </p>
                  )}

                  {lead.is_unlocked && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button size="sm" variant="default" onClick={() => {}}>
                        <MessageSquare className="mr-1.5 h-4 w-4" />
                        Start Chat
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                        onClick={handleWhatsApp}
                      >
                        <MessageCircle className="mr-1.5 h-4 w-4" />
                        WhatsApp
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleEmail}>
                        <Mail className="mr-1.5 h-4 w-4" />
                        Email
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleCall}>
                        <Phone className="mr-1.5 h-4 w-4" />
                        Call
                      </Button>
                    </div>
                  )}
                </Card>

                {/* Product interest */}
                <Card className="p-4">
                  <h2 className="mb-3 text-sm font-medium">Product Interest</h2>
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{lead.item_name || "Unknown product"}</span>
                    <Badge variant="outline" className="capitalize">
                      {lead.item_type}
                    </Badge>
                  </div>
                  {lead.expected_value && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Expected value: ₹{lead.expected_value.toLocaleString()}
                    </p>
                  )}
                </Card>

                {/* Notes */}
                <Card className="p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-sm font-medium">Notes</h2>
                    {isEditingNotes ? (
                      <Button size="sm" variant="ghost" onClick={handleSaveNotes} disabled={savingNotes}>
                        {savingNotes ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => setIsEditingNotes(true)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {isEditingNotes ? (
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add notes about this lead..."
                      rows={4}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {lead.notes || "No notes yet. Click edit to add notes."}
                    </p>
                  )}
                </Card>

                {/* Activities */}
                <Card className="p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-sm font-medium">Activity Timeline</h2>
                    <Button size="sm" variant="outline" onClick={() => setShowAddActivity(true)}>
                      <Plus className="mr-1.5 h-4 w-4" />
                      Add Activity
                    </Button>
                  </div>
                  
                  {showAddActivity && (
                    <div className="mb-4 rounded-md border bg-muted/30 p-3">
                      <div className="mb-3 flex gap-2">
                        <Select value={activityType} onValueChange={(v) => setActivityType(v as any)}>
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="call">Call</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="meeting">Meeting</SelectItem>
                            <SelectItem value="note">Note</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder="Activity title"
                          value={activityTitle}
                          onChange={(e) => setActivityTitle(e.target.value)}
                          className="flex-1"
                        />
                      </div>
                      <Textarea
                        placeholder="Description (optional)"
                        value={activityDescription}
                        onChange={(e) => setActivityDescription(e.target.value)}
                        rows={2}
                        className="mb-3"
                      />
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={() => setShowAddActivity(false)}>
                          Cancel
                        </Button>
                        <Button size="sm" onClick={handleAddActivity} disabled={addingActivity || !activityTitle.trim()}>
                          {addingActivity && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                          Add
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    {activities.length === 0 ? (
                      <p className="py-4 text-center text-sm text-muted-foreground">
                        No activities yet. Add your first activity above.
                      </p>
                    ) : (
                      activities.map((activity) => (
                        <div key={activity.id} className="flex gap-3">
                          <div className="mt-0.5 rounded-full bg-muted p-1.5">
                            {ACTIVITY_ICONS[activity.activity_type] || <FileText className="h-4 w-4" />}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{activity.title}</p>
                            {activity.description && (
                              <p className="text-xs text-muted-foreground">{activity.description}</p>
                            )}
                            <p className="mt-1 text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              </div>

              {/* Right column - Quick actions */}
              <div className="space-y-4">
                {/* Status change */}
                <Card className="p-4">
                  <h2 className="mb-3 text-sm font-medium">Update Status</h2>
                  <Select
                    value={lead.status}
                    onValueChange={(v) => onStatusChange(lead.id, v as Lead["status"])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                        <SelectItem key={value} value={value}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Card>

                {/* Quick actions */}
                <Card className="p-4">
                  <h2 className="mb-3 text-sm font-medium">Quick Actions</h2>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => setShowFollowUpModal(true)}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      Schedule Follow-up
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => setShowQuotationModal(true)}
                    >
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Send Quotation
                    </Button>
                  </div>
                </Card>

                {/* Lead info */}
                <Card className="p-4">
                  <h2 className="mb-3 text-sm font-medium">Lead Details</h2>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created</span>
                      <span>{format(new Date(lead.created_at), "MMM d, yyyy")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Source</span>
                      <span className="capitalize">{lead.source || "Direct"}</span>
                    </div>
                    {lead.next_follow_up && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Next follow-up</span>
                        <span>{format(new Date(lead.next_follow_up), "MMM d, yyyy")}</span>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Follow-up Modal */}
      <Dialog open={showFollowUpModal} onOpenChange={setShowFollowUpModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Follow-up</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Follow-up Date</label>
              <Input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Notes</label>
              <Textarea
                value={followUpNotes}
                onChange={(e) => setFollowUpNotes(e.target.value)}
                placeholder="What to follow up on..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowFollowUpModal(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleScheduleFollowUp} disabled={schedulingFollowUp || !followUpDate}>
              {schedulingFollowUp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quotation Modal */}
      <Dialog open={showQuotationModal} onOpenChange={setShowQuotationModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Send Quotation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-3">
              {quotationItems.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2">
                  <Input
                    placeholder="Item name"
                    value={item.name}
                    onChange={(e) => {
                      const newItems = [...quotationItems];
                      newItems[index].name = e.target.value;
                      setQuotationItems(newItems);
                    }}
                    className="col-span-6"
                  />
                  <Input
                    type="number"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => {
                      const newItems = [...quotationItems];
                      newItems[index].quantity = parseInt(e.target.value) || 1;
                      setQuotationItems(newItems);
                    }}
                    className="col-span-2"
                  />
                  <Input
                    type="number"
                    placeholder="Price"
                    value={item.unit_price || ""}
                    onChange={(e) => {
                      const newItems = [...quotationItems];
                      newItems[index].unit_price = parseFloat(e.target.value) || 0;
                      setQuotationItems(newItems);
                    }}
                    className="col-span-4"
                  />
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setQuotationItems([...quotationItems, { name: "", quantity: 1, unit_price: 0 }])
                }
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Add Item
              </Button>
            </div>

            <Separator />

            <div className="space-y-1 text-sm">
              {(() => {
                const subtotal = quotationItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
                const gst = subtotal * 0.18;
                const total = subtotal + gst;
                return (
                  <>
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>₹{subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>GST (18%)</span>
                      <span>₹{gst.toLocaleString()}</span>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between font-medium">
                      <span>Total</span>
                      <span>₹{total.toLocaleString()}</span>
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Notes</label>
              <Textarea
                value={quotationNotes}
                onChange={(e) => setQuotationNotes(e.target.value)}
                placeholder="Additional terms or notes..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowQuotationModal(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSendQuotation} disabled={sendingQuotation}>
              {sendingQuotation ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Send Quotation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeadDetailView;
