import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  Bot, 
  ShoppingCart, 
  TrendingUp, 
  Package, 
  Users, 
  Star,
  Plus,
  Activity,
  DollarSign,
  Settings,
  BarChart,
  CheckCircle,
  AlertCircle,
  Crown,
  Zap,
  Eye,
  Heart,
  Calendar,
  Award,
  RefreshCw,
  ArrowRight,
  Wrench,
  Shield,
  CreditCard,
  Truck
} from "lucide-react";
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

// Import centralized types
import { UserProfile, DatabaseProfile, convertToUserProfile } from '@/types/user';

// Import specialized dashboard components
import BuyerDashboard from '@/components/dashboards/BuyerDashboard';
import RobotSellerDashboard from '@/components/dashboards/RobotSellerDashboard';
import ServiceProviderDashboard from '@/components/dashboards/ServiceProviderDashboard';
import AdminDashboard from '@/components/dashboards/AdminDashboard';
import MultiRoleSellerDashboard from '@/components/MultiRoleSellerDashboard';

interface DashboardStats {
  totalUsers?: number;
  totalRobots?: number;
  totalRevenue?: number;
  activeListings?: number;
  totalServices?: number;
  totalParts?: number;
}

const ADMIN_EMAILS = ['mark.it@keyleerkorb.com', 'admin@robotmarketplace.com'];

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showProfileSetup, setShowProfileSetup] = useState(false);

  // Check if user is admin
  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email);

  // Fetch user profile and dashboard data
  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      // Fetch user profile from database
      const { data: dbProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        if (profileError.code === 'PGRST116') {
          setShowProfileSetup(true);
        } else {
          throw profileError;
        }
      } else {
        // Convert database profile to UserProfile using centralized function
        const convertedProfile = convertToUserProfile(dbProfile as DatabaseProfile);
        setUserProfile(convertedProfile);
        await fetchStats(convertedProfile);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load dashboard data"
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, toast]);

  // Fetch relevant stats based on available tables
  const fetchStats = async (profile: UserProfile) => {
    try {
      let stats: DashboardStats = {};

      if (isAdmin) {
        const [usersResponse, robotsResponse, servicesResponse, partsResponse] = await Promise.all([
          supabase.from('profiles').select('id', { count: 'exact' }),
          supabase.from('robots').select('id, price', { count: 'exact' }),
          supabase.from('services').select('id', { count: 'exact' }),
          supabase.from('spare_parts').select('id', { count: 'exact' })
        ]);

        stats = {
          totalUsers: usersResponse.count || 0,
          totalRobots: robotsResponse.count || 0,
          totalServices: servicesResponse.count || 0,
          totalParts: partsResponse.count || 0,
          totalRevenue: robotsResponse.data?.reduce((sum, r) => sum + (r.price || 0), 0) || 0,
          activeListings: robotsResponse.count || 0
        };
      } else {
        const userType = profile.user_type || profile.account_type;
        const sellerRoles = profile.seller_roles || [];

        if (userType === 'seller' || sellerRoles.length > 0) {
          const { data: robotsData } = await supabase
            .from('robots')
            .select('id, price, availability')
            .eq('seller_id', user.id);

          stats = {
            totalRobots: robotsData?.length || 0,
            activeListings: robotsData?.filter(r => r.availability === 'available').length || 0,
            totalRevenue: robotsData?.reduce((sum, r) => sum + (r.price || 0), 0) || 0
          };
        } else {
          const { data: robotsData } = await supabase
            .from('robots')
            .select('id, price')
            .limit(10);

          stats = {
            totalRobots: robotsData?.length || 0,
            totalRevenue: 0
          };
        }
      }

      setDashboardStats(stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setDashboardStats({
        totalUsers: 0,
        totalRobots: 0,
        totalRevenue: 0,
        activeListings: 0
      });
    }
  };

  // Profile setup handler
  const handleProfileSetup = async (userData: any) => {
    try {
      const profileData = {
        user_id: user?.id,
        email: user?.email,
        full_name: userData.fullName,
        user_type: userData.userType,
        seller_roles: userData.sellerRoles || [],
        service_categories: userData.serviceCategories || [],
        company_name: userData.companyName,
        phone: userData.phone,
        updated_at: new Date().toISOString()
      };

      const { data: dbProfile, error } = await supabase
        .from('profiles')
        .insert(profileData)
        .select()
        .single();

      if (error) throw error;

      const convertedProfile = convertToUserProfile(dbProfile as DatabaseProfile);
      setUserProfile(convertedProfile);
      setShowProfileSetup(false);
      
      toast({
        title: "Profile Setup Complete",
        description: "Welcome to the Robot Marketplace!"
      });
    } catch (error) {
      console.error('Error setting up profile:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to setup profile"
      });
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Route to specialized dashboards
  const renderSpecializedDashboard = () => {
    if (isAdmin) {
      return <AdminDashboard userProfile={userProfile} />;
    }

    if (!userProfile) return null;

    const userType = userProfile.user_type;
    const sellerRoles = userProfile.seller_roles || [];
    const hasMultipleRoles = sellerRoles.length > 1;

    if ((userType === 'seller' || sellerRoles.length > 0) && hasMultipleRoles) {
      return <MultiRoleSellerDashboard userProfile={userProfile} />;
    }

    switch (userType) {
      case 'buyer':
        return <BuyerDashboard userProfile={userProfile} />;
      case 'seller':
        if (sellerRoles.includes('robot_seller')) {
          return <RobotSellerDashboard userProfile={userProfile} />;
        }
        return <MultiRoleSellerDashboard userProfile={userProfile} />;
      case 'service_provider':
        return <ServiceProviderDashboard userProfile={userProfile} />;
      case 'logistics_provider':
      case 'finance_provider':
        return <BuyerDashboard userProfile={userProfile} />;
      default:
        return <BuyerDashboard userProfile={userProfile} />;
    }
  };

  const hasCompletedProfile = (profile: UserProfile | null): boolean => {
    if (!profile) return false;
    return !!profile.user_type && !!profile.full_name;
  };

  // Profile setup screen
  if (showProfileSetup || (userProfile && !hasCompletedProfile(userProfile))) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-6 w-6" />
              Complete Your Profile Setup
            </CardTitle>
            <CardDescription>
              Welcome! Let's set up your profile to get started.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileSetupForm onComplete={handleProfileSetup} />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <div>
            <p className="text-lg font-medium">Loading Dashboard</p>
            <p className="text-sm text-muted-foreground">
              Setting up your personalized experience...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // If user has a profile and specialized dashboard should be shown
  if (userProfile && hasCompletedProfile(userProfile)) {
    return renderSpecializedDashboard();
  }

  // Generic dashboard (rest of your existing code)
  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Welcome to Robot Marketplace
            </h1>
            <p className="text-muted-foreground">
              {userProfile?.full_name ? `Hello ${userProfile.full_name}!` : 'Your industrial robotics platform'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={() => fetchDashboardData(true)}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={() => navigate('/profile')}>
              <Settings className="h-4 w-4 mr-2" />
              Complete Setup
            </Button>
          </div>
        </div>

        {/* Add the rest of your existing JSX here */}
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-yellow-800">
            Complete your profile setup to access specialized dashboard features.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
};

// Profile setup form
const ProfileSetupForm = ({ onComplete }: { onComplete: (data: any) => void }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    userType: '',
    companyName: '',
    phone: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Full Name</label>
        <input
          type="text"
          value={formData.fullName}
          onChange={(e) => setFormData({...formData, fullName: e.target.value})}
          className="w-full p-2 border rounded-md"
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">I am a</label>
        <select
          value={formData.userType}
          onChange={(e) => setFormData({...formData, userType: e.target.value})}
          className="w-full p-2 border rounded-md"
          required
        >
          <option value="">Select user type</option>
          <option value="buyer">Buyer</option>
          <option value="seller">Seller</option>
          <option value="service_provider">Service Provider</option>
          <option value="logistics_provider">Logistics Provider</option>
          <option value="finance_provider">Finance Provider</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Company Name (Optional)</label>
        <input
          type="text"
          value={formData.companyName}
          onChange={(e) => setFormData({...formData, companyName: e.target.value})}
          className="w-full p-2 border rounded-md"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Phone Number</label>
        <input
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({...formData, phone: e.target.value})}
          className="w-full p-2 border rounded-md"
        />
      </div>

      <Button type="submit" className="w-full">
        Complete Setup
      </Button>
    </form>
  );
};

export default Dashboard;
