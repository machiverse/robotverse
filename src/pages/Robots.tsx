import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useGlobalViewTracking } from "@/hooks/useGlobalViewTracking";
import { useButtonTracking } from "@/hooks/useButtonTracking";
import { Loader2, Bot, Grid, List, Search, TrendingUp, Eye } from "lucide-react";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import EnhancedHeader from "@/components/EnhancedHeader";
import SellerRobotCarousel from "@/components/SellerRobotCarousel";
import CategoryRobotCarousel from "@/components/CategoryRobotCarousel";
import ViewCountDisplay from "@/components/ViewCountDisplay";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const Robots = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { getRobotViewCount } = useGlobalViewTracking();
  const { trackButtonClick } = useButtonTracking();

  // States for filtering & UI
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [selectedCondition, setSelectedCondition] = useState("all");
  const [selectedPriceRange, setSelectedPriceRange] = useState("all");
  const [selectedRobotType, setSelectedRobotType] = useState("all");
  const [selectedCompany, setSelectedCompany] = useState("all");
  const [sortBy, setSortBy] = useState("views"); // Default sort by view count
  const [groupBy, setGroupBy] = useState<"company" | "category" | "all">("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Data states
  const [robots, setRobots] = useState<any[]>([]);
  const [robotsWithViews, setRobotsWithViews] = useState<any[]>([]);
  const [sellerGroups, setSellerGroups] = useState<{ [key: string]: any[] }>({});
  const [sellerProfiles, setSellerProfiles] = useState<{ [key: string]: any }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dropdown options dynamically extracted from robots data
  const [categories, setCategories] = useState([{ value: "all", label: "All Categories" }]);
  const [locations, setLocations] = useState([{ value: "all", label: "All Locations" }]);
  const [conditions, setConditions] = useState([{ value: "all", label: "All Conditions" }]);
  const [companies, setCompanies] = useState([{ value: "all", label: "All Companies" }]);
  const [priceRanges] = useState([
    { value: "all", label: "All Prices" },
    { value: "under-50k", label: "Under ₹50,000" },
    { value: "50k-200k", label: "₹50,000 - ₹2,00,000" },
    { value: "200k-500k", label: "₹2,00,000 - ₹5,00,000" },
    { value: "500k-1m", label: "₹5,00,000 - ₹10,00,000" },
    { value: "over-1m", label: "Over ₹10,00,000" }
  ]);
  const [robotTypes, setRobotTypes] = useState([{ value: "all", label: "All Types" }]);

  // Check URL params and set filters accordingly
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const categoryParam = urlParams.get('category');
    const groupByParam = urlParams.get('groupBy');
    
    if (categoryParam) {
      setSelectedCategory(categoryParam.toLowerCase().replace(/\s+/g, "-"));
    }
    if (groupByParam) {
      setGroupBy(groupByParam as "company" | "category" | "all");
    }
  }, []);

  // Fetch robots + filters on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const { data, error } = await supabase
          .from("robots")
          .select(
            `
            *,
            profiles!robots_seller_id_fkey (
              user_id,
              full_name,
              company_name,
              phone,
              mobile_number,
              email
            )
          `
          )
          .eq("availability", "available")
          .order("created_at", { ascending: false });

        if (error) throw error;

        setRobots(data || []);

        // Fetch view counts for each robot and add to data
        const robotsWithViewCounts = await Promise.all(
          (data || []).map(async (robot) => {
            const viewCount = await getRobotViewCount(robot.id);
            return { ...robot, viewCount };
          })
        );
        setRobotsWithViews(robotsWithViewCounts);

        // Group robots by seller
        const grouped: { [id: string]: any[] } = {};
        const profiles: { [id: string]: any } = {};
        robotsWithViewCounts.forEach((robot) => {
          if (!grouped[robot.seller_id]) grouped[robot.seller_id] = [];
          grouped[robot.seller_id].push(robot);
          if (robot.profiles && !profiles[robot.seller_id]) profiles[robot.seller_id] = robot.profiles;
        });
        setSellerGroups(grouped);
        setSellerProfiles(profiles);

        // Extract unique filter options dynamically
        const uniqueCategories = new Set<string>();
        const uniqueLocations = new Set<string>();
        const uniqueConditions = new Set<string>();
        const uniqueRobotTypes = new Set<string>();
        const uniqueCompanies = new Set<string>();

        data?.forEach((robot) => {
          if (robot.robot_type) uniqueRobotTypes.add(robot.robot_type);
          if (robot.robot_type) uniqueCategories.add(robot.robot_type);
          if (robot.category_tags) robot.category_tags.forEach((tag: string) => tag && uniqueCategories.add(tag.trim()));
          if (robot.location) uniqueLocations.add(robot.location.trim());
          if (robot.condition) uniqueConditions.add(robot.condition.trim());
          if (robot.profiles?.company_name) uniqueCompanies.add(robot.profiles.company_name.trim());
        });

        setCategories([
          { value: "all", label: "All Categories" },
          ...Array.from(uniqueCategories)
            .sort()
            .map((cat) => ({
              value: cat.toLowerCase().replace(/\s+/g, "-"),
              label: cat,
            })),
        ]);

        setLocations([
          { value: "all", label: "All Locations" },
          ...Array.from(uniqueLocations)
            .sort()
            .map((loc) => ({
              value: loc.toLowerCase().replace(/\s+/g, "-"),
              label: loc,
            })),
        ]);

        setConditions([
          { value: "all", label: "All Conditions" },
          ...Array.from(uniqueConditions)
            .sort()
            .map((cond) => ({
              value: cond.toLowerCase().replace(/\s+/g, "-"),
              label: cond,
            })),
        ]);

        setRobotTypes([
          { value: "all", label: "All Types" },
          ...Array.from(uniqueRobotTypes)
            .sort()
            .map((type) => ({
              value: type.toLowerCase().replace(/\s+/g, "-"),
              label: type,
            })),
        ]);

        setCompanies([
          { value: "all", label: "All Companies" },
          ...Array.from(uniqueCompanies)
            .sort()
            .map((company) => ({
              value: company.toLowerCase().replace(/\s+/g, "-"),
              label: company,
            })),
        ]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load robots");
        setRobots([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [getRobotViewCount]);

  // Filter and group robots according to selected filters
  const getFilteredGroups = () => {
    let filteredRobots = [...robotsWithViews];

    // Helper to get label from value
    const getLabelFromValue = (arr: { value: string; label: string }[], val: string) => arr.find((i) => i.value === val)?.label || "";

    // Apply Text Search (name, model, robot_type, category_tags)
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filteredRobots = filteredRobots.filter(
        (r) =>
          r.name?.toLowerCase().includes(q) ||
          r.model?.toLowerCase().includes(q) ||
          r.robot_type?.toLowerCase().includes(q) ||
          r.category_tags?.some((tag: string) => tag.toLowerCase().includes(q))
      );
    }

    // Filter by category (robot_type or category_tags)
    if (selectedCategory !== "all") {
      const catLabel = getLabelFromValue(categories, selectedCategory).toLowerCase();
      filteredRobots = filteredRobots.filter(
        (r) =>
          r.robot_type?.toLowerCase() === catLabel ||
          r.category_tags?.some((tag: string) => tag.toLowerCase() === catLabel)
      );
    }

    // Filter by location
    if (selectedLocation !== "all") {
      const locLabel = getLabelFromValue(locations, selectedLocation).toLowerCase();
      filteredRobots = filteredRobots.filter(
        (r) => r.location?.toLowerCase() === locLabel
      );
    }

    // Filter by condition
    if (selectedCondition !== "all") {
      const condLabel = getLabelFromValue(conditions, selectedCondition).toLowerCase();
      filteredRobots = filteredRobots.filter(
        (r) => r.condition?.toLowerCase() === condLabel
      );
    }

    // Filter by robot type (separate from category if needed)
    if (selectedRobotType !== "all") {
      const typeLabel = getLabelFromValue(robotTypes, selectedRobotType).toLowerCase();
      filteredRobots = filteredRobots.filter(
        (r) => r.robot_type?.toLowerCase() === typeLabel
      );
    }

    // Filter by price range
    if (selectedPriceRange !== "all") {
      const ranges: Record<string, [number, number]> = {
        "under-50k": [0, 50000],
        "50k-200k": [50000, 200000],
        "200k-500k": [200000, 500000],
        "500k-1m": [500000, 1000000],
        "over-1m": [1000000, Infinity],
      };
      const [min, max] = ranges[selectedPriceRange] || [0, Infinity];
      filteredRobots = filteredRobots.filter((r) => r.price >= min && r.price < max);
    }

    // Filter by company
    if (selectedCompany !== "all") {
      const companyLabel = getLabelFromValue(companies, selectedCompany).toLowerCase();
      filteredRobots = filteredRobots.filter(
        (r) => r.profiles?.company_name?.toLowerCase() === companyLabel
      );
    }

    // Sort robots based on selected criteria
    filteredRobots.sort((a, b) => {
      switch (sortBy) {
        case "views":
          return (b.viewCount || 0) - (a.viewCount || 0); // Highest views first
        case "price-low":
          return (a.price || 0) - (b.price || 0);
        case "price-high":
          return (b.price || 0) - (a.price || 0);
        case "newest":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "name":
          return (a.name || "").localeCompare(b.name || "");
        default:
          return (b.viewCount || 0) - (a.viewCount || 0);
      }
    });

    // Group by company, category, or show all
    const groups: { [key: string]: any[] } = {};
    if (groupBy === "company") {
      filteredRobots.forEach((r) => {
        if (!groups[r.seller_id]) groups[r.seller_id] = [];
        groups[r.seller_id].push(r);
      });
    } else if (groupBy === "category") {
      filteredRobots.forEach((r) => {
        const cat = r.robot_type || "Others";
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(r);
      });
    } else {
      // groupBy all - show all robots as one group
      groups["All Robots"] = filteredRobots;
    }

    return groups;
  };

  // Format price with symbol helper
  const formatPrice = (price: number, currency: string) => {
    if (!price) return "Price on request";
    const symbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : "₹";
    return `${symbol}${price.toLocaleString()}`;
  };

  // Compute filtered groups on every render
  const filteredGroups = getFilteredGroups();

  // Count all filtered robots
  const totalFilteredRobots = Object.values(filteredGroups).reduce((acc, arr) => acc + arr.length, 0);

  // Loading and error UI
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <EnhancedHeader />
        <main className="flex-grow flex items-center justify-center">
          <Loader2 className="animate-spin w-10 h-10" />
          <p className="ml-4 text-muted-foreground text-lg">Loading robots...</p>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <EnhancedHeader />
        <main className="flex-grow flex flex-col justify-center items-center text-center px-4">
          <Bot className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Failed to load robots</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <EnhancedHeader />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-4">Industrial Robots</h1>
        <p className="text-lg text-muted-foreground mb-8">
          Discover the perfect robot for your needs with our advanced search and filtering capabilities.
        </p>

        {/* Filters Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Find Your Perfect Robot
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search and Quick Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search robots..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.value} value={loc.value}>
                      {loc.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedPriceRange} onValueChange={setSelectedPriceRange}>
                <SelectTrigger>
                  <SelectValue placeholder="Price Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Prices</SelectItem>
                  <SelectItem value="under-50k">Under ₹50,000</SelectItem>
                  <SelectItem value="50k-200k">₹50,000 - ₹2,00,000</SelectItem>
                  <SelectItem value="200k-500k">₹2,00,000 - ₹5,00,000</SelectItem>
                  <SelectItem value="500k-1m">₹5,00,000 - ₹10,00,000</SelectItem>
                  <SelectItem value="over-1m">Over ₹10,00,000</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Secondary Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select value={selectedCondition} onValueChange={setSelectedCondition}>
                <SelectTrigger>
                  <SelectValue placeholder="Condition" />
                </SelectTrigger>
                <SelectContent>
                  {conditions.map((cond) => (
                    <SelectItem key={cond.value} value={cond.value}>
                      {cond.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedRobotType} onValueChange={setSelectedRobotType}>
                <SelectTrigger>
                  <SelectValue placeholder="Robot Type" />
                </SelectTrigger>
                <SelectContent>
                  {robotTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger>
                  <SelectValue placeholder="Company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.value} value={company.value}>
                      {company.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sort and View Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Sort by:</span>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="views">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Most Popular
                      </div>
                    </SelectItem>
                    <SelectItem value="newest">Latest</SelectItem>
                    <SelectItem value="price-low">Price: Low to High</SelectItem>
                    <SelectItem value="price-high">Price: High to Low</SelectItem>
                    <SelectItem value="name">Name A-Z</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Group by:</span>
                <div className="flex gap-1">
                  <Button
                    variant={groupBy === "all" ? "default" : "outline"}
                    onClick={() => setGroupBy("all")}
                    size="sm"
                  >
                    All
                  </Button>
                  <Button
                    variant={groupBy === "category" ? "default" : "outline"}
                    onClick={() => setGroupBy("category")}
                    size="sm"
                  >
                    Category
                  </Button>
                  <Button
                    variant={groupBy === "company" ? "default" : "outline"}
                    onClick={() => setGroupBy("company")}
                    size="sm"
                  >
                    Company
                  </Button>
                </div>

                <div className="flex gap-1 ml-4">
                  <Button
                    variant={viewMode === "grid" ? "default" : "outline"}
                    onClick={() => setViewMode("grid")}
                    size="sm"
                  >
                    <Grid className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "outline"}
                    onClick={() => setViewMode("list")}
                    size="sm"
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Summary */}
        <div className="mb-6 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {totalFilteredRobots} robot{totalFilteredRobots !== 1 && "s"} 
            {sortBy === "views" && (
              <Badge variant="secondary" className="ml-2">
                <Eye className="w-3 h-3 mr-1" />
                Sorted by popularity
              </Badge>
            )}
          </div>
          {totalFilteredRobots > 0 && (
            <div className="text-sm text-muted-foreground">
              {groupBy === "all" ? "All robots" : `Grouped by ${groupBy}`}
            </div>
          )}
        </div>

        {/* Loading, error, empty states */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" />
            <p>Loading robots...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Bot className="w-16 h-16 text-muted-foreground mb-4" />
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        ) : totalFilteredRobots === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Bot className="w-16 h-16 text-muted-foreground mb-4" />
            <p>No robots match the current filters.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(filteredGroups).map(([key, robotsGroup]) => (
              <div key={key} className="space-y-4">
                {/* Group Header - only show if not "All Robots" */}
                {key !== "All Robots" && (
                  <div className="flex items-center justify-between border-b pb-4">
                    <div>
                      <h3 className="text-xl font-semibold">
                        {groupBy === "company" 
                          ? (sellerProfiles[key]?.company_name || sellerProfiles[key]?.full_name || "Company")
                          : key
                        }
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {robotsGroup.length} robot{robotsGroup.length !== 1 ? 's' : ''} available
                      </p>
                    </div>
                    <Badge variant="outline" className="text-sm">
                      {robotsGroup.reduce((total, robot) => total + (robot.viewCount || 0), 0)} total views
                    </Badge>
                  </div>
                )}

                {/* Robot Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {robotsGroup.map((robot) => (
                     <Card key={robot.id} className="overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group" onClick={async () => {
                       await trackButtonClick({
                         buttonName: "View Robot from List",
                         buttonType: "navigation",
                         sellerId: robot.seller_id,
                         sellerName: robot.profiles?.company_name || robot.profiles?.full_name,
                         itemId: robot.id,
                         itemType: "robot",
                         additionalData: {
                           robotName: robot.name,
                           robotModel: robot.model,
                           robotType: robot.robot_type,
                           robotPrice: robot.price,
                           viewSource: "robots_listing",
                           currentFilters: {
                             searchQuery,
                             selectedCategory,
                             selectedLocation,
                             selectedCondition,
                             selectedPriceRange,
                             selectedRobotType,
                             sortBy,
                             groupBy,
                             viewMode
                           },
                           groupName: key || "all"
                         }
                       });
                       navigate(`/robots/${robot.id}`);
                     }}>
                        <div className="relative overflow-hidden rounded-lg">
                          <ResponsiveImage
                            src={robot.images?.[0] || "/placeholder.svg"}
                            alt={robot.name}
                            aspectRatio="auto"
                            objectFit="contain"
                            hoverEffect={true}
                            containerClassName="h-80 min-h-80 w-full bg-muted/10"
                            className="transition-transform duration-300 w-full h-full"
                            style={{ 
                              imageRendering: "auto"
                            }}
                          />
                        <div className="absolute top-2 right-2">
                          <ViewCountDisplay targetType="robots" targetId={robot.id} />
                        </div>
                        {robot.condition && (
                          <div className="absolute top-2 left-2">
                            <Badge variant={robot.condition === 'new' ? 'default' : 'secondary'} className="text-xs">
                              {robot.condition}
                            </Badge>
                          </div>
                        )}
                      </div>
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div>
                            <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors">{robot.name}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-1">{robot.model}</p>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className="text-xs">{robot.robot_type}</Badge>
                            <span className="text-xs text-muted-foreground">{robot.location}</span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xl text-primary">
                              {formatPrice(robot.price, robot.currency)}
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              {robot.availability}
                            </Badge>
                          </div>
                          
                          <div className="text-xs text-muted-foreground border-t pt-2">
                            <span className="font-medium">
                              by {robot.profiles?.company_name || robot.profiles?.full_name}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Robots;