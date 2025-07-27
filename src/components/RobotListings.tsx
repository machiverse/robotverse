import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Package, Eye, Brain, IndianRupee, MessageCircle } from "lucide-react";
import { toast } from "sonner";

interface Robot {
  id: string;
  name: string;
  model: string;
  robot_type: string;
  quantity: number;
  location: string;
  availability: string;
  price: number;
  currency: string;
  images: string[];
  category_tags: string[];
  seller_id: string;
  profiles: {
    company_name: string;
    full_name: string;
    phone: string;
    mobile_number: string;
  };
}

const RobotListings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [robots, setRobots] = useState<Robot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRobots = async () => {
      try {
        const { data, error } = await supabase
          .from('robots')
          .select(`
            *,
            profiles!robots_seller_id_fkey (
              company_name,
              full_name,
              phone,
              mobile_number
            )
          `)
          .eq('availability', 'available')
          .order('created_at', { ascending: false })
          .limit(8);

        if (error) throw error;
        setRobots(data || []);
      } catch (error) {
        console.error('Error fetching robots:', error);
        toast.error('Failed to load robot listings');
      } finally {
        setLoading(false);
      }
    };

    fetchRobots();
  }, []);

  const handleAnalyzeRobot = (robotId: string) => {
    if (!user) {
      toast.error('Please sign in to use RoboNexus AI analysis');
      return;
    }
    // This will be implemented with DeepSeek API integration
    toast.info('AI Analysis feature coming soon!');
  };

  const handleContactSeller = (robot: Robot, e: React.MouseEvent) => {
    e.stopPropagation();
    const phone = robot.profiles?.phone || robot.profiles?.mobile_number;
    
    if (!phone) {
      toast.error('Contact information not available for this seller');
      return;
    }

    const phoneNumber = phone.replace(/\D/g, ''); // Remove non-digits
    const message = `Hi! I'm interested in your robot: ${robot.name} (${robot.model}). Can you please provide more details?`;
    
    // Create options for WhatsApp or Phone call
    const choice = window.confirm(
      'Choose contact method:\n\nOK = WhatsApp Message\nCancel = Phone Call'
    );
    
    if (choice) {
      // WhatsApp
      window.open(`https://wa.me/91${phoneNumber}?text=${encodeURIComponent(message)}`, '_blank');
    } else {
      // Phone call
      window.location.href = `tel:+91${phoneNumber}`;
    }
  };

  const formatPrice = (price: number, currency: string) => {
    if (!price) return 'Price on request';
    return `${currency === 'INR' ? '₹' : '$'}${price.toLocaleString()}`;
  };

  if (loading) {
    return (
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">Latest Robot Listings</h2>
            <p className="text-muted-foreground">Discover the newest robots available in our marketplace</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array(8).fill(0).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="h-48 bg-muted rounded-t-lg"></div>
                <CardContent className="p-4">
                  <div className="h-4 bg-muted rounded mb-2"></div>
                  <div className="h-3 bg-muted rounded mb-2"></div>
                  <div className="h-3 bg-muted rounded mb-4"></div>
                  <div className="flex gap-2">
                    <div className="h-8 bg-muted rounded flex-1"></div>
                    <div className="h-8 bg-muted rounded flex-1"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-2">Latest Robot Listings</h2>
          <p className="text-muted-foreground">Discover the newest robots available in our marketplace</p>
        </div>
        
        {robots.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No robots listed yet</h3>
            <p className="text-muted-foreground">Be the first to list your robots on RoboNexus!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {robots.map((robot) => (
              <Card key={robot.id} className="group hover:shadow-lg transition-shadow duration-200 overflow-hidden">
                <div className="relative h-48 bg-gradient-to-br from-muted to-muted/50">
                  {robot.images && robot.images.length > 0 ? (
                    <img
                      src={robot.images[0]}
                      alt={robot.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-16 h-16 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm">
                      {robot.availability}
                    </Badge>
                  </div>
                </div>
                
                <CardContent className="p-4">
                  <div className="mb-3">
                    <h3 className="font-semibold text-lg mb-1 line-clamp-1">{robot.name}</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      {robot.model} • Qty: {robot.quantity}
                    </p>
                    <div className="flex items-center text-sm text-muted-foreground mb-2">
                      <MapPin className="w-3 h-3 mr-1" />
                      <span className="line-clamp-1">{robot.location || 'Location not specified'}</span>
                    </div>
                    <div className="flex items-center text-sm font-medium text-primary mb-2">
                      <IndianRupee className="w-3 h-3 mr-1" />
                      {formatPrice(robot.price, robot.currency)}
                    </div>
                    {robot.category_tags && robot.category_tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {robot.category_tags.slice(0, 2).map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {robot.category_tags.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{robot.category_tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2 mb-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => navigate(`/robots/${robot.id}`)}>
                      <Eye className="w-3 h-3 mr-1" />
                      View Details
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={(e) => handleContactSeller(robot, e)}
                      disabled={!robot.profiles?.phone && !robot.profiles?.mobile_number}
                    >
                      <MessageCircle className="w-3 h-3 mr-1" />
                      Contact
                    </Button>
                  </div>
                  
                  <div className="flex gap-2">
                    {user ? (
                      <Button 
                        variant="default" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleAnalyzeRobot(robot.id)}
                      >
                        <Brain className="w-3 h-3 mr-1" />
                        AI Analyze
                      </Button>
                    ) : (
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="flex-1"
                        disabled
                        title="Sign in to use AI analysis"
                      >
                        <Brain className="w-3 h-3 mr-1" />
                        AI Analyze
                      </Button>
                    )}
                  </div>
                  
                  <div className="text-xs text-muted-foreground mt-2">
                    Listed by {robot.profiles?.company_name || robot.profiles?.full_name || 'Unknown'}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        
        {robots.length > 0 && (
          <div className="text-center mt-8">
            <Button variant="outline" size="lg" onClick={() => navigate('/robots')}>
              View All Robots
            </Button>
          </div>
        )}
      </div>
    </section>
  );
};

export default RobotListings;