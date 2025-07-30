import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Settings, MapPin, Search, Grid, List, Star, Clock, Users } from "lucide-react";
import EnhancedHeader from "@/components/EnhancedHeader";

const SERVICE_TYPE_OPTIONS = [
  "Installation",
  "Maintenance",
  "Repair",
  "Inspection",
  "Calibration",
  "Training",
  "Upgrades",
  "Consulting",
];

const Services = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [services, setServices] = useState<any[]>([]);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch locations on mount
  useEffect(() => {
    async function fetchLocations() {
      try {
        const { data, error } = await supabase
          .from("states")
          .select("id, name")
          .order("name");
        if (error) throw error;
        setLocations([{ id: "all", name: "All Locations" }, ...(data ?? [])]);
      } catch (err: any) {
        console.error("Error fetching locations", err);
        setError("Failed to load locations");
      }
    }
    fetchLocations();
  }, []);

  // Fetch services data
  useEffect(() => {
    async function fetchServices() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("services")
          .select(`
            *,
            profiles!services_provider_id_fkey (full_name, company_name, location)
          `)
          .order("created_at", { ascending: false });

        if (error) throw error;

        // Transform services, parsing CSV service_type and normalize location
        const transformed = (data ?? []).map((item: any) => {
          const serviceTypes = item.service_type
            ? item.service_type.split(",").map((t: string) => t.trim().toLowerCase())
            : [];

          const locationName =
            item.location || item.profiles?.location || "Location not specified";

          const locationNormalized = locationName.toLowerCase();

          return {
            id: item.id,
            name: item.name,
            serviceTypes,              // array of lowercased service types for filtering
            priceRange: item.price_range || "Contact for pricing",
            location: locationName,    // original location for display
            locationNormalized,        // normalized location for filtering
            provider: item.profiles?.company_name || item.profiles?.full_name || "Service Provider",
            image: "/placeholder.svg",
            description: item.description || "Professional service provider",
            rating: 4.5, // default
            responseTime: "2-4 hours", // default
            completedJobs: Math.floor(Math.random() * 100) + 50, // dummy data
            availability: "Available",
          };
        });

        setServices(transformed);
        setError(null);
      } catch (err: any) {
        setError(err.message || "Failed to load services");
        setServices([]);
      } finally {
        setLoading(false);
      }
    }
    fetchServices();
  }, []);

  // Normalize selectedCategory for comparison (already lowercased options)
  const selectedCategoryNormalized = selectedCategory.toLowerCase();

  // Normalize selected location name for comparison
  const selectedLocationNormalized =
    selectedLocation === "all"
      ? ""
      : locations.find((l) => l.id === selectedLocation)?.name.toLowerCase() || "";

  const filteredServices = services.filter((service) => {
    // Search matching
    const matchesSearch =
      service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.provider.toLowerCase().includes(searchQuery.toLowerCase());

    // Category filtering - check if selectedCategory is included in serviceTypes or 'all'
    const matchesCategory =
      selectedCategory === "all" || service.serviceTypes.includes(selectedCategoryNormalized);

    // Location filtering - match normalized locations or 'all'
    const matchesLocation =
      selectedLocation === "all" || service.locationNormalized === selectedLocationNormalized;

    return matchesSearch && matchesCategory && matchesLocation;
  });

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

            {/* Service Type Filter */}
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Service Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Services</SelectItem>
                {SERVICE_TYPE_OPTIONS.map((type) => (
                  <SelectItem key={type} value={type.toLowerCase()}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Location Filter */}
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger>
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
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

          {/* Loading state */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mb-4" />
              <p className="text-muted-foreground">Loading services...</p>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="flex flex-col items-center justify-center py-12">
              <Settings className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Unable to fetch services</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => window.location.reload()} variant="outline">
                Retry
              </Button>
            </div>
          )}

          {/* No results */}
          {!loading && !error && filteredServices.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <Settings className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No services found</h3>
              <p className="text-muted-foreground">
                {searchQuery || selectedCategory !== "all" || selectedLocation !== "all"
                  ? "No services match your filters."
                  : "There are no services available at the moment."}
              </p>
            </div>
          )}

          {/* Services list */}
          {!loading && !error && filteredServices.length > 0 && (
            <>
              <p className="mb-4 text-sm text-muted-foreground">
                {filteredServices.length} service{filteredServices.length > 1 ? "s" : ""} found
              </p>

              <div
                className={
                  viewMode === "grid"
                    ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    : "space-y-4"
                }
              >
                {filteredServices.map((service) => (
                  <Card key={service.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="aspect-video bg-muted rounded-lg flex items-center justify-center mb-4">
                        <Settings className="w-12 h-12 text-muted-foreground" />
                      </div>
                      <CardTitle className="text-lg">{service.name}</CardTitle>
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="w-fit capitalize">
                          {/* Show all service types capitalized */}
                          {service.serviceTypes
                            .map((t: string) => t.charAt(0).toUpperCase() + t.slice(1))
                            .join(", ")}
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
                          <span className="text-lg font-bold text-primary">{service.priceRange}</span>
                          <Badge variant={service.availability === "24/7" ? "default" : "secondary"}>
                            {service.availability}
                          </Badge>
                        </div>
                        <div className="flex items-center text-muted-foreground">
                          <MapPin className="w-5 h-5 mr-1" />
                          <span>{service.location}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{service.description}</p>

                        <div className="text-sm space-y-1">
                          <div className="flex justify-between">
                            <div className="flex items-center space-x-1">
                              <Clock className="w-5 h-5 text-primary" />
                              <span>Response: {service.responseTime}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Users className="w-5 h-5 text-primary" />
                              <span>{service.completedJobs} jobs</span>
                            </div>
                          </div>
                          <p>
                            <span className="font-medium">Provider:</span> {service.provider}
                          </p>
                        </div>

                        <div className="flex space-x-2 mt-4">
                          <Button className="flex-1">Request Quote</Button>
                          <Button variant="outline" className="flex-1">
                            Contact Provider
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {filteredServices.length > 6 && (
                <div className="mt-8 flex justify-center">
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Implement load more / pagination here if needed
                    }}
                  >
                    Load More
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Services;
