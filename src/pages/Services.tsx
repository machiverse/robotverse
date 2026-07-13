import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import EnhancedHeader from "@/components/EnhancedHeader";
import { useAuth } from "@/hooks/useAuth";
import { useAuthReady } from "@/hooks/useAuthReady";
import {
  Search,
  Grid,
  List,
  MapPin,
  Star,
  Loader2,
  Filter,
  X,
  Wrench,
  TrendingUp,
  ChevronRight,
  Eye
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUniversalViewTracking } from "@/hooks/useUniversalViewTracking";
import { useButtonTracking } from "@/hooks/useButtonTracking";
import { UniversalSEOHead } from "@/components/SEO/UniversalSEOHead";
import { useDynamicSEOKeywords } from "@/hooks/useDynamicSEOKeywords";
import { generateItemListSchema } from "@/utils/seo/modernSchemas";
import UserProductRequestModal from "@/components/UserProductRequestModal";
import CopySearchLinkButton from "@/components/CopySearchLinkButton";
import { useUrlParam, useDebouncedUrlParam } from "@/hooks/useUrlState";

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
  viewCount: number;
}

const Services = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { isReady } = useAuthReady();
  const [searchParams, setSearchParams] = useSearchParams();
  const dynamicServiceKeywords = useDynamicSEOKeywords('services');
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useDebouncedUrlParam("search", "", 400);
  const [selectedCategory, setSelectedCategory] = useUrlParam<string>("category", "all");
  const [selectedLocation, setSelectedLocation] = useUrlParam<string>("location", "all");
  const [viewMode, setViewMode] = useUrlParam<"grid" | "list">("view", "grid");
  const [sortBy, setSortBy] = useUrlParam<"views" | "rating" | "newest" | "name">("sort", "views");
  const [showRequestModal, setShowRequestModal] = useState(false);

  // Legacy: honor ?type= as alias for ?category=
  useEffect(() => {
    const typeParam = searchParams.get("type");
    if (typeParam && selectedCategory === "all") {
      setSelectedCategory(typeParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch services from Supabase
  useEffect(() => {
    if (!isReady) return;

    const fetchServices = async () => {
      try {
        setLoading(true);
        
        // Fetch services
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

        // Fetch view counts for all services
        const { data: viewCounts } = await supabase
          .from("item_view_counts")
          .select("item_id, total_views")
          .eq("item_type", "services");

        const viewCountMap = new Map<string, number>();
        (viewCounts || []).forEach((vc: any) => {
          viewCountMap.set(vc.item_id, vc.total_views || 0);
        });

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
          viewCount: viewCountMap.get(item.id) || 0,
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
  }, [isReady]);

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
        case "views":
          return b.viewCount - a.viewCount;
        case "rating":
          return (b.rating || 0) - (a.rating || 0);
        case "newest":
          return 0; // Already sorted by created_at desc
        case "name":
          return a.name.localeCompare(b.name);
        default:
          return b.viewCount - a.viewCount;
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

  const handleServiceClick = (serviceId: string) => {
    navigate(`/services/${serviceId}`);
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
      <UniversalSEOHead
        pageType="services"
        title="Robot Repair & Maintenance Services India | Expert Technicians"
        description="Find certified robot service providers for repair, maintenance, installation & programming. FANUC, ABB, KUKA, Yaskawa experts. 24x7 emergency support across India."
        keywords={dynamicServiceKeywords.length > 0 ? dynamicServiceKeywords : [
          'robot repair maintenance services India',
          'robot installation service',
          'robot programming services',
          'industrial robot technician',
          'FANUC robot repair',
          'ABB robot service India',
          'KUKA robot maintenance',
          'robot calibration service',
          'emergency robot repair',
          'robot preventive maintenance',
          'robot training services India'
        ]}
        schemas={[generateItemListSchema(services.slice(0, 20), "Robot Service Providers", "services")]}
      />
      <EnhancedHeader />

      {/* Top title */}
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
          Professional Robot Services
        </h1>
        <p className="text-muted-foreground">
          From installation to maintenance - connect with certified professionals
        </p>
        <div className="mt-3"><CopySearchLinkButton /></div>

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

            {/* Can't Find CTA - compact in sidebar */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4 text-center">
                <p className="text-sm font-semibold mb-1">Can't find the service you need?</p>
                <p className="text-xs text-muted-foreground mb-3">Submit your requirement and we'll connect you with service providers.</p>
                <Button size="sm" className="w-full" onClick={() => setShowRequestModal(true)}>
                  <Search className="w-3 h-3 mr-1" /> Submit Request
                </Button>
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
                <Card 
                  key={service.id} 
                  className="group bg-card border-border hover:shadow-lg transition-all duration-300 hover:scale-[1.01] cursor-pointer"
                  onClick={() => handleServiceClick(service.id)}
                >
                  <CardHeader className="pb-3">
                    {/* Provider Info */}
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                        {service.providerProfile.avatar_url ? (
                          <AvatarImage src={service.providerProfile.avatar_url} alt={service.provider} />
                        ) : (
                          <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600 text-primary-foreground font-semibold text-sm">
                            {service.provider.charAt(0)}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base font-bold text-foreground truncate">{service.name}</CardTitle>
                        <p className="text-xs text-muted-foreground truncate">{service.provider}</p>
                      </div>
                      {service.rating !== null && (
                        <div className="flex items-center space-x-1 flex-shrink-0">
                          <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                          <span className="text-sm font-semibold text-foreground">{service.rating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0 space-y-3">
                    {/* Category Badge */}
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-xs">
                      {service.category}
                    </Badge>

                    {/* Description Preview */}
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {service.description}
                    </p>

                    {/* Price */}
                    <div className="text-lg font-bold text-primary">
                      {service.priceRange}
                    </div>

                    {/* Location & Views */}
                    <div className="flex items-center justify-between text-muted-foreground text-sm">
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 mr-1.5 text-primary flex-shrink-0" />
                        <span className="truncate">{service.location}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs">
                        <Eye className="w-3.5 h-3.5" />
                        <span>{service.viewCount}</span>
                      </div>
                    </div>

                    {/* View Details Button */}
                    <Button variant="outline" className="w-full mt-2 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <ChevronRight className="w-4 h-4 mr-1" />
                      View Details
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>

      </div>

      <UserProductRequestModal open={showRequestModal} onOpenChange={setShowRequestModal} defaultProductType="service" />
    </div>
  );
};

export default Services;
