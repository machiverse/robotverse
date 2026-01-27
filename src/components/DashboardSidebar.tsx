import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  BarChart3,
  Bot,
  Building,
  CreditCard,
  FileText,
  HelpCircle,
  Home,
  Package,
  Settings,
  Shield,
  Truck,
  User,
  Wrench,
  LogOut,
  Bell,
  Search,
  MessageCircle,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";

interface DashboardSidebarProps {
  userProfile: any;
}

export function DashboardSidebar({ userProfile }: DashboardSidebarProps) {
  const { state } = useSidebar();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  const getUserRoles = () => {
    return userProfile?.user_roles || [userProfile?.user_type || 'buyer'];
  };

  const isActive = (path: string) => currentPath === path || currentPath.startsWith(path);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Main navigation items
  const mainNavItems = [
    { title: "Dashboard", url: "/dashboard", icon: Home },
    { title: "Messages", url: "/dashboard/messages", icon: MessageCircle },
    { title: "Analytics", url: "/dashboard/analytics", icon: BarChart3 },
    { title: "Reports", url: "/dashboard/reports", icon: FileText },
  ];

  // Business items based on user roles
  const getBusinessItems = () => {
    const roles = getUserRoles();
    const items = [];

    if (roles.includes('robot_seller') || roles.includes('seller')) {
      items.push({ title: "My Robots", url: "/dashboard/robots", icon: Bot });
    }

    if (roles.includes('spare_parts_seller') || roles.includes('seller')) {
      items.push({ title: "Spare Parts", url: "/dashboard/parts", icon: Package });
    }

    if (roles.includes('service_provider')) {
      items.push({ title: "Services", url: "/dashboard/services", icon: Wrench });
    }

    if (roles.includes('finance_provider')) {
      items.push({ title: "Finance", url: "/dashboard/finance", icon: CreditCard });
    }

    if (roles.includes('logistics_provider')) {
      items.push({ title: "Logistics", url: "/dashboard/logistics", icon: Truck });
    }

    return items;
  };

  const businessItems = getBusinessItems();

  // Account items
  const accountItems = [
    { title: "Profile Settings", url: "/profile-settings", icon: User },
    { title: "Account Settings", url: "/dashboard/settings", icon: Settings },
    { title: "Help & Support", url: "/dashboard/help", icon: HelpCircle },
    { title: "Privacy Policy", url: "/dashboard/privacy", icon: Shield },
  ];

  return (
    <Sidebar className={state === "collapsed" ? "w-16" : "w-64"} collapsible="icon">
      {/* Header */}
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-3 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
              {userProfile?.company_name?.[0] || userProfile?.full_name?.[0] || 'R'}
            </div>
            {state !== "collapsed" && (
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">
                  {userProfile?.company_name || 'RobotVerse'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  Dashboard
                </p>
              </div>
            )}
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild
                    className={isActive(item.url) ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/50"}
                  >
                    <button
                      onClick={() => navigate(item.url)}
                      className="w-full flex items-center gap-3 px-3 py-2 text-left"
                    >
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      {state !== "collapsed" && <span>{item.title}</span>}
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Business Section */}
        {businessItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Business</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {businessItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild
                      className={isActive(item.url) ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/50"}
                    >
                      <button
                        onClick={() => navigate(item.url)}
                        className="w-full flex items-center gap-3 px-3 py-2 text-left"
                      >
                        <item.icon className="h-4 w-4 flex-shrink-0" />
                        {state !== "collapsed" && <span>{item.title}</span>}
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Account Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {accountItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild
                    className={isActive(item.url) ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/50"}
                  >
                    <button
                      onClick={() => navigate(item.url)}
                      className="w-full flex items-center gap-3 px-3 py-2 text-left"
                    >
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      {state !== "collapsed" && <span>{item.title}</span>}
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer with User Info */}
      <SidebarFooter className="border-t">
        <div className="p-4 space-y-4">
          {/* User Profile */}
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={userProfile?.avatar_url} />
              <AvatarFallback>
                {userProfile?.full_name?.[0] || userProfile?.email?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
            {state !== "collapsed" && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {userProfile?.full_name || 'User'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {userProfile?.email || 'user@example.com'}
                </p>
              </div>
            )}
          </div>

          {/* User Roles */}
          {state !== "collapsed" && (
            <div className="flex flex-wrap gap-1">
              {getUserRoles().slice(0, 2).map((role) => (
                <Badge key={role} variant="secondary" className="text-xs">
                  {role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Badge>
              ))}
            </div>
          )}

          {/* Sign Out Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4 mr-2" />
            {state !== "collapsed" && <span>Sign Out</span>}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}