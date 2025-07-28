import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Wrench,
  Clock,
  Star,
  DollarSign,
  Calendar,
  MapPin,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle,
  Activity,
  RefreshCw,
  Search,
  Database,
  ExternalLink,
  TrendingUp,
  Settings
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database as SupabaseDatabase } from '@/integrations/supabase/types';

type Service = SupabaseDatabase['public']['Tables']['services']['Row'];
type Profile = SupabaseDatabase['public']['Tables']['profiles']['Row'];

interface ServiceProviderDashboardProps {
  userProfile: Profile;
}

interface DashboardStats {
  totalServices: number;
  activeServices: number;
  serviceTypes: number;
  avgPriceRange: string;
  coverageAreas: number;
}

const ServiceProviderDashboard = ({ userProfile }: ServiceProviderDashboardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [services, setServices] = useState<Service[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalServices: 0,
    activeServices: 0,
    serviceTypes: 0,
    avgPriceRange: 'N/A',
    coverageAreas: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Check if user has service provider access
  const hasServiceAccess = (
    userProfile?.primary_user_type === 'service_provider' || 
    userProfile?.user_type === 'service_provider' ||
    userProfile?.service_categories?.length > 0
  );

  const fetchServices = useCallback(async () => {
    if (!user || !hasServiceAccess) return [];

    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('provider_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching services:', error);
      return [];
    }
  }, [user, hasServiceAccess]);

  const calculateRealStats = (servicesData: Service[]) => {
    const totalServices = servicesData.length;
    const activeServices = servicesData.length; // All listed services are considered active
    
    // Get unique service types
    const uniqueServiceTypes = new Set(servicesData.map(s => s.service_type));
    const serviceTypes = uniqueServiceTypes.size;
    
    // Get unique locations for coverage areas
    const uniqueLocations = new Set(
      servicesData
        .map(s => s.location)
        .filter(location => location !== null && location !== undefined)
    );
    const coverageAreas = uniqueLocations.size;
    
    // Calculate average price range (simplified)
    const avgPriceRange = servicesData.length > 0 ? 'Contact for pricing' : 'N/A';

    return {
      totalServices,
      activeServices,
      serviceTypes,
      avgPriceRange,
      coverageAreas
    };
  };

  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    if (!user || !hasServiceAccess) {
      setLoading(false);
      return;
    }
    
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const servicesData = await fetchServices();
      setServices(servicesData);

      const stats = calculateRealStats(servicesData);
      setDashboardStats(stats);

      if (isRefresh) {
        toast({
          title: "Data Refreshed",
          description: "Dashboard data has been updated with real database data.",
        });
      }

    } catch (error) {
      console.error('Error fetching service provider data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load dashboard data. Please try again.",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, hasServiceAccess, fetchServices, toast]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Access control
  if (!hasServiceAccess) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              Access Restricted
            </CardTitle>
            <CardDescription className="text-red-600">
              Service Provider permissions required
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="border-red-200 bg-red-50 mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Current Status:</strong><br />
                Primary Type: {userProfile?.primary_user_type || 'Not set'}<br />
                User Type: {userProfile?.user_type || 'Not set'}<br />
                Service Categories: {userProfile?.service_categories?.length || 0}<br />
                <strong>Required:</strong> service_provider access
              </AlertDescription>
            </Alert>
            <div className="flex flex-col gap-2">
              <Button 
                variant="outline" 
                onClick={() => window.location.href = '/profile'}
                className="w-full"
              >
                Update Profile
              </Button>
              <Button 
                variant="outline"
                onClick={() => window.location.href = '/dashboard'}
                className="w-full"
              >
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Filter services based on search
  const filteredServices = services.filter(service =>
    service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.service_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const statsCards = [
    {
      title: 'Total Services',
      value: dashboardStats.totalServices.toString(),
      icon: Wrench,
      trend: 'Listed services',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Service Types',
      value: dashboardStats.serviceTypes.toString(),
      icon: Activity,
      trend: 'Different categories',
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Coverage Areas',
      value: dashboardStats.coverageAreas.toString(),
      icon: MapPin,
      trend: 'Locations served',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      title: 'Profile Categories',
      value: (userProfile?.service_categories?.length || 0).toString(),
      icon: Settings,
      trend: 'Profile setup',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Average Pricing',
      value: dashboardStats.avgPriceRange,
      icon: DollarSign,
      trend: 'Contact based',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <div>
            <p className="text-lg font-medium">Loading Service Dashboard</p>
            <p className="text-sm text-muted-foreground">Fetching your service data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Access Confirmation */}
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="w-4 h-4" />
          <AlertDescription className="text-green-700">
            <strong>✅ Service Provider Access Confirmed</strong> - Real data from services table
          </AlertDescription>
        </Alert>

        {/* Service Categories Display */}
        {userProfile?.service_categories && userProfile.service_categories.length > 0 && (
          <Alert className="border-blue-200 bg-blue-50">
            <Wrench className="w-4 h-4" />
            <AlertDescription className="text-blue-800">
              <strong>🔧 Your Service Categories:</strong>
              <div className="flex flex-wrap gap-2 mt-2">
                {userProfile.service_categories.map((category, index) => (
                  <Badge key={index} variant="outline" className="bg-white">{category}</Badge>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Database Status */}
        <Alert className="border-blue-200 bg-blue-50">
          <Database className="w-4 h-4" />
          <AlertDescription className="text-blue-800">
            <strong>📊 Current Database Status:</strong>
            <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
              <div>• Services: ✅ Available ({services.length} records)</div>
              <div>• Service Requests: ❌ Table not created</div>
              <div>• Service Reviews: ❌ Table not created</div>
            </div>
          </AlertDescription>
        </Alert>

        {/* Enhancement Notice */}
        <Alert className="border-yellow-200 bg-yellow-50">
          <Database className="w-4 h-4" />
          <AlertDescription className="text-yellow-800">
            <strong>🚀 Expand Your Service Management:</strong> Create additional tables to unlock advanced features:
            <div className="mt-2 text-sm space-y-1">
              <div>• <code>service_requests</code> - Track client service bookings and manage appointments</div>
              <div>• <code>service_reviews</code> - Collect customer feedback and build reputation</div>
              <div>• <code>service_appointments</code> - Schedule and calendar management</div>
            </div>
            <Button 
              variant="link" 
              className="p-0 mt-2 text-yellow-800 underline" 
              onClick={() => window.open('/docs/service-tables-setup', '_blank')}
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              View Setup Guide
            </Button>
          </AlertDescription>
        </Alert>

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Service Provider Dashboard
            </h1>
            <p className="text-muted-foreground">
              Manage your service offerings with real database data
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => fetchDashboardData(true)}
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add New Service
            </Button>
          </div>
        </div>

        {/* Real Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {statsCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="hover:shadow-lg transition-all duration-200 border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                        {stat.title}
                      </p>
                      <p className="text-2xl font-bold mt-1">{stat.value}</p>
                      <Badge variant="secondary" className="mt-2 text-xs">
                        {stat.trend}
                      </Badge>
                    </div>
                    <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                      <Icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Main Content */}
        <Tabs defaultValue="services" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="services" className="flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              My Services ({services.length})
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Categories
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="services" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Wrench className="w-5 h-5" />
                      My Service Offerings
                    </CardTitle>
                    <CardDescription>Real services from your database ({services.length} total)</CardDescription>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search services..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredServices.length === 0 ? (
                  <div className="text-center py-12">
                    <Wrench className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      {services.length === 0 ? 'No Services Found' : 'No Services Match Your Search'}
                    </h3>
                    <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                      {services.length === 0 
                        ? 'You haven\'t added any services to the services table yet.'
                        : 'Try adjusting your search criteria to find services.'
                      }
                    </p>
                    {services.length === 0 && (
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Your First Service
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredServices.map((service) => (
                      <Card key={service.id} className="hover:shadow-lg transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <h3 className="font-semibold">{service.name}</h3>
                            <div className="flex items-center gap-1">
                              <Button size="sm" variant="ghost">
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button size="sm" variant="ghost">
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                            {service.description || 'No description provided'}
                          </p>
                          <Badge variant="secondary" className="mb-2">{service.service_type}</Badge>
                          
                          {service.specializations && service.specializations.length > 0 && (
                            <div className="mb-2">
                              <div className="flex flex-wrap gap-1">
                                {service.specializations.slice(0, 2).map((spec, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">{spec}</Badge>
                                ))}
                                {service.specializations.length > 2 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{service.specializations.length - 2} more
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-primary">
                              {service.price_range || 'Price on request'}
                            </span>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <MapPin className="w-3 h-3" />
                              <span>{service.location || 'Location not set'}</span>
                            </div>
                          </div>
                          
                          <div className="mt-3 text-xs text-muted-foreground">
                            Created: {new Date(service.created_at).toLocaleDateString()}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Service Categories</CardTitle>
                  <CardDescription>Categories defined in your profile</CardDescription>
                </CardHeader>
                <CardContent>
                  {userProfile?.service_categories && userProfile.service_categories.length > 0 ? (
                    <div className="space-y-3">
                      {userProfile.service_categories.map((category, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{category}</p>
                            <p className="text-sm text-muted-foreground">
                              {services.filter(s => s.service_type === category).length} services
                            </p>
                          </div>
                          <Badge variant="outline">Active</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Settings className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">No service categories configured</p>
                      <Button variant="outline" onClick={() => window.location.href = '/profile'}>
                        <Settings className="w-4 h-4 mr-2" />
                        Update Profile
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Service Types in Database</CardTitle>
                  <CardDescription>Types from your actual services</CardDescription>
                </CardHeader>
                <CardContent>
                  {services.length > 0 ? (
                    <div className="space-y-3">
                      {Array.from(new Set(services.map(s => s.service_type))).map((type, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{type}</p>
                            <p className="text-sm text-muted-foreground">
                              {services.filter(s => s.service_type === type).length} services
                            </p>
                          </div>
                          <Badge>{services.filter(s => s.service_type === type).length}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Wrench className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No services found in database</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Service Statistics</CardTitle>
                  <CardDescription>Based on your services table data</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Total Services Listed</p>
                      <p className="text-sm text-muted-foreground">In services table</p>
                    </div>
                    <Badge>{dashboardStats.totalServices}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Unique Service Types</p>
                      <p className="text-sm text-muted-foreground">Different categories offered</p>
                    </div>
                    <Badge variant="outline">{dashboardStats.serviceTypes}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Coverage Areas</p>
                      <p className="text-sm text-muted-foreground">Unique locations served</p>
                    </div>
                    <Badge variant="secondary">{dashboardStats.coverageAreas}</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Database Summary</CardTitle>
                  <CardDescription>Real data availability</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Services Table</p>
                      <p className="text-sm text-muted-foreground">✅ Available and populated</p>
                    </div>
                    <Badge>{services.length} records</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Service Requests</p>
                      <p className="text-sm text-muted-foreground">❌ Table not created</p>
                    </div>
                    <Badge variant="outline">Missing</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Service Reviews</p>
                      <p className="text-sm text-muted-foreground">❌ Table not created</p>
                    </div>
                    <Badge variant="outline">Missing</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ServiceProviderDashboard;
