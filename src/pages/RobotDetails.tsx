import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Bot, MapPin, Building, Phone, Mail, User, ArrowLeft, Loader2, Wrench, Settings, DollarSign, Truck, Brain, Heart, MessageCircle, PhoneCall, X, ChevronLeft, ChevronRight, Maximize2, CheckCircle, Lightbulb, ExternalLink } from "lucide-react";
import EnhancedHeader from "@/components/EnhancedHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";

// --- TYPE DEFINITIONS ---
interface Robot {
  id: string; name: string | null; model: string | null; robot_type: string | null; price: number | null; currency: string | null; description: string | null; location: string | null; availability: string | null; images: string[] | null; technical_specifications: any; category_tags: string[] | null; quantity: number | null; seller_id: string | null; created_at: string; brand?: string | null; condition?: string | null; year_manufactured?: number | null; payload_capacity?: number | null; training_included?: boolean | null;
  profiles: { full_name: string | null; company_name: string | null; phone: string | null; mobile_number: string | null; email: string | null; location: string | null; } | null;
}
interface AIAnalysisResult {
  robot: any; analysis: string; marketEcosystem?: { spareParts?: { suppliers: any[] }; services?: { providers: any[] }; logistics?: { providers: any[] }; finance?: { providers: any[] }; }; locationInsights?: any;
  actionableRecommendations?: { immediateActions?: string[]; costOptimization?: string[]; riskMitigation?: string[]; };
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
        const { data, error: fetchError } = await supabase.from('robots').select(`*, profiles!robots_seller_id_fkey (full_name, company_name, phone, mobile_number, email, location)`).eq('id', id).single();
        if (fetchError) throw fetchError;
        setRobot(data as Robot);
        if (user) {
          const watchlist = JSON.parse(localStorage.getItem(`watchlist_${user.id}`) || '[]');
          setIsInWatchlist(watchlist.includes(data.id));
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load robot details');
      } finally {
        setLoading(false);
      }
    };
    fetchRobotAndWatchlist();
  }, [id, user]);

  const handleAIAnalysis = async () => {
    if (!robot || !user) {
      toast({ title: "Login Required", variant: "destructive" });
      return;
    }
    try {
      setAnalysisLoading(true);
      const { data, error: funcError } = await supabase.functions.invoke('roboverse-ai-analyze', { body: { robotId: robot.id, userId: user.id } });
      if (funcError) throw funcError;
      setAiAnalysis(data as AIAnalysisResult);
      toast({ title: "AI Analysis Complete" });
    } catch (err: any) {
      toast({ title: "Analysis Failed", description: err.message, variant: "destructive" });
      setAiAnalysis(null);
    } finally {
      setAnalysisLoading(false);
    }
  };

  // FIX: Added extra safety checks at the top of the function
  const handleContactSeller = () => {
    if (!robot || !robot.profiles) {
      toast({ title: "Seller information not available.", variant: "destructive" });
      return;
    }
    const { phone, mobile_number, full_name, company_name } = robot.profiles;
    if (!phone && !mobile_number) {
      toast({ title: "Contact Info Not Available", description: "Seller's phone number is not provided.", variant: "destructive" });
      return;
    }
    const phoneNumber = (phone || mobile_number || '').replace(/\D/g, '');
    window.open(`tel:${phoneNumber}`, '_self');
    toast({ title: "Initiating Call", description: `Calling ${full_name || company_name}` });
  };

  // FIX: Added extra safety checks at the top of the function
  const handleRequestQuote = () => {
    if (!robot || !robot.profiles || !robot.profiles.email) {
      toast({ title: "Email Not Available", description: "Seller's email address is not provided.", variant: "destructive" });
      return;
    }
    setShowQuoteModal(true);
  };

  const sendQuoteEmail = () => {
    if (!robot || !robot.profiles || !robot.profiles.email) return;
    const subject = `Quote Request for ${robot.name} - ${robot.model}`;
    const body = `Dear ${robot.profiles.full_name || robot.profiles.company_name},\n\nI am interested in the following robot:\nRobot: ${robot.name}\nModel: ${robot.model}\n\n${quoteMessage}\n\nPlease provide me with a quote and availability.\n\nBest regards,\n${user?.user_metadata?.full_name || 'Interested Buyer'}`;
    const mailtoLink = `mailto:${robot.profiles.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoLink, '_blank');
    setShowQuoteModal(false);
    setQuoteMessage('');
    toast({ title: "Quote Request Sent" });
  };

  const handleAddToWatchlist = async () => {
    if (!user || !robot) return;
    try {
      setAddingToWatchlist(true);
      const watchlistKey = `watchlist_${user.id}`;
      const watchlist = JSON.parse(localStorage.getItem(watchlistKey) || '[]');
      if (isInWatchlist) {
        const newWatchlist = watchlist.filter((id: string) => id !== robot.id);
        localStorage.setItem(watchlistKey, JSON.stringify(newWatchlist));
        setIsInWatchlist(false);
        toast({ title: "Removed from Watchlist" });
      } else {
        watchlist.push(robot.id);
        localStorage.setItem(watchlistKey, JSON.stringify(watchlist));
        setIsInWatchlist(true);
        toast({ title: "Added to Watchlist" });
      }
    } finally {
      setAddingToWatchlist(false);
    }
  };

  const nextImage = () => { if (robot?.images && robot.images.length > 1) setCurrentImageIndex((p) => (p + 1) % robot.images!.length); };
  const prevImage = () => { if (robot?.images && robot.images.length > 1) setCurrentImageIndex((p) => (p - 1 + robot.images!.length) % robot.images!.length); };
  const formatPrice = (p: number | null, c: string | null) => p === null ? 'Price on request' : `${c === 'USD' ? '$' : '₹'}${p.toLocaleString()}`;

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (error || !robot) return <div className="py-12 text-center"><h3>Robot Not Found</h3><p>{error}</p></div>;

  const RecommendationCard = ({ item, type }: { item: any; type: string }) => {
    const iconMap = { parts: <Wrench className="h-4 w-4 text-blue-600" />, services: <Settings className="h-4 w-4 text-green-600" />, logistics: <Truck className="h-4 w-4 text-orange-600" />, finance: <DollarSign className="h-4 w-4 text-purple-600" /> };
    const colorMap = { parts: 'border-blue-200', services: 'border-green-200', logistics: 'border-orange-200', finance: 'border-purple-200' };
    const name = item.name || item.company || item.company_name;
    const location = item.profiles?.location || item.location;
    return (
      <Card className={colorMap[type]}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-1">
              <h5 className="flex items-center gap-2 font-semibold">{iconMap[type]} {name}</h5>
              {location && <p className="flex items-center gap-2 pl-6 text-sm text-muted-foreground"><MapPin className="h-3 w-3" />{location}</p>}
              {item.proximity !== undefined && <Badge variant="outline" className="ml-6">{item.proximity}% Proximity</Badge>}
            </div>
            <Button size="sm" variant="ghost"><ExternalLink className="h-4 w-4" /></Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <EnhancedHeader />
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate('/robots')} className="mb-6"><ArrowLeft className="h-4 w-4 mr-2" />Back to Robots</Button>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            <Card><CardContent className="p-6">...</CardContent></Card>
            <Card><CardHeader>...</CardHeader>...</Card>
            {user && (
              <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50/80 to-purple-50/80">
                <CardHeader className="rounded-t-lg bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white"><CardTitle className="flex items-center gap-3 text-2xl font-bold"><Brain className="h-7 w-7" />Smart Market Intelligence</CardTitle></CardHeader>
                <CardContent className="p-6">
                  {!aiAnalysis ? (
                    <div className="py-6 text-center"><Button onClick={handleAIAnalysis} disabled={analysisLoading} size="lg">{analysisLoading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Analyzing...</> : 'Generate AI Analysis'}</Button></div>
                  ) : (
                    <div className="space-y-6">
                      <div className="rounded-lg border bg-white p-6 shadow-sm"><h4 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900"><Lightbulb className="h-5 w-5 text-yellow-500" />Executive Summary</h4><p className="leading-relaxed text-gray-700 whitespace-pre-wrap">{aiAnalysis.analysis}</p></div>
                      
                      {/* FIX: Use optional chaining to prevent crash if actionableRecommendations is missing */}
                      {aiAnalysis.actionableRecommendations && (
                        <div className="rounded-lg border border-green-200 bg-green-50 p-6">
                          <h4 className="mb-3 flex items-center gap-2 text-lg font-semibold text-green-900"><CheckCircle className="h-5 w-5 text-green-600" />Actionable Recommendations</h4>
                          <ul className="list-inside list-disc space-y-1 text-green-800">
                            {aiAnalysis.actionableRecommendations.immediateActions?.map((action, i) => <li key={`ia-${i}`}>{action}</li>)}
                            {aiAnalysis.actionableRecommendations.costOptimization?.map((action, i) => <li key={`co-${i}`}>{action}</li>)}
                            {aiAnalysis.actionableRecommendations.riskMitigation?.map((action, i) => <li key={`rm-${i}`}>{action}</li>)}
                          </ul>
                        </div>
                      )}
                      
                      <Tabs defaultValue="parts" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 rounded-lg bg-gray-100 p-1 md:grid-cols-4">
                          {/* FIX: Use optional chaining and nullish coalescing for safety */}
                          <TabsTrigger value="parts">Parts ({(aiAnalysis.marketEcosystem?.spareParts?.suppliers?.length ?? 0)})</TabsTrigger>
                          <TabsTrigger value="services">Services ({(aiAnalysis.marketEcosystem?.services?.providers?.length ?? 0)})</TabsTrigger>
                          <TabsTrigger value="logistics">Logistics ({(aiAnalysis.marketEcosystem?.logistics?.providers?.length ?? 0)})</TabsTrigger>
                          <TabsTrigger value="finance">Finance ({(aiAnalysis.marketEcosystem?.finance?.providers?.length ?? 0)})</TabsTrigger>
                        </TabsList>
                        
                        {/* FIX: Use optional chaining on all .map calls */}
                        <TabsContent value="parts" className="mt-4"><div className="space-y-3">{aiAnalysis.marketEcosystem?.spareParts?.suppliers?.map((item, i) => <RecommendationCard key={i} item={item} type="parts" />) ?? <p>No parts found.</p>}</div></TabsContent>
                        <TabsContent value="services" className="mt-4"><div className="space-y-3">{aiAnalysis.marketEcosystem?.services?.providers?.map((item, i) => <RecommendationCard key={i} item={item} type="services" />) ?? <p>No services found.</p>}</div></TabsContent>
                        <TabsContent value="logistics" className="mt-4"><div className="space-y-3">{aiAnalysis.marketEcosystem?.logistics?.providers?.map((item, i) => <RecommendationCard key={i} item={item} type="logistics" />) ?? <p>No logistics found.</p>}</div></TabsContent>
                        <TabsContent value="finance" className="mt-4"><div className="space-y-3">{aiAnalysis.marketEcosystem?.finance?.providers?.map((item, i) => <RecommendationCard key={i} item={item} type="finance" />) ?? <p>No finance found.</p>}</div></TabsContent>
                      </Tabs>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
          <div className="space-y-6">
            {user && robot.profiles && (<Card><CardHeader><CardTitle>Seller Information</CardTitle></CardHeader><CardContent className="p-6 pt-0"><Separator className="my-4"/><div className="space-y-3"><div className="flex items-center gap-3"><User className="h-4 w-4"/><span>{robot.profiles.full_name}</span></div>{robot.profiles.company_name && <div className="flex items-center gap-3"><Building className="h-4 w-4"/><span>{robot.profiles.company_name}</span></div>}{(robot.profiles.phone || robot.profiles.mobile_number) && <div className="flex items-center gap-3"><Phone className="h-4 w-4"/><span>{robot.profiles.phone || robot.profiles.mobile_number}</span></div>}{robot.profiles.email && <div className="flex items-center gap-3"><Mail className="h-4 w-4"/><span className="break-all text-sm">{robot.profiles.email}</span></div>}</div></CardContent></Card>)}
            {!user && <Card><CardHeader><CardTitle>Login Required</CardTitle></CardHeader><CardContent><Button onClick={()=>navigate('/auth')} className="w-full">Login / Sign Up</Button></CardContent></Card>}
            {user && <Card><CardContent className="p-6 space-y-3"><Button size="lg" className="w-full" onClick={handleContactSeller} disabled={!robot.profiles?.phone && !robot.profiles?.mobile_number}><PhoneCall className="mr-2 h-5 w-5"/>Contact Seller</Button><Button size="lg" variant="outline" className="w-full" onClick={handleRequestQuote} disabled={!robot.profiles?.email}><MessageCircle className="mr-2 h-5 w-5"/>Request Quote</Button><Button size="lg" variant="outline" className="w-full" onClick={handleAddToWatchlist} disabled={addingToWatchlist}>{addingToWatchlist ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <Heart className={`mr-2 h-5 w-5 ${isInWatchlist ? 'fill-current text-red-500' : ''}`}/>}{isInWatchlist ? 'In Watchlist' : 'Add to Watchlist'}</Button></CardContent></Card>}
          </div>
        </div>
      </div>
      <Dialog open={showFullscreen} onOpenChange={setShowFullscreen}><DialogContent className="max-w-7xl">...</DialogContent></Dialog>
      <Dialog open={showQuoteModal} onOpenChange={setShowQuoteModal}><DialogContent>...</DialogContent></Dialog>
    </div>
  );
};

export default RobotDetails;
