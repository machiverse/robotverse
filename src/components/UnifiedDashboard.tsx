import React, { useState, useEffect } from "react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ShoppingCart,
  Store,
  Wrench,
  Settings,
  Truck,
  CreditCard,
  User,
  Building2,
  LogOut,
  Edit,
  ChevronDown,
  Menu,
  LayoutDashboard,
  Users,
  Target,
  Activity,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

// Import dashboard components
import BuyerDashboard from "@/components/dashboards/BuyerDashboard";
import RobotSellerDashboard from "@/components/dashboards/RobotSellerDashboard";
import CommissionSellerDashboard from "@/components/dashboards/CommissionSellerDashboard";
import SparePartsDashboard from "@/pages/SparePartsSellerDashboard";
import ServiceProviderDashboard from "@/components/dashboards/ServiceProviderDashboard";
import LogisticsProviderDashboard from "@/components/dashboards/LogisticsProviderDashboard";
import FinanceProviderDashboard from "@/components/dashboards/FinanceProviderDashboard";
import AdminDashboard from "@/components/dashboards/AdminDashboard";
import DashboardNavigation, { type DashboardNavItem } from "@/components/dashboard/DashboardNavigation";
import PipelineWorkspace from "@/components/dashboard/PipelineWorkspace";

interface UnifiedDashboardProps {
  userProfile: any;
}

const UnifiedDashboard = ({ userProfile }: UnifiedDashboardProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>("");
  const [isMobileLayout, setIsMobileLayout] = useState(() => typeof window !== "undefined" && window.innerWidth < 1024);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("robotverse-dashboard-sidebar-collapsed") === "true";
  });

  // Get user roles - prioritize user_roles array, fallback to legacy fields
  const userRoles = userProfile?.user_roles?.length > 0 
    ? userProfile.user_roles 
    : [userProfile?.user_type || userProfile?.account_type || 'buyer'];

  // Check if user is admin
  const isAdmin = user?.email === 'mark.it@keyleerkorb.com' || user?.email === 'mynameisrajan@gmail.com';
  const isCommissionSeller = userProfile?.seller_model_type === 'commission';
  
  // If admin, add admin role
  const finalRoles = isAdmin ? ['admin', ...userRoles.filter(role => role !== 'admin')] : userRoles;

  useEffect(() => {
    // Set initial active tab to first role
    if (finalRoles.length > 0 && !activeTab) {
      setActiveTab(finalRoles[0]);
    }
  }, [finalRoles, activeTab]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1023px)");
    const handleChange = () => setIsMobileLayout(mediaQuery.matches);
    handleChange();
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("robotverse-dashboard-sidebar-collapsed", String(collapsed));
  }, [collapsed]);

  const roleConfigs = {
    admin: {
      label: 'Admin',
      icon: Settings,
      component: AdminDashboard,
      description: 'System administration'
    },
    buyer: {
      label: 'Buyer',
      icon: ShoppingCart,
      component: BuyerDashboard,
      description: 'Browse and purchase robots'
    },
    robot_seller: {
      label: isCommissionSeller ? 'Robot Seller (Commission)' : 'Robot Seller',
      icon: Store,
      component: isCommissionSeller ? CommissionSellerDashboard : RobotSellerDashboard,
      description: isCommissionSeller ? 'Manage deals & commission' : 'Manage robot listings'
    },
    seller: {
      label: isCommissionSeller ? 'Seller (Commission)' : 'Robot Seller',
      icon: Store,
      component: isCommissionSeller ? CommissionSellerDashboard : RobotSellerDashboard,
      description: isCommissionSeller ? 'Manage deals & commission' : 'Manage robot listings'
    },
    spare_parts_seller: {
      label: isCommissionSeller ? 'Parts Seller (Commission)' : 'Parts Seller',
      icon: Settings,
      component: SparePartsDashboard,
      description: isCommissionSeller ? 'Manage parts & 6% commission' : 'Manage spare parts'
    },
    service_provider: {
      label: isCommissionSeller ? 'Service Provider (Commission)' : 'Service Provider',
      icon: Wrench,
      component: ServiceProviderDashboard,
      description: isCommissionSeller ? 'Manage services & 6% commission' : 'Manage service offerings'
    },
    logistics_provider: {
      label: 'Logistics',
      icon: Truck,
      component: LogisticsProviderDashboard,
      description: 'Manage shipments'
    },
    logistics: {
      label: 'Logistics',
      icon: Truck,
      component: LogisticsProviderDashboard,
      description: 'Manage shipments'
    },
    finance_provider: {
      label: 'Financing',
      icon: CreditCard,
      component: FinanceProviderDashboard,
      description: 'Manage loan programs'
    },
    finance: {
      label: 'Financing',
      icon: CreditCard,
      component: FinanceProviderDashboard,
      description: 'Manage loan programs'
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleProfileEdit = () => {
    navigate('/profile-settings');
  };

  // Get user initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const userName = userProfile?.full_name || userProfile?.display_name || user?.email || 'User';
  const companyName = userProfile?.company_name || 'RobotVerse';

  const workspaceItems: DashboardNavItem[] = finalRoles.flatMap((role: string) => {
    const config = roleConfigs[role];
    return config ? [{ id: role, label: config.label, icon: config.icon }] : [];
  });

  const sellingRoles = ['seller', 'robot_seller', 'spare_parts_seller', 'service_provider', 'logistics_provider', 'finance_provider'];
  const showPipeline = isAdmin || userRoles.some((role: string) => sellingRoles.includes(role));
  const pipelineItems: DashboardNavItem[] = showPipeline ? [
    { id: 'pipeline-overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'pipeline-leads', label: 'Leads', icon: Users },
    { id: 'pipeline-opportunities', label: 'Opportunities', icon: Target },
    { id: 'pipeline-accounts', label: 'Accounts', icon: Building2 },
    { id: 'pipeline-activity', label: 'Activity', icon: Activity },
    { id: 'pipeline-buy-leads', label: 'Buy Leads', icon: ShoppingCart },
  ] : [];

  const activeLabel = [...workspaceItems, ...pipelineItems].find((item) => item.id === activeTab)?.label || 'Dashboard';
  const isPipelineActive = activeTab.startsWith('pipeline-');

  const handleNavSelect = (itemId: string) => {
    if (itemId === 'account-profile' || itemId === 'account-settings') {
      handleProfileEdit();
    } else {
      setActiveTab(itemId);
    }
    setMobileOpen(false);
  };

  const navigationProps = {
    companyName,
    workspaceItems,
    pipelineItems,
    activeItem: activeTab,
    onItemSelect: handleNavSelect,
    onProfileEdit: handleProfileEdit,
    onSignOut: handleSignOut,
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex h-screen w-full overflow-hidden bg-muted/40">
        {!isMobileLayout && (
          <aside className={`h-screen shrink-0 overflow-hidden border-r border-foreground/10 transition-[width] duration-200 ease-out ${collapsed ? 'w-14' : 'w-60'}`}>
            <DashboardNavigation
              {...navigationProps}
              collapsed={collapsed}
              showCollapseToggle
              onCollapseToggle={() => setCollapsed((current) => !current)}
            />
          </aside>
        )}

        {isMobileLayout && (
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetContent side="left" className="w-60 border-r border-foreground/10 p-0 transition duration-200 ease-out [&>button]:hidden">
              <DashboardNavigation {...navigationProps} />
            </SheetContent>
          </Sheet>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-[52px] shrink-0 items-center justify-between border-b border-foreground/10 bg-background px-4">
            <div className="flex min-w-0 items-center gap-3">
              {isMobileLayout ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  onClick={() => setMobileOpen(true)}
                  aria-label="Open dashboard navigation"
                >
                  <Menu className="h-4 w-4" strokeWidth={1.5} />
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  onClick={() => setCollapsed((current) => !current)}
                  aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                  <Menu className="h-4 w-4" strokeWidth={1.5} />
                </Button>
              )}
              <span className="truncate text-[13px] font-normal leading-[1.4] text-foreground/65">Dashboard</span>
              <span className="text-[13px] text-foreground/45">/</span>
              <span className="truncate text-[13px] font-semibold leading-[1.4] text-foreground">{activeLabel}</span>
            </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex h-9 items-center gap-2 rounded-md p-1.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={userProfile?.avatar_url} />
                  <AvatarFallback>{getInitials(userName)}</AvatarFallback>
                </Avatar>
                <ChevronDown className="h-4 w-4" strokeWidth={1.5} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 bg-popover">
              <DropdownMenuLabel>
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={userProfile?.avatar_url} />
                    <AvatarFallback>{getInitials(userName)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{userName}</p>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={handleProfileEdit}>
                <User className="mr-2 h-4 w-4" />
                View Profile
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={handleProfileEdit}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Profile
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={handleProfileEdit}>
                <Settings className="mr-2 h-4 w-4" />
                Account Settings
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
            </DropdownMenu>
          </header>

          <main className="min-h-0 flex-1 overflow-auto bg-muted/40">
            <div className="mx-auto w-full max-w-[1400px] p-6">
              {isPipelineActive ? (
                <PipelineWorkspace activeView={activeTab} isCommissionSeller={isCommissionSeller} />
              ) : (
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  {finalRoles.map((role: string) => {
                    const config = roleConfigs[role];
                    if (!config) return null;
                    const DashboardComponent = config.component;
                    return (
                      <TabsContent key={role} value={role} className="m-0 space-y-6">
                        <DashboardComponent userProfile={userProfile} isCommissionSeller={isCommissionSeller} />
                      </TabsContent>
                    );
                  })}
                </Tabs>
              )}
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default UnifiedDashboard;