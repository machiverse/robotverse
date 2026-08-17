import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  Target,
  DollarSign,
  TrendingUp,
  CheckSquare,
  FileText,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  AlertCircle,
  Coins,
} from "lucide-react";
import { format, formatDistanceToNow, isToday, isTomorrow, isPast } from "date-fns";
import type { useCRM } from "@/hooks/useCRM";
import type { useSellerCRM } from "@/hooks/useSellerCRM";

interface CRMOverviewProps {
  crmData: ReturnType<typeof useCRM>;
  sellerCRM: ReturnType<typeof useSellerCRM>;
}

const CRMOverview = ({ crmData, sellerCRM }: CRMOverviewProps) => {
  const { stats, opportunities, tasks } = crmData;

  const statCards = [
    {
      title: "Total Leads",
      value: stats.totalLeads,
      change: stats.newLeads,
      changeLabel: "new this week",
      icon: Users,
      color: "text-primary",
      bg: "bg-primary/10 dark:bg-primary/30",
      trend: "up",
    },
    {
      title: "Open Opportunities",
      value: stats.openOpportunities,
      change: `₹${(stats.pipelineValue / 100000).toFixed(1)}L`,
      changeLabel: "pipeline value",
      icon: Target,
      color: "text-primary",
      bg: "bg-primary/10 dark:bg-primary/30",
      trend: "neutral",
    },
    {
      title: "Won Revenue",
      value: `₹${(stats.wonRevenue / 100000).toFixed(1)}L`,
      change: `${stats.conversionRate.toFixed(1)}%`,
      changeLabel: "conversion rate",
      icon: DollarSign,
      color: "text-success",
      bg: "bg-success/10 dark:bg-success/30",
      trend: "up",
    },
    {
      title: "Pending Tasks",
      value: stats.pendingTasks,
      change: stats.overdueTasks,
      changeLabel: "overdue",
      icon: CheckSquare,
      color: stats.overdueTasks > 0 ? "text-red-600" : "text-orange-600",
      bg: stats.overdueTasks > 0 ? "bg-red-50 dark:bg-red-950/30" : "bg-orange-50 dark:bg-orange-950/30",
      trend: stats.overdueTasks > 0 ? "down" : "neutral",
    },
    {
      title: "Quotations",
      value: stats.totalQuotations,
      change: stats.pendingQuotations,
      changeLabel: "pending",
      icon: FileText,
      color: "text-primary",
      bg: "bg-primary/10 dark:bg-primary/30",
      trend: "neutral",
    },
    {
      title: "Credits Balance",
      value: sellerCRM.creditsBalance,
      changeLabel: "for lead unlocks",
      icon: Coins,
      color: "text-amber-600",
      bg: "bg-amber-50 dark:bg-amber-950/30",
      trend: "neutral",
    },
  ];

  // Get upcoming tasks
  const upcomingTasks = tasks
    .filter(t => t.status === 'pending' && t.due_date)
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
    .slice(0, 5);

  // Get recent opportunities
  const recentOpportunities = opportunities
    .filter(o => !o.is_closed)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const getTaskUrgency = (dueDate: string) => {
    const date = new Date(dueDate);
    if (isPast(date) && !isToday(date)) return { label: "Overdue", variant: "destructive" as const };
    if (isToday(date)) return { label: "Today", variant: "default" as const };
    if (isTomorrow(date)) return { label: "Tomorrow", variant: "secondary" as const };
    return { label: formatDistanceToNow(date, { addSuffix: true }), variant: "outline" as const };
  };

  const STAGE_COLORS: Record<string, string> = {
    qualification: "bg-primary/10 text-primary",
    needs_analysis: "bg-yellow-100 text-yellow-700",
    proposal: "bg-primary/10 text-primary",
    negotiation: "bg-orange-100 text-orange-700",
    closed_won: "bg-success/10 text-success",
    closed_lost: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {statCards.map((stat) => (
          <Card key={stat.title} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  {stat.change !== undefined && (
                    <div className="flex items-center gap-1 text-xs">
                      {stat.trend === "up" && <ArrowUpRight className="h-3 w-3 text-success" />}
                      {stat.trend === "down" && <ArrowDownRight className="h-3 w-3 text-red-600" />}
                      <span className={stat.trend === "down" ? "text-red-600" : "text-muted-foreground"}>
                        {stat.change} {stat.changeLabel}
                      </span>
                    </div>
                  )}
                </div>
                <div className={`rounded-lg p-2 ${stat.bg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Tasks */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Upcoming Tasks</CardTitle>
                <CardDescription>Your pending follow-ups and activities</CardDescription>
              </div>
              {stats.overdueTasks > 0 && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {stats.overdueTasks} overdue
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {upcomingTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckSquare className="h-10 w-10 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">No pending tasks</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingTasks.map((task) => {
                  const urgency = getTaskUrgency(task.due_date!);
                  return (
                    <div
                      key={task.id}
                      className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`rounded-full p-1.5 ${
                          task.priority === 'urgent' ? 'bg-red-100' :
                          task.priority === 'high' ? 'bg-orange-100' :
                          'bg-primary/10'
                        }`}>
                          <Clock className={`h-4 w-4 ${
                            task.priority === 'urgent' ? 'text-red-600' :
                            task.priority === 'high' ? 'text-orange-600' :
                            'text-primary'
                          }`} />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{task.subject}</p>
                          <p className="text-xs text-muted-foreground capitalize">{task.task_type}</p>
                        </div>
                      </div>
                      <Badge variant={urgency.variant}>{urgency.label}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Opportunities */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Active Opportunities</CardTitle>
            <CardDescription>Recent deals in your pipeline</CardDescription>
          </CardHeader>
          <CardContent>
            {recentOpportunities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Target className="h-10 w-10 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">No active opportunities</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentOpportunities.map((opp) => (
                  <div
                    key={opp.id}
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="rounded-full bg-primary/10 p-1.5">
                        <Target className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{opp.opportunity_name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={STAGE_COLORS[opp.stage] || "bg-gray-100 text-gray-700"}>
                            {opp.stage.replace('_', ' ')}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {opp.probability}% probability
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-success">
                        ₹{((opp.expected_value || 0) / 100000).toFixed(1)}L
                      </p>
                      {opp.expected_close_date && (
                        <p className="text-xs text-muted-foreground">
                          Close: {format(new Date(opp.expected_close_date), 'dd MMM')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pipeline Summary</CardTitle>
          <CardDescription>Deal distribution across stages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-6">
            {['qualification', 'needs_analysis', 'proposal', 'negotiation', 'closed_won', 'closed_lost'].map((stage) => {
              const stageOpps = opportunities.filter(o => o.stage === stage);
              const stageValue = stageOpps.reduce((sum, o) => sum + (o.expected_value || 0), 0);
              return (
                <div key={stage} className="text-center">
                  <div className={`mx-auto mb-2 w-12 h-12 rounded-full flex items-center justify-center ${STAGE_COLORS[stage]}`}>
                    <span className="text-lg font-bold">{stageOpps.length}</span>
                  </div>
                  <p className="text-xs font-medium capitalize">{stage.replace('_', ' ')}</p>
                  <p className="text-xs text-muted-foreground">
                    ₹{(stageValue / 100000).toFixed(1)}L
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CRMOverview;
