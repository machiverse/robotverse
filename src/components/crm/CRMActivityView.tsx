import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Phone, Mail, MessageSquare, Calendar, FileText, Users } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import type { useCRM } from "@/hooks/useCRM";

interface CRMActivityViewProps {
  crmData: ReturnType<typeof useCRM>;
}

const ACTIVITY_ICONS: Record<string, any> = {
  call: Phone,
  email: Mail,
  whatsapp: MessageSquare,
  meeting: Calendar,
  quotation_sent: FileText,
  note: Activity,
  default: Activity,
};

const ACTIVITY_COLORS: Record<string, string> = {
  call: "bg-primary/10 text-primary",
  email: "bg-primary/10 text-primary",
  whatsapp: "bg-success/10 text-success",
  meeting: "bg-orange-100 text-orange-600",
  quotation_sent: "bg-primary/10 text-primary",
  note: "bg-gray-100 text-gray-600",
};

const CRMActivityView = ({ crmData }: CRMActivityViewProps) => {
  const { activityLogs } = crmData;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Activity Log</h2>

      <div className="space-y-3">
        {activityLogs.map((activity) => {
          const Icon = ACTIVITY_ICONS[activity.activity_type] || ACTIVITY_ICONS.default;
          const colorClass = ACTIVITY_COLORS[activity.activity_type] || ACTIVITY_COLORS.note;

          return (
            <Card key={activity.id}>
              <CardContent className="p-4 flex items-start gap-4">
                <div className={`rounded-full p-2 ${colorClass}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{activity.subject}</p>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(activity.logged_at), { addSuffix: true })}
                    </span>
                  </div>
                  {activity.description && (
                    <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="capitalize">{activity.activity_type}</Badge>
                    {activity.outcome && (
                      <Badge variant="secondary" className="capitalize">{activity.outcome}</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {activityLogs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Activity className="h-12 w-12 mb-2 opacity-50" />
            <p>No activity logged yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CRMActivityView;
