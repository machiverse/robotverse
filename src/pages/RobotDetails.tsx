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

// Robot and AI Analysis Types
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

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteMessage, setQuoteMessage] = useState("");
  const [addingToWatchlist, setAddingToWatchlist] = useState(false);
  const [isInWatchlist, setIsInWatchlist] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchRobot = async () => {
      try {
        setLoading(true);
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
          const watchlist = JSON.parse(localStorage.getItem(`watchlist_${user.id}`) || "[]");
          setIsInWatchlist(watchlist.includes(data.id));
        }
      } catch (err) {
        console.error("Error fetching robot:", err);
        setError(err instanceof Error ? err.message : "Failed to load robot details");
      } finally {
        setLoading(false);
      }
    };

    fetchRobot();
  }, [id, user]);

  // AI Analysis button handler with stopPropagation:
  const handleAIAnalysis = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!robot || !user) {
      toast({
        title: "Login Required",
        description: "Please log in to access AI analysis features",
        variant: "destructive",
      });
      return;
    }

    const runAnalysis = async () => {
      setAnalysisLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("robotverse-ai-analyze", {
          body: { robotId: robot.id, userId: user.id },
        });
        if (error) throw error;
        setAiAnalysis(data);
        toast({
          title: "AI Analysis Complete",
          description: "Smart recommendations generated successfully",
        });
      } catch (err) {
        console.error("Error getting AI analysis:", err);
        toast({
          title: "Analysis Failed",
          description: err instanceof Error ? err.message : "Failed to generate AI analysis",
          variant: "destructive",
        });
      } finally {
        setAnalysisLoading(false);
      }
    };

    runAnalysis();
  };

  // Contact Seller
  const handleContactSeller = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!robot?.profiles?.phone) {
      toast({
        title: "Phone Number Not Available",
        description: "Seller's phone number is not provided.",
        variant: "destructive",
      });
      return;
    }
    const phoneNumber = robot.profiles.phone.replace(/\D/g, "");
    window.open(`tel:${phoneNumber}`, "_self");
    toast({
      title: "Calling Seller",
      description: `Calling ${robot.profiles.full_name} at ${robot.profiles.phone}`,
    });
  };

  // Request Quote
  const handleRequestQuote = (e: React.MouseEvent) => {
    e.stopPropagation();
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

  // Send Quote Email
  const sendQuoteEmail = () => {
    if (!robot?.profiles?.email) return;

    const subject = `Quote Request for ${robot.name} - ${robot.model}`;
    const body = `Dear ${robot.profiles.full_name},

I am interested in the following robot:

Robot: ${robot.name}
Model: ${robot.model}
Type: ${robot.robot_type}
Listed Price: ${
      robot.price ? `${robot.currency} ${robot.price}` : "Price on Request"
    }

${quoteMessage ? `Additional Message:\n${quoteMessage}` : ""}

Please provide me with:
1. Best price quote
2. Availability and delivery timeline
3. Technical specifications
4. Warranty and support details
5. Installation and training options

Best regards,
${user?.user_metadata?.full_name || "Interested Buyer"}`;

    const mailtoLink = `mailto:${robot.profiles.email}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
    window.open(mailtoLink, "_blank");
    setShowQuoteModal(false);
    setQuoteMessage("");
    toast({
      title: "Quote Request Sent",
      description: `Email sent to ${robot.profiles.company_name || robot.profiles.full_name}`,
    });
  };

  // Add/Remove from Watchlist
  const handleAddToWatchlist = (e: React.MouseEvent) => {
    e.stopPropagation();
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
      const watchlist = JSON.parse(localStorage.getItem(`watchlist_${user.id}`) || "[]");
      if (isInWatchlist) {
        const newList = watchlist.filter((id: string) => id !== robot!.id);
        localStorage.setItem(`watchlist_${user.id}`, JSON.stringify(newList));
        setIsInWatchlist(false);
        toast({ title: "Removed from Watchlist", description: `${robot!.name} removed.` });
      } else {
        if (!watchlist.includes(robot!.id)) {
          watchlist.push(robot!.id);
          localStorage.setItem(`watchlist_${user.id}`, JSON.stringify(watchlist));
          setIsInWatchlist(true);
          toast({ title: "Added to Watchlist", description: `${robot!.name} added.` });
        }
      }
    } catch (err) {
      toast({ title: "Error", description: "Could not update watchlist.", variant: "destructive" });
    } finally {
      setAddingToWatchlist(false);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    if (!price) return "Price on Request";
    const symbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : "₹";
    return `${symbol}${price.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <EnhancedHeader />
        <div className="container mx-auto px-4 py-8 flex justify-center items-center">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="ml-2">Loading robot details...</span>
        </div>
      </div>
    );
  }

  if (error || !robot) {
    return (
      <div className="min-h-screen bg-background">
        <EnhancedHeader />
        <div className="container mx-auto px-4 py-8 text-center">
          <Bot className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Robot Not Found</h3>
          <p className="text-muted-foreground">{error ?? "Robot not found."}</p>
          <Button onClick={() => navigate("/robots")} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Robots
          </Button>
        </div>
      </div>
    );
  }

  // Card for AI recommendations inside Tabs
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
            <Button size="sm" variant="outline" aria-label={`Go to ${type} details`}>
              <ArrowLeft />
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
        <Button variant="ghost" onClick={() => navigate("/robots")} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Robots
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image gallery */}
            <Card>
              <CardContent>
                <div className="relative aspect-video rounded-lg bg-muted flex items-center justify-center">
                  {robot.images && robot.images.length > 0 ? (
                    <>
                      <img
                        src={robot.images[currentImageIndex]}
                        alt={`${robot.name} image ${currentImageIndex + 1}`}
                        className="w-full h-full object-contain rounded-lg cursor-pointer"
                        onClick={() => setShowFullscreen(true)}
                      />
                      {robot.images.length > 1 && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCurrentImageIndex((v) => (v === 0 ? robot.images.length - 1 : v - 1));
                            }}
                            aria-label="Previous Image"
                          >
                            <ChevronLeft />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCurrentImageIndex((v) => (v + 1) % robot.images.length);
                            }}
                            aria-label="Next Image"
                          >
                            <ChevronRight />
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 bg-black/50 text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowFullscreen(true);
                        }}
                        aria-label="Fullscreen"
                      >
                        <Maximize2 />
                      </Button>
                      <div className="absolute bottom-2 right-2 bg-black/50 text-white rounded px-2 py-1 text-sm">
                        {currentImageIndex + 1} / {robot.images.length}
                      </div>
                    </>
                  ) : (
                    <Bot className="w-24 h-24 text-muted-foreground" />
                  )}
                </div>

                {robot.images.length > 1 && (
                  <div className="flex mt-4 overflow-x-auto gap-2">
                    {robot.images.map((image, idx) => (
                      <img
                        key={idx}
                        src={image}
                        alt={`${robot.name} thumbnail ${idx + 1}`}
                        className={`w-20 h-20 object-cover rounded cursor-pointer border-2 ${
                          idx === currentImageIndex
                            ? "border-primary"
                            : "border-transparent opacity-50 hover:opacity-100"
                        }`}
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

            {/* Robot details */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{robot.name}</CardTitle>
                    <p className="text-muted-foreground">{robot.model}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold">{formatPrice(robot.price, robot.currency)}</p>
                    <Badge variant={robot.availability === "available" ? "default" : "secondary"}>
                      {robot.availability}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge>{robot.robot_type}</Badge>
                    {robot.category_tags?.map((tag, idx) => (
                      <Badge key={idx} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center text-muted-foreground gap-1">
                    <MapPin />
                    <span>{robot.location}</span>
                  </div>
                  {robot.description && <p>{robot.description}</p>}
                  <div>
                    <p>
                      <strong>Quantity Available: </strong>
                      {robot.quantity}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Technical specifications */}
            {robot.technical_specifications && Object.keys(robot.technical_specifications).length > 0 && (
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

            {/* AI Analysis */}
            {user && (
              <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200">
                <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t">
                  <CardTitle className="flex items-center gap-2">
                    <Brain /> Advanced AI Market Intelligence
                  </CardTitle>
                  <p className="text-sm">
                    Discover suppliers, services, financing & logistics tailored for this robot.
                  </p>
                </CardHeader>
                <CardContent>
                  {!aiAnalysis ? (
                    <div className="text-center">
                      <Button
                        size="lg"
                        disabled={analysisLoading}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                        onClick={handleAIAnalysis}
                      >
                        {analysisLoading ? (
                          <>
                            <Loader2 className="mr-2 w-5 h-5 animate-spin" />
                            Analyzing Market...
                          </>
                        ) : (
                          <>
                            <Brain className="mr-2 w-5 h-5" />
                            Generate Smart Analysis
                          </>
                        )}
                      </Button>
                    </div>
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
                        <TabsContent value="parts">
                          {aiAnalysis.recommendations.spareParts.length === 0 ? (
                            <p className="text-muted-foreground">No spare parts found.</p>
                          ) : (
                            aiAnalysis.recommendations.spareParts.map((item, idx) => (
                              <RecommendationCard key={idx} item={item} type="parts" />
                            ))
                          )}
                        </TabsContent>
                        <TabsContent value="services">
                          {aiAnalysis.recommendations.services.length === 0 ? (
                            <p className="text-muted-foreground">No services found.</p>
                          ) : (
                            aiAnalysis.recommendations.services.map((item, idx) => (
                              <RecommendationCard key={idx} item={item} type="services" />
                            ))
                          )}
                        </TabsContent>
                        <TabsContent value="logistics">
                          {aiAnalysis.recommendations.logistics.length === 0 ? (
                            <p className="text-muted-foreground">No logistics found.</p>
                          ) : (
                            aiAnalysis.recommendations.logistics.map((item, idx) => (
                              <RecommendationCard key={idx} item={item} type="logistics" />
                            ))
                          )}
                        </TabsContent>
                        <TabsContent value="finance">
                          {aiAnalysis.recommendations.finance.length === 0 ? (
                            <p className="text-muted-foreground">No finance providers found.</p>
                          ) : (
                            aiAnalysis.recommendations.finance.map((item, idx) => (
                              <RecommendationCard key={idx} item={item} type="finance" />
                            ))
                          )}
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
            {user && robot.profiles ? (
              <Card>
                <CardHeader>
                  <CardTitle>Seller Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User />
                      <span>{robot.profiles.full_name}</span>
                    </div>
                    {robot.profiles.company_name && (
                      <div className="flex items-center gap-2">
                        <Building />
                        <span>{robot.profiles.company_name}</span>
                      </div>
                    )}
                    {robot.profiles.phone && (
                      <div className="flex items-center gap-2">
                        <Phone />
                        <span>{robot.profiles.phone}</span>
                      </div>
                    )}
                    {robot.profiles.email && (
                      <div className="flex items-center gap-2">
                        <Mail />
                        <span>{robot.profiles.email}</span>
                      </div>
                    )}
                    {robot.profiles.location && (
                      <div className="flex items-center gap-2">
                        <MapPin />
                        <span>{robot.profiles.location}</span>
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
                  <p>Please log in to view seller info and AI features.</p>
                  <Button onClick={() => navigate("/auth")} className="w-full">
                    Login / Sign Up
                  </Button>
                </CardContent>
              </Card>
            )}

            {user && (
              <Card>
                <CardContent className="space-y-3 p-6">
                  <Button
                    onClick={handleContactSeller}
                    disabled={!robot.profiles.phone}
                    className="w-full bg-green-600 hover:bg-green-700 flex items-center justify-center"
                  >
                    <PhoneCall className="mr-2" />
                    Contact Seller
                  </Button>
                  <Button
                    onClick={handleRequestQuote}
                    disabled={!robot.profiles.email}
                    variant="outline"
                    className="w-full border-blue-600 text-blue-600 hover:bg-blue-50 flex items-center justify-center"
                  >
                    <MessageCircle className="mr-2" />
                    Request Quote
                  </Button>
                  <Button
                    onClick={handleAddToWatchlist}
                    disabled={addingToWatchlist}
                    variant="outline"
                    className="w-full border-red-600 text-red-600 hover:bg-red-50 flex items-center justify-center"
                  >
                    {addingToWatchlist ? (
                      <Loader2 className="mr-2 w-5 h-5 animate-spin" />
                    ) : (
                      <Heart className={`mr-2 ${isInWatchlist ? "fill-current text-red-600" : ""}`} />
                    )}
                    {isInWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
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
              alt={`${robot.name} full image`}
              className="w-full h-full object-contain max-h-[90vh]"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 bg-black/50 text-white"
              onClick={() => setShowFullscreen(false)}
              aria-label="Close fullscreen image"
            >
              <X />
            </Button>

            {robot.images.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 text-white"
                  onClick={() => setCurrentImageIndex((v) => (v + robot.images.length - 1) % robot.images.length)}
                  aria-label="Previous image"
                >
                  <ChevronLeft />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 text-white"
                  onClick={() => setCurrentImageIndex((v) => (v + 1) % robot.images.length)}
                  aria-label="Next image"
                >
                  <ChevronRight />
                </Button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white rounded px-3 py-1 text-sm">
                  {currentImageIndex + 1} / {robot.images.length}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Quote Request Modal */}
      <Dialog open={showQuoteModal} onOpenChange={setShowQuoteModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request a Quote</DialogTitle>
            <DialogDescription>
              Send a quote request to {robot.profiles.company_name || robot.profiles.full_name}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Add any questions or requirements here..."
            value={quoteMessage}
            onChange={(e) => setQuoteMessage(e.target.value)}
            rows={5}
            className="mb-4"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuoteModal(false)}>
              Cancel
            </Button>
            <Button onClick={sendQuoteEmail} disabled={!robot.profiles.email}>
              <Mail className="mr-2" />
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RobotDetails;
