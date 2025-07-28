import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  ExternalLink
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface LogisticsProviderDashboardProps {
  userProfile: any;
}

interface Shipment {
  id: string;
  shipment_id: string;
  client_name: string;
  client_email?: string;
  pickup_location: string;
  delivery_location: string;
  status: 'pending' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'delayed';
  estimated_delivery: string;
  actual_delivery?: string;
  cargo_type: string;
  weight: number;
  dimensions?: string;
  special_instructions?: string;
  tracking_number: string;
  cost: number;
  created_at: string;
  updated_at: string;
  provider_id: string;
}

interface FleetVehicle {
  id: string;
  vehicle_type: string;
  license_plate: string;
  driver_name: string;
  driver_phone?: string;
  driver_license?: string;
  status: 'available' | 'in_transit' | 'maintenance' | 'offline';
  current_location: string;
  capacity_weight: number;
  capacity_volume?: number;
  fuel_type: string;
  insurance_expiry?: string;
  last_maintenance?: string;
  provider_id: string;
  created_at: string;
}

interface CoverageArea {
  id: string;
  area_name: string;
  zone_type: string;
  delivery_time: string;
  base_rate: number;
  per_kg_rate: number;
  is_active: boolean;
  provider_id: string;
}

const LogisticsProviderDashboard = ({ userProfile }: LogisticsProviderDashboardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [fleet, setFleet] = useState<FleetVehicle[]>([]);
  const [coverageAreas, setCoverageAreas] = useState<CoverageArea[]>([]);
  const [dashboardStats, setDashboardStats] = useState({
    activeShipments: 0,
    totalDeliveries: 0,
    onTimeDeliveryRate: 0,
    monthlyRevenue: 0,
    customerRating: 4.7,
    availableVehicles: 0,
    totalFleetSize: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [tablesExist, setTablesExist] = useState({
    shipments: false,
    fleet: false,
    coverage: false
  });

  // Check if user has logistics provider access
  const userType = userProfile?.user_type;
  const hasLogisticsAccess = userType === 'logistics_provider' || userType === 'logistics';

  // Check if tables exist and fetch data accordingly
  const checkTableExists = async (tableName: string): Promise<boolean> => {
    try {
      const { error } = await supabase.from(tableName).select('id').limit(1);
      return !error;
    } catch (error) {
      return false;
    }
  };

  const fetchShipments = useCallback(async () => {
    if (!user || !hasLogisticsAccess) return [];

    try {
      // First check if table exists
      const tableExists = await checkTableExists('logistics_shipments');
      setTablesExist(prev => ({ ...prev, shipments: tableExists }));
      
      if (!tableExists) {
        return [];
      }

      // Use raw query to avoid TypeScript issues
      const { data, error } = await supabase.rpc('get_logistics_data', {
        table_name: 'logistics_shipments',
        provider_id: user.id
      });

      if (error) {
        console.log('Logistics shipments table query failed:', error.message);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching shipments:', error);
      return [];
    }
  }, [user, hasLogisticsAccess]);

  const fetchFleet = useCallback(async () => {
    if (!user || !hasLogisticsAccess) return [];

    try {
      const tableExists = await checkTableExists('logistics_fleet');
      setTablesExist(prev => ({ ...prev, fleet: tableExists }));
      
      if (!tableExists) {
        return [];
      }

      // Use raw query to avoid TypeScript issues
      const { data, error } = await supabase.rpc('get_logistics_data', {
        table_name: 'logistics_fleet',
        provider_id: user.id
      });

      if (error) {
        console.log('Logistics fleet table query failed:', error.message);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching fleet:', error);
      return [];
    }
  }, [user, hasLogisticsAccess]);

  const fetchCoverageAreas = useCallback(async () => {
    if (!user || !hasLogisticsAccess) return [];

    try {
      const tableExists = await checkTableExists('logistics_coverage');
      setTablesExist(prev => ({ ...prev, coverage: tableExists }));
      
      if (!tableExists) {
        return [];
      }

      // Use raw query to avoid TypeScript issues
      const { data, error } = await supabase.rpc('get_logistics_data', {
        table_name: 'logistics_coverage',
        provider_id: user.id
      });

      if (error) {
        console.log('Logistics coverage table query failed:', error.message);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching coverage areas:', error);
      return [];
    }
  }, [user, hasLogisticsAccess]);

  const calculateStats = (shipmentsData: Shipment[], fleetData: FleetVehicle[]) => {
    const activeShipments = shipmentsData.filter(s => 
      !['delivered', 'cancelled'].includes(s.status)
    ).length;

    const deliveredShipments = shipmentsData.filter(s => s.status === 'delivered');
    const totalDeliveries = deliveredShipments.length;

    // Calculate on-time delivery rate
    const onTimeDeliveries = deliveredShipments.filter(s => {
      if (!s.actual_delivery) return false;
      return new Date(s.actual_delivery) <= new Date(s.estimated_delivery);
    });
    const onTimeDeliveryRate = totalDeliveries > 0 ? 
      (onTimeDeliveries.length / totalDeliveries) * 100 : 0;

    // Calculate monthly revenue (current month)
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyRevenue = shipmentsData
      .filter(s => {
        const shipmentDate = new Date(s.created_at);
        return shipmentDate.getMonth() === currentMonth && 
               shipmentDate.getFullYear() === currentYear &&
               s.status === 'delivered';
      })
      .reduce((sum, s) => sum + (s.cost || 0), 0);

    const availableVehicles = fleetData.filter(v => v.status === 'available').length;
    const totalFleetSize = fleetData.length;

    return {
      activeShipments,
      totalDeliveries,
      onTimeDeliveryRate: Math.round(onTimeDeliveryRate * 10) / 10,
      monthlyRevenue,
      customerRating: 4.7, // This would come from a reviews system
      availableVehicles,
      totalFleetSize
    };
  };

  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    if (!user || !hasLogisticsAccess) {
      setLoading(false);
      return;
    }
    
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const [shipmentsData, fleetData, coverageData] = await Promise.all([
        fetchShipments(),
        fetchFleet(),
        fetchCoverageAreas()
      ]);

      setShipments(shipmentsData as Shipment[]);
      setFleet(fleetData as FleetVehicle[]);
      setCoverageAreas(coverageData as CoverageArea[]);

      const stats = calculateStats(shipmentsData as Shipment[], fleetData as FleetVehicle[]);
      setDashboardStats(stats);

      if (isRefresh) {
        toast({
          title: "Data Refreshed",
          description: "Dashboard data has been updated successfully.",
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
  }, [user, hasLogisticsAccess, fetchShipments, fetchFleet, fetchCoverageAreas, toast]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Access control
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
                User Type: {userType || 'Not set'}<br />
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

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'secondary' as const, label: 'Pending Pickup', color: 'bg-gray-100' },
      picked_up: { variant: 'default' as const, label: 'Picked Up', color: 'bg-blue-100' },
      in_transit: { variant: 'default' as const, label: 'In Transit', color: 'bg-blue-100' },
      out_for_delivery: { variant: 'default' as const, label: 'Out for Delivery', color: 'bg-orange-100' },
      delivered: { variant: 'outline' as const, label: 'Delivered', color: 'bg-green-100' },
      delayed: { variant: 'destructive' as const, label: 'Delayed', color: 'bg-red-100' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getVehicleStatusBadge = (status: string) => {
    const statusConfig = {
      available: { color: 'bg-green-100 text-green-800', label: 'Available' },
      in_transit: { color: 'bg-blue-100 text-blue-800', label: 'In Transit' },
      maintenance: { color: 'bg-yellow-100 text-yellow-800', label: 'Maintenance' },
      offline: { color: 'bg-gray-100 text-gray-800', label: 'Offline' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.available;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  // Filter shipments based on search
  const filteredShipments = shipments.filter(shipment =>
    shipment.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    shipment.shipment_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    shipment.tracking_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    shipment.pickup_location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    shipment.delivery_location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const statsCards = [
    {
      title: 'Active Shipments',
      value: dashboardStats.activeShipments,
      icon: Package,
      trend: 'In progress',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Total Deliveries',
      value: dashboardStats.totalDeliveries,
      icon: CheckCircle,
      trend: 'All time',
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'On-Time Rate',
      value: `${dashboardStats.onTimeDeliveryRate}%`,
      icon: Clock,
      trend: 'This month',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
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
      title: 'Available Vehicles',
      value: `${dashboardStats.availableVehicles}/${dashboardStats.totalFleetSize}`,
      icon: Truck,
      trend: 'Fleet status',
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
            <p className="text-sm text-muted-foreground">Checking database setup...</p>
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
          <CheckCircle className="w-4 w-4" />
          <AlertDescription className="text-green-700">
            <strong>✅ Logistics Provider Access Confirmed</strong> - Welcome, {userProfile?.full_name || user?.email}
          </AlertDescription>
        </Alert>

        {/* Database Setup Status */}
        {(!tablesExist.shipments || !tablesExist.fleet || !tablesExist.coverage) && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <Database className="w-4 h-4" />
            <AlertDescription className="text-yellow-800">
              <strong>⚠️ Database Setup Required:</strong>
              <div className="mt-2 space-y-1">
                {!tablesExist.shipments && <div>• Shipments table missing</div>}
                {!tablesExist.fleet && <div>• Fleet table missing</div>}
                {!tablesExist.coverage && <div>• Coverage areas table missing</div>}
              </div>
              <Button 
                variant="link" 
                className="p-0 mt-2 text-yellow-800 underline" 
                onClick={() => window.open('/docs/database-setup', '_blank')}
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                View Setup Instructions
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Logistics Provider Dashboard
            </h1>
            <p className="text-muted-foreground">
              Manage shipments, fleet, and delivery operations efficiently
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
              <Plus className="w-4 h-4" />
              Add Vehicle
            </Button>
            <Button className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              New Shipment
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Logistics Management
            </CardTitle>
            <CardDescription>
              {tablesExist.shipments || tablesExist.fleet || tablesExist.coverage 
                ? "Manage your logistics operations"
                : "Complete database setup to start managing logistics operations"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!tablesExist.shipments && !tablesExist.fleet && !tablesExist.coverage ? (
              <div className="text-center py-12">
                <Database className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Database Setup Required</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  To start using the logistics provider dashboard, you need to set up the required database tables.
                </p>
                <div className="space-y-2">
                  <Button className="w-full max-w-xs">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Setup Database Tables
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    This will create the necessary tables for shipments, fleet, and coverage areas.
                  </p>
                </div>
              </div>
            ) : (
              <Tabs defaultValue="shipments" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="shipments" disabled={!tablesExist.shipments}>
                    Shipments ({shipments.length})
                  </TabsTrigger>
                  <TabsTrigger value="fleet" disabled={!tablesExist.fleet}>
                    Fleet ({fleet.length})
                  </TabsTrigger>
                  <TabsTrigger value="coverage" disabled={!tablesExist.coverage}>
                    Coverage
                  </TabsTrigger>
                  <TabsTrigger value="analytics">
                    Analytics
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="shipments" className="mt-6">
                  <div className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search shipments..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    
                    {filteredShipments.length === 0 ? (
                      <div className="text-center py-8">
                        <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground mb-2">
                          {shipments.length === 0 ? 'No shipments found' : 'No shipments match your search'}
                        </p>
                        <Button>
                          <Plus className="w-4 h-4 mr-2" />
                          Create First Shipment
                        </Button>
                      </div>
                    ) : (
                      <div className="border rounded-lg">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Shipment ID</TableHead>
                              <TableHead>Client</TableHead>
                              <TableHead>Route</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredShipments.map((shipment) => (
                              <TableRow key={shipment.id}>
                                <TableCell className="font-medium">{shipment.shipment_id}</TableCell>
                                <TableCell>{shipment.client_name}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1 text-sm">
                                    <MapPin className="w-3 h-3" />
                                    {shipment.pickup_location} → {shipment.delivery_location}
                                  </div>
                                </TableCell>
                                <TableCell>{getStatusBadge(shipment.status)}</TableCell>
                                <TableCell>₹{shipment.cost.toLocaleString()}</TableCell>
                                <TableCell>
                                  <div className="flex gap-2">
                                    <Button size="sm" variant="outline">
                                      <Eye className="w-3 h-3" />
                                    </Button>
                                    <Button size="sm" variant="outline">
                                      <Edit className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="fleet" className="mt-6">
                  {fleet.length === 0 ? (
                    <div className="text-center py-8">
                      <Truck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">No vehicles in your fleet</p>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Add First Vehicle
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {fleet.map((vehicle) => (
                        <Card key={vehicle.id} className="hover:shadow-lg transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h3 className="font-semibold">{vehicle.vehicle_type}</h3>
                                <p className="text-sm text-muted-foreground">{vehicle.license_plate}</p>
                              </div>
                              {getVehicleStatusBadge(vehicle.status)}
                            </div>
                            
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-muted-foreground" />
                                <span>{vehicle.driver_name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-muted-foreground" />
                                <span>{vehicle.current_location}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Package className="w-4 h-4 text-muted-foreground" />
                                <span>Capacity: {vehicle.capacity_weight} kg</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 mt-4">
                              <Button size="sm" variant="outline" className="flex-1">
                                <Navigation className="w-3 h-3 mr-1" />
                                Track
                              </Button>
                              <Button size="sm" variant="outline" className="flex-1">
                                <Edit className="w-3 h-3 mr-1" />
                                Edit
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="coverage" className="mt-6">
                  {coverageAreas.length === 0 ? (
                    <div className="text-center py-8">
                      <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">No coverage areas defined</p>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Coverage Area
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {coverageAreas.map((area) => (
                        <div key={area.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <h3 className="font-semibold">{area.area_name}</h3>
                            <p className="text-sm text-muted-foreground">
                              Delivery within {area.delivery_time}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Base: ₹{area.base_rate} + ₹{area.per_kg_rate}/kg
                            </p>
                          </div>
                          <Badge variant="outline">{area.zone_type}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="analytics" className="mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Performance Metrics</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">On-Time Delivery Rate</p>
                            <p className="text-sm text-muted-foreground">Deliveries within promised time</p>
                          </div>
                          <Badge>{dashboardStats.onTimeDeliveryRate}%</Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">Active Shipments</p>
                            <p className="text-sm text-muted-foreground">Currently in progress</p>
                          </div>
                          <Badge variant="outline">{dashboardStats.activeShipments}</Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">Fleet Utilization</p>
                            <p className="text-sm text-muted-foreground">Vehicles in use</p>
                          </div>
                          <Badge variant="secondary">
                            {dashboardStats.totalFleetSize > 0 
                              ? Math.round(((dashboardStats.totalFleetSize - dashboardStats.availableVehicles) / dashboardStats.totalFleetSize) * 100)
                              : 0
                            }%
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Revenue Analytics</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">Monthly Revenue</p>
                            <p className="text-sm text-muted-foreground">Current month</p>
                          </div>
                          <Badge>₹{dashboardStats.monthlyRevenue.toLocaleString()}</Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">Average Shipment Value</p>
                            <p className="text-sm text-muted-foreground">Per delivery</p>
                          </div>
                          <Badge variant="outline">
                            ₹{shipments.length > 0 
                              ? Math.round(shipments.reduce((sum, s) => sum + s.cost, 0) / shipments.length).toLocaleString()
                              : '0'
                            }
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">Total Deliveries</p>
                            <p className="text-sm text-muted-foreground">All time</p>
                          </div>
                          <Badge variant="secondary">{dashboardStats.totalDeliveries}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LogisticsProviderDashboard;
