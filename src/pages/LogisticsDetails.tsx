import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import EnhancedHeader from "@/components/EnhancedHeader";
import Footer from "@/components/Footer";
import { ChatButton } from "@/components/chat/ChatButton";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowLeft,
  MapPin,
  Loader2,
  Truck,
  Phone,
  Mail,
  Building2,
  Clock,
  Shield,
  Package,
  FileText,
  CheckCircle
} from "lucide-react";
import LockedContactCard from "@/components/LockedContactCard";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUniversalViewTracking } from "@/hooks/useUniversalViewTracking";
import { useButtonTracking } from "@/hooks/useButtonTracking";

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

const LogisticsDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { trackItemView } = useUniversalViewTracking();
  const { trackButtonClick } = useButtonTracking();
  const [provider, setProvider] = useState<LogisticsProvider | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProvider = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("logistics_services")
          .select(`
            *,
            profiles!logistics_services_provider_id_fkey (
              full_name,
              company_name,
              location,
              phone,
              email
            )
          `)
          .eq("id", id)
          .single();

        if (error) throw error;

        const transformedData: LogisticsProvider = {
          id: data.id,
          service_name: data.service_name,
          description: data.description || "",
          service_type: data.service_type,
          coverage_areas: data.coverage_areas || [],
          transport_modes: data.transport_modes || [],
          base_price: data.base_price || 0,
          delivery_time_hours: data.delivery_time_hours || 0,
          tracking_available: data.tracking_available || false,
          insurance_included: data.insurance_included || false,
          emergency_delivery: data.emergency_delivery || false,
          provider_id: data.provider_id,
          provider: data.profiles || undefined,
        };

        setProvider(transformedData);
        trackItemView("logistics_services", data.id, transformedData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load logistics provider");
        setProvider(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProvider();
  }, [id, trackItemView]);

  const handleContactProvider = () => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Login Required",
        description: "Please sign in to contact logistics providers.",
      });
      return;
    }

    if (!provider?.provider?.phone) {
      toast({
        variant: "destructive",
        title: "Contact Unavailable",
        description: "Provider's phone number is not available.",
      });
      return;
    }

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
    });

    window.open(`tel:${provider.provider.phone}`, "_self");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <EnhancedHeader />
        <main className="flex-grow flex items-center justify-center">
          <Loader2 className="animate-spin w-10 h-10" />
          <p className="ml-4 text-muted-foreground text-lg">Loading logistics details...</p>
        </main>
      </div>
    );
  }

  if (error || !provider) {
    return (
      <div className="min-h-screen flex flex-col">
        <EnhancedHeader />
        <main className="flex-grow flex flex-col justify-center items-center text-center px-4">
          <Truck className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Logistics provider not found</h2>
          <p className="text-muted-foreground mb-4">{error || "The provider you're looking for doesn't exist."}</p>
          <Button onClick={() => navigate("/logistics")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Logistics
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <EnhancedHeader />

      <main className="flex-grow container mx-auto px-4 py-6">
        <Button variant="ghost" onClick={() => navigate("/logistics")} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Logistics
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header Card */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className="text-xs">
                    {provider.service_type}
                  </Badge>
                  {provider.emergency_delivery && (
                    <Badge variant="destructive" className="text-xs">
                      Emergency Available
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
                  <Truck className="w-8 h-8 text-primary" />
                  {provider.service_name}
                </CardTitle>
                <p className="text-muted-foreground mt-2">
                  {provider.provider?.company_name || provider.provider?.full_name}
                </p>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  ₹{provider.base_price.toLocaleString()}
                  <span className="text-sm font-normal text-muted-foreground ml-2">base price</span>
                </div>
              </CardContent>
            </Card>

            {/* Description Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Service Description
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {provider.description || "Professional logistics service for all your transportation needs."}
                </p>
              </CardContent>
            </Card>

            {/* Service Features */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Service Features
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex flex-col items-center p-4 bg-muted/50 rounded-lg text-center">
                    <Clock className="w-8 h-8 text-primary mb-2" />
                    <span className="text-sm text-muted-foreground">Delivery Time</span>
                    <span className="font-semibold text-foreground">{provider.delivery_time_hours}h</span>
                  </div>
                  <div className="flex flex-col items-center p-4 bg-muted/50 rounded-lg text-center">
                    <Shield className="w-8 h-8 text-primary mb-2" />
                    <span className="text-sm text-muted-foreground">Insurance</span>
                    <span className="font-semibold text-foreground">
                      {provider.insurance_included ? "Included" : "Optional"}
                    </span>
                  </div>
                  <div className="flex flex-col items-center p-4 bg-muted/50 rounded-lg text-center">
                    <MapPin className="w-8 h-8 text-primary mb-2" />
                    <span className="text-sm text-muted-foreground">Tracking</span>
                    <span className="font-semibold text-foreground">
                      {provider.tracking_available ? "Available" : "Not Available"}
                    </span>
                  </div>
                  <div className="flex flex-col items-center p-4 bg-muted/50 rounded-lg text-center">
                    <CheckCircle className="w-8 h-8 text-primary mb-2" />
                    <span className="text-sm text-muted-foreground">Emergency</span>
                    <span className="font-semibold text-foreground">
                      {provider.emergency_delivery ? "Available" : "Standard"}
                    </span>
                  </div>
                </div>

                {/* Coverage Areas */}
                {provider.coverage_areas.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-semibold mb-2 text-foreground">Coverage Areas</h4>
                    <div className="flex flex-wrap gap-2">
                      {provider.coverage_areas.map((area, index) => (
                        <Badge key={index} variant="outline">{area}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Transport Modes */}
                {provider.transport_modes.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2 text-foreground">Transport Modes</h4>
                    <div className="flex flex-wrap gap-2">
                      {provider.transport_modes.map((mode, index) => (
                        <Badge key={index} variant="secondary">{mode}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Locked Contact Card */}
            {provider.provider_id && (
              <LockedContactCard
                sellerId={provider.provider_id}
                itemId={provider.id}
                itemType="logistics"
                itemName={provider.service_name}
                sellerProfile={{
                  full_name: provider.provider?.full_name,
                  company_name: provider.provider?.company_name,
                  phone: provider.provider?.phone,
                  email: provider.provider?.email,
                  location: provider.provider?.location
                }}
                showLocation={true}
              />
            )}

            {/* Action Buttons */}
            <Card>
              <CardContent className="pt-6 space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full" 
                  size="lg"
                  onClick={handleContactProvider}
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Call Provider
                </Button>

                {user && provider.provider_id && user.id !== provider.provider_id && (
                  <ChatButton
                    otherUserId={provider.provider_id}
                    itemType="service"
                    itemId={provider.id}
                    itemName={provider.service_name}
                    className="w-full"
                    variant="secondary"
                    size="lg"
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default LogisticsDetails;
