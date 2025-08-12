import { useAuth } from "@/hooks/useAuth";
import EnhancedHeader from "@/components/EnhancedHeader";
import BuyerDashboard from "@/components/dashboards/BuyerDashboard";
import RobotSellerDashboard from "@/components/dashboards/RobotSellerDashboard";
import ServiceProviderDashboard from "@/components/dashboards/ServiceProviderDashboard";
import LogisticsProviderDashboard from "@/components/dashboards/LogisticsProviderDashboard";
import FinanceProviderDashboard from "@/components/dashboards/FinanceProviderDashboard";
import AdminDashboard from "@/components/dashboards/AdminDashboard";
import MultiRoleDashboard from "@/components/MultiRoleDashboard";

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const DashboardPage = () => {
  // Force refresh to clear cached UserTypeSelector references
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
                user_type: 'buyer', // Default to buyer
                account_type: 'buyer',
                user_roles: ['buyer'], // Add user_roles array for multi-role dashboard
                primary_user_type: 'buyer',
                primary_role: 'buyer',
                registration_complete: true
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

  const renderDashboard = () => {
    // Check if user is super admin
    if (user?.email === 'mark.it@keyleerkorb.com') {
      return <AdminDashboard userProfile={userProfile} />;
    }

    // Get user roles from new user_roles array or fallback to legacy fields
    const userRoles = userProfile?.user_roles || [];
    
    // If user has user_roles defined, use multi-role dashboard
    if (userRoles.length > 0) {
      return <MultiRoleDashboard userProfile={userProfile} />;
    }

    // Fallback to legacy single-role dashboard logic
    switch (userProfile?.user_type || userProfile?.account_type) {
      case 'buyer':
        return <BuyerDashboard userProfile={userProfile} />;
      case 'seller':
        return <RobotSellerDashboard userProfile={userProfile} />;
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
    <div className="min-h-screen bg-background">
      <EnhancedHeader />
      {renderDashboard()}
    </div>
  );
};

export default DashboardPage;