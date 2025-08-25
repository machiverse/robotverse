import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useViewTracking } from "@/hooks/useViewTracking";
import { Loader2, Bot, Search, TrendingUp, Eye, Building, User } from "lucide-react";
import SellerRobotCarousel from "@/components/SellerRobotCarousel";
import CategoryRobotCarousel from "@/components/CategoryRobotCarousel";
import ViewCountDisplay from "@/components/ViewCountDisplay";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const RobotCarouselListings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { getItemViewCount } = useViewTracking();

  // Data states
  const [robots, setRobots] = useState<any[]>([]);
  const [robotsWithViews, setRobotsWithViews] = useState<any[]>([]);
  const [categoryGroups, setCategoryGroups] = useState<{ [key: string]: any[] }>({});
  const [companyGroups, setCompanyGroups] = useState<{ [key: string]: any[] }>({});
  const [sellerProfiles, setSellerProfiles] = useState<{ [key: string]: any }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [sortBy, setSortBy] = useState("views");
  const [showCarousels, setShowCarousels] = useState(true);

  // Dropdown options
  const [categories, setCategories] = useState([{ value: "all", label: "All Categories" }]);
  const [locations, setLocations] = useState([{ value: "all", label: "All Locations" }]);

  // Featured robots for top grid (first 8 most popular)
  const [featuredRobots, setFeaturedRobots] = useState<any[]>([]);

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

        // Fetch view counts for each robot
        const robotsWithViewCounts = await Promise.all(
          (data || []).map(async (robot) => {
            const viewCount = await getItemViewCount('robots', robot.id);
            return { ...robot, viewCount };
          })
        );
        setRobotsWithViews(robotsWithViewCounts);

        // Sort by view count for featured robots (top 8)
        const sortedByViews = [...robotsWithViewCounts].sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
        setFeaturedRobots(sortedByViews.slice(0, 8));

        // Group robots by category
        const catGroups: { [key: string]: any[] } = {};
        robotsWithViewCounts.forEach((robot) => {
          const category = robot.robot_type || "Others";
          if (!catGroups[category]) catGroups[category] = [];
          catGroups[category].push(robot);
        });
        setCategoryGroups(catGroups);

        // Group robots by company
        const comGroups: { [key: string]: any[] } = {};
        const profiles: { [key: string]: any } = {};
        robotsWithViewCounts.forEach((robot) => {
          if (!comGroups[robot.seller_id]) comGroups[robot.seller_id] = [];
          comGroups[robot.seller_id].push(robot);
          if (robot.profiles && !profiles[robot.seller_id]) profiles[robot.seller_id] = robot.profiles;
        });
        setCompanyGroups(comGroups);
        setSellerProfiles(profiles);

        // Extract unique filter options
        const uniqueCategories = new Set<string>();
        const uniqueLocations = new Set<string>();

        data?.forEach((robot) => {
          if (robot.robot_type) uniqueCategories.add(robot.robot_type);
          if (robot.location) uniqueLocations.add(robot.location.trim());
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
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load robots");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [getItemViewCount]);

  // Apply filters
  const getFilteredRobots = () => {
    let filtered = [...robotsWithViews];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.name?.toLowerCase().includes(q) ||
          r.model?.toLowerCase().includes(q) ||
          r.robot_type?.toLowerCase().includes(q)
      );
    }

    if (selectedCategory !== "all") {
      const catLabel = categories.find(c => c.value === selectedCategory)?.label || "";
      filtered = filtered.filter(r => r.robot_type?.toLowerCase() === catLabel.toLowerCase());
    }

    if (selectedLocation !== "all") {
      const locLabel = locations.find(l => l.value === selectedLocation)?.label || "";
      filtered = filtered.filter(r => r.location?.toLowerCase().includes(locLabel.toLowerCase()));
    }

    // Sort filtered results
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "views":
          return (b.viewCount || 0) - (a.viewCount || 0);
        case "newest":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "price-low":
          return (a.price || 0) - (b.price || 0);
        case "price-high":
          return (b.price || 0) - (a.price || 0);
        case "name":
          return (a.name || "").localeCompare(b.name || "");
        default:
          return (b.viewCount || 0) - (a.viewCount || 0);
      }
    });

    return filtered;
  };

  const formatPrice = (price: number, currency: string) => {
    if (!price) return "Price on request";
    const symbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : "₹";
    return `${symbol}${price.toLocaleString()}`;
  };

  const filteredRobots = getFilteredRobots();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin w-10 h-10" />
        <p className="ml-4 text-muted-foreground text-lg">Loading robots...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center text-center px-4">
        <Bot className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Failed to load robots</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Featured Robots Grid - First Row */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Most Popular Robots</h2>
            <p className="text-muted-foreground">Top viewed robots on our platform</p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => navigate('/robots')}
            className="text-sm"
          >
            View All Robots
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredRobots.map((robot) => (
            <Card key={robot.id} className="overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group" onClick={() => navigate(`/robots/${robot.id}`)}>
              <div className="aspect-video relative overflow-hidden">
                <img
                  src={robot.images?.[0] || "/placeholder.svg"}
                  alt={robot.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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
                <div className="space-y-2">
                  <h3 className="font-semibold line-clamp-1 group-hover:text-primary transition-colors">{robot.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-1">{robot.model}</p>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">{robot.robot_type}</Badge>
                    <span className="text-xs text-muted-foreground">{robot.location}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-lg text-primary">
                      {formatPrice(robot.price, robot.currency)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      by {robot.profiles?.company_name || robot.profiles?.full_name}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Search and Filter Section */}
      <section>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Find Robots by Category & Company
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
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

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                {filteredRobots.length} robot{filteredRobots.length !== 1 && "s"} found
                {sortBy === "views" && (
                  <Badge variant="secondary" className="ml-2">
                    <Eye className="w-3 h-3 mr-1" />
                    Sorted by popularity
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">View:</span>
                <Button
                  variant={showCarousels ? "default" : "outline"}
                  onClick={() => setShowCarousels(true)}
                  size="sm"
                >
                  Carousels
                </Button>
                <Button
                  variant={!showCarousels ? "default" : "outline"}
                  onClick={() => setShowCarousels(false)}
                  size="sm"
                >
                  Grid
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Category Carousels */}
      {showCarousels && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Browse by Category</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(categoryGroups)
              .filter(([_, robots]) => robots.length > 0)
              .sort(([, a], [, b]) => b.length - a.length) // Sort by robot count
              .map(([category, robots]) => (
                <CategoryRobotCarousel
                  key={category}
                  category={category}
                  robots={robots}
                  imageClassName="w-full h-full object-cover rounded-lg"
                />
              ))}
          </div>
        </section>
      )}

      {/* Company Carousels */}
      {showCarousels && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Browse by Company</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(companyGroups)
              .filter(([_, robots]) => robots.length > 0)
              .sort(([, a], [, b]) => b.length - a.length) // Sort by robot count
              .slice(0, 12) // Show top 12 companies
              .map(([sellerId, robots]) => (
                <Card key={sellerId} className="overflow-hidden">
                  <CardHeader className="bg-muted/50">
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {sellerProfiles[sellerId]?.company_name ? (
                          <Building className="w-4 h-4" />
                        ) : (
                          <User className="w-4 h-4" />
                        )}
                        <div>
                          <h3 className="text-lg font-semibold">
                            {sellerProfiles[sellerId]?.company_name || sellerProfiles[sellerId]?.full_name || "Company"}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {robots.length} robot{robots.length !== 1 ? 's' : ''} available
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">
                        {robots.reduce((total, robot) => total + (robot.viewCount || 0), 0)} views
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <SellerRobotCarousel
                      sellerRobots={robots}
                      sellerProfile={sellerProfiles[sellerId]}
                      imageClassName="w-full h-full object-cover rounded-lg"
                    />
                  </CardContent>
                </Card>
              ))}
          </div>
        </section>
      )}

      {/* Filtered Results Grid */}
      {!showCarousels && (
        <section>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredRobots.map((robot) => (
              <Card key={robot.id} className="overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group" onClick={() => navigate(`/robots/${robot.id}`)}>
                <div className="aspect-video relative overflow-hidden">
                  <img
                    src={robot.images?.[0] || "/placeholder.svg"}
                    alt={robot.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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
        </section>
      )}
    </div>
  );
};

export default RobotCarouselListings;