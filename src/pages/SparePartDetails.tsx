import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import {
  ArrowLeft,
  Loader2,
  MapPin,
  Building,
  Eye,
  Heart,
  Truck,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Brain,
} from "lucide-react";
import ViewCountDisplay from "@/components/ViewCountDisplay";
import EnhancedHeader from "@/components/EnhancedHeader";
import { ChatButton } from "@/components/chat/ChatButton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";
import { useButtonTracking } from "@/hooks/useButtonTracking";
import { useUniversalViewTracking } from "@/hooks/useUniversalViewTracking";
import { SEOHead } from "@/components/SEOHead";

interface Profile {
  full_name: string;
  company_name: string;
  phone: string;
  mobile_number: string;
  email: string;
  location: string;
}

interface SparePart {
  id: string;
  name: string;
  brand: string;
  model: string;
  part_number: string;
  price: number;
  currency: string;
  description: string;
  location: string;
  state: string;
  pincode: string;
  images: string[];
  specifications: Record<string, any>;
  category_tags: string[];
  quantity: number;
  seller_id: string;
  condition: string;
  main_category: string;
  sub_category: string;
  custom_category: string;
  compatible_robots: string[];
  is_international: boolean;
  shipping_amount: number;
  duty_amount: number;
  profiles: Profile;
}

interface Robot {
  id: string;
  name: string;
  brand: string;
  model: string;
  robot_type: string;
  price: number;
  currency: string;
  images: string[];
  condition: string;
  location: string;
}

const SparePartDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { trackButtonClick } = useButtonTracking();
  const { trackItemView } = useUniversalViewTracking();

  const [sparePart, setSparePart] = useState<SparePart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [compatibleRobots, setCompatibleRobots] = useState<Robot[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [logistics, setLogistics] = useState<any[]>([]);
  const [financing, setFinancing] = useState<any[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Track page view on sparePart load
  useEffect(() => {
    if (id && sparePart) {
      trackItemView("spare_parts", id, sparePart);
    }
  }, [id, sparePart, trackItemView]);

  // Fetch spare part details and associated data
  const fetchData = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("spare_parts")
        .select(
          `
          *,
          profiles!spare_parts_seller_id_fkey(
            full_name,
            company_name,
            phone,
            mobile_number,
            email,
            location
          )
        `,
        )
        .eq("id", id)
        .single();

      if (error) throw error;

      setSparePart(data as SparePart);

      if (data.compatible_robots?.length) {
        fetchCompatibleRobots(data.compatible_robots, data.brand);
      }

      fetchServices();
      fetchLogistics();
      fetchFinancing();
    } catch (err: any) {
      setError(err.message || "Failed to load spare part details");
      toast({
        title: "Error",
        description: err.message || "Failed to load spare part details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  // Fetch compatible robots based on list or brand
  const fetchCompatibleRobots = useCallback(async (compatibleList: string[], brand: string) => {
    try {
      const { data, error } = await supabase
        .from("robots")
        .select("*")
        .or(`robot_type.in.(${compatibleList.map((r) => `"${r}"`).join(",")}),brand.ilike.%${brand}%`)
        .limit(6);

      if (!error && data) {
        setCompatibleRobots(data);
      }
    } catch (err) {
      console.error("Error fetching compatible robots:", err);
    }
  }, []);

  // Fetch related services (maintenance, repair primarily)
  const fetchServices = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("services")
        .select("*, profiles!services_provider_id_fkey(*)")
        .or("service_type.eq.maintenance,service_type.eq.repair")
        .limit(4);
      if (!error && data) {
        setServices(data);
      }
    } catch (err) {
      console.error("Error fetching services:", err);
    }
  }, []);

  // Fetch logistics providers
  const fetchLogistics = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("account_type", "logistics")
        .not("logistics_type", "is", null)
        .limit(4);
      if (!error && data) {
        setLogistics(data);
      }
    } catch (err) {
      console.error("Error fetching logistics providers:", err);
    }
  }, []);

  // Fetch financing options for equipment loans
  const fetchFinancing = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("loan_products")
        .select("*, profiles!loan_products_provider_id_fkey(*)")
        .contains("loan_type", ["equipment"])
        .limit(4);
      if (!error && data) {
        setFinancing(data);
      }
    } catch (err) {
      console.error("Error fetching financing options:", err);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle adding to wishlist with tracking
  const handleAddToWatchlist = async () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to add items to your watchlist",
        variant: "destructive",
      });
      return;
    }
    await trackButtonClick({
      buttonName: "Add to Watchlist",
      buttonType: "watchlist",
      sellerId: sparePart?.seller_id,
      itemId: sparePart?.id,
      itemType: "spare_part",
    });
    toast({
      title: "Added to Watchlist",
      description: "This spare part has been added to your watchlist.",
    });
  };

  // Image carousel navigation
  const nextImage = () => {
    if (!sparePart?.images) return;
    setCurrentImageIndex((idx) => (idx + 1) % sparePart.images.length);
  };

  const prevImage = () => {
    if (!sparePart?.images) return;
    setCurrentImageIndex((idx) => (idx === 0 ? sparePart.images.length - 1 : idx - 1));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !sparePart) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">{error || "Spare part not found"}</p>
            <Button onClick={() => navigate("/parts")} className="mt-4 w-full" variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Parts
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasImages = sparePart.images?.length > 0;
  const currentImage = hasImages ? sparePart.images[currentImageIndex] : null;

  return (
    <>
      <SEOHead
        title={`${sparePart.name} - ${sparePart.brand} ${sparePart.model} | Spare Parts`}
        description={
          sparePart.description?.slice(0, 155) ||
          `Quality ${sparePart.name} spare part from ${sparePart.profiles?.company_name || "verified seller"}`
        }
        keywords={[
          sparePart.name,
          sparePart.brand,
          sparePart.model,
          sparePart.part_number,
          sparePart.main_category,
          "spare parts",
          "robot parts",
          "industrial parts",
        ]
          .filter(Boolean)
          .join(", ")}
        canonical={`https://robotverse.in/parts/${id}`}
        ogImage={currentImage || "/robotverse-logo.png"}
      />

      <div className="min-h-screen bg-background">
        <EnhancedHeader />

        <div className="container mx-auto px-4 py-8">
          {/* Back Button */}
          <Button variant="ghost" onClick={() => navigate("/parts")} className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Parts
          </Button>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Images */}
            <div className="lg:col-span-5">
              <Card>
                <CardContent className="p-6">
                  {hasImages ? (
                    <div className="space-y-4">
                      <div className="relative aspect-square bg-muted rounded-lg overflow-hidden group">
                        <ResponsiveImage
                          src={currentImage!}
                          alt={sparePart.name}
                          className="w-full h-full object-contain"
                        />
                        {sparePart.images.length > 1 && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background"
                              onClick={prevImage}
                              aria-label="Previous Image"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background"
                              onClick={nextImage}
                              aria-label="Next Image"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute bottom-2 right-2 bg-background/80 hover:bg-background"
                          onClick={() => {
                            /* handle enlarge image modal if implemented */
                          }}
                          aria-label="Enlarge Image"
                        >
                          <Maximize2 className="w-4 h-4" />
                        </Button>
                      </div>

                      {sparePart.images.length > 1 && (
                        <div className="grid grid-cols-5 gap-2">
                          {sparePart.images.map((img, idx) => (
                            <button
                              key={idx}
                              onClick={() => setCurrentImageIndex(idx)}
                              className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                                idx === currentImageIndex
                                  ? "border-primary"
                                  : "border-transparent hover:border-primary/50"
                              }`}
                              aria-label={`View image ${idx + 1}`}
                            >
                              <ResponsiveImage
                                src={img}
                                alt={`${sparePart.name} view ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                      <Building className="w-24 h-24 text-muted-foreground/30" />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Details and Actions */}
            <div className="lg:col-span-7">
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-2xl lg:text-3xl">{sparePart.name}</CardTitle>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="secondary">{sparePart.brand}</Badge>
                        <Badge variant="outline">{sparePart.condition}</Badge>
                        {sparePart.main_category && <Badge variant="outline">{sparePart.main_category}</Badge>}
                        {sparePart.is_international && <Badge variant="default">International</Badge>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <ViewCountDisplay targetType="robots" targetId={sparePart.id} />
                    </div>
                  </div>

                  <div className="flex items-baseline gap-2 mt-4">
                    <span className="text-3xl font-bold text-primary">
                      {sparePart.currency} {sparePart.price.toLocaleString()}
                    </span>
                    {sparePart.quantity > 1 && (
                      <span className="text-sm text-muted-foreground">({sparePart.quantity} available)</span>
                    )}
                  </div>

                  {sparePart.part_number && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Part #: <span className="font-mono">{sparePart.part_number}</span>
                    </p>
                  )}
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-3">
                    {user && sparePart.seller_id !== user.id && (
                      <ChatButton
                        otherUserId={sparePart.seller_id}
                        itemId={sparePart.id}
                        itemType="spare_part"
                        itemName={sparePart.name}
                      />
                    )}

                    <Button variant="outline" onClick={handleAddToWatchlist}>
                      <Heart className="w-4 h-4 mr-2" />
                      Add to Wishlist
                    </Button>

                    <Button variant="outline" disabled title="AI Analysis for spare parts coming soon">
                      <Brain className="w-4 h-4 mr-2" />
                      AI Analysis (Coming Soon)
                    </Button>
                  </div>

                  <Separator />

                  {/* Seller Info */}
                  <div className="space-y-2">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Building className="w-4 h-4" />
                      Seller Information
                    </h3>
                    {sparePart.profiles?.company_name && (
                      <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Building className="w-4 h-4" /> {sparePart.profiles.company_name}
                      </p>
                    )}
                    {(sparePart.location || sparePart.state || sparePart.pincode) && (
                      <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4" />{" "}
                        {[sparePart.location, sparePart.state, sparePart.pincode].filter(Boolean).join(", ")}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Tabbed Details Section */}
          <div className="mt-8">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="specifications">Specifications</TabsTrigger>
                <TabsTrigger value="compatible">Compatible Robots</TabsTrigger>
                <TabsTrigger value="services">Services</TabsTrigger>
                <TabsTrigger value="logistics">Logistics</TabsTrigger>
                <TabsTrigger value="financing">Financing</TabsTrigger>
              </TabsList>

              {/* Overview */}
              <TabsContent value="overview">
                <Card>
                  <CardHeader>
                    <CardTitle>Product Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {sparePart.description && (
                      <p className="whitespace-pre-wrap text-muted-foreground">{sparePart.description}</p>
                    )}

                    {sparePart.is_international && (
                      <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg mt-4">
                        <h4 className="font-semibold flex items-center gap-2 mb-2">
                          <Truck className="w-4 h-4" /> International Shipping Available
                        </h4>
                        {sparePart.shipping_amount > 0 && (
                          <p className="text-sm">
                            Shipping: {sparePart.currency} {sparePart.shipping_amount.toLocaleString()}
                          </p>
                        )}
                        {sparePart.duty_amount > 0 && (
                          <p className="text-sm">
                            Duty: {sparePart.currency} {sparePart.duty_amount.toLocaleString()}
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Specifications */}
              <TabsContent value="specifications">
                <Card>
                  <CardHeader>
                    <CardTitle>Technical Specifications</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Static specs */}
                    <SpecDetail label="Brand" value={sparePart.brand} />
                    <SpecDetail label="Model" value={sparePart.model} />
                    {sparePart.part_number && <SpecDetail label="Part Number" value={sparePart.part_number} />}
                    <SpecDetail label="Condition" value={sparePart.condition} badge />
                    <SpecDetail label="Category" value={sparePart.main_category} />
                    <SpecDetail label="Sub-Category" value={sparePart.sub_category} />

                    {/* Dynamic specifications */}
                    {sparePart.specifications &&
                      Object.entries(sparePart.specifications).map(([key, val]) => (
                        <SpecDetail key={key} label={key.replace(/_/g, " ")} value={String(val)} />
                      ))}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Compatible Robots */}
              <TabsContent value="compatible">
                <Card>
                  <CardHeader>
                    <CardTitle>Compatible Robots</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {sparePart.compatible_robots.length > 0 ? (
                      <>
                        <div className="flex flex-wrap gap-2 mb-4">
                          {sparePart.compatible_robots.map((robot, idx) => (
                            <Badge key={idx} variant="secondary">
                              {robot}
                            </Badge>
                          ))}
                        </div>
                        {compatibleRobots.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {compatibleRobots.map((robot) => (
                              <RobotCard key={robot.id} robot={robot} onClick={() => navigate(`/robots/${robot.id}`)} />
                            ))}
                          </div>
                        ) : (
                          <p>No compatible robots available.</p>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <Badge variant="secondary" className="text-lg px-4 py-2">
                          Universal Part - Compatible with Multiple Robots
                        </Badge>
                        <p className="text-sm text-muted-foreground mt-4">
                          This part can be used with various robot models. Contact seller for compatibility.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Services */}
              <TabsContent value="services">
                <Card>
                  <CardHeader>
                    <CardTitle>Available Services</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {services.length > 0 ? (
                      <ServiceList services={services} />
                    ) : (
                      <p className="text-center text-muted-foreground py-8">No services available at the moment</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Logistics */}
              <TabsContent value="logistics">
                <Card>
                  <CardHeader>
                    <CardTitle>Logistics Providers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {logistics.length > 0 ? (
                      logistics.map((provider) => (
                        <LogisticsCard key={provider.id} provider={provider} sparePart={sparePart} />
                      ))
                    ) : (
                      <p className="text-center text-muted-foreground py-8">No logistics providers available</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Financing */}
              <TabsContent value="financing">
                <Card>
                  <CardHeader>
                    <CardTitle>Financing Options</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {financing.length > 0 ? (
                      financing.map((option) => <FinancingCard key={option.id} option={option} />)
                    ) : (
                      <p className="text-center text-muted-foreground py-8">No financing options available</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </>
  );
};

// Utility Small Components to keep SparePartDetails clean

const SpecDetail = ({
  label,
  value,
  badge,
}: {
  label: string;
  value: string | number | null | undefined;
  badge?: boolean;
}) => {
  if (!value) return null;
  return (
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground capitalize">{label}</p>
      {badge ? <Badge>{value}</Badge> : <p className="font-semibold">{value}</p>}
    </div>
  );
};

const RobotCard = ({ robot, onClick }: { robot: any; onClick: () => void }) => (
  <Card onClick={onClick} className="cursor-pointer hover:shadow-lg transition-shadow">
    <CardContent className="p-4">
      <div className="aspect-video bg-muted rounded-lg mb-3 overflow-hidden">
        {robot.images?.[0] ? (
          <ResponsiveImage src={robot.images[0]} alt={robot.name} className="w-full h-full object-contain" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Building className="w-12 h-12 text-muted-foreground/30" />
          </div>
        )}
      </div>
      <h4 className="font-semibold text-sm mb-1 truncate">{robot.name}</h4>
      <p className="text-xs text-muted-foreground truncate">{robot.brand}</p>
      <p className="text-sm font-bold text-primary mt-2">
        {robot.currency} {robot.price?.toLocaleString()}
      </p>
    </CardContent>
  </Card>
);

const ServiceList = ({ services }: { services: any[] }) => (
  <div className="grid gap-4">
    {services.map((service) => (
      <Card key={service.id}>
        <CardContent>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="font-semibold mb-1">{service.name}</h3>
              <p className="text-sm text-muted-foreground mb-2">{service.description}</p>
              <div className="flex items-center gap-2 text-sm">
                <Building className="w-4 h-4" />
                {service.profiles?.company_name}
              </div>
            </div>
            <ChatButton
              otherUserId={service.provider_id}
              itemId={service.id}
              itemType="service"
              itemName={service.name}
            />
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

const LogisticsCard = ({ provider, sparePart }: { provider: any; sparePart: SparePart }) => (
  <Card>
    <CardContent>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="font-semibold mb-1">{provider.company_name}</h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" />
            {provider.location}
          </div>
          {provider.logistics_type && (
            <Badge variant="outline" className="mt-2">
              {provider.logistics_type}
            </Badge>
          )}
        </div>
        <ChatButton
          otherUserId={provider.user_id}
          itemId={sparePart.id}
          itemType="spare_part"
          itemName={sparePart.name}
        />
      </div>
    </CardContent>
  </Card>
);

const FinancingCard = ({ option }: { option: any }) => (
  <Card>
    <CardContent>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="font-semibold mb-1">{option.product_name}</h3>
          <p className="text-sm text-muted-foreground mb-2">{option.description}</p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">
              {option.min_interest_rate}% - {option.max_interest_rate}% Interest
            </Badge>
            <Badge variant="outline">Up to ₹{option.max_amount.toLocaleString()}</Badge>
          </div>
        </div>
        <ChatButton
          otherUserId={option.provider_id}
          itemId={option.id}
          itemType="service"
          itemName={option.product_name}
        />
      </div>
    </CardContent>
  </Card>
);

export default SparePartDetails;
