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
  Settings,
  Bot,
  Wrench,
  Globe,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
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
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState("overview");

  // Generate SEO keywords for metadata
  const generateSEOKeywords = (part: SparePart) => {
    const keywords = [
      part.name,
      part.brand,
      part.model,
      part.part_number,
      `${part.brand} ${part.model}`,
      `${part.name} for sale`,
      `${part.brand} spare parts`,
      `${part.main_category} parts`,
      `${part.condition} ${part.name}`,
      "industrial robot parts",
      "robot spare parts India",
      `${part.brand} ${part.model} replacement`,
      "buy robot parts online",
      `${part.location} robot parts`,
      part.compatible_robots?.join(", ") || "",
    ].filter(Boolean);

    if (part.location) {
      keywords.push(`${part.name} ${part.location}`, `${part.brand} parts ${part.location}`);
    }

    return keywords.slice(0, 20).join(", ");
  };

  useEffect(() => {
    if (id && sparePart) {
      trackItemView("spare_parts", id, sparePart);
    }
  }, [id, sparePart, trackItemView]);

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
        const partData = data as unknown as SparePart;
        setSparePart(partData);

        if (partData.compatible_robots && partData.compatible_robots.length > 0) {
          fetchCompatibleRobots(partData.compatible_robots as string[], partData.brand);
        }

        fetchServices(partData.main_category);
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
        .limit(8);
      if (!error && data) setCompatibleRobots(data);
    } catch (err) {
      console.error("Error fetching compatible robots:", err);
    }
  };

  const fetchServices = async (category: string) => {
    try {
      const { data, error } = await supabase
        .from("services")
        .select("*, profiles!services_provider_id_fkey(*)")
        .or(`service_type.eq.maintenance,service_type.eq.repair,service_type.eq.installation`)
        .limit(8);
      if (!error && data) setServices(data);
    } catch (err) {
      console.error("Error fetching services:", err);
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
    if (sparePart?.images) {
      setCurrentImageIndex((prev) => (prev + 1) % sparePart.images.length);
    }
  };

  const prevImage = () => {
    if (sparePart?.images) {
      setCurrentImageIndex((prev) => (prev === 0 ? sparePart.images.length - 1 : prev - 1));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !sparePart) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-2xl w-full">
          <CardContent className="pt-12 pb-12">
            <p className="text-2xl text-center text-muted-foreground mb-8">{error || "Spare part not found"}</p>
            <Button onClick={() => navigate("/parts")} className="w-full h-12 text-lg" variant="outline">
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Parts Catalog
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
        title={`${sparePart.name} | ${sparePart.brand} ${sparePart.model} Spare Part for Sale - ${sparePart.currency}${sparePart.price?.toLocaleString()} | RobotVerse`}
        description={`Buy ${sparePart.name} (${sparePart.part_number}) from ${sparePart.brand} ${sparePart.model}. ${sparePart.condition} condition. ${sparePart.quantity} units available. Located in ${
          sparePart.location || "India"
        }. Compatible with ${sparePart.compatible_robots?.slice(0, 3).join(", ") || "multiple robots"}. Fast shipping across India.`}
        keywords={generateSEOKeywords(sparePart)}
        canonical={`https://robotverse.in/parts/${id}`}
        ogImage={currentImage || "/robotverse-logo.png"}
        ogTitle={`${sparePart.name} - ${sparePart.brand} ${sparePart.model}`}
        ogDescription={`Premium ${sparePart.name} spare part. ${sparePart.brand} ${sparePart.model}. Only ${
          sparePart.currency
        }${sparePart.price?.toLocaleString()}. ${sparePart.location}`}
        twitterCard="summary_large_image"
      />

      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
        <EnhancedHeader />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => navigate("/parts")}
            className="mb-12 text-lg font-medium h-12 px-6 hover:bg-primary/5"
          >
            <ArrowLeft className="w-5 h-5 mr-3" />
            Back to Parts Catalog
          </Button>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-12 lg:gap-16 mb-20">
            {/* Image gallery */}
            <div className="xl:col-span-1">
              <Card className="sticky top-28 shadow-2xl border-0 bg-white/80 backdrop-blur-xl">
                <CardContent className="p-8 lg:p-10">
                  {hasImages ? (
                    <div className="space-y-6">
                      <div className="relative w-full h-[450px] lg:h-[500px] bg-gradient-to-br from-muted/10 to-transparent rounded-3xl overflow-hidden shadow-2xl group border border-border/20">
                        <ResponsiveImage
                          src={currentImage}
                          alt={`${sparePart.name} - ${sparePart.brand} ${sparePart.model}`}
                          className="w-full h-full object-contain p-8 lg:p-12"
                          loading="eager"
                        />
                        {sparePart.images.length > 1 && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 hover:bg-white shadow-xl opacity-0 lg:group-hover:opacity-100 transition-all duration-300 border-2 border-white/50"
                              onClick={prevImage}
                            >
                              <ChevronLeft className="w-6 h-6" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 hover:bg-white shadow-xl opacity-0 lg:group-hover:opacity-100 transition-all duration-300 border-2 border-white/50"
                              onClick={nextImage}
                            >
                              <ChevronRight className="w-6 h-6" />
                            </Button>
                          </>
                        )}
                        {sparePart.images.length > 1 && (
                          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-white px-6 py-2 rounded-2xl shadow-2xl text-lg font-bold border border-border/20 z-10">
                            {currentImageIndex + 1} / {sparePart.images.length}
                          </div>
                        )}
                      </div>
                      {sparePart.images.length > 1 && (
                        <div className="grid grid-cols-5 gap-3 pt-8">
                          {sparePart.images.map((img, idx) => (
                            <button
                              key={idx}
                              onClick={() => setCurrentImageIndex(idx)}
                              className={`aspect-square rounded-2xl overflow-hidden shadow-lg border-3 transition-all duration-300 hover:shadow-xl hover:scale-[1.05] ${idx === currentImageIndex ? "border-primary shadow-primary/30 ring-2 ring-primary/50" : "border-transparent hover:border-primary/30"}`}
                            >
                              <ResponsiveImage
                                src={img}
                                alt={`View ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-[450px] lg:h-[500px] bg-gradient-to-br from-muted to-muted/30 rounded-3xl flex items-center justify-center shadow-2xl border-2 border-dashed border-border/50">
                      <Package className="w-32 h-32 text-muted-foreground/40" />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Product info and seller */}
            <div className="xl:col-span-2 space-y-12">
              {/* Product header */}
              <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-xl">
                <CardContent className="pt-12 pb-10 px-10 lg:px-14">
                  <div className="space-y-8">
                    <div>
                      <CardTitle className="text-5xl lg:text-6xl xl:text-7xl font-black leading-tight mb-6 tracking-tight">
                        {sparePart.name}
                      </CardTitle>
                      <div className="flex flex-wrap gap-3 mb-8">
                        <Badge className="text-xl px-8 py-4 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-bold shadow-lg h-14">
                          {sparePart.brand}
                        </Badge>
                        <Badge variant="secondary" className="text-xl px-8 py-4 h-14 font-bold shadow-lg">
                          {sparePart.condition.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className="text-xl px-8 py-4 h-14 font-bold shadow-lg border-2">
                          {sparePart.main_category}
                        </Badge>
                      </div>
                    </div>

                    <Separator className="h-px bg-gradient-to-r from-primary/30 to-transparent my-8" />
                    <div className="space-y-4">
                      <div className="flex items-baseline gap-6">
                        <span className="text-7xl lg:text-8xl xl:text-9xl font-black bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent tracking-[-0.05em]">
                          {sparePart.currency}
                          <span className="text-6xl lg:text-7xl xl:text-8xl ml-2">
                            {sparePart.price?.toLocaleString()}
                          </span>
                        </span>
                        {sparePart.quantity > 1 && (
                          <div className="text-2xl font-bold text-muted-foreground bg-muted/50 px-6 py-3 rounded-2xl shadow-lg">
                            {sparePart.quantity} Units Available
                          </div>
                        )}
                      </div>
                      {sparePart.part_number && (
                        <div className="flex items-center gap-4 text-2xl font-mono font-bold bg-muted/50 px-8 py-4 rounded-2xl shadow-lg">
                          <Tag className="w-8 h-8 text-primary" />
                          Part Number: {sparePart.part_number}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-8">
                      {user && sparePart.seller_id !== user.id && (
                        <ChatButton
                          otherUserId={sparePart.seller_id}
                          itemId={sparePart.id}
                          itemType="spare_part"
                          itemName={sparePart.name}
                          className="h-20 text-xl font-bold shadow-2xl hover:shadow-3xl bg-gradient-to-r from-primary to-primary/90"
                        />
                      )}
                      <Button
                        variant="outline"
                        className="h-20 text-xl font-bold shadow-2xl hover:shadow-3xl border-4 border-border hover:border-primary/50 bg-white/50 backdrop-blur-sm"
                        onClick={handleAddToWatchlist}
                      >
                        <Heart className="w-7 h-7 mr-4" />
                        Add to Wishlist
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-2xl border-0 bg-gradient-to-br from-primary/5 to-primary/2 backdrop-blur-xl border-primary/20">
                <CardContent className="p-8 lg:p-10 flex items-center gap-6">
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shadow-2xl border-2 border-primary/30 shrink-0">
                    <Building className="w-9 h-9 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold uppercase tracking-widest text-primary bg-primary/10 px-4 py-1 rounded-full inline-block mb-3">
                      Verified Seller
                    </p>
                    <h3 className="text-3xl lg:text-4xl font-black truncate">
                      {sparePart.profiles?.company_name || "Premium Seller"}
                    </h3>
                    {sparePart.location && (
                      <div className="flex items-center gap-3 mt-4 text-xl font-semibold text-muted-foreground">
                        <MapPin className="w-6 h-6" />
                        <span className="truncate">
                          {sparePart.location}
                          {sparePart.state && `, ${sparePart.state}`}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Tabs Section */}
          <Card className="shadow-2xl border-0 overflow-hidden bg-white/80 backdrop-blur-xl">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 bg-gradient-to-r from-muted/40 to-muted p-2 lg:p-3 gap-2 lg:gap-0 backdrop-blur-sm border-b border-border/20">
                <TabsTrigger
                  value="overview"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-xl data-[state=active]:border-b-0 h-16 lg:h-20 font-bold text-lg lg:text-xl rounded-2xl p-6 transition-all duration-300 hover:bg-white/50 hover:shadow-lg hover:scale-[1.02] border border-border/30"
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="specifications"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-xl data-[state=active]:border-b-0 h-16 lg:h-20 font-bold text-lg lg:text-xl rounded-2xl p-6 transition-all duration-300 hover:bg-white/50 hover:shadow-lg hover:scale-[1.02] border border-border/30"
                >
                  Specifications
                </TabsTrigger>
                <TabsTrigger
                  value="compatible"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-xl data-[state=active]:border-b-0 h-16 lg:h-20 font-bold text-lg lg:text-xl rounded-2xl p-6 transition-all duration-300 hover:bg-white/50 hover:shadow-lg hover:scale-[1.02] border border-border/30"
                >
                  Compatible Robots
                </TabsTrigger>
                <TabsTrigger
                  value="services"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-xl data-[state=active]:border-b-0 h-16 lg:h-20 font-bold text-lg lg:text-xl rounded-2xl p-6 transition-all duration-300 hover:bg-white/50 hover:shadow-lg hover:scale-[1.02] border border-border/30"
                >
                  Services
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab Content */}
              <TabsContent value="overview" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Wrench className="w-5 h-5" />
                      About This Spare Part
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {sparePart.description && (
                      <div className="bg-muted/50 rounded-lg p-4 border border-border/50">
                        <p className="text-base leading-relaxed whitespace-pre-wrap">{sparePart.description}</p>
                      </div>
                    )}

                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Part Info */}
                      <div className="space-y-3">
                        <h4 className="font-bold text-base flex items-center gap-2">
                          <Settings className="w-4 h-4 text-primary" />
                          Part Information
                        </h4>
                        <div className="space-y-2">
                          <div className="flex justify-between py-2 border-b border-border/30">
                            <span className="font-semibold text-sm">Brand:</span>
                            <span className="text-muted-foreground">{sparePart.brand}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-border/30">
                            <span className="font-semibold text-sm">Model:</span>
                            <span className="text-muted-foreground">{sparePart.model}</span>
                          </div>
                          {sparePart.part_number && (
                            <div className="flex justify-between py-2 border-b border-border/30">
                              <span className="font-semibold text-sm">Part #:</span>
                              <span className="text-muted-foreground font-mono text-sm">{sparePart.part_number}</span>
                            </div>
                          )}
                          <div className="flex justify-between py-2">
                            <span className="font-semibold text-sm">Condition:</span>
                            <Badge variant="secondary" className="capitalize">
                              {sparePart.condition}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Availability & Pricing */}
                      <div className="space-y-3">
                        <h4 className="font-bold text-base flex items-center gap-2">
                          <Package className="w-4 h-4 text-primary" />
                          Availability & Pricing
                        </h4>
                        <div className="space-y-2">
                          <div className="flex justify-between py-2 border-b border-border/30">
                            <span className="font-semibold text-sm">Quantity:</span>
                            <span className="text-muted-foreground">{sparePart.quantity} units</span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-border/30">
                            <span className="font-semibold text-sm">Category:</span>
                            <span className="text-muted-foreground">{sparePart.main_category}</span>
                          </div>
                          {sparePart.sub_category && (
                            <div className="flex justify-between py-2 border-b border-border/30">
                              <span className="font-semibold text-sm">Sub-Category:</span>
                              <span className="text-muted-foreground">{sparePart.sub_category}</span>
                            </div>
                          )}
                          <div className="flex justify-between py-2">
                            <span className="font-semibold text-sm">Price:</span>
                            <span className="font-bold text-primary">
                              {sparePart.currency} {sparePart.price?.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Compatible Robots */}
                    {sparePart.compatible_robots && sparePart.compatible_robots.length > 0 && (
                      <div className="space-y-3 pt-4 border-t">
                        <h4 className="font-bold text-base flex items-center gap-2">
                          <Bot className="w-4 h-4 text-primary" />
                          Compatible With
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {sparePart.compatible_robots.map((robot, idx) => (
                            <Badge key={idx} variant="secondary">
                              {robot}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Specifications Tab Content */}
              <TabsContent value="specifications" className="mt-8">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      Technical Specifications
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                          { label: "Brand", value: sparePart.brand },
                          { label: "Model", value: sparePart.model },
                          { label: "Part Number", value: sparePart.part_number },
                          { label: "Condition", value: sparePart.condition },
                          { label: "Main Category", value: sparePart.main_category },
                          { label: "Sub-Category", value: sparePart.sub_category },
                          { label: "Quantity", value: `${sparePart.quantity} units` },
                          {
                            label: "Price",
                            value: `${sparePart.currency} ${sparePart.price?.toLocaleString()}`,
                          },
                        ]
                          .filter(({ value }) => value)
                          .map(({ label, value }, idx) => (
                            <div
                              key={idx}
                              className="flex justify-between py-3 px-3 bg-muted/50 rounded-md border border-border/30"
                            >
                              <span className="font-semibold text-sm">{label}</span>
                              <span className="text-muted-foreground text-sm">{value}</span>
                            </div>
                          ))}
                      </div>

                      {sparePart.specifications &&
                        typeof sparePart.specifications === "object" &&
                        !Array.isArray(sparePart.specifications) &&
                        Object.keys(sparePart.specifications).length > 0 && (
                          <div className="mt-8 pt-6 border-t">
                            <h4 className="font-bold text-base mb-4">Additional Specifications</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {Object.entries(sparePart.specifications as Record<string, any>).map(([key, value]) => (
                                <div
                                  key={key}
                                  className="flex justify-between py-3 px-3 bg-muted/50 rounded-md border border-border/30"
                                >
                                  <span className="font-semibold text-sm capitalize">{key.replace(/_/g, " ")}</span>
                                  <span className="text-muted-foreground text-sm">{String(value)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Compatible Robots Tab Content */}
              <TabsContent value="compatible" className="mt-8">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bot className="w-5 h-5" />
                      Compatible Robots
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {sparePart.compatible_robots && sparePart.compatible_robots.length > 0 ? (
                      <div className="space-y-6">
                        <div className="bg-muted/50 rounded-lg p-4 border border-border/50">
                          <h4 className="font-semibold mb-3">Compatible Types:</h4>
                          <div className="flex flex-wrap gap-2">
                            {sparePart.compatible_robots.map((robot, idx) => (
                              <Badge key={idx} variant="secondary" className="text-sm px-3 py-1.5">
                                {robot}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {compatibleRobots.length > 0 && (
                          <div className="space-y-4">
                            <h4 className="font-semibold text-base">Available Compatible Robots:</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {compatibleRobots.map((robot) => (
                                <Card
                                  key={robot.id}
                                  className="cursor-pointer hover:shadow-lg transition-all border-border/50 hover:border-primary/50"
                                  onClick={() => navigate(`/robots/${robot.id}`)}
                                >
                                  <CardContent className="p-4">
                                    <div className="aspect-video bg-muted/30 rounded-lg mb-3 overflow-hidden">
                                      {robot.images?.[0] ? (
                                        <ResponsiveImage
                                          src={robot.images[0]}
                                          alt={robot.name}
                                          className="w-full h-full object-contain"
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                          <Bot className="w-12 h-12 text-muted-foreground/20" />
                                        </div>
                                      )}
                                    </div>
                                    <h4 className="font-bold text-sm mb-1 line-clamp-1">{robot.name}</h4>
                                    <p className="text-xs text-muted-foreground mb-3">{robot.brand}</p>
                                    <div className="flex items-center justify-between">
                                      <p className="text-sm font-bold text-primary">
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
                        <Badge className="text-base px-6 py-2 mb-4">Universal Part</Badge>
                        <p className="text-muted-foreground mt-4 max-w-lg mx-auto">
                          This is a universal spare part compatible with multiple robot models. Contact the seller for
                          specific compatibility confirmation.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Services Tab Content */}
              <TabsContent value="services" className="mt-8">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Wrench className="w-5 h-5" />
                      Available Services
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {services.length > 0 ? (
                      <div className="space-y-4">
                        {services.map((service) => (
                          <Card
                            key={service.id}
                            className="border-border/50 hover:border-primary/30 hover:shadow-md transition-all"
                          >
                            <CardContent className="p-5">
                              <div className="space-y-4">
                                <div>
                                  <h4 className="font-bold text-base mb-2">{service.name}</h4>
                                  <p className="text-sm text-muted-foreground">{service.description}</p>
                                </div>

                                <Separator className="my-4" />

                                <div className="grid md:grid-cols-2 gap-4">
                                  {service.profiles?.company_name && (
                                    <div className="flex items-center gap-3">
                                      <Building className="w-4 h-4 text-primary" />
                                      <div>
                                        <p className="text-xs font-semibold text-muted-foreground uppercase">
                                          Provider
                                        </p>
                                        <p className="font-semibold text-sm">{service.profiles.company_name}</p>
                                      </div>
                                    </div>
                                  )}
                                  {service.profiles?.location && (
                                    <div className="flex items-center gap-3">
                                      <MapPin className="w-4 h-4 text-primary" />
                                      <div>
                                        <p className="text-xs font-semibold text-muted-foreground uppercase">
                                          Location
                                        </p>
                                        <p className="font-semibold text-sm">{service.profiles.location}</p>
                                      </div>
                                    </div>
                                  )}
                                  {service.profiles?.phone && (
                                    <div className="flex items-center gap-3">
                                      <Phone className="w-4 h-4 text-primary" />
                                      <div>
                                        <p className="text-xs font-semibold text-muted-foreground uppercase">Phone</p>
                                        <a
                                          href={`tel:${service.profiles.phone}`}
                                          className="font-semibold text-sm text-primary hover:underline"
                                        >
                                          {service.profiles.phone}
                                        </a>
                                      </div>
                                    </div>
                                  )}
                                  {service.service_type && (
                                    <div className="flex items-center gap-3">
                                      <Tag className="w-4 h-4 text-primary" />
                                      <div>
                                        <p className="text-xs font-semibold text-muted-foreground uppercase">Type</p>
                                        <Badge variant="secondary" className="capitalize text-xs mt-1">
                                          {service.service_type}
                                        </Badge>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                <Separator className="my-4" />

                                {user && service.provider_id !== user.id && (
                                  <ChatButton
                                    otherUserId={service.provider_id}
                                    itemId={service.id}
                                    itemType="service"
                                    itemName={service.name}
                                    className="w-full"
                                  />
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-16">
                        <Wrench className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                        <p className="text-muted-foreground">No services available at the moment</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </>
  );
};

export default SparePartDetails;
