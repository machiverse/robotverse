// src/pages/RobotDetails.tsx

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Bot, MapPin, Building, Phone, Mail, User, ArrowLeft, Loader2, Wrench, Settings, DollarSign, Truck, Brain, Heart, MessageCircle, PhoneCall, X, ChevronLeft, ChevronRight, Maximize2, CheckCircle, Lightbulb, ExternalLink } from "lucide-react"; // Added ExternalLink for recommendation cards
import EnhancedHeader from "@/components/EnhancedHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";
import { Database } from "@/types/supabase"; // Ensure you have generated types

// --- TYPE DEFINITIONS ---
// These types should accurately reflect your database schema and the data you select.

type RobotRow = Database['public']['Tables']['robots']['Row'];
type ProfileRow = Database['public']['Tables']['profiles']['Row'];

interface Robot extends RobotRow {
  profiles: Pick<ProfileRow, 'full_name' | 'company_name' | 'phone' | 'mobile_number' | 'email' | 'location'>;
  // Note: mobile_number was added to profile for consistency with RobotListings.
  // Ensure your actual Supabase query selects this if needed.
}

// FIX: This interface now EXACTLY matches the JSON response from your refactored Edge Function.
interface AIAnalysisResult {
  robot: {
    // This is a partial robot object from the function, for display in AI section if needed.
    name: string;
    robot_type: string;
    model?: string;
    price?: number;
    currency?: string;
    profiles?: {
      location?: string;
      company_name?: string;
    };
  };
  analysis: string; // The main AI text summary
  marketEcosystem: {
    spareParts: {
      suppliers: Array<{
        id: string;
        name: string;
        price?: number;
        currency?: string;
        partNumber?: string;
        specifications?: any;
        proximity: number;
        profiles?: { company_name?: string; location?: string };
      }>;
    };
    services: {
      providers: Array<{
        id: string;
        name: string;
        serviceType?: string;
        priceRange?: string;
        specializations?: string[];
        proximity: number;
        profiles?: { company_name?: string; location?: string };
      }>;
    };
    logistics: {
      providers: Array<{
        id: string;
        company: string;
        location?: string;
        logisticsType?: string;
        transportModes?: string[];
        warehouseStorage?: boolean;
        serviceRegion?: string;
        proximity: number;
      }>;
    };
    finance: {
      providers: Array<{
        id: string;
        company: string;
        location?: string;
        financeTypes?: string[];
        financingFor?: string[];
        targetAudience?: string[];
        governmentSchemeSupport?: boolean;
        proximity: number;
      }>;
    };
  };
  locationInsights: {
    userLocation?: string;
    robotLocation?: string;
    proximityFactors?: {
      nearbySuppliers?: number;
      nearbyServices?: number;
      logisticsAvailability?: number;
    };
  };
  actionableRecommendations: {
    immediateActions: string[];
    costOptimization: string[];
    riskMitigation: string[];
  };
}


const RobotDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [robot, setRobot] = useState<Robot | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResult | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // States for enhanced functionality
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteMessage, setQuoteMessage] = useState('');
  const [addingToWatchlist, setAddingToWatchlist] = useState(false);
  const [isInWatchlist, setIsInWatchlist] = useState(false);

  useEffect(() => {
    if (!id) return;
    
    const fetchRobotAndWatchlist = async () => {
      try {
        setLoading(true);
        const { data, error: fetchError } = await supabase
          .from('robots')
          .select(`
            *,
            profiles!robots_seller_id_fkey (
              full_name, company_name, phone, mobile_number, email, location
            )
          `)
          .eq('id', id)
          .single();

        if (fetchError) throw fetchError;
        setRobot(data as Robot);
        
        // Check watchlist status
        if (user) {
          // PROFESSIONAL RECOMMENDATION: For a production app, this should be a database table `watchlists`
          // linking `user_id` and `robot_id`, not localStorage which is client-specific.
          const watchlist = JSON.parse(localStorage.getItem(`watchlist_${user.id}`) || '[]');
          setIsInWatchlist(watchlist.includes(data.id));
        }
      } catch (err: any) {
        console.error('Error fetching robot:', err);
        setError(err.message || 'Failed to load robot details');
      } finally {
        setLoading(false);
      }
    };

    fetchRobotAndWatchlist();
  }, [id, user]);

  // AI Analysis Function - FIXED
  const handleAIAnalysis = async () => {
    if (!robot || !user) {
      toast({ title: "Login Required", description: "Please log in to access AI analysis features", variant: "destructive" });
      return;
    }

    try {
      setAnalysisLoading(true);
      // The `supabase-js` client automatically includes the user's auth token.
      const { data, error: funcError } = await supabase.functions.invoke('roboverse-ai-analyze', {
        body: { robotId: robot.id, userId: user.id }
      });

      if (funcError) throw funcError;
      
      // FIX: The `data` object from the function is the entire analysis payload.
      // We set this directly to our state, which now has the correct type.
      setAiAnalysis(data as AIAnalysisResult); // Cast to AIAnalysisResult for type safety
      
      toast({ title: "AI Analysis Complete", description: "Smart market intelligence generated!" });
    } catch (err: any) {
      console.error('Error getting AI analysis:', err);
      toast({
        title: "Analysis Failed",
        description: err.message || 'The AI analysis could not be completed. Please try again later.',
        variant: "destructive",
      });
      // Clear previous analysis on failure
      setAiAnalysis(null);
    } finally {
      setAnalysisLoading(false);
    }
  };

  // Working Contact Seller Function
  const handleContactSeller = () => {
    if (!robot?.profiles?.phone && !robot?.profiles?.mobile_number) {
      toast({
        title: "Contact Info Not Available",
        description: "Seller's phone or mobile number is not provided.",
        variant: "destructive",
      });
      return;
    }
    const phoneNumber = (robot.profiles.phone || robot.profiles.mobile_number || '').replace(/\D/g, '');
    window.open(`tel:${phoneNumber}`, '_self');
    toast({
      title: "Initiating Call",
      description: `Attempting to call ${robot.profiles.full_name || robot.profiles.company_name}`,
    });
  };

  // Working Request Quote Function
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

  const sendQuoteEmail = () => {
    if (!robot?.profiles?.email) return;
    const subject = `Quote Request for ${robot.name} - ${robot.model}`;
    const body = `Dear ${robot.profiles.full_name || robot.profiles.company_name},

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

  // Working Add to Watchlist Function
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
        // Remove from watchlist
        const newWatchlist = watchlist.filter((robotId: string) => robotId !== robot!.id);
        localStorage.setItem(`watchlist_${user.id}`, JSON.stringify(newWatchlist));
        setIsInWatchlist(false);
        toast({
          title: "Removed from Watchlist",
          description: `${robot!.name} has been removed from your watchlist.`,
        });
      } else {
        // Add to watchlist
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

  // Image Navigation Functions
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

  const formatPrice = (price: number | null, currency: string | null) => {
    if (price === null || price === undefined) return 'Price on request';
    const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₹'; // Default to INR
    return `${currencySymbol}${price.toLocaleString()}`;
  };

  // --- RENDER LOGIC ---

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
  
  // A small, reusable component for recommendation cards to keep JSX clean
  // Adjusted to use generic `item` type and display relevant fields
  const RecommendationCard = ({ item, type }: { item: any, type: string }) => {
    const icons: Record<string, React.ReactNode> = {
      parts: <Wrench className="w-4 h-4 mr-2 text-blue-600" />,
      services: <Settings className="w-4 h-4 mr-2 text-green-600" />,
      logistics: <Truck className="w-4 h-4 mr-2 text-orange-600" />,
      finance: <DollarSign className="w-4 h-4 mr-2 text-purple-600" />,
    };
    const colors: Record<string, string> = {
      parts: 'border-blue-200',
      services: 'border-green-200',
      logistics: 'border-orange-200',
      finance: 'border-purple-200',
    };

    const companyName = item.profiles?.company_name || item.company;
    const location = item.profiles?.location || item.location;
    const name = item.name || item.company || item.company_name; // Fallback for name

    return (
      <Card className={`${colors[type]} hover:shadow-md transition-shadow`}>
        <CardContent className="p-4">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <h5 className="font-semibold text-gray-800 flex items-center">
                {icons[type]} {name}
              </h5>
              {companyName && companyName !== name && (
                 <p className="text-sm text-muted-foreground ml-6">({companyName})</p>
              )}
              {location && (
                <p className="text-sm text-muted-foreground flex items-center"><MapPin className="w-3 h-3 mr-1.5 ml-6" />{location}</p>
              )}
              {item.proximity !== undefined && (
                <Badge variant="outline" className="ml-6 mt-1">{item.proximity}% Proximity</Badge>
              )}
            </div>
            <Button size="sm" variant="outline" className="text-gray-600 hover:text-gray-800">
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <EnhancedHeader />
      
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          onClick={() => navigate('/robots')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Robots
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Robot Image Gallery with Navigation and Fullscreen */}
            <Card>
              <CardContent className="p-6">
                <div className="relative aspect-video bg-muted rounded-lg flex items-center justify-center mb-4 overflow-hidden">
                  {robot.images && robot.images.length > 0 ? (
                    <>
                      <img 
                        src={robot.images[currentImageIndex]} 
                        alt={`${robot.name} ${currentImageIndex + 1}`}
                        className="w-full h-full object-contain rounded-lg cursor-pointer transition-transform duration-300 ease-in-out hover:scale-105"
                        onClick={() => setShowFullscreen(true)}
                      />
                      
                      {/* Navigation Arrows */}
                      {robot.images.length > 1 && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white z-10"
                            onClick={(e) => { e.stopPropagation(); prevImage(); }}
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white z-10"
                            onClick={(e) => { e.stopPropagation(); nextImage(); }}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      
                      {/* Fullscreen Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white z-10"
                        onClick={(e) => { e.stopPropagation(); setShowFullscreen(true); }}
                      >
                        <Maximize2 className="w-4 h-4" />
                      </Button>
                      
                      {/* Image Counter */}
                      {robot.images.length > 1 && (
                        <div className="absolute bottom-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-sm z-10">
                          {currentImageIndex + 1} / {robot.images.length}
                        </div>
                      )}
                    </>
                  ) : (
                    <Bot className="w-24 h-24 text-muted-foreground" />
                  )}
                </div>
                
                {/* Scrollable Thumbnail Gallery */}
                {robot.images && robot.images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide"> {/* Added scrollbar-hide for cleaner look */}
                    {robot.images.map((image, index) => (
                      <div 
                        key={index} 
                        className={`flex-shrink-0 aspect-square w-20 h-20 bg-muted rounded-lg flex items-center justify-center cursor-pointer border-2 transition-all duration-200 ${
                          index === currentImageIndex ? 'border-primary shadow-md' : 'border-transparent opacity-70 hover:opacity-100'
                        }`}
                        onClick={() => setCurrentImageIndex(index)}
                      >
                        <img 
                          src={image} 
                          alt={`${robot.name} ${index + 1}`}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Robot Information */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-3xl font-bold">{robot.name}</CardTitle>
                    <p className="text-xl text-muted-foreground mt-1">{robot.model}</p>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <div className="text-4xl font-extrabold text-primary">
                      {robot.price ? formatPrice(robot.price, robot.currency) : 'Price on Request'}
                    </div>
                    <Badge variant={robot.availability === 'available' ? 'default' : 'secondary'} className="mt-2 text-sm px-3 py-1">
                      {robot.availability}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <Separator className="my-4" />
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="px-3 py-1 text-sm">{robot.robot_type}</Badge>
                    {robot.category_tags?.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="px-3 py-1 text-sm">{tag}</Badge>
                    ))}
                  </div>
                  
                  <div className="flex items-center text-lg text-muted-foreground">
                    <MapPin className="w-5 h-5 mr-3" />
                    <span>{robot.location}</span>
                  </div>

                  {robot.description && (
                    <div>
                      <h4 className="font-semibold text-lg mb-2">Description</h4>
                      <p className="text-muted-foreground leading-relaxed">{robot.description}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-base">
                    <div>
                      <span className="font-medium text-gray-700">Quantity Available:</span>
                      <p className="text-muted-foreground">{robot.quantity}</p>
                    </div>
                    {/* Add more key robot details here if available in your schema */}
                    {robot.brand && (
                      <div>
                        <span className="font-medium text-gray-700">Brand:</span>
                        <p className="text-muted-foreground">{robot.brand}</p>
                      </div>
                    )}
                    {robot.condition && (
                      <div>
                        <span className="font-medium text-gray-700">Condition:</span>
                        <p className="text-muted-foreground">{robot.condition.replace('_', ' ')}</p>
                      </div>
                    )}
                    {robot.year_manufactured && (
                      <div>
                        <span className="font-medium text-gray-700">Year Manufactured:</span>
                        <p className="text-muted-foreground">{robot.year_manufactured}</p>
                      </div>
                    )}
                    {robot.payload_capacity && (
                      <div>
                        <span className="font-medium text-gray-700">Payload Capacity:</span>
                        <p className="text-muted-foreground">{robot.payload_capacity} kg</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Technical Specifications */}
            {robot.technical_specifications && Object.keys(robot.technical_specifications).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">Technical Specifications</CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <Separator className="my-4" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(robot.technical_specifications).map(([key, value]) => (
                      <div key={key}>
                        <span className="font-medium text-gray-700 capitalize">{key.replace(/_/g, ' ')}:</span>
                        <p className="text-muted-foreground text-base">{String(value)}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* PROFESSIONAL AI ANALYSIS UI/UX */}
            {user && (
              <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50/80 to-purple-50/80 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg p-6">
                  <CardTitle className="flex items-center text-2xl font-bold">
                    <Brain className="w-7 h-7 mr-3" />
                    Smart Market Intelligence
                  </CardTitle>
                  <p className="text-blue-100 text-sm mt-1">AI-powered insights for this specific robot and your location.</p>
                </CardHeader>
                <CardContent className="p-6">
                  {!aiAnalysis ? (
                    <div className="text-center py-6">
                      <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl border-4 border-blue-100">
                        <Brain className="w-12 h-12 text-blue-500" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-800 mb-2">Unlock Your Competitive Edge</h3>
                      <p className="text-gray-600 mb-6 max-w-lg mx-auto">Get an instant, detailed analysis of market positioning, ROI, and a complete ecosystem of suppliers and services.</p>
                      
                      <Button onClick={handleAIAnalysis} disabled={analysisLoading} size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 rounded-lg shadow-md hover:shadow-lg transition-all">
                        {analysisLoading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Analyzing Market...</> : <>Generate AI Analysis</>}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Main AI Text Analysis */}
                      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                        <h4 className="font-semibold text-lg mb-3 text-gray-900 flex items-center">
                          <Lightbulb className="w-5 h-5 mr-2 text-yellow-500" />
                          Executive Summary
                        </h4>
                        <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{aiAnalysis.analysis}</p>
                      </div>

                      {/* Actionable Recommendations */}
                      {(aiAnalysis.actionableRecommendations.immediateActions.length > 0 ||
                        aiAnalysis.actionableRecommendations.costOptimization.length > 0 ||
                        aiAnalysis.actionableRecommendations.riskMitigation.length > 0) && (
                        <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                          <h4 className="font-semibold text-lg mb-3 text-green-900 flex items-center">
                            <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
                            Actionable Recommendations
                          </h4>
                          <ul className="list-disc list-inside space-y-1 text-green-800">
                            {aiAnalysis.actionableRecommendations.immediateActions.map((action, i) => <li key={i}>{action}</li>)}
                            {aiAnalysis.actionableRecommendations.costOptimization.map((action, i) => <li key={i}>{action}</li>)}
                            {aiAnalysis.actionableRecommendations.riskMitigation.map((action, i) => <li key={i}>{action}</li>)}
                          </ul>
                        </div>
                      )}

                      {/* Ecosystem Tabs */}
                      <Tabs defaultValue="parts" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 bg-gray-100 p-1 rounded-lg">
                          <TabsTrigger value="parts" className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-800 data-[state=active]:shadow-sm">Spare Parts ({aiAnalysis.marketEcosystem.spareParts.suppliers.length})</TabsTrigger>
                          <TabsTrigger value="services" className="data-[state=active]:bg-green-100 data-[state=active]:text-green-800 data-[state=active]:shadow-sm">Services ({aiAnalysis.marketEcosystem.services.providers.length})</TabsTrigger>
                          <TabsTrigger value="logistics" className="data-[state=active]:bg-orange-100 data-[state=active]:text-orange-800 data-[state=active]:shadow-sm">Logistics ({aiAnalysis.marketEcosystem.logistics.providers.length})</TabsTrigger>
                          <TabsTrigger value="finance" className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-800 data-[state=active]:shadow-sm">Finance ({aiAnalysis.marketEcosystem.finance.providers.length})</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="parts" className="mt-4">
                          <div className="space-y-3">
                            {aiAnalysis.marketEcosystem.spareParts.suppliers.length > 0 ? (
                              aiAnalysis.marketEcosystem.spareParts.suppliers.map((part, i) => <RecommendationCard key={i} item={part} type="parts" />)
                            ) : <p className="text-muted-foreground text-center py-4">No matching spare parts found.</p>}
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="services" className="mt-4">
                          <div className="space-y-3">
                            {aiAnalysis.marketEcosystem.services.providers.length > 0 ? (
                              aiAnalysis.marketEcosystem.services.providers.map((service, i) => <RecommendationCard key={i} item={service} type="services" />)
                            ) : <p className="text-muted-foreground text-center py-4">No matching services found.</p>}
                          </div>
                        </TabsContent>

                        <TabsContent value="logistics" className="mt-4">
                           <div className="space-y-3">
                            {aiAnalysis.marketEcosystem.logistics.providers.length > 0 ? (
                              aiAnalysis.marketEcosystem.logistics.providers.map((provider, i) => <RecommendationCard key={i} item={provider} type="logistics" />)
                            ) : <p className="text-muted-foreground text-center py-4">No matching logistics providers found.</p>}
                          </div>
                        </TabsContent>

                        <TabsContent value="finance" className="mt-4">
                           <div className="space-y-3">
                            {aiAnalysis.marketEcosystem.finance.providers.length > 0 ? (
                              aiAnalysis.marketEcosystem.finance.providers.map((provider, i) => <RecommendationCard key={i} item={provider} type="finance" />)
                            ) : <p className="text-muted-foreground text-center py-4">No matching finance providers found.</p>}
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar Column */}
          <div className="space-y-6">
            {/* Seller Information */}
            {user && robot.profiles && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Seller Information</CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <Separator className="my-4" />
                  <div className="space-y-3 text-base">
                    <div className="flex items-center text-gray-700">
                      <User className="w-4 h-4 mr-3" />
                      <span>{robot.profiles.full_name}</span>
                    </div>
                    {robot.profiles.company_name && (
                      <div className="flex items-center text-gray-700">
                        <Building className="w-4 h-4 mr-3" />
                        <span>{robot.profiles.company_name}</span>
                      </div>
                    )}
                    {(robot.profiles.phone || robot.profiles.mobile_number) && (
                      <div className="flex items-center text-gray-700">
                        <Phone className="w-4 h-4 mr-3" />
                        <span>{robot.profiles.phone || robot.profiles.mobile_number}</span>
                      </div>
                    )}
                    {robot.profiles.email && (
                      <div className="flex items-center text-gray-700">
                        <Mail className="w-4 h-4 mr-3" />
                        <span className="text-sm break-all">{robot.profiles.email}</span>
                      </div>
                    )}
                    {robot.profiles.location && (
                      <div className="flex items-center text-gray-700">
                        <MapPin className="w-4 h-4 mr-3" />
                        <span>{robot.profiles.location}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Login Required Card */}
            {!user && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Login Required</CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <Separator className="my-4" />
                  <p className="text-muted-foreground mb-4">
                    Please log in to view seller information and access advanced AI analysis features.
                  </p>
                  <Button onClick={() => navigate('/auth')} className="w-full">
                    Login / Sign Up
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Working Contact Actions */}
            {user && (
              <Card>
                <CardContent className="p-6 space-y-3">
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700 text-white shadow-md" 
                    size="lg"
                    onClick={handleContactSeller}
                    disabled={!robot.profiles?.phone && !robot.profiles?.mobile_number}
                  >
                    <PhoneCall className="w-5 h-5 mr-2" />
                    Contact Seller
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full border-blue-600 text-blue-600 hover:bg-blue-50 shadow-md"
                    onClick={handleRequestQuote}
                    disabled={!robot.profiles?.email}
                  >
                    <MessageCircle className="w-5 h-5 mr-2" />
                    Request Quote
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full border-red-600 text-red-600 hover:bg-red-50 shadow-md"
                    onClick={handleAddToWatchlist}
                    disabled={addingToWatchlist}
                  >
                    {addingToWatchlist ? (
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    ) : (
                      <Heart className={`w-5 h-5 mr-2 ${isInWatchlist ? 'fill-current text-red-500' : ''}`} />
                    )}
                    {isInWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Fullscreen Image Modal */}
      <Dialog open={showFullscreen} onOpenChange={setShowFullscreen}>
        <DialogContent className="max-w-7xl max-h-[95vh] p-0 border-none bg-transparent flex items-center justify-center">
          <div className="relative w-full h-full flex items-center justify-center">
            <img 
              src={robot?.images?.[currentImageIndex]} 
              alt={`${robot?.name} ${currentImageIndex + 1}`}
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-xl"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white rounded-full p-2"
              onClick={() => setShowFullscreen(false)}
            >
              <X className="w-6 h-6" />
            </Button>
            
            {/* Navigation in fullscreen */}
            {robot?.images && robot.images.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2"
                  onClick={prevImage}
                >
                  <ChevronLeft className="w-8 h-8" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2"
                  onClick={nextImage}
                >
                  <ChevronRight className="w-8 h-8" />
                </Button>
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-full text-lg">
                  {currentImageIndex + 1} / {robot.images.length}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Quote Request Modal */}
      <Dialog open={showQuoteModal} onOpenChange={setShowQuoteModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl">Request Quote</DialogTitle>
            <DialogDescription className="text-base text-muted-foreground">
              Send a quote request to <span className="font-semibold text-gray-800">{robot?.profiles?.company_name || robot?.profiles?.full_name}</span> for <span className="font-semibold text-gray-800">{robot?.name}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-gray-700">Your message will be sent to the seller's email: <span className="font-medium">{robot?.profiles?.email}</span></p>
            <Textarea
              placeholder="Add any specific requirements or questions (e.g., 'What is the lead time for delivery?', 'Are there bulk purchase discounts?')..."
              value={quoteMessage}
              onChange={(e) => setQuoteMessage(e.target.value)}
              rows={6}
              className="min-h-[120px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuoteModal(false)}>
              Cancel
            </Button>
            <Button onClick={sendQuoteEmail} disabled={!robot?.profiles?.email}>
              <Mail className="w-4 h-4 mr-2" />
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RobotDetails;
