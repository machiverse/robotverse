import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Eye, MapPin, Calendar, TrendingUp, Building, Package, Star, Zap, MessageSquare, Bot, ArrowRight } from "lucide-react";
import { useViewTracking } from "@/hooks/useViewTracking";
import ViewCountDisplay from "@/components/ViewCountDisplay";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface Robot {
  id: string;
  name: string;
  model: string;
  category: string;
  type: string;
  condition: string;
  location: string;
  price?: string;
  availability: string;
  image_url?: string;
  company_name?: string;
  created_at?: string;
  seller_id: string;
  seller_profile?: {
    company_name?: string;
    full_name?: string;
    phone?: string;
    mobile_number?: string;
  };
}

const RobotListings = () => {
  const [robots, setRobots] = useState<Robot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedCompany, setSelectedCompany] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("views");
  const [showAll, setShowAll] = useState(false);
  const { user } = useAuth();

  const { toast } = useToast();
  const navigate = useNavigate();
  const { getItemViewCount } = useViewTracking();
  const [viewCounts, setViewCounts] = useState<{ [key: string]: number }>({});

  // Fetch robots data
  useEffect(() => {
    const fetchRobots = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from("robots")
          .select(`
            *,
            profiles!robots_seller_id_fkey (
              company_name,
              full_name,
              phone,
              mobile_number
            )
          `)
          .eq("availability", "available")
          .order("created_at", { ascending: false });

        if (error) throw error;

        const robotsData = (data || []).map((robot: any) => ({
          ...robot,
          seller_profile: robot.profiles
        }));

        setRobots(robotsData);
        
        // Fetch view counts for all robots
        const counts: { [key: string]: number } = {};
        for (const robot of robotsData) {
          try {
            const count = await getItemViewCount('robots', robot.id);
            counts[robot.id] = count;
          } catch (error) {
            console.error('Error fetching view count for robot:', robot.id, error);
            counts[robot.id] = 0;
          }
        }
        setViewCounts(counts);
      } catch (err) {
        console.error("Error fetching robots:", err);
        setError("Failed to load robots. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchRobots();
  }, [getItemViewCount]);

  // Memoized filter options
  const { 
    categories, 
    companies
  } = useMemo(() => {
    const categories = Array.from(new Set(robots.map(robot => robot.category).filter(Boolean)));
    const companies = Array.from(new Set(robots.map(robot => robot.company_name || robot.seller_profile?.company_name).filter(Boolean)));
    
    return {
      categories: categories.sort(),
      companies: companies.sort()
    };
  }, [robots]);

  // Get filtered and sorted robots
  const filteredRobots = useMemo(() => {
    let filtered = robots.filter(robot => {
      const matchesSearch = robot.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          robot.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (robot.company_name || robot.seller_profile?.company_name || "").toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === "all" || robot.category === selectedCategory;
      const matchesCompany = selectedCompany === "all" || 
                           robot.company_name === selectedCompany || 
                           robot.seller_profile?.company_name === selectedCompany;
      
      return matchesSearch && matchesCategory && matchesCompany;
    });

    // Sort by views (highest first) by default, then by other criteria
    filtered.sort((a, b) => {
      const aViews = viewCounts[a.id] || 0;
      const bViews = viewCounts[b.id] || 0;
      
      if (sortBy === "views") {
        return bViews - aViews;
      } else if (sortBy === "price") {
        return parseFloat(a.price || "0") - parseFloat(b.price || "0");
      } else if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      } else if (sortBy === "date") {
        return new Date(b.created_at || "").getTime() - new Date(a.created_at || "").getTime();
      }
      
      return bViews - aViews; // Default to views
    });

    // Limit to top 8 robots if not showing all
    return showAll ? filtered : filtered.slice(0, 8);
  }, [robots, searchTerm, selectedCategory, selectedCompany, sortBy, viewCounts, showAll]);

  const formatPrice = (price: string | undefined) => {
    if (!price) return "Price on request";
    const num = parseFloat(price);
    if (isNaN(num)) return "Price on request";
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(num);
  };

  const handleContactSeller = (robot: Robot) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to contact sellers.",
        variant: "destructive",
      });
      return;
    }
    // Add contact logic here
    toast({
      title: "Contact Request",
      description: `Contacting seller for ${robot.name}`,
    });
  };

  const handleAIAnalysis = (robot: Robot) => {
    if (!user) {
      toast({
        title: "Authentication Required", 
        description: "Please sign in to use AI analysis.",
        variant: "destructive",
      });
      return;
    }
    // Add AI analysis logic here
    toast({
      title: "AI Analysis",
      description: `Running AI analysis for ${robot.name}`,
    });
  };

  if (loading) {
    return (
      <section className="py-16 bg-gradient-to-br from-background via-muted/20 to-background">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading robots...</p>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-16 bg-gradient-to-br from-background via-muted/20 to-background">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <p className="text-destructive">{error}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-gradient-to-br from-background via-muted/20 to-background">
      <div className="container mx-auto px-4">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            {showAll ? "All Industrial Robots" : "Top Viewed Robots"}
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            {showAll ? "Browse our complete collection of industrial robots" : "Discover the most popular industrial robots from verified sellers"}
          </p>
        </div>

        {showAll && (
          /* Filters Section for All View */
          <div className="mb-8 p-6 bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 shadow-lg">
            <div className="flex flex-wrap gap-4 items-center">
              {/* Search */}
              <div className="flex-1 min-w-[250px]">
                <Input
                  placeholder="Search robots, models, or companies..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>

              {/* Category Filter */}
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Company Filter */}
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Companies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  {companies.map((company) => (
                    <SelectItem key={company} value={company}>
                      {company}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Sort By */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="views">Most Viewed</SelectItem>
                  <SelectItem value="price">Price: Low to High</SelectItem>
                  <SelectItem value="name">Name A-Z</SelectItem>
                  <SelectItem value="date">Newest First</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Results Summary */}
        <div className="mb-6 flex justify-between items-center">
          <p className="text-muted-foreground">
            Showing {filteredRobots.length} robots
          </p>
          {!showAll && filteredRobots.length >= 8 && (
            <Button 
              onClick={() => setShowAll(true)}
              variant="outline"
              className="gap-2"
            >
              View All Robots
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
          {showAll && (
            <Button 
              onClick={() => setShowAll(false)}
              variant="outline"
            >
              Show Top 8 Only
            </Button>
          )}
        </div>

        {/* Robot Carousel/Grid */}
        {showAll ? (
          /* Grid View for All Robots */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredRobots.map((robot) => (
              <RobotCard key={robot.id} robot={robot} />
            ))}
          </div>
        ) : (
          /* Carousel View for Top Robots */
          <Carousel className="w-full">
            <CarouselContent className="-ml-1">
              {filteredRobots.map((robot) => (
                <CarouselItem 
                  key={robot.id} 
                  className="pl-1 basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4"
                >
                  <RobotCard robot={robot} />
                </CarouselItem>
              ))}
            </CarouselContent>
            {filteredRobots.length > 4 && (
              <>
                <CarouselPrevious />
                <CarouselNext />
              </>
            )}
          </Carousel>
        )}

        {filteredRobots.length === 0 && (
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No robots found</h3>
            <p className="text-muted-foreground">
              Try adjusting your filters to see more results.
            </p>
          </div>
        )}
      </div>
    </section>
  );

  // Robot Card Component
  function RobotCard({ robot }: { robot: Robot }) {
    return (
      <Card 
        className="group hover:shadow-xl transition-all duration-300 cursor-pointer h-full bg-card/60 backdrop-blur-sm border-border/50 hover:border-primary/30"
        onClick={() => navigate(`/robot/${robot.id}`)}
      >
        <CardHeader className="pb-3">
          <div className="aspect-video relative overflow-hidden rounded-lg bg-muted">
            {robot.image_url ? (
              <img
                src={robot.image_url}
                alt={robot.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                <Package className="h-16 w-16 text-muted-foreground/50" />
              </div>
            )}
            
            {/* Quick action badges */}
            <div className="absolute top-2 right-2 flex gap-1">
              {robot.availability === "available" && (
                <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
                  Available
                </Badge>
              )}
              <ViewCountDisplay targetType="robots" targetId={robot.id} />
            </div>
          </div>

          <div className="space-y-2">
            <CardTitle className="text-lg group-hover:text-primary transition-colors">
              {robot.name}
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building className="h-4 w-4" />
              <span>{robot.company_name || robot.seller_profile?.company_name || "Company"}</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0 space-y-4">
          {/* Robot Details */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Model:</span>
              <span className="font-medium">{robot.model}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type:</span>
              <span className="font-medium">{robot.type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Condition:</span>
              <Badge variant={robot.condition === "new" ? "default" : "secondary"}>
                {robot.condition}
              </Badge>
            </div>
          </div>

          {/* Location & Date */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              <span>{robot.location}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{new Date(robot.created_at || "").toLocaleDateString()}</span>
            </div>
          </div>

          {/* Price */}
          <div className="text-2xl font-bold text-primary">
            {formatPrice(robot.price)}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              disabled={!user}
              onClick={(e) => {
                e.stopPropagation();
                handleContactSeller(robot);
              }}
            >
              <MessageSquare className="h-4 w-4 mr-1" />
              Contact
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              disabled={!user}
              onClick={(e) => {
                e.stopPropagation();
                handleAIAnalysis(robot);
              }}
            >
              <Bot className="h-4 w-4" />
            </Button>
          </div>
          {!user && (
            <p className="text-xs text-muted-foreground text-center">
              Sign in to contact sellers and use AI analysis
            </p>
          )}
        </CardContent>
      </Card>
    );
  }
};

export default RobotListings;