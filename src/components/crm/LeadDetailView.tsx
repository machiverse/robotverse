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
  Globe,
  Target,
  Tag,
  DollarSign,
  Activity,
  CheckCircle,
  Star,
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
    { 
      name: lead.item_name || "", 
      quantity: 1, 
      unit_price: lead.product_price || 0 
    },
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
    if (lead.buyer_phone) {
      const phone = lead.buyer_phone.replace(/\D/g, "");
      const message = encodeURIComponent(
        `Hello ${lead.buyer_name || "there"},\n\nI'm reaching out regarding your interest in ${lead.item_name || "our product"}.\n\nHow can I help you today?`
      );
      window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
    }
  };

  const handleEmail = () => {
    if (lead.buyer_email) {
      const subject = encodeURIComponent(`Regarding your inquiry – ${lead.item_name || "Product"}`);
      const body = encodeURIComponent(
        `Dear ${lead.buyer_name || "Customer"},\n\nThank you for your interest in ${lead.item_name || "our product"}.\n\nPlease let me know how I can assist you further.\n\nBest regards,\n`
      );
      window.open(`mailto:${lead.buyer_email}?subject=${subject}&body=${body}`, "_blank");
    }
  };

  const handleCall = () => {
    if (lead.buyer_phone) {
      window.open(`tel:${lead.buyer_phone}`, "_blank");
    }
  };

  const formatSource = (source?: string) => {
    if (!source) return "Direct";
    switch (source) {
      case "product_view": return "Product View";
      case "inquiry": return "Inquiry";
      case "campaign": return "Campaign";
      case "chat": return "Chat";
      case "button_click": return "Product Inquiry";
      default: return source.charAt(0).toUpperCase() + source.slice(1).replace(/_/g, " ");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background">
      <div className="flex h-full flex-col">
        {/* Sticky Header with Actions */}
        <div className="sticky top-0 z-10 border-b bg-card shadow-sm">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              {/* Left: Close + Lead Info */}
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
                  <X className="h-5 w-5" />
                </Button>
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h1 className="text-lg font-semibold truncate">
                        {lead.is_unlocked ? lead.buyer_name || "Unknown" : "XXXXX"}
                      </h1>
                      <p className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Building2 className="h-3.5 w-3.5" />
                        {lead.is_unlocked ? lead.buyer_company || "Not provided" : "XXXXX"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Center: Status Badges */}
              <div className="hidden md:flex items-center gap-2">
                <Badge className={`${statusConfig.bg} ${statusConfig.color} border-0`}>
                  {statusConfig.label}
                </Badge>
                <Badge variant="outline" className={priorityConfig.color}>
                  <Star className="mr-1 h-3 w-3" />
                  {priorityConfig.label}
                </Badge>
              </div>

              {/* Right: Sticky Action Buttons */}
              {lead.is_unlocked && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCall}
                    disabled={!lead.buyer_phone}
                    className="hidden sm:flex"
                  >
                    <Phone className="mr-1.5 h-4 w-4" />
                    Call
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="hidden sm:flex border-green-200 bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:border-green-800"
                    onClick={handleWhatsApp}
                    disabled={!lead.buyer_phone}
                  >
                    <FaWhatsapp className="mr-1.5 h-4 w-4" />
                    WhatsApp
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleEmail}
                    disabled={!lead.buyer_email}
                    className="hidden sm:flex"
                  >
                    <Mail className="mr-1.5 h-4 w-4" />
                    Email
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => setShowQuotationModal(true)}
                  >
                    <FileSpreadsheet className="mr-1.5 h-4 w-4" />
                    Create Quotation
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="mx-auto max-w-6xl p-6">
            <div className="grid gap-6 lg:grid-cols-5">
              {/* Left Column - Lead Info (2/5 width) */}
              <div className="space-y-4 lg:col-span-2">
                {/* Contact Information */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                      <User className="h-4 w-4 text-primary" />
                      Contact Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-3 rounded-md bg-muted/50 p-3">
                      <User className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Lead Name</p>
                        <p className="font-medium truncate">
                          {lead.is_unlocked ? lead.buyer_name || "Not provided" : "XXXXX"}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 rounded-md bg-muted/50 p-3">
                      <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Company Name</p>
                        <p className="font-medium truncate">
                          {lead.is_unlocked ? lead.buyer_company || "Not provided" : "XXXXX"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-md bg-muted/50 p-3">
                      <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Mobile Number</p>
                        {lead.is_unlocked && lead.buyer_phone ? (
                          <button 
                            onClick={handleCall}
                            className="font-medium text-primary hover:underline truncate block"
                          >
                            {lead.buyer_phone}
                          </button>
                        ) : (
                          <p className="font-medium">{lead.is_unlocked ? "Not provided" : "XXXXX"}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-md bg-muted/50 p-3">
                      <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Email ID</p>
                        {lead.is_unlocked && lead.buyer_email ? (
                          <button 
                            onClick={handleEmail}
                            className="font-medium text-primary hover:underline truncate block"
                          >
                            {lead.buyer_email}
                          </button>
                        ) : (
                          <p className="font-medium">{lead.is_unlocked ? "Not provided" : "XXXXX"}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-md bg-muted/50 p-3">
                      <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Location</p>
                        <p className="font-medium">
                          {lead.is_unlocked ? lead.buyer_location || "Not provided" : "XXXXX"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Lead Details */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                      <Activity className="h-4 w-4 text-primary" />
                      Lead Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-3 rounded-md bg-muted/50 p-3">
                      <Target className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Source</p>
                        <p className="font-medium">{formatSource(lead.source)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-md bg-muted/50 p-3">
                      <CheckCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Lead Status</p>
                        <Badge className={`mt-1 ${statusConfig.bg} ${statusConfig.color} border-0`}>
                          {statusConfig.label}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-md bg-muted/50 p-3">
                      <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Created On</p>
                        <p className="font-medium">
                          {format(new Date(lead.created_at), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                    </div>

                    {lead.next_follow_up && (
                      <div className="flex items-center gap-3 rounded-md bg-orange-50 dark:bg-orange-900/20 p-3 border border-orange-200 dark:border-orange-800">
                        <Clock className="h-4 w-4 text-orange-600 shrink-0" />
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-orange-600">Next Follow-up</p>
                          <p className="font-medium text-orange-700 dark:text-orange-400">
                            {format(new Date(lead.next_follow_up), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Quick Actions - Mobile */}
                {lead.is_unlocked && (
                  <Card className="sm:hidden">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                        <MessageSquare className="h-4 w-4 text-primary" />
                        Quick Actions
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

              {/* Right Column - Product & Activity (3/5 width) */}
              <div className="space-y-4 lg:col-span-3">
                {/* Interested Product */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                      <Package className="h-4 w-4 text-primary" />
                      Interested Product
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <div className="flex flex-wrap items-start gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                          <Package className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-base truncate">
                            {lead.item_name || "Unknown Product"}
                          </h3>
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
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Price</p>
                            <p className="text-lg font-bold text-green-600">
                              ₹{lead.product_price.toLocaleString()}
                            </p>
                          </div>
                        )}
                      </div>
                      {lead.expected_value && lead.expected_value !== lead.product_price && (
                        <div className="mt-3 flex items-center gap-2 text-sm">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Expected Deal Value:</span>
                          <span className="font-semibold">₹{lead.expected_value.toLocaleString()}</span>
                        </div>
                      )}
                      {lead.viewed_at && (
                        <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          Viewed: {format(new Date(lead.viewed_at), "MMM d, yyyy 'at' h:mm a")}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Status Update */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      Update Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                        <Button
                          key={status}
                          size="sm"
                          variant={lead.status === status ? "default" : "outline"}
                          className={lead.status !== status ? `${config.bg} ${config.color} border-0 hover:opacity-80` : ""}
                          onClick={() => onStatusChange(lead.id, status as Lead["status"])}
                        >
                          {config.label}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Actions Card */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                      <Activity className="h-4 w-4 text-primary" />
                      Quick Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFollowUpModal(true)}
                    >
                      <Calendar className="mr-1.5 h-4 w-4" />
                      Schedule Follow-up
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddActivity(true)}
                    >
                      <Plus className="mr-1.5 h-4 w-4" />
                      Log Activity
                    </Button>
                  </CardContent>
                </Card>

                {/* Notes */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                        <FileText className="h-4 w-4 text-primary" />
                        Internal Notes
                      </CardTitle>
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
                  </CardHeader>
                  <CardContent>
                    {isEditingNotes ? (
                      <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add notes about this lead - objections, requirements, decision makers..."
                        rows={4}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {lead.notes || "No notes yet. Click edit to add notes."}
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Activity Timeline */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                        <Clock className="h-4 w-4 text-primary" />
                        Activity Timeline
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
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
                        <p className="py-6 text-center text-sm text-muted-foreground">
                          No activities yet. Use "Log Activity" to record interactions.
                        </p>
                      ) : (
                        activities.map((activity) => (
                          <div key={activity.id} className="flex gap-3 rounded-md border p-3">
                            <div className="mt-0.5 rounded-full bg-primary/10 p-2">
                              {ACTIVITY_ICONS[activity.activity_type] || <FileText className="h-4 w-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{activity.title}</p>
                              {activity.description && (
                                <p className="text-xs text-muted-foreground mt-1">{activity.description}</p>
                              )}
                              <p className="mt-1.5 text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </ScrollArea>
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
            <DialogTitle>Create Quotation</DialogTitle>
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
