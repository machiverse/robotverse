import { NavLink, useLocation } from 'react-router-dom';
import { User, Settings, LayoutDashboard, Bot, Package, Wrench } from 'lucide-react';
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
} from '@/components/ui/sidebar';

interface DashboardSidebarProps {
  userProfile: any;
}

export function DashboardSidebar({ userProfile }: DashboardSidebarProps) {
  const location = useLocation();
  const currentPath = location.pathname;

  const sellerRoles = userProfile?.seller_roles || [];
  const hasRobotSeller = sellerRoles.includes('robot_seller');
  const hasPartsSeller = sellerRoles.includes('spare_parts_seller');
  const hasServiceProvider = sellerRoles.includes('service_provider');

  // Main navigation items
  const mainItems = [
    { title: 'Profile', url: 'profile', icon: User },
    { title: 'Settings', url: 'settings', icon: Settings },
  ];

  // Dashboard sub-items based on seller roles
  const dashboardItems = [];
  if (hasRobotSeller) {
    dashboardItems.push({ title: 'Robot Seller', url: 'robots', icon: Bot });
  }
  if (hasPartsSeller) {
    dashboardItems.push({ title: 'Spare Parts', url: 'parts', icon: Package });
  }
  if (hasServiceProvider) {
    dashboardItems.push({ title: 'Service Provider', url: 'services', icon: Wrench });
  }

  // If no seller roles, default to overview
  if (dashboardItems.length === 0) {
    dashboardItems.push({ title: 'Overview', url: 'overview', icon: LayoutDashboard });
  }

  const isActive = (path: string) => currentPath === path || currentPath.startsWith(path);
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted/50';

  const isDashboardExpanded = dashboardItems.some((item) => isActive(item.url));

  return (
    <Sidebar collapsible="icon">
      <SidebarTrigger className="m-2 self-end" />

      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={getNavCls}>
                      <item.icon className="mr-2 h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Dashboard Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Dashboard</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {dashboardItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavCls}>
                      <item.icon className="mr-2 h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}