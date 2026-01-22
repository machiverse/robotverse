import { useState, Fragment, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import {
  Search,
  Lock,
  Unlock,
  Phone,
  Mail,
  Building2,
  Calendar,
  MessageSquare,
  FileText,
  MoreHorizontal,
  Loader2,
  Filter,
  Eye,
  Send,
  User,
  Package,
  MapPin,
  Clock,
  MessageCircle,
  FileSpreadsheet,
  CheckCircle,
  LayoutGrid,
  List,
  Users,
  FileQuestion,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import {
  useSellerCRM,
  type Lead,
  type LeadActivity,
  type ProductView,
  type AggregatedProductView,
} from "@/hooks/useSellerCRM";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import LeadDetailView from "./LeadDetailView";
import LeadsPipeline from "./LeadsPipeline";
import QuoteRequestsSection from "@/components/dashboards/QuoteRequestsSection";

interface LeadsManagerProps {
  sellerId: string;
  itemType?: string;
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

const getMaskedValue = (value: string | null, isUnlocked: boolean): string => {
  if (isUnlocked && value) return value;
  return "XXXXX";
};

const getCreditsNeeded = (leadItemType: string): number => {
  return leadItemType === "robots" ? 10 : 5;
};

/* ---------- STATS HEADER (top area) ---------- */

const StatsHeader = ({
  viewsCount,
  leadsCount,
  unlockedCount,
  creditsBalance,
  quoteRequestsCount,
}: {
  viewsCount: number;
  leadsCount: number;
  unlockedCount: number;
  creditsBalance: number;
  quoteRequestsCount: number;
}) => {
  return (
    <div className="mb-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leads workspace</h1>
          <p className="text-sm text-muted-foreground">
            Monitor product engagement, qualify leads, and manage follow-ups from a single CRM-style view.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <Card className="border-muted/60 bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900/30">
              <Eye className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Total views</p>
              <p className="text-2xl font-semibold">{viewsCount}</p>
            </div>
          </div>
        </Card>

        <Card className="border-muted/60 bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-green-100 p-2 dark:bg-green-900/30">
              <User className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Total leads</p>
              <p className="text-2xl font-semibold">{leadsCount}</p>
            </div>
          </div>
        </Card>

        <Card className="border-muted/60 bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-indigo-100 p-2 dark:bg-indigo-900/30">
              <FileQuestion className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Quote requests</p>
              <p className="text-2xl font-semibold">{quoteRequestsCount}</p>
            </div>
          </div>
        </Card>

        <Card className="border-muted/60 bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-purple-100 p-2 dark:bg-purple-900/30">
              <Unlock className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Unlocked leads</p>
              <p className="text-2xl font-semibold">{unlockedCount}</p>
            </div>
          </div>
        </Card>

        <Card className="border-muted/60 bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-orange-100 p-2 dark:bg-orange-900/30">
              <CheckCircle className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Credits balance</p>
              <p className="text-2xl font-semibold">{creditsBalance}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

/* ---------- TOOLBAR (search + filters) ---------- */

const LeadsToolbar = ({
  viewTab,
  setViewTab,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  leadsCount,
  viewsCount,
  quoteRequestsCount,
  viewMode,
  setViewMode,
}: {
  viewTab: string;
  setViewTab: (v: string) => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  leadsCount: number;
  viewsCount: number;
  quoteRequestsCount: number;
  viewMode: "list" | "pipeline";
  setViewMode: (v: "list" | "pipeline") => void;
}) => (
  <div className="mb-4 space-y-3">
    <div className="flex items-center justify-between">
      <Tabs value={viewTab} onValueChange={setViewTab} className="flex-1">
        <TabsList className="mb-2">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Product views ({viewsCount})
          </TabsTrigger>
          <TabsTrigger value="quotes" className="flex items-center gap-2">
            <FileQuestion className="h-4 w-4" />
            Quote Requests ({quoteRequestsCount})
          </TabsTrigger>
          <TabsTrigger value="leads" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Leads ({leadsCount})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {viewTab === "leads" && (
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

    {viewTab !== "quotes" && (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search by name, company, or product…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        {viewTab === "leads" && viewMode === "list" && (
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
);

/* ---------- ROW COMPONENTS ---------- */

interface AggregatedViewRowProps {
  view: AggregatedProductView;
  onConvertToLead: (viewId: string) => Promise<void>;
  isConverting: boolean;
  convertingId: string | null;
}

// AggregatedViewRow - ANONYMOUS product view display (NO user details shown)
const AggregatedViewRow = ({ view, onConvertToLead, isConverting, convertingId }: AggregatedViewRowProps) => {
  const isCurrentlyConverting = convertingId === view.id;

  // Determine item type label
  const getItemTypeLabel = (type: string | null) => {
    if (!type) return "Product";
    const labels: Record<string, string> = {
      robot: "Robot",
      robots: "Robot",
      spare_part: "Spare Part",
      spare_parts: "Spare Part",
      service: "Service",
      services: "Service",
      logistics: "Logistics",
      finance: "Finance",
    };
    return labels[type] || type;
  };

  return (
    <Card className="group overflow-hidden border-border/50 bg-card shadow-sm transition-all hover:shadow-md hover:border-primary/20">
      <div className="flex items-stretch">
        {/* Left accent bar */}
        <div className={`w-1 shrink-0 ${view.is_anonymous ? "bg-muted-foreground/30" : "bg-blue-500"}`} />

        <div className="flex flex-1 items-center justify-between gap-4 p-4">
          {/* Avatar & Info */}
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${view.is_anonymous ? "bg-muted" : "bg-blue-100 dark:bg-blue-900/40"}`}
            >
              {view.is_anonymous ? (
                <Users className="h-5 w-5 text-muted-foreground" />
              ) : (
                <span className="text-lg font-semibold text-blue-600">
                  {(view.user_name || "U").charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="truncate font-semibold text-foreground">
                  {view.is_anonymous ? "Anonymous Users" : view.user_name || "Unknown user"}
                </h4>
                {view.view_count > 1 && (
                  <Badge variant="secondary" className="shrink-0 text-xs font-medium">
                    {view.view_count} views
                  </Badge>
                )}
              </div>

              {!view.is_anonymous && view.user_company && (
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5" />
                  {view.user_company}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <div className="flex items-center gap-1.5 rounded-md bg-muted/50 px-2 py-1 text-xs">
                  <Package className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-medium">{view.item_name || "Unknown product"}</span>
                </div>
                {view.item_type && (
                  <Badge variant="outline" className="capitalize text-xs">
                    {view.item_type}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Right side - Contact info & Actions */}
          <div className="flex shrink-0 flex-col items-end gap-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {formatDistanceToNow(new Date(view.created_at), { addSuffix: true })}
            </div>

            {!view.is_anonymous && (
              <div className="flex flex-col items-end gap-1.5 text-xs text-muted-foreground">
                {view.user_mobile && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3 w-3" />
                    {view.user_mobile}
                  </span>
                )}
                {view.user_email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3 w-3" />
                    {view.user_email}
                  </span>
                )}
              </div>
            )}

            {!view.is_anonymous && (
              <Button
                size="sm"
                onClick={() => onConvertToLead(view.id)}
                disabled={isConverting || isCurrentlyConverting}
                className="h-9 px-4 font-medium shadow-sm"
              >
                {isCurrentlyConverting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <User className="mr-2 h-4 w-4" />
                )}
                Convert to Lead
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

interface LeadRowProps {
  lead: Lead;
  creditsBalance: number;
  onUnlock: (lead: Lead) => Promise<void>;
  unlockingId: string | null;
  onStartChat: (lead: Lead) => Promise<void>;
  onWhatsApp: (lead: Lead) => void;
  onEmail: (lead: Lead) => void;
  onCall: (lead: Lead) => void;
  onStatusChange: (leadId: string, status: Lead["status"]) => Promise<boolean | void>;
  onOpenDetails: (lead: Lead) => void;
  onOpenFollowUp: (lead: Lead) => void;
  onOpenQuotation: (lead: Lead) => void;
  onRowClick: (lead: Lead) => void; // NEW
}

const LeadRow = ({
  lead,
  creditsBalance,
  onUnlock,
  unlockingId,
  onStartChat,
  onWhatsApp,
  onEmail,
  onCall,
  onStatusChange,
  onOpenDetails,
  onOpenFollowUp,
  onOpenQuotation,
  onRowClick,
}: LeadRowProps) => {
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
      className="group overflow-hidden border-border/50 bg-card shadow-sm transition-all hover:shadow-md hover:border-primary/20 cursor-pointer"
      onClick={() => onRowClick(lead)}
    >
      <div className="flex items-stretch">
        {/* Left accent bar with status color */}
        <div className={`w-1 shrink-0 ${getStatusAccentColor(lead.status)}`} />

        <div className="flex-1 p-4">
          {/* Top row: Avatar, Name, Company + Status badges */}
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${lead.is_unlocked ? "bg-green-100 dark:bg-green-900/40" : "bg-muted"}`}
              >
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

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 bg-popover" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuItem onClick={() => onOpenDetails(lead)}>
                    <FileText className="mr-2 h-4 w-4" />
                    View full details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onOpenFollowUp(lead)}>
                    <Calendar className="mr-2 h-4 w-4" />
                    Schedule follow-up
                  </DropdownMenuItem>
                  {lead.is_unlocked && (
                    <Fragment>
                      <DropdownMenuItem onClick={() => onStartChat(lead)}>
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Start chat
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onOpenQuotation(lead)}>
                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                        Send quotation
                      </DropdownMenuItem>
                    </Fragment>
                  )}
                  <DropdownMenuSeparator />
                  <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium">Change status</div>
                  {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                    <DropdownMenuItem
                      key={status}
                      disabled={lead.status === status}
                      onClick={() => onStatusChange(lead.id, status as Lead["status"])}
                    >
                      <span className={`mr-2 h-2 w-2 rounded-full ${config.bg}`} />
                      {config.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Contact info row */}
          <div className="flex flex-wrap items-center gap-4 mb-3 text-sm">
            {lead.is_unlocked ? (
              <Fragment>
                {lead.buyer_phone && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCall(lead);
                    }}
                    className="inline-flex items-center gap-1.5 text-primary hover:underline"
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
                      onEmail(lead);
                    }}
                    className="inline-flex items-center gap-1.5 text-primary hover:underline"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    {lead.buyer_email}
                  </button>
                )}
                {lead.buyer_location && (
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {lead.buyer_location}
                  </span>
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

          {/* Product info row */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <div className="inline-flex items-center gap-1.5 rounded-md bg-muted/50 px-2.5 py-1 text-sm">
              <Package className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-medium">{lead.item_name || "Unknown product"}</span>
            </div>
            {lead.product_brand && (
              <Badge variant="outline" className="text-xs">
                {lead.product_brand}
              </Badge>
            )}
            {lead.product_model && (
              <Badge variant="secondary" className="text-xs">
                {lead.product_model}
              </Badge>
            )}
            <Badge variant="outline" className="capitalize text-xs">
              {lead.item_type}
            </Badge>
            {lead.product_price && (
              <span className="font-semibold text-green-600 text-sm">₹{lead.product_price.toLocaleString()}</span>
            )}
          </div>

          {/* Bottom row: Time info + Actions */}
          <div className="flex items-center justify-between gap-4 pt-2 border-t border-border/50">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
              </span>
              {lead.viewed_at && (
                <span className="inline-flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5" />
                  Viewed {format(new Date(lead.viewed_at), "MMM d")}
                </span>
              )}
              {lead.next_follow_up && (
                <span className="inline-flex items-center gap-1.5 text-orange-600 font-medium">
                  <Calendar className="h-3.5 w-3.5" />
                  Follow-up: {format(new Date(lead.next_follow_up), "MMM d")}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {!lead.is_unlocked ? (
                <Button
                  size="sm"
                  variant={canUnlock ? "default" : "outline"}
                  onClick={(e) => {
                    e.stopPropagation();
                    onUnlock(lead);
                  }}
                  disabled={!canUnlock || unlockingId === lead.id}
                  className="h-9 px-4 font-medium shadow-sm"
                >
                  {unlockingId === lead.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Unlock className="mr-2 h-4 w-4" />
                  )}
                  Unlock ({creditsNeeded} credits)
                </Button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onStartChat(lead);
                    }}
                    className="h-8 px-3 text-xs font-medium"
                  >
                    <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                    Chat
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onWhatsApp(lead);
                    }}
                    className="h-8 px-3 text-xs font-medium border-green-200 bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:border-green-800"
                  >
                    <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                    WhatsApp
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEmail(lead);
                    }}
                    className="h-8 px-3 text-xs font-medium"
                  >
                    <Mail className="mr-1.5 h-3.5 w-3.5" />
                    Email
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenQuotation(lead);
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
};

/* ---------- MAIN COMPONENT ---------- */

const LeadsManager = ({ sellerId, itemType }: LeadsManagerProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const {
    leads,
    productViews,
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
  } = useSellerCRM(itemType);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewTab, setViewTab] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"list" | "pipeline">("list");
  const [quoteRequestsCount, setQuoteRequestsCount] = useState(0);

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showDetailView, setShowDetailView] = useState(false);

  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [showQuotationModal, setShowQuotationModal] = useState(false);

  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpNote, setFollowUpNote] = useState("");
  const [notes, setNotes] = useState("");

  const [unlocking, setUnlocking] = useState<string | null>(null);
  const [leadActivities, setLeadActivities] = useState<LeadActivity[]>([]);
  const [convertingId, setConvertingId] = useState<string | null>(null);

  const [quotationItems, setQuotationItems] = useState([{ name: "", quantity: 1, unit_price: 0 }]);
  const [quotationNotes, setQuotationNotes] = useState("");
  const [quotationDiscount, setQuotationDiscount] = useState(0);
  const [quotationTaxRate, setQuotationTaxRate] = useState(18);
  const [quotationValidity, setQuotationValidity] = useState(7);
  const [sendingQuotation, setSendingQuotation] = useState(false);

  // Fetch quote requests count
  useEffect(() => {
    const fetchQuoteRequestsCount = async () => {
      if (!user?.id) return;
      try {
        const { count } = await supabase
          .from("user_requests")
          .select("*", { count: "exact", head: true })
          .eq("seller_id", user.id)
          .eq("request_type", "get_quote");
        setQuoteRequestsCount(count || 0);
      } catch (error) {
        console.error("Error fetching quote requests count:", error);
      }
    };
    fetchQuoteRequestsCount();
  }, [user?.id]);

  const filteredLeads = leads.filter((lead) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      lead.buyer_name?.toLowerCase().includes(q) ||
      lead.buyer_company?.toLowerCase().includes(q) ||
      lead.item_name?.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Filter aggregated views by product name only (no user info filtering)
  const filteredViews = aggregatedViews.filter((view) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || view.item_name?.toLowerCase().includes(q);
    return matchesSearch;
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
        setViewTab("leads");
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

  const handleSaveNotes = async () => {
    if (!selectedLead) return;
    await updateLeadNotes(selectedLead.id, notes);
    await addActivity(selectedLead.id, "note", "Note Added", notes);
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

  const handleSendQuotation = async () => {
    if (!selectedLead || quotationItems.length === 0) return;

    setSendingQuotation(true);
    try {
      const items = quotationItems.map((item) => ({
        name: item.name || selectedLead.item_name || "Product",
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.quantity * item.unit_price,
      }));

      const subtotal = items.reduce((sum, item) => sum + item.total, 0);
      const discountAmount = quotationDiscount;
      const afterDiscount = subtotal - discountAmount;
      const taxAmount = afterDiscount * (quotationTaxRate / 100);
      const totalAmount = afterDiscount + taxAmount;

      const validityDate = new Date();
      validityDate.setDate(validityDate.getDate() + quotationValidity);

      await createInvoice({
        buyer_name: selectedLead.buyer_name || "",
        buyer_email: selectedLead.buyer_email,
        buyer_phone: selectedLead.buyer_phone,
        buyer_company: selectedLead.buyer_company,
        lead_id: selectedLead.id,
        items,
        subtotal,
        tax_rate: quotationTaxRate,
        tax_amount: taxAmount,
        discount_amount: discountAmount,
        total_amount: totalAmount,
        notes: quotationNotes
          ? `${quotationNotes}\n\nValid until: ${format(validityDate, "PPP")}`
          : `Valid until: ${format(validityDate, "PPP")}`,
        status: "sent",
        due_date: validityDate.toISOString(),
      });

      await updateLeadStatus(selectedLead.id, "quoted");
      await addActivity(
        selectedLead.id,
        "invoice_sent",
        "Quotation Sent",
        `Quotation of ₹${totalAmount.toLocaleString()} sent (Valid for ${quotationValidity} days)`,
      );

      setShowQuotationModal(false);
      setQuotationItems([{ name: "", quantity: 1, unit_price: 0 }]);
      setQuotationNotes("");
      setQuotationDiscount(0);
      setQuotationTaxRate(18);
      setQuotationValidity(7);

      toast({
        title: "Quotation sent",
        description: "Quotation has been created and sent successfully",
      });
    } catch (error) {
      console.error("Error sending quotation:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send quotation",
      });
    } finally {
      setSendingQuotation(false);
    }
  };

  const openLeadDetails = (lead: Lead) => {
    setSelectedLead(lead);
    setNotes(lead.notes || "");
    setLeadActivities(activities.filter((a) => a.lead_id === lead.id));
    setShowDetailView(true);
  };

  const openFollowUp = (lead: Lead) => {
    setSelectedLead(lead);
    setShowFollowUpModal(true);
  };

  const openQuotation = (lead: Lead) => {
    setSelectedLead(lead);
    // Auto-fill with product details
    const productName = lead.item_name || "";
    const productBrand = lead.product_brand ? `${lead.product_brand} ` : "";
    const productModel = lead.product_model ? `(${lead.product_model})` : "";
    const fullProductName = `${productBrand}${productName} ${productModel}`.trim();

    setQuotationItems([
      {
        name: fullProductName || "Product",
        quantity: 1,
        unit_price: lead.product_price || lead.expected_value || 0,
      },
    ]);
    setQuotationDiscount(0);
    setQuotationTaxRate(18);
    setQuotationValidity(7);
    setQuotationNotes("");
    setShowQuotationModal(true);
  };

  return (
    <div className="space-y-4 p-6">
      <StatsHeader
        viewsCount={productViews.length}
        leadsCount={leads.length}
        unlockedCount={leads.filter((l) => l.is_unlocked).length}
        creditsBalance={creditsBalance}
        quoteRequestsCount={quoteRequestsCount}
      />

      <Card className="border-muted/70 bg-background">
        <div className="p-4 pb-2">
          <LeadsToolbar
            viewTab={viewTab}
            setViewTab={setViewTab}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            leadsCount={leads.length}
            viewsCount={aggregatedViews.length}
            quoteRequestsCount={quoteRequestsCount}
            viewMode={viewMode}
            setViewMode={setViewMode}
          />
        </div>
        <Separator />

        <div className="p-4 pt-3">
          {viewTab === "quotes" ? (
            <QuoteRequestsSection sellerId={user?.id || ""} itemType={itemType} />
          ) : viewTab === "all" ? (
            filteredViews.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-sm">
                <Eye className="mb-3 h-10 w-10 text-muted-foreground" />
                <p className="font-medium">No views yet</p>
                <p className="max-w-sm text-xs text-muted-foreground">
                  Views will appear here when buyers start interacting with your listed products.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredViews.map((view) => (
                  <AggregatedViewRow
                    key={view.key}
                    view={view}
                    onConvertToLead={handleConvertToLead}
                    isConverting={convertingId !== null}
                    convertingId={convertingId}
                  />
                ))}
              </div>
            )
          ) : viewTab === "leads" && viewMode === "pipeline" ? (
            <LeadsPipeline leads={filteredLeads} onStatusChange={updateLeadStatus} onLeadClick={openLeadDetails} />
          ) : filteredLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-sm">
              <User className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="font-medium">No leads found</p>
              <p className="max-w-sm text-xs text-muted-foreground">
                Leads will appear here as soon as buyers submit interest on your products.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredLeads.map((lead) => (
                <LeadRow
                  key={lead.id}
                  lead={lead}
                  creditsBalance={creditsBalance}
                  onUnlock={handleUnlock}
                  unlockingId={unlocking}
                  onStartChat={handleStartChat}
                  onWhatsApp={handleWhatsApp}
                  onEmail={handleEmail}
                  onCall={handleCall}
                  onStatusChange={updateLeadStatus}
                  onOpenDetails={openLeadDetails}
                  onOpenFollowUp={openFollowUp}
                  onOpenQuotation={openQuotation}
                  onRowClick={openLeadDetails} // CLICK ROW => open details
                />
              ))}
            </div>
          )}
        </div>
      </Card>

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

      {/* Follow-up modal */}
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

      {/* Quotation modal */}
      <Dialog open={showQuotationModal} onOpenChange={setShowQuotationModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <FileSpreadsheet className="h-5 w-5" />
              Send quotation
            </DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-4 py-2">
              {/* Buyer & Product Info */}
              <div className="rounded-md bg-muted p-3 text-xs space-y-1">
                <p>
                  <span className="font-medium">To:</span> {selectedLead.buyer_name}
                </p>
                <p>
                  <span className="font-medium">Company:</span> {selectedLead.buyer_company || "Not provided"}
                </p>
                <p>
                  <span className="font-medium">Email:</span> {selectedLead.buyer_email || "Not available"}
                </p>
                <Separator className="my-2" />
                <p>
                  <span className="font-medium">Product:</span> {selectedLead.item_name}
                </p>
                {selectedLead.product_brand && (
                  <p>
                    <span className="font-medium">Brand:</span> {selectedLead.product_brand}
                  </p>
                )}
                {selectedLead.product_model && (
                  <p>
                    <span className="font-medium">Model:</span> {selectedLead.product_model}
                  </p>
                )}
                {selectedLead.product_price && (
                  <p>
                    <span className="font-medium">Listed Price:</span> ₹{selectedLead.product_price.toLocaleString()}
                  </p>
                )}
                {selectedLead.viewed_at && (
                  <p>
                    <span className="font-medium">Viewed on:</span>{" "}
                    {format(new Date(selectedLead.viewed_at), "PPP 'at' p")}
                  </p>
                )}
              </div>

              {/* Line items */}
              <div className="space-y-3">
                <label className="text-xs font-medium text-muted-foreground">Line items</label>
                {quotationItems.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-center">
                    <Input
                      placeholder="Item name"
                      value={item.name}
                      onChange={(e) => {
                        const next = [...quotationItems];
                        next[index].name = e.target.value;
                        setQuotationItems(next);
                      }}
                      className="col-span-5"
                    />
                    <Input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => {
                        const next = [...quotationItems];
                        next[index].quantity = parseInt(e.target.value) || 1;
                        setQuotationItems(next);
                      }}
                      className="col-span-2"
                    />
                    <Input
                      type="number"
                      placeholder="Unit Price (₹)"
                      value={item.unit_price}
                      onChange={(e) => {
                        const next = [...quotationItems];
                        next[index].unit_price = parseFloat(e.target.value) || 0;
                        setQuotationItems(next);
                      }}
                      className="col-span-3"
                    />
                    <div className="col-span-2 text-right text-xs font-medium">
                      ₹{(item.quantity * item.unit_price).toLocaleString()}
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setQuotationItems([...quotationItems, { name: "", quantity: 1, unit_price: 0 }])}
                >
                  + Add item
                </Button>
              </div>

              {/* Discount, Tax, Validity */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Discount (₹)</label>
                  <Input
                    type="number"
                    value={quotationDiscount}
                    onChange={(e) => setQuotationDiscount(parseFloat(e.target.value) || 0)}
                    min={0}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Tax Rate (%)</label>
                  <Input
                    type="number"
                    value={quotationTaxRate}
                    onChange={(e) => setQuotationTaxRate(parseFloat(e.target.value) || 0)}
                    min={0}
                    max={100}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Validity (days)</label>
                  <Input
                    type="number"
                    value={quotationValidity}
                    onChange={(e) => setQuotationValidity(parseInt(e.target.value) || 7)}
                    min={1}
                  />
                </div>
              </div>

              {/* Summary */}
              <div className="rounded-md bg-muted p-3 text-xs">
                {(() => {
                  const subtotal = quotationItems.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);
                  const afterDiscount = subtotal - quotationDiscount;
                  const taxAmount = afterDiscount * (quotationTaxRate / 100);
                  const total = afterDiscount + taxAmount;
                  const validityDate = new Date();
                  validityDate.setDate(validityDate.getDate() + quotationValidity);

                  return (
                    <>
                      <div className="flex items-center justify-between">
                        <span>Subtotal</span>
                        <span>₹{subtotal.toLocaleString()}</span>
                      </div>
                      {quotationDiscount > 0 && (
                        <div className="flex items-center justify-between text-green-600">
                          <span>Discount</span>
                          <span>- ₹{quotationDiscount.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span>Tax ({quotationTaxRate}%)</span>
                        <span>₹{taxAmount.toLocaleString()}</span>
                      </div>
                      <Separator className="my-2" />
                      <div className="flex items-center justify-between font-medium text-sm">
                        <span>Total</span>
                        <span>₹{total.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground mt-2">
                        <span>Valid until</span>
                        <span>{format(validityDate, "PPP")}</span>
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Notes to buyer</label>
                <Textarea
                  value={quotationNotes}
                  onChange={(e) => setQuotationNotes(e.target.value)}
                  placeholder="Additional terms or clarifications for this quotation…"
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowQuotationModal(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSendQuotation} disabled={sendingQuotation}>
              {sendingQuotation ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Send quotation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeadsManager;
