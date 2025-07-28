import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bot, MapPin, Building, Phone, Mail, User, ArrowLeft, Loader2, Wrench, Settings, DollarSign, Truck, Brain } from "lucide-react";
import EnhancedHeader from "@/components/EnhancedHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";

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

interface AIAnalysisResult {
  analysis: string;
  recommendations: {
    spareParts: any[];
    services: any[];
    logistics: any[];
    finance: any[];
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
      const { data, error } = await supabase.functions.invoke('robotverse-ai-analyze', {
        body: {
          robotId: robot.id,
          userId: user.id
        }
      });

      if (error) throw error;
      setAiAnalysis(data);
      
      toast({
        title: "AI Analysis Complete",
        description: "Smart recommendations generated successfully",
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

  const formatPrice = (price: number, currency: string) => {
    const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₹';
    return `${currencySymbol}${price.toLocaleString()}`;
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

            {/* AI Analysis Section */}
            {user && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Brain className="w-5 h-5 mr-2" />
                    Smart AI Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!aiAnalysis ? (
                    <div className="text-center py-6">
                      <p className="text-muted-foreground mb-4">
                        Get AI-powered recommendations for spare parts, services, financing, and logistics for this robot.
                      </p>
                      <Button 
                        onClick={handleAIAnalysis}
                        disabled={analysisLoading}
                        size="lg"
                      >
                        {analysisLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Brain className="w-4 h-4 mr-2" />
                            Smart AI Analysis – Show All Matching Resources
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div>
                        <h4 className="font-semibold mb-2">AI Analysis</h4>
                        <p className="text-muted-foreground whitespace-pre-wrap">{aiAnalysis.analysis}</p>
                      </div>
                      
                      <Separator />
                      
                      <Tabs defaultValue="parts" className="w-full">
                        <TabsList className="grid w-full grid-cols-4">
                          <TabsTrigger value="parts">Spare Parts ({aiAnalysis.recommendations.spareParts.length})</TabsTrigger>
                          <TabsTrigger value="services">Services ({aiAnalysis.recommendations.services.length})</TabsTrigger>
                          <TabsTrigger value="logistics">Logistics ({aiAnalysis.recommendations.logistics.length})</TabsTrigger>
                          <TabsTrigger value="finance">Finance ({aiAnalysis.recommendations.finance.length})</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="parts" className="mt-4">
                          <div className="space-y-3">
                            {aiAnalysis.recommendations.spareParts.map((part, index) => (
                              <Card key={index}>
                                <CardContent className="p-4">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <h5 className="font-medium">{part.name}</h5>
                                      <p className="text-sm text-muted-foreground">{part.profiles?.company_name}</p>
                                    </div>
                                    <Button size="sm" onClick={() => navigate('/parts')}>
                                      <Wrench className="w-4 h-4 mr-1" />
                                      View Spare Parts
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                            {aiAnalysis.recommendations.spareParts.length === 0 && (
                              <p className="text-muted-foreground text-center py-4">No matching spare parts found</p>
                            )}
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="services" className="mt-4">
                          <div className="space-y-3">
                            {aiAnalysis.recommendations.services.map((service, index) => (
                              <Card key={index}>
                                <CardContent className="p-4">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <h5 className="font-medium">{service.name}</h5>
                                      <p className="text-sm text-muted-foreground">{service.profiles?.company_name}</p>
                                    </div>
                                    <Button size="sm" onClick={() => navigate('/services')}>
                                      <Settings className="w-4 h-4 mr-1" />
                                      Find Service Providers
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                            {aiAnalysis.recommendations.services.length === 0 && (
                              <p className="text-muted-foreground text-center py-4">No matching services found</p>
                            )}
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="logistics" className="mt-4">
                          <div className="space-y-3">
                            {aiAnalysis.recommendations.logistics.map((provider, index) => (
                              <Card key={index}>
                                <CardContent className="p-4">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <h5 className="font-medium">{provider.company_name || provider.full_name}</h5>
                                      <p className="text-sm text-muted-foreground">{provider.location}</p>
                                    </div>
                                    <Button size="sm" disabled>
                                      <Truck className="w-4 h-4 mr-1" />
                                      Logistics Options
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                            {aiAnalysis.recommendations.logistics.length === 0 && (
                              <p className="text-muted-foreground text-center py-4">No logistics providers found</p>
                            )}
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="finance" className="mt-4">
                          <div className="space-y-3">
                            {aiAnalysis.recommendations.finance.map((provider, index) => (
                              <Card key={index}>
                                <CardContent className="p-4">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <h5 className="font-medium">{provider.company_name || provider.full_name}</h5>
                                      <p className="text-sm text-muted-foreground">{provider.location}</p>
                                    </div>
                                    <Button size="sm" disabled>
                                      <DollarSign className="w-4 h-4 mr-1" />
                                      Get Loan Support
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                            {aiAnalysis.recommendations.finance.length === 0 && (
                              <p className="text-muted-foreground text-center py-4">No finance providers found</p>
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default RobotDetails;