import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import {
  AlertCircle,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Grid,
  List,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Robot {
  id: string;
  name: string;
  model: string;
  robot_type: string;
  quantity: number;
  location: string;
  state?: string;
  pincode?: string;
  availability: string;
  price: number;
  currency: string;
  images: string[];
  category_tags: string[];
  seller_id: string;
  created_at: string;
  description: string;
  brand?: string;
  condition?: string;
  year_manufactured?: number;
  payload_capacity?: number;
  applications?: string[];
  certification_standards?: string[];
  training_included?: boolean;
  warranty_info?: string;
  profiles: {
    company_name: string;
    full_name: string;
    phone: string;
    mobile_number: string;
    email: string;
    user_type: string;
  };
}

const RobotListings: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [robots, setRobots] = useState<Robot[]>([]);
  const [filteredRobots, setFilteredRobots] = useState<Robot[]>([]);
  const [sellerProfiles, setSellerProfiles] = useState<{ [key: string]: any }>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [priceFilter, setPriceFilter] = useState("all");
  const [conditionFilter, setConditionFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [displayCount, setDisplayCount] = useState(9);

  const [categoryFilter, setCategoryFilter] = useState("all");
  const [groupBy, setGroupBy] = useState<"company" | "category">("company");

  const [marketStats, setMarketStats] = useState({
    totalListings: 0,
    minPrice: 0,
    avgPrice: 0,
    maxPrice: 0,
    topBrands: [] as string[],
    trendingTypes: [] as string[],
  });

  const uniqueTypes = [...new Set(robots.map((r) => r.robot_type).filter(Boolean))];
  const uniqueLocations = [...new Set(robots.map((r) => r.location?.split(",")[0]).filter(Boolean))];
  const uniqueStates = [...new Set(robots.map((r) => r.state).filter(Boolean))];

  useEffect(() => {
    fetchRobots();
  }, []);

  useEffect(() => {
    filterAndSortRobots();
  }, [
    robots,
    searchQuery,
    typeFilter,
    priceFilter,
    conditionFilter,
    locationFilter,
    stateFilter,
    sortBy,
    categoryFilter,
  ]);

  async function fetchRobots() {
    try {
      setRefreshing(true);
      const { data, error } = await supabase
        .from("robots")
        .select(`
          *,
          profiles!robots_seller_id_fkey (
            user_id,
            company_name,
            full_name,
            phone,
            mobile_number,
            email,
            user_type
          )
        `)
        .eq("availability", "available")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const robotsData = (data || []) as Robot[];
      setRobots(robotsData);
      calculateMarketStats(robotsData);

      const profiles: { [key: string]: any } = {};
      robotsData.forEach((robot) => {
        if (robot.profiles && !profiles[robot.seller_id]) profiles[robot.seller_id] = robot.profiles;
      });
      setSellerProfiles(profiles);

      setFilteredRobots(robotsData);
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to load robot listings" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function calculateMarketStats(robotsData: Robot[]) {
    const totalListings = robotsData.length;
    const prices = robotsData.map((r) => r.price || 0).filter((p) => p > 0);
    const minPrice = prices.length ? Math.min(...prices) : 0;
    const maxPrice = prices.length ? Math.max(...prices) : 0;
    const avgPrice = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;

    const brandCounts = robotsData.reduce((acc, r) => {
      if (r.brand) acc[r.brand] = (acc[r.brand] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topBrands = Object.entries(brandCounts).sort(([, a], [, b]) => b - a).slice(0, 3).map(([brand]) => brand);

    const typeCounts = robotsData.reduce((acc, r) => {
      if (r.robot_type) acc[r.robot_type] = (acc[r.robot_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const trendingTypes = Object.entries(typeCounts).sort(([, a], [, b]) => b - a).slice(0, 3).map(([type]) => type);

    setMarketStats({
      totalListings,
      minPrice,
      avgPrice,
      maxPrice,
      topBrands,
      trendingTypes,
    });
  }

  function filterAndSortRobots() {
    let filtered = [...robots];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.name?.toLowerCase().includes(q) ||
        r.brand?.toLowerCase().includes(q) ||
        r.model?.toLowerCase().includes(q) ||
        r.robot_type?.toLowerCase().includes(q) ||
        r.location?.toLowerCase().includes(q) ||
        r.category_tags?.some(tag => tag.toLowerCase().includes(q))
      );
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter(r => r.robot_type === categoryFilter);
    }

    if (typeFilter !== "all") filtered = filtered.filter(r => r.robot_type === typeFilter);

    if (priceFilter !== "all") {
      const ranges: Record<string, [number, number]> = {
        "under-50k": [0, 50000],
        "50k-200k": [50000, 200000],
        "200k-500k": [200000, 500000],
        "500k-1m": [500000, 1000000],
        "over-1m": [1000000, Infinity],
      };
      const range = ranges[priceFilter];
      if (range) filtered = filtered.filter(r => r.price >= range[0] && r.price < range);
    }

    if (conditionFilter !== "all") filtered = filtered.filter(r => r.condition === conditionFilter);

    if (locationFilter !== "all") filtered = filtered.filter(r =>
      r.location?.toLowerCase().includes(locationFilter.toLowerCase()));

    if (stateFilter !== "all")
      filtered = filtered.filter(r => (r.state || "").toLowerCase() === stateFilter.toLowerCase());

    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest": return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "oldest": return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "price-low": return (a.price || 0) - (b.price || 0);
        case "price-high": return (b.price || 0) - (a.price || 0);
        case "name-az": return (a.name || "").localeCompare(b.name || "");
        case "name-za": return (b.name || "").localeCompare(a.name || "");
        default: return 0;
      }
    });

    setFilteredRobots(filtered);
  }

  const getCompanyGroups = () => {
    const groups: { [key: string]: Robot[] } = {};
    filteredRobots.forEach(r => {
      if (!groups[r.seller_id]) groups[r.seller_id] = [];
      groups[r.seller_id].push(r);
    });
    return groups;
  };

  const getCategoryGroups = () => {
    const groups: { [key: string]: Robot[] } = {};
    filteredRobots.forEach(r => {
      if (!groups[r.robot_type]) groups[r.robot_type] = [];
      groups[r.robot_type].push(r);
    });
    return groups;
  };

  const formatPrice = (price: number, currency: string) => {
    if (!price) return "Price on request";
    const symbol = currency === "INR" ? "₹" : currency === "USD" ? "$" : "€";
    return `${symbol}${price.toLocaleString()}`;
  };

  const SellerRobotCarousel: React.FC<{
    sellerRobots: Robot[];
    sellerProfile: any;
    imageClassName?: string;
  }> = ({ sellerRobots, sellerProfile, imageClassName = "w-full h-48 object-contain rounded-lg" }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    const scrollByCard = (dir: "left" | "right") => {
      if (!containerRef.current) return;
      const container = containerRef.current;
      const card = container.querySelector<HTMLElement>(".robot-card");
      if (!card) return;

      const scrollAmount = card.offsetWidth + 16;
      const newScroll = dir === "left" ? container.scrollLeft - scrollAmount : container.scrollLeft + scrollAmount;
      container.scrollTo({ left: newScroll, behavior: "smooth" });
    };

    return (
      <div className="border rounded-lg p-4 flex flex-col">
        <h3 className="font-bold mb-3 text-lg">{sellerProfile?.company_name || sellerProfile?.full_name || "Seller"}</h3>
        <div className="relative">
          <Button
            size="sm"
            variant="outline"
            onClick={() => scrollByCard("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 hidden md:flex"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div
            ref={containerRef}
            className="flex overflow-x-auto scroll-pl-4 snap-x snap-mandatory gap-4 scrollbar-hide"
            style={{ scrollSnapType: "x mandatory" }}
          >
            {sellerRobots.map(robot => (
              <div
                key={robot.id}
                className="flex-shrink-0 w-56 snap-start robot-card cursor-pointer border rounded-md p-2"
                onClick={() => navigate(`/robots/${robot.id}`)}
                title={robot.name}
              >
                <img src={robot.images?.[0] || "/default-robot.png"} alt={robot.name} className={imageClassName} loading="lazy" />
                <div className="mt-2 font-semibold truncate">{robot.name}</div>
                <div className="text-sm text-muted-foreground truncate">{robot.model}</div>
                <div className="text-green-600 font-bold mt-1 text-lg">{`₹${robot.price?.toLocaleString()}`}</div>
              </div>
            ))}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => scrollByCard("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 hidden md:flex"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>
    );
  };

  const CategoryRobotCarousel: React.FC<{
    category: string;
    robots: Robot[];
    imageClassName?: string;
  }> = ({ category, robots, imageClassName = "w-full h-48 object-contain rounded-lg" }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    const scrollByCard = (dir: "left" | "right") => {
      if (!containerRef.current) return;
      const container = containerRef.current;
      const card = container.querySelector<HTMLElement>(".robot-card");
      if (!card) return;

      const scrollAmount = card.offsetWidth + 16;
      const newScroll = dir === "left" ? container.scrollLeft - scrollAmount : container.scrollLeft + scrollAmount;
      container.scrollTo({ left: newScroll, behavior: "smooth" });
    };

    return (
      <div className="border rounded-lg p-4 flex flex-col">
        <h3 className="font-bold mb-3 text-lg">{category}</h3>
        <div className="relative">
          <Button
            size="sm"
            variant="outline"
            onClick={() => scrollByCard("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 hidden md:flex"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div
            ref={containerRef}
            className="flex overflow-x-auto scroll-pl-4 snap-x snap-mandatory gap-4 scrollbar-hide"
            style={{ scrollSnapType: "x mandatory" }}
          >
            {robots.map(robot => (
              <div
                key={robot.id}
                className="flex-shrink-0 w-56 snap-start robot-card cursor-pointer border rounded-md p-2"
                onClick={() => navigate(`/robots/${robot.id}`)}
                title={robot.name}
              >
                <img src={robot.images?.[0] || "/default-robot.png"} alt={robot.name} className={imageClassName} loading="lazy" />
                <div className="mt-2 font-semibold truncate">{robot.name}</div>
                <div className="text-sm text-muted-foreground truncate">{robot.model}</div>
                <div className="text-green-600 font-bold mt-1 text-lg">{`₹${robot.price?.toLocaleString()}`}</div>
              </div>
            ))}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => scrollByCard("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 hidden md:flex"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <>
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      <section className="py-16 bg-gradient-to-br from-background to-muted/20">
        <div className="container mx-auto px-4">
          {/* Add your header, market stats, filters controls here (omitted for brevity; reuse your UI) */}

          {filteredRobots.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No robots match your criteria</h3>
                <p className="text-muted-foreground mb-4">Try adjusting your search or filter settings</p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery("");
                    setTypeFilter("all");
                    setPriceFilter("all");
                    setConditionFilter("all");
                    setLocationFilter("all");
                    setStateFilter("all");
                    setCategoryFilter("all");
                  }}
                >
                  Clear Filters
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(groupBy === "company"
                ? Object.entries(getCompanyGroups()).slice(0, displayCount)
                : Object.entries(getCategoryGroups()).slice(0, displayCount)
              ).map(([groupKey, groupRobots]) =>
                groupBy === "company" ? (
                  <SellerRobotCarousel
                    key={groupKey}
                    sellerRobots={groupRobots}
                    sellerProfile={sellerProfiles[groupKey] || {}}
                    imageClassName="w-full h-48 object-contain rounded-lg"
                  />
                ) : (
                  <CategoryRobotCarousel
                    key={groupKey}
                    category={groupKey}
                    robots={groupRobots}
                    imageClassName="w-full h-48 object-contain rounded-lg"
                  />
                )
              )}
            </div>
          )}

          {(groupBy === "company"
            ? Object.keys(getCompanyGroups()).length
            : Object.keys(getCategoryGroups()).length) > displayCount && (
            <div className="text-center mt-8">
              <Button variant="outline" size="lg"
                onClick={() => setDisplayCount((prev) => prev + 9)}>
                Load More Robots
              </Button>
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default RobotListings;
