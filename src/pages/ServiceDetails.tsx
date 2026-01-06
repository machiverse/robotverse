import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import EnhancedHeader from "@/components/EnhancedHeader";
import Footer from "@/components/Footer";
import ServiceRequestModal from "@/components/ServiceRequestModal";
import { ChatButton } from "@/components/chat/ChatButton";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowLeft,
  MapPin,
  Star,
  Clock,
  Users,
  Loader2,
  Wrench,
  Phone,
  Mail,
  Building2,
  CheckCircle,
  FileText,
  Shield,
  Award
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

const ServiceDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { trackItemView } = useUniversalViewTracking();
  const { trackButtonClick } = useButtonTracking();
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);

  useEffect(() => {
    const fetchService = async () => {
      if (!id) return;

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
          .eq("id", id)
          .single();

        if (error) throw error;

        const transformedData: Service = {
          id: data.id,
          name: data.name || "Service",
          category: data.service_type || "General Service",
          priceRange: data.price_range || "Contact for pricing",
          location: data.location || data.profiles?.location || "Location not specified",
          provider: data.profiles?.company_name || data.profiles?.full_name || "Service Provider",
          description: data.description || "Professional service provider offering quality solutions.",
          rating: data.rating && data.rating > 0 ? Number(data.rating) : null,
          responseTime: "2-4 hours",
          completedJobs: data.completed_jobs && data.completed_jobs > 0 ? data.completed_jobs : null,
          availability: "Available",
          providerProfile: data.profiles || {},
          providerId: data.provider_id || "",
        };

        setService(transformedData);
        trackItemView("services", data.id, transformedData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load service");
        setService(null);
      } finally {
        setLoading(false);
      }
    };

    fetchService();
  }, [id, trackItemView]);

  const handleRequestQuote = () => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Login Required",
        description: "Please sign in to request a quote from service providers.",
      });
      return;
    }

    if (service) {
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
      setShowRequestModal(true);
    }
  };

  const handleContactProvider = () => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Login Required",
        description: "Please sign in to contact service providers.",
      });
      return;
    }

    if (!service) return;

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
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <EnhancedHeader />
        <main className="flex-grow flex items-center justify-center">
          <Loader2 className="animate-spin w-10 h-10" />
          <p className="ml-4 text-muted-foreground text-lg">Loading service details...</p>
        </main>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="min-h-screen flex flex-col">
        <EnhancedHeader />
        <main className="flex-grow flex flex-col justify-center items-center text-center px-4">
          <Wrench className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Service not found</h2>
          <p className="text-muted-foreground mb-4">{error || "The service you're looking for doesn't exist."}</p>
          <Button onClick={() => navigate("/services")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Services
          </Button>
        </main>
      </div>
    );
  }

  const hasPhone = service.providerProfile?.phone || service.providerProfile?.mobile_number;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <EnhancedHeader />

      <main className="flex-grow">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-primary/5 via-background to-primary/10 border-b">
          <div className="container mx-auto px-4 py-8">
            <Button variant="ghost" onClick={() => navigate("/services")} className="mb-4 -ml-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Services
            </Button>

            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              {/* Left: Service Info */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <Badge className="bg-primary/10 text-primary border-primary/20">
                    {service.category}
                  </Badge>
                  <Badge 
                    variant={service.availability === "Available" ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {service.availability}
                  </Badge>
                </div>
                
                <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
                  {service.name}
                </h1>
                
                <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-primary" />
                    {service.location}
                  </span>
                  {service.rating && (
                    <span className="flex items-center gap-1 text-amber-600">
                      <Star className="w-4 h-4 fill-amber-500" />
                      {service.rating.toFixed(1)} Rating
                    </span>
                  )}
                </div>

                <div className="mt-4 text-2xl font-bold text-primary">
                  {service.priceRange}
                </div>
              </div>

              {/* Right: Provider Card (Compact) */}
              <Card className="lg:w-80 border-0 shadow-lg">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                      <AvatarImage src={service.providerProfile?.avatar_url} />
                      <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                        {service.provider.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">{service.provider}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        Verified Provider
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <MapPin className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{service.location}</span>
                  </div>

                  <div className="space-y-2">
                    <Button className="w-full" onClick={handleRequestQuote}>
                      <FileText className="w-4 h-4 mr-2" />
                      Request Quote
                    </Button>
                    
                    {hasPhone && (
                      <Button variant="outline" className="w-full" onClick={handleContactProvider}>
                        <Phone className="w-4 h-4 mr-2" />
                        Call Provider
                      </Button>
                    )}

                    {user && service.providerId && user.id !== service.providerId && (
                      <ChatButton
                        otherUserId={service.providerId}
                        itemType="service"
                        itemId={service.id}
                        itemName={service.name}
                        className="w-full"
                        variant="secondary"
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Description */}
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  About This Service
                </h2>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                  {service.description}
                </p>
              </div>

              {/* Service Stats */}
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-primary" />
                  Service Overview
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Card className="border-0 bg-muted/30">
                    <CardContent className="p-4 text-center">
                      <Clock className="w-6 h-6 text-primary mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground mb-1">Response Time</p>
                      <p className="font-semibold text-sm text-foreground">{service.responseTime}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-0 bg-muted/30">
                    <CardContent className="p-4 text-center">
                      <Users className="w-6 h-6 text-primary mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground mb-1">Projects Done</p>
                      <p className="font-semibold text-sm text-foreground">{service.completedJobs || "New Provider"}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-0 bg-muted/30">
                    <CardContent className="p-4 text-center">
                      <Shield className="w-6 h-6 text-primary mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground mb-1">Status</p>
                      <p className="font-semibold text-sm text-foreground">Verified</p>
                    </CardContent>
                  </Card>
                  <Card className="border-0 bg-muted/30">
                    <CardContent className="p-4 text-center">
                      <CheckCircle className="w-6 h-6 text-primary mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground mb-1">Availability</p>
                      <p className="font-semibold text-sm text-foreground">{service.availability}</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>

            {/* Sidebar - Mobile Action Card */}
            <div className="lg:hidden">
              <Card>
                <CardContent className="p-5 space-y-3">
                  <div className="text-center mb-2">
                    <p className="text-2xl font-bold text-primary">{service.priceRange}</p>
                  </div>
                  <Button className="w-full" size="lg" onClick={handleRequestQuote}>
                    <FileText className="w-4 h-4 mr-2" />
                    Request Quote
                  </Button>
                  {hasPhone && (
                    <Button variant="outline" className="w-full" size="lg" onClick={handleContactProvider}>
                      <Phone className="w-4 h-4 mr-2" />
                      Call Provider
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar - Desktop */}
            <div className="hidden lg:block">
              <div className="sticky top-24 space-y-4">
                <Card className="border-0 shadow-md">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      About the Provider
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={service.providerProfile?.avatar_url} />
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {service.provider.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-foreground text-sm">{service.provider}</p>
                        <p className="text-xs text-muted-foreground">{service.location}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                      <Shield className="w-3.5 h-3.5 text-green-500" />
                      <span>Verified & Trusted Provider</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Request Quote Modal */}
      {showRequestModal && service && (
        <ServiceRequestModal
          open={showRequestModal}
          onOpenChange={setShowRequestModal}
          service={{
            id: service.id,
            name: service.name,
            category: service.category,
            priceRange: service.priceRange,
            rating: service.rating || 0,
            provider: service.provider,
            location: service.location,
            description: service.description,
            responseTime: service.responseTime,
            completedJobs: service.completedJobs || 0,
            availability: service.availability,
            providerProfile: service.providerProfile,
            providerId: service.providerId
          }}
        />
      )}
    </div>
  );
};

export default ServiceDetails;
