import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Bot, MapPin, Building, Phone, Mail, User, ArrowLeft, Loader2, Wrench, Settings, DollarSign, Truck, Brain, Heart, MessageCircle, PhoneCall, X, ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
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

  // Helper: Format price with currency symbol
  const formatPrice = (price: number, currency: string) => {
    const symbols: Record<string, string> = { USD: "$", EUR: "€", INR: "₹" };
    return `${symbols[currency] ?? currency}${price.toLocaleString()}`;
  };

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
            profiles!robots_seller_id (
              full_name, company_name, phone, email, location
            )
          `
          )
          .eq("id", id)
          .single();

        if (error) throw error;

        // Parse technical_specifications if it's a string
        let techSpecs = data.technical_specifications;
        if (typeof techSpecs === "string") {
          try {
            techSpecs = JSON.parse(techSpecs);
          } catch {
            techSpecs = {};
          }
        }

        setRobot({ ...data, technical_specifications: techSpecs });

        if (user) {
          const watchlist = JSON.parse(localStorage.getItem(`watchlist_${user.id}`) ?? "[]");
          setIsInWatchlist(watchlist.includes(data.id));
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load robot details";
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
    setCurrentImageIndex((prev) => (prev + 1) % robot.images.length);
  };

  const prevImage = () => {
    if (!robot?.images?.length) return;
    setCurrentImageIndex((prev) => (prev + robot.images.length - 1) % robot.images.length);
  };

  const handleContactSeller = () => {
    if (!robot?.profiles?.phone) {
      toast({
        title: "Phone Not Available",
        description: "Seller's phone number is not provided.",
        variant: "destructive",
      });
      return;
    }
    const phone = robot.profiles.phone.replace(/\D/g, "");
    window.open(`tel:${phone}`, "_self");
    toast({
      title: "Calling Seller",
      description: `Calling ${robot.profiles.full_name} at ${robot.profiles.phone}`,
    });
  };

  const handleRequestQuote = () => {
    if (!robot?.profiles?.email) {
      toast({
        title: "Email Not Available",
        description: "Seller's email is not provided.",
        variant: "destructive",
      });
      return;
    }
    setShowQuoteModal(true);
  };

  const sendQuoteEmail = () => {
    if (!robot?.profiles?.email) return;

    const subject = `Quote Request for ${robot.name} - ${robot.model}`;
    const body = `Dear ${robot.profiles.full_name},

I am interested in the robot:
Name: ${robot.name}
Model: ${robot.model}
Type: ${robot.robot_type}
Price: ${robot.price ? formatPrice(robot.price, robot.currency) : "Price on request"}

${quoteMessage ? `Message:\n${quoteMessage}\n\n` : ""}

Please provide pricing, delivery timelines, specifications, warranty and installation options.

Regards,
${user?.user_metadata?.full_name ?? "Interested Buyer"}`;

    const mailtoLink = `mailto:${robot.profiles.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoLink, "_blank");

    toast({
      title: "Quote Email Prepared",
      description: `Email ready to send to ${robot.profiles.company_name || robot.profiles.full_name}`,
    });

    setShowQuoteModal(false);
    setQuoteMessage("");
  };

  const toggleWatchlist = () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to manage your watchlist.",
        variant: "destructive",
      });
      return;
    }
    setAddingToWatchlist(true);
    try {
      const key = `watchlist_${user.id}`;
      const watchlist: string[] = JSON.parse(localStorage.getItem(key) ?? "[]");

      if (robot && watchlist.includes(robot.id)) {
        // Remove
        const updated = watchlist.filter((id) => id !== robot.id);
        localStorage.setItem(key, JSON.stringify(updated));
        setIsInWatchlist(false);
        toast({
          title: "Removed from Watchlist",
          description: `${robot.name} removed from your watchlist.`,
        });
      } else if (robot) {
        // Add
        watchlist.push(robot.id);
        localStorage.setItem(key, JSON.stringify(watchlist));
        setIsInWatchlist(true);
        toast({
          title: "Added to Watchlist",
          description: `${robot.name} added to your watchlist.`,
        });
      }
    } catch (error) {
      toast({
        title: "Watchlist Error",
        description: "Failed to update watchlist. Try again later.",
        variant: "destructive",
      });
    } finally {
      setAddingToWatchlist(false);
    }
  };

  const handleAIAnalysis = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to use AI analysis.",
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
        title: "AI Analysis Complete",
        description: "Smart recommendations generated.",
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to run AI analysis.";
      toast({
        title: "AI Analysis Error",
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
        <Loader2 className="animate-spin mr-2" />
        Loading robot details...
      </div>
    );

  if (error || !robot)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
        <Bot size={80} className="text-muted" />
        <h2 className="mt-4 text-xl">Robot not found</h2>
        <p className="mt-2 text-muted">{error ?? "The robot was not found or has been removed."}</p>
        <Button onClick={() => navigate("/robots")} className="mt-6">
          <ArrowLeft className="mr-1" /> Back to Robots
        </Button>
      </div>
    );

  return (
    <>
      <EnhancedHeader />
      <main className="container mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-screen">
        {/* Left/Main Content */}
        <section className="lg:col-span-2 space-y-6">
          {/* Image Gallery */}
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

                  {/* Navigation Buttons */}
                  {robot.images.length > 1 && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white"
                        onClick={prevImage}
                        aria-label="Previous Image"
                      >
                        <ChevronLeft />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white"
                        onClick={nextImage}
                        aria-label="Next Image"
                      >
                        <ChevronRight />
                      </Button>
                      <div className="absolute bottom-2 right-2 bg-black/50 text-white px-2 rounded text-sm select-none">
                        {currentImageIndex + 1} / {robot.images.length}
                      </div>
                    </>
                  )}

                  {/* Fullscreen Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 bg-black/50 text-white"
                    onClick={() => setShowFullscreen(true)}
                    aria-label="View Fullscreen"
                  >
                    <Maximize2 />
                  </Button>
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Bot size={80} className="text-muted" />
                  <span className="ml-4 text-muted">No images available</span>
                </div>
              )}
            </CardContent>

            {/* Thumbnail Gallery */}
            {robot.images?.length > 1 && (
              <div className="mt-2 flex space-x-2 overflow-x-auto">
                {robot.images.map((img, index) => (
                  <img
                    key={index}
                    src={img}
                    alt={`${robot.name} thumbnail ${index + 1}`}
                    className={`w-20 h-20 object-cover rounded cursor-pointer border-2 ${index === currentImageIndex ? "border-primary" : "border-transparent"}`}
                    onClick={() => setCurrentImageIndex(index)}
                  />
                ))}
              </div>
            )}
          </Card>

          {/* Robot Info */}
          <Card>
            <CardHeader>
              <CardTitle>{robot.name}</CardTitle>
              <p className="text-muted text-lg">{robot.model}</p>
            </CardHeader>

            <CardContent>
              <div className="flex flex-wrap gap-2 mb-3">
                <Badge>{robot.robot_type}</Badge>
                {robot.category_tags.map((tag, i) => (
                  <Badge key={i} variant="secondary">{tag}</Badge>
                ))}
              </div>

              <div className="flex justify-between items-center mb-3">
                <span className="text-2xl font-semibold">
                  {robot.price ? formatPrice(robot.price, robot.currency) : "Price on request"}
                </span>
                <Badge variant={robot.availability === "available" ? "default" : "secondary"}>
                  {robot.availability}
                </Badge>
              </div>

              <p>{robot.description}</p>

              <Separator className="my-3" />

              <div>
                <strong>Quantity Available:</strong> {robot.quantity}
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
                <dl className="grid grid-cols-2 gap-4">
                  {Object.entries(robot.technical_specifications).map(([key, val]) => (
                    <div key={key}>
                      <dt className="font-medium capitalize">{key.replace(/_/g, " ")}</dt>
                      <dd>{String(val)}</dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          )}

          {/* AI Analysis Section */}
          {user && (
            <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200 border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain /> Advanced Market Intelligence
                </CardTitle>
                <p className="text-blue-700">
                  Discover recommended parts, services, logistics, and finance options for this robot.
                </p>
              </CardHeader>

              <CardContent>
                {!aiAnalysis ? (
                  <>
                    <p className="mb-4">
                      Unlock AI-powered market insights tailored to your needs.
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
                          <Brain className="mr-2" /> Analyze with AI
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="whitespace-pre-wrap mb-4">{aiAnalysis.analysis}</p>

                    <Tabs defaultValue="parts">
                      <TabsList className="grid grid-cols-4 bg-white border border-gray-200 rounded-md">
                        <TabsTrigger value="parts">Parts ({aiAnalysis.recommendations.spareParts.length})</TabsTrigger>
                        <TabsTrigger value="services">Services ({aiAnalysis.recommendations.services.length})</TabsTrigger>
                        <TabsTrigger value="logistics">Logistics ({aiAnalysis.recommendations.logistics.length})</TabsTrigger>
                        <TabsTrigger value="finance">Finance ({aiAnalysis.recommendations.finance.length})</TabsTrigger>
                      </TabsList>

                      <TabsContent value="parts">
                        {aiAnalysis.recommendations.spareParts.length === 0 ? (
                          <p>No parts recommendations found.</p>
                        ) : aiAnalysis.recommendations.spareParts.map((item, idx) => (
                          <Card key={idx} className="mb-2">
                            <CardContent>
                              <div className="flex justify-between items-center">
                                <span>{item.name}</span>
                                <Button onClick={() => navigate("/parts")} size="sm">
                                  <Wrench className="mr-1" /> View
                                </Button>
                              </div>
                              <div className="text-sm text-muted">{item.profiles?.company_name}</div>
                            </CardContent>
                          </Card>
                        ))}
                      </TabsContent>

                      <TabsContent value="services">
                        {aiAnalysis.recommendations.services.length === 0 ? (
                          <p>No services recommendations found.</p>
                        ) : aiAnalysis.recommendations.services.map((item, idx) => (
                          <Card key={idx} className="mb-2">
                            <CardContent>
                              <div className="flex justify-between items-center">
                                <span>{item.name}</span>
                                <Button onClick={() => navigate("/services")} size="sm">
                                  <Settings className="mr-1" /> Find
                                </Button>
                              </div>
                              <div className="text-sm text-muted">{item.profiles?.company_name}</div>
                            </CardContent>
                          </Card>
                        ))}
                      </TabsContent>

                      <TabsContent value="logistics">
                        {aiAnalysis.recommendations.logistics.length === 0 ? (
                          <p>No logistics providers found.</p>
                        ) : aiAnalysis.recommendations.logistics.map((item, idx) => (
                          <Card key={idx} className="mb-2">
                            <CardContent>
                              <div className="flex justify-between items-center">
                                <span>{item.company_name || item.full_name}</span>
                                <Button size="sm" disabled>
                                  <Truck className="mr-1" /> Via Platform
                                </Button>
                              </div>
                              <div className="text-sm text-muted">{item.location}</div>
                            </CardContent>
                          </Card>
                        ))}
                      </TabsContent>

                      <TabsContent value="finance">
                        {aiAnalysis.recommendations.finance.length === 0 ? (
                          <p>No finance providers found.</p>
                        ) : aiAnalysis.recommendations.finance.map((item, idx) => (
                          <Card key={idx} className="mb-2">
                            <CardContent>
                              <div className="flex justify-between items-center">
                                <span>{item.company_name || item.full_name}</span>
                                <Button size="sm" disabled>
                                  <DollarSign className="mr-1" /> Via Platform
                                </Button>
                              </div>
                              <div className="text-sm text-muted">{item.location}</div>
                            </CardContent>
                          </Card>
                        ))}
                      </TabsContent>
                    </Tabs>
                  </>
                )}
              </CardContent>
            </Card>
          </section>

        {/* Right Sidebar */}
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
                <p>Please login to see seller details and access AI features.</p>
                <Button onClick={() => navigate("/auth")}>Login / Sign Up</Button>
              </CardContent>
            </Card>
          )}

          {/* Seller Actions */}
          {user && (
            <Card>
              <CardContent className="space-y-3">
                <Button
                  onClick={handleContactSeller}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <PhoneCall className="mr-2" />
                  Call Seller
                </Button>
                <Button onClick={handleRequestQuote} className="w-full" variant="outline">
                  <MessageCircle className="mr-2" />
                  Request Quote
                </Button>
                <Button
                  onClick={toggleWatchlist}
                  className="w-full"
                  variant={isInWatchlist ? "destructive" : "secondary"}
                  disabled={addingToWatchlist}
                >
                  <Heart className={`mr-2 ${isInWatchlist ? "fill-current" : ""}`} />
                  {isInWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
                </Button>
              </CardContent>
            </Card>
          )}
        </aside>
      </main>

      {/* Fullscreen Image Modal */}
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
              aria-label="Close Fullscreen"
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
                  aria-label="Previous Image"
                >
                  <ChevronLeft />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/70 text-white"
                  onClick={nextImage}
                  aria-label="Next Image"
                >
                  <ChevronRight />
                </Button>
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-3 rounded text-sm select-none">
                  {currentImageIndex + 1} / {robot.images.length}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Quote Request Modal */}
      <Dialog open={showQuoteModal} onOpenChange={setShowQuoteModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Quote</DialogTitle>
          </DialogHeader>
          <Textarea
            rows={5}
            value={quoteMessage}
            onChange={e => setQuoteMessage(e.target.value)}
            placeholder="Write your message to the seller..."
          />
          <DialogFooter>
            <Button onClick={() => setShowQuoteModal(false)} variant="outline">Cancel</Button>
            <Button onClick={sendQuoteEmail}>Send Email</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RobotDetails;
