import { useState, useEffect } from "react";
import { OemRail, OemDot } from '@/components/oem/OemAccents';
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Bot, ArrowRight, Loader2 } from "lucide-react";
import { RequestQuotePill, CardLeadTimeNote, isPriceAvailable } from "@/components/pricing/PriceElements";
import { useToast } from "@/hooks/use-toast";
import { useAuthReady } from "@/hooks/useAuthReady";
import { formatPrice as formatCurrencyPrice, Currency } from "@/utils/currency";
import Autoplay from "embla-carousel-autoplay";
import { BevelBox, ConsoleButton, ConsoleLink, Readout, SectionHead, pad2 } from "@/components/console/ConsoleUI";

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
        <SectionHead
          index="001"
          label="Marketplace"
          title="Robot Marketplace"
          subtitle="Industrial robots from verified sellers, grouped by type."
          action={<ConsoleLink to="/robots">All robots</ConsoleLink>}
        />

        {/* Overall stats as a readout strip */}
        <BevelBox className="mb-12" innerClassName="grid grid-cols-2 gap-px bg-border sm:grid-cols-3 lg:grid-cols-6 [&>*]:bg-card">
          <Readout label="Robots" value={overallStats.count.toLocaleString("en-IN")} />
          <Readout label="Categories" value={overallStats.typeCount} />
          <Readout label="Brands" value={overallStats.brandCount} />
          <Readout label="Lowest price" value={overallStats.minPrice > 0 ? `₹${overallStats.minPrice.toLocaleString("en-IN")}` : "—"} />
          <Readout label="Average price" value={overallStats.avgPrice > 0 ? `₹${overallStats.avgPrice.toLocaleString("en-IN")}` : "—"} />
          <Readout label="Highest price" value={overallStats.maxPrice > 0 ? `₹${overallStats.maxPrice.toLocaleString("en-IN")}` : "—"} />
        </BevelBox>

        {/* Robot Type Sections */}
        <div className="space-y-12">
          {robotTypes.map((robotType, typeIndex) => {
            const robotsOfType = robotsByType[robotType];
            if (!robotsOfType?.length) return null;

            return (
              <div key={robotType} className="relative">
                {/* Type Header */}
                <div className="mb-5 flex items-end justify-between gap-4 border-b border-border pb-3">
                  <div className="flex min-w-0 items-baseline gap-3">
                    <span className="font-mono text-xs tabular-nums text-muted-foreground">{pad2(typeIndex + 1)}</span>
                    <h3 className="text-base font-semibold uppercase tracking-[-0.01em] text-foreground sm:text-lg md:text-xl">
                      {getTypeLabel(robotType)}
                    </h3>
                    <span className="hidden whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground sm:inline">
                      <span className="tabular-nums">{robotsOfType.length}</span> {robotsOfType.length === 1 ? "unit" : "units"}
                    </span>
                  </div>
                  <ConsoleLink to={`/robots?type=${encodeURIComponent(robotType)}`} className="shrink-0">
                    View all
                  </ConsoleLink>
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
                          className="group block h-full no-underline text-inherit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        >
                        <BevelBox className="h-full" innerClassName="relative overflow-hidden">
                          <OemRail brand={robot.brand} />
                          {/* Robot Image */}
                          <div className="relative aspect-[4/3] overflow-hidden border-b border-border bg-muted">
                            {robot.images && robot.images.length > 0 ? (
                              <img
                                src={robot.images[0]}
                                alt={robot.name}
                                loading="lazy"
                                className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <Bot className="h-10 w-10 text-muted-foreground" />
                              </div>
                            )}
                            {robot.condition && (
                              <span className="absolute left-3 top-3 bg-background/90 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-foreground">
                                {robot.condition}
                              </span>
                            )}
                          </div>

                          {/* Robot Info */}
                          <div className="space-y-2 p-4">
                            {robot.brand && (
                              <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                                <OemDot brand={robot.brand} />
                                {robot.brand}
                              </p>
                            )}
                            <h4 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug transition-colors duration-150 group-hover:text-primary">
                              {robot.name}
                            </h4>
                            {isPriceAvailable(robot.price) ? (
                              <div className="space-y-0.5 border-t border-border pt-2">
                                <p className="font-mono text-base font-medium tabular-nums text-foreground">
                                  {formatPrice(robot.price, robot.currency)}
                                </p>
                                <CardLeadTimeNote condition={robot.condition} leadTime={robot.lead_time} />
                              </div>
                            ) : (
                              <div className="space-y-1 border-t border-border pt-2">
                                <RequestQuotePill
                                  label="Ask for Price"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    navigate(`/robots/${robot.id}`);
                                  }}
                                />
                                <CardLeadTimeNote condition={robot.condition} leadTime={robot.lead_time} />
                              </div>
                            )}
                          </div>
                        </BevelBox>
                        </Link>
                      </CarouselItem>
                    ))}
                  </CarouselContent>

                  {robotsOfType.length > 4 && (
                    <>
                      <CarouselPrevious className="hidden md:flex -left-4 rounded-none border-border bg-background hover:bg-muted" />
                      <CarouselNext className="hidden md:flex -right-4 rounded-none border-border bg-background hover:bg-muted" />
                    </>
                  )}
                </Carousel>
              </div>
            );
          })}
        </div>

        {/* View All Robots Button */}
        <div className="mt-12 flex justify-center">
          <ConsoleButton to="/robots">
            View all <span className="tabular-nums">{robots.length}</span> robots
          </ConsoleButton>
        </div>
      </div>
    </section>
  );
};

export default HomeRobotListings;
