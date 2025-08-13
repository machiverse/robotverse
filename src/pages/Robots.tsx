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
              full_name,
              company_name,
              phone,
              mobile_number
            )
          `)
          .eq('availability', 'available')
          .order('created_at', { ascending: false });

        if (robotsError) throw robotsError;
        setRobots(robotsData || []);

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

  // ✅ Enhanced filtering logic for dynamic data
  const filteredRobots = robots.filter((robot) => {
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
        ) : filteredRobots.length === 0 ? (
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
                {filteredRobots.length} {filteredRobots.length === 1 ? 'robot' : 'robots'} found
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
              {filteredRobots.map((robot) => (
                <Card key={robot.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(`/robots/${robot.id}`)}>
                  <CardHeader>
                    <div className="aspect-video bg-muted rounded-lg flex items-center justify-center mb-4">
                      {robot.images && robot.images.length > 0 ? (
                        <img 
                          src={robot.images[0]} 
                          alt={robot.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <Bot className="w-12 h-12 text-muted-foreground" />
                      )}
                    </div>
                    <CardTitle className="text-lg">{robot.name}</CardTitle>
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="w-fit">
                        {robot.robot_type}
                      </Badge>
                      {robot.profiles?.company_name && (
                        <span className="text-xs text-muted-foreground">{robot.profiles.company_name}</span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-primary">
                          {robot.price ? formatPrice(robot.price, robot.currency) : 'Price on Request'}
                        </span>
                        <Badge variant={robot.availability === "available" ? "default" : "secondary"}>
                          {robot.availability}
                        </Badge>
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <MapPin className="w-4 h-4 mr-1" />
                        <span className="text-sm">{robot.location || 'Location not specified'}</span>
                      </div>
                      {robot.model && (
                        <p className="text-sm text-muted-foreground">Model: {robot.model}</p>
                      )}
                      {robot.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{robot.description}</p>
                      )}
                      <div className="flex space-x-2 pt-2" onClick={(e) => e.stopPropagation()}>
  <Button size="sm" className="flex-1" onClick={() => navigate(`/robots/${robot.id}`)}>
    View Details
  </Button>

  {!user ? (
    // Not signed in → direct link to auth page
    <Button asChild variant="outline" size="sm" className="flex-1">
      <a href="https://robotverse.in/auth">
        <MessageCircle className="w-3 h-3 mr-1" />
        Sign in to Contact
      </a>
    </Button>
  ) : (
    // Signed in → run contact logic
    <Button
      variant="outline"
      size="sm"
      className="flex-1"
      onClick={(e) => handleContactSeller(robot, e)}
      disabled={!robot.profiles?.phone && !robot.profiles?.mobile_number}
    >
      <MessageCircle className="w-3 h-3 mr-1" />
      Contact
    </Button>
  )}
</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Load More */}
            {filteredRobots.length > 0 && (
              <div className="text-center mt-8">
                <Button variant="outline" size="lg">
                  Load More Robots
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
