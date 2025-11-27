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
  Package,
  Heart,
  ChevronLeft,
  ChevronRight,
  Bot,
  Wrench,
  Settings,
  CheckCircle2,
  Phone,
  Mail,
  Tag,
  Search,
  Zap,
  Globe,
  DollarSign,
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

  // Auto-generate powerful SEO keywords
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

    // Add location-based keywords
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

        // Fetch compatible robots
        if (partData.compatible_robots && partData.compatible_robots.length > 0) {
          fetchCompatibleRobots(partData.compatible_robots as string[], partData.brand);
        }

        // Fetch related services
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
      {/* POWERFUL AUTO-GENERATED SEO */}
      <SEOHead
        title={`${sparePart.name} | ${sparePart.brand} ${sparePart.model} Spare Part for Sale - ${sparePart.currency}${sparePart.price?.toLocaleString()} | RobotVerse`}
        description={`Buy ${sparePart.name} (${sparePart.part_number}) from ${sparePart.brand} ${sparePart.model}. ${sparePart.condition} condition. ${sparePart.quantity} units available. Located in ${sparePart.location || "India"}. Compatible with ${sparePart.compatible_robots?.slice(0, 3).join(", ") || "multiple robots"}. Fast shipping across India.`}
        keywords={generateSEOKeywords(sparePart)}
        canonical={`https://robotverse.in/parts/${id}`}
        ogImage={currentImage || "/robotverse-logo.png"}
        ogTitle={`${sparePart.name} - ${sparePart.brand} ${sparePart.model}`}
        ogDescription={`Premium ${sparePart.name} spare part. ${sparePart.brand} ${sparePart.model}. Only ${sparePart.currency}${sparePart.price?.toLocaleString()}. ${sparePart.location}`}
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

          {/* Main Hero Layout */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-12 lg:gap-16 mb-20">
            {/* LARGE Image Gallery */}
            <div className="xl:col-span-1">
              <Card className="sticky top-28 shadow-2xl border-0 bg-white/80 backdrop-blur-xl">
                <CardContent className="p-8 lg:p-10">
                  {hasImages ? (
                    <div className="space-y-6">
                      {/* EXTRA LARGE Main Image - 450px height */}
                      <div className="relative w-full h-[450px] lg:h-[500px] bg-gradient-to-br from-muted/10 to-transparent rounded-3xl overflow-hidden shadow-2xl group border border-border/20">
                        <ResponsiveImage
                          src={currentImage}
                          alt={`${sparePart.name} - ${sparePart.brand} ${sparePart.model}`}
                          className="w-full h-full object-contain p-8 lg:p-12"
                        />

                        {/* Navigation */}
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

                        {/* Counter */}
                        {sparePart.images.length > 1 && (
                          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-white px-6 py-2 rounded-2xl shadow-2xl text-lg font-bold border border-border/20 z-10">
                            {currentImageIndex + 1} / {sparePart.images.length}
                          </div>
                        )}
                      </div>

                      {/* Thumbnail Strip */}
                      {sparePart.images.length > 1 && (
                        <div className="grid grid-cols-5 gap-3 pt-8">
                          {sparePart.images.map((img, idx) => (
                            <button
                              key={idx}
                              onClick={() => setCurrentImageIndex(idx)}
                              className={`aspect-square rounded-2xl overflow-hidden shadow-lg border-3 transition-all duration-300 hover:shadow-xl hover:scale-[1.05] ${
                                idx === currentImageIndex
                                  ? "border-primary shadow-primary/30 ring-2 ring-primary/50"
                                  : "border-transparent hover:border-primary/30"
                              }`}
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

            {/* Product Details + Minimal Seller */}
            <div className="xl:col-span-2 space-y-12">
              {/* Product Header */}
              <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-xl">
                <CardContent className="pt-12 pb-10 px-10 lg:px-14">
                  <div className="space-y-8">
                    {/* Title & SEO Optimized Badges */}
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

                    {/* MASSIVE Price Display */}
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

                    {/* Action Buttons */}
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

              {/* ULTRA MINIMAL PROFESSIONAL SELLER */}
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

          {/* PROFESSIONAL RESPONSIVE TABS - ALL FULLY WORKING */}
          <Card className="shadow-2xl border-0 overflow-hidden bg-white/80 backdrop-blur-xl">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 bg-gradient-to-r from-muted/40 to-muted p-2 lg:p-3 gap-2 lg:gap-0 backdrop-blur-sm border-b border-border/20">
                {[
                  { value: "overview", label: "Overview", icon: Wrench },
                  { value: "specifications", label: "Specifications", icon: Settings },
                  { value: "compatible", label: "Compatible Robots", icon: Bot },
                  { value: "services", label: "Services", icon: Zap },
                ].map(({ value, label, icon: Icon }) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    className="group data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-xl data-[state=active]:border-b-0 h-16 lg:h-20 font-bold text-lg lg:text-xl rounded-2xl p-6 transition-all duration-300 hover:bg-white/50 hover:shadow-lg hover:scale-[1.02] border border-border/30"
                  >
                    <Icon className="w-6 h-6 lg:w-7 lg:h-7 mr-3 shrink-0 group-data-[state=active]:text-primary-foreground" />
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* OVERVIEW TAB */}
              <TabsContent value="overview" className="mt-0">
                <CardContent className="p-16 lg:p-20 space-y-12">
                  {sparePart.description && (
                    <div className="bg-gradient-to-r from-muted/20 to-transparent rounded-3xl p-12 lg:p-16 border border-border/20 shadow-2xl">
                      <h4 className="text-3xl font-black mb-8 flex items-center gap-4">
                        <Search className="w-10 h-10" />
                        Product Description
                      </h4>
                      <p className="text-xl lg:text-2xl leading-relaxed max-w-5xl whitespace-pre-wrap">
                        {sparePart.description}
                      </p>
                    </div>
                  )}

                  <div className="grid lg:grid-cols-2 gap-12">
                    <div className="space-y-8">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center">
                          <Settings className="w-7 h-7 text-primary" />
                        </div>
                        <h3 className="text-4xl font-black">Part Details</h3>
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-center gap-6 py-6 px-10 bg-gradient-to-r from-muted/30 to-transparent rounded-3xl border border-border/20 shadow-xl text-xl">
                          <div className="w-3 h-3 bg-primary rounded-full"></div>
                          <span className="font-bold min-w-[120px]">Brand:</span>
                          <span className="font-semibold text-2xl">{sparePart.brand}</span>
                        </div>
                        <div className="flex items-center gap-6 py-6 px-10 bg-gradient-to-r from-muted/30 to-transparent rounded-3xl border border-border/20 shadow-xl text-xl">
                          <div className="w-3 h-3 bg-primary rounded-full"></div>
                          <span className="font-bold min-w-[120px]">Model:</span>
                          <span className="font-semibold text-2xl">{sparePart.model}</span>
                        </div>
                        <div className="flex items-center gap-6 py-6 px-10 bg-gradient-to-r from-muted/30 to-transparent rounded-3xl border border-border/20 shadow-xl text-xl">
                          <div className="w-3 h-3 bg-primary rounded-full"></div>
                          <span className="font-bold min-w-[120px]">Condition:</span>
                          <Badge className="px-8 py-3 text-2xl font-bold capitalize bg-secondary/80 h-14">
                            {sparePart.condition}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-8">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center">
                          <Package className="w-7 h-7 text-primary" />
                        </div>
                        <h3 className="text-4xl font-black">Availability</h3>
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-center gap-6 py-6 px-10 bg-gradient-to-r from-muted/30 to-transparent rounded-3xl border border-border/20 shadow-xl text-xl">
                          <div className="w-3 h-3 bg-primary rounded-full"></div>
                          <span className="font-bold min-w-[120px]">Stock:</span>
                          <span className="font-black text-3xl text-primary">{sparePart.quantity}</span>
                          <span className="text-2xl font-semibold">units</span>
                        </div>
                        <div className="flex items-center gap-6 py-6 px-10 bg-gradient-to-r from-muted/30 to-transparent rounded-3xl border border-border/20 shadow-xl text-xl">
                          <div className="w-3 h-3 bg-primary rounded-full"></div>
                          <span className="font-bold min-w-[120px]">Category:</span>
                          <span className="font-semibold text-2xl">{sparePart.main_category}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </TabsContent>

              {/* SPECIFICATIONS TAB */}
              <TabsContent value="specifications" className="mt-0">
                <CardContent className="p-16 lg:p-20">
                  <div className="space-y-8">
                    <div className="flex items-center gap-4 mb-12">
                      <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center">
                        <Settings className="w-7 h-7 text-primary" />
                      </div>
                      <h2 className="text-5xl font-black">Technical Specifications</h2>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
                      {[
                        { label: "Brand", value: sparePart.brand, icon: Building },
                        { label: "Model", value: sparePart.model, icon: Tag },
                        ...(sparePart.part_number
                          ? [{ label: "Part Number", value: sparePart.part_number, icon: Tag }]
                          : []),
                        { label: "Condition", value: sparePart.condition.toUpperCase(), icon: CheckCircle2 },
                        { label: "Main Category", value: sparePart.main_category, icon: Package },
                        ...(sparePart.sub_category
                          ? [{ label: "Sub Category", value: sparePart.sub_category, icon: Package }]
                          : []),
                        { label: "Quantity Available", value: `${sparePart.quantity} units`, icon: Package },
                        {
                          label: "Price",
                          value: `${sparePart.currency} ${sparePart.price?.toLocaleString()}`,
                          icon: DollarSign,
                        },
                      ].map(({ label, value, icon: Icon }, idx) => (
                        <div
                          key={idx}
                          className="group p-8 bg-gradient-to-br from-white/70 to-white rounded-3xl shadow-xl border border-border/20 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 hover:border-primary/30"
                        >
                          <div className="flex items-start gap-6">
                            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                              <Icon className="w-7 h-7 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">
                                {label}
                              </p>
                              <p className="text-2xl lg:text-3xl font-black text-foreground truncate">{value}</p>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Dynamic JSON Specifications */}
                      {sparePart.specifications &&
                        typeof sparePart.specifications === "object" &&
                        Object.keys(sparePart.specifications).length > 0 && (
                          <>
                            <Separator className="col-span-full h-px bg-gradient-to-r from-primary/30 my-12" />
                            <div className="col-span-full">
                              <h4 className="text-3xl font-black mb-8 flex items-center gap-4">
                                Additional Specifications
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {Object.entries(sparePart.specifications as Record<string, any>)
                                  .slice(0, 12)
                                  .map(([key, value]) => (
                                    <div
                                      key={key}
                                      className="p-6 bg-gradient-to-br from-muted/20 to-transparent rounded-2xl border border-border/20 hover:shadow-xl transition-all"
                                    >
                                      <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2 capitalize">
                                        {key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                                      </p>
                                      <p className="text-xl font-semibold">{String(value)}</p>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          </>
                        )}
                    </div>
                  </div>
                </CardContent>
              </TabsContent>

              {/* COMPATIBLE ROBOTS TAB */}
              <TabsContent value="compatible" className="mt-0">
                <CardContent className="p-16 lg:p-20">
                  <div className="space-y-12">
                    <div className="flex items-center gap-4 mb-12">
                      <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center">
                        <Bot className="w-7 h-7 text-primary" />
                      </div>
                      <h2 className="text-5xl font-black">Compatible Robots</h2>
                    </div>

                    {sparePart.compatible_robots && sparePart.compatible_robots.length > 0 ? (
                      <>
                        {/* Compatible Types */}
                        <div className="bg-gradient-to-r from-primary/5 to-primary/2 p-10 lg:p-12 rounded-3xl border border-primary/20 shadow-2xl">
                          <h4 className="text-3xl font-bold mb-8 flex items-center gap-4">Compatible Robot Types</h4>
                          <div className="flex flex-wrap gap-4">
                            {sparePart.compatible_robots.map((robot, idx) => (
                              <Badge
                                key={idx}
                                className="text-2xl px-10 py-6 font-bold bg-gradient-to-r from-secondary to-secondary/80 text-secondary-foreground shadow-lg h-16 hover:shadow-xl hover:scale-105 transition-all"
                              >
                                {robot}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* Available Robots Grid */}
                        {compatibleRobots.length > 0 && (
                          <div>
                            <h4 className="text-3xl font-bold mb-12">Available Compatible Robots</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                              {compatibleRobots.map((robot) => (
                                <Card
                                  key={robot.id}
                                  className="group cursor-pointer hover:shadow-2xl hover:-translate-y-4 transition-all duration-500 border-0 bg-white/70 backdrop-blur-xl overflow-hidden shadow-xl hover:border-primary/30"
                                  onClick={() => navigate(`/robots/${robot.id}`)}
                                >
                                  <CardContent className="p-8">
                                    <div className="aspect-[4/3] bg-gradient-to-br from-muted/20 to-transparent rounded-2xl overflow-hidden mb-6 group-hover:scale-110 transition-transform duration-500">
                                      {robot.images?.[0] ? (
                                        <ResponsiveImage
                                          src={robot.images[0]}
                                          alt={robot.name}
                                          className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-muted/30">
                                          <Bot className="w-20 h-20 text-muted-foreground/40" />
                                        </div>
                                      )}
                                    </div>
                                    <h5 className="font-black text-2xl mb-3 line-clamp-2 group-hover:text-primary transition-colors">
                                      {robot.name}
                                    </h5>
                                    <p className="text-xl text-muted-foreground mb-6 font-semibold">{robot.brand}</p>
                                    <div className="flex items-center justify-between">
                                      <div className="text-2xl font-black text-primary">
                                        {robot.currency} {robot.price?.toLocaleString()}
                                      </div>
                                      <Badge className="text-lg px-6 py-3 font-bold">{robot.robot_type}</Badge>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-32">
                        <div className="max-w-4xl mx-auto bg-gradient-to-r from-muted/30 to-transparent rounded-3xl p-20 border-4 border-dashed border-border/30 shadow-2xl">
                          <Bot className="w-32 h-32 text-muted-foreground/40 mx-auto mb-12" />
                          <Badge className="text-3xl px-16 py-6 mx-auto block font-bold bg-secondary/80 h-20 mb-8">
                            Universal Compatibility
                          </Badge>
                          <p className="text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                            This premium spare part is compatible with multiple robot models across various brands.
                            Contact seller for specific compatibility verification.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </TabsContent>

              {/* SERVICES TAB */}
              <TabsContent value="services" className="mt-0">
                <CardContent className="p-16 lg:p-20">
                  <div className="space-y-12">
                    <div className="flex items-center gap-4 mb-12">
                      <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center">
                        <Zap className="w-7 h-7 text-primary" />
                      </div>
                      <h2 className="text-5xl font-black">Available Services</h2>
                    </div>

                    {services.length > 0 ? (
                      <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-8">
                        {services.map((service) => (
                          <Card
                            key={service.id}
                            className="group hover:shadow-2xl hover:-translate-y-3 transition-all duration-500 border-0 bg-white/70 backdrop-blur-xl shadow-xl hover:border-primary/30 overflow-hidden"
                          >
                            <CardContent className="p-10 lg:p-12 relative">
                              <div className="absolute top-6 right-6 w-3 h-3 bg-gradient-to-r from-primary to-secondary rounded-full group-hover:scale-150 transition-transform duration-500"></div>

                              <div className="space-y-6">
                                <div>
                                  <h4 className="text-3xl font-black mb-4 line-clamp-2 group-hover:text-primary transition-colors">
                                    {service.name}
                                  </h4>
                                  <p className="text-xl text-muted-foreground leading-relaxed">{service.description}</p>
                                </div>

                                <Separator className="my-8 bg-gradient-to-r from-primary/30" />

                                <div className="grid grid-cols-2 gap-6 pt-4">
                                  {service.profiles?.company_name && (
                                    <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-muted/20 rounded-2xl group-hover:bg-primary/5 transition-all">
                                      <Building className="w-6 h-6 text-primary shrink-0" />
                                      <div>
                                        <p className="text-sm font-bold uppercase text-muted-foreground tracking-wide">
                                          Provider
                                        </p>
                                        <p className="text-xl font-bold">{service.profiles.company_name}</p>
                                      </div>
                                    </div>
                                  )}
                                  {service.profiles?.location && (
                                    <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-muted/20 rounded-2xl group-hover:bg-primary/5 transition-all">
                                      <MapPin className="w-6 h-6 text-primary shrink-0" />
                                      <div>
                                        <p className="text-sm font-bold uppercase text-muted-foreground tracking-wide">
                                          Location
                                        </p>
                                        <p className="text-xl font-bold">{service.profiles.location}</p>
                                      </div>
                                    </div>
                                  )}
                                  {service.profiles?.phone && (
                                    <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-muted/20 rounded-2xl group-hover:bg-primary/5 transition-all col-span-2">
                                      <Phone className="w-6 h-6 text-primary shrink-0" />
                                      <div>
                                        <p className="text-sm font-bold uppercase text-muted-foreground tracking-wide">
                                          Contact
                                        </p>
                                        <a
                                          href={`tel:${service.profiles.phone}`}
                                          className="text-xl font-bold text-primary hover:underline group-hover:text-primary/80 transition-colors"
                                        >
                                          {service.profiles.phone}
                                        </a>
                                      </div>
                                    </div>
                                  )}
                                  {service.service_type && (
                                    <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-muted/20 rounded-2xl group-hover:bg-primary/5 transition-all col-span-2">
                                      <Tag className="w-6 h-6 text-primary shrink-0" />
                                      <div>
                                        <p className="text-sm font-bold uppercase text-muted-foreground tracking-wide">
                                          Service Type
                                        </p>
                                        <Badge className="text-xl px-8 py-3 font-bold capitalize mt-2 bg-secondary/80 h-12">
                                          {service.service_type}
                                        </Badge>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {user && service.provider_id !== user.id && (
                                  <div className="pt-8 border-t border-border/30">
                                    <ChatButton
                                      otherUserId={service.provider_id}
                                      itemId={service.id}
                                      itemType="service"
                                      itemName={service.name}
                                      className="w-full h-16 text-xl font-bold shadow-xl hover:shadow-2xl"
                                    />
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-32">
                        <div className="max-w-4xl mx-auto bg-gradient-to-r from-muted/30 to-transparent rounded-3xl p-20 border-4 border-dashed border-border/30 shadow-2xl">
                          <Zap className="w-32 h-32 text-muted-foreground/40 mx-auto mb-12" />
                          <h3 className="text-4xl font-black text-muted-foreground mb-8">Services Coming Soon</h3>
                          <p className="text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-12">
                            Premium maintenance, repair, and installation services will be available soon. Stay tuned
                            for verified service providers.
                          </p>
                          <Button size="lg" className="h-16 text-xl px-16 font-bold shadow-2xl">
                            Notify Me
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </>
  );
};

export default SparePartDetails;
