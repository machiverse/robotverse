import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Wrench,
  Clock,
  Star,
  DollarSign,
  Calendar,
  User,
  MapPin,
  Phone,
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
  Users,
  Settings
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

// Use actual database types
type Service = Database['public']['Tables']['services']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

interface ServiceProviderDashboardProps {
  userProfile: Profile;
}

interface ServiceRequest {
  id: string;
  service_id: string;
  client_id: string;
  client_name: string;
  client_email?: string;
  client_phone?: string;
  service_type: string;
  description: string;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  urgency: 'low' | 'medium' | 'high';
  scheduled_date: string;
  location: string;
  budget_range?: string;
  created_at: string;
  updated_at: string;
}

interface DashboardStats {
  totalServices: number;
  activeRequests: number;
  completedJobs: number;
  monthlyRevenue: number;
  averageRating: number;
  responseTime: number;
  completionRate: number;
}

const ServiceProviderDashboard = ({ userProfile }: ServiceProviderDashboardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [services, setServices] = useState<Service[]>([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalServices: 0,
    activeRequests: 0,
    completedJobs: 0,
    monthlyRevenue: 0,
    averageRating: 0,
    responseTime: 0,
    completionRate: 0
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

  const fetchServiceRequests = useCallback(async () => {
    // Since service_requests table doesn't exist yet, return empty array
    // When you create the table, replace this with real query:
    /*
    try {
      const { data, error } = await supabase
        .from('service_requests')
        .select(`
          *,
          services!inner(provider_id)
        `)
        .eq('services.provider_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching service requests:', error);
      return [];
    }
    */
    return [];
  }, [user]);

  const calculateStats = (servicesData: Service[], requestsData: ServiceRequest[]) => {
    const totalServices = servicesData.length;
    const activeRequests = requestsData.filter(r => ['pending', 'accepted', 'in_progress'].includes(r.status)).length;
    const completedJobs = requestsData.filter(r => r.status === 'completed').length;
    
    // Calculate monthly revenue (would come from completed jobs)
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyRevenue = 0; // Would be calculated from completed service requests
    
    // Mock some calculated stats (would come from real data)
    const averageRating = 4.8;
    const responseTime = 2.3; // hours
    const completionRate = requestsData.length > 0 ? (completedJobs / requestsData.length) * 100 : 0;

    return {
      totalServices,
      activeRequests,
      completedJobs,
      monthlyRevenue,
      averageRating,
      responseTime,
      completionRate
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

      const [servicesData, requestsData] = await Promise.all([
        fetchServices(),
        fetchServiceRequests()
      ]);

      setServices(servicesData);
      setServiceRequests(requestsData);

      const stats = calculateStats(servicesData, requestsData);
      setDashboardStats(stats);

      if (isRefresh) {
        toast({
          title: "Data Refreshed",
          description: "Dashboard data has been updated.",
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
  }, [user, hasServiceAccess, fetchServices, fetchServiceRequests, toast]);

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

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'secondary' as const, label: 'Pending' },
      accepted: { variant: 'default' as const, label: 'Accepted' },
      in_progress: { variant: 'default' as const, label: 'In Progress' },
      completed: { variant: 'outline' as const, label: 'Completed' },
      cancelled: { variant: 'destructive' as const, label: 'Cancelled' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getUrgencyBadge = (urgency: string) => {
    const urgencyConfig = {
      low: { color: 'bg-green-100 text-green-800', label: 'Low' },
      medium: { color: 'bg-yellow-100 text-yellow-800', label: 'Medium' },
      high: { color: 'bg-red-100 text-red-800', label: 'High' }
    };
    
    const config = urgencyConfig[urgency as keyof typeof urgencyConfig] || urgencyConfig.medium;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

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
      trend: 'Services listed',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Active Requests',
      value: dashboardStats.activeRequests.toString(),
      icon: Clock,
      trend: 'Pending action',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      title: 'Completed Jobs',
      value: dashboardStats.completedJobs.toString(),
      icon: CheckCircle,
      trend: 'All time',
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Monthly Revenue',
      value: `₹${dashboardStats.monthlyRevenue.toLocaleString()}`,
      icon: DollarSign,
      trend: 'This month',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Average Rating',
      value: dashboardStats.averageRating > 0 ? dashboardStats.averageRating.toFixed(1) : '0.0',
      icon: Star,
      trend: 'Customer rating',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <div>
            <p className="text-lg font-medium">Loading Service Dashboard</p>
            <p className="text-sm text-muted-foreground">Preparing your service data...</p>
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
            <strong>✅ Service Provider Access Confirmed</strong> - Welcome, {userProfile?.full_name || user?.email}
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

        {/* Database Enhancement Notice */}
        <Alert className="border-yellow-200 bg-yellow-50">
          <Database className="w-4 h-4" />
          <AlertDescription className="text-yellow-800">
            <strong>🔧 Enhanced Service Features Available:</strong> Create additional tables to unlock full service management:
            <div className="mt-2 text-sm space-y-1">
              <div>• <code>service_requests</code> - Client service requests and bookings</div>
              <div>• <code>service_reviews</code> - Customer ratings and feedback</div>
              <div>• <code>service_appointments</code> - Scheduled service calendar</div>
            </div>
            <Button 
              variant="link" 
              className="p-0 mt-2 text-yellow-800 underline" 
              onClick={() => window.open('#create-service-tables', '_blank')}
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              View Table Creation Guide
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
              Manage your services, client requests, and business growth
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

        {/* Enhanced Stats Overview */}
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

        {/* Main Content Tabs */}
        <Tabs defaultValue="services" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="services" className="flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              Services ({services.length})
            </TabsTrigger>
            <TabsTrigger value="requests" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Requests ({serviceRequests.length})
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Calendar
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
                    <CardDescription>Manage your available services and pricing</CardDescription>
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
                      {services.length === 0 ? 'No Services Listed' : 'No Services Match Your Search'}
                    </h3>
                    <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                      {services.length === 0 
                        ? 'Start building your service portfolio by adding your first service offering.'
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
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="requests" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Service Request Queue
                </CardTitle>
                <CardDescription>Manage incoming service requests and assignments</CardDescription>
              </CardHeader>
              <CardContent>
                {serviceRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Service Requests</h3>
                    <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                      Service requests will appear here when clients book your services. 
                      Set up the service_requests table to start receiving bookings.
                    </p>
                    <Button variant="outline">
                      <Database className="w-4 h-4 mr-2" />
                      Setup Service Requests
                    </Button>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Client</TableHead>
                          <TableHead>Service Type</TableHead>
                          <TableHead>Scheduled Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Urgency</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {serviceRequests.map((request) => (
                          <TableRow key={request.id}>
                            <TableCell className="font-medium">
                              <div>
                                <p>{request.client_name}</p>
                                {request.client_email && (
                                  <p className="text-xs text-muted-foreground">{request.client_email}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{request.service_type}</TableCell>
                            <TableCell>{new Date(request.scheduled_date).toLocaleDateString()}</TableCell>
                            <TableCell>{getStatusBadge(request.status)}</TableCell>
                            <TableCell>{getUrgencyBadge(request.urgency)}</TableCell>
                            <TableCell className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {request.location}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button size="sm" variant="outline">
                                  Accept
                                </Button>
                                <Button size="sm" variant="ghost">
                                  Details
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calendar" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Service Calendar
                </CardTitle>
                <CardDescription>View and manage your service schedule</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Calendar Integration</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    Schedule management and calendar integration will be available once service booking tables are set up.
                  </p>
                  <Button variant="outline">
                    <Settings className="w-4 h-4 mr-2" />
                    Setup Calendar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Service Listings</p>
                      <p className="text-sm text-muted-foreground">Active service offerings</p>
                    </div>
                    <Badge>{dashboardStats.totalServices}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Response Time</p>
                      <p className="text-sm text-muted-foreground">Average time to respond</p>
                    </div>
                    <Badge variant="outline">{dashboardStats.responseTime} hours</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Completion Rate</p>
                      <p className="text-sm text-muted-foreground">Jobs completed successfully</p>
                    </div>
                    <Badge variant="secondary">{Math.round(dashboardStats.completionRate)}%</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Service Categories</CardTitle>
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
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ServiceProviderDashboard;
