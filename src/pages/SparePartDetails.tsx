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
  Globe,
  CheckCircle2,
  Star,
  Calendar,
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
  created_at?: string;
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
        setSparePart(data as unknown as SparePart);

        if (data.compatible_robots && data.compatible_robots.length > 0) {
          fetchCompatibleRobots(data.compatible_robots as string[], data.brand);
        }

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
        .limit(6);

      if (!error && data) {
        setServices(data);
      }
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
      <SEOHead
        title={`${sparePart.name} - ${sparePart.brand} ${sparePart.model}`}
        description={`${sparePart.description?.slice(0, 155) || `Quality ${sparePart.name}`}`}
        keywords={[sparePart.name, sparePart.brand, sparePart.model, sparePart.main_category, "spare parts"].join(", ")}
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

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Left: Image Gallery */}
            <div className="lg:col-span-1">
              <Card className="sticky top-20">
                <CardContent className="p-6">
                  {hasImages ? (
                    <div className="space-y-4">
                      {/* Main Image */}
                      <div className="relative aspect-square bg-gradient-to-br from-muted/20 to-muted/10 rounded-lg overflow-hidden group">
                        <ResponsiveImage
                          src={currentImage}
                          alt={sparePart.name}
                          className="w-full h-full object-contain"
                        />

                        {sparePart.images.length > 1 && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={prevImage}
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={nextImage}
                            >
                              <ChevronRight className="w-4 h-4" />
                            </Button>

                            <div className="absolute top-2 right-2 bg-background/80 px-2 py-1 rounded text-xs font-semibold">
                              {currentImageIndex + 1}/{sparePart.images.length}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Thumbnails */}
                      {sparePart.images.length > 1 && (
                        <div className="grid grid-cols-4 gap-2">
                          {sparePart.images.map((img, idx) => (
                            <button
                              key={idx}
                              onClick={() => setCurrentImageIndex(idx)}
                              className={`aspect-square rounded-md overflow-hidden border-2 transition-all ${
                                idx === currentImageIndex ? "border-primary" : "border-border hover:border-primary/50"
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
                    <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                      <Package className="w-24 h-24 text-muted-foreground/30" />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right: Product Info & Seller */}
            <div className="lg:col-span-2 space-y-6">
              {/* Product Header */}
              <Card>
                <CardHeader>
                  <div className="space-y-4">
                    <div>
                      <CardTitle className="text-3xl mb-3">{sparePart.name}</CardTitle>
                      <div className="flex flex-wrap gap-2 mb-4">
                        <Badge className="bg-primary/10 text-primary hover:bg-primary/20">{sparePart.brand}</Badge>
                        <Badge variant="secondary">{sparePart.condition}</Badge>
                        <Badge variant="outline">{sparePart.main_category}</Badge>
                        {sparePart.is_international && (
                          <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-100">
                            <Globe className="w-3 h-3 mr-1" />
                            International
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Price & Quantity */}
                    <Separator />
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold text-primary">
                          {sparePart.currency} {sparePart.price?.toLocaleString()}
                        </span>
                        {sparePart.quantity > 1 && (
                          <span className="text-sm text-muted-foreground">({sparePart.quantity} available)</span>
                        )}
                      </div>
                      {sparePart.part_number && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Part # <span className="font-mono font-semibold">{sparePart.part_number}</span>
                        </p>
                      )}
                    </div>

                    {/* Quick Actions */}
                    <div className="flex gap-3 pt-4">
                      {user && sparePart.seller_id !== user.id && (
                        <ChatButton
                          otherUserId={sparePart.seller_id}
                          itemId={sparePart.id}
                          itemType="spare_part"
                          itemName={sparePart.name}
                          className="flex-1"
                        />
                      )}
                      <Button variant="outline" className="flex-1" onClick={() => handleAddToWatchlist()}>
                        <Heart className="w-4 h-4 mr-2" />
                        Wishlist
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* Seller Information Card */}
              <Card className="bg-gradient-to-br from-primary/5 via-primary/2 to-transparent border-primary/20">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Building className="w-5 h-5 text-primary" />
                    Seller Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Company Name */}
                  <div className="flex items-start gap-3 pb-4 border-b border-border/30">
                    <Building className="w-5 h-5 text-primary mt-1" />
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Company</p>
                      <p className="text-base font-bold mt-1">{sparePart.profiles?.company_name || "N/A"}</p>
                    </div>
                  </div>

                  {/* Contact Person */}
                  {sparePart.profiles?.full_name && (
                    <div className="flex items-start gap-3 pb-4 border-b border-border/30">
                      <CheckCircle2 className="w-5 h-5 text-primary mt-1" />
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Contact Person
                        </p>
                        <p className="text-base font-semibold mt-1">{sparePart.profiles.full_name}</p>
                      </div>
                    </div>
                  )}

                  {/* Location */}
                  {sparePart.location && (
                    <div className="flex items-start gap-3 pb-4 border-b border-border/30">
                      <MapPin className="w-5 h-5 text-primary mt-1" />
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Location</p>
                        <p className="text-base font-semibold mt-1">
                          {sparePart.location}
                          {sparePart.state && `, ${sparePart.state}`}
                          {sparePart.pincode && ` - ${sparePart.pincode}`}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Phone */}
                  {sparePart.profiles?.phone && (
                    <div className="flex items-start gap-3 pb-4 border-b border-border/30">
                      <Phone className="w-5 h-5 text-primary mt-1" />
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Phone</p>
                        <a
                          href={`tel:${sparePart.profiles.phone}`}
                          className="text-base font-semibold text-primary hover:underline mt-1"
                        >
                          {sparePart.profiles.phone}
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Mobile Number */}
                  {sparePart.profiles?.mobile_number && (
                    <div className="flex items-start gap-3 pb-4 border-b border-border/30">
                      <Phone className="w-5 h-5 text-primary mt-1" />
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Mobile</p>
                        <a
                          href={`tel:${sparePart.profiles.mobile_number}`}
                          className="text-base font-semibold text-primary hover:underline mt-1"
                        >
                          {sparePart.profiles.mobile_number}
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Email */}
                  {sparePart.profiles?.email && (
                    <div className="flex items-start gap-3">
                      <Mail className="w-5 h-5 text-primary mt-1" />
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Email</p>
                        <a
                          href={`mailto:${sparePart.profiles.email}`}
                          className="text-base font-semibold text-primary hover:underline mt-1 break-all"
                        >
                          {sparePart.profiles.email}
                        </a>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Tabs Section */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="specifications"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                Specifications
              </TabsTrigger>
              <TabsTrigger
                value="compatible"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                Compatible
              </TabsTrigger>
              <TabsTrigger
                value="services"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                Services
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-8">
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

                  {/* Key Details Grid */}
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Part Information */}
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

            {/* Specifications Tab */}
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

                    {/* Additional Specs from JSON */}
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

            {/* Compatible Robots Tab */}
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

            {/* Services Tab */}
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
                                      <p className="text-xs font-semibold text-muted-foreground uppercase">Provider</p>
                                      <p className="font-semibold text-sm">{service.profiles.company_name}</p>
                                    </div>
                                  </div>
                                )}
                                {service.profiles?.location && (
                                  <div className="flex items-center gap-3">
                                    <MapPin className="w-4 h-4 text-primary" />
                                    <div>
                                      <p className="text-xs font-semibold text-muted-foreground uppercase">Location</p>
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
        </div>
      </div>
    </>
  );
};

export default SparePartDetails;
