import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useButtonTracking } from "@/hooks/useButtonTracking";
import { Loader2, Grid, List, Search, MapPin, Phone, Star, Clock, ChevronRight, Home, Wrench } from "lucide-react";
import EnhancedHeader from "@/components/EnhancedHeader";
import { ChatButton } from "@/components/chat/ChatButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { SEOHead } from "@/components/SEOHead";
import { SERVICE_TYPES } from "@/constants/navigationMenus";

const ServiceCategory = () => {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { trackButtonClick } = useButtonTracking();

  // Decode and format
  const categoryName = type ? decodeURIComponent(type).replace(/-/g, ' ') : '';
  const matchedType = SERVICE_TYPES.find(st => 
    st.toLowerCase() === categoryName.toLowerCase() ||
    st.toLowerCase().replace(/\s+/g, '-') === type?.toLowerCase()
  );
  const displayName = matchedType || categoryName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  // States
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
          .from("services")
          .select(`
            *,
            profiles!services_provider_id_fkey (
              full_name, company_name, avatar_url, location, phone, mobile_number, email
            )
          `)
          .order("created_at", { ascending: false });

        if (error) throw error;

        // Filter by service type
        const filteredData = (data || []).filter(service => {
          const serviceType = service.service_type?.toLowerCase() || '';
          const searchType = categoryName.toLowerCase();
          return serviceType.includes(searchType) || searchType.includes(serviceType);
        });

        const transformedData = filteredData.map((item: any) => ({
          id: item.id,
          name: item.name || "Service",
          category: item.service_type || "General Service",
          priceRange: item.price_range || "Contact for pricing",
          location: item.location || item.profiles?.location || "Location not specified",
          provider: item.profiles?.company_name || item.profiles?.full_name || "Service Provider",
          description: item.description || "Professional service provider.",
          rating: item.rating && item.rating > 0 ? Number(item.rating) : null,
          responseTime: item.response_time || "2-4 hours",
          completedJobs: item.completed_jobs && item.completed_jobs > 0 ? item.completed_jobs : null,
          availability: item.availability || "Available",
          providerProfile: item.profiles || {},
          providerId: item.provider_id || "",
        }));

        setServices(transformedData);

        // Extract locations
        const uniqueLocations = new Set<string>();
        transformedData.forEach(s => {
          if (s.location) uniqueLocations.add(s.location);
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

    if (categoryName) {
      fetchServices();
    }
  }, [categoryName]);

  const filteredServices = services.filter(service => {
    const matchesSearch = !searchQuery || 
      service.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.provider?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesLocation = selectedLocation === "all" || 
      service.location?.toLowerCase().replace(/\s+/g, "-") === selectedLocation;

    return matchesSearch && matchesLocation;
  });

  const handleContactProvider = (service: any) => {
    if (!user) {
      toast({ title: "Login Required", description: "Please log in to contact providers.", variant: "destructive" });
      return;
    }

    const phone = service.providerProfile?.phone || service.providerProfile?.mobile_number;
    if (!phone) {
      toast({ title: "Contact Unavailable", description: "Provider's phone not available.", variant: "destructive" });
      return;
    }

    trackButtonClick({
      buttonName: "Contact Provider",
      buttonType: "service_contact",
      sellerId: service.providerId,
      sellerName: service.providerProfile?.full_name,
      sellerCompany: service.provider,
      sellerMobile: phone,
      itemId: service.id,
      itemType: "service",
    });

    window.open(`tel:${phone}`, "_self");
  };

  const getServiceDescription = () => {
    const descriptions: Record<string, string> = {
      "robot installation": "Professional robot installation services including setup, calibration and testing.",
      "robot maintenance": "Preventive and corrective maintenance services to keep your robots running optimally.",
      "robot programming": "Expert robot programming and teaching services for all major brands.",
      "robot integration": "System integration services connecting robots with existing production lines.",
      "robot training": "Comprehensive training programs for operators and maintenance personnel.",
      "robot repair": "Fast and reliable robot repair services with genuine spare parts.",
      "preventive maintenance": "Scheduled maintenance services to prevent downtime and extend robot life.",
      "emergency support": "24/7 emergency support for critical robot failures.",
      "system upgrades": "Robot system upgrades including controllers, software and hardware.",
      "safety audits": "Safety compliance audits and risk assessments for robotic installations."
    };
    return descriptions[categoryName.toLowerCase()] || `Professional ${displayName.toLowerCase()} from certified providers.`;
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`${displayName} Services | RobotVerse`}
        description={`Find ${displayName.toLowerCase()} providers. ${getServiceDescription()} Compare prices and get quotes.`}
        keywords={`${displayName}, robot services, ${displayName} providers, industrial robot services`}
        canonical={`/services/${type}`}
      />

      <EnhancedHeader />

      {/* Breadcrumb */}
      <div className="container mx-auto px-4 py-4">
        <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-primary flex items-center">
            <Home className="w-4 h-4 mr-1" />Home
          </Link>
          <ChevronRight className="w-4 h-4" />
          <Link to="/services" className="hover:text-primary">Services</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-foreground font-medium">{displayName}</span>
        </nav>
      </div>

      {/* Hero */}
      <div className="relative bg-gradient-hero border-b border-border">
        <div className="absolute inset-0 bg-gradient-primary opacity-10"></div>
        <div className="relative container mx-auto px-4 py-12">
          <div className="text-center max-w-4xl mx-auto">
            <div className="flex items-center justify-center mb-4">
              <Wrench className="w-10 h-10 text-primary mr-3" />
              <h1 className="text-4xl md:text-5xl font-bold text-foreground">{displayName}</h1>
            </div>
            <p className="text-lg text-muted-foreground">{getServiceDescription()}</p>
            <p className="mt-4 text-sm text-muted-foreground">
              {filteredServices.length} {filteredServices.length === 1 ? 'provider' : 'providers'} available
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Filters */}
        <Card className="mb-8 bg-card border-border">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search services..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
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

        {/* Content */}
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
            <p className="text-muted-foreground mb-4">Try adjusting your filters or browse all services.</p>
            <Button variant="outline" onClick={() => navigate('/services')}>Browse All Services</Button>
          </div>
        ) : (
          <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
            {filteredServices.map((service) => (
              <Card key={service.id} className="group bg-card border-border hover:shadow-lg transition-all">
                <CardHeader className="pb-4">
                  <div className="flex items-center space-x-3 mb-4">
                    <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                      {service.providerProfile.avatar_url ? (
                        <AvatarImage src={service.providerProfile.avatar_url} alt={service.provider} />
                      ) : (
                        <AvatarFallback className="bg-gradient-primary text-primary-foreground">{service.provider.charAt(0)}</AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex-1">
                      <CardTitle className="text-lg font-bold">{service.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{service.provider}</p>
                    </div>
                    {service.rating && (
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4 fill-accent text-accent" />
                        <span className="text-sm font-semibold">{service.rating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="bg-primary/10 text-primary">{service.category}</Badge>
                    <Badge variant="secondary" className="bg-accent/10 text-accent">{service.availability}</Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="text-center">
                    <span className="text-xl font-bold text-primary">{service.priceRange}</span>
                  </div>

                  <div className="flex items-center text-muted-foreground">
                    <MapPin className="w-4 h-4 mr-2 text-primary" />
                    <span className="text-sm">{service.location}</span>
                  </div>

                  <div className="h-16 overflow-y-auto text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                    {service.description}
                  </div>

                  <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="w-4 h-4 mr-2 text-accent" />
                    <span>Response: {service.responseTime}</span>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <ChatButton otherUserId={service.providerId} itemId={service.id} itemType="service" itemName={service.name} variant="outline" size="sm" className="flex-1" />
                    <Button size="sm" className="flex-1" onClick={() => handleContactProvider(service)}>
                      <Phone className="w-4 h-4 mr-1" />Call
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceCategory;
