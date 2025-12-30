import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useButtonTracking } from "@/hooks/useButtonTracking";
import { useUniversalViewTracking } from "@/hooks/useUniversalViewTracking";
import { useAutoSEO } from "@/hooks/useAutoSEO";
import { AutoSEOHead } from "@/components/SEO/AutoSEOHead";
import EnhancedHeader from "@/components/EnhancedHeader";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import {
  Search,
  Truck,
  MapPin,
  Phone,
  Mail,
  Package,
  Clock,
  Shield,
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

const Logistics = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { trackButtonClick } = useButtonTracking();
  const { trackItemView } = useUniversalViewTracking();
  const { seoData } = useAutoSEO({ type: 'logistics' });
  const [providers, setProviders] = useState<LogisticsProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedProvider, setSelectedProvider] =
    useState<LogisticsProvider | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);

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

  const filteredProviders = providers.filter(
    (provider) => {
      const matchesSearch = 
        provider.service_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        provider.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        provider.service_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        provider.coverage_areas.some((area) =>
          area.toLowerCase().includes(searchTerm.toLowerCase())
        );
      
      const matchesType = selectedType === "all" ||
        provider.service_type.toLowerCase().includes(selectedType.toLowerCase());

      return matchesSearch && matchesType;
    }
  );

  const handleViewContact = (provider: LogisticsProvider) => {
    // Track contact interaction
    trackButtonClick({
      buttonName: "Contact Provider",
      buttonType: "logistics_contact",
      sellerId: provider.provider_id,
      sellerName: provider.provider?.full_name,
      sellerCompany: provider.provider?.company_name,
      sellerEmail: provider.provider?.email,
      sellerMobile: provider.provider?.phone,
      sellerLocation: provider.provider?.location,
      itemId: provider.id,
      itemType: "logistics",
      additionalData: {
        serviceName: provider.service_name,
        serviceType: provider.service_type,
        coverageAreas: provider.coverage_areas,
        transportModes: provider.transport_modes,
        basePrice: provider.base_price
      }
    });

    setSelectedProvider(provider);
    setShowContactModal(true);
  };

  const handleGetQuote = (provider: LogisticsProvider) => {
    // Track quote request interaction
    trackButtonClick({
      buttonName: "Get Quote",
      buttonType: "logistics_quote",
      sellerId: provider.provider_id,
      sellerName: provider.provider?.full_name,
      sellerCompany: provider.provider?.company_name,
      sellerEmail: provider.provider?.email,
      sellerMobile: provider.provider?.phone,
      sellerLocation: provider.provider?.location,
      itemId: provider.id,
      itemType: "logistics",
      additionalData: {
        serviceName: provider.service_name,
        serviceType: provider.service_type,
        deliveryTime: provider.delivery_time_hours
      }
    });

    setSelectedProvider(provider);
    setShowQuoteModal(true);
  };

  const QuoteRequestForm = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Pickup Location</label>
        <Input placeholder="Enter pickup address" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">
          Delivery Location
        </label>
        <Input placeholder="Enter delivery address" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Weight (kg)</label>
          <Input type="number" placeholder="0" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">
            Dimensions
          </label>
          <Input placeholder="L x W x H (cm)" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">
          Additional Requirements
        </label>
        <textarea
          className="w-full p-2 border rounded-md resize-none"
          rows={3}
          placeholder="Special handling instructions, delivery time requirements, etc."
        />
      </div>
      <Button className="w-full">Submit Quote Request</Button>
    </div>
  );

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

      <main className="container mx-auto px-4 py-8">
        {/* Search & Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">Specialized Robot Logistics</h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Safe handling and delivery of your robots with specialized logistics partners who understand precision equipment
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Service Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Local Delivery">Local Delivery</SelectItem>
                <SelectItem value="Inter-city Transport">Inter-city Transport</SelectItem>
                <SelectItem value="International Shipping">International Shipping</SelectItem>
                <SelectItem value="Heavy Equipment Transport">Heavy Equipment Transport</SelectItem>
                <SelectItem value="Express Delivery">Express Delivery</SelectItem>
                <SelectItem value="Warehousing & Storage">Warehousing & Storage</SelectItem>
                <SelectItem value="Last Mile Delivery">Last Mile Delivery</SelectItem>
                <SelectItem value="Temperature Controlled Transport">Temperature Controlled</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search providers, services, or regions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        {/* Providers grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-3/4"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded"></div>
                    <div className="h-4 bg-muted rounded w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProviders.map((provider) => (
              <Card 
                key={provider.id} 
                className="h-full flex flex-col cursor-pointer hover:shadow-lg transition-all"
                onClick={() => trackItemView('logistics_services', provider.id, provider)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5 text-primary" />
                    {provider.service_name}
                  </CardTitle>
                  <CardDescription>
                    {provider.provider?.company_name ||
                      provider.provider?.full_name}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex-1">
                  <p className="text-sm text-muted-foreground mb-4">
                    {provider.description}
                  </p>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{provider.service_type}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {provider.delivery_time_hours}h delivery
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {provider.tracking_available && (
                        <Badge variant="secondary" className="text-xs">
                          Tracking
                        </Badge>
                      )}
                      {provider.insurance_included && (
                        <Badge variant="secondary" className="text-xs">
                          <Shield className="h-3 w-3 mr-1" />
                          Insured
                        </Badge>
                      )}
                      {provider.emergency_delivery && (
                        <Badge variant="secondary" className="text-xs">
                          Emergency
                        </Badge>
                      )}
                    </div>

                    <div className="text-sm text-muted-foreground">
                      <strong>Coverage:</strong>{" "}
                      {provider.coverage_areas.slice(0, 2).join(", ")}
                      {provider.coverage_areas.length > 2 &&
                        ` +${provider.coverage_areas.length - 2} more`}
                    </div>

                    <div className="text-sm text-muted-foreground">
                      <strong>Transport:</strong>{" "}
                      {provider.transport_modes.join(", ")}
                    </div>
                  </div>
                </CardContent>

                {/* 🚀 Two Action Buttons */}
                <CardFooter className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    size="sm"
                    disabled={!user}
                    onClick={() => handleViewContact(provider)}
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Contact
                  </Button>
                  <Button
                    className="flex-1"
                    size="sm"
                    disabled={!user}
                    onClick={() => handleGetQuote(provider)}
                  >
                    <Package className="h-4 h-4 mr-2" />
                    Get Quote
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {filteredProviders.length === 0 && !loading && (
          <div className="text-center py-12">
            <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              No logistics providers found
            </h3>
            <p className="text-muted-foreground">
              {searchTerm
                ? "Try adjusting your search terms"
                : "No providers are currently available"}
            </p>
          </div>
        )}
      </main>

      {/* Contact Details Modal */}
      <Dialog open={showContactModal} onOpenChange={setShowContactModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contact Details</DialogTitle>
            <DialogDescription>
              {selectedProvider?.provider?.company_name ||
                selectedProvider?.provider?.full_name}
            </DialogDescription>
          </DialogHeader>

          {selectedProvider?.provider && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>
                  {selectedProvider.provider.phone || "Not provided"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>
                  {selectedProvider.provider.email || "Not provided"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>
                  {selectedProvider.provider.location || "Not provided"}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Quote Request Modal */}
      <Dialog open={showQuoteModal} onOpenChange={setShowQuoteModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Quote</DialogTitle>
            <DialogDescription>
              Get a quote from{" "}
              {selectedProvider?.provider?.company_name ||
                selectedProvider?.provider?.full_name}
            </DialogDescription>
          </DialogHeader>
          <QuoteRequestForm />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Logistics;
