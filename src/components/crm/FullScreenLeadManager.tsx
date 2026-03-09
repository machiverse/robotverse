import React, { Fragment, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileQuestion,
  ShoppingCart,
  User,
  X,
  LayoutGrid,
  CreditCard,
  Search,
  Filter,
  Lock,
  Unlock,
  Phone,
  Mail,
  Building2,
  Calendar,
  MessageSquare,
  Package,
  Clock,
  MessageCircle,
  FileSpreadsheet,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

import { useAuth } from "@/hooks/useAuth";
import { useSellerCRM, type Lead, type LeadActivity } from "@/hooks/useSellerCRM";
import { useToast } from "@/hooks/use-toast";

import BuyLeadsTab from "./BuyLeadsTab";
import QuoteRequestsSection from "@/components/dashboards/QuoteRequestsSection";
import LeadsPipeline from "./LeadsPipeline";
import LeadDetailView from "./LeadDetailView";
import CreateQuotationModal from "./CreateQuotationModal";

import { format, formatDistanceToNow } from "date-fns";
import SellerAssignedRequests from "@/components/SellerAssignedRequests";
import { supabase } from "@/integrations/supabase/client";

type ViewMode = "list" | "pipeline";
type LeadTab = "views" | "quotes" | "leads" | "user_requests";

const TAB_VIEWS: LeadTab = "views";
const TAB_QUOTES: LeadTab = "quotes";
const TAB_LEADS: LeadTab = "leads";
const TAB_USER_REQUESTS: LeadTab = "user_requests";

const STATUS_CONFIG: Record<Lead["status"], { label: string; color: string; bg: string }> = {
  new: {
    label: "New",
    color: "text-blue-700",
    bg: "bg-blue-100 dark:bg-blue-900/30",
  },
  contacted: {
    label: "Contacted",
    color: "text-yellow-700",
    bg: "bg-yellow-100 dark:bg-yellow-900/30",
  },
  quoted: {
    label: "Quoted",
    color: "text-purple-700",
    bg: "bg-purple-100 dark:bg-purple-900/30",
  },
  negotiating: {
    label: "Negotiating",
    color: "text-orange-700",
    bg: "bg-orange-100 dark:bg-orange-900/30",
  },
  closed_won: {
    label: "Won",
    color: "text-green-700",
    bg: "bg-green-100 dark:bg-green-900/30",
  },
  closed_lost: {
    label: "Lost",
    color: "text-red-700",
    bg: "bg-red-100 dark:bg-red-900/30",
  },
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
  const normalized = leadItemType?.toLowerCase() || "";
  return normalized === "robots" || normalized === "robot" ? 10 : 5;
};

const getStatusAccentColor = (status: Lead["status"]): string => {
  const map: Record<Lead["status"], string> = {
    new: "bg-blue-500",
    contacted: "bg-yellow-500",
    quoted: "bg-purple-500",
    negotiating: "bg-orange-500",
    closed_won: "bg-green-500",
    closed_lost: "bg-red-500",
  };
  return map[status] ?? "bg-muted";
};

interface FullScreenLeadManagerProps {
  onClose: () => void;
  /** Force a specific category filter (robot, spare_part, service) */
  categoryFilter?: "robot" | "spare_part" | "service";
  /** Commission sellers bypass credit checks */
  isCommissionSeller?: boolean;
}

const matchesCategory = (itemType: string, categoryFilter?: FullScreenLeadManagerProps["categoryFilter"]): boolean => {
  if (!categoryFilter) return true;
  const normalized = itemType?.toLowerCase() || "";

  if (categoryFilter === "robot") {
    return normalized === "robot" || normalized === "robots";
  }
  if (categoryFilter === "spare_part") {
    return normalized === "spare_part" || normalized === "spare_parts";
  }
  if (categoryFilter === "service") {
    return normalized === "service" || normalized === "services";
  }
  return true;
};

const FullScreenLeadManager = ({ onClose, categoryFilter, isCommissionSeller }: FullScreenLeadManagerProps) => {
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
    stats,
    fetchLeads,
  } = useSellerCRM();

  const [activeTab, setActiveTab] = useState<LeadTab>(TAB_VIEWS);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showDetailView, setShowDetailView] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [showQuotationModal, setShowQuotationModal] = useState(false);
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpNote, setFollowUpNote] = useState("");
  const [unlocking, setUnlocking] = useState<string | null>(null);
  const [leadActivities, setLeadActivities] = useState<LeadActivity[]>([]);

  const filteredLeads = leads.filter((lead) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      lead.buyer_name?.toLowerCase().includes(q) ||
      lead.buyer_company?.toLowerCase().includes(q) ||
      lead.item_name?.toLowerCase().includes(q);

    const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
    const matchesCat = matchesCategory(lead.item_type, categoryFilter);

    return matchesSearch && matchesStatus && matchesCat;
  });

  const handleUnlock = async (lead: Lead) => {
    if (!isCommissionSeller) {
      const creditsNeeded = getCreditsNeeded(lead.item_type);
      if (creditsBalance < creditsNeeded) return;
    }

    setUnlocking(lead.id);
    if (isCommissionSeller) {
      // Commission sellers: directly unlock without credits
      try {
        await supabase
          .from('seller_leads')
          .update({ is_unlocked: true })
          .eq('id', lead.id);
        fetchLeads();
        toast({ title: "Lead unlocked", description: "Buyer details are now visible (no credits deducted)." });
      } catch (error) {
        console.error('Error unlocking lead:', error);
      }
    } else {
      await unlockBuyerInfo(lead.id, lead.item_type);
    }
    setUnlocking(null);
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

  const PLATFORM_PHONE = "918610925352";
  const PLATFORM_PHONE_DISPLAY = "+91 861 092 5352";

  const handleWhatsApp = (lead: Lead) => {
    if (isCommissionSeller) {
      const message = encodeURIComponent(
        `Hi Robotverse, I'm a commission seller and want to connect regarding the lead for ${lead.item_name}. Buyer: ${lead.buyer_name || "Unknown"}.`,
      );
      window.open(`https://wa.me/${PLATFORM_PHONE}?text=${message}`, "_blank");
      addActivity(lead.id, "call", "WhatsApp via Platform", "Contacted Robotverse platform for buyer connection");
      return;
    }
    if (!lead.is_unlocked || !lead.buyer_phone) return;
    const phone = lead.buyer_phone.replace(/\D/g, "");
    const message = encodeURIComponent(
      `Hi ${lead.buyer_name}, I'm reaching out regarding your inquiry about ${lead.item_name}. How can I help you?`,
    );
    window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
    addActivity(lead.id, "call", "WhatsApp Sent", "Contacted via WhatsApp");
  };

  const handleEmail = (lead: Lead) => {
    if (isCommissionSeller) return; // Commission sellers use platform only
    if (!lead.is_unlocked || !lead.buyer_email) return;
    const subject = encodeURIComponent(`Regarding your inquiry: ${lead.item_name}`);
    const body = encodeURIComponent(
      `Dear ${lead.buyer_name},\n\nThank you for your interest in ${lead.item_name}.\n\nPlease let me know how I can assist you further.\n\nBest regards`,
    );
    window.open(`mailto:${lead.buyer_email}?subject=${subject}&body=${body}`, "_blank");
    addActivity(lead.id, "email", "Email Sent", `Sent email to ${lead.buyer_email}`);
  };

  const handleCall = (lead: Lead) => {
    if (isCommissionSeller) {
      window.open(`tel:+${PLATFORM_PHONE}`, "_blank");
      addActivity(lead.id, "call", "Called Platform", "Called Robotverse platform number");
      return;
    }
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

  // Filter counts by category for tab badges and stats
  const categoryFilteredLeads = leads.filter((l) => matchesCategory(l.item_type, categoryFilter));
  const categoryFilteredViews = aggregatedViews.filter((v) => 
    !v.is_anonymous && v.items.some((item) => matchesCategory(item.item_type || '', categoryFilter))
  );
  const unlockedLeadsCount = categoryFilteredLeads.filter((l) => l.is_unlocked).length;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b bg-background px-6">
        <div className="space-y-0.5">
          <h1 className="text-lg font-semibold tracking-tight">Lead Manager</h1>
          <p className="text-xs text-muted-foreground">CRM workspace for managing leads and buyer inquiries</p>
        </div>
        <div className="flex items-center gap-3">
          {!isCommissionSeller && (
            <div className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-1.5 text-xs">
              <CreditCard className="h-4 w-4 text-amber-600" />
              <span className="font-medium">{creditsBalance} credits</span>
            </div>
          )}
          {isCommissionSeller && (
            <div className="flex items-center gap-2 rounded-lg bg-green-100 dark:bg-green-900/30 px-3 py-1.5 text-xs">
              <Unlock className="h-4 w-4 text-green-600" />
              <span className="font-medium text-green-700 dark:text-green-300">Commission Model — Free Access</span>
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close lead manager" type="button">
            <X className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Stats Row - Category-filtered counts */}
      <div className="border-b bg-muted/40 px-6 py-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-muted/60 bg-card px-3 py-3">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-amber-100 p-2 dark:bg-amber-900/30">
                <ShoppingCart className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase text-muted-foreground">Product Views</p>
                <p className="text-xl font-semibold">{categoryFilteredViews.length}</p>
              </div>
            </div>
          </Card>

          <Card className="border-muted/60 bg-card px-3 py-3">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-indigo-100 p-2 dark:bg-indigo-900/30">
                <FileQuestion className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase text-muted-foreground">Quote Requests</p>
                <p className="text-xl font-semibold">{stats.quoteRequestsCount}</p>
              </div>
            </div>
          </Card>

          <Card className="border-muted/60 bg-card px-3 py-3">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-100 p-2 dark:bg-green-900/30">
                <User className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase text-muted-foreground">Total Leads</p>
                <p className="text-xl font-semibold">{categoryFilteredLeads.length}</p>
              </div>
            </div>
          </Card>

          <Card className="border-muted/60 bg-card px-3 py-3">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-purple-100 p-2 dark:bg-purple-900/30">
                <Unlock className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase text-muted-foreground">Unlocked</p>
                <p className="text-xl font-semibold">{unlockedLeadsCount}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        <Card className="flex h-full flex-col border-muted/70 bg-background">
          <Tabs
            value={activeTab}
            onValueChange={(val) => setActiveTab(val as LeadTab)}
            className="flex flex-1 flex-col"
          >
            {/* Tabs Header */}
            <div className="border-b p-4 pb-0">
              <div className="mb-4 flex items-center justify-between gap-3">
                <TabsList className="h-10">
                  <TabsTrigger value={TAB_VIEWS} className="flex items-center gap-2 px-4">
                    <ShoppingCart className="h-4 w-4" />
                    <span>Product Views</span>
                    <Badge className="ml-1 bg-amber-500">{categoryFilteredViews.length}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value={TAB_QUOTES} className="flex items-center gap-2 px-4">
                    <FileQuestion className="h-4 w-4" />
                    <span>Quote Requests</span>
                    <Badge variant="secondary" className="ml-1">
                      {stats.quoteRequestsCount}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value={TAB_LEADS} className="flex items-center gap-2 px-4">
                    <User className="h-4 w-4" />
                    <span>Leads</span>
                    <Badge variant="secondary" className="ml-1">
                      {categoryFilteredLeads.length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value={TAB_USER_REQUESTS} className="flex items-center gap-2 px-4">
                    <FileQuestion className="h-4 w-4" />
                    <span>User Requests</span>
                  </TabsTrigger>
                </TabsList>

                {activeTab === TAB_LEADS && (
                  <ToggleGroup
                    type="single"
                    value={viewMode}
                    onValueChange={(val) => val && setViewMode(val as ViewMode)}
                    aria-label="Select leads view mode"
                  >
                    <ToggleGroupItem value="list" aria-label="List view" className="h-8 px-3">
                      <LayoutGrid className="h-4 w-4 rotate-90" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="pipeline" aria-label="Pipeline view" className="h-8 px-3">
                      <LayoutGrid className="h-4 w-4" />
                    </ToggleGroupItem>
                  </ToggleGroup>
                )}
              </div>

              {activeTab === TAB_LEADS && (
                <div className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-center">
                  <div className="relative flex-1">
                    <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                    <Input
                      placeholder="Search by name, company, or product…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  {viewMode === "list" && (
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
              <TabsContent value={TAB_VIEWS} className="mt-0 h-full">
                <BuyLeadsTab
                  sellerId={user?.id || ""}
                  creditsBalance={creditsBalance}
                  onLeadPurchased={() => {
                    fetchLeads();
                    setActiveTab(TAB_LEADS);
                  }}
                  onBuyCredits={() => navigate("/dashboard/credits")}
                  forcedCategoryFilter={categoryFilter}
                  isCommissionSeller={isCommissionSeller}
                />
              </TabsContent>

              <TabsContent value={TAB_QUOTES} className="mt-0 h-full">
                <QuoteRequestsSection 
                  sellerId={user?.id || ""} 
                  itemType={categoryFilter === "robot" ? "robot" : categoryFilter === "spare_part" ? "spare_part" : categoryFilter === "service" ? "service" : undefined}
                  isCommissionSeller={isCommissionSeller}
                />
              </TabsContent>

              <TabsContent value={TAB_USER_REQUESTS} className="mt-0 h-full">
                <div className="space-y-4">
                  <div className="rounded-lg border border-muted bg-muted/30 p-4">
                    <h3 className="text-sm font-medium mb-1">Assigned User Requests</h3>
                    <p className="text-xs text-muted-foreground">
                      User requests assigned to you by the admin. Review details and submit quotations or solutions.
                    </p>
                  </div>
                  <SellerAssignedRequests categoryFilter={categoryFilter} />
                </div>
              </TabsContent>

              <TabsContent value={TAB_LEADS} className="mt-0 h-full">
                {viewMode === "pipeline" ? (
                  <LeadsPipeline
                    leads={filteredLeads}
                    onStatusChange={updateLeadStatus}
                    onLeadClick={openLeadDetails}
                  />
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

                      return (
                        <Card
                          key={lead.id}
                          role="button"
                          tabIndex={0}
                          aria-label={`Open lead details for ${lead.buyer_name ?? "buyer"}`}
                          className="group cursor-pointer overflow-hidden border-border/50 bg-card shadow-sm transition-all hover:border-primary/20 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                          onClick={() => openLeadDetails(lead)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              openLeadDetails(lead);
                            }
                          }}
                        >
                          <div className="flex items-stretch">
                            <div className={`w-1 shrink-0 ${getStatusAccentColor(lead.status)}`} />
                            <div className="flex-1 p-4">
                              {/* Top row */}
                              <div className="mb-3 flex items-start justify-between gap-4">
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                                      lead.is_unlocked ? "bg-green-100 dark:bg-green-900/40" : "bg-muted"
                                    }`}
                                  >
                                    {lead.is_unlocked ? (
                                      <span className="text-base font-semibold text-green-600">
                                        {(lead.buyer_name || "L").charAt(0).toUpperCase()}
                                      </span>
                                    ) : (
                                      <Lock className="h-5 w-5 text-muted-foreground" />
                                    )}
                                  </div>
                                  <div className="min-w-0 space-y-0.5">
                                    <div className="flex items-center gap-2">
                                      <h4 className="max-w-[200px] truncate text-sm font-semibold text-foreground">
                                        {getMaskedValue(lead.buyer_name, lead.is_unlocked)}
                                      </h4>
                                      {!lead.is_unlocked && (
                                        <Badge variant="secondary" className="shrink-0 text-[10px]">
                                          <Lock className="mr-1 h-3 w-3" />
                                          Locked
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                      <Building2 className="h-3.5 w-3.5" />
                                      <span className="truncate">
                                        {getMaskedValue(lead.buyer_company, lead.is_unlocked)}
                                      </span>
                                    </p>
                                  </div>
                                </div>

                                <div className="flex shrink-0 items-center gap-2">
                                  <Badge
                                    className={`${statusConfig.bg} ${statusConfig.color} border-0 text-xs font-medium`}
                                  >
                                    {statusConfig.label}
                                  </Badge>
                                  <Badge variant="outline" className={`${priorityConfig.color} text-xs font-medium`}>
                                    {priorityConfig.label}
                                  </Badge>
                                </div>
                              </div>

                              {/* Contact info */}
                              <div className="mb-3 flex flex-wrap items-center gap-4 text-sm">
                                {isCommissionSeller ? (
                                  <div className="flex gap-4 text-xs text-muted-foreground">
                                    <span className="inline-flex items-center gap-1.5">
                                      <Phone className="h-3.5 w-3.5" />
                                      Hidden — Use Platform
                                    </span>
                                    <span className="inline-flex items-center gap-1.5">
                                      <Mail className="h-3.5 w-3.5" />
                                      Hidden — Use Platform
                                    </span>
                                  </div>
                                ) : lead.is_unlocked ? (
                                  <Fragment>
                                    {lead.buyer_phone && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCall(lead);
                                        }}
                                        className="inline-flex items-center gap-1.5 text-primary hover:underline"
                                        aria-label={`Call ${lead.buyer_name ?? "buyer"}`}
                                      >
                                        <Phone className="h-3.5 w-3.5" />
                                        {lead.buyer_phone}
                                      </button>
                                    )}
                                    {lead.buyer_email && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEmail(lead);
                                        }}
                                        className="inline-flex items-center gap-1.5 text-primary hover:underline"
                                        aria-label={`Email ${lead.buyer_name ?? "buyer"}`}
                                      >
                                        <Mail className="h-3.5 w-3.5" />
                                        {lead.buyer_email}
                                      </button>
                                    )}
                                  </Fragment>
                                ) : (
                                  <div className="flex gap-4 text-xs text-muted-foreground/60">
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
                              <div className="mb-3 flex items-center gap-3">
                                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                                  {lead.item_image ? (
                                    <img
                                      src={lead.item_image}
                                      alt={lead.item_name || "Product"}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center">
                                      <Package className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="max-w-[220px] truncate text-sm font-medium">
                                      {lead.item_name || "Unknown product"}
                                    </span>
                                    <Badge className="text-[11px] capitalize" variant="outline">
                                      {lead.item_type}
                                    </Badge>
                                  </div>
                                </div>
                              </div>

                              {/* Bottom row */}
                              <div className="flex items-center justify-between gap-4 border-t border-border/50 pt-2">
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
                                      variant={isCommissionSeller || canUnlock ? "default" : "outline"}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (!isCommissionSeller && !canUnlock) return;
                                        handleUnlock(lead);
                                      }}
                                      disabled={(!isCommissionSeller && !canUnlock) || unlocking === lead.id}
                                      className={`h-8 px-3 text-xs font-medium shadow-sm ${isCommissionSeller ? 'bg-green-600 hover:bg-green-700' : ''}`}
                                    >
                                      {unlocking === lead.id ? (
                                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <Unlock className="mr-1.5 h-3.5 w-3.5" />
                                      )}
                                      {isCommissionSeller ? 'Unlock (Free)' : `Unlock (${creditsNeeded} cr)`}
                                    </Button>
                                  ) : isCommissionSeller ? (
                                    <div className="flex items-center gap-1.5">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCall(lead);
                                        }}
                                        className="h-8 px-3 text-xs font-medium"
                                      >
                                        <Phone className="mr-1.5 h-3.5 w-3.5" />
                                        Call Platform
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleWhatsApp(lead);
                                        }}
                                        className="h-8 px-3 text-xs font-medium border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                                      >
                                        <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                                        WhatsApp Platform
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openQuotation(lead);
                                        }}
                                        className="h-8 px-3 text-xs font-medium"
                                      >
                                        <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
                                        Quote
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1.5">
                                      <Button
                                        size="sm"
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleStartChat(lead);
                                        }}
                                        className="h-8 px-3 text-xs font-medium"
                                      >
                                        <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                                        Chat
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleWhatsApp(lead);
                                        }}
                                        className="h-8 px-3 text-xs font-medium border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                                      >
                                        <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                                        WhatsApp
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openQuotation(lead);
                                        }}
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
          isCommissionSeller={isCommissionSeller}
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
            <Button variant="outline" size="sm" type="button" onClick={() => setShowFollowUpModal(false)}>
              Cancel
            </Button>
            <Button size="sm" type="button" onClick={handleScheduleFollowUp} disabled={!followUpDate}>
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
          isCommissionSeller={isCommissionSeller}
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
