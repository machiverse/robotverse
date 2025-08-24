import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Bot, MapPin, ArrowLeft, Building, User, MessageCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import EnhancedHeader from '@/components/EnhancedHeader';

interface Robot {
  id: string;
  name: string;
  model: string;
  robot_type: string;
  price: number;
  currency: string;
  images: string[];
  location: string;
  availability: string;
  description: string;
  seller_id: string;
  created_at: string;
}

interface SellerProfile {
  user_id: string;
  company_name?: string;
  full_name?: string;
  phone?: string;
  mobile_number?: string;
  email?: string;
}

const SellerRobots: React.FC = () => {
  const { sellerId } = useParams<{ sellerId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [robots, setRobots] = useState<Robot[]>([]);
  const [sellerProfile, setSellerProfile] = useState<SellerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sellerId) return;

    const fetchSellerRobots = async () => {
      try {
        setLoading(true);
        
        // Fetch seller profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('user_id, company_name, full_name, phone, mobile_number, email')
          .eq('user_id', sellerId)
          .single();

        if (profileError) throw profileError;
        setSellerProfile(profileData);

        // Fetch seller's robots
        const { data: robotsData, error: robotsError } = await supabase
          .from('robots')
          .select('*')
          .eq('seller_id', sellerId)
          .eq('availability', 'available')
          .order('created_at', { ascending: false });

        if (robotsError) throw robotsError;
        setRobots(robotsData || []);

      } catch (err) {
        console.error('Error fetching seller robots:', err);
        setError(err instanceof Error ? err.message : 'Failed to load seller robots');
      } finally {
        setLoading(false);
      }
    };

    fetchSellerRobots();
  }, [sellerId]);

  const formatPrice = (price: number, currency: string) => {
    const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₹';
    return `${currencySymbol}${price.toLocaleString()}`;
  };

  const handleContactSeller = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) {
      navigate('/auth');
      return;
    }
    
    const phone = sellerProfile?.phone || sellerProfile?.mobile_number;
    
    if (!phone) {
      alert('Contact information not available for this seller');
      return;
    }

    const phoneNumber = phone.replace(/\D/g, '');
    const message = `Hi! I'm interested in your robot listings on RobotVerse. Can you please provide more details?`;
    
    const choice = window.confirm(
      'Choose contact method:\n\nOK = WhatsApp Message\nCancel = Phone Call'
    );
    
    if (choice) {
      window.open(`https://wa.me/91${phoneNumber}?text=${encodeURIComponent(message)}`, '_blank');
    } else {
      window.location.href = `tel:+91${phoneNumber}`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <EnhancedHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mb-4" />
            <p className="text-muted-foreground">Loading seller robots...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !sellerProfile) {
    return (
      <div className="min-h-screen bg-background">
        <EnhancedHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center py-12">
            <Bot className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Seller not found</h3>
            <p className="text-muted-foreground mb-4">{error || 'Unable to load seller information'}</p>
            <Button onClick={() => navigate('/robots')} variant="outline">
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
        <Button 
          variant="outline" 
          onClick={() => navigate('/robots')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to All Robots
        </Button>

        {/* Seller Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {sellerProfile.company_name ? (
                <Building className="w-8 h-8 text-primary" />
              ) : (
                <User className="w-8 h-8 text-primary" />
              )}
              <div>
                <h1 className="text-3xl font-bold">
                  {sellerProfile.company_name || sellerProfile.full_name || 'Robot Seller'}
                </h1>
                <p className="text-muted-foreground">
                  {robots.length} robot{robots.length !== 1 ? 's' : ''} available
                </p>
              </div>
            </div>
            
            <Button 
              onClick={handleContactSeller}
              disabled={!user || (!sellerProfile.phone && !sellerProfile.mobile_number)}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Contact Seller
            </Button>
          </div>
        </div>

        {/* Robots Grid */}
        {robots.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Bot className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No robots available</h3>
            <p className="text-muted-foreground">This seller has no robots currently listed.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {robots.map((robot) => (
              <Card
                key={robot.id}
                className="group border border-border hover:border-primary/50 hover:shadow-lg hover:bg-muted/30 transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
                onClick={() => navigate(`/robots/${robot.id}`)}
              >
                <CardHeader>
                  <div className="aspect-video rounded-lg overflow-hidden bg-muted relative mb-4">
                    {robot.images && robot.images.length > 0 ? (
                      <img
                        src={robot.images[0]}
                        alt={robot.name}
                        className="w-full h-full object-contain rounded-lg bg-muted group-hover:scale-105 transition-transform duration-500"
                        style={{ imageRendering: 'crisp-edges' }}
                      />
                    ) : (
                      <div className="flex items-center justify-center w-full h-full">
                        <Bot className="w-12 h-12 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <CardTitle className="text-lg">{robot.name}</CardTitle>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="w-fit">
                      {robot.robot_type}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-primary">
                        {robot.price ? formatPrice(robot.price, robot.currency) : 'Price on Request'}
                      </span>
                      <Badge variant={robot.availability === "available" ? "default" : "secondary"}>
                        {robot.availability}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center text-muted-foreground">
                      <MapPin className="w-4 h-4 mr-1" />
                      <span className="text-sm">{robot.location || 'Location not specified'}</span>
                    </div>
                    
                    {robot.model && (
                      <p className="text-sm text-muted-foreground">Model: {robot.model}</p>
                    )}
                    
                    {robot.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{robot.description}</p>
                    )}
                    
                    <div className="pt-2">
                      <Button 
                        size="sm" 
                        className="w-full" 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/robots/${robot.id}`);
                        }}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SellerRobots;