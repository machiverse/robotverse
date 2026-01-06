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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <EnhancedHeader />

      <main className="flex-grow container mx-auto px-4 py-6">
        {/* Back button */}
        <Button variant="ghost" onClick={() => navigate("/services")} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Services
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header Card */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary" className="text-xs">
                        {service.category}
                      </Badge>
                      <Badge 
                        variant={service.availability === "Available" ? "default" : "outline"}
                        className="text-xs"
                      >
                        {service.availability}
                      </Badge>
                    </div>
                    <CardTitle className="text-2xl md:text-3xl font-bold text-foreground">
                      {service.name}
                    </CardTitle>
                    <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {service.location}
                      </span>
                      {service.rating && (
                        <span className="flex items-center gap-1 text-amber-600">
                          <Star className="w-4 h-4 fill-amber-500" />
                          {service.rating.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-semibold text-primary mb-4">
                  {service.priceRange}
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
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                  {service.description}
                </p>
              </CardContent>
            </Card>

            {/* Service Highlights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Service Highlights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex flex-col items-center p-4 bg-muted/50 rounded-lg text-center">
                    <Clock className="w-8 h-8 text-primary mb-2" />
                    <span className="text-sm text-muted-foreground">Response Time</span>
                    <span className="font-semibold text-foreground">{service.responseTime}</span>
                  </div>
                  <div className="flex flex-col items-center p-4 bg-muted/50 rounded-lg text-center">
                    <Users className="w-8 h-8 text-primary mb-2" />
                    <span className="text-sm text-muted-foreground">Completed Jobs</span>
                    <span className="font-semibold text-foreground">{service.completedJobs || "New"}</span>
                  </div>
                  <div className="flex flex-col items-center p-4 bg-muted/50 rounded-lg text-center">
                    <Shield className="w-8 h-8 text-primary mb-2" />
                    <span className="text-sm text-muted-foreground">Verified</span>
                    <span className="font-semibold text-foreground">Provider</span>
                  </div>
                  <div className="flex flex-col items-center p-4 bg-muted/50 rounded-lg text-center">
                    <CheckCircle className="w-8 h-8 text-primary mb-2" />
                    <span className="text-sm text-muted-foreground">Availability</span>
                    <span className="font-semibold text-foreground">{service.availability}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Provider Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Service Provider
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-14 w-14">
                    <AvatarImage src={service.providerProfile?.avatar_url} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {service.provider.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-foreground">{service.provider}</p>
                    {service.providerProfile?.company_name && (
                      <p className="text-sm text-muted-foreground">
                        {service.providerProfile.company_name}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t">
                  {(service.providerProfile?.phone || service.providerProfile?.mobile_number) && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="w-4 h-4" />
                      <span>{service.providerProfile.phone || service.providerProfile.mobile_number}</span>
                    </div>
                  )}
                  {service.providerProfile?.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      <span>{service.providerProfile.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>{service.location}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <Card>
              <CardContent className="pt-6 space-y-3">
                <Button className="w-full" size="lg" onClick={handleRequestQuote}>
                  <FileText className="w-4 h-4 mr-2" />
                  Request Quote
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full" 
                  size="lg"
                  onClick={handleContactProvider}
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Call Provider
                </Button>

                {user && service.providerId && user.id !== service.providerId && (
                  <ChatButton
                    otherUserId={service.providerId}
                    itemType="service"
                    itemId={service.id}
                    itemName={service.name}
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
