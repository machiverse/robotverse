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
import AIAnalysisResult from "@/components/AIAnalysisResult";
import { Bot, MapPin, Building, Phone, Mail, User, ArrowLeft, Loader2, Wrench, Settings, DollarSign, Brain, Heart, MessageCircle, PhoneCall, X, ChevronLeft, ChevronRight, Maximize2, FileText, Search, CreditCard, Calculator, Plane, Package, Tag, Clock, Shield, Star, Eye, Download, Truck, MessageSquare, Camera, ZoomIn, Share2, Calendar } from "lucide-react";
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
  const { trackButtonClick } = useButtonTracking();
  const { trackItemView } = useUniversalViewTracking();
  
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
  
  // Report generation states
  const [showReportModal, setShowReportModal] = useState(false);
  const [showMarketAnalysis, setShowMarketAnalysis] = useState(false);
  
  // Quote form states
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  
  // SEO hook
  const { seoElements, generateSEO } = useRobotSEO();
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

      // Track comprehensive robot page view with full seller and user information (single entry)
      if (!data.profiles) {
        console.warn('⚠️ No seller profile data found for robot:', data.id);
      } else {
        console.log('✅ Seller profile data loaded:', {
          full_name: data.profiles.full_name,
          company_name: data.profiles.company_name,
          email: data.profiles.email,
          mobile: data.profiles.mobile_number || data.profiles.phone,
          location: data.profiles.location
        });
      }
      
      // Track robot view using universal view tracking system (increments view count)
      await trackItemView('robots', data.id, data);
      
      // Track detailed button interaction for analytics
      await trackButtonClick({
        buttonName: "Robot Page View",
        buttonType: "robot_page_view",
        sellerId: data.seller_id,
        sellerName: data.profiles?.full_name || 'No Name Available',
        sellerCompany: data.profiles?.company_name || 'No Company Available',
        sellerEmail: data.profiles?.email || 'No Email Available',
        sellerMobile: data.profiles?.mobile_number || data.profiles?.phone || 'No Phone Available',
        sellerLocation: data.profiles?.location || data.location || 'No Location Available',
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
          trackingNote: "Robot details page view with comprehensive tracking"
        }
      });
      
      // Generate SEO elements for this robot
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

  // Fetch services sorted by location proximity
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
      
      // Sort by location proximity if user location is available
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

  // Fetch spare parts filtered by robot compatibility
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

      // Filter by robot compatibility if robot is loaded
      if (robot) {
        query = query.or(`compatible_robots.cs.{${robot.model}},compatible_robots.cs.{${robot.brand}},compatible_robots.cs.{${robot.name}}`);
      }

      const { data, error } = await query.limit(12);

      if (error) throw error;
      
      // Sort by location proximity if user location is available
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


  // Fetch logistics services sorted by location proximity
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
      
      // Sort by location proximity if user location is available
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

  // Load related data when component mounts and when robot/user location changes
  useEffect(() => {
    fetchRelatedServices();
    fetchCompatibleSpareParts();
    fetchFinancingOptions();
    fetchLogisticsServices();
  }, [robot, currentUserLocation]);

  // Contact handlers for suppliers
  const handleContactSupplier = async (supplierPhone: string, supplierName: string, itemType: string) => {
    if (!supplierPhone) {
      toast({
        title: "Phone Number Not Available",
        description: `${supplierName}'s phone number is not provided.`,
        variant: "destructive",
      });
      return;
    }

    const phoneNumber = supplierPhone.replace(/\D/g, '');
    window.open(`tel:${phoneNumber}`, '_self');
    toast({
      title: "Calling Supplier",
      description: `Calling ${supplierName} at ${supplierPhone}`,
    });
  };

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

  // Contact seller by phone
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

    // Track button click
    await trackButtonClick({
      buttonName: "Contact Seller Phone",
      buttonType: "contact",
      sellerId: robot?.seller_id,
      sellerName: robot?.profiles?.company_name || robot?.profiles?.full_name,
      itemId: robot?.id,
      itemType: "robot",
      additionalData: {
        contactMethod: "phone",
        robotName: robot?.name,
        robotModel: robot?.model,
        robotPrice: robot?.price,
        sellerPhone: phone
      }
    });

    const phoneNumber = phone.replace(/\D/g, '');
    window.open(`tel:${phoneNumber}`, '_self');
    toast({
      title: "Calling Seller",
      description: `Calling ${robot.profiles.company_name || robot.profiles.full_name} at ${phone}`,
    });
  };

  // WhatsApp handler for latest price inquiry
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

    // Track button click
    await trackButtonClick({
      buttonName: "WhatsApp Latest Price",
      buttonType: "contact",
      sellerId: robot?.seller_id,
      sellerName: robot?.profiles?.company_name || robot?.profiles?.full_name,
      itemId: robot?.id,
      itemType: "robot",
      additionalData: {
        contactMethod: "whatsapp",
        robotName: robot?.name,
        robotModel: robot?.model,
        robotPrice: robot?.price,
        sellerPhone: phone
      }
    });

    const message = `Hi! I'm interested in getting the latest price for:

🤖 *${robot.name}*
📦 Model: ${robot.model}
🏷️ Type: ${robot.robot_type}
📍 Location: ${robot.location}
${robot.price ? `💰 Listed Price: ${robot.currency} ${robot.price}` : '💰 Price: On Request'}

Could you please share the latest price and availability details?

Thank you!`;

    const phoneNumber = phone.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/91${phoneNumber}?text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, '_blank');
    
    toast({
      title: "Opening WhatsApp",
      description: `Redirecting to WhatsApp chat with ${robot.profiles.company_name || robot.profiles.full_name}`,
    });
  };

  // Request quote modal open
  const handleRequestQuote = async () => {
    if (!robot?.profiles?.email) {
      toast({
        title: "Email Not Available",
        description: "Seller's email address is not provided.",
        variant: "destructive",
      });
      return;
    }

    // Track button click
    await trackButtonClick({
      buttonName: "Request Quote",
      buttonType: "contact",
      sellerId: robot?.seller_id,
      sellerName: robot?.profiles?.company_name || robot?.profiles?.full_name,
      itemId: robot?.id,
      itemType: "robot",
      additionalData: {
        contactMethod: "email",
        robotName: robot?.name,
        robotModel: robot?.model,
        robotPrice: robot?.price,
        sellerEmail: robot?.profiles?.email
      }
    });

    setShowQuoteModal(true);
  };

  // Send quote email
  const sendQuoteEmail = async () => {
    if (!robot?.profiles?.email) return;

    // Track quote email send
    await trackButtonClick({
      buttonName: "Send Quote Email",
      buttonType: "contact",
      sellerId: robot?.seller_id,
      sellerName: robot?.profiles?.company_name || robot?.profiles?.full_name,
      itemId: robot?.id,
      itemType: "robot",
      additionalData: {
        contactMethod: "email_send",
        robotName: robot?.name,
        robotModel: robot?.model,
        robotPrice: robot?.price,
        sellerEmail: robot?.profiles?.email,
        messageLength: quoteMessage?.length || 0,
        hasCustomMessage: !!quoteMessage
      }
    });

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

        // Track watchlist removal
        await trackButtonClick({
          buttonName: "Remove from Watchlist",
          buttonType: "wishlist",
          sellerId: robot.seller_id,
          sellerName: robot.profiles?.company_name || robot.profiles?.full_name,
          itemId: robot.id,
          itemType: "robot",
          additionalData: {
            action: "remove",
            robotName: robot.name,
            robotModel: robot.model,
            robotPrice: robot.price
          }
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

        // Track watchlist addition
        await trackButtonClick({
          buttonName: "Add to Watchlist",
          buttonType: "wishlist",
          sellerId: robot.seller_id,
          sellerName: robot.profiles?.company_name || robot.profiles?.full_name,
          itemId: robot.id,
          itemType: "robot",
          additionalData: {
            action: "add",
            robotName: robot.name,
            robotModel: robot.model,
            robotPrice: robot.price
          }
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

    // Track AI analysis request
    await trackButtonClick({
      buttonName: "AI Analysis",
      buttonType: "analysis",
      sellerId: robot?.seller_id,
      sellerName: robot?.profiles?.company_name || robot?.profiles?.full_name,
      itemId: robot?.id,
      itemType: "robot",
      additionalData: {
        robotName: robot?.name,
        robotModel: robot?.model,
        robotType: robot?.robot_type,
        robotPrice: robot?.price,
        analysisRequested: true
      }
    });

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

  // Generate robot report using Gemini AI
  const handleGenerateReport = async () => {
    if (!robot || !user) {
      toast({
        title: "Login Required",
        description: "Please log in to generate robot reports.",
        variant: "destructive",
      });
      return;
    }

    // Simply open the modal - report generation will happen inside the modal
    setShowReportModal(true);
    
    toast({
      title: "Opening Report Generator",
      description: "Preparing comprehensive robot analysis...",
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
            {user && (
              <Button
                onClick={() => setShowReportModal(true)}
                variant="outline"
                size="sm"
                className="shadow-sm"
              >
                <FileText className="w-4 h-4 mr-2" />
                Generate Report
              </Button>
            )}
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
                    className="w-full h-full object-cover object-center transition-transform duration-500 ease-in-out cursor-pointer"
                    style={{
                      imageOrientation: 'from-image',
                    }}
                    onClick={() => setShowFullscreen(true)}
                  />
                  <Button
                    onClick={() => setShowFullscreen(true)}
                    className="absolute top-4 right-4 bg-background/80 hover:bg-background/90 text-foreground p-2 rounded-full shadow-lg backdrop-blur-sm"
                    size="sm"
                    aria-label="View fullscreen"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </Button>
                  {robot.images.length > 1 && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-background/80 hover:bg-background/90 text-foreground rounded-full shadow-lg backdrop-blur-sm"
                        onClick={() => setCurrentImageIndex((prev) => prev === 0 ? robot.images.length - 1 : prev -1 )}
                        aria-label="Previous image"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-background/80 hover:bg-background/90 text-foreground rounded-full shadow-lg backdrop-blur-sm"
                        onClick={() => setCurrentImageIndex((prev) => (prev + 1) % robot.images.length)}
                        aria-label="Next image"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                      <div className="absolute bottom-4 right-4 bg-background/90 text-foreground px-3 py-1 rounded-full shadow-lg backdrop-blur-sm text-sm font-semibold select-none">
                        {currentImageIndex + 1} / {robot.images.length}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center h-full bg-muted/30 rounded-lg">
                  <Bot className="w-20 h-20 text-muted-foreground" />
                </div>
              )}
            </div>
            {/* Thumbnails */}
            {robot.images?.length > 1 && (
                <div className="p-4">
                  <div className="flex space-x-2 overflow-x-auto">
                    {robot.images.map((image, index) => (
                      <button
                        key={index}
                        className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all group ${
                          index === currentImageIndex 
                            ? 'border-primary' 
                            : 'border-muted hover:border-muted-foreground'
                        }`}
                        onClick={() => setCurrentImageIndex(index)}
                      >
                        <img
                          src={image}
                          alt={`${robot.name} ${index + 1}`}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                          style={{
                            imageOrientation: 'from-image'
                          }}
                        />
                    </button>
                  ))}
                 </div>
               </div>
            )}
          </div>

          {/* Robot information panel */}
          <div className="p-6 bg-card rounded-lg shadow-inner text-gray-900 flex flex-col justify-between">
            <div>
              {/*} <h1 className="text-2xl font-bold text-primary leading-tight">{robot?.name}</h1>*/}
              <div className="flex flex-wrap gap-2 mb-6">
                
               <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-2xl font-bold text-primary leading-tight">{robot.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1 font-medium">{robot.robot_type}</p>
                    <ViewCountDisplay targetType="robots" targetId={robot.id} className="mt-2" />
                  </div>
                  <Badge variant="outline" className="text-green-600 border-green-600 bg-green-50 font-semibold">
                    {robot.availability}
                  </Badge>
                </div>
              </CardHeader>
               </Card>

              <div className="space-y-6">
                <div className="flex items-baseline gap-3">
                  <h1 className="text-2xl font-bold text-primary leading-tight">{formatPrice(robot?.price ?? 0, robot?.currency ?? '')}</h1>
                  {/*<span className="text-3xl font-semibold text-blue-900">{formatPrice(robot?.price ?? 0, robot?.currency ?? '')}</span>*/}
                  {outsideIndia && (
                    <Button variant="outline" size="sm" className="text-orange-700 border-orange-400 hover:bg-orange-100" onClick={handleImportQuote}>Import Quote</Button>
                  )}
                </div>

                <div className="bg-muted/20 p-5 rounded-lg border border-border text-gray-800 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex items-center gap-3">
                    <MapPin className="w-6 h-6 text-primary" />
                    <div>
                      <p className="uppercase text-xs font-semibold tracking-wider text-muted-foreground">Location</p>
                      <p className="font-semibold text-foreground">{robot?.location ?? 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
      <Calendar className="w-6 h-6 text-primary" />
      <div>
        <p className="uppercase text-xs font-semibold tracking-wider text-muted-foreground">Year</p> {/* changed label for clarity */}
        <p className="font-semibold text-foreground">{robot.year_manufactured}</p>
      </div>
    </div>

                  {robot?.condition && (
                    <div className="flex items-center gap-3">
                      <Settings className="w-6 h-6 text-violet-600" />
                      <div>
                        <p className="uppercase text-xs font-semibold tracking-wider text-muted-foreground">Condition</p>
                        <p className="font-semibold text-foreground">{robot.condition.replace(/_/g, ' ')}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Chat with Seller Section */}
            <div className="mt-6 flex flex-col space-y-3">
              {user && user.id === robot.seller_id ? (
                <Button
                  disabled
                  variant="outline"
                  className="w-full"
                >
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
                  className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-lg"
                />
              )}
              
              {user && user.id !== robot.seller_id && (
                <Button
                  onClick={handleAddToWatchlist}
                  variant="outline"
                  disabled={addingToWatchlist}
                  className="w-full"
                >
                  <Heart className={`h-4 w-4 mr-2 ${isInWatchlist ? 'fill-current text-red-500' : ''}`} />
                  {isInWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
                </Button>
              )}
              
              {!user && (
                <div className="mt-4 p-4 rounded-lg border border-border bg-card/70 text-center text-muted-foreground">
                  Please{' '}
                  <Button variant="link" className="p-0 text-primary underline" onClick={() => navigate('/auth')}>
                    log in
                  </Button>{' '}
                  to chat with the seller.
                </div>
              )}
            </div>
           </div>
         </div>
        </div>
       </CardContent>
     </Card>

            {/* Quick Actions */}
            {user && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleAIAnalysis}
                      className="text-purple-600 border-purple-200 hover:bg-purple-100/50"
                    >
                      <Brain className="w-4 h-4 mr-2" />
                      AI Analysis
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleGenerateReport}
                      className="text-orange-600 border-orange-200 hover:bg-orange-100/50"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Get Report
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleCheckLoan}
                      className="text-green-600 border-green-200 hover:bg-green-100/50"
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Check Loan
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleFindSimilar}
                      className="text-blue-600 border-blue-200 hover:bg-blue-100/50"
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
                  
                  {/* Overview */}
                  <TabsContent value="overview" className="p-6">
                    <div className="space-y-6">
                      {/* About This Robot - Enhanced Structure */}
                      <div className="space-y-6">
                        <div className="flex items-center gap-2 mb-4">
                          <Bot className="w-5 h-5 text-primary" />
                          <h3 className="text-xl font-semibold">About This Robot</h3>
                        </div>
                        
                        {/* Robot Description */}
                        {robot.description && (
                          <div className="bg-muted/30 rounded-lg p-4 border">
                            <p className="text-sm leading-relaxed text-muted-foreground">
                              {robot.description}
                            </p>
                          </div>
                        )}
                        
                        {/* Key Highlights */}
                        <div className="grid md:grid-cols-2 gap-6">
                          {/* Technical Overview */}
                          <div className="space-y-3">
                            <h4 className="flex items-center gap-2 font-semibold text-base">
                              <Settings className="w-4 h-4 text-primary" />
                              Technical Overview
                            </h4>
                            <div className="space-y-2">
                              {robot.brand && (
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="w-2 h-2 bg-primary rounded-full"></span>
                                  <span className="font-medium">Brand:</span>
                                  <span className="text-muted-foreground">{robot.brand}</span>
                                </div>
                              )}
                              {robot.model && (
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="w-2 h-2 bg-primary rounded-full"></span>
                                  <span className="font-medium">Model:</span>
                                  <span className="text-muted-foreground">{robot.model}</span>
                                </div>
                              )}
                              {robot.payload_capacity && (
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="w-2 h-2 bg-primary rounded-full"></span>
                                  <span className="font-medium">Payload Capacity:</span>
                                  <span className="text-muted-foreground">{robot.payload_capacity} kg</span>
                                </div>
                              )}
                              {robot.reach && (
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="w-2 h-2 bg-primary rounded-full"></span>
                                  <span className="font-medium">Reach:</span>
                                  <span className="text-muted-foreground">{robot.reach} mm</span>
                                </div>
                              )}
                              {robot.controller_type && (
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="w-2 h-2 bg-primary rounded-full"></span>
                                  <span className="font-medium">Controller:</span>
                                  <span className="text-muted-foreground">{robot.controller_type}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Applications & Features */}
                          <div className="space-y-3">
                            <h4 className="flex items-center gap-2 font-semibold text-base">
                              <Wrench className="w-4 h-4 text-primary" />
                              Key Features
                            </h4>
                            <div className="space-y-2">
                              {robot.year_manufactured && (
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="w-2 h-2 bg-primary rounded-full"></span>
                                  <span className="font-medium">Year:</span>
                                  <span className="text-muted-foreground">{robot.year_manufactured}</span>
                                </div>
                              )}
                              {robot.condition && (
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="w-2 h-2 bg-primary rounded-full"></span>
                                  <span className="font-medium">Condition:</span>
                                  <span className="text-muted-foreground capitalize">{robot.condition.replace('_', ' ')}</span>
                                </div>
                              )}
                              {robot.operating_environment && (
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="w-2 h-2 bg-primary rounded-full"></span>
                                  <span className="font-medium">Environment:</span>
                                  <span className="text-muted-foreground">{robot.operating_environment}</span>
                                </div>
                              )}
                              {robot.warranty_info && (
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="w-2 h-2 bg-primary rounded-full"></span>
                                  <span className="font-medium">Warranty:</span>
                                  <span className="text-muted-foreground">{robot.warranty_info}</span>
                                </div>
                              )}
                              {robot.repeatability && (
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="w-2 h-2 bg-primary rounded-full"></span>
                                  <span className="font-medium">Repeatability:</span>
                                  <span className="text-muted-foreground">±{robot.repeatability} mm</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Applications */}
                        {robot.applications && robot.applications.length > 0 && (
                          <div className="space-y-3">
                            <h4 className="flex items-center gap-2 font-semibold text-base">
                              <Tag className="w-4 h-4 text-primary" />
                              Suitable Applications
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {robot.applications.map((app: string, index: number) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {app}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Certification Standards */}
                        {robot.certification_standards && robot.certification_standards.length > 0 && (
                          <div className="space-y-3">
                            <h4 className="flex items-center gap-2 font-semibold text-base">
                              <Shield className="w-4 h-4 text-primary" />
                              Certifications
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {robot.certification_standards.map((cert: string, index: number) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {cert}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* SEO Content Block */}
                        {seoElements && (
                          <div className="bg-gradient-to-r from-muted/50 to-muted/30 rounded-lg p-4 border">
                            <div className="prose prose-sm max-w-none text-muted-foreground">
                              {seoElements.seoContentBlock.split('\n\n').map((paragraph: string, index: number) => (
                                <p key={index} className="mb-3 last:mb-0 leading-relaxed text-sm">
                                  {paragraph.trim()}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}
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
                          <Card className="border-orange-200 bg-orange-100/30">
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
                  <TabsContent value="services" className="p-8 bg-gradient-to-br from-card/30 to-card/60">
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-2xl font-bold text-card-foreground tracking-tight">Available Services</h3>
                          <p className="text-muted-foreground font-medium mt-1">Professional services for your robot</p>
                        </div>
                        <Button variant="outline" onClick={() => navigate('/services')} className="font-semibold shadow-sm">
                          <Search className="w-4 h-4 mr-2" />
                          Browse All Services
                        </Button>
                      </div>
                      
                      {loadingServices ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {[...Array(4)].map((_, i) => (
                            <div key={i} className="animate-pulse">
                              <div className="h-40 bg-muted/40 rounded-xl shadow-sm"></div>
                            </div>
                          ))}
                        </div>
                      ) : services.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {services.map((service) => (
                            <Card key={service.id} className="hover:shadow-lg hover:scale-[1.02] transition-all duration-300 border-border/50 bg-card/80 backdrop-blur-sm">
                              <CardContent className="p-5">
                                <div className="space-y-4">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <h4 className="font-bold text-lg text-card-foreground leading-tight">{service.name}</h4>
                                      <p className="text-sm text-muted-foreground font-semibold mt-1">{service.service_type}</p>
                                    </div>
                                    <Badge variant="secondary" className="text-sm font-semibold whitespace-nowrap ml-3">{service.price_range || 'Contact for Quote'}</Badge>
                                  </div>
                                  
                                  <p className="text-sm line-clamp-2 text-muted-foreground font-medium leading-relaxed">{service.description}</p>
                                  
                                  {service.specializations && service.specializations.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                      {service.specializations.slice(0, 3).map((spec: string, idx: number) => (
                                        <Badge key={idx} variant="outline" className="text-sm font-medium">
                                          {spec}
                                        </Badge>
                                      ))}
                                      {service.specializations.length > 3 && (
                                        <Badge variant="outline" className="text-sm font-medium">
                                          +{service.specializations.length - 3} more
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                  
                                   <div className="flex items-center justify-between text-sm">
                                     <div className="flex items-center text-muted-foreground font-medium">
                                       <MapPin className="w-4 h-4 mr-2" />
                                       {service.location || service.profiles?.location || 'Location not specified'}
                                     </div>
                                     <div className="flex gap-2">
                                       <Button 
                                         size="sm" 
                                         className="bg-blue-600 hover:bg-blue-700 font-semibold"
                                         onClick={() => handleGetQuote(service, service, 'service')}
                                         disabled={!user}
                                       >
                                         <Mail className="w-4 h-4 mr-2" />
                                         Get Quote
                                       </Button>
                                       <Button 
                                         size="sm" 
                                         variant="outline"
                                         className="font-semibold"
                                         onClick={() => handleContactSupplier(service.profiles?.phone || service.profiles?.mobile_number, service.profiles?.company_name || service.profiles?.full_name, 'Service')}
                                         disabled={!user || !service.profiles?.phone}
                                       >
                                         <PhoneCall className="w-4 h-4 mr-2" />
                                         Call
                                       </Button>
                                     </div>
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
                  <TabsContent value="spareparts" className="p-8 bg-gradient-to-br from-card/30 to-card/60">
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-2xl font-bold text-card-foreground tracking-tight">Compatible Spare Parts</h3>
                          <p className="text-muted-foreground font-medium mt-1">High-quality parts for your robot</p>
                        </div>
                        <Button variant="outline" onClick={() => navigate('/parts')} className="font-semibold shadow-sm">
                          <Search className="w-4 h-4 mr-2" />
                          Browse All Parts
                        </Button>
                      </div>
                      
                      {loadingSpareParts ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {[...Array(6)].map((_, i) => (
                            <div key={i} className="animate-pulse">
                              <div className="h-48 bg-muted/40 rounded-xl shadow-sm"></div>
                            </div>
                          ))}
                        </div>
                      ) : spareParts.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {spareParts.map((part) => (
                            <Card key={part.id} className="hover:shadow-lg hover:scale-[1.02] transition-all duration-300 border-border/50 bg-card/80 backdrop-blur-sm">
                              <CardContent className="p-5">
                                <div className="space-y-4">
                                  {part.images && part.images.length > 0 && (
                                    <div className="aspect-square bg-muted/30 rounded-xl overflow-hidden shadow-inner">
                                       <img 
                                         src={part.images[0]} 
                                         alt={part.name}
                                         className="w-full h-full object-cover rounded-xl transition-transform duration-300 hover:scale-105"
                                       />
                                    </div>
                                  )}
                                  
                                  <div className="space-y-3">
                                    <h4 className="font-bold line-clamp-1 text-xl text-card-foreground leading-tight">{part.name}</h4>
                                    {part.part_number && (
                                      <p className="text-sm text-muted-foreground font-semibold">Part #: {part.part_number}</p>
                                    )}
                                    
                                    <div className="flex items-center justify-between">
                                      <div className="text-sm">
                                        {part.price ? (
                                          <span className="font-bold text-green-600 text-xl">
                                            {part.currency === 'USD' ? '$' : part.currency === 'EUR' ? '€' : '₹'}
                                            {part.price.toLocaleString()}
                                          </span>
                                        ) : (
                                          <span className="text-muted-foreground font-medium">Price on Request</span>
                                        )}
                                      </div>
                                      <div className="flex items-center text-sm text-muted-foreground font-medium">
                                        <Package className="w-4 h-4 mr-1" />
                                        Qty: {part.quantity}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {part.category_tags && part.category_tags.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                      {part.category_tags.slice(0, 2).map((tag: string, idx: number) => (
                                        <Badge key={idx} variant="outline" className="text-sm font-medium">
                                          <Tag className="w-3 h-3 mr-1" />
                                          {tag}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                  
                                  <div className="flex items-center text-sm text-muted-foreground border-t pt-3">
                                    <MapPin className="w-4 h-4 mr-2" />
                                    <span className="flex-1">{part.profiles?.location || part.location || 'Location not specified'}</span>
                                  </div>
                                  
                                  {/* Professional Action Buttons */}
                                  <div className="space-y-2 pt-2">
                                    <Button 
                                      className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-medium py-2.5"
                                      onClick={() => handleGetQuote(part, part, 'spare_part')}
                                      disabled={!user}
                                    >
                                      <Mail className="w-4 h-4 mr-2" />
                                      Request Quote & Pricing
                                    </Button>
                                    <Button 
                                      variant="outline"
                                      className="w-full border-green-600 text-green-700 hover:bg-green-50 font-medium py-2.5"
                                      onClick={() => handleContactSupplier(part.profiles?.phone || part.profiles?.mobile_number, part.profiles?.company_name || part.profiles?.full_name, 'Spare Part')}
                                      disabled={!user || !part.profiles?.phone}
                                    >
                                      <PhoneCall className="w-4 h-4 mr-2" />
                                      Contact Supplier
                                    </Button>
                                    {!user && (
                                      <p className="text-xs text-center text-muted-foreground mt-1">
                                        Please login to contact suppliers
                                      </p>
                                    )}
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
                  <TabsContent value="financing" className="p-8 bg-gradient-to-br from-card/30 to-card/60">
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-2xl font-bold text-card-foreground tracking-tight">Financing Options</h3>
                          <p className="text-muted-foreground font-medium mt-1">Flexible payment plans and loan solutions</p>
                        </div>
                        <Button variant="outline" onClick={() => setShowEmiCalculator(true)} className="font-semibold shadow-sm">
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
                            <Card key={option.id} className="border-l-4 border-l-green-500 hover:shadow-xl transition-all duration-300 bg-card/90 backdrop-blur-sm">
                              <CardContent className="p-6">
                                <div className="space-y-5">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <h4 className="font-bold text-xl text-card-foreground leading-tight">
                                        {option.profiles?.company_name || option.profiles?.full_name}
                                      </h4>
                                      <p className="text-base text-muted-foreground font-semibold mt-1">{option.product_name}</p>
                                      <div className="flex flex-wrap gap-2 mt-2">
                                        {option.loan_type?.map((type: string, idx: number) => (
                                          <Badge key={idx} variant="secondary" className="text-sm font-semibold">
                                            {type}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <Badge variant="secondary" className="bg-green-50 text-green-700 mb-2 font-bold text-base px-3 py-1">
                                        {option.min_interest_rate}% - {option.max_interest_rate}%
                                      </Badge>
                                      {option.quick_approval && (
                                        <div>
                                          <Badge variant="outline" className="text-sm font-semibold">
                                            <Clock className="w-3 h-3 mr-1" />
                                            Quick Approval
                                          </Badge>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-base">
                                    <div>
                                      <p className="text-muted-foreground font-semibold mb-1">Loan Amount</p>
                                      <p className="font-bold text-card-foreground">
                                        ₹{(option.min_amount || 0).toLocaleString()} - ₹{option.max_amount.toLocaleString()}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground font-semibold mb-1">Tenure</p>
                                      <p className="font-bold text-card-foreground">
                                        {option.min_tenure_months} - {option.max_tenure_months} months
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground font-semibold mb-1">Processing Fee</p>
                                      <p className="font-bold text-card-foreground">{option.processing_fee_percentage}%</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground font-semibold mb-1">Interest Rate</p>
                                      <p className="font-bold text-card-foreground">
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
                                  className="border-blue-300 font-bold text-blue-700 hover:bg-blue-100"
                                >
                                  <Calculator className="w-4 h-4 mr-1" />
                                  Full Calculator
                                </Button>
                              </div>
                              <p className="text-sm font-bold text-blue-700 font-bold">
                                For equipment price of <span className="font-bold">{formatPrice(robot.price, robot.currency)}</span>
                              </p>
                              <div className="grid grid-cols-3 gap-6">
  {/* 1 Year Plan */}
  <div className="text-center p-5 bg-white rounded-xl border border-blue-200 shadow-sm flex flex-col items-center justify-center">
    <p className="text-sm text-blue-600 font-semibold mb-2">1 Year Plan</p>
    <p className="text-2xl font-extrabold text-blue-900 mb-1">
      ₹{Math.round(robot.price * 0.09).toLocaleString()}
      <span className="text-base font-normal text-blue-700">/month</span>
    </p>
    <p className="text-xs text-gray-500 mb-2">Total: ₹{Math.round(robot.price * 0.09 * 12).toLocaleString()} for 12 months</p>
  </div>

  {/* 3 Year Plan */}
  <div className="text-center p-5 bg-white rounded-xl border border-blue-200 shadow-lg flex flex-col items-center justify-center relative">
    <p className="text-sm text-blue-600 font-semibold mb-2">3 Year Plan</p>
    <p className="text-2xl font-extrabold text-blue-900 mb-1">
      ₹{Math.round(robot.price * 0.032).toLocaleString()}
      <span className="text-base font-normal text-blue-700">/month</span>
    </p>
    <p className="text-xs text-gray-500 mb-2">Total: ₹{Math.round(robot.price * 0.032 * 36).toLocaleString()} for 36 months</p>
    {/*<span className="absolute top-4 right-4 bg-green-100 text-green-700 text-[10px] font-bold px-3 py-1 rounded-full shadow">
      SAVE {((1 - (0.032 * 36)/(0.09 * 12)) * 100).toFixed(0)}%
    </span>*/}
  </div>

  {/* 5 Year Plan */}
  <div className="text-center p-5 bg-white rounded-xl border border-blue-200 shadow-lg flex flex-col items-center justify-center relative">
    <p className="text-sm text-blue-600 font-semibold mb-2">5 Year Plan</p>
    <p className="text-2xl font-extrabold text-blue-900 mb-1">
      ₹{Math.round(robot.price * 0.021).toLocaleString()}
      <span className="text-base font-normal text-blue-700">/month</span>
    </p>
    <p className="text-xs text-gray-500 mb-2">Total: ₹{Math.round(robot.price * 0.021 * 60).toLocaleString()} for 60 months</p>
    {/*<span className="absolute top-4 right-4 bg-green-100 text-green-700 text-[10px] font-bold px-3 py-1 rounded-full shadow">
      SAVE {((1 - (0.021 * 60)/(0.09 * 12)) * 100).toFixed(0)}%
    </span>*/}
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
                  <TabsContent value="logistics" className="p-8 bg-gradient-to-br from-card/30 to-card/60">
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-2xl font-bold text-card-foreground flex items-center tracking-tight">
                            <Package className="w-7 h-7 mr-3 text-orange-600" />
                            Logistics & Shipping Partners
                          </h3>
                          <p className="text-muted-foreground font-medium mt-1 ml-10">Professional shipping and delivery services</p>
                        </div>
                        <Badge variant="outline" className="text-orange-600 border-orange-300 font-semibold text-sm">
                          {logisticsServices.length} Providers Available
                        </Badge>
                      </div>
                      
                      {loadingLogistics ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="w-8 h-8 animate-spin mr-3 text-primary" />
                          <span className="text-lg font-semibold text-card-foreground">Loading logistics services...</span>
                        </div>
                      ) : logisticsServices.length > 0 ? (
                        <div className="grid gap-4">
                          {logisticsServices.map((service) => (
                            <Card key={service.id} className="border-l-4 border-l-orange-500 hover:shadow-xl transition-all duration-300 bg-card/90 backdrop-blur-sm">
                              <CardContent className="p-6">
                                <div className="space-y-5">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <h4 className="font-bold text-xl text-card-foreground leading-tight">
                                        {service.profiles?.company_name || service.profiles?.full_name || 'Logistics Provider'}
                                      </h4>
                                      <p className="text-base text-muted-foreground font-semibold mt-1">{service.service_name}</p>
                                      <div className="flex flex-wrap gap-2 mt-2">
                                        <Badge variant="secondary" className="text-sm font-semibold">{service.service_type}</Badge>
                                        {service.tracking_available && (
                                          <Badge variant="secondary" className="text-sm font-semibold">GPS Tracking</Badge>
                                        )}
                                        {service.insurance_included && (
                                          <Badge variant="secondary" className="text-sm font-semibold">Insurance Included</Badge>
                                        )}
                                        {service.emergency_delivery && (
                                          <Badge variant="secondary" className="text-sm font-semibold">Emergency Delivery</Badge>
                                        )}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <Badge variant="secondary" className="bg-orange-50 text-orange-700 mb-2 font-bold text-base px-3 py-1">
                                        ₹{service.base_price || 0}/base + ₹{service.price_per_kg || 0}/kg
                                      </Badge>
                                      <div>
                                        <Badge variant="outline" className="text-sm font-semibold">
                                          <Clock className="w-3 h-3 mr-1" />
                                          {service.delivery_time_hours || 24}h delivery
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-base">
                                    <div>
                                      <p className="text-muted-foreground font-semibold mb-1">Coverage</p>
                                      <p className="font-bold text-card-foreground">
                                        {service.coverage_areas?.length > 0 ? 
                                          `${service.coverage_areas.slice(0, 2).join(', ')}${service.coverage_areas.length > 2 ? '...' : ''}` : 
                                          service.is_international ? 'International' : 'Domestic'
                                        }
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground font-semibold mb-1">Max Weight</p>
                                      <p className="font-bold text-card-foreground">{service.max_weight_kg || 'No limit'} kg</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground font-semibold mb-1">Transport</p>
                                      <p className="font-bold text-card-foreground">
                                        {service.transport_modes?.length > 0 ? 
                                          service.transport_modes.slice(0, 2).join(', ') : 
                                          'Various'
                                        }
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground font-semibold mb-1">Special</p>
                                      <p className="font-bold text-card-foreground">
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
                                       onClick={() => handleGetQuote(service.profiles, service, 'logistics')}
                                       disabled={!user}
                                     >
                                       <Truck className="w-4 h-4 mr-2" />
                                       Get Quote
                                     </Button>
                                     <Button 
                                       variant="outline"
                                       onClick={() => handleContactSupplier(service.profiles?.phone || service.profiles?.mobile_number, service.profiles?.company_name || service.profiles?.full_name, 'Logistics')}
                                       disabled={!user || !service.profiles?.phone}
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
                           <Truck className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                           <h3 className="text-lg font-semibold mb-2">No Logistics Services Available</h3>
                           <p className="text-muted-foreground mb-4">No logistics providers are currently available for your location.</p>
                           <Button variant="outline">
                             <Truck className="w-4 h-4 mr-2" />
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

          {/* Sidebar - Removed as per requirements */}
          <div className="space-y-6">
            {/* Sidebar removed to hide seller information */}
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

      {/* Quote Request and Import modals removed - use chat instead */}

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

      {/* Robot Report Modal */}
      <ProfessionalRobotReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        robotData={robot}
      />

      {/* Comprehensive AI Market Analysis Modal */}
      <ComprehensiveAIMarketAnalysis
        isOpen={showMarketAnalysis}
        onClose={() => setShowMarketAnalysis(false)}
        robotData={robot}
      />

      {/* Supplier Quote Form Modal */}
      {showQuoteForm && selectedSupplier && selectedItem && (
        <SupplierQuoteForm
          onClose={() => {
            setShowQuoteForm(false);
            setSelectedSupplier(null);
            setSelectedItem(null);
          }}
          supplierInfo={selectedSupplier}
          itemInfo={selectedItem}
          robotInfo={robot ? {
            name: robot.name,
            model: robot.model,
            id: robot.id
          } : undefined}
        />
      )}
    </div>
  );
};

export default RobotDetails;
