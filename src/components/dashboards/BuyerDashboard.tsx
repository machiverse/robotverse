import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
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
  Activity,
  CheckCircle,
  AlertCircle,
  Eye,
  MessageCircle,
  Calendar,
  User,
  Award,
  Target,
  RefreshCw,
  Bookmark,
  Bell,
  Settings,
  ExternalLink,
  Zap
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

// Type definitions for better type safety
interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name?: string;
  user_type?: string;
  phone?: string;
  company_name?: string;
  verification_status?: boolean;
  created_at: string;
}

interface WishlistItem {
  id: string;
  item_type: 'robots' | 'spare_parts';
  item_id: string;
  created_at: string;
  robots?: {
    name: string;
    price: number;
    images: string[];
    robot_type: string;
    availability: string;
  };
  spare_parts?: {
    name: string;
    price: number;
    category: string;
  };
}

interface Order {
  id: string;
  buyer_id: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  total_amount: number;
  items: any[];
  created_at: string;
}

interface Inquiry {
  id: string;
  buyer_id: string;
  subject: string;
  message: string;
  status: 'pending' | 'responded' | 'closed';
  created_at: string;
}

interface RecentActivity {
  id: string;
  title: string;
  description: string;
  time: string;
  type: 'wishlist' | 'order' | 'inquiry' | 'view';
  icon: any;
}

interface DashboardStats {
  savedItems: number;
  activeOrders: number;
  totalSpent: number;
  wishlistCount: number;
  completedOrders: number;
  pendingInquiries: number;
  reviewsGiven: number;
  accountLevel: 'Standard' | 'Gold' | 'Premium';
}

interface BuyerDashboardProps {
  userProfile: UserProfile;
}

const BuyerDashboard = ({ userProfile }: BuyerDashboardProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    savedItems: 0,
    activeOrders: 0,
    totalSpent: 0,
    wishlistCount: 0,
    completedOrders: 0,
    pendingInquiries: 0,
    reviewsGiven: 0,
    accountLevel: 'Standard'
  });
  
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [recommendedProducts, setRecommendedProducts] = useState<any[]>([]);
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [orderHistory, setOrderHistory] = useState<Order[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Check if user is actually a buyer
  const userType = userProfile?.user_type;
  const isBuyer = userType === 'buyer';

  // Memoized profile completion calculation
  const profileCompletion = useMemo(() => {
    let completion = 20; // Base score
    if (userProfile?.full_name) completion += 20;
    if (userProfile?.phone) completion += 20;
    if (userProfile?.company_name) completion += 20;
    if (userProfile?.verification_status) completion += 20;
    return Math.min(completion, 100);
  }, [userProfile]);

  // Fetch all dashboard data
  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    if (!user || !isBuyer) {
      setLoading(false);
      return;
    }
    
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // Fetch wishlist items
      const { data: wishlist, error: wishlistError } = await supabase
        .from('user_wishlist')
        .select(`
          id,
          item_type,
          item_id,
          created_at,
          robots (name, price, images, robot_type, availability),
          spare_parts (name, price, category)
        `)
        .eq('user_id', user.id);

      // Fetch orders
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false });

      // Fetch inquiries
      const { data: inquiriesData, error: inquiriesError } = await supabase
        .from('inquiries')
        .select('*')
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false });

      // Fetch recommended robots
      const { data: robots, error: robotsError } = await supabase
        .from('robots')
        .select('*')
        .eq('availability', 'available')
        .order('created_at', { ascending: false })
        .limit(8);

      // Handle errors gracefully
      if (wishlistError && wishlistError.code !== 'PGRST116') {
        console.error('Wishlist fetch error:', wishlistError);
      }
      if (ordersError && ordersError.code !== 'PGRST116') {
        console.error('Orders fetch error:', ordersError);
      }
      if (inquiriesError && inquiriesError.code !== 'PGRST116') {
        console.error('Inquiries fetch error:', inquiriesError);
      }
      if (robotsError) {
        console.error('Robots fetch error:', robotsError);
      }

      // Process data
      const wishlistCount = wishlist?.length || 0;
      const ordersCount = orders?.length || 0;
      const activeOrders = orders?.filter(order => 
        ['pending', 'processing', 'shipped'].includes(order.status)
      ).length || 0;
      const completedOrders = orders?.filter(order => order.status === 'completed').length || 0;
      const totalSpent = orders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
      const pendingInquiries = inquiriesData?.filter(inquiry => inquiry.status === 'pending').length || 0;

      // Calculate account level based on spending
      let accountLevel: 'Standard' | 'Gold' | 'Premium' = 'Standard';
      if (totalSpent > 1000000) accountLevel = 'Premium';
      else if (totalSpent > 500000) accountLevel = 'Gold';

      setDashboardStats({
        savedItems: wishlistCount,
        activeOrders,
        totalSpent,
        wishlistCount,
        completedOrders,
        pendingInquiries,
        reviewsGiven: 0, // TODO: Implement reviews system
        accountLevel
      });

      setWishlistItems(wishlist || []);
      setOrderHistory(orders || []);
      setInquiries(inquiriesData || []);
      setRecommendedProducts(robots || []);

      // Generate recent activity
      const activities: RecentActivity[] = [];
      
      if (wishlist && wishlist.length > 0) {
        activities.push({
          id: '1',
          title: 'Added to Wishlist',
          description: `Added ${wishlist[0].robots?.name || wishlist[0].spare_parts?.name} to wishlist`,
          time: new Date(wishlist[0].created_at).toLocaleDateString(),
          type: 'wishlist',
          icon: Heart
        });
      }
      
      if (orders && orders.length > 0) {
        activities.push({
          id: '2',
          title: 'Order Placed',
          description: `Order #${orders[0].id.slice(-8)} for ₹${orders[0].total_amount?.toLocaleString()}`,
          time: new Date(orders[0].created_at).toLocaleDateString(),
          type: 'order',
          icon: ShoppingCart
        });
      }

      if (inquiriesData && inquiriesData.length > 0) {
        activities.push({
          id: '3',
          title: 'Inquiry Sent',
          description: inquiriesData[0].subject,
          time: new Date(inquiriesData[0].created_at).toLocaleDateString(),
          type: 'inquiry',
          icon: MessageCircle
        });
      }

      setRecentActivity(activities);

      if (isRefresh) {
        toast({
          title: "Dashboard Updated",
          description: "Your data has been refreshed successfully.",
        });
      }

    } catch (error) {
      console.error('Error fetching buyer dashboard data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load dashboard data. Please try again.",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, isBuyer, toast]);

  // Handle wishlist removal
  const handleWishlistRemove = async (wishlistId: string) => {
    try {
      const { error } = await supabase
        .from('user_wishlist')
        .delete()
        .eq('id', wishlistId)
        .eq('user_id', user?.id);

      if (error) throw error;

      setWishlistItems(prev => prev.filter(item => item.id !== wishlistId));
      setDashboardStats(prev => ({
        ...prev,
        wishlistCount: prev.wishlistCount - 1,
        savedItems: prev.savedItems - 1
      }));

      toast({
        title: "Success",
        description: "Item removed from wishlist"
      });
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to remove item from wishlist"
      });
    }
  };

  // Enhanced quick actions with counts
  const quickActions = [
    {
      title: 'Browse Robots',
      description: 'Explore industrial robots',
      icon: Bot,
      path: '/robots',
      color: 'bg-blue-500',
      count: recommendedProducts.length
    },
    {
      title: 'Spare Parts',
      description: 'Find robot components',
      icon: Package,
      path: '/parts',
      color: 'bg-green-500',
      count: 0
    },
    {
      title: 'Book Services',
      description: 'Maintenance & repair',
      icon: Wrench,
      path: '/services',
      color: 'bg-purple-500',
      count: 0
    },
    {
      title: 'Get Financing',
      description: 'Loan options available',
      icon: CreditCard,
      path: '/finance',
      color: 'bg-orange-500',
      count: 0
    },
    {
      title: 'Arrange Logistics',
      description: 'Shipping solutions',
      icon: Truck,
      path: '/logistics',
      color: 'bg-red-500',
      count: 0
    },
    {
      title: 'Get Insurance',
      description: 'Protect your investment',
      icon: Shield,
      path: '/insurance',
      color: 'bg-cyan-500',
      count: 0
    }
  ];

  const statsCards = [
    {
      title: 'Saved Items',
      value: dashboardStats.savedItems,
      icon: Heart,
      trend: 'In wishlist',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      clickable: true,
      onClick: () => setActiveTab('wishlist')
    },
    {
      title: 'Active Orders',
      value: dashboardStats.activeOrders,
      icon: ShoppingCart,
      trend: 'In progress',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      clickable: true,
      onClick: () => setActiveTab('orders')
    },
    {
      title: 'Total Spent',
      value: `₹${dashboardStats.totalSpent.toLocaleString()}`,
      icon: DollarSign,
      trend: 'All time',
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Account Level',
      value: dashboardStats.accountLevel,
      icon: Award,
      trend: 'Membership',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    }
  ];

  useEffect(() => {
    if (isBuyer) {
      fetchDashboardData();
    } else {
      setLoading(false);
    }
  }, [fetchDashboardData, isBuyer]);

  // Access denied screen for non-buyers
  if (!isBuyer) {
    return (
      <div className="space-y-6">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertCircle className="w-6 h-6" />
              Access Restricted - Buyer Dashboard
            </CardTitle>
            <CardDescription className="text-red-600">
              This dashboard is only available for buyers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                <strong>Current Status:</strong>
                <br />
                User Type: {userType || 'Not set'}
                <br />
                <br />
                <strong>Required Access:</strong> Buyer account
              </AlertDescription>
            </Alert>

            <div className="flex gap-3 mt-6">
              <Button 
                variant="outline" 
                onClick={() => window.location.href = '/profile'}
                className="border-red-200 text-red-700 hover:bg-red-50"
              >
                Update Profile
              </Button>
              <Button 
                variant="outline"
                onClick={() => window.location.href = '/dashboard'}
                className="border-red-200 text-red-700 hover:bg-red-50"
              >
                Go to Main Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <div>
            <p className="text-lg font-medium">Loading Your Dashboard</p>
            <p className="text-sm text-muted-foreground">
              Preparing your personalized experience...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Access confirmation */}
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle className="w-4 h-4" />
        <AlertDescription className="text-green-700">
          <strong>✅ Buyer Dashboard Access Confirmed</strong> - Welcome to your personalized marketplace experience, {userProfile?.full_name || user?.email?.split('@')[0] || 'Buyer'}!
        </AlertDescription>
      </Alert>

      {/* Enhanced Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Welcome back, {userProfile?.full_name || user?.email?.split('@')[0] || 'Buyer'}
          </h1>
          <p className="text-muted-foreground">
            Discover the best robots and services for your business
          </p>
        </div>
        <div className="flex items-center space-x-2 max-w-md">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search robots, parts, services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && searchQuery) {
                  navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
                }
              }}
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Enhanced Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card 
              key={index} 
              className={`hover:shadow-lg transition-all duration-200 border-0 shadow-sm ${stat.clickable ? 'cursor-pointer' : ''}`}
              onClick={stat.onClick}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">{stat.title}</p>
                    <p className="text-3xl font-bold mt-1">{stat.value}</p>
                    <Badge variant="secondary" className="mt-2 text-xs">
                      {stat.trend}
                    </Badge>
                  </div>
                  <div className={`w-14 h-14 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                    <Icon className={`w-7 h-7 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Enhanced Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Quick Access
          </CardTitle>
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
                  className="h-auto p-4 flex flex-col items-center space-y-2 hover:bg-primary/10 group relative"
                  onClick={() => navigate(action.path)}
                >
                  <div className={`w-12 h-12 rounded-lg ${action.color} flex items-center justify-center text-white group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold">{action.title}</p>
                    <p className="text-xs text-muted-foreground">{action.description}</p>
                  </div>
                  {action.count > 0 && (
                    <Badge className="absolute -top-2 -right-2 text-xs">
                      {action.count}
                    </Badge>
                  )}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="wishlist" className="relative">
            Wishlist
            {dashboardStats.wishlistCount > 0 && (
              <Badge className="ml-2 text-xs">
                {dashboardStats.wishlistCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="orders" className="relative">
            Orders
            {dashboardStats.activeOrders > 0 && (
              <Badge className="ml-2 text-xs">
                {dashboardStats.activeOrders}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="inquiries">Inquiries</TabsTrigger>
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
                    {recentActivity.map((activity) => {
                      const Icon = activity.icon;
                      return (
                        <div key={activity.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                            <Icon className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{activity.title}</p>
                            <p className="text-sm text-muted-foreground">{activity.description}</p>
                          </div>
                          <Badge variant="secondary">{activity.time}</Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Account Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Account Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">Profile Completion</p>
                    <p className="text-sm text-muted-foreground">Complete your profile for better recommendations</p>
                    <Progress value={profileCompletion} className="mt-2" />
                  </div>
                  <Badge variant="outline">
                    {profileCompletion}%
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Verification Status</p>
                    <p className="text-sm text-muted-foreground">Verified buyers get priority support</p>
                  </div>
                  <Badge variant={userProfile?.verification_status ? 'default' : 'secondary'}>
                    {userProfile?.verification_status ? 'Verified' : 'Pending'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Membership Level</p>
                    <p className="text-sm text-muted-foreground">
                      {dashboardStats.accountLevel === 'Premium' 
                        ? 'Enjoy premium benefits' 
                        : `Spend ₹${(500000 - dashboardStats.totalSpent).toLocaleString()} more to unlock Gold`
                      }
                    </p>
                  </div>
                  <Badge variant={dashboardStats.accountLevel === 'Premium' ? 'default' : 'secondary'}>
                    {dashboardStats.accountLevel}
                  </Badge>
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
                My Wishlist ({dashboardStats.wishlistCount})
              </CardTitle>
              <CardDescription>Items you've saved for later</CardDescription>
            </CardHeader>
            <CardContent>
              {wishlistItems.length === 0 ? (
                <div className="text-center py-8">
                  <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">Your wishlist is empty</p>
                  <Button onClick={() => navigate('/robots')}>
                    Browse Robots
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {wishlistItems.map((item) => (
                    <Card key={item.id} className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-4">
                        <div className="aspect-video bg-muted rounded-lg mb-3 flex items-center justify-center">
                          {item.robots?.images && item.robots.images.length > 0 ? (
                            <img 
                              src={item.robots.images[0]} 
                              alt={item.robots.name}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <Bot className="w-8 h-8 text-muted-foreground" />
                          )}
                        </div>
                        <h3 className="font-semibold truncate">
                          {item.robots?.name || item.spare_parts?.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {item.robots?.robot_type || item.spare_parts?.category}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <Badge variant="secondary">
                            {item.robots?.availability || 'Available'}
                          </Badge>
                          <p className="font-bold">
                            ₹{(item.robots?.price || item.spare_parts?.price)?.toLocaleString()}
                          </p>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Button 
                            size="sm" 
                            className="flex-1"
                            onClick={() => navigate(`/${item.item_type}/${item.item_id}`)}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleWishlistRemove(item.id)}
                          >
                            Remove
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                My Orders ({orderHistory.length})
              </CardTitle>
              <CardDescription>Track your order history and status</CardDescription>
            </CardHeader>
            <CardContent>
              {orderHistory.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No orders yet</p>
                  <Button onClick={() => navigate('/robots')}>
                    Start Shopping
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderHistory.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">
                          #{order.id.slice(-8)}
                        </TableCell>
                        <TableCell>
                          {order.items?.length || 0} items
                        </TableCell>
                        <TableCell>
                          ₹{order.total_amount?.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              order.status === 'delivered' ? 'default' :
                              order.status === 'processing' ? 'secondary' :
                              order.status === 'shipped' ? 'outline' : 'destructive'
                            }
                          >
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(order.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inquiries" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                My Inquiries ({inquiries.length})
              </CardTitle>
              <CardDescription>Track your product inquiries and responses</CardDescription>
            </CardHeader>
            <CardContent>
              {inquiries.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No inquiries yet</p>
                  <Button onClick={() => navigate('/robots')}>
                    Browse Products
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {inquiries.map((inquiry) => (
                    <div key={inquiry.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">{inquiry.subject}</h3>
                        <Badge variant={inquiry.status === 'responded' ? 'default' : 'secondary'}>
                          {inquiry.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {inquiry.message}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          <span>Sent on {new Date(inquiry.created_at).toLocaleDateString()}</span>
                        </div>
                        <Button variant="outline" size="sm">
                          <ExternalLink className="w-3 h-3 mr-1" />
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {recommendedProducts.map((robot) => (
                    <Card key={robot.id} className="hover:shadow-lg transition-shadow cursor-pointer group" onClick={() => navigate(`/robots/${robot.id}`)}>
                      <CardContent className="p-4">
                        <div className="aspect-video bg-muted rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                          {robot.images && robot.images.length > 0 ? (
                            <img 
                              src={robot.images[0]} 
                              alt={robot.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <Bot className="w-8 h-8 text-muted-foreground" />
                          )}
                        </div>
                        <h3 className="font-semibold truncate">{robot.name}</h3>
                        <p className="text-sm text-muted-foreground">{robot.robot_type}</p>
                        <div className="flex items-center justify-between mt-2">
                          <Badge variant="secondary">{robot.availability}</Badge>
                          <p className="font-bold text-primary">₹{robot.price?.toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                          <MapPin className="w-3 h-3" />
                          <span className="truncate">{robot.location || 'Location not specified'}</span>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Button size="sm" className="flex-1">
                            <Eye className="w-3 h-3 mr-1" />
                            View Details
                          </Button>
                          <Button variant="outline" size="sm">
                            <Heart className="w-3 h-3" />
                          </Button>
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
