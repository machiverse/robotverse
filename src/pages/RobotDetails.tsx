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
import { Bot, MapPin, Building, Phone, Mail, User, ArrowLeft, Loader2, Wrench, Settings, DollarSign, Truck, Brain, TrendingUp, AlertCircle, CheckCircle, Star, Target, Zap, Heart, MessageCircle, PhoneCall, BookOpen, BarChart3, Users, Lightbulb, Shield, Wallet, FileText, Award, Clock, Globe } from "lucide-react";
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
  
  // Modal states for buttons
  const [showQuoteModal, setShowQuoteModal] = useState(false);
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
        
        // Check if robot is in watchlist (localStorage)
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

  // ✅ Fixed watchlist using localStorage instead of database
  const checkWatchlistStatus = (robotId: string) => {
    if (!user) return;
    
    const watchlist = JSON.parse(localStorage.getItem(`watchlist_${user.id}`) || '[]');
    setIsInWatchlist(watchlist.includes(robotId));
  };

  // ✅ Working Contact Seller - Call Phone Number
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

  // ✅ Working Request Quote - Send Email
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

  // ✅ Fixed Add to Watchlist using localStorage
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
      
      toast({
        title: "🎯 Smart Analysis Complete!",
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
            <span className="text-gray-600">Loading robot details...</span>
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
            <h3 className="text-lg font-semibold mb-2 text-gray-800">Robot Not Found</h3>
            <p className="text-gray-600 mb-4">{error || 'The requested robot could not be found.'}</p>
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
          className="mb-6 hover:bg-gray-100"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Robots
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Robot Images */}
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center mb-4 border">
                  {robot.images && robot.images.length > 0 ? (
                    <img 
                      src={robot.images[0]} 
                      alt={robot.name}
                      className="w-full h-full object-cover rounded-xl"
                    />
                  ) : (
                    <Bot className="w-24 h-24 text-gray-400" />
                  )}
                </div>
                {robot.images && robot.images.length > 1 && (
                  <div className="grid grid-cols-4 gap-3">
                    {robot.images.slice(1, 5).map((image, index) => (
                      <div key={index} className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center border">
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

            {/* Robot Information */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-3xl font-bold text-gray-800 mb-2">{robot.name}</CardTitle>
                    <p className="text-xl text-gray-600 font-medium">{robot.model}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-blue-600 mb-2">
                      {robot.price ? formatPrice(robot.price, robot.currency) : 'Price on Request'}
                    </div>
                    <Badge variant={robot.availability === 'available' ? 'default' : 'secondary'} className="text-sm px-3 py-1">
                      {robot.availability}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-blue-700 border-blue-200 bg-blue-50 px-3 py-1">
                      {robot.robot_type}
                    </Badge>
                    {robot.category_tags?.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="px-3 py-1">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  
                  <div className="flex items-center text-gray-600">
                    <MapPin className="w-5 h-5 mr-2 text-gray-500" />
                    <span className="font-medium">{robot.location}</span>
                  </div>

                  {robot.description && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100">
                      <div className="flex items-center mb-4">
                        <div className="p-2 bg-blue-100 rounded-lg mr-3">
                          <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <h4 className="font-bold text-gray-800 text-lg">Product Description</h4>
                      </div>
                      <div className="bg-white p-4 rounded-lg border border-blue-200">
                        <p className="text-gray-800 leading-relaxed font-medium">{robot.description}</p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-6 p-4 bg-gray-50 rounded-lg border">
                    <div>
                      <span className="font-semibold text-gray-800">Quantity Available:</span>
                      <p className="text-gray-600 text-lg">{robot.quantity} units</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Technical Specifications */}
            {robot.technical_specifications && Object.keys(robot.technical_specifications).length > 0 && (
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-gray-800">Technical Specifications</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Object.entries(robot.technical_specifications).map(([key, value]) => (
                      <div key={key} className="p-3 bg-gray-50 rounded-lg border">
                        <span className="font-semibold capitalize text-gray-800 block">
                          {key.replace(/_/g, ' ')}:
                        </span>
                        <p className="text-gray-700 mt-1">{String(value)}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ✅ ENHANCED AI ANALYSIS SECTION - IMPROVED UI/UX */}
            {user && (
              <div className="relative bg-white border-0 shadow-xl rounded-3xl overflow-hidden">
                {/* Enhanced Professional Header with Glassmorphism Effect */}
                <div className="relative bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-8">
                  {/* Background Pattern */}
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.1)_0%,transparent_50%)]"></div>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.1)_0%,transparent_50%)]"></div>
                  </div>
                  
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center space-x-6">
                      <div className="relative">
                        <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/20">
                          <BarChart3 className="w-10 h-10 text-white" />
                        </div>
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                          <Zap className="w-3 h-3 text-white" />
                        </div>
                      </div>
                      <div>
                        <h2 className="text-3xl font-bold text-white mb-2">AI Market Intelligence</h2>
                        <p className="text-slate-200 text-base max-w-2xl">
                          Advanced analytics • Supplier ecosystem mapping • Risk assessment • Strategic insights
                        </p>
                        <div className="flex items-center space-x-4 mt-3">
                          <div className="flex items-center space-x-2 text-slate-300">
                            <Clock className="w-4 h-4" />
                            <span className="text-sm">Real-time data</span>
                          </div>
                          <div className="flex items-center space-x-2 text-slate-300">
                            <Globe className="w-4 h-4" />
                            <span className="text-sm">Location-aware</span>
                          </div>
                          <div className="flex items-center space-x-2 text-slate-300">
                            <Award className="w-4 h-4" />
                            <span className="text-sm">Professional grade</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-white">
                      <div className="text-xs text-slate-300 uppercase tracking-wider mb-1">Intelligence Report</div>
                      <div className="text-2xl font-bold">#{robot.id.slice(0, 8)}</div>
                      <div className="text-xs text-slate-300 mt-1">{new Date().toLocaleDateString()}</div>
                    </div>
                  </div>
                </div>

                <div className="p-8">
                  {!aiAnalysis ? (
                    <div className="text-center py-16">
                      {/* Enhanced Hero Section */}
                      <div className="relative mb-8">
                        <div className="w-24 h-24 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl transform hover:scale-105 transition-transform duration-300">
                          <Brain className="w-12 h-12 text-white" />
                        </div>
                        <div className="absolute -top-3 -right-3 w-8 h-8 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full flex items-center justify-center shadow-lg">
                          <Zap className="w-4 h-4 text-white" />
                        </div>
                      </div>
                      
                      <h3 className="text-3xl font-bold text-gray-800 mb-4">Generate Professional Intelligence Report</h3>
                      <p className="text-gray-600 mb-10 max-w-3xl mx-auto text-lg leading-relaxed">
                        Unlock comprehensive market intelligence with AI-powered analysis including supplier ecosystem mapping, 
                        competitive pricing benchmarks, location-based recommendations, risk assessment, and strategic implementation roadmap.
                      </p>
                      
                      {/* Enhanced Feature Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-2xl border border-blue-200 transform hover:scale-105 transition-transform duration-200">
                          <Users className="w-8 h-8 text-blue-600 mx-auto mb-3" />
                          <h4 className="font-bold text-gray-800 mb-2">Supplier Network</h4>
                          <p className="text-sm text-gray-600">Comprehensive supplier mapping and analysis</p>
                        </div>
                        <div className="bg-gradient-to-br from-green-50 to-emerald-100 p-6 rounded-2xl border border-green-200 transform hover:scale-105 transition-transform duration-200">
                          <Target className="w-8 h-8 text-green-600 mx-auto mb-3" />
                          <h4 className="font-bold text-gray-800 mb-2">Location Intelligence</h4>
                          <p className="text-sm text-gray-600">Proximity-based matching and insights</p>
                        </div>
                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-2xl border border-purple-200 transform hover:scale-105 transition-transform duration-200">
                          <TrendingUp className="w-8 h-8 text-purple-600 mx-auto mb-3" />
                          <h4 className="font-bold text-gray-800 mb-2">Market Trends</h4>
                          <p className="text-sm text-gray-600">Real-time market dynamics and pricing</p>
                        </div>
                        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-2xl border border-orange-200 transform hover:scale-105 transition-transform duration-200">
                          <Shield className="w-8 h-8 text-orange-600 mx-auto mb-3" />
                          <h4 className="font-bold text-gray-800 mb-2">Risk Analysis</h4>
                          <p className="text-sm text-gray-600">Comprehensive risk assessment and mitigation</p>
                        </div>
                      </div>
                      
                      <Button 
                        onClick={handleAIAnalysis}
                        disabled={analysisLoading}
                        size="lg"
                        className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 text-white px-12 py-4 rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105 text-lg font-semibold"
                      >
                        {analysisLoading ? (
                          <>
                            <div className="flex items-center space-x-3">
                              <Loader2 className="w-6 h-6 animate-spin" />
                              <span>Generating Intelligence Report...</span>
                              <div className="flex space-x-1">
                                <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                                <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <BarChart3 className="w-6 h-6 mr-3" />
                            Generate Professional Intelligence Report
                            <Star className="w-5 h-5 ml-3" />
                          </>
                        )}
                      </Button>
                      
                      <p className="text-sm text-gray-500 mt-6">
                        Analysis typically takes 10-15 seconds • Powered by advanced AI models
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-10">
                      {/* Enhanced Executive Summary Cards */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-2xl border border-blue-200 transform hover:scale-105 transition-all duration-200">
                          <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-blue-200 rounded-xl">
                              <Wrench className="w-6 h-6 text-blue-700" />
                            </div>
                            <Badge className="bg-blue-200 text-blue-800 border-blue-300 text-xs px-2 py-1">
                              {aiAnalysis.marketEcosystem.spareParts.nearby} nearby
                            </Badge>
                          </div>
                          <div className="text-3xl font-bold text-gray-800 mb-1">{aiAnalysis.marketEcosystem.spareParts.total}</div>
                          <div className="text-sm font-semibold text-gray-600">Parts Suppliers</div>
                          <div className="text-xs text-blue-600 mt-2">Market Coverage: Excellent</div>
                        </div>

                        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-2xl border border-green-200 transform hover:scale-105 transition-all duration-200">
                          <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-green-200 rounded-xl">
                              <Settings className="w-6 h-6 text-green-700" />
                            </div>
                            <Badge className="bg-green-200 text-green-800 border-green-300 text-xs px-2 py-1">
                              {aiAnalysis.marketEcosystem.services.nearby} nearby
                            </Badge>
                          </div>
                          <div className="text-3xl font-bold text-gray-800 mb-1">{aiAnalysis.marketEcosystem.services.total}</div>
                          <div className="text-sm font-semibold text-gray-600">Service Providers</div>
                          <div className="text-xs text-green-600 mt-2">Support Network: Strong</div>
                        </div>

                        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-2xl border border-orange-200 transform hover:scale-105 transition-all duration-200">
                          <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-orange-200 rounded-xl">
                              <Truck className="w-6 h-6 text-orange-700" />
                            </div>
                          </div>
                          <div className="text-3xl font-bold text-gray-800 mb-1">{aiAnalysis.marketEcosystem.logistics.total}</div>
                          <div className="text-sm font-semibold text-gray-600">Logistics Partners</div>
                          <div className="text-xs text-orange-600 mt-2">Delivery Options: Available</div>
                        </div>

                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-2xl border border-purple-200 transform hover:scale-105 transition-all duration-200">
                          <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-purple-200 rounded-xl">
                              <Wallet className="w-6 h-6 text-purple-700" />
                            </div>
                          </div>
                          <div className="text-3xl font-bold text-gray-800 mb-1">{aiAnalysis.marketEcosystem.finance.total}</div>
                          <div className="text-sm font-semibold text-gray-600">Finance Options</div>
                          <div className="text-xs text-purple-600 mt-2">Funding: Multiple Sources</div>
                        </div>
                      </div>

                      {/* Enhanced Location Intelligence */}
                      {aiAnalysis.locationInsights.userLocation && (
                        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 p-8 rounded-2xl border border-emerald-200">
                          <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                            <div className="p-2 bg-emerald-200 rounded-xl mr-3">
                              <MapPin className="w-6 h-6 text-emerald-700" />
                            </div>
                            Location Intelligence Dashboard
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="text-center p-6 bg-white rounded-xl border border-emerald-100 shadow-sm">
                              <div className="text-sm font-bold text-gray-600 mb-2">Your Location</div>
                              <div className="font-bold text-gray-800 text-lg">{aiAnalysis.locationInsights.userLocation}</div>
                              <div className="text-emerald-600 text-sm mt-2">Buyer Location</div>
                            </div>
                            <div className="text-center p-6 bg-white rounded-xl border border-emerald-100 shadow-sm">
                              <div className="text-sm font-bold text-gray-600 mb-2">Robot Location</div>
                              <div className="font-bold text-gray-800 text-lg">{aiAnalysis.locationInsights.robotLocation}</div>
                              <div className="text-blue-600 text-sm mt-2">Seller Location</div>
                            </div>
                            <div className="text-center p-6 bg-white rounded-xl border border-emerald-100 shadow-sm">
                              <div className="text-sm font-bold text-gray-600 mb-2">Local Ecosystem Strength</div>
                              <div className="font-bold text-emerald-700 text-2xl">
                                {aiAnalysis.locationInsights.proximityFactors.nearbySuppliers + 
                                 aiAnalysis.locationInsights.proximityFactors.nearbyServices}
                              </div>
                              <div className="text-emerald-600 text-sm mt-2">Nearby Partners</div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Enhanced Analysis Report */}
                      <div className="bg-white border-2 border-gray-200 rounded-2xl p-8 shadow-sm">
                        <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                          <div className="p-2 bg-gray-200 rounded-xl mr-3">
                            <BookOpen className="w-6 h-6 text-gray-700" />
                          </div>
                          Executive Analysis Report
                        </h3>
                        <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-8 rounded-xl border border-gray-200">
                          <div className="prose prose-lg max-w-none text-gray-800 leading-relaxed whitespace-pre-wrap font-medium">
                            {aiAnalysis.analysis}
                          </div>
                        </div>
                      </div>

                      {/* Enhanced Strategic Recommendations */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-8 rounded-2xl border border-green-200">
                          <div className="flex items-center mb-6">
                            <div className="p-3 bg-green-200 rounded-xl mr-4">
                              <CheckCircle className="w-6 h-6 text-green-700" />
                            </div>
                            <h4 className="font-bold text-gray-800 text-lg">Immediate Actions</h4>
                          </div>
                          <ul className="space-y-4">
                            {aiAnalysis.actionableRecommendations.immediateActions.map((action, index) => (
                              <li key={index} className="flex items-start">
                                <div className="w-3 h-3 bg-green-500 rounded-full mt-2 mr-4 flex-shrink-0"></div>
                                <span className="font-medium text-gray-700 leading-relaxed">{action}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-8 rounded-2xl border border-blue-200">
                          <div className="flex items-center mb-6">
                            <div className="p-3 bg-blue-200 rounded-xl mr-4">
                              <DollarSign className="w-6 h-6 text-blue-700" />
                            </div>
                            <h4 className="font-bold text-gray-800 text-lg">Cost Optimization</h4>
                          </div>
                          <ul className="space-y-4">
                            {aiAnalysis.actionableRecommendations.costOptimization.map((tip, index) => (
                              <li key={index} className="flex items-start">
                                <div className="w-3 h-3 bg-blue-500 rounded-full mt-2 mr-4 flex-shrink-0"></div>
                                <span className="font-medium text-gray-700 leading-relaxed">{tip}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-8 rounded-2xl border border-amber-200">
                          <div className="flex items-center mb-6">
                            <div className="p-3 bg-amber-200 rounded-xl mr-4">
                              <Shield className="w-6 h-6 text-amber-700" />
                            </div>
                            <h4 className="font-bold text-gray-800 text-lg">Risk Mitigation</h4>
                          </div>
                          <ul className="space-y-4">
                            {aiAnalysis.actionableRecommendations.riskMitigation.map((risk, index) => (
                              <li key={index} className="flex items-start">
                                <div className="w-3 h-3 bg-amber-500 rounded-full mt-2 mr-4 flex-shrink-0"></div>
                                <span className="font-medium text-gray-700 leading-relaxed">{risk}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      
                      <Separator className="my-10" />
                      
                      {/* Enhanced Resource Tabs */}
                      <Tabs defaultValue="parts" className="w-full">
                        <TabsList className="grid w-full grid-cols-4 bg-gray-100 p-2 rounded-2xl h-14">
                          <TabsTrigger value="parts" className="text-sm font-semibold rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md">
                            Parts ({aiAnalysis.marketEcosystem.spareParts.suppliers.length})
                          </TabsTrigger>
                          <TabsTrigger value="services" className="text-sm font-semibold rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md">
                            Services ({aiAnalysis.marketEcosystem.services.providers.length})
                          </TabsTrigger>
                          <TabsTrigger value="logistics" className="text-sm font-semibold rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md">
                            Logistics ({aiAnalysis.marketEcosystem.logistics.providers.length})
                          </TabsTrigger>
                          <TabsTrigger value="finance" className="text-sm font-semibold rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md">
                            Finance ({aiAnalysis.marketEcosystem.finance.providers.length})
                          </TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="parts" className="mt-8">
                          <div className="space-y-6">
                            {aiAnalysis.marketEcosystem.spareParts.suppliers.map((part, index) => (
                              <Card key={index} className="border-2 border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300 bg-white rounded-2xl">
                                <CardContent className="p-8">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between mb-4">
                                        <h5 className="font-bold text-gray-800 text-xl">{part.name}</h5>
                                        <div className="flex items-center gap-4">
                                          <Badge variant="outline" className="text-base font-semibold px-4 py-2 bg-blue-50 text-blue-700 border-blue-200">
                                            {part.price}
                                          </Badge>
                                          <div className={`text-base font-semibold ${getProximityColor(part.proximity)} flex items-center`}>
                                            <MapPin className="w-5 h-5 mr-2" />
                                            {getProximityLabel(part.proximity)}
                                          </div>
                                        </div>
                                      </div>
                                      <p className="text-gray-700 font-semibold text-lg">{part.company}</p>
                                      <p className="text-gray-500">{part.location}</p>
                                      {part.partNumber && (
                                        <p className="text-blue-600 font-semibold mt-3">Part #: {part.partNumber}</p>
                                      )}
                                      <div className="mt-4">
                                        <div className="flex items-center justify-between mb-2">
                                          <span className="text-sm font-medium text-gray-600">Proximity Score</span>
                                          <span className="text-sm font-bold text-gray-800">{part.proximity}%</span>
                                        </div>
                                        <Progress value={part.proximity} className="h-3 rounded-full" />
                                      </div>
                                    </div>
                                    <Button size="lg" className="ml-8 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl" onClick={() => navigate('/parts')}>
                                      <Wrench className="w-5 h-5 mr-2" />
                                      Contact Supplier
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                            {aiAnalysis.marketEcosystem.spareParts.suppliers.length === 0 && (
                              <div className="text-center py-16 text-gray-500 bg-gray-50 rounded-2xl border-2 border-gray-200">
                                <Wrench className="w-20 h-20 mx-auto mb-6 opacity-30" />
                                <p className="text-xl font-semibold">No spare parts suppliers found</p>
                                <p className="text-base mt-2">Try expanding your search radius or contact us for assistance</p>
                              </div>
                            )}
                          </div>
                        </TabsContent>
                        
                        {/* Similar enhanced styling for other tabs... */}
                        <TabsContent value="services" className="mt-8">
                          <div className="space-y-6">
                            {aiAnalysis.marketEcosystem.services.providers.map((service, index) => (
                              <Card key={index} className="border-2 border-gray-200 hover:border-green-300 hover:shadow-lg transition-all duration-300 bg-white rounded-2xl">
                                <CardContent className="p-8">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between mb-4">
                                        <h5 className="font-bold text-gray-800 text-xl">{service.name}</h5>
                                        <div className="flex items-center gap-4">
                                          <Badge variant="outline" className="text-base font-semibold px-4 py-2 bg-green-50 text-green-700 border-green-200">
                                            {service.priceRange || 'Contact for pricing'}
                                          </Badge>
                                          <div className={`text-base font-semibold ${getProximityColor(service.proximity)} flex items-center`}>
                                            <MapPin className="w-5 h-5 mr-2" />
                                            {getProximityLabel(service.proximity)}
                                          </div>
                                        </div>
                                      </div>
                                      <p className="text-gray-700 font-semibold text-lg">{service.company}</p>
                                      <p className="text-gray-500">{service.location}</p>
                                      <div className="flex items-center gap-3 mt-4">
                                        <Badge className="text-sm bg-green-100 text-green-800 border-green-200 px-3 py-1">
                                          {service.serviceType}
                                        </Badge>
                                        {service.specializations?.slice(0, 2).map((spec, idx) => (
                                          <Badge key={idx} variant="outline" className="text-sm px-3 py-1">
                                            {spec}
                                          </Badge>
                                        ))}
                                      </div>
                                      <div className="mt-4">
                                        <div className="flex items-center justify-between mb-2">
                                          <span className="text-sm font-medium text-gray-600">Proximity Score</span>
                                          <span className="text-sm font-bold text-gray-800">{service.proximity}%</span>
                                        </div>
                                        <Progress value={service.proximity} className="h-3 rounded-full" />
                                      </div>
                                    </div>
                                    <Button size="lg" className="ml-8 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl" onClick={() => navigate('/services')}>
                                      <Settings className="w-5 h-5 mr-2" />
                                      Contact Provider
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                            {aiAnalysis.marketEcosystem.services.providers.length === 0 && (
                              <div className="text-center py-16 text-gray-500 bg-gray-50 rounded-2xl border-2 border-gray-200">
                                <Settings className="w-20 h-20 mx-auto mb-6 opacity-30" />
                                <p className="text-xl font-semibold">No service providers found</p>
                                <p className="text-base mt-2">Try expanding your search radius or contact us for assistance</p>
                              </div>
                            )}
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="logistics" className="mt-8">
                          <div className="space-y-6">
                            {aiAnalysis.marketEcosystem.logistics.providers.map((provider, index) => (
                              <Card key={index} className="border-2 border-gray-200 hover:border-orange-300 hover:shadow-lg transition-all duration-300 bg-white rounded-2xl">
                                <CardContent className="p-8">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between mb-4">
                                        <h5 className="font-bold text-gray-800 text-xl">{provider.company}</h5>
                                        <div className={`text-base font-semibold ${getProximityColor(provider.proximity)} flex items-center`}>
                                          <MapPin className="w-5 h-5 mr-2" />
                                          {getProximityLabel(provider.proximity)}
                                        </div>
                                      </div>
                                      <p className="text-gray-500">{provider.location}</p>
                                      <p className="text-blue-600 font-semibold">Service Region: {provider.serviceRegion}</p>
                                      <div className="flex items-center gap-3 mt-4">
                                        <Badge className="text-sm bg-orange-100 text-orange-800 border-orange-200 px-3 py-1">
                                          {provider.logisticsType}
                                        </Badge>
                                        {provider.transportModes?.map((mode, idx) => (
                                          <Badge key={idx} variant="outline" className="text-sm px-3 py-1">
                                            {mode}
                                          </Badge>
                                        ))}
                                        {provider.warehouseStorage && (
                                          <Badge variant="outline" className="text-sm bg-blue-50 text-blue-700 border-blue-200 px-3 py-1">
                                            Warehouse Available
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="mt-4">
                                        <div className="flex items-center justify-between mb-2">
                                          <span className="text-sm font-medium text-gray-600">Proximity Score</span>
                                          <span className="text-sm font-bold text-gray-800">{provider.proximity}%</span>
                                        </div>
                                        <Progress value={provider.proximity} className="h-3 rounded-full" />
                                      </div>
                                    </div>
                                    <Button size="lg" className="ml-8 bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-xl" disabled>
                                      <Truck className="w-5 h-5 mr-2" />
                                      Contact Logistics
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                            {aiAnalysis.marketEcosystem.logistics.providers.length === 0 && (
                              <div className="text-center py-16 text-gray-500 bg-gray-50 rounded-2xl border-2 border-gray-200">
                                <Truck className="w-20 h-20 mx-auto mb-6 opacity-30" />
                                <p className="text-xl font-semibold">No logistics providers found</p>
                                <p className="text-base mt-2">Try expanding your search radius or contact us for assistance</p>
                              </div>
                            )}
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="finance" className="mt-8">
                          <div className="space-y-6">
                            {aiAnalysis.marketEcosystem.finance.providers.map((provider, index) => (
                              <Card key={index} className="border-2 border-gray-200 hover:border-purple-300 hover:shadow-lg transition-all duration-300 bg-white rounded-2xl">
                                <CardContent className="p-8">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between mb-4">
                                        <h5 className="font-bold text-gray-800 text-xl">{provider.company}</h5>
                                        <div className="flex items-center gap-4">
                                          {provider.governmentSchemeSupport && (
                                            <Badge className="text-sm bg-green-100 text-green-800 border-green-200 px-3 py-1">
                                              <Star className="w-4 h-4 mr-1" />
                                              Govt. Schemes
                                            </Badge>
                                          )}
                                          <div className={`text-base font-semibold ${getProximityColor(provider.proximity)} flex items-center`}>
                                            <MapPin className="w-5 h-5 mr-2" />
                                            {getProximityLabel(provider.proximity)}
                                          </div>
                                        </div>
                                      </div>
                                      <p className="text-gray-500">{provider.location}</p>
                                      <div className="flex items-center gap-3 mt-4">
                                        {provider.financeTypes?.slice(0, 3).map((type, idx) => (
                                          <Badge key={idx} className="text-sm bg-purple-100 text-purple-800 border-purple-200 px-3 py-1">
                                            {type}
                                          </Badge>
                                        ))}
                                      </div>
                                      <div className="flex items-center gap-3 mt-2">
                                        {provider.targetAudience?.slice(0, 2).map((audience, idx) => (
                                          <Badge key={idx} variant="outline" className="text-sm px-3 py-1">
                                            {audience}
                                          </Badge>
                                        ))}
                                      </div>
                                      <div className="mt-4">
                                        <div className="flex items-center justify-between mb-2">
                                          <span className="text-sm font-medium text-gray-600">Proximity Score</span>
                                          <span className="text-sm font-bold text-gray-800">{provider.proximity}%</span>
                                        </div>
                                        <Progress value={provider.proximity} className="h-3 rounded-full" />
                                      </div>
                                    </div>
                                    <Button size="lg" className="ml-8 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl" disabled>
                                      <DollarSign className="w-5 h-5 mr-2" />
                                      Get Financing
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                            {aiAnalysis.marketEcosystem.finance.providers.length === 0 && (
                              <div className="text-center py-16 text-gray-500 bg-gray-50 rounded-2xl border-2 border-gray-200">
                                <DollarSign className="w-20 h-20 mx-auto mb-6 opacity-30" />
                                <p className="text-xl font-semibold">No finance providers found</p>
                                <p className="text-base mt-2">Try expanding your search radius or contact us for assistance</p>
                              </div>
                            )}
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Seller Information */}
            {user && robot.profiles && (
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-gray-800">Seller Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                      <User className="w-5 h-5 mr-3 text-gray-500" />
                      <span className="font-medium text-gray-800">{robot.profiles.full_name}</span>
                    </div>
                    {robot.profiles.company_name && (
                      <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                        <Building className="w-5 h-5 mr-3 text-gray-500" />
                        <span className="font-medium text-gray-800">{robot.profiles.company_name}</span>
                      </div>
                    )}
                    {robot.profiles.phone && (
                      <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                        <Phone className="w-5 h-5 mr-3 text-gray-500" />
                        <span className="font-medium text-gray-800">{robot.profiles.phone}</span>
                      </div>
                    )}
                    {robot.profiles.email && (
                      <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                        <Mail className="w-5 h-5 mr-3 text-gray-500" />
                        <span className="text-sm font-medium text-gray-800">{robot.profiles.email}</span>
                      </div>
                    )}
                    {robot.profiles.location && (
                      <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                        <MapPin className="w-5 h-5 mr-3 text-gray-500" />
                        <span className="font-medium text-gray-800">{robot.profiles.location}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {!user && (
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-gray-800">Login Required</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">
                    Please log in to view seller information and access AI analysis features.
                  </p>
                  <Button onClick={() => navigate('/auth')} className="w-full bg-blue-600 hover:bg-blue-700">
                    Login / Sign Up
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* ✅ WORKING CONTACT ACTIONS - BUTTON COLORS PRESERVED */}
            {user && (
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3" 
                      size="lg"
                      onClick={handleContactSeller}
                    >
                      <PhoneCall className="w-5 h-5 mr-2" />
                      Call Seller
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full border-blue-600 text-blue-600 hover:bg-blue-50 font-medium py-3"
                      onClick={handleRequestQuote}
                    >
                      <MessageCircle className="w-5 h-5 mr-2" />
                      Request Quote
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full border-red-600 text-red-600 hover:bg-red-50 font-medium py-3"
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

            {/* Quick Insights */}
            {aiAnalysis && (
              <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-gray-800 flex items-center">
                    <Lightbulb className="w-5 h-5 mr-2 text-blue-600" />
                    Quick Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                      <span className="font-medium text-gray-700">Market Position:</span>
                      <Badge className="bg-green-100 text-green-800 border-green-200">Competitive</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                      <span className="font-medium text-gray-700">Supply Chain:</span>
                      <Badge className={`${aiAnalysis.marketEcosystem.spareParts.nearby > 3 ? 'bg-green-100 text-green-800 border-green-200' : 'bg-yellow-100 text-yellow-800 border-yellow-200'}`}>
                        {aiAnalysis.marketEcosystem.spareParts.nearby > 3 ? 'Strong' : 'Limited'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                      <span className="font-medium text-gray-700">Local Support:</span>
                      <Badge className={`${aiAnalysis.marketEcosystem.services.nearby > 2 ? 'bg-green-100 text-green-800 border-green-200' : 'bg-yellow-100 text-yellow-800 border-yellow-200'}`}>
                        {aiAnalysis.marketEcosystem.services.nearby > 2 ? 'Available' : 'Limited'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* ✅ Quote Request Modal */}
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
