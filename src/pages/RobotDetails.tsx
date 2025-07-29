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
import { Bot, MapPin, Building, Phone, Mail, User, ArrowLeft, Loader2, Wrench, Settings, DollarSign, Truck, Brain, TrendingUp, AlertCircle, CheckCircle, Star, Target, Zap, Heart, MessageCircle, PhoneCall, BookOpen, BarChart3, Users, Lightbulb, Shield, Wallet, FileText, Award, Clock, Globe, X, Maximize2, Eye, Activity, PieChart, LineChart } from "lucide-react";
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
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteMessage, setQuoteMessage] = useState('');
  const [addingToWatchlist, setAddingToWatchlist] = useState(false);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);

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

  // ✅ AI Analysis with Progress Animation (Image 2 Loading State)
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
      setAnalysisProgress(0);
      
      // Simulate progress animation like in Image 2
      const progressInterval = setInterval(() => {
        setAnalysisProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + Math.random() * 15;
        });
      }, 500);

      console.log('🤖 Starting AI analysis for robot:', robot.id);
      
      const { data, error } = await supabase.functions.invoke('roboverse-ai-analyze', {
        body: {
          robotId: robot.id,
          userId: user.id
        }
      });

      clearInterval(progressInterval);
      setAnalysisProgress(100);

      if (error) {
        console.error('❌ Edge function error:', error);
        throw error;
      }

      console.log('✅ AI Analysis response:', data);
      setAiAnalysis(data);
      
      // Small delay to show 100% completion
      setTimeout(() => {
        setShowAnalysisModal(true);
        setAnalysisLoading(false);
        setAnalysisProgress(0);
      }, 500);
      
      toast({
        title: "🎯 Analysis Complete!",
        description: `Found ${data.marketEcosystem.spareParts.total} suppliers, ${data.marketEcosystem.services.total} service providers`,
      });
    } catch (err) {
      console.error('❌ Error getting AI analysis:', err);
      setAnalysisLoading(false);
      setAnalysisProgress(0);
      toast({
        title: "Analysis Failed",
        description: err instanceof Error ? err.message : 'Failed to generate AI analysis',
        variant: "destructive",
      });
    }
  };

  const formatPrice = (price: number, currency: string) => {
    const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₹';
    return `${currencySymbol}${price.toLocaleString()}`;
  };

  const getProximityColor = (proximity: number) => {
    if (proximity >= 80) return "text-emerald-600";
    if (proximity >= 50) return "text-amber-600";
    return "text-rose-600";
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
          {/* Main Content - Matching Image 1 Layout */}
          <div className="lg:col-span-2 space-y-6">
            {/* Robot Images */}
            <Card className="shadow-sm border-gray-200">
              <CardContent className="p-6">
                <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                  {robot.images && robot.images.length > 0 ? (
                    <img 
                      src={robot.images[0]} 
                      alt={robot.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <Bot className="w-24 h-24 text-gray-400" />
                  )}
                </div>
                {robot.images && robot.images.length > 1 && (
                  <div className="grid grid-cols-4 gap-2">
                    {robot.images.slice(1, 5).map((image, index) => (
                      <div key={index} className="aspect-square bg-gray-100 rounded-md flex items-center justify-center">
                        <img 
                          src={image} 
                          alt={`${robot.name} ${index + 2}`}
                          className="w-full h-full object-cover rounded-md"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Robot Information - Clean Layout like Image 1 */}
            <Card className="shadow-sm border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{robot.name}</h1>
                    <p className="text-xl text-gray-600">{robot.model}</p>
                    <div className="flex items-center space-x-4 mt-3">
                      <Badge variant="outline" className="text-blue-700">
                        {robot.robot_type}
                      </Badge>
                      <div className="flex items-center text-gray-600">
                        <MapPin className="w-4 h-4 mr-1" />
                        <span>{robot.location}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-green-600 mb-2">
                      {robot.price ? formatPrice(robot.price, robot.currency) : 'Price on Request'}
                    </div>
                    <Badge variant={robot.availability === 'available' ? 'default' : 'secondary'}>
                      {robot.availability}
                    </Badge>
                  </div>
                </div>

                {robot.description && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3 text-gray-900">Description</h3>
                    <p className="text-gray-700 leading-relaxed">{robot.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-semibold text-gray-900">Quantity Available:</span>
                    <p className="text-gray-700">{robot.quantity} units</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Technical Specifications */}
            {robot.technical_specifications && Object.keys(robot.technical_specifications).length > 0 && (
              <Card className="shadow-sm border-gray-200">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-gray-900">Technical Specifications</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(robot.technical_specifications).map(([key, value]) => (
                      <div key={key} className="p-3 bg-gray-50 rounded-lg">
                        <span className="font-semibold capitalize text-gray-900 block">
                          {key.replace(/_/g, ' ')}:
                        </span>
                        <p className="text-gray-700 mt-1">{String(value)}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* AI Analysis Section - Matching Image 1 Design */}
            {user && (
              <Card className="shadow-sm border-gray-200">
                <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
                  <CardTitle className="text-xl font-bold flex items-center">
                    <Brain className="w-6 h-6 mr-2" />
                    AI Market Analysis & Recommendations
                  </CardTitle>
                  <p className="text-blue-100 text-sm">
                    Get comprehensive market insights and supplier recommendations
                  </p>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="mb-6">
                      <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <BarChart3 className="w-10 h-10 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        Smart Market Intelligence
                      </h3>
                      <p className="text-gray-600 max-w-2xl mx-auto">
                        Discover suppliers, service providers, logistics partners, and financing options 
                        specifically matched to this robot with location-based recommendations.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                      <div className="p-4 bg-blue-50 rounded-lg text-center">
                        <Wrench className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                        <div className="text-sm font-medium text-gray-700">Spare Parts</div>
                        <div className="text-xs text-gray-500">Suppliers</div>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg text-center">
                        <Settings className="w-6 h-6 text-green-600 mx-auto mb-2" />
                        <div className="text-sm font-medium text-gray-700">Services</div>
                        <div className="text-xs text-gray-500">Providers</div>
                      </div>
                      <div className="p-4 bg-orange-50 rounded-lg text-center">
                        <Truck className="w-6 h-6 text-orange-600 mx-auto mb-2" />
                        <div className="text-sm font-medium text-gray-700">Logistics</div>
                        <div className="text-xs text-gray-500">Partners</div>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-lg text-center">
                        <DollarSign className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                        <div className="text-sm font-medium text-gray-700">Finance</div>
                        <div className="text-xs text-gray-500">Options</div>
                      </div>
                    </div>

                    <Button 
                      onClick={handleAIAnalysis}
                      disabled={analysisLoading}
                      size="lg"
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3"
                    >
                      {analysisLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Analyzing Market...
                        </>
                      ) : (
                        <>
                          <Brain className="w-5 h-5 mr-2" />
                          Generate AI Analysis
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Seller Information */}
            {user && robot.profiles && (
              <Card className="shadow-sm border-gray-200">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-gray-900">Seller Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-2 text-gray-500" />
                      <span className="text-gray-900">{robot.profiles.full_name}</span>
                    </div>
                    {robot.profiles.company_name && (
                      <div className="flex items-center">
                        <Building className="w-4 h-4 mr-2 text-gray-500" />
                        <span className="text-gray-900">{robot.profiles.company_name}</span>
                      </div>
                    )}
                    {robot.profiles.phone && (
                      <div className="flex items-center">
                        <Phone className="w-4 h-4 mr-2 text-gray-500" />
                        <span className="text-gray-900">{robot.profiles.phone}</span>
                      </div>
                    )}
                    {robot.profiles.email && (
                      <div className="flex items-center">
                        <Mail className="w-4 h-4 mr-2 text-gray-500" />
                        <span className="text-sm text-gray-900">{robot.profiles.email}</span>
                      </div>
                    )}
                    {robot.profiles.location && (
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 mr-2 text-gray-500" />
                        <span className="text-gray-900">{robot.profiles.location}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {!user && (
              <Card className="shadow-sm border-gray-200">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-gray-900">Login Required</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">
                    Please log in to view seller information and access AI analysis features.
                  </p>
                  <Button onClick={() => navigate('/auth')} className="w-full">
                    Login / Sign Up
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Contact Actions */}
            {user && (
              <Card className="shadow-sm border-gray-200">
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700 text-white" 
                      size="lg"
                      onClick={handleContactSeller}
                    >
                      <PhoneCall className="w-4 h-4 mr-2" />
                      Call Seller
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

      {/* ✅ Loading Modal - Fixed TypeScript Error */}
      <Dialog open={analysisLoading} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Activity className="w-10 h-10 text-white animate-pulse" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              AI Analysis in Progress
            </h3>
            <p className="text-gray-600 mb-6">
              Analyzing market data and generating insights...
            </p>
            
            <div className="space-y-4">
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-blue-600 to-purple-600 h-3 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${analysisProgress}%` }}
                ></div>
              </div>
              <div className="text-sm font-medium text-gray-700">
                {analysisProgress < 30 && "🔍 Scanning market data..."}
                {analysisProgress >= 30 && analysisProgress < 60 && "📊 Analyzing suppliers..."}
                {analysisProgress >= 60 && analysisProgress < 90 && "🎯 Matching locations..."}
                {analysisProgress >= 90 && "✅ Finalizing insights..."}
              </div>
              <div className="text-lg font-bold text-blue-600">
                {Math.round(analysisProgress)}%
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ✅ AI Analysis Results Modal - Matching Image 3 Design */}
      <Dialog open={showAnalysisModal} onOpenChange={setShowAnalysisModal}>
        <DialogContent className="max-w-7xl max-h-[90vh] p-0">
          <DialogHeader className="bg-gradient-to-r from-blue-900 to-purple-900 text-white p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-white/20 rounded-lg">
                  <PieChart className="w-8 h-8 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-bold">Market Intelligence Report</DialogTitle>
                  <DialogDescription className="text-blue-100">
                    Comprehensive analysis for {robot?.name} • Generated {new Date().toLocaleDateString()}
                  </DialogDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowAnalysisModal(false)}
                className="text-white hover:bg-white/20"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </DialogHeader>
          
          <ScrollArea className="h-[calc(90vh-120px)]">
            <div className="p-6 space-y-6">
              {aiAnalysis && (
                <>
                  {/* Market Overview Dashboard */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                      <div className="flex items-center justify-between mb-2">
                        <Wrench className="w-8 h-8 text-blue-600" />
                        <Badge className="bg-blue-200 text-blue-800 text-xs">
                          {aiAnalysis.marketEcosystem.spareParts.nearby} nearby
                        </Badge>
                      </div>
                      <div className="text-2xl font-bold text-gray-900">
                        {aiAnalysis.marketEcosystem.spareParts.total}
                      </div>
                      <div className="text-sm text-gray-600">Parts Suppliers</div>
                    </Card>

                    <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                      <div className="flex items-center justify-between mb-2">
                        <Settings className="w-8 h-8 text-green-600" />
                        <Badge className="bg-green-200 text-green-800 text-xs">
                          {aiAnalysis.marketEcosystem.services.nearby} nearby
                        </Badge>
                      </div>
                      <div className="text-2xl font-bold text-gray-900">
                        {aiAnalysis.marketEcosystem.services.total}
                      </div>
                      <div className="text-sm text-gray-600">Service Providers</div>
                    </Card>

                    <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                      <div className="flex items-center justify-between mb-2">
                        <Truck className="w-8 h-8 text-orange-600" />
                      </div>
                      <div className="text-2xl font-bold text-gray-900">
                        {aiAnalysis.marketEcosystem.logistics.total}
                      </div>
                      <div className="text-sm text-gray-600">Logistics Partners</div>
                    </Card>

                    <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                      <div className="flex items-center justify-between mb-2">
                        <DollarSign className="w-8 h-8 text-purple-600" />
                      </div>
                      <div className="text-2xl font-bold text-gray-900">
                        {aiAnalysis.marketEcosystem.finance.total}
                      </div>
                      <div className="text-sm text-gray-600">Finance Options</div>
                    </Card>
                  </div>

                  {/* Location Intelligence */}
                  {aiAnalysis.locationInsights.userLocation && (
                    <Card className="p-6 bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200">
                      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                        <MapPin className="w-5 h-5 mr-2 text-emerald-600" />
                        Location Intelligence
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-white rounded-lg">
                          <div className="text-sm font-medium text-gray-600">Your Location</div>
                          <div className="font-bold text-gray-900">{aiAnalysis.locationInsights.userLocation}</div>
                        </div>
                        <div className="text-center p-4 bg-white rounded-lg">
                          <div className="text-sm font-medium text-gray-600">Robot Location</div>
                          <div className="font-bold text-gray-900">{aiAnalysis.locationInsights.robotLocation}</div>
                        </div>
                        <div className="text-center p-4 bg-white rounded-lg">
                          <div className="text-sm font-medium text-gray-600">Nearby Resources</div>
                          <div className="font-bold text-emerald-600">
                            {aiAnalysis.locationInsights.proximityFactors.nearbySuppliers + 
                             aiAnalysis.locationInsights.proximityFactors.nearbyServices} partners
                          </div>
                        </div>
                      </div>
                    </Card>
                  )}

                  {/* AI Analysis Report */}
                  <Card className="p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                      <BookOpen className="w-5 h-5 mr-2" />
                      Executive Analysis
                    </h3>
                    <div className="bg-gray-50 p-6 rounded-lg">
                      <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                        {aiAnalysis.analysis}
                      </div>
                    </div>
                  </Card>

                  {/* Recommendations */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                      <div className="flex items-center mb-4">
                        <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
                        <h4 className="font-bold text-gray-900">Immediate Actions</h4>
                      </div>
                      <ul className="space-y-2 text-sm">
                        {aiAnalysis.actionableRecommendations.immediateActions.map((action, index) => (
                          <li key={index} className="flex items-start">
                            <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                            {action}
                          </li>
                        ))}
                      </ul>
                    </Card>

                    <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                      <div className="flex items-center mb-4">
                        <DollarSign className="w-5 h-5 mr-2 text-blue-600" />
                        <h4 className="font-bold text-gray-900">Cost Optimization</h4>
                      </div>
                      <ul className="space-y-2 text-sm">
                        {aiAnalysis.actionableRecommendations.costOptimization.map((tip, index) => (
                          <li key={index} className="flex items-start">
                            <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </Card>

                    <Card className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
                      <div className="flex items-center mb-4">
                        <Shield className="w-5 h-5 mr-2 text-amber-600" />
                        <h4 className="font-bold text-gray-900">Risk Mitigation</h4>
                      </div>
                      <ul className="space-y-2 text-sm">
                        {aiAnalysis.actionableRecommendations.riskMitigation.map((risk, index) => (
                          <li key={index} className="flex items-start">
                            <span className="w-2 h-2 bg-amber-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                            {risk}
                          </li>
                        ))}
                      </ul>
                    </Card>
                  </div>

                  {/* Detailed Resource Tabs */}
                  <Tabs defaultValue="parts" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="parts">
                        Parts ({aiAnalysis.marketEcosystem.spareParts.suppliers.length})
                      </TabsTrigger>
                      <TabsTrigger value="services">
                        Services ({aiAnalysis.marketEcosystem.services.providers.length})
                      </TabsTrigger>
                      <TabsTrigger value="logistics">
                        Logistics ({aiAnalysis.marketEcosystem.logistics.providers.length})
                      </TabsTrigger>
                      <TabsTrigger value="finance">
                        Finance ({aiAnalysis.marketEcosystem.finance.providers.length})
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="parts" className="mt-6">
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {aiAnalysis.marketEcosystem.spareParts.suppliers.map((part, index) => (
                          <Card key={index} className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                  <h5 className="font-bold text-gray-900">{part.name}</h5>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline">{part.price}</Badge>
                                    <div className={`text-sm ${getProximityColor(part.proximity)}`}>
                                      <MapPin className="w-3 h-3 inline mr-1" />
                                      {getProximityLabel(part.proximity)}
                                    </div>
                                  </div>
                                </div>
                                <p className="text-sm text-gray-700">{part.company}</p>
                                <p className="text-xs text-gray-500">{part.location}</p>
                                {part.partNumber && (
                                  <p className="text-xs text-blue-600 mt-1">Part #: {part.partNumber}</p>
                                )}
                                <Progress value={part.proximity} className="h-1 mt-2" />
                              </div>
                              <Button size="sm" className="ml-4">
                                <Wrench className="w-4 h-4 mr-1" />
                                Contact
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="services" className="mt-6">
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {aiAnalysis.marketEcosystem.services.providers.map((service, index) => (
                          <Card key={index} className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                  <h5 className="font-bold text-gray-900">{service.name}</h5>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline">{service.priceRange || 'Contact for pricing'}</Badge>
                                    <div className={`text-sm ${getProximityColor(service.proximity)}`}>
                                      <MapPin className="w-3 h-3 inline mr-1" />
                                      {getProximityLabel(service.proximity)}
                                    </div>
                                  </div>
                                </div>
                                <p className="text-sm text-gray-700">{service.company}</p>
                                <p className="text-xs text-gray-500">{service.location}</p>
                                <div className="flex items-center gap-1 mt-2">
                                  <Badge variant="secondary" className="text-xs">{service.serviceType}</Badge>
                                  {service.specializations?.slice(0, 2).map((spec, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs">{spec}</Badge>
                                  ))}
                                </div>
                                <Progress value={service.proximity} className="h-1 mt-2" />
                              </div>
                              <Button size="sm" className="ml-4">
                                <Settings className="w-4 h-4 mr-1" />
                                Contact
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="logistics" className="mt-6">
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {aiAnalysis.marketEcosystem.logistics.providers.map((provider, index) => (
                          <Card key={index} className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                  <h5 className="font-bold text-gray-900">{provider.company}</h5>
                                  <div className={`text-sm ${getProximityColor(provider.proximity)}`}>
                                    <MapPin className="w-3 h-3 inline mr-1" />
                                    {getProximityLabel(provider.proximity)}
                                  </div>
                                </div>
                                <p className="text-xs text-gray-500">{provider.location}</p>
                                <p className="text-xs text-blue-600">Region: {provider.serviceRegion}</p>
                                <div className="flex items-center gap-1 mt-2">
                                  <Badge variant="secondary" className="text-xs">{provider.logisticsType}</Badge>
                                  {provider.transportModes?.map((mode, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs">{mode}</Badge>
                                  ))}
                                  {provider.warehouseStorage && (
                                    <Badge variant="outline" className="text-xs">Warehouse</Badge>
                                  )}
                                </div>
                                <Progress value={provider.proximity} className="h-1 mt-2" />
                              </div>
                              <Button size="sm" className="ml-4" disabled>
                                <Truck className="w-4 h-4 mr-1" />
                                Contact
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="finance" className="mt-6">
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {aiAnalysis.marketEcosystem.finance.providers.map((provider, index) => (
                          <Card key={index} className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                  <h5 className="font-bold text-gray-900">{provider.company}</h5>
                                  <div className="flex items-center gap-2">
                                    {provider.governmentSchemeSupport && (
                                      <Badge variant="outline" className="text-xs text-green-600">
                                        <Star className="w-3 h-3 mr-1" />
                                        Govt. Schemes
                                      </Badge>
                                    )}
                                    <div className={`text-sm ${getProximityColor(provider.proximity)}`}>
                                      <MapPin className="w-3 h-3 inline mr-1" />
                                      {getProximityLabel(provider.proximity)}
                                    </div>
                                  </div>
                                </div>
                                <p className="text-xs text-gray-500">{provider.location}</p>
                                <div className="flex items-center gap-1 mt-2">
                                  {provider.financeTypes?.slice(0, 3).map((type, idx) => (
                                    <Badge key={idx} variant="secondary" className="text-xs">{type}</Badge>
                                  ))}
                                </div>
                                <div className="flex items-center gap-1 mt-1">
                                  {provider.targetAudience?.slice(0, 2).map((audience, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs">{audience}</Badge>
                                  ))}
                                </div>
                                <Progress value={provider.proximity} className="h-1 mt-2" />
                              </div>
                              <Button size="sm" className="ml-4" disabled>
                                <DollarSign className="w-4 h-4 mr-1" />
                                Contact
                              </Button>
                            </div>
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
    </div>
  );
};

export default RobotDetails;
