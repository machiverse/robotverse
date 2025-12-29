import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Bot, ArrowRight, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatPrice as formatCurrencyPrice, Currency } from "@/utils/currency";

interface Robot {
  id: string;
  name: string;
  robot_type: string;
  price: number;
  currency: Currency;
  images: string[];
}

// Robot type display names and icons
const robotTypeConfig: Record<string, { label: string; icon: string }> = {
  industrial: { label: "Industrial Robots", icon: "🏭" },
  collaborative: { label: "Collaborative Robots (Cobots)", icon: "🤝" },
  scara: { label: "SCARA Robots", icon: "🦾" },
  delta: { label: "Delta Robots", icon: "🔺" },
  cartesian: { label: "Cartesian Robots", icon: "📐" },
  agv: { label: "AGV/AMR Robots", icon: "🚗" },
  service: { label: "Service Robots", icon: "🤖" },
  humanoid: { label: "Humanoid Robots", icon: "🧑‍🤝‍🧑" },
  medical: { label: "Medical Robots", icon: "🏥" },
  welding: { label: "Welding Robots", icon: "⚡" },
  painting: { label: "Painting Robots", icon: "🎨" },
  palletizing: { label: "Palletizing Robots", icon: "📦" },
  assembly: { label: "Assembly Robots", icon: "🔧" },
  pick_and_place: { label: "Pick & Place Robots", icon: "✋" },
  inspection: { label: "Inspection Robots", icon: "🔍" },
};

const HomeRobotListings = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [robots, setRobots] = useState<Robot[]>([]);
  const [loading, setLoading] = useState(true);
  const [robotsByType, setRobotsByType] = useState<Record<string, Robot[]>>({});

  useEffect(() => {
    fetchRobots();
  }, []);

  useEffect(() => {
    groupRobotsByType();
  }, [robots]);

  const fetchRobots = async () => {
    try {
      const { data, error } = await supabase
        .from("robots")
        .select("id, name, robot_type, price, currency, images")
        .eq("availability", "available")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRobots((data || []) as Robot[]);
    } catch (error) {
      console.error("Error fetching robots:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load robot listings",
      });
    } finally {
      setLoading(false);
    }
  };

  const groupRobotsByType = () => {
    const grouped = robots.reduce((acc: Record<string, Robot[]>, robot) => {
      const type = robot.robot_type || "other";
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(robot);
      return acc;
    }, {});
    setRobotsByType(grouped);
  };

  const formatPrice = (price: number, currency: Currency) => {
    if (!price) return "Price on request";
    return formatCurrencyPrice(price, currency);
  };

  const getTypeLabel = (type: string) => {
    return robotTypeConfig[type]?.label || type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, " ") + " Robots";
  };

  const getTypeIcon = (type: string) => {
    return robotTypeConfig[type]?.icon || "🤖";
  };

  if (loading) {
    return (
      <section className="py-16 bg-gradient-to-br from-background to-muted/20">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading robots...</span>
          </div>
        </div>
      </section>
    );
  }

  const robotTypes = Object.keys(robotsByType).sort((a, b) => 
    robotsByType[b].length - robotsByType[a].length
  );

  if (robotTypes.length === 0) {
    return (
      <section className="py-16 bg-gradient-to-br from-background to-muted/20">
        <div className="container mx-auto px-4 text-center">
          <Bot className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">No Robots Available</h2>
          <p className="text-muted-foreground mb-4">Check back soon for new listings!</p>
          <Button onClick={() => navigate("/dashboard")}>List Your Robot</Button>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Robot Marketplace
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Discover cutting-edge industrial robots from verified sellers
          </p>
        </div>

        {/* Robot Type Sections */}
        <div className="space-y-12">
          {robotTypes.map((robotType) => {
            const robotsOfType = robotsByType[robotType];
            if (robotsOfType.length === 0) return null;

            return (
              <div key={robotType} className="relative">
                {/* Type Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getTypeIcon(robotType)}</span>
                    <h3 className="text-2xl font-bold text-foreground">
                      {getTypeLabel(robotType)}
                    </h3>
                    <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded-full">
                      {robotsOfType.length} available
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/robots?type=${encodeURIComponent(robotType)}`)}
                    className="group"
                  >
                    View All
                    <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>

                {/* Carousel */}
                <Carousel
                  opts={{
                    align: "start",
                    loop: robotsOfType.length > 4,
                  }}
                  className="w-full"
                >
                  <CarouselContent className="-ml-4">
                    {robotsOfType.map((robot) => (
                      <CarouselItem
                        key={robot.id}
                        className="pl-4 basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4 xl:basis-1/5"
                      >
                        <Card
                          className="group cursor-pointer hover:shadow-lg transition-all duration-300 overflow-hidden border-border/50 hover:border-primary/30"
                          onClick={() => navigate(`/robots/${robot.id}`)}
                        >
                          {/* Robot Image */}
                          <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                            {robot.images && robot.images.length > 0 ? (
                              <ResponsiveImage
                                src={robot.images[0]}
                                alt={robot.name}
                                aspectRatio="auto"
                                objectFit="cover"
                                hoverEffect={true}
                                containerClassName="w-full h-full"
                                className="transition-transform duration-300 group-hover:scale-105"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Bot className="w-12 h-12 text-muted-foreground" />
                              </div>
                            )}
                          </div>

                          {/* Robot Info */}
                          <CardContent className="p-4">
                            <h4 className="font-semibold text-sm line-clamp-2 mb-2 group-hover:text-primary transition-colors min-h-[2.5rem]">
                              {robot.name}
                            </h4>
                            <p className="text-lg font-bold text-primary">
                              {formatPrice(robot.price, robot.currency)}
                            </p>
                          </CardContent>
                        </Card>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  
                  {robotsOfType.length > 4 && (
                    <>
                      <CarouselPrevious className="hidden md:flex -left-4 bg-background/80 backdrop-blur-sm border-border hover:bg-background" />
                      <CarouselNext className="hidden md:flex -right-4 bg-background/80 backdrop-blur-sm border-border hover:bg-background" />
                    </>
                  )}
                </Carousel>
              </div>
            );
          })}
        </div>

        {/* View All Robots Button */}
        <div className="text-center mt-12">
          <Button
            size="lg"
            onClick={() => navigate("/robots")}
            className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
          >
            View All {robots.length} Robots
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default HomeRobotListings;
