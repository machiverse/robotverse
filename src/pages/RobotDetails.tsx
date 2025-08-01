import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Bot,
  MapPin,
  Building,
  Phone,
  Mail,
  User,
  ArrowLeft,
  Loader2,
  Wrench,
  Settings,
  DollarSign,
  Truck,
  Brain,
  Heart,
  MessageCircle,
  PhoneCall,
  X,
  ChevronLeft,
  ChevronRight,
  Maximize2,
} from "lucide-react";
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
  technical_specifications: Record<string, any>;
  category_tags: string[];
  quantity: number;
  seller_id: string;
  profiles: {
    full_name?: string | null;
    company_name?: string | null;
    phone?: string | null;
    email?: string | null;
    location?: string | null;
  } | null;
}

interface AIRecommendations {
  spareParts: any[];
  services: any[];
  logistics: any[];
  finance: any[];
}

interface AIAnalysis {
  analysis: string;
  recommendations: AIRecommendations;
}

const RobotDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [robot, setRobot] = useState<Robot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteMessage, setQuoteMessage] = useState("");

  const [addingToWatchlist, setAddingToWatchlist] = useState(false);
  const [isInWatchlist, setIsInWatchlist] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchRobot = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("robots")
          .select(
            `
            *,
            profiles!robots_seller_id_fkey (
              full_name,
              company_name,
              phone,
              email,
              location
            )
          `
          )
          .eq("id", id)
          .single();

        if (error) throw error;
        setRobot(data);

        if (user) {
          const watchlistRaw = localStorage.getItem(`watchlist_${user.id}`) || "[]";
          const watchlist: string[] = JSON.parse(watchlistRaw);
          setIsInWatchlist(watchlist.includes(data.id));
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load robot details"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchRobot();
  }, [id, user]);

  const formatPrice = (price: number | null, currency: string | null) => {
    if (!price) return "Price: On Request";
    const symbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : "₹";
    return `${symbol}${price.toLocaleString()}`;
  };

  // Safe access helpers
  const hasPhone = !!robot?.profiles?.phone;
  const hasEmail = !!robot?.profiles?.email;

  const handleAIAnalysis = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!robot || !user) {
      toast({
        title: "Login Required",
        description: "Please sign in to access AI analysis.",
        variant: "destructive",
      });
      return;
    }
    setAnalysisLoading(true);
    supabase.functions
      .invoke("robotverse-ai-analyze", { body: { robotId: robot.id, userId: user.id } })
      .then(({ data, error }) => {
        if (error) throw error;
        setAiAnalysis(data);
        toast({
          title: "AI Analysis Completed!",
          description: "Check out market intelligence.",
        });
      })
      .catch((error) => {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      })
      .finally(() => {
        setAnalysisLoading(false);
      });
  };

  const handleContactSeller = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hasPhone) {
      toast({
        title: "Phone number missing",
        description: "Seller has not provided a phone number.",
        variant: "destructive",
      });
      return;
    }
    const phone = robot?.profiles?.phone?.replace(/\D/g, "") || "";
    if (!phone) {
      toast({
        title: "Phone number invalid",
        description: "Seller phone number is invalid.",
        variant: "destructive",
      });
      return;
    }
    window.open(`tel:${phone}`, "_self");
    toast({
      title: "Calling Seller",
      description: `Calling ${robot?.profiles?.full_name || robot?.profiles?.company_name}`,
    });
  };

  const handleRequestQuote = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hasEmail) {
      toast({
        title: "Email missing",
        description: "Seller has not provided an email address.",
        variant: "destructive",
      });
      return;
    }
    setShowQuoteModal(true);
  };

  const sendQuoteEmail = () => {
    if (!robot?.profiles?.email) return;
    const subject = `Quote request for robot: ${robot.name}`;
    const body = `Dear ${robot.profiles?.full_name || robot.profiles?.company_name},

I am interested in your robot:
- Model: ${robot.model}
- Type: ${robot.robot_type}
- Price: ${formatPrice(robot.price, robot.currency)}

${quoteMessage ? `Additional notes: ${quoteMessage}` : ""}

Please provide a quote and any relevant info.

Thanks,
${user?.email || "Interested Buyer"}`;
    const mailto = `mailto:${robot.profiles?.email}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
    window.open(mailto);
    setShowQuoteModal(false);
    setQuoteMessage("");
    toast({ title: "Quote request sent!", description: "Email client should open shortly." });
  };

  const handleWatchlistToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please sign in to manage your watchlist.",
        variant: "destructive",
      });
      return;
    }
    setAddingToWatchlist(true);
    try {
      const key = `watchlist_${user.id}`;
      const existing = JSON.parse(localStorage.getItem(key) ?? "[]") as string[];
      let updated;
      if (isInWatchlist) {
        updated = existing.filter((id) => id !== robot!.id);
        toast({ title: "Removed from Watchlist" });
        setIsInWatchlist(false);
      } else {
        if (!existing.includes(robot!.id)) {
          updated = [...existing, robot!.id];
          setIsInWatchlist(true);
          toast({ title: "Added to Watchlist" });
        }
      }
      localStorage.setItem(key, JSON.stringify(updated));
    } catch {
      toast({
        title: "Error",
        description: "Failed to update watchlist.",
        variant: "destructive",
      });
    } finally {
      setAddingToWatchlist(false);
    }
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((v) => (v === 0 ? robot!.images.length - 1 : v - 1));
  };

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((v) => (v + 1) % robot!.images.length);
  };

  if (loading)
    return (
      <div className="min-h-screen bg-background">
        <EnhancedHeader />
        <div className="container mx-auto py-32 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="animate-spin w-10 h-10" />
          <p>Loading robot details...</p>
        </div>
      </div>
    );

  if (error || !robot)
    return (
      <div className="min-h-screen bg-background">
        <EnhancedHeader />
        <div className="container mx-auto py-32 text-center">
          <Bot className="mx-auto w-20 h-20 text-muted-foreground" />
          <h2 className="mt-4 text-2xl font-semibold">Robot Not Found</h2>
          <p className="mt-2 text-muted-foreground">{error || "No robot matches your request."}</p>
          <Button onClick={() => navigate("/robots")} className="mt-6">
            <ArrowLeft className="mr-2 w-4 h-4" />
            Back to Marketplace
          </Button>
        </div>
      </div>
    );

  // Card for AI tab recommendations
  const RecommendationCard = ({
    item,
    type,
  }: {
    item: any;
    type: string;
  }) => {
    const icons = {
      parts: <Wrench className="text-blue-600" />,
      services: <Settings className="text-green-600" />,
      logistics: <Truck className="text-orange-600" />,
      finance: <DollarSign className="text-purple-600" />,
    };
    const colors = {
      parts: "border-blue-200",
      services: "border-green-200",
      logistics: "border-orange-200",
      finance: "border-purple-200",
    };
    const name = item.name || item.company || item.company_name;
    const location = item.profiles?.location || item.location;

    return (
      <Card className={`${colors[type]} hover:shadow-md transition-shadow`}>
        <CardContent>
          <div className="flex justify-between items-start">
            <div>
              <h5 className="font-semibold flex items-center gap-2">
                {icons[type]} {name}
              </h5>
              {location && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {location}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <EnhancedHeader />

      <div className="container mx-auto py-6 px-4">
        <Button
          variant="ghost"
          onClick={() => navigate("/robots")}
          className="mb-6 flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Marketplace
        </Button>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Main / Left */}
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardContent>
                <div className="relative aspect-video rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                  {robot.images.length ? (
                    <>
                      <img
                        src={robot.images[currentImageIndex]}
                        alt={`${robot.name} image ${currentImageIndex + 1}`}
                        className="w-full h-full object-contain cursor-pointer"
                        onClick={() => setShowFullscreen(true)}
                      />
                      {robot.images.length > 1 && (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="Previous image"
                            className="absolute top-1/2 left-2 -translate-y-1/2 bg-black/50 text-white"
                            onClick={prevImage}
                          >
                            <ChevronLeft />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="Next image"
                            className="absolute top-1/2 right-2 -translate-y-1/2 bg-black/50 text-white"
                            onClick={nextImage}
                          >
                            <ChevronRight />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="Fullscreen"
                            className="absolute top-2 right-2 bg-black/50 text-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowFullscreen(true);
                            }}
                          >
                            <Maximize2 />
                          </Button>
                          <div className="absolute bottom-2 right-2 bg-black/50 text-white rounded px-2 py-1 text-sm">
                            {currentImageIndex + 1} / {robot.images.length}
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <Bot className="w-24 h-24 text-muted-foreground" />
                  )}
                </div>
                {robot.images.length > 1 && (
                  <div className="mt-3 flex gap-2 overflow-x-auto">
                    {robot.images.map((src, idx) => (
                      <img
                        key={idx}
                        src={src}
                        alt={`${robot.name} thumbnail ${idx + 1}`}
                        className={`h-20 w-20 rounded border-2 cursor-pointer object-cover ${idx === currentImageIndex ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentImageIndex(idx);
                        }}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{robot.name}</CardTitle>
                    <p className="font-medium text-muted-foreground">{robot.model}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-extrabold">{formatPrice(robot.price, robot.currency)}</p>
                    <Badge variant={robot.availability === "available" ? "default" : "secondary"}>
                      {robot.availability}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="outline">{robot.robot_type}</Badge>
                    {robot.category_tags.map((tag, idx) => (
                      <Badge variant="secondary" key={idx}>
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <MapPin />
                    <span>{robot.location}</span>
                  </div>
                  {robot.description && <p>{robot.description}</p>}
                  <p>
                    <strong>Quantity Available: </strong>
                    {robot.quantity}
                  </p>
                </div>
              </CardContent>
            </Card>

            {robot.technical_specifications && Object.keys(robot.technical_specifications).length !== 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Technical Specifications</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {Object.entries(robot.technical_specifications).map(([key, value]) => (
                      <div key={key}>
                        <p className="font-semibold capitalize">{key.replace(/_/g, " ")}</p>
                        <p>{String(value)}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {user && (
              <Card className="border border-primary bg-primary/5">
                <CardHeader className="bg-primary text-white rounded-t-lg">
                  <CardTitle className="flex items-center gap-2">
                    <Brain /> Advanced Market Intelligence
                  </CardTitle>
                  <p className="text-sm">Smart recommendations curated for this robot</p>
                </CardHeader>
                <CardContent>
                  {!aiAnalysis ? (
                    <Button
                      size="lg"
                      disabled={analysisLoading}
                      className="bg-primary text-white w-full"
                      onClick={handleAIAnalysis}
                    >
                      {analysisLoading ? (
                        <>
                          <Loader2 className="mr-2 w-5 h-5 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Brain className="mr-2 w-5 h-5" />
                          Generate Smart Analysis
                        </>
                      )}
                    </Button>
                  ) : (
                    <>
                      <div>
                        <h3 className="font-semibold mb-2">Analysis</h3>
                        <p className="whitespace-pre-wrap">{aiAnalysis.analysis}</p>
                      </div>
                      <Separator className="my-4" />
                      <Tabs defaultValue="parts">
                        <TabsList>
                          <TabsTrigger value="parts">
                            Spare Parts ({aiAnalysis.recommendations.spareParts.length})
                          </TabsTrigger>
                          <TabsTrigger value="services">
                            Services ({aiAnalysis.recommendations.services.length})
                          </TabsTrigger>
                          <TabsTrigger value="logistics">
                            Logistics ({aiAnalysis.recommendations.logistics.length})
                          </TabsTrigger>
                          <TabsTrigger value="finance">
                            Finance ({aiAnalysis.recommendations.finance.length})
                          </TabsTrigger>
                        </TabsList>
                        <TabsContent value="parts" className="space-y-4">
                          {aiAnalysis.recommendations.spareParts.length === 0 && (
                            <p className="text-muted-foreground">No matching spare parts found.</p>
                          )}
                          {aiAnalysis.recommendations.spareParts.map((item, idx) => (
                            <RecommendationCard key={idx} item={item} type="parts" />
                          ))}
                        </TabsContent>
                        <TabsContent value="services" className="space-y-4">
                          {aiAnalysis.recommendations.services.length === 0 && (
                            <p className="text-muted-foreground">No matching services found.</p>
                          )}
                          {aiAnalysis.recommendations.services.map((item, idx) => (
                            <RecommendationCard key={idx} item={item} type="services" />
                          ))}
                        </TabsContent>
                        <TabsContent value="logistics" className="space-y-4">
                          {aiAnalysis.recommendations.logistics.length === 0 && (
                            <p className="text-muted-foreground">No matching logistics providers found.</p>
                          )}
                          {aiAnalysis.recommendations.logistics.map((item, idx) => (
                            <RecommendationCard key={idx} item={item} type="logistics" />
                          ))}
                        </TabsContent>
                        <TabsContent value="finance" className="space-y-4">
                          {aiAnalysis.recommendations.finance.length === 0 && (
                            <p className="text-muted-foreground">No matching finance providers found.</p>
                          )}
                          {aiAnalysis.recommendations.finance.map((item, idx) => (
                            <RecommendationCard key={idx} item={item} type="finance" />
                          ))}
                        </TabsContent>
                      </Tabs>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
          {/* Sidebar */}
          <div className="space-y-6">
            {user && robot?.profiles ? (
              <Card>
                <CardHeader>
                  <CardTitle>Seller Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {robot.profiles?.full_name && (
                      <div className="flex items-center gap-2">
                        <User /> {robot.profiles.full_name}
                      </div>
                    )}
                    {robot.profiles?.company_name && (
                      <div className="flex items-center gap-2">
                        <Building /> {robot.profiles.company_name}
                      </div>
                    )}
                    {robot.profiles?.phone && (
                      <div className="flex items-center gap-2">
                        <Phone /> {robot.profiles.phone}
                      </div>
                    )}
                    {robot.profiles?.email && (
                      <div className="flex items-center gap-2">
                        <Mail /> {robot.profiles.email}
                      </div>
                    )}
                    {robot.profiles?.location && (
                      <div className="flex items-center gap-2">
                        <MapPin /> {robot.profiles.location}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Login Required</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>Please sign in to view seller info and AI features.</p>
                  <Button onClick={() => navigate("/auth")} className="w-full">
                    Login / Sign Up
                  </Button>
                </CardContent>
              </Card>
            )}

            {user && (
              <Card>
                <CardContent>
                  <Button
                    onClick={handleContactSeller}
                    disabled={!hasPhone}
                    className="mb-3 w-full flex items-center justify-center gap-2"
                  >
                    <PhoneCall /> Contact Seller
                  </Button>

                  <Button
                    onClick={handleRequestQuote}
                    disabled={!hasEmail}
                    variant="outline"
                    className="mb-3 w-full flex items-center justify-center gap-2"
                  >
                    <MessageCircle /> Request Quote
                  </Button>

                  <Button
                    onClick={handleWatchlistToggle}
                    disabled={addingToWatchlist}
                    variant="outline"
                    className="w-full flex items-center justify-center gap-2"
                  >
                    <Heart className={isInWatchlist ? "fill-red-600" : ""} />
                    {isInWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
                    {addingToWatchlist && <Loader2 className="animate-spin w-4 h-4 ml-2" />}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Fullscreen Image Modal */}
      <Dialog open={showFullscreen} onOpenChange={setShowFullscreen}>
        <DialogContent className="max-w-7xl max-h-[90vh] p-0">
          <div className="relative">
            <img
              src={robot.images[currentImageIndex]}
              alt={`${robot.name} image ${currentImageIndex + 1}`}
              className="w-full h-full object-contain"
            />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close fullscreen"
              className="absolute top-4 right-4 text-white bg-black/50"
              onClick={() => setShowFullscreen(false)}
            >
              <X />
            </Button>

            {robot.images.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Previous image"
                  className="absolute top-1/2 left-2 -translate-y-1/2 text-white bg-black/50"
                  onClick={() =>
                    setCurrentImageIndex((idx) =>
                      idx === 0 ? robot.images.length - 1 : idx - 1
                    )
                  }
                >
                  <ChevronLeft />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Next image"
                  className="absolute top-1/2 right-2 -translate-y-1/2 text-white bg-black/50"
                  onClick={() =>
                    setCurrentImageIndex((idx) => (idx + 1) % robot.images.length)
                  }
                >
                  <ChevronRight />
                </Button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white bg-black/50 rounded px-3 py-1 text-sm">
                  {currentImageIndex + 1} / {robot.images.length}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Quote Request Modal */}
      <Dialog open={showQuoteModal} onOpenChange={setShowQuoteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request a Quote</DialogTitle>
            <DialogDescription>
              Send your request to {robot.profiles?.company_name || robot.profiles?.full_name}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={quoteMessage}
            onChange={(e) => setQuoteMessage(e.target.value)}
            placeholder="Enter your message or requirements"
            rows={5}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuoteModal(false)}>
              Cancel
            </Button>
            <Button onClick={sendQuoteEmail} disabled={!hasEmail}>
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RobotDetails;
