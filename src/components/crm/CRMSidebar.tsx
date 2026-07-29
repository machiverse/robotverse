import { useNavigate } from "@/lib/router-compat";
import {
  LayoutDashboard,
  Users,
  Target,
  Building2,
  CheckSquare,
  FileText,
  BarChart3,
  Activity,
  ArrowLeft,
  TrendingUp,
  Bell,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CRMStats } from "@/hooks/useCRM";

interface CRMSidebarProps {
  activeView: string;
  setActiveView: (view: any) => void;
  stats: CRMStats;
}

const CRMSidebar = ({ activeView, setActiveView, stats }: CRMSidebarProps) => {
  const navigate = useNavigate();

  const mainMenuItems = [
    {
      id: "overview",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      id: "leads",
      label: "Leads",
      icon: Users,
      badge: stats.newLeads > 0 ? stats.newLeads : undefined,
      badgeVariant: "default" as const,
    },
    {
      id: "opportunities",
      label: "Opportunities",
      icon: Target,
      badge: stats.openOpportunities > 0 ? stats.openOpportunities : undefined,
      badgeVariant: "secondary" as const,
    },
    {
      id: "accounts",
      label: "Accounts",
      icon: Building2,
    },
    {
      id: "tasks",
      label: "Tasks",
      icon: CheckSquare,
      badge: stats.overdueTasks > 0 ? stats.overdueTasks : undefined,
      badgeVariant: "destructive" as const,
    },
    {
      id: "quotations",
      label: "Quotations",
      icon: FileText,
      badge: stats.pendingQuotations > 0 ? stats.pendingQuotations : undefined,
      badgeVariant: "outline" as const,
    },
  ];

  const analyticsItems = [
    {
      id: "reports",
      label: "Reports",
      icon: BarChart3,
    },
    {
      id: "activity",
      label: "Activity Log",
      icon: Activity,
    },
  ];

  return (
    <Sidebar className="border-r">
      <SidebarHeader className="border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Sales CRM</h2>
            <p className="text-xs text-muted-foreground">Robotverse</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => setActiveView(item.id)}
                    isActive={activeView === item.id}
                    className="w-full justify-start"
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="flex-1">{item.label}</span>
                    {item.badge !== undefined && (
                      <Badge variant={item.badgeVariant} className="ml-auto h-5 px-1.5 text-[10px]">
                        {item.badge}
                      </Badge>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Analytics</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {analyticsItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => setActiveView(item.id)}
                    isActive={activeView === item.id}
                    className="w-full justify-start"
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Quick Stats */}
        <SidebarGroup>
          <SidebarGroupLabel>Quick Stats</SidebarGroupLabel>
          <SidebarGroupContent className="px-2">
            <div className="space-y-2 rounded-lg bg-muted/50 p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Pipeline Value</span>
                <span className="font-medium">₹{(stats.pipelineValue / 100000).toFixed(1)}L</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Won Revenue</span>
                <span className="font-medium text-green-600">₹{(stats.wonRevenue / 100000).toFixed(1)}L</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Conversion</span>
                <span className="font-medium">{stats.conversionRate.toFixed(1)}%</span>
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => navigate("/dashboard")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
};

export default CRMSidebar;
