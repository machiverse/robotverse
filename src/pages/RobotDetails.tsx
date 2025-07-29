import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, MapPin, Building, Phone, Mail, User, ArrowLeft, Loader2, Wrench, Settings, DollarSign, Truck, Brain, TrendingUp, AlertCircle, CheckCircle, Star, Target, Zap, Heart, MessageCircle, PhoneCall, BookOpen, BarChart3, Users, Lightbulb, Shield, Wallet, FileText, Award, Clock, Globe, X, Maximize2 } from "lucide-react";
import EnhancedHeader from "@/components/EnhancedHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

interface Robot {
  id: string;
  name: string;
  model: string;
  robot_type: string;
  price: number;
  currency: string;
  description: string;
  location: string;
  availability: string;
  images: string[];
  technical_specifications: any;
  category_tags: string[];
  quantity: number;
  seller_id: string;
  profiles: {
    full_name: string;
    company_name: string;
    phone: string;
    email: string;
    location: string;
  };
}

interface EnhancedAIAnalysisResult {
  robot: {
    marketInsights: {
      priceRange: string;
      location: string;
      sellerInfo: any;
    };
  };
  analysis: string;
  marketEcosystem: {
    spareParts: {
      total: number;
      nearby: number;
      suppliers: Array<{
        id: string;
        name: string;
        company: string;
        location: string;
        proximity: number;
        price: string;
        partNumber: string;
        specifications: any;
      }>;
    };
    services: {
      total: number;
      nearby: number;
      providers: Array<{
        id: string;
        name: string;
        company: string;
        location: string;
        proximity: number;
        serviceType: string;
        priceRange: string;
        specializations: string[];
      }>;
    };
    logistics: {
      total: number;
      providers: Array<{
        id: string;
        company: string;
        location: string;
        proximity: number;
        logisticsType: string;
        transportModes: string[];
        warehouseStorage: boolean;
        serviceRegion: string;
      }>;
    };
    finance: {
      total: number;
      providers: Array<{
        id: string;
        company: string;
        location: string;
        proximity: number;
        financeTypes: string[];
        financingFor: string[];
        targetAudience: string[];
        governmentSchemeSupport: boolean;
      }>;
    };
  };
  locationInsights: {
    userLocation: string;
    robotLocation: string;
    proximityFactors: {
      nearbySuppliers: number;
      nearbyServices: number;
      logisticsAvailability: number;
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
  const [aiAnalysis, setAiAnalysis] = useState<EnhancedAIAnalysisResult | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showAIReportModal, setShowAIReportModal] = useState(false);
  const [quoteMessage, setQuoteMessage] = useState('');
  const [addingToWatchlist, setAddingToWatchlist] = useState(false);
  const [isInWatchlist, setIsInWatchlist] = useState(false);

  useEffect(() => {
    if (!id) return;
    
    const fetchRobot = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('robots')
          .select(`
            *,
            profiles!robots_seller_id_fkey (
              full_name,
              company_name,
              phone,
              email,
              location
            )
          `)
          .eq('id', id)
          .single();

        if (error) throw error;
        setRobot(data);
        
        checkWatchlistStatus(data.id);
      } catch (err) {
        console.error('Error fetching robot:', err);
        setError(err instanceof Error ? err.message : 'Failed to load robot details');
      } finally {
        setLoading(false);
      }
    };

    fetchRobot();
  }, [id]);

  const checkWatchlistStatus = (robotId: string) => {
    if (!user) return;
    const watchlist = JSON.parse(localStorage.getItem(`watchlist_${user.id}`) || '[]');
    setIsInWatchlist(watchlist.includes(robotId));
  };

  const handleContactSeller = () => {
    if (!robot?.profiles?.phone) {
      toast({
        title: "Phone Number Not Available",
        description: "Seller's phone number is not provided.",
        variant: "destructive",
      });
      return;
    }
    const phoneNumber = robot.profiles.phone.replace(/\D/g, '');
    window.open(`tel:${phoneNumber}`, '_self');
    toast({
      title: "Calling Seller",
      description: `Calling ${robot.profiles.full_name} at ${robot.profiles.phone}`,
    });
  };

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

  const handleAIAnalysis = async () => {
    if (!robot || !user) {
      toast({
        title: "Login Required",
        description: "Please log in to access AI analysis features",
        variant: "destructive",
      });
      return;
    }

    try {
      setAnalysisLoading(true);
      console.log('🤖 Starting AI analysis for robot:', robot.id);
      
      const { data, error } = await supabase.functions.invoke('roboverse-ai-analyze', {
        body: {
          robotId: robot.id,
          userId: user.id
        }
      });

      if (error) {
        console.error('❌ Edge function error:', error);
        throw error;
      }

      console.log('✅ AI Analysis response:', data);
      setAiAnalysis(data);
      setShowAIReportModal(true); // Show popup modal
      
      toast({
        title: "🎯 AI Analysis Complete!",
        description: `Found ${data.marketEcosystem.spareParts.total} suppliers, ${data.marketEcosystem.services.total} service providers`,
      });
    } catch (err) {
      console.error('❌ Error getting AI analysis:', err);
      toast({
        title: "Analysis Failed",
        description: err instanceof Error ? err.message : 'Failed to generate AI analysis',
        variant: "destructive",
      });
    } finally {
      setAnalysisLoading(false);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₹';
    return `${currencySymbol}${price.toLocaleString()}`;
  };

  const getProximityColor = (proximity: number) => {
    if (proximity >= 80) return "text-emerald-700";
    if (proximity >= 50) return "text-amber-700";
    return "text-rose-700";
  };

  const getProximityLabel = (proximity: number) => {
    if (proximity >= 80) return "Very Close";
    if (proximity >= 50) return "Nearby";
    return "Distant";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <EnhancedHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mr-2 text-blue-600" />
            <span className="text-gray-700 font-medium">Loading robot details...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !robot) {
    return (
      <div className="min-h-screen bg-gray-50">
        <EnhancedHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center py-12">
            <Bot className="w-16 h-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2 text-gray-900">Robot Not Found</h3>
            <p className="text-gray-700 mb-4">{error || 'The requested robot could not be found.'}</p>
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
    <div className="min-h-screen bg-gray-50">
      <EnhancedHeader />
      
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          onClick={() => navigate('/robots')}
          className="mb-6 hover:bg-gray-100 text-gray-700 font-medium"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Robots
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Robot Images */}
            <Card className="border-2 border-gray-200 shadow-lg bg-white">
              <CardContent className="p-6">
                <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center mb-4 border-2 border-gray-300">
                  {robot.images && robot.images.length > 0 ? (
                    <img 
                      src={robot.images[0]} 
                      alt={robot.name}
                      className="w-full h-full object-cover rounded-xl"
                    />
                  ) : (
                    <Bot className="w-24 h-24 text-gray-500" />
                  )}
                </div>
                {robot.images && robot.images.length > 1 && (
                  <div className="grid grid-cols-4 gap-3">
                    {robot.images.slice(1, 5).map((image, index) => (
                      <div key={index} className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center border-2 border-gray-300">
                        <img 
                          src={image} 
                          alt={`${robot.name} ${index + 2}`}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ✅ ENHANCED ROBOT INFORMATION - BETTER TEXT VISIBILITY */}
            <Card className="border-2 border-gray-200 shadow-lg bg-white">
              <CardHeader className="pb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-gray-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* ✅ ENHANCED PRODUCT NAME, BRAND, MODEL - HIGH CONTRAST */}
                    <div className="bg-white p-6 rounded-2xl border-2 border-blue-200 shadow-sm">
                      <div className="mb-4">
                        <div className="text-sm font-bold text-blue-700 uppercase tracking-wider mb-2">
                          Product Information
                        </div>
                        <h1 className="text-4xl font-black text-gray-900 mb-3 leading-tight">
                          {robot.name}
                        </h1>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-3">
                            <span className="text-lg font-bold text-gray-700">Brand:</span>
                            <span className="text-lg font-semibold text-blue-700 bg-blue-100 px-3 py-1 rounded-lg">
                              {robot.profiles?.company_name || 'RobotVerse'}
                            </span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <span className="text-lg font-bold text-gray-700">Model:</span>
                            <span className="text-lg font-semibold text-green-700 bg-green-100 px-3 py-1 rounded-lg">
                              {robot.model}
                            </span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <span className="text-lg font-bold text-gray-700">Type:</span>
                            <span className="text-lg font-semibold text-purple-700 bg-purple-100 px-3 py-1 rounded-lg">
                              {robot.robot_type}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right ml-6">
                    <div className="bg-white p-6 rounded-2xl border-2 border-green-200 shadow-sm">
                      <div className="text-sm font-bold text-green-700 uppercase tracking-wider mb-2">
                        Pricing
                      </div>
                      <div className="text-4xl font-black text-green-700 mb-3">
                        {robot.price ? formatPrice(robot.price, robot.currency) : 'Price on Request'}
                      </div>
                      <Badge 
                        variant={robot.availability === 'available' ? 'default' : 'secondary'} 
                        className="text-lg px-4 py-2 font-bold"
                      >
                        {robot.availability}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="flex flex-wrap gap-3">
                    {robot.category_tags?.map((tag, index) => (
                      <Badge 
                        key={index} 
                        className="px-4 py-2 text-sm font-bold bg-gray-100 text-gray-800 border-2 border-gray-300"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  
                  <div className="flex items-center text-gray-700 bg-gray-50 p-4 rounded-xl border-2 border-gray-200">
                    <MapPin className="w-6 h-6 mr-3 text-red-600" />
                    <span className="font-bold text-lg">{robot.location}</span>
                  </div>

                  {robot.description && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-2xl border-2 border-blue-200">
                      <div className="flex items-center mb-4">
                        <div className="p-3 bg-blue-200 rounded-xl mr-4">
                          <FileText className="w-6 h-6 text-blue-700" />
                        </div>
                        <h4 className="font-black text-gray-900 text-xl">Product Description</h4>
                      </div>
                      <div className="bg-white p-6 rounded-xl border-2 border-blue-300">
                        <p className="text-gray-900 leading-relaxed font-semibold text-lg">{robot.description}</p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-6 p-6 bg-gray-50 rounded-xl border-2 border-gray-200">
                    <div>
                      <span className="font-black text-gray-900 text-lg">Quantity Available:</span>
                      <p className="text-blue-700 text-2xl font-bold">{robot.quantity} units</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Technical Specifications */}
            {robot.technical_specifications && Object.keys(robot.technical_specifications).length > 0 && (
              <Card className="border-2 border-gray-200 shadow-lg bg-white">
                <CardHeader>
                  <CardTitle className="text-2xl font-black text-gray-900">Technical Specifications</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Object.entries(robot.technical_specifications).map(([key, value]) => (
                      <div key={key} className="p-4 bg-gray-50 rounded-xl border-2 border-gray-200">
                        <span className="font-black capitalize text-gray-900 block text-lg">
                          {key.replace(/_/g, ' ')}:
                        </span>
                        <p className="text-gray-800 mt-2 font-semibold">{String(value)}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ✅ REDESIGNED AI MARKET INTELLIGENCE - LEFT SIDE DESCRIPTION */}
            {user && (
              <Card className="border-2 border-gray-200 shadow-lg bg-white">
                <CardHeader className="bg-gradient-to-r from-slate-800 to-blue-800 text-white">
                  <CardTitle className="text-2xl font-black flex items-center">
                    <BarChart3 className="w-8 h-8 mr-3" />
                    AI Market Intelligence
                  </CardTitle>
                  <p className="text-slate-200 font-medium">
                    Advanced analytics • Supplier ecosystem • Market insights
                  </p>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* ✅ LEFT SIDE - DESCRIPTION & FEATURES */}
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-2xl font-black text-gray-900 mb-4">
                          Unlock Professional Market Intelligence
                        </h3>
                        <p className="text-gray-700 text-lg leading-relaxed font-medium mb-6">
                          Get comprehensive AI-powered analysis including supplier ecosystem mapping, 
                          competitive pricing benchmarks, location-based recommendations, and strategic insights.
                        </p>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center space-x-4 p-4 bg-blue-50 rounded-xl border-2 border-blue-200">
                          <div className="p-2 bg-blue-200 rounded-lg">
                            <Users className="w-6 h-6 text-blue-700" />
                          </div>
                          <div>
                            <h4 className="font-black text-gray-900">Supplier Network Analysis</h4>
                            <p className="text-gray-700 font-medium">Comprehensive supplier mapping and evaluation</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4 p-4 bg-green-50 rounded-xl border-2 border-green-200">
                          <div className="p-2 bg-green-200 rounded-lg">
                            <Target className="w-6 h-6 text-green-700" />
                          </div>
                          <div>
                            <h4 className="font-black text-gray-900">Location Intelligence</h4>
                            <p className="text-gray-700 font-medium">Proximity-based matching and insights</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4 p-4 bg-purple-50 rounded-xl border-2 border-purple-200">
                          <div className="p-2 bg-purple-200 rounded-lg">
                            <TrendingUp className="w-6 h-6 text-purple-700" />
                          </div>
                          <div>
                            <h4 className="font-black text-gray-900">Market Trends</h4>
                            <p className="text-gray-700 font-medium">Real-time market dynamics and pricing</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4 p-4 bg-orange-50 rounded-xl border-2 border-orange-200">
                          <div className="p-2 bg-orange-200 rounded-lg">
                            <Shield className="w-6 h-6 text-orange-700" />
                          </div>
                          <div>
                            <h4 className="font-black text-gray-900">Risk Assessment</h4>
                            <p className="text-gray-700 font-medium">Comprehensive risk analysis and mitigation</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ✅ RIGHT SIDE - GENERATE BUTTON */}
                    <div className="flex flex-col items-center justify-center text-center space-y-6">
                      <div className="relative">
                        <div className="w-32 h-32 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl transform hover:scale-105 transition-transform duration-300">
                          <Brain className="w-16 h-16 text-white" />
                        </div>
                        <div className="absolute -top-3 -right-3 w-10 h-10 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full flex items-center justify-center shadow-lg">
                          <Zap className="w-6 h-6 text-white" />
                        </div>
                      </div>

                      <div>
                        <h3 className="text-2xl font-black text-gray-900 mb-3">
                          Ready to Analyze?
                        </h3>
                        <p className="text-gray-700 font-medium mb-6">
                          Generate your professional intelligence report with detailed market insights
                        </p>
                      </div>

                      <Button 
                        onClick={handleAIAnalysis}
                        disabled={analysisLoading}
                        size="lg"
                        className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 text-white px-8 py-4 rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105 text-lg font-black"
                      >
                        {analysisLoading ? (
                          <>
                            <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                            Generating Report...
                          </>
                        ) : (
                          <>
                            <BarChart3 className="w-6 h-6 mr-3" />
                            Generate Professional Intelligence Report
                          </>
                        )}
                      </Button>

                      <p className="text-sm text-gray-600 font-medium">
                        Analysis takes 10-15 seconds • Professional grade insights
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Seller Information */}
            {user && robot.profiles && (
              <Card className="border-2 border-gray-200 shadow-lg bg-white">
                <CardHeader>
                  <CardTitle className="text-xl font-black text-gray-900">Seller Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center p-4 bg-gray-50 rounded-xl border-2 border-gray-200">
                      <User className="w-6 h-6 mr-3 text-gray-600" />
                      <span className="font-bold text-gray-900">{robot.profiles.full_name}</span>
                    </div>
                    {robot.profiles.company_name && (
                      <div className="flex items-center p-4 bg-gray-50 rounded-xl border-2 border-gray-200">
                        <Building className="w-6 h-6 mr-3 text-gray-600" />
                        <span className="font-bold text-gray-900">{robot.profiles.company_name}</span>
                      </div>
                    )}
                    {robot.profiles.phone && (
                      <div className="flex items-center p-4 bg-gray-50 rounded-xl border-2 border-gray-200">
                        <Phone className="w-6 h-6 mr-3 text-gray-600" />
                        <span className="font-bold text-gray-900">{robot.profiles.phone}</span>
                      </div>
                    )}
                    {robot.profiles.email && (
                      <div className="flex items-center p-4 bg-gray-50 rounded-xl border-2 border-gray-200">
                        <Mail className="w-6 h-6 mr-3 text-gray-600" />
                        <span className="text-sm font-bold text-gray-900">{robot.profiles.email}</span>
                      </div>
                    )}
                    {robot.profiles.location && (
                      <div className="flex items-center p-4 bg-gray-50 rounded-xl border-2 border-gray-200">
                        <MapPin className="w-6 h-6 mr-3 text-gray-600" />
                        <span className="font-bold text-gray-900">{robot.profiles.location}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {!user && (
              <Card className="border-2 border-gray-200 shadow-lg bg-white">
                <CardHeader>
                  <CardTitle className="text-xl font-black text-gray-900">Login Required</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 mb-4 font-medium">
                    Please log in to view seller information and access AI analysis features.
                  </p>
                  <Button onClick={() => navigate('/auth')} className="w-full bg-blue-600 hover:bg-blue-700 font-bold">
                    Login / Sign Up
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Contact Actions */}
            {user && (
              <Card className="border-2 border-gray-200 shadow-lg bg-white">
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3" 
                      size="lg"
                      onClick={handleContactSeller}
                    >
                      <PhoneCall className="w-5 h-5 mr-2" />
                      Call Seller
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full border-blue-600 text-blue-600 hover:bg-blue-50 font-bold py-3 border-2"
                      onClick={handleRequestQuote}
                    >
                      <MessageCircle className="w-5 h-5 mr-2" />
                      Request Quote
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full border-red-600 text-red-600 hover:bg-red-50 font-bold py-3 border-2"
                      onClick={handleAddToWatchlist}
                      disabled={addingToWatchlist}
                    >
                      {addingToWatchlist ? (
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      ) : (
                        <Heart className={`w-5 h-5 mr-2 ${isInWatchlist ? 'fill-current' : ''}`} />
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

      {/* ✅ AI ANALYSIS POPUP MODAL */}
      <Dialog open={showAIReportModal} onOpenChange={setShowAIReportModal}>
        <DialogContent className="max-w-7xl max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                  <BarChart3 className="w-8 h-8 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-black">Professional Market Intelligence Report</DialogTitle>
                  <DialogDescription className="text-slate-200 font-medium">
                    Comprehensive analysis for {robot?.name} • Generated on {new Date().toLocaleDateString()}
                  </DialogDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowAIReportModal(false)}
                className="text-white hover:bg-white/10"
              >
                <X className="w-6 h-6" />
              </Button>
            </div>
          </DialogHeader>
          
          <ScrollArea className="h-[calc(90vh-120px)]">
            <div className="p-8 space-y-8">
              {aiAnalysis && (
                <>
                  {/* Executive Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-2xl border-2 border-blue-200">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-200 rounded-xl">
                          <Wrench className="w-6 h-6 text-blue-700" />
                        </div>
                        <Badge className="bg-blue-200 text-blue-800 border-blue-300 font-bold">
                          {aiAnalysis.marketEcosystem.spareParts.nearby} nearby
                        </Badge>
                      </div>
                      <div className="text-3xl font-black text-gray-900 mb-1">{aiAnalysis.marketEcosystem.spareParts.total}</div>
                      <div className="text-sm font-bold text-gray-700">Parts Suppliers</div>
                    </div>

                    <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-2xl border-2 border-green-200">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-green-200 rounded-xl">
                          <Settings className="w-6 h-6 text-green-700" />
                        </div>
                        <Badge className="bg-green-200 text-green-800 border-green-300 font-bold">
                          {aiAnalysis.marketEcosystem.services.nearby} nearby
                        </Badge>
                      </div>
                      <div className="text-3xl font-black text-gray-900 mb-1">{aiAnalysis.marketEcosystem.services.total}</div>
                      <div className="text-sm font-bold text-gray-700">Service Providers</div>
                    </div>

                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-2xl border-2 border-orange-200">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-orange-200 rounded-xl">
                          <Truck className="w-6 h-6 text-orange-700" />
                        </div>
                      </div>
                      <div className="text-3xl font-black text-gray-900 mb-1">{aiAnalysis.marketEcosystem.logistics.total}</div>
                      <div className="text-sm font-bold text-gray-700">Logistics Partners</div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-2xl border-2 border-purple-200">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-purple-200 rounded-xl">
                          <Wallet className="w-6 h-6 text-purple-700" />
                        </div>
                      </div>
                      <div className="text-3xl font-black text-gray-900 mb-1">{aiAnalysis.marketEcosystem.finance.total}</div>
                      <div className="text-sm font-bold text-gray-700">Finance Options</div>
                    </div>
                  </div>

                  {/* Location Intelligence */}
                  {aiAnalysis.locationInsights.userLocation && (
                    <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 p-8 rounded-2xl border-2 border-emerald-200">
                      <h3 className="text-2xl font-black text-gray-900 mb-6 flex items-center">
                        <div className="p-2 bg-emerald-200 rounded-xl mr-3">
                          <MapPin className="w-6 h-6 text-emerald-700" />
                        </div>
                        Location Intelligence Dashboard
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="text-center p-6 bg-white rounded-xl border-2 border-emerald-100 shadow-sm">
                          <div className="text-sm font-bold text-gray-700 mb-2">Your Location</div>
                          <div className="font-black text-gray-900 text-lg">{aiAnalysis.locationInsights.userLocation}</div>
                        </div>
                        <div className="text-center p-6 bg-white rounded-xl border-2 border-emerald-100 shadow-sm">
                          <div className="text-sm font-bold text-gray-700 mb-2">Robot Location</div>
                          <div className="font-black text-gray-900 text-lg">{aiAnalysis.locationInsights.robotLocation}</div>
                        </div>
                        <div className="text-center p-6 bg-white rounded-xl border-2 border-emerald-100 shadow-sm">
                          <div className="text-sm font-bold text-gray-700 mb-2">Local Ecosystem Strength</div>
                          <div className="font-black text-emerald-700 text-2xl">
                            {aiAnalysis.locationInsights.proximityFactors.nearbySuppliers + 
                             aiAnalysis.locationInsights.proximityFactors.nearbyServices}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Analysis Report */}
                  <div className="bg-white border-2 border-gray-200 rounded-2xl p-8 shadow-sm">
                    <h3 className="text-2xl font-black text-gray-900 mb-6 flex items-center">
                      <div className="p-2 bg-gray-200 rounded-xl mr-3">
                        <BookOpen className="w-6 h-6 text-gray-700" />
                      </div>
                      Executive Analysis Report
                    </h3>
                    <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-8 rounded-xl border-2 border-gray-200">
                      <div className="prose prose-lg max-w-none text-gray-900 leading-relaxed whitespace-pre-wrap font-semibold">
                        {aiAnalysis.analysis}
                      </div>
                    </div>
                  </div>

                  {/* Strategic Recommendations */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-8 rounded-2xl border-2 border-green-200">
                      <div className="flex items-center mb-6">
                        <div className="p-3 bg-green-200 rounded-xl mr-4">
                          <CheckCircle className="w-6 h-6 text-green-700" />
                        </div>
                        <h4 className="font-black text-gray-900 text-lg">Immediate Actions</h4>
                      </div>
                      <ul className="space-y-4">
                        {aiAnalysis.actionableRecommendations.immediateActions.map((action, index) => (
                          <li key={index} className="flex items-start">
                            <div className="w-3 h-3 bg-green-500 rounded-full mt-2 mr-4 flex-shrink-0"></div>
                            <span className="font-semibold text-gray-800 leading-relaxed">{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-8 rounded-2xl border-2 border-blue-200">
                      <div className="flex items-center mb-6">
                        <div className="p-3 bg-blue-200 rounded-xl mr-4">
                          <DollarSign className="w-6 h-6 text-blue-700" />
                        </div>
                        <h4 className="font-black text-gray-900 text-lg">Cost Optimization</h4>
                      </div>
                      <ul className="space-y-4">
                        {aiAnalysis.actionableRecommendations.costOptimization.map((tip, index) => (
                          <li key={index} className="flex items-start">
                            <div className="w-3 h-3 bg-blue-500 rounded-full mt-2 mr-4 flex-shrink-0"></div>
                            <span className="font-semibold text-gray-800 leading-relaxed">{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-8 rounded-2xl border-2 border-amber-200">
                      <div className="flex items-center mb-6">
                        <div className="p-3 bg-amber-200 rounded-xl mr-4">
                          <Shield className="w-6 h-6 text-amber-700" />
                        </div>
                        <h4 className="font-black text-gray-900 text-lg">Risk Mitigation</h4>
                      </div>
                      <ul className="space-y-4">
                        {aiAnalysis.actionableRecommendations.riskMitigation.map((risk, index) => (
                          <li key={index} className="flex items-start">
                            <div className="w-3 h-3 bg-amber-500 rounded-full mt-2 mr-4 flex-shrink-0"></div>
                            <span className="font-semibold text-gray-800 leading-relaxed">{risk}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Resource Tabs */}
                  <Tabs defaultValue="parts" className="w-full">
                    <TabsList className="grid w-full grid-cols-4 bg-gray-100 p-2 rounded-2xl h-14">
                      <TabsTrigger value="parts" className="text-sm font-bold rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md">
                        Parts ({aiAnalysis.marketEcosystem.spareParts.suppliers.length})
                      </TabsTrigger>
                      <TabsTrigger value="services" className="text-sm font-bold rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md">
                        Services ({aiAnalysis.marketEcosystem.services.providers.length})
                      </TabsTrigger>
                      <TabsTrigger value="logistics" className="text-sm font-bold rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md">
                        Logistics ({aiAnalysis.marketEcosystem.logistics.providers.length})
                      </TabsTrigger>
                      <TabsTrigger value="finance" className="text-sm font-bold rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md">
                        Finance ({aiAnalysis.marketEcosystem.finance.providers.length})
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="parts" className="mt-8">
                      <div className="space-y-6 max-h-96 overflow-y-auto">
                        {aiAnalysis.marketEcosystem.spareParts.suppliers.map((part, index) => (
                          <Card key={index} className="border-2 border-gray-200 hover:border-blue-300 transition-all bg-white">
                            <CardContent className="p-6">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-3">
                                    <h5 className="font-black text-gray-900 text-lg">{part.name}</h5>
                                    <div className="flex items-center gap-3">
                                      <Badge className="font-bold px-3 py-1 bg-blue-50 text-blue-700 border-blue-200">
                                        {part.price}
                                      </Badge>
                                      <div className={`font-bold ${getProximityColor(part.proximity)} flex items-center`}>
                                        <MapPin className="w-4 h-4 mr-1" />
                                        {getProximityLabel(part.proximity)}
                                      </div>
                                    </div>
                                  </div>
                                  <p className="text-gray-800 font-bold">{part.company}</p>
                                  <p className="text-gray-600 font-medium">{part.location}</p>
                                  {part.partNumber && (
                                    <p className="text-blue-600 font-bold mt-2">Part #: {part.partNumber}</p>
                                  )}
                                  <div className="mt-3">
                                    <Progress value={part.proximity} className="h-2" />
                                    <div className="text-xs text-gray-600 mt-1 font-medium">Proximity: {part.proximity}%</div>
                                  </div>
                                </div>
                                <Button className="ml-6 bg-blue-600 hover:bg-blue-700 font-bold">
                                  <Wrench className="w-4 h-4 mr-2" />
                                  Contact
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="services" className="mt-8">
                      <div className="space-y-6 max-h-96 overflow-y-auto">
                        {aiAnalysis.marketEcosystem.services.providers.map((service, index) => (
                          <Card key={index} className="border-2 border-gray-200 hover:border-green-300 transition-all bg-white">
                            <CardContent className="p-6">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-3">
                                    <h5 className="font-black text-gray-900 text-lg">{service.name}</h5>
                                    <div className="flex items-center gap-3">
                                      <Badge className="font-bold px-3 py-1 bg-green-50 text-green-700 border-green-200">
                                        {service.priceRange || 'Contact for pricing'}
                                      </Badge>
                                      <div className={`font-bold ${getProximityColor(service.proximity)} flex items-center`}>
                                        <MapPin className="w-4 h-4 mr-1" />
                                        {getProximityLabel(service.proximity)}
                                      </div>
                                    </div>
                                  </div>
                                  <p className="text-gray-800 font-bold">{service.company}</p>
                                  <p className="text-gray-600 font-medium">{service.location}</p>
                                  <div className="flex items-center gap-2 mt-3">
                                    <Badge className="bg-green-100 text-green-800 border-green-200 font-bold">
                                      {service.serviceType}
                                    </Badge>
                                    {service.specializations?.slice(0, 2).map((spec, idx) => (
                                      <Badge key={idx} variant="outline" className="font-medium">
                                        {spec}
                                      </Badge>
                                    ))}
                                  </div>
                                  <div className="mt-3">
                                    <Progress value={service.proximity} className="h-2" />
                                    <div className="text-xs text-gray-600 mt-1 font-medium">Proximity: {service.proximity}%</div>
                                  </div>
                                </div>
                                <Button className="ml-6 bg-green-600 hover:bg-green-700 font-bold">
                                  <Settings className="w-4 h-4 mr-2" />
                                  Contact
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="logistics" className="mt-8">
                      <div className="space-y-6 max-h-96 overflow-y-auto">
                        {aiAnalysis.marketEcosystem.logistics.providers.map((provider, index) => (
                          <Card key={index} className="border-2 border-gray-200 hover:border-orange-300 transition-all bg-white">
                            <CardContent className="p-6">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-3">
                                    <h5 className="font-black text-gray-900 text-lg">{provider.company}</h5>
                                    <div className={`font-bold ${getProximityColor(provider.proximity)} flex items-center`}>
                                      <MapPin className="w-4 h-4 mr-1" />
                                      {getProximityLabel(provider.proximity)}
                                    </div>
                                  </div>
                                  <p className="text-gray-600 font-medium">{provider.location}</p>
                                  <p className="text-blue-600 font-bold">Region: {provider.serviceRegion}</p>
                                  <div className="flex items-center gap-2 mt-3">
                                    <Badge className="bg-orange-100 text-orange-800 border-orange-200 font-bold">
                                      {provider.logisticsType}
                                    </Badge>
                                    {provider.transportModes?.slice(0, 2).map((mode, idx) => (
                                      <Badge key={idx} variant="outline" className="font-medium">
                                        {mode}
                                      </Badge>
                                    ))}
                                    {provider.warehouseStorage && (
                                      <Badge className="bg-blue-50 text-blue-700 border-blue-200 font-bold">
                                        Warehouse
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="mt-3">
                                    <Progress value={provider.proximity} className="h-2" />
                                    <div className="text-xs text-gray-600 mt-1 font-medium">Proximity: {provider.proximity}%</div>
                                  </div>
                                </div>
                                <Button className="ml-6 bg-orange-600 hover:bg-orange-700 font-bold" disabled>
                                  <Truck className="w-4 h-4 mr-2" />
                                  Contact
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="finance" className="mt-8">
                      <div className="space-y-6 max-h-96 overflow-y-auto">
                        {aiAnalysis.marketEcosystem.finance.providers.map((provider, index) => (
                          <Card key={index} className="border-2 border-gray-200 hover:border-purple-300 transition-all bg-white">
                            <CardContent className="p-6">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-3">
                                    <h5 className="font-black text-gray-900 text-lg">{provider.company}</h5>
                                    <div className="flex items-center gap-3">
                                      {provider.governmentSchemeSupport && (
                                        <Badge className="bg-green-100 text-green-800 border-green-200 font-bold">
                                          <Star className="w-3 h-3 mr-1" />
                                          Govt. Schemes
                                        </Badge>
                                      )}
                                      <div className={`font-bold ${getProximityColor(provider.proximity)} flex items-center`}>
                                        <MapPin className="w-4 h-4 mr-1" />
                                        {getProximityLabel(provider.proximity)}
                                      </div>
                                    </div>
                                  </div>
                                  <p className="text-gray-600 font-medium">{provider.location}</p>
                                  <div className="flex items-center gap-2 mt-3">
                                    {provider.financeTypes?.slice(0, 3).map((type, idx) => (
                                      <Badge key={idx} className="bg-purple-100 text-purple-800 border-purple-200 font-bold">
                                        {type}
                                      </Badge>
                                    ))}
                                  </div>
                                  <div className="flex items-center gap-2 mt-2">
                                    {provider.targetAudience?.slice(0, 2).map((audience, idx) => (
                                      <Badge key={idx} variant="outline" className="font-medium">
                                        {audience}
                                      </Badge>
                                    ))}
                                  </div>
                                  <div className="mt-3">
                                    <Progress value={provider.proximity} className="h-2" />
                                    <div className="text-xs text-gray-600 mt-1 font-medium">Proximity: {provider.proximity}%</div>
                                  </div>
                                </div>
                                <Button className="ml-6 bg-purple-600 hover:bg-purple-700 font-bold" disabled>
                                  <DollarSign className="w-4 h-4 mr-2" />
                                  Contact
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </TabsContent>
                  </Tabs>
                </>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Quote Request Modal */}
      <Dialog open={showQuoteModal} onOpenChange={setShowQuoteModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-black text-gray-900">Request Quote</DialogTitle>
            <DialogDescription className="font-medium text-gray-700">
              Send a quote request to {robot?.profiles?.company_name || robot?.profiles?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Add any specific requirements or questions..."
              value={quoteMessage}
              onChange={(e) => setQuoteMessage(e.target.value)}
              rows={4}
              className="border-2 border-gray-200 font-medium"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuoteModal(false)} className="font-bold border-2">
              Cancel
            </Button>
            <Button onClick={sendQuoteEmail} className="font-bold">
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
