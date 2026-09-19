import { useState, useEffect } from "react";
import { OemRail, OemDot } from '@/components/oem/OemAccents';
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Bot, ArrowRight, Loader2 } from "lucide-react";
import { RequestQuotePill, CardLeadTimeNote, isPriceAvailable } from "@/components/pricing/PriceElements";
import { useToast } from "@/hooks/use-toast";
import { useAuthReady } from "@/hooks/useAuthReady";
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
  condition?: string;
  lead_time?: string | null;
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
  const { isReady } = useAuthReady();

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
    if (!isReady) return;
    fetchRobots();
  }, [isReady]);

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
          .select("id, name, robot_type, price, currency, images, brand, condition, lead_time")
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
    const prices = robots
      .filter((r) => r.price && r.price > 0)
      .map((r) => {
        if (r.currency && r.currency !== 'INR') {
          const rate = r.currency === 'USD' ? 1 / 0.012 : r.currency === 'EUR' ? 1 / 0.011 : 1;
          return Math.round(r.price * rate);
        }
        return r.price;
      });
    const brands = new Set(robots.map((r) => r.brand).filter(Boolean));
    const typeCount = Object.keys(robotsByType).length;

    if (prices.length === 0) {
      return { minPrice: 0, maxPrice: 0, avgPrice: 0, brandCount: brands.size, count: robots.length, typeCount };
    }

    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);

    return { minPrice, maxPrice, avgPrice, brandCount: brands.size, count: robots.length, typeCount };
  };

  const formatPrice = (price: number, currency: Currency) => {
    return formatCurrencyPrice(price, currency);
  };

  const getTypeLabel = (type: string) => {
    const config = robotTypeConfig[type];
    if (config?.label) return config.label;
    return type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, " ") + " Robots";
  };

  if (loading) {
    return (
      <section className="relative z-10 pt-10 pb-20 md:pt-12 md:pb-28 bg-background">
        <div className="container mx-auto px-4">
          <div className="mb-8 space-y-3">
            <div className="h-8 w-64 rounded-md bg-muted animate-pulse" />
            <div className="h-5 w-96 max-w-full rounded-md bg-muted animate-pulse" />
          </div>
          <div className="space-y-12">
            {[0, 1].map((section) => (
              <div key={section}>
                <div className="flex items-center justify-between mb-6">
                  <div className="space-y-2">
                    <div className="h-6 w-52 rounded-md bg-muted animate-pulse" />
                    <div className="h-4 w-32 rounded-md bg-muted animate-pulse" />
                  </div>
                  <div className="h-9 w-24 rounded-md bg-muted animate-pulse" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="rounded-lg border border-border bg-card overflow-hidden">
                      <div className="aspect-[4/3] bg-muted animate-pulse" />
                      <div className="p-4 space-y-2">
                        <div className="h-4 w-full rounded bg-muted animate-pulse" />
                        <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
                        <div className="h-5 w-1/2 rounded bg-muted animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  const robotTypes = Object.keys(robotsByType).sort((a, b) => robotsByType[b].length - robotsByType[a].length);

  if (robotTypes.length === 0) {
    return (
      <section className="relative z-10 pt-10 pb-20 md:pt-12 md:pb-28 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-xl mx-auto rounded-lg border border-border bg-card p-8 text-center">
            <Bot className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">No robots listed yet</h2>
            <p className="text-muted-foreground mb-6">
              There are no available robot listings right now. Sellers can publish inventory from the
              dashboard, and new listings appear here immediately.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button onClick={() => navigate("/dashboard")}>List Your Robot</Button>
              <Button variant="ghost" size="sm" onClick={() => navigate("/parts")}>
                Browse Spare Parts
              </Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const overallStats = getOverallStats();

  return (
    <section className="relative z-10 pt-10 pb-20 md:pt-12 md:pb-28 bg-background">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold mb-4 text-primary">
            Robot Marketplace
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-6">
            Discover cutting-edge industrial robots from verified sellers
          </p>

          {/* Overall Stats */}
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
            <span className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-semibold tabular">
              {overallStats.count} Robots
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-muted text-muted-foreground font-medium tabular">
              {overallStats.typeCount} Categories
            </span>
            {overallStats.brandCount > 0 && (
              <span className="px-3 py-1.5 rounded-lg bg-muted text-muted-foreground font-medium tabular">
                {overallStats.brandCount} Brands
              </span>
            )}
            {overallStats.minPrice > 0 && (
              <>
                <span className="px-3 py-1.5 rounded-lg bg-success/10 text-success dark:text-success font-medium tabular">
                  Min: ₹{overallStats.minPrice.toLocaleString('en-IN')}
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary dark:text-primary font-medium tabular">
                  Avg: ₹{overallStats.avgPrice.toLocaleString('en-IN')}
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-warning/10 text-warning font-medium tabular">
                  Max: ₹{overallStats.maxPrice.toLocaleString('en-IN')}
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
                      <span className="tabular">{robotsOfType.length}</span>{" "}{robotsOfType.length === 1 ? "robot" : "robots"} available
                    </p>
                  </div>
                  <Link
                    to={`/robots?type=${encodeURIComponent(robotType)}`}
                    className="shrink-0 no-underline"
                  >
                    <Button variant="outline" size="sm" className="group shrink-0">
                      View All
                      <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                
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
                        <Link
                          to={`/robots/${robot.id}`}
                          className="block no-underline text-inherit"
                        >
                        <Card
                          className="group relative cursor-pointer transition-colors duration-150 overflow-hidden border border-border hover:border-muted-foreground/40 bg-card shadow-none"
                        >
                          <OemRail brand={robot.brand} />
                          {/* Robot Image */}
                          <div className="relative aspect-[4/3] overflow-hidden bg-muted border-b border-border dark:shadow-[inset_0_0_0_1px_hsl(var(--border))]">
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
                            {robot.brand && (
                              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <OemDot brand={robot.brand} />
                                {robot.brand}
                              </p>
                            )}
                            {isPriceAvailable(robot.price) ? (
                              <div className="space-y-0.5">
                                <p className="text-base font-bold text-primary tabular">
                                  {formatPrice(robot.price, robot.currency)}
                                </p>
                                <CardLeadTimeNote condition={robot.condition} leadTime={robot.lead_time} />
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <RequestQuotePill
                                  label="Ask for Price"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/robots/${robot.id}`);
                                  }}
                                />
                                <CardLeadTimeNote condition={robot.condition} leadTime={robot.lead_time} />
                              </div>
                            )}
                          </CardContent>

                        </Card>
                        </Link>
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
          <Link to="/robots" className="inline-block no-underline">
            <Button size="lg">
              View All <span className="tabular mx-1">{robots.length}</span> Robots
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default HomeRobotListings;
