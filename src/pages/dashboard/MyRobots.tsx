import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bot, Plus, Edit, Eye, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const MyRobots = () => {
  const robots = [
    {
      id: 1,
      name: "Industrial Welding Robot",
      model: "WR-2000X",
      price: "$45,000",
      status: "active",
      views: 156,
      inquiries: 12,
      image: "/lovable-uploads/3125a7b8-84d8-4a1a-82bf-0e0b04587669.png"
    },
    {
      id: 2,
      name: "Precision Assembly Robot",
      model: "PA-1500",
      price: "$32,000",
      status: "pending",
      views: 89,
      inquiries: 7,
      image: "/lovable-uploads/6dce9e75-c21d-4fdb-b0b5-4aaca330d043.png"
    },
    {
      id: 3,
      name: "Automated Packaging Robot",
      model: "APR-3000",
      price: "$28,500",
      status: "sold",
      views: 245,
      inquiries: 23,
      image: "/lovable-uploads/3125a7b8-84d8-4a1a-82bf-0e0b04587669.png"
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'sold': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Robots</h1>
          <p className="text-muted-foreground">
            Manage your robot listings and track performance
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add New Robot
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Listings
            </CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">
              +2 from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Listings
            </CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">
              Currently available
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Views
            </CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,247</div>
            <p className="text-xs text-muted-foreground">
              +15% from last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Inquiries
            </CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">42</div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Robot Listings */}
      <Card>
        <CardHeader>
          <CardTitle>Robot Listings</CardTitle>
          <CardDescription>
            Your current robot inventory and their performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {robots.map((robot) => (
              <div key={robot.id} className="flex items-center gap-4 p-4 border rounded-lg">
                <div className="w-16 bg-muted rounded-lg flex items-center justify-center">
                  <img 
                    src={robot.image} 
                    alt={robot.name}
                    className="w-full object-contain rounded-lg max-h-16"
                    style={{ height: "auto" }}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{robot.name}</h4>
                      <p className="text-sm text-muted-foreground">Model: {robot.model}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-sm font-medium">{robot.price}</span>
                        <Badge className={getStatusColor(robot.status)}>
                          {robot.status.charAt(0).toUpperCase() + robot.status.slice(1)}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right text-sm">
                        <div className="font-medium">{robot.views} views</div>
                        <div className="text-muted-foreground">{robot.inquiries} inquiries</div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Listing
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            Remove Listing
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MyRobots;