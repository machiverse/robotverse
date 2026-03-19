import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUniversalViewTracking } from "@/hooks/useUniversalViewTracking";
import { useButtonTracking } from "@/hooks/useButtonTracking";
import { Loader2, Grid, List, Search, MapPin, Building, Heart, ChevronRight, Home } from "lucide-react";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import EnhancedHeader from "@/components/EnhancedHeader";
import ViewCountDisplay from "@/components/ViewCountDisplay";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { SEOHead } from "@/components/SEOHead";
import { ROBOT_TYPES } from "@/constants/navigationMenus";

const RobotCategory = () => {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { getItemViewCount } = useUniversalViewTracking();
  const { trackButtonClick } = useButtonTracking();

  // Decode and format the category name
  const categoryName = type ? decodeURIComponent(type).replace(/-/g, ' ') : '';
  const formattedCategory = categoryName.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');

  // Find exact match in ROBOT_TYPES
  const matchedType = ROBOT_TYPES.find(rt => 
    rt.toLowerCase() === categoryName.toLowerCase() ||
    rt.toLowerCase().replace(/\s+/g, '-') === type?.toLowerCase()
  );

  const displayName = matchedType || formattedCategory;

  // States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [selectedCondition, setSelectedCondition] = useState("all");
  const [selectedPriceRange, setSelectedPriceRange] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [robots, setRobots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [watchlistItems, setWatchlistItems] = useState<Set<string>>(new Set());

  // Filter options
  const [locations, setLocations] = useState([{ value: "all", label: "All Locations" }]);
  const [conditions] = useState([
    { value: "all", label: "All Conditions" },
    { value: "new", label: "New" },
    { value: "used", label: "Used" },
    { value: "refurbished", label: "Refurbished" }
  ]);
  const [priceRanges] = useState([
    { value: "all", label: "All Prices" },
    { value: "under-50k", label: "Under ₹50,000" },
    { value: "50k-200k", label: "₹50,000 - ₹2,00,000" },
    { value: "200k-500k", label: "₹2,00,000 - ₹5,00,000" },
    { value: "500k-1m", label: "₹5,00,000 - ₹10,00,000" },
    { value: "over-1m", label: "Over ₹10,00,000" }
  ]);

  // Fetch robots filtered by category
  useEffect(() => {
    const fetchRobots = async () => {
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from("robots")
          .select(`
            *,
            profiles!robots_seller_id_fkey (
              user_id, full_name, company_name, phone, mobile_number, email, location
            )
          `)
          .eq("availability", "available")
          .order("created_at", { ascending: false });

        if (error) throw error;

        // Filter by robot_type matching the category
        const filteredData = (data || []).filter(robot => {
          const robotType = robot.robot_type?.toLowerCase() || '';
          const searchType = categoryName.toLowerCase();
          return robotType.includes(searchType) || searchType.includes(robotType);
        });

        // Add view counts
        const robotsWithViews = await Promise.all(
          filteredData.map(async (robot) => {
            const viewCount = await getItemViewCount('robots', robot.id);
            return { ...robot, viewCount };
          })
        );

        setRobots(robotsWithViews);

        // Extract unique locations
        const uniqueLocations = new Set<string>();
        filteredData.forEach(robot => {
          if (robot.location) uniqueLocations.add(robot.location.trim());
        });
        setLocations([
          { value: "all", label: "All Locations" },
          ...Array.from(uniqueLocations).sort().map(loc => ({ value: loc.toLowerCase().replace(/\s+/g, "-"), label: loc }))
        ]);

        // Fetch watchlist
        if (user) {
          const { data: watchlistData } = await supabase
            .from('watchlists')
            .select('item_id')
            .eq('user_id', user.id)
            .eq('item_type', 'robot');
          if (watchlistData) {
            setWatchlistItems(new Set(watchlistData.map(item => item.item_id)));
          }
        }

      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load robots");
      } finally {
        setLoading(false);
      }
    };

    if (categoryName) {
      fetchRobots();
    }
  }, [categoryName, getItemViewCount, user]);

  // Filter robots
  const filteredRobots = robots.filter(robot => {
    const matchesSearch = !searchQuery || 
      robot.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      robot.model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      robot.brand?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesLocation = selectedLocation === "all" || 
      robot.location?.toLowerCase().replace(/\s+/g, "-") === selectedLocation;

    const matchesCondition = selectedCondition === "all" || 
      robot.condition?.toLowerCase() === selectedCondition;

    let matchesPrice = true;
    if (selectedPriceRange !== "all") {
      const ranges: Record<string, [number, number]> = {
        "under-50k": [0, 50000],
        "50k-200k": [50000, 200000],
        "200k-500k": [200000, 500000],
        "500k-1m": [500000, 1000000],
        "over-1m": [1000000, Infinity],
      };
      const [min, max] = ranges[selectedPriceRange] || [0, Infinity];
      matchesPrice = robot.price >= min && robot.price < max;
    }

    return matchesSearch && matchesLocation && matchesCondition && matchesPrice;
  });

  const formatPrice = (price: number, currency: string) => {
    if (!price) return "Price on request";
    const symbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : "₹";
    return `${symbol}${price.toLocaleString()}`;
  };

  const handleAddToWatchlist = async (robot: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast({ title: "Login Required", description: "Please log in to add items to your watchlist.", variant: "destructive" });
      return;
    }

    const isInWatchlist = watchlistItems.has(robot.id);
    try {
      if (isInWatchlist) {
        await supabase.from('watchlists').delete().eq('user_id', user.id).eq('item_type', 'robot').eq('item_id', robot.id);
        setWatchlistItems(prev => { const newSet = new Set(prev); newSet.delete(robot.id); return newSet; });
        toast({ title: "Removed from Watchlist", description: `${robot.name} removed from watchlist.` });
      } else {
        await supabase.from('watchlists').insert({ user_id: user.id, item_type: 'robot', item_id: robot.id, notes: `${robot.name} - ${robot.model}`, priority: 'medium' });
        setWatchlistItems(prev => new Set(prev).add(robot.id));
        toast({ title: "Added to Watchlist", description: `${robot.name} added to watchlist.` });
      }
    } catch (error) {
      toast({ title: "Error", description: "Could not update watchlist.", variant: "destructive" });
    }
  };

  // Category description for SEO
  const getCategoryDescription = () => {
    const descriptions: Record<string, string> = {
      "articulated robots": "6-axis articulated robots for welding, painting, assembly and material handling applications.",
      "scara robots": "High-speed SCARA robots for pick and place, assembly and packaging operations.",
      "delta robots": "Ultra-fast delta/parallel robots for high-speed picking and sorting applications.",
      "cartesian robots": "Precise cartesian/gantry robots for large workspace applications.",
      "collaborative robots (cobots)": "Safe collaborative robots designed to work alongside humans.",
      "mobile robots (agv/amr)": "Autonomous mobile robots for material transport and logistics.",
      "humanoid robots": "Human-like robots for research, service and entertainment applications.",
      "welding robots": "Specialized robots for arc welding, spot welding and laser welding.",
      "painting robots": "Robots designed for spray painting and coating applications.",
      "palletizing robots": "Heavy-duty robots for palletizing and depalletizing operations.",
      "pick and place robots": "Fast robots optimized for pick and place operations.",
      "assembly robots": "Precision robots for automated assembly tasks.",
      "inspection robots": "Robots equipped for quality inspection and testing.",
      "material handling robots": "Robots designed for moving and handling materials.",
      "packaging robots": "Robots for automated packaging and case packing."
    };
    return descriptions[categoryName.toLowerCase()] || `Industrial ${displayName} available for purchase from verified sellers.`;
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`${displayName} for Sale | RobotVerse Marketplace`}
        description={`Buy ${displayName.toLowerCase()} from verified sellers. ${getCategoryDescription()} Compare prices, specifications and get quotes.`}
        keywords={`${displayName}, industrial robots, ${displayName} for sale, buy ${displayName.toLowerCase()}, robot marketplace`}
        canonical={`/robots/${type}`}
      />
      
      <EnhancedHeader />

      {/* Breadcrumb */}
      <div className="container mx-auto px-4 py-4">
        <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-primary flex items-center">
            <Home className="w-4 h-4 mr-1" />
            Home
          </Link>
          <ChevronRight className="w-4 h-4" />
          <Link to="/robots" className="hover:text-primary">Robots</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-foreground font-medium">{displayName}</span>
        </nav>
      </div>

      {/* Hero Section */}
      <div className="relative bg-gradient-hero border-b border-border">
        <div className="absolute inset-0 bg-gradient-primary opacity-10"></div>
        <div className="relative container mx-auto px-4 py-12">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
              {displayName}
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              {getCategoryDescription()}
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              {filteredRobots.length} {filteredRobots.length === 1 ? 'robot' : 'robots'} available
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Filters */}
        <Card className="mb-8 bg-card border-border">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, model, brand..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger><SelectValue placeholder="Location" /></SelectTrigger>
                <SelectContent>
                  {locations.map(loc => (
                    <SelectItem key={loc.value} value={loc.value}>{loc.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedCondition} onValueChange={setSelectedCondition}>
                <SelectTrigger><SelectValue placeholder="Condition" /></SelectTrigger>
                <SelectContent>
                  {conditions.map(cond => (
                    <SelectItem key={cond.value} value={cond.value}>{cond.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedPriceRange} onValueChange={setSelectedPriceRange}>
                <SelectTrigger><SelectValue placeholder="Price Range" /></SelectTrigger>
                <SelectContent>
                  {priceRanges.map(range => (
                    <SelectItem key={range.value} value={range.value}>{range.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-between items-center mt-4">
              <p className="text-sm text-muted-foreground">
                Showing {filteredRobots.length} of {robots.length} robots
              </p>
              <div className="flex space-x-2">
                <Button variant={viewMode === "grid" ? "default" : "outline"} size="sm" onClick={() => setViewMode("grid")}>
                  <Grid className="w-4 h-4" />
                </Button>
                <Button variant={viewMode === "list" ? "default" : "outline"} size="sm" onClick={() => setViewMode("list")}>
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading {displayName}...</p>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </div>
        ) : filteredRobots.length === 0 ? (
          <div className="text-center py-20">
            <h3 className="text-xl font-semibold mb-2">No {displayName} Found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || selectedLocation !== "all" || selectedCondition !== "all" || selectedPriceRange !== "all"
                ? "Try adjusting your filters."
                : `No ${displayName.toLowerCase()} are currently available.`}
            </p>
            <Button variant="outline" onClick={() => navigate('/robots')}>Browse All Robots</Button>
          </div>
        ) : (
          <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" : "space-y-4"}>
            {filteredRobots.map((robot) => (
              <Card 
                key={robot.id} 
                className="group bg-card border-border hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden"
                onClick={() => navigate(`/robots/${robot.id}`)}
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <ResponsiveImage
                    src={robot.images?.[0] || "/placeholder.svg"}
                    alt={`${robot.name} ${robot.model}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 right-2 flex gap-2">
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8 bg-background/80 backdrop-blur-sm"
                      onClick={(e) => handleAddToWatchlist(robot, e)}
                    >
                      <Heart className={`w-4 h-4 ${watchlistItems.has(robot.id) ? 'fill-red-500 text-red-500' : ''}`} />
                    </Button>
                  </div>
                  {robot.condition && (
                    <Badge className="absolute top-2 left-2 bg-primary/90">{robot.condition}</Badge>
                  )}
                </div>

                <CardContent className="p-4">
                  <h3 className="font-semibold text-foreground mb-1 line-clamp-1">{robot.name}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{robot.brand} {robot.model}</p>
                  
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-lg font-bold text-primary">
                      {formatPrice(robot.price, robot.currency)}
                    </span>
                    <span className="text-xs text-muted-foreground">{robot.viewCount || 0} views</span>
                  </div>

                  <div className="flex items-center text-sm text-muted-foreground mb-3">
                    <MapPin className="w-4 h-4 mr-1" />
                    <span className="truncate">{robot.location || 'Location not specified'}</span>
                  </div>

                  <div className="flex items-center text-sm text-muted-foreground mb-4">
                    <Building className="w-4 h-4 mr-1" />
                    <span className="truncate">{robot.profiles?.company_name || robot.profiles?.full_name}</span>
                  </div>

                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <ChatButton
                      otherUserId={robot.seller_id}
                      itemId={robot.id}
                      itemType="robot"
                      itemName={robot.name}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    />
                    <Button size="sm" className="flex-1" onClick={() => navigate(`/robots/${robot.id}`)}>
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RobotCategory;
