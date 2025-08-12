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
        console.log('🔍 Fetching profile for user:', user.id);
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (error) {
          console.error('Profile fetch error:', error);
          // If profile doesn't exist, check for saved registration data and create profile
          if (error.code === 'PGRST116') {
            console.log('📝 No profile found, checking for saved registration data...');
            
            // Check for saved registration data in localStorage
            const savedData = localStorage.getItem('robotverse_user_registration_data');
            let registrationData = null;
            
            if (savedData) {
              try {
                registrationData = JSON.parse(savedData);
                console.log('💾 Found saved registration data:', registrationData);
              } catch (e) {
                console.warn('⚠️ Could not parse saved registration data');
              }
            }
            
            // Create profile with either saved data or defaults
            let profileData: any;
            
            if (registrationData) {
              // Map account types to primary_user_type values
              const mapAccountTypeToPrimary = (accountType: string, sellerRoles?: string[]) => {
                if (accountType === 'seller') {
                  return sellerRoles?.[0] || 'robot_seller';
                } else if (accountType === 'logistics') {
                  return 'logistics_provider';
                } else if (accountType === 'finance') {
                  return 'finance_provider';
                } else {
                  return 'buyer';
                }
              };
              
              profileData = {
                user_id: user.id,
                email: user.email || registrationData.email,
                full_name: registrationData.fullName || user.user_metadata?.full_name || '',
                company_name: registrationData.companyName || null,
                mobile_number: registrationData.mobileNumber || null,
                phone: registrationData.mobileNumber || null,
                location: registrationData.location || null,
                user_type: registrationData.accountType || 'buyer',
                account_type: registrationData.accountType || 'buyer',
                registration_complete: true,
                mou_agreed: true,
                mou_agreed_at: new Date().toISOString(),
                // Role-specific data
                user_roles: registrationData.accountType === 'seller' 
                  ? (registrationData.sellerRoles?.length > 0 ? registrationData.sellerRoles : ['robot_seller'])
                  : registrationData.accountType === 'logistics' 
                  ? ['logistics_provider']
                  : registrationData.accountType === 'finance'
                  ? ['finance_provider']
                  : ['buyer'],
                primary_user_type: mapAccountTypeToPrimary(registrationData.accountType, registrationData.sellerRoles),
                primary_role: mapAccountTypeToPrimary(registrationData.accountType, registrationData.sellerRoles),
                // Logistics specific
                logistics_type: registrationData.logisticsType || null,
                logistics_region: registrationData.logisticsRegion || null,
                transport_modes: registrationData.transportModes?.length > 0 ? registrationData.transportModes : null,
                warehouse_storage: registrationData.warehouseStorage || false,
                // Finance specific
                finance_type: registrationData.financeType?.length > 0 ? registrationData.financeType : null,
                financing_for: registrationData.financingFor?.length > 0 ? registrationData.financingFor : null,
                government_scheme_support: registrationData.governmentSchemeSupport || false,
                // Seller specific
                seller_roles: registrationData.sellerRoles?.length > 0 ? registrationData.sellerRoles : null,
                service_categories: registrationData.sellerRoles?.includes('service_provider') 
                  ? ['maintenance', 'repair', 'installation'] 
                  : null,
                target_audience: registrationData.targetAudience?.length > 0 ? registrationData.targetAudience : null,
              };
            } else {
              profileData = {
                user_id: user.id,
                email: user.email,
                full_name: user.user_metadata?.full_name || '',
                user_type: 'buyer',
                account_type: 'buyer',
                user_roles: ['buyer'],
                primary_user_type: 'buyer',
                primary_role: 'buyer',
                registration_complete: true
              };
            }
            
            console.log('📝 Creating profile with data:', profileData);
            const { data: newProfile, error: insertError } = await supabase
              .from('profiles')
              .insert(profileData)
              .select()
              .single();
            
            if (insertError) {
              console.error('❌ Profile creation failed:', insertError);
              // If insert fails, set a minimal profile for the UI to work
              setUserProfile({
                user_id: user.id,
                email: user.email,
                full_name: user.user_metadata?.full_name || '',
                user_type: 'buyer',
                account_type: 'buyer',
                user_roles: ['buyer'],
                primary_user_type: 'buyer',
                primary_role: 'buyer',
                registration_complete: false
              });
            } else {
              console.log('✅ Profile created successfully:', newProfile);
              setUserProfile(newProfile);
              
              // Clear saved registration data since profile is now created
              if (savedData) {
                localStorage.removeItem('robotverse_user_registration_data');
                console.log('🧹 Cleared saved registration data');
              }
            }
          }
        } else {
          console.log('✅ Profile found:', profile);
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