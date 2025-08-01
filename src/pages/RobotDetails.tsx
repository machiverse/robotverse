import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Brain,
  Heart,
  MessageCircle,
  PhoneCall,
  X,
  Wrench,
  DollarSign,
  Truck,
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
    full_name: string;
    company_name: string;
    phone: string;
    email: string;
    location: string;
  };
}

interface AIRecommendation {
  name: string;
  profiles?: {
    company_name?: string;
  };
  company_name?: string;
  full_name?: string;
  location?: string;
}

interface AIAnalysisResult {
  analysis: string;
  recommendations: {
    spareParts: AIRecommendation[];
    services: AIRecommendation[];
    logistics: AIRecommendation[];
    finance: AIRecommendation[];
  };
}

const RobotDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const [robot, setRobot] = useState<Robot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResult | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteMessage, setQuoteMessage] = useState("");
  const [addingToWatchlist, setAddingToWatchlist] = useState(false);
  const [isInWatchlist, setIsInWatchlist] = useState(false);

  // Helper for price formatting
  const formatPrice = (price: number, currency: string) => {
    const symbols: Record<string, string> = { USD: "$", EUR: "€", INR: "₹" };
    return `${symbols[currency] ?? currency}${price.toLocaleString()}`;
  };

  // Fetch robot details with seller profile
  useEffect(() => {
    if (!id) return;

    const fetchRobot = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("robots")
          .select(
            `*, profiles:profiles!robots_seller_id_fkey (
              full_name, company_name, phone, email, location
            )`
          )
          .eq("id", id)
          .single();

        if (error) throw error;

        // Parse technical_specifications if needed (some DB setups return string)
        let specs = data.technical_specifications;
        if (typeof specs === "string") {
          try {
            specs = JSON.parse(specs);
          } catch {
            specs = {};
          }
        }

        setRobot({ ...data, technical_specifications: specs });

        if (user && data.id) {
          const savedList = JSON.parse(
            localStorage.getItem(`watchlist_${user.id}`) ?? "[]"
          );
          setIsInWatchlist(savedList.includes(data.id));
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to load robot details.";
        setError(msg);
        toast({
          title: "Error",
          description: msg,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchRobot();
  }, [id, user, toast]);

  const nextImage = () => {
    if (!robot?.images?.length) return;
    setCurrentImageIndex((i) => (i + 1) % robot.images.length);
  };
  const prevImage = () => {
    if (!robot?.images?.length) return;
    setCurrentImageIndex((i) => (i - 1 + robot.images.length) % robot.images.length);
  };

  // Call seller phone
  const handleContactSeller = () => {
    if (!robot?.profiles?.phone) {
      toast({
        title: "No phone available",
        description: "Seller phone number is not provided.",
        variant: "destructive",
      });
      return;
    }
    const phoneNum = robot.profiles.phone.replace(/\D/g, "");
    window.open(`tel:${phoneNum}`, "_self");
    toast({
      title: "Calling Seller",
      description: `Calling ${robot.profiles.full_name} at ${robot.profiles.phone}`,
    });
  };

  // Open quote modal
  const handleRequestQuote = () => {
    if (!robot?.profiles?.email) {
      toast({
        title: "No email available",
        description: "Seller email is not provided.",
        variant: "destructive",
      });
      return;
    }
    setShowQuoteModal(true);
  };

  // Compose quote email
  const sendQuoteEmail = () => {
    if (!robot?.profiles?.email || !robot) return;

    const subject = `Quote Request: ${robot.name} (${robot.model})`;
    const msg = `Dear ${robot.profiles.full_name},

I am interested in the following robot:

- Name: ${robot.name}
- Model: ${robot.model}
- Type: ${robot.robot_type}
- Price: ${robot.price ? formatPrice(robot.price, robot.currency) : "Price on request"}

${quoteMessage ? `Message:\n${quoteMessage}\n\n` : ""}
Please send me your best price, delivery timeline, technical specs,
warranty details, and installation options.

Regards,
${user?.user_metadata?.full_name ?? "Interested Buyer"}
`;

    const mailto = `mailto:${robot.profiles.email}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(msg)}`;
    window.open(mailto, "_blank");

    toast({
      title: "Quote Email Ready",
      description: `Prepared email to ${robot.profiles.company_name ?? robot.profiles.full_name}`,
    });

    setQuoteMessage("");
    setShowQuoteModal(false);
  };

  // Watchlist add/remove
  const toggleWatchlist = () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to manage your watchlist.",
        variant: "destructive",
      });
      return;
    }

    setAddingToWatchlist(true);

    try {
      const key = `watchlist_${user.id}`;
      const list: string[] = JSON.parse(localStorage.getItem(key) ?? "[]");

      if (robot && list.includes(robot.id)) {
        const updatedList = list.filter((rid) => rid !== robot.id);
        localStorage.setItem(key, JSON.stringify(updatedList));
        setIsInWatchlist(false);
        toast({
          title: "Removed from Watchlist",
          description: `${robot.name} removed.`,
        });
      } else if (robot) {
        list.push(robot.id);
        localStorage.setItem(key, JSON.stringify(list));
        setIsInWatchlist(true);
        toast({
          title: "Added to Watchlist",
          description: `${robot.name} added.`,
        });
      }
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

  // AI analysis call
  const handleAIAnalysis = async () => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please login to access AI features.",
        variant: "destructive",
      });
      return;
    }
    if (!robot) return;

    setAnalysisLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("robotverse-ai-analyze", {
        body: { robotId: robot.id, userId: user.id },
      });

      if (error) throw error;

      setAiAnalysis(data);
      toast({
        title: "AI Analysis Success",
        description: "Smart insights generated.",
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "AI analysis failed.";
      toast({
        title: "Error",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setAnalysisLoading(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin mr-2" /> Loading robot details...
      </div>
    );

  if (error || !robot)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <Bot size={80} className="mb-6 text-muted" />
        <h2 className="text-2xl font-semibold mb-2">Robot Not Found</h2>
        <p className="mb-4 text-muted">{error ?? "No data available."}</p>
        <Button onClick={() => navigate("/robots")} aria-label="Back to robots list">
          <ArrowLeft className="mr-2" /> Back to Robots
        </Button>
      </div>
    );

  return (
    <>
      <EnhancedHeader />
      <main className="container mx-auto p-4 min-h-screen grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left/Main Section */}
        <section className="space-y-6 lg:col-span-2">
          <Card>
            <CardContent className="relative aspect-video rounded-lg bg-muted">
              {robot.images?.length ? (
                <>
                  <img
                    src={robot.images[currentImageIndex]}
                    alt={`${robot.name} image ${currentImageIndex + 1}`}
                    className="w-full h-full object-cover rounded-lg cursor-pointer"
                    onClick={() => setShowFullscreen(true)}
                  />
                  {robot.images.length > 1 && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white"
                        onClick={prevImage}
                        aria-label="Previous image"
                      >
                        <ChevronLeft />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white"
                        onClick={nextImage}
                        aria-label="Next image"
                      >
                        <ChevronRight />
                      </Button>
                      <div className="absolute bottom-2 right-2 bg-black/60 rounded px-2 py-1 text-white text-sm select-none">
                        {currentImageIndex + 1} / {robot.images.length}
                      </div>
                    </>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 bg-black/50 text-white"
                    onClick={() => setShowFullscreen(true)}
                    aria-label="Open fullscreen"
                  >
                    <Maximize2 />
                  </Button>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted">
                  <Bot size={80} />
                  <p className="mt-2">No images available</p>
                </div>
              )}
            </CardContent>
            {robot.images.length > 1 && (
              <div className="mt-2 flex space-x-2 overflow-x-auto">
                {robot.images.map((imgUrl, idx) => (
                  <img
                    key={idx}
                    src={imgUrl}
                    alt={`${robot.name} thumbnail ${idx + 1}`}
                    className={`h-20 w-20 rounded cursor-pointer object-cover transition ${
                      idx === currentImageIndex ? "ring-2 ring-primary" : ""
                    }`}
                    onClick={() => setCurrentImageIndex(idx)}
                  />
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{robot.name}</CardTitle>
              <p className="text-lg text-muted">{robot.model}</p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-3">
                <Badge>{robot.robot_type}</Badge>
                {robot.category_tags.map((tag, idx) => (
                  <Badge key={idx} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>

              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl font-semibold">
                  {robot.price ? formatPrice(robot.price, robot.currency) : "Price on request"}
                </span>
                <Badge variant={robot.availability === "available" ? "default" : "secondary"}>
                  {robot.availability}
                </Badge>
              </div>

              <p>{robot.description}</p>

              <Separator className="my-4" />

              <div>
                <strong>Quantity available:</strong> {robot.quantity}
              </div>
            </CardContent>
          </Card>

          {robot.technical_specifications && Object.keys(robot.technical_specifications).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Technical Specifications</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-4">
                  {Object.entries(robot.technical_specifications).map(([key, value]) => (
                    <div key={key}>
                      <dt className="font-medium capitalize">{key.replace(/_/g, " ")}</dt>
                      <dd>{String(value)}</dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          )}

          {user && (
            <Card className="border-blue-500 bg-gradient-to-r from-blue-50 to-blue-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain /> Advanced AI Market Intelligence
                </CardTitle>
                <p className="text-blue-700">
                  Discover recommended parts, services, logistics, and finance options tailored for this robot.
                </p>
              </CardHeader>
              <CardContent>
                {!aiAnalysis ? (
                  <>
                    <p className="mb-4">
                      Get AI insights tailored to your needs.
                    </p>
                    <Button
                      onClick={handleAIAnalysis}
                      disabled={analysisLoading}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                    >
                      {analysisLoading ? (
                        <>
                          <Loader2 className="animate-spin mr-2" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Brain className="mr-2" />
                          Analyze with AI
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="whitespace-pre-wrap">{aiAnalysis.analysis}</p>
                    <Tabs defaultValue="spareParts">
                      <TabsList className="grid grid-cols-4 bg-white border border-gray-200 rounded-md">
                        <TabsTrigger value="spareParts">
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

                      <TabsContent value="spareParts">
                        {aiAnalysis.recommendations.spareParts.length === 0 ? (
                          <p>No spare parts found.</p>
                        ) : (
                          aiAnalysis.recommendations.spareParts.map((item, idx) => (
                            <Card key={idx} className="mb-2">
                              <CardContent>
                                <div className="flex justify-between">
                                  <span>{item.name}</span>
                                  <Button onClick={() => navigate("/parts")} size="sm">
                                    <Wrench className="mr-1" /> View
                                  </Button>
                                </div>
                                <div className="text-sm text-muted">{item.profiles?.company_name}</div>
                              </CardContent>
                            </Card>
                          ))
                        )}
                      </TabsContent>

                      <TabsContent value="services">
                        {aiAnalysis.recommendations.services.length === 0 ? (
                          <p>No services found.</p>
                        ) : (
                          aiAnalysis.recommendations.services.map((item, idx) => (
                            <Card key={idx} className="mb-2">
                              <CardContent>
                                <div className="flex justify-between">
                                  <span>{item.name}</span>
                                  <Button onClick={() => navigate("/services")} size="sm">
                                    <Wrench className="mr-1" /> Find
                                  </Button>
                                </div>
                                <div className="text-sm text-muted">{item.profiles?.company_name}</div>
                              </CardContent>
                            </Card>
                          ))
                        )}
                      </TabsContent>

                      <TabsContent value="logistics">
                        {aiAnalysis.recommendations.logistics.length === 0 ? (
                          <p>No logistics partners found.</p>
                        ) : (
                          aiAnalysis.recommendations.logistics.map((item, idx) => (
                            <Card key={idx} className="mb-2">
                              <CardContent>
                                <div className="flex justify-between">
                                  <span>{item.company_name ?? item.full_name}</span>
                                  <Button size="sm" disabled>
                                    <Truck className="mr-1" /> Contact
                                  </Button>
                                </div>
                                <div className="text-sm text-muted">{item.location}</div>
                              </CardContent>
                            </Card>
                          ))
                        )}
                      </TabsContent>

                      <TabsContent value="finance">
                        {aiAnalysis.recommendations.finance.length === 0 ? (
                          <p>No finance options found.</p>
                        ) : (
                          aiAnalysis.recommendations.finance.map((item, idx) => (
                            <Card key={idx} className="mb-2">
                              <CardContent>
                                <div className="flex justify-between">
                                  <span>{item.company_name ?? item.full_name}</span>
                                  <Button size="sm" disabled>
                                    <DollarSign className="mr-1" /> Contact
                                  </Button>
                                </div>
                                <div className="text-sm text-muted">{item.location}</div>
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

        {/* Sidebar */}
        <aside className="space-y-6">
          {robot.profiles && user ? (
            <Card>
              <CardHeader>
                <CardTitle>Seller Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User /> {robot.profiles.full_name}
                  </div>
                  {robot.profiles.company_name && (
                    <div className="flex items-center gap-2">
                      <Building /> {robot.profiles.company_name}
                    </div>
                  )}
                  {robot.profiles.phone && (
                    <div className="flex items-center gap-2">
                      <Phone /> {robot.profiles.phone}
                    </div>
                  )}
                  {robot.profiles.email && (
                    <div className="flex items-center gap-2">
                      <Mail /> {robot.profiles.email}
                    </div>
                  )}
                  {robot.profiles.location && (
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
                <p>Please login to view seller details and access AI features.</p>
                <Button onClick={() => navigate("/auth")}>Login / Sign Up</Button>
              </CardContent>
            </Card>
          )}

          {user && (
            <Card>
              <CardContent className="space-y-3">
                <Button
                  onClick={handleContactSeller}
                  variant="default"
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <PhoneCall className="mr-2" /> Contact Seller
                </Button>
                <Button onClick={handleRequestQuote} variant="outline" className="w-full">
                  <MessageCircle className="mr-2" /> Request Quote
                </Button>
                <Button
                  onClick={toggleWatchlist}
                  variant={isInWatchlist ? "destructive" : "secondary"}
                  className="w-full"
                  disabled={addingToWatchlist}
                >
                  <Heart className={`mr-2 ${isInWatchlist ? "fill-current text-red-600" : ""}`} />{" "}
                  {isInWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
                </Button>
              </CardContent>
            </Card>
          )}
        </aside>
      </main>

      {/* Image fullscreen modal */}
      <Dialog open={showFullscreen} onOpenChange={setShowFullscreen}>
        <DialogContent className="max-w-screen-xl max-h-screen p-0">
          <div className="relative">
            <img
              src={robot.images[currentImageIndex]}
              alt={`${robot.name} fullscreen image`}
              className="w-full h-full object-contain max-h-screen"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 bg-black/70 text-white"
              onClick={() => setShowFullscreen(false)}
              aria-label="Close fullscreen"
            >
              <X />
            </Button>

            {robot.images.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/70 text-white"
                  onClick={prevImage}
                  aria-label="Previous image"
                >
                  <ChevronLeft />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/70 text-white"
                  onClick={nextImage}
                  aria-label="Next image"
                >
                  <ChevronRight />
                </Button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 rounded px-3 py-1 text-white text-sm select-none">
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
          </DialogHeader>
          <Textarea
            rows={5}
            value={quoteMessage}
            onChange={(e) => setQuoteMessage(e.target.value)}
            placeholder="Write your message to the seller..."
          />
          <DialogFooter>
            <Button onClick={() => setShowQuoteModal(false)} variant="outline">
              Cancel
            </Button>
            <Button onClick={sendQuoteEmail}>Send</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RobotDetails;
