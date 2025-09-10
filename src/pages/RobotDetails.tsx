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
import RobotReportModal from "@/components/RobotReportModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";
import { useGlobalViewTracking } from "@/hooks/useGlobalViewTracking";
import { useButtonTracking } from "@/hooks/useButtonTracking";
import { type RobotSEOData } from "@/utils/seo";
import { useRobotSEO } from "@/hooks/useRobotSEO";
import { formatCurrency } from "@/utils/currency";

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
  'uttarakhand', 'west bengal'
];

const RobotDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const trackButtonClick = useButtonTracking();
  
  const [robot, setRobot] = useState<Robot | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showEmiCalculator, setShowEmiCalculator] = useState(false);
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [showServiceQuote, setShowServiceQuote] = useState(false);
  const [showRobotReport, setShowRobotReport] = useState(false);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [isAILoading, setIsAILoading] = useState(false);
  const [aiAnalysis, setAIAnalysis] = useState<AIAnalysisResult | null>(null);
  const [showLogisticsQuote, setShowLogisticsQuote] = useState(false);
  const [isLoadingLogistics, setIsLoadingLogistics] = useState(false);
  const [logisticsProviders, setLogisticsProviders] = useState<any[]>([]);
  const [financeProviders, setFinanceProviders] = useState<any[]>([]);
  const [spareParts, setSpareParts] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [pageViews, setPageViews] = useState(0);
  const [uniqueViews, setUniqueViews] = useState(0);

  // Use the global view tracking hook
  useGlobalViewTracking();

  useEffect(() => {
    if (id) {
      fetchRobot();
    }
  }, [id]);

  const fetchRobot = async () => {
    try {
      const { data, error } = await supabase
        .from('robots')
        .select(`
          *,
          profiles!inner(
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

      // Transform the data to match our Robot interface
      const robotData = {
        ...data,
        technical_specifications: (data.technical_specifications as Record<string, any>) || {},
        category_tags: (data.category_tags as string[]) || [],
        applications: (data.applications as string[]) || [],
        included_accessories: (data.included_accessories as string[]) || [],
        certification_standards: (data.certification_standards as string[]) || [],
        images: (data.images as string[]) || []
      };

      setRobot(robotData as Robot);
    } catch (error) {
      console.error('Error fetching robot:', error);
      toast({
        title: "Error",
        description: "Failed to load robot details.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddToWishlist = async () => {
    if (!user) {
      setShowLogin(true);
      return;
    }

    try {
      if (isInWishlist) {
        setIsInWishlist(false);
        toast({
          title: "Removed from wishlist",
          description: "Robot removed from your wishlist.",
        });
      } else {
        setIsInWishlist(true);
        toast({
          title: "Added to wishlist",
          description: "Robot added to your wishlist.",
        });
      }
    } catch (error) {
      console.error('Error updating wishlist:', error);
      toast({
        title: "Error",
        description: "Failed to update wishlist.",
        variant: "destructive",
      });
    }
  };

  const handleAIAnalysis = async () => {
    if (!user) {
      setShowLogin(true);
      return;
    }

    setIsAILoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('roboverse-ai-analyze', {
        body: {
          robotData: robot,
          userLocation: user?.user_metadata?.location || 'India'
        }
      });

      if (error) throw error;
      setAIAnalysis(data);
    } catch (error) {
      console.error('Error getting AI analysis:', error);
      toast({
        title: "Analysis Error",
        description: "Failed to get AI analysis. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAILoading(false);
    }
  };

  const nextImage = () => {
    if (robot?.images?.length) {
      setCurrentImageIndex((prev) => 
        prev === robot.images.length - 1 ? 0 : prev + 1
      );
    }
  };

  const prevImage = () => {
    if (robot?.images?.length) {
      setCurrentImageIndex((prev) => 
        prev === 0 ? robot.images.length - 1 : prev - 1
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/20">
        <EnhancedHeader />
        <div className="container mx-auto px-4 py-8 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading robot details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!robot) {
    return (
      <div className="min-h-screen bg-muted/20">
        <EnhancedHeader />
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Robot not found</h1>
          <Button onClick={() => navigate('/robots')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Robots
          </Button>
        </div>
      </div>
    );
  }

  const currentImage = robot.images?.[currentImageIndex];

  return (
    <div className="min-h-screen bg-muted/20">
      <EnhancedHeader />
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header Navigation */}
        <div className="flex items-center justify-between mb-6">
          <Button 
            variant="outline" 
            onClick={() => navigate('/robots')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Robots
          </Button>

          <div className="flex items-center space-x-4">
            <div className="text-sm text-muted-foreground">
              Views: {pageViews}
            </div>
            {user && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRobotReport(true)}
              >
                <FileText className="h-4 w-4 mr-2" />
                Generate Report
              </Button>
            )}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Image Gallery */}
          <div className="lg:col-span-2">
            <Card className="overflow-hidden shadow-lg">
              <div className="relative">
                <div 
                  className="aspect-[16/10] bg-muted/20 flex items-center justify-center cursor-pointer group relative overflow-hidden"
                  onClick={() => setShowFullscreen(true)}
                >
                  {currentImage ? (
                    <img
                      src={currentImage}
                      alt={robot.name}
                      className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-110"
                      style={{
                        imageOrientation: 'from-image'
                      }}
                    />
                  ) : (
                    <div className="text-center">
                      <Camera className="h-16 w-16 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">No image available</p>
                    </div>
                  )}
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <ZoomIn className="h-8 w-8 text-white" />
                  </div>
                </div>

                {/* Navigation Arrows */}
                {robot.images?.length > 1 && (
                  <>
                    <Button
                      variant="outline"
                      size="icon"
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        prevImage();
                      }}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        nextImage();
                      }}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </>
                )}

                {/* Fullscreen Button */}
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute top-4 right-4 bg-white/90 hover:bg-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowFullscreen(true);
                  }}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>

                {/* Image Counter */}
                {robot.images?.length > 1 && (
                  <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1 rounded-md text-sm">
                    {currentImageIndex + 1} / {robot.images.length}
                  </div>
                )}
              </div>

              {/* Thumbnail Navigation */}
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
            </Card>
          </div>

          {/* Robot Information */}
          <div className="space-y-6">
            {/* Basic Info Card */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-2xl font-bold text-primary leading-tight">{robot.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1 font-medium">{robot.robot_type}</p>
                  </div>
                  <Badge variant="outline" className="text-green-600 border-green-600 bg-green-50 font-semibold">
                    {robot.availability}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-muted/30 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-bold text-primary">
                      {formatCurrency(robot.price, robot.currency)}
                    </span>
                    <div className="flex items-center space-x-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span className="font-medium">{robot.location}</span>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-card p-3 rounded-lg border">
                    <div className="flex items-center space-x-2">
                      <Settings className="h-4 w-4 text-primary" />
                      <span className="text-sm text-muted-foreground">Condition:</span>
                    </div>
                    <span className="font-semibold text-foreground">{robot.condition}</span>
                  </div>
                  <div className="bg-card p-3 rounded-lg border">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span className="text-sm text-muted-foreground">Year:</span>
                    </div>
                    <span className="font-semibold text-foreground">{robot.year_manufactured}</span>
                  </div>
                </div>

                {/* Contact Actions */}
                <div className="pt-4 border-t space-y-3">
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700 text-white" 
                    size="lg"
                    onClick={() => setShowLogin(true)}
                  >
                    <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.251"/>
                    </svg>
                    Ask Latest Price via WhatsApp
                  </Button>
                  
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={handleAddToWishlist}
                    >
                      <Heart className={`h-4 w-4 mr-2 ${isInWishlist ? 'fill-current text-red-500' : ''}`} />
                      {isInWishlist ? 'Saved' : 'Save'}
                    </Button>
                    <Button variant="outline" className="flex-1">
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </Button>
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
                <CardContent className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setShowEmiCalculator(true)}
                  >
                    <Calculator className="h-4 w-4 mr-2" />
                    EMI Calculator
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setShowLoanModal(true)}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Apply for Loan
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setShowServiceQuote(true)}
                  >
                    <Wrench className="h-4 w-4 mr-2" />
                    Request Service Quote
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Login Prompt for Non-Users */}
            {!user && (
              <Card className="bg-muted/20 border-primary/20">
                <CardContent className="p-6 text-center">
                  <User className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h3 className="font-semibold text-primary mb-2">Sign in for More Features</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Access loan calculators, service quotes, and contact seller directly
                  </p>
                  <Button onClick={() => setShowLogin(true)} className="w-full">
                    Sign In / Register
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Description and Details */}
        <div className="mt-8">
          <Tabs defaultValue="description" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="description">Description</TabsTrigger>
              <TabsTrigger value="specifications">Specifications</TabsTrigger>
              <TabsTrigger value="seller">Seller Info</TabsTrigger>
              <TabsTrigger value="additional">Additional Info</TabsTrigger>
            </TabsList>

            <TabsContent value="description" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Product Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {robot.description || 'No description available.'}
                  </p>
                  
                  {/* Applications */}
                  {robot.applications && robot.applications.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-semibold mb-3">Applications</h4>
                      <div className="flex flex-wrap gap-2">
                        {robot.applications.map((app, index) => (
                          <Badge key={index} variant="secondary">
                            {app}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Included Accessories */}
                  {robot.included_accessories && robot.included_accessories.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-semibold mb-3">Included Accessories</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {robot.included_accessories.map((accessory, index) => (
                          <li key={index} className="text-muted-foreground">{accessory}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="specifications" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Technical Specifications</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Basic Specifications */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-primary">Basic Information</h4>
                      <div className="space-y-3">
                        {robot.brand && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Brand:</span>
                            <span className="font-medium">{robot.brand}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Model:</span>
                          <span className="font-medium">{robot.model}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Type:</span>
                          <span className="font-medium">{robot.robot_type}</span>
                        </div>
                        {robot.year_manufactured && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Year:</span>
                            <span className="font-medium">{robot.year_manufactured}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Condition:</span>
                          <span className="font-medium">{robot.condition}</span>
                        </div>
                      </div>
                    </div>

                    {/* Performance Specifications */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-primary">Performance</h4>
                      <div className="space-y-3">
                        {robot.payload_capacity && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Payload:</span>
                            <span className="font-medium">{robot.payload_capacity} kg</span>
                          </div>
                        )}
                        {robot.reach && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Reach:</span>
                            <span className="font-medium">{robot.reach} mm</span>
                          </div>
                        )}
                        {robot.repeatability && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Repeatability:</span>
                            <span className="font-medium">±{robot.repeatability} mm</span>
                          </div>
                        )}
                        {robot.power_consumption && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Power:</span>
                            <span className="font-medium">{robot.power_consumption} kW</span>
                          </div>
                        )}
                        {robot.controller_type && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Controller:</span>
                            <span className="font-medium">{robot.controller_type}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Custom Fields */}
                  {customFields.length > 0 && (
                    <div className="mt-6 pt-6 border-t">
                      <h4 className="font-semibold text-primary mb-4">Additional Specifications</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {customFields.map((field) => (
                          <div key={field.id} className="flex justify-between">
                            <span className="text-muted-foreground">{field.field_name}:</span>
                            <span className="font-medium">{field.field_value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Technical Specifications from JSON */}
                  {robot.technical_specifications && Object.keys(robot.technical_specifications).length > 0 && (
                    <div className="mt-6 pt-6 border-t">
                      <h4 className="font-semibold text-primary mb-4">Detailed Specifications</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(robot.technical_specifications).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="text-muted-foreground capitalize">
                              {key.replace(/_/g, ' ')}:
                            </span>
                            <span className="font-medium">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Certification Standards */}
                  {robot.certification_standards && robot.certification_standards.length > 0 && (
                    <div className="mt-6 pt-6 border-t">
                      <h4 className="font-semibold text-primary mb-3">Certifications</h4>
                      <div className="flex flex-wrap gap-2">
                        {robot.certification_standards.map((cert, index) => (
                          <Badge key={index} variant="outline">
                            <Shield className="h-3 w-3 mr-1" />
                            {cert}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="seller" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Seller Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="flex items-center space-x-3">
                          <User className="h-5 w-5 text-primary" />
                          <div>
                            <p className="font-semibold">{robot.profiles.full_name}</p>
                            <p className="text-sm text-muted-foreground">Contact Person</p>
                          </div>
                        </div>

                        {robot.profiles.company_name && (
                          <div className="flex items-center space-x-3">
                            <Building className="h-5 w-5 text-primary" />
                            <div>
                              <p className="font-semibold">{robot.profiles.company_name}</p>
                              <p className="text-sm text-muted-foreground">Company</p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center space-x-3">
                          <MapPin className="h-5 w-5 text-primary" />
                          <div>
                            <p className="font-semibold">{robot.profiles.location}</p>
                            <p className="text-sm text-muted-foreground">Location</p>
                          </div>
                        </div>

                        {user && (
                          <div className="space-y-2">
                            <div className="flex items-center space-x-3">
                              <Phone className="h-5 w-5 text-primary" />
                              <div>
                                <p className="font-semibold">{robot.profiles.phone}</p>
                                <p className="text-sm text-muted-foreground">Phone</p>
                              </div>
                            </div>

                            <div className="flex items-center space-x-3">
                              <Mail className="h-5 w-5 text-primary" />
                              <div>
                                <p className="font-semibold">{robot.profiles.email}</p>
                                <p className="text-sm text-muted-foreground">Email</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {!user && (
                      <div className="text-center py-6 bg-muted/20 rounded-lg">
                        <User className="h-12 w-12 text-primary mx-auto mb-4" />
                        <p className="text-muted-foreground mb-4">
                          Sign in to view seller contact information
                        </p>
                        <Button onClick={() => setShowLogin(true)}>
                          Sign In to View Contact Details
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="additional" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Additional Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Warranty Information */}
                  {robot.warranty_info && (
                    <div>
                      <h4 className="font-semibold text-primary mb-2">Warranty</h4>
                      <p className="text-muted-foreground">{robot.warranty_info}</p>
                    </div>
                  )}

                  {/* Operating Environment */}
                  {robot.operating_environment && (
                    <div>
                      <h4 className="font-semibold text-primary mb-2">Operating Environment</h4>
                      <p className="text-muted-foreground">{robot.operating_environment}</p>
                    </div>
                  )}

                  {/* Category Tags */}
                  {robot.category_tags && robot.category_tags.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-primary mb-3">Tags</h4>
                      <div className="flex flex-wrap gap-2">
                        {robot.category_tags.map((tag, index) => (
                          <Badge key={index} variant="secondary">
                            <Tag className="h-3 w-3 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quantity Available */}
                  <div>
                    <h4 className="font-semibold text-primary mb-2">Availability</h4>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Package className="h-4 w-4 text-primary" />
                        <span className="text-muted-foreground">Quantity Available:</span>
                        <span className="font-semibold">{robot.quantity}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-primary" />
                        <span className="text-muted-foreground">Status:</span>
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          {robot.availability}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Documents */}
                  {robot.brochure_url && (
                    <div>
                      <h4 className="font-semibold text-primary mb-3">Documents</h4>
                      <Button variant="outline" asChild>
                        <a href={robot.brochure_url} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4 mr-2" />
                          Download Brochure
                        </a>
                      </Button>
                    </div>
                  )}

                  {/* Video */}
                  {robot.video_url && (
                    <div>
                      <h4 className="font-semibold text-primary mb-3">Product Video</h4>
                      <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                        {robot.video_type === 'youtube' ? (
                          <iframe
                            src={robot.video_url}
                            className="w-full h-full"
                            allowFullScreen
                            title="Product Video"
                          />
                        ) : (
                          <video
                            src={robot.video_url}
                            controls
                            className="w-full h-full object-cover"
                          >
                            Your browser does not support the video tag.
                          </video>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Recommendations Section */}
        <div className="mt-12 space-y-8">
          {/* Spare Parts Section */}
          <div>
            <Card className="bg-white">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl text-gray-900">Recommended Spare Parts</CardTitle>
                  <Button variant="outline" size="sm">
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {spareParts.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {spareParts.map((part) => (
                      <div key={part.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <h4 className="font-semibold text-gray-900">{part.name}</h4>
                        <p className="text-sm text-gray-600 mt-1">{part.description}</p>
                        <div className="flex items-center justify-between mt-3">
                          <span className="font-bold text-blue-600">
                            {formatCurrency(part.price, part.currency)}
                          </span>
                          <Button size="sm" variant="outline">
                            View Details
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No spare parts available</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Services Section */}
          <div>
            <Card className="bg-white">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl text-gray-900">Related Services</CardTitle>
                  <Button variant="outline" size="sm">
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {services.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {services.map((service) => (
                      <div key={service.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <h4 className="font-semibold text-gray-900">{service.name}</h4>
                        <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                        <div className="flex items-center justify-between mt-3">
                          <span className="font-bold text-blue-600">
                            {formatCurrency(service.price, service.currency)}
                          </span>
                          <Button size="sm" variant="outline">
                            Request Quote
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No services available</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Finance Section */}
          <div>
            <Card className="bg-white">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl text-gray-900">Finance Options</CardTitle>
                  <Button variant="outline" size="sm">
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {financeProviders.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {financeProviders.map((provider) => (
                      <div key={provider.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <h4 className="font-semibold text-gray-900">{provider.company_name}</h4>
                        <p className="text-sm text-gray-600 mt-1">{provider.loan_types?.join(', ')}</p>
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-sm text-gray-600">
                            Interest from {provider.min_interest_rate}%
                          </span>
                          <Button size="sm" variant="outline">
                            Apply Now
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No finance options available</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Logistics Section */}
          <div>
            <Card className="bg-white">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl text-gray-900">Logistics Providers</CardTitle>
                  <Button variant="outline" size="sm">
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {logisticsProviders.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {logisticsProviders.map((provider) => (
                      <div key={provider.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <h4 className="font-semibold text-gray-900">{provider.company_name}</h4>
                        <p className="text-sm text-gray-600 mt-1">{provider.services?.join(', ')}</p>
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-sm text-gray-600">
                            Coverage: {provider.coverage_areas?.length || 0} areas
                          </span>
                          <Button size="sm" variant="outline">
                            Get Quote
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No logistics providers available</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* AI Analysis Section */}
          {user && (
            <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50/80 to-purple-50/80">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Brain className="h-6 w-6 text-blue-600" />
                    <CardTitle className="text-xl text-blue-900">
                      Advanced AI Market Intelligence
                    </CardTitle>
                  </div>
                  <Button 
                    onClick={handleAIAnalysis}
                    disabled={isAILoading}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isAILoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Bot className="h-4 w-4 mr-2" />
                        Get AI Analysis
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-blue-800 mb-4">
                  Get comprehensive AI-powered insights including market analysis, suitability assessment, 
                  government scheme recommendations, and personalized industry suggestions.
                </p>
                
                {aiAnalysis && (
                  <div className="mt-4 p-4 bg-white rounded-lg">
                    <p className="text-blue-800">{aiAnalysis.analysis.summary}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* EMI Calculator Modal */}
        <Dialog open={showEmiCalculator} onOpenChange={setShowEmiCalculator}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>EMI Calculator</DialogTitle>
              <DialogDescription>
                Calculate your monthly EMI for {robot.name}
              </DialogDescription>
            </DialogHeader>
            <div className="p-4">
              <p>EMI Calculator for {robot.name}</p>
              <p>Price: {formatCurrency(robot.price, robot.currency)}</p>
            </div>
          </DialogContent>
        </Dialog>

        {/* Loan Application Modal */}
        <Dialog open={showLoanModal} onOpenChange={setShowLoanModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Loan Application</DialogTitle>
            </DialogHeader>
            <div className="p-4">Loan application for {robot.name}</div>
          </DialogContent>
        </Dialog>

        {/* Service Quote Modal */}
        <Dialog open={showServiceQuote} onOpenChange={setShowServiceQuote}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Request Service Quote</DialogTitle>
              <DialogDescription>
                Get a quote for services related to {robot.name}
              </DialogDescription>
            </DialogHeader>
            <div className="p-4">
              Service quote request for {robot.name}
            </div>
          </DialogContent>
        </Dialog>

        {/* Robot Report Modal */}
        <Dialog open={showRobotReport} onOpenChange={setShowRobotReport}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Robot Report</DialogTitle>
            </DialogHeader>
            <div className="p-4">Generate report for {robot.name}</div>
          </DialogContent>
        </Dialog>

        {/* Login Modal */}
        <Dialog open={showLogin} onOpenChange={setShowLogin}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Sign In Required</DialogTitle>
              <DialogDescription>
                Please sign in to access this feature
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center py-4">
              <Button onClick={() => navigate('/auth')}>
                Go to Sign In
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Fullscreen Image Modal */}
      <Dialog open={showFullscreen} onOpenChange={setShowFullscreen}>
        <DialogContent className="max-w-7xl max-h-[90vh] p-0">
          <div className="relative">
            <img
              src={currentImage}
              alt={robot.name}
              className="w-full h-full max-h-[80vh] object-contain"
              style={{
                imageOrientation: 'from-image'
              }}
            />
            <Button
              variant="outline"
              size="icon"
              className="absolute top-4 right-4 bg-white/90 hover:bg-white"
              onClick={() => setShowFullscreen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
            
            {robot.images?.length > 1 && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white"
                  onClick={prevImage}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white"
                  onClick={nextImage}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* SEO Component */}
      {robot && (
        <div
          dangerouslySetInnerHTML={{
            __html: `
              <script type="application/ld+json">
                ${JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "Product",
                  "name": robot.name,
                  "description": robot.description,
                  "image": robot.images?.[0],
                  "brand": {
                    "@type": "Brand",
                    "name": robot.brand || "Unknown"
                  },
                  "offers": {
                    "@type": "Offer",
                    "price": robot.price,
                    "priceCurrency": robot.currency,
                    "availability": "https://schema.org/InStock"
                  },
                  "aggregateRating": {
                    "@type": "AggregateRating",
                    "ratingValue": "4.5",
                    "reviewCount": "10"
                  }
                })}
              </script>
            `
          }}
        />
      )}
    </div>
  );
};

export default RobotDetails;