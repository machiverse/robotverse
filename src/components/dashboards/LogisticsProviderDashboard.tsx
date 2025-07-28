import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Truck,
  Package,
  MapPin,
  Clock,
  Star,
  DollarSign,
  Navigation,
  Users,
  Activity,
  Plus,
  Edit,
  Eye,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  Database,
  ExternalLink,
  Settings
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

// Use the actual database types
type Profile = Database['public']['Tables']['profiles']['Row'];
type UserTypeEnum = Database['public']['Enums']['user_type_enum'];

interface LogisticsProviderDashboardProps {
  userProfile: Profile;
}

interface LogisticsStats {
  activeShipments: number;
  totalDeliveries: number;
  onTimeDeliveryRate: number;
  monthlyRevenue: number;
  customerRating: number;
  availableVehicles: number;
  totalFleetSize: number;
  serviceRegions: string[];
  transportModes: string[];
}

const LogisticsProviderDashboard = ({ userProfile }: LogisticsProviderDashboardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [dashboardStats, setDashboardStats] = useState<LogisticsStats>({
    activeShipments: 0,
    totalDeliveries: 0,
    onTimeDeliveryRate: 0,
    monthlyRevenue: 0,
    customerRating: 0,
    availableVehicles: 0,
    totalFleetSize: 0,
    serviceRegions: [],
    transportModes: []
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [logisticsProviders, setLogisticsProviders] = useState<Profile[]>([]);

  // Check if user has logistics provider access using the actual enum
  const hasLogisticsAccess = (
    userProfile?.primary_user_type === 'logistics_provider' || 
    userProfile?.user_type === 'logistics_provider'
  );

  const fetchLogisticsProviders = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or('primary_user_type.eq.logistics_provider,user_type.eq.logistics_provider')
        .not('logistics_region', 'is', null);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching logistics providers:', error);
      return [];
    }
  }, []);

  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    if (!user || !hasLogisticsAccess) {
      setLoading(false);
      return;
    }
    
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      // Fetch other logistics providers for network insights
      const providers = await fetchLogisticsProviders();
      setLogisticsProviders(providers);

      // Extract logistics info from user profile
      const serviceRegions = userProfile?.logistics_region ? [userProfile.logistics_region] : [];
      const transportModes = userProfile?.transport_modes || [];

      // Set stats based on available profile data
      const stats: LogisticsStats = {
        activeShipments: 0, // Would come from logistics_shipments table
        totalDeliveries: 0, // Would come from logistics_shipments table
        onTimeDeliveryRate: 0, // Would be calculated from delivery data
        monthlyRevenue: 0, // Would come from completed shipments
        customerRating: 0, // Would come from reviews/ratings
        availableVehicles: 0, // Would come from logistics_fleet table
        totalFleetSize: 0, // Would come from logistics_fleet table
        serviceRegions,
        transportModes
      };

      setDashboardStats(stats);

      if (isRefresh) {
        toast({
          title: "Data Refreshed",
          description: "Dashboard data has been updated.",
        });
      }

    } catch (error) {
      console.error('Error fetching logistics provider data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load dashboard data. Please try again.",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, hasLogisticsAccess, userProfile, fetchLogisticsProviders, toast]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Access control using actual database types
  if (!hasLogisticsAccess) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Access Restricted
            </CardTitle>
            <CardDescription className="text-red-600">
              Logistics Provider permissions required
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="border-red-200 bg-red-50 mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Current Status:</strong><br />
                Primary Type: {userProfile?.primary_user_type || 'Not set'}<br />
                User Type: {userProfile?.user_type || 'Not set'}<br />
                <strong>Required:</strong> logistics_provider
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

  const statsCards = [
    {
      title: 'Active Shipments',
      value: dashboardStats.activeShipments.toString(),
      icon: Package,
      trend: 'In progress',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Service Regions',
      value: dashboardStats.serviceRegions.length.toString(),
      icon: MapPin,
      trend: 'Coverage areas',
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Transport Modes',
      value: dashboardStats.transportModes.length.toString(),
      icon: Truck,
      trend: 'Available options',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      title: 'Network Providers',
      value: logisticsProviders.length.toString(),
      icon: Users,
      trend: 'In platform',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Setup Progress',
      value: `${Math.round(((dashboardStats.serviceRegions.length + dashboardStats.transportModes.length) / 6) * 100)}%`,
      icon: Settings,
      trend: 'Profile completion',
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
            <p className="text-lg font-medium">Loading Logistics Dashboard</p>
            <p className="text-sm text-muted-foreground">Checking your logistics setup...</p>
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
            <strong>✅ Logistics Provider Access Confirmed</strong> - Welcome, {userProfile?.full_name || user?.email}
          </AlertDescription>
        </Alert>

        {/* Current Profile Status */}
        <Alert className="border-blue-200 bg-blue-50">
          <Database className="w-4 h-4" />
          <AlertDescription className="text-blue-800">
            <strong>📋 Profile Status:</strong>
            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div>• <strong>Region:</strong> {userProfile?.logistics_region || 'Not set'}</div>
              <div>• <strong>Type:</strong> {userProfile?.logistics_type || 'Not set'}</div>
              <div>• <strong>Transport Modes:</strong> {userProfile?.transport_modes?.length || 0} configured</div>
              <div>• <strong>Warehouse:</strong> {userProfile?.warehouse_storage ? 'Available' : 'Not available'}</div>
            </div>
          </AlertDescription>
        </Alert>

        {/* Missing Tables Notice */}
        <Alert className="border-yellow-200 bg-yellow-50">
          <Database className="w-4 h-4" />
          <AlertDescription className="text-yellow-800">
            <strong>🔧 Enhanced Logistics Features:</strong> To unlock full logistics management capabilities, you need additional database tables:
            <div className="mt-2 text-sm space-y-1">
              <div>• <code>logistics_shipments</code> - Shipment tracking and management</div>
              <div>• <code>logistics_fleet</code> - Vehicle and driver management</div>
              <div>• <code>logistics_coverage</code> - Service areas and pricing</div>
              <div>• <code>logistics_rates</code> - Dynamic pricing management</div>
            </div>
            <Button 
              variant="link" 
              className="p-0 mt-2 text-yellow-800 underline" 
              onClick={() => window.open('#create-logistics-tables', '_blank')}
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
              Logistics Provider Dashboard
            </h1>
            <p className="text-muted-foreground">
              Manage your logistics operations and network connections
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
            <Button variant="outline" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Profile Setup
            </Button>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Expand Features
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

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Current Setup */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Your Logistics Setup
              </CardTitle>
              <CardDescription>Current profile configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Service Region</h4>
                <p className="text-sm text-muted-foreground">
                  {userProfile?.logistics_region || 'Not configured - Please update your profile'}
                </p>
              </div>
              
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Logistics Type</h4>
                <p className="text-sm text-muted-foreground">
                  {userProfile?.logistics_type || 'Not specified'}
                </p>
              </div>

              {userProfile?.transport_modes && userProfile.transport_modes.length > 0 && (
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Transport Modes</h4>
                  <div className="flex flex-wrap gap-2">
                    {userProfile.transport_modes.map((mode, index) => (
                      <Badge key={index} variant="outline">{mode}</Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Warehouse Storage</h4>
                <div className="flex items-center gap-2">
                  {userProfile?.warehouse_storage ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                  )}
                  <span className="text-sm">
                    {userProfile?.warehouse_storage ? 'Available' : 'Not available'}
                  </span>
                </div>
              </div>

              <Button className="w-full" onClick={() => window.location.href = '/profile'}>
                <Edit className="w-4 h-4 mr-2" />
                Update Profile Settings
              </Button>
            </CardContent>
          </Card>

          {/* Network Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Logistics Network
              </CardTitle>
              <CardDescription>Other logistics providers on the platform</CardDescription>
            </CardHeader>
            <CardContent>
              {logisticsProviders.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No other logistics providers found</p>
                  <p className="text-sm text-muted-foreground">
                    You're among the first logistics providers on the platform!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {logisticsProviders.slice(0, 5).map((provider) => (
                    <div key={provider.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{provider.full_name || provider.company_name || 'Unnamed Provider'}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="w-3 h-3" />
                          <span>{provider.logistics_region || 'Region not specified'}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="mb-1">
                          {provider.logistics_type || 'General'}
                        </Badge>
                        {provider.transport_modes && (
                          <p className="text-xs text-muted-foreground">
                            {provider.transport_modes.length} transport modes
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {logisticsProviders.length > 5 && (
                    <div className="text-center pt-2">
                      <Button variant="outline" size="sm">
                        View All {logisticsProviders.length} Providers
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Feature Expansion Guide */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Expand Logistics Features
            </CardTitle>
            <CardDescription>Add these database tables to unlock full logistics management</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="shipments" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="shipments">Shipments</TabsTrigger>
                <TabsTrigger value="fleet">Fleet</TabsTrigger>
                <TabsTrigger value="coverage">Coverage</TabsTrigger>
                <TabsTrigger value="rates">Rates</TabsTrigger>
              </TabsList>

              <TabsContent value="shipments" className="mt-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">logistics_shipments Table</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Track and manage all your shipments with detailed information.
                  </p>
                  <div className="text-sm space-y-1">
                    <div>• Shipment tracking and status updates</div>
                    <div>• Client information and communication</div>
                    <div>• Pickup and delivery management</div>
                    <div>• Cost and pricing tracking</div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="fleet" className="mt-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">logistics_fleet Table</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Manage your vehicles, drivers, and fleet operations.
                  </p>
                  <div className="text-sm space-y-1">
                    <div>• Vehicle registration and specifications</div>
                    <div>• Driver assignments and contact info</div>
                    <div>• Real-time location tracking</div>
                    <div>• Maintenance scheduling</div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="coverage" className="mt-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">logistics_coverage Table</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Define your service areas and delivery zones.
                  </p>
                  <div className="text-sm space-y-1">
                    <div>• Service area definitions</div>
                    <div>• Zone-based pricing</div>
                    <div>• Delivery time estimates</div>
                    <div>• Coverage area mapping</div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="rates" className="mt-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">logistics_rates Table</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Manage dynamic pricing and rate calculations.
                  </p>
                  <div className="text-sm space-y-1">
                    <div>• Distance-based pricing</div>
                    <div>• Weight and volume rates</div>
                    <div>• Special handling charges</div>
                    <div>• Time-sensitive delivery premiums</div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="mt-6 p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Ready to expand?</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Contact your development team to add these tables to your database schema.
              </p>
              <Button className="w-full">
                <ExternalLink className="w-4 h-4 mr-2" />
                Get Database Migration Scripts
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LogisticsProviderDashboard;
