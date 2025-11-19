import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AdminSidebar from "./AdminSidebar";
import AdminOverview from "./admin/AdminOverview";
import AdminUsers from "./admin/AdminUsers";
import AdminEquipment from "./admin/AdminEquipment";
import AdminChatMonitoring from "./admin/AdminChatMonitoring";
import AdminDatabase from "./admin/AdminDatabase";
import AdminTracking from "./admin/AdminTracking";
import AdminAnalytics from "./admin/AdminAnalytics";
import AdminRobotAnalytics from "./admin/AdminRobotAnalytics";
import WatchlistSection from "./WatchlistSection";

interface AdminDashboardLayoutProps {
  userProfile: any;
  dashboardStats: any;
  users: any[];
  robots: any[];
  services: any[];
  spareParts: any[];
  onRefresh: () => void;
}

const AdminDashboardLayout = React.memo(({
  userProfile, dashboardStats, users, robots, services, spareParts, onRefresh
}: AdminDashboardLayoutProps) => {
  const [activeSection, setActiveSection] = useState("overview");
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      navigate('/auth');
      toast({
        title: "Signed out successfully",
        description: "You have been logged out of the admin panel.",
      });
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  }, [navigate, toast]);

  const handleSectionChange = useCallback((section: string) => {
    setActiveSection(section);
  }, []);

  const renderContent = useCallback(() => {
    switch (activeSection) {
      case "overview":
        return <AdminOverview dashboardStats={dashboardStats} onRefresh={onRefresh} />;
      case "users":
        return <AdminUsers users={users} onRefresh={onRefresh} />;
      case "equipment":
        return <AdminEquipment robots={robots} services={services} spareParts={spareParts} onRefresh={onRefresh} />;
      case "chat-monitoring":
        return <AdminChatMonitoring />;
      case "database":
        return <AdminDatabase />;
      case "tracking":
        return <AdminTracking />;
      case "analytics":
        return <AdminAnalytics dashboardStats={dashboardStats} users={users} />;
      case "robot-analytics":
        return <AdminRobotAnalytics />;
      case "watchlist":
        return <WatchlistSection title="My Watchlist" showHeader={true} compact={false} showActions={true} />;
      default:
        return <AdminOverview dashboardStats={dashboardStats} onRefresh={onRefresh} />;
    }
  }, [activeSection, dashboardStats, users, robots, services, spareParts, onRefresh]);

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar
        userProfile={userProfile}
        onSignOut={handleSignOut}
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto">
          <div className="p-6">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
});

AdminDashboardLayout.displayName = 'AdminDashboardLayout';
export default AdminDashboardLayout;
