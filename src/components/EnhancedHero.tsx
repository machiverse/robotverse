import { useEffect, useState } from "react";
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
import HeroImageSlider, { HERO_SLIDES, useHeroSlides } from "@/components/hero/HeroImageSlider";
import HeroWeldSparks from "@/components/hero/HeroWeldSparks";
import HeroEmbers from "@/components/hero/HeroEmbers";

const HERO_TITLE = "Your Complete Robotics Solution";
const HERO_SUBTITLE =
  "Buy Industrial Robots with Spare Parts, Services, Logistics & Finance – All in One Platform";

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
  const { index: slideIndex, setIndex: setSlideIndex, reducedMotion } = useHeroSlides();

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
    <section className="relative isolate flex w-full items-center overflow-hidden min-h-[80vh] pt-24 pb-20 md:min-h-[88vh] lg:min-h-[92vh] lg:pt-28 lg:pb-24">
      {/* Full-bleed photographic industrial robot slideshow */}
      <HeroImageSlider index={slideIndex} reducedMotion={reducedMotion} />

      {/* Readability overlays */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-r from-black/80 via-black/40 to-black/5"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 h-32 bg-gradient-to-t from-background to-transparent"
      />

      {/* Weld spatter overlay, active on the welding slide only */}
      <HeroWeldSparks active={!reducedMotion && slideIndex === 0} />

      {/* Screen-wide ambient ember drift (above overlays, below copy) */}
      <HeroEmbers />

      {/* Slide indicators — bottom-right, desktop only */}
      {!reducedMotion && (
        <div className="absolute bottom-8 right-6 z-20 hidden items-center gap-2 md:flex lg:right-10">
          {HERO_SLIDES.map((slide, i) => (
            <button
              key={slide.src}
              type="button"
              aria-label={`Show slide ${i + 1}`}
              aria-current={i === slideIndex}
              onClick={() => setSlideIndex(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === slideIndex ? "w-7 bg-white/70" : "w-1.5 bg-white/30 hover:bg-white/50"
              }`}
            />
          ))}
        </div>
      )}


      <div className="container relative z-20 mx-auto w-full px-4">
        <div className="max-w-4xl">
          <h1
            className="rv-hero-enter text-3xl font-bold leading-[1.05] tracking-[-0.03em] text-white sm:text-5xl lg:text-7xl"
            style={enter(0)}
          >
            {HERO_TITLE}
          </h1>
          <p
            className="rv-hero-enter mt-4 max-w-[58ch] text-lg leading-[1.55] text-white/80 lg:text-xl"
            style={enter(1)}
          >
            {HERO_SUBTITLE}
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="mt-6 w-full rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-md"
          >
            <div className="grid grid-cols-1 gap-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/70" />
                <Input
                  aria-label="Search robots, parts, and services"
                  placeholder="Search robots, parts, services..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-11 rounded-xl border-white/25 bg-white/15 pl-9 text-sm text-white placeholder:text-white/60 focus-visible:ring-white/40"
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
                    className="h-11 rounded-xl border-white/25 bg-white/15 text-sm text-white disabled:opacity-60"
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
                    className="h-11 rounded-xl border-white/25 bg-white/15 text-sm text-white disabled:opacity-60"
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

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <Button
              size="lg"
              className="h-auto bg-white px-6 py-3 text-base text-neutral-900 hover:bg-white/90"
              asChild
            >
              <Link to="/robots">Explore Robots</Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-auto border-white/40 bg-transparent px-6 py-3 text-base text-white hover:bg-white/10 hover:text-white"
              asChild
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
