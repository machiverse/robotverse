import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  Package,
  Bot,
  Share2,
  MessageCircle,
  Brain,
  Eye,
  Grid,
  List,
  SlidersHorizontal,
  RefreshCw,
  MapPin,
  Building,
  CheckCircle,
  Search,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatPrice as formatCurrencyPrice, Currency, convertToINR } from "@/utils/currency";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";

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
  currency: Currency;
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

interface AIAnalysisData {
  summary: string;
  suitability?: string;
  technicalInsights?: string;
  governmentSchemes?: string;
  suggestedIndustries?: string;
  timestamp: string;
}

interface AIAnalysisResult {
  analysis: AIAnalysisData;
  cached?: boolean;
  currentUserLocation?: string;
  recommendations: {
    spareParts: any[];
    services: any[];
    logistics: any[];
    finance: any[];
  };
}

const RobotListings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // State variables
  const [robots, setRobots] = useState<Robot[]>([]);
  const [filteredRobots, setFilteredRobots] = useState<Robot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [priceFilter, setPriceFilter] = useState("all");
  const [conditionFilter, setConditionFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");
  const [brandFilter, setBrandFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [sortBy, setSortBy] = useState("popular");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [displayCount, setDisplayCount] = useState(8);
  const [viewCounts, setViewCounts] = useState<Record<string, number>>({});

  // Market statistics
  const [marketStats, setMarketStats] = useState({
    totalListings: 0,
    minPrice: 0,
    avgPrice: 0,
    maxPrice: 0,
    topBrands: [] as string[],
    trendingTypes: [] as string[],
  });

  // AI Analysis dialog states
  const [showAiDialog, setShowAiDialog] = useState(false);
  const [aiDialogLoading, setAiDialogLoading] = useState(false);
  const [aiDialogData, setAiDialogData] = useState<AIAnalysisResult | null>(null);
  
  // AI Analysis inline states
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false);
  const [aiAnalysisRobotId, setAiAnalysisRobotId] = useState<string | null>(null);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<AIAnalysisResult | null>(null);

  // Fetch robots on mount
  useEffect(() => {
    fetchRobots();
  }, []);

  // Filter and sort whenever dependencies change
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
    brandFilter,
    companyFilter,
    sortBy,
    viewCounts,
  ]);

  // Fetch view counts after robots loaded
  useEffect(() => {
    fetchViewCounts();
  }, [robots]);

  // Fetch robots from database
  const fetchRobots = async () => {
    try {
      setRefreshing(true);
      const { data, error } = await supabase
        .from("robots")
        .select(
          `
          *,
          profiles!robots_seller_id_fkey (
            company_name,
            full_name,
            phone,
            mobile_number,
            email,
            user_type
          )
          `
        )
        .eq("availability", "available")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const robotsData = (data || []) as Robot[];
      setRobots(robotsData);
      calculateMarketStats(robotsData);
    } catch (error) {
      console.error("Error fetching robots:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load robot listings",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch view counts for robots
  const fetchViewCounts = async () => {
    try {
      const robotIds = robots.map((r) => r.id);
      if (robotIds.length === 0) return;

      const { data, error } = await supabase
        .from("user_interactions")
        .select("target_id")
        .eq("interaction_type", "view")
        .eq("target_type", "robot")
        .in("target_id", robotIds);

      if (error) throw error;

      const counts = (data || []).reduce((acc: Record<string, number>, item) => {
        acc[item.target_id] = (acc[item.target_id] || 0) + 1;
        return acc;
      }, {});
      setViewCounts(counts);
    } catch (error) {
      console.error("Error fetching view counts:", error);
    }
  };

  // Calculate market statistics
  const calculateMarketStats = (robotsData: Robot[]) => {
    const totalListings = robotsData.length;
    const pricesInINR = robotsData
      .filter((r) => r.price && r.price > 0)
      .map((r) => convertToINR(r.price, r.currency));
    const minPrice = pricesInINR.length > 0 ? Math.min(...pricesInINR) : 0;
    const maxPrice = pricesInINR.length > 0 ? Math.max(...pricesInINR) : 0;
    const avgPrice =
      pricesInINR.length > 0
        ? pricesInINR.reduce((sum, p) => sum + p, 0) / pricesInINR.length
        : 0;

    const brandCounts = robotsData.reduce((acc: Record<string, number>, robot) => {
      if (robot.brand) {
        acc[robot.brand] = (acc[robot.brand] || 0) + 1;
      }
      return acc;
    }, {});

    const topBrands = Object.entries(brandCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([brand]) => brand);

    const typeCounts = robotsData.reduce((acc: Record<string, number>, robot) => {
      if (robot.robot_type) {
        acc[robot.robot_type] = (acc[robot.robot_type] || 0) + 1;
      }
      return acc;
    }, {});

    const trendingTypes = Object.entries(typeCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([type]) => type);

    setMarketStats({
      totalListings,
      minPrice,
      avgPrice,
      maxPrice,
      topBrands,
      trendingTypes,
    });
  };

  // Filter and sort robots
  const filterAndSortRobots = () => {
    let filtered = [...robots];

    if (searchQuery) {
      filtered = filtered.filter((robot) =>
        [
          robot.name,
          robot.brand,
          robot.model,
          robot.robot_type,
          robot.location,
          robot.profiles?.company_name,
          ...(robot.category_tags || []),
        ]
          .filter(Boolean)
          .some((field) =>
            field!.toLowerCase().includes(searchQuery.toLowerCase())
          )
      );
    }
    if (typeFilter !== "all") {
      filtered = filtered.filter((robot) => robot.robot_type === typeFilter);
    }
    if (brandFilter !== "all") {
      filtered = filtered.filter((robot) => robot.brand === brandFilter);
    }
    if (companyFilter !== "all") {
      filtered = filtered.filter(
        (robot) => robot.profiles?.company_name === companyFilter
      );
    }

    if (priceFilter !== "all") {
      const ranges = {
        "under-50k": [0, 50000],
        "50k-200k": [50000, 200000],
        "200k-500k": [200000, 500000],
        "500k-1m": [500000, 1000000],
        "over-1m": [1000000, Infinity],
      };
      const range = ranges[priceFilter as keyof typeof ranges];
      if (range) {
        filtered = filtered.filter((robot) => {
          const priceInINR = convertToINR(robot.price, robot.currency);
          return priceInINR >= range[0] && priceInINR < range[1];
        });
      }
    }

    if (conditionFilter !== "all") {
      filtered = filtered.filter((robot) => robot.condition === conditionFilter);
    }

    if (locationFilter !== "all") {
      filtered = filtered.filter((robot) =>
        robot.location?.toLowerCase().includes(locationFilter.toLowerCase())
      );
    }

    if (stateFilter !== "all") {
      filtered = filtered.filter(
        (robot) => (robot.state || "").toLowerCase() === stateFilter.toLowerCase()
      );
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "popular":
          return (viewCounts[b.id] || 0) - (viewCounts[a.id] || 0);
        case "newest":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "price-low":
          return convertToINR(a.price || 0, a.currency) - convertToINR(b.price || 0, b.currency);
        case "price-high":
          return convertToINR(b.price || 0, b.currency) - convertToINR(a.price || 0, a.currency);
        case "name-az":
          return (a.name || "").localeCompare(b.name || "");
        case "name-za":
          return (b.name || "").localeCompare(a.name || "");
        case "brand-az":
          return (a.brand || "").localeCompare(b.brand || "");
        case "company-az":
          return (a.profiles?.company_name || "").localeCompare(b.profiles?.company_name || "");
        default:
          return 0;
      }
    });

    setFilteredRobots(filtered);
  };

  // Format price helper
  const formatPrice = (price: number, currency: Currency) => {
    if (!price) return "Price on request";
    return formatCurrencyPrice(price, currency);
  };

  // Color for condition badge
  const getConditionColor = (condition: string) => {
    const colors = {
      new: "bg-green-100 text-green-800",
      like_new: "bg-blue-100 text-blue-800",
      good: "bg-yellow-100 text-yellow-800",
      fair: "bg-orange-100 text-orange-800",
      refurbished: "bg-purple-100 text-purple-800",
    };
    return colors[condition as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  // Unique filter options
  const uniqueTypes = [...new Set(robots.map((r) => r.robot_type).filter(Boolean))];
  const uniqueBrands = [...new Set(robots.map((r) => r.brand).filter(Boolean))];
  const uniqueCompanies = [...new Set(robots.map((r) => r.profiles?.company_name).filter(Boolean))];
  const uniqueLocations = [...new Set(robots.map((r) => r.location?.split(",")[0]).filter(Boolean))];
  const uniqueStates = [...new Set(robots.map((r) => r.state).filter(Boolean))];

  // Handle AI analysis dialog popup
  const handleAnalyzeRobot = async (robot: Robot) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Sign In Required",
        description: "Please sign in to use RobotVerse AI analysis",
      });
      return;
    }
    setShowAiDialog(true);
    setAiDialogLoading(true);
    setAiDialogData(null);
    toast({
      title: "Starting AI Analysis",
      description: `Analyzing ${robot.name} via AI...`,
    });
    try {
      const { data, error } = await supabase.functions.invoke("roboverse-ai-analyze", {
        body: { robotId: robot.id },
      });
      if (error) throw error;
      const analysisData = typeof data.analysis === "string" ? { summary: data.analysis } : data.analysis;
      setAiDialogData({
        analysis: {
          summary: analysisData.summary || "",
          suitability: analysisData.suitability || "",
          technicalInsights: analysisData.technicalInsights || "",
          governmentSchemes: analysisData.governmentSchemes || "",
          suggestedIndustries: analysisData.suggestedIndustries || "",
          timestamp: analysisData.timestamp || new Date().toISOString(),
        },
        cached: data.cached || false,
        currentUserLocation: data.currentUserLocation || "",
        recommendations: {
          spareParts: data.marketEcosystem?.spareParts?.suppliers || [],
          services: data.marketEcosystem?.services?.providers || [],
          logistics: data.marketEcosystem?.logistics?.providers || [],
          finance: data.marketEcosystem?.finance?.providers || [],
        },
      });
      toast({
        title: "AI Analysis Complete",
        description: "AI analysis results loaded.",
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "AI Analysis Failed",
        description: err instanceof Error ? err.message : "Failed to get AI analysis",
      });
      setShowAiDialog(false);
    } finally {
      setAiDialogLoading(false);
    }
  };

  // Share handler (same as your code)
  const handleShare = (robot: Robot, e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.share) {
      navigator.share({
        title: robot.name,
        text: `Check out this ${robot.robot_type}: ${robot.name} for ${formatPrice(robot.price, robot.currency)}`,
        url: `${window.location.origin}/robots/${robot.id}`,
      });
    } else {
      navigator.clipboard.writeText(`${window.location.origin}/robots/${robot.id}`);
      toast({
        title: "Link copied!",
        description: "Robot listing link copied to clipboard",
      });
    }
  };

  // Contact seller handler (same as your code)
  const handleContactSeller = (robot: Robot, e: React.MouseEvent) => {
    e.stopPropagation();
    const phone = robot.profiles?.phone || robot.profiles?.mobile_number;

    if (!phone) {
      toast({
        variant: "destructive",
        title: "Contact Unavailable",
        description: "Contact information not available for this seller",
      });
      return;
    }

    const phoneNumber = phone.replace(/\D/g, "");
    const message = `Hi ${robot.profiles?.company_name || robot.profiles?.full_name}! I'm interested in your robot: ${robot.name} (${robot.model}). Price: ${formatPrice(
      robot.price,
      robot.currency
    )}. Can you please provide more details?`;

    const choice = window.confirm(`Contact ${robot.profiles?.company_name || robot.profiles?.full_name}:\n\nOK = WhatsApp\nCancel = Phone Call`);

    if (choice) {
      window.open(`https://wa.me/91${phoneNumber}?text=${encodeURIComponent(message)}`, "_blank");
    } else {
      window.location.href = `tel:+91${phoneNumber}`;
    }
  };

  if (loading) {
    return (
      <section className="py-16 bg-gradient-to-br from-background to-muted/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <div className="h-8 bg-muted rounded w-64 mx-auto mb-4 animate-pulse"></div>
            <div className="h-4 bg-muted rounded w-96 mx-auto animate-pulse"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array(8)
              .fill(0)
              .map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <div className="h-48 bg-muted rounded-t-lg"></div>
                  <CardContent className="p-4 space-y-3">
                    <div className="h-4 bg-muted rounded"></div>
                    <div className="h-3 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                    <div className="flex gap-2">
                      <div className="h-8 bg-muted rounded flex-1"></div>
                      <div className="h-8 bg-muted rounded flex-1"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="py-16 bg-gradient-to-br from-background to-muted/20">
        <div className="container mx-auto px-4">
          {/* Title and Stats */}
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Robot Marketplace
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Discover cutting-edge industrial robots from verified sellers worldwide
            </p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 max-w-5xl mx-auto mt-8">
              <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-800">{marketStats.totalListings}</div>
                  <div className="text-sm text-blue-600">Active Listings</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-800">₹{(marketStats.minPrice / 100000).toFixed(1)}L</div>
                  <div className="text-sm text-green-600">Min Price</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-800">₹{(marketStats.avgPrice / 100000).toFixed(1)}L</div>
                  <div className="text-sm text-yellow-600">Avg Price</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-r from-red-50 to-rose-50 border-red-200">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-red-800">₹{(marketStats.maxPrice / 100000).toFixed(1)}L</div>
                  <div className="text-sm text-red-600">Max Price</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-r from-purple-50 to-violet-50 border-purple-200">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-purple-800">{marketStats.topBrands.length}</div>
                  <div className="text-sm text-purple-600">Top Brands</div>
                </CardContent>
              </Card>
            </div>
          </div>

        {/* Search and Filters */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search robots by name, brand, type, location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Quick Filters */}
              <div className="flex gap-2 flex-wrap">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {uniqueTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={brandFilter} onValueChange={setBrandFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Brand" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Brands</SelectItem>
                    {uniqueBrands.map((brand) => (
                      <SelectItem key={brand} value={brand}>
                        {brand}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={companyFilter} onValueChange={setCompanyFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Company" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Companies</SelectItem>
                    {uniqueCompanies.map((company) => (
                      <SelectItem key={company} value={company}>
                        {company}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={priceFilter} onValueChange={setPriceFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Price" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Prices</SelectItem>
                    <SelectItem value="under-50k">Under ₹50K</SelectItem>
                    <SelectItem value="50k-200k">₹50K - ₹2L</SelectItem>
                    <SelectItem value="200k-500k">₹2L - ₹5L</SelectItem>
                    <SelectItem value="500k-1m">₹5L - ₹10L</SelectItem>
                    <SelectItem value="over-1m">Over ₹10L</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="px-3">
                  <SlidersHorizontal className="w-4 h-4" />
                </Button>
              </div>

              {/* View Controls */}
              <div className="flex gap-2 items-center">
                <div className="flex border rounded-lg">
                  <Button variant={viewMode === "grid" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("grid")}>
                    <Grid className="w-4 h-4" />
                  </Button>
                  <Button variant={viewMode === "list" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("list")}>
                    <List className="w-4 h-4" />
                  </Button>
                </div>
                <Button variant="outline" size="sm" onClick={fetchRobots} disabled={refreshing}>
                  <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <Select value={conditionFilter} onValueChange={setConditionFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Condition" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Conditions</SelectItem>
                      <SelectItem value="new">Brand New</SelectItem>
                      <SelectItem value="like_new">Like New</SelectItem>
                      <SelectItem value="good">Good</SelectItem>
                      <SelectItem value="fair">Fair</SelectItem>
                      <SelectItem value="refurbished">Refurbished</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={locationFilter} onValueChange={setLocationFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Locations</SelectItem>
                      {uniqueLocations.map((location) => (
                        <SelectItem key={location} value={location}>
                          {location}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={stateFilter} onValueChange={setStateFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="State" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All States</SelectItem>
                      {uniqueStates.map((state) => (
                        <SelectItem key={state as string} value={state as string}>
                          {state as string}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="popular">Most Popular</SelectItem>
                      <SelectItem value="newest">Newest First</SelectItem>
                      <SelectItem value="oldest">Oldest First</SelectItem>
                      <SelectItem value="price-low">Price: Low to High</SelectItem>
                      <SelectItem value="price-high">Price: High to Low</SelectItem>
                      <SelectItem value="name-az">Name: A to Z</SelectItem>
                      <SelectItem value="name-za">Name: Z to A</SelectItem>
                      <SelectItem value="brand-az">Brand: A to Z</SelectItem>
                      <SelectItem value="company-az">Company: A to Z</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchQuery("");
                      setTypeFilter("all");
                      setPriceFilter("all");
                      setConditionFilter("all");
                      setLocationFilter("all");
                      setStateFilter("all");
                      setBrandFilter("all");
                      setCompanyFilter("all");
                      setSortBy("popular");
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            )}

            {/* Result summary */}
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Showing {Math.min(displayCount, filteredRobots.length)} of {filteredRobots.length} robots
                {searchQuery && ` for "${searchQuery}"`}
              </span>
              <span>{refreshing ? "Updating..." : `Last updated: ${new Date().toLocaleTimeString()}`}</span>
            </div>
          </CardContent>
        </Card>

        {/* Robot Listings */}
        {filteredRobots.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              {robots.length === 0 ? (
                <>
                  <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No robots listed yet</h3>
                  <p className="text-muted-foreground mb-4">Be the first to list your robots on RobotVerse!</p>
                  <Button onClick={() => navigate("/dashboard")}>Start Selling</Button>
                </>
              ) : (
                <>
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
                      setBrandFilter("all");
                      setCompanyFilter("all");
                    }}
                  >
                    Clear Filters
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                : "space-y-4"
            }
          >
            {filteredRobots.slice(0, displayCount).map((robot) => (
              <Card
                key={robot.id}
                className={`group hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer ${
                  viewMode === "list" ? "flex" : ""
                }`}
                onClick={() => navigate(`/robots/${robot.id}`)}
              >
                {/* Robot Image */}
                 <div
                  className={`relative overflow-hidden rounded-lg ${
                    viewMode === "list" ? "w-48" : ""
                  }`}
                 >
                   {robot.images && robot.images.length > 0 ? (
                     <ResponsiveImage
                       src={robot.images[0]}
                       alt={robot.name}
                       aspectRatio="auto"
                       objectFit="cover"
                       hoverEffect={true}
                       containerClassName={`${
                         viewMode === "list" 
                           ? "h-32 min-h-32" 
                           : "h-48 min-h-48"
                       } w-full`}
                       className="transition-transform duration-300 w-full h-full"
                       style={{ 
                         imageRendering: "auto"
                       }}
                     />
                   ) : (
                     <div className={`w-full flex items-center justify-center bg-muted rounded-lg ${
                       viewMode === "list" ? "h-32" : "h-48"
                     }`}>
                       <Bot className="w-16 h-16 text-muted-foreground" />
                     </div>
                   )}
                  {/* Condition Badge */}
                  <div className="absolute top-2 left-2">
                    <Badge className={getConditionColor(robot.condition || "used")}>
                      {robot.condition?.replace("_", " ") || "Used"}
                    </Badge>
                  </div>
                  {/* Share Button */}
                  <div className="absolute top-2 right-2 flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 bg-white/80 hover:bg-white"
                      onClick={(e) => handleShare(robot, e)}
                    >
                      <Share2 className="w-4 h-4 text-gray-600" />
                    </Button>
                  </div>
                  {/* Training Badge */}
                  {robot.training_included && (
                    <div className="absolute bottom-2 left-2">
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                        Training
                      </Badge>
                    </div>
                  )}
                </div>

                <CardContent className={`p-4 ${viewMode === "list" ? "flex-1" : ""}`}>
                  <div className="space-y-3">
                    {/* Robot Details */}
                    <div>
                      <h3 className="font-bold text-lg mb-1 line-clamp-1 group-hover:text-primary transition-colors">
                        {robot.name}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <span className="font-medium">{robot.brand || "Unknown Brand"}</span>
                        {robot.model && (
                          <>
                            <span>•</span>
                            <span>{robot.model}</span>
                          </>
                        )}
                        {robot.year_manufactured && (
                          <>
                            <span>•</span>
                            <span>{robot.year_manufactured}</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="text-xs">
                          {robot.robot_type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">Qty: {robot.quantity}</span>
                      </div>
                    </div>

                    {/* Location & Price */}
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <MapPin className="w-3 h-3 mr-1" />
                        <span className="line-clamp-1">{robot.location || "Location not specified"}</span>
                      </div>
                      {robot.state && <div className="text-xs text-muted-foreground">State: {robot.state}</div>}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-lg font-bold text-primary">
                          {formatPrice(robot.price, robot.currency)}
                        </div>
                        {robot.payload_capacity && (
                          <span className="text-xs text-muted-foreground">{robot.payload_capacity}kg payload</span>
                        )}
                      </div>
                    </div>

                    {/* Categories Tags */}
                    {robot.category_tags && robot.category_tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {robot.category_tags.slice(0, 2).map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {robot.category_tags.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{robot.category_tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Seller info */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                      <div className="flex items-center">
                        <Building className="w-3 h-3 mr-1" />
                        <span className="line-clamp-1">
                          {robot.profiles?.company_name ||
                            robot.profiles?.full_name ||
                            "Verified Seller"}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <CheckCircle className="w-3 h-3 mr-1 text-green-500" />
                        <span>Verified</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/robots/${robot.id}`);
                        }}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Details
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="whitespace-nowrap px-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!user) {
                            toast({
                              variant: "destructive",
                              title: "Sign In Required",
                              description: "Please sign in to contact sellers",
                            });
                            return;
                          }
                          handleContactSeller(robot, e);
                        }}
                        disabled={!user || (!robot.profiles?.phone && !robot.profiles?.mobile_number)}
                      >
                        <MessageCircle className="w-3 h-3 mr-1" />
                        {user ? "Contact" : "Sign In to Contact"}
                      </Button>
                    </div>

                    {/* AI Analysis Button */}
                    <Button
                      variant={user ? "default" : "secondary"}
                      size="sm"
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAnalyzeRobot(robot);
                      }}
                      disabled={aiAnalysisLoading && aiAnalysisRobotId === robot.id}
                    >
                      {aiAnalysisLoading && aiAnalysisRobotId === robot.id ? (
                        <span className="flex items-center justify-center space-x-1">
                          <svg
                            className="animate-spin h-4 w-4 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                            ></path>
                          </svg>
                          <span>Analyzing...</span>
                        </span>
                      ) : (
                        <>
                          <Brain className="w-4 h-4 mr-1" />
                          {user ? "AI Analysis" : "Sign in for AI Analysis"}
                        </>
                      )}
                    </Button>

                    {/* Show AI Analysis result below card if available */}
                    {aiAnalysisResult && aiAnalysisRobotId === robot.id && (
                      <Card className="mt-3 p-4 bg-blue-50 rounded-md border border-blue-200">
                        <h4 className="font-semibold mb-2">AI Analysis Summary</h4>
                        <p>{aiAnalysisResult.analysis.summary}</p>
                        {aiAnalysisResult.analysis.suitability && (
                          <>
                            <h5 className="mt-3 font-medium">Suitability</h5>
                            <p>{aiAnalysisResult.analysis.suitability}</p>
                          </>
                        )}
                        {aiAnalysisResult.analysis.technicalInsights && (
                          <>
                            <h5 className="mt-3 font-medium">Technical Insights</h5>
                            <p>{aiAnalysisResult.analysis.technicalInsights}</p>
                          </>
                        )}
                        <small className="block mt-2 text-xs text-muted-foreground text-right">
                          Generated at{" "}
                          {new Date(aiAnalysisResult.analysis.timestamp).toLocaleString()}
                        </small>
                      </Card>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Load More */}
        {filteredRobots.length > displayCount && (
          <div className="text-center mt-8">
            <Button variant="outline" size="lg" onClick={() => setDisplayCount((c) => c + 8)}>
              Load More Robots
            </Button>
          </div>
        )}

        {/* View All */}
        {filteredRobots.length > 0 && (
          <div className="text-center mt-8">
            <Button
              size="lg"
              onClick={() => navigate("/robots")}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              View All {marketStats.totalListings} Robots
            </Button>
          </div>
        )}
      </div>
    </section>
      {/* AI Analysis Result Dialog */}
      <Dialog open={showAiDialog} onOpenChange={setShowAiDialog}>
        <DialogContent className="bg-white text-gray-900 max-w-3xl max-h-[80vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle>Robot AI Analysis</DialogTitle>
            <DialogClose asChild>
              <button className="absolute top-3 right-3 rounded p-1 hover:bg-gray-200">✕</button>
            </DialogClose>
          </DialogHeader>
          <DialogDescription className="mt-4 whitespace-pre-wrap text-gray-900">
            {aiDialogLoading && (
              <div className="flex items-center gap-2">
                <Loader2 className="animate-spin w-6 h-6" /> Loading AI analysis...
              </div>
            )}
            {!aiDialogLoading && aiDialogData ? (
              <>
                <section className="mb-4">
                  <h3 className="font-semibold text-lg mb-1">Summary</h3>
                  <p>{aiDialogData.analysis.summary}</p>
                </section>
                {aiDialogData.analysis.suitability && (
                  <section className="mb-4">
                    <h3 className="font-semibold text-lg mb-1">Suitability</h3>
                    <p>{aiDialogData.analysis.suitability}</p>
                  </section>
                )}
                {aiDialogData.analysis.technicalInsights && (
                  <section className="mb-4">
                    <h3 className="font-semibold text-lg mb-1">Technical Insights</h3>
                    <p>{aiDialogData.analysis.technicalInsights}</p>
                  </section>
                )}
                {aiDialogData.analysis.governmentSchemes && (
                  <section className="mb-4">
                    <h3 className="font-semibold text-lg mb-1">Government Schemes</h3>
                    <p>{aiDialogData.analysis.governmentSchemes}</p>
                  </section>
                )}
                {aiDialogData.analysis.suggestedIndustries && (
                  <section className="mb-4">
                    <h3 className="font-semibold text-lg mb-1">Suggested Industries</h3>
                    <p>{aiDialogData.analysis.suggestedIndustries}</p>
                  </section>
                )}
                <footer className="text-xs text-right text-muted border-t pt-2">
                  Generated: {new Date(aiDialogData.analysis.timestamp).toLocaleString()}
                </footer>
              </>
            ) : (!aiDialogLoading && !aiDialogData) ? (
              <p>No analysis data available.</p>
            ) : null}
          </DialogDescription>
        </DialogContent>
      </Dialog>
    </>
  );
};
export default RobotListings;
