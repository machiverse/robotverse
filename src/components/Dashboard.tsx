import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
  ChevronLeft,
  Eye,
  Calendar,
  Clock,
  ArrowUpRight,
  Filter,
  RefreshCw,
  MoreHorizontal,
  X,
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

const Dashboard = ({ userProfile }: DashboardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [selectedDetail, setSelectedDetail] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [realTimeData, setRealTimeData] = useState<any>({});

  const userType = userProfile?.user_type || 'buyer';
  const sellerRoles = userProfile?.seller_roles || [];

  // Fetch real-time data
  const fetchRealTimeData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      if (userType === 'seller' || sellerRoles.length > 0) {
        const { data: robots } = await supabase
          .from('robots')
          .select('*')
          .eq('seller_id', user.id)
          .order('created_at', { ascending: false });
        
        setRealTimeData(prev => ({ ...prev, robots: robots || [] }));
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

  // Get dashboard data
  const getDashboardData = () => {
    const robotCount = realTimeData.robots?.length || 0;
    const activeRobots = realTimeData.robots?.filter((r: any) => r.availability === 'available').length || 0;
    const totalRevenue = realTimeData.robots?.reduce((sum: number, r: any) => sum + (r.price || 0), 0) || 0;

    switch (userType) {
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
          ]
        };
      
      default:
        return {
          title: 'Buyer Dashboard',
          subtitle: 'Manage your robot purchases and marketplace activity',
          stats: [
            { label: 'Total Orders', value: '12', icon: ShoppingCart, trend: '+15%', color: 'text-blue-600' },
            { label: 'Saved Robots', value: '28', icon: Bot, trend: '+8%', color: 'text-green-600' },
            { label: 'Active Bids', value: '5', icon: TrendingUp, trend: '+25%', color: 'text-orange-600' },
            { label: 'Reviews Given', value: '9', icon: Star, trend: '+12%', color: 'text-purple-600' }
          ]
        };
    }
  };

  const data = getDashboardData();

  // Handle stat card click
  const handleStatClick = (stat: StatItem) => {
    if (stat.details && stat.details.length > 0) {
      setSelectedDetail({
        title: stat.label,
        data: stat.details,
        type: stat.label.toLowerCase()
      });
      setIsDetailOpen(true);
    } else {
      toast({
        title: "No Details Available",
        description: `No detailed data available for ${stat.label}`,
      });
    }
  };

  // Render detail view in left panel
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
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setIsDetailOpen(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <ScrollArea className="h-[calc(100vh-200px)] w-full">
          <div className="space-y-3 pr-4">
            {data.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No data available</p>
              </div>
            ) : (
              data.map((item, index) => (
                <Card key={index} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                        <Bot className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{item.name || `Item ${index + 1}`}</h4>
                        <p className="text-sm text-muted-foreground">{item.robot_type || 'No type'}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={item.availability === 'available' ? 'default' : 'secondary'} className="text-xs">
                            {item.availability || 'Unknown'}
                          </Badge>
                          <span className="text-sm font-medium">₹{item.price?.toLocaleString() || '0'}</span>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
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
    <div className="min-h-screen bg-gray-50/50 flex">
      {/* Left Detail Panel - Fixed Position */}
      {isDetailOpen && (
        <div className="w-80 bg-white border-r shadow-lg flex-shrink-0 z-10">
          <div className="p-6 h-full">
            {renderDetailView()}
          </div>
        </div>
      )}

      {/* Main Content - Adjusts based on detail panel */}
      <div className={`flex-1 transition-all duration-300 ${isDetailOpen ? 'ml-0' : ''}`}>
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          
          {/* Header */}
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

          {/* Stats Grid - Clickable Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.stats.map((stat, index) => {
              const Icon = stat.icon;
              const hasDetails = stat.details && stat.details.length > 0;
              
              return (
                <Card 
                  key={index} 
                  className={`hover:shadow-lg transition-all duration-200 border-0 shadow-sm ${
                    hasDetails ? 'cursor-pointer hover:scale-105' : ''
                  } ${selectedDetail?.title === stat.label ? 'ring-2 ring-primary' : ''}`}
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
                              Details
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
                        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                          <Icon className={`w-6 h-6 ${stat.color || 'text-primary'}`} />
                        </div>
                        {hasDetails && (
                          <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                        )}
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
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Quick Actions
              </CardTitle>
              <CardDescription>Frequently used features and shortcuts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Add New Robot', icon: Plus, path: '/dashboard/robots' },
                  { label: 'Manage Listings', icon: Package, path: '/dashboard/inventory' },  
                  { label: 'Sales Analytics', icon: BarChart, path: '/dashboard/analytics' },
                  { label: 'Customer Messages', icon: Users, path: '/messages' }
                ].map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <Button
                      key={index}
                      variant="outline"
                      className="h-auto p-4 flex flex-col items-center space-y-2 hover:bg-primary/10 group transition-all"
                      onClick={() => window.location.href = action.path}
                    >
                      <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                        <Icon className="w-6 h-6" />
                      </div>
                      <p className="font-semibold text-sm">{action.label}</p>
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
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
      </div>
    </div>
  );
};

export default Dashboard;
