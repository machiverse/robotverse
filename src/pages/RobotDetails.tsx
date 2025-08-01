import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
  Bot, MapPin, Building, Phone, Mail, User, ArrowLeft, Loader2, Wrench, Settings, DollarSign, Truck, Brain, 
  Heart, MessageCircle, PhoneCall, X, ChevronLeft, ChevronRight, Maximize2 
} from "lucide-react";
import EnhancedHeader from "@/components/EnhancedHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth";
import { useToast } from "@/hooks/toast";

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
  technical_specifications: Record<string, any>;
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
  const [error, setError] = useState<string | null>(null);

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteMessage, setQuoteMessage] = useState("");
  const [addingToWatchlist, setAddingToWatchlist] = useState(false);
  const [isInWatchlist, setIsInWatchlist] = useState(false);

  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResult | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchRobot = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("robots")
          .select(`
            *,
            profiles:seller_id (
              full_name, company_name, phone, email, location
            )
          `)
          .eq("id", id)
          .single();

        if (error) throw error;
        setRobot(data);

        if (user) {
          // Check if robot is in user's watchlist (localStorage)
          const watchlist = JSON.parse(localStorage.getItem(`watchlist_${user.id}`) || "[]");
          setIsInWatchlist(watchlist.includes(data.id));
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to load robot details";
        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };
    fetchRobot();
  }, [id, user, toast]);

  const formatPrice = (price: number, currency: string) => {
    const symbols: Record<string, string> = { USD: "$", EUR: "€", INR: "₹" };
    const symbol = symbols[currency] || currency;
    return `${symbol}${price.toLocaleString()}`;
  };

  const nextImage = () => {
    if (!robot?.images || robot.images.length < 2) return;
    setCurrentImageIndex((idx) => (idx + 1) % robot.images.length);
  };

  const prevImage = () => {
    if (!robot?.images || robot.images.length < 2) return;
    setCurrentImageIndex((idx) => (idx - 1 + robot.images.length) % robot.images.length);
  };

  const handleContactSeller = () => {
    if (!robot?.profiles?.phone) {
      toast.error("Seller's phone number is unavailable.");
      return;
    }
    const phoneClean = robot.profiles.phone.replace(/\D/g, "");
    window.open(`tel:${phoneClean}`, "_self");
    toast.success(`Calling ${robot.profiles.full_name}...`);
  };

  const handleRequestQuote = () => {
    if (!robot?.profiles?.email) {
      toast.error("Seller's email is unavailable.");
      return;
    }
    setShowQuoteModal(true);
  };

  const sendQuoteEmail = () => {
    if (!robot?.profiles?.email) return;

    const subject = `Quote Request: ${robot.name} (${robot.model})`;
    const body = `Dear ${robot.profiles.full_name},

I am interested in the following robot:
Name: ${robot.name}
Model: ${robot.model}
Type: ${robot.robot_type}
Price: ${robot.price ? formatPrice(robot.price, robot.currency) : "Price on request"}

${quoteMessage ? `Additional message:\n${quoteMessage}` : ""}

Please provide quotes, availability, technical specs, warranty, and support details.

Regards,
${user?.user_metadata?.full_name || "Interested Buyer"}
`;
    
    const mailtoLink = `mailto:${robot.profiles.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoLink, "_blank");
    toast.success("Quote email composed.");
    setQuoteMessage("");
    setShowQuoteModal(false);
  };

  const toggleWatchlist = () => {
    if (!user) {
      toast.error("Please login to manage your watchlist.");
      return;
    }
    setAddingToWatchlist(true);
    try {
      const key = `watchlist_${user.id}`;
      const currentList = JSON.parse(localStorage.getItem(key) || "[]");
      if (isInWatchlist) {
        const updated = currentList.filter((rid: string) => rid !== robot!.id);
        localStorage.setItem(key, JSON.stringify(updated));
        setIsInWatchlist(false);
        toast.success("Removed from watchlist.");
      } else {
        if (!currentList.includes(robot!.id)) {
          currentList.push(robot!.id);
          localStorage.setItem(key, JSON.stringify(currentList));
          setIsInWatchlist(true);
          toast.success("Added to watchlist.");
        }
      }
    } catch {
      toast.error("Failed to update watchlist.");
    } finally {
      setAddingToWatchlist(false);
    }
  };

  const handleAIAnalysis = async () => {
    if (!user) {
      toast.error("Please login to use AI analysis.");
      return;
    }
    if (!robot) return;

    setAnalysisLoading(true);
    try {
      const resp = await fetch("/api/ai-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ robotId: robot.id, userId: user.id }),
      });
      if (!resp.ok) throw new Error("AI analysis failed");
      const data = await resp.json();
      setAiAnalysis(data);
      toast.success("AI analysis complete.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error during AI analysis.");
    } finally {
      setAnalysisLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center items-center min-h-screen"><Loader2 className="animate-spin mr-2" />Loading Robot...</div>;

  if (error || !robot)
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
        <Bot className="text-muted mb-4" size={64} />
        <h2>Robot Not Found</h2>
        <p>{error || "This robot does not exist or has been removed."}</p>
        <Button onClick={() => navigate("/robots")} className="mt-4">
          <ArrowLeft className="mr-1" /> Back to listings
        </Button>
      </div>
    );

  return (
    <>
      <EnhancedHeader />
      <main className="container mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-screen">
        <section className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="relative aspect-video rounded-lg bg-muted mb-4">
              {robot.images.length > 0 ? (
                <>
                  <img
                    src={robot.images[currentImageIndex]}
                    alt={`${robot.name} image ${currentImageIndex + 1}`}
                    className="cursor-pointer object-cover w-full h-full rounded-lg"
                    onClick={() => setShowFullscreen(true)}
                  />
                  {robot.images.length > 1 && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white"
                        onClick={prevImage}
                      >
                        <ChevronLeft />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white"
                        onClick={nextImage}
                      >
                        <ChevronRight />
                      </Button>
                      <div className="absolute bottom-2 right-2 bg-black/60 text-white px-2 rounded text-sm">
                        {currentImageIndex + 1} / {robot.images.length}
                      </div>
                    </>
                  )}
                </>
              ) : <Bot size={96} className="mx-auto text-muted" />}
            </CardContent>
            {robot.images.length > 1 && (
              <div className="flex space-x-2 overflow-x-auto">
                {robot.images.map((img, i) => (
                  <img
                    key={i}
                    src={img}
                    alt={`${robot.name} thumbnail ${i + 1}`}
                    className={`w-20 h-20 object-cover rounded cursor-pointer border-2 ${currentImageIndex === i ? "border-blue-600" : "border-transparent"}`}
                    onClick={() => setCurrentImageIndex(i)}
                  />
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{robot.name}</CardTitle>
              <p className="text-muted">{robot.model}</p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-2">
                <Badge variant="default">{robot.robot_type}</Badge>
                {robot.category_tags.map((tag, i) => (
                  <Badge key={i} variant="secondary">{tag}</Badge>
                ))}
              </div>
              <div className="flex justify-between items-center mb-4">
                <p className="text-lg font-semibold">{formatPrice(robot.price, robot.currency)}</p>
                <Badge variant={robot.availability === "available" ? "default" : "secondary"}>{robot.availability}</Badge>
              </div>
              <p className="whitespace-pre-wrap">{robot.description}</p>
              <Separator className="my-4" />
              <p><strong>Available Quantity:</strong> {robot.quantity}</p>
            </CardContent>
          </Card>

          {!!robot.technical_specifications && Object.keys(robot.technical_specifications).length > 0 && (
            <Card>
              <CardHeader><CardTitle>Technical Specifications</CardTitle></CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
                  {Object.entries(robot.technical_specifications).map(([key, value]) => (
                    <div key={key}>
                      <dt className="font-semibold capitalize">{key.replace(/_/g, ' ')}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          )}

          {user && (
            <Card className="border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100">
              <CardHeader>
                <CardTitle><Brain className="inline mr-2" /> AI Market Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                {!aiAnalysis ? (
                  <>
                    <p className="mb-4">Get AI-powered recommendations for spare parts, services, logistics, and financial providers matched uniquely to this robot.</p>
                    <Button onClick={handleAIAnalysis} disabled={analysisLoading} variant="default">
                      {analysisLoading ? (<Loader2 className="animate-spin mr-2" />) : <Brain className="mr-2" />}
                      {analysisLoading ? "Analyzing..." : "Run Analysis"}
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="whitespace-pre-wrap mb-4">{aiAnalysis.analysis}</p>
                    <Tabs defaultValue="parts" className="w-full">
                      <TabsList>
                        <TabsTrigger value="parts">Parts ({aiAnalysis.recommendations.spareParts.length})</TabsTrigger>
                        <TabsTrigger value="services">Services ({aiAnalysis.recommendations.services.length})</TabsTrigger>
                        <TabsTrigger value="logistics">Logistics ({aiAnalysis.recommendations.logistics.length})</TabsTrigger>
                        <TabsTrigger value="finance">Finance ({aiAnalysis.recommendations.finance.length})</TabsTrigger>
                      </TabsList>
                      <TabsContent value="parts">
                        {aiAnalysis.recommendations.spareParts.length === 0 ? <p>No parts found</p> : (
                          aiAnalysis.recommendations.spareParts.map((item, idx) => (
                            <Card key={idx} className="mb-2">
                              <CardContent>
                                <p>{item.name}</p>
                                <p className="text-sm text-muted">{item.profiles?.company_name}</p>
                              </CardContent>
                            </Card>
                          ))
                        )}
                      </TabsContent>
                      <TabsContent value="services">
                        {aiAnalysis.recommendations.services.length === 0 ? <p>No services found</p> : (
                          aiAnalysis.recommendations.services.map((item, idx) => (
                            <Card key={idx} className="mb-2">
                              <CardContent>
                                <p>{item.name}</p>
                                <p className="text-sm text-muted">{item.profiles?.company_name}</p>
                              </CardContent>
                            </Card>
                          ))
                        )}
                      </TabsContent>
                      <TabsContent value="logistics">
                        {aiAnalysis.recommendations.logistics.length === 0 ? <p>No logistics providers found</p> : (
                          aiAnalysis.recommendations.logistics.map((item, idx) => (
                            <Card key={idx} className="mb-2">
                              <CardContent>
                                <p>{item.company_name || item.full_name}</p>
                                <p className="text-sm text-muted">{item.location}</p>
                              </CardContent>
                            </Card>
                          ))
                        )}
                      </TabsContent>
                      <TabsContent value="finance">
                        {aiAnalysis.recommendations.finance.length === 0 ? <p>No finance providers found</p> : (
                          aiAnalysis.recommendations.finance.map((item, idx) => (
                            <Card key={idx} className="mb-2">
                              <CardContent>
                                <p>{item.company_name || item.full_name}</p>
                                <p className="text-sm text-muted">{item.location}</p>
                              </CardContent>
                            </Card>
                          ))
                        )}
                      </TabsContent>
                    </Tabs>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </section>

        <aside className="space-y-6">
          {(robot.profiles && user) ? (
            <Card>
              <CardHeader><CardTitle>Seller Info</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2"><User />{robot.profiles.full_name}</div>
                  {!!robot.profiles.company_name && <div className="flex items-center gap-2"><Building />{robot.profiles.company_name}</div>}
                  {!!robot.profiles.phone && <div className="flex items-center gap-2"><Phone />{robot.profiles.phone}</div>}
                  {!!robot.profiles.email && <div className="flex items-center gap-2"><Mail />{robot.profiles.email}</div>}
                  {!!robot.profiles.location && <div className="flex items-center gap-2"><MapPin />{robot.profiles.location}</div>}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent>
                <p>Please <Button variant="link" onClick={() => navigate("/auth")}>log in</Button> to view seller contact details and AI features.</p>
              </CardContent>
            </Card>
          )}

          {user && (
            <Card>
              <CardContent className="space-y-3">
                <Button className="w-full" onClick={handleContactSeller} variant="success">
                  <PhoneCall className="mr-2" /> Call Seller
                </Button>
                <Button className="w-full" onClick={handleRequestQuote} variant="outline">
                  <MessageCircle className="mr-2" /> Request Quote
                </Button>
                <Button 
                  className="w-full" 
                  onClick={toggleWatchlist} 
                  variant={isInWatchlist ? "destructive" : "secondary"} 
                  disabled={addingToWatchlist}
                >
                  <Heart className={`mr-2 ${isInWatchlist ? "fill-current stroke-0" : ""}`} />
                  {isInWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
                </Button>
              </CardContent>
            </Card>
          )}
        </aside>

      </main>

      {/* Fullscreen image modal */}
      <Dialog open={showFullscreen} onOpenChange={setShowFullscreen}>
        <DialogContent className="max-w-screen-xl max-h-screen p-0">
          <div className="relative">
            <img
              src={robot.images[currentImageIndex]}
              alt={`${robot.name} full image`}
              className="max-h-screen w-full object-contain"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 bg-black/70 text-white"
              onClick={() => setShowFullscreen(false)}
            >
              <X />
            </Button>
            {robot.images.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/70 text-white"
                  onClick={prevImage}
                >
                  <ChevronLeft />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/70 text-white"
                  onClick={nextImage}
                >
                  <ChevronRight />
                </Button>
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white rounded px-3 py-1 text-sm">
                  {currentImageIndex + 1} / {robot.images.length}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Quote request modal */}
      <Dialog open={showQuoteModal} onOpenChange={setShowQuoteModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request a Quote</DialogTitle>
            <p>Write a message to the seller</p>
          </DialogHeader>
          <Textarea
            rows={5}
            value={quoteMessage}
            onChange={(e) => setQuoteMessage(e.target.value)}
            placeholder="Additional message or requirements"
            className="mb-4"
          />
          <DialogFooter className="space-x-2">
            <Button variant="ghost" onClick={() => setShowQuoteModal(false)}>Cancel</Button>
            <Button onClick={sendQuoteEmail}>Send Email</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RobotDetails;
