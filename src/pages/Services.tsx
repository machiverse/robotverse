import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import EnhancedHeader from "@/components/EnhancedHeader";
import ServiceRequestModal from "@/components/ServiceRequestModal";
import { useAuth } from "@/hooks/useAuth";
import {
  Search,
  Grid,
  List,
  Settings,
  MapPin,
  Star,
  Clock,
  Users,
  Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  providerProfile: {
    full_name?: string;
    company_name?: string;
    phone?: string;
    mobile_number?: string;
    email?: string;
  };
  providerId: string;
}

const Services = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  // Fetch services from Supabase
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

        const transformedData = (data || []).map((item: any) => ({
          id: item.id,
          name: item.name,
          category: item.service_type || "",
          priceRange: item.price_range || "Contact for pricing",
          location: item.location || item.profiles?.location || "Location not specified",
          provider: item.profiles?.company_name || item.profiles?.full_name || "Service Provider",
          image: "/placeholder.svg",
          description: item.description || "Professional service provider",
          rating: 4.5,
          responseTime: "2-4 hours",
          completedJobs: Math.floor(Math.random() * 100) + 50,
          availability: "Available",
          providerProfile: item.profiles || {
            full_name: "Unknown",
            company_name: "Service Provider",
            phone: "",
            mobile_number: "",
            email: "",
          },
          providerId: item.provider_id || "",
        }));

        setServices(transformedData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load services");
        setServices([]);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  // Dynamic category list (split by commas)
  const categoryFilterList = [
    { value: "all", label: "All Services" },
    ...Array.from(
      new Set(
        services
          .flatMap(service =>
            service.category.split(",").map(c => c.trim())
          )
          .filter(Boolean)
      )
    )
      .map(cat => ({ value: cat, label: cat }))
      .sort((a, b) => a.label.localeCompare(b.label))
  ];

  // Dynamic location list
  const locationFilterList = [
    { value: "all", label: "All Locations" },
    ...Array.from(
      new Set(
        services
          .filter((service) => {
            const matchesSearch =
              service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              service.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
              service.provider.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesCategory =
              selectedCategory === "all" ||
              service.category
                .split(",")
                .map(c => c.trim().toLowerCase())
                .includes(selectedCategory.toLowerCase());

            return matchesSearch && matchesCategory;
          })
          .map((s) => s.location)
          .filter(Boolean)
      )
    )
      .map((loc) => ({ value: loc, label: loc }))
      .sort((a, b) => a.label.localeCompare(b.label))
  ];

  // Filtered services for display
  const filteredServices = services.filter((service) => {
    const matchesSearch =
      service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.provider.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === "all" ||
      service.category
        .split(",")
        .map(c => c.trim().toLowerCase())
        .includes(selectedCategory.toLowerCase());

    const matchesLocation =
      selectedLocation === "all" ||
      service.location.toLowerCase() === selectedLocation.toLowerCase();

    return matchesSearch && matchesCategory && matchesLocation;
  });

  const handleRequestQuote = (service: Service) => {
    setSelectedService(service);
    setShowRequestModal(true);
  };

  const handleContactProvider = (service: Service) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Login Required",
        description: "Please sign in to contact service providers.",
      });
      return;
    }

    const phone =
      service.providerProfile?.phone || service.providerProfile?.mobile_number;

    if (!phone) {
      toast({
        variant: "destructive",
        title: "Contact Unavailable",
        description: "Provider's phone number is not available.",
      });
      return;
    }

    window.open(`tel:${phone}`, "_self");
    toast({
      title: "Calling Provider",
      description: `Calling ${
        service.providerProfile?.company_name ||
        service.providerProfile?.full_name
      }...`,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <EnhancedHeader />

      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Robot Services</h1>
          <p className="text-xl text-gray-700">
            Connect with certified professionals for robot maintenance, repair, and training services.
          </p>
        </div>

        {/* Filters */}
        <div className="bg-card border border-border rounded-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Category */}
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Service Type" />
              </SelectTrigger>
              <SelectContent>
                {categoryFilterList.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Dynamic Location Filter */}
            <Select
              value={selectedLocation}
              onValueChange={setSelectedLocation}
            >
              <SelectTrigger>
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                {locationFilterList.length > 0 ? (
                  locationFilterList.map((location) => (
                    <SelectItem key={location.value} value={location.value}>
                      {location.label}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="all">All Locations</SelectItem>
                )}
              </SelectContent>
            </Select>

            {/* View toggle */}
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

        {/* Status States */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mb-4" />
            <p className="text-gray-500">Loading services...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Settings className="w-16 h-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Unable to load services</h3>
            <p className="text-gray-500 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} variant="outline">
              Try Again
            </Button>
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Settings className="w-16 h-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No services available</h3>
            <p className="text-gray-500">
              {searchQuery || selectedCategory !== "all" || selectedLocation !== "all"
                ? "No services match your current filters."
                : "Service listings are currently empty."}
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <p className="text-sm text-gray-500">
                {filteredServices.length}{" "}
                {filteredServices.length === 1 ? "service" : "services"} found
              </p>
            </div>

            {/* Cards */}
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
                  className="hover:shadow-xl transition-all duration-300 border border-gray-200 shadow-sm bg-white rounded-xl"
                >
                  <CardHeader className="pb-3">
                    <div className="aspect-video bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg flex items-center justify-center mb-4 border">
                      <div className="text-center">
                        <Settings className="w-12 h-12 text-blue-600 mx-auto mb-2" />
                        <Badge variant="outline" className="text-xs bg-white/90 text-blue-700 border border-blue-200">
                          Professional Service
                        </Badge>
                      </div>
                    </div>
                    <CardTitle className="text-lg font-bold text-gray-900">
                      {service.name}
                    </CardTitle>
                    <div className="flex items-center justify-between mt-1">
                      <Badge className="bg-blue-100 text-blue-800 border border-blue-200">
                        {service.category}
                      </Badge>
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-semibold text-gray-800">
                          {service.rating}
                        </span>
                        <span className="text-xs text-gray-500">
                          ({service.completedJobs})
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                          {service.priceRange}
                        </span>
                        <Badge className="bg-green-100 text-green-800 border border-green-200">
                          {service.availability}
                        </Badge>
                      </div>

                      <div className="flex items-center text-gray-700">
                        <MapPin className="w-4 h-4 mr-2 text-blue-600" />
                        <span className="text-sm font-medium">
                          {service.location}
                        </span>
                      </div>

                      <div className="border border-gray-200 rounded-lg p-4 bg-white text-sm text-gray-800 leading-relaxed text-justify">
                        {service.description}
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-orange-600" />
                          <span className="font-medium text-gray-800">
                            Response: {service.responseTime}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Users className="w-4 h-4 text-green-600" />
                          <span className="font-medium text-gray-800">
                            {service.completedJobs} projects
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-gray-100">
                        <div className="flex items-center space-x-2 mb-3">
                          <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-bold text-sm">
                              {service.provider.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">
                              {service.provider}
                            </p>
                            <p className="text-xs text-gray-600">
                              Certified Professional
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex space-x-2 pt-1">
                        <Button
                          size="sm"
                          className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium"
                          onClick={() => handleRequestQuote(service)}
                        >
                          Get Professional Quote
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleContactProvider(service)}
                          disabled={
                            !user ||
                            (!service.providerProfile?.phone &&
                              !service.providerProfile?.mobile_number)
                          }
                          className="border border-blue-200 text-blue-700 hover:bg-blue-50"
                        >
                          {user ? "Contact Provider" : "Sign In to Contact"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        <ServiceRequestModal
          open={showRequestModal}
          onOpenChange={setShowRequestModal}
          service={selectedService}
        />
      </div>
    </div>
  );
};

export default Services;
