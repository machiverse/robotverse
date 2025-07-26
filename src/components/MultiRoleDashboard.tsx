import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Wrench,
  Heart,
  Shield,
  Truck,
  CreditCard,
  Home,
  AlertCircle
} from "lucide-react";
import BuyerDashboard from "./dashboards/BuyerDashboard";
import RobotSellerDashboard from "./dashboards/RobotSellerDashboard";
import RobotUpload from "./RobotUpload";
import SpareParts from "./SpareParts";
import ServiceListing from "./ServiceListing";
import LogisticsProviderForm from "./LogisticsProviderForm";
import FinanceProviderForm from "./FinanceProviderForm";

interface MultiRoleDashboardProps {
  userProfile: any;
}

const MultiRoleDashboard = ({ userProfile }: MultiRoleDashboardProps) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [showProviderForm, setShowProviderForm] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userType = userProfile?.user_type;
  const sellerRoles = userProfile?.seller_roles || [];
  const logisticsType = userProfile?.logistics_type;
  const financeType = userProfile?.finance_type;

  // Debug logging
  console.log('Dashboard Debug:', {
    userType,
    sellerRoles,
    logisticsType,
    financeType,
    userProfile,
    user: user?.id
  });

  useEffect(() => {
    fetchDashboardData();
  }, [user, userType]);

  useEffect(() => {
    // Show provider form popup for logistics/finance providers after signup
    if ((userType === 'logistics_provider' || userType === 'finance_provider') && !userProfile?.company_name) {
      setShowProviderForm(true);
    }
  }, [userType, userProfile]);

  const fetchDashboardData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching data for user:', user.id, 'Type:', userType);
      
      let data: any = {
        robots: { count: 0, revenue: 0 },
        parts: { count: 0, orders: 0 },
        services: { count: 0, revenue: 0 },
        orders: { count: 0, total: 0 },
        wishlist: { count: 0 }
      };

      // Fetch real data based on user type
      if (userType === 'seller' || sellerRoles.includes('robot_seller')) {
        const { data: robots, error: robotError } = await supabase
          .from('robots')
          .select('id, price')
          .eq('seller_id', user.id);
        
        if (robotError) console.error('Robot fetch error:', robotError);
        
        data.robots.count = robots?.length || 0;
        data.robots.revenue = robots?.reduce((sum, robot) => sum + (robot.price || 0), 0) || 0;
      }

      if (userType === 'seller' || sellerRoles.includes('parts_seller')) {
        const { data: parts, error: partsError } = await supabase
          .from('spare_parts')
          .select('id, price')
          .eq('seller_id', user.id);
        
        if (partsError) console.error('Parts fetch error:', partsError);
        
        data.parts.count = parts?.length || 0;
      }

      if (userType === 'service_provider' || sellerRoles.includes('service_provider')) {
        const { data: services, error: servicesError } = await supabase
          .from('services')
          .select('id')
          .eq('provider_id', user.id);
        
        if (servicesError) console.error('Services fetch error:', servicesError);
        
        data.services.count = services?.length || 0;
      }

      if (userType === 'buyer') {
        // TODO: Implement wishlist functionality when user_wishlist table is created
        data.wishlist.count = 0;
      }

      console.log('Dashboard data fetched:', data);
      setDashboardData(data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data');
      // Set default data
      setDashboardData({
        robots: { count: 0, revenue: 0 },
        parts: { count: 0, orders: 0 },
        services: { count: 0, revenue: 0 },
        orders: { count: 0, total: 0 },
        wishlist: { count: 0 }
      });
    } finally {
      setLoading(false);
    }
  };

  const getBuyerStats = () => [
    { label: 'Saved Robots', value: dashboardData?.wishlist?.count || '0', icon: Heart, trend: 'Active' },
    { label: 'Total Orders', value: dashboardData?.orders?.count || '0', icon: ShoppingCart, trend: 'All time' },
    { label: 'Order Value', value: `₹${dashboardData?.orders?.total || 0}`, icon: DollarSign, trend: 'Total spent' },
    { label: 'Reviews Given', value: '0', icon: Star, trend: 'Pending' }
  ];

  const getSellerStats = () => {
    const stats = [];
    
    if (sellerRoles.includes('robot_seller') || userType === 'seller') {
      stats.push(
        { label: 'Robot Listings', value: dashboardData?.robots?.count || '0', icon: Bot, trend: 'Active' },
        { label: 'Robot Revenue', value: `₹${dashboardData?.robots?.revenue || 0}`, icon: DollarSign, trend: 'Total' }
      );
    }
    
    if (sellerRoles.includes('parts_seller') || userType === 'seller') {
      stats.push(
        { label: 'Parts in Stock', value: dashboardData?.parts?.count || '0', icon: Package, trend: 'Available' }
      );
    }
    
    if (sellerRoles.includes('service_provider') || userType === 'seller') {
      stats.push(
        { label: 'Active Services', value: dashboardData?.services?.count || '0', icon: Settings, trend: 'Listed' }
      );
    }

    if (stats.length === 0) {
      stats.push(
        { label: 'Get Started', value: 'Add', icon: Plus, trend: 'Listings' },
        { label: 'Total Revenue', value: '₹0', icon: DollarSign, trend: 'Pending' }
      );
    }

    return stats;
  };

  const getProviderStats = () => [
    { label: 'Active Contracts', value: '0', icon: Activity, trend: 'Current' },
    { label: 'Revenue', value: '₹0', icon: DollarSign, trend: 'This month' },
    { label: 'Client Rating', value: '5.0', icon: Star, trend: 'Average' },
    { label: 'Coverage Area', value: userProfile?.logistics_region || 'Pan India', icon: Truck, trend: 'Service area' }
  ];

  const getBuyerQuickActions = () => [
    { label: 'Browse Robots', icon: Bot, action: () => window.location.href = '/robots' },
    { label: 'Spare Parts', icon: Package, action: () => window.location.href = '/parts' },
    { label: 'Find Services', icon: Wrench, action: () => window.location.href = '/services' },
    { label: 'My Wishlist', icon: Heart, action: () => setActiveTab('wishlist') },
    { label: 'Loan Options', icon: CreditCard, action: () => window.location.href = '/finance' },
    { label: 'Insurance', icon: Shield, action: () => window.location.href = '/insurance' },
    { label: 'Logistics', icon: Truck, action: () => window.location.href = '/logistics' },
    { label: 'My Orders', icon: ShoppingCart, action: () => setActiveTab('orders') }
  ];

  const renderOverview = () => {
    let stats, quickActions, title;

    if (userType === 'buyer') {
      stats = getBuyerStats();
      quickActions = getBuyerQuickActions();
      title = 'Buyer Dashboard';
    } else if (userType === 'seller') {
      stats = getSellerStats();
      quickActions = [];
      title = 'Seller Dashboard';
    } else if (userType === 'logistics_provider' || userType === 'finance_provider') {
      stats = getProviderStats();
      quickActions = [];
      title = `${userType === 'logistics_provider' ? 'Logistics' : 'Finance'} Provider Dashboard`;
    } else {
      stats = [
        { label: 'Welcome', value: 'Setup', icon: Home, trend: 'Required' },
        { label: 'Profile', value: 'Complete', icon: Users, trend: 'Your profile' }
      ];
      quickActions = [];
      title = 'Dashboard Setup';
    }

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">{title}</h2>
          <p className="text-muted-foreground">Welcome back, {userProfile?.full_name || user?.email || 'User'}</p>
          {error && (
            <div className="flex items-center gap-2 text-red-600 mt-2">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="bg-gradient-card border-border hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="text-2xl font-bold">{stat.value}</p>
                      <Badge variant="secondary" className="mt-1 text-xs">
                        {stat.trend}
                      </Badge>
                    </div>
                    <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions for Buyers */}
        {userType === 'buyer' && quickActions.length > 0 && (
          <Card className="bg-gradient-card border-border">
            <CardHeader>
              <CardTitle>Quick Access</CardTitle>
              <CardDescription>Explore robot marketplace resources</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {quickActions.map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <Button 
                      key={index} 
                      variant="outline" 
                      className="h-auto p-4 flex flex-col items-center space-y-2 hover:bg-primary/10"
                      onClick={action.action}
                    >
                      <Icon className="w-6 h-6" />
                      <span className="text-sm">{action.label}</span>
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Setup Guide for new users */}
        {!userType && (
          <Card className="bg-gradient-card border-border border-yellow-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                Complete Your Profile Setup
              </CardTitle>
              <CardDescription>Please select your user type to access your personalized dashboard.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button variant="outline" onClick={() => window.location.href = '/profile?type=buyer'}>
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  I'm a Buyer
                </Button>
                <Button variant="outline" onClick={() => window.location.href = '/profile?type=seller'}>
                  <Package className="w-4 h-4 mr-2" />
                  I'm a Seller
                </Button>
                <Button variant="outline" onClick={() => window.location.href = '/profile?type=provider'}>
                  <Settings className="w-4 h-4 mr-2" />
                  I'm a Provider
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="container mx-auto px-4">
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

  // Profile Setup Required
  if (!userProfile || !userType) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="container mx-auto px-4">
          {renderOverview()}
        </div>
      </div>
    );
  }

  // Buyer Dashboard - Use enhanced buyer dashboard
  if (userType === 'buyer') {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="container mx-auto px-4">
          <BuyerDashboard userProfile={userProfile} />
        </div>
      </div>
    );
  }

  // Provider Dashboard - Simple overview
  if (userType === 'logistics_provider' || userType === 'finance_provider') {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="container mx-auto px-4">
          {renderOverview()}
          
          {/* Provider Form Popup */}
          {showProviderForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-background rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {userType === 'logistics_provider' ? (
                  <LogisticsProviderForm onComplete={() => setShowProviderForm(false)} />
                ) : (
                  <FinanceProviderForm onComplete={() => setShowProviderForm(false)} />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Multi-Role Seller Dashboard
  const hasMultipleRoles = sellerRoles.length > 1;
  const isPrimaryRobotSeller = sellerRoles.includes('robot_seller') || userType === 'seller';
  
  // If user is primarily a robot seller or has multiple roles, show enhanced interface
  if (isPrimaryRobotSeller && userType === 'seller') {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="container mx-auto px-4">
          {hasMultipleRoles ? (
            // Multi-role interface with tabs
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
                <TabsTrigger value="overview" className="flex items-center gap-2">
                  <Home className="w-4 h-4" />
                  Overview
                </TabsTrigger>
                
                {sellerRoles.includes('robot_seller') && (
                  <TabsTrigger value="robots" className="flex items-center gap-2">
                    <Bot className="w-4 h-4" />
                    Robots
                  </TabsTrigger>
                )}
                
                {sellerRoles.includes('parts_seller') && (
                  <TabsTrigger value="parts" className="flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Parts
                  </TabsTrigger>
                )}
                
                {sellerRoles.includes('service_provider') && (
                  <TabsTrigger value="services" className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Services
                  </TabsTrigger>
                )}

                <TabsTrigger value="analytics" className="flex items-center gap-2">
                  <BarChart className="w-4 h-4" />
                  Analytics
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-6">
                {renderOverview()}
              </TabsContent>

              {sellerRoles.includes('robot_seller') && (
                <TabsContent value="robots" className="mt-6">
                  <RobotSellerDashboard userProfile={userProfile} />
                </TabsContent>
              )}

              {sellerRoles.includes('parts_seller') && (
                <TabsContent value="parts" className="mt-6">
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold mb-2">Spare Parts</h2>
                      <p className="text-muted-foreground">Manage your spare parts inventory</p>
                    </div>
                    <SpareParts />
                  </div>
                </TabsContent>
              )}

              {sellerRoles.includes('service_provider') && (
                <TabsContent value="services" className="mt-6">
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold mb-2">Service Offerings</h2>
                      <p className="text-muted-foreground">Manage your service listings</p>
                    </div>
                    <ServiceListing />
                  </div>
                </TabsContent>
              )}

              <TabsContent value="analytics" className="mt-6">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Analytics & Reports</h2>
                    <p className="text-muted-foreground">View your sales performance and insights</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Sales Overview</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold">₹{dashboardData?.robots?.revenue || 0}</p>
                        <p className="text-sm text-muted-foreground">Total Revenue</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle>Product Performance</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold">{(dashboardData?.robots?.count || 0) + (dashboardData?.parts?.count || 0)}</p>
                        <p className="text-sm text-muted-foreground">Active Listings</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            // Single-role robot seller gets full dedicated dashboard
            <RobotSellerDashboard userProfile={userProfile} />
          )}
        </div>
      </div>
    );
  }

  // Fallback for other seller types or basic interface
  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Home className="w-4 h-4" />
              Overview
            </TabsTrigger>
            
            <TabsTrigger value="robots" className="flex items-center gap-2">
              <Bot className="w-4 h-4" />
              Robots
            </TabsTrigger>
            
            <TabsTrigger value="parts" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Parts
            </TabsTrigger>
            
            <TabsTrigger value="services" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Services
            </TabsTrigger>

            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart className="w-4 h-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            {renderOverview()}
          </TabsContent>

          <TabsContent value="robots" className="mt-6">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Robot Listings</h2>
                <p className="text-muted-foreground">Manage your robot inventory and listings</p>
              </div>
              <RobotUpload />
            </div>
          </TabsContent>

          <TabsContent value="parts" className="mt-6">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Spare Parts</h2>
                <p className="text-muted-foreground">Manage your spare parts inventory</p>
              </div>
              <SpareParts />
            </div>
          </TabsContent>

          <TabsContent value="services" className="mt-6">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Service Offerings</h2>
                <p className="text-muted-foreground">Manage your service listings</p>
              </div>
              <ServiceListing />
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Analytics & Reports</h2>
                <p className="text-muted-foreground">View your sales performance and insights</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Sales Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">₹{dashboardData?.robots?.revenue || 0}</p>
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Product Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{(dashboardData?.robots?.count || 0) + (dashboardData?.parts?.count || 0)}</p>
                    <p className="text-sm text-muted-foreground">Active Listings</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MultiRoleDashboard;
