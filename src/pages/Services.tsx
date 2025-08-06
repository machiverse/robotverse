import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Settings,
  MapPin,
  Search,
  Grid,
  List,
  Star,
  Clock,
  Users,
} from "lucide-react";
import EnhancedHeader from "@/components/EnhancedHeader";
import { useToast } from "@/components/ui/use-toast";

interface Service {
  id: string;
  name: string;
  category: string;
  priceRange: string;
  location: string;
  provider: string;
  image: string;
  description: string;
  rating: number;
  responseTime: string;
  completedJobs: number;
  availability: string;
  providerProfile?: {
    full_name?: string;
    company_name?: string;
    phone?: string;
    mobile_number?: string;
    email?: string;
  };
  providerId?: string;
}

const Services = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

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

  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoading(true);

        const { data, error } = await supabase
          .from("services")
          .select(
            `
            *,
            profiles!services_provider_id_fkey (
              full_name,
              company_name,
              location,
              phone,
              mobile_number,
              email
            )
          `
          )
          .order("created_at", { ascending: false });

        if (error) throw error;

        const transformedData = (data || []).map((item) => ({
          id: item.id,
          name: item.name,
          category: item.service_type,
          priceRange: item.price_range || "Contact for pricing",
          location: item.location || item.profiles?.location || "Location not specified",
          provider: item.profiles?.company_name || item.profiles?.full_name || "Service Provider",
          image: "/placeholder.svg",
          description: item.description || "Professional service provider",
          rating: 4.5,
          responseTime: "2-4 hours",
          completedJobs: Math.floor(Math.random() * 100) + 50,
          availability: "Available",
          providerProfile: item.profiles || {},
          providerId: item.provider_id,
        }));

        setServices(transformedData);
        setError(null);
      } catch (err) {
        console.error("Error fetching services:", err);
        setError(err instanceof Error ? err.message : "Failed to load services");
        setServices([]);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  // Contact provider handler - now shows info toast since direct call removed
  const handleContactProvider = (service: Service) => {
    toast({
      title: "Contact Provider",
      description: "Please use 'Request Quote' button to contact the provider via email.",
    });
  };

  const filteredServices = services.filter((service) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      service.name.toLowerCase().includes(query) ||
      service.description.toLowerCase().includes(query) ||
      service.provider.toLowerCase().includes(query);

    const matchesCategory =
      selectedCategory === "all" ||
      service.category.toLowerCase() === selectedCategory.toLowerCase();

    const matchesLocation =
      selectedLocation === "all" ||
      service.location.toLowerCase() === selectedLocation.toLowerCase();

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
                aria-label="Search services"
              />
            </div>

            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
              aria-label="Select service category"
            >
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

            <Select
              value={selectedLocation}
              onValueChange={setSelectedLocation}
              aria-label="Select location"
            >
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

            <div
              className="flex space-x-2"
              role="group"
              aria-label="View mode toggle"
            >
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
                aria-pressed={viewMode === "grid"}
                aria-label="Grid view"
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
                aria-pressed={viewMode === "list"}
                aria-label="List view"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mb-4" />
            <p className="text-muted-foreground" aria-live="polite">
              Loading services...
            </p>
          </div>
        ) : error ? (
          <div
            className="flex flex-col items-center justify-center py-12"
            role="alert"
          >
            <Settings
              className="w-16 h-16 text-muted-foreground mb-4"
              aria-hidden="true"
            />
            <h3 className="text-lg font-semibold mb-2">
              Unable to load services
            </h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} variant="outline">
              Try Again
            </Button>
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Settings
              className="w-16 h-16 text-muted-foreground mb-4"
              aria-hidden="true"
            />
            <h3 className="text-lg font-semibold mb-2">No services available</h3>
            <p className="text-muted-foreground">
              {searchQuery || selectedCategory !== "all" || selectedLocation !== "all"
                ? "No services match your current filters."
                : "Service listings are currently empty."}
            </p>
          </div>
        ) : (
          <>
            {/* Results Count */}
            <div className="mb-4">
              <p className="text-sm text-muted-foreground" aria-live="polite">
                {filteredServices.length}{" "}
                {filteredServices.length === 1 ? "service" : "services"} found
              </p>
            </div>

            {/* Service Cards */}
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                  : "space-y-4"
              }
            >
              {filteredServices.map((service) => (
                <Card
                  key={service.id}
                  className="hover:shadow-lg transition-shadow"
                  role="region"
                  aria-label={`${service.name} service details`}
                >
                  <CardHeader>
                    <div className="aspect-video bg-muted rounded-lg flex items-center justify-center mb-4">
                      <Settings
                        className="w-12 h-12 text-muted-foreground"
                        aria-hidden="true"
                      />
                    </div>
                    <CardTitle className="text-lg font-semibold">
                      {service.name}
                    </CardTitle>
                    <div className="flex items-center justify-between mt-1">
                      <Badge variant="secondary" className="w-fit px-3 py-1">
                        {service.category}
                      </Badge>
                      <div className="flex items-center space-x-1">
                        <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm text-muted-foreground">
                          {service.rating}
                        </span>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    {/* Description paragraph box */}
                    <div className="border border-border rounded-md p-4 mb-4 text-sm text-muted-foreground whitespace-pre-wrap">
                      {service.description}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm text-muted-foreground font-[500]">
                      {/* Left Column: Provider */}
                      <div>
                        <div>
                          <span className="font-bold text-foreground">Provider:</span>{" "}
                          {service.provider}
                        </div>
                      </div>

                      {/* Right Column: Other info */}
                      <div className="space-y-2 text-sm font-semibold text-foreground">
                        <div className="flex items-center space-x-2">
                          <Clock className="w-5 h-5 text-primary" aria-hidden="true" />
                          <span>Response Time: {service.responseTime}</span>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Users className="w-5 h-5 text-primary" aria-hidden="true" />
                          <span>Completed Jobs: {service.completedJobs}</span>
                        </div>

                        <div>
                          <span className="font-bold">Availability:</span>{" "}
                          <Badge variant={service.availability === "24/7" ? "default" : "secondary"}>
                            {service.availability}
                          </Badge>
                        </div>

                        <div>
                          <span className="font-bold">Price Range:</span> {service.priceRange}
                        </div>
                      </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex space-x-2 pt-4">
                      {/* Request Quote links to email mailto if available, else disabled */}
                      <Button
                        size="sm"
                        className="flex-1"
                        as="a"
                        href={
                          service.providerProfile?.email
                            ? `mailto:${service.providerProfile.email}?subject=Request Quote for ${encodeURIComponent(service.name)}`
                            : undefined
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-disabled={!service.providerProfile?.email}
                        {...(!service.providerProfile?.email && { disabled: true })}
                      >
                        Request Quote
                      </Button>

                      {/* Provider button label, no phone click */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleContactProvider(service)}
                      >
                        Provider
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Load More (Optional placeholder) */}
            {filteredServices.length > 0 && (
              <div className="text-center mt-8">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => {
                    toast({
                      title: "Feature not implemented",
                      description: "Load more functionality will be added later.",
                    });
                  }}
                  aria-label="Load more services"
                >
                  Load More Services
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Services;
