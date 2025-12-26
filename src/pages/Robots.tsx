// src/pages/Robots.tsx - Professional Filter Layout
import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUniversalViewTracking } from "@/hooks/useUniversalViewTracking";
import { useButtonTracking } from "@/hooks/useButtonTracking";
import {
  Loader2,
  Bot,
  Grid,
  List,
  Search,
  TrendingUp,
  Eye,
  Share2,
  MessageCircle,
  Brain,
  MapPin,
  Building,
  CheckCircle,
  Heart,
  ChevronDown,
  ChevronUp,
  Filter,
} from "lucide-react";
import ResponsiveImage from "@/components/ui/responsive-image";
import EnhancedHeader from "@/components/EnhancedHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { SEOHead } from "@/components/SEOHead";

const Robots = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { getItemViewCount } = useUniversalViewTracking();
  const { trackButtonClick } = useButtonTracking();

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [robotType, setRobotType] = useState<string[]>([]);
  const [payloadRange, setPayloadRange] = useState<string[]>([]);
  const [condition, setCondition] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, Infinity]);
  const [location, setLocation] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"views" | "price-low" | "price-high" | "newest">("views");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  // Data states
  const [robots, setRobots] = useState<any[]>([]);
  const [robotsWithViews, setRobotsWithViews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter options (dynamically populated)
  const [robotTypes, setRobotTypes] = useState<{ id: string; label: string; count: number }[]>([]);
  const [payloadRanges, setPayloadRanges] = useState<{ id: string; label: string; count: number }[]>([
    { id: "0-5", label: "0-5 kg", count: 0 },
    { id: "5-20", label: "5-20 kg", count: 0 },
    { id: "20-50", label: "20-50 kg", count: 0 },
    { id: "50-100", label: "50-100 kg", count: 0 },
    { id: "100+", label: "100+ kg", count: 0 },
  ]);
  const [conditions, setConditions] = useState<{ id: string; label: string; count: number }[]>([]);
  const [locations, setLocations] = useState<{ id: string; label: string; count: number }[]>([]);
  const [priceRanges, setPriceRanges] = useState<
    { id: string; label: string; min: number; max: number; count: number }[]
  >([
    { id: "0-50k", label: "$0 - $50K", min: 0, max: 50000, count: 0 },
    { id: "50k-200k", label: "$50K - $200K", min: 50000, max: 200000, count: 0 },
    { id: "200k-500k", label: "$200K - $500K", min: 200000, max: 500000, count: 0 },
    { id: "500k+", label: "$500K+", min: 500000, max: Infinity, count: 0 },
  ]);

  // Watchlist
  const [watchlistItems, setWatchlistItems] = useState<Set<string>>(new Set());

  // Fetch data
  useEffect(() => {
    fetchRobots();
  }, []);

  const fetchRobots = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("robots")
        .select("*, profiles!robots_seller_id_fkey(*)")
        .eq("availability", "available")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Add view counts
      const robotsWithViews = await Promise.all(
        (data || []).map(async (robot: any) => ({
          ...robot,
          viewCount: await getItemViewCount("robots", robot.id),
        })),
      );

      setRobots(robotsWithViews);
      setRobotsWithViews(robotsWithViews);

      // Populate filter options
      populateFilterOptions(robotsWithViews);

      // Load watchlist
      if (user) {
        const { data: watchlist } = await supabase
          .from("watchlists")
          .select("itemid")
          .eq("userid", user.id)
          .eq("itemtype", "robot");
        setWatchlistItems(new Set(watchlist?.map((w: any) => w.itemid) || []));
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const populateFilterOptions = (robotsData: any[]) => {
    const typeCounts = new Map<string, number>();
    const conditionCounts = new Map<string, number>();
    const locationCounts = new Map<string, number>();

    robotsData.forEach((robot) => {
      // Robot Type
      if (robot.robottype) {
        typeCounts.set(robot.robottype, (typeCounts.get(robot.robottype) || 0) + 1);
      }

      // Condition
      if (robot.condition) {
        conditionCounts.set(robot.condition, (conditionCounts.get(robot.condition) || 0) + 1);
      }

      // Location
      if (robot.location) {
        locationCounts.set(robot.location, (locationCounts.get(robot.location) || 0) + 1);
      }
    });

    setRobotTypes([
      { id: "industrial", label: "Industrial", count: typeCounts.get("Industrial") || 0 },
      { id: "cobot", label: "Cobots", count: typeCounts.get("Cobot") || 0 },
      { id: "agv", label: "AGV/AMR", count: typeCounts.get("AGV") || 0 },
      { id: "service", label: "Service", count: typeCounts.get("Service") || 0 },
    ]);

    setConditions(
      Array.from(conditionCounts.entries())
        .map(([label, count]) => ({ id: label.toLowerCase(), label, count }))
        .sort((a, b) => b.count - a.count),
    );

    setLocations(
      Array.from(locationCounts.entries())
        .map(([label, count]) => ({ id: label.toLowerCase(), label, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    );
  };

  // Filter robots
  const filteredRobots = useMemo(() => {
    let results = [...robotsWithViews];

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      results = results.filter(
        (r) =>
          r.name?.toLowerCase().includes(q) || r.model?.toLowerCase().includes(q) || r.brand?.toLowerCase().includes(q),
      );
    }

    // Robot Type
    if (robotType.length > 0) {
      results = results.filter((r) => robotType.includes(r.robottype?.toLowerCase() || ""));
    }

    // Payload Range
    if (payloadRange.length > 0) {
      results = results.filter((r) => {
        const payload = parseFloat(r.payload || "0");
        return payloadRange.some((range) => {
          if (range === "0-5") return payload >= 0 && payload <= 5;
          if (range === "5-20") return payload > 5 && payload <= 20;
          if (range === "20-50") return payload > 20 && payload <= 50;
          if (range === "50-100") return payload > 50 && payload <= 100;
          if (range === "100+") return payload > 100;
          return false;
        });
      });
    }

    // Condition
    if (condition.length > 0) {
      results = results.filter((r) => condition.includes(r.condition?.toLowerCase() || ""));
    }

    // Price Range
    results = results.filter((r) => {
      const price = parseFloat(r.price || "0");
      return price >= priceRange[0] && price <= priceRange[1];
    });

    // Location
    if (location.length > 0) {
      results = results.filter((r) => location.includes(r.location?.toLowerCase() || ""));
    }

    // Sort
    results.sort((a, b) => {
      switch (sortBy) {
        case "views":
          return (b.viewCount || 0) - (a.viewCount || 0);
        case "price-low":
          return parseFloat(a.price || "0") - parseFloat(b.price || "0");
        case "price-high":
          return parseFloat(b.price || "0") - parseFloat(a.price || "0");
        case "newest":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        default:
          return 0;
      }
    });

    return results;
  }, [robotsWithViews, searchQuery, robotType, payloadRange, condition, priceRange, location, sortBy]);

  const handleFilterToggle = useCallback(
    (filterType: string, value: string) => {
      setActiveFiltersCount((prev) => {
        const current = prev;
        const newCount = filterType === "priceRange" ? current : condition.includes(value) ? current - 1 : current + 1;
        return newCount;
      });

      if (filterType === "robotType") {
        setRobotType((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
      } else if (filterType === "payloadRange") {
        setPayloadRange((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
      } else if (filterType === "condition") {
        setCondition((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
      } else if (filterType === "location") {
        setLocation((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
      }
    },
    [condition],
  );

  const clearAllFilters = () => {
    setSearchQuery("");
    setRobotType([]);
    setPayloadRange([]);
    setCondition([]);
    setPriceRange([0, Infinity]);
    setLocation([]);
    setActiveFiltersCount(0);
  };

  const formatPrice = (price?: number) => {
    if (!price) return "Price on request";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <EnhancedHeader />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin mr-2" />
          <span>Loading robots...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Industrial Robots Marketplace | RobotVerse"
        description="Buy verified industrial robots from trusted sellers with financing, logistics & support"
      />
      <EnhancedHeader />

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-primary-foreground bg-clip-text text-transparent mb-4">
            Industrial Robots
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl">
            Browse 300+ verified robots from trusted sellers. ABB, KUKA, FANUC, Yaskawa and more.
          </p>
        </div>
      </div>

      {/* Main Layout: Left Filter + Right Content */}
      <div className="container mx-auto px-4 py-8 lg:py-12">
        <div className="grid lg:grid-cols-[280px_1fr] gap-8">
          {/* LEFT PROFESSIONAL FILTER SIDEBAR */}
          <aside className="lg:sticky lg:top-24 lg:h-[calc(100vh-6rem)] lg:overflow-y-auto hidden lg:block">
            <Card className="shadow-lg border-primary/20">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <Filter className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg font-bold">Filters</CardTitle>
                  {activeFiltersCount > 0 && (
                    <Badge className="ml-auto h-6 w-6 flex items-center justify-center text-xs font-bold">
                      {activeFiltersCount}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 1. ROBOT TYPE */}
                <FilterSection
                  title="Robot Type"
                  options={robotTypes}
                  selected={robotType}
                  onToggle={(value) => handleFilterToggle("robotType", value)}
                />

                {/* 2. PAYLOAD RANGE */}
                <FilterSection
                  title="Payload Range"
                  options={payloadRanges}
                  selected={payloadRange}
                  onToggle={(value) => handleFilterToggle("payloadRange", value)}
                />

                {/* 3. CONDITION */}
                <FilterSection
                  title="Condition"
                  options={conditions}
                  selected={condition}
                  onToggle={(value) => handleFilterToggle("condition", value)}
                />

                {/* 4. PRICE RANGE */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">Price Range</h4>
                  <div className="space-y-2">
                    {priceRanges.map((range) => (
                      <label
                        key={range.id}
                        className="flex items-center gap-3 p-2 rounded-md hover:bg-accent cursor-pointer group"
                      >
                        <input
                          type="radio"
                          name="price-range"
                          checked={priceRange[0] === range.min && priceRange[1] === range.max}
                          onChange={() => setPriceRange([range.min, range.max])}
                          className="w-4 h-4 rounded border-primary text-primary focus:ring-primary"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-foreground truncate">{range.label}</span>
                          <span className="text-xs text-muted-foreground ml-2">({range.count})</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 5. LOCATION */}
                <FilterSection
                  title="Location"
                  options={locations}
                  selected={location}
                  onToggle={(value) => handleFilterToggle("location", value)}
                />

                {/* Search */}
                <div>
                  <Input
                    placeholder="Search robots..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full"
                  />
                </div>

                {/* Clear All */}
                {activeFiltersCount > 0 && (
                  <Button variant="outline" className="w-full" onClick={clearAllFilters}>
                    Clear All ({activeFiltersCount})
                  </Button>
                )}
              </CardContent>
            </Card>
          </aside>

          {/* RIGHT MAIN CONTENT */}
          <main>
            {/* Top Controls */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8 justify-between items-start sm:items-center">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{filteredRobots.length}</span>
                robots found
                {sortBy === "views" && (
                  <Badge variant="secondary" className="ml-2">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    Popular
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-4">
                {/* Sort */}
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="views">Most Popular</SelectItem>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="price-low">Price: Low → High</SelectItem>
                    <SelectItem value="price-high">Price: High → Low</SelectItem>
                  </SelectContent>
                </Select>

                {/* View Mode */}
                <div className="flex gap-1 bg-muted p-1 rounded-lg">
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                    className="h-9 w-9 p-0"
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                    className="h-9 w-9 p-0"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>

                {/* Mobile Filter Button */}
                <Button variant="outline" className="lg:hidden">
                  <Filter className="w-4 h-4 mr-2" />
                  Filters
                </Button>
              </div>
            </div>

            {/* Results */}
            {filteredRobots.length === 0 ? (
              <div className="text-center py-20">
                <Bot className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No robots found</h3>
                <p className="text-muted-foreground mb-6">Try adjusting your filters</p>
                <Button onClick={clearAllFilters}>Clear Filters</Button>
              </div>
            ) : (
              <div
                className={
                  viewMode === "grid"
                    ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                    : "space-y-4"
                }
              >
                {filteredRobots.map((robot) => (
                  <RobotCard
                    key={robot.id}
                    robot={robot}
                    viewMode={viewMode}
                    isInWatchlist={watchlistItems.has(robot.id)}
                    onViewDetails={() => navigate(`/robots/${robot.id}`)}
                    onAddToWatchlist={() => handleAddToWatchlist(robot)}
                  />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

// Filter Section Component
const FilterSection = ({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: { id: string; label: string; count: number }[];
  selected: string[];
  onToggle: (value: string) => void;
}) => {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="space-y-2">
      <button
        className="w-full flex items-center justify-between text-left py-2 px-1 rounded hover:bg-accent"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="font-semibold text-sm">{title}</span>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {expanded && (
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {options.map((option) => (
            <label
              key={option.id}
              className="flex items-center gap-3 p-2 rounded-md hover:bg-accent cursor-pointer group"
            >
              <input
                type="checkbox"
                checked={selected.includes(option.id)}
                onChange={() => onToggle(option.id)}
                className="w-4 h-4 rounded border-primary text-primary focus:ring-primary transition-all"
              />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-foreground truncate">{option.label}</span>
                <span className="text-xs text-muted-foreground ml-2">({option.count})</span>
              </div>
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

// Robot Card Component
const RobotCard = ({
  robot,
  viewMode,
  isInWatchlist,
  onViewDetails,
  onAddToWatchlist,
}: {
  robot: any;
  viewMode: "grid" | "list";
  isInWatchlist: boolean;
  onViewDetails: () => void;
  onAddToWatchlist: () => void;
}) => {
  return (
    <Card
      className={`group hover:shadow-xl transition-all overflow-hidden cursor-pointer ${viewMode === "list" ? "flex" : ""}`}
    >
      {/* Image */}
      <div className={`relative overflow-hidden ${viewMode === "grid" ? "aspect-square" : "w-32 flex-shrink-0"}`}>
        <img
          src={robot.images?.[0] || "/placeholder-robot.jpg"}
          alt={robot.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute top-2 left-2">
          <Badge variant="secondary" className="text-xs">
            {robot.brand}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className={`p-4 ${viewMode === "list" ? "flex-1 flex flex-col justify-between" : ""}`}>
        <div>
          <h3 className="font-bold text-sm mb-1 line-clamp-2 group-hover:text-primary transition-colors">
            {robot.name}
          </h3>
          <div className="flex flex-wrap gap-1 mb-2">
            <Badge variant="outline" className="text-xs">
              {robot.robottype}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {robot.payload}kg
            </Badge>
            {robot.condition && <Badge className="text-xs">{robot.condition}</Badge>}
          </div>
          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
            {robot.location || "Location not specified"}
          </p>
        </div>

        {/* Price & Actions */}
        <div className="space-y-2">
          <div className="text-lg font-bold text-primary">{formatPrice(parseFloat(robot.price || "0"))}</div>
          <div className="flex gap-2">
            <Button size="sm" className="flex-1" onClick={onViewDetails}>
              View Details
            </Button>
            <Button size="sm" variant="outline" className="w-12" onClick={onAddToWatchlist}>
              {isInWatchlist ? "★" : "☆"}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default Robots;
