import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  Loader2
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface ServiceProviderDashboardProps {
  userProfile: any;
}

const ServiceProviderDashboard = ({ userProfile }: ServiceProviderDashboardProps) => {
  const { user } = useAuth();
  const [services, setServices] = useState<any[]>([]);
  const [serviceRequests, setServiceRequests] = useState<any[]>([]);
  const [dashboardStats, setDashboardStats] = useState({
    totalServices: 0,
    activeRequests: 0,
    completedJobs: 0,
    monthlyRevenue: 0,
    averageRating: 4.8
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch real dashboard data
  useEffect(() => {
    fetchDashboardData();
    // Optionally: add real-time subs here for supabase if desired
    // return () => { unsubscribe... };
    // eslint-disable-next-line
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch provider's services
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .eq('provider_id', user.id);

      // 2. Fetch all service requests tied to the provider
      // We'll assume your `service_requests` has a provider_id or service.provider_id reference
      const { data: requestsData, error: requestsError } = await supabase
        .from('service_requests')
        .select(`
          *,
          client:profiles (
            full_name
          ),
          service:services (
            name,
            service_type,
            price_range,
            location
          )
        `)
        .eq('provider_id', user.id);

      if (servicesError) throw servicesError;
      if (requestsError) throw requestsError;

      setServices(servicesData || []);
      setServiceRequests(requestsData || []);

      // Get dashboard metrics from real data
      const completedRequests = (requestsData || []).filter((r: any) => r.status === 'completed');
      const activeRequests = (requestsData || []).filter((r: any) =>
        r.status === 'pending' || r.status === 'in_progress'
      );
      // Calculate monthly revenue (this month, only for completed jobs)
      const monthStart = new Date();
      monthStart.setDate(1);
      const thisMonthRequests = completedRequests.filter((r: any) =>
        r.completed_at && new Date(r.completed_at) >= monthStart
      );
      const monthlyRevenue = thisMonthRequests.reduce(
        (sum: number, r: any) => sum + (r.amount_paid || 0),
        0
      );

      setDashboardStats({
        totalServices: servicesData?.length || 0,
        activeRequests: activeRequests.length,
        completedJobs: completedRequests.length,
        monthlyRevenue,
        averageRating: userProfile?.average_rating || 4.8
      });

      setLoading(false);
    } catch (e: any) {
      setError('Failed to load dashboard data');
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'secondary' as const, label: 'Pending' },
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

  const statsCards = [
    {
      title: 'Total Services',
      value: dashboardStats.totalServices,
      icon: Wrench,
      trend: 'Listed',
      color: 'text-blue-600'
    },
    {
      title: 'Active Requests',
      value: dashboardStats.activeRequests,
      icon: Clock,
      trend: 'Pending',
      color: 'text-orange-600'
    },
    {
      title: 'Completed Jobs',
      value: dashboardStats.completedJobs,
      icon: CheckCircle,
      trend: 'All time',
      color: 'text-green-600'
    },
    {
      title: 'Monthly Revenue',
      value: `₹${dashboardStats.monthlyRevenue.toLocaleString()}`,
      icon: DollarSign,
      trend: 'This month',
      color: 'text-purple-600'
    },
    {
      title: 'Average Rating',
      value: dashboardStats.averageRating,
      icon: Star,
      trend: 'Customer rating',
      color: 'text-yellow-600'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <AlertCircle className="w-8 h-8 mr-2 text-red-500" />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Service Provider Dashboard</h1>
          <p className="text-muted-foreground">Manage your services and client requests</p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add New Service
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <Badge variant="secondary" className="mt-1 text-xs">{stat.trend}</Badge>
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

      {/* Main Content Tabs */}
      <Tabs defaultValue="requests" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="requests">Service Requests</TabsTrigger>
          <TabsTrigger value="services">My Services</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

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
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No service requests</p>
                </div>
              ) : (
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
                    {serviceRequests.map((request: any) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">{request.client?.full_name || '---'}</TableCell>
                        <TableCell>{request.service?.service_type || request.service_type || '---'}</TableCell>
                        <TableCell>{request.scheduled_date || '---'}</TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell>{getUrgencyBadge(request.urgency)}</TableCell>
                        <TableCell className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {request.service?.location || request.location || '---'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline">Accept</Button>
                            <Button size="sm" variant="ghost">Details</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="w-5 h-5" />
                My Service Offerings
              </CardTitle>
              <CardDescription>Manage your available services and pricing</CardDescription>
            </CardHeader>
            <CardContent>
              {services.length === 0 ? (
                <div className="text-center py-8">
                  <Wrench className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No services listed</p>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Service
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {services.map((service: any) => (
                    <Card key={service.id} className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="font-semibold">{service.name}</h3>
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="ghost"><Edit className="w-3 h-3" /></Button>
                            <Button size="sm" variant="ghost"><Trash2 className="w-3 h-3" /></Button>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{service.description}</p>
                        <Badge variant="secondary" className="mb-2">{service.service_type}</Badge>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-primary">{service.price_range || 'N/A'}</span>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="w-3 h-3" />
                            <span>{service.location || '---'}</span>
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
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">Calendar integration coming soon</p>
                <Button variant="outline">
                  View Schedule
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
                    <p className="font-medium">Average Response Time</p>
                    <p className="text-sm text-muted-foreground">Time to respond to requests</p>
                  </div>
                  <Badge variant="outline">2.3 hours</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Completion Rate</p>
                    <p className="text-sm text-muted-foreground">Successful completed jobs</p>
                  </div>
                  <Badge variant="outline">
                    {dashboardStats.completedJobs}/{dashboardStats.activeRequests + dashboardStats.completedJobs}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Average Rating</p>
                    <p className="text-sm text-muted-foreground">Based on client reviews</p>
                  </div>
                  <Badge variant="outline">{dashboardStats.averageRating} ★</Badge>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Here you could render a chart in the future */}
                <div className="text-4xl font-bold text-primary mb-2">₹{dashboardStats.monthlyRevenue.toLocaleString()}</div>
                <p className="text-muted-foreground mb-2">Revenue (this month) from completed jobs.</p>
                <div className="bg-gray-200 rounded-lg p-6 text-center text-gray-600">Chart integration coming soon.</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ServiceProviderDashboard;
