import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth";
import { Loader2, Bot, Search, Grid, List, X } from "lucide-react";
import EnhancedHeader from "@/components/EnhancedHeader";
import SellerRobotCarousel from "@/components/SellerRobotCarousel";
import CategoryRobotCarousel from "@/components/CategoryRobotCarousel";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
  SelectItem
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const Robots = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  // Data states
  const [robots, setRobots] = useState<any[]>([]);
  const [filteredRobots, setFilteredRobots] = useState<any[]>([]);
  const [sellerGroups, setSellerGroups] = useState<{ [key: string]: any[] }>({});
  const [sellerProfiles, setSellerProfiles] = useState<{ [key: string]: any }>({});

  // UI & filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [selectedState, setSelectedState] = useState("all");
  const [selectedCondition, setSelectedCondition] = useState("all");
  const [selectedPriceRange, setSelectedPriceRange] = useState("all");
  const [selectedRobotType, setSelectedRobotType] = useState("all");
  const [selectedAvailability, setSelectedAvailability] = useState("available");
  const [sortOrder, setSortOrder] = useState("newest");
  const [groupBy, setGroupBy] = useState<"category" | "company">("category");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dynamic filter options
  const [categories, setCategories] = useState([{ value: "all", label: "All Categories" }]);
  const [locations, setLocations] = useState([{ value: "all", label: "All Locations" }]);
  const [states, setStates] = useState([{ value: "all", label: "All States" }]);
  const [conditions, setConditions] = useState([{ value: "all", label: "All Conditions" }]);
  const [robotTypes, setRobotTypes] = useState([{ value: "all", label: "All Types" }]);

  // Image fullscreen modal state
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  // Fetch robots and filters on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("robots")
          .select(`
            *,
            profiles:profiles!robots_seller_idfkey (
              user_id,
              full_name,
              company_name,
              phone,
              mobile,
              email
            )
          `)
          .order("created_at", { ascending: false });

        if (error) throw error;

        const robotsData = data || [];

        setRobots(robotsData);
        setFilteredRobots(robotsData);

        // Group by seller
        const grouped: Record<string, any[]> = {};
        const profiles: Record<string, any> = {};

        robotsData.forEach((robot) => {
          if (!grouped[robot.seller_id]) grouped[robot.seller_id] = [];
          grouped[robot.seller_id].push(robot);
          if (robot.profiles && !profiles[robot.seller_id]) profiles[robot.seller_id] = robot.profiles;
        });

        setSellerGroups(grouped);
        setSellerProfiles(profiles);

        // Extract filter options dynamically
        const cats = new Set<string>();
        const locs = new Set<string>();
        const sts = new Set<string>();
        const conds = new Set<string>();
        const types = new Set<string>();

        robotsData.forEach(r => {
          if (r.robot_type) {
            cats.add(r.robot_type);
            types.add(r.robot_type);
          }
          if (r.category_tags) {
            r.category_tags.forEach((tag:string) => cats.add(tag));
          }
          if (r.location) locs.add(r.location);
          if (r.state) sts.add(r.state);
          if (r.condition) conds.add(r.condition);
        });

        setCategories([{value: 'all', label: 'All Categories'}, ...[...cats].sort().map(c => ({value: c.toLowerCase().replace(/\s+/g, '-'), label: c}))]);
        setLocations([{value: 'all', label: 'All Locations'}, ...[...locs].sort().map(c => ({value: c.toLowerCase().replace(/\s+/g, '-'), label: c}))]);
        setStates([{value: 'all', label: 'All States'}, ...[...sts].sort().map(s => ({value: s.toLowerCase().replace(/\s+/g, '-'), label: s}))]);
        setConditions([{value: 'all', label: 'All Conditions'}, ...[...conds].sort().map(c => ({value: c.toLowerCase().replace(/\s+/g, '-'), label: c}))]);
        setRobotTypes([{value: 'all', label: 'All Types'}, ...[...types].sort().map(t => ({value: t.toLowerCase().replace(/\s+/g, '-'), label: t}))]);
      } catch(e:any) {
        setError(e.message || "Failed to load data");
        setRobots([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  //
  // Filtering logic based on multiple filters and search
  //
  useEffect(() => {
    let filtered = [...robots];

    const toLabel = (arr:any[], val:string): string =>
      arr.find(i => i.value === val)?.label.toLowerCase() || "";

    // Search filter
    if(searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.model.toLowerCase().includes(q) ||
        r.robot_type.toLowerCase().includes(q) ||
        r.category_tags?.some((tag:string) => tag.toLowerCase().includes(q))
      );
    }

    // Category filter
    if(selectedCategory !== 'all') {
      const val = toLabel(categories, selectedCategory);
      filtered = filtered.filter(r =>
        r.robot_type.toLowerCase() === val ||
        r.category_tags?.some((tag:string) => tag.toLowerCase() === val)
      );
    }

    // Location filter
    if(selectedLocation !== 'all') {
      const val = toLabel(locations, selectedLocation);
      filtered = filtered.filter(r => r.location?.toLowerCase() === val);
    }

    // State filter
    if(selectedState !== 'all') {
      const val = toLabel(states, selectedState);
      filtered = filtered.filter(r => r.state?.toLowerCase() === val);
    }

    // Condition filter
    if(selectedCondition !== 'all') {
      const val = toLabel(conditions, selectedCondition);
      filtered = filtered.filter(r => r.condition?.toLowerCase() === val);
    }

    // Robot Type filter
    if(selectedRobotType !== 'all') {
      const val = toLabel(robotTypes, selectedRobotType);
      filtered = filtered.filter(r => r.robot_type?.toLowerCase() === val);
    }

    // Availability filter
    filtered = filtered.filter(r => selectedAvailability === 'all' || r.availability === selectedAvailability);

    // Price Range filter
    if(selectedPriceRange !== 'all') {
      const ranges: Record<string, [number, number]> = {
        'under-50k': [0, 50000],
        '50k-200k': [50000, 200000],
        '200k-500k': [200000, 500000],
        '500k-1m': [500000, 1000000],
        'over-1m': [1000000, Infinity],
      };
      const [min, max] = ranges[selectedPriceRange] || [0, Infinity];
      filtered = filtered.filter(r => r.price >= min && r.price < max);
    }

    // Sorting
    switch(sortOrder) {
      case "newest":
        filtered.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case "oldest":
        filtered.sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case "price-asc":
        filtered.sort((a,b) => a.price - b.price);
        break;
      case "price-desc":
        filtered.sort((a,b) => b.price - a.price);
        break;
      case "name-asc":
        filtered.sort((a,b) => a.name.localeCompare(b.name));
        break;
      case "name-desc":
        filtered.sort((a,b) => b.name.localeCompare(a.name));
        break;
      default:
        break;
    }

    setFilteredRobots(filtered);

  }, [
    robots, searchQuery, selectedCategory, selectedLocation, selectedState,
    selectedCondition, selectedPriceRange, selectedRobotType,
    selectedAvailability, sortOrder
  ]);

  // Group filtered robots per UI setting
  const groupRobots = () => {
    const groups: Record<string, any[]> = {};
    if(groupBy === 'category') {
      filteredRobots.forEach(r => {
        const cat = r.robot_type || "Others";
        if(!groups[cat]) groups[cat] = [];
        groups[cat].push(r);
      });
    } else {
      filteredRobots.forEach(r => {
        const sellerId = r.seller_id;
        if(!groups[sellerId]) groups[sellerId] = [];
        groups[sellerId].push(r);
      });
    }
    return groups;
  };

  const groupedRobots = groupRobots();

  // Format price helper
  const formatPrice = (price:number, currency:string) => {
    if(!price) return "Price on request";
    const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₹';
    return symbol + price.toLocaleString();
  };

  // Contact seller handler
  const handleContactSeller = (robot: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if(!user) {
      toast({
        title: "Please login",
        description: "Sign in to contact sellers",
        variant: "destructive"
      });
      navigate('/auth');
      return;
    }
    const phone = robot.profiles?.phone || robot.profiles?.mobile;
    if(!phone) {
      toast({title: "No contact info", description: "Seller contact missing", variant: "destructive"});
      return;
    }
    const num = phone.replace(/\D/g, '');
    const msg = encodeURIComponent(`Hello! I'm interested in your robot ${robot.name} (${robot.model}). Please provide more details.`);
    if(window.confirm("Contact via WhatsApp? OK=WhatsApp, Cancel=Call")) {
      window.open(`https://wa.me/${num}?text=${msg}`, '_blank');
    } else {
      window.location.href = `tel:${num}`;
    }
  };

  // Fullscreen image modal
  const [fullImageUrl, setFullImageUrl] = useState<string | null>(null);

  if(loading) return (
    <div className="min-h-screen flex flex-col">
      <EnhancedHeader />
      <main className="flex-grow flex flex-col items-center justify-center">
        <Loader2 className="animate-spin w-10 h-10 text-primary mb-4" />
        <p>Loading robots...</p>
      </main>
    </div>
  );

  if(error) return (
    <div className="min-h-screen flex flex-col">
      <EnhancedHeader />
      <main className="flex-grow flex flex-col items-center justify-center">
        <Bot className="w-16 h-16 text-muted mb-4"/>
        <p className="text-red-600 font-semibold mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </main>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <EnhancedHeader />
      <main className="container mx-auto p-6">
        <h1 className="text-4xl font-bold mb-6">Industrial Robots Marketplace</h1>

        {/* Filters Section */}
        <Card className="mb-6 p-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted w-5 h-5" />
              <Input
                placeholder="Search robots..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select className="w-full" value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger><SelectValue placeholder="Category"/></SelectTrigger>
              <SelectContent>
                {categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select className="w-full" value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger><SelectValue placeholder="Location"/></SelectTrigger>
              <SelectContent>
                {locations.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select className="w-full" value={selectedState} onValueChange={setSelectedState}>
              <SelectTrigger><SelectValue placeholder="State"/></SelectTrigger>
              <SelectContent>
                {states.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select className="w-full" value={selectedCondition} onValueChange={setSelectedCondition}>
              <SelectTrigger><SelectValue placeholder="Condition"/></SelectTrigger>
              <SelectContent>
                {conditions.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select className="w-full" value={selectedPriceRange} onValueChange={setSelectedPriceRange}>
              <SelectTrigger><SelectValue placeholder="Price Range"/></SelectTrigger>
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

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 items-center">
            <Select className="w-full" value={selectedRobotType} onValueChange={setSelectedRobotType}>
              <SelectTrigger><SelectValue placeholder="Robot Type"/></SelectTrigger>
              <SelectContent>
                {robotTypes.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select className="w-full" value={selectedAvailability} onValueChange={setSelectedAvailability}>
              <SelectTrigger><SelectValue placeholder="Availability"/></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="unavailable">Unavailable</SelectItem>
              </SelectContent>
            </Select>

            <Select className="w-full" value={sortOrder} onValueChange={setSortOrder}>
              <SelectTrigger><SelectValue placeholder="Sort By"/></SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
                <SelectItem value="price-asc">Price: Low to High</SelectItem>
                <SelectItem value="price-desc">Price: High to Low</SelectItem>
                <SelectItem value="name-asc">Name: A to Z</SelectItem>
                <SelectItem value="name-desc">Name: Z to A</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex space-x-2 justify-end">
              <Button variant={groupBy === 'category' ? 'default' : 'outline'} onClick={() => setGroupBy('category')}>By Category</Button>
              <Button variant={groupBy === 'company' ? 'default' : 'outline'} onClick={() => setGroupBy('company')}>By Company</Button>
              <Button variant={viewMode === 'grid' ? 'default' : 'outline'} onClick={() => setViewMode('grid')}><Grid /></Button>
              <Button variant={viewMode === 'list' ? 'default' : 'outline'} onClick={() => setViewMode('list')}><List /></Button>
            </div>
          </div>
        </Card>

        {/* Robots listing */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <Loader2 className="animate-spin w-10 h-10 text-primary mb-4" />
            <p>Loading robots...</p>
          </div>
        ) : Object.keys(groupRobots()).length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <Bot className="w-16 h-16 text-muted mb-4" />
            <p>No robots match current filters.</p>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid gap-6 grid-cols-1 md:grid-cols-3' : 'space-y-6'}>
            {Object.entries(groupRobots()).sort((a,b) => a[0].localeCompare(b)).map(([group, robots]) => {
              if(groupBy === 'category') {
                return <CategoryRobotCarousel key={group} category={group} robots={robots} viewMode={viewMode} />;
              }
              return <SellerRobotCarousel key={group} sellerProfile={sellerProfiles[group]} sellerRobots={robots} viewMode={viewMode} />;
            })}
          </div>
        )}

      </main>

      {/* Fullscreen Image Modal */}
      {fullscreenImage && (
        <Dialog open={!!fullscreenImage} onOpenChange={() => setFullscreenImage(null)}>
          <DialogContent className="max-w-screen max-h-screen p-0 bg-black flex items-center justify-center">
            <img src={fullscreenImage} alt="Full size" className="max-w-full max-h-full object-contain" />
            <Button onClick={() => setFullscreenImage(null)} className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2"><X /></Button>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default Robots;
