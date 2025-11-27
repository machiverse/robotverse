import { useState, useEffect } from "react";
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
  Phone,
  Mail,
  Tag,
  Package,
  Heart,
  Download,
  Settings,
  Truck,
  DollarSign,
  Brain,
  MessageSquare,
  Eye,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Bot,
  Wrench,
} from "lucide-react";
import ViewCountDisplay from "@/components/ViewCountDisplay";
import EnhancedHeader from "@/components/EnhancedHeader";
import { ComprehensiveAIMarketAnalysis } from "@/components/ComprehensiveAIMarketAnalysis";
import { ChatButton } from "@/components/chat/ChatButton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";
import { useButtonTracking } from "@/hooks/useButtonTracking";
import { useUniversalViewTracking } from "@/hooks/useUniversalViewTracking";
import { SEOHead } from "@/components/SEOHead";
import type { Json } from "@/integrations/supabase/types";

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
  specifications: Json;
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
  profiles: {
    full_name: string;
    company_name: string;
    phone: string;
    mobile_number: string;
    email: string;
    location: string;
  };
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
  const [compatibleRobots, setCompatibleRobots] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [logistics, setLogistics] = useState<any[]>([]);
  const [financing, setFinancing] = useState<any[]>([]);
  const [isAIAnalysisOpen, setIsAIAnalysisOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);

  // Track page view
  useEffect(() => {
    if (id && sparePart) {
      trackItemView("spare_parts", id, sparePart);
    }
  }, [id, sparePart, trackItemView]);

  // Fetch spare part details
  useEffect(() => {
    const fetchSparePartDetails = async () => {
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
        setSparePart(data as unknown as SparePart);

        // Fetch compatible robots
        if (data.compatible_robots && data.compatible_robots.length > 0) {
          fetchCompatibleRobots(data.compatible_robots as string[], data.brand);
        }

        // Fetch related services
        fetchServices(data.main_category);

        // Fetch logistics providers
        fetchLogistics();

        // Fetch financing options
        fetchFinancing();
      } catch (err: any) {
        console.error("Error fetching spare part:", err);
        setError(err.message);
        toast({
          title: "Error",
          description: "Failed to load spare part details",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSparePartDetails();
  }, [id]);

  const fetchCompatibleRobots = async (compatibleList: string[], brand: string) => {
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
  };

  const fetchServices = async (category: string) => {
    try {
      const { data, error } = await supabase
        .from("services")
        .select("*, profiles!services_provider_id_fkey(*)")
        .or(`service_type.eq.maintenance,service_type.eq.repair`)
        .limit(4);

      if (!error && data) {
        setServices(data);
      }
    } catch (err) {
      console.error("Error fetching services:", err);
    }
  };

  const fetchLogistics = async () => {
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
      console.error("Error fetching logistics:", err);
    }
  };

  const fetchFinancing = async () => {
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
      console.error("Error fetching financing:", err);
    }
  };

  const handleAddToWatchlist = async () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to add items to your watchlist",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Added to Watchlist",
      description: "This spare part has been added to your watchlist",
    });
  };

  const nextImage = () => {
    if (sparePart && sparePart.images) {
      setCurrentImageIndex((prev) => (prev + 1) % sparePart.images.length);
    }
  };

  const prevImage = () => {
    if (sparePart && sparePart.images) {
      setCurrentImageIndex((prev) => (prev === 0 ? sparePart.images.length - 1 : prev - 1));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !sparePart) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">{error || "Spare part not found"}</p>
            <Button onClick={() => navigate("/parts")} className="w-full mt-4" variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Parts
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasImages = sparePart.images && sparePart.images.length > 0;
  const currentImage = hasImages ? sparePart.images[currentImageIndex] : null;

  return (
    <>
      <SEOHead
        title={`${sparePart.name} - ${sparePart.brand} ${sparePart.model} | Spare Parts`}
        description={`${sparePart.description?.slice(0, 155) || `Quality ${sparePart.name} spare part from ${sparePart.profiles?.company_name || "verified seller"}`}`}
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

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Section - Images */}
            <div className="lg:col-span-5">
              <Card>
                <CardContent className="p-6">
                  {hasImages ? (
                    <div className="space-y-4">
                      {/* Main Image */}
                      <div className="relative aspect-square bg-muted rounded-lg overflow-hidden group">
                        <ResponsiveImage
                          src={currentImage}
                          alt={sparePart.name}
                          className="w-full h-full object-contain"
                        />

                        {/* Image Controls */}
                        {sparePart.images.length > 1 && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background"
                              onClick={prevImage}
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background"
                              onClick={nextImage}
                            >
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </>
                        )}

                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute bottom-2 right-2 bg-background/80 hover:bg-background"
                          onClick={() => setShowImageModal(true)}
                        >
                          <Maximize2 className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Thumbnail Gallery */}
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
                      <Package className="w-24 h-24 text-muted-foreground/30" />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Section - Details */}
            <div className="lg:col-span-7">
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-2xl lg:text-3xl mb-2">{sparePart.name}</CardTitle>
                      <div className="flex flex-wrap gap-2 mb-4">
                        <Badge variant="secondary">{sparePart.brand}</Badge>
                        <Badge variant="outline">{sparePart.condition}</Badge>
                        {sparePart.main_category && <Badge variant="outline">{sparePart.main_category}</Badge>}
                        {sparePart.is_international && <Badge variant="default">International</Badge>}
                      </div>
                      <ViewCountDisplay targetType="spare_parts" targetId={sparePart.id} className="mt-2" />
                    </div>
                  </div>

                  {/* Price */}
                  <div className="flex items-baseline gap-2 mt-4">
                    <span className="text-3xl font-bold text-primary">
                      {sparePart.currency} {sparePart.price?.toLocaleString()}
                    </span>
                    {sparePart.quantity > 1 && (
                      <span className="text-sm text-muted-foreground">({sparePart.quantity} available)</span>
                    )}
                  </div>

                  {/* Part Number */}
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
                    <Button
                      variant="outline"
                      onClick={async () => {
                        await trackButtonClick({
                          buttonName: "Add to Wishlist - Spare Part",
                          buttonType: "watchlist",
                          sellerId: sparePart.seller_id,
                          itemId: sparePart.id,
                          itemType: "spare_part",
                        });
                        handleAddToWatchlist();
                      }}
                    >
                      <Heart className="w-4 h-4 mr-2" />
                      Add to Wishlist
                    </Button>
                    {sparePart.profiles && (
                      <Button variant="outline" disabled title="AI Analysis for spare parts coming soon">
                        <Brain className="w-4 h-4 mr-2" />
                        AI Analysis (Coming Soon)
                      </Button>
                    )}
                  </div>

                  <Separator />

                  {/* Seller Info */}
                  <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Building className="w-4 h-4" />
                      Seller Information
                    </h3>
                    <div className="grid gap-2 text-sm">
                      {sparePart.profiles?.company_name && (
                        <p className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-muted-foreground" />
                          {sparePart.profiles.company_name}
                        </p>
                      )}
                      {sparePart.location && (
                        <p className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          {sparePart.location}
                          {sparePart.state && `, ${sparePart.state}`}
                          {sparePart.pincode && ` - ${sparePart.pincode}`}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Tabs Section */}
          <div className="mt-8">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-6 h-auto p-1 bg-muted/50">
                <TabsTrigger value="overview" className="data-[state=active]:bg-background">
                  Overview
                </TabsTrigger>
                <TabsTrigger value="specifications" className="data-[state=active]:bg-background">
                  Specifications
                </TabsTrigger>
                <TabsTrigger value="compatible" className="data-[state=active]:bg-background">
                  Compatible Robots
                </TabsTrigger>
                <TabsTrigger value="services" className="data-[state=active]:bg-background">
                  Services
                </TabsTrigger>
                <TabsTrigger value="logistics" className="data-[state=active]:bg-background">
                  Logistics
                </TabsTrigger>
                <TabsTrigger value="financing" className="data-[state=active]:bg-background">
                  Financing
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="p-8">
                <div className="space-y-8">
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Wrench className="w-6 h-6 text-primary" />
                      <h3 className="text-2xl font-bold">About This Part</h3>
                    </div>

                    {/* Part Description */}
                    {sparePart.description && (
                      <div className="bg-gradient-to-r from-muted/40 to-muted/20 rounded-xl p-6 border border-border/50">
                        <p className="text-base leading-relaxed text-foreground whitespace-pre-wrap">
                          {sparePart.description}
                        </p>
                      </div>
                    )}

                    {/* Key Details Grid */}
                    <div className="grid md:grid-cols-2 gap-8">
                      {/* Part Information */}
                      <div className="space-y-4">
                        <h4 className="flex items-center gap-2 font-bold text-lg">
                          <Settings className="w-5 h-5 text-primary" />
                          Part Information
                        </h4>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3 text-base">
                            <span className="w-2.5 h-2.5 bg-primary rounded-full"></span>
                            <span className="font-semibold min-w-[140px]">Brand:</span>
                            <span className="text-muted-foreground">{sparePart.brand}</span>
                          </div>
                          <div className="flex items-center gap-3 text-base">
                            <span className="w-2.5 h-2.5 bg-primary rounded-full"></span>
                            <span className="font-semibold min-w-[140px]">Model:</span>
                            <span className="text-muted-foreground">{sparePart.model}</span>
                          </div>
                          {sparePart.part_number && (
                            <div className="flex items-center gap-3 text-base">
                              <span className="w-2.5 h-2.5 bg-primary rounded-full"></span>
                              <span className="font-semibold min-w-[140px]">Part Number:</span>
                              <span className="text-muted-foreground font-mono">{sparePart.part_number}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-3 text-base">
                            <span className="w-2.5 h-2.5 bg-primary rounded-full"></span>
                            <span className="font-semibold min-w-[140px]">Condition:</span>
                            <span className="text-muted-foreground capitalize">{sparePart.condition}</span>
                          </div>
                        </div>
                      </div>

                      {/* Availability & Pricing */}
                      <div className="space-y-4">
                        <h4 className="flex items-center gap-2 font-bold text-lg">
                          <Package className="w-5 h-5 text-primary" />
                          Availability & Pricing
                        </h4>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3 text-base">
                            <span className="w-2.5 h-2.5 bg-primary rounded-full"></span>
                            <span className="font-semibold min-w-[140px]">Quantity:</span>
                            <span className="text-muted-foreground">{sparePart.quantity} units</span>
                          </div>
                          <div className="flex items-center gap-3 text-base">
                            <span className="w-2.5 h-2.5 bg-primary rounded-full"></span>
                            <span className="font-semibold min-w-[140px]">Category:</span>
                            <span className="text-muted-foreground">{sparePart.main_category}</span>
                          </div>
                          {sparePart.sub_category && (
                            <div className="flex items-center gap-3 text-base">
                              <span className="w-2.5 h-2.5 bg-primary rounded-full"></span>
                              <span className="font-semibold min-w-[140px]">Sub-Category:</span>
                              <span className="text-muted-foreground">{sparePart.sub_category}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* International Shipping 
                    {sparePart.is_international && (
                      <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 p-6 rounded-xl border border-blue-200 dark:border-blue-800">
                        <h4 className="flex items-center gap-2 font-bold text-lg mb-4">
                          <Truck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          International Shipping Available
                        </h4>
                        <div className="grid md:grid-cols-2 gap-4">
                          {sparePart.shipping_amount > 0 && (
                            <div className="flex items-center gap-3">
                              <span className="w-2.5 h-2.5 bg-blue-600 rounded-full"></span>
                              <span className="font-semibold">Shipping Cost:</span>
                              <span className="text-muted-foreground">{sparePart.currency} {sparePart.shipping_amount.toLocaleString()}</span>
                            </div>
                          )}
                          {sparePart.duty_amount > 0 && (
                            <div className="flex items-center gap-3">
                              <span className="w-2.5 h-2.5 bg-blue-600 rounded-full"></span>
                              <span className="font-semibold">Import Duty:</span>
                              <span className="text-muted-foreground">{sparePart.currency} {sparePart.duty_amount.toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}*/}

                    {/* Compatible Robots Tags */}
                    {sparePart.compatible_robots && sparePart.compatible_robots.length > 0 && (
                      <div className="space-y-4">
                        <h4 className="flex items-center gap-2 font-bold text-lg">
                          <Bot className="w-5 h-5 text-primary" />
                          Compatible With
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {sparePart.compatible_robots.map((robot, idx) => (
                            <Badge key={idx} variant="secondary" className="text-sm px-3 py-1">
                              {robot}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Specifications Tab */}
              <TabsContent value="specifications" className="p-8">
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <Settings className="w-6 h-6 text-primary" />
                    Technical Specifications
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex justify-between border-b border-border/50 py-3">
                      <span className="font-semibold">Brand</span>
                      <span className="text-muted-foreground">{sparePart.brand}</span>
                    </div>
                    <div className="flex justify-between border-b border-border/50 py-3">
                      <span className="font-semibold">Model</span>
                      <span className="text-muted-foreground">{sparePart.model}</span>
                    </div>
                    {sparePart.part_number && (
                      <div className="flex justify-between border-b border-border/50 py-3">
                        <span className="font-semibold">Part Number</span>
                        <span className="text-muted-foreground font-mono">{sparePart.part_number}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-b border-border/50 py-3">
                      <span className="font-semibold">Condition</span>
                      <Badge variant="secondary" className="capitalize">
                        {sparePart.condition}
                      </Badge>
                    </div>
                    {sparePart.main_category && (
                      <div className="flex justify-between border-b border-border/50 py-3">
                        <span className="font-semibold">Main Category</span>
                        <span className="text-muted-foreground">{sparePart.main_category}</span>
                      </div>
                    )}
                    {sparePart.sub_category && (
                      <div className="flex justify-between border-b border-border/50 py-3">
                        <span className="font-semibold">Sub-Category</span>
                        <span className="text-muted-foreground">{sparePart.sub_category}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-b border-border/50 py-3">
                      <span className="font-semibold">Quantity Available</span>
                      <span className="text-muted-foreground">{sparePart.quantity}</span>
                    </div>
                    <div className="flex justify-between border-b border-border/50 py-3">
                      <span className="font-semibold">Price</span>
                      <span className="text-muted-foreground">
                        {sparePart.currency} {sparePart.price?.toLocaleString()}
                      </span>
                    </div>

                    {/* Additional Specifications from JSON */}
                    {sparePart.specifications &&
                      typeof sparePart.specifications === "object" &&
                      !Array.isArray(sparePart.specifications) &&
                      Object.keys(sparePart.specifications).length > 0 &&
                      Object.entries(sparePart.specifications as Record<string, any>).map(([key, value]) => (
                        <div key={key} className="flex justify-between border-b border-border/50 py-3">
                          <span className="font-semibold capitalize">{key.replace(/_/g, " ")}</span>
                          <span className="text-muted-foreground">{String(value)}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </TabsContent>

              {/* Compatible Robots Tab */}
              <TabsContent value="compatible" className="p-8">
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <Bot className="w-6 h-6 text-primary" />
                    Compatible Robots
                  </h3>

                  {sparePart.compatible_robots && sparePart.compatible_robots.length > 0 ? (
                    <div className="space-y-6">
                      <div className="bg-gradient-to-r from-muted/40 to-muted/20 rounded-xl p-6 border border-border/50">
                        <h4 className="font-semibold mb-4">Compatible Robot Types</h4>
                        <div className="flex flex-wrap gap-2">
                          {sparePart.compatible_robots.map((robot, idx) => (
                            <Badge key={idx} variant="secondary" className="text-sm px-4 py-2">
                              {robot}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {compatibleRobots.length > 0 && (
                        <div className="space-y-4">
                          <h4 className="font-semibold text-lg">Available Compatible Robots</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {compatibleRobots.map((robot) => (
                              <Card
                                key={robot.id}
                                className="cursor-pointer hover:shadow-xl transition-all hover:-translate-y-1 border-border/50"
                                onClick={() => navigate(`/robots/${robot.id}`)}
                              >
                                <CardContent className="p-5">
                                  <div className="aspect-video bg-gradient-to-br from-muted/30 to-muted/10 rounded-lg mb-4 overflow-hidden">
                                    {robot.images?.[0] ? (
                                      <ResponsiveImage
                                        src={robot.images[0]}
                                        alt={robot.name}
                                        className="w-full h-full object-contain hover:scale-110 transition-transform duration-300"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <Bot className="w-16 h-16 text-muted-foreground/20" />
                                      </div>
                                    )}
                                  </div>
                                  <h4 className="font-bold text-base mb-1 line-clamp-1">{robot.name}</h4>
                                  <p className="text-sm text-muted-foreground mb-3">{robot.brand}</p>
                                  <div className="flex items-center justify-between">
                                    <p className="text-base font-bold text-primary">
                                      {robot.currency} {robot.price?.toLocaleString()}
                                    </p>
                                    <Badge variant="outline" className="text-xs">
                                      {robot.robot_type}
                                    </Badge>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="bg-gradient-to-r from-muted/40 to-muted/20 rounded-xl p-8 border border-border/50">
                        <Badge variant="secondary" className="text-lg px-6 py-3 mb-4">
                          Universal Part
                        </Badge>
                        <p className="text-base text-muted-foreground mt-4 max-w-lg mx-auto">
                          This is a universal spare part compatible with multiple robot models. Contact the seller for
                          specific compatibility confirmation.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Services Tab */}
              <TabsContent value="services" className="p-8">
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <Wrench className="w-6 h-6 text-primary" />
                    Available Services
                  </h3>

                  {services.length > 0 ? (
                    <div className="grid gap-6">
                      {services.map((service) => (
                        <Card key={service.id} className="border-border/50 hover:shadow-lg transition-all">
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 space-y-4">
                                <div>
                                  <h4 className="font-bold text-lg mb-2">{service.name}</h4>
                                  <p className="text-muted-foreground leading-relaxed">{service.description}</p>
                                </div>

                                <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-border/50">
                                  <div className="flex items-center gap-2">
                                    <Building className="w-4 h-4 text-primary" />
                                    <div>
                                      <p className="text-xs text-muted-foreground">Service Provider</p>
                                      <p className="font-semibold">{service.profiles?.company_name || "N/A"}</p>
                                    </div>
                                  </div>
                                  {service.profiles?.location && (
                                    <div className="flex items-center gap-2">
                                      <MapPin className="w-4 h-4 text-primary" />
                                      <div>
                                        <p className="text-xs text-muted-foreground">Location</p>
                                        <p className="font-semibold">{service.profiles.location}</p>
                                      </div>
                                    </div>
                                  )}
                                  {service.profiles?.phone && (
                                    <div className="flex items-center gap-2">
                                      <Phone className="w-4 h-4 text-primary" />
                                      <div>
                                        <p className="text-xs text-muted-foreground">Contact</p>
                                        <p className="font-semibold">{service.profiles.phone}</p>
                                      </div>
                                    </div>
                                  )}
                                  {service.service_type && (
                                    <div className="flex items-center gap-2">
                                      <Tag className="w-4 h-4 text-primary" />
                                      <div>
                                        <p className="text-xs text-muted-foreground">Service Type</p>
                                        <Badge variant="secondary" className="mt-1 capitalize">
                                          {service.service_type}
                                        </Badge>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-col gap-2">
                                <ChatButton
                                  otherUserId={service.provider_id}
                                  itemId={service.id}
                                  itemType="service"
                                  itemName={service.name}
                                />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16">
                      <div className="bg-gradient-to-r from-muted/40 to-muted/20 rounded-xl p-8 border border-border/50">
                        <Wrench className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                        <p className="text-muted-foreground">No services available at the moment</p>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Logistics Tab 
              <TabsContent value="logistics" className="p-8">
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <Truck className="w-6 h-6 text-primary" />
                    Logistics Providers
                  </h3>

                  {logistics.length > 0 ? (
                    <div className="grid gap-6">
                      {logistics.map((provider) => (
                        <Card key={provider.id} className="border-border/50 hover:shadow-lg transition-all">
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 space-y-4">
                                <div>
                                  <h4 className="font-bold text-lg mb-2">{provider.company_name}</h4>
                                  {provider.logistics_type && (
                                    <Badge variant="secondary" className="capitalize">
                                      {provider.logistics_type}
                                    </Badge>
                                  )}
                                </div>

                                <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-border/50">
                                  <div className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-primary" />
                                    <div>
                                      <p className="text-xs text-muted-foreground">Location</p>
                                      <p className="font-semibold">{provider.location || "N/A"}</p>
                                    </div>
                                  </div>
                                  {provider.phone && (
                                    <div className="flex items-center gap-2">
                                      <Phone className="w-4 h-4 text-primary" />
                                      <div>
                                        <p className="text-xs text-muted-foreground">Contact</p>
                                        <p className="font-semibold">{provider.phone}</p>
                                      </div>
                                    </div>
                                  )}
                                  {provider.email && (
                                    <div className="flex items-center gap-2">
                                      <Mail className="w-4 h-4 text-primary" />
                                      <div>
                                        <p className="text-xs text-muted-foreground">Email</p>
                                        <p className="font-semibold text-sm">{provider.email}</p>
                                      </div>
                                    </div>
                                  )}
                                  {provider.logistics_region && (
                                    <div className="flex items-center gap-2">
                                      <Tag className="w-4 h-4 text-primary" />
                                      <div>
                                        <p className="text-xs text-muted-foreground">Region</p>
                                        <p className="font-semibold">{provider.logistics_region}</p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-col gap-2">
                                <ChatButton
                                  otherUserId={provider.user_id}
                                  itemId={sparePart.id}
                                  itemType="spare_part"
                                  itemName={sparePart.name}
                                />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16">
                      <div className="bg-gradient-to-r from-muted/40 to-muted/20 rounded-xl p-8 border border-border/50">
                        <Truck className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                        <p className="text-muted-foreground">No logistics providers available</p>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>*/}

              {/* Financing Tab 
              <TabsContent value="financing" className="p-8">
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <DollarSign className="w-6 h-6 text-primary" />
                    Financing Options
                  </h3>

                  {financing.length > 0 ? (
                    <div className="grid gap-6">
                      {financing.map((option) => (
                        <Card key={option.id} className="border-border/50 hover:shadow-lg transition-all">
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 space-y-4">
                                <div>
                                  <h4 className="font-bold text-lg mb-2">{option.product_name}</h4>
                                  <p className="text-muted-foreground leading-relaxed">{option.description}</p>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                  <Badge variant="secondary" className="px-3 py-1">
                                    {option.min_interest_rate}% - {option.max_interest_rate}% Interest
                                  </Badge>
                                  <Badge variant="outline" className="px-3 py-1">
                                    Up to ₹{option.max_amount.toLocaleString()}
                                  </Badge>
                                  {option.max_tenure_months && (
                                    <Badge variant="outline" className="px-3 py-1">
                                      {option.max_tenure_months} months tenure
                                    </Badge>
                                  )}
                                </div>

                                <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-border/50">
                                  <div className="flex items-center gap-2">
                                    <Building className="w-4 h-4 text-primary" />
                                    <div>
                                      <p className="text-xs text-muted-foreground">Finance Provider</p>
                                      <p className="font-semibold">{option.profiles?.company_name || "N/A"}</p>
                                    </div>
                                  </div>
                                  {option.profiles?.location && (
                                    <div className="flex items-center gap-2">
                                      <MapPin className="w-4 h-4 text-primary" />
                                      <div>
                                        <p className="text-xs text-muted-foreground">Location</p>
                                        <p className="font-semibold">{option.profiles.location}</p>
                                      </div>
                                    </div>
                                  )}
                                  {option.profiles?.phone && (
                                    <div className="flex items-center gap-2">
                                      <Phone className="w-4 h-4 text-primary" />
                                      <div>
                                        <p className="text-xs text-muted-foreground">Contact</p>
                                        <p className="font-semibold">{option.profiles.phone}</p>
                                      </div>
                                    </div>
                                  )}
                                  {option.loan_type && option.loan_type.length > 0 && (
                                    <div className="flex items-center gap-2">
                                      <Tag className="w-4 h-4 text-primary" />
                                      <div>
                                        <p className="text-xs text-muted-foreground">Loan Types</p>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {option.loan_type.map((type: string, idx: number) => (
                                            <Badge key={idx} variant="outline" className="text-xs capitalize">
                                              {type}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-col gap-2">
                                <ChatButton
                                  otherUserId={option.provider_id}
                                  itemId={option.id}
                                  itemType="service"
                                  itemName={option.product_name}
                                />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16">
                      <div className="bg-gradient-to-r from-muted/40 to-muted/20 rounded-xl p-8 border border-border/50">
                        <DollarSign className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                        <p className="text-muted-foreground">No financing options available</p>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>*/}
            </Tabs>
          </div>
        </div>
      </div>

      {/* AI Analysis disabled for spare parts - needs dedicated implementation */}
    </>
  );
};

export default SparePartDetails;
