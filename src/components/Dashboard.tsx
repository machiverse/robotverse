import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
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
  Maximize2,
  Edit,
  Wrench,
  Shield,
  CreditCard,
  Truck,
  MapPin,
  Zap
} from "lucide-react";
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Import centralized types
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

const Dashboard = ({ userProfile }: DashboardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [selectedDetail, setSelectedDetail] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [realTimeData, setRealTimeData] = useState<any>({});
  const [dashboardStats, setDashboardStats] = useState<any>({});

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
        
        // Calculate stats
        const totalRobots = robots?.length || 0;
        const activeRobots = robots?.filter((r: any) => r.availability === 'available').length || 0;
        const totalRevenue = robots?.reduce((sum: number, r: any) => sum + (r.price || 0), 0) || 0;
        const avgPrice = totalRobots > 0 ? totalRevenue / totalRobots : 0;
        
        setDashboardStats({
          totalRobots,
          activeListings: activeRobots,
          totalRevenue,
          avgPrice,
          conversationRate: Math.random() * 10 // Mock data
        });
      } else if (userType === 'buyer') {
        // Mock buyer data
        setRealTimeData(prev => ({ ...prev, orders: [], wishlist: [] }));
        setDashboardStats({
          totalOrders: 12,
          savedRobots: 28,
          activeBids: 5,
          reviewsGiven: 9
        });
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
              details: [],
              color: 'text-blue-600'
            },
            { 
              label: 'Saved Robots', 
              value: '28', 
              icon: Bot, 
              trend: '+8%',
              description: 'Items in your wishlist',
              details: [],
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
            { label: 'Browse Marketplace', icon: Bot, path: '/robots', description: 'Find industrial robots' },
            { label: 'My Orders', icon: Package, path: '/orders', description: 'Track your purchases' },
            { label: 'Wishlist', icon: Star, path: '/wishlist', description: 'Saved items' },
            { label: 'Messages', icon: Users, path: '/messages', description: 'Seller communications' },
            { label: 'Find Services', icon: Wrench, path: '/services', description: 'Maintenance & repair' },
            { label: 'Get Financing', icon: CreditCard, path: '/finance', description: 'Loan options' }
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
            { label: 'Add New Robot', icon: Plus, path: '/dashboard/robots', description: 'List new equipment' },
            { label: 'Manage Inventory', icon: Package, path: '/dashboard/inventory', description: 'Update listings' },  
            { label: 'Sales Analytics', icon: BarChart, path: '/dashboard/analytics', description: 'View performance' },
            { label: 'Customer Messages', icon: Users, path: '/messages', description: 'Buyer inquiries' },
            { label: 'Add Services', icon: Wrench, path: '/dashboard/services', description: 'Offer services' },
            { label: 'Logistics Setup', icon: Truck, path: '/logistics', description: 'Shipping options' }
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
            { label: 'Add Service', icon: Plus, path: '/dashboard/services', description: 'Create service offering' },
            { label: 'Schedule Calendar', icon: Calendar, path: '/calendar', description: 'Manage appointments' },
            { label: 'Client Management', icon: Users, path: '/clients', description: 'Customer relationships' },
            { label: 'Service Reports', icon: BarChart, path: '/reports', description: 'Performance analytics' },
            { label: 'Equipment Catalog', icon: Bot, path: '/robots', description: 'Browse serviceable robots' },
            { label: 'Get Insurance', icon: Shield, path: '/insurance', description: 'Professional coverage' }
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

  // Render enhanced detail view with accordion
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
          <div className="pr-4">
            {data.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No data available</p>
              </div>
            ) : (
              <Accordion type="single" collapsible className="w-full space-y-2">
                {data.map((item, index) => (
                  <AccordionItem key={index} value={`item-${index}`} className="border rounded-lg bg-card">
                    <AccordionTrigger className="px-4 hover:bg-muted/50">
                      <div className="flex items-center space-x-3 w-full">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Bot className="w-5 h-5 text-primary" />
                        </div>
                        <div className="text-left flex-1">
                          <p className="font-medium truncate">{item.name || `Robot ${index + 1}`}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={item.availability === 'available' ? 'default' : 'secondary'} className="text-xs">
                              {item.availability || 'Unknown'}
                            </Badge>
                            <span className="text-sm font-medium text-primary">
                              ₹{item.price?.toLocaleString() || '0'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <div className="space-y-4">
                        {/* Robot Details Grid */}
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="p-2 bg-muted/50 rounded">
                            <span className="font-medium text-muted-foreground">Type:</span>
                            <p className="font-medium">{item.robot_type || 'N/A'}</p>
                          </div>
                          <div className="p-2 bg-muted/50 rounded">
                            <span className="font-medium text-muted-foreground">Brand:</span>
                            <p className="font-medium">{item.brand || 'N/A'}</p>
                          </div>
                          <div className="p-2 bg-muted/50 rounded">
                            <span className="font-medium text-muted-foreground">Model:</span>
                            <p className="font-medium">{item.model || 'N/A'}</p>
                          </div>
                          <div className="p-2 bg-muted/50 rounded">
                            <span className="font-medium text-muted-foreground">Location:</span>
                            <p className="font-medium flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {item.location || 'N/A'}
                            </p>
                          </div>
                        </div>
                        
                        {/* Description */}
                        {item.description && (
                          <div className="p-3 bg-muted/50 rounded">
                            <span className="font-medium text-muted-foreground block mb-1">Description:</span>
                            <p className="text-sm">{item.description}</p>
                          </div>
                        )}

                        {/* Specifications */}
                        {item.specifications && Object.keys(item.specifications).length > 0 && (
                          <div className="p-3 bg-muted/50 rounded">
                            <span className="font-medium text-muted-foreground block mb-2">Specifications:</span>
                            <div className="grid grid-cols-1 gap-1 text-xs">
                              {Object.entries(item.specifications).map(([key, value]) => (
                                <div key={key} className="flex justify-between">
                                  <span className="capitalize">{key.replace('_', ' ')}:</span>
                                  <span className="font-medium">{String(value)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Created Date */}
                        <div className="p-2 bg-muted/50 rounded text-sm">
                          <span className="font-medium text-muted-foreground">Listed:</span>
                          <p className="font-medium flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(item.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-2">
                          <Button size="sm" variant="default" className="flex-1">
                            <Eye className="w-3 h-3 mr-1" />
                            View Full Details
                          </Button>
                          <Button size="sm" variant="outline" className="flex-1">
                            <Edit className="w-3 h-3 mr-1" />
                            Edit Robot
                          </Button>
                        </div>

                        {/* Images Preview */}
                        {item.images && item.images.length > 0 && (
                          <div className="space-y-2">
                            <span className="font-medium text-muted-foreground text-sm">Images:</span>
                            <div className="grid grid-cols-2 gap-2">
                              {item.images.slice(0, 4).map((image: string, imgIndex: number) => (
                                <div key={imgIndex} className="aspect-video bg-muted rounded overflow-hidden">
                                  <img 
                                    src={image} 
                                    alt={`${item.name} ${imgIndex + 1}`}
                                    className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                                  />
                                </div>
                              ))}
                            </div>
                            {item.images.length > 4 && (
                              <p className="text-xs text-muted-foreground">
                                +{item.images.length - 4} more images
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
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
                <Zap className="w-5 h-5" />
                Quick Actions
              </CardTitle>
              <CardDescription>Frequently used features and shortcuts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

          {/* Performance Analytics with Accordion */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart className="w-5 h-5" />
                Performance Analytics
              </CardTitle>
              <CardDescription>Detailed breakdown of your performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="sales-analytics">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      Sales Analytics
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 bg-green-50 rounded-lg">
                        <h4 className="font-semibold text-green-800">Total Revenue</h4>
                        <p className="text-2xl font-bold text-green-600">₹{dashboardStats.totalRevenue?.toLocaleString() || '0'}</p>
                        <p className="text-sm text-green-600">From all sales</p>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-semibold text-blue-800">Average Price</h4>
                        <p className="text-2xl font-bold text-blue-600">₹{Math.floor(dashboardStats.avgPrice || 0).toLocaleString()}</p>
                        <p className="text-sm text-blue-600">Per robot sold</p>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <h4 className="font-semibold text-purple-800">Conversion Rate</h4>
                        <p className="text-2xl font-bold text-purple-600">{dashboardStats.conversationRate?.toFixed(1) || '0'}%</p>
                        <p className="text-sm text-purple-600">Views to inquiries</p>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="inventory-status">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-blue-600" />
                      Inventory Status
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-muted/50 rounded">
                        <span>Active Listings</span>
                        <Badge variant="default">{dashboardStats.activeListings || 0}</Badge>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-muted/50 rounded">
                        <span>Total Robots</span>
                        <Badge variant="outline">{dashboardStats.totalRobots || 0}</Badge>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-muted/50 rounded">
                        <span>Pending Approval</span>
                        <Badge variant="secondary">0</Badge>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="recent-activity">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-orange-600" />
                      Recent Activity
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
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
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {item.time}
                            </p>
                          </div>
                          <Button variant="ghost" size="sm">
                            <ArrowUpRight className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
