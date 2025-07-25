import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bot, MapPin, DollarSign, Search, Filter, Grid, List } from "lucide-react";
import EnhancedHeader from "@/components/EnhancedHeader";

const Robots = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const categories = [
    { value: "all", label: "All Categories" },
    { value: "industrial", label: "Industrial Robots" },
    { value: "articulated", label: "Articulated Robots" },
    { value: "scara", label: "SCARA Robots" },
    { value: "delta", label: "Delta Robots" },
    { value: "collaborative", label: "Collaborative Robots" },
  ];

  const locations = [
    { value: "all", label: "All Locations" },
    { value: "mumbai", label: "Mumbai" },
    { value: "delhi", label: "Delhi" },
    { value: "bangalore", label: "Bangalore" },
    { value: "chennai", label: "Chennai" },
    { value: "pune", label: "Pune" },
  ];

  // Sample robot data
  const robots = [
    {
      id: 1,
      name: "ABB IRB 2600",
      type: "Industrial Robot",
      price: 2500000,
      location: "Mumbai",
      image: "/placeholder.svg",
      specifications: "6-axis, 20kg payload",
      availability: "In Stock"
    },
    {
      id: 2,
      name: "KUKA KR 10",
      type: "Articulated Robot",
      price: 1800000,
      location: "Bangalore",
      image: "/placeholder.svg",
      specifications: "6-axis, 10kg payload",
      availability: "Available"
    },
    {
      id: 3,
      name: "Universal Robots UR5e",
      type: "Collaborative Robot",
      price: 1200000,
      location: "Chennai",
      image: "/placeholder.svg",
      specifications: "6-axis, 5kg payload",
      availability: "Pre-order"
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <EnhancedHeader />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Industrial Robots</h1>
          <p className="text-xl text-muted-foreground">
            Discover and purchase cutting-edge industrial robots for your automation needs
          </p>
        </div>

        {/* Filters */}
        <div className="bg-card border border-border rounded-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search robots..."
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
          {robots.map((robot) => (
            <Card key={robot.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center mb-4">
                  <Bot className="w-12 h-12 text-muted-foreground" />
                </div>
                <CardTitle className="text-lg">{robot.name}</CardTitle>
                <Badge variant="secondary" className="w-fit">
                  {robot.type}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-primary">
                      ₹{robot.price.toLocaleString()}
                    </span>
                    <Badge variant={robot.availability === "In Stock" ? "default" : "secondary"}>
                      {robot.availability}
                    </Badge>
                  </div>
                  <div className="flex items-center text-muted-foreground">
                    <MapPin className="w-4 h-4 mr-1" />
                    <span className="text-sm">{robot.location}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{robot.specifications}</p>
                  <div className="flex space-x-2 pt-2">
                    <Button size="sm" className="flex-1">
                      View Details
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
            Load More Robots
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Robots;