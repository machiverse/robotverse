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
import RobotArmStage from "@/components/hero/RobotArmStage";

const heroContent = {
  title: "Your Complete Robotics Solution",
  subtitle:
    "Buy Industrial Robots with Spare Parts, Services, Logistics & Finance – All in One Platform",
};

/** Fade + 8px rise, 60ms stagger, once on mount. */
const enter = (index: number) => ({
  animationDelay: `${index * 60}ms`,
});

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

        // Fetch robot_type and location fields for all robots
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

        // Fetch unique cities from profiles (normalized, case-insensitive)
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("city")
          .eq("registration_complete", true)
          .not("city", "is", null);

        const citySet = new Set<string>();
        if (!profilesError && profilesData) {
          profilesData.forEach((p) => {
            if (p.city && p.city.trim()) {
              // Normalize: title case
              const normalized = p.city.trim().toLowerCase();
              const titleCase = normalized.charAt(0).toUpperCase() + normalized.slice(1);
              citySet.add(titleCase);
            }
          });
        }

        // Also extract from robot locations as fallback
        robotsData?.forEach((r) => {
          if (r.location) {
            const normalized = r.location.split(",")[0].trim().toLowerCase();
            const titleCase = normalized.charAt(0).toUpperCase() + normalized.slice(1);
            citySet.add(titleCase);
          }
        });

        setCategories(["All Categories", ...uniqueTypes]);
        setLocations(["All Locations", ...Array.from(citySet).sort()]);
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
    <section className="relative overflow-hidden bg-background pt-20 pb-10 lg:pt-24 lg:pb-16">
      {/* The one gradient on the page: a very subtle radial behind the arm. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 72% 45%, hsl(var(--primary)/0.12), transparent 62%)",
        }}
      />

      <div className="container relative z-10 mx-auto px-4">
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-6">
          {/* 3D stage — above the copy on small screens, right-bleeding on lg+ */}
          <div className="order-2 lg:order-2 lg:col-span-7">
            <div className="h-[320px] w-full lg:h-[520px] lg:-mr-[max(0px,calc((100vw-100%)/2))]">
              <RobotArmStage />
            </div>
          </div>

          {/* Copy + search */}
          <div className="order-1 lg:order-1 lg:col-span-5">
            <h1
              className="rv-hero-enter text-5xl font-semibold leading-[1.05] tracking-[-0.03em] text-foreground lg:text-[64px]"
              style={enter(0)}
            >
              {heroContent.title}
            </h1>

            <p
              className="rv-hero-enter mt-5 max-w-[52ch] text-lg leading-[1.55] text-muted-foreground"
              style={enter(1)}
            >
              {heroContent.subtitle}
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSearch();
              }}
              className="rv-hero-enter mt-8 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-md)]"
              style={enter(2)}
            >
              <div className="grid grid-cols-1 gap-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    aria-label="Search robots, parts, and services"
                    placeholder="Search robots, parts, services..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-11 rounded-xl border-border bg-input pl-9 text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Select
                    value={selectedCategory}
                    onValueChange={setSelectedCategory}
                    disabled={loading}
                  >
                    <SelectTrigger
                      aria-label="Select category"
                      className="h-11 rounded-xl border-border bg-input text-sm disabled:opacity-60"
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

                  <Select
                    value={selectedLocation}
                    onValueChange={setSelectedLocation}
                    disabled={loading}
                  >
                    <SelectTrigger
                      aria-label="Select location"
                      className="h-11 rounded-xl border-border bg-input text-sm disabled:opacity-60"
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

                <Button type="submit" className="h-11 w-full rounded-xl text-sm" aria-label="Perform search">
                  <Search className="mr-2 h-4 w-4" /> Search
                </Button>
              </div>
            </form>

            <div
              className="rv-hero-enter mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4"
              style={enter(3)}
            >
              <Button variant="default" size="lg" className="h-auto px-6 py-3 text-base" asChild>
                <Link to="/robots">Explore Robots</Link>
              </Button>
              <Button variant="link" size="sm" className="text-sm text-foreground" asChild>
                <Link to="/auth">Start Selling</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EnhancedHero;
