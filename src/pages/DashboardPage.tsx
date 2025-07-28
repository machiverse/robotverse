import { useAuth } from "@/hooks/useAuth";
import { Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  AlertCircle, 
  RefreshCw, 
  User, 
  ShieldCheck,
  Loader2
} from "lucide-react";

// Type definitions for better type safety
interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name?: string;
  user_type?: 'buyer' | 'seller' | 'service_provider' | 'logistics_provider' | 'finance_provider';
  account_type?: string;
  seller_roles?: string[];
  service_categories?: string[];
  phone?: string;
  company_name?: string;
  verification_status?: boolean;
  created_at: string;
  updated_at: string;
}

interface DashboardPageState {
  userProfile: UserProfile | null;
  loading: boolean;
  error: string | null;
  retryCount: number;
}

// Constants
const ADMIN_EMAILS = ['mark.it@keyleerkorb.com', 'admin@robotmarketplace.com'];
const MAX_RETRY_ATTEMPTS = 3;
const DEFAULT_USER_TYPE = 'buyer' as const;

const DashboardPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [state, setState] = useState<DashboardPageState>({
    userProfile: null,
    loading: true,
    error: null,
    retryCount: 0
  });

  // Memoized admin check
  const isAdmin = useMemo(() => {
    return user?.email && ADMIN_EMAILS.includes(user.email);
  }, [user?.email]);

  // Create default profile helper
  const createDefaultProfile = useCallback(async (): Promise<UserProfile | null> => {
    if (!user) return null;

    try {
      const defaultProfile = {
        user_id: user.id,
        email: user.email || '',
        full_name: user.user_metadata?.full_name || '',
        user_type: DEFAULT_USER_TYPE,
        verification_status: false,
        seller_roles: [],
        service_categories: []
      };

      const { data: newProfile, error } = await supabase
        .from('profiles')
        .insert(defaultProfile)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Welcome!",
        description: "Your profile has been created. You can update it anytime in settings.",
      });

      return newProfile as UserProfile;
    } catch (error) {
      console.error('Error creating default profile:', error);
      throw new Error('Failed to create user profile');
    }
  }, [user, toast]);

  // Fetch user profile with retry logic
  const fetchUserProfile = useCallback(async (isRetry = false) => {
    if (!user) {
      setState(prev => ({ ...prev, loading: false, error: null }));
      return;
    }

    try {
      if (!isRetry) {
        setState(prev => ({ ...prev, loading: true, error: null }));
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Profile doesn't exist, create default one
          const newProfile = await createDefaultProfile();
          setState(prev => ({ 
            ...prev, 
            userProfile: newProfile, 
            loading: false, 
            error: null,
            retryCount: 0 
          }));
        } else {
          throw error;
        }
      } else {
        setState(prev => ({ 
          ...prev, 
          userProfile: profile as UserProfile, 
          loading: false, 
          error: null,
          retryCount: 0 
        }));
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load user profile';
      
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: errorMessage,
        retryCount: prev.retryCount + 1
      }));

      toast({
        variant: "destructive",
        title: "Profile Load Error",
        description: errorMessage,
      });
    }
  }, [user, createDefaultProfile, toast]);

  // Retry handler
  const handleRetry = useCallback(() => {
    if (state.retryCount < MAX_RETRY_ATTEMPTS) {
      fetchUserProfile(true);
    }
  }, [fetchUserProfile, state.retryCount]);

  // Effect to fetch profile on mount and user change
  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  // Profile update handler
  const handleProfileUpdate = useCallback(() => {
    fetchUserProfile(true);
  }, [fetchUserProfile]);

  // Dashboard content renderer with improved logic
  const renderDashboardContent = useCallback(() => {
    const { userProfile } = state;

    // Admin check
    if (isAdmin) {
      return <AdminDashboard userProfile={userProfile} />;
    }

    if (!userProfile) {
      return (
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Profile Setup Required
            </CardTitle>
            <CardDescription>
              Complete your profile to access your dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => fetchUserProfile()} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Load Profile
            </Button>
          </CardContent>
        </Card>
      );
    }

    const userType = userProfile.user_type || userProfile.account_type;
    const sellerRoles = userProfile.seller_roles || [];
    const hasMultipleSellerRoles = sellerRoles.length > 1;
    const hasAnySellerRole = sellerRoles.length > 0;

    // Multi-role seller logic
    if ((userType === 'seller' || hasAnySellerRole) && hasMultipleSellerRoles) {
      return <MultiRoleSellerDashboard userProfile={userProfile} />;
    }

    // Single role or specific dashboard routing
    if (userType === 'seller' || hasAnySellerRole) {
      const primaryRole = sellerRoles[0];
      
      switch (primaryRole) {
        case 'robot_seller':
          return <RobotSellerDashboard userProfile={userProfile} />;
        case 'parts_seller':
          return <MultiRoleSellerDashboard userProfile={userProfile} />;
        case 'service_provider':
          return <ServiceProviderDashboard userProfile={userProfile} />;
        default:
          return <MultiRoleSellerDashboard userProfile={userProfile} />;
      }
    }

    // Dedicated user type dashboards
    switch (userType) {
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
        // Fallback to buyer dashboard with notification
        return (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                Your account type is not fully configured. Showing buyer dashboard by default.
                Please update your profile in settings.
              </AlertDescription>
            </Alert>
            <BuyerDashboard userProfile={userProfile} />
          </div>
        );
    }
  }, [state, isAdmin, fetchUserProfile]);

  // Loading state
  if (state.loading) {
    return (
      <div className="min-h-screen bg-background">
        <EnhancedHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
              <div>
                <p className="text-lg font-medium">Loading Dashboard</p>
                <p className="text-sm text-muted-foreground">
                  Setting up your personalized experience...
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state with retry
  if (state.error && !state.userProfile) {
    return (
      <div className="min-h-screen bg-background">
        <EnhancedHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <Card className="max-w-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="w-5 h-5" />
                  Dashboard Load Error
                </CardTitle>
                <CardDescription>
                  We encountered an error loading your dashboard
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert variant="destructive">
                  <AlertDescription>{state.error}</AlertDescription>
                </Alert>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleRetry}
                    disabled={state.retryCount >= MAX_RETRY_ATTEMPTS}
                    className="flex-1"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retry ({state.retryCount}/{MAX_RETRY_ATTEMPTS})
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => window.location.href = '/profile'}
                  >
                    Go to Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      {/* Enhanced Header */}
      <header className="h-14 flex items-center border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="flex items-center gap-3 px-4">
          <SidebarTrigger />
          {isAdmin && (
            <div className="flex items-center gap-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
              <ShieldCheck className="w-3 h-3" />
              Admin Mode
            </div>
          )}
        </div>
        <div className="flex-1">
          <EnhancedHeader />
        </div>
      </header>

      <div className="flex min-h-screen w-full bg-muted/10">
        <DashboardSidebar userProfile={state.userProfile} />

        <main className="flex-1 p-6 lg:p-8">
          <Routes>
            <Route index element={<Navigate to="overview" replace />} />
            
            <Route 
              path="profile" 
              element={
                <DashboardProfile 
                  userProfile={state.userProfile} 
                  onProfileUpdate={handleProfileUpdate} 
                />
              } 
            />
            
            <Route 
              path="settings" 
              element={<DashboardSettings userProfile={state.userProfile} />} 
            />
            
            <Route 
              path="overview" 
              element={renderDashboardContent()} 
            />
            
            {/* Role-specific routes */}
            <Route 
              path="robots" 
              element={
                <div className="space-y-6">
                  <div>
                    <h1 className="text-3xl font-bold tracking-tight">Robot Management</h1>
                    <p className="text-muted-foreground">
                      Manage your robot listings and inventory
                    </p>
                  </div>
                  <RobotUpload onSuccess={handleProfileUpdate} />
                </div>
              } 
            />
            
            <Route 
              path="parts" 
              element={
                <div className="space-y-6">
                  <div>
                    <h1 className="text-3xl font-bold tracking-tight">Spare Parts Management</h1>
                    <p className="text-muted-foreground">
                      Manage your spare parts inventory and catalog
                    </p>
                  </div>
                  <SpareParts />
                </div>
              } 
            />
            
            <Route 
              path="services" 
              element={
                <div className="space-y-6">
                  <div>
                    <h1 className="text-3xl font-bold tracking-tight">Service Management</h1>
                    <p className="text-muted-foreground">
                      Manage your service offerings and appointments
                    </p>
                  </div>
                  <ServiceListing />
                </div>
              } 
            />

            {/* Fallback route */}
            <Route 
              path="*" 
              element={<Navigate to="overview" replace />} 
            />
          </Routes>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default DashboardPage;
