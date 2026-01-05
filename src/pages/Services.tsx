import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
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
  Loader2,
  Filter,
  X,
  Wrench,
  TrendingUp,
  ChevronRight
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
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [sortBy, setSortBy] = useState<"views" | "rating" | "newest" | "name">("views");

  // Read filter from URL params
  useEffect(() => {
    const typeParam = searchParams.get("type");
    if (typeParam) {
      setSelectedCategory(typeParam);
    }
  }, [searchParams]);

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
  const categoryFilterList = useMemo(() => [
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
  ], [services]);

  // Dynamic location list
  const locationFilterList = useMemo(() => [
    { value: "all", label: "All Locations" },
    ...Array.from(
      new Set(
        services.map((s) => s.location).filter(Boolean)
      )
    )
      .map((loc) => ({ value: loc, label: loc }))
      .sort((a, b) => a.label.localeCompare(b.label))
  ], [services]);

  // Filtered and sorted services
  const filteredServices = useMemo(() => {
    let filtered = services.filter((service) => {
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

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "rating":
          return (b.rating || 0) - (a.rating || 0);
        case "newest":
          return 0; // Already sorted by created_at desc
        case "name":
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return filtered;
  }, [services, searchQuery, selectedCategory, selectedLocation, sortBy]);

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedLocation("all");
  };

  // Check if any filter is active
  const hasActiveFilters = searchQuery || selectedCategory !== "all" || selectedLocation !== "all";

  const handleRequestQuote = (service: Service) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Login Required",
        description: "Please sign in to request a quote from service providers.",
      });
      return;
    }

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

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <EnhancedHeader />
        <main className="flex-grow flex items-center justify-center">
          <Loader2 className="animate-spin w-10 h-10" />
          <p className="ml-4 text-muted-foreground text-lg">Loading services...</p>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <EnhancedHeader />
        <main className="flex-grow flex flex-col justify-center items-center text-center px-4">
          <Wrench className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Failed to load services</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <EnhancedHeader />

      {/* Top title */}
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
          Professional Robot Services
        </h1>
        <p className="text-muted-foreground">
          From installation to maintenance - connect with certified professionals
        </p>

        {/* Breadcrumb */}
        {selectedCategory !== "all" && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-4 flex-wrap">
            <span className="hover:text-primary cursor-pointer" onClick={() => clearFilters()}>
              Services
            </span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-primary font-medium">{selectedCategory}</span>
          </div>
        )}
      </div>

      {/* Layout: left filter, right listing */}
      <div className="container mx-auto px-4 pb-10 flex gap-6">
        {/* LEFT FILTER COLUMN (sticky) */}
        <aside className="w-72 flex-shrink-0 hidden lg:block">
          <div className="sticky top-20 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Filter className="w-4 h-4" />
                    Filter Services
                  </CardTitle>
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs">
                      <X className="w-3 h-3 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search services..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* Category */}
                <div>
                  <p className="text-xs font-semibold mb-1">Service Type</p>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Services" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryFilterList.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Location */}
                <div>
                  <p className="text-xs font-semibold mb-1">Location</p>
                  <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Locations" />
                    </SelectTrigger>
                    <SelectContent>
                      {locationFilterList.map((loc) => (
                        <SelectItem key={loc.value} value={loc.value}>
                          {loc.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        </aside>

        {/* RIGHT CONTENT COLUMN */}
        <main className="flex-1 space-y-6">
          {/* Top bar */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="w-5 h-5" />
                Services
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* For mobile: filter + search */}
              <div className="flex flex-col gap-3 lg:hidden">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search services..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Service Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryFilterList.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                    <SelectTrigger>
                      <SelectValue placeholder="Location" />
                    </SelectTrigger>
                    <SelectContent>
                      {locationFilterList.map((loc) => (
                        <SelectItem key={loc.value} value={loc.value}>
                          {loc.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Sort + View toggle */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing <span className="font-semibold text-foreground">{filteredServices.length}</span> services
                </p>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground hidden sm:inline">Sort by</span>
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                    <SelectTrigger className="w-36">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="views">Most Popular</SelectItem>
                      <SelectItem value="rating">Highest Rated</SelectItem>
                      <SelectItem value="newest">Newest</SelectItem>
                      <SelectItem value="name">Name A-Z</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex border rounded-md overflow-hidden">
                    <Button
                      variant={viewMode === "grid" ? "default" : "ghost"}
                      size="icon"
                      className="rounded-none h-8 w-8"
                      onClick={() => setViewMode("grid")}
                    >
                      <Grid className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={viewMode === "list" ? "default" : "ghost"}
                      size="icon"
                      className="rounded-none h-8 w-8"
                      onClick={() => setViewMode("list")}
                    >
                      <List className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Services grid/list */}
          {filteredServices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Card className="max-w-md bg-card border-border">
                <CardContent className="p-8 text-center">
                  <Wrench className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2 text-foreground">No services available</h3>
                  <p className="text-muted-foreground">
                    {hasActiveFilters
                      ? "No services match your current filters."
                      : "Service listings are currently empty."}
                  </p>
                  {hasActiveFilters && (
                    <Button variant="outline" className="mt-4" onClick={clearFilters}>
                      Clear Filters
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" : "space-y-4"}>
              {filteredServices.map((service) => (
                <Card key={service.id} className="group bg-card border-border hover:shadow-lg transition-all duration-300 hover:scale-[1.01]">
                  <CardHeader className="pb-4">
                    {/* Provider Info */}
                    <div className="flex items-center space-x-3 mb-4">
                      <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                        {service.providerProfile.avatar_url ? (
                          <AvatarImage src={service.providerProfile.avatar_url} alt={service.provider} />
                        ) : (
                          <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600 text-primary-foreground font-semibold">
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
                          <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                          <span className="text-sm font-semibold text-foreground">{service.rating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>

                    {/* Category and Availability */}
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                        {service.category}
                      </Badge>
                      <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20">
                        {service.availability}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Price */}
                    <div className="text-center">
                      <span className="text-xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
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
                        <Clock className="w-4 h-4 text-primary" />
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
                    <div className="flex gap-2 pt-2">
                      <ChatButton
                        otherUserId={service.providerId}
                        itemType="service"
                        itemId={service.id}
                        itemName={service.name}
                        className="flex-1"
                        variant="outline"
                      />
                      <Button
                        variant="default"
                        className="flex-1"
                        onClick={() => handleRequestQuote(service)}
                        disabled={!user}
                      >
                        Get Quote
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Service Request Modal */}
      {selectedService && (
        <ServiceRequestModal
          open={showRequestModal}
          onOpenChange={setShowRequestModal}
          service={{
            id: selectedService.id,
            name: selectedService.name,
            category: selectedService.category,
            priceRange: selectedService.priceRange,
            location: selectedService.location,
            provider: selectedService.provider,
            description: selectedService.description,
            rating: selectedService.rating || 0,
            responseTime: selectedService.responseTime,
            completedJobs: selectedService.completedJobs || 0,
            availability: selectedService.availability,
            providerProfile: selectedService.providerProfile,
            providerId: selectedService.providerId
          }}
        />
      )}
    </div>
  );
};

export default Services;
