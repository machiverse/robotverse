import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Clock, Phone, Mail, CheckCircle, AlertTriangle, Bell, User } from "lucide-react";
import { useSellerCRM, type Lead } from "@/hooks/useSellerCRM";
import { format, isToday, isPast, isTomorrow, differenceInDays } from "date-fns";

interface FollowUpRemindersProps {
  sellerId: string;
}

const FollowUpReminders = ({ sellerId }: FollowUpRemindersProps) => {
  const { leads, updateLeadStatus, addActivity } = useSellerCRM();

  const leadsWithFollowUp = leads
    .filter((lead) => lead.next_follow_up)
    .sort((a, b) => new Date(a.next_follow_up!).getTime() - new Date(b.next_follow_up!).getTime());

  const overdueLeads = leadsWithFollowUp.filter(
    (l) => l.next_follow_up && isPast(new Date(l.next_follow_up)) && !isToday(new Date(l.next_follow_up)),
  );
  const todayLeads = leadsWithFollowUp.filter((l) => l.next_follow_up && isToday(new Date(l.next_follow_up)));
  const tomorrowLeads = leadsWithFollowUp.filter((l) => l.next_follow_up && isTomorrow(new Date(l.next_follow_up)));
  const upcomingLeads = leadsWithFollowUp.filter(
    (l) =>
      l.next_follow_up &&
      !isPast(new Date(l.next_follow_up)) &&
      !isToday(new Date(l.next_follow_up)) &&
      !isTomorrow(new Date(l.next_follow_up)),
  );

  const handleMarkComplete = async (lead: Lead) => {
    await addActivity(
      lead.id,
      "follow_up",
      "Follow-up completed",
      `Completed follow-up scheduled for ${lead.next_follow_up}`,
    );

    if (lead.status === "new") {
      await updateLeadStatus(lead.id, "contacted");
    }
  };

  const renderLeadCard = (lead: Lead, urgency: "overdue" | "today" | "tomorrow" | "upcoming") => {
    const urgencyConfig = {
      overdue: {
        bg: "border-red-200 bg-red-50/60 dark:bg-red-950/20",
        badge: "bg-red-100 text-red-700",
        icon: AlertTriangle,
        label: "Overdue",
      },
      today: {
        bg: "border-orange-200 bg-orange-50/60 dark:bg-orange-950/20",
        badge: "bg-orange-100 text-orange-700",
        icon: Bell,
        label: "Today",
      },
      tomorrow: {
        bg: "border-yellow-200 bg-yellow-50/60 dark:bg-yellow-950/20",
        badge: "bg-yellow-100 text-yellow-700",
        icon: Clock,
        label: "Tomorrow",
      },
      upcoming: {
        bg: "border-primary/30 bg-primary/10/60 dark:bg-primary/20",
        badge: "bg-primary/10 text-primary",
        icon: Calendar,
        label: "Upcoming",
      },
    } as const;

    const config = urgencyConfig[urgency];
    const UrgencyIcon = config.icon;
    const daysUntil = lead.next_follow_up ? differenceInDays(new Date(lead.next_follow_up), new Date()) : 0;

    return (
      <Card key={lead.id} className={`${config.bg} border`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <UrgencyIcon
                  className={`h-4 w-4 ${
                    urgency === "overdue"
                      ? "text-red-600"
                      : urgency === "today"
                        ? "text-orange-600"
                        : "text-muted-foreground"
                  }`}
                />
                <span className="text-sm font-medium">{lead.is_unlocked ? lead.buyer_name : "XXXXX"}</span>
                <Badge className={`${config.badge} border-0 text-[11px]`}>
                  {urgency === "upcoming" && daysUntil > 1 ? `In ${daysUntil} days` : config.label}
                </Badge>
              </div>

              <p className="text-xs text-muted-foreground">{lead.item_name || "Unknown product"}</p>

              {lead.is_unlocked && (
                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {lead.buyer_phone}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {lead.buyer_email}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col items-end gap-2">
              <p className="text-xs text-muted-foreground">
                {lead.next_follow_up && format(new Date(lead.next_follow_up), "MMM d, yyyy")}
              </p>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleMarkComplete(lead)}>
                <CheckCircle className="mr-1 h-3 w-3" />
                Complete
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (leadsWithFollowUp.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <Calendar className="mb-2 h-10 w-10 text-muted-foreground" />
        <h3 className="text-base font-semibold">No follow-ups scheduled</h3>
        <p className="max-w-md text-sm text-muted-foreground">
          Schedule follow-ups from the Leads workspace. Any lead with a next follow-up date will appear here grouped by
          urgency.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {overdueLeads.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <h3 className="text-sm font-semibold text-red-600">Overdue follow-ups ({overdueLeads.length})</h3>
          </div>
          <div className="space-y-3">{overdueLeads.map((lead) => renderLeadCard(lead, "overdue"))}</div>
        </section>
      )}

      {todayLeads.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Bell className="h-5 w-5 text-orange-600" />
            <h3 className="text-sm font-semibold text-orange-600">Due today ({todayLeads.length})</h3>
          </div>
          <div className="space-y-3">{todayLeads.map((lead) => renderLeadCard(lead, "today"))}</div>
        </section>
      )}

      {tomorrowLeads.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-600" />
            <h3 className="text-sm font-semibold text-yellow-600">Due tomorrow ({tomorrowLeads.length})</h3>
          </div>
          <div className="space-y-3">{tomorrowLeads.map((lead) => renderLeadCard(lead, "tomorrow"))}</div>
        </section>
      )}

      {upcomingLeads.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <h3 className="text-sm font-semibold text-primary">Upcoming ({upcomingLeads.length})</h3>
          </div>
          <div className="space-y-3">{upcomingLeads.map((lead) => renderLeadCard(lead, "upcoming"))}</div>
        </section>
      )}
    </div>
  );
};

export default FollowUpReminders;
