import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Bot, ArrowRight, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatPrice as formatCurrencyPrice, Currency } from "@/utils/currency";
import Autoplay from "embla-carousel-autoplay";

interface Robot {
  id: string;
  name: string;
  robot_type: string;
  price: number;
  currency: Currency;
  images: string[];
  brand?: string;
}

const robotTypeConfig: Record<string, { label: string }> = {
  industrial: { label: "Industrial Robots" },
  collaborative: { label: "Collaborative Robots (Cobots)" },
  scara: { label: "SCARA Robots" },
  delta: { label: "Delta Robots" },
  cartesian: { label: "Cartesian Robots" },
  agv: { label: "AGV/AMR Robots" },
  service: { label: "Service Robots" },
  humanoid: { label: "Humanoid Robots" },
  medical: { label: "Medical Robots" },
  welding: { label: "Welding Robots" },
  painting: { label: "Painting Robots" },
  palletizing: { label: "Palletizing Robots" },
  assembly: { label: "Assembly Robots" },
  pick_and_place: { label: "Pick & Place Robots" },
  inspection: { label: "Inspection Robots" },
};

const HomeRobotListings = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [robots, setRobots] = useState<Robot[]>([]);
  const [loading, setLoading] = useState(true);
  const [robotsByType, setRobotsByType] = useState<Record<string, Robot[]>>({});

  const autoplayPlugin = useRef(
    Autoplay({
      delay: 4000,
      stopOnMouseEnter: true,
      stopOnInteraction: false,
    }),
  );

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
        .select("id, name, robot_type, price, currency, images, brand")
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
      if (!acc[type]) acc[type] = [];
      acc[type].push(robot);
      return acc;
    }, {});
    setRobotsByType(grouped);
  };

  // Calculate statistics for a group of robots
  const getTypeStats = (robotsOfType: Robot[]) => {
    const prices = robotsOfType.filter(r => r.price && r.price > 0).map(r => r.price);
    const brands = new Set(robotsOfType.map(r => r.brand).filter(Boolean));
    
    if (prices.length === 0) {
      return { minPrice: 0, maxPrice: 0, avgPrice: 0, brandCount: brands.size, count: robotsOfType.length };
    }
    
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
    
    return { minPrice, maxPrice, avgPrice, brandCount: brands.size, count: robotsOfType.length };
  };

  const formatPrice = (price: number, currency: Currency) => {
    if (!price) return "Price on request";
    return formatCurrencyPrice(price, currency);
  };

  const getTypeLabel = (type: string) => {
    const config = robotTypeConfig[type];
    if (config?.label) return config.label;
    return type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, " ") + " Robots";
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

  const robotTypes = Object.keys(robotsByType).sort((a, b) => robotsByType[b].length - robotsByType[a].length);

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
            if (!robotsOfType?.length) return null;
            const stats = getTypeStats(robotsOfType);

            return (
              <div key={robotType} className="relative">
                {/* Type Header with Stats */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                  <div className="space-y-1">
                    <h3 className="text-2xl font-bold text-foreground">{getTypeLabel(robotType)}</h3>
                    {/* Stats Row */}
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <span className="px-2 py-1 rounded-md bg-primary/10 text-primary font-medium">
                        {stats.count} {stats.count === 1 ? "Robot" : "Robots"}
                      </span>
                      {stats.brandCount > 0 && (
                        <span className="px-2 py-1 rounded-md bg-muted text-muted-foreground">
                          {stats.brandCount} {stats.brandCount === 1 ? "Brand" : "Brands"}
                        </span>
                      )}
                      {stats.minPrice > 0 && (
                        <>
                          <span className="px-2 py-1 rounded-md bg-green-500/10 text-green-600 dark:text-green-400">
                            Min: {formatPrice(stats.minPrice, "INR")}
                          </span>
                          <span className="px-2 py-1 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            Avg: {formatPrice(stats.avgPrice, "INR")}
                          </span>
                          <span className="px-2 py-1 rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400">
                            Max: {formatPrice(stats.maxPrice, "INR")}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/robots?type=${encodeURIComponent(robotType)}`)}
                    className="group shrink-0"
                  >
                    View All
                    <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>

                {/* Auto Carousel */}
                <Carousel
                  opts={{
                    align: "start",
                    loop: robotsOfType.length > 4,
                  }}
                  plugins={[autoplayPlugin.current]}
                  className="w-full"
                >
                  <CarouselContent className="-ml-4">
                    {robotsOfType.map((robot) => (
                      <CarouselItem
                        key={robot.id}
                        className="pl-4 basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4 xl:basis-1/5"
                      >
                        <Card
                          className="group cursor-pointer hover:shadow-lg transition-all duration-300 overflow-hidden border-border/60 hover:border-primary/40 bg-card/80 backdrop-blur-sm"
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
                                hoverEffect={false}
                                containerClassName="w-full h-full"
                                className="transition-transform duration-300 group-hover:scale-105"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Bot className="w-10 h-10 text-muted-foreground" />
                              </div>
                            )}
                          </div>

                          {/* Robot Info */}
                          <CardContent className="p-4 space-y-2">
                            <h4 className="font-semibold text-sm line-clamp-2 min-h-[2.5rem] group-hover:text-primary transition-colors">
                              {robot.name}
                            </h4>
                            <p className="text-base font-bold text-primary">
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
