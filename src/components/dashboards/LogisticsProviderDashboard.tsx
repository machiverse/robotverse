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
  Search
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

  // Check if user has logistics provider access
  const userType = userProfile?.user_type;
  const hasLogisticsAccess = userType === 'logistics_provider' || userType === 'logistics';

  const fetchShipments = useCallback(async () => {
    if (!user || !hasLogisticsAccess) return [];

    try {
      const { data, error } = await supabase
        .from('logistics_shipments')
        .select('*')
        .eq('provider_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === 'PGRST116') {
          // Table doesn't exist, return empty array
          console.log('Logistics shipments table not found');
          return [];
        }
        throw error;
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
      const { data, error } = await supabase
        .from('logistics_fleet')
        .select('*')
        .eq('provider_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('Logistics fleet table not found');
          return [];
        }
        throw error;
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
      const { data, error } = await supabase
        .from('logistics_coverage')
        .select('*')
        .eq('provider_id', user.id)
        .eq('is_active', true)
        .order('zone_type');

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('Logistics coverage table not found');
          return [];
        }
        throw error;
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

      setShipments(shipmentsData);
      setFleet(fleetData);
      setCoverageAreas(coverageData);

      const stats = calculateStats(shipmentsData, fleetData);
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
      <div className="space-y-6">
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription className="text-red-700">
            <strong>Access Restricted:</strong> This dashboard is only available for logistics providers.
            <br />
            Current user type: {userType || 'Not set'}
          </AlertDescription>
        </Alert>
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
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <div>
            <p className="text-lg font-medium">Loading Logistics Dashboard</p>
            <p className="text-sm text-muted-foreground">Fetching shipments and fleet data...</p>
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
            <strong>✅ Logistics Provider Access Confirmed</strong> - Managing operations for {userProfile?.full_name || user?.email}
          </AlertDescription>
        </Alert>

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

        {/* Main Content Tabs */}
        <Tabs defaultValue="shipments" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="shipments" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Shipments ({shipments.length})
            </TabsTrigger>
            <TabsTrigger value="fleet" className="flex items-center gap-2">
              <Truck className="w-4 h-4" />
              Fleet ({fleet.length})
            </TabsTrigger>
            <TabsTrigger value="coverage" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Coverage
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="shipments" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Truck className="w-5 h-5" />
                      Active Shipments Tracking
                    </CardTitle>
                    <CardDescription>Monitor and manage ongoing deliveries</CardDescription>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search shipments..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredShipments.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-2">
                      {shipments.length === 0 ? 'No shipments found' : 'No shipments match your search'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {shipments.length === 0 
                        ? 'Start by creating your first shipment'
                        : 'Try adjusting your search criteria'
                      }
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Shipment ID</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Route</TableHead>
                        <TableHead>Cargo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Delivery Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredShipments.map((shipment) => (
                        <TableRow key={shipment.id}>
                          <TableCell className="font-medium">
                            <div>
                              <p>{shipment.shipment_id}</p>
                              <p className="text-xs text-muted-foreground">
                                {shipment.tracking_number}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{shipment.client_name}</p>
                              {shipment.client_email && (
                                <p className="text-xs text-muted-foreground">{shipment.client_email}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3 h-3" />
                              <span className="text-sm">
                                {shipment.pickup_location} → {shipment.delivery_location}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{shipment.cargo_type}</p>
                              <p className="text-sm text-muted-foreground">{shipment.weight} kg</p>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(shipment.status)}</TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm">{new Date(shipment.estimated_delivery).toLocaleDateString()}</p>
                              {shipment.actual_delivery && (
                                <p className="text-xs text-muted-foreground">
                                  Delivered: {new Date(shipment.actual_delivery).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            ₹{shipment.cost.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
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
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fleet" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="w-5 h-5" />
                  Fleet Management
                </CardTitle>
                <CardDescription>Monitor vehicles and driver assignments</CardDescription>
              </CardHeader>
              <CardContent>
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
                            {vehicle.driver_phone && (
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-muted-foreground" />
                                <span>{vehicle.driver_phone}</span>
                              </div>
                            )}
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
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="coverage" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Coverage Area Management
                </CardTitle>
                <CardDescription>Manage service areas and pricing zones</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold">Service Coverage Areas</h3>
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
                      <div className="space-y-2">
                        {coverageAreas.map((area) => (
                          <div key={area.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium">{area.area_name}</p>
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
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold">Rate Calculator</h3>
                    <div className="space-y-3">
                      <Input placeholder="Pickup location" />
                      <Input placeholder="Delivery location" />
                      <Input placeholder="Weight (kg)" type="number" />
                      <Button className="w-full">Calculate Rate</Button>
                    </div>
                  </div>
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
      </div>
    </div>
  );
};

export default LogisticsProviderDashboard;
