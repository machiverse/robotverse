// RobotDetails.tsx

import { useState, useEffect } from "react";
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
import { SEOHead } from "@/components/SEOHead";
import { generateProductSchema } from "@/utils/seoSchemas";

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
  // Optional enhanced fields
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

interface AIAnalysisResultType {
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
  "andhra pradesh",
  "arunachal pradesh",
  "assam",
  "bihar",
  "chhattisgarh",
  "goa",
  "gujarat",
  "haryana",
  "himachal pradesh",
  "jharkhand",
  "karnataka",
  "kerala",
  "madhya pradesh",
  "maharashtra",
  "manipur",
  "meghalaya",
  "mizoram",
  "nagaland",
  "odisha",
  "punjab",
  "rajasthan",
  "sikkim",
  "tamil nadu",
  "telangana",
  "tripura",
  "uttar pradesh",
  "uttarakhand",
  "west bengal",
  "delhi",
  "jammu and kashmir",
  "ladakh",
  "chandigarh",
  "dadra and nagar haveli and daman and diu",
  "lakshadweep",
  "puducherry",
];

const RobotDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { trackButtonClick } = useButtonTracking();
  const { trackItemView } = useUniversalViewTracking();

  const [robot, setRobot] = useState<Robot | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResultType | null>(null);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data states for tabs
  const [services, setServices] = useState<any[]>([]);
  const [spareParts, setSpareParts] = useState<any[]>([]);
  const [financingOptions, setFinancingOptions] = useState<any[]>([]);
  const [logisticsServices, setLogisticsServices] = useState<any[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [loadingSpareParts, setLoadingSpareParts] = useState(false);
  const [loadingFinancing, setLoadingFinancing] = useState(false);
  const [loadingLogistics, setLoadingLogistics] = useState(false);

  // Enhanced states
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

  // Report generation states
  const [showReportModal, setShowReportModal] = useState(false);
  const [showMarketAnalysis, setShowMarketAnalysis] = useState(false);

  // Quote form states
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // Loan application state
  const [showLoanApplication, setShowLoanApplication] = useState(false);
  const [selectedFinanceProvider, setSelectedFinanceProvider] = useState<any>(null);

  // SEO hook
  const { seoElements, generateSEO } = useRobotSEO();

  const isIndianLocation = (state?: string, location?: string) => {
    const s = (state || "").toLowerCase().replace(/\s+/g, "");
    const loc = (location || "").toLowerCase();
    const normalizedStates = INDIAN_STATES.map((st) => st.replace(/\s+/g, ""));
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
          .select(
            `
            *,
            profiles!robots_seller_id_fkey (
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
        setRobot({
          ...data,
          technical_specifications:
            typeof data.technical_specifications === "object" && data.technical_specifications !== null
              ? (data.technical_specifications as Record<string, any>)
              : {},
        });

        // SEO + tracking unchanged
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

        await trackItemView("robots", data.id, data);

        if (user) {
          const { data: watchlistData } = await supabase
            .from("watchlists")
            .select("id")
            .eq("user_id", user.id)
            .eq("item_type", "robot")
            .eq("item_id", data.id)
            .single();
          setIsInWatchlist(!!watchlistData);
        }
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Failed to load robot details");
      } finally {
        setLoading(false);
      }
    };
    fetchRobot();
  }, [id, user, generateSEO, trackItemView]);

  useEffect(() => {
    const fetchUserLocation = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase.from("profiles").select("location").eq("id", user.id).single();
        if (error) {
          console.error("Error fetching user location:", error);
          return;
        }
        if (data?.location) setCurrentUserLocation(data.location);
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
        .select(
          `
          *,
          profiles!services_provider_id_fkey (
            full_name,
            company_name,
            phone,
            mobile_number,
            email,
            location,
            avatar_url
          )
        `,
        )
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
      let query = supabase.from("spare_parts").select(
        `
          *,
          profiles!spare_parts_seller_id_fkey (
            full_name,
            company_name,
            phone,
            mobile_number,
            email,
            location
          )
        `,
      );
      if (robot) {
        query = query.or(
          `compatible_robots.cs.{${robot.model}},compatible_robots.cs.{${robot.brand}},compatible_robots.cs.{${robot.name}}`,
        );
      }
      const { data, error } = await query.limit(12);
      if (error) throw error;
      const sortedData = data?.sort((a, b) => {
        if (!currentUserLocation) return 0;
        const aDistance = a.profiles?.location?.toLowerCase().includes(currentUserLocation.toLowerCase()) ? 0 : 1;
        const bDistance = b.profiles?.location?.toLowerCase().includes(currentUserLocation.toLowerCase()) ? 0 : 1;
        return aDistance - bDistance;
      });
      setSpareParts(sortedData || []);
    } catch (err) {
      console.error("Error fetching spare parts:", err);
    } finally {
      setLoadingSpareParts(false);
    }
  };

  const fetchFinancingOptions = async () => {
    setLoadingFinancing(true);
    try {
      const { data, error } = await supabase
        .from("loan_products")
        .select(
          `
          *,
          profiles!loan_products_provider_id_fkey (
            full_name,
            company_name,
            phone,
            location
          )
        `,
        )
        .eq("is_active", true)
        .limit(10);
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
      const { data, error } = await supabase
        .from("logistics_services")
        .select(
          `
          *,
          profiles!logistics_services_provider_id_fkey (
            full_name,
            company_name,
            phone,
            location,
            email,
            mobile_number
          )
        `,
        )
        .eq("is_active", true)
        .limit(10);
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

  const handleContactSupplier = async (supplierPhone: string, supplierName: string, itemType: string) => {
    if (!supplierPhone) {
      toast({
        title: "Phone Number Not Available",
        description: `${supplierName}'s phone number is not provided.`,
        variant: "destructive",
      });
      return;
    }
    const phoneNumber = supplierPhone.replace(/\D/g, "");
    window.open(`tel:${phoneNumber}`, "_self");
    toast({
      title: "Calling Supplier",
      description: `Calling ${supplierName} at ${supplierPhone}`,
    });
    if (robot) {
      await trackButtonClick({
        buttonName: `Contact ${itemType} Supplier`,
        buttonType: `contact_${itemType.toLowerCase()}_supplier`,
        sellerId: robot.seller_id,
        sellerName: supplierName,
        itemId: robot.id,
        itemType: "robot",
        additionalData: {
          robotName: robot.name,
          phoneNumber: supplierPhone,
          supplierType: itemType,
        },
      });
    }
  };

  const handleContactSeller = async () => {
    if (!robot?.profiles?.phone && !robot?.profiles?.mobile_number) {
      toast({
        title: "Phone Number Not Available",
        description: "Seller's phone number is not provided.",
        variant: "destructive",
      });
      return;
    }
    const phone = robot.profiles.mobile_number || robot.profiles.phone;
    const phoneNumber = phone.replace(/\D/g, "");
    window.open(`tel:${phoneNumber}`, "_self");
    toast({
      title: "Calling Seller",
      description: `Calling ${robot.profiles.company_name || robot.profiles.full_name} at ${phone}`,
    });
    await trackButtonClick({
      buttonName: "Contact Seller - Phone",
      buttonType: "contact_seller_phone",
      sellerId: robot.seller_id,
      sellerName: robot.profiles?.full_name || "Unknown",
      sellerCompany: robot.profiles?.company_name || "Unknown",
      sellerEmail: robot.profiles?.email || "Unknown",
      sellerMobile: phone || "Unknown",
      sellerLocation: robot.profiles?.location || robot.location || "Unknown",
      itemId: robot.id,
      itemType: "robot",
      additionalData: {
        robotName: robot.name,
        robotModel: robot.model,
        price: robot.price,
        contactMethod: "phone",
      },
    });
  };

  const handleRequestQuote = async () => {
    if (!robot?.profiles?.email) {
      toast({
        title: "Email Not Available",
        description: "Seller's email address is not provided.",
        variant: "destructive",
      });
      return;
    }
    const subject = `Quote Request for ${robot.name} - ${robot.model}`;
    const body = `Dear ${robot.profiles.full_name},

I am interested in the following robot:

Robot: ${robot.name}
Model: ${robot.model}
Type: ${robot.robot_type}
Price: ${robot.price ? `${robot.currency} ${robot.price}` : "Price on Request"}

Please provide:
1. Detailed quotation
2. Availability and delivery timeline
3. Warranty and service terms
4. Payment options

Best regards,
${user?.user_metadata?.full_name || "Interested Buyer"}`;
    const mailtoLink = `mailto:${robot.profiles.email}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;
    window.open(mailtoLink, "_blank");
    toast({
      title: "Quote Request Sent",
      description: `${robot.profiles.company_name || robot.profiles.full_name} will receive your email.`,
    });
  };

  const handleAddToWatchlist = async () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to add items to your watchlist.",
        variant: "destructive",
      });
      return;
    }
    if (!robot) return;
    setAddingToWatchlist(true);
    try {
      if (isInWatchlist) {
        const { error } = await supabase
          .from("watchlists")
          .delete()
          .eq("user_id", user.id)
          .eq("item_type", "robot")
          .eq("item_id", robot.id);
        if (error) throw error;
        setIsInWatchlist(false);
        toast({
          title: "Removed from Watchlist",
          description: `${robot.name} has been removed from your watchlist.`,
        });
      } else {
        const { error } = await supabase.from("watchlists").insert([
          {
            user_id: user.id,
            item_type: "robot",
            item_id: robot.id,
            item_data: {
              name: robot.name,
              model: robot.model,
              price: robot.price,
              currency: robot.currency,
              image: robot.images?.[0] || null,
            },
          },
        ]);
        if (error) throw error;
        setIsInWatchlist(true);
        toast({
          title: "Added to Watchlist",
          description: `${robot.name} has been added to your watchlist.`,
        });
      }
    } catch (err) {
      console.error("Error updating watchlist:", err);
      toast({
        title: "Error",
        description: "Failed to update watchlist. Please try again.",
        variant: "destructive",
      });
    } finally {
      setAddingToWatchlist(false);
    }
  };

  const nextImage = () => {
    if (!robot?.images) return;
    setCurrentImageIndex((prev) => (prev + 1) % robot.images.length);
  };

  const prevImage = () => {
    if (!robot?.images) return;
    setCurrentImageIndex((prev) => (prev === 0 ? robot.images.length - 1 : prev - 1));
  };

  const handleAIAnalysis = async () => {
    if (!robot || !user) {
      toast({
        title: "Login Required",
        description: "Please log in to use AI analysis.",
        variant: "destructive",
      });
      return;
    }
    setAnalysisLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/roboverse-ai-analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          robotData: robot,
          userId: user.id,
          userLocation: currentUserLocation,
        }),
      });
      if (!response.ok) throw new Error("Failed to analyze robot");
      const data = await response.json();
      setAiAnalysis(data);
      await trackButtonClick({
        buttonName: "AI Analysis",
        buttonType: "ai_analysis",
        sellerId: robot.seller_id,
        itemId: robot.id,
        itemType: "robot",
        additionalData: {
          robotName: robot.name,
          robotModel: robot.model,
          analysisType: "comprehensive",
        },
      });
      toast({
        title: "AI Analysis Complete",
        description: "Intelligent market analysis has been generated.",
      });
    } catch (err) {
      console.error("AI Analysis error:", err);
      toast({
        title: "Analysis Failed",
        description: "Failed to generate AI analysis. Please try again.",
        variant: "destructive",
      });
    } finally {
      setAnalysisLoading(false);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    const currencySymbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : currency === "INR" ? "₹" : "₹";
    return `${currencySymbol}${price.toLocaleString()}`;
  };

  const calculateImportDuty = (basePrice: number, currency: string) => {
    const indianStates = [
      "andhra pradesh",
      "arunachal pradesh",
      "assam",
      "bihar",
      "chhattisgarh",
      "goa",
      "gujarat",
      "haryana",
      "himachal pradesh",
      "jharkhand",
      "karnataka",
      "kerala",
      "madhya pradesh",
      "maharashtra",
      "manipur",
      "meghalaya",
      "mizoram",
      "nagaland",
      "odisha",
      "punjab",
      "rajasthan",
      "sikkim",
      "tamil nadu",
      "telangana",
      "tripura",
      "uttar pradesh",
      "uttarakhand",
      "west bengal",
      "delhi",
      "jammu and kashmir",
      "ladakh",
      "chandigarh",
      "dadra and nagar haveli and daman and diu",
      "lakshadweep",
      "puducherry",
    ];
    const isInIndia = robot?.state && indianStates.includes(robot.state.toLowerCase());
    const isOutsideIndia = !isInIndia;
    if (isOutsideIndia && basePrice) {
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
      toast({
        title: "Email Not Available",
        description: "Seller's email address is not provided.",
        variant: "destructive",
      });
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
    const body = `Dear ${robot.profiles.full_name},

I am interested in importing the following robot to India:

Robot: ${robot.name}
Model: ${robot.model}
Type: ${robot.robot_type}
Base Price: ${formatPrice(basePrice, robot.currency)}
${duty > 0 ? `Estimated Import Duty (18%): ${formatPrice(duty, robot.currency)}` : ""}
${duty > 0 ? `Total Estimated Cost: ${formatPrice(totalPrice, robot.currency)}` : ""}

Please provide detailed information on:
1. Complete pricing including all applicable duties and taxes
2. Import documentation and procedures
3. Shipping and logistics arrangements
4. Delivery timeline to India
5. Installation and commissioning support
6. Warranty terms for imported equipment
7. After-sales service availability in India

Best regards,
${user?.user_metadata?.full_name || "Interested Buyer"}`;
    const mailtoLink = `mailto:${robot.profiles.email}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;
    window.open(mailtoLink, "_blank");
    setShowImportQuote(false);
    toast({
      title: "Import Quote Request Sent",
      description: `${robot.profiles.company_name || robot.profiles.full_name} will receive your request.`,
    });
  };

  const handleGenerateReport = () => {
    if (!robot || !user) {
      toast({
        title: "Login Required",
        description: "Please log in to generate robot reports.",
        variant: "destructive",
      });
      return;
    }
    setShowReportModal(true);
    toast({
      title: "Opening Report Generator",
      description: "Preparing comprehensive robot analysis...",
    });
  };

  const handleFindSimilar = () => {
    const searchParams = new URLSearchParams({
      type: robot?.robot_type || "",
      category: robot?.category_tags?.[0] || "",
    });
    navigate(`/robots?${searchParams.toString()}`);
    toast({
      title: "Finding Similar Robots",
      description: "Redirecting to search results...",
    });
  };

  const handleContactService = (service: any) => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to contact service providers.",
        variant: "destructive",
      });
      return;
    }
    const phone = service.profiles?.phone || service.profiles?.mobile_number;
    if (!phone) {
      toast({
        title: "Phone Number Not Available",
        description: "Service provider's phone number is not provided.",
        variant: "destructive",
      });
      return;
    }
    const phoneNumber = phone.replace(/\D/g, "");
    window.open(`tel:${phoneNumber}`, "_self");
    toast({
      title: "Calling Service Provider",
      description: `Calling ${service.profiles?.company_name || service.profiles?.full_name} at ${phone}`,
    });
  };

  const handleContactSpareParts = (part: any) => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to contact spare parts providers.",
        variant: "destructive",
      });
      return;
    }
    const phone = part.profiles?.phone || part.profiles?.mobile_number;
    if (!phone) {
      toast({
        title: "Phone Number Not Available",
        description: "Spare parts provider's phone number is not provided.",
        variant: "destructive",
      });
      return;
    }
    const phoneNumber = phone.replace(/\D/g, "");
    window.open(`tel:${phoneNumber}`, "_self");
    toast({
      title: "Calling Parts Provider",
      description: `Calling ${part.profiles?.company_name || part.profiles?.full_name} at ${phone}`,
    });
  };

  const handleContactLogistics = (service: any) => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to contact logistics providers.",
        variant: "destructive",
      });
      return;
    }
    const phone = service.profiles?.phone || service.profiles?.mobile_number;
    if (!phone) {
      toast({
        title: "Phone Number Not Available",
        description: "Logistics provider's phone number is not provided.",
        variant: "destructive",
      });
      return;
    }
    const phoneNumber = phone.replace(/\D/g, "");
    window.open(`tel:${phoneNumber}`, "_self");
    toast({
      title: "Calling Logistics Provider",
      description: `Calling ${service.profiles?.company_name || service.profiles?.full_name} at ${phone}`,
    });
  };

  const handleContactFinance = (option: any) => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to contact finance providers.",
        variant: "destructive",
      });
      return;
    }
    const phone = option.profiles?.phone || option.profiles?.mobile_number;
    if (!phone) {
      toast({
        title: "Phone Number Not Available",
        description: "Finance provider's phone number is not provided.",
        variant: "destructive",
      });
      return;
    }
    const phoneNumber = phone.replace(/\D/g, "");
    window.open(`tel:${phoneNumber}`, "_self");
    toast({
      title: "Calling Finance Provider",
      description: `Calling ${option.profiles?.company_name || option.profiles?.full_name} at ${phone}`,
    });
  };

  const handleGetLogisticsQuote = (service: any) => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to request logistics quotes.",
        variant: "destructive",
      });
      return;
    }
    if (!service.profiles?.email) {
      toast({
        title: "Email Not Available",
        description: "Logistics provider's email address is not provided.",
        variant: "destructive",
      });
      return;
    }
    const subject = `Logistics Quote Request for ${robot?.name} - ${robot?.model}`;
    const body = `Dear ${service.profiles.full_name},

I need logistics services for the following robot equipment:

Robot: ${robot?.name}
Model: ${robot?.model}
Type: ${robot?.robot_type}
Price: ${robot?.price ? `${robot.currency} ${robot.price}` : "Price on Request"}
Current Location: ${robot?.location}
My Location: ${currentUserLocation}

Service Required: ${service.service_name}
Service Type: ${service.service_type}

Please provide:
1. Detailed logistics quote
2. Transit time and delivery schedule
3. Insurance and safety measures
4. Special handling requirements
5. Payment terms

Best regards,
${user?.user_metadata?.full_name || "Interested Buyer"}`;
    const mailtoLink = `mailto:${service.profiles.email}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;
    window.open(mailtoLink, "_blank");
    toast({
      title: "Quote Request Sent",
      description: `${service.profiles.company_name || service.profiles.full_name} will receive your request.`,
    });
  };

  const handleApplyLoan = (option: any) => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to apply for loans.",
        variant: "destructive",
      });
      return;
    }
    setSelectedFinanceProvider(option);
    setShowLoanApplication(true);
  };

  const handleGetReport = () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to access technical reports.",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Technical Report",
      description: "Generating detailed technical specifications report...",
    });
  };

  const handleCheckLoan = () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to check financing options.",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Financing Options",
      description: "Checking available loan and financing options...",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/20">
        <EnhancedHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mr-2" />
            <span>Loading robot details...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !robot) {
    return (
      <div className="min-h-screen bg-muted/20">
        <EnhancedHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center py-12">
            <Bot className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Robot Not Found</h3>
            <p className="text-muted-foreground mb-4">{error || "The requested robot could not be found."}</p>
            <Button onClick={() => navigate("/robots")} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Robots
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/30 via-background to-muted/20">
      <SEOHead
        title={`${robot.brand || ""} ${robot.model || robot.name} - Industrial Robot for Sale | RobotVerse`}
        description={
          robot.description ||
          `Buy ${robot.brand} ${robot.model} industrial robot. ${
            robot.payload_capacity ? `Payload: ${robot.payload_capacity}kg.` : ""
          } ${robot.reach ? `Reach: ${robot.reach}mm.` : ""} Available in ${robot.location || "India"}.`
        }
        keywords={`${robot.brand} robot, ${robot.model}, ${robot.robot_type}, industrial robot, automation, ${
          robot.controller_type || ""
        }, ${robot.applications?.join(", ") || ""}`}
        ogImage={robot.images?.[0] || "/og-image.jpg"}
        jsonLd={generateProductSchema({
          ...robot,
          seller: robot.profiles,
        })}
      />
      <EnhancedHeader />

      <div className="container mx-auto px-4 py-6 max-w-[1600px]">
        {/* Top navigation and meta actions */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="outline"
            onClick={() => navigate("/robots")}
            className="shadow-sm hover:shadow-md transition-shadow"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Robots
          </Button>
          <div className="flex items-center gap-2">
            <ViewCountDisplay targetType="robots" targetId={robot.id} />
            {user && (
              <Button
                onClick={() => setShowReportModal(true)}
                variant="outline"
                size="sm"
                className="shadow-sm hover:shadow-md transition-shadow"
              >
                <FileText className="w-4 h-4 mr-2" />
                Generate Report
              </Button>
            )}
          </div>
        </div>

        {/* Two-column layout: Left = image + content, Right = AI insights + stats */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN */}
          <div className="lg:col-span-8 space-y-6">
            {/* Hero: Full-width image, below it structured title + price + quick info */}
            <Card className="overflow-hidden shadow-2xl border-2 border-border/50 bg-gradient-to-br from-card via-card to-card/80">
              <div className="space-y-6">
                {/* Image block */}
                <div className="relative bg-gradient-to-br from-muted/40 to-muted/60 p-6">
                  <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl ring-4 ring-primary/10">
                    {robot?.images && robot.images.length > 0 ? (
                      <>
                        <ResponsiveImage
                          src={robot.images[currentImageIndex]}
                          alt={`${robot.name} - Image ${currentImageIndex + 1}`}
                          className="w-full h-full object-cover object-center transition-all duration-700 ease-in-out cursor-pointer hover:scale-110"
                          style={{
                            imageOrientation: "from-image",
                          }}
                          onClick={() => setShowFullscreen(true)}
                        />
                        <Button
                          onClick={() => setShowFullscreen(true)}
                          className="absolute top-6 right-6 bg-background/95 hover:bg-background text-foreground p-3 rounded-full shadow-2xl backdrop-blur-md transition-all hover:scale-110"
                          size="sm"
                          aria-label="View fullscreen"
                        >
                          <Maximize2 className="w-5 h-5" />
                        </Button>
                        {robot.images.length > 1 && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute left-6 top-1/2 -translate-y-1/2 bg-background/95 hover:bg-background text-foreground rounded-full shadow-2xl backdrop-blur-md h-12 w-12 transition-all hover:scale-110"
                              onClick={() =>
                                setCurrentImageIndex((prev) => (prev === 0 ? robot.images.length - 1 : prev - 1))
                              }
                              aria-label="Previous image"
                            >
                              <ChevronLeft className="w-6 h-6" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute right-6 top-1/2 -translate-y-1/2 bg-background/95 hover:bg-background text-foreground rounded-full shadow-2xl backdrop-blur-md h-12 w-12 transition-all hover:scale-110"
                              onClick={() => setCurrentImageIndex((prev) => (prev + 1) % robot.images.length)}
                              aria-label="Next image"
                            >
                              <ChevronRight className="w-6 h-6" />
                            </Button>
                            <div className="absolute bottom-6 right-6 bg-background/95 text-foreground px-4 py-1.5 rounded-full shadow-2xl backdrop-blur-md text-sm font-semibold ring-2 ring-primary/20">
                              {currentImageIndex + 1} / {robot.images.length}
                            </div>
                          </>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-full bg-muted/30 rounded-2xl">
                        <Bot className="w-24 h-24 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {robot.images?.length > 1 && (
                    <div className="mt-4">
                      <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
                        {robot.images.map((image, index) => (
                          <button
                            key={index}
                            className={`flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden border-2 transition-all duration-300 hover:scale-110 hover:shadow-xl ${
                              index === currentImageIndex
                                ? "border-primary ring-4 ring-primary/30 scale-105 shadow-xl"
                                : "border-border/50 hover:border-primary/50 opacity-60 hover:opacity-100"
                            }`}
                            onClick={() => setCurrentImageIndex(index)}
                          >
                            <img
                              src={image}
                              alt={`${robot.name} ${index + 1}`}
                              className="w-full h-full object-cover transition-transform duration-300"
                              style={{
                                imageOrientation: "from-image",
                              }}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Formal title / meta panel */}
                <div className="px-6 pb-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {robot.brand && (
                          <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                            {robot.brand}
                          </span>
                        )}
                        {robot.model && <span className="text-sm text-muted-foreground">• {robot.model}</span>}
                      </div>
                      <h1 className="text-3xl md:text-4xl font-bold leading-tight text-primary">{robot.name}</h1>
                      <p className="text-sm md:text-base text-muted-foreground font-medium">{robot.robot_type}</p>
                      <div className="flex flex-wrap items-center gap-3 pt-1">
                        <Badge
                          variant="outline"
                          className="text-green-600 border-green-600 bg-green-50 font-semibold px-3 py-1"
                        >
                          {robot.availability}
                        </Badge>
                        <Badge variant="secondary" className="px-3 py-1">
                          ID: {robot.id}
                        </Badge>
                        {robot.profiles?.company_name && (
                          <Badge variant="outline" className="px-3 py-1">
                            {robot.profiles.company_name}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Price and summary block */}
                    <div className="w-full md:w-auto md:text-right space-y-3">
                      <div className="space-y-1">
                        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Price</p>
                        <p className="text-3xl font-bold text-primary">
                          {robot.price ? formatPrice(robot.price, robot.currency || "INR") : "Price on Request"}
                        </p>
                      </div>

                      <div className="space-y-2 text-sm text-muted-foreground">
                        {robot.location && (
                          <div className="flex md:justify-end gap-2 items-center">
                            <MapPin className="w-4 h-4 text-primary" />
                            <span>{robot.location}</span>
                          </div>
                        )}
                        {robot.year_manufactured && (
                          <div className="flex md:justify-end gap-2 items-center">
                            <Calendar className="w-4 h-4 text-primary" />
                            <span>Year: {robot.year_manufactured}</span>
                          </div>
                        )}
                        {robot.condition && (
                          <div className="flex md:justify-end gap-2 items-center">
                            <Settings className="w-4 h-4 text-primary" />
                            <span className="capitalize">Condition: {robot.condition.replace(/_/g, " ")}</span>
                          </div>
                        )}
                      </div>

                      {outsideIndia && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-orange-700 border-orange-400 hover:bg-orange-100 w-full md:w-auto"
                          onClick={handleImportQuote}
                        >
                          <Plane className="w-4 h-4 mr-2" />
                          Get Import Quote
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Primary actions under title */}
                  <Separator className="my-4" />
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="flex flex-wrap gap-3">
                      {user && user.id === robot.seller_id ? (
                        <Button disabled variant="outline" size="lg" className="w-full md:w-auto">
                          <MessageCircle className="h-5 w-5 mr-2" />
                          You are the Seller
                        </Button>
                      ) : (
                        <ChatButton
                          otherUserId={robot.seller_id}
                          itemId={robot.id}
                          itemType="robot"
                          itemName={robot.name}
                          variant="default"
                          className="w-full md:w-auto bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-xl hover:shadow-2xl transition-all"
                          size="lg"
                        />
                      )}

                      {user && user.id !== robot.seller_id && (
                        <Button
                          onClick={handleAddToWatchlist}
                          variant="outline"
                          disabled={addingToWatchlist}
                          className="w-full md:w-auto hover:shadow-lg transition-all"
                          size="lg"
                        >
                          <Heart className={`h-5 w-5 mr-2 ${isInWatchlist ? "fill-current text-red-500" : ""}`} />
                          {isInWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
                        </Button>
                      )}
                    </div>

                    {!user && (
                      <div className="p-3 rounded-lg border border-border bg-muted/30 text-center text-xs text-muted-foreground">
                        Please{" "}
                        <Button
                          variant="link"
                          className="p-0 h-auto text-primary underline font-semibold"
                          onClick={() => navigate("/auth")}
                        >
                          log in
                        </Button>{" "}
                        to chat with the seller and access advanced tools.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* QUICK ACTIONS under hero & title */}
            {user && (
              <Card className="shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAIAnalysis}
                      className="text-purple-600 border-purple-200 hover:bg-purple-50 hover:shadow-md transition-all"
                    >
                      <Brain className="w-4 h-4 mr-2" />
                      AI Analysis
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateReport}
                      className="text-orange-600 border-orange-200 hover:bg-orange-50 hover:shadow-md transition-all"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Get Report
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCheckLoan}
                      className="text-green-600 border-green-200 hover:bg-green-50 hover:shadow-md transition-all"
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Check Loan
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleFindSimilar}
                      className="text-blue-600 border-blue-200 hover:bg-blue-50 hover:shadow-md transition-all"
                    >
                      <Search className="w-4 h-4 mr-2" />
                      Find Similar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* TABS: Overview → Specifications → Spare Parts → Services → Logistics → Financing */}
            <Card className="shadow-lg">
              <CardContent className="p-0">
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                  <TabsList className="grid w-full grid-cols-6 rounded-none border-b bg-muted/30">
                    <TabsTrigger value="overview" className="data-[state=active]:bg-background">
                      Overview
                    </TabsTrigger>
                    <TabsTrigger value="specifications" className="data-[state=active]:bg-background">
                      Specifications
                    </TabsTrigger>
                    <TabsTrigger value="spareparts" className="data-[state=active]:bg-background">
                      Spare Parts
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

                  {/* OVERVIEW */}
                  <TabsContent value="overview" className="p-8">
                    <div className="space-y-8">
                      <div className="space-y-6">
                        <div className="flex items-center gap-3 mb-4">
                          <Bot className="w-6 h-6 text-primary" />
                          <h3 className="text-2xl font-bold">About This Robot</h3>
                        </div>
                        {robot.description && (
                          <div className="bg-gradient-to-r from-muted/40 to-muted/20 rounded-xl p-6 border border-border/50">
                            <p className="text-base leading-relaxed text-foreground">{robot.description}</p>
                          </div>
                        )}

                        <div className="grid md:grid-cols-2 gap-8">
                          <div className="space-y-4">
                            <h4 className="flex items-center gap-2 font-bold text-lg">
                              <Settings className="w-5 h-5 text-primary" />
                              Technical Overview
                            </h4>
                            <div className="space-y-3">
                              {robot.brand && (
                                <div className="flex items-center gap-3 text-base">
                                  <span className="w-2.5 h-2.5 bg-primary rounded-full" />
                                  <span className="font-semibold min-w-[140px]">Brand:</span>
                                  <span className="text-muted-foreground">{robot.brand}</span>
                                </div>
                              )}
                              {robot.model && (
                                <div className="flex items-center gap-3 text-base">
                                  <span className="w-2.5 h-2.5 bg-primary rounded-full" />
                                  <span className="font-semibold min-w-[140px]">Model:</span>
                                  <span className="text-muted-foreground">{robot.model}</span>
                                </div>
                              )}
                              {robot.payload_capacity && (
                                <div className="flex items-center gap-3 text-base">
                                  <span className="w-2.5 h-2.5 bg-primary rounded-full" />
                                  <span className="font-semibold min-w-[140px]">Payload:</span>
                                  <span className="text-muted-foreground">{robot.payload_capacity} kg</span>
                                </div>
                              )}
                              {robot.reach && (
                                <div className="flex items-center gap-3 text-base">
                                  <span className="w-2.5 h-2.5 bg-primary rounded-full" />
                                  <span className="font-semibold min-w-[140px]">Reach:</span>
                                  <span className="text-muted-foreground">{robot.reach} mm</span>
                                </div>
                              )}
                              {robot.controller_type && (
                                <div className="flex items-center gap-3 text-base">
                                  <span className="w-2.5 h-2.5 bg-primary rounded-full" />
                                  <span className="font-semibold min-w-[140px]">Controller:</span>
                                  <span className="text-muted-foreground">{robot.controller_type}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="space-y-4">
                            <h4 className="flex items-center gap-2 font-bold text-lg">
                              <Wrench className="w-5 h-5 text-primary" />
                              Key Features
                            </h4>
                            <div className="space-y-3">
                              {robot.year_manufactured && (
                                <div className="flex items-center gap-3 text-base">
                                  <span className="w-2.5 h-2.5 bg-primary rounded-full" />
                                  <span className="font-semibold min-w-[140px]">Year:</span>
                                  <span className="text-muted-foreground">{robot.year_manufactured}</span>
                                </div>
                              )}
                              {robot.condition && (
                                <div className="flex items-center gap-3 text-base">
                                  <span className="w-2.5 h-2.5 bg-primary rounded-full" />
                                  <span className="font-semibold min-w-[140px]">Condition:</span>
                                  <span className="text-muted-foreground capitalize">
                                    {robot.condition.replace("_", " ")}
                                  </span>
                                </div>
                              )}
                              {robot.operating_environment && (
                                <div className="flex items-center gap-3 text-base">
                                  <span className="w-2.5 h-2.5 bg-primary rounded-full" />
                                  <span className="font-semibold min-w-[140px]">Environment:</span>
                                  <span className="text-muted-foreground">{robot.operating_environment}</span>
                                </div>
                              )}
                              {robot.warranty_info && (
                                <div className="flex items-center gap-3 text-base">
                                  <span className="w-2.5 h-2.5 bg-primary rounded-full" />
                                  <span className="font-semibold min-w-[140px]">Warranty:</span>
                                  <span className="text-muted-foreground">{robot.warranty_info}</span>
                                </div>
                              )}
                              {robot.repeatability && (
                                <div className="flex items-center gap-3 text-base">
                                  <span className="w-2.5 h-2.5 bg-primary rounded-full" />
                                  <span className="font-semibold min-w-[140px]">Repeatability:</span>
                                  <span className="text-muted-foreground">±{robot.repeatability} mm</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {robot.applications && robot.applications.length > 0 && (
                          <div className="space-y-4">
                            <h4 className="flex items-center gap-2 font-bold text-lg">
                              <Tag className="w-5 h-5 text-primary" />
                              Suitable Applications
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {robot.applications.map((app: string, index: number) => (
                                <Badge key={index} variant="secondary" className="text-sm px-3 py-1">
                                  {app}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {robot.certification_standards && robot.certification_standards.length > 0 && (
                          <div className="space-y-4">
                            <h4 className="flex items-center gap-2 font-bold text-lg">
                              <Shield className="w-5 h-5 text-primary" />
                              Certifications
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {robot.certification_standards.map((cert: string, index: number) => (
                                <Badge key={index} variant="outline" className="text-sm px-3 py-1">
                                  {cert}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {seoElements && (
                          <div className="bg-gradient-to-r from-muted/50 to-muted/30 rounded-xl p-6 border border-border/50">
                            <div className="prose prose-sm max-w-none">
                              {seoElements.seoContentBlock.split("\n\n").map((paragraph: string, index: number) => (
                                <p key={index} className="mb-4 last:mb-0 leading-relaxed text-sm text-muted-foreground">
                                  {paragraph.trim()}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  {/* SPECIFICATIONS */}
                  <TabsContent value="specifications" className="p-8">
                    <div className="space-y-6">
                      <h3 className="text-2xl font-bold mb-4">Technical Specifications</h3>
                      {robot.technical_specifications && Object.keys(robot.technical_specifications).length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {Object.entries(robot.technical_specifications).map(([key, value]) => (
                            <div key={key} className="flex justify-between border-b border-border/50 py-2">
                              <span className="font-semibold capitalize">{key.replace(/_/g, " ")}</span>
                              <span className="text-muted-foreground">{value as any}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">No technical specifications available.</p>
                      )}
                    </div>
                  </TabsContent>

                  {/* SPARE PARTS */}
                  <TabsContent value="spareparts" className="p-8">
                    <div className="space-y-6">
                      <h3 className="text-2xl font-bold mb-4">Compatible Spare Parts</h3>
                      {loadingSpareParts ? (
                        <div className="flex items-center justify-center">
                          <Loader2 className="w-6 h-6 animate-spin mr-2" />
                          Loading spare parts...
                        </div>
                      ) : spareParts.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {spareParts.map((part) => (
                            <Card key={part.id} className="shadow-md">
                              <CardContent>
                                <h4 className="font-semibold text-lg">{part.name || part.part_name}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {part.description || "No description available."}
                                </p>
                                <div className="mt-2 flex justify-between items-center">
                                  <Button size="sm" onClick={() => handleContactSpareParts(part)}>
                                    Call Supplier
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedSupplier(part.profiles);
                                      setSelectedItem(part);
                                      setShowQuoteForm(true);
                                    }}
                                  >
                                    Request Quote
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">No compatible spare parts found.</p>
                      )}
                    </div>
                  </TabsContent>

                  {/* SERVICES */}
                  <TabsContent value="services" className="p-8">
                    <div className="space-y-6">
                      <h3 className="text-2xl font-bold mb-4">Related Services</h3>
                      {loadingServices ? (
                        <div className="flex items-center justify-center">
                          <Loader2 className="w-6 h-6 animate-spin mr-2" />
                          Loading services...
                        </div>
                      ) : services.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {services.map((service) => (
                            <Card key={service.id} className="shadow-md">
                              <CardContent>
                                <h4 className="font-semibold text-lg">{service.service_name}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {service.description || "No description available."}
                                </p>
                                <div className="mt-2 flex justify-between items-center">
                                  <Button size="sm" onClick={() => handleContactService(service)}>
                                    Call Provider
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedSupplier(service.profiles);
                                      setSelectedItem(service);
                                      setShowQuoteForm(true);
                                    }}
                                  >
                                    Request Quote
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">No related services found.</p>
                      )}
                    </div>
                  </TabsContent>

                  {/* LOGISTICS */}
                  <TabsContent value="logistics" className="p-8">
                    <div className="space-y-6">
                      <h3 className="text-2xl font-bold mb-4">Logistics Providers</h3>
                      {loadingLogistics ? (
                        <div className="flex items-center justify-center">
                          <Loader2 className="w-6 h-6 animate-spin mr-2" />
                          Loading logistics services...
                        </div>
                      ) : logisticsServices.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {logisticsServices.map((logistics) => (
                            <Card key={logistics.id} className="shadow-md">
                              <CardContent>
                                <h4 className="font-semibold text-lg">{logistics.service_name}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {logistics.description || "No description available."}
                                </p>
                                <div className="mt-2 flex justify-between items-center">
                                  <Button size="sm" onClick={() => handleContactLogistics(logistics)}>
                                    Call Provider
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleGetLogisticsQuote(logistics)}
                                  >
                                    Request Quote
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">No logistics providers found.</p>
                      )}
                    </div>
                  </TabsContent>

                  {/* FINANCING */}
                  <TabsContent value="financing" className="p-8">
                    <div className="space-y-6">
                      <h3 className="text-2xl font-bold mb-4">Financing Options</h3>
                      {loadingFinancing ? (
                        <div className="flex items-center justify-center">
                          <Loader2 className="w-6 h-6 animate-spin mr-2" />
                          Loading financing options...
                        </div>
                      ) : financingOptions.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {financingOptions.map((option) => (
                            <Card key={option.id} className="shadow-md">
                              <CardContent>
                                <h4 className="font-semibold text-lg">{option.product_name}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {option.description || "No description available."}
                                </p>
                                <div className="mt-2 flex justify-between items-center">
                                  <Button size="sm" onClick={() => handleContactFinance(option)}>
                                    Call Provider
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => handleApplyLoan(option)}>
                                    Apply for Loan
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">No financing options available.</p>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN: AI Market Insights + Quick Stats */}
          <div className="lg:col-span-4 space-y-6">
            {/* AI MARKET INSIGHTS at top right */}
            <Card className="shadow-xl border-2 border-purple/20 bg-gradient-to-br from-card to-card/80">
              <CardHeader className="border-b bg-gradient-to-r from-purple-500/10 to-purple-400/5">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Brain className="w-6 h-6 text-purple-600" />
                  AI Market Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {!aiAnalysis ? (
                  <div className="text-center py-6 space-y-4">
                    <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto shadow-lg">
                      <Brain className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground">Get Smart Analysis</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      AI-powered recommendations for spare parts, services, financing, and logistics.
                    </p>
                    <Button
                      onClick={handleAIAnalysis}
                      disabled={analysisLoading || !user}
                      className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all"
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
                    {!user && <p className="text-xs text-muted-foreground mt-2">Please log in to use AI analysis.</p>}
                  </div>
                ) : (
                  <AIAnalysisResult
                    analysis={aiAnalysis.analysis}
                    cached={aiAnalysis.cached || false}
                    currentUserLocation={aiAnalysis.currentUserLocation || currentUserLocation}
                    className="mt-2"
                  />
                )}
              </CardContent>
            </Card>

            {/* QUICK STATS under AI insights */}
            <Card className="shadow-xl bg-gradient-to-br from-primary/5 to-primary/10 border-2 border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-background/50 rounded-lg">
                    <Eye className="w-6 h-6 text-primary mx-auto mb-2" />
                    <ViewCountDisplay targetType="robots" targetId={robot.id} />
                  </div>

                  <div className="text-center p-4 bg-background/50 rounded-lg">
                    <Calendar className="w-6 h-6 text-primary mx-auto mb-2" />
                    <p className="text-2xl font-bold text-foreground">{robot.year_manufactured || "N/A"}</p>
                    <p className="text-xs text-muted-foreground">Year</p>
                  </div>

                  {robot.payload_capacity && (
                    <div className="text-center p-4 bg-background/50 rounded-lg">
                      <Package className="w-6 h-6 text-primary mx-auto mb-2" />
                      <p className="text-2xl font-bold text-foreground">{robot.payload_capacity}</p>
                      <p className="text-xs text-muted-foreground">Payload (kg)</p>
                    </div>
                  )}

                  {robot.reach && (
                    <div className="text-center p-4 bg-background/50 rounded-lg">
                      <Settings className="w-6 h-6 text-primary mx-auto mb-2" />
                      <p className="text-2xl font-bold text-foreground">{robot.reach}</p>
                      <p className="text-xs text-muted-foreground">Reach (mm)</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* MODALS */}
      <Dialog open={showFullscreen} onOpenChange={setShowFullscreen}>
        <DialogContent className="max-w-7xl max-h-[90vh] p-0">
          <div className="relative">
            <img
              src={robot?.images?.[currentImageIndex]}
              alt={`${robot?.name} ${currentImageIndex + 1}`}
              className="w-full h-full object-contain rounded-lg bg-muted max-h-[90vh]"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white"
              onClick={() => setShowFullscreen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
            {robot?.images && robot.images.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                  onClick={prevImage}
                >
                  <ChevronLeft className="w-6 h-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                  onClick={nextImage}
                >
                  <ChevronRight className="w-6 h-6" />
                </Button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded">
                  {currentImageIndex + 1} / {robot.images.length}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showImportQuote} onOpenChange={setShowImportQuote}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Import Quote</DialogTitle>
            <DialogDescription>Send a detailed import quote request to the seller.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              Robot:{" "}
              <span className="font-semibold text-foreground">
                {robot.name} ({robot.model})
              </span>
            </p>
            <p>
              Base Price:{" "}
              <span className="font-semibold text-foreground">{formatPrice(robot.price, robot.currency)}</span>
            </p>
            {importDuty && (
              <p>
                Estimated Import Duty (18%):{" "}
                <span className="font-semibold text-foreground">{formatPrice(importDuty, robot.currency)}</span>
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportQuote(false)}>
              Cancel
            </Button>
            <Button onClick={sendImportQuoteEmail}>Send Import Quote Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEmiCalculator} onOpenChange={setShowEmiCalculator}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>EMI Calculator for {robot?.name}</DialogTitle>
            <DialogDescription>Calculate your loan EMI for this robot equipment.</DialogDescription>
          </DialogHeader>
          <LoanCalculator
            defaultAmount={robot?.price || 1000000}
            defaultRate={10.5}
            defaultTenure={60}
            onClose={() => setShowEmiCalculator(false)}
          />
        </DialogContent>
      </Dialog>

      <LoanApplicationModal
        open={showLoanApplication}
        onOpenChange={(open) => {
          setShowLoanApplication(open);
          if (!open) {
            setSelectedFinanceProvider(null);
          }
        }}
        robotDetails={
          robot
            ? {
                name: robot.name,
                model: robot.model,
                price: robot.price || 0,
                currency: robot.currency || "INR",
                type: robot.robot_type,
              }
            : undefined
        }
        financeProvider={selectedFinanceProvider}
      />

      <ProfessionalRobotReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        robotData={robot}
      />

      <ComprehensiveAIMarketAnalysis
        isOpen={showMarketAnalysis}
        onClose={() => setShowMarketAnalysis(false)}
        robotData={robot}
      />

      {showQuoteForm && selectedSupplier && selectedItem && (
        <SupplierQuoteForm
          onClose={() => {
            setShowQuoteForm(false);
            setSelectedSupplier(null);
            setSelectedItem(null);
          }}
          supplierInfo={selectedSupplier}
          itemInfo={selectedItem}
          robotInfo={
            robot
              ? {
                  name: robot.name,
                  model: robot.model,
                  id: robot.id,
                }
              : undefined
          }
        />
      )}
    </div>
  );
};

export default RobotDetails;
