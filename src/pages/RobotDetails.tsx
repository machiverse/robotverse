import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Bot, MapPin, Building, Phone, Mail, User, ArrowLeft, Loader2, Wrench, Settings, DollarSign, Truck, Brain, TrendingUp, AlertCircle, CheckCircle, Star, Target, Zap, Heart, PhoneCall, Send } from "lucide-react";
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
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [watchlistLoading, setWatchlistLoading] = useState(false);

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
        
        // Check if robot is in user's watchlist
        if (user) {
          checkWatchlistStatus(data.id);
        }
      } catch (err) {
        console.error('Error fetching robot:', err);
        setError(err instanceof Error ? err.message : 'Failed to load robot details');
      } finally {
        setLoading(false);
      }
    };

    fetchRobot();
  }, [id, user]);

  // ✅ Check if robot is in watchlist
  const checkWatchlistStatus = async (robotId: string) => {
    if (!user) return;
    
    try {
      const { data } = await supabase
        .from('user_watchlist')
        .select('id')
        .eq('user_id', user.id)
        .eq('robot_id', robotId)
        .single();
        
      setIsInWatchlist(!!data);
    } catch (error) {
      // Robot not in watchlist
      setIsInWatchlist(false);
    }
  };

  // ✅ Handle contact seller (call phone number)
  const handleContactSeller = () => {
    if (robot?.profiles?.phone) {
      const phoneNumber = robot.profiles.phone.replace(/[^\d+]/g, '');
      window.open(`tel:${phoneNumber}`, '_self');
      
      toast({
        title: "📞 Calling Seller",
        description: `Calling ${robot.profiles.full_name} at ${robot.profiles.phone}`,
      });
    } else {
      toast({
        title: "Phone Not Available",
        description: "Seller's phone number is not available",
        variant: "destructive",
      });
    }
  };

  // ✅ Handle request quote (send email)
  const handleRequestQuote = () => {
    if (robot?.profiles?.email) {
      const subject = encodeURIComponent(`Quote Request for ${robot.name}`);
      const body = encodeURIComponent(`Hello ${robot.profiles.full_name},

I am interested in getting a quote for the following robot:

Robot: ${robot.name}
Model: ${robot.model}
Type: ${robot.robot_type}
Location: ${robot.location}

Please provide me with:
1. Best pricing details
2. Availability timeline
3. Installation and support options
4. Any bulk purchase discounts

Thank you!

Best regards,
${user?.user_metadata?.full_name || 'Interested Buyer'}`);

      const mailtoUrl = `mailto:${robot.profiles.email}?subject=${subject}&body=${body}`;
      window.open(mailtoUrl, '_blank');
      
      toast({
        title: "📧 Email Opened",
        description: `Quote request email opened for ${robot.profiles.company_name}`,
      });
    } else {
      toast({
        title: "Email Not Available",
        description: "Seller's email address is not available",
        variant: "destructive",
      });
    }
  };

  // ✅ Handle add to watchlist
  const handleToggleWatchlist = async () => {
    if (!user || !robot) {
      toast({
        title: "Login Required",
        description: "Please log in to add items to your watchlist",
        variant: "destructive",
      });
      return;
    }

    setWatchlistLoading(true);

    try {
      if (isInWatchlist) {
        // Remove from watchlist
        const { error } = await supabase
          .from('user_watchlist')
          .delete()
          .eq('user_id', user.id)
          .eq('robot_id', robot.id);

        if (error) throw error;

        setIsInWatchlist(false);
        toast({
          title: "❤️ Removed from Watchlist",
          description: `${robot.name} has been removed from your watchlist`,
        });
      } else {
        // Add to watchlist
        const { error } = await supabase
          .from('user_watchlist')
          .insert({
            user_id: user.id,
            robot_id: robot.id,
            created_at: new Date().toISOString()
          });

        if (error) throw error;

        setIsInWatchlist(true);
        toast({
          title: "💖 Added to Watchlist",
          description: `${robot.name} has been added to your watchlist`,
        });
      }
    } catch (error: any) {
      console.error('Watchlist error:', error);
      toast({
        title: "Watchlist Error",
        description: error.message || "Failed to update watchlist",
        variant: "destructive",
      });
    } finally {
      setWatchlistLoading(false);
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

  // ✅ Function to format AI analysis into concise sections
  const formatAIAnalysis = (analysis: string) => {
    const sections = analysis.split(/\*\*|\d+\.\s+\*\*/).filter(section => section.trim());
    return sections.slice(0, 4).map(section => section.trim().substring(0, 200) + '...');
  };

  const formatPrice = (price: number, currency: string) => {
    const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₹';
    return `${currencySymbol}${price.toLocaleString()}`;
  };

  const getProximityColor = (proximity: number) => {
    if (proximity >= 80) return "text-emerald-700";
    if (proximity >= 50) return "text-amber-600";
    return "text-red-600";
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
            <span className="text-gray-700">Loading robot details...</span>
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
          className="mb-6 text-gray-700 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Robots
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Robot Images */}
            <Card className="shadow-lg border-0">
              <CardContent className="p-6">
                <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center mb-4">
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
                  <div className="grid grid-cols-4 gap-2">
                    {robot.images.slice(1, 5).map((image, index) => (
                      <div key={index} className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
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
            <Card className="shadow-lg border-0">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-3xl text-gray-900">{robot.name}</CardTitle>
                    <p className="text-xl text-gray-600 mt-1">{robot.model}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-blue-600">
                      {robot.price ? formatPrice(robot.price, robot.currency) : 'Price on Request'}
                    </div>
                    <Badge variant={robot.availability === 'available' ? 'default' : 'secondary'} className="mt-2">
                      {robot.availability}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{robot.robot_type}</Badge>
                    {robot.category_tags?.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="bg-gray-100 text-gray-700">{tag}</Badge>
                    ))}
                  </div>
                  
                  <div className="flex items-center text-gray-600">
                    <MapPin className="w-5 h-5 mr-2" />
                    <span className="text-lg">{robot.location}</span>
                  </div>

                  {robot.description && (
                    <div>
                      <h4 className="font-semibold mb-2 text-gray-900">Description</h4>
                      <p className="text-gray-700 leading-relaxed">{robot.description}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-900">Quantity Available:</span>
                      <p className="text-gray-700">{robot.quantity}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Technical Specifications */}
            {robot.technical_specifications && Object.keys(robot.technical_specifications).length > 0 && (
              <Card className="shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="text-gray-900">Technical Specifications</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(robot.technical_specifications).map(([key, value]) => (
                      <div key={key}>
                        <span className="font-medium capitalize text-gray-900">{key.replace(/_/g, ' ')}:</span>
                        <p className="text-gray-700">{String(value)}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ✅ Professional AI Analysis Section */}
            {user && (
              <Card className="shadow-xl border-0 bg-gradient-to-r from-white to-blue-50">
                <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center text-xl">
                    <Brain className="w-6 h-6 mr-3" />
                    Smart Market Intelligence
                  </CardTitle>
                  <p className="text-blue-100 mt-2">
                    AI-powered insights with location-based supplier matching and market analysis
                  </p>
                </CardHeader>
                <CardContent className="p-8">
                  {!aiAnalysis ? (
                    <div className="text-center py-8">
                      <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                        <Brain className="w-10 h-10 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-3">Unlock Market Intelligence</h3>
                      <p className="text-gray-600 mb-8 max-w-md mx-auto leading-relaxed">
                        Get comprehensive market analysis, supplier matching, pricing insights, 
                        and personalized recommendations.
                      </p>
                      <Button 
                        onClick={handleAIAnalysis}
                        disabled={analysisLoading}
                        size="lg"
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-8 py-3 text-lg shadow-lg"
                      >
                        {analysisLoading ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Analyzing Market...
                          </>
                        ) : (
                          <>
                            <Zap className="w-5 h-5 mr-2" />
                            Generate Smart Analysis
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {/* ✅ Market Overview with Professional Design */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div className="text-center p-6 bg-white rounded-xl shadow-md border border-gray-100">
                          <div className="text-3xl font-bold text-blue-600 mb-1">{aiAnalysis.marketEcosystem.spareParts.total}</div>
                          <div className="text-sm font-medium text-gray-700">Spare Parts</div>
                          <div className="text-xs text-emerald-600 mt-1">{aiAnalysis.marketEcosystem.spareParts.nearby} nearby</div>
                        </div>
                        <div className="text-center p-6 bg-white rounded-xl shadow-md border border-gray-100">
                          <div className="text-3xl font-bold text-emerald-600 mb-1">{aiAnalysis.marketEcosystem.services.total}</div>
                          <div className="text-sm font-medium text-gray-700">Services</div>
                          <div className="text-xs text-emerald-600 mt-1">{aiAnalysis.marketEcosystem.services.nearby} nearby</div>
                        </div>
                        <div className="text-center p-6 bg-white rounded-xl shadow-md border border-gray-100">
                          <div className="text-3xl font-bold text-orange-600 mb-1">{aiAnalysis.marketEcosystem.logistics.total}</div>
                          <div className="text-sm font-medium text-gray-700">Logistics</div>
                        </div>
                        <div className="text-center p-6 bg-white rounded-xl shadow-md border border-gray-100">
                          <div className="text-3xl font-bold text-purple-600 mb-1">{aiAnalysis.marketEcosystem.finance.total}</div>
                          <div className="text-sm font-medium text-gray-700">Finance</div>
                        </div>
                      </div>

                      {/* ✅ Location Insights with Better Design */}
                      {aiAnalysis.locationInsights.userLocation && (
                        <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200 shadow-md">
                          <CardHeader>
                            <CardTitle className="flex items-center text-emerald-800">
                              <MapPin className="w-5 h-5 mr-2" />
                              Location Intelligence
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="font-medium text-gray-900">Your Location:</span>
                                <p className="text-gray-700">{aiAnalysis.locationInsights.userLocation}</p>
                              </div>
                              <div>
                                <span className="font-medium text-gray-900">Robot Location:</span>
                                <p className="text-gray-700">{aiAnalysis.locationInsights.robotLocation}</p>
                              </div>
                              <div>
                                <span className="font-medium text-gray-900">Local Ecosystem:</span>
                                <p className="text-emerald-700 font-medium">
                                  {aiAnalysis.locationInsights.proximityFactors.nearbySuppliers + 
                                   aiAnalysis.locationInsights.proximityFactors.nearbyServices} nearby resources
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* ✅ Concise AI Analysis */}
                      <div>
                        <h4 className="font-bold mb-4 flex items-center text-gray-900 text-lg">
                          <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
                          Key Market Insights
                        </h4>
                        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
                          <div className="space-y-4">
                            {formatAIAnalysis(aiAnalysis.analysis).map((section, index) => (
                              <div key={index} className="text-gray-700 text-sm leading-relaxed bg-gray-50 p-4 rounded-lg">
                                {section}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* ✅ Professional Action Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50 shadow-md">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm flex items-center text-emerald-800">
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Immediate Actions
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="space-y-2 text-xs">
                              {aiAnalysis.actionableRecommendations.immediateActions.slice(0, 3).map((action, index) => (
                                <li key={index} className="flex items-start text-gray-700">
                                  <span className="w-2 h-2 bg-emerald-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                                  {action}
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>

                        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-md">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm flex items-center text-blue-800">
                              <DollarSign className="w-4 h-4 mr-2" />
                              Cost Optimization
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="space-y-2 text-xs">
                              {aiAnalysis.actionableRecommendations.costOptimization.slice(0, 3).map((tip, index) => (
                                <li key={index} className="flex items-start text-gray-700">
                                  <span className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                                  {tip}
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>

                        <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 shadow-md">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm flex items-center text-amber-800">
                              <AlertCircle className="w-4 h-4 mr-2" />
                              Risk Mitigation
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="space-y-2 text-xs">
                              {aiAnalysis.actionableRecommendations.riskMitigation.slice(0, 3).map((risk, index) => (
                                <li key={index} className="flex items-start text-gray-700">
                                  <span className="w-2 h-2 bg-amber-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                                  {risk}
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      </div>
                      
                      <Separator className="my-8" />
                      
                      {/* ✅ Enhanced Recommendations Tabs */}
                      <Tabs defaultValue="parts" className="w-full">
                        <TabsList className="grid w-full grid-cols-4 bg-gray-100 rounded-xl p-1">
                          <TabsTrigger value="parts" className="text-xs rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            Spare Parts ({aiAnalysis.marketEcosystem.spareParts.suppliers.length})
                          </TabsTrigger>
                          <TabsTrigger value="services" className="text-xs rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            Services ({aiAnalysis.marketEcosystem.services.providers.length})
                          </TabsTrigger>
                          <TabsTrigger value="logistics" className="text-xs rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            Logistics ({aiAnalysis.marketEcosystem.logistics.providers.length})
                          </TabsTrigger>
                          <TabsTrigger value="finance" className="text-xs rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            Finance ({aiAnalysis.marketEcosystem.finance.providers.length})
                          </TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="parts" className="mt-6">
                          <div className="space-y-4">
                            {aiAnalysis.marketEcosystem.spareParts.suppliers.slice(0, 3).map((part, index) => (
                              <Card key={index} className="hover:shadow-lg transition-all duration-200 border-0 shadow-md">
                                <CardContent className="p-5">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between mb-2">
                                        <h5 className="font-semibold text-gray-900">{part.name}</h5>
                                        <div className="flex items-center gap-2">
                                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                            {part.price}
                                          </Badge>
                                          <div className={`text-xs font-medium ${getProximityColor(part.proximity)}`}>
                                            <MapPin className="w-3 h-3 inline mr-1" />
                                            {getProximityLabel(part.proximity)}
                                          </div>
                                        </div>
                                      </div>
                                      <p className="text-sm text-gray-700 font-medium">{part.company}</p>
                                      <p className="text-xs text-gray-500">{part.location}</p>
                                      {part.partNumber && (
                                        <p className="text-xs text-blue-600 mt-1 font-mono">Part #: {part.partNumber}</p>
                                      )}
                                      <Progress value={part.proximity} className="h-2 mt-3 bg-gray-100" />
                                    </div>
                                    <Button size="sm" className="ml-4 bg-blue-600 hover:bg-blue-700" onClick={() => navigate('/parts')}>
                                      <Wrench className="w-4 h-4 mr-1" />
                                      Contact
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                            {aiAnalysis.marketEcosystem.spareParts.suppliers.length === 0 && (
                              <div className="text-center py-12 text-gray-500">
                                <Wrench className="w-16 h-16 mx-auto mb-4 opacity-30" />
                                <p className="text-lg">No matching spare parts suppliers found</p>
                              </div>
                            )}
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="services" className="mt-6">
                          <div className="space-y-4">
                            {aiAnalysis.marketEcosystem.services.providers.slice(0, 3).map((service, index) => (
                              <Card key={index} className="hover:shadow-lg transition-all duration-200 border-0 shadow-md">
                                <CardContent className="p-5">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between mb-2">
                                        <h5 className="font-semibold text-gray-900">{service.name}</h5>
                                        <div className="flex items-center gap-2">
                                          <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                                            {service.priceRange || 'Contact for pricing'}
                                          </Badge>
                                          <div className={`text-xs font-medium ${getProximityColor(service.proximity)}`}>
                                            <MapPin className="w-3 h-3 inline mr-1" />
                                            {getProximityLabel(service.proximity)}
                                          </div>
                                        </div>
                                      </div>
                                      <p className="text-sm text-gray-700 font-medium">{service.company}</p>
                                      <p className="text-xs text-gray-500">{service.location}</p>
                                      <div className="flex items-center gap-2 mt-2">
                                        <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-700">{service.serviceType}</Badge>
                                        {service.specializations?.slice(0, 1).map((spec, idx) => (
                                          <Badge key={idx} variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">{spec}</Badge>
                                        ))}
                                      </div>
                                      <Progress value={service.proximity} className="h-2 mt-3 bg-gray-100" />
                                    </div>
                                    <Button size="sm" className="ml-4 bg-emerald-600 hover:bg-emerald-700" onClick={() => navigate('/services')}>
                                      <Settings className="w-4 h-4 mr-1" />
                                      Contact
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                            {aiAnalysis.marketEcosystem.services.providers.length === 0 && (
                              <div className="text-center py-12 text-gray-500">
                                <Settings className="w-16 h-16 mx-auto mb-4 opacity-30" />
                                <p className="text-lg">No matching service providers found</p>
                              </div>
                            )}
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="logistics" className="mt-6">
                          <div className="space-y-4">
                            {aiAnalysis.marketEcosystem.logistics.providers.slice(0, 3).map((provider, index) => (
                              <Card key={index} className="hover:shadow-lg transition-all duration-200 border-0 shadow-md">
                                <CardContent className="p-5">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between mb-2">
                                        <h5 className="font-semibold text-gray-900">{provider.company}</h5>
                                        <div className={`text-xs font-medium ${getProximityColor(provider.proximity)}`}>
                                          <MapPin className="w-3 h-3 inline mr-1" />
                                          {getProximityLabel(provider.proximity)}
                                        </div>
                                      </div>
                                      <p className="text-xs text-gray-500">{provider.location}</p>
                                      <p className="text-xs text-blue-600 font-medium">Region: {provider.serviceRegion}</p>
                                      <div className="flex items-center gap-1 mt-2">
                                        <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700">{provider.logisticsType}</Badge>
                                        {provider.transportModes?.slice(0, 2).map((mode, idx) => (
                                          <Badge key={idx} variant="outline" className="text-xs">{mode}</Badge>
                                        ))}
                                        {provider.warehouseStorage && (
                                          <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">Warehouse</Badge>
                                        )}
                                      </div>
                                      <Progress value={provider.proximity} className="h-2 mt-3 bg-gray-100" />
                                    </div>
                                    <Button size="sm" variant="outline" className="ml-4" disabled>
                                      <Truck className="w-4 h-4 mr-1" />
                                      Contact
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                            {aiAnalysis.marketEcosystem.logistics.providers.length === 0 && (
                              <div className="text-center py-12 text-gray-500">
                                <Truck className="w-16 h-16 mx-auto mb-4 opacity-30" />
                                <p className="text-lg">No logistics providers found</p>
                              </div>
                            )}
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="finance" className="mt-6">
                          <div className="space-y-4">
                            {aiAnalysis.marketEcosystem.finance.providers.slice(0, 3).map((provider, index) => (
                              <Card key={index} className="hover:shadow-lg transition-all duration-200 border-0 shadow-md">
                                <CardContent className="p-5">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between mb-2">
                                        <h5 className="font-semibold text-gray-900">{provider.company}</h5>
                                        <div className="flex items-center gap-2">
                                          {provider.governmentSchemeSupport && (
                                            <Badge variant="outline" className="text-xs text-emerald-700 bg-emerald-50 border-emerald-200">
                                              <Star className="w-3 h-3 mr-1" />
                                              Govt. Schemes
                                            </Badge>
                                          )}
                                          <div className={`text-xs font-medium ${getProximityColor(provider.proximity)}`}>
                                            <MapPin className="w-3 h-3 inline mr-1" />
                                            {getProximityLabel(provider.proximity)}
                                          </div>
                                        </div>
                                      </div>
                                      <p className="text-xs text-gray-500">{provider.location}</p>
                                      <div className="flex items-center gap-1 mt-2">
                                        {provider.financeTypes?.slice(0, 2).map((type, idx) => (
                                          <Badge key={idx} variant="secondary" className="text-xs bg-purple-100 text-purple-700">{type}</Badge>
                                        ))}
                                      </div>
                                      <div className="flex items-center gap-1 mt-1">
                                        {provider.targetAudience?.slice(0, 2).map((audience, idx) => (
                                          <Badge key={idx} variant="outline" className="text-xs">{audience}</Badge>
                                        ))}
                                      </div>
                                      <Progress value={provider.proximity} className="h-2 mt-3 bg-gray-100" />
                                    </div>
                                    <Button size="sm" variant="outline" className="ml-4" disabled>
                                      <DollarSign className="w-4 h-4 mr-1" />
                                      Contact
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                            {aiAnalysis.marketEcosystem.finance.providers.length === 0 && (
                              <div className="text-center py-12 text-gray-500">
                                <DollarSign className="w-16 h-16 mx-auto mb-4 opacity-30" />
                                <p className="text-lg">No finance providers found</p>
                              </div>
                            )}
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Seller Information */}
            {user && robot.profiles && (
              <Card className="shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="text-gray-900">Seller Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <User className="w-5 h-5 mr-3 text-gray-500" />
                      <span className="text-gray-900 font-medium">{robot.profiles.full_name}</span>
                    </div>
                    {robot.profiles.company_name && (
                      <div className="flex items-center">
                        <Building className="w-5 h-5 mr-3 text-gray-500" />
                        <span className="text-gray-700">{robot.profiles.company_name}</span>
                      </div>
                    )}
                    {robot.profiles.phone && (
                      <div className="flex items-center">
                        <Phone className="w-5 h-5 mr-3 text-gray-500" />
                        <span className="text-gray-700">{robot.profiles.phone}</span>
                      </div>
                    )}
                    {robot.profiles.email && (
                      <div className="flex items-center">
                        <Mail className="w-5 h-5 mr-3 text-gray-500" />
                        <span className="text-sm text-gray-700">{robot.profiles.email}</span>
                      </div>
                    )}
                    {robot.profiles.location && (
                      <div className="flex items-center">
                        <MapPin className="w-5 h-5 mr-3 text-gray-500" />
                        <span className="text-gray-700">{robot.profiles.location}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {!user && (
              <Card className="shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="text-gray-900">Login Required</CardTitle>
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

            {/* ✅ Working Contact Actions */}
            {user && (
              <Card className="shadow-lg border-0">
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
                      <Send className="w-5 h-5 mr-2" />
                      Request Quote
                    </Button>
                    <Button 
                      variant="outline" 
                      className={`w-full font-medium py-3 ${
                        isInWatchlist 
                          ? 'border-red-600 text-red-600 hover:bg-red-50' 
                          : 'border-pink-600 text-pink-600 hover:bg-pink-50'
                      }`}
                      onClick={handleToggleWatchlist}
                      disabled={watchlistLoading}
                    >
                      {watchlistLoading ? (
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
              <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-50 to-indigo-50">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center text-blue-800">
                    <Target className="w-4 h-4 mr-2" />
                    Quick Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">Market Position:</span>
                      <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-300">Competitive</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">Supply Chain:</span>
                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-300">
                        {aiAnalysis.marketEcosystem.spareParts.nearby > 3 ? 'Strong' : 'Limited'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">Local Support:</span>
                      <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-300">
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
    </div>
  );
};

export default RobotDetails;
