import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bot, MapPin, DollarSign, Search, Filter, Grid, List, Phone, MessageCircle } from "lucide-react";
import EnhancedHeader from "@/components/EnhancedHeader";
import SellerRobotCarousel from "@/components/SellerRobotCarousel";

const Robots = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // ✅ Dynamic arrays populated from database
  const [categories, setCategories] = useState([
    { value: "all", label: "All Categories" }
  ]);
  
  const [locations, setLocations] = useState([
    { value: "all", label: "All Locations" }
  ]);

  const [robots, setRobots] = useState<any[]>([]);
  const [sellerGroups, setSellerGroups] = useState<{ [key: string]: any[] }>({});
  const [sellerProfiles, setSellerProfiles] = useState<{ [key: string]: any }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRobotsAndFilters = async () => {
      try {
        setLoading(true);
        
        // Fetch robots data
        const { data: robotsData, error: robotsError } = await supabase
          .from('robots')
          .select(`
            *,
            profiles!robots_seller_id_fkey (
              user_id,
              full_name,
              company_name,
              phone,
              mobile_number,
              email
            )
          `)
          .eq('availability', 'available')
          .order('created_at', { ascending: false });

        if (robotsError) throw robotsError;
        setRobots(robotsData || []);

        // Group robots by seller
        const grouped: { [key: string]: any[] } = {};
        const profiles: { [key: string]: any } = {};

        robotsData?.forEach(robot => {
          const sellerId = robot.seller_id;
          if (!grouped[sellerId]) {
            grouped[sellerId] = [];
          }
          grouped[sellerId].push(robot);
          
          if (robot.profiles && !profiles[sellerId]) {
            profiles[sellerId] = robot.profiles;
          }
        });

        setSellerGroups(grouped);
        setSellerProfiles(profiles);

        // ✅ Extract unique categories from database
        const uniqueCategories = new Set<string>();
        robotsData?.forEach(robot => {
          // Add robot_type
          if (robot.robot_type) {
            uniqueCategories.add(robot.robot_type);
          }
          
          // Add category_tags
          if (robot.category_tags && Array.isArray(robot.category_tags)) {
            robot.category_tags.forEach(tag => {
              if (tag && tag.trim()) {
                uniqueCategories.add(tag.trim());
              }
            });
          }
        });

        // Convert to dropdown format
        const categoryOptions = [
          { value: "all", label: "All Categories" },
          ...Array.from(uniqueCategories)
            .sort()
            .map(category => ({
              value: category.toLowerCase().replace(/\s+/g, '-'),
              label: category
            }))
        ];
        setCategories(categoryOptions);

        // ✅ Extract unique locations from database (only robot location, not seller location)
        const uniqueLocations = new Set<string>();
        robotsData?.forEach(robot => {
          // Add robot location only
          if (robot.location) {
            uniqueLocations.add(robot.location.trim());
          }
        });

        // Convert to dropdown format
        const locationOptions = [
          { value: "all", label: "All Locations" },
          ...Array.from(uniqueLocations)
            .sort()
            .map(location => ({
              value: location.toLowerCase().replace(/\s+/g, '-'),
              label: location
            }))
        ];
        setLocations(locationOptions);

      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load robots');
        setRobots([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRobotsAndFilters();
  }, []);

  const formatPrice = (price: number, currency: string) => {
    const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₹';
    return `${currencySymbol}${price.toLocaleString()}`;
  };

  const handleContactSeller = (robot: any, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Check if user is signed in
    if (!user) {
      alert('Please sign in to contact sellers');
      navigate('/auth');
      return;
    }
    
    const phone = robot.profiles?.phone || robot.profiles?.mobile_number;
    
    if (!phone) {
      alert('Contact information not available for this seller');
      return;
    }

    const phoneNumber = phone.replace(/\D/g, ''); // Remove non-digits
    const message = `Hi! I'm interested in your robot: ${robot.name} (${robot.model}). Can you please provide more details?`;
    
    // Create options for WhatsApp or Phone call
    const choice = window.confirm(
      'Choose contact method:\n\nOK = WhatsApp Message\nCancel = Phone Call'
    );
    
    if (choice) {
      // WhatsApp
      window.open(`https://wa.me/91${phoneNumber}?text=${encodeURIComponent(message)}`, '_blank');
    } else {
      // Phone call
      window.location.href = `tel:+91${phoneNumber}`;
    }
  };

  // ✅ Enhanced filtering logic for seller groups
  const filteredSellerGroups = Object.entries(sellerGroups).filter(([sellerId, sellerRobots]) => {
    // Filter robots within each seller group
    const filteredSellerRobots = sellerRobots.filter((robot) => {
      const matchesSearch = robot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           robot.model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           robot.robot_type.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === "all" || (() => {
        const selectedCategoryLabel = categories.find(cat => cat.value === selectedCategory)?.label;
        if (!selectedCategoryLabel) return false;
        
        // Check robot_type
        if (robot.robot_type && robot.robot_type.toLowerCase() === selectedCategoryLabel.toLowerCase()) {
          return true;
        }
        
        // Check category_tags
        if (robot.category_tags && Array.isArray(robot.category_tags)) {
          return robot.category_tags.some((tag: string) => 
            tag.toLowerCase() === selectedCategoryLabel.toLowerCase()
          );
        }
        
        return false;
      })();
      
      const matchesLocation = selectedLocation === "all" || (() => {
        const selectedLocationLabel = locations.find(loc => loc.value === selectedLocation)?.label;
        if (!selectedLocationLabel) return false;
        
        // Check robot location only (not seller location)
        if (robot.location && robot.location.toLowerCase() === selectedLocationLabel.toLowerCase()) {
          return true;
        }
        
        return false;
      })();

      return matchesSearch && matchesCategory && matchesLocation;
    });

    // Only include seller if they have robots matching the filters
    return filteredSellerRobots.length > 0;
  }).reduce((acc, [sellerId, sellerRobots]) => {
    // Also filter the robots within each seller group
    const filteredSellerRobots = sellerRobots.filter((robot) => {
      const matchesSearch = robot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           robot.model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           robot.robot_type.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === "all" || (() => {
        const selectedCategoryLabel = categories.find(cat => cat.value === selectedCategory)?.label;
        if (!selectedCategoryLabel) return false;
        
        if (robot.robot_type && robot.robot_type.toLowerCase() === selectedCategoryLabel.toLowerCase()) {
          return true;
        }
        
        if (robot.category_tags && Array.isArray(robot.category_tags)) {
          return robot.category_tags.some((tag: string) => 
            tag.toLowerCase() === selectedCategoryLabel.toLowerCase()
          );
        }
        
        return false;
      })();
      
      const matchesLocation = selectedLocation === "all" || (() => {
        const selectedLocationLabel = locations.find(loc => loc.value === selectedLocation)?.label;
        if (!selectedLocationLabel) return false;
        
        if (robot.location && robot.location.toLowerCase() === selectedLocationLabel.toLowerCase()) {
          return true;
        }
        
        return false;
      })();

      return matchesSearch && matchesCategory && matchesLocation;
    });

    acc[sellerId] = filteredSellerRobots;
    return acc;
  }, {} as { [key: string]: any[] });

  const totalFilteredRobots = Object.values(filteredSellerGroups).reduce((sum, robots) => sum + robots.length, 0);

  return (
    <div className="min-h-screen bg-background">
      <EnhancedHeader />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Industrial Robots</h1>
          <p className="text-xl text-muted-foreground">
            Discover and purchase cutting-edge industrial robots for your automation needs
          </p>
        </div>

        {/* Filters */}
        <div className="bg-card border border-border rounded-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search robots..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* ✅ Dynamic Categories Dropdown */}
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* ✅ Dynamic Locations Dropdown */}
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger>
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((location) => (
                  <SelectItem key={location.value} value={location.value}>
                    {location.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="flex space-x-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {/* ✅ Filter Summary */}
          {!loading && (
            <div className="text-sm text-muted-foreground">
              {categories.length - 1} categories • {locations.length - 1} locations available
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mb-4" />
            <p className="text-muted-foreground">Loading robots and filters...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Bot className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Unable to load robots</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} variant="outline">
              Try Again
            </Button>
          </div>
        ) : Object.keys(filteredSellerGroups).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Bot className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No robots available</h3>
            <p className="text-muted-foreground">
              {searchQuery || selectedCategory !== "all" || selectedLocation !== "all"
                ? "No robots match your current filters."
                : "Robot inventory is currently empty."}
            </p>
          </div>
        ) : (
          <>
            {/* Results */}
            <div className="mb-4">
              <p className="text-sm text-muted-foreground">
                {totalFilteredRobots} {totalFilteredRobots === 1 ? 'robot' : 'robots'} found from {Object.keys(filteredSellerGroups).length} {Object.keys(filteredSellerGroups).length === 1 ? 'seller' : 'sellers'}
                {selectedCategory !== "all" && (
                  <span className="ml-2">
                    • Category: <strong>{categories.find(cat => cat.value === selectedCategory)?.label}</strong>
                  </span>
                )}
                {selectedLocation !== "all" && (
                  <span className="ml-2">
                    • Location: <strong>{locations.find(loc => loc.value === selectedLocation)?.label}</strong>
                  </span>
                )}
              </p>
            </div>
            
            <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
              {Object.entries(filteredSellerGroups).map(([sellerId, sellerRobots]) => (
                <SellerRobotCarousel
                  key={sellerId}
                  sellerRobots={sellerRobots}
                  sellerProfile={sellerProfiles[sellerId]}
                />
              ))}
            </div>

            {/* Load More */}
            {Object.keys(filteredSellerGroups).length > 0 && (
              <div className="text-center mt-8">
                <Button variant="outline" size="lg">
                  Load More Sellers
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Robots;
