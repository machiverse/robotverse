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
// This manual interface ensures your component knows the shape of the robot data.
interface Robot {
  id: string; name: string | null; model: string | null; robot_type: string | null; price: number | null; currency: string | null; description: string | null; location: string | null; availability: string | null; images: string[] | null; technical_specifications: any; category_tags: string[] | null; quantity: number | null; seller_id: string | null; created_at: string; brand?: string | null; condition?: string | null; year_manufactured?: number | null; payload_capacity?: number | null; training_included?: boolean | null;
  profiles: { full_name: string | null; company_name: string | null; phone: string | null; mobile_number: string | null; email: string | null; location: string | null; } | null;
}

// This interface is updated to make nested properties optional, preventing crashes.
interface AIAnalysisResult {
  robot?: any;
  analysis?: string;
  marketEcosystem?: {
    spareParts?: { suppliers: any[] };
    services?: { providers: any[] };
    logistics?: { providers: any[] };
    finance?: { providers: any[] };
  };
  locationInsights?: any;
  actionableRecommendations?: {
    immediateActions?: string[];
    costOptimization?: string[];
    riskMitigation?: string[];
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <EnhancedHeader />
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !robot) {
    return (
      <div className="min-h-screen bg-background">
        <EnhancedHeader />
        <div className="container mx-auto px-4 py-8 text-center">
          <h3 className="text-lg font-semibold">Robot Not Found</h3>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

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
            
            {/* Robot Image Gallery */}
            <Card><CardContent className="p-6"><div className="relative aspect-video bg-muted rounded-lg flex items-center justify-center mb-4 overflow-hidden">{robot.images && robot.images.length > 0 ? (<><img src={robot.images[currentImageIndex]} alt={`${robot.name} ${currentImageIndex + 1}`} className="w-full h-full object-contain rounded-lg cursor-pointer transition-transform duration-300 ease-in-out hover:scale-105" onClick={() => setShowFullscreen(true)} />{robot.images.length > 1 && (<><Button variant="ghost" size="icon" className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white z-10" onClick={(e) => { e.stopPropagation(); prevImage(); }}><ChevronLeft className="w-4 h-4" /></Button><Button variant="ghost" size="icon" className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white z-10" onClick={(e) => { e.stopPropagation(); nextImage(); }}><ChevronRight className="w-4 h-4" /></Button></>)}<Button variant="ghost" size="icon" className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white z-10" onClick={(e) => { e.stopPropagation(); setShowFullscreen(true); }}><Maximize2 className="w-4 h-4" /></Button>{robot.images.length > 1 && (<div className="absolute bottom-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-sm z-10">{currentImageIndex + 1} / {robot.images.length}</div>)}</>) : (<Bot className="w-24 h-24 text-muted-foreground" />)}</div>{robot.images && robot.images.length > 1 && (<div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">{robot.images.map((image, index) => (<div key={index} className={`flex-shrink-0 aspect-square w-20 h-20 bg-muted rounded-lg flex items-center justify-center cursor-pointer border-2 transition-all duration-200 ${index === currentImageIndex ? 'border-primary shadow-md' : 'border-transparent opacity-70 hover:opacity-100'}`} onClick={() => setCurrentImageIndex(index)}><img src={image} alt={`${robot.name} ${index + 1}`} className="w-full h-full object-cover rounded-lg" /></div>))}</div>)}</CardContent></Card>
            
            {/* Robot Information */}
            <Card><CardHeader><div className="flex items-start justify-between"><div><CardTitle className="text-3xl font-bold">{robot.name}</CardTitle><p className="text-xl text-muted-foreground mt-1">{robot.model}</p></div><div className="text-right flex flex-col items-end"><div className="text-4xl font-extrabold text-primary">{robot.price ? formatPrice(robot.price, robot.currency) : 'Price on Request'}</div><Badge variant={robot.availability === 'available' ? 'default' : 'secondary'} className="mt-2 text-sm px-3 py-1">{robot.availability}</Badge></div></div></CardHeader><CardContent className="p-6 pt-0"><Separator className="my-4" /><div className="space-y-4"><div className="flex flex-wrap gap-2"><Badge variant="outline" className="px-3 py-1 text-sm">{robot.robot_type}</Badge>{robot.category_tags?.map((tag, index) => (<Badge key={index} variant="secondary" className="px-3 py-1 text-sm">{tag}</Badge>))}</div><div className="flex items-center text-lg text-muted-foreground"><MapPin className="w-5 h-5 mr-3" /><span>{robot.location}</span></div>{robot.description && (<div><h4 className="font-semibold text-lg mb-2">Description</h4><p className="text-muted-foreground leading-relaxed">{robot.description}</p></div>)}<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-base"><div><span className="font-medium text-gray-700">Quantity Available:</span><p className="text-muted-foreground">{robot.quantity}</p></div>{robot.brand && (<div><span className="font-medium text-gray-700">Brand:</span><p className="text-muted-foreground">{robot.brand}</p></div>)}{robot.condition && (<div><span className="font-medium text-gray-700">Condition:</span><p className="text-muted-foreground">{robot.condition.replace('_', ' ')}</p></div>)}{robot.year_manufactured && (<div><span className="font-medium text-gray-700">Year Manufactured:</span><p className="text-muted-foreground">{robot.year_manufactured}</p></div>)}{robot.payload_capacity && (<div><span className="font-medium text-gray-700">Payload Capacity:</span><p className="text-muted-foreground">{robot.payload_capacity} kg</p></div>)}</div></div></CardContent></Card>
            
            {/* Technical Specifications */}
            {robot.technical_specifications && Object.keys(robot.technical_specifications).length > 0 && (<Card><CardHeader><CardTitle className="text-2xl">Technical Specifications</CardTitle></CardHeader><CardContent className="p-6 pt-0"><Separator className="my-4" /><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{Object.entries(robot.technical_specifications).map(([key, value]) => (<div key={key}><span className="font-medium text-gray-700 capitalize">{key.replace(/_/g, ' ')}:</span><p className="text-muted-foreground text-base">{String(value)}</p></div>))}</div></CardContent></Card>)}
            
            {/* AI Analysis Section */}
            {user && (
              <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50/80 to-purple-50/80">
                <CardHeader className="rounded-t-lg bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white"><CardTitle className="flex items-center gap-3 text-2xl font-bold"><Brain className="h-7 w-7" />Smart Market Intelligence</CardTitle></CardHeader>
                <CardContent className="p-6">
                  {!aiAnalysis ? (
                    <div className="py-6 text-center"><h3 className="text-xl font-bold text-gray-800 mb-2">Unlock Your Competitive Edge</h3><p className="text-gray-600 mb-6 max-w-lg mx-auto">Get an instant, detailed analysis of market positioning, ROI, and a complete ecosystem of suppliers and services.</p><Button onClick={handleAIAnalysis} disabled={analysisLoading} size="lg">{analysisLoading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Analyzing...</> : 'Generate AI Analysis'}</Button></div>
                  ) : (
                    <div className="space-y-6">
                      <div className="rounded-lg border bg-white p-6 shadow-sm"><h4 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900"><Lightbulb className="h-5 w-5 text-yellow-500" />Executive Summary</h4><p className="leading-relaxed text-gray-700 whitespace-pre-wrap">{aiAnalysis.analysis}</p></div>
                      
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
                          <TabsTrigger value="parts">Parts ({(aiAnalysis.marketEcosystem?.spareParts?.suppliers?.length ?? 0)})</TabsTrigger>
                          <TabsTrigger value="services">Services ({(aiAnalysis.marketEcosystem?.services?.providers?.length ?? 0)})</TabsTrigger>
                          <TabsTrigger value="logistics">Logistics ({(aiAnalysis.marketEcosystem?.logistics?.providers?.length ?? 0)})</TabsTrigger>
                          <TabsTrigger value="finance">Finance ({(aiAnalysis.marketEcosystem?.finance?.providers?.length ?? 0)})</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="parts" className="mt-4"><div className="space-y-3">{aiAnalysis.marketEcosystem?.spareParts?.suppliers?.map((item, i) => <RecommendationCard key={i} item={item} type="parts" />) ?? <p className="text-center text-muted-foreground">No parts found.</p>}</div></TabsContent>
                        <TabsContent value="services" className="mt-4"><div className="space-y-3">{aiAnalysis.marketEcosystem?.services?.providers?.map((item, i) => <RecommendationCard key={i} item={item} type="services" />) ?? <p className="text-center text-muted-foreground">No services found.</p>}</div></TabsContent>
                        <TabsContent value="logistics" className="mt-4"><div className="space-y-3">{aiAnalysis.marketEcosystem?.logistics?.providers?.map((item, i) => <RecommendationCard key={i} item={item} type="logistics" />) ?? <p className="text-center text-muted-foreground">No logistics found.</p>}</div></TabsContent>
                        <TabsContent value="finance" className="mt-4"><div className="space-y-3">{aiAnalysis.marketEcosystem?.finance?.providers?.map((item, i) => <RecommendationCard key={i} item={item} type="finance" />) ?? <p className="text-center text-muted-foreground">No finance found.</p>}</div></TabsContent>
                      </Tabs>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
          <div className="space-y-6">
            {user && robot.profiles && (<Card><CardHeader><CardTitle>Seller Information</CardTitle></CardHeader><CardContent className="p-6 pt-0"><Separator className="my-4"/><div className="space-y-3"><div className="flex items-center gap-3"><User className="h-4 w-4"/><span>{robot.profiles.full_name}</span></div>{robot.profiles.company_name && <div className="flex items-center gap-3"><Building className="h-4 w-4"/><span>{robot.profiles.company_name}</span></div>}{(robot.profiles.phone || robot.profiles.mobile_number) && <div className="flex items-center gap-3"><Phone className="h-4 w-4"/><span>{robot.profiles.phone || robot.profiles.mobile_number}</span></div>}{robot.profiles.email && <div className="flex items-center gap-3"><Mail className="h-4 w-4"/><span className="break-all text-sm">{robot.profiles.email}</span></div>}</div></CardContent></Card>)}
            {!user && <Card><CardHeader><CardTitle>Login Required</CardTitle></CardHeader><CardContent><p className="text-muted-foreground mb-4">Please log in to view seller information.</p><Button onClick={()=>navigate('/auth')} className="w-full">Login / Sign Up</Button></CardContent></Card>}
            {user && <Card><CardContent className="p-6 space-y-3"><Button size="lg" className="w-full" onClick={handleContactSeller} disabled={!robot.profiles?.phone && !robot.profiles?.mobile_number}><PhoneCall className="mr-2 h-5 w-5"/>Contact Seller</Button><Button size="lg" variant="outline" className="w-full" onClick={handleRequestQuote} disabled={!robot.profiles?.email}><MessageCircle className="mr-2 h-5 w-5"/>Request Quote</Button><Button size="lg" variant="outline" className="w-full" onClick={handleAddToWatchlist} disabled={addingToWatchlist}>{addingToWatchlist ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <Heart className={`mr-2 h-5 w-5 ${isInWatchlist ? 'fill-current text-red-500' : ''}`}/>}{isInWatchlist ? 'In Watchlist' : 'Add to Watchlist'}</Button></CardContent></Card>}
          </div>
        </div>
      </div>
      <Dialog open={showFullscreen} onOpenChange={setShowFullscreen}><DialogContent className="max-w-7xl max-h-[95vh] p-0 border-none bg-transparent flex items-center justify-center"><div className="relative w-full h-full flex items-center justify-center"><img src={robot?.images?.[currentImageIndex]} alt={`${robot?.name} ${currentImageIndex + 1}`} className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-xl" /><Button variant="ghost" size="icon" className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white rounded-full p-2" onClick={() => setShowFullscreen(false)}><X className="w-6 h-6" /></Button>{robot?.images && robot.images.length > 1 && (<><Button variant="ghost" size="icon" className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2" onClick={prevImage}><ChevronLeft className="w-8 h-8" /></Button><Button variant="ghost" size="icon" className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2" onClick={nextImage}><ChevronRight className="w-8 h-8" /></Button><div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-full text-lg">{currentImageIndex + 1} / {robot.images.length}</div></>)}</div></DialogContent></Dialog>
      <Dialog open={showQuoteModal} onOpenChange={setShowQuoteModal}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle className="text-2xl">Request Quote</DialogTitle><DialogDescription className="text-base text-muted-foreground">Send a quote request to <span className="font-semibold text-gray-800">{robot?.profiles?.company_name || robot?.profiles?.full_name}</span> for <span className="font-semibold text-gray-800">{robot?.name}</span>.</DialogDescription></DialogHeader><div className="space-y-4 py-4"><p className="text-sm text-gray-700">Your message will be sent to the seller's email: <span className="font-medium">{robot?.profiles?.email}</span></p><Textarea placeholder="Add any specific requirements or questions (e.g., 'What is the lead time for delivery?', 'Are there bulk purchase discounts?')..." value={quoteMessage} onChange={(e) => setQuoteMessage(e.target.value)} rows={6} className="min-h-[120px]" /></div><DialogFooter><Button variant="outline" onClick={() => setShowQuoteModal(false)}>Cancel</Button><Button onClick={sendQuoteEmail} disabled={!robot?.profiles?.email}><Mail className="w-4 h-4 mr-2" />Send Email</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
};

export default RobotDetails;
