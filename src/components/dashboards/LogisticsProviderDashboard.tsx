import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface LogisticsProviderDashboardProps {
  userProfile: any;
}

const LogisticsProviderDashboard = ({ userProfile }: LogisticsProviderDashboardProps) => {
  const { user } = useAuth();
  const [shipments, setShipments] = useState<any[]>([]);
  const [fleet, setFleet] = useState<any[]>([]);
  const [dashboardStats, setDashboardStats] = useState({
    activeShipments: 0,
    totalDeliveries: 0,
    onTimeDeliveryRate: 0,
    monthlyRevenue: 0,
    customerRating: 4.7
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;
    
    try {
      // Mock shipments data (until we create shipments table)
      const mockShipments = [
        {
          id: 'SH001',
          client_name: 'Industrial Corp',
          pickup_location: 'Mumbai',
          delivery_location: 'Delhi',
          status: 'in_transit',
          estimated_delivery: '2024-02-15',
          cargo_type: 'Industrial Robot',
          weight: '500 kg'
        },
        {
          id: 'SH002',
          client_name: 'Tech Solutions',
          pickup_location: 'Bangalore',
          delivery_location: 'Chennai',
          status: 'picked_up',
          estimated_delivery: '2024-02-14',
          cargo_type: 'Spare Parts',
          weight: '50 kg'
        },
        {
          id: 'SH003',
          client_name: 'Auto Industries',
          pickup_location: 'Pune',
          delivery_location: 'Hyderabad',
          status: 'delivered',
          estimated_delivery: '2024-02-10',
          cargo_type: 'Robot Components',
          weight: '200 kg'
        }
      ];

      // Mock fleet data
      const mockFleet = [
        {
          id: 'VH001',
          vehicle_type: 'Heavy Truck',
          license_plate: 'MH-12-AB-1234',
          driver_name: 'Rajesh Kumar',
          status: 'available',
          current_location: 'Mumbai',
          capacity: '10 tons'
        },
        {
          id: 'VH002',
          vehicle_type: 'Medium Truck',
          license_plate: 'DL-8-CD-5678',
          driver_name: 'Amit Singh',
          status: 'in_transit',
          current_location: 'Delhi-Mumbai Highway',
          capacity: '5 tons'
        }
      ];
      
      setShipments(mockShipments);
      setFleet(mockFleet);
      
      setDashboardStats({
        activeShipments: mockShipments.filter(s => s.status !== 'delivered').length,
        totalDeliveries: 156, // Mock data
        onTimeDeliveryRate: 94.5, // Mock data
        monthlyRevenue: 285000, // Mock data
        customerRating: 4.7
      });
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching logistics provider data:', error);
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'secondary' as const, label: 'Pending Pickup' },
      picked_up: { variant: 'default' as const, label: 'Picked Up' },
      in_transit: { variant: 'default' as const, label: 'In Transit' },
      out_for_delivery: { variant: 'default' as const, label: 'Out for Delivery' },
      delivered: { variant: 'outline' as const, label: 'Delivered' },
      delayed: { variant: 'destructive' as const, label: 'Delayed' }
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

  const statsCards = [
    {
      title: 'Active Shipments',
      value: dashboardStats.activeShipments,
      icon: Package,
      trend: 'In progress',
      color: 'text-blue-600'
    },
    {
      title: 'Total Deliveries',
      value: dashboardStats.totalDeliveries,
      icon: CheckCircle,
      trend: 'All time',
      color: 'text-green-600'
    },
    {
      title: 'On-Time Rate',
      value: `${dashboardStats.onTimeDeliveryRate}%`,
      icon: Clock,
      trend: 'This month',
      color: 'text-orange-600'
    },
    {
      title: 'Monthly Revenue',
      value: `₹${dashboardStats.monthlyRevenue.toLocaleString()}`,
      icon: DollarSign,
      trend: 'This month',
      color: 'text-purple-600'
    },
    {
      title: 'Customer Rating',
      value: dashboardStats.customerRating,
      icon: Star,
      trend: 'Average rating',
      color: 'text-yellow-600'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Logistics Provider Dashboard</h1>
          <p className="text-muted-foreground">
            Manage shipments, fleet, and delivery operations
          </p>
        </div>
        <div className="flex gap-2">
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
                    <Badge variant="secondary" className="mt-1 text-xs">
                      {stat.trend}
                    </Badge>
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
      <Tabs defaultValue="shipments" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="shipments">Active Shipments</TabsTrigger>
          <TabsTrigger value="fleet">Fleet Management</TabsTrigger>
          <TabsTrigger value="coverage">Coverage Areas</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="shipments" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="w-5 h-5" />
                Active Shipments Tracking
              </CardTitle>
              <CardDescription>Monitor and manage ongoing deliveries</CardDescription>
            </CardHeader>
            <CardContent>
              {shipments.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No active shipments</p>
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
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shipments.map((shipment) => (
                      <TableRow key={shipment.id}>
                        <TableCell className="font-medium">{shipment.id}</TableCell>
                        <TableCell>{shipment.client_name}</TableCell>
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
                            <p className="text-sm text-muted-foreground">{shipment.weight}</p>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(shipment.status)}</TableCell>
                        <TableCell>{shipment.estimated_delivery}</TableCell>
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
                          <span>Capacity: {vehicle.capacity}</span>
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
                  <h3 className="font-semibold">Service Coverage</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Mumbai Metropolitan</p>
                        <p className="text-sm text-muted-foreground">Local delivery within 24 hours</p>
                      </div>
                      <Badge variant="outline">Zone A</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Maharashtra State</p>
                        <p className="text-sm text-muted-foreground">Interstate delivery 2-3 days</p>
                      </div>
                      <Badge variant="outline">Zone B</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Western India</p>
                        <p className="text-sm text-muted-foreground">Regional delivery 3-5 days</p>
                      </div>
                      <Badge variant="outline">Zone C</Badge>
                    </div>
                  </div>
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
                  <Badge>94.5%</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Average Delivery Time</p>
                    <p className="text-sm text-muted-foreground">From pickup to delivery</p>
                  </div>
                  <Badge variant="outline">2.3 days</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Customer Satisfaction</p>
                    <p className="text-sm text-muted-foreground">Average client rating</p>
                  </div>
                  <Badge variant="secondary">4.7/5.0</Badge>
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
                    <p className="text-sm text-muted-foreground">February 2024</p>
                  </div>
                  <Badge>₹2,85,000</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Average Order Value</p>
                    <p className="text-sm text-muted-foreground">Per shipment</p>
                  </div>
                  <Badge variant="outline">₹4,850</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Growth Rate</p>
                    <p className="text-sm text-muted-foreground">Month over month</p>
                  </div>
                  <Badge variant="secondary">+12.5%</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LogisticsProviderDashboard;