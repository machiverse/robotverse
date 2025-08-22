import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Bot, Grid, List } from "lucide-react";
import EnhancedHeader from "@/components/EnhancedHeader";
import SellerRobotCarousel from "@/components/SellerRobotCarousel";
import CategoryRobotCarousel from "@/components/CategoryRobotCarousel";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const Robots = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  // States for filtering & UI
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [selectedCondition, setSelectedCondition] = useState("all");
  const [selectedPriceRange, setSelectedPriceRange] = useState("all");
  const [selectedRobotType, setSelectedRobotType] = useState("all");
  const [groupBy, setGroupBy] = useState<"company" | "category">("category");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Data states
  const [robots, setRobots] = useState<any[]>([]);
  const [sellerGroups, setSellerGroups] = useState<{ [key: string]: any[] }>({});
  const [sellerProfiles, setSellerProfiles] = useState<{ [key: string]: any }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dropdown options dynamically extracted from robots data
  const [categories, setCategories] = useState([{ value: "all", label: "All Categories" }]);
  const [locations, setLocations] = useState([{ value: "all", label: "All Locations" }]);
  const [conditions, setConditions] = useState([{ value: "all", label: "All Conditions" }]);
  const [priceRanges] = useState([
    { value: "all", label: "All Prices" },
    { value: "under-50k", label: "Under ₹50,000" },
    { value: "50k-200k", label: "₹50,000 - ₹2,00,000" },
    { value: "200k-500k", label: "₹2,00,000 - ₹5,00,000" },
    { value: "500k-1m", label: "₹5,00,000 - ₹10,00,000" },
    { value: "over-1m", label: "Over ₹10,00,000" }
  ]);
  const [robotTypes, setRobotTypes] = useState([{ value: "all", label: "All Types" }]);

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

        // Group robots by seller
        const grouped: { [id: string]: any[] } = {};
        const profiles: { [id: string]: any } = {};
        data?.forEach((robot) => {
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

        data?.forEach((robot) => {
          if (robot.robot_type) uniqueRobotTypes.add(robot.robot_type);
          if (robot.robot_type) uniqueCategories.add(robot.robot_type);
          if (robot.category_tags) robot.category_tags.forEach((tag: string) => tag && uniqueCategories.add(tag.trim()));
          if (robot.location) uniqueLocations.add(robot.location.trim());
          if (robot.condition) uniqueConditions.add(robot.condition.trim());
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
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load robots");
        setRobots([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter and group robots according to selected filters
  const getFilteredGroups = () => {
    let filteredRobots = [...robots];

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

    // Group by company or category
    const groups: { [key: string]: any[] } = {};
    if (groupBy === "company") {
      filteredRobots.forEach((r) => {
        if (!groups[r.seller_id]) groups[r.seller_id] = [];
        groups[r.seller_id].push(r);
      });
    } else {
      // groupBy category
      filteredRobots.forEach((r) => {
        const cat = r.robot_type || "Others";
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(r);
      });
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
          Explore category-wise or company-wise robot listings with rich filter options.
        </p>

        {/* Filters Section */}
        <Card className="mb-8 p-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
            {/* Search */}
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search by name, model, type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Category */}
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

            {/* Location */}
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

            {/* Condition */}
            <Select value={selectedCondition} onValueChange={setSelectedCondition}>
              <SelectTrigger>
                <SelectValue placeholder="Condition" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Conditions</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="like-new">Like New</SelectItem>
                <SelectItem value="used">Used</SelectItem>
                <SelectItem value="refurbished">Refurbished</SelectItem>
              </SelectContent>
            </Select>

            {/* Price Range */}
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

          {/* Robot Type filter and Grouping toggle */}
          <div className="mt-4 flex items-center justify-between">
            <Select value={selectedRobotType} onValueChange={setSelectedRobotType} className="w-48">
              <SelectTrigger>
                <SelectValue placeholder="Robot Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {robots
                  .map((r) => r.robot_type)
                  .filter((v, i, a) => v && a.indexOf(v) === i)
                  .map((type) => (
                    <SelectItem key={type} value={type.toLowerCase().replace(/\s+/g, "-")}>
                      {type}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            <div className="flex space-x-2">
              <Button
                variant={groupBy === "category" ? "default" : "outline"}
                onClick={() => setGroupBy("category")}
                size="sm"
              >
                Category View
              </Button>
              <Button
                variant={groupBy === "company" ? "default" : "outline"}
                onClick={() => setGroupBy("company")}
                size="sm"
              >
                Company View
              </Button>

              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                onClick={() => setViewMode("grid")}
                size="sm"
              >
                <Grid className="w-5 h-5" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                onClick={() => setViewMode("list")}
                size="sm"
              >
                <List className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </Card>

        {/* Total Summary */}
        <div className="mb-6 text-sm text-muted-foreground">
          Showing {totalFilteredRobots} robot{totalFilteredRobots !== 1 && "s"} grouped by {groupBy}
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
          <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-6"}>
            {Object.entries(filteredGroups).map(([key, robotsGroup]) => {
              return groupBy === "company" ? (
                <SellerRobotCarousel
                  key={key}
                  sellerRobots={robotsGroup}
                  sellerProfile={sellerProfiles[key]}
                  viewMode={viewMode}
                />
              ) : (
                <CategoryRobotCarousel
                  key={key}
                  category={key}
                  robots={robotsGroup}
                  viewMode={viewMode}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Robots;
