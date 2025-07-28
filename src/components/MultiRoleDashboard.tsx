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
  Home
} from "lucide-react";
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

  const userType = userProfile?.user_type;
  const sellerRoles = userProfile?.seller_roles || [];
  const logisticsType = userProfile?.logistics_type;
  const financeType = userProfile?.finance_type;

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
    if (!user) return;
    
    try {
      setLoading(true);
      let data: any = {
        robots: { count: 0, revenue: 0 },
        parts: { count: 0, orders: 0 },
        services: { count: 0, revenue: 0 },
        orders: { count: 0, total: 0 },
        wishlist: { count: 0 }
      };

      // Fetch real data based on user type
      if (userType === 'seller' || sellerRoles.includes('robot_seller')) {
        const { data: robots } = await supabase
          .from('robots')
          .select('id, price')
          .eq('seller_id', user.id);
        
        data.robots.count = robots?.length || 0;
        data.robots.revenue = robots?.reduce((sum, robot) => sum + (robot.price || 0), 0) || 0;
      }

      if (userType === 'seller' || sellerRoles.includes('parts_seller')) {
        const { data: parts } = await supabase
          .from('spare_parts')
          .select('id, price')
          .eq('seller_id', user.id);
        
        data.parts.count = parts?.length || 0;
      }

      if (userType === 'service_provider' || sellerRoles.includes('service_provider')) {
        const { data: services } = await supabase
          .from('services')
          .select('id')
          .eq('provider_id', user.id);
        
        data.services.count = services?.length || 0;
      }

      setDashboardData(data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
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
    
    if (sellerRoles.includes('robot_seller')) {
      stats.push(
        { label: 'Robot Listings', value: dashboardData?.robots?.count || '0', icon: Bot, trend: 'Active' },
        { label: 'Robot Revenue', value: `₹${dashboardData?.robots?.revenue || 0}`, icon: DollarSign, trend: 'Total' }
      );
    }
    
    if (sellerRoles.includes('parts_seller')) {
      stats.push(
        { label: 'Parts in Stock', value: dashboardData?.parts?.count || '0', icon: Package, trend: 'Available' }
      );
    }
    
    if (sellerRoles.includes('service_provider')) {
      stats.push(
        { label: 'Active Services', value: dashboardData?.services?.count || '0', icon: Settings, trend: 'Listed' }
      );
    }

    if (stats.length === 0) {
      stats.push(
        { label: 'Get Started', value: 'Add', icon: Plus, trend: 'Listings' }
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
    { label: 'My Wishlist', icon: Heart, action: () => {} },
    { label: 'Loan Options', icon: CreditCard, action: () => {} },
    { label: 'Insurance', icon: Shield, action: () => {} },
    { label: 'Logistics', icon: Truck, action: () => {} },
    { label: 'My Orders', icon: ShoppingCart, action: () => {} }
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
      stats = [];
      quickActions = [];
      title = 'Dashboard';
    }

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">{title}</h2>
          <p className="text-muted-foreground">Welcome back, {userProfile?.full_name || 'User'}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="bg-gradient-card border-border">
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
                      className="h-auto p-4 flex flex-col items-center space-y-2"
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
      </div>
    );
  };

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

  // Buyer Dashboard - Simple overview
  if (userType === 'buyer') {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="container mx-auto px-4">
          {renderOverview()}
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

  // Seller Dashboard - Multi-role with tabs
  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4">
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
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            {renderOverview()}
          </TabsContent>

          {sellerRoles.includes('robot_seller') && (
            <TabsContent value="robots" className="mt-6">
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Robot Listings</h2>
                  <p className="text-muted-foreground">Manage your robot inventory and listings</p>
                </div>
                <RobotUpload />
              </div>
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
        </Tabs>
      </div>
    </div>
  );
};

export default MultiRoleDashboard;