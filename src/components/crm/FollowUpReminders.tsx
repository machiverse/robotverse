import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Calendar, 
  Clock, 
  Phone, 
  Mail, 
  CheckCircle,
  AlertTriangle,
  Bell,
  User
} from 'lucide-react';
import { useSellerCRM, type Lead } from '@/hooks/useSellerCRM';
import { format, isToday, isPast, isTomorrow, differenceInDays } from 'date-fns';

interface FollowUpRemindersProps {
  sellerId: string;
}

const FollowUpReminders = ({ sellerId }: FollowUpRemindersProps) => {
  const { leads, updateLeadStatus, addActivity } = useSellerCRM();

  const leadsWithFollowUp = leads
    .filter(lead => lead.next_follow_up)
    .sort((a, b) => new Date(a.next_follow_up!).getTime() - new Date(b.next_follow_up!).getTime());

  const overdueLeads = leadsWithFollowUp.filter(l => 
    l.next_follow_up && isPast(new Date(l.next_follow_up)) && !isToday(new Date(l.next_follow_up))
  );
  const todayLeads = leadsWithFollowUp.filter(l => 
    l.next_follow_up && isToday(new Date(l.next_follow_up))
  );
  const tomorrowLeads = leadsWithFollowUp.filter(l => 
    l.next_follow_up && isTomorrow(new Date(l.next_follow_up))
  );
  const upcomingLeads = leadsWithFollowUp.filter(l => 
    l.next_follow_up && !isPast(new Date(l.next_follow_up)) && !isToday(new Date(l.next_follow_up)) && !isTomorrow(new Date(l.next_follow_up))
  );

  const handleMarkComplete = async (lead: Lead) => {
    await addActivity(
      lead.id,
      'follow_up',
      'Follow-up completed',
      `Completed follow-up scheduled for ${lead.next_follow_up}`,
      undefined,
      undefined
    );
    // Optionally update lead status
    if (lead.status === 'new') {
      await updateLeadStatus(lead.id, 'contacted');
    }
  };

  const renderLeadCard = (lead: Lead, urgency: 'overdue' | 'today' | 'tomorrow' | 'upcoming') => {
    const urgencyConfig = {
      overdue: { bg: 'border-red-200 bg-red-50/50 dark:bg-red-950/20', badge: 'bg-red-100 text-red-700', icon: AlertTriangle },
      today: { bg: 'border-orange-200 bg-orange-50/50 dark:bg-orange-950/20', badge: 'bg-orange-100 text-orange-700', icon: Bell },
      tomorrow: { bg: 'border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20', badge: 'bg-yellow-100 text-yellow-700', icon: Clock },
      upcoming: { bg: 'border-blue-200 bg-blue-50/50 dark:bg-blue-950/20', badge: 'bg-blue-100 text-blue-700', icon: Calendar }
    };

    const config = urgencyConfig[urgency];
    const UrgencyIcon = config.icon;
    const daysUntil = lead.next_follow_up ? differenceInDays(new Date(lead.next_follow_up), new Date()) : 0;

    return (
      <Card key={lead.id} className={`${config.bg} border`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <UrgencyIcon className={`w-4 h-4 ${urgency === 'overdue' ? 'text-red-600' : urgency === 'today' ? 'text-orange-600' : 'text-muted-foreground'}`} />
                <span className="font-medium">
                  {lead.is_unlocked ? lead.buyer_name : 'XXXXX'}
                </span>
                <Badge className={`${config.badge} border-0 text-xs`}>
                  {urgency === 'overdue' ? 'Overdue' : 
                   urgency === 'today' ? 'Today' : 
                   urgency === 'tomorrow' ? 'Tomorrow' : 
                   `In ${daysUntil} days`}
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground mb-2">
                {lead.item_name || 'Unknown Product'}
              </p>

              {lead.is_unlocked && (
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {lead.buyer_phone}
                  </span>
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {lead.buyer_email}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col items-end gap-2">
              <p className="text-xs text-muted-foreground">
                {lead.next_follow_up && format(new Date(lead.next_follow_up), 'MMM d, yyyy')}
              </p>
              <Button 
                size="sm" 
                variant="outline" 
                className="h-7 text-xs"
                onClick={() => handleMarkComplete(lead)}
              >
                <CheckCircle className="w-3 h-3 mr-1" />
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
      <div className="p-6 text-center py-12">
        <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No follow-ups scheduled</h3>
        <p className="text-muted-foreground">
          Schedule follow-ups from the Leads tab to see them here
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Overdue */}
      {overdueLeads.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h3 className="font-semibold text-red-600">Overdue ({overdueLeads.length})</h3>
          </div>
          <div className="space-y-3">
            {overdueLeads.map(lead => renderLeadCard(lead, 'overdue'))}
          </div>
        </div>
      )}

      {/* Today */}
      {todayLeads.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-5 h-5 text-orange-600" />
            <h3 className="font-semibold text-orange-600">Today ({todayLeads.length})</h3>
          </div>
          <div className="space-y-3">
            {todayLeads.map(lead => renderLeadCard(lead, 'today'))}
          </div>
        </div>
      )}

      {/* Tomorrow */}
      {tomorrowLeads.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-yellow-600" />
            <h3 className="font-semibold text-yellow-600">Tomorrow ({tomorrowLeads.length})</h3>
          </div>
          <div className="space-y-3">
            {tomorrowLeads.map(lead => renderLeadCard(lead, 'tomorrow'))}
          </div>
        </div>
      )}

      {/* Upcoming */}
      {upcomingLeads.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-blue-600">Upcoming ({upcomingLeads.length})</h3>
          </div>
          <div className="space-y-3">
            {upcomingLeads.map(lead => renderLeadCard(lead, 'upcoming'))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FollowUpReminders;