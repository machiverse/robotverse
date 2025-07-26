import { useAuth } from "@/hooks/useAuth";
import EnhancedHeader from "@/components/EnhancedHeader";
import BuyerDashboard from "@/components/dashboards/BuyerDashboard";
import RobotSellerDashboard from "@/components/dashboards/RobotSellerDashboard";
import ServiceProviderDashboard from "@/components/dashboards/ServiceProviderDashboard";
import LogisticsProviderDashboard from "@/components/dashboards/LogisticsProviderDashboard";
import FinanceProviderDashboard from "@/components/dashboards/FinanceProviderDashboard";
import AdminDashboard from "@/components/dashboards/AdminDashboard";
import UserTypeSelector from "@/components/UserTypeSelector";

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const DashboardPage = () => {
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
          // If profile doesn't exist, we'll need to show UserTypeSelector
          // Don't auto-create a profile without user input
          if (error.code === 'PGRST116') {
            setUserProfile(null);
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

  const handleUserTypeSelection = async (type: 'buyer' | 'seller' | 'service' | 'parts') => {
    if (!user) return;

    let userType: string = type;
    if (type === 'service') userType = 'service_provider';
    if (type === 'parts') userType = 'seller';

    try {
      const { data: updatedProfile, error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || '',
          user_type: userType
        })
        .select()
        .single();

      if (error) {
        console.error('Error updating user type:', error);
      } else {
        setUserProfile(updatedProfile);
      }
    } catch (error) {
      console.error('Error updating user type:', error);
    }
  };

  const renderDashboard = () => {
    // Check if user is super admin
    if (user?.email === 'mark.it@keyleerkorb.com') {
      return <AdminDashboard userProfile={userProfile} />;
    }

    // If user doesn't have a profile or user_type, show selector
    if (!userProfile || !userProfile.user_type) {
      return <UserTypeSelector onSelect={handleUserTypeSelection} />;
    }

    // Show dashboard based on user type
    switch (userProfile.user_type) {
      case 'buyer':
        return <BuyerDashboard userProfile={userProfile} />;
      case 'seller':
        return <RobotSellerDashboard userProfile={userProfile} />;
      case 'service_provider':
        return <ServiceProviderDashboard userProfile={userProfile} />;
      case 'logistics_provider':
        return <LogisticsProviderDashboard userProfile={userProfile} />;
      case 'finance_provider':
        return <FinanceProviderDashboard userProfile={userProfile} />;
      default:
        return <UserTypeSelector onSelect={handleUserTypeSelection} />;
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