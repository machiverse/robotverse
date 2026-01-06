import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAutoSEO } from "@/hooks/useAutoSEO";
import { AutoSEOHead } from "@/components/SEO/AutoSEOHead";
import EnhancedHeader from "@/components/EnhancedHeader";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  Search,
  Truck,
  Clock,
  Shield,
  Filter,
  X,
  Grid,
  List,
  TrendingUp,
  ChevronRight,
  Loader2
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface LogisticsProvider {
  id: string;
  service_name: string;
  description: string;
  service_type: string;
  coverage_areas: string[];
  transport_modes: string[];
  base_price: number;
  delivery_time_hours: number;
  tracking_available: boolean;
  insurance_included: boolean;
  emergency_delivery: boolean;
  provider_id: string;
  provider?: {
    full_name: string;
    company_name: string;
    location: string;
    phone: string;
    email: string;
  };
}

const SERVICE_TYPES = [
  { value: "all", label: "All Types" },
  { value: "Local Delivery", label: "Local Delivery" },
  { value: "Inter-city Transport", label: "Inter-city Transport" },
  { value: "International Shipping", label: "International Shipping" },
  { value: "Heavy Equipment Transport", label: "Heavy Equipment Transport" },
  { value: "Express Delivery", label: "Express Delivery" },
  { value: "Warehousing & Storage", label: "Warehousing & Storage" },
  { value: "Last Mile Delivery", label: "Last Mile Delivery" },
  { value: "Temperature Controlled Transport", label: "Temperature Controlled" },
];

const Logistics = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { seoData } = useAutoSEO({ type: 'logistics' });
  const [providers, setProviders] = useState<LogisticsProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"views" | "price-low" | "price-high" | "newest">("views");

  const handleProviderClick = (providerId: string) => {
    navigate(`/logistics/${providerId}`);
  };

  // Read filter from URL params
  useEffect(() => {
    const typeParam = searchParams.get("type");
    if (typeParam) {
      setSelectedType(typeParam);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchLogisticsProviders();
  }, []);

  const fetchLogisticsProviders = async () => {
    try {
      const { data, error } = await supabase
        .from("logistics_services")
        .select(
          `
          *,
          provider:provider_id (
            full_name,
            company_name,
            location,
            phone,
            email
          )
        `
        )
        .eq("is_active", true);

      if (error) throw error;
      setProviders(data || []);
    } catch (error) {
      console.error("Error fetching logistics providers:", error);
      toast({
        title: "Error",
        description: "Failed to load logistics providers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Dynamic location list
  const locationFilterList = useMemo(() => {
    const locations = new Set<string>();
    providers.forEach((p) => {
      if (p.provider?.location) {
        locations.add(p.provider.location);
      }
      p.coverage_areas?.forEach((area) => locations.add(area));
    });
    return [
      { value: "all", label: "All Locations" },
      ...Array.from(locations)
        .sort()
        .map((loc) => ({ value: loc, label: loc })),
    ];
  }, [providers]);

  const filteredProviders = useMemo(() => {
    let filtered = providers.filter((provider) => {
      const matchesSearch =
        provider.service_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        provider.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        provider.service_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        provider.coverage_areas.some((area) =>
          area.toLowerCase().includes(searchTerm.toLowerCase())
        );

      const matchesType =
        selectedType === "all" ||
        provider.service_type.toLowerCase().includes(selectedType.toLowerCase());

      const matchesLocation =
        selectedLocation === "all" ||
        provider.provider?.location?.toLowerCase() === selectedLocation.toLowerCase() ||
        provider.coverage_areas.some(
          (area) => area.toLowerCase() === selectedLocation.toLowerCase()
        );

      return matchesSearch && matchesType && matchesLocation;
    });

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "price-low":
          return (a.base_price || 0) - (b.base_price || 0);
        case "price-high":
          return (b.base_price || 0) - (a.base_price || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [providers, searchTerm, selectedType, selectedLocation, sortBy]);

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("");
    setSelectedType("all");
    setSelectedLocation("all");
  };

  const hasActiveFilters = searchTerm || selectedType !== "all" || selectedLocation !== "all";


  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <EnhancedHeader />
        <main className="flex-grow flex items-center justify-center">
          <Loader2 className="animate-spin w-10 h-10" />
          <p className="ml-4 text-muted-foreground text-lg">Loading logistics providers...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {seoData && (
        <AutoSEOHead
          title={seoData.title}
          description={seoData.description}
          keywords={seoData.keywords}
          ogTitle={seoData.ogTitle}
          ogDescription={seoData.ogDescription}
          twitterCard={seoData.twitterCard}
          canonicalUrl={seoData.canonicalUrl}
          schemaMarkup={seoData.schemaMarkup}
        />
      )}
      <EnhancedHeader />

      {/* Top title */}
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
          Specialized Robot Logistics
        </h1>
        <p className="text-muted-foreground">
          Safe handling and delivery with specialized logistics partners
        </p>

        {/* Breadcrumb */}
        {selectedType !== "all" && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-4 flex-wrap">
            <span className="hover:text-primary cursor-pointer" onClick={() => clearFilters()}>
              Logistics
            </span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-primary font-medium">{selectedType}</span>
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
                    Filter Logistics
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
                    placeholder="Search providers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* Service Type */}
                <div>
                  <p className="text-xs font-semibold mb-1">Service Type</p>
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
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
                <Truck className="w-5 h-5" />
                Logistics Providers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* For mobile: filter + search */}
              <div className="flex flex-col gap-3 lg:hidden">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search providers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Service Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
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
                  Showing <span className="font-semibold text-foreground">{filteredProviders.length}</span> providers
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
                      <SelectItem value="price-low">Price: Low-High</SelectItem>
                      <SelectItem value="price-high">Price: High-Low</SelectItem>
                      <SelectItem value="newest">Newest</SelectItem>
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

          {/* Providers grid/list */}
          {filteredProviders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Card className="max-w-md bg-card border-border">
                <CardContent className="p-8 text-center">
                  <Truck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2 text-foreground">No logistics providers found</h3>
                  <p className="text-muted-foreground">
                    {hasActiveFilters
                      ? "Try adjusting your search terms"
                      : "No providers are currently available"}
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
              {filteredProviders.map((provider) => (
                <Card
                  key={provider.id}
                  className="h-full flex flex-col cursor-pointer hover:shadow-lg transition-all group"
                  onClick={() => handleProviderClick(provider.id)}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Truck className="h-5 w-5 text-primary" />
                      {provider.service_name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {provider.provider?.company_name || provider.provider?.full_name}
                    </p>
                  </CardHeader>

                  <CardContent className="pt-0 space-y-3">
                    {/* Service Type Badge */}
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-xs">
                      {provider.service_type}
                    </Badge>

                    {/* Price */}
                    <div className="text-lg font-bold text-primary">
                      ₹{provider.base_price?.toLocaleString() || "Contact for price"}
                    </div>

                    {/* Delivery Time */}
                    <div className="flex items-center text-muted-foreground text-sm">
                      <Clock className="w-4 h-4 mr-1.5 text-primary flex-shrink-0" />
                      <span>{provider.delivery_time_hours}h delivery</span>
                    </div>

                    {/* Features Badges */}
                    <div className="flex flex-wrap gap-1">
                      {provider.tracking_available && (
                        <Badge variant="outline" className="text-xs">Tracking</Badge>
                      )}
                      {provider.insurance_included && (
                        <Badge variant="outline" className="text-xs">
                          <Shield className="h-3 w-3 mr-1" />
                          Insured
                        </Badge>
                      )}
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
    </div>
  );
};

export default Logistics;
