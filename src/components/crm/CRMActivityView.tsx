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
  note: "bg-muted text-muted-foreground",
};

const CRMActivityView = ({ crmData }: CRMActivityViewProps) => {
  const { activityLogs } = crmData;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Activity Log</h2>

      <div className="overflow-x-auto rounded-lg border border-foreground/10 bg-card">
        <table className="w-full min-w-[720px] border-collapse text-[13px] leading-[1.4]">
          <thead className="sticky top-0 z-10 bg-card text-left text-[11px] font-normal uppercase tracking-[0.06em] text-foreground/45">
            <tr className="h-10 border-b border-foreground/10"><th className="px-4 font-normal">Activity</th><th className="px-4 font-normal">Type</th><th className="px-4 font-normal">Outcome</th><th className="px-4 text-right font-normal">Logged</th></tr>
          </thead>
          <tbody>
        {activityLogs.map((activity) => {
          const Icon = ACTIVITY_ICONS[activity.activity_type] || ACTIVITY_ICONS.default;
          const colorClass = ACTIVITY_COLORS[activity.activity_type] || ACTIVITY_COLORS.note;

          return (
            <tr key={activity.id} tabIndex={0} className="h-11 border-b border-foreground/[0.06] text-foreground/65 transition-[background-color,color] duration-150 ease-out last:border-b-0 hover:bg-foreground/[0.03] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
              <td className="px-4"><div className="flex min-w-0 items-center gap-3"><Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} /><div className="min-w-0"><p className="truncate font-semibold text-foreground">{activity.subject}</p>{activity.description && <p className="truncate text-[11px] text-foreground/45">{activity.description}</p>}</div></div></td>
              <td className="px-4 capitalize"><span className={`mr-2 inline-block h-1.5 w-1.5 rounded-full ${colorClass.split(' ')[0]}`} />{activity.activity_type.replace('_', ' ')}</td>
              <td className="px-4 capitalize">{activity.outcome || '—'}</td>
              <td className="px-4 text-right tabular-nums">{formatDistanceToNow(new Date(activity.logged_at), { addSuffix: true })}</td>
            </tr>
          );
        })}
          </tbody>
        </table>
        {activityLogs.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-[13px] text-foreground/65">
            <Activity className="h-4 w-4" strokeWidth={1.5} />
            <p>Calls, emails, meetings, and notes will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CRMActivityView;
