import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
  ChevronRight,
  Eye,
  Calendar,
  Clock,
  ArrowUpRight,
  Filter,
  Search,
  RefreshCw,
  MoreHorizontal,
  Maximize2
} from "lucide-react";
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { UserProfile } from '@/types/user';

interface DashboardProps {
  userProfile: UserProfile;
}

interface StatItem {
  label: string;
  value: string;
  icon: any;
  trend: string;
  description?: string;
  details?: any[];
  color?: string;
}

interface QuickAction {
  label: string;
  icon: any;
  onClick?: () => void;
  description?: string;
  path?: string;
}

interface DetailViewProps {
  title: string;
  data: any[];
  type: 'orders' | 'robots' | 'services' | 'analytics';
}

const Dashboard = ({ userProfile }: DashboardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [selectedDetail, setSelectedDetail] = useState<DetailViewProps | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [realTimeData, setRealTimeData] = useState<any>({});

  // Determine user type from profile
  const userType = userProfile?.user_type || 'buyer';
  const sellerRoles = userProfile?.seller_roles || [];

  // Fetch real-time data
  const fetchRealTimeData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Fetch data based on user type
      if (userType === 'seller' || sellerRoles.length > 0) {
        const { data: robots } = await supabase
          .from('robots')
          .select('*')
          .eq('seller_id', user.id)
          .order('created_at', { ascending: false });
        
        setRealTimeData(prev => ({ ...prev, robots: robots || [] }));
      } else if (userType === 'buyer') {
        // Fetch buyer-specific data
        setRealTimeData(prev => ({ ...prev, orders: [], wishlist: [] }));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [user, userType, sellerRoles]);

  useEffect(() => {
    fetchRealTimeData();
  }, [fetchRealTimeData]);

  // Get dashboard data based on user type
  const getDashboardData = (): { title: string; subtitle: string; stats: StatItem[]; quickActions: QuickAction[] } => {
    const robotCount = realTimeData.robots?.length || 0;
    const activeRobots = realTimeData.robots?.filter((r: any) => r.availability === 'available').length || 0;
    const totalRevenue = realTimeData.robots?.reduce((sum: number, r: any) => sum + (r.price || 0), 0) || 0;

    switch (userType) {
      case 'buyer':
        return {
          title: 'Buyer Dashboard',
          subtitle: 'Manage your robot purchases and marketplace activity',
          stats: [
            { 
              label: 'Total Orders', 
              value: '12', 
              icon: ShoppingCart, 
              trend: '+15%',
              description: 'Orders placed this month',
              details: realTimeData.orders || [],
              color: 'text-blue-600'
            },
            { 
              label: 'Saved Robots', 
              value: '28', 
              icon: Bot, 
              trend: '+8%',
              description: 'Items in your wishlist',
              details: realTimeData.wishlist || [],
              color: 'text-green-600'
            },
            { 
              label: 'Active Bids', 
              value: '5', 
              icon: TrendingUp, 
              trend: '+25%',
              description: 'Pending bid responses',
              color: 'text-orange-600'
            },
            { 
              label: 'Reviews Given', 
              value: '9', 
              icon: Star, 
              trend: '+12%',
              description: 'Product reviews submitted',
              color: 'text-purple-600'
            }
          ],
          quickActions: [
            { label: 'Browse Marketplace', icon: Bot, path: '/robots' },
            { label: 'My Orders', icon: Package, path: '/orders' },
            { label: 'Wishlist', icon: Star, path: '/wishlist' },
            { label: 'Messages', icon: Users, path: '/messages' }
          ]
        };

      case 'seller':
        return {
          title: 'Seller Dashboard',
          subtitle: 'Manage your robot listings and track sales performance',
          stats: [
            { 
              label: 'Total Revenue', 
              value: `₹${totalRevenue.toLocaleString()}`, 
              icon: DollarSign, 
              trend: '+22%',
              description: 'Revenue from all sales',
              details: realTimeData.robots || [],
              color: 'text-green-600'
            },
            { 
              label: 'Active Listings', 
              value: activeRobots.toString(), 
              icon: Bot, 
              trend: '+5%',
              description: 'Currently available robots',
              details: realTimeData.robots?.filter((r: any) => r.availability === 'available') || [],
              color: 'text-blue-600'
            },
            { 
              label: 'Total Robots', 
              value: robotCount.toString(), 
              icon: Package, 
              trend: '+35%',
              description: 'All listed robots',
              details: realTimeData.robots || [],
              color: 'text-orange-600'
            },
            { 
              label: 'Rating', 
              value: '4.8', 
              icon: Star, 
              trend: '+0.1',
              description: 'Average seller rating',
              color: 'text-purple-600'
            }
          ],
          quickActions: [
            { label: 'Add New Robot', icon: Plus, path: '/dashboard/robots' },
            { label: 'Manage Listings', icon: Package, path: '/dashboard/inventory' },  
            { label: 'Sales Analytics', icon: BarChart, path: '/dashboard/analytics' },
            { label: 'Customer Messages', icon: Users, path: '/messages' }
          ]
        };

      case 'service_provider':
        return {
          title: 'Service Provider Dashboard',
          subtitle: 'Manage your robotics services and client relationships',
          stats: [
            { 
              label: 'Active Services', 
              value: '15', 
              icon: Settings, 
              trend: '+18%',
              description: 'Currently active service contracts',
              color: 'text-blue-600'
            },
            { 
              label: 'Monthly Revenue', 
              value: '₹12,850', 
              icon: DollarSign, 
              trend: '+28%',
              description: 'This month\'s service revenue',
              color: 'text-green-600'
            },
            { 
              label: 'Pending Requests', 
              value: '8', 
              icon: Activity, 
              trend: '+12%',
              description: 'Service requests awaiting response',
              color: 'text-orange-600'
            },
            { 
              label: 'Client Rating', 
              value: '4.9', 
              icon: Star, 
              trend: '+0.2',
              description: 'Average service rating',
              color: 'text-purple-600'
            }
          ],
          quickActions: [
            { label: 'Add Service', icon: Plus, path: '/dashboard/services' },
            { label: 'Schedule Calendar', icon: Calendar, path: '/calendar' },
            { label: 'Client Management', icon: Users, path: '/clients' },
            { label: 'Service Reports', icon: BarChart, path: '/reports' }
          ]
        };

      default:
        return {
          title: 'Dashboard',
          subtitle: 'Welcome to your marketplace dashboard',
          stats: [],
          quickActions: []
        };
    }
  };

  const data = getDashboardData();

  // Handle stat card click to open details
  const handleStatClick = (stat: StatItem) => {
    if (stat.details && stat.details.length > 0) {
      setSelectedDetail({
        title: stat.label,
        data: stat.details,
        type: stat.label.toLowerCase().includes('order') ? 'orders' : 
              stat.label.toLowerCase().includes('robot') ? 'robots' :
              stat.label.toLowerCase().includes('service') ? 'services' : 'analytics'
      });
      setIsDetailOpen(true);
    } else {
      toast({
        title: "No Details Available",
        description: `No detailed data available for ${stat.label}`,
      });
    }
  };

  // Render detail view based on type
  const renderDetailView = () => {
    if (!selectedDetail) return null;

    const { title, data, type } = selectedDetail;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="text-sm text-muted-foreground">{data.length} items</p>
          </div>
          <Button variant="outline" size="sm">
            <Maximize2 className="w-4 h-4 mr-2" />
            View Full Page
          </Button>
        </div>

        <ScrollArea className="h-[400px] w-full">
          <div className="space-y-3">
            {data.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No data available</p>
              </div>
            ) : (
              data.map((item, index) => (
                <Card key={index} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    {type === 'robots' ? (
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                          <Bot className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">{item.name}</h4>
                          <p className="text-sm text-muted-foreground">{item.robot_type}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={item.availability === 'available' ? 'default' : 'secondary'}>
                              {item.availability}
                            </Badge>
                            <span className="text-sm font-medium">₹{item.price?.toLocaleString()}</span>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : type === 'orders' ? (
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Order #{item.id?.slice(-6)}</h4>
                          <p className="text-sm text-muted-foreground">
                            {new Date(item.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">₹{item.total?.toLocaleString()}</p>
                          <Badge variant="outline">{item.status}</Badge>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{item.name || `Item ${index + 1}`}</h4>
                          <p className="text-sm text-muted-foreground">
                            {item.description || 'No description'}
                          </p>
                        </div>
                        <Button variant="ghost" size="sm">
                          <ArrowUpRight className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Screen-fitted container */}
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Enhanced Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {data.title}
            </h1>
            <p className="text-muted-foreground">{data.subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={fetchRealTimeData}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
          </div>
        </div>

        {/* Enhanced Stats Grid - Clickable */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {data.stats.map((stat, index) => {
            const Icon = stat.icon;
            const hasDetails = stat.details && stat.details.length > 0;
            
            return (
              <Card 
                key={index} 
                className={`hover:shadow-lg transition-all duration-200 border-0 shadow-sm ${
                  hasDetails ? 'cursor-pointer hover:scale-105' : ''
                }`}
                onClick={() => hasDetails && handleStatClick(stat)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                        {stat.label}
                      </p>
                      <p className="text-2xl font-bold mt-1">{stat.value}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="text-xs">
                          {stat.trend}
                        </Badge>
                        {hasDetails && (
                          <Badge variant="outline" className="text-xs">
                            <Eye className="w-3 h-3 mr-1" />
                            View Details
                          </Badge>
                        )}
                      </div>
                      {stat.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {stat.description}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <div className={`w-12 h-12 rounded-xl bg-muted flex items-center justify-center`}>
                        <Icon className={`w-6 h-6 ${stat.color || 'text-primary'}`} />
                      </div>
                      {hasDetails && (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
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
              <Activity className="w-5 h-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>Frequently used features and shortcuts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {data.quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={index}
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center space-y-2 hover:bg-primary/10 group transition-all"
                    onClick={() => {
                      if (action.path) {
                        window.location.href = action.path;
                      } else if (action.onClick) {
                        action.onClick();
                      }
                    }}
                  >
                    <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-sm">{action.label}</p>
                      {action.description && (
                        <p className="text-xs text-muted-foreground">{action.description}</p>
                      )}
                    </div>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Recent Activity */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Recent Activity
                </CardTitle>
                <CardDescription>Your latest actions and updates</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { action: 'Added new robot listing', time: '2 hours ago', type: 'success' },
                { action: 'Received inquiry from buyer', time: '4 hours ago', type: 'info' },
                { action: 'Updated pricing for 3 robots', time: '1 day ago', type: 'warning' }
              ].map((item, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    item.type === 'success' ? 'bg-green-100 text-green-600' :
                    item.type === 'info' ? 'bg-blue-100 text-blue-600' :
                    'bg-orange-100 text-orange-600'
                  }`}>
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.action}</p>
                    <p className="text-xs text-muted-foreground">{item.time}</p>
                  </div>
                  <Button variant="ghost" size="sm">
                    <ArrowUpRight className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detail View Sheet - Opens from the side */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent className="w-full sm:w-[600px] sm:max-w-[600px]">
          <SheetHeader>
            <SheetTitle>
              {selectedDetail?.title} Details
            </SheetTitle>
            <SheetDescription>
              Detailed view of your {selectedDetail?.title.toLowerCase()}
            </SheetDescription>
          </SheetHeader>
          <Separator className="my-4" />
          {renderDetailView()}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Dashboard;
