import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Bot, Package, Wrench, BarChart3 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

// Import individual dashboard components
import RobotUpload from '@/components/RobotUpload';
import SpareParts from '@/components/SpareParts';
import ServiceListing from '@/components/ServiceListing';

interface MultiRoleSellerDashboardProps {
  userProfile: any;
}

interface ServiceRequest {
  id: string;
  client_name: string;
  client_email: string;
  client_mobile: string;
  robot_name: string;
  service_type: string;
  status: string;
  created_at: string;
  description?: string;
}

const MultiRoleSellerDashboard = ({ userProfile }: MultiRoleSellerDashboardProps) => {
  const { user } = useAuth();
  const [robots, setRobots] = useState<any[]>([]);
  const [spareParts, setSpareParts] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const sellerRoles = userProfile?.seller_roles || [];
  const serviceCategories = userProfile?.service_categories || [];

  // Determine which tabs to show based on seller roles
  const hasRobotSeller = sellerRoles.includes('robot_seller');
  const hasPartsSeller = sellerRoles.includes('spare_parts_seller');
  const hasServiceProvider = sellerRoles.includes('service_provider');

  // Default to robot seller if no specific roles
  const defaultTab = hasRobotSeller ? 'robots' : hasPartsSeller ? 'parts' : hasServiceProvider ? 'services' : 'robots';

  useEffect(() => {
    fetchAllData();
  }, [user]);

  const fetchAllData = async () => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      // Fetch all data in parallel
      const promises = [];

      if (hasRobotSeller) {
        promises.push(
          supabase
            .from('robots')
            .select('*')
            .eq('seller_id', user.id)
            .order('created_at', { ascending: false })
        );
      }

      if (hasPartsSeller) {
        promises.push(
          supabase
            .from('spare_parts')
            .select('*')
            .eq('seller_id', user.id)
            .order('created_at', { ascending: false })
        );
      }

      if (hasServiceProvider) {
        promises.push(
          supabase
            .from('services')
            .select('*')
            .eq('provider_id', user.id)
            .order('created_at', { ascending: false })
        );
      }

      const results = await Promise.all(promises);
      let resultIndex = 0;

      if (hasRobotSeller) {
        const { data: robotData } = results[resultIndex++];
        setRobots(robotData || []);
      }

      if (hasPartsSeller) {
        const { data: partsData } = results[resultIndex++];
        setSpareParts(partsData || []);
      }

      if (hasServiceProvider) {
        const { data: servicesData } = results[resultIndex++];
        setServices(servicesData || []);
        
        // Mock service requests for now (until we create service_requests table)
        const mockRequests: ServiceRequest[] = [
          {
            id: '1',
            client_name: 'ABC Manufacturing',
            client_email: 'contact@abcmfg.com',
            client_mobile: '+91-9876543210',
            robot_name: 'Industrial Robot ARM-200X',
            service_type: 'Installation',
            status: 'pending',
            created_at: new Date().toISOString(),
            description: 'Need installation of robotic arm in production line'
          },
          {
            id: '2',
            client_name: 'Tech Industries',
            client_email: 'support@techindustries.com',
            client_mobile: '+91-8765432109',
            robot_name: 'Welding Robot WR-500',
            service_type: 'Maintenance',
            status: 'in_progress',
            created_at: new Date(Date.now() - 86400000).toISOString(),
            description: 'Scheduled maintenance and calibration'
          }
        ];
        setServiceRequests(mockRequests);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="ml-4">Loading dashboard...</p>
      </div>
    );
  }

  if (!hasRobotSeller && !hasPartsSeller && !hasServiceProvider) {
    return (
      <div className="space-y-6">
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-700">
              <BarChart3 className="w-6 h-6" />
              No Seller Roles Configured
            </CardTitle>
            <CardDescription className="text-yellow-600">
              You need to configure seller roles to access the seller dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-yellow-700 mb-4">
              Please update your profile to include one or more seller roles: Robot Seller, Spare Parts Seller, or Service Provider.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const availableRobots = robots.filter(robot => robot.availability === 'available');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Multi-Role Seller Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your marketplace presence across all your roles
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {sellerRoles.map((role) => (
              <Badge key={role} variant="secondary">
                {role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Multi-Role Tabs */}
      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          {hasRobotSeller && (
            <TabsTrigger value="robots" className="flex items-center gap-2">
              <Bot className="w-4 h-4" />
              Robot Seller ({robots.length})
            </TabsTrigger>
          )}
          {hasPartsSeller && (
            <TabsTrigger value="parts" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Spare Parts ({spareParts.length})
            </TabsTrigger>
          )}
          {hasServiceProvider && (
            <TabsTrigger value="services" className="flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              Service Provider ({services.length})
            </TabsTrigger>
          )}
        </TabsList>

        {/* Robot Seller Tab */}
        {hasRobotSeller && (
          <TabsContent value="robots" className="mt-6">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="w-5 h-5" />
                    Robot Listings Management
                  </CardTitle>
                  <CardDescription>
                    Upload and manage your robot listings with single/bulk upload and image support
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RobotUpload onSuccess={fetchAllData} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}

        {/* Spare Parts Seller Tab */}
        {hasPartsSeller && (
          <TabsContent value="parts" className="mt-6">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Spare Parts Management
                  </CardTitle>
                  <CardDescription>
                    Upload and manage your spare parts inventory with image upload support
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SpareParts />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}

        {/* Service Provider Tab */}
        {hasServiceProvider && (
          <TabsContent value="services" className="mt-6">
            <div className="space-y-6">
              {/* Service Categories Display */}
              {serviceCategories.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Your Service Categories</CardTitle>
                    <CardDescription>
                      The service categories you provide
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {serviceCategories.map((category) => (
                        <Badge key={category} variant="outline">
                          {category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Available Robots */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="w-5 h-5" />
                    Available Robots for Service ({availableRobots.length})
                  </CardTitle>
                  <CardDescription>
                    Robots available in the marketplace that may need your services
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {availableRobots.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No robots available for service at the moment
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {availableRobots.slice(0, 6).map((robot) => (
                        <Card key={robot.id} className="hover:shadow-lg transition-shadow">
                          <CardContent className="p-4">
                            <div className="aspect-square bg-muted rounded-lg mb-3 flex items-center justify-center">
                              <Bot className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <h4 className="font-semibold truncate">{robot.name}</h4>
                            <p className="text-sm text-muted-foreground truncate">{robot.robot_type}</p>
                            <p className="text-sm text-muted-foreground">{robot.location}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Service Requests */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wrench className="w-5 h-5" />
                    Incoming Service Requests ({serviceRequests.length})
                  </CardTitle>
                  <CardDescription>
                    Service and installation requests from clients
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {serviceRequests.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No service requests at the moment
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {serviceRequests.map((request) => (
                        <Card key={request.id} className="border-l-4 border-l-primary">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h4 className="font-semibold">{request.client_name}</h4>
                                <p className="text-sm text-muted-foreground">{request.robot_name}</p>
                              </div>
                              {getStatusBadge(request.status)}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="font-medium">Email:</p>
                                <p className="text-muted-foreground">{request.client_email}</p>
                              </div>
                              <div>
                                <p className="font-medium">Mobile:</p>
                                <p className="text-muted-foreground">{request.client_mobile}</p>
                              </div>
                              <div>
                                <p className="font-medium">Service Type:</p>
                                <p className="text-muted-foreground">{request.service_type}</p>
                              </div>
                            </div>
                            {request.description && (
                              <div className="mt-3">
                                <p className="font-medium text-sm">Description:</p>
                                <p className="text-sm text-muted-foreground">{request.description}</p>
                              </div>
                            )}
                            <div className="flex gap-2 mt-4">
                              <Badge variant="secondary">
                                {new Date(request.created_at).toLocaleDateString()}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Service Listings Management */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wrench className="w-5 h-5" />
                    Service Listings Management
                  </CardTitle>
                  <CardDescription>
                    Create and manage your service offerings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ServiceListing />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default MultiRoleSellerDashboard;