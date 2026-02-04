import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Eye,
  FileQuestion,
  ShoppingCart,
  User,
  X,
  List,
  LayoutGrid,
  CreditCard,
  Search,
  Filter,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useAuth } from "@/hooks/useAuth";
import { useSellerCRM, type Lead, type LeadActivity } from "@/hooks/useSellerCRM";

import BuyLeadsTab from "./BuyLeadsTab";
import QuoteRequestsSection from "@/components/dashboards/QuoteRequestsSection";
import LeadsPipeline from "./LeadsPipeline";
import LeadDetailView from "./LeadDetailView";
import CreateQuotationModal from "./CreateQuotationModal";

// Reuse the existing components from LeadsManager
import { format, formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Lock,
  Unlock,
  Phone,
  Mail,
  Building2,
  Calendar,
  MessageSquare,
  FileText,
  MoreHorizontal,
  Package,
  MapPin,
  Clock,
  MessageCircle,
  FileSpreadsheet,
  CheckCircle,
  UserPlus,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Fragment } from "react";

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

const getMaskedValue = (value: string | null, isUnlocked: boolean): string => {
  if (isUnlocked && value) return value;
  return "XXXXX";
};

const getCreditsNeeded = (leadItemType: string): number => {
  return leadItemType === "robots" || leadItemType === "robot" ? 10 : 5;
};

interface FullScreenLeadManagerProps {
  onClose: () => void;
  /** Force a specific category filter (robot, spare_part, service) */
  categoryFilter?: 'robot' | 'spare_part' | 'service';
}

const FullScreenLeadManager = ({ onClose, categoryFilter }: FullScreenLeadManagerProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const {
    leads,
    aggregatedViews,
    unlockBuyerInfo,
    updateLeadStatus,
    updateLeadNotes,
    scheduleFollowUp,
    addActivity,
    creditsBalance,
    activities,
    createInvoice,
    convertViewToLead,
    stats,
    fetchLeads,
  } = useSellerCRM();

  const [activeTab, setActiveTab] = useState<string>("views");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"list" | "pipeline">("list");

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showDetailView, setShowDetailView] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [showQuotationModal, setShowQuotationModal] = useState(false);
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpNote, setFollowUpNote] = useState("");
  const [unlocking, setUnlocking] = useState<string | null>(null);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [leadActivities, setLeadActivities] = useState<LeadActivity[]>([]);

  // Helper to match item_type with category filter
  const matchesCategory = (itemType: string): boolean => {
    if (!categoryFilter) return true;
    const normalized = itemType?.toLowerCase() || '';
    if (categoryFilter === 'robot') {
      return normalized === 'robot' || normalized === 'robots';
    }
    if (categoryFilter === 'spare_part') {
      return normalized === 'spare_part' || normalized === 'spare_parts';
    }
    if (categoryFilter === 'service') {
      return normalized === 'service' || normalized === 'services';
    }
    return true;
  };

  const filteredLeads = leads.filter((lead) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      lead.buyer_name?.toLowerCase().includes(q) ||
      lead.buyer_company?.toLowerCase().includes(q) ||
      lead.item_name?.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
    const matchesCat = matchesCategory(lead.item_type);
    return matchesSearch && matchesStatus && matchesCat;
  });

  const filteredViews = aggregatedViews.filter((view) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || view.items.some(item => 
      item.item_name?.toLowerCase().includes(q)
    );
    // Filter items by category
    const hasMatchingItems = view.items.some(item => matchesCategory(item.item_type));
    return matchesSearch && hasMatchingItems;
  });

  const handleUnlock = async (lead: Lead) => {
    setUnlocking(lead.id);
    await unlockBuyerInfo(lead.id, lead.item_type);
    setUnlocking(null);
  };

  const handleConvertToLead = async (viewId: string) => {
    setConvertingId(viewId);
    try {
      const leadId = await convertViewToLead(viewId);
      if (leadId) {
        setActiveTab("leads");
      }
    } finally {
      setConvertingId(null);
    }
  };

  const handleScheduleFollowUp = async () => {
    if (!selectedLead || !followUpDate) return;
    await scheduleFollowUp(selectedLead.id, followUpDate);
    if (followUpNote) {
      await addActivity(selectedLead.id, "follow_up", "Follow-up Scheduled", followUpNote, followUpDate);
    }
    setShowFollowUpModal(false);
    setFollowUpDate("");
    setFollowUpNote("");
    toast({
      title: "Follow-up scheduled",
      description: `Follow-up set for ${format(new Date(followUpDate), "PPP")}`,
    });
  };

  const handleStartChat = async (lead: Lead) => {
    if (!lead.is_unlocked || !lead.buyer_id) {
      toast({
        variant: "destructive",
        title: "Cannot start chat",
        description: "Buyer information must be unlocked first",
      });
      return;
    }

    try {
      const { data: existingSession } = await supabase
        .from("chat_sessions")
        .select("id")
        .or(
          `and(user1_id.eq.${user?.id},user2_id.eq.${lead.buyer_id}),and(user1_id.eq.${lead.buyer_id},user2_id.eq.${user?.id})`,
        )
        .eq("item_id", lead.item_id)
        .single();

      if (existingSession) {
        navigate(`/chat?session=${existingSession.id}`);
      } else {
        const { data: newSession, error } = await supabase
          .from("chat_sessions")
          .insert({
            user1_id: user?.id,
            user2_id: lead.buyer_id,
            item_id: lead.item_id,
            item_type: lead.item_type,
            item_name: lead.item_name,
          })
          .select("id")
          .single();

        if (error) throw error;

        await addActivity(lead.id, "chat", "Chat Started", `Started chat with ${lead.buyer_name}`);
        navigate(`/chat?session=${newSession.id}`);
      }
    } catch (error) {
      console.error("Error starting chat:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to start chat",
      });
    }
  };

  const handleWhatsApp = (lead: Lead) => {
    if (!lead.is_unlocked || !lead.buyer_phone) return;
    const phone = lead.buyer_phone.replace(/\D/g, "");
    const message = encodeURIComponent(
      `Hi ${lead.buyer_name}, I'm reaching out regarding your inquiry about ${lead.item_name}. How can I help you?`,
    );
    window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
    addActivity(lead.id, "call", "WhatsApp Sent", "Contacted via WhatsApp");
  };

  const handleEmail = (lead: Lead) => {
    if (!lead.is_unlocked || !lead.buyer_email) return;
    const subject = encodeURIComponent(`Regarding your inquiry: ${lead.item_name}`);
    const body = encodeURIComponent(
      `Dear ${lead.buyer_name},\n\nThank you for your interest in ${lead.item_name}.\n\nPlease let me know how I can assist you further.\n\nBest regards`,
    );
    window.open(`mailto:${lead.buyer_email}?subject=${subject}&body=${body}`, "_blank");
    addActivity(lead.id, "email", "Email Sent", `Sent email to ${lead.buyer_email}`);
  };

  const handleCall = (lead: Lead) => {
    if (!lead.is_unlocked || !lead.buyer_phone) return;
    window.open(`tel:${lead.buyer_phone}`, "_blank");
    addActivity(lead.id, "call", "Phone Call Made", `Called ${lead.buyer_phone}`);
  };

  const openLeadDetails = (lead: Lead) => {
    setSelectedLead(lead);
    setLeadActivities(activities.filter((a) => a.lead_id === lead.id));
    setShowDetailView(true);
  };

  const openFollowUp = (lead: Lead) => {
    setSelectedLead(lead);
    setShowFollowUpModal(true);
  };

  const openQuotation = (lead: Lead) => {
    setSelectedLead(lead);
    setShowQuotationModal(true);
  };

  // Count of unlocked leads only
  const unlockedLeadsCount = leads.filter((l) => l.is_unlocked).length;

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-hidden flex flex-col">
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b bg-background px-6 shrink-0">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Lead Manager</h1>
          <p className="text-sm text-muted-foreground">
            CRM workspace for managing leads and buyer inquiries
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50">
            <CreditCard className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-medium">{creditsBalance} credits</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Stats Row */}
      <div className="px-6 py-4 border-b bg-muted/30 shrink-0">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <Card className="border-muted/60 bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900/30">
                <Eye className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">Product Views</p>
                <p className="text-2xl font-semibold">{aggregatedViews.length}</p>
              </div>
            </div>
          </Card>

          <Card className="border-muted/60 bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-indigo-100 p-2 dark:bg-indigo-900/30">
                <FileQuestion className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">Quote Requests</p>
                <p className="text-2xl font-semibold">{stats.quoteRequestsCount}</p>
              </div>
            </div>
          </Card>

          <Card className="border-muted/60 bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-amber-100 p-2 dark:bg-amber-900/30">
                <ShoppingCart className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">Buy Leads</p>
                <p className="text-2xl font-semibold">{aggregatedViews.filter(v => !v.is_anonymous).length}</p>
              </div>
            </div>
          </Card>

          <Card className="border-muted/60 bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-100 p-2 dark:bg-green-900/30">
                <User className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">Total Leads</p>
                <p className="text-2xl font-semibold">{leads.length}</p>
              </div>
            </div>
          </Card>

          <Card className="border-muted/60 bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-purple-100 p-2 dark:bg-purple-900/30">
                <Unlock className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">Unlocked</p>
                <p className="text-2xl font-semibold">{unlockedLeadsCount}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        <Card className="border-muted/70 bg-background h-full flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            {/* Tabs Header */}
            <div className="p-4 pb-0 border-b">
              <div className="flex items-center justify-between mb-4">
                <TabsList className="h-10">
                  <TabsTrigger value="views" className="flex items-center gap-2 px-4">
                    <Eye className="h-4 w-4" />
                    Product Views
                    <Badge variant="secondary" className="ml-1">
                      {aggregatedViews.length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="quotes" className="flex items-center gap-2 px-4">
                    <FileQuestion className="h-4 w-4" />
                    Quote Requests
                    <Badge variant="secondary" className="ml-1">
                      {stats.quoteRequestsCount}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="buy" className="flex items-center gap-2 px-4">
                    <ShoppingCart className="h-4 w-4" />
                    Buy Leads
                    <Badge className="ml-1 bg-amber-500">
                      {aggregatedViews.filter(v => !v.is_anonymous).length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="leads" className="flex items-center gap-2 px-4">
                    <User className="h-4 w-4" />
                    Leads
                    <Badge variant="secondary" className="ml-1">
                      {leads.length}
                    </Badge>
                  </TabsTrigger>
                </TabsList>

                {activeTab === "leads" && (
                  <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as "list" | "pipeline")}>
                    <ToggleGroupItem value="list" aria-label="List view" className="h-8 px-3">
                      <List className="h-4 w-4" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="pipeline" aria-label="Pipeline view" className="h-8 px-3">
                      <LayoutGrid className="h-4 w-4" />
                    </ToggleGroupItem>
                  </ToggleGroup>
                )}
              </div>

              {/* Search Bar (not for quotes tab) */}
              {activeTab !== "quotes" && activeTab !== "buy" && (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center pb-4">
                  <div className="relative flex-1">
                    <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                    <Input
                      placeholder="Search by name, company, or product…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  {activeTab === "leads" && viewMode === "list" && (
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-full sm:w-44">
                        <Filter className="mr-2 h-4 w-4" />
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All status</SelectItem>
                        {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                          <SelectItem key={value} value={value}>
                            {config.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}
            </div>

            {/* Tab Contents */}
            <div className="flex-1 overflow-auto p-4">
              <TabsContent value="views" className="mt-0 h-full">
                {filteredViews.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Eye className="mb-3 h-10 w-10 text-muted-foreground" />
                    <p className="font-medium">No views yet</p>
                    <p className="max-w-sm text-sm text-muted-foreground">
                      Views will appear here when buyers interact with your products.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredViews.map((view) => (
                      <Card key={view.key} className="overflow-hidden border-border/50 bg-card shadow-sm transition-all hover:shadow-md hover:border-primary/20">
                        <div className="flex items-stretch">
                          <div className={`w-1 shrink-0 ${view.is_anonymous ? "bg-muted-foreground/30" : "bg-primary"}`} />
                          <div className="flex-1 p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${view.is_anonymous ? "bg-muted" : "bg-primary/10"}`}>
                                  <span className={`text-sm font-semibold ${view.is_anonymous ? "text-muted-foreground" : "text-primary"}`}>
                                    {(view._internal_user_name || "A").charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div>
                                  <h4 className="font-semibold text-foreground">{view._internal_user_name || "Anonymous Visitor"}</h4>
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Clock className="h-3.5 w-3.5" />
                                    {formatDistanceToNow(new Date(view.created_at), { addSuffix: true })}
                                  </div>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => handleConvertToLead(view.id)}
                                disabled={convertingId !== null}
                                className="h-9 px-4"
                              >
                                {convertingId === view.id ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <UserPlus className="mr-2 h-4 w-4" />
                                )}
                                Convert to Lead
                              </Button>
                            </div>
                            <div className="space-y-2 pl-[52px]">
                              {view.items.map((item, idx) => (
                                <div key={`${item.item_id}_${idx}`} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary shrink-0">
                                    {idx + 1}
                                  </span>
                                  {item.item_image ? (
                                    <img src={item.item_image} alt={item.item_name} className="h-10 w-10 rounded object-cover shrink-0" />
                                  ) : (
                                    <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0">
                                      <Package className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                  )}
                                  <span className="font-medium text-sm text-foreground flex-1 truncate">{item.item_name || "Unknown Item"}</span>
                                  <Badge variant="secondary" className="shrink-0 flex items-center gap-1">
                                    <Eye className="h-3 w-3" />
                                    {item.view_count} {item.view_count === 1 ? "view" : "views"}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="quotes" className="mt-0 h-full">
                <QuoteRequestsSection sellerId={user?.id || ""} />
              </TabsContent>

              <TabsContent value="buy" className="mt-0 h-full">
                <BuyLeadsTab
                  sellerId={user?.id || ""}
                  creditsBalance={creditsBalance}
                  onLeadPurchased={() => {
                    fetchLeads();
                    setActiveTab("leads");
                  }}
                  onBuyCredits={() => navigate("/dashboard/credits")}
                  forcedCategoryFilter={categoryFilter}
                />
              </TabsContent>

              <TabsContent value="leads" className="mt-0 h-full">
                {viewMode === "pipeline" ? (
                  <LeadsPipeline leads={filteredLeads} onStatusChange={updateLeadStatus} onLeadClick={openLeadDetails} />
                ) : filteredLeads.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <User className="mb-3 h-10 w-10 text-muted-foreground" />
                    <p className="font-medium">No leads found</p>
                    <p className="max-w-sm text-sm text-muted-foreground">
                      Leads will appear here after you purchase or convert them.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredLeads.map((lead) => {
                      const statusConfig = STATUS_CONFIG[lead.status];
                      const priorityConfig = PRIORITY_CONFIG[lead.priority];
                      const creditsNeeded = getCreditsNeeded(lead.item_type);
                      const canUnlock = creditsBalance >= creditsNeeded;

                      const getStatusAccentColor = (status: Lead["status"]) => {
                        const colors = {
                          new: "bg-blue-500",
                          contacted: "bg-yellow-500",
                          quoted: "bg-purple-500",
                          negotiating: "bg-orange-500",
                          closed_won: "bg-green-500",
                          closed_lost: "bg-red-500",
                        };
                        return colors[status] || "bg-muted";
                      };

                      return (
                        <Card
                          key={lead.id}
                          className="group overflow-hidden border-border/50 bg-card shadow-sm transition-all hover:shadow-md hover:border-primary/20 cursor-pointer"
                          onClick={() => openLeadDetails(lead)}
                        >
                          <div className="flex items-stretch">
                            <div className={`w-1 shrink-0 ${getStatusAccentColor(lead.status)}`} />
                            <div className="flex-1 p-4">
                              {/* Top row */}
                              <div className="flex items-start justify-between gap-4 mb-3">
                                <div className="flex items-center gap-3">
                                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${lead.is_unlocked ? "bg-green-100 dark:bg-green-900/40" : "bg-muted"}`}>
                                    {lead.is_unlocked ? (
                                      <span className="text-base font-semibold text-green-600">
                                        {(lead.buyer_name || "L").charAt(0).toUpperCase()}
                                      </span>
                                    ) : (
                                      <Lock className="h-5 w-5 text-muted-foreground" />
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <h4 className="font-semibold text-foreground truncate">
                                        {getMaskedValue(lead.buyer_name, lead.is_unlocked)}
                                      </h4>
                                      {!lead.is_unlocked && (
                                        <Badge variant="secondary" className="text-xs shrink-0">
                                          <Lock className="h-3 w-3 mr-1" />
                                          Locked
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                      <Building2 className="h-3.5 w-3.5" />
                                      {getMaskedValue(lead.buyer_company, lead.is_unlocked)}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <Badge className={`${statusConfig.bg} ${statusConfig.color} border-0 font-medium`}>
                                    {statusConfig.label}
                                  </Badge>
                                  <Badge variant="outline" className={`${priorityConfig.color} font-medium`}>
                                    {priorityConfig.label}
                                  </Badge>
                                </div>
                              </div>

                              {/* Contact info */}
                              <div className="flex flex-wrap items-center gap-4 mb-3 text-sm">
                                {lead.is_unlocked ? (
                                  <Fragment>
                                    {lead.buyer_phone && (
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); handleCall(lead); }}
                                        className="inline-flex items-center gap-1.5 text-primary hover:underline"
                                      >
                                        <Phone className="h-3.5 w-3.5" />
                                        {lead.buyer_phone}
                                      </button>
                                    )}
                                    {lead.buyer_email && (
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); handleEmail(lead); }}
                                        className="inline-flex items-center gap-1.5 text-primary hover:underline"
                                      >
                                        <Mail className="h-3.5 w-3.5" />
                                        {lead.buyer_email}
                                      </button>
                                    )}
                                  </Fragment>
                                ) : (
                                  <div className="flex gap-4 text-muted-foreground/60">
                                    <span className="inline-flex items-center gap-1.5">
                                      <Phone className="h-3.5 w-3.5" />
                                      ••••••••••
                                    </span>
                                    <span className="inline-flex items-center gap-1.5">
                                      <Mail className="h-3.5 w-3.5" />
                                      ••••••••••
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Product info */}
                              <div className="flex items-center gap-3 mb-3">
                                <div className="h-12 w-12 shrink-0 rounded-lg overflow-hidden bg-muted">
                                  {lead.item_image ? (
                                    <img src={lead.item_image} alt={lead.item_name || "Product"} className="h-full w-full object-cover" />
                                  ) : (
                                    <div className="h-full w-full flex items-center justify-center">
                                      <Package className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium text-sm truncate">{lead.item_name || "Unknown product"}</span>
                                    <Badge variant="outline" className="capitalize text-xs">
                                      {lead.item_type}
                                    </Badge>
                                  </div>
                                </div>
                              </div>

                              {/* Bottom row */}
                              <div className="flex items-center justify-between gap-4 pt-2 border-t border-border/50">
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <span className="inline-flex items-center gap-1.5">
                                    <Clock className="h-3.5 w-3.5" />
                                    {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2">
                                  {!lead.is_unlocked ? (
                                    <Button
                                      size="sm"
                                      variant={canUnlock ? "default" : "outline"}
                                      onClick={(e) => { e.stopPropagation(); handleUnlock(lead); }}
                                      disabled={!canUnlock || unlocking === lead.id}
                                      className="h-9 px-4 font-medium shadow-sm"
                                    >
                                      {unlocking === lead.id ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      ) : (
                                        <Unlock className="mr-2 h-4 w-4" />
                                      )}
                                      Unlock ({creditsNeeded} cr)
                                    </Button>
                                  ) : (
                                    <div className="flex items-center gap-1.5">
                                      <Button
                                        size="sm"
                                        onClick={(e) => { e.stopPropagation(); handleStartChat(lead); }}
                                        className="h-8 px-3 text-xs font-medium"
                                      >
                                        <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                                        Chat
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={(e) => { e.stopPropagation(); handleWhatsApp(lead); }}
                                        className="h-8 px-3 text-xs font-medium border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                                      >
                                        <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                                        WhatsApp
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={(e) => { e.stopPropagation(); openQuotation(lead); }}
                                        className="h-8 px-3 text-xs font-medium"
                                      >
                                        <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
                                        Quote
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </Card>
      </div>

      {/* Lead Detail View */}
      {showDetailView && selectedLead && (
        <LeadDetailView
          lead={selectedLead}
          activities={leadActivities}
          onClose={() => {
            setShowDetailView(false);
            setSelectedLead(null);
          }}
          onStatusChange={updateLeadStatus}
          onAddActivity={addActivity}
          onUpdateNotes={updateLeadNotes}
          onScheduleFollowUp={scheduleFollowUp}
          onSendQuotation={async (data) => {
            const items = data.items.map((item) => ({
              name: item.name || selectedLead.item_name || "Product",
              quantity: item.quantity,
              unit_price: item.unit_price,
              total: item.quantity * item.unit_price,
            }));

            const subtotal = items.reduce((sum, item) => sum + item.total, 0);
            const taxAmount = subtotal * 0.18;
            const totalAmount = subtotal + taxAmount;

            await createInvoice({
              buyer_name: selectedLead.buyer_name || "",
              buyer_email: selectedLead.buyer_email,
              buyer_phone: selectedLead.buyer_phone,
              buyer_company: selectedLead.buyer_company,
              lead_id: selectedLead.id,
              items,
              subtotal,
              tax_rate: 18,
              tax_amount: taxAmount,
              total_amount: totalAmount,
              notes: data.notes,
              status: "sent",
            });

            await updateLeadStatus(selectedLead.id, "quoted");
            await addActivity(
              selectedLead.id,
              "invoice_sent",
              "Quotation Sent",
              `Quotation of ₹${totalAmount.toLocaleString()} sent`,
            );
          }}
        />
      )}

      {/* Follow-up Modal */}
      <Dialog open={showFollowUpModal} onOpenChange={setShowFollowUpModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-5 w-5" />
              Schedule follow-up
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Follow-up date</label>
              <Input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Notes (optional)</label>
              <Textarea
                value={followUpNote}
                onChange={(e) => setFollowUpNote(e.target.value)}
                placeholder="Add internal notes for this follow-up…"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowFollowUpModal(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleScheduleFollowUp} disabled={!followUpDate}>
              <Calendar className="mr-2 h-4 w-4" />
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quotation Modal */}
      {selectedLead && (
        <CreateQuotationModal
          open={showQuotationModal}
          onOpenChange={setShowQuotationModal}
          onSuccess={() => {
            fetchLeads();
            setShowQuotationModal(false);
          }}
          leadData={{
            leadId: selectedLead.id,
            buyerName: selectedLead.buyer_name || "",
            buyerEmail: selectedLead.buyer_email || "",
            buyerPhone: selectedLead.buyer_phone || "",
            buyerCompany: selectedLead.buyer_company || "",
            productName: selectedLead.item_name || "",
            productPrice: selectedLead.product_price || selectedLead.expected_value || 0,
            productBrand: selectedLead.product_brand || "",
            productModel: selectedLead.product_model || "",
          }}
        />
      )}
    </div>
  );
};

export default FullScreenLeadManager;
