import { useState, useEffect } from "react";
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

  // Create autoplay plugin for each type
  const createAutoplayPlugin = () =>
    Autoplay({
      delay: 5000,
      stopOnMouseEnter: true,
      stopOnInteraction: false,
    });

  useEffect(() => {
    fetchRobots();
  }, []);

  useEffect(() => {
    groupRobotsByType();
  }, [robots]);

  const fetchRobots = async (retryCount = 0) => {
    try {
      const allRobots: Robot[] = [];
      let offset = 0;
      const batchSize = 500;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("robots")
          .select("id, name, robot_type, price, currency, images, brand")
          .eq("availability", "available")
          .order("created_at", { ascending: false })
          .range(offset, offset + batchSize - 1);

        if (error) {
          if (retryCount < 3) {
            console.warn(`Retrying robot fetch (attempt ${retryCount + 1})...`, error.message);
            await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
            return fetchRobots(retryCount + 1);
          }
          throw error;
        }

        if (data && data.length > 0) {
          allRobots.push(...(data as Robot[]));
          offset += batchSize;
          hasMore = data.length === batchSize;
        } else {
          hasMore = false;
        }
      }

      setRobots(allRobots);
    } catch (error) {
      console.error("Error fetching robots:", error);
      if (retryCount >= 3) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load robot listings. Please refresh the page.",
        });
      }
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

  // Calculate overall statistics for all robots
  const getOverallStats = () => {
    const prices = robots.filter((r) => r.price && r.price > 0).map((r) => r.price);
    const brands = new Set(robots.map((r) => r.brand).filter(Boolean));
    const typeCount = Object.keys(robotsByType).length;

    if (prices.length === 0) {
      return {
        minPrice: 0,
        maxPrice: 0,
        avgPrice: 0,
        brandCount: brands.size,
        count: robots.length,
        typeCount,
      };
    }

    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);

    return {
      minPrice,
      maxPrice,
      avgPrice,
      brandCount: brands.size,
      count: robots.length,
      typeCount,
    };
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

  const overallStats = getOverallStats();

  return (
    <section className="py-16 bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Robot Marketplace
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-6">
            Discover cutting-edge industrial robots from verified sellers
          </p>

          {/* Overall Stats */}
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
            <span className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-semibold">
              {overallStats.count} Robots
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-muted text-muted-foreground font-medium">
              {overallStats.typeCount} Categories
            </span>
            {overallStats.brandCount > 0 && (
              <span className="px-3 py-1.5 rounded-lg bg-muted text-muted-foreground font-medium">
                {overallStats.brandCount} Brands
              </span>
            )}
            {overallStats.minPrice > 0 && (
              <>
                <span className="px-3 py-1.5 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400 font-medium">
                  Min: {formatPrice(overallStats.minPrice, "INR")}
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium">
                  Avg: {formatPrice(overallStats.avgPrice, "INR")}
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 font-medium">
                  Max: {formatPrice(overallStats.maxPrice, "INR")}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Robot Type Sections */}
        <div className="space-y-12">
          {robotTypes.map((robotType) => {
            const robotsOfType = robotsByType[robotType];
            if (!robotsOfType?.length) return null;

            return (
              <div key={robotType} className="relative">
                {/* Type Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="space-y-1">
                    <h3 className="text-2xl font-bold text-foreground">{getTypeLabel(robotType)}</h3>
                    <p className="text-sm text-muted-foreground">
                      {robotsOfType.length} {robotsOfType.length === 1 ? "robot" : "robots"} available
                    </p>
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

                {/* ✅ AUTO-SCROLLS EVERY 5 SECONDS */}
                <Carousel
                  opts={{
                    align: "start",
                    loop: robotsOfType.length > 4,
                  }}
                  plugins={[createAutoplayPlugin()]}
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
                          <div className="relative aspect-square overflow-hidden bg-muted">
                            {robot.images && robot.images.length > 0 ? (
                              <img
                                src={robot.images[0]}
                                alt={robot.name}
                                loading="lazy"
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
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
