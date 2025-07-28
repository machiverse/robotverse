import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, User, Briefcase, Settings } from 'lucide-react';
import BuyerDashboard from '@/components/dashboards/BuyerDashboard';
import SellerDashboard from '@/components/dashboards/SellerDashboard';
import ServiceProviderDashboard from '@/components/dashboards/ServiceProviderDashboard';
import LogisticsProviderDashboard from '@/components/dashboards/LogisticsProviderDashboard';
import FinanceProviderDashboard from '@/components/dashboards/FinanceProviderDashboard';
// Import the correct database types
import type { Database } from '@/integrations/supabase/types';

// Use the actual database Profile type instead of custom UserProfile
type Profile = Database['public']['Tables']['profiles']['Row'];

const DashboardPage = () => {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            // No profile found, create a basic one
            const { data: newProfile, error: createError } = await supabase
              .from('profiles')
              .insert([
                {
                  user_id: user.id,
                  email: user.email,
                  full_name: user.user_metadata?.full_name || '',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }
              ])
              .select()
              .single();

            if (createError) throw createError;
            setUserProfile(newProfile);
          } else {
            throw error;
          }
        } else {
          setUserProfile(data);
        }
      } catch (err) {
        console.error('Error fetching user profile:', err);
        setError('Failed to load user profile');
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [user]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <div>
            <h2 className="text-lg font-semibold">Loading Dashboard</h2>
            <p className="text-sm text-muted-foreground">Preparing your personalized experience...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Error Loading Dashboard
            </CardTitle>
            <CardDescription className="text-red-600">
              Unable to load your dashboard data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="border-red-200 bg-red-50 mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-red-700">
                {error}
              </AlertDescription>
            </Alert>
            <Button 
              onClick={() => window.location.reload()} 
              className="w-full"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No user logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Authentication Required
            </CardTitle>
            <CardDescription>
              Please log in to access your dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => window.location.href = '/auth'} 
              className="w-full"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No profile found
  if (!userProfile) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Profile Setup Required
            </CardTitle>
            <CardDescription>
              Complete your profile to access dashboard features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Your profile needs to be set up before you can access the dashboard.
              </AlertDescription>
            </Alert>
            <Button 
              onClick={() => window.location.href = '/profile'} 
              className="w-full"
            >
              Complete Profile Setup
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get user type for dashboard routing
  const primaryUserType = userProfile.primary_user_type;
  const userType = userProfile.user_type;
  const hasMultipleRoles = userProfile.seller_roles && userProfile.seller_roles.length > 0;

  // Dashboard header with user info
  const DashboardHeader = () => (
    <div className="bg-white border-b border-gray-200 px-4 py-6 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {userProfile.full_name || user.email}
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline">
                {primaryUserType || userType || 'User'}
              </Badge>
              {hasMultipleRoles && (
                <Badge variant="secondary">
                  Multi-role ({userProfile.seller_roles?.length} roles)
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => window.location.href = '/profile'}>
              <Settings className="w-4 h-4 mr-2" />
              Profile Settings
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  // Render appropriate dashboard based on user type
  const renderDashboard = () => {
    // Determine primary dashboard type
    const dashboardType = primaryUserType || userType;

    switch (dashboardType) {
      case 'buyer':
        return <BuyerDashboard userProfile={userProfile} />;
      
      case 'robot_seller':
      case 'parts_seller':
        return <SellerDashboard userProfile={userProfile} />;
      
      case 'service_provider':
        return <ServiceProviderDashboard userProfile={userProfile} />;
      
      case 'logistics_provider':
        return <LogisticsProviderDashboard userProfile={userProfile} />;
      
      case 'finance_provider':
        return <FinanceProviderDashboard userProfile={userProfile} />;
      
      default:
        return <DefaultDashboard userProfile={userProfile} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <DashboardHeader />
      {renderDashboard()}
    </div>
  );
};

// Default dashboard for users without specific roles
const DefaultDashboard = ({ userProfile }: { userProfile: Profile }) => (
  <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-5 w-5" />
          Dashboard Setup
        </CardTitle>
        <CardDescription>
          Configure your user type to access specialized dashboard features
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p><strong>Current Status:</strong></p>
              <div className="text-sm">
                <p>• Primary Type: {userProfile.primary_user_type || 'Not set'}</p>
                <p>• User Type: {userProfile.user_type || 'Not set'}</p>
                <p>• Account Type: {userProfile.account_type || 'Not set'}</p>
              </div>
              <p className="mt-3">
                Please update your profile to set your user type and unlock dashboard features.
              </p>
            </div>
          </AlertDescription>
        </Alert>
        <div className="mt-6">
          <Button onClick={() => window.location.href = '/profile'}>
            <Settings className="w-4 h-4 mr-2" />
            Update Profile
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
);

export default DashboardPage;
