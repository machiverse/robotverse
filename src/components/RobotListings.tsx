import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  MapPin, 
  Package, 
  Eye, 
  Brain, 
  IndianRupee, 
  MessageCircle,
  Search,
  Filter,
  Star,
  Calendar,
  Bot,
  TrendingUp,
  Zap,
  Shield,
  Award,
  Heart,
  Share2,
  RefreshCw,
  Grid,
  List,
  SlidersHorizontal,
  Phone,
  Mail,
  Building,
  User,
  Clock,
  CheckCircle,
  ExternalLink,
  Bookmark,
  AlertCircle,
  ArrowUpDown
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Fixed Robot interface to match actual database schema
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
  // Optional enhanced properties (may not exist in all records)
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
  const [robots, setRobots] = useState<Robot[]>([]);
  const [filteredRobots, setFilteredRobots] = useState<Robot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [priceFilter, setPriceFilter] = useState('all');
  const [conditionFilter, setConditionFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [displayCount, setDisplayCount] = useState(8);

  // Enhanced stats
  const [marketStats, setMarketStats] = useState({
    totalListings: 0,
    minPrice:0,
    avgPrice: 0,
    maxPrice: 0,
    topBrands: [] as string[],
    trendingTypes: [] as string[]
  });

  useEffect(() => {
    fetchRobots();
  }, []);

  useEffect(() => {
    filterAndSortRobots();
  }, [robots, searchQuery, typeFilter, priceFilter, conditionFilter, locationFilter, stateFilter, sortBy]);

  const fetchRobots = async () => {
    try {
      setRefreshing(true);
      const { data, error } = await supabase
        .from('robots')
        .select(`
          *,
          profiles!robots_seller_id_fkey (
            company_name,
            full_name,
            phone,
            mobile_number,
            email,
            user_type
          )
        `)
        .eq('availability', 'available')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const robotsData = (data || []) as Robot[];
      setRobots(robotsData);
      calculateMarketStats(robotsData);
      
      console.log('✅ Fetched robots:', robotsData.length);
    } catch (error) {
      console.error('Error fetching robots:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load robot listings"
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateMarketStats = (robotsData: Robot[]) => {
  const totalListings = robotsData.length;

  // Collect only valid prices (> 0)
  const prices = robotsData
    .map(r => r.price || 0)
    .filter(price => price > 0);

  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
  const avgPrice = prices.length > 0
    ? prices.reduce((sum, p) => sum + p, 0) / prices.length
    : 0;
    
    // Top brands
    const brandCounts = robotsData.reduce((acc, robot) => {
      if (robot.brand) {
        acc[robot.brand] = (acc[robot.brand] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    
    const topBrands = Object.entries(brandCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([brand]) => brand);

    // Trending types
    const typeCounts = robotsData.reduce((acc, robot) => {
      if (robot.robot_type) {
        acc[robot.robot_type] = (acc[robot.robot_type] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    
    const trendingTypes = Object.entries(typeCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([type]) => type);

    setMarketStats({
      totalListings,
      minPrice,
      avgPrice,
      maxPrice,
      topBrands,
      trendingTypes
    });
  };

  const filterAndSortRobots = () => {
    let filtered = [...robots];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(robot =>
        robot.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        robot.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        robot.model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        robot.robot_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        robot.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        robot.category_tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(robot => robot.robot_type === typeFilter);
    }

    // Price filter
    if (priceFilter !== 'all') {
      const ranges = {
        'under-50k': [0, 50000],
        '50k-200k': [50000, 200000],
        '200k-500k': [200000, 500000],
        '500k-1m': [500000, 1000000],
        'over-1m': [1000000, Infinity]
      };
      const range = ranges[priceFilter as keyof typeof ranges];
      if (range) {
        filtered = filtered.filter(robot => 
          robot.price >= range[0] && robot.price < range[1]
        );
      }
    }

    // Condition filter
    if (conditionFilter !== 'all') {
      filtered = filtered.filter(robot => robot.condition === conditionFilter);
    }

    // Location filter
    if (locationFilter !== 'all') {
      filtered = filtered.filter(robot => 
        robot.location?.toLowerCase().includes(locationFilter.toLowerCase())
      );
    }

    // State filter
    if (stateFilter !== 'all') {
      filtered = filtered.filter(robot => (robot.state || '').toLowerCase() === stateFilter.toLowerCase());
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'price-low':
          return (a.price || 0) - (b.price || 0);
        case 'price-high':
          return (b.price || 0) - (a.price || 0);
        case 'name-az':
          return (a.name || '').localeCompare(b.name || '');
        case 'name-za':
          return (b.name || '').localeCompare(a.name || '');
        default:
          return 0;
      }
    });

    setFilteredRobots(filtered);
  };

  const handleAnalyzeRobot = (robotId: string) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Sign In Required",
        description: "Please sign in to use RobotVerse AI analysis"
      });
      return;
    }
    
    toast({
      title: "AI Analysis Starting",
      description: "RobotVerse AI is analyzing robot specifications, market data, and compatibility..."
    });
    
    // Navigate to detailed analysis page
    navigate(`/robots/${robotId}/analysis`);
  };

  const handleContactSeller = (robot: Robot, e: React.MouseEvent) => {
    e.stopPropagation();
    const phone = robot.profiles?.phone || robot.profiles?.mobile_number;
    
    if (!phone) {
      toast({
        variant: "destructive",
        title: "Contact Unavailable",
        description: "Contact information not available for this seller"
      });
      return;
    }

    const phoneNumber = phone.replace(/\D/g, '');
    const message = `Hi ${robot.profiles?.company_name || robot.profiles?.full_name}! I'm interested in your robot: ${robot.name} (${robot.model}). Price: ${formatPrice(robot.price, robot.currency)}. Can you please provide more details?`;
    
    const choice = window.confirm(
      `Contact ${robot.profiles?.company_name || robot.profiles?.full_name}:\n\nOK = WhatsApp\nCancel = Phone Call`
    );
    
    if (choice) {
      window.open(`https://wa.me/91${phoneNumber}?text=${encodeURIComponent(message)}`, '_blank');
    } else {
      window.location.href = `tel:+91${phoneNumber}`;
    }
  };

  const handleShare = (robot: Robot, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (navigator.share) {
      navigator.share({
        title: robot.name,
        text: `Check out this ${robot.robot_type}: ${robot.name} for ${formatPrice(robot.price, robot.currency)}`,
        url: `${window.location.origin}/robots/${robot.id}`
      });
    } else {
      navigator.clipboard.writeText(`${window.location.origin}/robots/${robot.id}`);
      toast({
        title: "Link copied!",
        description: "Robot listing link copied to clipboard"
      });
    }
  };

  const formatPrice = (price: number, currency: string) => {
    if (!price) return 'Price on request';
    const symbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : '€';
    return `${symbol}${price.toLocaleString()}`;
  };

  const getConditionColor = (condition: string) => {
    const colors = {
      'new': 'bg-green-100 text-green-800',
      'like_new': 'bg-blue-100 text-blue-800', 
      'good': 'bg-yellow-100 text-yellow-800',
      'fair': 'bg-orange-100 text-orange-800',
      'refurbished': 'bg-purple-100 text-purple-800'
    };
    return colors[condition as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const uniqueTypes = [...new Set(robots.map(r => r.robot_type).filter(Boolean))];
  const uniqueLocations = [...new Set(robots.map(r => r.location?.split(',')[0]).filter(Boolean))];
  const uniqueStates = [...new Set(robots.map(r => r.state).filter(Boolean))];

  if (loading) {
    return (
      <section className="py-16 bg-gradient-to-br from-background to-muted/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <div className="h-8 bg-muted rounded w-64 mx-auto mb-4 animate-pulse"></div>
            <div className="h-4 bg-muted rounded w-96 mx-auto animate-pulse"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array(8).fill(0).map((_, i) => (
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
    <section className="py-16 bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4">
        {/* Enhanced Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Robot Marketplace
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Discover cutting-edge industrial robots from verified sellers worldwide
          </p>
          
          {/* Market Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mt-8">
            <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-800">{marketStats.totalListings}</div>
                <div className="text-sm text-blue-600">Active Listings</div>
              </CardContent>
            </Card>
            {/* Min → Avg → Max Price */}
              <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
           <CardContent className="p-4 text-center">
       <div className="text-sm font-bold text-green-800">
        ₹{(marketStats.minPrice / 100000).toFixed(1)}L → 
        ₹{(marketStats.avgPrice / 100000).toFixed(1)}L → 
        ₹{(marketStats.maxPrice / 100000).toFixed(1)}L
      </div>
      <div className="text-xs text-green-600">Min → Avg → Max</div>
    </CardContent>
  </Card>
            <Card className="bg-gradient-to-r from-purple-50 to-violet-50 border-purple-200">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-800">{marketStats.topBrands.length}</div>
                <div className="text-sm text-purple-600">Top Brands</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-orange-800">{uniqueLocations.length}</div>
                <div className="text-sm text-orange-600">Cities</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Enhanced Search and Filters */}
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
              <div className="flex gap-2">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {uniqueTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
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

                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="px-3"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </Button>
              </div>

              {/* View Controls */}
              <div className="flex gap-2">
                <div className="flex border rounded-lg">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchRobots}
                  disabled={refreshing}
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
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
                      {uniqueLocations.map(location => (
                        <SelectItem key={location} value={location}>{location}</SelectItem>
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
                        <SelectItem key={state as string} value={state as string}>{state as string}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest First</SelectItem>
                      <SelectItem value="oldest">Oldest First</SelectItem>
                      <SelectItem value="price-low">Price: Low to High</SelectItem>
                      <SelectItem value="price-high">Price: High to Low</SelectItem>
                      <SelectItem value="name-az">Name: A to Z</SelectItem>
                      <SelectItem value="name-za">Name: Z to A</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchQuery('');
                      setTypeFilter('all');
                      setPriceFilter('all');
                      setConditionFilter('all');
                      setLocationFilter('all');
                      setStateFilter('all');
                      setSortBy('newest');
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            )}

            {/* Results Summary */}
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Showing {Math.min(displayCount, filteredRobots.length)} of {filteredRobots.length} robots
                {searchQuery && ` for "${searchQuery}"`}
              </span>
              <span>
                {refreshing ? 'Updating...' : `Last updated: ${new Date().toLocaleTimeString()}`}
              </span>
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
                  <Button onClick={() => navigate('/dashboard')}>
                    Start Selling
                  </Button>
                </>
              ) : (
                <>
                  <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No robots match your criteria</h3>
                  <p className="text-muted-foreground mb-4">Try adjusting your search or filter settings</p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchQuery('');
                      setTypeFilter('all');
                      setPriceFilter('all');
                      setConditionFilter('all');
                      setLocationFilter('all');
                      setStateFilter('all');
                    }}
                  >
                    Clear Filters
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className={viewMode === 'grid' 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" 
            : "space-y-4"
          }>
            {filteredRobots.slice(0, displayCount).map((robot) => (
              <Card 
                key={robot.id} 
                className={`group hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer ${
                  viewMode === 'list' ? 'flex' : ''
                }`}
                onClick={() => navigate(`/robots/${robot.id}`)}
              >
                {/* Robot Image */}
                <div className={`relative bg-gradient-to-br from-muted to-muted/50 ${
                  viewMode === 'list' ? 'w-48 h-32' : 'h-48'
                }`}>
                  {robot.images && robot.images.length > 0 ? (
                    <img
                      src={robot.images[0]}
                      alt={robot.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Bot className="w-16 h-16 text-muted-foreground" />
                    </div>
                  )}

                  {/* Overlay badges */}
                  <div className="absolute top-2 left-2">
                    <Badge className={getConditionColor(robot.condition || 'used')}>
                      {robot.condition?.replace('_', ' ') || 'Used'}
                    </Badge>
                  </div>

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

                  {/* Special badges */}
                  {robot.training_included && (
                    <div className="absolute bottom-2 left-2">
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                        <Award className="w-3 h-3 mr-1" />
                        Training
                      </Badge>
                    </div>
                  )}
                </div>
                
                <CardContent className={`p-4 ${viewMode === 'list' ? 'flex-1' : ''}`}>
                  <div className="space-y-3">
                    {/* Robot Details */}
                    <div>
                      <h3 className="font-bold text-lg mb-1 line-clamp-1 group-hover:text-primary transition-colors">
                        {robot.name}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <span className="font-medium">{robot.brand || 'Unknown Brand'}</span>
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
                        <span className="text-xs text-muted-foreground">
                          Qty: {robot.quantity}
                        </span>
                      </div>
                    </div>

                    {/* Location & Price */}
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <MapPin className="w-3 h-3 mr-1" />
                        <span className="line-clamp-1">{robot.location || 'Location not specified'}</span>
                      </div>
                      {robot.state && (
                        <div className="text-xs text-muted-foreground">State: {robot.state}</div>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-lg font-bold text-primary">
                          <IndianRupee className="w-4 h-4 mr-1" />
                          {formatPrice(robot.price, robot.currency)}
                        </div>
                        {robot.payload_capacity && (
                          <span className="text-xs text-muted-foreground">
                            {robot.payload_capacity}kg payload
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Applications & Tags */}
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

                    {/* Seller Info */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                      <div className="flex items-center">
                        <Building className="w-3 h-3 mr-1" />
                        <span className="line-clamp-1">
                          {robot.profiles?.company_name || robot.profiles?.full_name || 'Verified Seller'}
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
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!user) {
                            toast({
                              variant: "destructive",
                              title: "Sign In Required",
                              description: "Please sign in to contact sellers"
                            });
                            return;
                          }
                          handleContactSeller(robot, e);
                        }}
                        disabled={!user || (!robot.profiles?.phone && !robot.profiles?.mobile_number)}
                      >
                        <MessageCircle className="w-3 h-3 mr-1" />
                        {user ? 'Contact' : 'Sign In to Contact'}
                      </Button>
                    </div>

                    {/* AI Analysis Button */}
                    <Button 
                      variant={user ? "default" : "secondary"}
                      size="sm" 
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAnalyzeRobot(robot.id);
                      }}
                      disabled={!user}
                    >
                      <Brain className="w-3 h-3 mr-1" />
                      {user ? 'AI Analysis' : 'Sign in for AI Analysis'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        
        {/* Load More / View All */}
        {filteredRobots.length > displayCount && (
          <div className="text-center mt-8">
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => setDisplayCount(prev => prev + 8)}
            >
              Load More Robots
            </Button>
          </div>
        )}

        {filteredRobots.length > 0 && (
          <div className="text-center mt-8">
            <Button 
              size="lg"
              onClick={() => navigate('/robots')}
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
