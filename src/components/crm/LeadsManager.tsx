import { useState, Fragment } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useSellerCRM, type Lead, type LeadActivity, type ProductView } from "@/hooks/useSellerCRM";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import LeadDetailView from "./LeadDetailView";

interface LeadsManagerProps {
  sellerId: string;
  itemType?: string;
  readOnly?: boolean; // controls lock from parent
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
}: {
  viewsCount: number;
  leadsCount: number;
  unlockedCount: number;
  creditsBalance: number;
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

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
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
  isLocked,
}: {
  viewTab: string;
  setViewTab: (v: string) => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  leadsCount: number;
  viewsCount: number;
  isLocked: boolean;
}) => (
  <div className="mb-4 space-y-3">
    <Tabs value={viewTab} onValueChange={isLocked ? () => {} : setViewTab} className="w-full">
      <TabsList className="mb-2">
        <TabsTrigger value="all" className="flex items-center gap-2">
          <Eye className="h-4 w-4" />
          Product views ({viewsCount})
        </TabsTrigger>
        <TabsTrigger value="leads" className="flex items-center gap-2">
          <User className="h-4 w-4" />
          Leads ({leadsCount})
        </TabsTrigger>
      </TabsList>
    </Tabs>

    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
        <Input
          placeholder="Search by name, company, or product…"
          value={searchQuery}
          onChange={(e) => !isLocked && setSearchQuery(e.target.value)}
          className="pl-9"
          disabled={isLocked}
        />
      </div>
      {viewTab === "leads" && (
        <Select
          value={statusFilter}
          onValueChange={isLocked ? () => {} : setStatusFilter}
          disabled={isLocked}
        >
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
  </div>
);

/* ---------- ROW COMPONENTS ---------- */

interface ProductViewRowProps {
  view: ProductView;
  onConvertToLead: (viewId: string) => Promise<void>;
  isConverting: boolean;
  convertingId: string | null;
  isLocked: boolean;
}

const ProductViewRow = ({ view, onConvertToLead, isConverting, convertingId, isLocked }: ProductViewRowProps) => {
  const isCurrentlyConverting = convertingId === view.id;

  return (
    <div
      className={`border-muted/60 bg-card hover:bg-accent/40 flex items-center justify-between rounded-md border p-4 transition-colors ${
        isLocked ? "opacity-60" : ""
      }`}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div className="mt-1 rounded-full bg-blue-100 p-1.5 dark:bg-blue-900/30">
          <Eye className="h-4 w-4 text-blue-600" />
        </div>
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-medium">{view.user_name || "Anonymous user"}</p>
            {view.user_company && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Building2 className="h-3 w-3" />
                {view.user_company}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {view.user_mobile || "Not provided"}
            </span>
            <span className="inline-flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {view.user_email || "Not provided"}
            </span>
            {view.user_location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {view.user_location}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Package className="h-3 w-3" />
              <span className="font-medium text-foreground">{view.item_name || "Unknown product"}</span>
            </span>
            {view.item_type && (
              <Badge variant="outline" className="capitalize">
                {view.item_type}
              </Badge>
            )}
            {view.button_name && (
              <Badge variant="secondary" className="text-[10px]">
                {view.button_name}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="ml-4 flex flex-col items-end gap-2">
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {formatDistanceToNow(new Date(view.created_at), { addSuffix: true })}
        </span>
        <Button
          size="sm"
          variant="default"
          onClick={isLocked ? undefined : () => onConvertToLead(view.id)}
          disabled={isLocked || isConverting || isCurrentlyConverting}
          className="h-8 text-xs"
        >
          {isCurrentlyConverting ? (
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          ) : (
            <User className="mr-1 h-3 w-3" />
          )}
          Convert to Lead
        </Button>
      </div>
    </div>
  );
};

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface LeadsTableProps {
  leads: Lead[];
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
  isLocked: boolean;
}

const LeadsTable = ({
  leads,
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
  isLocked,
}: LeadsTableProps) => {
  return (
    <div className="overflow-x-auto rounded-md border border-muted/60">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead className="font-semibold">Company Name</TableHead>
            <TableHead className="font-semibold">Contact Person</TableHead>
            <TableHead className="font-semibold">Mobile Number</TableHead>
            <TableHead className="font-semibold">Email ID</TableHead>
            <TableHead className="font-semibold">Location</TableHead>
            <TableHead className="font-semibold">Product</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => {
            const statusConfig = STATUS_CONFIG[lead.status];
            const creditsNeeded = getCreditsNeeded(lead.item_type);
            const canUnlock = creditsBalance >= creditsNeeded;

            return (
              <TableRow
                key={lead.id}
                className={`hover:bg-accent/40 ${isLocked ? "opacity-60" : ""}`}
              >
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    {lead.is_unlocked ? (lead.buyer_company || "Not provided") : "XXXXX"}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    {lead.is_unlocked ? (lead.buyer_name || "Not provided") : "XXXXX"}
                  </div>
                </TableCell>
                <TableCell>
                  {lead.is_unlocked && lead.buyer_phone ? (
                    <button
                      onClick={() => !isLocked && onCall(lead)}
                      className="flex items-center gap-2 text-primary hover:underline"
                      disabled={isLocked}
                    >
                      <Phone className="h-4 w-4" />
                      {lead.buyer_phone}
                    </button>
                  ) : (
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      {lead.is_unlocked ? "Not provided" : "XXXXX"}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {lead.is_unlocked && lead.buyer_email ? (
                    <button
                      onClick={() => !isLocked && onEmail(lead)}
                      className="flex items-center gap-2 text-primary hover:underline"
                      disabled={isLocked}
                    >
                      <Mail className="h-4 w-4" />
                      {lead.buyer_email}
                    </button>
                  ) : (
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      {lead.is_unlocked ? "Not provided" : "XXXXX"}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    {lead.is_unlocked ? (lead.buyer_location || "Not provided") : "XXXXX"}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-sm">{lead.item_name || "Unknown"}</span>
                    <Badge variant="outline" className="w-fit capitalize text-xs">
                      {lead.item_type}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={`${statusConfig.bg} ${statusConfig.color} border-0`}>
                    {statusConfig.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-1">
                    {lead.is_unlocked ? (
                      <>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => !isLocked && onStartChat(lead)}
                          disabled={isLocked}
                          className="h-8 w-8"
                          title="Start Chat"
                        >
                          <MessageSquare className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => !isLocked && onWhatsApp(lead)}
                          disabled={isLocked || !lead.buyer_phone}
                          className="h-8 w-8"
                          title="WhatsApp"
                        >
                          <MessageCircle className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => !isLocked && onEmail(lead)}
                          disabled={isLocked || !lead.buyer_email}
                          className="h-8 w-8"
                          title="Send Email"
                        >
                          <Mail className="h-4 w-4 text-purple-600" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => !isLocked && onCall(lead)}
                          disabled={isLocked || !lead.buyer_phone}
                          className="h-8 w-8"
                          title="Call"
                        >
                          <Phone className="h-4 w-4 text-orange-600" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isLocked}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuItem onClick={() => !isLocked && onOpenDetails(lead)}>
                              <FileText className="mr-2 h-4 w-4" />
                              View full details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => !isLocked && onOpenFollowUp(lead)}>
                              <Calendar className="mr-2 h-4 w-4" />
                              Schedule follow-up
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => !isLocked && onOpenQuotation(lead)}>
                              <FileSpreadsheet className="mr-2 h-4 w-4" />
                              Send quotation
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <div className="px-2 py-1.5 text-xs text-muted-foreground">Change status</div>
                            {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                              <DropdownMenuItem
                                key={status}
                                disabled={isLocked || lead.status === status}
                                onClick={() => !isLocked && onStatusChange(lead.id, status as Lead["status"])}
                              >
                                <span className={`mr-2 h-2 w-2 rounded-full ${config.bg}`} />
                                {config.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant={canUnlock ? "default" : "outline"}
                        onClick={() => !isLocked && onUnlock(lead)}
                        disabled={isLocked || !canUnlock || unlockingId === lead.id}
                        className="h-8 text-xs"
                      >
                        {unlockingId === lead.id ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <Unlock className="mr-1 h-3 w-3" />
                        )}
                        Unlock ({creditsNeeded} credits)
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

/* ---------- MAIN COMPONENT ---------- */

const LeadsManager = ({ sellerId, itemType, readOnly }: LeadsManagerProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const {
    leads,
    productViews,
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
  const [sendingQuotation, setSendingQuotation] = useState(false);

  // single flag to lock all interactions
  const [isLocked] = useState<boolean>(!!readOnly);

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

  const filteredViews = productViews.filter((view) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      view.user_name?.toLowerCase().includes(q) ||
      view.user_company?.toLowerCase().includes(q) ||
      view.item_name?.toLowerCase().includes(q);
    return matchesSearch;
  });

  const handleUnlock = async (lead: Lead) => {
    if (isLocked) return;
    setUnlocking(lead.id);
    await unlockBuyerInfo(lead.id, lead.item_type);
    setUnlocking(null);
  };

  const handleConvertToLead = async (viewId: string) => {
    if (isLocked) return;
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
    if (isLocked) return;
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
    if (isLocked) return;
    if (!selectedLead) return;
    await updateLeadNotes(selectedLead.id, notes);
    await addActivity(selectedLead.id, "note", "Note Added", notes);
  };

  const handleStartChat = async (lead: Lead) => {
    if (isLocked) return;

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
    if (isLocked) return;
    if (!lead.is_unlocked || !lead.buyer_phone) return;
    const phone = lead.buyer_phone.replace(/\D/g, "");
    const message = encodeURIComponent(
      `Hi ${lead.buyer_name}, I'm reaching out regarding your inquiry about ${lead.item_name}. How can I help you?`,
    );
    window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
    addActivity(lead.id, "call", "WhatsApp Sent", "Contacted via WhatsApp");
  };

  const handleEmail = (lead: Lead) => {
    if (isLocked) return;
    if (!lead.is_unlocked || !lead.buyer_email) return;
    const subject = encodeURIComponent(`Regarding your inquiry: ${lead.item_name}`);
    const body = encodeURIComponent(
      `Dear ${lead.buyer_name},\n\nThank you for your interest in ${lead.item_name}.\n\nPlease let me know how I can assist you further.\n\nBest regards`,
    );
    window.open(`mailto:${lead.buyer_email}?subject=${subject}&body=${body}`, "_blank");
    addActivity(lead.id, "email", "Email Sent", `Sent email to ${lead.buyer_email}`);
  };

  const handleCall = (lead: Lead) => {
    if (isLocked) return;
    if (!lead.is_unlocked || !lead.buyer_phone) return;
    window.open(`tel:${lead.buyer_phone}`, "_blank");
    addActivity(lead.id, "call", "Phone Call Made", `Called ${lead.buyer_phone}`);
  };

  const handleSendQuotation = async () => {
    if (isLocked) return;
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
        notes: quotationNotes,
        status: "sent",
      });

      await updateLeadStatus(selectedLead.id, "quoted");
      await addActivity(
        selectedLead.id,
        "invoice_sent",
        "Quotation Sent",
        `Quotation of ₹${totalAmount.toLocaleString()} sent`,
      );

      setShowQuotationModal(false);
      setQuotationItems([{ name: "", quantity: 1, unit_price: 0 }]);
      setQuotationNotes("");

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
    if (isLocked) return;
    setSelectedLead(lead);
    setNotes(lead.notes || "");
    setLeadActivities(activities.filter((a) => a.lead_id === lead.id));
    setShowDetailView(true);
  };

  const openFollowUp = (lead: Lead) => {
    if (isLocked) return;
    setSelectedLead(lead);
    setShowFollowUpModal(true);
  };

  const openQuotation = (lead: Lead) => {
    if (isLocked) return;
    setSelectedLead(lead);
    setQuotationItems([
      {
        name: lead.item_name || "",
        quantity: 1,
        unit_price: lead.expected_value || 0,
      },
    ]);
    setShowQuotationModal(true);
  };

  return (
    <div className="space-y-4 p-6">
      <StatsHeader
        viewsCount={productViews.length}
        leadsCount={leads.length}
        unlockedCount={leads.filter((l) => l.is_unlocked).length}
        creditsBalance={creditsBalance}
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
            viewsCount={productViews.length}
            isLocked={isLocked}
          />
        </div>
        <Separator />

        <div className="p-4 pt-3">
          {viewTab === "all" ? (
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
                  <ProductViewRow
                    key={view.id}
                    view={view}
                    onConvertToLead={handleConvertToLead}
                    isConverting={convertingId !== null}
                    convertingId={convertingId}
                    isLocked={isLocked}
                  />
                ))}
              </div>
            )
          ) : filteredLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-sm">
              <User className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="font-medium">No leads found</p>
              <p className="max-w-sm text-xs text-muted-foreground">
                Leads will appear here as soon as buyers submit interest on your products.
              </p>
            </div>
          ) : (
            <LeadsTable
              leads={filteredLeads}
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
              isLocked={isLocked}
            />
          )}
        </div>
      </Card>

      {showDetailView && selectedLead && !isLocked && (
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
      <Dialog
        open={showFollowUpModal && !isLocked}
        onOpenChange={(open) => !isLocked && setShowFollowUpModal(open)}
      >
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
                onChange={(e) => !isLocked && setFollowUpDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                disabled={isLocked}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Notes (optional)</label>
              <Textarea
                value={followUpNote}
                onChange={(e) => !isLocked && setFollowUpNote(e.target.value)}
                placeholder="Add internal notes for this follow-up…"
                rows={3}
                disabled={isLocked}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFollowUpModal(false)}
              disabled={isLocked}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleScheduleFollowUp}
              disabled={isLocked || !followUpDate}
            >
              <Calendar className="mr-2 h-4 w-4" />
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quotation modal */}
      <Dialog
        open={showQuotationModal && !isLocked}
        onOpenChange={(open) => !isLocked && setShowQuotationModal(open)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <FileSpreadsheet className="h-5 w-5" />
              Send quotation
            </DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-4 py-2">
              <div className="rounded-md bg-muted p-3 text-xs">
                <p>
                  <span className="font-medium">To:</span> {selectedLead.buyer_name}
                </p>
                <p>
                  <span className="font-medium">Email:</span> {selectedLead.buyer_email || "Not available"}
                </p>
                <p>
                  <span className="font-medium">Product:</span> {selectedLead.item_name}
                </p>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-medium text-muted-foreground">Line items</label>
                {quotationItems.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2">
                    <Input
                      placeholder="Item name"
                      value={item.name}
                      onChange={(e) => {
                        if (isLocked) return;
                        const next = [...quotationItems];
                        next[index].name = e.target.value;
                        setQuotationItems(next);
                      }}
                      className="col-span-6"
                      disabled={isLocked}
                    />
                    <Input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => {
                        if (isLocked) return;
                        const next = [...quotationItems];
                        next[index].quantity = parseInt(e.target.value) || 1;
                        setQuotationItems(next);
                      }}
                      className="col-span-2"
                      disabled={isLocked}
                    />
                    <Input
                      type="number"
                      placeholder="Price"
                      value={item.unit_price}
                      onChange={(e) => {
                        if (isLocked) return;
                        const next = [...quotationItems];
                        next[index].unit_price = parseFloat(e.target.value) || 0;
                        setQuotationItems(next);
                      }}
                      className="col-span-4"
                      disabled={isLocked}
                    />
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    !isLocked &&
                    setQuotationItems([...quotationItems, { name: "", quantity: 1, unit_price: 0 }])
                  }
                  disabled={isLocked}
                >
                  + Add item
                </Button>
              </div>

              <div className="rounded-md bg-muted p-3 text-xs">
                {(() => {
                  const subtotal = quotationItems.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);
                  const gst = subtotal * 0.18;
                  const total = subtotal + gst;
                  return (
                    <>
                      <div className="flex items-center justify-between">
                        <span>Subtotal</span>
                        <span>₹{subtotal.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>GST (18%)</span>
                        <span>₹{gst.toLocaleString()}</span>
                      </div>
                      <Separator className="my-2" />
                      <div className="flex items-center justify-between font-medium">
                        <span>Total</span>
                        <span>₹{total.toLocaleString()}</span>
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Notes to buyer</label>
                <Textarea
                  value={quotationNotes}
                  onChange={(e) => !isLocked && setQuotationNotes(e.target.value)}
                  placeholder="Additional terms or clarifications for this quotation…"
                  rows={3}
                  disabled={isLocked}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowQuotationModal(false)}
              disabled={isLocked}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSendQuotation}
              disabled={isLocked || sendingQuotation}
            >
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

export default LeadsManager;
