import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Search, SlidersHorizontal, Grid, List, RefreshCw } from "lucide-react";
import SellerRobotCarousel from "@/components/SellerRobotCarousel";
import CategoryRobotCarousel from "@/components/CategoryRobotCarousel";
import { useToast } from "@/hooks/use-toast";

// Robot interface
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
  const [robots, setRobots] = useState<Robot[]>([]);
  const [sellerProfiles, setSellerProfiles] = useState<{ [key: string]: any }>({});
  const [loading, setLoading] = useState(true);

  // Filters and grouping
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [groupBy, setGroupBy] = useState<'company' | 'category'>('company');
  const [displayCount, setDisplayCount] = useState(9); // 3 companies/category per row by default

  // Stats and options
  const [marketStats, setMarketStats] = useState({
    totalListings: 0,
    minPrice: 0,
    avgPrice: 0,
    maxPrice: 0,
    topBrands: [] as string[],
    trendingTypes: [] as string[]
  });

  const uniqueTypes = [...new Set(robots.map(r => r.robot_type).filter(Boolean))];

  // Fetch robots from Supabase
  useEffect(() => {
    const fetchRobots = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('robots')
          .select(`*, profiles!robots_seller_id_fkey (
              user_id, company_name, full_name, phone, mobile_number, email, user_type
           )`)
          .eq('availability', 'available')
          .order('created_at', { ascending: false });
        if (error) throw error;
        const robotsData = (data || []) as Robot[];
        setRobots(robotsData);

        // Set profiles
        const profiles: { [key: string]: any } = {};
        robotsData.forEach(r => {
          if (r.profiles && !profiles[r.seller_id]) profiles[r.seller_id] = r.profiles;
        });
        setSellerProfiles(profiles);

        // Market stats
        const totalListings = robotsData.length;
        const prices = robotsData.map(r => r.price).filter(p => p > 0);
        const minPrice = prices.length ? Math.min(...prices) : 0;
        const maxPrice = prices.length ? Math.max(...prices) : 0;
        const avgPrice = prices.length ? prices.reduce((a,b) => a+b, 0) / prices.length : 0;
        const brandCounts = robotsData.reduce((acc, r) => {
          if (r.brand) acc[r.brand] = (acc[r.brand] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        const topBrands = Object.entries(brandCounts).sort(([,a],[,b]) => b-a).slice(0,3).map(([b])=>b);
        const typeCounts = robotsData.reduce((acc, r) => {
          if (r.robot_type) acc[r.robot_type] = (acc[r.robot_type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        const trendingTypes = Object.entries(typeCounts).sort(([,a],[,b]) => b-a).slice(0,3).map(([t])=>t);
        setMarketStats({ totalListings, minPrice, avgPrice, maxPrice, topBrands, trendingTypes });
      } catch (err) {
        toast({ variant: "destructive", title: "Error", description: "Failed to load robot listings" });
      } finally {
        setLoading(false);
      }
    };
    fetchRobots();
    // eslint-disable-next-line
  }, []);

  // Filter robots based on search and category
  const getFilteredRobots = (): Robot[] => {
    let filtered = [...robots];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.name?.toLowerCase().includes(q) ||
        r.brand?.toLowerCase().includes(q) ||
        r.model?.toLowerCase().includes(q) ||
        r.robot_type?.toLowerCase().includes(q) ||
        r.location?.toLowerCase().includes(q) ||
        r.category_tags?.some(tag => tag.toLowerCase().includes(q))
      );
    }
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(r => r.robot_type === categoryFilter);
    }
    return filtered;
  };

  // Group robots by seller
  const getCompanyGroups = () => {
    const filtered = getFilteredRobots();
    const groups: { [key: string]: Robot[] } = {};
    filtered.forEach(r => {
      if (!groups[r.seller_id]) groups[r.seller_id] = [];
      groups[r.seller_id].push(r);
    });
    return groups;
  };

  // Group robots by category (robot_type)
  const getCategoryGroups = () => {
    const filtered = getFilteredRobots();
    const groups: { [key: string]: Robot[] } = {};
    filtered.forEach(r => {
      if (!groups[r.robot_type]) groups[r.robot_type] = [];
      groups[r.robot_type].push(r);
    });
    return groups;
  };

  // --- UI Begins ---

  if (loading) {
    return (
      <section className="py-16">
        <div className="container mx-auto px-4 text-center">
          <div className="h-8 bg-muted rounded w-40 mx-auto my-10 animate-pulse"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(9).fill(0).map((_,i)=>
              <Card key={i} className="animate-pulse"><div className="h-64 bg-muted rounded-t-lg"></div></Card>
            )}
          </div>
        </div>
      </section>
    );
  }

  const companyGroups = getCompanyGroups();
  const categoryGroups = getCategoryGroups();

  return (
    <section className="py-16 bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4">

        {/* Group By Toggle */}
        <div className="mb-6 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-2">
            <Button variant={groupBy === 'company' ? 'default' : 'outline'} onClick={() => setGroupBy('company')}>Company-wise</Button>
            <Button variant={groupBy === 'category' ? 'default' : 'outline'} onClick={() => setGroupBy('category')}>Category-wise</Button>
          </div>
          <div className="flex gap-2">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {uniqueTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Search robots..."
              className="w-56"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Market Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-8">
          <Card><CardContent className="p-4 text-center"><div className="text-xl font-bold">{marketStats.totalListings}</div><div className="text-xs text-muted">Active</div></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><div className="text-xl font-bold">₹{(marketStats.minPrice/100000).toFixed(1)}L</div><div className="text-xs text-muted">Min Price</div></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><div className="text-xl font-bold">₹{(marketStats.avgPrice/100000).toFixed(1)}L</div><div className="text-xs text-muted">Avg Price</div></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><div className="text-xl font-bold">₹{(marketStats.maxPrice/100000).toFixed(1)}L</div><div className="text-xs text-muted">Max Price</div></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><div className="text-xl font-bold">{marketStats.topBrands.length}</div><div className="text-xs text-muted">Top Brands</div></CardContent></Card>
        </div>

        {/* No robots or no matches */}
        {Object.keys(groupBy === 'company' ? companyGroups : categoryGroups).length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <AlertCircle className="w-14 h-14 mx-auto mb-4 text-muted" />
              <div className="font-bold text-lg mb-2">No robots match your criteria</div>
              <div className="mb-4 text-muted">Try adjusting your search or filter settings</div>
              <Button variant="outline" onClick={() => { setSearchQuery(''); setCategoryFilter('all'); }}>Clear Filters</Button>
            </CardContent>
          </Card>
        ) : (
          // Company-wise view
          groupBy === 'company' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.entries(companyGroups)
                .slice(0, displayCount)
                .map(([sellerId, sellerRobots]) => (
                <SellerRobotCarousel
                  key={sellerId}
                  sellerRobots={sellerRobots}
                  sellerProfile={sellerProfiles[sellerId] || {}}
                  imageClassName="w-full h-auto max-h-80 object-contain rounded-lg" // For real aspect
                />
              ))}
            </div>
          // Category-wise view
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.entries(categoryGroups)
                .slice(0, displayCount)
                .map(([type, robots]) => (
                <CategoryRobotCarousel 
                  key={type}
                  category={type}
                  robots={robots}
                  imageClassName="w-full h-auto max-h-80 object-contain rounded-lg"
                />
              ))}
            </div>
          )
        )}

        {/* Load More */}
        {(Object.keys(groupBy === 'company' ? companyGroups : categoryGroups).length > displayCount) && (
          <div className="text-center mt-8">
            <Button variant="outline" size="lg" onClick={() => setDisplayCount(prev => prev + 9)}>Load More</Button>
          </div>
        )}
      </div>
    </section>
  );
};

export default RobotListings;
