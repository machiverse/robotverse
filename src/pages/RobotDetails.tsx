import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Bot, MapPin, Building, Phone, Mail, User, ArrowLeft, Loader2, Wrench, Settings, DollarSign, Truck, Brain, TrendingUp, AlertCircle, CheckCircle, Star, Target, Zap } from "lucide-react";
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

// ✅ Updated interface to match enhanced Edge Function response
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
    if (proximity >= 80) return "text-green-600";
    if (proximity >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getProximityLabel = (proximity: number) => {
    if (proximity >= 80) return "Very Close";
    if (proximity >= 50) return "Nearby";
    return "Distant";
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
        <Button 
          variant="ghost" 
          onClick={() => navigate('/robots')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Robots
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Robot Images */}
            <Card>
              <CardContent className="p-6">
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center mb-4">
                  {robot.images && robot.images.length > 0 ? (
                    <img 
                      src={robot.images[0]} 
                      alt={robot.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <Bot className="w-24 h-24 text-muted-foreground" />
                  )}
                </div>
                {robot.images && robot.images.length > 1 && (
                  <div className="grid grid-cols-4 gap-2">
                    {robot.images.slice(1, 5).map((image, index) => (
                      <div key={index} className="aspect-square bg-muted rounded-lg flex items-center justify-center">
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
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl">{robot.name}</CardTitle>
                    <p className="text-lg text-muted-foreground">{robot.model}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-primary">
                      {robot.price ? formatPrice(robot.price, robot.currency) : 'Price on Request'}
                    </div>
                    <Badge variant={robot.availability === 'available' ? 'default' : 'secondary'}>
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

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Quantity Available:</span>
                      <p>{robot.quantity}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Technical Specifications */}
            {robot.technical_specifications && Object.keys(robot.technical_specifications).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Technical Specifications</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(robot.technical_specifications).map(([key, value]) => (
                      <div key={key}>
                        <span className="font-medium capitalize">{key.replace(/_/g, ' ')}:</span>
                        <p className="text-muted-foreground">{String(value)}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Enhanced AI Analysis Section */}
            {user && (
              <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50/50 to-purple-50/50">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Brain className="w-5 h-5 mr-2 text-blue-600" />
                    🎯 Smart Market Analysis & Recommendations
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    AI-powered insights with location-based supplier matching and market analysis
                  </p>
                </CardHeader>
                <CardContent>
                  {!aiAnalysis ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Brain className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">Unlock Smart Insights</h3>
                      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                        Get comprehensive market analysis, location-based supplier matching, pricing insights, 
                        and personalized recommendations for spare parts, services, logistics, and financing.
                      </p>
                      <Button 
                        onClick={handleAIAnalysis}
                        disabled={analysisLoading}
                        size="lg"
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
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
                      {/* Market Overview */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-4 bg-white rounded-lg border">
                          <div className="text-2xl font-bold text-blue-600">{aiAnalysis.marketEcosystem.spareParts.total}</div>
                          <div className="text-sm text-muted-foreground">Spare Parts Suppliers</div>
                          <div className="text-xs text-green-600">{aiAnalysis.marketEcosystem.spareParts.nearby} nearby</div>
                        </div>
                        <div className="text-center p-4 bg-white rounded-lg border">
                          <div className="text-2xl font-bold text-green-600">{aiAnalysis.marketEcosystem.services.total}</div>
                          <div className="text-sm text-muted-foreground">Service Providers</div>
                          <div className="text-xs text-green-600">{aiAnalysis.marketEcosystem.services.nearby} nearby</div>
                        </div>
                        <div className="text-center p-4 bg-white rounded-lg border">
                          <div className="text-2xl font-bold text-orange-600">{aiAnalysis.marketEcosystem.logistics.total}</div>
                          <div className="text-sm text-muted-foreground">Logistics Partners</div>
                        </div>
                        <div className="text-center p-4 bg-white rounded-lg border">
                          <div className="text-2xl font-bold text-purple-600">{aiAnalysis.marketEcosystem.finance.total}</div>
                          <div className="text-sm text-muted-foreground">Finance Providers</div>
                        </div>
                      </div>

                      {/* Location Insights */}
                      {aiAnalysis.locationInsights.userLocation && (
                        <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
                          <CardHeader>
                            <CardTitle className="flex items-center text-green-700">
                              <MapPin className="w-5 h-5 mr-2" />
                              Location-Based Insights
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="font-medium">Your Location:</span>
                                <p className="text-muted-foreground">{aiAnalysis.locationInsights.userLocation}</p>
                              </div>
                              <div>
                                <span className="font-medium">Robot Location:</span>
                                <p className="text-muted-foreground">{aiAnalysis.locationInsights.robotLocation}</p>
                              </div>
                              <div>
                                <span className="font-medium">Local Ecosystem:</span>
                                <p className="text-green-600">
                                  {aiAnalysis.locationInsights.proximityFactors.nearbySuppliers + 
                                   aiAnalysis.locationInsights.proximityFactors.nearbyServices} nearby resources
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* AI Analysis */}
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center">
                          <TrendingUp className="w-4 h-4 mr-2" />
                          Comprehensive Market Analysis
                        </h4>
                        <div className="bg-white p-6 rounded-lg border">
                          <div className="prose prose-sm max-w-none">
                            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-muted-foreground">
                              {aiAnalysis.analysis}
                            </pre>
                          </div>
                        </div>
                      </div>

                      {/* Actionable Recommendations */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="border-green-200 bg-green-50">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm flex items-center text-green-700">
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Immediate Actions
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="space-y-1 text-xs">
                              {aiAnalysis.actionableRecommendations.immediateActions.map((action, index) => (
                                <li key={index} className="flex items-start">
                                  <span className="w-1 h-1 bg-green-600 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                                  {action}
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>

                        <Card className="border-blue-200 bg-blue-50">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm flex items-center text-blue-700">
                              <DollarSign className="w-4 h-4 mr-2" />
                              Cost Optimization
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="space-y-1 text-xs">
                              {aiAnalysis.actionableRecommendations.costOptimization.map((tip, index) => (
                                <li key={index} className="flex items-start">
                                  <span className="w-1 h-1 bg-blue-600 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                                  {tip}
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>

                        <Card className="border-red-200 bg-red-50">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm flex items-center text-red-700">
                              <AlertCircle className="w-4 h-4 mr-2" />
                              Risk Mitigation
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="space-y-1 text-xs">
                              {aiAnalysis.actionableRecommendations.riskMitigation.map((risk, index) => (
                                <li key={index} className="flex items-start">
                                  <span className="w-1 h-1 bg-red-600 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                                  {risk}
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      </div>
                      
                      <Separator />
                      
                      {/* Enhanced Recommendations Tabs */}
                      <Tabs defaultValue="parts" className="w-full">
                        <TabsList className="grid w-full grid-cols-4">
                          <TabsTrigger value="parts" className="text-xs">
                            Spare Parts ({aiAnalysis.marketEcosystem.spareParts.suppliers.length})
                          </TabsTrigger>
                          <TabsTrigger value="services" className="text-xs">
                            Services ({aiAnalysis.marketEcosystem.services.providers.length})
                          </TabsTrigger>
                          <TabsTrigger value="logistics" className="text-xs">
                            Logistics ({aiAnalysis.marketEcosystem.logistics.providers.length})
                          </TabsTrigger>
                          <TabsTrigger value="finance" className="text-xs">
                            Finance ({aiAnalysis.marketEcosystem.finance.providers.length})
                          </TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="parts" className="mt-6">
                          <div className="space-y-4">
                            {aiAnalysis.marketEcosystem.spareParts.suppliers.map((part, index) => (
                              <Card key={index} className="hover:shadow-md transition-shadow">
                                <CardContent className="p-4">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between mb-2">
                                        <h5 className="font-medium">{part.name}</h5>
                                        <div className="flex items-center gap-2">
                                          <Badge variant="outline" className="text-xs">
                                            {part.price}
                                          </Badge>
                                          <div className={`text-xs ${getProximityColor(part.proximity)}`}>
                                            <MapPin className="w-3 h-3 inline mr-1" />
                                            {getProximityLabel(part.proximity)}
                                          </div>
                                        </div>
                                      </div>
                                      <p className="text-sm text-muted-foreground">{part.company}</p>
                                      <p className="text-xs text-muted-foreground">{part.location}</p>
                                      {part.partNumber && (
                                        <p className="text-xs text-blue-600 mt-1">Part #: {part.partNumber}</p>
                                      )}
                                      <Progress value={part.proximity} className="h-1 mt-2" />
                                    </div>
                                    <Button size="sm" variant="outline" onClick={() => navigate('/parts')}>
                                      <Wrench className="w-4 h-4 mr-1" />
                                      Contact
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                            {aiAnalysis.marketEcosystem.spareParts.suppliers.length === 0 && (
                              <div className="text-center py-8 text-muted-foreground">
                                <Wrench className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p>No matching spare parts suppliers found</p>
                              </div>
                            )}
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="services" className="mt-6">
                          <div className="space-y-4">
                            {aiAnalysis.marketEcosystem.services.providers.map((service, index) => (
                              <Card key={index} className="hover:shadow-md transition-shadow">
                                <CardContent className="p-4">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between mb-2">
                                        <h5 className="font-medium">{service.name}</h5>
                                        <div className="flex items-center gap-2">
                                          <Badge variant="outline" className="text-xs">
                                            {service.priceRange || 'Contact for pricing'}
                                          </Badge>
                                          <div className={`text-xs ${getProximityColor(service.proximity)}`}>
                                            <MapPin className="w-3 h-3 inline mr-1" />
                                            {getProximityLabel(service.proximity)}
                                          </div>
                                        </div>
                                      </div>
                                      <p className="text-sm text-muted-foreground">{service.company}</p>
                                      <p className="text-xs text-muted-foreground">{service.location}</p>
                                      <div className="flex items-center gap-1 mt-2">
                                        <Badge variant="secondary" className="text-xs">{service.serviceType}</Badge>
                                        {service.specializations?.slice(0, 2).map((spec, idx) => (
                                          <Badge key={idx} variant="outline" className="text-xs">{spec}</Badge>
                                        ))}
                                      </div>
                                      <Progress value={service.proximity} className="h-1 mt-2" />
                                    </div>
                                    <Button size="sm" variant="outline" onClick={() => navigate('/services')}>
                                      <Settings className="w-4 h-4 mr-1" />
                                      Contact
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                            {aiAnalysis.marketEcosystem.services.providers.length === 0 && (
                              <div className="text-center py-8 text-muted-foreground">
                                <Settings className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p>No matching service providers found</p>
                              </div>
                            )}
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="logistics" className="mt-6">
                          <div className="space-y-4">
                            {aiAnalysis.marketEcosystem.logistics.providers.map((provider, index) => (
                              <Card key={index} className="hover:shadow-md transition-shadow">
                                <CardContent className="p-4">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between mb-2">
                                        <h5 className="font-medium">{provider.company}</h5>
                                        <div className={`text-xs ${getProximityColor(provider.proximity)}`}>
                                          <MapPin className="w-3 h-3 inline mr-1" />
                                          {getProximityLabel(provider.proximity)}
                                        </div>
                                      </div>
                                      <p className="text-xs text-muted-foreground">{provider.location}</p>
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
                                    <Button size="sm" variant="outline" disabled>
                                      <Truck className="w-4 h-4 mr-1" />
                                      Contact
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                            {aiAnalysis.marketEcosystem.logistics.providers.length === 0 && (
                              <div className="text-center py-8 text-muted-foreground">
                                <Truck className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p>No logistics providers found</p>
                              </div>
                            )}
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="finance" className="mt-6">
                          <div className="space-y-4">
                            {aiAnalysis.marketEcosystem.finance.providers.map((provider, index) => (
                              <Card key={index} className="hover:shadow-md transition-shadow">
                                <CardContent className="p-4">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between mb-2">
                                        <h5 className="font-medium">{provider.company}</h5>
                                        <div className="flex items-center gap-2">
                                          {provider.governmentSchemeSupport && (
                                            <Badge variant="outline" className="text-xs text-green-600">
                                              <Star className="w-3 h-3 mr-1" />
                                              Govt. Schemes
                                            </Badge>
                                          )}
                                          <div className={`text-xs ${getProximityColor(provider.proximity)}`}>
                                            <MapPin className="w-3 h-3 inline mr-1" />
                                            {getProximityLabel(provider.proximity)}
                                          </div>
                                        </div>
                                      </div>
                                      <p className="text-xs text-muted-foreground">{provider.location}</p>
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
                                    <Button size="sm" variant="outline" disabled>
                                      <DollarSign className="w-4 h-4 mr-1" />
                                      Contact
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                            {aiAnalysis.marketEcosystem.finance.providers.length === 0 && (
                              <div className="text-center py-8 text-muted-foreground">
                                <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p>No finance providers found</p>
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

            {/* Contact Actions */}
            {user && (
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <Button className="w-full" size="lg">
                      Contact Seller
                    </Button>
                    <Button variant="outline" className="w-full">
                      Request Quote
                    </Button>
                    <Button variant="outline" className="w-full">
                      Add to Watchlist
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Insights */}
            {aiAnalysis && (
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center text-blue-700">
                    <Target className="w-4 h-4 mr-2" />
                    Quick Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span>Market Position:</span>
                      <Badge variant="outline" className="text-xs">Competitive</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Supply Chain:</span>
                      <Badge variant="outline" className="text-xs">
                        {aiAnalysis.marketEcosystem.spareParts.nearby > 3 ? 'Strong' : 'Limited'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Local Support:</span>
                      <Badge variant="outline" className="text-xs">
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
