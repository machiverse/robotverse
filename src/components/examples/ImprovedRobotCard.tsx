import React from 'react';
import { ResponsiveImage } from '@/components/ui/responsive-image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bot, Eye, Heart, Share2 } from 'lucide-react';

interface Robot {
  id: string;
  name: string;
  model?: string;
  price?: number;
  currency?: string;
  images?: string[];
  availability?: string;
  location?: string;
  robot_type?: string;
  brand?: string;
  condition?: string;
}

interface ImprovedRobotCardProps {
  robot: Robot;
  onClick?: () => void;
  onLike?: () => void;
  onShare?: () => void;
  imageDisplayMode?: 'contain' | 'cover' | 'fill' | 'scale-down';
  aspectRatio?: 'square' | 'video' | 'portrait' | 'auto';
}

const ImprovedRobotCard: React.FC<ImprovedRobotCardProps> = ({
  robot,
  onClick,
  onLike,
  onShare,
  imageDisplayMode = 'contain',
  aspectRatio = 'square'
}) => {
  const formatPrice = (price?: number, currency = 'INR') => {
    if (!price) return 'Price on request';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getAvailabilityColor = (availability?: string) => {
    switch (availability?.toLowerCase()) {
      case 'available':
        return 'default';
      case 'sold':
        return 'destructive';
      case 'pending':
        return 'secondary';
      default:
        return 'default';
    }
  };

  return (
    <Card className="group overflow-hidden border-border/50 hover:border-primary/20 transition-all duration-300 hover:shadow-lg">
      {/* Image Section */}
      <div className="relative">
        <ResponsiveImage
          src={robot.images?.[0] || '/placeholder-robot.png'}
          alt={robot.name}
          aspectRatio={aspectRatio}
          objectFit={imageDisplayMode}
          hoverEffect
          backgroundColor="hsl(var(--muted))"
          containerClassName="border-b border-border/50"
          placeholder="blur"
          fallback={
            <div className="flex items-center justify-center w-full h-full bg-muted rounded-t-lg">
              <Bot className="w-12 h-12 text-muted-foreground" />
            </div>
          }
          onClick={onClick}
        />
        
        {/* Image overlay with action buttons */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 space-y-1">
          <Button
            size="sm"
            variant="secondary"
            className="w-8 h-8 p-0 bg-background/80 backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation();
              onLike?.();
            }}
          >
            <Heart className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="w-8 h-8 p-0 bg-background/80 backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation();
              onShare?.();
            }}
          >
            <Share2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Availability badge */}
        {robot.availability && (
          <div className="absolute top-2 left-2">
            <Badge variant={getAvailabilityColor(robot.availability)} className="text-xs">
              {robot.availability}
            </Badge>
          </div>
        )}

        {/* Multiple images indicator */}
        {robot.images && robot.images.length > 1 && (
          <div className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm rounded-full px-2 py-1 text-xs text-muted-foreground">
            +{robot.images.length - 1} more
          </div>
        )}
      </div>

      <CardHeader className="pb-2">
        <div className="space-y-1">
          <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
            {robot.name}
          </CardTitle>
          {robot.model && (
            <CardDescription className="text-sm">
              {robot.brand && `${robot.brand} • `}{robot.model}
            </CardDescription>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Robot type and condition */}
          <div className="flex flex-wrap gap-1">
            {robot.robot_type && (
              <Badge variant="outline" className="text-xs">
                {robot.robot_type}
              </Badge>
            )}
            {robot.condition && (
              <Badge variant="secondary" className="text-xs">
                {robot.condition}
              </Badge>
            )}
          </div>

          {/* Price and location */}
          <div className="space-y-1">
            <div className="text-lg font-semibold text-primary">
              {formatPrice(robot.price, robot.currency)}
            </div>
            {robot.location && (
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <span>{robot.location}</span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            <Button 
              variant="default" 
              size="sm" 
              className="flex-1"
              onClick={onClick}
            >
              <Eye className="w-4 h-4 mr-1" />
              View Details
            </Button>
            <Button variant="outline" size="sm">
              Contact Seller
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Example usage component showing different configurations
export const RobotCardExamples: React.FC = () => {
  const sampleRobot: Robot = {
    id: '1',
    name: 'FANUC LR Mate 200iD/7L',
    model: 'LR Mate 200iD/7L',
    brand: 'FANUC',
    robot_type: 'Articulated Robot',
    condition: 'Refurbished',
    price: 450000,
    currency: 'INR',
    availability: 'available',
    location: 'Chennai, Tamil Nadu',
    images: [
      'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=400&h=600&fit=crop',
      'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=600&h=400&fit=crop',
    ]
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Robot Card Examples</h1>
        <p className="text-muted-foreground">
          Different image display configurations for product cards
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <h3 className="font-semibold">Square + Contain (Recommended)</h3>
          <ImprovedRobotCard
            robot={sampleRobot}
            aspectRatio="square"
            imageDisplayMode="contain"
            onClick={() => console.log('View details clicked')}
          />
          <p className="text-xs text-muted-foreground">
            Best for product catalogs - shows full image without cropping
          </p>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold">Square + Cover</h3>
          <ImprovedRobotCard
            robot={sampleRobot}
            aspectRatio="square"
            imageDisplayMode="cover"
            onClick={() => console.log('View details clicked')}
          />
          <p className="text-xs text-muted-foreground">
            Good for thumbnails - fills space but may crop image
          </p>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold">Auto Aspect + Contain</h3>
          <ImprovedRobotCard
            robot={sampleRobot}
            aspectRatio="auto"
            imageDisplayMode="contain"
            onClick={() => console.log('View details clicked')}
          />
          <p className="text-xs text-muted-foreground">
            Adapts to image dimensions - good for detail views
          </p>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold">Video Aspect + Contain</h3>
          <ImprovedRobotCard
            robot={sampleRobot}
            aspectRatio="video"
            imageDisplayMode="contain"
            onClick={() => console.log('View details clicked')}
          />
          <p className="text-xs text-muted-foreground">
            16:9 format - good for landscape images
          </p>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold">Portrait + Contain</h3>
          <ImprovedRobotCard
            robot={sampleRobot}
            aspectRatio="portrait"
            imageDisplayMode="contain"
            onClick={() => console.log('View details clicked')}
          />
          <p className="text-xs text-muted-foreground">
            3:4 format - good for vertical images
          </p>
        </div>
      </div>
    </div>
  );
};

export default ImprovedRobotCard;