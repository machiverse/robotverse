// src/pages/RobotDetails.tsx

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Bot, MapPin, Building, Phone, Mail, User, ArrowLeft, Loader2, Wrench, Settings, DollarSign, Truck, Brain, Heart, MessageCircle, PhoneCall, X, ChevronLeft, ChevronRight, Maximize2, CheckCircle, Lightbulb } from "lucide-react";
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
  profiles: Pick<ProfileRow, 'full_name' | 'company_name' | 'phone' | 'email' | 'location'>;
}

// FIX: This interface now EXACTLY matches the JSON response from your refactored Edge Function.
interface AIAnalysisResult {
  robot: any;
  analysis: string;
  marketEcosystem: {
    spareParts: { suppliers: any[] };
    services: { providers: any[] };
    logistics: { providers: any[] };
    finance: { providers: any[] };
  };
  locationInsights: any;
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
              full_name, company_name, phone, email, location
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
      setAiAnalysis(data);
      
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

  // --- Other helper functions (handleContactSeller, handleRequestQuote, handleAddToWatchlist, etc.) remain the same ---
  // (Your existing functions for these are well-written and can be kept as they are)

  const handleContactSeller = () => {
    if (!robot?.profiles?.phone) {
      toast({ title: "Phone Number Not Available", variant: "destructive" });
      return;
    }
    window.open(`tel:${robot.profiles.phone.replace(/\D/g, '')}`, '_self');
  };

  const handleRequestQuote = () => {
    if (!robot?.profiles?.email) {
      toast({ title: "Email Not Available", variant: "destructive" });
      return;
    }
    setShowQuoteModal(true);
  };
  
  const sendQuoteEmail = () => { /* Your existing logic here */ };
  const handleAddToWatchlist = async () => { /* Your existing logic here */ };
  const nextImage = () => { /* Your existing logic here */ };
  const prevImage = () => { /* Your existing logic here */ };
  const formatPrice = (price: number, currency: string) => `₹${price.toLocaleString()}`; // Simplified for brevity

  // --- RENDER LOGIC ---

  if (loading) {
    return <div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  if (error || !robot) {
    return <div className="text-center py-12">Error: {error}</div>;
  }
  
  // A small, reusable component for recommendation cards to keep JSX clean
  const RecommendationCard = ({ item, type }: { item: any, type: string }) => {
    const icons: Record<string, React.ReactNode> = {
      parts: <Wrench className="w-4 h-4 mr-2" />,
      services: <Settings className="w-4 h-4 mr-2" />,
      logistics: <Truck className="w-4 h-4 mr-2" />,
      finance: <DollarSign className="w-4 h-4 mr-2" />,
    };
    const colors: Record<string, string> = {
      parts: 'border-blue-200',
      services: 'border-green-200',
      logistics: 'border-orange-200',
      finance: 'border-purple-200',
    };

    return (
      <Card className={`hover:shadow-md transition-shadow ${colors[type]}`}>
        <CardContent className="p-4">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <h5 className="font-semibold text-gray-800">{item.name || item.company_name}</h5>
              <p className="text-sm text-muted-foreground flex items-center"><MapPin className="w-3 h-3 mr-1.5" />{item.location || item.profiles?.location}</p>
              {item.proximity && (
                <Badge variant="outline">~{(100 - item.proximity).toFixed(0)}km away</Badge>
              )}
            </div>
            <Button size="sm" variant="ghost" className="text-primary">
              View
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
        <Button variant="ghost" onClick={() => navigate('/robots')} className="mb-6"><ArrowLeft className="w-4 h-4 mr-2" />Back to Marketplace</Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Image Gallery, Robot Info, Tech Specs cards... (Your existing JSX for these is good) */}
            
            {/* --- PROFESSIONAL AI ANALYSIS UI/UX --- */}
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
                        {analysisLoading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Analyzing...</> : <>Generate AI Analysis</>}
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
                      <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                        <h4 className="font-semibold text-lg mb-3 text-green-900 flex items-center">
                          <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
                          Actionable Recommendations
                        </h4>
                        <ul className="list-disc list-inside space-y-1 text-green-800">
                          {aiAnalysis.actionableRecommendations.immediateActions.map((action, i) => <li key={i}>{action}</li>)}
                          {aiAnalysis.actionableRecommendations.costOptimization.map((action, i) => <li key={i}>{action}</li>)}
                        </ul>
                      </div>

                      {/* Ecosystem Tabs */}
                      <Tabs defaultValue="parts" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 bg-gray-100">
                          <TabsTrigger value="parts">Spare Parts</TabsTrigger>
                          <TabsTrigger value="services">Services</TabsTrigger>
                          <TabsTrigger value="logistics">Logistics</TabsTrigger>
                          <TabsTrigger value="finance">Finance</TabsTrigger>
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
            {/* Seller Info and Contact Actions cards... (Your existing JSX is good) */}
            {user && robot.profiles && (
              <Card>
                <CardHeader>
                  <CardTitle>Seller Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                   {/* Contact Info */}
                </CardContent>
              </Card>
            )}
             {user && (
              <Card>
                <CardContent className="p-6 space-y-3">
                  <Button className="w-full" size="lg" onClick={handleContactSeller}><PhoneCall className="w-4 h-4 mr-2" />Contact Seller</Button>
                  <Button variant="outline" className="w-full" onClick={handleRequestQuote}><MessageCircle className="w-4 h-4 mr-2" />Request Quote</Button>
                  <Button variant="outline" className="w-full" onClick={handleAddToWatchlist} disabled={addingToWatchlist}>
                    {addingToWatchlist ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Heart className={`w-4 h-4 mr-2 ${isInWatchlist ? 'fill-current text-red-500' : ''}`} />}
                    {isInWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
                  </Button>
                </CardContent>
              </Card>
            )}

            {!user && ( /* Login prompt */ )}
          </div>
        </div>
      </div>

      {/* Modals (Your existing JSX for these is good) */}
      <Dialog open={showFullscreen} onOpenChange={setShowFullscreen}>{/* Fullscreen content */}</Dialog>
      <Dialog open={showQuoteModal} onOpenChange={setShowQuoteModal}>{/* Quote modal content */}</Dialog>
    </div>
  );
};

export default RobotDetails;
