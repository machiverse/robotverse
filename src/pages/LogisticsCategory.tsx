import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Grid, List, Search, MapPin, Phone, Truck, ChevronRight, Home, Clock, Package } from "lucide-react";
import EnhancedHeader from "@/components/EnhancedHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { SEOHead } from "@/components/SEOHead";
import { LOGISTICS_TYPES } from "@/constants/navigationMenus";

const LogisticsCategory = () => {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const categoryName = type ? decodeURIComponent(type).replace(/-/g, ' ') : '';
  const matchedType = LOGISTICS_TYPES.find(lt => 
    lt.toLowerCase() === categoryName.toLowerCase() ||
    lt.toLowerCase().replace(/\s+/g, '-') === type?.toLowerCase()
  );
  const displayName = matchedType || categoryName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locations, setLocations] = useState([{ value: "all", label: "All Locations" }]);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("logistics_services")
          .select(`
            *,
            profiles!logistics_services_provider_id_fkey (
              full_name, company_name, phone, mobile_number, email, location
            )
          `)
          .eq("is_active", true)
          .order("created_at", { ascending: false });

        if (error) throw error;

        const filteredData = (data || []).filter(service => {
          const serviceType = service.service_type?.toLowerCase() || '';
          const searchType = categoryName.toLowerCase();
          return serviceType.includes(searchType) || searchType.includes(serviceType);
        });

        setServices(filteredData);

        const uniqueLocations = new Set<string>();
        filteredData.forEach(s => {
          s.coverage_areas?.forEach((area: string) => uniqueLocations.add(area));
          if (s.profiles?.location) uniqueLocations.add(s.profiles.location);
        });
        setLocations([
          { value: "all", label: "All Locations" },
          ...Array.from(uniqueLocations).sort().map(loc => ({ value: loc.toLowerCase().replace(/\s+/g, "-"), label: loc }))
        ]);

      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load services");
      } finally {
        setLoading(false);
      }
    };

    if (categoryName) fetchServices();
  }, [categoryName]);

  const filteredServices = services.filter(service => {
    const matchesSearch = !searchQuery || 
      service.service_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.profiles?.company_name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesLocation = selectedLocation === "all" || 
      service.coverage_areas?.some((area: string) => area.toLowerCase().replace(/\s+/g, "-") === selectedLocation) ||
      service.profiles?.location?.toLowerCase().replace(/\s+/g, "-") === selectedLocation;

    return matchesSearch && matchesLocation;
  });

  const handleContactProvider = (service: any) => {
    if (!user) {
      toast({ title: "Login Required", description: "Please log in to contact providers.", variant: "destructive" });
      return;
    }
    const phone = service.profiles?.phone || service.profiles?.mobile_number;
    if (!phone) {
      toast({ title: "Contact Unavailable", description: "Provider's phone not available.", variant: "destructive" });
      return;
    }
    window.open(`tel:${phone}`, "_self");
  };

  const getDescription = () => {
    const desc: Record<string, string> = {
      "domestic shipping": "Reliable domestic shipping services for industrial robots and equipment across India.",
      "international shipping": "Global shipping solutions for robots with customs clearance and documentation.",
      "heavy equipment transport": "Specialized transport for heavy industrial robots and machinery.",
      "express delivery": "Fast express delivery for urgent robot spare parts and components.",
      "warehouse services": "Secure warehousing and storage for robots and automation equipment.",
      "customs clearance": "Expert customs clearance services for imported robots and parts.",
      "door-to-door delivery": "Complete door-to-door delivery services for your convenience.",
      "last mile delivery": "Efficient last mile delivery to your facility or warehouse."
    };
    return desc[categoryName.toLowerCase()] || `Professional ${displayName.toLowerCase()} for industrial robots.`;
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`${displayName} for Robots | RobotVerse Logistics`}
        description={`${getDescription()} Compare providers and get quotes.`}
        keywords={`${displayName}, robot logistics, robot shipping, industrial equipment transport`}
        canonical={`/logistics/${type}`}
      />

      <EnhancedHeader />

      <div className="container mx-auto px-4 py-4">
        <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-primary flex items-center"><Home className="w-4 h-4 mr-1" />Home</Link>
          <ChevronRight className="w-4 h-4" />
          <Link to="/logistics" className="hover:text-primary">Logistics</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-foreground font-medium">{displayName}</span>
        </nav>
      </div>

      <div className="relative bg-muted border-b border-border">
        <div className="absolute inset-0 bg-primary opacity-10"></div>
        <div className="relative container mx-auto px-4 py-12">
          <div className="text-center max-w-4xl mx-auto">
            <div className="flex items-center justify-center mb-4">
              <Truck className="w-10 h-10 text-primary mr-3" />
              <h1 className="text-4xl md:text-5xl font-bold text-foreground">{displayName}</h1>
            </div>
            <p className="text-lg text-muted-foreground">{getDescription()}</p>
            <p className="mt-4 text-sm text-muted-foreground">{filteredServices.length} providers available</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Card className="mb-8 bg-card border-border">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search providers..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
              </div>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger><SelectValue placeholder="Location" /></SelectTrigger>
                <SelectContent>
                  {locations.map(loc => <SelectItem key={loc.value} value={loc.value}>{loc.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-between items-center mt-4">
              <p className="text-sm text-muted-foreground">Showing {filteredServices.length} providers</p>
              <div className="flex space-x-2">
                <Button variant={viewMode === "grid" ? "default" : "outline"} size="sm" onClick={() => setViewMode("grid")}><Grid className="w-4 h-4" /></Button>
                <Button variant={viewMode === "list" ? "default" : "outline"} size="sm" onClick={() => setViewMode("list")}><List className="w-4 h-4" /></Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading {displayName}...</p>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="text-center py-20">
            <h3 className="text-xl font-semibold mb-2">No {displayName} Providers Found</h3>
            <p className="text-muted-foreground mb-4">Try adjusting your filters.</p>
            <Button variant="outline" onClick={() => navigate('/logistics')}>Browse All Logistics</Button>
          </div>
        ) : (
          <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
            {filteredServices.map((service) => (
              <Card key={service.id} className="bg-card border-border hover:shadow-lg transition-all">
                <CardHeader>
                  <CardTitle className="text-lg">{service.service_name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{service.profiles?.company_name || 'Logistics Provider'}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">{service.service_type}</Badge>
                    {service.tracking_available && <Badge className="bg-green-500/10 text-green-500">Tracking</Badge>}
                  </div>

                  {service.base_price && (
                    <div className="text-center">
                      <span className="text-xl font-bold text-primary">₹{service.base_price?.toLocaleString()}</span>
                      <span className="text-sm text-muted-foreground"> base price</span>
                    </div>
                  )}

                  <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="w-4 h-4 mr-2" />
                    <span>Delivery: {service.delivery_time_hours || 24} hours</span>
                  </div>

                  {service.max_weight_kg && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Package className="w-4 h-4 mr-2" />
                      <span>Max weight: {service.max_weight_kg} kg</span>
                    </div>
                  )}

                  <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4 mr-2" />
                    <span className="truncate">{service.coverage_areas?.slice(0, 3).join(', ') || service.profiles?.location}</span>
                  </div>

                  <Button className="w-full" onClick={() => handleContactProvider(service)}>
                    <Phone className="w-4 h-4 mr-2" />Contact Provider
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LogisticsCategory;
