import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Bot, MapPin, Search, Grid, List, MessageCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import EnhancedHeader from "@/components/EnhancedHeader";

const Robots = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [categories, setCategories] = useState([{ value: "all", label: "All Categories" }]);
  const [locations, setLocations] = useState([{ value: "all", label: "All Locations" }]);
  const [robots, setRobots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ Fetch robots and populate filters
  useEffect(() => {
    const fetchRobotsAndFilters = async () => {
      try {
        setLoading(true);
        const { data: robotsData, error: robotsError } = await supabase
          .from("robots")
          .select(`
            *,
            profiles!robots_seller_id_fkey (
              full_name,
              company_name,
              phone,
              mobile_number
            )
          `)
          .eq("availability", "available")
          .order("created_at", { ascending: false });

        if (robotsError) throw robotsError;

        setRobots(robotsData || []);

        // Unique categories
        const uniqueCategories = new Set<string>();
        robotsData?.forEach((robot) => {
          if (robot.robot_type) uniqueCategories.add(robot.robot_type);
          if (robot.category_tags?.length) {
            robot.category_tags.forEach((tag: string) => {
              if (tag.trim()) uniqueCategories.add(tag.trim());
            });
          }
        });

        setCategories([
          { value: "all", label: "All Categories" },
          ...Array.from(uniqueCategories).sort().map((category) => ({
            value: category.toLowerCase().replace(/\s+/g, "-"),
            label: category,
          })),
        ]);

        // Unique locations
        const uniqueLocations = new Set<string>();
        robotsData?.forEach((robot) => {
          if (robot.location) uniqueLocations.add(robot.location.trim());
        });

        setLocations([
          { value: "all", label: "All Locations" },
          ...Array.from(uniqueLocations).sort().map((location) => ({
            value: location.toLowerCase().replace(/\s+/g, "-"),
            label: location,
          })),
        ]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load robots");
        setRobots([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRobotsAndFilters();
  }, []);

  // ✅ Format price helper
  const formatPrice = (price: number, currency: string) => {
    const currencySymbol =
      currency === "USD" ? "$" : currency === "EUR" ? "€" : "₹";
    return `${currencySymbol}${price.toLocaleString()}`;
  };

  // ✅ Handle Contact Seller
  const handleContactSeller = (robot: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const phone = robot.profiles?.phone || robot.profiles?.mobile_number;
    if (!phone) {
      alert("Contact information not available");
      return;
    }
    const phoneNumber = phone.replace(/\D/g, "");
    const message = `Hi! I'm interested in your robot: ${robot.name} (${robot.model}). Can you please provide more details?`;
    window.open(
      `https://wa.me/91${phoneNumber}?text=${encodeURIComponent(message)}`,
      "_blank"
    );
  };

  // ✅ Filtered robots list
  const filteredRobots = robots.filter((robot) => {
    const matchesSearch =
      robot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      robot.model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      robot.robot_type?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === "all" ||
      categories.find((cat) => cat.value === selectedCategory)?.label?.toLowerCase() ===
        robot.robot_type?.toLowerCase() ||
      (robot.category_tags &&
        robot.category_tags.some(
          (tag: string) =>
            tag.toLowerCase() ===
            categories.find((cat) => cat.value === selectedCategory)?.label?.toLowerCase()
        ));

    const matchesLocation =
      selectedLocation === "all" ||
      locations.find((loc) => loc.value === selectedLocation)?.label?.toLowerCase() ===
        robot.location?.toLowerCase();

    return matchesSearch && matchesCategory && matchesLocation;
  });

  // ✅ Group robots by company
  const robotsByCompany = filteredRobots.reduce((acc: any, robot) => {
    const company = robot.profiles?.company_name || "Unknown Company";
    if (!acc[company]) acc[company] = [];
    acc[company].push(robot);
    return acc;
  }, {});
  const uniqueCompanyRobots = Object.keys(robotsByCompany).map(
    (company) => robotsByCompany[company][0]
  );

  return (
    <div className="min-h-screen bg-background">
      <EnhancedHeader />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <h1 className="text-4xl font-bold mb-2">Industrial Robots</h1>
        <p className="text-xl text-muted-foreground mb-6">
          Discover and purchase cutting-edge industrial robots for your automation needs.
        </p>

        {/* Total Robots */}
        <div className="mb-6 text-lg font-semibold text-primary">
          Total Available Robots: {robots.length}
        </div>

        {/* Filters */}
        <div className="bg-card border border-border rounded-lg p-6 mb-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search robots..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Categories */}
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

          {/* Locations */}
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

          {/* View Mode */}
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

        {/* Loading/Error */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : uniqueCompanyRobots.length === 0 ? (
          <p>No robots found.</p>
        ) : (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                : "space-y-4"
            }
          >
            {uniqueCompanyRobots.map((robot) => {
              const companyName =
                robot.profiles?.company_name || "Unknown Company";
              return (
                <Card
                  key={robot.id}
                  className="hover:shadow-lg transition-shadow"
                >
                  <CardHeader
                    onClick={() => navigate(`/robots/${robot.id}`)}
                    className="cursor-pointer"
                  >
                    {/* Main Image */}
                    <div className="w-full h-48 bg-muted rounded-lg overflow-hidden">
                      {robot.images?.length > 0 ? (
                        <img
                          src={`${robot.images[0]}?q=80&auto=format`}
                          alt={robot.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Bot className="w-12 h-12 text-muted-foreground" />
                      )}
                    </div>
                    <CardTitle className="mt-2">{robot.name}</CardTitle>
                    <div className="text-xs text-muted-foreground">
                      {companyName}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Price + Contact */}
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-bold text-primary">
                        {robot.price
                          ? formatPrice(robot.price, robot.currency)
                          : "Price on Request"}
                      </span>
                      {!user ? (
                        <Button asChild variant="outline" size="sm">
                          <a href="https://robotverse.in/auth">
                            <MessageCircle className="w-3 h-3 mr-1" />
                            Sign in to Contact
                          </a>
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => handleContactSeller(robot, e)}
                        >
                          <MessageCircle className="w-3 h-3 mr-1" />
                          Contact
                        </Button>
                      )}
                    </div>

                    {/* Other Robots from Same Company */}
                    {robotsByCompany[companyName].length > 1 && (
                      <div className="flex space-x-4 overflow-x-auto mt-2 scrollbar-hide">
                        {robotsByCompany[companyName]
                          .filter((r) => r.id !== robot.id)
                          .map((r) => (
                            <img
                              key={r.id}
                              src={r.images?.[0] || "/placeholder.png"}
                              alt={r.name}
                              className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                              onClick={() => navigate(`/robots/${r.id}`)}
                            />
                          ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Robots;
