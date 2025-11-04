import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import EnhancedHeader from "@/components/EnhancedHeader";
import ServiceRequestModal from "@/components/ServiceRequestModal";
import { ChatButton } from "@/components/chat/ChatButton";
import { useAuth } from "@/hooks/useAuth";
import {
  Search,
  Grid,
  List,
  MapPin,
  Star,
  Clock,
  Users,
  Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUniversalViewTracking } from "@/hooks/useUniversalViewTracking";
import { useButtonTracking } from "@/hooks/useButtonTracking";

interface Service {
  id: string;
  name: string;
  category: string;
  priceRange: string;
  location: string;
  provider: string;
  description: string;
  rating: number | null;
  responseTime: string;
  completedJobs: number | null;
  availability: string;
  providerProfile: {
    full_name?: string;
    company_name?: string;
    avatar_url?: string;
    phone?: string;
    mobile_number?: string;
    email?: string;
  };
  providerId: string;
}

const Services = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { trackItemView } = useUniversalViewTracking();
  const { trackButtonClick } = useButtonTracking();
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
              avatar_url,
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
          name: item.name || "Service",
          category: item.service_type || "General Service",
          priceRange: item.price_range || "Contact for pricing",
          location: item.location || item.profiles?.location || "Location not specified",
          provider: item.profiles?.company_name || item.profiles?.full_name || "Service Provider",
          description: item.description || "Professional service provider offering quality solutions.",
          rating: item.rating && item.rating > 0 ? Number(item.rating) : null,
          responseTime: item.response_time || "2-4 hours",
          completedJobs: item.completed_jobs && item.completed_jobs > 0 ? item.completed_jobs : null,
          availability: item.availability || "Available",
          providerProfile: item.profiles || {},
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

  // Dynamic category list
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
        services.map((s) => s.location).filter(Boolean)
      )
    )
      .map((loc) => ({ value: loc, label: loc }))
      .sort((a, b) => a.label.localeCompare(b.label))
  ];

  // Filtered services
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
    if (!user) {
      toast({
        variant: "destructive",
        title: "Login Required",
        description: "Please sign in to request a quote from service providers.",
      });
      return;
    }

    // Track button interaction
    trackButtonClick({
      buttonName: "Request Quote",
      buttonType: "service_action",
      sellerId: service.providerId,
      sellerName: service.providerProfile?.full_name || service.provider,
      sellerCompany: service.providerProfile?.company_name || service.provider,
      sellerEmail: service.providerProfile?.email,
      sellerMobile: service.providerProfile?.phone || service.providerProfile?.mobile_number,
      sellerLocation: service.location,
      itemId: service.id,
      itemType: "service",
      additionalData: {
        serviceName: service.name,
        serviceCategory: service.category,
        priceRange: service.priceRange
      }
    });

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

    const phone = service.providerProfile?.phone || service.providerProfile?.mobile_number;
    if (!phone) {
      toast({
        variant: "destructive",
        title: "Contact Unavailable",
        description: "Provider's phone number is not available.",
      });
      return;
    }

    // Track button interaction
    trackButtonClick({
      buttonName: "Contact Provider",
      buttonType: "service_contact",
      sellerId: service.providerId,
      sellerName: service.providerProfile?.full_name || service.provider,
      sellerCompany: service.providerProfile?.company_name || service.provider,
      sellerEmail: service.providerProfile?.email,
      sellerMobile: phone,
      sellerLocation: service.location,
      itemId: service.id,
      itemType: "service",
      additionalData: {
        serviceName: service.name,
        serviceCategory: service.category,
        contactMethod: "phone"
      }
    });

    window.open(`tel:${phone}`, "_self");
    toast({
      title: "Calling Provider",
      description: `Calling ${service.provider}...`,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <EnhancedHeader />
      
      {/* Hero Section with Gradient Background */}
      <div className="relative bg-gradient-hero border-b border-border">
        <div className="absolute inset-0 bg-gradient-primary opacity-10"></div>
        <div className="relative container mx-auto px-4 py-16">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl font-bold mb-6 text-foreground bg-gradient-primary bg-clip-text text-transparent">
              Professional Robot Services
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              From installation to maintenance - connect with certified professionals who keep your robots running at peak performance
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">

        {/* Filters Section */}
        <Card className="mb-8 bg-card border-border shadow-glow">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search services..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-input border-border focus:ring-primary"
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

              {/* Location */}
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                  {locationFilterList.map((location) => (
                    <SelectItem key={location.value} value={location.value}>
                      {location.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* View Toggle */}
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
          </CardContent>
        </Card>

        {/* Content States */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="bg-card rounded-lg p-8 shadow-glow">
              <Loader2 className="w-12 h-12 animate-spin mb-4 text-primary mx-auto" />
              <p className="text-muted-foreground text-center">Loading services...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Card className="max-w-md bg-card border-border shadow-glow">
              <CardContent className="p-8 text-center">
                <h3 className="text-lg font-semibold mb-2 text-foreground">Unable to load services</h3>
                <p className="text-muted-foreground mb-6">{error}</p>
                <Button onClick={() => window.location.reload()} variant="outline" className="border-border">
                  Try Again
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Card className="max-w-md bg-card border-border shadow-glow">
              <CardContent className="p-8 text-center">
                <h3 className="text-lg font-semibold mb-2 text-foreground">No services available</h3>
                <p className="text-muted-foreground">
                  {searchQuery || selectedCategory !== "all" || selectedLocation !== "all"
                    ? "No services match your current filters."
                    : "Service listings are currently empty."}
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <p className="text-sm text-muted-foreground">
                {filteredServices.length} {filteredServices.length === 1 ? "service" : "services"} found
              </p>
            </div>

            {/* Service Cards Grid */}
            <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
              {filteredServices.map((service) => (
                <Card key={service.id} className="group bg-card border-border hover:shadow-neon transition-all duration-300 hover:scale-[1.02]">
                  <CardHeader className="pb-4">
                    {/* Provider Info */}
                    <div className="flex items-center space-x-3 mb-4">
                      <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                        {service.providerProfile.avatar_url ? (
                          <AvatarImage src={service.providerProfile.avatar_url} alt={service.provider} />
                        ) : (
                          <AvatarFallback className="bg-gradient-primary text-primary-foreground font-semibold">
                            {service.provider.charAt(0)}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex-1">
                        <CardTitle className="text-lg font-bold text-foreground">{service.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{service.provider}</p>
                      </div>
                      {service.rating !== null && (
                        <div className="flex items-center space-x-1">
                          <Star className="w-4 h-4 fill-accent text-accent" />
                          <span className="text-sm font-semibold text-foreground">{service.rating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>

                    {/* Category and Availability */}
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                        {service.category}
                      </Badge>
                      <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20">
                        {service.availability}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Price */}
                    <div className="text-center">
                      <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                        {service.priceRange}
                      </span>
                    </div>

                    {/* Location */}
                    <div className="flex items-center text-muted-foreground">
                      <MapPin className="w-4 h-4 mr-2 text-primary" />
                      <span className="text-sm font-medium">{service.location}</span>
                    </div>

                    {/* Description */}
                    <div className="relative">
                      <div className="h-20 overflow-y-auto pr-2 text-sm text-muted-foreground leading-relaxed bg-muted p-3 rounded-lg border border-border">
                        {service.description}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-accent" />
                        <span className="text-muted-foreground">Response: {service.responseTime}</span>
                      </div>
                      {service.completedJobs !== null && (
                        <div className="flex items-center space-x-2">
                          <Users className="w-4 h-4 text-primary" />
                          <span className="text-muted-foreground">{service.completedJobs} projects</span>
                        </div>
                      )}
                    </div>

                     {/* Action Buttons */}
                    <div className="flex space-x-2 pt-2">
                       <ChatButton
                        sellerId={service.providerId}
                        itemId={service.id}
                        itemType="service"
                        itemName={service.name}
                        variant="default"
                        className="flex-1 bg-gradient-primary hover:opacity-90 text-primary-foreground font-medium shadow-glow"
                      />
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

      {/* Custom Scrollbar Styles */}
      <style>{`
        .h-20::-webkit-scrollbar {
          width: 4px;
        }
        .h-20::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 2px;
        }
        .h-20::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 2px;
        }
        .h-20::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
};

export default Services;
