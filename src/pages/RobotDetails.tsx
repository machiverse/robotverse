// src/components/RobotListings.tsx

import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  MapPin, Package, Eye, Brain, IndianRupee, MessageCircle,
  Search, SlidersHorizontal, Award, Share2, RefreshCw, Grid, List,
  Building, CheckCircle, AlertCircle, Bot
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// --- TYPE DEFINITIONS ---
// Define the shape of your data based on the Supabase query.
// This ensures type safety throughout the hook and component.

// Manually define the Robot type to match the data structure from your Supabase query
interface Robot {
  id: string;
  name: string | null;
  model: string | null;
  robot_type: string | null;
  price: number | null;
  currency: string | null;
  description: string | null;
  location: string | null;
  availability: string | null;
  images: string[] | null;
  technical_specifications: any;
  category_tags: string[] | null;
  quantity: number | null;
  seller_id: string | null;
  created_at: string;
  brand?: string | null;
  condition?: string | null;
  year_manufactured?: number | null;
  payload_capacity?: number | null;
  training_included?: boolean | null;
  warranty_info?: string | null;
  profiles: {
    company_name: string | null;
    full_name: string | null;
    phone: string | null;
    mobile_number: string | null;
    email: string | null;
    user_type: string | null;
    location?: string | null;
  } | null;
}

// --- DATA LOGIC HOOK (Defined within the same file) ---
// This hook encapsulates all the complex logic for fetching, filtering, and sorting robots.
const useRobotListings = ({ initialLimit = 8 } = {}) => {
  const { toast } = useToast();
  const [robots, setRobots] = useState<Robot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Filters and Sorting State
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [priceFilter, setPriceFilter] = useState('all');
  const [conditionFilter, setConditionFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);

  const fetchRobots = useCallback(async (isNewFilterOrRefresh = false) => {
    setLoading(true);
    if (isNewFilterOrRefresh) {
      setRefreshing(true);
    }

    try {
      let query = supabase
        .from('robots')
        .select(`
          *,
          profiles!robots_seller_id_fkey ( company_name, full_name, phone, mobile_number, email, user_type )
        `, { count: 'exact' })
        .eq('availability', 'available');

      // --- PERFORMANCE: Apply Filters on the Database Side ---
      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,brand.ilike.%${searchQuery}%,model.ilike.%${searchQuery}%,location.ilike.%${searchQuery}%`);
      }
      if (typeFilter !== 'all') query = query.eq('robot_type', typeFilter);
      if (conditionFilter !== 'all') query = query.eq('condition', conditionFilter);
      if (locationFilter !== 'all') query = query.ilike('location', `%${locationFilter}%`);
      
      const priceRanges: Record<string, [number, number]> = {
        'under-50k': [0, 50000], '50k-200k': [50000, 200000], '200k-500k': [200000, 500000],
        '500k-1m': [500000, 1000000], 'over-1m': [1000000, Infinity]
      };
      if (priceFilter in priceRanges) {
        const [min, max] = priceRanges[priceFilter];
        query = query.gte('price', min);
        if (max !== Infinity) query = query.lt('price', max);
      }

      // --- PERFORMANCE: Apply Sorting on the Database Side ---
      const sortOptions: Record<string, { column: string; ascending: boolean }> = {
        'newest': { column: 'created_at', ascending: false }, 'oldest': { column: 'created_at', ascending: true },
        'price-low': { column: 'price', ascending: true }, 'price-high': { column: 'price', ascending: false },
        'name-az': { column: 'name', ascending: true }, 'name-za': { column: 'name', ascending: false }
      };
      if (sortBy in sortOptions) {
        query = query.order(sortOptions[sortBy].column, { ascending: sortOptions[sortBy].ascending });
      }
      
      // --- Pagination ---
      const pageToFetch = isNewFilterOrRefresh ? 1 : currentPage;
      const from = (pageToFetch - 1) * initialLimit;
      const to = from + initialLimit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;
      
      if (isNewFilterOrRefresh) {
        setRobots(data as Robot[]); // Replace data on new filter
      } else {
        setRobots(prev => [...prev, ...(data as Robot[])]); // Append data for "Load More"
      }
      setTotalCount(count || 0);

    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: `Failed to load robot listings: ${error.message}` });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery, typeFilter, priceFilter, conditionFilter, locationFilter, sortBy, currentPage, initialLimit, toast]);
  
  // Effect to trigger fetch when filters or sorting change
  useEffect(() => {
    setCurrentPage(1); // Reset to first page
    fetchRobots(true); // Fetch with new filters
  }, [searchQuery, typeFilter, priceFilter, conditionFilter, locationFilter, sortBy]); // fetchRobots is not needed in deps array

  // Effect for pagination ("Load More")
  useEffect(() => {
    if (currentPage > 1) {
      fetchRobots(false); // Fetch and append
    }
  }, [currentPage]); // fetchRobots is not needed in deps array

  const loadMore = useCallback(() => {
    if (robots.length < totalCount && !loading) {
      setCurrentPage(prev => prev + 1);
    }
  }, [robots.length, totalCount, loading]);
  
  // Memoize stats to avoid recalculation
  const marketStats = useMemo(() => ({
    totalListings: totalCount,
    avgPrice: robots.reduce((sum, r) => sum + (r.price || 0), 0) / (robots.length || 1),
    uniqueTypes: [...new Set(robots.map(r => r.robot_type).filter(Boolean))],
    uniqueLocations: [...new Set(robots.map(r => r.location?.split(',')[0]).filter(Boolean))],
  }), [robots, totalCount]);

  const resetFilters = useCallback(() => {
    setSearchQuery(''); setTypeFilter('all'); setPriceFilter('all'); setConditionFilter('all'); setLocationFilter('all'); setSortBy('newest');
  }, []);

  return { robots, loading, refreshing, totalCount, marketStats, loadMore, resetFilters, fetchRobots,
    filters: { searchQuery, typeFilter, priceFilter, conditionFilter, locationFilter, sortBy },
    setFilters: { setSearchQuery, setTypeFilter, setPriceFilter, setConditionFilter, setLocationFilter, setSortBy }
  };
};


// --- UI COMPONENT ---
// This is your main component. It's now much cleaner because it only handles UI and user interactions.
const RobotListings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Use the hook defined above to manage all data logic
  const {
    robots, loading, refreshing, totalCount, marketStats, loadMore, resetFilters, fetchRobots,
    filters, setFilters
  } = useRobotListings();

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);

  // Helper functions for UI actions
  const handleAnalyzeRobot = (robotId: string) => {
    if (!user) {
      toast({ variant: "destructive", title: "Sign In Required", description: "Please sign in to use RobotVerse AI analysis" });
      return;
    }
    toast({ title: "AI Analysis Starting", description: "Navigating to analysis page..." });
    navigate(`/robots/${robotId}/analysis`);
  };

  const handleShare = (robot: Robot, e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/robots/${robot.id}`;
    if (navigator.share) {
      navigator.share({ title: robot.name || 'Robot Listing', text: `Check out this ${robot.robot_type}`, url: shareUrl });
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast({ title: "Link copied!", description: "Robot listing link copied to clipboard" });
    }
  };

  const formatPrice = (price: number | null, currency: string | null) => {
    if (price === null || price === undefined) return 'Price on request';
    const symbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : '€';
    return `${symbol}${price.toLocaleString()}`;
  };

  const getConditionColor = (condition: string | null) => {
    const colors: Record<string, string> = {
      'new': 'bg-green-100 text-green-800', 'like_new': 'bg-blue-100 text-blue-800', 
      'good': 'bg-yellow-100 text-yellow-800', 'fair': 'bg-orange-100 text-orange-800',
      'refurbished': 'bg-purple-100 text-purple-800'
    };
    return colors[condition || ''] || 'bg-gray-100 text-gray-800';
  };

  if (loading && robots.length === 0) {
    return <div className="text-center py-20">Loading Marketplace...</div>;
  }

  return (
    <section className="py-16 bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Robot Marketplace</h2>
          <p className="text-xl text-muted-foreground">Discover cutting-edge industrial robots</p>
        </div>

        <Card className="mb-8 p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search robots by name, brand, location..." value={filters.searchQuery} onChange={(e) => setFilters.setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowFilters(!showFilters)}><SlidersHorizontal className="w-4 h-4" /></Button>
              <Button variant="outline" onClick={() => setViewMode('grid')} disabled={viewMode === 'grid'}><Grid className="w-4 h-4" /></Button>
              <Button variant="outline" onClick={() => setViewMode('list')} disabled={viewMode === 'list'}><List className="w-4 h-4" /></Button>
              <Button variant="outline" onClick={() => fetchRobots(true)} disabled={refreshing}><RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /></Button>
            </div>
          </div>
          {showFilters && (
            <div className="mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-4 gap-4">
              <Select value={filters.typeFilter} onValueChange={setFilters.setTypeFilter}><SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger><SelectContent><SelectItem value="all">All Types</SelectItem>{marketStats.uniqueTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
              <Select value={filters.priceFilter} onValueChange={setFilters.setPriceFilter}><SelectTrigger><SelectValue placeholder="Price" /></SelectTrigger><SelectContent><SelectItem value="all">All Prices</SelectItem><SelectItem value="under-50k">Under ₹50K</SelectItem><SelectItem value="50k-200k">₹50K - ₹2L</SelectItem></SelectContent></Select>
              <Select value={filters.conditionFilter} onValueChange={setFilters.setConditionFilter}><SelectTrigger><SelectValue placeholder="Condition" /></SelectTrigger><SelectContent><SelectItem value="all">All Conditions</SelectItem><SelectItem value="new">New</SelectItem><SelectItem value="refurbished">Refurbished</SelectItem></SelectContent></Select>
              <Button variant="outline" onClick={resetFilters}>Clear Filters</Button>
            </div>
          )}
          <div className="mt-4 text-sm text-muted-foreground">
            <span>Showing {robots.length} of {totalCount} robots</span>
          </div>
        </Card>

        {robots.length === 0 ? (
          <div className="text-center py-12"><AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" /><h3 className="mt-2 text-sm font-medium">No robots found</h3><p>Try adjusting your search or filter settings.</p></div>
        ) : (
          <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" : "space-y-4"}>
            {robots.map((robot) => (
              <Card key={robot.id} className="group hover:shadow-xl transition-all duration-300 cursor-pointer" onClick={() => navigate(`/robots/${robot.id}`)}>
                <div className="relative h-48 bg-muted">
                  {robot.images && robot.images.length > 0 ? <img src={robot.images[0]} alt={robot.name || ''} className="w-full h-full object-cover" /> : <Bot className="w-16 h-16 text-muted-foreground absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />}
                  <Badge className={`absolute top-2 left-2 ${getConditionColor(robot.condition)}`}>{robot.condition?.replace('_', ' ')}</Badge>
                  <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-8 w-8 bg-white/80" onClick={(e) => handleShare(robot, e)}><Share2 className="w-4 h-4" /></Button>
                </div>
                <CardContent className="p-4 space-y-3">
                  <h3 className="font-bold text-lg line-clamp-1">{robot.name}</h3>
                  <div className="flex items-center text-sm text-muted-foreground"><MapPin className="w-3 h-3 mr-1" />{robot.location}</div>
                  <div className="text-lg font-bold text-primary">{formatPrice(robot.price, robot.currency)}</div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                    <div className="flex items-center"><Building className="w-3 h-3 mr-1" /><span>{robot.profiles?.company_name || 'Verified Seller'}</span></div>
                    <div className="flex items-center text-green-500"><CheckCircle className="w-3 h-3 mr-1" />Verified</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/robots/${robot.id}`); }}><Eye className="w-3 h-3 mr-1" />Details</Button>
                    <Button size="sm" onClick={(e) => { e.stopPropagation(); handleAnalyzeRobot(robot.id); }} disabled={!user}><Brain className="w-3 h-3 mr-1" />AI Analysis</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {robots.length < totalCount && (
          <div className="text-center mt-8">
            <Button variant="outline" size="lg" onClick={loadMore} disabled={loading}>{loading ? 'Loading...' : 'Load More Robots'}</Button>
          </div>
        )}
      </div>
    </section>
  );
};

export default RobotListings;
