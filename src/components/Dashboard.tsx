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

// Import specialized dashboard components
import BuyerDashboard from '@/components/dashboards/BuyerDashboard';
import RobotSellerDashboard from '@/components/dashboards/RobotSellerDashboard';
import ServiceProviderDashboard from '@/components/dashboards/ServiceProviderDashboard';
import AdminDashboard from '@/components/dashboards/AdminDashboard';
import MultiRoleSellerDashboard from '@/components/MultiRoleSellerDashboard';

// Updated interface to match actual database schema
interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name?: string;
  user_type?: string; // Changed to string to accept any value
  account_type?: string;
  seller_roles?: string[];
  service_categories?: string[];
  company_name?: string;
  phone?: string;
  verification_status?: boolean;
  created_at: string;
  updated_at: string; // Added missing property
  // Add other properties that might exist in the actual schema
  [key: string]: any; // Allow additional properties
}

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

      // Fetch user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        if (profileError.code === 'PGRST116') {
          // Profile doesn't exist, show setup
          setShowProfileSetup(true);
        } else {
          throw profileError;
        }
      } else {
        setUserProfile(profile as UserProfile);
        await fetchStats(profile as UserProfile);
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
        // Admin stats - only query existing tables
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
        // For non-admin users, fetch basic stats from available tables
        const userType = profile.user_type || profile.account_type;
        const sellerRoles = profile.seller_roles || [];

        if (userType === 'seller' || sellerRoles.length > 0) {
          // Seller stats - only from robots table
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
          // Basic stats for other user types
          const { data: robotsData } = await supabase
            .from('robots')
            .select('id, price')
            .limit(10);

          stats = {
            totalRobots: robotsData?.length || 0,
            totalRevenue: 0 // Can't calculate user-specific revenue without orders table
          };
        }
      }

      setDashboardStats(stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Set default stats on error
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

      const { data: profile, error } = await supabase
        .from('profiles')
        .insert(profileData)
        .select()
        .single();

      if (error) throw error;

      setUserProfile(profile as UserProfile);
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

  // Route to specialized dashboards based on user type and roles
  const renderSpecializedDashboard = () => {
    if (isAdmin) {
      return <AdminDashboard userProfile={userProfile} />;
    }

    if (!userProfile) return null;

    const userType = userProfile.user_type || userProfile.account_type;
    const sellerRoles = userProfile.seller_roles || [];
    const hasMultipleRoles = sellerRoles.length > 1;

    // Multi-role seller dashboard
    if ((userType === 'seller' || sellerRoles.length > 0) && hasMultipleRoles) {
      return <MultiRoleSellerDashboard userProfile={userProfile} />;
    }

    // Specialized dashboards with type checking
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
      default:
        // Fallback to buyer dashboard for any unrecognized type
        return <BuyerDashboard userProfile={userProfile} />;
    }
  };

  // Check if user has completed profile setup
  const hasCompletedProfile = (profile: UserProfile | null): boolean => {
    if (!profile) return false;
    return !!(profile.user_type || profile.account_type) && !!profile.full_name;
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

  // Generic dashboard with overview (fallback)
  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Header */}
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

        {/* Profile Completion Alert */}
        {userProfile && !hasCompletedProfile(userProfile) && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-yellow-800">
              <strong>Profile Incomplete:</strong> Please complete your profile setup to access all features.
              <Button 
                variant="link" 
                className="p-0 ml-2 text-yellow-800 underline" 
                onClick={() => navigate('/profile')}
              >
                Complete Now
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Platform Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-800">Platform Users</p>
                  <p className="text-2xl font-bold text-blue-900">{dashboardStats.totalUsers || '1,000+'}</p>
                  <Badge variant="secondary" className="mt-1 text-xs">
                    Active community
                  </Badge>
                </div>
                <div className="h-12 w-12 rounded-lg bg-blue-200 flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-800">Robot Listings</p>
                  <p className="text-2xl font-bold text-green-900">{dashboardStats.totalRobots || '500+'}</p>
                  <Badge variant="secondary" className="mt-1 text-xs">
                    Available now
                  </Badge>
                </div>
                <div className="h-12 w-12 rounded-lg bg-green-200 flex items-center justify-center">
                  <Bot className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-800">Services</p>
                  <p className="text-2xl font-bold text-purple-900">{dashboardStats.totalServices || '200+'}</p>
                  <Badge variant="secondary" className="mt-1 text-xs">
                    Available providers
                  </Badge>
                </div>
                <div className="h-12 w-12 rounded-lg bg-purple-200 flex items-center justify-center">
                  <Wrench className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-800">Spare Parts</p>
                  <p className="text-2xl font-bold text-orange-900">{dashboardStats.totalParts || '1,000+'}</p>
                  <Badge variant="secondary" className="mt-1 text-xs">
                    In stock
                  </Badge>
                </div>
                <div className="h-12 w-12 rounded-lg bg-orange-200 flex items-center justify-center">
                  <Package className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Access */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Quick Access
            </CardTitle>
            <CardDescription>
              Get started with these popular features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { 
                  label: 'Browse Robots', 
                  description: 'Explore industrial robots',
                  icon: Bot, 
                  path: '/robots',
                  color: 'bg-blue-500'
                },
                { 
                  label: 'Find Services', 
                  description: 'Maintenance & installation',
                  icon: Wrench, 
                  path: '/services',
                  color: 'bg-purple-500'
                },
                { 
                  label: 'Spare Parts', 
                  description: 'Robot components',
                  icon: Package, 
                  path: '/parts',
                  color: 'bg-green-500'
                },
                { 
                  label: 'Get Financing', 
                  description: 'Loan options',
                  icon: CreditCard, 
                  path: '/finance',
                  color: 'bg-orange-500'
                },
                { 
                  label: 'Arrange Logistics', 
                  description: 'Shipping solutions',
                  icon: Truck, 
                  path: '/logistics',
                  color: 'bg-red-500'
                },
                { 
                  label: 'Get Insurance', 
                  description: 'Protect investments',
                  icon: Shield, 
                  path: '/insurance',
                  color: 'bg-cyan-500'
                }
              ].map((action, index) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={index}
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center space-y-2 hover:bg-primary/10 group"
                    onClick={() => navigate(action.path)}
                  >
                    <div className={`w-12 h-12 rounded-lg ${action.color} flex items-center justify-center text-white group-hover:scale-110 transition-transform`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-sm">{action.label}</p>
                      <p className="text-xs text-muted-foreground">{action.description}</p>
                    </div>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Getting Started */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
              <CardDescription>Complete your profile setup</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Profile Information</p>
                  <p className="text-sm text-muted-foreground">Add your details</p>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={userProfile?.full_name ? 80 : 20} className="w-16" />
                  <Button size="sm" onClick={() => navigate('/profile')}>
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Account Verification</p>
                  <p className="text-sm text-muted-foreground">Verify your account</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={userProfile?.verification_status ? "default" : "secondary"}>
                    {userProfile?.verification_status ? "Verified" : "Pending"}
                  </Badge>
                  <Button size="sm" variant="outline">
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Platform Features</CardTitle>
              <CardDescription>Discover what you can do</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { title: 'Buy Industrial Robots', description: 'Find the perfect robot for your needs' },
                { title: 'Sell Your Equipment', description: 'List your robots and reach buyers' },
                { title: 'Professional Services', description: 'Installation, maintenance, and support' },
                { title: 'Financial Solutions', description: 'Flexible payment and leasing options' }
              ].map((feature, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center mt-0.5">
                    <CheckCircle className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{feature.title}</p>
                    <p className="text-xs text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

// Simple profile setup form component
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
