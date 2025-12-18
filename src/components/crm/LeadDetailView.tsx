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
  Target,
  DollarSign,
  Activity,
  CheckCircle,
  Star,
  Lock,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const STATUS_CONFIG: Record<Lead["status"], { label: string; color: string; bg: string; icon: string }> = {
  new: { label: "New", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/50", icon: "●" },
  contacted: { label: "Contacted", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/50", icon: "●" },
  quoted: { label: "Quoted", color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-950/50", icon: "●" },
  negotiating: { label: "Negotiating", color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-950/50", icon: "●" },
  closed_won: { label: "Won", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/50", icon: "✓" },
  closed_lost: { label: "Lost", color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/50", icon: "✕" },
};

const PRIORITY_CONFIG: Record<Lead["priority"], { label: string; color: string; bg: string }> = {
  low: { label: "Low", color: "text-slate-600 dark:text-slate-400", bg: "bg-slate-100 dark:bg-slate-800" },
  medium: { label: "Medium", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/40" },
  high: { label: "High", color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-100 dark:bg-orange-900/40" },
  urgent: { label: "Urgent", color: "text-red-600 dark:text-red-400", bg: "bg-red-100 dark:bg-red-900/40" },
};

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  call: <Phone className="h-3.5 w-3.5" />,
  email: <Mail className="h-3.5 w-3.5" />,
  meeting: <Calendar className="h-3.5 w-3.5" />,
  note: <FileText className="h-3.5 w-3.5" />,
  follow_up: <Clock className="h-3.5 w-3.5" />,
  invoice_sent: <FileSpreadsheet className="h-3.5 w-3.5" />,
  status_change: <ChevronDown className="h-3.5 w-3.5" />,
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
    { name: lead.item_name || "", quantity: 1, unit_price: lead.product_price || 0 },
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
      setQuotationItems([{ name: lead.item_name || "", quantity: 1, unit_price: lead.product_price || 0 }]);
      setQuotationNotes("");
    } finally {
      setSendingQuotation(false);
    }
  };

  const handleWhatsApp = () => {
    if (!lead.buyer_phone) return;
    const phone = lead.buyer_phone.replace(/\D/g, "");
    const message = encodeURIComponent(
      `Hello ${lead.buyer_name || "there"},\n\nI'm reaching out regarding your interest in ${
        lead.item_name || "our product"
      }.\n\nHow can I help you today?`,
    );
    window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
  };

  const handleEmail = () => {
    if (!lead.buyer_email) return;
    const subject = encodeURIComponent(`Regarding your inquiry – ${lead.item_name || "Product"}`);
    const body = encodeURIComponent(
      `Dear ${lead.buyer_name || "Customer"},\n\nThank you for your interest in ${
        lead.item_name || "our product"
      }.\n\nPlease let me know how I can assist you further.\n\nBest regards,\n`,
    );
    window.open(`mailto:${lead.buyer_email}?subject=${subject}&body=${body}`, "_blank");
  };

  const handleCall = () => {
    if (!lead.buyer_phone) return;
    window.open(`tel:${lead.buyer_phone}`, "_blank");
  };

  const formatSource = (source?: string) => {
    if (!source) return "Direct";
    switch (source) {
      case "product_view":
        return "Product View";
      case "inquiry":
        return "Inquiry";
      case "campaign":
        return "Campaign";
      case "chat":
        return "Chat";
      case "button_click":
        return "Product Inquiry";
      default:
        return source.charAt(0).toUpperCase() + source.slice(1).replace(/_/g, " ");
    }
  };

  const subtotal = quotationItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const gst = subtotal * 0.18;
  const total = subtotal + gst;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md">
      <div className="flex h-full flex-col">
        {/* Top bar - Sticky header */}
        <div className="sticky top-0 z-10 border-b bg-card shadow-sm">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0 hover:bg-muted">
                <X className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/10 ring-2 ring-primary/20">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className="truncate text-lg font-semibold tracking-tight">
                      {lead.is_unlocked ? lead.buyer_name || "Unknown" : "XXXXX"}
                    </h1>
                    <Badge className={`${statusConfig.bg} ${statusConfig.color} border-0 font-medium`}>
                      <span className="mr-1">{statusConfig.icon}</span>
                      {statusConfig.label}
                    </Badge>
                  </div>
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Building2 className="h-3.5 w-3.5" />
                    {lead.is_unlocked ? lead.buyer_company || "No company" : "XXXXX"}
                  </p>
                </div>
              </div>
            </div>

            {/* Action buttons - always visible */}
            <div className="hidden items-center gap-2 md:flex">
              <Badge variant="outline" className={`${priorityConfig.bg} ${priorityConfig.color} border-0`}>
                <Star className="mr-1 h-3 w-3" />
                {priorityConfig.label}
              </Badge>
              <div className="mx-2 h-6 w-px bg-border" />
              {lead.is_unlocked ? (
                <>
                  <Button size="sm" variant="outline" onClick={handleCall} disabled={!lead.buyer_phone} className="gap-1.5">
                    <Phone className="h-4 w-4" />
                    Call
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleWhatsApp}
                    disabled={!lead.buyer_phone}
                    className="gap-1.5 border-green-200 bg-green-50 text-green-700 hover:bg-green-100 dark:border-green-800 dark:bg-green-950/50 dark:text-green-400"
                  >
                    <FaWhatsapp className="h-4 w-4" />
                    WhatsApp
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleEmail} disabled={!lead.buyer_email} className="gap-1.5">
                    <Mail className="h-4 w-4" />
                    Email
                  </Button>
                  <Button size="sm" variant="default" onClick={() => setShowQuotationModal(true)} className="gap-1.5 shadow-sm">
                    <FileSpreadsheet className="h-4 w-4" />
                    Create Quotation
                  </Button>
                </>
              ) : (
                <Badge variant="secondary" className="gap-1.5 py-1.5">
                  <Lock className="h-3.5 w-3.5" />
                  Unlock to contact
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Main 3‑column layout */}
        <ScrollArea className="flex-1">
          <div className="mx-auto grid h-full max-w-6xl gap-4 p-4 md:grid-cols-[260px_minmax(0,1.4fr)_300px]">
            {/* LEFT: key info */}
            <div className="space-y-3">
              {/* Contact */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <User className="h-4 w-4 text-primary" />
                    Contact
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Name
                    </p>
                    <p className="font-medium">
                      {lead.is_unlocked ? lead.buyer_name || "Not provided" : "XXXXX"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Company
                    </p>
                    <p className="font-medium">
                      {lead.is_unlocked ? lead.buyer_company || "Not provided" : "XXXXX"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Phone
                    </p>
                    {lead.is_unlocked && lead.buyer_phone ? (
                      <button
                        onClick={handleCall}
                        className="truncate text-primary hover:underline"
                      >
                        {lead.buyer_phone}
                      </button>
                    ) : (
                      <p>{lead.is_unlocked ? "Not provided" : "XXXXX"}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Email
                    </p>
                    {lead.is_unlocked && lead.buyer_email ? (
                      <button
                        onClick={handleEmail}
                        className="truncate text-primary hover:underline"
                      >
                        {lead.buyer_email}
                      </button>
                    ) : (
                      <p>{lead.is_unlocked ? "Not provided" : "XXXXX"}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Location
                    </p>
                    <p>{lead.is_unlocked ? lead.buyer_location || "Not provided" : "XXXXX"}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Lead meta */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <Activity className="h-4 w-4 text-primary" />
                    Lead info
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Source
                    </p>
                    <p>{formatSource(lead.source)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Status
                    </p>
                    <Badge className={`${statusConfig.bg} ${statusConfig.color} border-0`}>
                      {statusConfig.label}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Priority
                    </p>
                    <Badge variant="outline" className={priorityConfig.color}>
                      <Star className="mr-1 h-3 w-3" />
                      {priorityConfig.label}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Created
                    </p>
                    <p>{format(new Date(lead.created_at), "MMM d, yyyy 'at' h:mm a")}</p>
                  </div>
                  {lead.next_follow_up && (
                    <div className="rounded-md bg-orange-50 p-2 text-xs text-orange-700 dark:bg-orange-900/20 dark:text-orange-300">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5" />
                        <span className="font-medium">
                          Next follow‑up: {format(new Date(lead.next_follow_up), "MMM d, yyyy")}
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Mobile quick actions */}
              {lead.is_unlocked && (
                <Card className="md:hidden">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      Quick actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={handleCall} disabled={!lead.buyer_phone}>
                      <Phone className="mr-1.5 h-4 w-4" />
                      Call
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-green-200 bg-green-50 text-green-700"
                      onClick={handleWhatsApp}
                      disabled={!lead.buyer_phone}
                    >
                      <FaWhatsapp className="mr-1.5 h-4 w-4" />
                      WhatsApp
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleEmail} disabled={!lead.buyer_email}>
                      <Mail className="mr-1.5 h-4 w-4" />
                      Email
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* CENTER: activity + notes */}
            <div className="space-y-3">
              {/* Status + quick actions */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between gap-2 text-sm font-semibold">
                    <span className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      Pipeline status
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                      <Button
                        key={status}
                        size="sm"
                        variant={lead.status === status ? "default" : "outline"}
                        className={
                          lead.status === status
                            ? ""
                            : `${config.bg} ${config.color} border-0 hover:opacity-80`
                        }
                        onClick={() => onStatusChange(lead.id, status as Lead["status"])}
                      >
                        {config.label}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Notes */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                      <FileText className="h-4 w-4 text-primary" />
                      Internal notes
                    </CardTitle>
                    {isEditingNotes ? (
                      <Button size="icon" variant="ghost" onClick={handleSaveNotes} disabled={savingNotes}>
                        {savingNotes ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      </Button>
                    ) : (
                      <Button size="icon" variant="ghost" onClick={() => setIsEditingNotes(true)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {isEditingNotes ? (
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add notes about this lead – objections, requirements, decision makers…"
                      rows={4}
                    />
                  ) : (
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {lead.notes || "No notes yet. Click edit to add notes."}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Activity timeline */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                      <Clock className="h-4 w-4 text-primary" />
                      Activity timeline
                    </CardTitle>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowAddActivity(true)}
                    >
                      <Plus className="mr-1.5 h-4 w-4" />
                      Log activity
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {showAddActivity && (
                    <div className="mb-4 rounded-md border bg-muted/40 p-3">
                      <div className="mb-3 flex gap-2">
                        <Select
                          value={activityType}
                          onValueChange={(v) => setActivityType(v as any)}
                        >
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
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowAddActivity(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleAddActivity}
                          disabled={addingActivity || !activityTitle.trim()}
                        >
                          {addingActivity && (
                            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                          )}
                          Add
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    {activities.length === 0 ? (
                      <p className="py-6 text-center text-sm text-muted-foreground">
                        No activities yet. Log calls, emails, and meetings here.
                      </p>
                    ) : (
                      activities.map((activity) => (
                        <div
                          key={activity.id}
                          className="flex gap-3 rounded-md border bg-card/60 p-3"
                        >
                          <div className="mt-0.5 rounded-full bg-primary/10 p-2">
                            {ACTIVITY_ICONS[activity.activity_type] || (
                              <FileText className="h-4 w-4" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium">{activity.title}</p>
                            {activity.description && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                {activity.description}
                              </p>
                            )}
                            <p className="mt-1.5 text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(activity.created_at), {
                                addSuffix: true,
                              })}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* RIGHT: product + deal & follow‑up */}
            <div className="space-y-3">
              {/* Product */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <Package className="h-4 w-4 text-primary" />
                    Interested product
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Package className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">
                          {lead.item_name || "Unknown product"}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="capitalize">
                            {lead.item_type}
                          </Badge>
                          {lead.product_brand && (
                            <Badge variant="secondary">{lead.product_brand}</Badge>
                          )}
                          {lead.product_model && (
                            <Badge variant="outline" className="text-muted-foreground">
                              {lead.product_model}
                            </Badge>
                          )}
                        </div>
                      </div>
                      {lead.product_price && (
                        <div className="text-right">
                          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                            Price
                          </p>
                          <p className="text-base font-bold text-green-600">
                            ₹{lead.product_price.toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>
                    {lead.expected_value && lead.expected_value !== lead.product_price && (
                      <div className="mt-3 flex items-center gap-2 text-sm">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Expected deal value:</span>
                        <span className="font-semibold">
                          ₹{lead.expected_value.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {lead.viewed_at && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        Viewed {format(new Date(lead.viewed_at), "MMM d, yyyy 'at' h:mm a")}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Quick actions */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <Activity className="h-4 w-4 text-primary" />
                    Follow‑up & actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFollowUpModal(true)}
                  >
                    <Calendar className="mr-1.5 h-4 w-4" />
                    Schedule follow‑up
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddActivity(true)}
                  >
                    <Plus className="mr-1.5 h-4 w-4" />
                    Log manual activity
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowQuotationModal(true)}
                  >
                    <FileSpreadsheet className="mr-1.5 h-4 w-4" />
                    Create quotation
                  </Button>
                </CardContent>
              </Card>

              {/* Quotation summary (same data as modal for quick view) */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <DollarSign className="h-4 w-4 text-primary" />
                    Draft quotation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>₹{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST (18%)</span>
                    <span>₹{gst.toLocaleString()}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>₹{total.toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Follow‑up modal */}
      <Dialog open={showFollowUpModal} onOpenChange={setShowFollowUpModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule follow‑up</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Follow‑up date
              </label>
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
                placeholder="What should be discussed in this follow‑up?"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowFollowUpModal(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleScheduleFollowUp}
              disabled={schedulingFollowUp || !followUpDate}
            >
              {schedulingFollowUp && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quotation modal */}
      <Dialog open={showQuotationModal} onOpenChange={setShowQuotationModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create quotation</DialogTitle>
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
                  setQuotationItems([
                    ...quotationItems,
                    { name: "", quantity: 1, unit_price: 0 },
                  ])
                }
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Add item
              </Button>
            </div>

            <Separator />

            <div className="space-y-1 text-sm">
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
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Notes</label>
              <Textarea
                value={quotationNotes}
                onChange={(e) => setQuotationNotes(e.target.value)}
                placeholder="Additional terms or notes…"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowQuotationModal(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSendQuotation} disabled={sendingQuotation}>
              {sendingQuotation ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Send quotation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeadDetailView;
