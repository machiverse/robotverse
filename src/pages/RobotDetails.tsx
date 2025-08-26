import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Bot, MapPin, Phone, Mail, User, ArrowLeft, Loader2, ChevronLeft, ChevronRight, Maximize2, Eye, Heart, MessageCircle, PhoneCall, X, FileText, Play, Download } from "lucide-react";
import ViewCountDisplay from "@/components/ViewCountDisplay";
import EnhancedHeader from "@/components/EnhancedHeader";
import MarketIntelligencePanel from "@/components/MarketIntelligencePanel";
import ReportGenerationModal from "@/components/ReportGenerationModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";
import { useViewTracking } from "@/hooks/useViewTracking";

interface Robot {
  id: string;
  name: string;
  model: string;
  robot_type: string;
  price: number;
  currency: string;
  description: string;
  location: string;
  state?: string;
  pincode?: string;
  availability: string;
  images: string[];
  technical_specifications: Record<string, any>;
  category_tags: string[];
  quantity: number;
  seller_id: string;
  brand?: string;
  condition?: string;
  year_manufactured?: number;
  brochure_url?: string;
  video_url?: string;
  video_type?: string;
  profiles: {
    full_name: string;
    company_name: string;
    phone: string;
    mobile_number: string;
    email: string;
    location: string;
  };
}

interface CustomField {
  id: string;
  field_name: string;
  field_value: string;
}

const RobotDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { trackView } = useViewTracking();
  
  const [robot, setRobot] = useState<Robot | null>(null);
  const [loading, setLoading] = useState(true);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // UI states
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteMessage, setQuoteMessage] = useState('');
  const [addingToWatchlist, setAddingToWatchlist] = useState(false);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportInsights, setReportInsights] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    const fetchRobot = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('robots')
          .select(`
            *,
            profiles!seller_id (
              full_name,
              company_name,
              phone,
              mobile_number,
              email,
              location
            )
          `)
          .eq('id', id)
          .single();

        if (error) throw error;
        setRobot({
          ...data,
          technical_specifications: typeof data.technical_specifications === 'object' && data.technical_specifications !== null 
            ? data.technical_specifications as Record<string, any>
            : {}
        });
        
        if (user) {
          const watchlist = JSON.parse(localStorage.getItem(`watchlist_${user.id}`) || '[]');
          setIsInWatchlist(watchlist.includes(data.id));
          
          // Track this view
          await trackView('robots', data.id);
        }

      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'Failed to load robot details');
      } finally {
        setLoading(false);
      }
    };
    fetchRobot();
  }, [id, user, trackView]);

  // Fetch custom fields
  useEffect(() => {
    if (!id) return;
    const fetchCustomFields = async () => {
      try {
        const { data, error } = await supabase
          .from('robot_custom_fields')
          .select('*')
          .eq('robot_id', id);
        
        if (error) throw error;
        setCustomFields(data || []);
      } catch (err) {
        console.error('Error fetching custom fields:', err);
      }
    };
    fetchCustomFields();
  }, [id]);

  // Format price utility
  const formatPrice = (price: number, currency: string) => {
    return `${currency} ${price.toLocaleString()}`;
  };

  // Handle generate report from Market Intelligence Panel
  const handleGenerateReport = (insights: any) => {
    setReportInsights(insights);
    setShowReportModal(true);
  };

  // Contact seller by phone
  const handleContactSeller = () => {
    const phone = robot?.profiles?.phone || robot?.profiles?.mobile_number;
    
    if (!phone) {
      toast({
        title: "Phone Number Not Available",
        description: "Seller's phone number is not provided.",
        variant: "destructive",
      });
      return;
    }
    const phoneNumber = phone.replace(/\D/g, '');
    window.open(`tel:${phoneNumber}`, '_self');
    toast({
      title: "Calling Seller",
      description: `Calling ${robot.profiles.company_name || robot.profiles.full_name} at ${phone}`,
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

  // Format description as bullet points
  const formatDescription = (description: string) => {
    const lines = description.split('\n').filter(line => line.trim());
    return lines.map((line, index) => (
      <div key={index} className="flex items-start">
        <span className="text-primary mr-2">•</span>
        <span>{line.trim()}</span>
      </div>
    ));
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
            <h1 className="text-2xl font-bold mb-4">Robot Not Found</h1>
            <p className="text-muted-foreground mb-4">{error || 'The requested robot could not be found.'}</p>
            <Button onClick={() => navigate('/robots')}>
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

        {/* Split-Screen Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Side: Robot Description & Specifications */}
          <div className="space-y-6">
            {/* Robot Basic Info */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl">{robot.name}</CardTitle>
                    <p className="text-lg text-muted-foreground">{robot.model}</p>
                    <Badge variant="outline" className="mt-2">
                      {robot.robot_type}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-primary">
                      {robot.price ? formatPrice(robot.price, robot.currency) : 'Price on Request'}
                    </div>
                    <Badge variant={robot.availability === 'available' ? 'default' : 'secondary'} className="mt-2">
                      {robot.availability}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-muted-foreground mb-4">
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-2" />
                    <span>{robot.location}</span>
                  </div>
                  <div className="flex items-center">
                    <Eye className="w-4 h-4 mr-2" />
                    <ViewCountDisplay targetType="robots" targetId={robot.id} />
                  </div>
                </div>
                
                {/* Image Gallery */}
                <div className="relative aspect-video bg-muted rounded-lg flex items-center justify-center mb-4">
                  {robot.images && robot.images.length > 0 ? (
                    <>
                      <img
                        src={robot.images[currentImageIndex]}
                        alt={`${robot.name} ${currentImageIndex + 1}`}
                        className="w-full h-full object-contain rounded-lg bg-muted cursor-pointer"
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
                    </>
                  ) : (
                    <Bot className="w-24 h-24 text-muted-foreground" />
                  )}
                </div>
                
                {/* Thumbnail Gallery */}
                {robot.images && robot.images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
                    {robot.images.map((image, index) => (
                      <div
                        key={index}
                        className={`flex-shrink-0 aspect-square w-16 h-16 bg-muted rounded-lg flex items-center justify-center cursor-pointer border-2 ${
                          index === currentImageIndex ? 'border-primary' : 'border-transparent'
                        }`}
                        onClick={() => setCurrentImageIndex(index)}
                      >
                        <img 
                          src={image} 
                          alt={`${robot.name} ${index + 1}`}
                          className="w-full h-full object-contain rounded-lg bg-muted"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Contact Buttons */}
                {user && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Button 
                      className="bg-green-600 hover:bg-green-700" 
                      onClick={handleContactSeller}
                    >
                      <PhoneCall className="w-4 h-4 mr-2" />
                      Contact
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={handleRequestQuote}
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Quote
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={handleAddToWatchlist}
                      disabled={addingToWatchlist}
                    >
                      {addingToWatchlist ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Heart className={`w-4 h-4 mr-2 ${isInWatchlist ? 'fill-current' : ''}`} />
                      )}
                      {isInWatchlist ? 'Saved' : 'Save'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Description Section */}
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                {robot.description ? (
                  <div className="space-y-2">
                    {formatDescription(robot.description)}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No description available.</p>
                )}
              </CardContent>
            </Card>

            {/* Specifications Tab */}
            <Card>
              <CardContent className="p-0">
                <Tabs defaultValue="specs" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 rounded-none border-b">
                    <TabsTrigger value="specs">Specifications</TabsTrigger>
                    <TabsTrigger value="media">Media</TabsTrigger>
                    <TabsTrigger value="seller">Seller</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="specs" className="p-6">
                    <div className="space-y-4">
                      {/* Basic Specifications */}
                      <div className="grid grid-cols-2 gap-4">
                        {robot.brand && (
                          <div>
                            <span className="font-medium">Brand:</span>
                            <p className="text-muted-foreground">{robot.brand}</p>
                          </div>
                        )}
                        {robot.condition && (
                          <div>
                            <span className="font-medium">Condition:</span>
                            <p className="text-muted-foreground">{robot.condition.replace('_', ' ')}</p>
                          </div>
                        )}
                        {robot.year_manufactured && (
                          <div>
                            <span className="font-medium">Year:</span>
                            <p className="text-muted-foreground">{robot.year_manufactured}</p>
                          </div>
                        )}
                        <div>
                          <span className="font-medium">Quantity:</span>
                          <p className="text-muted-foreground">{robot.quantity}</p>
                        </div>
                      </div>

                      {/* Technical Specifications */}
                      {Object.keys(robot.technical_specifications).length > 0 && (
                        <>
                          <Separator />
                          <h4 className="font-semibold">Technical Specifications</h4>
                          <div className="grid grid-cols-1 gap-3">
                            {Object.entries(robot.technical_specifications).map(([key, value]) => (
                              <div key={key} className="flex justify-between">
                                <span className="font-medium">{key.replace(/_/g, ' ')}:</span>
                                <span className="text-muted-foreground">{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}

                      {/* Custom Fields */}
                      {customFields.length > 0 && (
                        <>
                          <Separator />
                          <h4 className="font-semibold">Additional Details</h4>
                          <div className="grid grid-cols-1 gap-3">
                            {customFields.map((field) => (
                              <div key={field.id} className="flex justify-between">
                                <span className="font-medium">{field.field_name}:</span>
                                <span className="text-muted-foreground">{field.field_value}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="media" className="p-6">
                    <div className="space-y-4">
                      {/* Video Section */}
                      {robot.video_url && (
                        <div>
                          <h4 className="font-semibold mb-3">Video</h4>
                          <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                            {robot.video_type === 'youtube' ? (
                              <iframe
                                src={robot.video_url}
                                className="w-full h-full rounded-lg"
                                allowFullScreen
                                title="Robot Video"
                              />
                            ) : (
                              <video
                                src={robot.video_url}
                                controls
                                className="w-full h-full rounded-lg"
                              />
                            )}
                          </div>
                        </div>
                      )}

                      {/* Brochure Section */}
                      {robot.brochure_url && (
                        <div>
                          <h4 className="font-semibold mb-3">Brochure</h4>
                          <div className="flex items-center justify-between bg-muted p-4 rounded-lg">
                            <div className="flex items-center">
                              <FileText className="w-6 h-6 mr-3 text-red-500" />
                              <div>
                                <p className="font-medium">Product Brochure</p>
                                <p className="text-sm text-muted-foreground">PDF Document</p>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(robot.brochure_url, '_blank')}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </Button>
                          </div>
                        </div>
                      )}

                      {!robot.video_url && !robot.brochure_url && (
                        <p className="text-muted-foreground">No additional media available.</p>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="seller" className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-center">
                        <User className="w-6 h-6 mr-3" />
                        <div>
                          <p className="font-semibold">{robot.profiles.full_name}</p>
                          {robot.profiles.company_name && (
                            <p className="text-sm text-muted-foreground">{robot.profiles.company_name}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-3">
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
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Right Side: AI Market Intelligence Panel */}
          <div className="space-y-6">
            <MarketIntelligencePanel 
              robotId={robot.id} 
              onGenerateReport={handleGenerateReport}
            />
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
              className="w-full h-full object-contain rounded-lg bg-muted max-h-[90vh]"
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

      {/* Report Generation Modal */}
      <ReportGenerationModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        robotData={robot}
        insights={reportInsights}
      />
    </div>
  );
};

export default RobotDetails;