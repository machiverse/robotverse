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
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

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
            profiles:seller_id(full_name, company_name, phone, email, location)
          `)
          .eq("id", id)
          .single();

        if (error) throw error;
        setRobot(data);

        if (user) {
          // Check watchlist status from localStorage
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
    const currencySymbols: Record<string,string> = { USD: "$", EUR: "€", INR: "₹" };
    const symbol = currencySymbols[currency] || currency;
    return `${symbol}${price.toLocaleString()}`;
  }

  // Image navigation
  const nextImage = () => {
    if (!robot?.images || robot.images.length <= 1) return;
    setCurrentImageIndex((prev) => (prev + 1) % robot.images.length);
  };

  const prevImage = () => {
    if (!robot?.images || robot.images.length <= 1) return;
    setCurrentImageIndex((prev) => (prev + robot.images.length - 1) % robot.images.length);
  };

  // Contact Seller Phone
  const handleContactSeller = () => {
    if (!robot?.profiles?.phone) {
      toast.error("Seller's phone number is not available.");
      return;
    }
    const phone = robot.profiles.phone.replace(/\D/g, "");
    window.open(`tel:${phone}`, "_self");
    toast.success(`Calling ${robot.profiles.full_name}...`);
  };

  // Request Quote - open mail client
  const handleRequestQuote = () => {
    if (!robot?.profiles?.email) {
      toast.error("Seller's email is not available.");
      return;
    }
    setShowQuoteModal(true);
  };

  const sendQuoteEmail = () => {
    if (!robot?.profiles?.email) return;

    const subject = `Quote Request: ${robot.name} (${robot.model})`;
    const body = `
Dear ${robot.profiles.full_name},

I am interested in the following robot:

- Name: ${robot.name}
- Model: ${robot.model}
- Type: ${robot.robot_type}
- Price: ${robot.price ? formatPrice(robot.price, robot.currency) : "Price on request"}

${quoteMessage ? `Additional message:\n${quoteMessage}` : ""}

Please provide a quote with pricing, availability, warranty, and support details.

Thank you.

`;

    const mailtoLink = `mailto:${robot.profiles.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoLink, "_blank");
    toast.success("Quote request email prepared.");
    setQuoteMessage("");
    setShowQuoteModal(false);
  };

  // Watchlist management, saved in localStorage (per user)
  const handleToggleWatchlist = () => {
    if (!user) {
      toast.error("Please login to manage your watchlist.");
      return;
    }
    setAddingToWatchlist(true);
    try {
      const key = `watchlist_${user.id}`;
      const watchlist = JSON.parse(localStorage.getItem(key) || "[]");
      if (isInWatchlist) {
        const updated = watchlist.filter((rid: string) => rid !== robot?.id);
        localStorage.setItem(key, JSON.stringify(updated));
        setIsInWatchlist(false);
        toast.success("Removed from watchlist.");
      } else {
        if (!watchlist.includes(robot!.id)) {
          watchlist.push(robot!.id);
          localStorage.setItem(key, JSON.stringify(watchlist));
          setIsInWatchlist(true);
          toast.success("Added to watchlist.");
        }
      }
    } catch (e) {
      toast.error("Failed to update watchlist.");
    } finally {
      setAddingToWatchlist(false);
    }
  };

  // AI Market Analysis
  const handleAiAnalysis = async () => {
    if (!user) {
      toast.error("Please login to access AI analysis.");
      return;
    }
    if (!robot) return;

    setAnalysisLoading(true);
    try {
      const response = await fetch("/api/ai-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ robotId: robot.id, userId: user.id }),
      });
      if (!response.ok) throw new Error("Failed to analyze robot");

      const data = await response.json();
      setAiAnalysis(data);
      toast.success("AI analysis complete.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "AI analysis failed";
      toast.error(msg);
    } finally {
      setAnalysisLoading(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin" />
        <span className="ml-2">Loading robot details...</span>
      </div>
    );

  if (error || !robot)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <Bot className="w-16 h-16 mb-4 text-muted" />
        <h2>Robot not found</h2>
        <p>{error || "Sorry, no data available for this robot."}</p>
        <Button onClick={() => navigate("/robots")} className="mt-4">
          <ArrowLeft className="mr-1" /> Back to Robots
        </Button>
      </div>
    );

  return (
    <>
      <EnhancedHeader />
      <main className="container mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left/Main Column */}
        <section className="lg:col-span-2 space-y-8">
          {/* Image and Gallery */}
          <Card>
            <CardContent className="relative aspect-video bg-muted rounded-lg">
              {robot.images?.length > 0 ? (
                <>
                  <img
                    src={robot.images[currentImageIndex]}
                    alt={`${robot.name} image ${currentImageIndex + 1}`}
                    className="object-cover w-full h-full rounded-lg cursor-pointer"
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
                      <div className="absolute bottom-1 right-1 bg-black/60 text-white rounded-md px-2 text-sm">
                        {currentImageIndex + 1} / {robot.images.length}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-muted">
                  <Bot size={64} />
                  <span>No images available</span>
                </div>
              )}
            </CardContent>
            {robot.images.length > 1 && (
              <div className="flex overflow-x-auto gap-2 mt-2">
                {robot.images.map((img, i) => (
                  <div
                    key={i}
                    className={`w-20 h-20 cursor-pointer rounded-lg overflow-hidden border-2 ${
                      i === currentImageIndex ? "border-blue-600" : "border-transparent"
                    }`}
                    onClick={() => setCurrentImageIndex(i)}
                  >
                    <img src={img} alt={`${robot.name} thumbnail ${i + 1}`} className="object-cover w-full h-full" />
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Info Cards */}
          <Card>
            <CardHeader>
              <CardTitle>{robot.name}</CardTitle>
              <p className="text-muted">{robot.model}</p>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div>
                  <Badge className="mr-2">{robot.robot_type}</Badge>
                  {robot.category_tags?.map((tag, i) => (
                    <Badge variant="secondary" key={i} className="mr-1">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <div className="text-right">
                  <div className="text-2xl font-semibold">{robot.price ? formatPrice(robot.price, robot.currency) : "Price on Request"}</div>
                  <Badge variant={robot.availability === "available" ? "default" : "secondary"}>
                    {robot.availability}
                  </Badge>
                </div>
              </div>
              <p className="mt-4 whitespace-pre-wrap">{robot.description}</p>
            </CardContent>
          </Card>

          {/* Technical Specs */}
          {robot.technical_specifications && (
            <Card>
              <CardHeader>
                <CardTitle>Technical Specifications</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {Object.entries(robot.technical_specifications).map(([key, val]) => (
                    <div key={key}>
                      <dt className="font-semibold capitalize">{key.replace(/_/g, " ")}</dt>
                      <dd>{val}</dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          )}

          {/* AI Analysis Section */}
          {user && (
            <Card className="border-blue-400 bg-gradient-to-br from-blue-100 to-purple-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain />
                  Advanced AI Analysis & Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!aiAnalysis ? (
                  <>
                    <p>Discover new parts, services, logistics & finance recommendations matched to this robot!</p>
                    <Button onClick={handleAiAnalysis} disabled={analysisLoading} className="mt-4">
                      {analysisLoading ? (
                        <>
                          <Loader2 className="animate-spin mr-2" /> Analyzing...
                        </>
                      ) : (
                        <>Analyze Robot</>
                      )}
                    </Button>
                  </>
                ) : (
                  <>
                    <h3>AI Analysis</h3>
                    <p>{aiAnalysis.analysis}</p>
                    <Tabs defaultValue="parts">
                      <TabsList>
                        <TabsTrigger value="parts">Spare Parts ({aiAnalysis.recommendations.spareParts.length})</TabsTrigger>
                        <TabsTrigger value="services">Services ({aiAnalysis.recommendations.services.length})</TabsTrigger>
                        <TabsTrigger value="logistics">Logistics ({aiAnalysis.recommendations.logistics.length})</TabsTrigger>
                        <TabsTrigger value="finance">Finance ({aiAnalysis.recommendations.finance.length})</TabsTrigger>
                      </TabsList>
                      <TabsContent value="parts">
                        {aiAnalysis.recommendations.spareParts.length ? (
                          aiAnalysis.recommendations.spareParts.map((p, i) => (
                            <div key={i}>{p.name}</div>
                          ))
                        ) : (
                          <p>No recommended parts found.</p>
                        )}
                      </TabsContent>
                      <TabsContent value="services">
                        {aiAnalysis.recommendations.services.length ? (
                          aiAnalysis.recommendations.services.map((s, i) => (
                            <div key={i}>{s.name}</div>
                          ))
                        ) : (
                          <p>No recommended services found.</p>
                        )}
                      </TabsContent>
                      <TabsContent value="logistics">
                        {aiAnalysis.recommendations.logistics.length ? (
                          aiAnalysis.recommendations.logistics.map((l, i) => (
                            <div key={i}>{l.company_name || l.full_name}</div>
                          ))
                        ) : (
                          <p>No recommended logistics partners found.</p>
                        )}
                      </TabsContent>
                      <TabsContent value="finance">
                        {aiAnalysis.recommendations.finance.length ? (
                          aiAnalysis.recommendations.finance.map((f, i) => (
                            <div key={i}>{f.company_name || f.full_name}</div>
                          ))
                        ) : (
                          <p>No recommended finance partners found.</p>
                        )}
                      </TabsContent>
                    </Tabs>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </section>

        {/* Right Sidebar */}
        <section className="space-y-6">
          {/* Seller Info */}
          {robot.profiles && (
            <Card>
              <CardHeader>
                <CardTitle>Seller Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User /> <span>{robot.profiles.full_name}</span>
                  </div>
                  {robot.profiles.company_name && (
                    <div className="flex items-center gap-2">
                      <Building /> <span>{robot.profiles.company_name}</span>
                    </div>
                  )}
                  {robot.profiles.phone && (
                    <div className="flex items-center gap-2">
                      <Phone /> <span>{robot.profiles.phone}</span>
                    </div>
                  )}
                  {robot.profiles.email && (
                    <div className="flex items-center gap-2">
                      <Mail /> <span>{robot.profiles.email}</span>
                    </div>
                  )}
                  {robot.profiles.location && (
                    <div className="flex items-center gap-2">
                      <MapPin /> <span>{robot.profiles.location}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Call to actions */}
          {user ? (
            <Card>
              <CardContent className="space-y-2">
                <Button onClick={handleContactSeller} className="w-full" variant="success">
                  <PhoneCall className="mr-2" />
                  Call Seller
                </Button>
                <Button onClick={handleRequestQuote} className="w-full" variant="outline">
                  <MessageCircle className="mr-2" />
                  Request Quote
                </Button>
                <Button onClick={handleToggleWatchlist} className="w-full" variant={isInWatchlist ? "destructive" : "secondary"} disabled={addingToWatchlist}>
                  <Heart className={`mr-2 ${isInWatchlist ? "fill-current" : ""}`} />
                  {isInWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent>
                <p className="mb-4">Please login to see seller contact details and request quotes.</p>
                <Button onClick={() => navigate("/auth")} className="w-full">Login</Button>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Fullscreen Image Modal */}
        <Dialog open={showFullscreen} onOpenChange={setShowFullscreen}>
          <DialogContent className="max-w-screen-xl max-h-screen p-0">
            <div className="relative">
              <img
                src={robot.images[currentImageIndex]}
                alt={`${robot.name} full image`}
                className="w-full max-h-screen object-contain"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 bg-black/50 text-white"
                onClick={() => setShowFullscreen(false)}
              >
                <X />
              </Button>
              {robot.images.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-1/2 left-2 bg-black/50 text-white"
                    onClick={prevImage}
                  >
                    <ChevronLeft />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-1/2 right-2 bg-black/50 text-white"
                    onClick={nextImage}
                  >
                    <ChevronRight />
                  </Button>
                  <div className="absolute bottom-4 right-1/2 transform translate-x-1/2 bg-black/50 text-white rounded px-2 text-sm">
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
              <DialogTitle>Request Quote</DialogTitle>
            </DialogHeader>
            <Textarea
              value={quoteMessage}
              onChange={(e) => setQuoteMessage(e.target.value)}
              placeholder="Additional message for the seller..."
              rows={6}
              className="mb-4"
            />
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowQuoteModal(false)}>Cancel</Button>
              <Button onClick={sendQuoteEmail}>Send Quote</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </>
  );
};

export default RobotDetails;
