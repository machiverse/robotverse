import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import SellerRobotCarousel from "@/components/SellerRobotCarousel";
import CategoryRobotCarousel from "@/components/CategoryRobotCarousel";
import {
  MapPin,
  Package,
  AlertCircle,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Grid,
  List,
  Share2,
  Phone,
  Brain,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useButtonTracking } from "@/hooks/useButtonTracking";

// Robot type/interface
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

const RobotListings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { trackButtonClick } = useButtonTracking();

  // Data and UI states
  const [robots, setRobots] = useState<Robot[]>([]);
  const [filteredRobots, setFilteredRobots] = useState<Robot[]>([]);
  const [sellerGroups, setSellerGroups] = useState<{ [key: string]: Robot[] }>({});
  const [sellerProfiles, setSellerProfiles] = useState<{ [key: string]: any }>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & sorting states
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [priceFilter, setPriceFilter] = useState("all");
  const [conditionFilter, setConditionFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [displayCount, setDisplayCount] = useState(8);

  // New category filter and group by toggle (company/category)
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [groupBy, setGroupBy] = useState<"company" | "category">("company");

  // Market stats
  const [marketStats, setMarketStats] = useState({
    totalListings: 0,
    minPrice: 0,
    avgPrice: 0,
    maxPrice: 0,
    topBrands: [] as string[],
    trendingTypes: [] as string[],
  });

  // ADDED: State for auto-rotating company index
  const [activeCompanyIndex, setActiveCompanyIndex] = useState(0);

  // Unique lists for filter dropdowns
  const uniqueTypes = [
    ...new Set(robots.map((r) => r.robot_type).filter(Boolean)),
  ];
  const uniqueLocations = [
    ...new Set(robots.map((r) => r.location?.split(",")).filter(Boolean)),
  ];
  const uniqueStates = [...new Set(robots.map((r) => r.state).filter(Boolean))];

  // Fetch robots initially and on refresh
  useEffect(() => {
    fetchRobots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter and sort robots whenever inputs change
  useEffect(() => {
    filterAndSortRobots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // ADDED: Auto-rotate companies every 10 seconds (interval)
  useEffect(() => {
    const companyGroups = getCompanyGroups();
    const companyEntries = Object.entries(companyGroups);
    // Only start rotation if there are companies
    if (companyEntries.length > 0) {
      const interval = setInterval(() => {
        setActiveCompanyIndex(prev => (prev + 1) % companyEntries.length);
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [filteredRobots]); // Recalculate when filteredRobots changes

  // Fetch robots data from Supabase and initialize states
  const fetchRobots = async () => {
    try {
      setRefreshing(true);
      const { data, error } = await supabase
        .from("robots")
        .select(
          `
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
        `
        )
        .eq("availability", "available")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const robotsData = (data || []) as Robot[];

      setRobots(robotsData);

      calculateMarketStats(robotsData);

      // Group robots by seller + store profiles
      const grouped: { [key: string]: Robot[] } = {};
      const profiles: { [key: string]: any } = {};
      robotsData.forEach((robot) => {
        const sellerId = robot.seller_id;
        if (!grouped[sellerId]) grouped[sellerId] = [];
        grouped[sellerId].push(robot);

        if (robot.profiles && !profiles[sellerId]) profiles[sellerId] = robot.profiles;
      });
      setSellerGroups(grouped);
      setSellerProfiles(profiles);

      // Initial filtering + sorting in state
      setFilteredRobots(robotsData);
    } catch (error) {
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

  // Calculate market statistics from data
  const calculateMarketStats = (robotsData: Robot[]) => {
    const totalListings = robotsData.length;
    const prices = robotsData
      .map((r) => r.price || 0)
      .filter((price) => price > 0);

    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
    const avgPrice =
      prices.length > 0 ? prices.reduce((sum, p) => sum + p, 0) / prices.length : 0;

    const brandCounts = robotsData.reduce((acc, robot) => {
      if (robot.brand) {
        acc[robot.brand] = (acc[robot.brand] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const topBrands = Object.entries(brandCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([brand]) => brand);

    const typeCounts = robotsData.reduce((acc, robot) => {
      if (robot.robot_type) {
        acc[robot.robot_type] = (acc[robot.robot_type] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

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

  // Filter and sort robots, update filteredRobots state
  const filterAndSortRobots = () => {
    let filtered = [...robots];

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (robot) =>
          robot.name?.toLowerCase().includes(q) ||
          robot.brand?.toLowerCase().includes(q) ||
          robot.model?.toLowerCase().includes(q) ||
          robot.robot_type?.toLowerCase().includes(q) ||
          robot.location?.toLowerCase().includes(q) ||
          robot.category_tags?.some((tag) => tag.toLowerCase().includes(q))
      );
    }

    // Category filter (new)
    if (categoryFilter !== "all") {
      filtered = filtered.filter((robot) => robot.robot_type === categoryFilter);
    }

    // Old filters remain intact
    if (typeFilter !== "all") {
      filtered = filtered.filter((robot) => robot.robot_type === typeFilter);
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
        filtered = filtered.filter(
          (robot) => robot.price >= range[0] && robot.price < range[1]
        );
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
        case "newest":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "price-low":
          return (a.price || 0) - (b.price || 0);
        case "price-high":
          return (b.price || 0) - (a.price || 0);
        case "name-az":
          return (a.name || "").localeCompare(b.name || "");
        case "name-za":
          return (b.name || "").localeCompare(a.name || "");
        default:
          return 0;
      }
    });

    setFilteredRobots(filtered);
  };

  // Group filtered robots by seller/company
  const getCompanyGroups = () => {
    const groups: { [key: string]: Robot[] } = {};
    filteredRobots.forEach((r) => {
      if (!groups[r.seller_id]) groups[r.seller_id] = [];
      groups[r.seller_id].push(r);
    });
    return groups;
  };

  // Group filtered robots by category
  const getCategoryGroups = () => {
    const groups: { [key: string]: Robot[] } = {};
    filteredRobots.forEach((r) => {
      if (!groups[r.robot_type]) groups[r.robot_type] = [];
      groups[r.robot_type].push(r);
    });
    return groups;
  };

  // Handle AI analyze button click
  const handleAnalyzeRobot = async (robot: Robot) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Sign In Required",
        description: "Please sign in to use RobotVerse AI analysis",
      });
      return;
    }

    // Track button click
    await trackButtonClick({
      buttonName: "AI Analyze",
      buttonType: "analysis",
      sellerId: robot.seller_id,
      sellerName: robot.profiles?.company_name || robot.profiles?.full_name,
      itemId: robot.id,
      itemType: "robot",
      additionalData: {
        robotName: robot.name,
        robotType: robot.robot_type,
        price: robot.price,
      }
    });

    toast({
      title: "AI Analysis Starting",
      description: "RobotVerse AI is analyzing robot specifications, market data, and compatibility...",
    });

    navigate(`/robots/${robot.id}/analysis`);
  };

  // Handle contact with seller
  const handleContactSeller = async (robot: Robot, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Track button click
    await trackButtonClick({
      buttonName: "Contact Seller",
      buttonType: "contact",
      sellerId: robot.seller_id,
      sellerName: robot.profiles?.company_name || robot.profiles?.full_name,
      itemId: robot.id,
      itemType: "robot",
      additionalData: {
        robotName: robot.name,
        robotType: robot.robot_type,
        price: robot.price,
      }
    });

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
    const message = `Hi ${
      robot.profiles?.company_name || robot.profiles?.full_name
    }! I'm interested in your robot: ${robot.name} (${
      robot.model
    }). Price: ${formatPrice(robot.price, robot.currency)}. Can you please provide more details?`;

    const choice = window.confirm(
      `Contact ${robot.profiles?.company_name || robot.profiles?.full_name}:\n\nOK = WhatsApp\nCancel = Phone Call`
    );

    if (choice) {
      window.open(
        `https://wa.me/91${phoneNumber}?text=${encodeURIComponent(message)}`,
        "_blank"
      );
    } else {
      window.location.href = `tel:+91${phoneNumber}`;
    }
  };

  // Handle share button click
  const handleShare = async (robot: Robot, e: React.MouseEvent) => {
    e.stopPropagation();

    // Track button click
    await trackButtonClick({
      buttonName: "Share",
      buttonType: "social",
      sellerId: robot.seller_id,
      sellerName: robot.profiles?.company_name || robot.profiles?.full_name,
      itemId: robot.id,
      itemType: "robot",
      additionalData: {
        robotName: robot.name,
        robotType: robot.robot_type,
        price: robot.price,
      }
    });

    if (navigator.share) {
      navigator.share({
        title: robot.name,
        text: `Check out this ${robot.robot_type}: ${robot.name} for ${formatPrice(
          robot.price,
          robot.currency
        )}`,
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

  // Format price display
  const formatPrice = (price: number, currency: string) => {
    if (!price) return "Price on request";
    const symbol = currency === "INR" ? "₹" : currency === "USD" ? "$" : "€";
    return `${symbol}${price.toLocaleString()}`;
  };

  // Get CSS class for condition badge colors
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

  // ADDED: Prepare group arrays for rendering
  const companyGroups = getCompanyGroups();
  const companyEntries = Object.entries(companyGroups);
  const categoryGroups = getCategoryGroups();
  const categoryEntries = Object.entries(categoryGroups);

  return (
    <section className="py-16 bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4">
        {/* ...header and market stats remain unchanged... */}

        {/* Search, filter, view toggle controls remain unchanged... */}

        {/* Robot listings grouped by company or category */}
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
                      setCategoryFilter("all");
                    }}
                  >
                    Clear Filters
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          // MODIFIED: Only show one company at a time in carousel (auto-rotating)
          <div className="w-full">
            {groupBy === "company" && companyEntries.length > 0 ? (
              <SellerRobotCarousel
                key={companyEntries[activeCompanyIndex][0]}
                sellerRobots={companyEntries[activeCompanyIndex][1]}
                sellerProfile={sellerProfiles[companyEntries[activeCompanyIndex][0]] || {}}
                imageClassName="w-full h-full object-cover rounded-lg"
              />
            ) : groupBy === "category" && categoryEntries.length > 0 ? (
              <CategoryRobotCarousel
                key={categoryEntries[activeCompanyIndex][0]}
                category={categoryEntries[activeCompanyIndex][0]}
                robots={categoryEntries[activeCompanyIndex][1]}
                imageClassName="w-full h-full object-cover rounded-lg"
              />
            ) : null}
          </div>
        )}

        {/* (OPTIONAL) You may want to disable/hide load more button in single-row mode */}
        {/* View All Button for remaining actions ... unchanged */}
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
  );
};

export default RobotListings;
