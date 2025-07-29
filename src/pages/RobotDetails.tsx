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
import { Bot, MapPin, Building, Phone, Mail, User, ArrowLeft, Loader2, Wrench, Settings, DollarSign, Truck, Brain, TrendingUp, AlertCircle, CheckCircle, Star, Target, Zap, Heart, MessageCircle, PhoneCall, BookOpen, BarChart3, Users, Lightbulb, Shield, Wallet } from "lucide-react";
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
      } catch (err) {
        console.error('Error fetching robot:', err);
        setError(err instanceof Error ? err.message : 'Failed to load robot details');
      } finally {
        setLoading(false);
      }
    };

    fetchRobot();
  }, [id]);

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

    const phoneNumber = robot.profiles.phone.replace(/\D/g, ''); // Remove non-digits
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

  // ✅ Working Add to Watchlist
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
      
      // Check if already in watchlist
      const { data: existing } = await supabase
        .from('watchlist')
        .select('id')
        .eq('user_id', user.id)
        .eq('robot_id', robot!.id)
        .single();

      if (existing) {
        toast({
          title: "Already in Watchlist",
          description: "This robot is already in your watchlist.",
        });
        return;
      }

      // Add to watchlist
      const { error } = await supabase
        .from('watchlist')
        .insert({
          user_id: user.id,
          robot_id: robot!.id,
          added_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: "Added to Watchlist",
        description: `${robot!.name} has been added to your watchlist.`,
      });
    } catch (error: any) {
      console.error('Error adding to watchlist:', error);
      toast({
        title: "Failed to Add",
        description: error.message || "Could not add to watchlist. Please try again.",
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
                    <div className="bg-gray-50 p-4 rounded-lg border">
                      <h4 className="font-semibold mb-3 text-gray-800">Description</h4>
                      <p className="text-gray-700 leading-relaxed">{robot.description}</p>
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

            {/* ✅ COMPLETELY REDESIGNED AI ANALYSIS SECTION */}
            {user && (
              <div className="bg-white border-0 shadow-xl rounded-2xl overflow-hidden">
                {/* Professional Header */}
                <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 p-8 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                        <BarChart3 className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold">Professional Market Intelligence</h2>
                        <p className="text-slate-300 text-sm mt-1">
                          Comprehensive analysis powered by advanced AI • Location-based insights • Market trends
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-400 uppercase tracking-wider">Analysis Report</div>
                      <div className="text-lg font-semibold">#{robot.id.slice(0, 8)}</div>
                    </div>
                  </div>
                </div>

                <div className="p-8">
                  {!aiAnalysis ? (
                    <div className="text-center py-12">
                      <div className="relative">
                        <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                          <Brain className="w-10 h-10 text-white" />
                        </div>
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                          <Zap className="w-3 h-3 text-white" />
                        </div>
                      </div>
                      
                      <h3 className="text-2xl font-bold text-gray-800 mb-3">Generate Intelligence Report</h3>
                      <p className="text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
                        Unlock comprehensive market intelligence including supplier analysis, pricing benchmarks, 
                        location-based recommendations, risk assessment, and strategic implementation guidance.
                      </p>
                      
                      <div className="bg-gradient-to-r from-blue-50 to-violet-50 p-6 rounded-xl mb-6 border border-blue-100">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <Users className="w-5 h-5 text-blue-600" />
                            <span className="text-sm font-medium text-gray-700">Supplier Network</span>
                          </div>
                          <div className="flex items-center justify-center space-x-2">
                            <Target className="w-5 h-5 text-green-600" />
                            <span className="text-sm font-medium text-gray-700">Location Matching</span>
                          </div>
                          <div className="flex items-center justify-center space-x-2">
                            <TrendingUp className="w-5 h-5 text-purple-600" />
                            <span className="text-sm font-medium text-gray-700">Market Trends</span>
                          </div>
                          <div className="flex items-center justify-center space-x-2">
                            <Shield className="w-5 h-5 text-orange-600" />
                            <span className="text-sm font-medium text-gray-700">Risk Analysis</span>
                          </div>
                        </div>
                      </div>
                      
                      <Button 
                        onClick={handleAIAnalysis}
                        disabled={analysisLoading}
                        size="lg"
                        className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                      >
                        {analysisLoading ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                            Generating Report...
                          </>
                        ) : (
                          <>
                            <BarChart3 className="w-5 h-5 mr-3" />
                            Generate Intelligence Report
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {/* Executive Summary Cards */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200">
                          <div className="flex items-center justify-between mb-2">
                            <Wrench className="w-6 h-6 text-blue-600" />
                            <span className="text-xs font-medium text-blue-600 bg-blue-200 px-2 py-1 rounded-full">
                              {aiAnalysis.marketEcosystem.spareParts.nearby} nearby
                            </span>
                          </div>
                          <div className="text-2xl font-bold text-gray-800">{aiAnalysis.marketEcosystem.spareParts.total}</div>
                          <div className="text-sm font-medium text-gray-600">Parts Suppliers</div>
                        </div>

                        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200">
                          <div className="flex items-center justify-between mb-2">
                            <Settings className="w-6 h-6 text-green-600" />
                            <span className="text-xs font-medium text-green-600 bg-green-200 px-2 py-1 rounded-full">
                              {aiAnalysis.marketEcosystem.services.nearby} nearby
                            </span>
                          </div>
                          <div className="text-2xl font-bold text-gray-800">{aiAnalysis.marketEcosystem.services.total}</div>
                          <div className="text-sm font-medium text-gray-600">Service Providers</div>
                        </div>

                        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl border border-orange-200">
                          <div className="flex items-center justify-between mb-2">
                            <Truck className="w-6 h-6 text-orange-600" />
                          </div>
                          <div className="text-2xl font-bold text-gray-800">{aiAnalysis.marketEcosystem.logistics.total}</div>
                          <div className="text-sm font-medium text-gray-600">Logistics Partners</div>
                        </div>

                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200">
                          <div className="flex items-center justify-between mb-2">
                            <Wallet className="w-6 h-6 text-purple-600" />
                          </div>
                          <div className="text-2xl font-bold text-gray-800">{aiAnalysis.marketEcosystem.finance.total}</div>
                          <div className="text-sm font-medium text-gray-600">Finance Options</div>
                        </div>
                      </div>

                      {/* Location Intelligence */}
                      {aiAnalysis.locationInsights.userLocation && (
                        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-6 rounded-xl border border-emerald-200">
                          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                            <MapPin className="w-5 h-5 mr-2 text-emerald-600" />
                            Location Intelligence
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="text-center p-4 bg-white rounded-lg border border-emerald-100">
                              <div className="text-sm font-medium text-gray-600 mb-1">Your Location</div>
                              <div className="font-semibold text-gray-800">{aiAnalysis.locationInsights.userLocation}</div>
                            </div>
                            <div className="text-center p-4 bg-white rounded-lg border border-emerald-100">
                              <div className="text-sm font-medium text-gray-600 mb-1">Robot Location</div>
                              <div className="font-semibold text-gray-800">{aiAnalysis.locationInsights.robotLocation}</div>
                            </div>
                            <div className="text-center p-4 bg-white rounded-lg border border-emerald-100">
                              <div className="text-sm font-medium text-gray-600 mb-1">Nearby Resources</div>
                              <div className="font-semibold text-emerald-600">
                                {aiAnalysis.locationInsights.proximityFactors.nearbySuppliers + 
                                 aiAnalysis.locationInsights.proximityFactors.nearbyServices} partners
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Professional Analysis Report */}
                      <div className="bg-white border border-gray-200 rounded-xl p-6">
                        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                          <BookOpen className="w-5 h-5 mr-2 text-gray-600" />
                          Executive Analysis Report
                        </h3>
                        <div className="prose prose-gray max-w-none">
                          <div className="bg-gray-50 p-6 rounded-lg border text-gray-800 leading-relaxed whitespace-pre-wrap font-medium">
                            {aiAnalysis.analysis}
                          </div>
                        </div>
                      </div>

                      {/* Strategic Recommendations */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200">
                          <div className="flex items-center mb-4">
                            <div className="p-2 bg-green-100 rounded-lg mr-3">
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            </div>
                            <h4 className="font-bold text-gray-800">Immediate Actions</h4>
                          </div>
                          <ul className="space-y-3">
                            {aiAnalysis.actionableRecommendations.immediateActions.map((action, index) => (
                              <li key={index} className="flex items-start text-sm text-gray-700">
                                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                                <span className="font-medium">{action}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200">
                          <div className="flex items-center mb-4">
                            <div className="p-2 bg-blue-100 rounded-lg mr-3">
                              <DollarSign className="w-5 h-5 text-blue-600" />
                            </div>
                            <h4 className="font-bold text-gray-800">Cost Optimization</h4>
                          </div>
                          <ul className="space-y-3">
                            {aiAnalysis.actionableRecommendations.costOptimization.map((tip, index) => (
                              <li key={index} className="flex items-start text-sm text-gray-700">
                                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                                <span className="font-medium">{tip}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-xl border border-amber-200">
                          <div className="flex items-center mb-4">
                            <div className="p-2 bg-amber-100 rounded-lg mr-3">
                              <Shield className="w-5 h-5 text-amber-600" />
                            </div>
                            <h4 className="font-bold text-gray-800">Risk Mitigation</h4>
                          </div>
                          <ul className="space-y-3">
                            {aiAnalysis.actionableRecommendations.riskMitigation.map((risk, index) => (
                              <li key={index} className="flex items-start text-sm text-gray-700">
                                <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                                <span className="font-medium">{risk}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      
                      <Separator className="my-8" />
                      
                      {/* Enhanced Resource Tabs */}
                      <Tabs defaultValue="parts" className="w-full">
                        <TabsList className="grid w-full grid-cols-4 bg-gray-100 p-1 rounded-xl">
                          <TabsTrigger value="parts" className="text-sm font-medium rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            Parts ({aiAnalysis.marketEcosystem.spareParts.suppliers.length})
                          </TabsTrigger>
                          <TabsTrigger value="services" className="text-sm font-medium rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            Services ({aiAnalysis.marketEcosystem.services.providers.length})
                          </TabsTrigger>
                          <TabsTrigger value="logistics" className="text-sm font-medium rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            Logistics ({aiAnalysis.marketEcosystem.logistics.providers.length})
                          </TabsTrigger>
                          <TabsTrigger value="finance" className="text-sm font-medium rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            Finance ({aiAnalysis.marketEcosystem.finance.providers.length})
                          </TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="parts" className="mt-6">
                          <div className="space-y-4">
                            {aiAnalysis.marketEcosystem.spareParts.suppliers.map((part, index) => (
                              <Card key={index} className="border border-gray-200 hover:shadow-md transition-shadow bg-white">
                                <CardContent className="p-6">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between mb-3">
                                        <h5 className="font-bold text-gray-800 text-lg">{part.name}</h5>
                                        <div className="flex items-center gap-3">
                                          <Badge variant="outline" className="text-sm font-medium px-3 py-1">
                                            {part.price}
                                          </Badge>
                                          <div className={`text-sm font-medium ${getProximityColor(part.proximity)}`}>
                                            <MapPin className="w-4 h-4 inline mr-1" />
                                            {getProximityLabel(part.proximity)}
                                          </div>
                                        </div>
                                      </div>
                                      <p className="text-gray-700 font-medium">{part.company}</p>
                                      <p className="text-gray-500 text-sm">{part.location}</p>
                                      {part.partNumber && (
                                        <p className="text-blue-600 text-sm font-medium mt-2">Part #: {part.partNumber}</p>
                                      )}
                                      <div className="mt-3">
                                        <Progress value={part.proximity} className="h-2" />
                                        <div className="text-xs text-gray-500 mt-1">Proximity Score: {part.proximity}%</div>
                                      </div>
                                    </div>
                                    <Button size="sm" className="ml-6 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => navigate('/parts')}>
                                      <Wrench className="w-4 h-4 mr-2" />
                                      Contact Supplier
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                            {aiAnalysis.marketEcosystem.spareParts.suppliers.length === 0 && (
                              <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl border border-gray-200">
                                <Wrench className="w-16 h-16 mx-auto mb-4 opacity-30" />
                                <p className="text-lg font-medium">No spare parts suppliers found</p>
                                <p className="text-sm mt-1">Try expanding your search radius or contact us for assistance</p>
                              </div>
                            )}
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="services" className="mt-6">
                          <div className="space-y-4">
                            {aiAnalysis.marketEcosystem.services.providers.map((service, index) => (
                              <Card key={index} className="border border-gray-200 hover:shadow-md transition-shadow bg-white">
                                <CardContent className="p-6">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between mb-3">
                                        <h5 className="font-bold text-gray-800 text-lg">{service.name}</h5>
                                        <div className="flex items-center gap-3">
                                          <Badge variant="outline" className="text-sm font-medium px-3 py-1">
                                            {service.priceRange || 'Contact for pricing'}
                                          </Badge>
                                          <div className={`text-sm font-medium ${getProximityColor(service.proximity)}`}>
                                            <MapPin className="w-4 h-4 inline mr-1" />
                                            {getProximityLabel(service.proximity)}
                                          </div>
                                        </div>
                                      </div>
                                      <p className="text-gray-700 font-medium">{service.company}</p>
                                      <p className="text-gray-500 text-sm">{service.location}</p>
                                      <div className="flex items-center gap-2 mt-3">
                                        <Badge className="text-sm bg-green-100 text-green-800 border-green-200">
                                          {service.serviceType}
                                        </Badge>
                                        {service.specializations?.slice(0, 2).map((spec, idx) => (
                                          <Badge key={idx} variant="outline" className="text-sm">
                                            {spec}
                                          </Badge>
                                        ))}
                                      </div>
                                      <div className="mt-3">
                                        <Progress value={service.proximity} className="h-2" />
                                        <div className="text-xs text-gray-500 mt-1">Proximity Score: {service.proximity}%</div>
                                      </div>
                                    </div>
                                    <Button size="sm" className="ml-6 bg-green-600 hover:bg-green-700 text-white" onClick={() => navigate('/services')}>
                                      <Settings className="w-4 h-4 mr-2" />
                                      Contact Provider
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                            {aiAnalysis.marketEcosystem.services.providers.length === 0 && (
                              <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl border border-gray-200">
                                <Settings className="w-16 h-16 mx-auto mb-4 opacity-30" />
                                <p className="text-lg font-medium">No service providers found</p>
                                <p className="text-sm mt-1">Try expanding your search radius or contact us for assistance</p>
                              </div>
                            )}
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="logistics" className="mt-6">
                          <div className="space-y-4">
                            {aiAnalysis.marketEcosystem.logistics.providers.map((provider, index) => (
                              <Card key={index} className="border border-gray-200 hover:shadow-md transition-shadow bg-white">
                                <CardContent className="p-6">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between mb-3">
                                        <h5 className="font-bold text-gray-800 text-lg">{provider.company}</h5>
                                        <div className={`text-sm font-medium ${getProximityColor(provider.proximity)}`}>
                                          <MapPin className="w-4 h-4 inline mr-1" />
                                          {getProximityLabel(provider.proximity)}
                                        </div>
                                      </div>
                                      <p className="text-gray-500 text-sm">{provider.location}</p>
                                      <p className="text-blue-600 text-sm font-medium">Service Region: {provider.serviceRegion}</p>
                                      <div className="flex items-center gap-2 mt-3">
                                        <Badge className="text-sm bg-orange-100 text-orange-800 border-orange-200">
                                          {provider.logisticsType}
                                        </Badge>
                                        {provider.transportModes?.map((mode, idx) => (
                                          <Badge key={idx} variant="outline" className="text-sm">
                                            {mode}
                                          </Badge>
                                        ))}
                                        {provider.warehouseStorage && (
                                          <Badge variant="outline" className="text-sm bg-blue-50 text-blue-700 border-blue-200">
                                            Warehouse Available
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="mt-3">
                                        <Progress value={provider.proximity} className="h-2" />
                                        <div className="text-xs text-gray-500 mt-1">Proximity Score: {provider.proximity}%</div>
                                      </div>
                                    </div>
                                    <Button size="sm" className="ml-6 bg-orange-600 hover:bg-orange-700 text-white" disabled>
                                      <Truck className="w-4 h-4 mr-2" />
                                      Contact Logistics
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                            {aiAnalysis.marketEcosystem.logistics.providers.length === 0 && (
                              <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl border border-gray-200">
                                <Truck className="w-16 h-16 mx-auto mb-4 opacity-30" />
                                <p className="text-lg font-medium">No logistics providers found</p>
                                <p className="text-sm mt-1">Try expanding your search radius or contact us for assistance</p>
                              </div>
                            )}
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="finance" className="mt-6">
                          <div className="space-y-4">
                            {aiAnalysis.marketEcosystem.finance.providers.map((provider, index) => (
                              <Card key={index} className="border border-gray-200 hover:shadow-md transition-shadow bg-white">
                                <CardContent className="p-6">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between mb-3">
                                        <h5 className="font-bold text-gray-800 text-lg">{provider.company}</h5>
                                        <div className="flex items-center gap-3">
                                          {provider.governmentSchemeSupport && (
                                            <Badge className="text-sm bg-green-100 text-green-800 border-green-200">
                                              <Star className="w-3 h-3 mr-1" />
                                              Govt. Schemes
                                            </Badge>
                                          )}
                                          <div className={`text-sm font-medium ${getProximityColor(provider.proximity)}`}>
                                            <MapPin className="w-4 h-4 inline mr-1" />
                                            {getProximityLabel(provider.proximity)}
                                          </div>
                                        </div>
                                      </div>
                                      <p className="text-gray-500 text-sm">{provider.location}</p>
                                      <div className="flex items-center gap-2 mt-3">
                                        {provider.financeTypes?.slice(0, 3).map((type, idx) => (
                                          <Badge key={idx} className="text-sm bg-purple-100 text-purple-800 border-purple-200">
                                            {type}
                                          </Badge>
                                        ))}
                                      </div>
                                      <div className="flex items-center gap-2 mt-2">
                                        {provider.targetAudience?.slice(0, 2).map((audience, idx) => (
                                          <Badge key={idx} variant="outline" className="text-sm">
                                            {audience}
                                          </Badge>
                                        ))}
                                      </div>
                                      <div className="mt-3">
                                        <Progress value={provider.proximity} className="h-2" />
                                        <div className="text-xs text-gray-500 mt-1">Proximity Score: {provider.proximity}%</div>
                                      </div>
                                    </div>
                                    <Button size="sm" className="ml-6 bg-purple-600 hover:bg-purple-700 text-white" disabled>
                                      <DollarSign className="w-4 h-4 mr-2" />
                                      Get Financing
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                            {aiAnalysis.marketEcosystem.finance.providers.length === 0 && (
                              <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl border border-gray-200">
                                <DollarSign className="w-16 h-16 mx-auto mb-4 opacity-30" />
                                <p className="text-lg font-medium">No finance providers found</p>
                                <p className="text-sm mt-1">Try expanding your search radius or contact us for assistance</p>
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

            {/* ✅ WORKING CONTACT ACTIONS */}
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
                        <Heart className="w-5 h-5 mr-2" />
                      )}
                      Add to Watchlist
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
