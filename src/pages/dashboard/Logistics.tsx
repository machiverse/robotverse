import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Truck, Plus, MapPin, MoreHorizontal, Package, Clock } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const Logistics = () => {
  const shipments = [
    {
      id: 1,
      trackingId: "RV-2024-001",
      customer: "TechManufacturing Inc.",
      origin: "New York, NY",
      destination: "Chicago, IL",
      status: "in_transit",
      estimatedDelivery: "2024-01-20",
      value: "$45,000"
    },
    {
      id: 2,
      trackingId: "RV-2024-002",
      customer: "AutoParts Solutions",
      origin: "Los Angeles, CA",
      destination: "Phoenix, AZ",
      status: "delivered",
      estimatedDelivery: "2024-01-18",
      value: "$32,000"
    },
    {
      id: 3,
      trackingId: "RV-2024-003",
      customer: "Industrial Robotics Co.",
      origin: "Houston, TX",
      destination: "Dallas, TX",
      status: "pending",
      estimatedDelivery: "2024-01-22",
      value: "$28,500"
    }
  ];

  const services = [
    {
      id: 1,
      name: "Express Robot Delivery",
      description: "Fast delivery for urgent robot shipments",
      price: "$150/shipment",
      coverage: "Nationwide",
      deliveryTime: "24-48 hours"
    },
    {
      id: 2,
      name: "Standard Logistics",
      description: "Regular delivery for standard shipments",
      price: "$75/shipment",
      coverage: "Regional",
      deliveryTime: "3-5 days"
    },
    {
      id: 3,
      name: "White Glove Service",
      description: "Premium handling and installation service",
      price: "$300/shipment",
      coverage: "Major cities",
      deliveryTime: "2-3 days"
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-700';
      case 'in_transit': return 'bg-blue-100 text-blue-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'delayed': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
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
            <div className="text-2xl font-bold">23</div>
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
            <div className="text-2xl font-bold">157</div>
            <p className="text-xs text-muted-foreground">
              +12% from last month
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
            <div className="text-2xl font-bold">94%</div>
            <p className="text-xs text-muted-foreground">
              Above target of 90%
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
            <div className="text-2xl font-bold">$18,420</div>
            <p className="text-xs text-muted-foreground">
              This month
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
          <div className="space-y-4">
            {shipments.map((shipment) => (
              <div key={shipment.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-start gap-3">
                  <Truck className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <h4 className="font-medium">{shipment.trackingId}</h4>
                    <p className="text-sm text-muted-foreground">{shipment.customer}</p>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {shipment.origin} → {shipment.destination}
                      </span>
                      <span className="text-sm font-medium">{shipment.value}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">
                      ETA: {new Date(shipment.estimatedDelivery).toLocaleDateString()}
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
          <div className="grid gap-4 md:grid-cols-3">
            {services.map((service) => (
              <Card key={service.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-base">{service.name}</CardTitle>
                  <CardDescription>{service.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Price:</span>
                      <span className="font-medium">{service.price}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Coverage:</span>
                      <span>{service.coverage}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Delivery:</span>
                      <span>{service.deliveryTime}</span>
                    </div>
                    <Button variant="outline" size="sm" className="w-full mt-3">
                      Manage Service
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Logistics;