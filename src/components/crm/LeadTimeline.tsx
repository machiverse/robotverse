import { useState, useEffect } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Phone,
  Mail,
  Calendar,
  FileText,
  Clock,
  TrendingUp,
  MessageSquare,
  User,
  Eye,
  Send,
  CheckCircle,
  XCircle,
  FileSpreadsheet,
  DollarSign,
  Loader2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { supabase } from "@/integrations/supabase/client";
import type { LeadActivity } from "@/hooks/useSellerCRM";
import type { CRMQuotation, QuotationItem } from "@/hooks/useCRM";

interface TimelineEvent {
  id: string;
  type: "activity" | "quotation" | "lead_created" | "status_change";
  timestamp: string;
  title: string;
  description?: string;
  icon: React.ReactNode;
  iconColor: string;
  metadata?: Record<string, any>;
}

interface LeadTimelineProps {
  leadId: string;
  sellerId: string;
  activities: LeadActivity[];
  leadCreatedAt: string;
  leadSource?: string;
}

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  call: <Phone className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  meeting: <Calendar className="h-4 w-4" />,
  note: <FileText className="h-4 w-4" />,
  follow_up: <Clock className="h-4 w-4" />,
  invoice_sent: <FileSpreadsheet className="h-4 w-4" />,
  status_change: <TrendingUp className="h-4 w-4" />,
  chat: <MessageSquare className="h-4 w-4" />,
};

const ACTIVITY_COLORS: Record<string, string> = {
  call: "bg-success/10 text-success dark:bg-success/30",
  email: "bg-primary/10 text-primary dark:bg-primary/30",
  meeting: "bg-primary/10 text-primary dark:bg-primary/30",
  note: "bg-slate-100 text-slate-600 dark:bg-slate-800",
  follow_up: "bg-amber-100 text-amber-600 dark:bg-amber-900/30",
  invoice_sent: "bg-success/10 text-success dark:bg-success/30",
  status_change: "bg-primary/10 text-primary dark:bg-primary/30",
  chat: "bg-primary/10 text-primary dark:bg-primary/30",
};

const QUOTATION_STATUS_ICONS: Record<string, React.ReactNode> = {
  draft: <FileText className="h-4 w-4" />,
  sent: <Send className="h-4 w-4" />,
  viewed: <Eye className="h-4 w-4" />,
  accepted: <CheckCircle className="h-4 w-4" />,
  rejected: <XCircle className="h-4 w-4" />,
};

const LeadTimeline = ({ leadId, sellerId, activities, leadCreatedAt, leadSource }: LeadTimelineProps) => {
  const [quotations, setQuotations] = useState<CRMQuotation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuotations();
  }, [leadId, sellerId]);

  const fetchQuotations = async () => {
    try {
      const { data, error } = await supabase
        .from("crm_quotations")
        .select("*")
        .eq("lead_id", leadId)
        .eq("seller_id", sellerId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mapped = (data || []).map((q) => ({
        ...q,
        items: (q.items as unknown as QuotationItem[]) || [],
      })) as CRMQuotation[];

      setQuotations(mapped);
    } catch (error) {
      console.error("Error fetching quotations:", error);
    } finally {
      setLoading(false);
    }
  };

  // Build timeline events
  const buildTimeline = (): TimelineEvent[] => {
    const events: TimelineEvent[] = [];

    // Add lead created event
    events.push({
      id: "lead_created",
      type: "lead_created",
      timestamp: leadCreatedAt,
      title: "Lead Created",
      description: leadSource ? `Source: ${formatSource(leadSource)}` : undefined,
      icon: <User className="h-4 w-4" />,
      iconColor: "bg-primary/10 text-primary",
    });

    // Add activities
    activities.forEach((activity) => {
      events.push({
        id: `activity_${activity.id}`,
        type: "activity",
        timestamp: activity.created_at,
        title: activity.title,
        description: activity.description || undefined,
        icon: ACTIVITY_ICONS[activity.activity_type] || <FileText className="h-4 w-4" />,
        iconColor: ACTIVITY_COLORS[activity.activity_type] || ACTIVITY_COLORS.note,
        metadata: { activity_type: activity.activity_type },
      });
    });

    // Add quotation events
    quotations.forEach((quotation) => {
      // Quotation created
      events.push({
        id: `quotation_${quotation.id}`,
        type: "quotation",
        timestamp: quotation.created_at,
        title: `Quotation Created: ${quotation.quotation_number}`,
        description: `Amount: ₹${quotation.total_amount.toLocaleString()}`,
        icon: <FileSpreadsheet className="h-4 w-4" />,
        iconColor: "bg-primary/10 text-primary dark:bg-primary/30",
        metadata: { quotation_number: quotation.quotation_number, amount: quotation.total_amount },
      });

      // Quotation sent
      if (quotation.sent_at) {
        events.push({
          id: `quotation_sent_${quotation.id}`,
          type: "quotation",
          timestamp: quotation.sent_at,
          title: `Quotation Sent: ${quotation.quotation_number}`,
          icon: <Send className="h-4 w-4" />,
          iconColor: "bg-primary/10 text-primary dark:bg-primary/30",
        });
      }

      // Quotation viewed
      if (quotation.viewed_at) {
        events.push({
          id: `quotation_viewed_${quotation.id}`,
          type: "quotation",
          timestamp: quotation.viewed_at,
          title: `Quotation Viewed: ${quotation.quotation_number}`,
          icon: <Eye className="h-4 w-4" />,
          iconColor: "bg-primary/10 text-primary dark:bg-primary/30",
        });
      }

      // Quotation accepted
      if (quotation.accepted_at) {
        events.push({
          id: `quotation_accepted_${quotation.id}`,
          type: "quotation",
          timestamp: quotation.accepted_at,
          title: `Quotation Accepted: ${quotation.quotation_number}`,
          description: `Deal value: ₹${quotation.total_amount.toLocaleString()}`,
          icon: <CheckCircle className="h-4 w-4" />,
          iconColor: "bg-success/10 text-success dark:bg-success/30",
        });
      }

      // Quotation rejected
      if (quotation.rejected_at) {
        events.push({
          id: `quotation_rejected_${quotation.id}`,
          type: "quotation",
          timestamp: quotation.rejected_at,
          title: `Quotation Rejected: ${quotation.quotation_number}`,
          description: quotation.rejection_reason || undefined,
          icon: <XCircle className="h-4 w-4" />,
          iconColor: "bg-destructive/10 text-destructive",
        });
      }
    });

    // Sort by timestamp descending (newest first)
    return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  const formatSource = (source: string) => {
    const sources: Record<string, string> = {
      product_view: "Product View",
      inquiry: "Inquiry",
      quote_request: "Quote Request",
      campaign: "Campaign",
      chat: "Chat",
      button_click: "Product Inquiry",
      view: "Product View",
    };
    return sources[source] || source.charAt(0).toUpperCase() + source.slice(1).replace(/_/g, " ");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const timelineEvents = buildTimeline();

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Complete Timeline</h3>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

        <div className="space-y-4">
          {timelineEvents.map((event, index) => (
            <div key={event.id} className="relative flex gap-4 pl-0">
              {/* Icon */}
              <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${event.iconColor}`}>
                {event.icon}
              </div>

              {/* Content */}
              <div className="flex-1 pt-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm">{event.title}</p>
                    {event.description && (
                      <p className="text-sm text-muted-foreground mt-0.5">{event.description}</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(event.timestamp), "dd MMM yyyy, h:mm a")}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LeadTimeline;
