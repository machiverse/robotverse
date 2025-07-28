import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bot,
  Package,
  Wrench,
  CreditCard,
  Truck,
  Shield,
  Search,
  Heart,
  ShoppingCart,
  TrendingUp,
  DollarSign,
  Clock,
  Star,
  Plus,
  Filter,
  MapPin,
  Activity
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { UserProfile } from '@/types/user';
interface BuyerDashboardProps {
  userProfile: any;
}

const BuyerDashboard = ({ userProfile }: BuyerDashboardProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [dashboardStats, setDashboardStats] = useState({
    savedItems: 0,
    activeOrders: 0,
    totalSpent: 0,
    wishlistCount: 0
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [recommendedProducts, setRecommendedProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;
    
    try {
      // TODO: Implement actual data fetching when orders and wishlist tables are created
      // For now, using placeholder data
      setDashboardStats({
        savedItems: 0,
        activeOrders: 0,
        totalSpent: 0,
        wishlistCount: 0
      });

      // Fetch recommended robots (recent listings)
      const { data: robots } = await supabase
        .from('robots')
        .select('*')
        .eq('availability', 'available')
        .order('created_at', { ascending: false })
        .limit(6);

      setRecommendedProducts(robots || []);
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching buyer dashboard data:', error);
      setLoading(false);
    }
  };

  const quickActions = [
    {
      title: 'Browse Robots',
      description: 'Explore industrial robots',
      icon: Bot,
      path: '/robots',
      color: 'bg-blue-500'
    },
    {
      title: 'Spare Parts',
      description: 'Find robot components',
      icon: Package,
      path: '/parts',
      color: 'bg-green-500'
    },
    {
      title: 'Book Services',
      description: 'Maintenance & repair',
      icon: Wrench,
      path: '/services',
      color: 'bg-purple-500'
    },
    {
      title: 'Get Financing',
      description: 'Loan options available',
      icon: CreditCard,
      path: '/finance',
      color: 'bg-orange-500'
    },
    {
      title: 'Arrange Logistics',
      description: 'Shipping solutions',
      icon: Truck,
      path: '/logistics',
      color: 'bg-red-500'
    },
    {
      title: 'Get Insurance',
      description: 'Protect your investment',
      icon: Shield,
      path: '/insurance',
      color: 'bg-cyan-500'
    }
  ];

  const statsCards = [
    {
      title: 'Saved Items',
      value: dashboardStats.savedItems,
      icon: Heart,
      trend: 'In wishlist',
      color: 'text-red-600'
    },
    {
      title: 'Active Orders',
      value: dashboardStats.activeOrders,
      icon: ShoppingCart,
      trend: 'In progress',
      color: 'text-blue-600'
    },
    {
      title: 'Total Spent',
      value: `₹${dashboardStats.totalSpent.toLocaleString()}`,
      icon: DollarSign,
      trend: 'All time',
      color: 'text-green-600'
    },
    {
      title: 'Account Status',
      value: 'Verified',
      icon: Star,
      trend: 'Premium member',
      color: 'text-yellow-600'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {userProfile?.full_name || 'Buyer'}</h1>
          <p className="text-muted-foreground">Discover the best robots and services for your business</p>
        </div>
        <div className="flex items-center space-x-2 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search robots, parts, services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <Badge variant="secondary" className="mt-1 text-xs">
                      {stat.trend}
                    </Badge>
                  </div>
                  <div className={`w-12 h-12 rounded-lg bg-muted flex items-center justify-center ${stat.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Access</CardTitle>
          <CardDescription>Explore marketplace resources and services</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickActions.map((action, index) => {
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
                    <p className="font-semibold">{action.title}</p>
                    <p className="text-xs text-muted-foreground">{action.description}</p>
                  </div>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="wishlist">Wishlist</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="recommendations">Recommended</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentActivity.length === 0 ? (
                  <div className="text-center py-8">
                    <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No recent activity</p>
                    <Button variant="outline" className="mt-2" onClick={() => navigate('/robots')}>
                      Start Exploring
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentActivity.map((activity, index) => (
                      <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg">
                        <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                          <Clock className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{activity.title}</p>
                          <p className="text-sm text-muted-foreground">{activity.description}</p>
                        </div>
                        <Badge variant="secondary">{activity.time}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Your Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Profile Completion</p>
                    <p className="text-sm text-muted-foreground">Complete your profile for better recommendations</p>
                  </div>
                  <Badge variant="outline">85%</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Verification Status</p>
                    <p className="text-sm text-muted-foreground">Verified buyers get priority support</p>
                  </div>
                  <Badge variant="secondary">Verified</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Membership Level</p>
                    <p className="text-sm text-muted-foreground">Unlock premium features</p>
                  </div>
                  <Badge>Premium</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="wishlist" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5" />
                My Wishlist
              </CardTitle>
              <CardDescription>Items you've saved for later</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">Your wishlist is empty</p>
                <Button onClick={() => navigate('/robots')}>
                  Browse Robots
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                My Orders
              </CardTitle>
              <CardDescription>Track your order history and status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No orders yet</p>
                <Button onClick={() => navigate('/robots')}>
                  Start Shopping
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5" />
                Recommended for You
              </CardTitle>
              <CardDescription>Based on your interests and browsing history</CardDescription>
            </CardHeader>
            <CardContent>
              {recommendedProducts.length === 0 ? (
                <div className="text-center py-8">
                  <Bot className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No recommendations available</p>
                  <Button onClick={() => navigate('/robots')}>
                    Browse Catalog
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recommendedProducts.map((robot) => (
                    <Card key={robot.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(`/robots/${robot.id}`)}>
                      <CardContent className="p-4">
                        <div className="aspect-video bg-muted rounded-lg mb-3 flex items-center justify-center">
                          <Bot className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="font-semibold truncate">{robot.name}</h3>
                        <p className="text-sm text-muted-foreground">{robot.robot_type}</p>
                        <div className="flex items-center justify-between mt-2">
                          <Badge variant="secondary">{robot.availability}</Badge>
                          <p className="font-bold">₹{robot.price?.toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                          <MapPin className="w-3 h-3" />
                          <span>{robot.location || 'Location not specified'}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BuyerDashboard;