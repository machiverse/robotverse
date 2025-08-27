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

  // States
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
  const [marketStats, setMarketStats] = useState({
    totalListings: 0,
    minPrice: 0,
    avgPrice: 0,
    maxPrice: 0,
    topBrands: [] as string[],
    trendingTypes: [] as string[],
  });

  // AI Analysis Dialog state
  const [showAiDialog, setShowAiDialog] = useState(false);
  const [aiDialogLoading, setAiDialogLoading] = useState(false);
  const [aiDialogData, setAiDialogData] = useState<AIAnalysisResult | null>(null);

  // Fetch robots on mount
  useEffect(() => {
    fetchRobots();
  }, []);

  // Filter and sort when dependencies change
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

  // Update view counts when robots change
  useEffect(() => {
    fetchViewCounts();
  }, [robots]);

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

  const calculateMarketStats = (robotsData: Robot[]) => {
    const totalListings = robotsData.length;
    const pricesInINR = robotsData
      .filter((r) => r.price && r.price > 0)
      .map((r) => convertToINR(r.price, r.currency));
    const minPrice = pricesInINR.length ? Math.min(...pricesInINR) : 0;
    const maxPrice = pricesInINR.length ? Math.max(...pricesInINR) : 0;
    const avgPrice = pricesInINR.length ? pricesInINR.reduce((a, b) => a + b, 0) / pricesInINR.length : 0;

    const brandCounts: Record<string, number> = {};
    robotsData.forEach(r => {
      if (r.brand) brandCounts[r.brand] = (brandCounts[r.brand] || 0) + 1;
    });

    const topBrands = Object.entries(brandCounts)
      .sort(([,a],[,b]) => b - a)
      .slice(0,3)
      .map(([b]) => b);

    const typeCounts: Record<string, number> = {};
    robotsData.forEach(r => {
      if (r.robot_type) typeCounts[r.robot_type] = (typeCounts[r.robot_type] || 0) + 1;
    });
    const trendingTypes = Object.entries(typeCounts)
      .sort(([,a],[,b]) => b - a)
      .slice(0,3)
      .map(([t]) => t);

    setMarketStats({ totalListings, minPrice, avgPrice, maxPrice, topBrands, trendingTypes });
  };

  const filterAndSortRobots = () => {
    let filtered = [...robots];
    if (searchQuery) {
      filtered = filtered.filter(r =>
        [r.name, r.brand, r.model, r.robot_type, r.location, r.profiles.company_name, ...(r.category_tags || [])]
          .filter(Boolean)
          .some(str => str.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    if (typeFilter !== "all") filtered = filtered.filter(r => r.robot_type === typeFilter);
    if (brandFilter !== "all") filtered = filtered.filter(r => r.brand === brandFilter);
    if (companyFilter !== "all") filtered = filtered.filter(r => r.profiles.company_name === companyFilter);
    if (priceFilter !== "all") {
      const ranges = {
        "under-50k": [0, 50000],
        "50k-200k": [50000, 200000],
        "200k-500k": [200000, 500000],
        "500k-1m": [500000, 1000000],
        "over-1m": [1000000, Infinity],
      };
      const range = ranges[priceFilter as keyof typeof ranges];
      filtered = filtered.filter(r => {
        const val = convertToINR(r.price, r.currency);
        return val >= range[0] && val < range[1];
      });
    }
    if (conditionFilter !== "all") filtered = filtered.filter(r => r.condition === conditionFilter);
    if (locationFilter !== "all") filtered = filtered.filter(r => r.location?.toLowerCase().includes(locationFilter.toLowerCase()));
    if (stateFilter !== "all") filtered = filtered.filter(r => (r.state || "").toLowerCase() === stateFilter.toLowerCase());

    filtered.sort((a,b) => {
      switch(sortBy) {
        case 'popular': return (viewCounts[b.id]||0) - (viewCounts[a.id]||0);
        case 'newest': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'price-low': return convertToINR(a.price,a.currency) - convertToINR(b.price,b.currency);
        case 'price-high': return convertToINR(b.price,b.currency) - convertToINR(a.price,a.currency);
        case 'name-az': return a.name.localeCompare(b.name);
        case 'name-za': return b.name.localeCompare(a.name);
        case 'brand': return (a.brand||"").localeCompare(b.brand||"");
        case 'company': return (a.profiles.company_name||"").localeCompare(b.profiles.company_name||"");
        default: return 0;
      }
    });

    setFilteredRobots(filtered);
  };

  const formatPrice = (price: number, currency: Currency) => {
    if (!price) return "Price on request";
    return formatCurrencyPrice(price, currency);
  };

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

  // AI Analysis dialog handling
  const handleAnalyzeRobot = async (robot: Robot) => {
    if (!user) {
      toast({ variant:"destructive", title:"Sign In Required", description:"Please sign in to use AI analysis" });
      return;
    }
    setShowAiDialog(true);
    setAiDialogLoading(true);
    setAiDialogData(null);
    toast({ title:"Starting AI Analysis", description:`Analyzing ${robot.name}...` });
    try {
      const { data, error } = await supabase.functions.invoke("roboverse-ai-analyze", { body: { robotId: robot.id } });
      if (error) throw error;
      const analysis = typeof data.analysis === "string" ? { summary: data.analysis } : data.analysis;
      setAiDialogData({
        analysis: {
          summary: analysis.summary || "",
          suitability: analysis.suitability || "",
          technicalInsights: analysis.technicalInsights || "",
          governmentSchemes: analysis.governmentSchemes || "",
          suggestedIndustries: analysis.suggestedIndustries || "",
          timestamp: analysis.timestamp || new Date().toISOString(),
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
      toast({ title:"AI Analysis Complete", description:"Results loaded." });
    } catch(e) {
      toast({ variant:"destructive", title:"AI Analysis Failed", description: (e as Error).message || "Error" });
      setShowAiDialog(false);
    } finally {
      setAiDialogLoading(false);
    }
  };

  // Share and contact handlers
  const handleShare = async (robot: Robot) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${robot.name} - ${robot.brand}`,
          text: `Check out this ${robot.robot_type} from ${robot.profiles.company_name}`,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: "Link copied",
          description: "Robot listing link copied to clipboard",
        });
      }
    } catch (error) {
      console.error("Error sharing:", error);
      toast({
        variant: "destructive",
        title: "Share failed",
        description: "Could not share this listing",
      });
    }
  };

  const handleContactSeller = (robot: Robot) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Sign In Required",
        description: "Please sign in to contact sellers",
      });
      return;
    }
    
    const message = `Hi, I'm interested in your ${robot.name} (${robot.model}). Could you please provide more details?`;
    const subject = `Inquiry about ${robot.name}`;
    const mailtoLink = `mailto:${robot.profiles.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
    
    window.open(mailtoLink);
    
    toast({
      title: "Email client opened",
      description: "Your default email client should open with a pre-filled message",
    });
  };

  // Unique filters options
  const uniqueTypes = [...new Set(robots.map(r => r.robot_type).filter(Boolean))];
  const uniqueBrands = [...new Set(robots.map(r => r.brand).filter(Boolean))];
  const uniqueCompanies = [...new Set(robots.map(r => r.profiles.company_name).filter(Boolean))];
  const uniqueLocations = [...new Set(robots.map(r => r.location?.split(",")[0]).filter(Boolean))];
  const uniqueStates = [...new Set(robots.map(r => r.state).filter(Boolean))];

  if(loading) return (
    <section className="py-16 bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <div className="h-8 bg-muted rounded w-64 mx-auto mb-4 animate-pulse"/>
          <div className="h-4 bg-muted rounded w-96 mx-auto animate-pulse"/>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({length:8}).map((_,i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-48 bg-muted rounded-t-lg"/>
              <CardContent className="space-y-3">
                <div className="h-4 bg-muted rounded"/>
                <div className="h-3 bg-muted rounded w-3/4"/>
                <div className="h-3 bg-muted rounded w-1/2"/>
                <div className="flex gap-2">
                  <div className="h-8 bg-muted rounded flex-1"/>
                  <div className="h-8 bg-muted rounded flex-1"/>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );

  return (
    <>
      <section className="py-16 bg-gradient-to-br from-background to-muted/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Robot Marketplace
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Discover cutting-edge industrial robots from verified sellers worldwide
            </p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 max-w-5xl mx-auto mt-8">
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="text-center text-blue-800 font-bold text-2xl">{marketStats.totalListings}</CardContent>
                <div className="text-center text-sm text-blue-600">Active Listings</div>
              </Card>
              <Card className="bg-green-50 border-green-200">
                <CardContent className="text-center text-green-800 font-bold text-2xl">{(marketStats.minPrice / 100000).toFixed(1)}L</CardContent>
                <div className="text-center text-sm text-green-600">Min Price</div>
              </Card>
              <Card className="bg-yellow-50 border-yellow-200">
                <CardContent className="text-center text-yellow-800 font-bold text-2xl">{(marketStats.avgPrice / 100000).toFixed(1)}L</CardContent>
                <div className="text-center text-sm text-yellow-600">Avg Price</div>
              </Card>
              <Card className="bg-red-50 border-red-200">
                <CardContent className="text-center text-red-800 font-bold text-2xl">{(marketStats.maxPrice / 100000).toFixed(1)}L</CardContent>
                <div className="text-center text-sm text-red-600">Max Price</div>
              </Card>
              <Card className="bg-purple-50 border-purple-200">
                <CardContent className="text-center text-purple-800 font-bold text-2xl">{marketStats.topBrands.length}</CardContent>
                <div className="text-center text-sm text-purple-600">Top Brands</div>
              </Card>
            </div>
          </div>

          <Card className="mb-8">
            <CardContent>
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4"/>
                  <Input
                    placeholder="Search robots..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {uniqueTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={brandFilter} onValueChange={setBrandFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Brand" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Brands</SelectItem>
                      {uniqueBrands.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={companyFilter} onValueChange={setCompanyFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Company" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Companies</SelectItem>
                      {uniqueCompanies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
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
                  <Button variant="outline" onClick={() => setShowFilters(prev => !prev)}>
                    <SlidersHorizontal />
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Button size="sm" variant={viewMode === "grid" ? "default" : "ghost"} onClick={() => setViewMode("grid")}>
                    <Grid />
                  </Button>
                  <Button size="sm" variant={viewMode === "list" ? "default" : "ghost"} onClick={() => setViewMode("list")}>
                    <List />
                  </Button>
                  <Button size="sm" variant="outline" onClick={fetchRobots} disabled={refreshing}>
                    <RefreshCw className={refreshing ? "animate-spin" : ""} />
                  </Button>
                </div>
              </div>
              {showFilters && (
                <div className="mt-4 border-t pt-4 grid grid-cols-1 md:grid-cols-5 gap-4">
                  <Select value={conditionFilter} onValueChange={setConditionFilter}>
                    <SelectTrigger><SelectValue placeholder="Condition" /></SelectTrigger>
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
                    <SelectTrigger><SelectValue placeholder="Location" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Locations</SelectItem>
                      {uniqueLocations.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={stateFilter} onValueChange={setStateFilter}>
                    <SelectTrigger><SelectValue placeholder="State" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All States</SelectItem>
                      {uniqueStates.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger><SelectValue placeholder="Sort By" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="popular">Most Popular</SelectItem>
                      <SelectItem value="newest">Newest First</SelectItem>
                      <SelectItem value="oldest">Oldest First</SelectItem>
                      <SelectItem value="price-low">Price: Low to High</SelectItem>
                      <SelectItem value="price-high">Price: High to Low</SelectItem>
                      <SelectItem value="name-az">Name: A-Z</SelectItem>
                      <SelectItem value="name-za">Name: Z-A</SelectItem>
                      <SelectItem value="brand">Brand</SelectItem>
                      <SelectItem value="company">Company</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={() => {
                    setSearchQuery("");
                    setTypeFilter("all");
                    setPriceFilter("all");
                    setConditionFilter("all");
                    setLocationFilter("all");
                    setStateFilter("all");
                    setBrandFilter("all");
                    setCompanyFilter("all");
                    setSortBy("popular");
                  }}>Clear Filters</Button>
                </div>
              )}
              <div className="mt-4 flex justify-between text-sm text-muted-foreground">
                <span>Showing {Math.min(displayCount, filteredRobots.length)} of {filteredRobots.length} robots{searchQuery ? ` for "${searchQuery}"` : ""}</span>
                <span>{refreshing ? "Updating..." : `Last updated: ${new Date().toLocaleTimeString()}`}</span>
              </div>
            </CardContent>
          </Card>

          {(filteredRobots.length === 0) && (
            <Card className="text-center py-12">
              <CardContent>
                {robots.length === 0 ? (
                  <>
                    <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold">No robots listed yet</h3>
                    <p className="text-muted-foreground mb-4">Be the first to list your robots on RobotVerse!</p>
                    <Button onClick={() => navigate("/dashboard")}>Start Selling</Button>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold">No robots match your criteria</h3>
                    <p className="text-muted-foreground mb-4">Try adjusting your filters</p>
                    <Button onClick={() => {
                      setSearchQuery("");
                      setTypeFilter("all");
                      setPriceFilter("all");
                      setConditionFilter("all");
                      setLocationFilter("all");
                      setStateFilter("all");
                      setBrandFilter("all");
                      setCompanyFilter("all");
                    }}>Clear Filters</Button>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" : "space-y-4"}>
            {filteredRobots.slice(0, displayCount).map(robot => (
              <Card onClick={() => navigate(`/robots/${robot.id}`)} key={robot.id} className={`cursor-pointer group hover:shadow-xl transition ${viewMode === "list" ? "flex" : ""}`}>
                <div className={`relative bg-gradient-to-br from-muted to-muted/50 ${viewMode === "list"? "w-48 h-32": "h-48"}`}>
                  {robot.images?.length ? (
                    <img src={robot.images[0]} alt={robot.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  ) : (
                    <div className="flex justify-center items-center w-full h-full">
                      <Bot className="w-16 h-16 text-muted-foreground" />
                    </div>
                  )}
                  <Badge className={`absolute top-2 left-2 ${getConditionColor(robot.condition || "used")}`}>{robot.condition?.replace("_", " ") || "Used"}</Badge>
                  <Button size="sm" variant="ghost" className="absolute top-2 right-2 p-1" onClick={e => { e.stopPropagation(); handleShare(robot); }}>
                    <Share2 className="w-4 h-4" />
                  </Button>
                  {robot.training_included && <Badge className="absolute bottom-2 left-2" variant="secondary">Training</Badge>}
                </div>
                <CardContent className={`${viewMode === "list" ? "flex-1" : ""}`}>
                  <h3 className="font-bold text-lg line-clamp-1">{robot.name}</h3>
                  <div className="text-sm text-muted-foreground mb-1 flex gap-2">
                    <span>{robot.brand || "Unknown Brand"}</span>
                    {robot.model && <span>• {robot.model}</span>}
                    {robot.year_manufactured && <span>• {robot.year_manufactured}</span>}
                  </div>
                  <Badge>{robot.robot_type}</Badge>
                  <div className="text-lg font-bold text-primary mt-1">{formatPrice(robot.price, robot.currency)}</div>
                  <div className="text-xs text-muted-foreground">{robot.location}</div>
                  <div className="flex gap-2 mt-3">
                    <Button variant="outline" size="sm" onClick={e => { e.stopPropagation(); navigate(`/robots/${robot.id}`); }}>
                      <Eye className="w-4 h-4 mr-1" /> Details
                    </Button>
                    <Button variant="outline" size="sm" onClick={e => { e.stopPropagation(); if(!user) { toast({variant:"destructive", title:"Sign in required", description:"Sign in to contact sellers"}); return; } handleContactSeller(robot); }} disabled={!user || (!robot.profiles.phone && !robot.profiles.mobile_number)}>
                      <MessageCircle className="w-4 h-4 mr-1" /> Contact
                    </Button>
                  </div>
                  <Button
                    className="mt-3 w-full"
                    onClick={e => { e.stopPropagation(); handleAnalyzeRobot(robot); }}
                    disabled={aiDialogLoading}
                  >
                    {aiDialogLoading ? (
                      <>
                        <Loader2 className="animate-spin w-5 h-5 mr-2" /> Analyzing...
                      </>
                    ) : (
                      <>
                        <Brain className="w-5 h-5 mr-2" /> AI Analysis
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredRobots.length > displayCount && (
            <div className="text-center mt-8">
              <Button size="lg" variant="outline" onClick={() => setDisplayCount(c => c + 8)}>Load More</Button>
            </div>
          )}
          {filteredRobots.length > 0 && (
            <div className="text-center mt-8">
              <Button size="lg" onClick={() => navigate("/robots")} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
                View All {marketStats.totalListings} Robots
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* AI Analysis Dialog */}
      <Dialog open={showAiDialog} onOpenChange={setShowAiDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle>Robot AI Analysis</DialogTitle>
            <DialogClose asChild>
              <button className="absolute top-3 right-3 rounded p-1 hover:bg-gray-200">✕</button>
            </DialogClose>
          </DialogHeader>
          <DialogDescription className="mt-4 text-gray-700 whitespace-pre-wrap">
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
            ) : !aiDialogLoading ? (
              <p>No analysis data available.</p>
            ) : null}
          </DialogDescription>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RobotListings;
