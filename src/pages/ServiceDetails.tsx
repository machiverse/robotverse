import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import EnhancedHeader from "@/components/EnhancedHeader";
import Footer from "@/components/Footer";
import ServiceRequestModal from "@/components/ServiceRequestModal";
import { ListingRatingSummary } from "@/components/reviews/ListingRatingSummary";
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
  CheckCircle,
  FileText,
  Shield
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
        // Pass raw data (with provider_id) so trackItemView can extract seller_id correctly
        trackItemView("services", data.id, data);
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

      <main className="flex-grow">
        {/* Breadcrumb */}
        <div className="border-b bg-muted/30">
          <div className="container mx-auto px-4 py-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/services")} className="-ml-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back to Services
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-5xl mx-auto">
            {/* Service Header */}
            <div className="mb-8">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-medium">
                  {service.category}
                </Badge>
                <Badge 
                  variant={service.availability === "Available" ? "default" : "secondary"}
                  className="text-xs"
                >
                  {service.availability}
                </Badge>
                {service.rating && (
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                    <Star className="w-3 h-3 fill-amber-500 mr-1" />
                    {service.rating.toFixed(1)}
                  </Badge>
                )}
              </div>
              
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                {service.name}
              </h1>
              
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <MapPin className="w-4 h-4" />
                <span>{service.location}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column - Details */}
              <div className="lg:col-span-2 space-y-8">
                {/* Price Card */}
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Service Price Range</p>
                        <p className="text-3xl font-bold text-primary">{service.priceRange}</p>
                      </div>
                      <Wrench className="w-12 h-12 text-primary/20" />
                    </div>
                  </CardContent>
                </Card>

                {/* Description */}
                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-4">About This Service</h2>
                  <div className="prose prose-sm max-w-none">
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                      {service.description}
                    </p>
                  </div>
                </div>

                {/* Stats Grid */}
                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-4">Service Details</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Clock className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Response Time</p>
                        <p className="font-medium text-foreground">{service.responseTime}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Projects Completed</p>
                        <p className="font-medium text-foreground">{service.completedJobs || "New Provider"}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                      <div className="p-2 rounded-lg bg-green-500/10">
                        <Shield className="w-5 h-5 text-green-500" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Verification</p>
                        <p className="font-medium text-foreground">Verified Provider</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <CheckCircle className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Current Status</p>
                        <p className="font-medium text-foreground">{service.availability}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Provider & Actions */}
              <div className="space-y-4">
                <Card className="sticky top-24">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Provider Info */}
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12 ring-2 ring-border">
                        <AvatarImage src={service.providerProfile?.avatar_url} />
                        <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                          {service.provider.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">{service.provider}</p>
                        <div className="flex items-center gap-1 text-xs text-green-600">
                          <Shield className="w-3 h-3" />
                          <span>Verified</span>
                        </div>
                      </div>
                    </div>

                    {/* Location */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-3 border-t border-b">
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      <span>{service.location}</span>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2 pt-2">
                      <Button className="w-full" size="lg" onClick={handleRequestQuote}>
                        <FileText className="w-4 h-4 mr-2" />
                        Request Quote
                      </Button>

                      {user && service.providerId && user.id !== service.providerId && (
                        <ChatButton
                          otherUserId={service.providerId}
                          itemType="service"
                          itemId={service.id}
                          itemName={service.name}
                          className="w-full"
                          variant="outline"
                          size="lg"
                        />
                      )}
                    </div>

                    {!user && (
                      <p className="text-xs text-center text-muted-foreground pt-2">
                        Sign in to contact this provider
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Reviews Section */}
            <div className="mt-8">
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle>Reviews & Ratings</CardTitle>
                </CardHeader>
                <CardContent>
                  <ListingRatingSummary
                    itemId={service.id}
                    itemType="service"
                    dealType="service"
                    itemName={service.name}
                    reviewedUserId={service.providerId}
                  />
                </CardContent>
              </Card>
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
