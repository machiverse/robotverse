import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, MapPin, Search, Grid, List, Star, Clock, Users } from "lucide-react";
import EnhancedHeader from "@/components/EnhancedHeader";

const Services = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const categories = [
    { value: "all", label: "All Services" },
    { value: "maintenance", label: "Maintenance" },
    { value: "repair", label: "Repair" },
    { value: "installation", label: "Installation" },
    { value: "calibration", label: "Calibration" },
    { value: "training", label: "Training" },
  ];

  const locations = [
    { value: "all", label: "All Locations" },
    { value: "mumbai", label: "Mumbai" },
    { value: "delhi", label: "Delhi" },
    { value: "bangalore", label: "Bangalore" },
    { value: "chennai", label: "Chennai" },
    { value: "pune", label: "Pune" },
  ];

  // Sample services data
  const services = [
    {
      id: 1,
      name: "Robot Maintenance & Calibration",
      category: "Maintenance",
      priceRange: "₹15,000 - ₹50,000",
      location: "Mumbai",
      provider: "TechBot Solutions",
      image: "/placeholder.svg",
      description: "Complete maintenance and calibration services for industrial robots",
      rating: 4.9,
      responseTime: "2-4 hours",
      completedJobs: 150,
      availability: "Available"
    },
    {
      id: 2,
      name: "Emergency Robot Repair",
      category: "Repair",
      priceRange: "₹25,000 - ₹100,000",
      location: "Bangalore",
      provider: "RoboFix Pro",
      image: "/placeholder.svg",
      description: "24/7 emergency repair services for critical robot breakdowns",
      rating: 4.8,
      responseTime: "1-2 hours",
      completedJobs: 200,
      availability: "24/7"
    },
    {
      id: 3,
      name: "Robot Programming Training",
      category: "Training",
      priceRange: "₹20,000 - ₹80,000",
      location: "Chennai",
      provider: "AutoSkill Academy",
      image: "/placeholder.svg",
      description: "Professional training programs for robot programming and operation",
      rating: 4.7,
      responseTime: "1-3 days",
      completedJobs: 85,
      availability: "Scheduled"
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <EnhancedHeader />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Robot Services</h1>
          <p className="text-xl text-muted-foreground">
            Connect with certified professionals for robot maintenance, repair, and training services
          </p>
        </div>

        {/* Filters */}
        <div className="bg-card border border-border rounded-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Service Type" />
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
          {services.map((service) => (
            <Card key={service.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center mb-4">
                  <Settings className="w-12 h-12 text-muted-foreground" />
                </div>
                <CardTitle className="text-lg">{service.name}</CardTitle>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="w-fit">
                    {service.category}
                  </Badge>
                  <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm text-muted-foreground">{service.rating}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-primary">
                      {service.priceRange}
                    </span>
                    <Badge variant={service.availability === "24/7" ? "default" : "secondary"}>
                      {service.availability}
                    </Badge>
                  </div>
                  <div className="flex items-center text-muted-foreground">
                    <MapPin className="w-4 h-4 mr-1" />
                    <span className="text-sm">{service.location}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{service.description}</p>
                  <div className="text-sm space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4 text-primary" />
                        <span>Response: {service.responseTime}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Users className="w-4 h-4 text-primary" />
                        <span>{service.completedJobs} jobs</span>
                      </div>
                    </div>
                    <p><span className="font-medium">Provider:</span> {service.provider}</p>
                  </div>
                  <div className="flex space-x-2 pt-2">
                    <Button size="sm" className="flex-1">
                      Request Quote
                    </Button>
                    <Button variant="outline" size="sm">
                      Contact Provider
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
            Load More Services
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Services;