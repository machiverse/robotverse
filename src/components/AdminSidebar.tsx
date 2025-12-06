import React, { useState, useCallback, useMemo } from "react";
import { Users, Bot, Database, Activity, PieChart, MousePointer, LogOut, ChevronLeft, ChevronRight, Eye, Heart, MessageSquare, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface AdminSidebarProps {
  userProfile: any;
  onSignOut: () => void;
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const AdminSidebar = React.memo(({ userProfile, onSignOut, activeSection, onSectionChange }: AdminSidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = useMemo(() => [
    { id: "overview", label: "Overview", icon: Activity },
    { id: "users", label: "Users", icon: Users },
    { id: "equipment", label: "Equipment", icon: Bot },
    { id: "buyer-access", label: "Buyer Access", icon: Shield },
    { id: "chat-monitoring", label: "Chat Monitoring", icon: MessageSquare },
    { id: "database", label: "Database", icon: Database },
    { id: "tracking", label: "Tracking", icon: MousePointer },
    { id: "analytics", label: "Analytics", icon: PieChart },
    { id: "robot-analytics", label: "Robot Views", icon: Eye },
    { id: "watchlist", label: "Watchlist", icon: Heart },
  ], []);

  const handleToggleCollapse = useCallback(() => {
    setCollapsed(prev => !prev);
  }, []);

  const handleSectionChange = useCallback((section: string) => {
    onSectionChange(section);
  }, [onSectionChange]);

  const getInitials = useCallback((name: string) => {
    return name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : 'A';
  }, []);

  const renderedMenuItems = useMemo(() => {
    return menuItems.map((item) => {
      const Icon = item.icon;
      const isActive = activeSection === item.id;
      
      return (
        <button
          key={item.id}
          onClick={() => handleSectionChange(item.id)}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            isActive 
              ? 'bg-primary text-primary-foreground' 
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          } ${collapsed ? 'justify-center' : ''}`}
        >
          <Icon className="h-4 w-4 flex-shrink-0" />
          {!collapsed && <span>{item.label}</span>}
        </button>
      );
    });
  }, [menuItems, activeSection, collapsed, handleSectionChange]);

  return (
    <div className={`bg-card border-r border-border flex flex-col transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div>
              <h2 className="text-lg font-semibold text-foreground">RobotVerse</h2>
              <p className="text-sm text-muted-foreground">Admin Panel</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleCollapse}
            className="h-8 w-8 p-0"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 p-4">
        <nav className="space-y-2">
          {renderedMenuItems}
        </nav>
      </div>

      <Separator />

      {/* User Info */}
      <div className="p-4">
        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
          <Avatar className="h-8 w-8">
            <AvatarImage src={userProfile?.avatar_url} />
            <AvatarFallback className="text-xs">
              {getInitials(userProfile?.full_name || userProfile?.email || 'Admin')}
            </AvatarFallback>
          </Avatar>
          
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {userProfile?.full_name || 'Admin User'}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {userProfile?.email}
              </p>
              <Badge variant="secondary" className="text-xs mt-1">
                Administrator
              </Badge>
            </div>
          )}
        </div>

        {!collapsed && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onSignOut}
            className="w-full mt-3 justify-start text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        )}
      </div>
    </div>
  );
});

AdminSidebar.displayName = 'AdminSidebar';
export default AdminSidebar;
