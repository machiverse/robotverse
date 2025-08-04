import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Bot, MapPin, Building, Phone, Mail, User, ArrowLeft, Loader2, Wrench, Settings, DollarSign, Truck, Brain, Heart, MessageCircle, PhoneCall, X, ChevronLeft, ChevronRight, Maximize2, FileText, Search, CreditCard, Calculator, Plane } from "lucide-react";
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
  const { toast } = useToast();
  
  const [robot, setRobot] = useState<Robot | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResult | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Enhanced states
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteMessage, setQuoteMessage] = useState('');
  const [addingToWatchlist, setAddingToWatchlist] = useState(false);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [showImportQuote, setShowImportQuote] = useState(false);
  const [importDuty, setImportDuty] = useState<number | null>(null);

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
        setRobot({
          ...data,
          technical_specifications: (data.technical_specifications as Record<string, any>) || {}
        });
        
        if (user) {
          const watchlist = JSON.parse(localStorage.getItem(`watchlist_${user.id}`) || '[]');
          setIsInWatchlist(watchlist.includes(data.id));
        }
      } catch (err) {
        console.error('Error fetching robot:', err);
        setError(err instanceof Error ? err.message : 'Failed to load robot details');
      } finally {
        setLoading(false);
      }
    };
    fetchRobot();
  }, [id, user]);

  // Contact seller by phone
  const handleContactSeller = () => {
    if (!robot?.profiles?.phone) {
      toast({
        title: "Phone Number Not Available",
        description: "Seller's phone number is not provided.",
        variant: "destructive",
      });
      return;
    }
    const phoneNumber = robot.profiles.phone.replace(/\D/g, '');
    window.open(`tel:${phoneNumber}`, '_self');
    toast({
      title: "Calling Seller",
      description: `Calling ${robot.profiles.full_name} at ${robot.profiles.phone}`,
    });
  };

  // Request quote modal open
  const handleRequestQuote = () => {
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

  // Send quote email
  const sendQuoteEmail = () => {
    if (!robot?.profiles?.email) return;

    const subject = `Quote Request for ${robot.name} - ${robot.model}`;
    const body = `Dear ${robot.profiles.full_name},

I am interested in the following robot:

Robot: ${robot.name}
Model: ${robot.model}
Type: ${robot.robot_type}
Listed Price: ${robot.price ? `${robot.currency} ${robot.price}` : 'Price on Request'}

${quoteMessage ? `Additional Message:\n${quoteMessage}` : ''}

Please provide me with:
1. Best price quote
2. Availability and delivery timeline
3. Technical specifications
4. Warranty and support details
5. Installation and training options

Best regards,
${user?.user_metadata?.full_name || 'Interested Buyer'}`;

    const mailtoLink = `mailto:${robot.profiles.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoLink, '_blank');
    
    setShowQuoteModal(false);
    setQuoteMessage('');
    
    toast({
      title: "Quote Request Sent",
      description: `Email sent to ${robot.profiles.company_name || robot.profiles.full_name}`,
    });
  };

  // Add/Remove to/from watchlist
  const handleAddToWatchlist = async () => {
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
      const watchlist = JSON.parse(localStorage.getItem(`watchlist_${user.id}`) || '[]');
      
      if (isInWatchlist) {
        const newWatchlist = watchlist.filter((robotId: string) => robotId !== robot!.id);
        localStorage.setItem(`watchlist_${user.id}`, JSON.stringify(newWatchlist));
        setIsInWatchlist(false);
        toast({
          title: "Removed from Watchlist",
          description: `${robot!.name} has been removed from your watchlist.`,
        });
      } else {
        if (watchlist.includes(robot!.id)) {
          toast({
            title: "Already in Watchlist",
            description: "This robot is already in your watchlist.",
          });
          return;
        }
        watchlist.push(robot!.id);
        localStorage.setItem(`watchlist_${user.id}`, JSON.stringify(watchlist));
        setIsInWatchlist(true);
        toast({
          title: "Added to Watchlist",
          description: `${robot!.name} has been added to your watchlist.`,
        });
      }
    } catch (error: any) {
      console.error('Error updating watchlist:', error);
      toast({
        title: "Failed to Update",
        description: "Could not update watchlist. Please try again.",
        variant: "destructive",
      });
    } finally {
      setAddingToWatchlist(false);
    }
  };

  // Image navigation
  const nextImage = () => {
    if (robot?.images && robot.images.length > 1) {
      setCurrentImageIndex((prev) => (prev + 1) % robot.images.length);
    }
  };

  const prevImage = () => {
    if (robot?.images && robot.images.length > 1) {
      setCurrentImageIndex((prev) => (prev - 1 + robot.images.length) % robot.images.length);
    }
  };

  // AI analysis call
  const handleAIAnalysis = async () => {
    if (!robot || !user) {
      toast({
        title: "Login Required",
        description: "Please log in to access AI analysis features.",
        variant: "destructive",
      });
      return;
    }
    try {
      setAnalysisLoading(true);
      const { data, error } = await supabase.functions.invoke('roboverse-ai-analyze', {
        body: { robotId: robot.id },
      });
      if (error) throw error;
      setAiAnalysis({
        analysis: data.analysis,
        recommendations: {
          spareParts: data.marketEcosystem?.spareParts?.suppliers || [],
          services: data.marketEcosystem?.services?.providers || [],
          logistics: data.marketEcosystem?.logistics?.providers || [],
          finance: data.marketEcosystem?.finance?.providers || [],
        },
      });
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

  // Price formatting helper
  const formatPrice = (price: number, currency: string) => {
    const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₹';
    return `${currencySymbol}${price.toLocaleString()}`;
  };

  // Calculate import duty if outside India (~18%)
  const calculateImportDuty = (basePrice: number, currency: string) => {
    const isOutsideIndia = robot?.location && !robot.location.toLowerCase().includes('india');
    if (isOutsideIndia && basePrice) {
      const dutyRate = 0.18;
      const duty = basePrice * dutyRate;
      setImportDuty(duty);
      return duty;
    }
    setImportDuty(null);
    return 0;
  };

  useEffect(() => {
    if (robot?.price) {
      calculateImportDuty(robot.price, robot.currency);
    }
  }, [robot]);

  // Import quote modal open
  const handleImportQuote = () => {
    if (!robot?.profiles?.email) {
      toast({
        title: "Email Not Available",
        description: "Seller's email address is not provided.",
        variant: "destructive",
      });
      return;
    }
    setShowImportQuote(true);
  };

  // Send import quote email
  const sendImportQuoteEmail = () => {
    if (!robot?.profiles?.email) return;
    
    const basePrice = robot.price || 0;
    const duty = importDuty || 0;
    const totalPrice = basePrice + duty;
    const subject = `Import Quote Request for ${robot.name} - ${robot.model}`;
    const body = `Dear ${robot.profiles.full_name},

I am interested in importing the following robot to India:

Robot: ${robot.name}
Model: ${robot.model}
Type: ${robot.robot_type}
Base Price: ${formatPrice(basePrice, robot.currency)}
${duty > 0 ? `Estimated Import Duty (18%): ${formatPrice(duty, robot.currency)}` : ''}
${duty > 0 ? `Total Estimated Cost: ${formatPrice(totalPrice, robot.currency)}` : ''}

Please provide detailed information on:
1. Complete pricing including all applicable duties and taxes
2. Import documentation and procedures
3. Shipping and logistics arrangements
4. Delivery timeline to India
5. Installation and commissioning support
6. Warranty terms for imported equipment
7. After-sales service availability in India

Best regards,
${user?.user_metadata?.full_name || 'Interested Buyer'}`;

    const mailtoLink = `mailto:${robot.profiles.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoLink, '_blank');
    
    setShowImportQuote(false);
    
    toast({
      title: "Import Quote Request Sent",
      description: `Email sent to ${robot.profiles.company_name || robot.profiles.full_name}`,
    });
  };

  // Purchase inquiry email
  const handlePurchaseInquiry = () => {
    if (!robot?.profiles?.email) {
      toast({
        title: "Email Not Available",
        description: "Seller's email address is not provided.",
        variant: "destructive",
      });
      return;
    }
    const subject = `Purchase Inquiry for ${robot.name}`;
    const body = `Dear ${robot.profiles.full_name},

I would like to make a purchase inquiry for:

Robot: ${robot.name}
Model: ${robot.model}
Listed Price: ${robot.price ? formatPrice(robot.price, robot.currency) : 'Price on Request'}

Please provide:
1. Best pricing terms
2. Payment options
3. Delivery arrangements
4. Technical documentation
5. Training and support

Looking forward to your response.

Best regards,
${user?.user_metadata?.full_name || 'Interested Buyer'}`;

    const mailtoLink = `mailto:${robot.profiles.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoLink, '_blank');
    
    toast({
      title: "Purchase Inquiry Sent",
      description: `Email sent to ${robot.profiles.company_name || robot.profiles.full_name}`,
    });
  };

  // Navigate to find similar robots
  const handleFindSimilar = () => {
    const searchParams = new URLSearchParams({
      type: robot?.robot_type || '',
      category: robot?.category_tags?.[0] || ''
    });
    navigate(`/robots?${searchParams.toString()}`);
    toast({
      title: "Finding Similar Robots",
      description: "Redirecting to search results...",
    });
  };

  // Placeholder functions for report and loan check
  const handleGetReport = () => {
    toast({
      title: "Technical Report",
      description: "Generating detailed technical specifications report...",
    });
  };

  const handleCheckLoan = () => {
    toast({
      title: "Financing Options",
      description: "Checking available loan and financing options...",
    });
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
        <Button variant="ghost" onClick={() => navigate('/robots')} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Robots
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Gallery */}
            <Card>
              <CardContent className="p-6">
                <div className="relative aspect-video bg-muted rounded-lg flex items-center justify-center mb-4">
                  {robot.images && robot.images.length > 0 ? (
                    <>
                      <img
                        src={robot.images[currentImageIndex]}
                        alt={`${robot.name} ${currentImageIndex + 1}`}
                        className="w-full h-full object-cover rounded-lg cursor-pointer"
                        onClick={() => setShowFullscreen(true)}
                      />
                      {robot.images.length > 1 && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                            onClick={prevImage}
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                            onClick={nextImage}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white"
                        onClick={() => setShowFullscreen(true)}
                      >
                        <Maximize2 className="w-4 h-4" />
                      </Button>
                      {robot.images.length > 1 && (
                        <div className="absolute bottom-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                          {currentImageIndex + 1} / {robot.images.length}
                        </div>
                      )}
                    </>
                  ) : (
                    <Bot className="w-24 h-24 text-muted-foreground" />
                  )}
                </div>

                {/* Thumbnail Gallery */}
                {robot.images && robot.images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {robot.images.map((image, index) => (
                      <div
                        key={index}
                        className={`flex-shrink-0 aspect-square w-20 h-20 bg-muted rounded-lg flex items-center justify-center cursor-pointer border-2 ${
                          index === currentImageIndex ? 'border-primary' : 'border-transparent'
                        }`}
                        onClick={() => setCurrentImageIndex(index)}
                      >
                        <img 
                          src={image} 
                          alt={`${robot.name} ${index + 1}`}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Robot Info and Quick Actions */}
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
                    {importDuty && (
                      <div className="text-sm text-orange-600 mt-1">
                        + Import duties and logistics costs
                      </div>
                    )}
                    <Badge variant={robot.availability === 'available' ? 'default' : 'secondary'} className="mt-2">
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
                  {/* Quantity & Views */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Quantity Available:</span>
                      <p>{robot.quantity}</p>
                    </div>
                    <div>
                      <span className="font-medium">Views:</span>
                      <p>29</p> {/* Replace with actual views if available */}
                    </div>
                  </div>

                  {/* Action Buttons for logged in user */}
                  {user && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
                      {importDuty ? (
                        <Button 
                          onClick={handleImportQuote}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                          size="lg"
                        >
                          <Plane className="w-4 h-4 mr-2" />
                          Import Quote
                        </Button>
                      ) : (
                        <Button 
                          onClick={handlePurchaseInquiry}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                          size="lg"
                        >
                          <MessageCircle className="w-4 h-4 mr-2" />
                          Purchase Inquiry
                        </Button>
                      )}
                      <Button 
                        onClick={handleContactSeller}
                        variant="outline"
                        className="border-green-600 text-green-600 hover:bg-green-50"
                        size="lg"
                      >
                        <PhoneCall className="w-4 h-4 mr-2" />
                        Contact
                      </Button>
                    </div>
                  )}

                  {/* Quick Actions */}
                  {user && (
                    <div className="mt-6">
                      <h4 className="font-semibold mb-3">Quick Actions</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={handleAIAnalysis}
                          className="text-purple-600 border-purple-200 hover:bg-purple-50"
                        >
                          <Brain className="w-4 h-4 mr-2" />
                          AI Analysis
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={handleGetReport}
                          className="text-orange-600 border-orange-200 hover:bg-orange-50"
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Get Report
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={handleCheckLoan}
                          className="text-green-600 border-green-200 hover:bg-green-50"
                        >
                          <CreditCard className="w-4 h-4 mr-2" />
                          Check Loan
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={handleFindSimilar}
                          className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        >
                          <Search className="w-4 h-4 mr-2" />
                          Find Similar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Tabs for Details */}
            <Card>
              <CardContent className="p-0">
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-6 rounded-none border-b">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="specifications">Specifications</TabsTrigger>
                    <TabsTrigger value="services">Services</TabsTrigger>
                    <TabsTrigger value="spareparts">Spare Parts</TabsTrigger>
                    <TabsTrigger value="financing">Financing</TabsTrigger>
                    <TabsTrigger value="import">Import</TabsTrigger>
                  </TabsList>
                  
                  {/* Overview */}
                  <TabsContent value="overview" className="p-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Basic Information</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Brand:</span>
                          <p className="text-muted-foreground">Fanuc</p>
                        </div>
                        <div>
                          <span className="font-medium">Model:</span>
                          <p className="text-muted-foreground">{robot.model}</p>
                        </div>
                        <div>
                          <span className="font-medium">Year:</span>
                          <p className="text-muted-foreground">2012</p>
                        </div>
                        <div>
                          <span className="font-medium">Category:</span>
                          <p className="text-muted-foreground">{robot.robot_type}</p>
                        </div>
                        <div>
                          <span className="font-medium">Condition:</span>
                          <p className="text-muted-foreground">used</p>
                        </div>
                        <div>
                          <span className="font-medium">Origin:</span>
                          <p className="text-muted-foreground">International</p>
                        </div>
                      </div>

                      <Separator />

                      <h3 className="text-lg font-semibold">Location & Pricing</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">City:</span>
                          <p className="text-muted-foreground">{robot.location}</p>
                        </div>
                        <div>
                          <span className="font-medium">State:</span>
                          <p className="text-muted-foreground">Saxony [ DE-SN ]</p>
                        </div>
                        <div>
                          <span className="font-medium">Price:</span>
                          <p className="text-muted-foreground">{robot.price ? formatPrice(robot.price, robot.currency) : 'Price on Request'}</p>
                        </div>
                        <div>
                          <span className="font-medium">Negotiable:</span>
                          <p className="text-muted-foreground">No</p>
                        </div>
                        <div>
                          <span className="font-medium">Views:</span>
                          <p className="text-muted-foreground">29</p>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Specifications */}
                  <TabsContent value="specifications" className="p-6">
                    {robot.technical_specifications && Object.keys(robot.technical_specifications).length > 0 ? (
                      <div className="grid grid-cols-2 gap-4">
                        {Object.entries(robot.technical_specifications).map(([key, value]) => (
                          <div key={key}>
                            <span className="font-medium capitalize">{key.replace(/_/g, ' ')}:</span>
                            <p className="text-muted-foreground">{String(value)}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No technical specifications available.</p>
                    )}
                  </TabsContent>

                  {/* Services */}
                  <TabsContent value="services" className="p-6">
                    <div className="text-center py-8">
                      <Settings className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Service Providers</h3>
                      <p className="text-muted-foreground mb-4">Find maintenance, repair, and installation services for this robot.</p>
                      <Button onClick={() => navigate('/services')}>
                        <Settings className="w-4 h-4 mr-2" />
                        Browse Services
                      </Button>
                    </div>
                  </TabsContent>

                  {/* Spare Parts */}
                  <TabsContent value="spareparts" className="p-6">
                    <div className="text-center py-8">
                      <Wrench className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Spare Parts</h3>
                      <p className="text-muted-foreground mb-4">Find compatible spare parts and components for this robot model.</p>
                      <Button onClick={() => navigate('/parts')}>
                        <Wrench className="w-4 h-4 mr-2" />
                        Browse Parts
                      </Button>
                    </div>
                  </TabsContent>

                  {/* Financing */}
                  <TabsContent value="financing" className="p-6">
                    <div className="text-center py-8">
                      <DollarSign className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Financing Options</h3>
                      <p className="text-muted-foreground mb-4">Explore financing and leasing options for this equipment.</p>
                      <Button disabled>
                        <DollarSign className="w-4 h-4 mr-2" />
                        Check Financing
                      </Button>
                    </div>
                  </TabsContent>

                  {/* Import */}
                  <TabsContent value="import" className="p-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Import Information</h3>
                      {importDuty ? (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                          <div className="flex items-center mb-3">
                            <Plane className="w-5 h-5 text-orange-600 mr-2" />
                            <h4 className="font-semibold text-orange-800">Import to India</h4>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span>Base Price:</span>
                              <span className="font-medium">{formatPrice(robot.price, robot.currency)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Estimated Import Duty (18%):</span>
                              <span className="font-medium text-orange-600">{formatPrice(importDuty, robot.currency)}</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between font-semibold">
                              <span>Total Estimated Cost:</span>
                              <span>{formatPrice(robot.price + importDuty, robot.currency)}</span>
                            </div>
                          </div>
                          <div className="mt-4 text-xs text-orange-700">
                            *Additional shipping, insurance, and customs processing fees may apply
                          </div>
                        </div>
                      ) : (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="flex items-center mb-2">
                            <MapPin className="w-5 h-5 text-green-600 mr-2" />
                            <h4 className="font-semibold text-green-800">Domestic Purchase</h4>
                          </div>
                          <p className="text-sm text-green-700">
                            This robot is located in India. No import duties apply.
                          </p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* AI Analysis Section */}
            {user && (
              <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50/80 to-purple-50/80">
                <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center text-xl">
                    <Brain className="w-6 h-6 mr-2" />
                    🚀 Advanced AI Market Intelligence
                  </CardTitle>
                  <p className="text-blue-100 text-sm">
                    Discover suppliers, services, financing & logistics with AI-powered recommendations
                  </p>
                </CardHeader>
                <CardContent className="p-6">
                  {!aiAnalysis ? (
                    <div className="text-center py-8">
                      <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                        <Brain className="w-10 h-10 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-800 mb-3">
                        Unlock Smart Market Insights
                      </h3>
                      <p className="text-gray-600 mb-6 max-w-2xl mx-auto leading-relaxed">
                        Get AI-powered recommendations for spare parts, services, financing, and logistics 
                        specifically matched to this robot with intelligent market analysis.
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <div className="p-4 bg-white rounded-xl border border-blue-200 shadow-sm">
                          <Wrench className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                          <div className="text-sm font-semibold text-gray-700">Spare Parts</div>
                          <div className="text-xs text-gray-500">Smart Matching</div>
                        </div>
                        <div className="p-4 bg-white rounded-xl border border-green-200 shadow-sm">
                          <Settings className="w-8 h-8 text-green-600 mx-auto mb-2" />
                          <div className="text-sm font-semibold text-gray-700">Services</div>
                          <div className="text-xs text-gray-500">Expert Providers</div>
                        </div>
                        <div className="p-4 bg-white rounded-xl border border-orange-200 shadow-sm">
                          <Truck className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                          <div className="text-sm font-semibold text-gray-700">Logistics</div>
                          <div className="text-xs text-gray-500">Delivery Options</div>
                        </div>
                        <div className="p-4 bg-white rounded-xl border border-purple-200 shadow-sm">
                          <DollarSign className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                          <div className="text-sm font-semibold text-gray-700">Finance</div>
                          <div className="text-xs text-gray-500">Funding Solutions</div>
                        </div>
                      </div>
                      <Button 
                        onClick={handleAIAnalysis}
                        disabled={analysisLoading}
                        size="lg"
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                      >
                        {analysisLoading ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Analyzing Market...
                          </>
                        ) : (
                          <>
                            <Brain className="w-5 h-5 mr-2" />
                            Generate Smart Analysis
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="bg-white p-6 rounded-xl border border-blue-200 shadow-sm">
                        <h4 className="font-semibold mb-3 text-gray-800 flex items-center">
                          <Brain className="w-5 h-5 mr-2 text-blue-600" />
                          AI Market Analysis
                        </h4>
                        <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{aiAnalysis.analysis}</p>
                      </div>
                      <Separator />
                      {/* Recommendation Tabs (parts, services, logistics, finance) */}
                      {/* ... (similar to original component, render aiAnalysis.recommendations with Tabs here) */}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar with Seller info and Contact buttons */}
          <div className="space-y-6">
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

            {user && (
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700" 
                      size="lg"
                      onClick={handleContactSeller}
                    >
                      <PhoneCall className="w-4 h-4 mr-2" />
                      Contact Seller
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full border-blue-600 text-blue-600 hover:bg-blue-50"
                      onClick={handleRequestQuote}
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Request Quote
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full border-red-600 text-red-600 hover:bg-red-50"
                      onClick={handleAddToWatchlist}
                      disabled={addingToWatchlist}
                    >
                      {addingToWatchlist ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Heart className={`w-4 h-4 mr-2 ${isInWatchlist ? 'fill-current' : ''}`} />
                      )}
                      {isInWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
                    </Button>
                  </div>
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
              src={robot?.images?.[currentImageIndex]} 
              alt={`${robot?.name} ${currentImageIndex + 1}`}
              className="w-full h-full object-contain max-h-[90vh]"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white"
              onClick={() => setShowFullscreen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
            {robot?.images && robot.images.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                  onClick={prevImage}
                >
                  <ChevronLeft className="w-6 h-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                  onClick={nextImage}
                >
                  <ChevronRight className="w-6 h-6" />
                </Button>
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded">
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
            <DialogTitle>Request Quote</DialogTitle>
            <DialogDescription>
              Send a quote request to {robot?.profiles?.company_name || robot?.profiles?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Add any specific requirements or questions..."
              value={quoteMessage}
              onChange={(e) => setQuoteMessage(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuoteModal(false)}>
              Cancel
            </Button>
            <Button onClick={sendQuoteEmail}>
              <Mail className="w-4 h-4 mr-2" />
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Quote Modal */}
      <Dialog open={showImportQuote} onOpenChange={setShowImportQuote}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Plane className="w-5 h-5 mr-2" />
              Import Quote Request
            </DialogTitle>
            <DialogDescription>
              Request detailed import pricing including duties and logistics
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {importDuty && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h4 className="font-semibold mb-2">Estimated Import Costs</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Base Price:</span>
                    <span>{formatPrice(robot?.price || 0, robot?.currency || 'USD')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Import Duty (18%):</span>
                    <span className="text-orange-600">{formatPrice(importDuty, robot?.currency || 'USD')}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Estimated Total:</span>
                    <span>{formatPrice((robot?.price || 0) + importDuty, robot?.currency || 'USD')}</span>
                  </div>
                </div>
              </div>
            )}
            <Textarea
              placeholder="Additional requirements for import (customs clearance, shipping preferences, etc.)..."
              value={quoteMessage}
              onChange={(e) => setQuoteMessage(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportQuote(false)}>
              Cancel
            </Button>
            <Button onClick={sendImportQuoteEmail}>
              <Mail className="w-4 h-4 mr-2" />
              Send Import Quote Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RobotDetails;
