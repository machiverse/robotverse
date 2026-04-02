import { useState, useEffect, useRef } from "react";
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
  Star,
} from "lucide-react";

import ViewCountDisplay from "@/components/ViewCountDisplay";
import EnhancedHeader from "@/components/EnhancedHeader";
import { ComprehensiveAIMarketAnalysis } from "@/components/ComprehensiveAIMarketAnalysis";
import { ChatButton } from "@/components/chat/ChatButton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useButtonTracking } from "@/hooks/useButtonTracking";
import { useUniversalViewTracking } from "@/hooks/useUniversalViewTracking";
import { SEOHead } from "@/components/SEOHead";
import { useSparePartSEO } from "@/hooks/useSparePartSEO";
import type { Json } from "@/integrations/supabase/types";
import { ListingRatingSummary } from "@/components/reviews/ListingRatingSummary";
import type { SparePartSEOData } from "@/utils/seo";

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
    completed_sales?: number;
    average_rating?: number;
    total_reviews?: number;
  };
}

const SparePartDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { trackButtonClick } = useButtonTracking();
  const { trackItemView } = useUniversalViewTracking();
  const { seoElements, generateSEO } = useSparePartSEO();

  const [sparePart, setSparePart] = useState<SparePart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [compatibleRobots, setCompatibleRobots] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [isAIAnalysisOpen, setIsAIAnalysisOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);

  // Ref to prevent duplicate view counting
  const viewCountedRef = useRef<string | null>(null);

  // Generate SEO when spare part data is loaded
  useEffect(() => {
    if (sparePart) {
      const seoData: SparePartSEOData = {
        id: sparePart.id,
        name: sparePart.name,
        brand: sparePart.brand,
        model: sparePart.model,
        part_number: sparePart.part_number,
        main_category: sparePart.main_category,
        sub_category: sparePart.sub_category,
        condition: sparePart.condition,
        location: sparePart.location,
        state: sparePart.state,
        price: sparePart.price,
        currency: sparePart.currency,
        seller_name: sparePart.profiles?.full_name,
        company_name: sparePart.profiles?.company_name,
        compatible_robots: sparePart.compatible_robots,
        images: sparePart.images,
        description: sparePart.description,
        quantity: sparePart.quantity,
      };
      generateSEO(seoData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sparePart]);

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
            profiles!spare_parts_seller_id_fkey(full_name, company_name, phone, mobile_number, email, location, completed_sales, average_rating, total_reviews)
          `,
          )
          .eq("id", id)
          .single();

        if (error) throw error;
        setSparePart(data as unknown as SparePart);

        // Track spare part view using universal view tracking system (increments view count)
        // Only count view once per page load to prevent duplicate counting
        if (viewCountedRef.current !== data.id) {
          viewCountedRef.current = data.id;
          await trackItemView("spare_parts", data.id, data);

          // Track detailed button interaction for analytics
          await trackButtonClick({
            buttonName: "Spare Part Page View",
            buttonType: "spare_part_page_view",
            sellerId: data.seller_id,
            sellerName: data.profiles?.full_name || "No Name Available",
            sellerCompany: data.profiles?.company_name || "No Company Available",
            sellerEmail: data.profiles?.email || "No Email Available",
            sellerMobile: data.profiles?.mobile_number || data.profiles?.phone || "No Phone Available",
            sellerLocation: data.profiles?.location || data.location || "No Location Available",
            itemId: data.id,
            itemType: "spare_part",
            additionalData: {
              partName: data.name,
              partModel: data.model,
              partNumber: data.part_number,
              brand: data.brand,
              mainCategory: data.main_category,
              subCategory: data.sub_category,
              price: data.price,
              currency: data.currency,
              condition: data.condition,
              location: data.location,
              state: data.state,
              pageType: "spare_part_details",
              viewSource: "direct_page_visit",
              sellerProfileExists: !!data.profiles,
              trackingNote: "Spare part details page view with comprehensive tracking",
            },
          });
        }

        // Fetch compatible robots
        if (data.compatible_robots && data.compatible_robots.length > 0) {
          fetchCompatibleRobots(data.compatible_robots, data.brand);
        }

        // Fetch related services only
        fetchServices(data.main_category);
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
      const data = await supabase
        .from("robots")
        .select("*")
        .or(
          `robot_type.in.(${compatibleList
            .map((r: string) => `"${r}"`)
            .join(",")}),brand.ilike.${brand}`,
        )
        .limit(6);
      if (!data.error && data.data) setCompatibleRobots(data.data);
    } catch (err) {
      console.error("Error fetching compatible robots:", err);
    }
  };

  const fetchServices = async (category: string) => {
    try {
      const { data, error } = await supabase
        .from("services")
        .select("*, profiles!services_provider_id_fkey(*)")
        .or("service_type.eq.maintenance,service_type.eq.repair")
        .limit(4);
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
      {seoElements && (
        <SEOHead
          title={seoElements.pageTitle}
          description={seoElements.metaDescription}
          keywords={`${sparePart.name}, ${sparePart.brand}, ${sparePart.model}, ${sparePart.part_number}, ${sparePart.main_category}, spare parts, robot parts, industrial parts, genuine parts`}
          canonical={`https://robotverse.in/parts/${id}`}
          ogImage={currentImage || "/robotverse-logo.png"}
          jsonLd={seoElements.structuredData}
        />
      )}
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
                      {/* Main Image - Bigger Size */}
                      <div className="relative aspect-[4/3] bg-muted rounded-xl overflow-hidden group shadow-lg">
                        <ResponsiveImage
                          src={currentImage}
                          alt={sparePart.name}
                          className="w-full h-full object-contain scale-105 group-hover:scale-110 transition-transform duration-300"
                        />
                        {/* Image Controls */}
                        {sparePart.images.length > 1 && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute left-3 top-1/2 -translate-y-1/2 bg-background/90 hover:bg-background shadow-lg"
                              onClick={prevImage}
                            >
                              <ChevronLeft className="w-5 h-5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute right-3 top-1/2 -translate-y-1/2 bg-background/90 hover:bg-background shadow-lg"
                              onClick={nextImage}
                            >
                              <ChevronRight className="w-5 h-5" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute bottom-3 right-3 bg-background/90 hover:bg-background shadow-lg"
                          onClick={() => setShowImageModal(true)}
                        >
                          <Maximize2 className="w-5 h-5" />
                        </Button>
                      </div>

                      {/* Thumbnail Gallery */}
                      {sparePart.images.length > 1 && (
                        <div className="grid grid-cols-5 gap-2">
                          {sparePart.images.map((img, idx) => (
                            <button
                              key={idx}
                              onClick={() => setCurrentImageIndex(idx)}
                              className={`aspect-square rounded-lg overflow-hidden border-2 transition-all shadow-sm ${
                                idx === currentImageIndex
                                  ? "border-primary ring-2 ring-primary/50 shadow-primary/25"
                                  : "border-transparent hover:border-primary/50 hover:shadow-md"
                              }`}
                            >
                              <ResponsiveImage
                                src={img}
                                alt={sparePart.name}
                                className="w-full h-full object-cover hover:scale-110 transition-transform duration-200"
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
                      <CardTitle className="text-2xl lg:text-3xl mb-2 font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                        {sparePart.name}
                      </CardTitle>
                      <div className="flex flex-wrap gap-2 mb-4">
                        <Badge
                          variant="secondary"
                          className="text-lg px-4 py-2 font-semibold bg-gradient-to-r from-secondary to-secondary/80"
                        >
                          {sparePart.brand}
                        </Badge>
                        <Badge variant="outline" className="text-lg px-4 py-2">
                          {sparePart.condition}
                        </Badge>
                        <Badge variant="outline" className="text-lg px-4 py-2">
                          {sparePart.main_category}
                        </Badge>
                        {sparePart.is_international && (
                          <Badge variant="default" className="text-lg px-4 py-2 bg-blue-500 hover:bg-blue-600">
                            International
                          </Badge>
                        )}
                      </div>
                      <ViewCountDisplay targetType="spare_parts" targetId={sparePart.id} className="mt-2" />
                    </div>
                  </div>

                  {/* Price - Same color as product name */}
                  <div className="flex items-baseline gap-2 mt-4">
                    <span className="text-4xl lg:text-5xl font-black bg-gradient-to-r from-primary via-primary/90 to-primary/70 bg-clip-text text-transparent tracking-tight">
                      {sparePart.currency} {sparePart.price?.toLocaleString()}
                    </span>
                    {sparePart.quantity > 1 && (
                      <span className="text-sm text-muted-foreground">{sparePart.quantity} available</span>
                    )}
                  </div>

                  {/* Part Number */}
                  {sparePart.part_number && (
                    <p className="text-sm text-muted-foreground mt-2">
                      <span className="font-mono font-semibold text-primary/80">Part #:</span> {sparePart.part_number}
                    </p>
                  )}
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-3">
                    {user && sparePart.seller_id !== user?.id && (
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
                      className="flex-1 min-w-[140px]"
                    >
                      <Heart className="w-4 h-4 mr-2" />
                      Add to Wishlist
                    </Button>
                    <Button variant="outline" disabled title="AI Analysis for spare parts coming soon">
                      <Brain className="w-4 h-4 mr-2" />
                      AI Analysis Coming Soon
                    </Button>
                  </div>

                  {/* Seller Performance */}
                  {(sparePart.profiles?.completed_sales > 0 || sparePart.profiles?.total_reviews > 0) && (
                    <div className="flex items-center gap-4 pt-2">
                      {sparePart.profiles?.average_rating > 0 && (
                        <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/20 px-3 py-1.5 rounded-full">
                          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                          <span className="font-semibold text-sm">{Number(sparePart.profiles.average_rating).toFixed(1)}</span>
                          <span className="text-xs text-muted-foreground">({sparePart.profiles.total_reviews} reviews)</span>
                        </div>
                      )}
                      {sparePart.profiles?.completed_sales > 0 && (
                        <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/20 px-3 py-1.5 rounded-full">
                          <Package className="h-4 w-4 text-emerald-600" />
                          <span className="font-semibold text-sm">{sparePart.profiles.completed_sales} sales</span>
                        </div>
                      )}
                    </div>
                  )}

                </CardContent>
              </Card>
            </div>
          </div>

          {/* Professional Tabs Section - Only 4 tabs now */}
          <div className="mt-12">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-5 h-14 p-1.5 bg-gradient-to-r from-muted to-muted/50 shadow-lg rounded-xl border border-border/50">
                <TabsTrigger
                  value="overview"
                  className="data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:border-primary/50 data-[state=active]:text-primary font-semibold rounded-lg transition-all duration-200"
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="specifications"
                  className="data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:border-primary/50 data-[state=active]:text-primary font-semibold rounded-lg transition-all duration-200"
                >
                  Specifications
                </TabsTrigger>
                <TabsTrigger
                  value="compatible"
                  className="data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:border-primary/50 data-[state=active]:text-primary font-semibold rounded-lg transition-all duration-200"
                >
                  Compatible Robots
                </TabsTrigger>
                <TabsTrigger
                  value="services"
                  className="data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:border-primary/50 data-[state=active]:text-primary font-semibold rounded-lg transition-all duration-200"
                >
                  Services
                </TabsTrigger>
                <TabsTrigger
                  value="reviews"
                  className="data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:border-primary/50 data-[state=active]:text-primary font-semibold rounded-lg transition-all duration-200"
                >
                  Reviews
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="p-8 pt-0">
                <div className="space-y-8">
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Wrench className="w-6 h-6 text-primary" />
                      <h3 className="text-2xl font-bold">About This Part</h3>
                    </div>
                    {/* Part Description */}
                    <div className="bg-gradient-to-r from-muted/40 to-muted/20 rounded-2xl p-8 border border-border/50 shadow-lg">
                      <p className="text-base leading-relaxed text-foreground whitespace-pre-wrap">
                        {sparePart.description}
                      </p>
                    </div>
                  </div>

                  {/* Key Details Grid */}
                  <div className="grid md:grid-cols-2 gap-8">
                    {/* Part Information */}
                    <div className="space-y-4">
                      <h4 className="flex items-center gap-2 font-bold text-xl">
                        <Settings className="w-5 h-5 text-primary" />
                        Part Information
                      </h4>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 text-base">
                          <span className="w-2.5 h-2.5 bg-primary rounded-full" />
                          <span className="font-semibold min-w-[140px]">Brand</span>
                          <span className="text-muted-foreground">{sparePart.brand}</span>
                        </div>
                        <div className="flex items-center gap-3 text-base">
                          <span className="w-2.5 h-2.5 bg-primary rounded-full" />
                          <span className="font-semibold min-w-[140px]">Model</span>
                          <span className="text-muted-foreground">{sparePart.model}</span>
                        </div>
                        {sparePart.part_number && (
                          <div className="flex items-center gap-3 text-base">
                            <span className="w-2.5 h-2.5 bg-primary rounded-full" />
                            <span className="font-semibold min-w-[140px]">Part Number</span>
                            <span className="text-muted-foreground font-mono">{sparePart.part_number}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-3 text-base">
                          <span className="w-2.5 h-2.5 bg-primary rounded-full" />
                          <span className="font-semibold min-w-[140px]">Condition</span>
                          <span className="text-muted-foreground capitalize">{sparePart.condition}</span>
                        </div>
                      </div>
                    </div>

                    {/* Availability & Pricing */}
                    <div className="space-y-4">
                      <h4 className="flex items-center gap-2 font-bold text-xl">
                        <Package className="w-5 h-5 text-primary" />
                        Availability & Pricing
                      </h4>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 text-base">
                          <span className="w-2.5 h-2.5 bg-primary rounded-full" />
                          <span className="font-semibold min-w-[140px]">Quantity</span>
                          <span className="text-muted-foreground">{sparePart.quantity} units</span>
                        </div>
                        <div className="flex items-center gap-3 text-base">
                          <span className="w-2.5 h-2.5 bg-primary rounded-full" />
                          <span className="font-semibold min-w-[140px]">Category</span>
                          <span className="text-muted-foreground">{sparePart.main_category}</span>
                        </div>
                        {sparePart.sub_category && (
                          <div className="flex items-center gap-3 text-base">
                            <span className="w-2.5 h-2.5 bg-primary rounded-full" />
                            <span className="font-semibold min-w-[140px]">Sub-Category</span>
                            <span className="text-muted-foreground">{sparePart.sub_category}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* International Shipping section - commented out
                  {sparePart.is_international && (
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 p-8 rounded-2xl border border-blue-200 dark:border-blue-800 shadow-lg">
                      <h4 className="flex items-center gap-2 font-bold text-xl mb-6">
                        <Truck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        International Shipping Available
                      </h4>
                      <div className="grid md:grid-cols-2 gap-6">
                        {sparePart.shipping_amount > 0 && (
                          <div className="flex items-center gap-3">
                            <span className="w-2.5 h-2.5 bg-blue-600 rounded-full" />
                            <span className="font-semibold">Shipping Cost</span>
                            <span className="text-muted-foreground">
                              {sparePart.currency} {sparePart.shipping_amount.toLocaleString()}
                            </span>
                          </div>
                        )}
                        {sparePart.duty_amount > 0 && (
                          <div className="flex items-center gap-3">
                            <span className="w-2.5 h-2.5 bg-blue-600 rounded-full" />
                            <span className="font-semibold">Import Duty</span>
                            <span className="text-muted-foreground">
                              {sparePart.currency} {sparePart.duty_amount.toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  */}
                </div>
              </TabsContent>

              {/* Specifications Tab */}
              <TabsContent value="specifications" className="p-8 pt-0">
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
                    <Settings className="w-6 h-6 text-primary" />
                    Technical Specifications
                  </h3>
                  <div className="space-y-0">
                    <div className="flex justify-between border-b border-border/50 py-4 px-6 bg-muted/20 rounded-lg">
                      <span className="font-semibold">Brand</span>
                      <span className="text-muted-foreground">{sparePart.brand}</span>
                    </div>
                    <div className="flex justify-between border-b border-border/50 py-4 px-6">
                      <span className="font-semibold">Model</span>
                      <span className="text-muted-foreground">{sparePart.model}</span>
                    </div>
                    {sparePart.part_number && (
                      <div className="flex justify-between border-b border-border/50 py-4 px-6">
                        <span className="font-semibold">Part Number</span>
                        <span className="text-muted-foreground font-mono">{sparePart.part_number}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-b border-border/50 py-4 px-6">
                      <span className="font-semibold">Condition</span>
                      <Badge variant="secondary" className="capitalize">
                        {sparePart.condition}
                      </Badge>
                    </div>
                    <div className="flex justify-between border-b border-border/50 py-4 px-6">
                      <span className="font-semibold">Main Category</span>
                      <span className="text-muted-foreground">{sparePart.main_category}</span>
                    </div>
                    {sparePart.sub_category && (
                      <div className="flex justify-between border-b border-border/50 py-4 px-6">
                        <span className="font-semibold">Sub-Category</span>
                        <span className="text-muted-foreground">{sparePart.sub_category}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-b border-border/50 py-4 px-6">
                      <span className="font-semibold">Quantity Available</span>
                      <span className="text-muted-foreground">{sparePart.quantity}</span>
                    </div>
                    <div className="flex justify-between border-b border-border/50 py-4 px-6 font-bold">
                      <span className="text-lg">Price</span>
                      <span className="text-muted-foreground text-lg">
                        {sparePart.currency} {sparePart.price?.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Compatible Robots Tab */}
              <TabsContent value="compatible" className="p-8 pt-0">
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
                    <Bot className="w-6 h-6 text-primary" />
                    Compatible Robots
                  </h3>
                  {!sparePart.compatible_robots || sparePart.compatible_robots.length === 0 ? (
                    <div className="space-y-6">
                      <div className="bg-gradient-to-r from-muted/40 to-muted/20 rounded-2xl p-8 border border-border/50 text-center">
                        <h4 className="font-semibold mb-4">Compatible Robot Types</h4>
                        <div className="flex flex-wrap gap-2 justify-center">
                          {sparePart.compatible_robots?.map((robot: string, idx: number) => (
                            <Badge key={idx} variant="secondary" className="text-lg px-4 py-2">
                              {robot.trim()}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      {compatibleRobots.length === 0 && (
                        <div className="text-center py-16">
                          <div className="bg-gradient-to-r from-muted/40 to-muted/20 rounded-2xl p-12 border border-border/50 inline-flex">
                            <Badge variant="secondary" className="text-xl px-8 py-4 mb-6 mx-auto block">
                              Universal Part
                            </Badge>
                          </div>
                          <p className="text-base text-muted-foreground mt-6 max-w-lg mx-auto">
                            This is a universal spare part compatible with multiple robot models. Contact the seller for
                            specific compatibility confirmation.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      {compatibleRobots.length > 0 && (
                        <>
                          <h4 className="font-semibold text-xl mb-6">Available Compatible Robots</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {compatibleRobots.map((robot) => (
                              <Card
                                key={robot.id}
                                className="cursor-pointer hover:shadow-xl transition-all hover:-translate-y-2 border-border/50 group"
                                onClick={() => navigate(`/robots/${robot.id}`)}
                              >
                                <CardContent className="p-6">
                                  <div className="aspect-video bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl mb-4 overflow-hidden group-hover:scale-105 transition-transform duration-300">
                                    {robot.images?.[0] ? (
                                      <ResponsiveImage
                                        src={robot.images[0]}
                                        alt={robot.name}
                                        className="w-full h-full object-contain"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <Bot className="w-16 h-16 text-muted-foreground/20" />
                                      </div>
                                    )}
                                  </div>
                                  <h4 className="font-bold text-lg mb-2 line-clamp-1">{robot.name}</h4>
                                  <p className="text-sm text-muted-foreground mb-4">{robot.brand}</p>
                                  <div className="flex items-center justify-between">
                                    <p className="text-lg font-bold text-primary">
                                      {robot.currency} {robot.price?.toLocaleString()}
                                    </p>
                                    <Badge variant="outline" className="text-xs">
                                      {robot.robottype}
                                    </Badge>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              </TabsContent>

              {/* Services Tab */}
              <TabsContent value="services" className="p-8 pt-0">
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
                    <Wrench className="w-6 h-6 text-primary" />
                    Available Services
                  </h3>
                  {services.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="bg-gradient-to-r from-muted/40 to-muted/20 rounded-2xl p-12 border border-border/50 inline-flex mx-auto">
                        <Wrench className="w-12 h-12 text-muted-foreground/30 mx-auto mb-6" />
                      </div>
                      <p className="text-muted-foreground">No services available at the moment</p>
                    </div>
                  ) : (
                    <div className="grid gap-6">
                      {services.map((service) => (
                        <Card key={service.id} className="border-border/50 hover:shadow-lg transition-all">
                          <CardContent className="p-8">
                            <div className="flex items-start justify-between gap-6">
                              <div className="flex-1 space-y-4">
                                <div>
                                  <h4 className="font-bold text-xl mb-2">{service.name}</h4>
                                  <p className="text-muted-foreground leading-relaxed">{service.description}</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <Badge variant="secondary" className="px-3 py-1">
                                    {service.servicetype}
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex flex-col gap-3 pt-6 border-t border-border/50 w-48">
                                <div className="flex items-center gap-2">
                                  <Building className="w-4 h-4 text-primary flex-shrink-0" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">Service Provider</p>
                                    <p className="font-semibold">{service.profiles?.companyname || "N/A"}</p>
                                  </div>
                                </div>
                                {service.profiles?.location && (
                                  <div className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                                    <div>
                                      <p className="text-xs text-muted-foreground">Location</p>
                                      <p className="font-semibold">{service.profiles.location}</p>
                                    </div>
                                  </div>
                                )}
                                {service.profiles?.phone && (
                                  <div className="flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-primary flex-shrink-0" />
                                    <div>
                                      <p className="text-xs text-muted-foreground">Contact</p>
                                      <p className="font-semibold">{service.profiles.phone}</p>
                                    </div>
                                  </div>
                                )}
                                <div className="flex flex-col gap-2 pt-4">
                                  <ChatButton
                                    otherUserId={service.providerid}
                                    itemId={service.id}
                                    itemType="service"
                                    itemName={service.name}
                                  />
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
              {/* Reviews Tab */}
              <TabsContent value="reviews" className="p-8 pt-0">
                <h3 className="text-2xl font-bold mb-6">Reviews & Ratings</h3>
                <ListingRatingSummary
                  itemId={sparePart.id}
                  itemType="spare_part"
                  dealType="spare_parts"
                  itemName={sparePart.name}
                  reviewedUserId={sparePart.seller_id}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </>
  );
};

export default SparePartDetails;
