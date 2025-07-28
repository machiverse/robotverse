import { useAuth } from "@/hooks/useAuth";
import { Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { DashboardProfile } from "@/components/DashboardProfile";
import { DashboardSettings } from "@/components/DashboardSettings";
import EnhancedHeader from "@/components/EnhancedHeader";
import BuyerDashboard from "@/components/dashboards/BuyerDashboard";
import RobotSellerDashboard from "@/components/dashboards/RobotSellerDashboard";
import ServiceProviderDashboard from "@/components/dashboards/ServiceProviderDashboard";
import LogisticsProviderDashboard from "@/components/dashboards/LogisticsProviderDashboard";
import FinanceProviderDashboard from "@/components/dashboards/FinanceProviderDashboard";
import AdminDashboard from "@/components/dashboards/AdminDashboard";
import MultiRoleSellerDashboard from "@/components/MultiRoleSellerDashboard";
import RobotUpload from "@/components/RobotUpload";
import SpareParts from "@/components/SpareParts";
import ServiceListing from "@/components/ServiceListing";

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const DashboardPage = () => {
  // Force refresh to clear cached UserTypeSelector references
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error) {
        console.error('Profile fetch error:', error);
        // If profile doesn't exist, create a basic one with default buyer type
        if (error.code === 'PGRST116') {
          const { data: newProfile } = await supabase
            .from('profiles')
            .insert({
              user_id: user.id,
              email: user.email,
              full_name: user.user_metadata?.full_name || '',
              user_type: 'buyer' // Default to buyer
            })
            .select()
            .single();
          setUserProfile(newProfile);
        }
      } else {
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <EnhancedHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }


  const renderDashboardContent = () => {
    // Check if user is super admin
    if (user?.email === 'mark.it@keyleerkorb.com') {
      return <AdminDashboard userProfile={userProfile} />;
    }

    const sellerRoles = userProfile?.seller_roles || [];
    const hasAnySellerRole = sellerRoles.length > 0;
    
    // For seller accounts with roles, show appropriate dashboard
    if (userProfile?.account_type === 'seller' || userProfile?.user_type === 'seller' || hasAnySellerRole) {
      return <MultiRoleSellerDashboard userProfile={userProfile} />;
    }

    // Show dashboard based on user type, default to buyer if no type set
    switch (userProfile?.user_type || userProfile?.account_type) {
      case 'buyer':
        return <BuyerDashboard userProfile={userProfile} />;
      case 'service_provider':
        return <ServiceProviderDashboard userProfile={userProfile} />;
      case 'logistics_provider':
      case 'logistics':
        return <LogisticsProviderDashboard userProfile={userProfile} />;
      case 'finance_provider':
      case 'finance':
        return <FinanceProviderDashboard userProfile={userProfile} />;
      default:
        // Default to buyer dashboard if no user_type is set
        return <BuyerDashboard userProfile={userProfile} />;
    }
  };

  return (
    <SidebarProvider>
      {/* Global header with sidebar trigger */}
      <header className="h-12 flex items-center border-b bg-background">
        <SidebarTrigger className="ml-2" />
        <div className="flex-1">
          <EnhancedHeader />
        </div>
      </header>

      <div className="flex min-h-screen w-full">
        <DashboardSidebar userProfile={userProfile} />

        <main className="flex-1 p-6">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard/overview" replace />} />
            <Route path="/profile" element={<DashboardProfile userProfile={userProfile} onProfileUpdate={fetchUserProfile} />} />
            <Route path="/settings" element={<DashboardSettings userProfile={userProfile} />} />
            <Route path="/overview" element={renderDashboardContent()} />
            <Route path="/robots" element={
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-bold">Robot Seller Dashboard</h1>
                  <p className="text-muted-foreground">Manage your robot listings</p>
                </div>
                <RobotUpload onSuccess={fetchUserProfile} />
              </div>
            } />
            <Route path="/parts" element={
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-bold">Spare Parts Dashboard</h1>
                  <p className="text-muted-foreground">Manage your spare parts inventory</p>
                </div>
                <SpareParts />
              </div>
            } />
            <Route path="/services" element={
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-bold">Service Provider Dashboard</h1>
                  <p className="text-muted-foreground">Manage your service offerings</p>
                </div>
                <ServiceListing />
              </div>
            } />
          </Routes>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default DashboardPage;