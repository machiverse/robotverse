import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Plus, Edit, MoreHorizontal, AlertTriangle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const PartsManagement = () => {
  const parts = [
    {
      id: 1,
      name: "Servo Motor - High Torque",
      sku: "SM-HT-2000",
      price: "$450",
      stock: 25,
      status: "in_stock",
      category: "Motors",
      orders: 8
    },
    {
      id: 2,
      name: "Precision Gripper Assembly",
      sku: "PGA-X100",
      price: "$220",
      stock: 5,
      status: "low_stock",
      category: "End Effectors",
      orders: 12
    },
    {
      id: 3,
      name: "Control Circuit Board",
      sku: "CCB-PRO-500",
      price: "$890",
      stock: 0,
      status: "out_of_stock",
      category: "Electronics",
      orders: 3
    },
    {
      id: 4,
      name: "Industrial Sensor Suite",
      sku: "ISS-2024",
      price: "$320",
      stock: 15,
      status: "in_stock",
      category: "Sensors",
      orders: 6
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_stock': return 'bg-green-100 text-green-700';
      case 'low_stock': return 'bg-yellow-100 text-yellow-700';
      case 'out_of_stock': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === 'low_stock' || status === 'out_of_stock') {
      return <AlertTriangle className="h-4 w-4" />;
    }
    return null;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Spare Parts Management</h1>
          <p className="text-muted-foreground">
            Manage your spare parts inventory and track orders
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add New Part
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Parts
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">147</div>
            <p className="text-xs text-muted-foreground">
              +12 from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              In Stock
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">128</div>
            <p className="text-xs text-muted-foreground">
              87% availability
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Low Stock
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">
              Need restocking
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Orders
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">29</div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Parts Inventory */}
      <Card>
        <CardHeader>
          <CardTitle>Parts Inventory</CardTitle>
          <CardDescription>
            Current spare parts stock and order information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {parts.map((part) => (
              <div key={part.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-start gap-3">
                  <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <h4 className="font-medium">{part.name}</h4>
                    <p className="text-sm text-muted-foreground">SKU: {part.sku}</p>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-sm font-medium">{part.price}</span>
                      <span className="text-sm text-muted-foreground">
                        Category: {part.category}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {part.orders} orders
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-sm font-medium">Stock: {part.stock}</div>
                    <Badge className={`${getStatusColor(part.status)} flex items-center gap-1`}>
                      {getStatusIcon(part.status)}
                      {part.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
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
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Part
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Package className="h-4 w-4 mr-2" />
                        Update Stock
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">
                        Remove Part
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PartsManagement;