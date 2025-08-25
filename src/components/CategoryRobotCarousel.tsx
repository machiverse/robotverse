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
import { Bot, MapPin, Building, User, Clock, ShoppingCart } from 'lucide-react';
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
  profiles?: {
    company_name?: string;
    full_name?: string;
  };
}

interface CategoryRobotCarouselProps {
  category: string;
  robots: Robot[];
  imageClassName?: string;
}

const CategoryRobotCarousel: React.FC<CategoryRobotCarouselProps> = ({ 
  category, 
  robots,
  imageClassName = "max-w-full max-h-full object-contain"
}) => {
  const navigate = useNavigate();
  const { trackButtonClick } = useButtonTracking();
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  // Auto-rotate carousel every 6 seconds
  useEffect(() => {
    if (!api) return;

    const interval = setInterval(() => {
      if (api.canScrollNext()) {
        api.scrollNext();
      } else {
        api.scrollTo(0);
      }
    }, 6000);

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
    // Navigate to robots page with category filter
    navigate(`/robots?category=${encodeURIComponent(category)}&groupBy=all`);
  };

  const handleViewRobot = async (robot: Robot, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Track button click
    await trackButtonClick({
      buttonName: "View Robot Details",
      buttonType: "navigation",
      sellerId: robot.seller_id,
      sellerName: robot.profiles?.company_name || robot.profiles?.full_name,
      itemId: robot.id,
      itemType: "robot",
      additionalData: {
        robotName: robot.name,
        robotType: robot.robot_type,
        price: robot.price,
        source: 'category_carousel'
      }
    });
    
    navigate(`/robots/${robot.id}`);
  };

  const robotCount = robots.length;

  return (
    <Card 
      className="group border border-border hover:border-primary/50 hover:shadow-lg hover:bg-muted/30 transition-all duration-300 cursor-pointer overflow-hidden"
      onClick={handleCardClick}
    >
      {/* Category Header */}
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bot className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-lg capitalize">
              {category}
            </CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">
            {robotCount} Available
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
            {robots.map((robot, index) => (
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
                      {robots.map((_, idx) => (
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
                      <Badge 
                        variant={robot.availability === "available" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {robot.availability}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-bold text-primary">
                        {robot.price ? formatPrice(robot.price, robot.currency) : 'POA'}
                      </span>
                      <div className="flex items-center text-muted-foreground text-xs">
                        {robot.profiles?.company_name ? (
                          <Building className="w-3 h-3 mr-1" />
                        ) : (
                          <User className="w-3 h-3 mr-1" />
                        )}
                        <span className="line-clamp-1">
                          {robot.profiles?.company_name || robot.profiles?.full_name || 'Seller'}
                        </span>
                      </div>
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
          <span>Auto-rotating every 6s</span>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
          <Button 
            size="sm" 
            className="flex-1" 
            onClick={async (e) => {
              e.stopPropagation();
              await trackButtonClick({
                buttonName: "Browse All",
                buttonType: "navigation",
                additionalData: {
                  category: category,
                  robotCount: robotCount,
                  source: 'category_carousel'
                }
              });
              handleCardClick();
            }}
          >
            <ShoppingCart className="w-3 h-3 mr-1" />
            Browse All {robotCount}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={(e) => robots[current] && handleViewRobot(robots[current], e)}
          >
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CategoryRobotCarousel;