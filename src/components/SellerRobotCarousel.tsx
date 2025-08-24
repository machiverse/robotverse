import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem, 
  CarouselNext, 
  CarouselPrevious,
  type CarouselApi 
} from '@/components/ui/carousel';
import { Bot, MapPin, Building, User, Clock, MessageCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useButtonTracking } from '@/hooks/useButtonTracking';

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

interface Profile {
  user_id: string;
  company_name?: string;
  full_name?: string;
  phone?: string;
  mobile_number?: string;
  email?: string;
}

interface SellerRobotCarouselProps {
  sellerRobots: Robot[];
  sellerProfile: Profile;
  imageClassName?: string;
}

const SellerRobotCarousel: React.FC<SellerRobotCarouselProps> = ({ 
  sellerRobots, 
  sellerProfile,
  imageClassName = "max-w-full max-h-full object-contain"
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { trackButtonClick } = useButtonTracking();
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  // Auto-rotate carousel every 5 seconds
  useEffect(() => {
    if (!api) return;

    const interval = setInterval(() => {
      if (api.canScrollNext()) {
        api.scrollNext();
      } else {
        api.scrollTo(0);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [api]);

  // Update current slide indicator
  useEffect(() => {
    if (!api) return;

    const onSelect = () => {
      setCurrent(api.selectedScrollSnap());
    };

    api.on('select', onSelect);
    onSelect();

    return () => {
      api.off('select', onSelect);
    };
  }, [api]);

  const formatPrice = (price: number, currency: string) => {
    const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₹';
    return `${currencySymbol}${price.toLocaleString()}`;
  };

  const handleCardClick = () => {
    // Navigate to a seller's robots page showing all their robots
    navigate(`/seller/${sellerProfile.user_id}/robots`);
  };

  const handleContactSeller = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Track button click
    await trackButtonClick({
      buttonName: "Contact Seller",
      buttonType: "contact",
      sellerId: sellerProfile.user_id,
      sellerName: sellerProfile.company_name || sellerProfile.full_name,
      additionalData: {
        robotCount: sellerRobots.length,
        currentRobot: sellerRobots[current]?.name,
        source: 'seller_carousel'
      }
    });
    
    if (!user) {
      navigate('/auth');
      return;
    }
    
    const phone = sellerProfile.phone || sellerProfile.mobile_number;
    
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

  const currentRobot = sellerRobots[current];
  const robotCount = sellerRobots.length;

  return (
    <Card 
      className="group border border-border hover:border-primary/50 hover:shadow-lg hover:bg-muted/30 transition-all duration-300 cursor-pointer overflow-hidden"
      onClick={handleCardClick}
    >
      {/* Seller Header */}
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {sellerProfile.company_name ? (
              <Building className="w-4 h-4 text-muted-foreground" />
            ) : (
              <User className="w-4 h-4 text-muted-foreground" />
            )}
            <CardTitle className="text-lg">
              {sellerProfile.company_name || sellerProfile.full_name || 'Robot Seller'}
            </CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">
            {robotCount} Robot{robotCount > 1 ? 's' : ''}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Robot Carousel */}
        <Carousel 
          setApi={setApi}
          className="w-full"
          opts={{
            align: "start",
            loop: true,
          }}
        >
          <CarouselContent>
            {sellerRobots.map((robot, index) => (
              <CarouselItem key={robot.id}>
                <div className="space-y-3">
                  {/* Flexible container for complete robot visibility */}
                  <div className="aspect-[4/3] w-full rounded-lg overflow-hidden bg-muted relative flex items-center justify-center p-4">
                    {robot.images && robot.images.length > 0 ? (
                      <img
                        src={robot.images[0]}
                        alt={robot.name}
                        className={`${imageClassName} group-hover:scale-105 transition-transform duration-500`}
                        style={{ imageRendering: 'crisp-edges' }}
                      />
                    ) : (
                      <div className="flex items-center justify-center w-full h-full">
                        <Bot className="w-12 h-12 text-muted-foreground" />
                      </div>
                    )}
                    
                    {/* Carousel indicators */}
                    <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
                      {sellerRobots.map((_, idx) => (
                        <div
                          key={idx}
                          className={`w-2 h-2 rounded-full transition-all ${
                            idx === current ? 'bg-primary' : 'bg-white/50'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Robot Details */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm line-clamp-1">{robot.name}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {robot.robot_type}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-bold text-primary">
                        {robot.price ? formatPrice(robot.price, robot.currency) : 'POA'}
                      </span>
                      <Badge 
                        variant={robot.availability === "available" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {robot.availability}
                      </Badge>
                    </div>

                    <div className="flex items-center text-muted-foreground text-xs">
                      <MapPin className="w-3 h-3 mr-1" />
                      <span className="line-clamp-1">{robot.location}</span>
                    </div>

                    {robot.model && (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        Model: {robot.model}
                      </p>
                    )}
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          
          {robotCount > 1 && (
            <>
              <CarouselPrevious className="left-2 h-6 w-6" />
              <CarouselNext className="right-2 h-6 w-6" />
            </>
          )}
        </Carousel>

        {/* Auto-rotate indicator */}
        <div className="flex items-center justify-center text-xs text-muted-foreground">
          <Clock className="w-3 h-3 mr-1" />
          <span>Auto-rotating every 5s</span>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
          <Button 
            size="sm" 
            className="flex-1" 
            onClick={async (e) => {
              e.stopPropagation();
              await trackButtonClick({
                buttonName: "View All Robots",
                buttonType: "navigation",
                sellerId: sellerProfile.user_id,
                sellerName: sellerProfile.company_name || sellerProfile.full_name,
                additionalData: {
                  robotCount: sellerRobots.length,
                  source: 'seller_carousel'
                }
              });
              handleCardClick();
            }}
          >
            View All {robotCount} Robot{robotCount > 1 ? 's' : ''}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleContactSeller}
            disabled={!user || (!sellerProfile.phone && !sellerProfile.mobile_number)}
          >
            <MessageCircle className="w-3 h-3 mr-1" />
            Contact
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SellerRobotCarousel;