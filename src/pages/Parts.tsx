import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, MapPin, Search, Grid, List, Star } from "lucide-react";
import EnhancedHeader from "@/components/EnhancedHeader";

const Parts = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const categories = [
    { value: "all", label: "All Parts" },
    { value: "motors", label: "Motors & Drives" },
    { value: "sensors", label: "Sensors" },
    { value: "controllers", label: "Controllers" },
    { value: "actuators", label: "Actuators" },
    { value: "cables", label: "Cables & Connectors" },
  ];

  const locations = [
    { value: "all", label: "All Locations" },
    { value: "mumbai", label: "Mumbai" },
    { value: "delhi", label: "Delhi" },
    { value: "bangalore", label: "Bangalore" },
    { value: "chennai", label: "Chennai" },
    { value: "pune", label: "Pune" },
  ];

  // Sample parts data
  const parts = [
    {
      id: 1,
      name: "ABB Servo Motor",
      category: "Motors & Drives",
      price: 45000,
      location: "Mumbai",
      image: "/placeholder.svg",
      partNumber: "3HAC057346-001",
      compatibility: "ABB IRB series",
      rating: 4.8,
      availability: "In Stock",
      quantity: 15
    },
    {
      id: 2,
      name: "KUKA Controller Board",
      category: "Controllers",
      price: 125000,
      location: "Bangalore",
      image: "/placeholder.svg",
      partNumber: "00-168-334",
      compatibility: "KUKA KR series",
      rating: 4.9,
      availability: "Available",
      quantity: 3
    },
    {
      id: 3,
      name: "Universal Robots Sensor Kit",
      category: "Sensors",
      price: 35000,
      location: "Chennai",
      image: "/placeholder.svg",
      partNumber: "UR-SENSOR-01",
      compatibility: "UR series",
      rating: 4.7,
      availability: "Limited Stock",
      quantity: 8
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <EnhancedHeader />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Robot Spare Parts</h1>
          <p className="text-xl text-muted-foreground">
            Find genuine spare parts and components for all major robot brands
          </p>
        </div>

        {/* Filters */}
        <div className="bg-card border border-border rounded-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search parts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger>
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((location) => (
                  <SelectItem key={location.value} value={location.value}>
                    {location.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex space-x-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
          {parts.map((part) => (
            <Card key={part.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center mb-4">
                  <Package className="w-12 h-12 text-muted-foreground" />
                </div>
                <CardTitle className="text-lg">{part.name}</CardTitle>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="w-fit">
                    {part.category}
                  </Badge>
                  <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm text-muted-foreground">{part.rating}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-primary">
                      ₹{part.price.toLocaleString()}
                    </span>
                    <Badge variant={part.availability === "In Stock" ? "default" : "secondary"}>
                      {part.availability}
                    </Badge>
                  </div>
                  <div className="flex items-center text-muted-foreground">
                    <MapPin className="w-4 h-4 mr-1" />
                    <span className="text-sm">{part.location}</span>
                  </div>
                  <div className="text-sm space-y-1">
                    <p><span className="font-medium">Part #:</span> {part.partNumber}</p>
                    <p><span className="font-medium">Compatible:</span> {part.compatibility}</p>
                    <p><span className="font-medium">Quantity:</span> {part.quantity} available</p>
                  </div>
                  <div className="flex space-x-2 pt-2">
                    <Button size="sm" className="flex-1">
                      Add to Cart
                    </Button>
                    <Button variant="outline" size="sm">
                      Contact Seller
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Load More */}
        <div className="text-center mt-8">
          <Button variant="outline" size="lg">
            Load More Parts
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Parts;