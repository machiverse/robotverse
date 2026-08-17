import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Truck, Plus, MapPin, MoreHorizontal, Package, Clock } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const Logistics = () => {
  const { user } = useAuth();
  const [shipments, setShipments] = useState([]);
  const [services, setServices] = useState([]);
  const [stats, setStats] = useState({
    activeShipments: 0,
    deliveredThisMonth: 0,
    onTimeDelivery: 0,
    totalRevenue: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchLogisticsData();
    }
  }, [user]);

  const fetchLogisticsData = async () => {
    if (!user) return;

    try {
      // Fetch logistics services
      const { data: servicesData, error: servicesError } = await supabase
        .from('logistics_services')
        .select('*')
        .eq('provider_id', user.id);

      if (servicesError) {
        console.error('Error fetching services:', servicesError);
      } else {
        setServices(servicesData || []);
      }

      // Fetch shipments
      const { data: shipmentsData, error: shipmentsError } = await supabase
        .from('logistics_shipments')
        .select('*')
        .eq('provider_id', user.id);

      if (shipmentsError) {
        console.error('Error fetching shipments:', shipmentsError);
      } else {
        setShipments(shipmentsData || []);
        
        // Calculate stats
        const activeShipments = shipmentsData?.filter(s => 
          s.status === 'pending' || s.status === 'in_transit'
        ).length || 0;
        
        const currentMonth = new Date().getMonth();
        const deliveredThisMonth = shipmentsData?.filter(s => 
          s.status === 'delivered' && 
          new Date(s.actual_delivery || s.created_at).getMonth() === currentMonth
        ).length || 0;
        
        const deliveredOnTime = shipmentsData?.filter(s => 
          s.status === 'delivered' && 
          s.actual_delivery && 
          new Date(s.actual_delivery) <= new Date(s.estimated_delivery)
        ).length || 0;
        
        const totalDelivered = shipmentsData?.filter(s => s.status === 'delivered').length || 0;
        const onTimePercentage = totalDelivered > 0 ? (deliveredOnTime / totalDelivered) * 100 : 0;
        
        const totalRevenue = shipmentsData?.reduce((sum, s) => sum + (parseFloat(s.cost?.toString() || '0') || 0), 0) || 0;

        setStats({
          activeShipments,
          deliveredThisMonth,
          onTimeDelivery: Math.round(onTimePercentage),
          totalRevenue
        });
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-success/10 text-success';
      case 'in_transit': return 'bg-primary/10 text-primary';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'delayed': return 'bg-red-100 text-red-700';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Logistics Management</h1>
          <p className="text-muted-foreground">
            Manage shipments and logistics services
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Service
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Shipments
            </CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeShipments}</div>
            <p className="text-xs text-muted-foreground">
              Currently in transit
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Delivered This Month
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.deliveredThisMonth}</div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              On-Time Delivery
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.onTimeDelivery}%</div>
            <p className="text-xs text-muted-foreground">
              Delivery performance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Revenue
            </CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              All time
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Current Shipments */}
      <Card>
        <CardHeader>
          <CardTitle>Current Shipments</CardTitle>
          <CardDescription>
            Track ongoing deliveries and shipment status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : shipments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No shipments yet</p>
              <p className="text-sm">Shipments will appear here when you start accepting orders</p>
            </div>
          ) : (
            <div className="space-y-4">
              {shipments.map((shipment) => (
                <div key={shipment.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-start gap-3">
                    <Truck className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <h4 className="font-medium">{shipment.tracking_number}</h4>
                      <p className="text-sm text-muted-foreground">{shipment.client_name}</p>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {shipment.pickup_location} → {shipment.delivery_location}
                        </span>
                        <span className="text-sm font-medium">₹{shipment.cost?.toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Cargo: {shipment.cargo_type} • Weight: {shipment.weight}kg
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">
                        ETA: {new Date(shipment.estimated_delivery).toLocaleDateString()}
                      </div>
                      <Badge className={getStatusColor(shipment.status)}>
                        {shipment.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Badge>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <MapPin className="h-4 w-4 mr-2" />
                          Track Shipment
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          Update Status
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          Contact Customer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Logistics Services */}
      <Card>
        <CardHeader>
          <CardTitle>Your Logistics Services</CardTitle>
          <CardDescription>
            Manage your delivery and logistics offerings
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No logistics services created yet</p>
              <p className="text-sm">Add your first logistics service to get started</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {services.map((service) => (
                <Card key={service.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-base">{service.service_name}</CardTitle>
                    <CardDescription>{service.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Base Price:</span>
                        <span className="font-medium">₹{service.base_price?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Service Type:</span>
                        <span>{service.service_type}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Delivery:</span>
                        <span>{service.delivery_time_hours} hours</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Coverage:</span>
                        <span>{service.coverage_areas?.length || 0} areas</span>
                      </div>
                      <Button variant="outline" size="sm" className="w-full mt-3">
                        Manage Service
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Logistics;