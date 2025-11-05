import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import LoanCalculator from "@/components/forms/LoanCalculator";
import LoanApplicationModal from "@/components/forms/LoanApplicationModal";
import SupplierQuoteForm from "@/components/forms/SupplierQuoteForm";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import AIAnalysisResult from "@/components/AIAnalysisResult";
import { Bot, MapPin, Building, Phone, Mail, User, ArrowLeft, Loader2, Wrench, Settings, DollarSign, Brain, Heart, MessageCircle, PhoneCall, X, ChevronLeft, ChevronRight, Maximize2, FileText, Search, CreditCard, Calculator, Plane, Package, Tag, Clock, Shield, Star, Eye, Download, Truck, MessageSquare, Camera, ZoomIn, Share2, Calendar, Send, AlertCircle } from "lucide-react";
import { ChatButton } from "@/components/chat/ChatButton";
import ViewCountDisplay from "@/components/ViewCountDisplay";
import EnhancedHeader from "@/components/EnhancedHeader";
import ProfessionalRobotReportModal from "@/components/ProfessionalRobotReportModal";
import { ComprehensiveAIMarketAnalysis } from "@/components/ComprehensiveAIMarketAnalysis";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";
import { useButtonTracking } from "@/hooks/useButtonTracking";
import { useUniversalViewTracking } from "@/hooks/useUniversalViewTracking";
import { type RobotSEOData } from "@/utils/seo";
import { useRobotSEO } from "@/hooks/useRobotSEO";

// ============================================
// TYPE DEFINITIONS
// ============================================

// Robot interface defines the structure of robot data
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

// Custom field for additional properties
interface CustomField {
  id: string;
  field_name: string;
  field_value: string;
}

// AI analysis data structure
interface AIAnalysisData {
  summary: string;
  suitability?: string;
  technicalInsights?: string;
  governmentSchemes?: string;
  suggestedIndustries?: string;
  timestamp: string;
}

// AI analysis result with recommendations
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

// ============================================
// CONSTANTS
// ============================================

// List of all Indian states for location validation
const INDIAN_STATES = [
  'andhra pradesh', 'arunachal pradesh', 'assam', 'bihar', 'chhattisgarh', 'goa', 'gujarat',
  'haryana', 'himachal pradesh', 'jharkhand', 'karnataka', 'kerala', 'madhya pradesh',
  'maharashtra', 'manipur', 'meghalaya', 'mizoram', 'nagaland', 'odisha', 'punjab',
  'rajasthan', 'sikkim', 'tamil nadu', 'telangana', 'tripura', 'uttar pradesh',
  'uttarakhand', 'west bengal', 'delhi', 'jammu and kashmir', 'ladakh', 'chandigarh',
  'dadra and nagar haveli and daman and diu', 'lakshadweep', 'puducherry'
];

// ============================================
// MAIN COMPONENT
// ============================================

const RobotDetails = () => {
  // ============================================
  // HOOKS & INITIALIZATION
  // ============================================
  
  // Get robot ID from URL parameters
  const { id } = useParams<{ id: string }>();
  
  // Navigation hook to redirect users
  const navigate = useNavigate();
  
  // Get current authenticated user
  const { user } = useAuth();
  
  // Toast notifications for user feedback
  const { toast } = useToast();
  
  // Track button clicks for analytics
  const { trackButtonClick } = useButtonTracking();
  
  // Track page views and item views
  const { trackItemView } = useUniversalViewTracking();
  
  // SEO hook for generating SEO elements
  const { seoElements, generateSEO } = useRobotSEO();

  // ============================================
  // STATE: ROBOT DATA
  // ============================================
  
  const [robot, setRobot] = useState<Robot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ============================================
  // STATE: RELATED DATA
  // ============================================
  
  const [services, setServices] = useState<any[]>([]);
  const [spareParts, setSpareParts] = useState<any[]>([]);
  const [financingOptions, setFinancingOptions] = useState<any[]>([]);
  const [logisticsServices, setLogisticsServices] = useState<any[]>([]);

  // ============================================
  // STATE: LOADING FLAGS
  // ============================================
  
  const [loadingServices, setLoadingServices] = useState(false);
  const [loadingSpareParts, setLoadingSpareParts] = useState(false);
  const [loadingFinancing, setLoadingFinancing] = useState(false);
  const [loadingLogistics, setLoadingLogistics] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  // ============================================
  // STATE: UI CONTROLS
  // ============================================
  
  // Image gallery state
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showFullscreen, setShowFullscreen] = useState(false);
  
  // Modal states
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showImportQuote, setShowImportQuote] = useState(false);
  const [showEmiCalculator, setShowEmiCalculator] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showMarketAnalysis, setShowMarketAnalysis] = useState(false);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [showLoanApplication, setShowLoanApplication] = useState(false);
  
  // Tab selection state
  const [activeTab, setActiveTab] = useState<'overview' | 'specifications' | 'spareparts' | 'services' | 'logistics' | 'financing'>('overview');

  // ============================================
  // STATE: USER INPUT
  // ============================================
  
  const [quoteMessage, setQuoteMessage] = useState('');
  const [currentUserLocation, setCurrentUserLocation] = useState<string>('');

  // ============================================
  // STATE: WATCHLIST & TRACKING
  // ============================================
  
  const [addingToWatchlist, setAddingToWatchlist] = useState(false);
  const [isInWatchlist, setIsInWatchlist] = useState(false);

  // ============================================
  // STATE: SELECTED ITEMS
  // ============================================
  
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedFinanceProvider, setSelectedFinanceProvider] = useState<any>(null);

  // ============================================
  // STATE: AI ANALYSIS
  // ============================================
  
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResult | null>(null);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);

  // ============================================
  // STATE: PRICING
  // ============================================
  
  const [importDuty, setImportDuty] = useState<number | null>(null);

  // ============================================
  // HELPER FUNCTIONS
  // ============================================

  /**
   * Check if location is in India
   * @param state - State name
   * @param location - Location name
   * @returns true if location is in India
   */
  const isIndianLocation = (state?: string, location?: string) => {
    const s = (state || '').toLowerCase().replace(/\s+/g, '');
    const loc = (location || '').toLowerCase();
    
    const normalizedStates = INDIAN_STATES.map(state => state.replace(/\s+/g, ''));
    
    if (s && normalizedStates.includes(s)) return true;
    if (loc.includes('india')) return true;
    return INDIAN_STATES.some(st => loc.includes(st));
  };

  // Check if robot is outside India for import duties
  const outsideIndia = robot ? !isIndianLocation(robot.state, robot.location) : false;

  /**
   * Format price with currency symbol
   * @param price - Price number
   * @param currency - Currency code (USD, EUR, INR)
   * @returns Formatted price string
   */
  const formatPrice = (price: number, currency: string) => {
    const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₹';
    return `${currencySymbol}${price.toLocaleString()}`;
  };

  /**
   * Calculate import duty (18% for items outside India)
   * @param basePrice - Base price of robot
   * @param currency - Currency code
   * @returns Calculated import duty
   */
  const calculateImportDuty = (basePrice: number, currency: string) => {
    const isInIndia = robot?.state && INDIAN_STATES.some(st => 
      robot.state?.toLowerCase().includes(st.toLowerCase())
    );
    
    if (!isInIndia && basePrice) {
      const dutyRate = 0.18;
      const duty = basePrice * dutyRate;
      setImportDuty(duty);
      return duty;
    }
    setImportDuty(null);
    return 0;
  };

  // ============================================
  // EFFECT: FETCH ROBOT DATA
  // ============================================

  useEffect(() => {
    if (!id) return;
    
    const fetchRobot = async () => {
      try {
        setLoading(true);
        
        // Query robot with seller profile information
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
        
        // Parse technical specifications as object
        setRobot({
          ...data,
          technical_specifications: typeof data.technical_specifications === 'object' && data.technical_specifications !== null 
            ? data.technical_specifications as Record<string, any>
            : {}
        });

        // Track robot page view
        await trackItemView('robots', data.id, data);
        
        // Track button click for analytics
        await trackButtonClick({
          buttonName: "Robot Page View",
          buttonType: "robot_page_view",
          sellerId: data.seller_id,
          sellerName: data.profiles?.full_name || 'No Name Available',
          itemId: data.id,
          itemType: "robot",
          additionalData: {
            robotName: data.name,
            robotModel: data.model,
            robotType: data.robot_type,
            price: data.price,
            currency: data.currency,
            location: data.location,
          }
        });

        // Generate SEO elements
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
          images: data.images || []
        };
        
        generateSEO(robotSEOData);

        // Check if robot is in user's watchlist
        if (user) {
          const { data: watchlistData } = await supabase
            .from('watchlists')
            .select('id')
            .eq('user_id', user.id)
            .eq('item_type', 'robot')
            .eq('item_id', data.id)
            .single();
          
          setIsInWatchlist(!!watchlistData);
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

  // ============================================
  // EFFECT: FETCH USER LOCATION
  // ============================================

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

  // ============================================
  // EFFECT: CALCULATE IMPORT DUTY
  // ============================================

  useEffect(() => {
    if (robot?.price) {
      calculateImportDuty(robot.price, robot.currency);
    }
  }, [robot]);

  // ============================================
  // EFFECT: FETCH RELATED DATA
  // ============================================

  useEffect(() => {
    // Load all related data when robot or user location changes
    fetchRelatedServices();
    fetchCompatibleSpareParts();
    fetchFinancingOptions();
    fetchLogisticsServices();
  }, [robot, currentUserLocation]);

  // ============================================
  // FETCH FUNCTIONS
  // ============================================

  /**
   * Fetch services with location proximity sorting
   */
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
            mobile_number,
            email,
            location,
            avatar_url
          )
        `)
        .limit(10);

      if (error) throw error;
      
      // Sort by location proximity
      const sortedData = data?.sort((a, b) => {
        if (!currentUserLocation) return 0;
        const aDistance = a.profiles?.location?.toLowerCase().includes(currentUserLocation.toLowerCase()) ? 0 : 1;
        const bDistance = b.profiles?.location?.toLowerCase().includes(currentUserLocation.toLowerCase()) ? 0 : 1;
        return aDistance - bDistance;
      });

      setServices(sortedData || []);
    } catch (err) {
      console.error('Error fetching services:', err);
    } finally {
      setLoadingServices(false);
    }
  };

  /**
   * Fetch spare parts compatible with robot
   */
  const fetchCompatibleSpareParts = async () => {
    setLoadingSpareParts(true);
    try {
      let query = supabase
        .from('spare_parts')
        .select(`
          *,
          profiles!spare_parts_seller_id_fkey (
            full_name,
            company_name,
            phone,
            mobile_number,
            email,
            location
          )
        `);

      if (robot) {
        query = query.or(`compatible_robots.cs.{${robot.model}},compatible_robots.cs.{${robot.brand}},compatible_robots.cs.{${robot.name}}`);
      }

      const { data, error } = await query.limit(12);

      if (error) throw error;
      
      // Sort by location proximity
      const sortedData = data?.sort((a, b) => {
        if (!currentUserLocation) return 0;
        const aDistance = a.profiles?.location?.toLowerCase().includes(currentUserLocation.toLowerCase()) ? 0 : 1;
        const bDistance = b.profiles?.location?.toLowerCase().includes(currentUserLocation.toLowerCase()) ? 0 : 1;
        return aDistance - bDistance;
      });

      setSpareParts(sortedData || []);
    } catch (err) {
      console.error('Error fetching spare parts:', err);
    } finally {
      setLoadingSpareParts(false);
    }
  };

  /**
   * Fetch financing options from database
   */
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

  /**
   * Fetch logistics services with location sorting
   */
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
      
      // Sort by location proximity
      const sortedData = data?.sort((a, b) => {
        if (!currentUserLocation) return 0;
        const aDistance = a.profiles?.location?.toLowerCase().includes(currentUserLocation.toLowerCase()) ? 0 : 1;
        const bDistance = b.profiles?.location?.toLowerCase().includes(currentUserLocation.toLowerCase()) ? 0 : 1;
        return aDistance - bDistance;
      });

      setLogisticsServices(sortedData || []);
    } catch (err) {
      console.error('Error fetching logistics services:', err);
    } finally {
      setLoadingLogistics(false);
    }
  };

  // ============================================
  // HANDLER FUNCTIONS: CONTACT & COMMUNICATION
  // ============================================

  /**
   * Contact seller by phone
   */
  const handleContactSeller = async () => {
    const phone = robot?.profiles?.phone || robot?.profiles?.mobile_number;
    
    if (!phone) {
      toast({
        title: "Phone Number Not Available",
        description: "Seller's phone number is not provided.",
        variant: "destructive",
      });
      return;
    }

    // Track contact attempt
    await trackButtonClick({
      buttonName: "Contact Seller Phone",
      buttonType: "contact",
      sellerId: robot?.seller_id,
      itemId: robot?.id,
      itemType: "robot",
      additionalData: {
        contactMethod: "phone"
      }
    });

    const phoneNumber = phone.replace(/\\D/g, '');
    window.open(`tel:${phoneNumber}`, '_self');
    toast({
      title: "Calling Seller",
      description: `Calling ${robot.profiles.company_name || robot.profiles.full_name}`,
    });
  };

  /**
   * Open WhatsApp chat with seller
   */
  const handleWhatsAppInquiry = async () => {
    if (!robot) return;

    const phone = robot?.profiles?.phone || robot?.profiles?.mobile_number;
    
    if (!phone) {
      toast({
        title: "WhatsApp Not Available",
        description: "Seller's phone number is not provided for WhatsApp contact.",
        variant: "destructive",
      });
      return;
    }

    // Track WhatsApp interaction
    await trackButtonClick({
      buttonName: "WhatsApp Latest Price",
      buttonType: "contact",
      sellerId: robot?.seller_id,
      itemId: robot?.id,
      itemType: "robot",
      additionalData: {
        contactMethod: "whatsapp"
      }
    });

    const message = `Hi! I'm interested in getting the latest price for:\n\n🤖 *${robot.name}*\n📦 Model: ${robot.model}\n🏷️ Type: ${robot.robot_type}\n📍 Location: ${robot.location}`;

    const phoneNumber = phone.replace(/\\D/g, '');
    const whatsappUrl = `https://wa.me/91${phoneNumber}?text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, '_blank');
    
    toast({
      title: "Opening WhatsApp",
      description: `Redirecting to WhatsApp chat with ${robot.profiles.company_name || robot.profiles.full_name}`,
    });
  };

  /**
   * Handle quote request email
   */
  const handleRequestQuote = async () => {
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

  /**
   * Send quote request via email
   */
  const sendQuoteEmail = async () => {
    if (!robot?.profiles?.email) return;

    const subject = `Quote Request for ${robot.name} - ${robot.model}`;
    const body = `Dear ${robot.profiles.full_name},\n\nI am interested in the following robot:\n\nRobot: ${robot.name}\nModel: ${robot.model}\nType: ${robot.robot_type}\n${quoteMessage ? `\\nAdditional Message:\\n${quoteMessage}` : ''}\n\nPlease provide me with the latest quote and availability.\n\nBest regards`;

    const mailtoLink = `mailto:${robot.profiles.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoLink, '_blank');
    
    setShowQuoteModal(false);
    setQuoteMessage('');
    
    toast({
      title: "Quote Request Sent",
      description: `Email sent to ${robot.profiles.company_name || robot.profiles.full_name}`,
    });
  };

  /**
   * Handle import quote request
   */
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

  /**
   * Send import quote email
   */
  const sendImportQuoteEmail = () => {
    if (!robot?.profiles?.email) return;
    
    const basePrice = robot.price || 0;
    const duty = importDuty || 0;
    const totalPrice = basePrice + duty;
    const subject = `Import Quote Request for ${robot.name} - ${robot.model}`;
    const body = `Dear ${robot.profiles.full_name},\n\nI am interested in importing the following robot to India:\n\nRobot: ${robot.name}\nModel: ${robot.model}\nBase Price: ${formatPrice(basePrice, robot.currency)}\n${duty > 0 ? `Estimated Import Duty (18%): ${formatPrice(duty, robot.currency)}\\nTotal Estimated Cost: ${formatPrice(totalPrice, robot.currency)}` : ''}\n\nPlease provide:\n1. Complete pricing with all duties\n2. Import documentation\n3. Shipping arrangements\n4. Warranty terms for imported equipment\n\nBest regards`;

    const mailtoLink = `mailto:${robot.profiles.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoLink, '_blank');
    
    setShowImportQuote(false);
    
    toast({
      title: "Import Quote Request Sent",
      description: `Email sent to ${robot.profiles.company_name || robot.profiles.full_name}`,
    });
  };

  // ============================================
  // HANDLER FUNCTIONS: WATCHLIST
  // ============================================

  /**
   * Add or remove robot from watchlist
   */
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

    try {
      setAddingToWatchlist(true);
      
      if (isInWatchlist) {
        // Remove from watchlist
        const { error } = await supabase
          .from('watchlists')
          .delete()
          .eq('user_id', user.id)
          .eq('item_type', 'robot')
          .eq('item_id', robot.id);

        if (error) throw error;
        setIsInWatchlist(false);
        
        // Track removal
        await trackButtonClick({
          buttonName: "Remove from Watchlist",
          buttonType: "wishlist",
          sellerId: robot.seller_id,
          itemId: robot.id,
          itemType: "robot",
          additionalData: { action: "remove" }
        });

        toast({
          title: "Removed from Watchlist",
          description: `${robot.name} has been removed from your watchlist.`,
        });
      } else {
        // Add to watchlist
        const { error } = await supabase
          .from('watchlists')
          .insert({
            user_id: user.id,
            item_type: 'robot',
            item_id: robot.id,
            notes: `${robot.name} - ${robot.model}`,
            priority: 'medium'
          });

        if (error) throw error;
        setIsInWatchlist(true);
        
        // Track addition
        await trackButtonClick({
          buttonName: "Add to Watchlist",
          buttonType: "wishlist",
          sellerId: robot.seller_id,
          itemId: robot.id,
          itemType: "robot",
          additionalData: { action: "add" }
        });

        toast({
          title: "Added to Watchlist",
          description: `${robot.name} has been added to your watchlist.`,
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

  // ============================================
  // HANDLER FUNCTIONS: IMAGE NAVIGATION
  // ============================================

  /**
   * Navigate to next image
   */
  const nextImage = () => {
    if (robot?.images && robot.images.length > 1) {
      setCurrentImageIndex((prev) => (prev + 1) % robot.images.length);
    }
  };

  /**
   * Navigate to previous image
   */
  const prevImage = () => {
    if (robot?.images && robot.images.length > 1) {
      setCurrentImageIndex((prev) => (prev - 1 + robot.images.length) % robot.images.length);
    }
  };

  // ============================================
  // HANDLER FUNCTIONS: AI & ANALYSIS
  // ============================================

  /**
   * Generate AI analysis for robot
   */
  const handleAIAnalysis = async () => {
    if (!robot || !user) {
      toast({
        title: "Login Required",
        description: "Please log in to access AI analysis features.",
        variant: "destructive",
      });
      return;
    }

    // Track AI analysis request
    await trackButtonClick({
      buttonName: "AI Analysis",
      buttonType: "analysis",
      sellerId: robot?.seller_id,
      itemId: robot?.id,
      itemType: "robot",
      additionalData: { robotName: robot?.name }
    });

    try {
      setAnalysisLoading(true);
      const { data, error } = await supabase.functions.invoke('roboverse-ai-analyze', {
        body: { robotId: robot.id },
      });
      
      if (error) throw error;
      
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
      
      toast({
        title: "AI Analysis Complete",
        description: data.cached ? "Cached analysis retrieved" : "New analysis generated",
      });
    } catch (err) {
      console.error('Error getting AI analysis:', err);
      toast({
        title: "Analysis Failed",
        description: err instanceof Error ? err.message : 'Failed to generate analysis',
        variant: "destructive",
      });
    } finally {
      setAnalysisLoading(false);
    }
  };

  /**
   * Generate robot report
   */
  const handleGenerateReport = async () => {
    if (!robot || !user) {
      toast({
        title: "Login Required",
        description: "Please log in to generate reports.",
        variant: "destructive",
      });
      return;
    }

    setShowReportModal(true);
  };

  /**
   * Find similar robots
   */
  const handleFindSimilar = () => {
    const searchParams = new URLSearchParams({
      type: robot?.robot_type || '',
      category: robot?.category_tags?.[0] || ''
    });
    navigate(`/robots?${searchParams.toString()}`);
  };

  // ============================================
  // HANDLER FUNCTIONS: SUPPLIER CONTACT
  // ============================================

  /**
   * Contact supplier by phone
   */
  const handleContactSupplier = async (supplierPhone: string, supplierName: string, itemType: string) => {
    if (!supplierPhone) {
      toast({
        title: "Phone Number Not Available",
        description: `${supplierName}'s phone number is not provided.`,
        variant: "destructive",
      });
      return;
    }

    const phoneNumber = supplierPhone.replace(/\\D/g, '');
    window.open(`tel:${phoneNumber}`, '_self');
    toast({
      title: "Calling Supplier",
      description: `Calling ${supplierName}`,
    });
  };

  /**
   * Request supplier quote
   */
  const handleGetQuote = (supplier: any, item: any, itemType: 'spare_part' | 'service' | 'logistics') => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to request quotes.",
        variant: "destructive",
      });
      return;
    }

    setSelectedSupplier({
      name: supplier.profiles?.full_name || supplier.profiles?.company_name || 'Unknown',
      email: supplier.profiles?.email || '',
      company: supplier.profiles?.company_name || supplier.profiles?.full_name || '',
      phone: supplier.profiles?.phone || supplier.profiles?.mobile_number,
      sellerId: supplier.seller_id || supplier.provider_id || supplier.id
    });

    setSelectedItem({
      type: itemType,
      name: item.name || item.service_name || item.service_type,
      id: item.id,
      model: item.model,
      category: item.category || item.service_type
    });

    setShowQuoteForm(true);
  };

  /**
   * Apply for loan
   */
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

  // ============================================
  // RENDER: LOADING STATE
  // ============================================

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

  // ============================================
  // RENDER: ERROR STATE
  // ============================================

  if (error || !robot) {
    return (
      <div className=\"min-h-screen bg-muted/20\">
        <EnhancedHeader />
        <div className=\"container mx-auto px-4 py-8\">
          <div className=\"flex flex-col items-center justify-center py-12\">
            <Bot className=\"w-16 h-16 text-muted-foreground mb-4\" />
            <h3 className=\"text-lg font-semibold mb-2\">Robot Not Found</h3>
            <p className=\"text-muted-foreground mb-4\">{error || 'The requested robot could not be found.'}</p>
            <Button onClick={() => navigate('/robots')} variant=\"outline\">
              <ArrowLeft className=\"w-4 h-4 mr-2\" />
              Back to Robots
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: MAIN CONTENT
  // ============================================

  return (
    <div className=\"min-h-screen bg-muted/20\">
      <EnhancedHeader />
      <div className=\"container mx-auto px-4 py-6 max-w-7xl\">
        {/* Header Navigation & Actions */}
        <div className=\"flex items-center justify-between mb-6\">
          <Button variant=\"outline\" onClick={() => navigate('/robots')} className=\"shadow-sm\">
            <ArrowLeft className=\"w-4 h-4 mr-2\" />
            Back to Robots
          </Button>
          
          <div className=\"flex items-center gap-2\">
            <ViewCountDisplay targetType=\"robots\" targetId={robot.id} />
          </div>
        </div>

        {/* Main Grid: 2/3 content + 1/3 sidebar */}
        <div className=\"grid grid-cols-1 lg:grid-cols-3 gap-6\">
          {/* Left Column (2/3) - Main Content */}
          <div className=\"lg:col-span-2 space-y-6\">
            {/* Robot Main Card with Images & Info */}
            <Card className=\"overflow-hidden shadow-lg border border-border bg-card\">
              <CardContent className=\"p-0\">
                <div className=\"grid md:grid-cols-2 gap-0\">
                  {/* Image Gallery */}
                  <div className=\"relative bg-card p-4 rounded-lg\">
                    <div className=\"aspect-square rounded-lg overflow-hidden\">
                      {robot?.images && robot.images.length > 0 ? (
                        <>
                          <ResponsiveImage
                            src={robot.images[currentImageIndex]}
                            alt={`${robot.name} - Image ${currentImageIndex + 1}`}
                            className=\"w-full h-full object-cover\"
                            onClick={() => setShowFullscreen(true)}
                          />
                          <Button
                            onClick={() => setShowFullscreen(true)}
                            className=\"absolute top-4 right-4 bg-background/80\"
                            size=\"sm\"
                          >
                            <Maximize2 className=\"w-4 h-4\" />
                          </Button>
                          {robot.images.length > 1 && (
                            <>
                              <Button
                                variant=\"ghost\"
                                size=\"icon\"
                                className=\"absolute left-4 top-1/2 -translate-y-1/2 bg-background/80\"
                                onClick={prevImage}
                              >
                                <ChevronLeft className=\"w-4 h-4\" />
                              </Button>
                              <Button
                                variant=\"ghost\"
                                size=\"icon\"
                                className=\"absolute right-4 top-1/2 -translate-y-1/2 bg-background/80\"
                                onClick={nextImage}
                              >
                                <ChevronRight className=\"w-4 h-4\" />
                              </Button>
                              <div className=\"absolute bottom-4 right-4 bg-background/90 px-3 py-1 rounded-full text-sm font-semibold\">
                                {currentImageIndex + 1} / {robot.images.length}
                              </div>
                            </>
                          )}
                        </>
                      ) : (
                        <div className=\"flex items-center justify-center h-full bg-muted/30\">
                          <Bot className=\"w-20 h-20 text-muted-foreground\" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Robot Info Panel */}
                  <div className=\"p-6 bg-card flex flex-col justify-between\">
                    <div>
                      <h1 className=\"text-2xl font-bold text-primary leading-tight\">{robot.name}</h1>
                      <p className=\"text-sm text-muted-foreground mt-1 font-medium\">{robot.robot_type}</p>
                      
                      <div className=\"mt-4 flex items-baseline gap-3\">
                        <h2 className=\"text-2xl font-bold text-primary\">{formatPrice(robot?.price ?? 0, robot?.currency ?? '')}</h2>
                        {outsideIndia && (
                          <Button variant=\"outline\" size=\"sm\" onClick={handleImportQuote}>
                            Import Quote
                          </Button>
                        )}
                      </div>

                      <div className=\"mt-4 bg-muted/20 p-4 rounded-lg border\">
                        <div className=\"grid grid-cols-3 gap-4\">
                          <div>
                            <p className=\"text-xs font-semibold text-muted-foreground\">LOCATION</p>
                            <p className=\"font-semibold\">{robot?.location ?? 'N/A'}</p>
                          </div>
                          <div>
                            <p className=\"text-xs font-semibold text-muted-foreground\">YEAR</p>
                            <p className=\"font-semibold\">{robot.year_manufactured}</p>
                          </div>
                          <div>
                            <p className=\"text-xs font-semibold text-muted-foreground\">CONDITION</p>
                            <p className=\"font-semibold\">{robot.condition?.replace(/_/g, ' ')}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className=\"mt-6 flex flex-col space-y-3\">
                      {user && (
                        <Button 
                          variant=\"outline\" 
                          className=\"w-full\"
                          onClick={handleAddToWatchlist}
                          disabled={addingToWatchlist}
                        >
                          <Heart className={`w-4 h-4 mr-2 ${isInWatchlist ? 'fill-current' : ''}`} />
                          {isInWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabs: Overview, Specifications, Services, etc. */}
            <Card>
              <CardContent className=\"p-0\">
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className=\"w-full\">
                  <TabsList className=\"grid w-full grid-cols-6 rounded-none border-b\">
                    <TabsTrigger value=\"overview\">Overview</TabsTrigger>
                    <TabsTrigger value=\"specifications\">Specifications</TabsTrigger>
                    <TabsTrigger value=\"spareparts\">Spare Parts</TabsTrigger>
                    <TabsTrigger value=\"services\">Services</TabsTrigger>
                    <TabsTrigger value=\"logistics\">Logistics</TabsTrigger>
                    <TabsTrigger value=\"financing\">Financing</TabsTrigger>
                  </TabsList>
                  
                  {/* Overview Tab */}
                  <TabsContent value=\"overview\" className=\"p-6\">
                    <div className=\"space-y-4\">
                      {robot.description && (
                        <div className=\"bg-muted/30 rounded-lg p-4 border\">
                          <p className=\"text-sm leading-relaxed\">{robot.description}</p>
                        </div>
                      )}
                      
                      <div className=\"grid md:grid-cols-2 gap-6\">
                        {/* Technical Overview */}
                        <div className=\"space-y-3\">
                          <h4 className=\"flex items-center gap-2 font-semibold\">
                            <Settings className=\"w-4 h-4 text-primary\" />
                            Technical Overview
                          </h4>
                          <div className=\"space-y-2\">
                            {robot.brand && (
                              <div className=\"flex items-center gap-2 text-sm\">
                                <span className=\"w-2 h-2 bg-primary rounded-full\"></span>
                                <span className=\"font-medium\">Brand:</span>
                                <span className=\"text-muted-foreground\">{robot.brand}</span>
                              </div>
                            )}
                            {robot.model && (
                              <div className=\"flex items-center gap-2 text-sm\">
                                <span className=\"w-2 h-2 bg-primary rounded-full\"></span>
                                <span className=\"font-medium\">Model:</span>
                                <span className=\"text-muted-foreground\">{robot.model}</span>
                              </div>
                            )}
                            {robot.payload_capacity && (
                              <div className=\"flex items-center gap-2 text-sm\">
                                <span className=\"w-2 h-2 bg-primary rounded-full\"></span>
                                <span className=\"font-medium\">Payload:</span>
                                <span className=\"text-muted-foreground\">{robot.payload_capacity} kg</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Key Features */}
                        <div className=\"space-y-3\">
                          <h4 className=\"flex items-center gap-2 font-semibold\">
                            <Wrench className=\"w-4 h-4 text-primary\" />
                            Key Features
                          </h4>
                          <div className=\"space-y-2\">
                            {robot.reach && (
                              <div className=\"flex items-center gap-2 text-sm\">
                                <span className=\"w-2 h-2 bg-primary rounded-full\"></span>
                                <span className=\"font-medium\">Reach:</span>
                                <span className=\"text-muted-foreground\">{robot.reach} mm</span>
                              </div>
                            )}
                            {robot.repeatability && (
                              <div className=\"flex items-center gap-2 text-sm\">
                                <span className=\"w-2 h-2 bg-primary rounded-full\"></span>
                                <span className=\"font-medium\">Repeatability:</span>
                                <span className=\"text-muted-foreground\">±{robot.repeatability} mm</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Applications */}
                      {robot.applications && robot.applications.length > 0 && (
                        <div className=\"space-y-3\">
                          <h4 className=\"flex items-center gap-2 font-semibold\">
                            <Tag className=\"w-4 h-4 text-primary\" />
                            Suitable Applications
                          </h4>
                          <div className=\"flex flex-wrap gap-2\">
                            {robot.applications.map((app: string, idx: number) => (
                              <Badge key={idx} variant=\"secondary\" className=\"text-xs\">
                                {app}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* Specifications Tab */}
                  <TabsContent value=\"specifications\" className=\"p-6\">
                    <div className=\"space-y-6\">
                      <div className=\"grid grid-cols-2 gap-4\">
                        {robot.payload_capacity && (
                          <div>
                            <span className=\"font-medium\">Payload Capacity:</span>
                            <p className=\"text-muted-foreground\">{robot.payload_capacity} kg</p>
                          </div>
                        )}
                        {robot.reach && (
                          <div>
                            <span className=\"font-medium\">Reach:</span>
                            <p className=\"text-muted-foreground\">{robot.reach} mm</p>
                          </div>
                        )}
                      </div>

                      {robot.technical_specifications && Object.keys(robot.technical_specifications).length > 0 && (
                        <div>
                          <h4 className=\"text-md font-semibold mb-4\">Technical Specifications</h4>
                          <div className=\"grid grid-cols-2 gap-4\">
                            {Object.entries(robot.technical_specifications).map(([key, value]) => (
                              <div key={key}>
                                <span className=\"font-medium capitalize\">{key.replace(/_/g, ' ')}:</span>
                                <p className=\"text-muted-foreground\">{String(value)}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* Spare Parts Tab - abbreviated */}
                  <TabsContent value=\"spareparts\" className=\"p-8\">
                    <div className=\"space-y-6\">
                      {loadingSpareParts ? (
                        <Loader2 className=\"w-8 h-8 animate-spin\" />
                      ) : spareParts.length > 0 ? (
                        <div className=\"grid grid-cols-1 md:grid-cols-2 gap-6\">
                          {spareParts.map((part) => (
                            <Card key={part.id}>
                              <CardContent className=\"p-4\">
                                <h4 className=\"font-bold\">{part.name}</h4>
                                <p className=\"text-sm text-muted-foreground\">${part.price}</p>
                                <Button className=\"mt-3 w-full\" size=\"sm\">
                                  Request Quote
                                </Button>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <p className=\"text-muted-foreground\">No spare parts found</p>
                      )}
                    </div>
                  </TabsContent>

                  {/* Services Tab - abbreviated */}
                  <TabsContent value=\"services\" className=\"p-8\">
                    <div className=\"space-y-6\">
                      {loadingServices ? (
                        <Loader2 className=\"w-8 h-8 animate-spin\" />
                      ) : services.length > 0 ? (
                        <div className=\"grid grid-cols-1 gap-4\">
                          {services.map((service) => (
                            <Card key={service.id}>
                              <CardContent className=\"p-4\">
                                <h4 className=\"font-bold\">{service.name}</h4>
                                <p className=\"text-sm text-muted-foreground\">{service.service_type}</p>
                                <Button className=\"mt-3\" size=\"sm\">
                                  Contact Provider
                                </Button>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <p className=\"text-muted-foreground\">No services found</p>
                      )}
                    </div>
                  </TabsContent>

                  {/* Logistics Tab - abbreviated */}
                  <TabsContent value=\"logistics\" className=\"p-8\">
                    <div className=\"space-y-6\">
                      {loadingLogistics ? (
                        <Loader2 className=\"w-8 h-8 animate-spin\" />
                      ) : logisticsServices.length > 0 ? (
                        <div className=\"grid grid-cols-1 gap-4\">
                          {logisticsServices.map((service) => (
                            <Card key={service.id}>
                              <CardContent className=\"p-4\">
                                <h4 className=\"font-bold\">{service.service_name}</h4>
                                <p className=\"text-sm text-muted-foreground\">{service.service_type}</p>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <p className=\"text-muted-foreground\">No logistics services found</p>
                      )}
                    </div>
                  </TabsContent>

                  {/* Financing Tab - abbreviated */}
                  <TabsContent value=\"financing\" className=\"p-8\">
                    <div className=\"space-y-6\">
                      {loadingFinancing ? (
                        <Loader2 className=\"w-8 h-8 animate-spin\" />
                      ) : financingOptions.length > 0 ? (
                        <div className=\"grid grid-cols-1 gap-4\">
                          {financingOptions.map((option) => (
                            <Card key={option.id}>
                              <CardContent className=\"p-4\">
                                <h4 className=\"font-bold\">{option.product_name}</h4>
                                <p className=\"text-sm\">{option.min_interest_rate}% - {option.max_interest_rate}%</p>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <p className=\"text-muted-foreground\">No financing options found</p>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Right Column (1/3) - Sidebar */}
          <div className=\"space-y-6\">
            {/* Contact Card */}
            <Card>
              <CardHeader>
                <CardTitle>Seller Information</CardTitle>
              </CardHeader>
              <CardContent className=\"space-y-4\">
                <div>
                  <p className=\"font-semibold\">{robot.profiles?.company_name || robot.profiles?.full_name}</p>
                  <p className=\"text-sm text-muted-foreground\">{robot.profiles?.location}</p>
                </div>
              </CardContent>
            </Card>

            {/* AI Analysis Card */}
            {user && (
              <Card>
                <CardHeader>
                  <CardTitle className=\"flex items-center gap-2\">
                    <Brain className=\"w-5 h-5\" />
                    AI Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={handleAIAnalysis}
                    disabled={analysisLoading}
                    className=\"w-full\"
                  >
                    {analysisLoading ? <Loader2 className=\"w-4 h-4 animate-spin mr-2\" /> : <Brain className=\"w-4 h-4 mr-2\" />}
                    Generate Analysis
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <Dialog open={showFullscreen} onOpenChange={setShowFullscreen}>
        <DialogContent className=\"max-w-4xl\">
          <img 
            src={robot?.images?.[currentImageIndex]} 
            alt=\"Robot\"
            className=\"w-full h-auto rounded-lg\"
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showQuoteModal} onOpenChange={setShowQuoteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Quote</DialogTitle>
          </DialogHeader>
          <Textarea 
            placeholder=\"Add any requirements...\"
            value={quoteMessage}
            onChange={(e) => setQuoteMessage(e.target.value)}
          />
          <DialogFooter>
            <Button onClick={sendQuoteEmail}>Send Email</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RobotDetails;
