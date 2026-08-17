import { useState, useEffect } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  ArrowLeft,
  Phone,
  Mail,
  Building2,
  Calendar,
  FileText,
  Loader2,
  User,
  Package,
  MapPin,
  Clock,
  FileSpreadsheet,
  Plus,
  Edit2,
  Save,
  DollarSign,
  Activity,
  Star,
  Lock,
  TrendingUp,
  Target,
  Briefcase,
  Hash,
  ExternalLink,
  MoreHorizontal,
  History,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { type Lead, type LeadActivity } from "@/hooks/useSellerCRM";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import LeadQuotationHistory from "./LeadQuotationHistory";
import LeadTimeline from "./LeadTimeline";
import CreateQuotationModal from "./CreateQuotationModal";

interface LeadDetailViewProps {
  lead: Lead;
  activities: LeadActivity[];
  isCommissionSeller?: boolean;
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

const STATUS_CONFIG: Record<Lead["status"], { label: string; color: string; bg: string; dot: string }> = {
  new: { label: "New", color: "text-primary dark:text-primary", bg: "bg-primary/10 dark:bg-primary/50", dot: "bg-primary" },
  contacted: { label: "Contacted", color: "text-amber-700 dark:text-amber-300", bg: "bg-amber-100 dark:bg-amber-900/50", dot: "bg-amber-500" },
  quoted: { label: "Quoted", color: "text-primary dark:text-primary", bg: "bg-primary/10 dark:bg-primary/50", dot: "bg-primary" },
  negotiating: { label: "Negotiating", color: "text-orange-700 dark:text-orange-300", bg: "bg-orange-100 dark:bg-orange-900/50", dot: "bg-orange-500" },
  closed_won: { label: "Won", color: "text-success dark:text-success", bg: "bg-success/10 dark:bg-success/50", dot: "bg-success" },
  closed_lost: { label: "Lost", color: "text-red-700 dark:text-red-300", bg: "bg-red-100 dark:bg-red-900/50", dot: "bg-red-500" },
};

const PRIORITY_CONFIG: Record<Lead["priority"], { label: string; color: string; bg: string }> = {
  low: { label: "Low", color: "text-muted-foreground dark:text-muted-foreground", bg: "bg-muted dark:bg-foreground" },
  medium: { label: "Medium", color: "text-primary dark:text-primary", bg: "bg-primary/10 dark:bg-primary/30" },
  high: { label: "High", color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-900/30" },
  urgent: { label: "Urgent", color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/30" },
};

const STATUS_OPTIONS = Object.entries(STATUS_CONFIG).map(([value, cfg]) => ({
  value: value as Lead["status"],
  label: cfg.label,
  color: cfg.color,
  bg: cfg.bg,
  dot: cfg.dot,
}));

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  call: <Phone className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  meeting: <Calendar className="h-4 w-4" />,
  note: <FileText className="h-4 w-4" />,
  follow_up: <Clock className="h-4 w-4" />,
  invoice_sent: <FileSpreadsheet className="h-4 w-4" />,
  status_change: <TrendingUp className="h-4 w-4" />,
};

const ACTIVITY_COLORS: Record<string, string> = {
  call: "bg-success/10 text-success dark:bg-success/30 dark:text-success",
  email: "bg-primary/10 text-primary dark:bg-primary/30 dark:text-primary",
  meeting: "bg-primary/10 text-primary dark:bg-primary/30 dark:text-primary",
  note: "bg-muted text-muted-foreground dark:bg-foreground dark:text-muted-foreground",
  follow_up: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
  invoice_sent: "bg-success/10 text-success dark:bg-success/30 dark:text-success",
  status_change: "bg-primary/10 text-primary dark:bg-primary/30 dark:text-primary",
};

const LeadDetailView = ({
  lead,
  activities,
  isCommissionSeller,
  onClose,
  onStatusChange,
  onAddActivity,
  onUpdateNotes,
  onScheduleFollowUp,
  onSendQuotation,
}: LeadDetailViewProps) => {
  const { user } = useAuth();
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notes, setNotes] = useState(lead.notes || "");
  const [savingNotes, setSavingNotes] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

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
  
  // Professional quotation modal state
  const [showProfessionalQuotationModal, setShowProfessionalQuotationModal] = useState(false);
  const [quotationCount, setQuotationCount] = useState(0);
  
  // Fetch quotation count for this lead
  useEffect(() => {
    const fetchQuotationCount = async () => {
      if (!user || !lead.id) return;
      const { count } = await supabase
        .from("crm_quotations")
        .select("*", { count: "exact", head: true })
        .eq("lead_id", lead.id)
        .eq("seller_id", user.id);
      setQuotationCount(count || 0);
    };
    fetchQuotationCount();
  }, [lead.id, user]);

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

  const PLATFORM_PHONE = "918610925352";
  const PLATFORM_PHONE_DISPLAY = "+91 861 092 5352";

  const handleWhatsApp = () => {
    if (isCommissionSeller) {
      const message = encodeURIComponent(
        `Hi Robotverse, I'm a commission seller and want to connect regarding the lead for ${lead.item_name}. Buyer: ${lead.buyer_name || "Unknown"}.`
      );
      window.open(`https://wa.me/${PLATFORM_PHONE}?text=${message}`, "_blank");
      return;
    }
    if (!lead.buyer_phone) return;
    const phone = lead.buyer_phone.replace(/\D/g, "");
    const message = encodeURIComponent(
      `Hello ${lead.buyer_name || "there"},\n\nI'm reaching out regarding your interest in ${lead.item_name || "our product"}.\n\nHow can I help you today?`
    );
    window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
  };

  const handleEmail = () => {
    if (isCommissionSeller) return; // Commission sellers use platform only
    if (!lead.buyer_email) return;
    const subject = encodeURIComponent(`Regarding your inquiry – ${lead.item_name || "Product"}`);
    const body = encodeURIComponent(
      `Dear ${lead.buyer_name || "Customer"},\n\nThank you for your interest in ${lead.item_name || "our product"}.\n\nPlease let me know how I can assist you further.\n\nBest regards,\n`
    );
    window.open(`mailto:${lead.buyer_email}?subject=${subject}&body=${body}`, "_blank");
  };

  const handleCall = () => {
    if (isCommissionSeller) {
      window.open(`tel:+${PLATFORM_PHONE}`, "_blank");
      return;
    }
    if (!lead.buyer_phone) return;
    window.open(`tel:${lead.buyer_phone}`, "_blank");
  };

  const formatSource = (source?: string) => {
    if (!source) return "Direct";
    const sources: Record<string, string> = {
      product_view: "Product View",
      inquiry: "Inquiry",
      campaign: "Campaign",
      chat: "Chat",
      button_click: "Product Inquiry",
    };
    return sources[source] || source.charAt(0).toUpperCase() + source.slice(1).replace(/_/g, " ");
  };

  const getInitials = (name: string | null) => {
    if (!name) return "??";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const subtotal = quotationItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const gst = subtotal * 0.18;
  const total = subtotal + gst;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <header className="shrink-0 border-b bg-card">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Left Section */}
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onClose}
                className="shrink-0 rounded-full"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12 border-2 border-primary/20">
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-sm font-semibold text-primary">
                    {lead.is_unlocked ? getInitials(lead.buyer_name) : "?"}
                  </AvatarFallback>
                </Avatar>
                
                <div>
                  <div className="flex items-center gap-2.5">
                    <h1 className="text-xl font-semibold tracking-tight">
                      {lead.is_unlocked ? lead.buyer_name || "Unknown Contact" : "Locked Lead"}
                    </h1>
                    {!lead.is_unlocked && (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-sm text-muted-foreground">
                    <Building2 className="h-3.5 w-3.5" />
                    <span>{lead.is_unlocked ? lead.buyer_company || "No Company" : "••••••"}</span>
                    <span className="text-border">•</span>
                    <span>{formatSource(lead.source)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Section - Status & Actions */}
            <div className="flex items-center gap-3 sm:ml-auto">
              {/* Status Badge */}
              <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 ${statusConfig.bg}`}>
                <span className={`h-2 w-2 rounded-full ${statusConfig.dot}`} />
                <span className={`text-sm font-medium ${statusConfig.color}`}>{statusConfig.label}</span>
              </div>

              {/* Priority Badge */}
              <Badge variant="outline" className={`${priorityConfig.bg} ${priorityConfig.color} border-0`}>
                <Star className="mr-1 h-3 w-3" />
                {priorityConfig.label}
              </Badge>

              {/* Action Buttons */}
              {isCommissionSeller ? (
                <div className="hidden items-center gap-2 lg:flex">
                  <Button size="sm" variant="outline" onClick={handleCall}>
                    <Phone className="mr-1.5 h-4 w-4" />
                    Call Platform
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleWhatsApp}
                    className="border-success/30 bg-success/10 text-success hover:bg-success/10 dark:border-success/30 dark:bg-success/50 dark:text-success"
                  >
                    <FaWhatsapp className="mr-1.5 h-4 w-4" />
                    WhatsApp Platform
                  </Button>
                </div>
              ) : lead.is_unlocked ? (
                <div className="hidden items-center gap-2 lg:flex">
                  <Button size="sm" variant="outline" onClick={handleCall} disabled={!lead.buyer_phone}>
                    <Phone className="mr-1.5 h-4 w-4" />
                    Call
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleWhatsApp}
                    disabled={!lead.buyer_phone}
                    className="border-success/30 bg-success/10 text-success hover:bg-success/10 dark:border-success/30 dark:bg-success/50 dark:text-success"
                  >
                    <FaWhatsapp className="mr-1.5 h-4 w-4" />
                    WhatsApp
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleEmail} disabled={!lead.buyer_email}>
                    <Mail className="mr-1.5 h-4 w-4" />
                    Email
                  </Button>
                </div>
              ) : null}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="shrink-0">
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setShowFollowUpModal(true)}>
                    <Calendar className="mr-2 h-4 w-4" />
                    Schedule Follow-up
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowProfessionalQuotationModal(true)}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Create Quotation
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowAddActivity(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Log Activity
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <div className="grid gap-6 lg:grid-cols-3">
              
              {/* Left Column - Main Content */}
              <div className="space-y-6 lg:col-span-2">
                
                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="w-full justify-start border-b bg-transparent p-0 flex-wrap">
                    <TabsTrigger 
                      value="overview" 
                      className="rounded-none border-b-2 border-transparent px-4 pb-3 pt-2 data-[state=active]:border-primary data-[state=active]:bg-transparent"
                    >
                      Overview
                    </TabsTrigger>
                    <TabsTrigger 
                      value="timeline" 
                      className="rounded-none border-b-2 border-transparent px-4 pb-3 pt-2 data-[state=active]:border-primary data-[state=active]:bg-transparent"
                    >
                      <History className="h-4 w-4 mr-1.5" />
                      Timeline
                    </TabsTrigger>
                    <TabsTrigger 
                      value="quotations" 
                      className="rounded-none border-b-2 border-transparent px-4 pb-3 pt-2 data-[state=active]:border-primary data-[state=active]:bg-transparent"
                    >
                      <FileSpreadsheet className="h-4 w-4 mr-1.5" />
                      Quotations {quotationCount > 0 && `(${quotationCount})`}
                    </TabsTrigger>
                    <TabsTrigger 
                      value="activity" 
                      className="rounded-none border-b-2 border-transparent px-4 pb-3 pt-2 data-[state=active]:border-primary data-[state=active]:bg-transparent"
                    >
                      Activity ({activities.length})
                    </TabsTrigger>
                    <TabsTrigger 
                      value="notes" 
                      className="rounded-none border-b-2 border-transparent px-4 pb-3 pt-2 data-[state=active]:border-primary data-[state=active]:bg-transparent"
                    >
                      Notes
                    </TabsTrigger>
                  </TabsList>

                  {/* Overview Tab */}
                  <TabsContent value="overview" className="mt-6 space-y-6">
                    {/* Product Interest Card */}
                    <div className="rounded-xl border bg-card p-6">
                      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        <Package className="h-4 w-4" />
                        Product Interest
                      </h3>
                      <div className="flex items-start gap-4">
                        {/* Product Image */}
                        <div className="h-20 w-20 shrink-0 rounded-xl overflow-hidden bg-muted">
                          {lead.item_image ? (
                            <img 
                              src={lead.item_image} 
                              alt={lead.item_name || "Product"} 
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                              <Package className="h-8 w-8 text-primary" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-lg font-semibold">{lead.item_name || "Unknown Product"}</h4>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <Badge variant="secondary" className="capitalize">{lead.item_type}</Badge>
                            {lead.product_brand && <Badge variant="outline">{lead.product_brand}</Badge>}
                            {lead.product_model && <Badge variant="outline" className="text-muted-foreground">{lead.product_model}</Badge>}
                          </div>
                          {lead.viewed_at && (
                            <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
                              <Clock className="h-3.5 w-3.5" />
                              Viewed {formatDistanceToNow(new Date(lead.viewed_at), { addSuffix: true })}
                            </p>
                          )}
                        </div>
                        {lead.product_price && (
                          <div className="text-right">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Listed Price</p>
                            <p className="mt-1 text-2xl font-bold text-primary">₹{lead.product_price.toLocaleString()}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Deal Info Grid */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-xl border bg-card p-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 dark:bg-success/30">
                            <DollarSign className="h-5 w-5 text-success" />
                          </div>
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Expected Value</p>
                            <p className="text-xl font-bold">
                              ₹{(lead.expected_value || lead.product_price || 0).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="rounded-xl border bg-card p-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 dark:bg-primary/30">
                            <Target className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Lead Source</p>
                            <p className="text-xl font-bold">{formatSource(lead.source)}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Status Change */}
                    <div className="rounded-xl border bg-card p-6">
                      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        <TrendingUp className="h-4 w-4" />
                        Deal Stage
                      </h3>
                      <Select
                        value={lead.status}
                        onValueChange={(value) => onStatusChange(lead.id, value as Lead["status"])}
                      >
                        <SelectTrigger className="w-full max-w-xs">
                          <SelectValue>
                            <div className="flex items-center gap-2">
                              <span className={`h-2.5 w-2.5 rounded-full ${statusConfig.dot}`} />
                              <span className="font-medium">{statusConfig.label}</span>
                            </div>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="flex items-center gap-2">
                                <span className={`h-2.5 w-2.5 rounded-full ${option.dot}`} />
                                <span>{option.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Follow-up Alert */}
                    {lead.next_follow_up && (
                      <div className="flex items-center gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
                          <Clock className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                          <p className="font-medium text-amber-800 dark:text-amber-200">Follow-up Scheduled</p>
                          <p className="text-sm text-amber-700 dark:text-amber-300">
                            {format(new Date(lead.next_follow_up), "EEEE, MMMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  {/* Timeline Tab */}
                  <TabsContent value="timeline" className="mt-6">
                    <div className="rounded-xl border bg-card p-6">
                      {user && (
                        <LeadTimeline
                          leadId={lead.id}
                          sellerId={user.id}
                          activities={activities}
                          leadCreatedAt={lead.created_at}
                          leadSource={lead.source}
                        />
                      )}
                    </div>
                  </TabsContent>

                  {/* Quotations Tab */}
                  <TabsContent value="quotations" className="mt-6">
                    <div className="rounded-xl border bg-card p-6">
                      {user && (
                        <LeadQuotationHistory
                          leadId={lead.id}
                          sellerId={user.id}
                          onCreateQuotation={() => setShowProfessionalQuotationModal(true)}
                        />
                      )}
                    </div>
                  </TabsContent>

                  {/* Activity Tab */}
                  <TabsContent value="activity" className="mt-6">
                    <div className="rounded-xl border bg-card">
                      <div className="flex items-center justify-between border-b p-4">
                        <h3 className="font-semibold">Activity Timeline</h3>
                        <Button size="sm" onClick={() => setShowAddActivity(true)}>
                          <Plus className="mr-1.5 h-4 w-4" />
                          Log Activity
                        </Button>
                      </div>

                      {showAddActivity && (
                        <div className="border-b bg-muted/30 p-4">
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
                              Add Activity
                            </Button>
                          </div>
                        </div>
                      )}

                      <div className="divide-y">
                        {activities.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                              <Activity className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <p className="mt-4 font-medium">No activities yet</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              Start by logging a call, email, or meeting
                            </p>
                          </div>
                        ) : (
                          activities.map((activity, index) => (
                            <div key={activity.id} className="flex gap-4 p-4">
                              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${ACTIVITY_COLORS[activity.activity_type] || ACTIVITY_COLORS.note}`}>
                                {ACTIVITY_ICONS[activity.activity_type] || <FileText className="h-4 w-4" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <p className="font-medium">{activity.title}</p>
                                    {activity.description && (
                                      <p className="mt-1 text-sm text-muted-foreground">{activity.description}</p>
                                    )}
                                  </div>
                                  <span className="shrink-0 text-xs text-muted-foreground">
                                    {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  {/* Notes Tab */}
                  <TabsContent value="notes" className="mt-6">
                    <div className="rounded-xl border bg-card p-6">
                      <div className="mb-4 flex items-center justify-between">
                        <h3 className="font-semibold">Internal Notes</h3>
                        {isEditingNotes ? (
                          <Button size="sm" onClick={handleSaveNotes} disabled={savingNotes}>
                            {savingNotes ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
                            Save
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => setIsEditingNotes(true)}>
                            <Edit2 className="mr-1.5 h-4 w-4" />
                            Edit
                          </Button>
                        )}
                      </div>
                      {isEditingNotes ? (
                        <Textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Add notes about this lead – objections, requirements, decision makers…"
                          rows={8}
                          className="resize-none"
                        />
                      ) : (
                        <div className="min-h-[200px] rounded-lg bg-muted/30 p-4">
                          {lead.notes ? (
                            <p className="whitespace-pre-wrap text-sm">{lead.notes}</p>
                          ) : (
                            <p className="text-sm italic text-muted-foreground">
                              No notes yet. Click edit to add notes about this lead.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Right Column - Sidebar */}
              <div className="space-y-6">
                
                {/* Contact Card */}
                <div className="rounded-xl border bg-card p-6">
                  <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    <User className="h-4 w-4" />
                    Contact Information
                  </h3>
                  
                  {isCommissionSeller ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {getInitials(lead.buyer_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{lead.buyer_name || "Unknown"}</p>
                          <p className="text-sm text-muted-foreground">{lead.buyer_company || "No Company"}</p>
                        </div>
                      </div>
                      
                      <Separator />

                      {/* Hidden contact notice */}
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
                        <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
                          Contact details are hidden for commission accounts. All communication happens through the Robotverse platform.
                        </p>
                      </div>
                      
                      <div className="space-y-3">
                        <button
                          onClick={handleCall}
                          className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-muted"
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/10 dark:bg-success/30">
                            <Phone className="h-4 w-4 text-success" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{PLATFORM_PHONE_DISPLAY}</p>
                            <p className="text-xs text-muted-foreground">Robotverse Platform</p>
                          </div>
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        </button>
                        
                        <button
                          onClick={handleWhatsApp}
                          className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-muted"
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/10 dark:bg-success/30">
                            <FaWhatsapp className="h-4 w-4 text-success" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{PLATFORM_PHONE_DISPLAY}</p>
                            <p className="text-xs text-muted-foreground">WhatsApp Platform</p>
                          </div>
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </div>

                      {/* Mobile Action Buttons */}
                      <div className="flex flex-col gap-2 pt-2 lg:hidden">
                        <Button size="sm" variant="outline" onClick={handleCall} className="w-full">
                          <Phone className="mr-1.5 h-4 w-4" />
                          Call Platform
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleWhatsApp}
                          className="w-full border-success/30 bg-success/10 text-success"
                        >
                          <FaWhatsapp className="mr-1.5 h-4 w-4" />
                          WhatsApp Platform
                        </Button>
                      </div>
                    </div>
                  ) : lead.is_unlocked ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {getInitials(lead.buyer_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{lead.buyer_name || "Unknown"}</p>
                          <p className="text-sm text-muted-foreground">{lead.buyer_company || "No Company"}</p>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-3">
                        {lead.buyer_phone && (
                          <button
                            onClick={handleCall}
                            className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-muted"
                          >
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/10 dark:bg-success/30">
                              <Phone className="h-4 w-4 text-success" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{lead.buyer_phone}</p>
                              <p className="text-xs text-muted-foreground">Phone</p>
                            </div>
                            <ExternalLink className="h-4 w-4 text-muted-foreground" />
                          </button>
                        )}
                        
                        {lead.buyer_email && (
                          <button
                            onClick={handleEmail}
                            className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-muted"
                          >
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 dark:bg-primary/30">
                              <Mail className="h-4 w-4 text-primary" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{lead.buyer_email}</p>
                              <p className="text-xs text-muted-foreground">Email</p>
                            </div>
                            <ExternalLink className="h-4 w-4 text-muted-foreground" />
                          </button>
                        )}
                        
                        {lead.buyer_location && (
                          <div className="flex items-center gap-3 rounded-lg p-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 dark:bg-primary/30">
                              <MapPin className="h-4 w-4 text-primary" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{lead.buyer_location}</p>
                              <p className="text-xs text-muted-foreground">Location</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Mobile Action Buttons */}
                      <div className="flex flex-col gap-2 pt-2 lg:hidden">
                        <Button size="sm" variant="outline" onClick={handleCall} disabled={!lead.buyer_phone} className="w-full">
                          <Phone className="mr-1.5 h-4 w-4" />
                          Call
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleWhatsApp}
                          disabled={!lead.buyer_phone}
                          className="w-full border-success/30 bg-success/10 text-success"
                        >
                          <FaWhatsapp className="mr-1.5 h-4 w-4" />
                          WhatsApp
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleEmail} disabled={!lead.buyer_email} className="w-full">
                          <Mail className="mr-1.5 h-4 w-4" />
                          Email
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                        <Lock className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p className="mt-4 font-medium">Contact Locked</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Unlock this lead to view contact details
                      </p>
                    </div>
                  )}
                </div>

                {/* Quick Actions Card */}
                <div className="rounded-xl border bg-card p-6">
                  <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    <Activity className="h-4 w-4" />
                    Quick Actions
                  </h3>
                  <div className="space-y-2">
                    <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => setShowFollowUpModal(true)}>
                      <Calendar className="mr-2 h-4 w-4" />
                      Schedule Follow-up
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => setShowAddActivity(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Log Activity
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => setShowQuotationModal(true)}>
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Create Quotation
                    </Button>
                  </div>
                </div>

                {/* Draft Quotation Summary */}
                <div className="rounded-xl border bg-card p-6">
                  <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    Quote Summary
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium">₹{subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">GST (18%)</span>
                      <span className="font-medium">₹{gst.toLocaleString()}</span>
                    </div>
                    <Separator className="my-3" />
                    <div className="flex justify-between">
                      <span className="font-semibold">Total</span>
                      <span className="text-lg font-bold text-primary">₹{total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Meta Info */}
                <div className="rounded-xl border bg-card p-6">
                  <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    <Hash className="h-4 w-4" />
                    Details
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Lead ID</span>
                      <span className="font-mono text-xs">{lead.id.slice(0, 8)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created</span>
                      <span>{format(new Date(lead.created_at), "MMM d, yyyy")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Updated</span>
                      <span>{formatDistanceToNow(new Date(lead.updated_at), { addSuffix: true })}</span>
                    </div>
                    {lead.last_contacted_at && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Last Contact</span>
                        <span>{format(new Date(lead.last_contacted_at), "MMM d, yyyy")}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </main>

      {/* Follow-up Modal */}
      <Dialog open={showFollowUpModal} onOpenChange={setShowFollowUpModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Follow-up</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Follow-up Date</label>
              <Input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                value={followUpNotes}
                onChange={(e) => setFollowUpNotes(e.target.value)}
                placeholder="What should be discussed in this follow-up?"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFollowUpModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleScheduleFollowUp} disabled={schedulingFollowUp || !followUpDate}>
              {schedulingFollowUp && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quotation Modal */}
      <Dialog open={showQuotationModal} onOpenChange={setShowQuotationModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Quotation</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-4 overflow-y-auto py-2">
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="mb-2 text-sm font-medium">Customer</p>
              <p className="text-sm">
                {lead.is_unlocked ? lead.buyer_name : "Locked"} 
                {lead.buyer_company && ` • ${lead.buyer_company}`}
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium">Line Items</p>
              {quotationItems.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2">
                  <Input
                    className="col-span-6"
                    placeholder="Item name"
                    value={item.name}
                    onChange={(e) => {
                      const newItems = [...quotationItems];
                      newItems[index].name = e.target.value;
                      setQuotationItems(newItems);
                    }}
                  />
                  <Input
                    className="col-span-2"
                    type="number"
                    placeholder="Qty"
                    value={item.quantity}
                    min={1}
                    onChange={(e) => {
                      const newItems = [...quotationItems];
                      newItems[index].quantity = parseInt(e.target.value) || 1;
                      setQuotationItems(newItems);
                    }}
                  />
                  <Input
                    className="col-span-3"
                    type="number"
                    placeholder="Price"
                    value={item.unit_price}
                    min={0}
                    onChange={(e) => {
                      const newItems = [...quotationItems];
                      newItems[index].unit_price = parseFloat(e.target.value) || 0;
                      setQuotationItems(newItems);
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="col-span-1"
                    onClick={() => {
                      if (quotationItems.length > 1) {
                        setQuotationItems(quotationItems.filter((_, i) => i !== index));
                      }
                    }}
                    disabled={quotationItems.length <= 1}
                  >
                    ×
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuotationItems([...quotationItems, { name: "", quantity: 1, unit_price: 0 }])}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Add Item
              </Button>
            </div>

            <Separator />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-medium">₹{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>GST (18%)</span>
                <span className="font-medium">₹{gst.toLocaleString()}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-base font-semibold">
                <span>Total</span>
                <span className="text-primary">₹{total.toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Notes / Terms</label>
              <Textarea
                value={quotationNotes}
                onChange={(e) => setQuotationNotes(e.target.value)}
                placeholder="Add terms, conditions, or notes..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuotationModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendQuotation} disabled={sendingQuotation}>
              {sendingQuotation && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Create Quotation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Professional Quotation Modal */}
      {user && (
        <CreateQuotationModal
          open={showProfessionalQuotationModal}
          onOpenChange={setShowProfessionalQuotationModal}
          onSuccess={async () => {
            // Refresh quotation count
            const { count } = await supabase
              .from("crm_quotations")
              .select("*", { count: "exact", head: true })
              .eq("lead_id", lead.id)
              .eq("seller_id", user.id);
            setQuotationCount(count || 0);
            
            // Update lead status to quoted if not already
            if (lead.status === "new" || lead.status === "contacted") {
              await onStatusChange(lead.id, "quoted");
            }
            
            // Log activity
            await onAddActivity(lead.id, "status_change", "Quotation sent", "Professional quotation generated and sent");
          }}
          leadData={{
            leadId: lead.id,
            buyerName: lead.buyer_name || "",
            buyerEmail: lead.buyer_email || "",
            buyerPhone: lead.buyer_phone || "",
            buyerCompany: lead.buyer_company || "",
            buyerAddress: lead.buyer_location || "",
            productName: lead.item_name || undefined,
            productPrice: lead.product_price || undefined,
            productBrand: lead.product_brand || undefined,
            productModel: lead.product_model || undefined,
          }}
        />
      )}
    </div>
  );
};

export default LeadDetailView;
