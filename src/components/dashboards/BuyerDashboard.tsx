import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  Eye,
  MessageCircle,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  User,
  Building,
  Phone,
  Mail
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface BuyerDashboardProps {
  userProfile: any;
}

interface RealDashboardStats {
  availableRobots: number;
  availableServices: number;
  availableParts: number;
  profileCompletion: number;
  accountVerified: boolean;
  totalListings: number;
}

interface RecentListing {
  id: string;
  name: string;
  type: 'robot' | 'service' | 'part';
  price?: number;
  currency?: string;
  location?: string;
  created_at: string;
  seller_name?: string;
}

const BuyerDashboard = ({ userProfile }: BuyerDashboardProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // States
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Real data states
  const [realStats, setRealStats] = useState<RealDashboardStats>({
    availableRobots: 0,
    availableServices: 0,
    availableParts: 0,
    profileCompletion: 0,
    accountVerified: false,
    totalListings: 0
  });
  
  const [recentRobots, setRecentRobots] = useState<any[]>([]);
  const [recentServices, setRecentServices] = useState<any[]>([]);
  const [recentParts, setRecentParts] = useState<any[]>([]);
  const [recentListings, setRecentListings] = useState<RecentListing[]>([]);

  // Enhanced access check
  const userType = userProfile?.user_type || userProfile?.primary_user_type;
  const isBuyer = userType === 'buyer' || !userType; // Default to buyer if no type set

  useEffect(() => {
    if (user) {
      fetchRealDashboardData();
    }
  }, [user]);

  const fetchRealDashboardData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    try {
      setRefreshing(true);
      
      // Fetch real data from multiple tables
      const [
        robotsResult,
        servicesResult,
        sparePartsResult
      ] = await Promise.allSettled([
        supabase
          .from('robots')
          .select('*, profiles:seller_id(full_name)')
          .eq('availability', 'available')
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('services')
          .select('*, profiles:provider_id(full_name)')
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('spare_parts')
          .select('*, profiles:seller_id(full_name)')
          .gt('quantity', 0)
          .order('created_at', { ascending: false })
          .limit(10)
      ]);

      // Process results - only use real data
      const robots = robotsResult.status === 'fulfilled' ? robotsResult.value.data || [] : [];
      const services = servicesResult.status === 'fulfilled' ? servicesResult.value.data || [] : [];
      const spareParts = sparePartsResult.status === 'fulfilled' ? sparePartsResult.value.data || [] : [];
      
      // Set real data
      setRecentRobots(robots.slice(0, 6));
      setRecentServices(services);
      setRecentParts(spareParts);
      
      // Calculate real profile completion
      const profileCompletion = calculateRealProfileCompletion(userProfile);
      
      // Set real stats
      const realStatsData: RealDashboardStats = {
        availableRobots: robots.length,
        availableServices: services.length,
        availableParts: spareParts.length,
        profileCompletion,
        accountVerified: !!userProfile?.email && !!userProfile?.full_name,
        totalListings: robots.length + services.length + spareParts.length
      };
      
      setRealStats(realStatsData);
      
      // Create recent listings from real data
      const allListings: RecentListing[] = [
        ...robots.map(robot => ({
          id: robot.id,
          name: robot.name,
          type: 'robot' as const,
          price: robot.price,
          currency: robot.currency || 'INR',
          location: robot.location,
          created_at: robot.created_at,
          seller_name: robot.profiles?.full_name
        })),
        ...services.map(service => ({
          id: service.id,
          name: service.name,
          type: 'service' as const,
          location: service.location,
          created_at: service.created_at,
          seller_name: service.profiles?.full_name
        })),
        ...spareParts.map(part => ({
          id: part.id,
          name: part.name,
          type: 'part' as const,
          price: part.price,
          currency: part.currency || 'INR',
          created_at: part.created_at,
          seller_name: part.profiles?.full_name
        }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 10);
      
      setRecentListings(allListings);
      
      console.log('✅ Fetched real buyer data:', {
        robots: robots.length,
        services: services.length,
        parts: spareParts.length
      });
      
    } catch (error) {
      console.error('Error fetching real dashboard data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load dashboard data"
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, userProfile, toast]);

  const calculateRealProfileCompletion = (profile: any): number => {
    if (!profile) return 0;
    
    const requiredFields = [
      'full_name', 'email', 'phone', 'company_name', 
      'location', 'user_type'
    ];
    
    const completedFields = requiredFields.filter(field => {
      const value = profile[field];
      return value && value !== '' && value !== null && value !== undefined;
    });
    
    return Math.round((completedFields.length / requiredFields.length) * 100);
  };

  const quickActions = [
    {
      title: 'Browse Robots',
      description: `${realStats.availableRobots} available`,
      icon: Bot,
      path: '/robots',
      color: 'bg-blue-500',
      count: realStats.availableRobots
    },
    {
      title: 'Spare Parts',
      description: `${realStats.availableParts} in stock`,
      icon: Package,
      path: '/parts',
      color: 'bg-green-500',
      count: realStats.availableParts
    },
    {
      title: 'Book Services',
      description: `${realStats.availableServices} providers`,
      icon: Wrench,
      path: '/services',
      color: 'bg-purple-500',
      count: realStats.availableServices
    },
    {
      title: 'Get Financing',
      description: 'Flexible payment options',
      icon: CreditCard,
      path: '/finance',
      color: 'bg-orange-500'
    },
    {
      title: 'Shipping',
      description: 'Logistics solutions',
      icon: Truck,
      path: '/logistics',
      color: 'bg-red-500'
    },
    {
      title: 'Insurance',
      description: 'Equipment protection',
      icon: Shield,
      path: '/insurance',
      color: 'bg-cyan-500'
    }
  ];

  // Real stats cards - no mock data
  const realStatsCards = [
    {
      title: 'Available Robots',
      value: realStats.availableRobots,
      icon: Bot,
      trend: 'Ready to purchase',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Service Providers',
      value: realStats.availableServices,
      icon: Wrench,
      trend: 'Active providers',
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Spare Parts',
      value: realStats.availableParts,
      icon: Package,
      trend: 'In stock',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Profile Status',
      value: `${realStats.profileCompletion}%`,
      icon: User,
      trend: realStats.accountVerified ? 'Verified' : 'Incomplete',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    }
  ];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const past = new Date(dateString);
    const diffMs = now.getTime() - past.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return 'Recently';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading real dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {userProfile?.full_name || user?.email || 'Buyer'}</h1>
          <p className="text-muted-foreground">
            Discover {realStats.totalListings} real listings from verified sellers
          </p>
        </div>
        <div className="flex items-center space-x-2 max-w-md">
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search robots, parts, services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </form>
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => fetchRealDashboardData()}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Real Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {realStatsCards.map((stat, index) => {
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
                  <div className={`w-12 h-12 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
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
          <CardDescription>Explore real marketplace inventory and services</CardDescription>
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
                    {action.count !== undefined && (
                      <Badge variant="secondary" className="mt-1">
                        {action.count} available
                      </Badge>
                    )}
                  </div>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="robots">Robots ({recentRobots.length})</TabsTrigger>
          <TabsTrigger value="services">Services ({recentServices.length})</TabsTrigger>
          <TabsTrigger value="parts">Parts ({recentParts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activity - Real Data */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Recent Listings
                </CardTitle>
                <CardDescription>Latest additions to the marketplace</CardDescription>
              </CardHeader>
              <CardContent>
                {recentListings.length === 0 ? (
                  <div className="text-center py-8">
                    <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No recent listings available</p>
                    <Button variant="outline" className="mt-2" onClick={() => navigate('/robots')}>
                      Browse Catalog
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentListings.map((listing) => (
                      <div key={listing.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                          {listing.type === 'robot' && <Bot className="w-4 h-4 text-blue-600" />}
                          {listing.type === 'service' && <Wrench className="w-4 h-4 text-purple-600" />}
                          {listing.type === 'part' && <Package className="w-4 h-4 text-green-600" />}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{listing.name}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>by {listing.seller_name || 'Unknown seller'}</span>
                            {listing.price && (
                              <span>• ₹{listing.price.toLocaleString()}</span>
                            )}
                            {listing.location && (
                              <span>• {listing.location}</span>
                            )}
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {getTimeAgo(listing.created_at)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Profile Status - Real Data */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Your Profile
                </CardTitle>
                <CardDescription>Complete your profile for better recommendations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Profile Completion</p>
                    <p className="text-sm text-muted-foreground">
                      {realStats.profileCompletion < 100 ? 'Complete for better recommendations' : 'Profile complete'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{realStats.profileCompletion}%</p>
                    <div className="w-20 bg-muted rounded-full h-2 mt-1">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${realStats.profileCompletion}%` }}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Account Status</p>
                    <p className="text-sm text-muted-foreground">
                      {realStats.accountVerified ? 'Your account is verified' : 'Please complete verification'}
                    </p>
                  </div>
                  <Badge variant={realStats.accountVerified ? "default" : "secondary"}>
                    {realStats.accountVerified ? 'Verified' : 'Pending'}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Missing Information:</p>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    {!userProfile?.full_name && <p>• Full name required</p>}
                    {!userProfile?.phone && <p>• Phone number required</p>}
                    {!userProfile?.company_name && <p>• Company information</p>}
                    {!userProfile?.location && <p>• Location details</p>}
                    {realStats.profileCompletion === 100 && <p className="text-green-600">✓ Profile complete!</p>}
                  </div>
                </div>
                
                {realStats.profileCompletion < 100 && (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => navigate('/profile')}
                  >
                    Complete Profile
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="robots" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                Available Robots ({recentRobots.length})
              </CardTitle>
              <CardDescription>Industrial and service robots from verified sellers</CardDescription>
            </CardHeader>
            <CardContent>
              {recentRobots.length === 0 ? (
                <div className="text-center py-12">
                  <Bot className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No robots available</h3>
                  <p className="text-muted-foreground mb-4">
                    Check back later for new robot listings
                  </p>
                  <Button onClick={() => navigate('/robots')}>
                    Browse All Robots
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recentRobots.map((robot) => (
                    <Card key={robot.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(`/robots/${robot.id}`)}>
                      <CardContent className="p-4">
                        <div className="aspect-video bg-muted rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                          {robot.images && robot.images.length > 0 ? (
                            <img 
                              src={robot.images[0]} 
                              alt={robot.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Bot className="w-8 h-8 text-muted-foreground" />
                          )}
                        </div>
                        <h3 className="font-semibold truncate mb-1">{robot.name}</h3>
                        <p className="text-sm text-muted-foreground mb-2">{robot.robot_type}</p>
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline">{robot.availability}</Badge>
                          <p className="font-bold">₹{robot.price?.toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="w-3 h-3" />
                          <span>{robot.location || 'Location not specified'}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Seller: {robot.profiles?.full_name || 'Verified seller'}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="w-5 h-5" />
                Available Services ({recentServices.length})
              </CardTitle>
              <CardDescription>Professional services from certified providers</CardDescription>
            </CardHeader>
            <CardContent>
              {recentServices.length === 0 ? (
                <div className="text-center py-12">
                  <Wrench className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No services available</h3>
                  <p className="text-muted-foreground mb-4">
                    Check back later for new service providers
                  </p>
                  <Button onClick={() => navigate('/services')}>
                    Browse All Services
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recentServices.map((service) => (
                    <Card key={service.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(`/services/${service.id}`)}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                            <Wrench className="w-6 h-6 text-purple-600" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold mb-1">{service.name}</h3>
                            <p className="text-sm text-muted-foreground mb-2">
                              {service.description?.slice(0, 100)}...
                            </p>
                            <Badge variant="outline" className="mb-2">{service.service_type}</Badge>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <MapPin className="w-3 h-3" />
                              <span>{service.location || 'Remote service'}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                              Provider: {service.profiles?.full_name || 'Certified provider'}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="parts" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Available Parts ({recentParts.length})
              </CardTitle>
              <CardDescription>Spare parts and components in stock</CardDescription>
            </CardHeader>
            <CardContent>
              {recentParts.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No parts available</h3>
                  <p className="text-muted-foreground mb-4">
                    Check back later for new spare parts
                  </p>
                  <Button onClick={() => navigate('/parts')}>
                    Browse All Parts
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recentParts.map((part) => (
                    <Card key={part.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(`/parts/${part.id}`)}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                            <Package className="w-6 h-6 text-green-600" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold mb-1">{part.name}</h3>
                            <p className="text-sm text-muted-foreground mb-2">
                              Part #: {part.part_number || 'N/A'}
                            </p>
                            <div className="flex items-center justify-between mb-2">
                              <Badge variant="outline">Stock: {part.quantity}</Badge>
                              <p className="font-bold">₹{part.price?.toLocaleString()}</p>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Seller: {part.profiles?.full_name || 'Verified seller'}
                            </p>
                          </div>
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
