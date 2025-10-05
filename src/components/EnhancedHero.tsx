import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import industrialRobotHero from "@/assets/industrial-robot-hero.jpg";

interface HeroContent {
  title: string;
  subtitle: string;
  image: string;
}

const heroContent: HeroContent = {
  title: "Your Complete Robotics Solution",
  subtitle:
    "Buy Industrial Robots with Spare Parts, Services, Logistics & Finance – All in One Platform",
  image: industrialRobotHero,
};

const EnhancedHero = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All Categories");
  const [selectedLocation, setSelectedLocation] = useState<string>("All Locations");

  const [categories, setCategories] = useState<string[]>(["All Categories"]);
  const [locations, setLocations] = useState<string[]>(["All Locations"]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        setLoading(true);

        // Fetch robot_type and location fields for all robots (add .limit() if dataset is very large)
        const { data: robotsData, error } = await supabase
          .from("robots")
          .select("robot_type, location")
          .neq("robot_type", null)
          .neq("location", null);

        if (error) throw error;

        // Extract unique robot types (categories)
        const uniqueTypes = Array.from(
          new Set(robotsData?.map((r) => r.robot_type).filter(Boolean))
        );

        // Extract unique locations (only take first segment before comma, trimmed)
        const uniqueLocationsSet = new Set<string>();
        robotsData?.forEach((r) => {
          if (r.location) {
            uniqueLocationsSet.add(r.location.split(",")[0].trim());
          }
        });

        setCategories(["All Categories", ...uniqueTypes]);
        setLocations(["All Locations", ...Array.from(uniqueLocationsSet)]);
      } catch (error) {
        console.error("Failed to fetch filter data:", error);
        // fallback to static defaults on error
        setCategories([
          "All Categories",
          "Industrial Robots",
          "Articulated Robots",
          "SCARA Robots",
          "Delta Robots",
          "Collaborative Robots",
          "Spare Parts",
        ]);
        setLocations([
          "All Locations",
          "Mumbai",
          "Delhi",
          "Bangalore",
          "Chennai",
          "Pune",
          "Hyderabad",
          "Kolkata",
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchFilters();
  }, []);

  const handleSearch = () => {
    const params = new URLSearchParams();

    if (searchQuery.trim()) params.set("search", searchQuery.trim());
    if (selectedCategory !== "All Categories") params.set("category", selectedCategory);
    if (selectedLocation !== "All Locations") params.set("location", selectedLocation);

    navigate(`/robots?${params.toString()}`);
  };

  return (
    <section className="relative min-h-[600px] md:min-h-screen flex items-center bg-gradient-hero overflow-hidden py-12 md:py-0">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={heroContent.image}
          alt={heroContent.title}
          className="w-full h-full object-cover rounded-lg opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/50 to-transparent" />
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-5xl">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 md:mb-6 leading-tight">
            {heroContent.title}
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground mb-6 md:mb-8 max-w-3xl">
            {heroContent.subtitle}
          </p>

          {/* Advanced Search */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="bg-card/80 backdrop-blur-sm border border-border rounded-xl md:rounded-2xl p-4 sm:p-5 md:p-6 mb-6 md:mb-8 max-w-4xl"
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4">
              {/* Search Input */}
              <div className="md:col-span-2 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
                <Input
                  aria-label="Search robots, parts, and services"
                  placeholder="Search robots, parts, services..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 md:pl-10 h-10 md:h-12 text-sm md:text-base bg-input border-border"
                />
              </div>

              {/* Category Select */}
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
                disabled={loading}
              >
                <SelectTrigger
                  aria-label="Select category"
                  className="h-10 md:h-12 bg-input border-border text-sm md:text-base"
                >
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Location Select */}
              <Select
                value={selectedLocation}
                onValueChange={setSelectedLocation}
                disabled={loading}
              >
                <SelectTrigger
                  aria-label="Select location"
                  className="h-10 md:h-12 bg-input border-border text-sm md:text-base"
                >
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location} value={location}>
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search Button */}
            <Button
              type="submit"
              className="w-full mt-3 md:mt-4 h-10 md:h-12 text-sm md:text-base bg-primary hover:bg-primary-glow"
              aria-label="Perform search"
              disabled={loading}
            >
              <Search className="w-4 h-4 md:w-5 md:h-5 mr-2" /> Search
            </Button>
          </form>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mb-8 md:mb-12">
            <Button
              variant="hero"
              size="lg"
              className="text-base md:text-lg px-6 md:px-8 py-3 md:py-4 h-auto"
              asChild
              disabled={loading}
            >
              <Link to="/robots">Explore Robots</Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="text-base md:text-lg px-6 md:px-8 py-3 md:py-4 h-auto"
              asChild
              disabled={loading}
            >
              <Link to="/auth">Start Selling</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EnhancedHero;
