import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp, DollarSign, Bell, Clock, Target, FileText, Coins } from "lucide-react";
import { useSellerCRM, type CRMStats } from "@/hooks/useSellerCRM";
import LeadsManager from "./LeadsManager";
import InvoicesManager from "./InvoicesManager";
import FollowUpReminders from "./FollowUpReminders";
import CreditsDisplay from "./CreditsDisplay";

interface CRMDashboardProps {
  sellerId: string;
  itemType?: string;
}

const CRMDashboard = ({ sellerId, itemType }: CRMDashboardProps) => {
  const { stats, loading, creditsBalance } = useSellerCRM(itemType);
  const [activeTab, setActiveTab] = useState<"leads" | "follow-ups" | "invoices">("leads");

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  const statCards: Array<{
    title: string;
    subtitle?: string;
    value: string | number;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    color: string;
    bg: string;
  }> = [
    {
      title: "Total leads",
      subtitle: "All time",
      value: stats.totalLeads,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      title: "New this week",
      subtitle: "Status: New",
      value: stats.newLeads,
      icon: Target,
      color: "text-green-600",
      bg: "bg-green-50 dark:bg-green-950/30",
    },
    {
      title: "Won deals",
      subtitle: "Closed won",
      value: stats.closedWon,
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
    },
    {
      title: "Pipeline revenue",
      subtitle: "Won + quoted",
      value: `₹${stats.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: "text-purple-600",
      bg: "bg-purple-50 dark:bg-purple-950/30",
    },
    {
      title: "Pending follow-ups",
      subtitle: "Due or upcoming",
      value: stats.pendingFollowUps,
      icon: Bell,
      color: stats.pendingFollowUps > 0 ? "text-orange-600" : "text-muted-foreground",
      bg: stats.pendingFollowUps > 0 ? "bg-orange-50 dark:bg-orange-950/30" : "bg-muted/30",
    },
    {
      title: "Credits balance",
      subtitle: "For lead unlocks",
      value: creditsBalance,
      icon: Coins,
      color: "text-amber-600",
      bg: "bg-amber-50 dark:bg-amber-950/30",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Sales CRM workspace</h1>
          <p className="text-sm text-muted-foreground">
            Track product views, convert them into qualified leads, manage follow-ups, and issue invoices from a single
            dashboard.
          </p>
        </div>
        <CreditsDisplay balance={creditsBalance} />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {statCards.map((stat) => (
          <Card key={stat.title} className="border-muted/60 bg-card shadow-sm transition-shadow hover:shadow-md">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase text-muted-foreground">{stat.title}</p>
                  {stat.subtitle && <p className="text-[11px] text-muted-foreground">{stat.subtitle}</p>}
                  <p className="mt-1 text-2xl font-semibold">{stat.value}</p>
                </div>
                <div className={`rounded-lg p-2 ${stat.bg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main CRM tabs */}
      <Card className="border-muted/70 bg-background shadow-lg">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <CardHeader className="border-b bg-muted/30 pb-0">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="text-lg">CRM overview</CardTitle>
                <CardDescription>Switch between leads, upcoming follow-ups, and invoices.</CardDescription>
              </div>
            </div>

            <TabsList className="mt-4 h-auto justify-start gap-2 bg-transparent p-0">
              <TabsTrigger
                value="leads"
                className="data-[state=active]:border-primary data-[state=active]:text-primary border-b-2 border-transparent px-4 py-2 text-sm font-medium data-[state=active]:bg-transparent rounded-none"
              >
                <Users className="mr-2 h-4 w-4" />
                Leads
                {stats.newLeads > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[11px]">
                    {stats.newLeads}
                  </Badge>
                )}
              </TabsTrigger>

              <TabsTrigger
                value="follow-ups"
                className="data-[state=active]:border-primary data-[state=active]:text-primary border-b-2 border-transparent px-4 py-2 text-sm font-medium data-[state=active]:bg-transparent rounded-none"
              >
                <Clock className="mr-2 h-4 w-4" />
                Follow-ups
                {stats.pendingFollowUps > 0 && (
                  <Badge variant="destructive" className="ml-2 h-5 px-1.5 text-[11px]">
                    {stats.pendingFollowUps}
                  </Badge>
                )}
              </TabsTrigger>

              <TabsTrigger
                value="invoices"
                className="data-[state=active]:border-primary data-[state=active]:text-primary border-b-2 border-transparent px-4 py-2 text-sm font-medium data-[state=active]:bg-transparent rounded-none"
              >
                <FileText className="mr-2 h-4 w-4" />
                Invoices
              </TabsTrigger>
            </TabsList>
          </CardHeader>

          <CardContent className="p-0">
            <TabsContent value="leads" className="m-0">
              <LeadsManager sellerId={sellerId} itemType={itemType} />
            </TabsContent>

            <TabsContent value="follow-ups" className="m-0">
              <FollowUpReminders sellerId={sellerId} />
            </TabsContent>

            <TabsContent value="invoices" className="m-0">
              <InvoicesManager sellerId={sellerId} />
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default CRMDashboard;
