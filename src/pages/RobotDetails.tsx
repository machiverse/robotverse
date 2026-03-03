import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import LoanCalculator from "@/components/forms/LoanCalculator";
import LoanApplicationModal from "@/components/forms/LoanApplicationModal";
import SupplierQuoteForm from "@/components/forms/SupplierQuoteForm";
import RobotQuoteModal from "@/components/forms/RobotQuoteModal";
import { Textarea } from "@/components/ui/textarea";
import AIAnalysisResult from "@/components/AIAnalysisResult";
import {
  Bot,
  MapPin,
  Building,
  Phone,
  Mail,
  User,
  ArrowLeft,
  Loader2,
  Wrench,
  Settings,
  DollarSign,
  Brain,
  Heart,
  MessageCircle,
  PhoneCall,
  X,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  FileText,
  Search,
  CreditCard,
  Calculator,
  Plane,
  Package,
  Tag,
  Clock,
  Shield,
  Star,
  Eye,
  Download,
  Truck,
  MessageSquare,
  Camera,
  ZoomIn,
  Share2,
  Calendar,
  Scale,
  Check,
  Info,
  Zap,
  Award,
  Factory,
} from "lucide-react";

import ViewCountDisplay from "@/components/ViewCountDisplay";
import EnhancedHeader from "@/components/EnhancedHeader";
import ProfessionalRobotReportModal from "@/components/ProfessionalRobotReportModal";
import { ComprehensiveAIMarketAnalysis } from "@/components/ComprehensiveAIMarketAnalysis";
import { ChatButton } from "@/components/chat/ChatButton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";
import { useButtonTracking } from "@/hooks/useButtonTracking";
import { useUniversalViewTracking } from "@/hooks/useUniversalViewTracking";
import { type RobotSEOData } from "@/utils/seo";
import { useRobotSEO } from "@/hooks/useRobotSEO";
import { ListingRatingSummary } from "@/components/reviews/ListingRatingSummary";
import { SEOHead } from "@/components/SEOHead";
import { generateProductSchema } from "@/utils/seoSchemas";
import { useRobotComparison } from "@/contexts/RobotComparisonContext";

interface Robot {
  id: string;
  name: string;
  model: string;
  robot_type: string;
  price: number;
  currency: string;
  description: string;
  location: string;
  state?: string;
  pincode?: string;
  availability: string;
  images: string[];
  technical_specifications: Record<string, any>;
  category_tags: string[];
  quantity: number;
  seller_id: string;
  brand?: string;
  condition?: string;
  year_manufactured?: number;
  payload_capacity?: number;
  reach?: number;
  repeatability?: number;
  power_consumption?: number;
  operating_environment?: string;
  warranty_info?: string;
  certification_standards?: string[];
  applications?: string[];
  included_accessories?: string[];
  controller_type?: string;
  brochure_url?: string;
  video_url?: string;
  video_type?: string;
  profiles: {
    full_name: string;
    company_name: string;
    phone: string;
    mobile_number: string;
    email: string;
    location: string;
  };
}

interface CustomField {
  id: string;
  field_name: string;
  field_value: string;
}

interface AIAnalysisData {
  summary: string;
  suitability?: string;
  technicalInsights?: string;
  governmentSchemes?: string;
  suggestedIndustries?: string;
  timestamp: string;
}

interface AIAnalysisResult {
  analysis: AIAnalysisData;
  cached?: boolean;
  currentUserLocation?: string;
  recommendations: {
    spareParts: any[];
    services: any[];
    logistics: any[];
    finance: any[];
  };
}

const INDIAN_STATES = [
  "andhra pradesh", "arunachal pradesh", "assam", "bihar", "chhattisgarh", "goa",
  "gujarat", "haryana", "himachal pradesh", "jharkhand", "karnataka", "kerala",
  "madhya pradesh", "maharashtra", "manipur", "meghalaya", "mizoram", "nagaland",
  "odisha", "punjab", "rajasthan", "sikkim", "tamil nadu", "telangana", "tripura",
  "uttar pradesh", "uttarakhand", "west bengal", "delhi", "jammu and kashmir",
  "ladakh", "chandigarh", "dadra and nagar haveli and daman and diu", "lakshadweep", "puducherry",
];

const RobotDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { trackButtonClick } = useButtonTracking();
  const { trackItemView } = useUniversalViewTracking();
  const { addRobot, isSelected, removeRobot } = useRobotComparison();

  const [robot, setRobot] = useState<Robot | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResult | null>(null);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [services, setServices] = useState<any[]>([]);
  const [spareParts, setSpareParts] = useState<any[]>([]);
  const [financingOptions, setFinancingOptions] = useState<any[]>([]);
  const [logisticsServices, setLogisticsServices] = useState<any[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [loadingSpareParts, setLoadingSpareParts] = useState(false);
  const [loadingFinancing, setLoadingFinancing] = useState(false);
  const [loadingLogistics, setLoadingLogistics] = useState(false);

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteMessage, setQuoteMessage] = useState("");
  const [addingToWatchlist, setAddingToWatchlist] = useState(false);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [showImportQuote, setShowImportQuote] = useState(false);
  const [importDuty, setImportDuty] = useState<number | null>(null);
  const [showEmiCalculator, setShowEmiCalculator] = useState(false);
  const [currentUserLocation, setCurrentUserLocation] = useState<string>("");
  const [activeTab, setActiveTab] = useState<
    "overview" | "specifications" | "spareparts" | "services" | "logistics" | "financing"
  >("overview");

  const [showReportModal, setShowReportModal] = useState(false);
  const [showMarketAnalysis, setShowMarketAnalysis] = useState(false);
const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [showRobotQuoteModal, setShowRobotQuoteModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const viewCountedRef = useRef<string | null>(null);
  const { seoElements, generateSEO } = useRobotSEO();

  const isIndianLocation = (state?: string, location?: string) => {
    const s = (state || "").toLowerCase().replace(/\s+/g, "");
    const loc = (location || "").toLowerCase();
    const normalizedStates = INDIAN_STATES.map((state) => state.replace(/\s+/g, ""));
    if (s && normalizedStates.includes(s)) return true;
    if (loc.includes("india")) return true;
    return INDIAN_STATES.some((st) => loc.includes(st));
  };

  const outsideIndia = robot ? !isIndianLocation(robot.state, robot.location) : false;

  useEffect(() => {
    if (!id) return;
    const fetchRobot = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("robots")
          .select(`
            *,
            profiles!robots_seller_id_fkey (
              full_name, company_name, phone, mobile_number, email, location
            )
          `)
          .eq("id", id)
          .single();

        if (error) throw error;
        setRobot({
          ...data,
          technical_specifications:
            typeof data.technical_specifications === "object" && data.technical_specifications !== null
              ? (data.technical_specifications as Record<string, any>)
              : {},
        });

        if (viewCountedRef.current !== data.id) {
          viewCountedRef.current = data.id;
          await trackItemView("robots", data.id, data);
          await trackButtonClick({
            buttonName: "Robot Page View",
            buttonType: "robot_page_view",
            sellerId: data.seller_id,
            sellerName: data.profiles?.full_name || "No Name Available",
            sellerCompany: data.profiles?.company_name || "No Company Available",
            sellerEmail: data.profiles?.email || "No Email Available",
            sellerMobile: data.profiles?.mobile_number || data.profiles?.phone || "No Phone Available",
            sellerLocation: data.profiles?.location || data.location || "No Location Available",
            itemId: data.id,
            itemType: "robot",
            additionalData: {
              robotName: data.name,
              robotModel: data.model,
              robotType: data.robot_type,
              price: data.price,
              currency: data.currency,
              brand: data.brand,
              condition: data.condition,
              location: data.location,
              state: data.state,
              pageType: "robot_details",
              viewSource: "direct_page_visit",
              sellerProfileExists: !!data.profiles,
            },
          });
        }

        const robotSEOData: RobotSEOData = {
          id: data.id,
          brand: data.brand,
          model: data.model,
          payload_capacity: data.payload_capacity,
          controller_type: data.controller_type,
          year_manufactured: data.year_manufactured,
          condition: data.condition,
          reach: data.reach,
          location: data.location,
          state: data.state,
          price: data.price,
          currency: data.currency,
          seller_name: data.profiles?.full_name,
          company_name: data.profiles?.company_name,
          applications: data.applications || [],
          images: data.images || [],
        };
        generateSEO(robotSEOData);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Failed to load robot details");
      } finally {
        setLoading(false);
      }
    };
    fetchRobot();
  }, [id]);

  useEffect(() => {
    const checkWatchlist = async () => {
      if (!user || !robot) return;
      const { data: watchlistData } = await supabase
        .from("watchlists")
        .select("id")
        .eq("user_id", user.id)
        .eq("item_type", "robot")
        .eq("item_id", robot.id)
        .single();
      setIsInWatchlist(!!watchlistData);
    };
    checkWatchlist();
  }, [user, robot]);

  useEffect(() => {
    const fetchUserLocation = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase.from("profiles").select("location").eq("id", user.id).single();
        if (!error && data?.location) {
          setCurrentUserLocation(data.location);
        }
      } catch (err) {
        console.error("Error fetching user location:", err);
      }
    };
    fetchUserLocation();
  }, [user]);

  const fetchRelatedServices = async () => {
    setLoadingServices(true);
    try {
      const { data, error } = await supabase
        .from("services")
        .select(`*, profiles!services_provider_id_fkey (full_name, company_name, phone, mobile_number, email, location, avatar_url)`)
        .limit(10);
      if (error) throw error;
      const sortedData = data?.sort((a, b) => {
        if (!currentUserLocation) return 0;
        const aDistance = a.profiles?.location?.toLowerCase().includes(currentUserLocation.toLowerCase()) ? 0 : 1;
        const bDistance = b.profiles?.location?.toLowerCase().includes(currentUserLocation.toLowerCase()) ? 0 : 1;
        return aDistance - bDistance;
      });
      setServices(sortedData || []);
    } catch (err) {
      console.error("Error fetching services:", err);
    } finally {
      setLoadingServices(false);
    }
  };

  const fetchCompatibleSpareParts = async () => {
    setLoadingSpareParts(true);
    try {
      const { data: allParts, error } = await supabase.from("spare_parts").select(`*, profiles!spare_parts_seller_id_fkey (full_name, company_name, phone, mobile_number, email, location)`);
      if (error) throw error;
      const compatibleParts = allParts?.filter((part) => {
        const compatibleRobots = part.compatible_robots || [];
        if (compatibleRobots.length === 0 || compatibleRobots.some((r: string) => r.toLowerCase().includes("universal"))) return true;
        if (robot?.brand && compatibleRobots.some((r: string) => r.toLowerCase().includes(robot.brand.toLowerCase()))) return true;
        if (robot?.model && compatibleRobots.some((r: string) => r.toLowerCase().includes(robot.model.toLowerCase()))) return true;
        if (robot?.name && compatibleRobots.some((r: string) => r.toLowerCase().includes(robot.name.toLowerCase()))) return true;
        return false;
      }) || [];
      const sortedData = compatibleParts.sort((a, b) => {
        if (!currentUserLocation) return 0;
        const aDistance = a.profiles?.location?.toLowerCase().includes(currentUserLocation.toLowerCase()) ? 0 : 1;
        const bDistance = b.profiles?.location?.toLowerCase().includes(currentUserLocation.toLowerCase()) ? 0 : 1;
        return aDistance - bDistance;
      });
      setSpareParts(sortedData.slice(0, 12));
    } catch (err) {
      console.error("Error fetching spare parts:", err);
    } finally {
      setLoadingSpareParts(false);
    }
  };

  const fetchFinancingOptions = async () => {
    setLoadingFinancing(true);
    try {
      const { data, error } = await supabase.from("loan_products").select(`*, profiles!loan_products_provider_id_fkey (full_name, company_name, phone, location)`).eq("is_active", true).limit(10);
      if (error) throw error;
      setFinancingOptions(data || []);
    } catch (err) {
      console.error("Error fetching financing:", err);
    } finally {
      setLoadingFinancing(false);
    }
  };

  const fetchLogisticsServices = async () => {
    setLoadingLogistics(true);
    try {
      const { data, error } = await supabase.from("logistics_services").select(`*, profiles!logistics_services_provider_id_fkey (full_name, company_name, phone, location, email, mobile_number)`).eq("is_active", true).limit(10);
      if (error) throw error;
      const sortedData = data?.sort((a, b) => {
        if (!currentUserLocation) return 0;
        const aDistance = a.profiles?.location?.toLowerCase().includes(currentUserLocation.toLowerCase()) ? 0 : 1;
        const bDistance = b.profiles?.location?.toLowerCase().includes(currentUserLocation.toLowerCase()) ? 0 : 1;
        return aDistance - bDistance;
      });
      setLogisticsServices(sortedData || []);
    } catch (err) {
      console.error("Error fetching logistics services:", err);
    } finally {
      setLoadingLogistics(false);
    }
  };

  useEffect(() => {
    fetchRelatedServices();
    fetchCompatibleSpareParts();
    fetchFinancingOptions();
    fetchLogisticsServices();
  }, [robot, currentUserLocation]);

  const handleAddToWatchlist = async () => {
    if (!user) {
      toast({ title: "Login Required", description: "Please log in to add items to your watchlist.", variant: "destructive" });
      return;
    }
    if (!robot) return;
    setAddingToWatchlist(true);
    try {
      if (isInWatchlist) {
        const { error } = await supabase.from("watchlists").delete().eq("user_id", user.id).eq("item_type", "robot").eq("item_id", robot.id);
        if (error) throw error;
        setIsInWatchlist(false);
        toast({ title: "Removed from Watchlist", description: `${robot.name} has been removed from your watchlist.` });
      } else {
        const { error } = await supabase.from("watchlists").insert([{ user_id: user.id, item_type: "robot", item_id: robot.id, item_data: { name: robot.name, model: robot.model, price: robot.price, currency: robot.currency, image: robot.images?.[0] || null } }]);
        if (error) throw error;
        setIsInWatchlist(true);
        toast({ title: "Added to Watchlist", description: `${robot.name} has been added to your watchlist.` });
      }
    } catch (err) {
      console.error("Error updating watchlist:", err);
      toast({ title: "Error", description: "Failed to update watchlist. Please try again.", variant: "destructive" });
    } finally {
      setAddingToWatchlist(false);
    }
  };

  const handleAIAnalysis = async () => {
    if (!robot || !user) {
      toast({ title: "Login Required", description: "Please log in to use AI analysis.", variant: "destructive" });
      return;
    }
    setAnalysisLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("roboverse-ai-analyze", { body: { robotId: robot.id } });
      if (error) throw new Error(error.message || "Failed to analyze robot");
      setAiAnalysis(data);
      toast({ title: "AI Analysis Complete", description: "Intelligent market analysis has been generated." });
    } catch (err) {
      console.error("AI Analysis error:", err);
      toast({ title: "Analysis Failed", description: "Failed to generate AI analysis. Please try again.", variant: "destructive" });
    } finally {
      setAnalysisLoading(false);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    const currencySymbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : "₹";
    return `${currencySymbol}${price.toLocaleString()}`;
  };

  const calculateImportDuty = (basePrice: number, currency: string) => {
    const isInIndia = robot?.state && INDIAN_STATES.includes(robot.state.toLowerCase());
    if (!isInIndia && basePrice) {
      const dutyRate = 0.18;
      const duty = basePrice * dutyRate;
      setImportDuty(duty);
      return duty;
    }
    setImportDuty(null);
    return 0;
  };

  useEffect(() => {
    if (robot?.price) {
      calculateImportDuty(robot.price, robot.currency);
    }
  }, [robot]);

  const handleImportQuote = () => {
    if (!robot?.profiles?.email) {
      toast({ title: "Email Not Available", description: "Seller's email address is not provided.", variant: "destructive" });
      return;
    }
    setShowImportQuote(true);
  };

  const sendImportQuoteEmail = () => {
    if (!robot?.profiles?.email) return;
    const basePrice = robot.price || 0;
    const duty = importDuty || 0;
    const totalPrice = basePrice + duty;
    const subject = `Import Quote Request for ${robot.name} - ${robot.model}`;
    const body = `Dear ${robot.profiles.full_name},\n\nI am interested in importing the following robot to India:\n\nRobot: ${robot.name}\nModel: ${robot.model}\nType: ${robot.robot_type}\nBase Price: ${formatPrice(basePrice, robot.currency)}\n${duty > 0 ? `Estimated Import Duty (18%): ${formatPrice(duty, robot.currency)}\nTotal Estimated Cost: ${formatPrice(totalPrice, robot.currency)}` : ""}\n\nPlease provide detailed information on import documentation and procedures.\n\nBest regards,\n${user?.user_metadata?.full_name || "Interested Buyer"}`;
    const mailtoLink = `mailto:${robot.profiles.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoLink, "_blank");
    setShowImportQuote(false);
    toast({ title: "Import Quote Request Sent", description: `Email sent to ${robot.profiles.company_name || robot.profiles.full_name}` });
  };

  const [showLoanApplication, setShowLoanApplication] = useState(false);
  const [selectedFinanceProvider, setSelectedFinanceProvider] = useState<any>(null);

  const handleContactService = (service: any) => {
    if (!user) { toast({ title: "Login Required", description: "Please log in to contact service providers.", variant: "destructive" }); return; }
    const phone = service.profiles?.phone || service.profiles?.mobile_number;
    if (!phone) { toast({ title: "Phone Number Not Available", description: "Service provider's phone number is not provided.", variant: "destructive" }); return; }
    window.open(`tel:${phone.replace(/\D/g, "")}`, "_self");
  };

  const handleContactSpareParts = (part: any) => {
    if (!user) { toast({ title: "Login Required", description: "Please log in to contact spare parts suppliers.", variant: "destructive" }); return; }
    const phone = part.profiles?.phone || part.profiles?.mobile_number;
    if (!phone) { toast({ title: "Phone Number Not Available", variant: "destructive" }); return; }
    window.open(`tel:${phone.replace(/\D/g, "")}`, "_self");
  };

  const handleContactFinance = (option: any) => {
    if (!user) { toast({ title: "Login Required", variant: "destructive" }); return; }
    const phone = option.profiles?.phone;
    if (!phone) { toast({ title: "Phone Number Not Available", variant: "destructive" }); return; }
    window.open(`tel:${phone.replace(/\D/g, "")}`, "_self");
  };

  const handleContactLogistics = (logistics: any) => {
    if (!user) { toast({ title: "Login Required", variant: "destructive" }); return; }
    const phone = logistics.profiles?.phone || logistics.profiles?.mobile_number;
    if (!phone) { toast({ title: "Phone Number Not Available", variant: "destructive" }); return; }
    window.open(`tel:${phone.replace(/\D/g, "")}`, "_self");
  };

  const handleGetLogisticsQuote = (logistics: any) => {
    if (!user) { toast({ title: "Login Required", variant: "destructive" }); return; }
    if (!logistics.profiles?.email) { toast({ title: "Email Not Available", variant: "destructive" }); return; }
    const subject = `Logistics Quote Request for Robot Transport`;
    const body = `Dear ${logistics.profiles.full_name},\n\nI require logistics services for:\n\nRobot: ${robot?.name}\nModel: ${robot?.model}\nFrom: ${robot?.location}\n\nPlease provide a detailed quote.\n\nBest regards`;
    window.open(`mailto:${logistics.profiles.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, "_blank");
  };

  const handleApplyLoan = (option: any) => {
    if (!user) { toast({ title: "Login Required", variant: "destructive" }); return; }
    setSelectedFinanceProvider(option);
    setShowLoanApplication(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <EnhancedHeader />
        <div className="container mx-auto px-4 py-16">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mr-3 text-primary" />
            <span className="text-lg text-muted-foreground">Loading robot details...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !robot) {
    return (
      <div className="min-h-screen bg-background">
        <EnhancedHeader />
        <div className="container mx-auto px-4 py-16">
          <div className="flex flex-col items-center justify-center py-12">
            <Bot className="w-20 h-20 text-muted-foreground mb-6" />
            <h3 className="text-xl font-semibold mb-2">Robot Not Found</h3>
            <p className="text-muted-foreground mb-6">{error || "The requested robot could not be found."}</p>
            <Button onClick={() => navigate("/robots")} variant="outline" size="lg">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Robots
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`${robot.brand || ""} ${robot.model || robot.name} - Industrial Robot | RobotVerse`}
        description={robot.description || `Buy ${robot.brand} ${robot.model} industrial robot. ${robot.payload_capacity ? `Payload: ${robot.payload_capacity}kg.` : ""} ${robot.reach ? `Reach: ${robot.reach}mm.` : ""} Available in ${robot.location || "India"}.`}
        keywords={`${robot.brand} robot, ${robot.model}, ${robot.robot_type}, industrial robot, automation`}
        ogImage={robot.images?.[0] || "/og-image.jpg"}
        jsonLd={generateProductSchema({ ...robot, seller: robot.profiles })}
      />
      <EnhancedHeader />

      {/* Back Navigation */}
      <div className="border-b bg-card/50">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/robots")} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Robots
          </Button>
        </div>
      </div>

      {/* Full-Width Hero Section */}
      <section className="bg-gradient-to-b from-card to-background border-b">
        <div className="container mx-auto px-4 py-8 lg:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
            {/* Image Section */}
            <div className="space-y-4">
              <div className="relative w-full h-[480px] rounded-xl overflow-hidden bg-muted border shadow-lg">
                {robot?.images && robot.images.length > 0 ? (
                  <>
                    <img
                      src={robot.images[currentImageIndex]}
                      alt={`${robot.name} - Image ${currentImageIndex + 1}`}
                      className="w-full h-full object-cover cursor-pointer transition-transform duration-300 hover:scale-[1.02]"
                      onClick={() => setShowFullscreen(true)}
                    />
                    <Button
                      onClick={() => setShowFullscreen(true)}
                      className="absolute top-4 right-4 bg-background/90 hover:bg-background text-foreground shadow-lg"
                      size="icon"
                      variant="outline"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </Button>
                    {robot.images.length > 1 && (
                      <>
                        <Button
                          variant="outline"
                          size="icon"
                          className="absolute left-4 top-1/2 -translate-y-1/2 bg-background/90 hover:bg-background shadow-lg"
                          onClick={() => setCurrentImageIndex((prev) => (prev === 0 ? robot.images.length - 1 : prev - 1))}
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="absolute right-4 top-1/2 -translate-y-1/2 bg-background/90 hover:bg-background shadow-lg"
                          onClick={() => setCurrentImageIndex((prev) => (prev + 1) % robot.images.length)}
                        >
                          <ChevronRight className="w-5 h-5" />
                        </Button>
                        <div className="absolute bottom-4 right-4 bg-background/90 text-foreground px-3 py-1.5 rounded-full text-sm font-medium shadow-lg">
                          {currentImageIndex + 1} / {robot.images.length}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Bot className="w-24 h-24 text-muted-foreground/50" />
                  </div>
                )}
              </div>

              {/* Thumbnails */}
              {robot.images?.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {robot.images.map((image, index) => (
                    <button
                      key={index}
                      className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all bg-muted/50 flex items-center justify-center ${
                        index === currentImageIndex
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-border hover:border-primary/50 opacity-70 hover:opacity-100"
                      }`}
                      onClick={() => setCurrentImageIndex(index)}
                    >
                      <img src={image} alt={`${robot.name} ${index + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Info Section */}
            <div className="space-y-6">
              {/* Brand and Status */}
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  {robot.brand && (
                    <p className="text-xs font-medium text-primary uppercase tracking-wider">{robot.brand}</p>
                  )}
                  <h1 className="text-xl lg:text-2xl font-semibold text-foreground leading-snug">{robot.name}</h1>
                  <p className="text-sm text-muted-foreground">{robot.model}</p>
                </div>
                <Badge
                  variant="outline"
                  className={`shrink-0 px-3 py-1.5 text-sm font-medium ${
                    robot.availability === "in_stock" || robot.availability === "available"
                      ? "bg-green-500/10 text-green-600 border-green-500/30"
                      : "bg-yellow-500/10 text-yellow-600 border-yellow-500/30"
                  }`}
                >
                  {robot.availability?.replace(/_/g, " ") || "Available"}
                </Badge>
              </div>

              {/* Price */}
              <div className="space-y-1">
                <p className="text-2xl lg:text-3xl font-bold text-primary">
                  {robot.price ? formatPrice(robot.price, robot.currency) : "Price on Request"}
                </p>
                {outsideIndia && importDuty && (
                  <p className="text-sm text-muted-foreground">
                    + Est. Import Duty: {formatPrice(importDuty, robot.currency)}
                  </p>
                )}
              </div>

              {/* Key Details Grid */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-xl border">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Location</p>
                    <p className="font-semibold text-foreground">{robot.location || "N/A"}</p>
                  </div>
                </div>
                {robot.year_manufactured && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Calendar className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Year</p>
                      <p className="font-semibold text-foreground">{robot.year_manufactured}</p>
                    </div>
                  </div>
                )}
                {robot.condition && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Settings className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Condition</p>
                      <p className="font-semibold text-foreground capitalize">{robot.condition.replace(/_/g, " ")}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Factory className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Type</p>
                    <p className="font-semibold text-foreground">{robot.robot_type}</p>
                  </div>
                </div>
              </div>

              {/* View Count */}
              <ViewCountDisplay targetType="robots" targetId={robot.id} />

              {/* Primary CTA Buttons */}
              <div className="space-y-3 pt-2">
                {user && user.id === robot.seller_id ? (
                  <Button disabled variant="outline" className="w-full h-10" size="default">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    You are the Seller
                  </Button>
                ) : (
                  <ChatButton
                    otherUserId={robot.seller_id}
                    itemId={robot.id}
                    itemType="robot"
                    itemName={robot.name}
                    variant="default"
                    className="w-full h-10 bg-primary hover:bg-primary/90 shadow-md"
                    size="default"
                  />
                )}

                <div className="grid grid-cols-3 gap-2">
                  {user && user.id !== robot.seller_id && (
                    <Button
                      onClick={handleAddToWatchlist}
                      variant="outline"
                      disabled={addingToWatchlist}
                      className="h-9"
                      size="sm"
                    >
                      <Heart className={`h-4 w-4 mr-1.5 ${isInWatchlist ? "fill-current text-red-500" : ""}`} />
                      Watchlist
                    </Button>
                  )}
                  <Button
                    onClick={() => {
                      if (robot) {
                        addRobot({
                          id: robot.id,
                          name: robot.name,
                          model: robot.model,
                          brand: robot.brand,
                          robot_type: robot.robot_type,
                          price: robot.price,
                          currency: robot.currency,
                          payload_capacity: robot.payload_capacity,
                          reach: robot.reach,
                          repeatability: robot.repeatability,
                          images: robot.images,
                          applications: robot.applications,
                          technical_specifications: robot.technical_specifications,
                          condition: robot.condition,
                          location: robot.location,
                          profiles: robot.profiles,
                        });
                      }
                    }}
                    variant="outline"
                    className="h-9"
                    size="sm"
                  >
                    <Scale className="h-4 w-4 mr-1.5" />
                    Compare
                  </Button>
                  <Button
                    onClick={() => {
                      if (!user) {
                        toast({
                          title: "Login Required",
                          description: "Please log in to request a quote.",
                          variant: "destructive"
                        });
                        return;
                      }
                      trackButtonClick({
                        buttonName: "get_quote",
                        buttonType: "cta",
                        itemId: robot.id,
                        itemType: "robot"
                      });
                      setShowRobotQuoteModal(true);
                    }}
                    variant="outline"
                    className="h-9 border-primary/50 text-primary hover:bg-primary/10"
                    size="sm"
                  >
                    <FileText className="h-4 w-4 mr-1.5" />
                    Get Quote
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content Section with Tabs */}
      <section className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - Tabs */}
          <div className="lg:col-span-2">
            <Card className="shadow-sm border">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
                <div className="border-b px-2">
                  <TabsList className="h-14 bg-transparent gap-1">
                    <TabsTrigger value="overview" className="data-[state=active]:bg-muted px-4 py-2.5">
                      <Info className="w-4 h-4 mr-2" />
                      Overview
                    </TabsTrigger>
                    <TabsTrigger value="specifications" className="data-[state=active]:bg-muted px-4 py-2.5">
                      <Settings className="w-4 h-4 mr-2" />
                      Specifications
                    </TabsTrigger>
                    <TabsTrigger value="spareparts" className="data-[state=active]:bg-muted px-4 py-2.5">
                      <Wrench className="w-4 h-4 mr-2" />
                      Spare Parts
                    </TabsTrigger>
                    <TabsTrigger value="services" className="data-[state=active]:bg-muted px-4 py-2.5">
                      <Settings className="w-4 h-4 mr-2" />
                      Services
                    </TabsTrigger>
                    <TabsTrigger value="logistics" className="data-[state=active]:bg-muted px-4 py-2.5">
                      <Truck className="w-4 h-4 mr-2" />
                      Logistics
                    </TabsTrigger>
                    <TabsTrigger value="financing" className="data-[state=active]:bg-muted px-4 py-2.5">
                      <CreditCard className="w-4 h-4 mr-2" />
                      Financing
                    </TabsTrigger>
                    <TabsTrigger value="reviews" className="hidden data-[state=active]:bg-muted px-4 py-2.5">
                      <Star className="w-4 h-4 mr-2" />
                      Reviews
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* Overview Tab */}
                <TabsContent value="overview" className="p-6 space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold mb-4">About this Robot</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {robot.description || "No description available for this robot."}
                    </p>
                  </div>

                  {robot.applications && robot.applications.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-3">Applications</h4>
                      <div className="flex flex-wrap gap-2">
                        {robot.applications.map((app, index) => (
                          <Badge key={index} variant="secondary">{app}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {robot.certification_standards && robot.certification_standards.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-3">Certifications</h4>
                      <div className="flex flex-wrap gap-2">
                        {robot.certification_standards.map((cert, index) => (
                          <Badge key={index} variant="outline" className="border-green-500/30 text-green-600">
                            <Check className="w-3 h-3 mr-1" />
                            {cert}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {robot.included_accessories && robot.included_accessories.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-3">Included Accessories</h4>
                      <ul className="grid grid-cols-2 gap-2">
                        {robot.included_accessories.map((acc, index) => (
                          <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Check className="w-4 h-4 text-green-500" />
                            {acc}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {robot.warranty_info && (
                    <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="w-5 h-5 text-green-600" />
                        <h4 className="font-semibold text-green-600">Warranty</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">{robot.warranty_info}</p>
                    </div>
                  )}
                </TabsContent>

                {/* Specifications Tab */}
                <TabsContent value="specifications" className="p-6">
                  <h3 className="text-xl font-semibold mb-6">Technical Specifications</h3>
                  <div className="space-y-0 divide-y">
                    {robot.brand && (
                      <div className="flex justify-between py-3">
                        <span className="font-medium text-muted-foreground">Brand</span>
                        <span className="font-semibold">{robot.brand}</span>
                      </div>
                    )}
                    {robot.model && (
                      <div className="flex justify-between py-3">
                        <span className="font-medium text-muted-foreground">Model</span>
                        <span className="font-semibold">{robot.model}</span>
                      </div>
                    )}
                    {robot.condition && (
                      <div className="flex justify-between py-3">
                        <span className="font-medium text-muted-foreground">Condition</span>
                        <span className="font-semibold capitalize">{robot.condition.replace("_", " ")}</span>
                      </div>
                    )}
                    {robot.year_manufactured && (
                      <div className="flex justify-between py-3">
                        <span className="font-medium text-muted-foreground">Year Manufactured</span>
                        <span className="font-semibold">{robot.year_manufactured}</span>
                      </div>
                    )}
                    {robot.payload_capacity && (
                      <div className="flex justify-between py-3">
                        <span className="font-medium text-muted-foreground">Payload Capacity</span>
                        <span className="font-semibold">{robot.payload_capacity} kg</span>
                      </div>
                    )}
                    {robot.reach && (
                      <div className="flex justify-between py-3">
                        <span className="font-medium text-muted-foreground">Reach</span>
                        <span className="font-semibold">{robot.reach} mm</span>
                      </div>
                    )}
                    {robot.repeatability && (
                      <div className="flex justify-between py-3">
                        <span className="font-medium text-muted-foreground">Repeatability</span>
                        <span className="font-semibold">±{robot.repeatability} mm</span>
                      </div>
                    )}
                    {robot.controller_type && (
                      <div className="flex justify-between py-3">
                        <span className="font-medium text-muted-foreground">Controller Type</span>
                        <span className="font-semibold">{robot.controller_type}</span>
                      </div>
                    )}
                    {robot.power_consumption && (
                      <div className="flex justify-between py-3">
                        <span className="font-medium text-muted-foreground">Power Consumption</span>
                        <span className="font-semibold">{robot.power_consumption} kW</span>
                      </div>
                    )}
                    {robot.operating_environment && (
                      <div className="flex justify-between py-3">
                        <span className="font-medium text-muted-foreground">Operating Environment</span>
                        <span className="font-semibold">{robot.operating_environment}</span>
                      </div>
                    )}
                    {robot.quantity && (
                      <div className="flex justify-between py-3">
                        <span className="font-medium text-muted-foreground">Quantity Available</span>
                        <span className="font-semibold">{robot.quantity}</span>
                      </div>
                    )}
                    {robot.technical_specifications && Object.keys(robot.technical_specifications).length > 0 &&
                      Object.entries(robot.technical_specifications).map(([key, value]) => (
                        <div key={key} className="flex justify-between py-3">
                          <span className="font-medium text-muted-foreground capitalize">{key.replace(/_/g, " ")}</span>
                          <span className="font-semibold">{String(value)}</span>
                        </div>
                      ))}
                  </div>
                </TabsContent>

                {/* Spare Parts Tab */}
                <TabsContent value="spareparts" className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-semibold">Compatible Spare Parts</h3>
                    <Button variant="outline" onClick={() => navigate("/parts")} size="sm">
                      <Search className="w-4 h-4 mr-2" />
                      Browse All
                    </Button>
                  </div>
                  {loadingSpareParts ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin mr-2 text-primary" />
                      <span className="text-muted-foreground">Loading spare parts...</span>
                    </div>
                  ) : spareParts.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {spareParts.map((part) => (
                        <Card key={part.id} className="border hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            {part.images && part.images[0] && (
                              <div className="mb-3 rounded-lg overflow-hidden bg-muted aspect-video">
                                <img src={part.images[0]} alt={part.name || part.part_name} className="w-full h-full object-cover" />
                              </div>
                            )}
                            <h4 className="font-semibold mb-1">{part.name || part.part_name}</h4>
                            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{part.description || "No description"}</p>
                            {part.price && <p className="text-lg font-bold text-primary mb-3">{part.currency === "USD" ? "$" : "₹"}{part.price.toLocaleString()}</p>}
                            <ChatButton otherUserId={part.seller_id} itemId={part.id} itemType="spare_part" itemName={part.name || part.part_name} variant="outline" className="w-full" size="sm" />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No compatible spare parts found.</p>
                    </div>
                  )}
                </TabsContent>

                {/* Services Tab */}
                <TabsContent value="services" className="p-6">
                  <h3 className="text-xl font-semibold mb-6">Related Services</h3>
                  {loadingServices ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin mr-2 text-primary" />
                      <span className="text-muted-foreground">Loading services...</span>
                    </div>
                  ) : services.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4">
                      {services.map((service) => (
                        <Card key={service.id} className="border hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h4 className="font-semibold text-lg">{service.name}</h4>
                                {service.profiles?.company_name && <p className="text-sm text-muted-foreground">{service.profiles.company_name}</p>}
                              </div>
                              {service.service_type && <Badge variant="secondary">{service.service_type}</Badge>}
                            </div>
                            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{service.description || "No description"}</p>
                            <ChatButton otherUserId={service.provider_id} itemId={service.id} itemType="service" itemName={service.name} variant="default" className="w-full" size="sm" />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Wrench className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No related services found.</p>
                    </div>
                  )}
                </TabsContent>

                {/* Logistics Tab */}
                <TabsContent value="logistics" className="p-6">
                  <h3 className="text-xl font-semibold mb-6">Logistics Providers</h3>
                  {loadingLogistics ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin mr-2 text-primary" />
                      <span className="text-muted-foreground">Loading logistics...</span>
                    </div>
                  ) : logisticsServices.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4">
                      {logisticsServices.map((logistics) => (
                        <Card key={logistics.id} className="border hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h4 className="font-semibold text-lg">{logistics.service_name}</h4>
                                {logistics.profiles?.company_name && <p className="text-sm text-muted-foreground">{logistics.profiles.company_name}</p>}
                              </div>
                              <div className="flex gap-1">
                                {logistics.tracking_available && <Badge variant="outline" className="text-xs">Tracking</Badge>}
                                {logistics.insurance_included && <Badge variant="outline" className="text-xs">Insured</Badge>}
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{logistics.description || "No description"}</p>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => handleContactLogistics(logistics)} className="flex-1">
                                <Phone className="w-4 h-4 mr-2" />
                                Call
                              </Button>
                              <Button size="sm" onClick={() => handleGetLogisticsQuote(logistics)} className="flex-1">
                                <FileText className="w-4 h-4 mr-2" />
                                Get Quote
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Truck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No logistics providers found.</p>
                    </div>
                  )}
                </TabsContent>

                {/* Financing Tab */}
                <TabsContent value="financing" className="p-6">
                  <h3 className="text-xl font-semibold mb-6">Financing Options</h3>
                  {loadingFinancing ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin mr-2 text-primary" />
                      <span className="text-muted-foreground">Loading financing...</span>
                    </div>
                  ) : financingOptions.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4">
                      {financingOptions.map((option) => (
                        <Card key={option.id} className="border hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h4 className="font-semibold text-lg">{option.product_name}</h4>
                                {option.profiles?.company_name && <p className="text-sm text-muted-foreground">{option.profiles.company_name}</p>}
                              </div>
                              {option.max_amount && <p className="text-lg font-bold text-primary">Up to ₹{option.max_amount.toLocaleString()}</p>}
                            </div>
                            <div className="flex flex-wrap gap-2 mb-4">
                              {option.loan_type?.map((type: string, idx: number) => (
                                <Badge key={idx} variant="secondary">{type}</Badge>
                              ))}
                              {option.quick_approval && <Badge variant="outline" className="text-xs">Quick Approval</Badge>}
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => handleContactFinance(option)} className="flex-1">
                                <Phone className="w-4 h-4 mr-2" />
                                Call
                              </Button>
                              <Button size="sm" onClick={() => handleApplyLoan(option)} className="flex-1">
                                <FileText className="w-4 h-4 mr-2" />
                                Apply
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No financing options available.</p>
                    </div>
                  )}
                </TabsContent>

                {/* Reviews Tab */}
                <TabsContent value="reviews" className="p-6">
                  <h3 className="text-xl font-semibold mb-6">Reviews & Ratings</h3>
                  <ListingRatingSummary
                    itemId={robot.id}
                    itemType="robot"
                    dealType="robot"
                    itemName={robot.name}
                    reviewedUserId={robot.seller_id}
                  />
                </TabsContent>
              </Tabs>
            </Card>
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* AI Analysis Card */}
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Brain className="w-5 h-5 text-primary" />
                  AI Market Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!aiAnalysis ? (
                  <div className="text-center py-4 space-y-4">
                    <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                      <Brain className="w-7 h-7 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">Get Smart Analysis</h4>
                      <p className="text-sm text-muted-foreground">AI-powered insights for this robot</p>
                    </div>
                    <Button
                      onClick={handleAIAnalysis}
                      disabled={analysisLoading || !user}
                      className="w-full"
                      size="sm"
                    >
                      {analysisLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Brain className="w-4 h-4 mr-2" />
                          Generate Analysis
                        </>
                      )}
                    </Button>
                    {!user && <p className="text-xs text-muted-foreground">Sign in to use AI analysis</p>}
                  </div>
                ) : (
                  <AIAnalysisResult
                    analysis={aiAnalysis.analysis}
                    cached={aiAnalysis.cached || false}
                    currentUserLocation={aiAnalysis.currentUserLocation || currentUserLocation}
                  />
                )}
              </CardContent>
            </Card>

            {/* Quick Stats Card */}
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <Eye className="w-5 h-5 text-primary mx-auto mb-1" />
                    <ViewCountDisplay targetType="robots" targetId={robot.id} />
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <Package className="w-5 h-5 text-primary mx-auto mb-1" />
                    <p className="font-semibold">{robot.quantity || 1}</p>
                    <p className="text-xs text-muted-foreground">Available</p>
                  </div>
                </div>
                {robot.payload_capacity && (
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <span className="text-sm text-muted-foreground">Payload</span>
                    <span className="font-semibold">{robot.payload_capacity} kg</span>
                  </div>
                )}
                {robot.reach && (
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <span className="text-sm text-muted-foreground">Reach</span>
                    <span className="font-semibold">{robot.reach} mm</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Generate Report */}
            {user && (
              <Card className="border shadow-sm">
                <CardContent className="p-4">
                  <Button
                    onClick={() => setShowReportModal(true)}
                    variant="outline"
                    className="w-full"
                    size="sm"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Generate Report
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </section>

      {/* Reviews Section - Separate Card */}
      <section className="container mx-auto px-4 pb-8">
        <div className="max-w-5xl mx-auto">
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 text-primary" />
                Reviews & Ratings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ListingRatingSummary
                itemId={robot.id}
                itemType="robot"
                dealType="robot"
                itemName={robot.name}
                reviewedUserId={robot.seller_id}
              />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Fullscreen Image Modal */}
      <Dialog open={showFullscreen} onOpenChange={setShowFullscreen}>
        <DialogContent className="max-w-6xl w-full h-[90vh] p-0">
          <div className="relative w-full h-full bg-black flex items-center justify-center">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 text-white hover:bg-white/20 z-10"
              onClick={() => setShowFullscreen(false)}
            >
              <X className="w-6 h-6" />
            </Button>
            {robot?.images && robot.images.length > 0 && (
              <>
                <img
                  src={robot.images[currentImageIndex]}
                  alt={`${robot.name} - Full size`}
                  className="max-w-full max-h-full object-contain"
                />
                {robot.images.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
                      onClick={() => setCurrentImageIndex((prev) => (prev === 0 ? robot.images.length - 1 : prev - 1))}
                    >
                      <ChevronLeft className="w-8 h-8" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
                      onClick={() => setCurrentImageIndex((prev) => (prev + 1) % robot.images.length)}
                    >
                      <ChevronRight className="w-8 h-8" />
                    </Button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white bg-black/50 px-4 py-2 rounded-full">
                      {currentImageIndex + 1} / {robot.images.length}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Quote Modal */}
      <Dialog open={showImportQuote} onOpenChange={setShowImportQuote}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import Quote Request</DialogTitle>
            <DialogDescription>Request detailed import quotation for this robot.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex justify-between">
              <span>Base Price:</span>
              <span className="font-semibold">{formatPrice(robot.price || 0, robot.currency)}</span>
            </div>
            {importDuty && (
              <>
                <div className="flex justify-between text-orange-600">
                  <span>Estimated Import Duty (18%):</span>
                  <span className="font-semibold">{formatPrice(importDuty, robot.currency)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total Estimated:</span>
                  <span>{formatPrice((robot.price || 0) + importDuty, robot.currency)}</span>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportQuote(false)}>Cancel</Button>
            <Button onClick={sendImportQuoteEmail}>
              <Mail className="w-4 h-4 mr-2" />
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Modal */}
      {robot && (
        <ProfessionalRobotReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          robotData={robot}
        />
      )}

      {/* Loan Application Modal */}
      {robot && (
        <LoanApplicationModal
          open={showLoanApplication}
          onOpenChange={(open) => {
            setShowLoanApplication(open);
            if (!open) setSelectedFinanceProvider(null);
          }}
          financeProvider={selectedFinanceProvider}
          robotDetails={{
            name: robot.name,
            model: robot.model,
            price: robot.price,
            currency: robot.currency,
            type: robot.robot_type,
          }}
        />
      )}

      {/* Robot Quote Modal */}
      {robot && (
        <RobotQuoteModal
          isOpen={showRobotQuoteModal}
          onClose={() => setShowRobotQuoteModal(false)}
          robot={robot}
        />
      )}
    </div>
  );
};

export default RobotDetails;
