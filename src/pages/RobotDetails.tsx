import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import LoanCalculator from "@/components/forms/LoanCalculator";
import LoanApplicationModal from "@/components/forms/LoanApplicationModal";
import { Textarea } from "@/components/ui/textarea";
import AIAnalysisResult from "@/components/AIAnalysisResult";
import { Bot, MapPin, Building, Phone, Mail, User, ArrowLeft, Loader2, Wrench, Settings, DollarSign, Brain, Heart, MessageCircle, PhoneCall, X, ChevronLeft, ChevronRight, Maximize2, FileText, Search, CreditCard, Calculator, Plane, Package, Tag, Clock, Shield, Star, Eye, Share2, Expand, ExternalLink, Banknote, TrendingUp, Info } from "lucide-react";
import ViewCountDisplay from "@/components/ViewCountDisplay";
import EnhancedHeader from "@/components/EnhancedHeader";
import MarketIntelligencePanel from "@/components/MarketIntelligencePanel";
import ReportGenerationModal from "@/components/ReportGenerationModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";
import { useViewTracking } from "@/hooks/useViewTracking";

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
  'andhra pradesh', 'arunachal pradesh', 'assam', 'bihar', 'chhattisgarh', 'goa', 'gujarat',
  'haryana', 'himachal pradesh', 'jharkhand', 'karnataka', 'kerala', 'madhya pradesh',
  'maharashtra', 'manipur', 'meghalaya', 'mizoram', 'nagaland', 'odisha', 'punjab',
  'rajasthan', 'sikkim', 'tamil nadu', 'telangana', 'tripura', 'uttar pradesh',
  'uttarakhand', 'west bengal', 'delhi', 'jammu and kashmir', 'ladakh', 'chandigarh',
  'dadra and nagar haveli and daman and diu', 'lakshadweep', 'puducherry'
];

const RobotDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { trackView, getItemViewCount } = useViewTracking();
  
  const [robot, setRobot] = useState<Robot | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResult | null>(null);
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
  const [quoteMessage, setQuoteMessage] = useState('');
  const [addingToWatchlist, setAddingToWatchlist] = useState(false);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [showImportQuote, setShowImportQuote] = useState(false);
  const [importDuty, setImportDuty] = useState<number | null>(null);
  const [showEmiCalculator, setShowEmiCalculator] = useState(false);
  const [currentUserLocation, setCurrentUserLocation] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'overview' | 'specifications' | 'spareparts' | 'services' | 'logistics' | 'financing'>('overview');
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportInsights, setReportInsights] = useState<any>(null);
  const [sellerInfo, setSellerInfo] = useState<any>(null);
  const isIndianLocation = (state?: string, location?: string) => {
    const s = (state || '').toLowerCase().replace(/\s+/g, '');
    const loc = (location || '').toLowerCase();
    
    // Normalize INDIAN_STATES for comparison (remove spaces)
    const normalizedStates = INDIAN_STATES.map(state => state.replace(/\s+/g, ''));
    
    if (s && normalizedStates.includes(s)) return true;
    if (loc.includes('india')) return true;
    return INDIAN_STATES.some(st => loc.includes(st));
  };
  const outsideIndia = robot ? !isIndianLocation(robot.state, robot.location) : false;
  useEffect(() => {
  if (!id) return;
  const fetchRobot = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('robots')
        .select(`
          *,
          profiles!seller_id (
            full_name,
            company_name,
            phone,
            mobile_number,
            email,
            location
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setRobot({
        ...data,
        technical_specifications: typeof data.technical_specifications === 'object' && data.technical_specifications !== null 
          ? data.technical_specifications as Record<string, any>
          : {}
      });
      
      if (user) {
        const watchlist = JSON.parse(localStorage.getItem(`watchlist_${user.id}`) || '[]');
        setIsInWatchlist(watchlist.includes(data.id));
        
        // Track this view
        await trackView('robots', data.id);
      }

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to load robot details');
    } finally {
      setLoading(false);
    }
  };
  fetchRobot();
}, [id, user]);

  // Fetch current user's location
  useEffect(() => {
    const fetchUserLocation = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('location')
          .eq('id', user.id)
          .single();
        
        if (error) {
          console.error('Error fetching user location:', error);
          return;
        }
        
        if (data?.location) {
          setCurrentUserLocation(data.location);
        }
      } catch (err) {
        console.error('Error fetching user location:', err);
      }
    };
    
    fetchUserLocation();
  }, [user]);

  useEffect(() => {
    console.log('Logistics services loaded:', logisticsServices);
  }, [logisticsServices]);

  // Fetch all services from database
  const fetchRelatedServices = async () => {
    setLoadingServices(true);
    try {
      const { data, error } = await supabase
        .from('services')
        .select(`
          *,
          profiles!services_provider_id_fkey (
            full_name,
            company_name,
            phone,
            location,
            avatar_url
          )
        `)
        .limit(10);

      if (error) throw error;
      setServices(data || []);
    } catch (err) {
      console.error('Error fetching services:', err);
    } finally {
      setLoadingServices(false);
    }
  };

  // Fetch all spare parts from database
  const fetchCompatibleSpareParts = async () => {
    setLoadingSpareParts(true);
    try {
      const { data, error } = await supabase
        .from('spare_parts')
        .select(`
          *,
          profiles!spare_parts_seller_id_fkey (
            full_name,
            company_name,
            phone,
            location
          )
        `)
        .limit(12);

      if (error) throw error;
      setSpareParts(data || []);
    } catch (err) {
      console.error('Error fetching spare parts:', err);
    } finally {
      setLoadingSpareParts(false);
    }
  };

  // Fetch all financing options from database
  const fetchFinancingOptions = async () => {
    setLoadingFinancing(true);
    try {
      const { data, error } = await supabase
        .from('loan_products')
        .select(`
          *,
          profiles!loan_products_provider_id_fkey (
            full_name,
            company_name,
            phone,
            location
          )
        `)
        .eq('is_active', true)
        .limit(10);

      if (error) throw error;
      setFinancingOptions(data || []);
    } catch (err) {
      console.error('Error fetching financing:', err);
    } finally {
      setLoadingFinancing(false);
    }
  };


  // Fetch all logistics services from database
  const fetchLogisticsServices = async () => {
    setLoadingLogistics(true);
    try {
      const { data, error } = await supabase
        .from('logistics_services')
        .select(`
          *,
          profiles!logistics_services_provider_id_fkey (
            full_name,
            company_name,
            phone,
            location,
            email,
            mobile_number
          )
        `)
        .eq('is_active', true)
        .limit(10);

      if (error) throw error;
      setLogisticsServices(data || []);
    } catch (err) {
      console.error('Error fetching logistics services:', err);
    } finally {
      setLoadingLogistics(false);
    }
  };

  // Load related data when component mounts (not dependent on robot)
  useEffect(() => {
    // Fetch all data when component mounts
    fetchRelatedServices();
    fetchCompatibleSpareParts();
    fetchFinancingOptions();
    fetchLogisticsServices();
  }, []);

  // Contact seller by phone
  const handleContactSeller = () => {
    const phone = robot?.profiles?.phone || robot?.profiles?.mobile_number;
    
    if (!phone) {
      toast({
        title: "Phone Number Not Available",
        description: "Seller's phone number is not provided.",
        variant: "destructive",
      });
      return;
    }
    const phoneNumber = phone.replace(/\D/g, '');
    window.open(`tel:${phoneNumber}`, '_self');
    toast({
      title: "Calling Seller",
      description: `Calling ${robot.profiles.company_name || robot.profiles.full_name} at ${phone}`,
    });
  };

  // Request quote modal open
  const handleRequestQuote = () => {
    if (!robot?.profiles?.email) {
      toast({
        title: "Email Not Available",
        description: "Seller's email address is not provided.",
        variant: "destructive",
      });
      return;
    }
    setShowQuoteModal(true);
  };

  // Send quote email
  const sendQuoteEmail = () => {
    if (!robot?.profiles?.email) return;

    const subject = `Quote Request for ${robot.name} - ${robot.model}`;
    const body = `Dear ${robot.profiles.full_name},

I am interested in the following robot:

Robot: ${robot.name}
Model: ${robot.model}
Type: ${robot.robot_type}
Listed Price: ${robot.price ? `${robot.currency} ${robot.price}` : 'Price on Request'}

${quoteMessage ? `Additional Message:\n${quoteMessage}` : ''}

Please provide me with:
1. Best price quote
2. Availability and delivery timeline
3. Technical specifications
4. Warranty and support details
5. Installation and training options

Best regards,
${user?.user_metadata?.full_name || 'Interested Buyer'}`;

    const mailtoLink = `mailto:${robot.profiles.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoLink, '_blank');
    
    setShowQuoteModal(false);
    setQuoteMessage('');
    
    toast({
      title: "Quote Request Sent",
      description: `Email sent to ${robot.profiles.company_name || robot.profiles.full_name}`,
    });
  };

  // Add/Remove to/from watchlist
  const handleAddToWatchlist = async () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to add items to your watchlist.",
        variant: "destructive",
      });
      return;
    }
    try {
      setAddingToWatchlist(true);
      const watchlist = JSON.parse(localStorage.getItem(`watchlist_${user.id}`) || '[]');
      
      if (isInWatchlist) {
        const newWatchlist = watchlist.filter((robotId: string) => robotId !== robot!.id);
        localStorage.setItem(`watchlist_${user.id}`, JSON.stringify(newWatchlist));
        setIsInWatchlist(false);
        toast({
          title: "Removed from Watchlist",
          description: `${robot!.name} has been removed from your watchlist.`,
        });
      } else {
        if (watchlist.includes(robot!.id)) {
          toast({
            title: "Already in Watchlist",
            description: "This robot is already in your watchlist.",
          });
          return;
        }
        watchlist.push(robot!.id);
        localStorage.setItem(`watchlist_${user.id}`, JSON.stringify(watchlist));
        setIsInWatchlist(true);
        toast({
          title: "Added to Watchlist",
          description: `${robot!.name} has been added to your watchlist.`,
        });
      }
    } catch (error: any) {
      console.error('Error updating watchlist:', error);
      toast({
        title: "Failed to Update",
        description: "Could not update watchlist. Please try again.",
        variant: "destructive",
      });
    } finally {
      setAddingToWatchlist(false);
    }
  };

  // Image navigation
  const nextImage = () => {
    if (robot?.images && robot.images.length > 1) {
      setCurrentImageIndex((prev) => (prev + 1) % robot.images.length);
    }
  };

  const prevImage = () => {
    if (robot?.images && robot.images.length > 1) {
      setCurrentImageIndex((prev) => (prev - 1 + robot.images.length) % robot.images.length);
    }
  };

  // AI analysis call
  const handleAIAnalysis = async () => {
    if (!robot || !user) {
      toast({
        title: "Login Required",
        description: "Please log in to access AI analysis features.",
        variant: "destructive",
      });
      return;
    }
    try {
      setAnalysisLoading(true);
      const { data, error } = await supabase.functions.invoke('roboverse-ai-analyze', {
        body: { robotId: robot.id },
      });
      if (error) throw error;
      
      // Handle both new structured analysis and legacy format
      const analysisData = data.analysis || {};
      const structuredAnalysis = {
        summary: typeof analysisData === 'string' ? analysisData : (analysisData.summary || ''),
        suitability: analysisData.suitability || '',
        technicalInsights: analysisData.technicalInsights || '',
        governmentSchemes: analysisData.governmentSchemes || '',
        suggestedIndustries: analysisData.suggestedIndustries || '',
        timestamp: analysisData.timestamp || new Date().toISOString()
      };
      
      setAiAnalysis({
        analysis: structuredAnalysis,
        cached: data.cached || false,
        currentUserLocation: data.currentUserLocation,
        recommendations: {
          spareParts: data.marketEcosystem?.spareParts?.suppliers || [],
          services: data.marketEcosystem?.services?.providers || [],
          logistics: data.marketEcosystem?.logistics?.providers || [],
          finance: data.marketEcosystem?.finance?.providers || [],
        },
      });
      
      const message = data.cached ? 
        "Cached analysis retrieved successfully" : 
        "New AI analysis generated successfully";
        
      toast({
        title: "AI Analysis Complete",
        description: message,
      });
    } catch (err) {
      console.error('Error getting AI analysis:', err);
      toast({
        title: "Analysis Failed",
        description: err instanceof Error ? err.message : 'Failed to generate AI analysis',
        variant: "destructive",
      });
    } finally {
      setAnalysisLoading(false);
    }
  };

  // Price formatting helper
  const formatPrice = (price: number, currency: string) => {
    const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₹';
    return `${currencySymbol}${price.toLocaleString()}`;
  };

  // Calculate import duty if outside India (~18%)
  const calculateImportDuty = (basePrice: number, currency: string) => {
    // List of Indian states for checking
    const indianStates = [
      'andhra pradesh', 'arunachal pradesh', 'assam', 'bihar', 'chhattisgarh', 'goa', 'gujarat', 
      'haryana', 'himachal pradesh', 'jharkhand', 'karnataka', 'kerala', 'madhya pradesh', 
      'maharashtra', 'manipur', 'meghalaya', 'mizoram', 'nagaland', 'odisha', 'punjab', 
      'rajasthan', 'sikkim', 'tamil nadu', 'telangana', 'tripura', 'uttar pradesh', 
      'uttarakhand', 'west bengal', 'delhi', 'jammu and kashmir', 'ladakh', 'chandigarh', 
      'dadra and nagar haveli and daman and diu', 'lakshadweep', 'puducherry'
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

  // Import quote modal open
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

  // Send import quote email
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
${duty > 0 ? `Estimated Import Duty (18%): ${formatPrice(duty, robot.currency)}` : ''}
${duty > 0 ? `Total Estimated Cost: ${formatPrice(totalPrice, robot.currency)}` : ''}

Please provide detailed information on:
1. Complete pricing including all applicable duties and taxes
2. Import documentation and procedures
3. Shipping and logistics arrangements
4. Delivery timeline to India
5. Installation and commissioning support
6. Warranty terms for imported equipment
7. After-sales service availability in India

Best regards,
${user?.user_metadata?.full_name || 'Interested Buyer'}`;

    const mailtoLink = `mailto:${robot.profiles.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoLink, '_blank');
    
    setShowImportQuote(false);
    
    toast({
      title: "Import Quote Request Sent",
      description: `Email sent to ${robot.profiles.company_name || robot.profiles.full_name}`,
    });
  };

  // Handle report generation
  const handleGenerateReport = (insights: any) => {
    setReportInsights(insights);
    setShowReportModal(true);
  };

  // Share functionality
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: robot?.name,
        text: `Check out this robot: ${robot?.name}`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link Copied",
        description: "Robot link copied to clipboard",
      });
    }
  };

  // Purchase inquiry email
  const handlePurchaseInquiry = () => {
    if (!robot?.profiles?.email) {
      toast({
        title: "Email Not Available",
        description: "Seller's email address is not provided.",
        variant: "destructive",
      });
      return;
    }
    const subject = `Purchase Inquiry for ${robot.name}`;
    const body = `Dear ${robot.profiles.full_name},

I would like to make a purchase inquiry for:

Robot: ${robot.name}
Model: ${robot.model}
Listed Price: ${robot.price ? formatPrice(robot.price, robot.currency) : 'Price on Request'}

Please provide:
1. Best pricing terms
2. Payment options
3. Delivery arrangements
4. Technical documentation
5. Training and support

Looking forward to your response.

Best regards,
${user?.user_metadata?.full_name || 'Interested Buyer'}`;

    const mailtoLink = `mailto:${robot.profiles.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoLink, '_blank');
    
    toast({
      title: "Purchase Inquiry Sent",
      description: `Email sent to ${robot.profiles.company_name || robot.profiles.full_name}`,
    });
  };

  // Navigate to find similar robots
  const handleFindSimilar = () => {
    const searchParams = new URLSearchParams({
      type: robot?.robot_type || '',
      category: robot?.category_tags?.[0] || ''
    });
    navigate(`/robots?${searchParams.toString()}`);
    toast({
      title: "Finding Similar Robots",
      description: "Redirecting to search results...",
    });
  };

  // Show loan application form state
  const [showLoanApplication, setShowLoanApplication] = useState(false);
  const [selectedFinanceProvider, setSelectedFinanceProvider] = useState<any>(null);

  // Contact service provider by phone  
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
    const phoneNumber = phone.replace(/\D/g, '');
    window.open(`tel:${phoneNumber}`, '_self');
    toast({
      title: "Calling Service Provider",
      description: `Calling ${service.profiles?.company_name || service.profiles?.full_name} at ${phone}`,
    });
  };

  // Contact spare parts provider by phone
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
    const phoneNumber = phone.replace(/\D/g, '');
    window.open(`tel:${phoneNumber}`, '_self');
    toast({
      title: "Calling Parts Provider",
      description: `Calling ${part.profiles?.company_name || part.profiles?.full_name} at ${phone}`,
    });
  };

  // Contact logistics provider by phone
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
    const phoneNumber = phone.replace(/\D/g, '');
    window.open(`tel:${phoneNumber}`, '_self');
    toast({
      title: "Calling Logistics Provider",
      description: `Calling ${service.profiles?.company_name || service.profiles?.full_name} at ${phone}`,
    });
  };

  // Contact finance provider by phone
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
    const phoneNumber = phone.replace(/\D/g, '');
    window.open(`tel:${phoneNumber}`, '_self');
    toast({
      title: "Calling Finance Provider",
      description: `Calling ${option.profiles?.company_name || option.profiles?.full_name} at ${phone}`,
    });
  };

  // Get quote for logistics with robot details
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
Price: ${robot?.price ? `${robot.currency} ${robot.price}` : 'Price on Request'}
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
${user?.user_metadata?.full_name || 'Interested Buyer'}`;

    const mailtoLink = `mailto:${service.profiles.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoLink, '_blank');
    
    toast({
      title: "Quote Request Sent",
      description: `Email sent to ${service.profiles.company_name || service.profiles.full_name}`,
    });
  };

  // Apply for loan with robot details
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

  // Placeholder functions for report and loan check
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
      <div className="min-h-screen bg-background">
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
      <div className="min-h-screen bg-background">
        <EnhancedHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center py-12">
            <Bot className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Robot Not Found</h3>
            <p className="text-muted-foreground mb-4">{error || 'The requested robot could not be found.'}</p>
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
    <div className="min-h-screen bg-background">
      <EnhancedHeader />
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => navigate('/robots')} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Robots
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Gallery */}
            <Card>
              <CardContent className="p-6">
                <div className="relative aspect-video bg-muted rounded-lg flex items-center justify-center mb-4">
                  {robot.images && robot.images.length > 0 ? (
                    <>
                      <img
                        src={robot.images[currentImageIndex]}
                        alt={`${robot.name} ${currentImageIndex + 1}`}
                        className="w-full h-full object-contain rounded-lg bg-muted cursor-pointer"
                        onClick={() => setShowFullscreen(true)}
                      />
                      {robot.images.length > 1 && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                            onClick={prevImage}
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                            onClick={nextImage}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white"
                        onClick={() => setShowFullscreen(true)}
                      >
                        <Maximize2 className="w-4 h-4" />
                      </Button>
                      {robot.images.length > 1 && (
                        <div className="absolute bottom-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                          {currentImageIndex + 1} / {robot.images.length}
                        </div>
                      )}
                    </>
                  ) : (
                    <Bot className="w-24 h-24 text-muted-foreground" />
                  )}
                </div>

                {/* Thumbnail Gallery */}
                {robot.images && robot.images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {robot.images.map((image, index) => (
                      <div
                        key={index}
                        className={`flex-shrink-0 aspect-square w-20 h-20 bg-muted rounded-lg flex items-center justify-center cursor-pointer border-2 ${
                          index === currentImageIndex ? 'border-primary' : 'border-transparent'
                        }`}
                        onClick={() => setCurrentImageIndex(index)}
                      >
                        <img 
                          src={image} 
                          alt={`${robot.name} ${index + 1}`}
                          className="w-full h-full object-contain rounded-lg bg-muted"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Robot Info and Quick Actions */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl">{robot.name}</CardTitle>
                    <p className="text-lg text-muted-foreground">{robot.model}</p>
                    <div className="flex items-center gap-4 mt-2">
                           <Badge variant="outline" className="text-xs">
                        {robot.robot_type}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-primary">
                      {robot.price ? formatPrice(robot.price, robot.currency) : 'Price on Request'}
                    </div>
                    {outsideIndia && (
                      <div className="text-sm text-orange-600 mt-1">
                        + Import duties and logistics costs
                      </div>
                    )}
                    <Badge variant={robot.availability === 'available' ? 'default' : 'secondary'} className="mt-2">
                      {robot.availability}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{robot.robot_type}</Badge>
                    {robot.category_tags?.map((tag, index) => (
                      <Badge key={index} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                  <div className="flex items-center text-muted-foreground">
                    <MapPin className="w-4 h-4 mr-2" />
                    <span>{robot.location}</span>
                  </div>
                  {robot.description && (
                    <div>
                      <h4 className="font-semibold mb-2">Description</h4>
                      <p className="text-muted-foreground">{robot.description}</p>
                    </div>
                  )}
                  {/* Quantity & Views */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Quantity Available:</span>
                      <p>{robot.quantity}</p>
                    </div>
                     <div>
                       <span className="font-medium">Views:</span>
                       <ViewCountDisplay 
                         targetType="robots" 
                         targetId={robot.id} 
                         className="mt-1"
                       />
                     </div>
                  </div>

                  {/* Action Buttons for logged in user */}
                  {user && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
                      {outsideIndia ? (
                        <Button 
                          onClick={handleImportQuote}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                          size="lg"
                        >
                          <Plane className="w-4 h-4 mr-2" />
                          Import Quote
                        </Button>
                      ) : (
                        <Button 
                          onClick={handlePurchaseInquiry}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                          size="lg"
                        >
                          <MessageCircle className="w-4 h-4 mr-2" />
                          Purchase Inquiry
                        </Button>
                      )}
                      <Button 
                        onClick={handleContactSeller}
                        variant="outline"
                        className="border-green-600 text-green-600 hover:bg-green-50"
                        size="lg"
                      >
                        <PhoneCall className="w-4 h-4 mr-2" />
                        Contact
                      </Button>
                    </div>
                  )}

                  {/* Quick Actions */}
                  {user && (
                    <div className="mt-6">
                      <h4 className="font-semibold mb-3">Quick Actions</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={handleAIAnalysis}
                          className="text-purple-600 border-purple-200 hover:bg-purple-50"
                        >
                          <Brain className="w-4 h-4 mr-2" />
                          AI Analysis
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={handleGetReport}
                          className="text-orange-600 border-orange-200 hover:bg-orange-50"
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Get Report
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={handleCheckLoan}
                          className="text-green-600 border-green-200 hover:bg-green-50"
                        >
                          <CreditCard className="w-4 h-4 mr-2" />
                          Check Loan
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={handleFindSimilar}
                          className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        >
                          <Search className="w-4 h-4 mr-2" />
                          Find Similar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

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
                  
                  {/* Overview */}
                  <TabsContent value="overview" className="p-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Basic Information</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Brand:</span>
                          <p className="text-muted-foreground">{robot.brand || '—'}</p>
                        </div>
                        <div>
                          <span className="font-medium">Model:</span>
                          <p className="text-muted-foreground">{robot.model || '—'}</p>
                        </div>
                        <div>
                          <span className="font-medium">Year:</span>
                          <p className="text-muted-foreground">{robot.year_manufactured || '—'}</p>
                        </div>
                        <div>
                          <span className="font-medium">Category:</span>
                          <p className="text-muted-foreground">{robot.robot_type || '—'}</p>
                        </div>
                        <div>
                          <span className="font-medium">Condition:</span>
                          <p className="text-muted-foreground">{robot.condition ? robot.condition.replace('_',' ') : '—'}</p>
                        </div>
                        <div>
                          <span className="font-medium">Quantity:</span>
                          <p className="text-muted-foreground">{robot.quantity}</p>
                        </div>
                      </div>

                      <Separator />

                      <h3 className="text-lg font-semibold">Location & Pricing</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">City:</span>
                          <p className="text-muted-foreground">{robot.location || '—'}</p>
                        </div>
                        <div>
                          <span className="font-medium">State:</span>
                          <p className="text-muted-foreground">{robot.state || '—'}</p>
                        </div>
                        <div>
                          <span className="font-medium">Pincode:</span>
                          <p className="text-muted-foreground">{robot.pincode || '—'}</p>
                        </div>
                        <div>
                          <span className="font-medium">Price:</span>
                          <p className="text-muted-foreground">{robot.price ? formatPrice(robot.price, robot.currency) : 'Price on Request'}</p>
                        </div>
                      </div>

                      {/* Import & Logistics Summary */}
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {outsideIndia && (
                          <Card className="border-orange-200 bg-orange-50/50">
                            <CardContent className="p-4">
                              <div className="font-semibold mb-1">Import to India</div>
                              {robot.price && importDuty ? (
                                <p className="text-sm text-orange-700">
                                  Estimated import duty: {formatPrice(importDuty, robot.currency)}
                                </p>
                              ) : (
                                <p className="text-sm text-orange-700">Import duties may apply. Get a detailed quote.</p>
                              )}
                              <div className="mt-2">
                                <Button size="sm" onClick={handleImportQuote}>Get Import Quote</Button>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                        <Card className="border-blue-200 bg-blue-50/50">
                          <CardContent className="p-4 flex items-center justify-between">
                            <div>
                              <div className="font-semibold">Logistics Providers</div>
                              <div className="text-sm text-muted-foreground">
                                {loadingLogistics ? 'Loading...' : `${logisticsServices.length} available`}
                              </div>
                            </div>
                            <Button size="sm" variant="outline" onClick={() => setActiveTab('logistics')}>View</Button>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Specifications */}
                  <TabsContent value="specifications" className="p-6">
                    <div className="space-y-6">
                      {/* Known Specifications */}
                      <div className="grid grid-cols-2 gap-4">
                        {robot.payload_capacity !== undefined && robot.payload_capacity !== null && (
                          <div>
                            <span className="font-medium">Payload Capacity:</span>
                            <p className="text-muted-foreground">{robot.payload_capacity} kg</p>
                          </div>
                        )}
                        {robot.reach !== undefined && robot.reach !== null && (
                          <div>
                            <span className="font-medium">Reach:</span>
                            <p className="text-muted-foreground">{robot.reach} mm</p>
                          </div>
                        )}
                        {robot.repeatability !== undefined && robot.repeatability !== null && (
                          <div>
                            <span className="font-medium">Repeatability:</span>
                            <p className="text-muted-foreground">{robot.repeatability} mm</p>
                          </div>
                        )}
                        {robot.power_consumption !== undefined && robot.power_consumption !== null && (
                          <div>
                            <span className="font-medium">Power:</span>
                            <p className="text-muted-foreground">{robot.power_consumption} kW</p>
                          </div>
                        )}
                        {robot.operating_environment && (
                          <div>
                            <span className="font-medium">Operating Environment:</span>
                            <p className="text-muted-foreground">{robot.operating_environment}</p>
                          </div>
                        )}
                        {robot.warranty_info && (
                          <div>
                            <span className="font-medium">Warranty:</span>
                            <p className="text-muted-foreground">{robot.warranty_info}</p>
                          </div>
                        )}
                        {robot.applications && robot.applications.length > 0 && (
                          <div className="col-span-2">
                            <span className="font-medium">Applications:</span>
                            <p className="text-muted-foreground">{robot.applications.join(', ')}</p>
                          </div>
                        )}
                        {robot.certification_standards && robot.certification_standards.length > 0 && (
                          <div className="col-span-2">
                            <span className="font-medium">Certifications:</span>
                            <p className="text-muted-foreground">{robot.certification_standards.join(', ')}</p>
                          </div>
                        )}
                        {robot.included_accessories && robot.included_accessories.length > 0 && (
                          <div className="col-span-2">
                            <span className="font-medium">Included Accessories:</span>
                            <p className="text-muted-foreground">{robot.included_accessories.join(', ')}</p>
                          </div>
                        )}
                      </div>

                      {/* Technical Specifications JSON */}
                      {robot.technical_specifications && Object.keys(robot.technical_specifications).length > 0 ? (
                        <div>
                          <h4 className="text-md font-semibold mb-4">Technical Specifications</h4>
                          <div className="grid grid-cols-2 gap-4">
                            {Object.entries(robot.technical_specifications).map(([key, value]) => (
                              <div key={key}>
                                <span className="font-medium capitalize">{key.replace(/_/g, ' ')}:</span>
                                <p className="text-muted-foreground">{String(value)}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">No technical specifications available.</p>
                      )}
                    </div>
                  </TabsContent>

                  {/* Services */}
                  <TabsContent value="services" className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">Available Services</h3>
                        <Button variant="outline" onClick={() => navigate('/services')}>
                          <Search className="w-4 h-4 mr-2" />
                          Browse All Services
                        </Button>
                      </div>
                      
                      {loadingServices ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {[...Array(4)].map((_, i) => (
                            <div key={i} className="animate-pulse">
                              <div className="h-32 bg-muted rounded-lg"></div>
                            </div>
                          ))}
                        </div>
                      ) : services.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {services.map((service) => (
                            <Card key={service.id} className="hover:shadow-md transition-shadow">
                              <CardContent className="p-4">
                                <div className="space-y-3">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <h4 className="font-semibold">{service.name}</h4>
                                      <p className="text-sm text-muted-foreground">{service.service_type}</p>
                                    </div>
                                    <Badge variant="secondary">{service.price_range || 'Contact for Quote'}</Badge>
                                  </div>
                                  
                                  <p className="text-sm line-clamp-2">{service.description}</p>
                                  
                                  {service.specializations && service.specializations.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                      {service.specializations.slice(0, 3).map((spec: string, idx: number) => (
                                        <Badge key={idx} variant="outline" className="text-xs">
                                          {spec}
                                        </Badge>
                                      ))}
                                      {service.specializations.length > 3 && (
                                        <Badge variant="outline" className="text-xs">
                                          +{service.specializations.length - 3} more
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                  
                                   <div className="flex items-center justify-between text-sm">
                                     <div className="flex items-center text-muted-foreground">
                                       <MapPin className="w-3 h-3 mr-1" />
                                       {service.location || service.profiles?.location || 'Location not specified'}
                                     </div>
                                     <Button 
                                       size="sm" 
                                       variant="outline"
                                       disabled={!user}
                                     >
                                       <MessageCircle className="w-3 h-3 mr-1" />
                                       Contact
                                     </Button>
                                   </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Settings className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                          <h3 className="text-lg font-semibold mb-2">No Services Found</h3>
                          <p className="text-muted-foreground mb-4">No specialized services found for this robot type.</p>
                          <Button onClick={() => navigate('/services')}>
                            <Settings className="w-4 h-4 mr-2" />
                            Browse All Services
                          </Button>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* Spare Parts */}
                  <TabsContent value="spareparts" className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">Compatible Spare Parts</h3>
                        <Button variant="outline" onClick={() => navigate('/parts')}>
                          <Search className="w-4 h-4 mr-2" />
                          Browse All Parts
                        </Button>
                      </div>
                      
                      {loadingSpareParts ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {[...Array(6)].map((_, i) => (
                            <div key={i} className="animate-pulse">
                              <div className="h-40 bg-muted rounded-lg"></div>
                            </div>
                          ))}
                        </div>
                      ) : spareParts.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {spareParts.map((part) => (
                            <Card key={part.id} className="hover:shadow-md transition-shadow">
                              <CardContent className="p-4">
                                <div className="space-y-3">
                                  {part.images && part.images.length > 0 && (
                                    <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                                      <img 
                                        src={part.images[0]} 
                                        alt={part.name}
                                        className="w-full h-full object-contain rounded-lg bg-muted"
                                      />
                                    </div>
                                  )}
                                  
                                  <div>
                                    <h4 className="font-semibold line-clamp-1">{part.name}</h4>
                                    {part.part_number && (
                                      <p className="text-xs text-muted-foreground">Part #: {part.part_number}</p>
                                    )}
                                  </div>
                                  
                                  <div className="flex items-center justify-between">
                                    <div className="text-sm">
                                      {part.price ? (
                                        <span className="font-semibold text-green-600">
                                          {part.currency === 'USD' ? '$' : part.currency === 'EUR' ? '€' : '₹'}
                                          {part.price.toLocaleString()}
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground">Price on Request</span>
                                      )}
                                    </div>
                                    <div className="flex items-center text-xs text-muted-foreground">
                                      <Package className="w-3 h-3 mr-1" />
                                      Qty: {part.quantity}
                                    </div>
                                  </div>
                                  
                                  {part.category_tags && part.category_tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                      {part.category_tags.slice(0, 2).map((tag: string, idx: number) => (
                                        <Badge key={idx} variant="outline" className="text-xs">
                                          <Tag className="w-2 h-2 mr-1" />
                                          {tag}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                  
                                   <div className="flex items-center justify-between text-sm">
                                     <div className="flex items-center text-muted-foreground">
                                       <MapPin className="w-3 h-3 mr-1" />
                                       {part.location || 'Not specified'}
                                     </div>
                                     <Button 
                                       size="sm" 
                                       variant="outline"
                                       disabled={!user}
                                     >
                                       <MessageCircle className="w-3 h-3 mr-1" />
                                       Inquire
                                     </Button>
                                   </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Wrench className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                          <h3 className="text-lg font-semibold mb-2">No Parts Found</h3>
                          <p className="text-muted-foreground mb-4">No compatible spare parts found for this robot model.</p>
                          <Button onClick={() => navigate('/parts')}>
                            <Wrench className="w-4 h-4 mr-2" />
                            Browse All Parts
                          </Button>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* Financing */}
                  <TabsContent value="financing" className="p-6">
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold">Financing Options</h3>
                          <p className="text-sm text-muted-foreground">Explore financing solutions for this equipment</p>
                        </div>
                        <Button variant="outline" onClick={() => setShowEmiCalculator(true)}>
                          <Calculator className="w-4 h-4 mr-2" />
                          EMI Calculator
                        </Button>
                      </div>
                      
                      {loadingFinancing ? (
                        <div className="space-y-4">
                          {[...Array(2)].map((_, i) => (
                            <div key={i} className="animate-pulse">
                              <div className="h-32 bg-muted rounded-lg"></div>
                            </div>
                          ))}
                        </div>
                      ) : financingOptions.length > 0 ? (
                        <div className="grid gap-6">
                          {financingOptions.map((option) => (
                            <Card key={option.id} className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
                              <CardContent className="p-6">
                                <div className="space-y-4">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <h4 className="font-semibold text-lg">
                                        {option.profiles?.company_name || option.profiles?.full_name}
                                      </h4>
                                      <p className="text-sm text-muted-foreground">{option.product_name}</p>
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {option.loan_type?.map((type: string, idx: number) => (
                                          <Badge key={idx} variant="secondary" className="text-xs">
                                            {type}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <Badge variant="secondary" className="bg-green-50 text-green-700 mb-2">
                                        {option.min_interest_rate}% - {option.max_interest_rate}%
                                      </Badge>
                                      {option.quick_approval && (
                                        <div>
                                          <Badge variant="outline" className="text-xs">
                                            <Clock className="w-2 h-2 mr-1" />
                                            Quick Approval
                                          </Badge>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div>
                                      <p className="text-muted-foreground">Loan Amount</p>
                                      <p className="font-medium">
                                        ₹{(option.min_amount || 0).toLocaleString()} - ₹{option.max_amount.toLocaleString()}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground">Tenure</p>
                                      <p className="font-medium">
                                        {option.min_tenure_months} - {option.max_tenure_months} months
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground">Processing Fee</p>
                                      <p className="font-medium">{option.processing_fee_percentage}%</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground">Interest Rate</p>
                                      <p className="font-medium">
                                        {option.min_interest_rate}% - {option.max_interest_rate}%
                                      </p>
                                    </div>
                                  </div>
                                  
                                  {option.description && (
                                    <div>
                                      <p className="text-sm text-muted-foreground">{option.description}</p>
                                    </div>
                                  )}
                                  
                                  <div className="flex flex-wrap gap-2">
                                    {option.collateral_required && (
                                      <Badge variant="outline" className="text-xs">
                                        <Shield className="w-2 h-2 mr-1" />
                                        Collateral Required
                                      </Badge>
                                    )}
                                    {option.digital_process && (
                                      <Badge variant="outline" className="text-xs">
                                        <Star className="w-2 h-2 mr-1" />
                                        Digital Process
                                      </Badge>
                                    )}
                                    {option.prepayment_allowed && (
                                      <Badge variant="outline" className="text-xs">
                                        <Star className="w-2 h-2 mr-1" />
                                        Prepayment Allowed
                                      </Badge>
                                    )}
                                  </div>
                                  
                                   <div className="flex gap-2">
                                     <Button 
                                       className="flex-1 bg-green-600 hover:bg-green-700"
                                       onClick={() => handleApplyLoan(option)}
                                       disabled={!user}
                                     >
                                       <CreditCard className="w-4 h-4 mr-2" />
                                       Apply Now
                                     </Button>
                                     <Button 
                                       variant="outline"
                                       onClick={() => handleContactFinance(option)}
                                       disabled={!user}
                                     >
                                       <PhoneCall className="w-4 h-4 mr-2" />
                                       Call
                                     </Button>
                                   </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <DollarSign className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                          <h3 className="text-lg font-semibold mb-2">No Financing Options</h3>
                          <p className="text-muted-foreground mb-4">No financing options available at the moment.</p>
                          <Button variant="outline">
                            <DollarSign className="w-4 h-4 mr-2" />
                            Contact for Custom Financing
                          </Button>
                        </div>
                      )}
                      
                      {robot?.price && (
                        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 hover:shadow-lg transition-all duration-300">
                          <CardContent className="p-6">
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <h4 className="text-lg font-bold text-blue-900 flex items-center">
                                  <Calculator className="w-5 h-5 mr-2" />
                                  Quick EMI Estimate
                                </h4>
                                <Button 
                                  onClick={() => setShowEmiCalculator(true)}
                                  variant="outline"
                                  size="sm"
                                  className="border-blue-300 text-blue-700 hover:bg-blue-100"
                                >
                                  <Calculator className="w-4 h-4 mr-1" />
                                  Full Calculator
                                </Button>
                              </div>
                              <p className="text-sm text-blue-700 font-medium">
                                For equipment price of <span className="font-bold">{formatPrice(robot.price, robot.currency)}</span>
                              </p>
                              <div className="grid grid-cols-3 gap-4">
                                <div className="text-center p-3 bg-white/70 rounded-lg border border-blue-100">
                                  <p className="text-xs text-blue-600 font-medium mb-1">1 Year</p>
                                  <p className="text-lg font-bold text-blue-900">₹{Math.round(robot.price * 0.09).toLocaleString()}</p>
                                  <p className="text-xs text-blue-600">/month</p>
                                </div>
                                <div className="text-center p-3 bg-white/70 rounded-lg border border-blue-100">
                                  <p className="text-xs text-blue-600 font-medium mb-1">3 Years</p>
                                  <p className="text-lg font-bold text-blue-900">₹{Math.round(robot.price * 0.032).toLocaleString()}</p>
                                  <p className="text-xs text-blue-600">/month</p>
                                </div>
                                <div className="text-center p-3 bg-white/70 rounded-lg border border-blue-100">
                                  <p className="text-xs text-blue-600 font-medium mb-1">5 Years</p>
                                  <p className="text-lg font-bold text-blue-900">₹{Math.round(robot.price * 0.021).toLocaleString()}</p>
                                  <p className="text-xs text-blue-600">/month</p>
                                </div>
                              </div>
                              <p className="text-xs text-blue-600 text-center bg-blue-50 p-2 rounded border border-blue-100">
                                *Estimates based on 9-12% interest rate. Use full calculator for accurate results.
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </TabsContent>

                  {/* Logistics */}
                  <TabsContent value="logistics" className="p-6">
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-semibold flex items-center">
                          <Package className="w-5 h-5 mr-2 text-orange-600" />
                          Logistics & Shipping Partners
                        </h3>
                        <Badge variant="outline" className="text-orange-600">
                          {logisticsServices.length} Providers Available
                        </Badge>
                      </div>
                      
                      {loadingLogistics ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin mr-2" />
                          <span>Loading logistics services...</span>
                        </div>
                      ) : logisticsServices.length > 0 ? (
                        <div className="grid gap-4">
                          {logisticsServices.map((service) => (
                            <Card key={service.id} className="border-l-4 border-l-orange-500 hover:shadow-lg transition-shadow">
                              <CardContent className="p-6">
                                <div className="space-y-4">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <h4 className="font-semibold text-lg">
                                        {service.profiles?.company_name || service.profiles?.full_name || 'Logistics Provider'}
                                      </h4>
                                      <p className="text-sm text-muted-foreground">{service.service_name}</p>
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        <Badge variant="secondary" className="text-xs">{service.service_type}</Badge>
                                        {service.tracking_available && (
                                          <Badge variant="secondary" className="text-xs">GPS Tracking</Badge>
                                        )}
                                        {service.insurance_included && (
                                          <Badge variant="secondary" className="text-xs">Insurance Included</Badge>
                                        )}
                                        {service.emergency_delivery && (
                                          <Badge variant="secondary" className="text-xs">Emergency Delivery</Badge>
                                        )}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <Badge variant="secondary" className="bg-orange-50 text-orange-700 mb-2">
                                        ₹{service.base_price || 0}/base + ₹{service.price_per_kg || 0}/kg
                                      </Badge>
                                      <div>
                                        <Badge variant="outline" className="text-xs">
                                          <Clock className="w-2 h-2 mr-1" />
                                          {service.delivery_time_hours || 24}h delivery
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div>
                                      <p className="text-muted-foreground">Coverage</p>
                                      <p className="font-medium">
                                        {service.coverage_areas?.length > 0 ? 
                                          `${service.coverage_areas.slice(0, 2).join(', ')}${service.coverage_areas.length > 2 ? '...' : ''}` : 
                                          service.is_international ? 'International' : 'Domestic'
                                        }
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground">Max Weight</p>
                                      <p className="font-medium">{service.max_weight_kg || 'No limit'} kg</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground">Transport</p>
                                      <p className="font-medium">
                                        {service.transport_modes?.length > 0 ? 
                                          service.transport_modes.slice(0, 2).join(', ') : 
                                          'Various'
                                        }
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground">Special</p>
                                      <p className="font-medium">
                                        {service.special_handling ? 'Special Handling' : 'Standard'}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  {service.description && (
                                    <div>
                                      <p className="text-sm text-muted-foreground">{service.description}</p>
                                    </div>
                                  )}
                                  
                                   <div className="flex gap-2">
                                     <Button 
                                       className="flex-1 bg-orange-600 hover:bg-orange-700"
                                       onClick={() => handleGetLogisticsQuote(service)}
                                       disabled={!user}
                                     >
                                       <Package className="w-4 h-4 mr-2" />
                                       Get Quote
                                     </Button>
                                     <Button 
                                       variant="outline"
                                       onClick={() => handleContactLogistics(service)}
                                       disabled={!user}
                                     >
                                       <PhoneCall className="w-4 h-4 mr-2" />
                                       Call
                                     </Button>
                                   </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                          <h3 className="text-lg font-semibold mb-2">No Logistics Services Available</h3>
                          <p className="text-muted-foreground mb-4">No logistics providers are currently available.</p>
                          <Button variant="outline">
                            <Package className="w-4 h-4 mr-2" />
                            Request Logistics Quote
                          </Button>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                </Tabs>
              </CardContent>
            </Card>


            {/* AI Analysis Section */}
            {user && (
              <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50/80 to-purple-50/80">
                <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center text-xl">
                    <Brain className="w-6 h-6 mr-2" />
                    🚀 Advanced AI Market Intelligence
                  </CardTitle>
                  <p className="text-blue-100 text-sm">
                    Discover suppliers, services, financing & logistics with AI-powered recommendations
                  </p>
                </CardHeader>
                <CardContent className="p-6">
                  {!aiAnalysis ? (
                    <div className="text-center py-8">
                      <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                        <Brain className="w-10 h-10 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-800 mb-3">
                        Unlock Smart Market Insights
                      </h3>
                      <p className="text-gray-600 mb-6 max-w-2xl mx-auto leading-relaxed">
                        Get AI-powered recommendations for spare parts, services, financing, and logistics 
                        specifically matched to this robot with intelligent market analysis.
                      </p>
                      <div className="grid grid-cols-3 gap-4 mb-8">
                        <div className="p-4 bg-white rounded-xl border border-blue-200 shadow-sm">
                          <Wrench className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                          <div className="text-sm font-semibold text-gray-700">Spare Parts</div>
                          <div className="text-xs text-gray-500">Smart Matching</div>
                        </div>
                        <div className="p-4 bg-white rounded-xl border border-green-200 shadow-sm">
                          <Settings className="w-8 h-8 text-green-600 mx-auto mb-2" />
                          <div className="text-sm font-semibold text-gray-700">Services</div>
                          <div className="text-xs text-gray-500">Expert Providers</div>
                        </div>
                        <div className="p-4 bg-white rounded-xl border border-purple-200 shadow-sm">
                          <DollarSign className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                          <div className="text-sm font-semibold text-gray-700">Finance</div>
                          <div className="text-xs text-gray-500">Funding Solutions</div>
                        </div>
                      </div>
                      <Button 
                        onClick={handleAIAnalysis}
                        disabled={analysisLoading}
                        size="lg"
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                      >
                        {analysisLoading ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Analyzing Market...
                          </>
                        ) : (
                          <>
                            <Brain className="w-5 h-5 mr-2" />
                            Generate Smart Analysis
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <AIAnalysisResult 
                      analysis={aiAnalysis.analysis} 
                      cached={aiAnalysis.cached || false}
                      currentUserLocation={aiAnalysis.currentUserLocation || currentUserLocation}
                      className="mt-6"
                    />
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* EMI Calculator Modal */}
          <Dialog open={showEmiCalculator} onOpenChange={setShowEmiCalculator}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>EMI Calculator for {robot?.name}</DialogTitle>
                <DialogDescription>
                  Calculate your loan EMI for this robot equipment
                </DialogDescription>
              </DialogHeader>
              <LoanCalculator 
                defaultAmount={robot?.price || 1000000}
                defaultRate={10.5}
                defaultTenure={60}
                onClose={() => setShowEmiCalculator(false)}
              />
            </DialogContent>
          </Dialog>

          {/* Sidebar with Seller info and Contact buttons */}
          <div className="space-y-6">
            {user && robot.profiles && (
              <Card>
                <CardHeader>
                  <CardTitle>Seller Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-2 text-muted-foreground" />
                      <span>{robot.profiles.full_name}</span>
                    </div>
                    {robot.profiles.company_name && (
                      <div className="flex items-center">
                        <Building className="w-4 h-4 mr-2 text-muted-foreground" />
                        <span>{robot.profiles.company_name}</span>
                      </div>
                    )}
                    {robot.profiles.phone && (
                      <div className="flex items-center">
                        <Phone className="w-4 h-4 mr-2 text-muted-foreground" />
                        <span>{robot.profiles.phone}</span>
                      </div>
                    )}
                    {robot.profiles.email && (
                      <div className="flex items-center">
                        <Mail className="w-4 h-4 mr-2 text-muted-foreground" />
                        <span className="text-sm">{robot.profiles.email}</span>
                      </div>
                    )}
                    {robot.profiles.location && (
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 mr-2 text-muted-foreground" />
                        <span>{robot.profiles.location}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {!user && (
              <Card>
                <CardHeader>
                  <CardTitle>Login Required</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Please log in to view seller information and access AI analysis features.
                  </p>
                  <Button onClick={() => navigate('/auth')} className="w-full">
                    Login / Sign Up
                  </Button>
                </CardContent>
              </Card>
            )}

            {user && (
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700" 
                      size="lg"
                      onClick={handleContactSeller}
                    >
                      <PhoneCall className="w-4 h-4 mr-2" />
                      Contact Seller
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full border-blue-600 text-blue-600 hover:bg-blue-50"
                      onClick={handleRequestQuote}
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Request Quote
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full border-red-600 text-red-600 hover:bg-red-50"
                      onClick={handleAddToWatchlist}
                      disabled={addingToWatchlist}
                    >
                      {addingToWatchlist ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Heart className={`w-4 h-4 mr-2 ${isInWatchlist ? 'fill-current' : ''}`} />
                      )}
                      {isInWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
                    </Button>
                  </div>
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
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                  onClick={prevImage}
                >
                  <ChevronLeft className="w-6 h-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                  onClick={nextImage}
                >
                  <ChevronRight className="w-6 h-6" />
                </Button>
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded">
                  {currentImageIndex + 1} / {robot.images.length}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Quote Request Modal */}
      <Dialog open={showQuoteModal} onOpenChange={setShowQuoteModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request Quote</DialogTitle>
            <DialogDescription>
              Send a quote request to {robot?.profiles?.company_name || robot?.profiles?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Add any specific requirements or questions..."
              value={quoteMessage}
              onChange={(e) => setQuoteMessage(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuoteModal(false)}>
              Cancel
            </Button>
            <Button onClick={sendQuoteEmail}>
              <Mail className="w-4 h-4 mr-2" />
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

        {/* Import Quote Modal */}
      <Dialog open={showImportQuote} onOpenChange={setShowImportQuote}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Plane className="w-5 h-5 mr-2" />
              Import Quote Request
            </DialogTitle>
            <DialogDescription>
              Request detailed import pricing including duties and logistics
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {importDuty && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h4 className="font-semibold mb-2">Estimated Import Costs</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Base Price:</span>
                    <span>{formatPrice(robot?.price || 0, robot?.currency || 'USD')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Import Duty (18%):</span>
                    <span className="text-orange-600">{formatPrice(importDuty, robot?.currency || 'USD')}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Estimated Total:</span>
                    <span>{formatPrice((robot?.price || 0) + importDuty, robot?.currency || 'USD')}</span>
                  </div>
                </div>
              </div>
            )}
            <Textarea
              placeholder="Additional requirements for import (customs clearance, shipping preferences, etc.)..."
              value={quoteMessage}
              onChange={(e) => setQuoteMessage(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportQuote(false)}>
              Cancel
            </Button>
            <Button onClick={sendImportQuoteEmail}>
              <Mail className="w-4 h-4 mr-2" />
              Send Import Quote Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Loan Application Modal */}
      <LoanApplicationModal
        open={showLoanApplication}
        onOpenChange={(open) => {
          setShowLoanApplication(open);
          if (!open) {
            setSelectedFinanceProvider(null);
          }
        }}
        robotDetails={robot ? {
          name: robot.name,
          model: robot.model,
          price: robot.price || 0,
          currency: robot.currency || 'INR',
          type: robot.robot_type
        } : undefined}
        financeProvider={selectedFinanceProvider}
      />
    </div>
  );
};

export default RobotDetails;
