import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { 
  ArrowLeft, 
  Heart, 
  MessageCircle, 
  Phone, 
  MapPin, 
  Calendar,
  FileText,
  ChevronLeft,
  ChevronRight,
  Share2,
  Search,
  Download,
  Maximize2,
  Minimize2,
  Users,
  Building,
  Clock,
  ShieldCheck,
  Star,
  TrendingUp,
  Zap,
  Package,
  Truck,
  CreditCard,
  Info,
  ChevronDown,
  ExternalLink,
  MessageSquare,
  Mail,
  Globe,
  User,
  Factory,
  Wrench,
  DollarSign,
  AlertCircle,
  CheckCircle,
  X
} from "lucide-react";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import { useToast } from "@/hooks/use-toast";
import EnhancedHeader from "@/components/EnhancedHeader";
import { useAuth } from "@/hooks/useAuth";
import AIAnalysisResult from "@/components/AIAnalysisResult";
import EnhancedRobotReportModal from "@/components/EnhancedRobotReportModal";
import LoanApplicationModal from "@/components/forms/LoanApplicationModal";
import LoanCalculator from "@/components/forms/LoanCalculator";
import SupplierQuoteForm from "@/components/forms/SupplierQuoteForm";
import ViewCountDisplay from "@/components/ViewCountDisplay";
import { useUniversalViewTracking } from "@/hooks/useUniversalViewTracking";
import { formatPrice } from "@/utils/currency";

// Updated interfaces to match actual database schema
interface Robot {
  id: string;
  name: string;
  model: string;
  price: number;
  description: string;
  robot_type: string; // Changed from category
  location: string;
  condition: string;
  images: string[];
  technical_specifications: any; // Changed from specifications
  seller_id: string;
  created_at: string;
  profiles: {
    full_name: string;
    company_name?: string;
    phone?: string;
    location?: string;
    avatar_url?: string;
  };
}

interface SparePart {
  id: string;
  name: string;
  price: number;
  description: string;
  condition: string;
  seller_id: string;
  brand: string;
  model: string;
  part_number: string;
  compatible_robots: string[];
  location: string;
  currency: string;
  profiles?: {
    full_name: string;
    company_name?: string;
    phone?: string;
    location?: string;
  };
}

interface Service {
  id: string;
  name: string;
  description: string;
  price_range: string;
  service_type: string;
  coverage: string;
  provider_id: string;
  location: string;
  specializations: string[];
  profiles?: {
    full_name: string;
    company_name?: string;
    phone?: string;
    location?: string;
  };
}

interface LogisticsProvider {
  id: string;
  service_name: string;
  description: string;
  coverage_areas: string[];
  base_price: number;
  price_per_kg: number;
  delivery_time_hours: number;
  provider_id: string;
  profiles?: {
    full_name: string;
    company_name?: string;
    phone?: string;
    location?: string;
  };
}

interface FinanceOption {
  id: string;
  product_name: string;
  description: string;
  min_interest_rate: number;
  max_interest_rate: number;
  min_amount: number;
  max_amount: number;
  max_tenure_months: number;
  provider_id: string;
  profiles?: {
    full_name: string;
    company_name?: string;
    phone?: string;
    location?: string;
  };
}

interface AIAnalysis {
  analysis: string;
  suitabilityScore: number;
  keyInsights: string[];
  recommendation: string;
  currentUserLocation?: string;
}

interface SupplierInfo {
  name: string;
  company?: string;
  phone?: string;
  location?: string;
}

interface ItemInfo {
  name: string;
  price?: number;
  type: 'part' | 'service' | 'logistics' | 'finance';
}

const RobotDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [robot, setRobot] = useState<Robot | null>(null);
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [logisticsProviders, setLogisticsProviders] = useState<LogisticsProvider[]>([]);
  const [financeOptions, setFinanceOptions] = useState<FinanceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'specifications' | 'spareparts' | 'services' | 'logistics' | 'financing'>('overview');
  const [showReportModal, setShowReportModal] = useState(false);
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const [currentUserLocation, setCurrentUserLocation] = useState<string>('');
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierInfo | null>(null);
  const [selectedItem, setSelectedItem] = useState<ItemInfo | null>(null);
  const [isInWatchlist, setIsInWatchlist] = useState(false);

  // Fixed hook usage
  useUniversalViewTracking();

  useEffect(() => {
    if (id) {
      fetchRobotDetails();
      fetchSpareParts();
      fetchServices();
      fetchLogisticsProviders();
      fetchFinanceOptions();
      checkWatchlistStatus();
    }
  }, [id, user]);

  const fetchRobotDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('robots')
        .select(`
          *,
          profiles!robots_seller_id_fkey (full_name, company_name, phone, location, avatar_url)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setRobot(data);
    } catch (error) {
      console.error('Error fetching robot details:', error);
      toast({
        title: "Error",
        description: "Failed to load robot details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSpareParts = async () => {
    try {
      const { data, error } = await supabase
        .from('spare_parts')
        .select(`
          *,
          profiles!spare_parts_seller_id_fkey (full_name, company_name, phone, location)
        `);

      if (error) throw error;
      setSpareParts(data || []);
    } catch (error) {
      console.error('Error fetching spare parts:', error);
    }
  };

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select(`
          *,
          profiles!services_provider_id_fkey (full_name, company_name, phone, location)
        `);

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const fetchLogisticsProviders = async () => {
    try {
      const { data, error } = await supabase
        .from('logistics_services')
        .select(`
          *,
          profiles!logistics_services_provider_id_fkey (full_name, company_name, phone, location)
        `);

      if (error) throw error;
      setLogisticsProviders(data || []);
    } catch (error) {
      console.error('Error fetching logistics providers:', error);
    }
  };

  const fetchFinanceOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('loan_products')
        .select(`
          *,
          profiles!loan_products_provider_id_fkey (full_name, company_name, phone, location)
        `)
        .lte('min_amount', robot?.price || 0)
        .gte('max_amount', robot?.price || 0);

      if (error) throw error;
      setFinanceOptions(data || []);
    } catch (error) {
      console.error('Error fetching finance options:', error);
    }
  };

  const checkWatchlistStatus = async () => {
    if (!user || !id) return;

    try {
      const { data, error } = await supabase
        .from('watchlists')
        .select('id')
        .eq('user_id', user.id)
        .eq('item_id', id)
        .eq('item_type', 'robots')
        .maybeSingle();

      if (!error && data) {
        setIsInWatchlist(true);
      }
    } catch (error) {
      console.error('Error checking watchlist status:', error);
    }
  };

  const handleAddToWatchlist = async () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to add robots to your watchlist",
        variant: "destructive",
      });
      return;
    }

    try {
      if (isInWatchlist) {
        const { error } = await supabase
          .from('watchlists')
          .delete()
          .eq('user_id', user.id)
          .eq('item_id', id)
          .eq('item_type', 'robots');

        if (error) throw error;
        setIsInWatchlist(false);
        toast({
          title: "Removed from Watchlist",
          description: "Robot removed from your watchlist",
        });
      } else {
        const { error } = await supabase
          .from('watchlists')
          .insert([
            {
              user_id: user.id,
              item_id: id,
              item_type: 'robots',
            }
          ]);

        if (error) throw error;
        setIsInWatchlist(true);
        toast({
          title: "Added to Watchlist",
          description: "Robot added to your watchlist",
        });
      }
    } catch (error) {
      console.error('Error updating watchlist:', error);
      toast({
        title: "Error",
        description: "Failed to update watchlist",
        variant: "destructive",
      });
    }
  };

  const handleWhatsAppInquiry = () => {
    if (!robot?.profiles?.phone) {
      toast({
        title: "No Contact Information",
        description: "Phone number not available for this seller",
        variant: "destructive",
      });
      return;
    }

    const message = `Hi! I'm interested in your robot: ${robot.name} (${robot.model}) listed for ₹${robot.price}. Could you please provide more details?`;
    const phoneNumber = robot.profiles.phone.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleShare = async () => {
    const shareData = {
      title: `${robot?.name} - ${robot?.model}`,
      text: `Check out this ${robot?.robot_type} robot for ₹${robot?.price || 0}`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: "Link Copied",
          description: "Robot link copied to clipboard",
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
      toast({
        title: "Share Failed",
        description: "Could not share robot link",
        variant: "destructive",
      });
    }
  };

  const nextImage = () => {
    if (robot?.images) {
      setCurrentImageIndex((prev) => 
        prev === robot.images.length - 1 ? 0 : prev + 1
      );
    }
  };

  const prevImage = () => {
    if (robot?.images) {
      setCurrentImageIndex((prev) => 
        prev === 0 ? robot.images.length - 1 : prev - 1
      );
    }
  };

  const handleAIAnalysis = async () => {
    if (!robot) return;

    setLoadingAI(true);
    try {
      let userLocation = currentUserLocation;
      
      if (!userLocation && navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
          });
          
          userLocation = `${position.coords.latitude}, ${position.coords.longitude}`;
          setCurrentUserLocation(userLocation);
        } catch (error) {
          console.log('Could not get location:', error);
          userLocation = 'Location not available';
        }
      }

      const { data, error } = await supabase.functions.invoke('roboverse-ai-analyze', {
        body: {
          robot: {
            id: robot.id,
            name: robot.name,
            model: robot.model,
            category: robot.robot_type,
            price: robot.price,
            condition: robot.condition,
            location: robot.location,
            description: robot.description,
            specifications: robot.technical_specifications
          },
          userLocation: userLocation || 'Not specified',
          userType: user?.user_metadata?.role || 'buyer'
        }
      });

      if (error) throw error;

      setAiAnalysis({
        ...data,
        currentUserLocation: userLocation
      });
      setShowAIAnalysis(true);
      
      toast({
        title: "AI Analysis Complete",
        description: "Smart insights generated for this robot",
      });
    } catch (error) {
      console.error('Error getting AI analysis:', error);
      toast({
        title: "Analysis Failed",
        description: "Could not generate AI analysis. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingAI(false);
    }
  };

  const handleImportQuote = () => {
    toast({
      title: "Import Quote Request",
      description: "Our logistics team will contact you with import details and pricing.",
    });
  };

  const calculateEMI = (amount: number, rate: number, months: number) => {
    const monthlyRate = rate / 100 / 12;
    const emi = (amount * monthlyRate * Math.pow(1 + monthlyRate, months)) / 
                 (Math.pow(1 + monthlyRate, months) - 1);
    return Math.round(emi);
  };

  const handleQuoteRequest = (supplierInfo: SupplierInfo, itemInfo: ItemInfo) => {
    setSelectedSupplier(supplierInfo);
    setSelectedItem(itemInfo);
    setShowQuoteForm(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/20">
        <EnhancedHeader />
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="h-96 bg-muted rounded"></div>
              </div>
              <div className="space-y-4">
                <div className="h-32 bg-muted rounded"></div>
                <div className="h-24 bg-muted rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!robot) {
    return (
      <div className="min-h-screen bg-muted/20">
        <EnhancedHeader />
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-muted-foreground mb-4">Robot Not Found</h1>
            <p className="text-muted-foreground mb-6">The robot you're looking for doesn't exist or has been removed.</p>
            <Button onClick={() => navigate('/robots')} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Robots
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <EnhancedHeader />
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header Navigation */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="outline" onClick={() => navigate('/robots')} className="shadow-sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Robots
          </Button>
          
          <div className="flex items-center gap-2">
            <ViewCountDisplay targetType="robots" targetId={robot.id} />
            <Button
              onClick={() => setShowReportModal(true)}
              variant="outline"
              size="sm"
              className="shadow-sm"
            >
              <FileText className="w-4 h-4 mr-2" />
              Generate Report
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left main content (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Card container */}
            <Card className="overflow-hidden shadow-lg border border-border bg-card">
              <CardContent className="p-0">
                <div className="grid md:grid-cols-2 gap-0">
                  {/* Image gallery section */}
                  <div className="relative bg-card p-4 rounded-lg shadow-inner">
                    <div className="aspect-square rounded-lg overflow-hidden">
                      {robot?.images && robot.images.length > 0 ? (
                        <>
                          <ResponsiveImage
                            src={robot.images[currentImageIndex]}
                            alt={`${robot.name} - Image ${currentImageIndex + 1}`}
                            className="w-full h-full object-cover cursor-zoom-in transition-transform hover:scale-105"
                            onClick={() => setShowFullscreen(true)}
                          />
                          
                          {/* Image navigation */}
                          {robot.images.length > 1 && (
                            <>
                              <Button
                                variant="outline"
                                size="icon"
                                className="absolute left-6 top-1/2 transform -translate-y-1/2 bg-background/80 backdrop-blur-sm hover:bg-background"
                                onClick={prevImage}
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                className="absolute right-6 top-1/2 transform -translate-y-1/2 bg-background/80 backdrop-blur-sm hover:bg-background"
                                onClick={nextImage}
                              >
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          
                          {/* Action buttons overlay */}
                          <div className="absolute top-4 right-4 flex gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="bg-background/80 backdrop-blur-sm hover:bg-background"
                              onClick={() => setShowFullscreen(true)}
                            >
                              <Maximize2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="bg-background/80 backdrop-blur-sm hover:bg-background"
                              onClick={handleShare}
                            >
                              <Share2 className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          {/* Image counter */}
                          {robot.images.length > 1 && (
                            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                              <div className="bg-background/80 backdrop-blur-sm rounded-full px-3 py-1 text-sm">
                                {currentImageIndex + 1} / {robot.images.length}
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="w-full h-full bg-muted rounded-lg flex items-center justify-center">
                          <div className="text-center">
                            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">No images available</p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Thumbnail strip */}
                    {robot?.images && robot.images.length > 1 && (
                      <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                        {robot.images.map((image, index) => (
                          <button
                            key={index}
                            className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                              index === currentImageIndex ? 'border-primary' : 'border-transparent'
                            }`}
                            onClick={() => setCurrentImageIndex(index)}
                          >
                            <ResponsiveImage
                              src={image}
                              alt={`${robot.name} thumbnail ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Robot information section */}
                  <div className="p-6 space-y-6">
                    <div>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h1 className="text-2xl font-bold text-foreground">{robot.name}</h1>
                          <p className="text-lg text-muted-foreground">{robot.model}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-4">
                        <Badge variant="secondary">{robot.robot_type}</Badge>
                        <Badge variant={robot.condition === 'new' ? 'default' : 'outline'}>
                          {robot.condition}
                        </Badge>
                      </div>
                      
                      <div className="text-3xl font-bold text-primary mb-4">
                        ₹{robot.price?.toLocaleString() || '0'}
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{robot.location}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Listed {new Date(robot.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="font-semibold mb-2">Description</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        {robot.description}
                      </p>
                    </div>

                    {/* AI Analysis Button */}
                    <div className="pt-4">
                      <Button
                        onClick={handleAIAnalysis}
                        disabled={loadingAI}
                        className="w-full"
                        variant="outline"
                      >
                        <Zap className="w-4 h-4 mr-2" />
                        {loadingAI ? 'Analyzing...' : 'Get AI Analysis'}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            {user && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex gap-2">
                    <Button onClick={handleWhatsAppInquiry} className="flex-1">
                      <MessageCircle className="w-4 h-4 mr-2" />
                      WhatsApp Seller
                    </Button>
                    <Button 
                      onClick={() => handleQuoteRequest(
                        {
                          name: robot.profiles.full_name,
                          company: robot.profiles.company_name,
                          phone: robot.profiles.phone,
                          location: robot.profiles.location
                        },
                        {
                          name: robot.name,
                          price: robot.price,
                          type: 'part' as const
                        }
                      )}
                      variant="outline" 
                      className="flex-1"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Request Quote
                    </Button>
                    <Button onClick={handleShare} variant="outline" size="icon">
                      <Share2 className="w-4 h-4" />
                    </Button>
                    <Button 
                      onClick={() => navigate('/robots')}
                      variant="outline"
                      className="flex-1"
                    >
                      <Search className="w-4 h-4 mr-2" />
                      Find Similar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tabs for Details */}
            <Card>
              <CardContent className="p-0">
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                  <TabsList className="grid w-full grid-cols-6 rounded-none border-b">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="specifications">Specifications</TabsTrigger>
                    <TabsTrigger value="spareparts">Spare Parts</TabsTrigger>
                    <TabsTrigger value="services">Services</TabsTrigger>
                    <TabsTrigger value="logistics">Logistics</TabsTrigger>
                    <TabsTrigger value="financing">Financing</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="p-6">
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold mb-3">Robot Overview</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center gap-2">
                            <Factory className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Type:</span>
                            <span className="text-sm font-medium">{robot.robot_type}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Condition:</span>
                            <span className="text-sm font-medium">{robot.condition}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Location:</span>
                            <span className="text-sm font-medium">{robot.location}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Listed:</span>
                            <span className="text-sm font-medium">
                              {new Date(robot.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <h3 className="text-lg font-semibold mb-3">Full Description</h3>
                        <p className="text-muted-foreground leading-relaxed">{robot.description}</p>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="specifications" className="p-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Technical Specifications</h3>
                      {robot.technical_specifications ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {Object.entries(robot.technical_specifications).map(([key, value]) => (
                            <div key={key} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                              <span className="font-medium capitalize">{key.replace('_', ' ')}:</span>
                              <span className="text-muted-foreground">{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">No specifications available for this robot.</p>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="spareparts" className="p-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Available Spare Parts</h3>
                      {spareParts.length > 0 ? (
                        <div className="grid gap-4">
                          {spareParts.map((part) => (
                            <Card key={part.id} className="border border-border hover:shadow-md transition-shadow">
                              <CardContent className="p-4">
                                <div className="flex justify-between items-start mb-3">
                                  <div>
                                    <h4 className="font-medium text-foreground">{part.name}</h4>
                                    <p className="text-sm text-muted-foreground mt-1">{part.description}</p>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-lg font-semibold text-primary">
                                      ₹{part.price?.toLocaleString() || '0'}
                                    </div>
                                    <Badge variant={part.condition === 'new' ? 'default' : 'secondary'}>
                                      {part.condition}
                                    </Badge>
                                  </div>
                                </div>
                                
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                      <Package className="h-4 w-4" />
                                      <span>{part.brand}</span>
                                    </div>
                                    {part.profiles && (
                                      <div className="flex items-center gap-1">
                                        <Building className="h-4 w-4" />
                                        <span>{part.profiles.company_name || part.profiles.full_name}</span>
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div className="flex gap-2">
                                    {part.profiles?.phone && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          const phoneNumber = part.profiles!.phone!.replace(/\D/g, '');
                                          const message = `Hi! I'm interested in the spare part: ${part.name} for ₹${part.price}. Is it available?`;
                                          window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`, '_blank');
                                        }}
                                      >
                                        <MessageCircle className="w-4 h-4 mr-1" />
                                        WhatsApp
                                      </Button>
                                    )}
                                    <Button
                                      size="sm"
                                      onClick={() => handleQuoteRequest(
                                        {
                                          name: part.profiles?.full_name || 'Unknown',
                                          company: part.profiles?.company_name,
                                          phone: part.profiles?.phone,
                                          location: part.profiles?.location
                                        },
                                        {
                                          name: part.name,
                                          price: part.price,
                                          type: 'part'
                                        }
                                      )}
                                    >
                                      <FileText className="w-4 h-4 mr-1" />
                                      Get Quote
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">No spare parts available for this robot.</p>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="services" className="p-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Related Services</h3>
                      {services.length > 0 ? (
                        <div className="grid gap-4">
                          {services.map((service) => (
                            <Card key={service.id} className="border border-border hover:shadow-md transition-shadow">
                              <CardContent className="p-4">
                                <div className="flex justify-between items-start mb-3">
                                  <div>
                                    <h4 className="font-medium text-foreground">{service.name}</h4>
                                    <p className="text-sm text-muted-foreground mt-1">{service.description}</p>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-lg font-semibold text-primary">{service.price_range}</div>
                                    <Badge variant="outline">{service.service_type}</Badge>
                                  </div>
                                </div>
                                
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                      <CheckCircle className="h-4 w-4" />
                                      <span>{service.coverage}</span>
                                    </div>
                                    {service.profiles && (
                                      <div className="flex items-center gap-1">
                                        <Building className="h-4 w-4" />
                                        <span>{service.profiles.company_name || service.profiles.full_name}</span>
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div className="flex gap-2">
                                    {service.profiles?.phone && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          const phoneNumber = service.profiles!.phone!.replace(/\D/g, '');
                                          const message = `Hi! I'm interested in your service: ${service.name}. Can you provide more details?`;
                                          window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`, '_blank');
                                        }}
                                      >
                                        <MessageCircle className="w-4 h-4 mr-1" />
                                        WhatsApp
                                      </Button>
                                    )}
                                    <Button
                                      size="sm"
                                      onClick={() => handleQuoteRequest(
                                        {
                                          name: service.profiles?.full_name || 'Unknown',
                                          company: service.profiles?.company_name,
                                          phone: service.profiles?.phone,
                                          location: service.profiles?.location
                                        },
                                        {
                                          name: service.name,
                                          type: 'service'
                                        }
                                      )}
                                    >
                                      <FileText className="w-4 h-4 mr-1" />
                                      Get Quote
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">No services available for this robot category.</p>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="logistics" className="p-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Logistics Partners</h3>
                      {logisticsProviders.length > 0 ? (
                        <div className="grid gap-4">
                          {logisticsProviders.map((provider) => (
                            <Card key={provider.id} className="border border-border hover:shadow-md transition-shadow">
                              <CardContent className="p-4">
                                <div className="flex justify-between items-start mb-3">
                                  <div>
                                    <h4 className="font-medium text-foreground">{provider.service_name}</h4>
                                    <p className="text-sm text-muted-foreground mt-1">{provider.description}</p>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-lg font-semibold text-primary">₹{provider.base_price}</div>
                                    <div className="text-sm text-muted-foreground">{provider.delivery_time_hours} hours</div>
                                  </div>
                                </div>
                                
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                      <Truck className="h-4 w-4" />
                                      <span>{provider.coverage_areas.join(', ')}</span>
                                    </div>
                                    {provider.profiles && (
                                      <div className="flex items-center gap-1">
                                        <Building className="h-4 w-4" />
                                        <span>{provider.profiles.company_name || provider.profiles.full_name}</span>
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div className="flex gap-2">
                                    {provider.profiles?.phone && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          const phoneNumber = provider.profiles!.phone!.replace(/\D/g, '');
                                          const message = `Hi! I need logistics support for robot transport. Can you help?`;
                                          window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`, '_blank');
                                        }}
                                      >
                                        <MessageCircle className="w-4 h-4 mr-1" />
                                        Call
                                      </Button>
                                    )}
                                    <Button
                                      size="sm"
                                      onClick={() => handleQuoteRequest(
                                        {
                                          name: provider.profiles?.full_name || 'Unknown',
                                          company: provider.profiles?.company_name,
                                          phone: provider.profiles?.phone,
                                          location: provider.profiles?.location
                                        },
                                        {
                                          name: provider.service_name,
                                          type: 'logistics'
                                        }
                                      )}
                                    >
                                      <FileText className="w-4 h-4 mr-1" />
                                      Get Quote
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">No logistics providers available.</p>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="financing" className="p-6">
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold">Financing Options</h3>
                      
                      {robot && (
                        <Card className="border-green-200 bg-green-50">
                          <CardContent className="p-4">
                            <h4 className="font-semibold text-green-900 mb-3">Quick EMI Calculator</h4>
                            <div className="grid grid-cols-3 gap-4 text-center">
                              <div>
                                <div className="text-lg font-semibold text-green-800">₹{calculateEMI(robot.price, 9, 12).toLocaleString()}</div>
                                <div className="text-xs text-green-600">12 months @ 9%</div>
                              </div>
                              <div>
                                <div className="text-lg font-semibold text-green-800">₹{calculateEMI(robot.price, 10, 24).toLocaleString()}</div>
                                <div className="text-xs text-green-600">24 months @ 10%</div>
                              </div>
                              <div>
                                <div className="text-lg font-semibold text-green-800">₹{calculateEMI(robot.price, 12, 36).toLocaleString()}</div>
                                <div className="text-xs text-green-600">36 months @ 12%</div>
                              </div>
                            </div>
                            <div className="mt-4 flex gap-2">
                              <Button size="sm" onClick={() => setShowLoanModal(true)} className="flex-1">
                                Apply for Loan
                              </Button>
                              <Button size="sm" variant="outline" className="flex-1">
                                Full Calculator
                              </Button>
                            </div>
                            <p className="text-xs text-blue-600 text-center bg-blue-50 p-2 rounded border border-blue-100">
                              *Estimates based on 9-12% interest rate. Use full calculator for accurate results.
                            </p>
                          </CardContent>
                        </Card>
                      )}

                      <div className="space-y-4">
                        {financeOptions.length > 0 ? (
                          <div className="grid gap-4">
                            {financeOptions.map((option) => (
                              <Card key={option.id} className="border border-border hover:shadow-md transition-shadow">
                                <CardContent className="p-4">
                                  <div className="flex justify-between items-start mb-3">
                                    <div>
                                      <h4 className="font-medium text-foreground">{option.product_name}</h4>
                                      <p className="text-sm text-muted-foreground mt-1">{option.description}</p>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-lg font-semibold text-primary">{option.min_interest_rate}% - {option.max_interest_rate}% APR</div>
                                      <div className="text-sm text-muted-foreground">{option.max_tenure_months} months</div>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                      <div className="flex items-center gap-1">
                                        <DollarSign className="h-4 w-4" />
                                        <span>₹{option.min_amount.toLocaleString()} - ₹{option.max_amount.toLocaleString()}</span>
                                      </div>
                                      {option.profiles && (
                                        <div className="flex items-center gap-1">
                                          <Building className="h-4 w-4" />
                                          <span>{option.profiles.company_name || option.profiles.full_name}</span>
                                        </div>
                                      )}
                                    </div>
                                    
                                    <div className="flex gap-2">
                                      {option.profiles?.phone && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => {
                                            const phoneNumber = option.profiles!.phone!.replace(/\D/g, '');
                                            const message = `Hi! I'm interested in your financing option: ${option.product_name} for robot purchase. Can you provide more details?`;
                                            window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`, '_blank');
                                          }}
                                        >
                                          <MessageCircle className="w-4 h-4 mr-1" />
                                          Call
                                        </Button>
                                      )}
                                      <Button
                                        size="sm"
                                        onClick={() => handleQuoteRequest(
                                          {
                                            name: option.profiles?.full_name || 'Unknown',
                                            company: option.profiles?.company_name,
                                            phone: option.profiles?.phone,
                                            location: option.profiles?.location
                                          },
                                          {
                                            name: option.product_name,
                                            type: 'finance'
                                          }
                                        )}
                                      >
                                        <FileText className="w-4 h-4 mr-1" />
                                        Apply
                                      </Button>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        ) : (
                          <p className="text-muted-foreground">No financing options available for this price range.</p>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* AI Analysis Section */}
            {showAIAnalysis && aiAnalysis && (
              <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-blue-900">AI Analysis Results</h3>
                    <div className="bg-white rounded-lg p-4">
                      <p className="text-blue-800">{aiAnalysis.analysis}</p>
                      <div className="mt-4 grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm text-blue-600">Suitability Score:</span>
                          <div className="text-xl font-bold text-blue-900">{aiAnalysis.suitabilityScore}/10</div>
                        </div>
                        <div>
                          <span className="text-sm text-blue-600">Key Insights:</span>
                          <ul className="text-sm text-blue-800 mt-1">
                            {aiAnalysis.keyInsights.map((insight, index) => (
                              <li key={index}>• {insight}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      <div className="mt-4">
                        <span className="text-sm text-blue-600">Recommendation:</span>
                        <p className="text-blue-800 mt-1">{aiAnalysis.recommendation}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right sidebar (1/3 width) */}
          <div className="space-y-6">
            {/* Seller Information */}
            {robot.profiles && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Seller Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    {robot.profiles.avatar_url ? (
                      <img
                        src={robot.profiles.avatar_url}
                        alt={robot.profiles.full_name}
                        className="w-16 h-16 rounded-full mx-auto mb-3"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                        <User className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <h3 className="font-medium">{robot.profiles.full_name}</h3>
                    {robot.profiles.company_name && (
                      <p className="text-sm text-muted-foreground">{robot.profiles.company_name}</p>
                    )}
                  </div>
                  
                  {robot.profiles.location && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{robot.profiles.location}</span>
                    </div>
                  )}

                  {/* Contact Actions */}
                  {user && (
                    <div className="space-y-3">
                      <Button onClick={handleWhatsAppInquiry} className="w-full">
                        <MessageCircle className="w-4 h-4 mr-2" />
                        WhatsApp Seller
                      </Button>
                      <Button 
                        onClick={() => handleQuoteRequest(
                          {
                            name: robot.profiles.full_name,
                            company: robot.profiles.company_name,
                            phone: robot.profiles.phone,
                            location: robot.profiles.location
                          },
                          {
                            name: robot.name,
                            price: robot.price,
                            type: 'part' as const
                          }
                        )}
                        variant="outline" 
                        className="w-full"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Request Quote
                      </Button>
                      <Button
                        onClick={handleAddToWatchlist}
                        variant="outline"
                        className="w-full"
                      >
                        <Heart className={`w-4 h-4 mr-2 ${isInWatchlist ? 'fill-current text-red-500' : ''}`} />
                        {isInWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {!user && (
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="p-4 text-center">
                  <h3 className="font-medium mb-2">Want to Contact the Seller?</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Login to contact the seller and access premium features
                  </p>
                  <Button onClick={() => navigate('/auth')} className="w-full">
                    Login / Sign Up
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Fullscreen Image Modal */}
      <Dialog open={showFullscreen} onOpenChange={setShowFullscreen}>
        <DialogContent className="max-w-7xl max-h-[90vh] p-0">
          <div className="relative">
            <img 
              src={robot?.images?.[currentImageIndex]} 
              alt={`${robot?.name} ${currentImageIndex + 1}`}
              className="w-full h-full object-contain rounded-lg bg-muted max-h-[90vh]"
            />
            <Button
              variant="outline"
              size="icon"
              className="absolute top-4 right-4 bg-background/80 backdrop-blur-sm"
              onClick={() => setShowFullscreen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
            
            {robot?.images && robot.images.length > 1 && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-background/80 backdrop-blur-sm"
                  onClick={prevImage}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-background/80 backdrop-blur-sm"
                  onClick={nextImage}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Enhanced Robot Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="max-w-2xl w-full mx-4">
            <CardHeader>
              <CardTitle>Generate Robot Report</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Robot report functionality will be available soon.</p>
              <Button onClick={() => setShowReportModal(false)} className="mt-4">
                Close
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Loan Application Modal */}
      {showLoanModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="max-w-2xl w-full mx-4">
            <CardHeader>
              <CardTitle>Apply for Loan</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Loan application for {robot?.name} - ₹{robot?.price?.toLocaleString() || '0'}</p>
              <Button onClick={() => setShowLoanModal(false)} className="mt-4">
                Close
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Supplier Quote Form Modal */}
      {showQuoteForm && selectedSupplier && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="max-w-2xl w-full mx-4">
            <CardHeader>
              <CardTitle>Request Quote</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Quote request for {selectedItem.name}</p>
              <p>Supplier: {selectedSupplier.name}</p>
              <Button onClick={() => {
                setShowQuoteForm(false);
                setSelectedSupplier(null);
                setSelectedItem(null);
              }} className="mt-4">
                Close
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default RobotDetails;