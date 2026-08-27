import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import HeroRobotAnimation from "@/components/hero/HeroRobotAnimation";

interface HeroSlide {
  eyebrow: string;
  title: string;
  subtitle: string;
  cta: { label: string; href: string };
}

const SLIDES: HeroSlide[] = [
  {
    eyebrow: "Industrial Robotics Marketplace",
    title: "Your Complete Robotics Solution",
    subtitle:
      "Buy Industrial Robots with Spare Parts, Services, Logistics & Finance – All in One Platform",
    cta: { label: "Explore Robots", href: "/robots" },
  },
  {
    eyebrow: "New • Used • Refurbished",
    title: "Verified Industrial Robots, Ready to Deploy",
    subtitle:
      "FANUC, ABB, KUKA, Yaskawa and more — inspected, condition-graded and available across India.",
    cta: { label: "Browse Inventory", href: "/robots" },
  },
  {
    eyebrow: "Spare Parts",
    title: "Every Part. Every Controller Generation.",
    subtitle:
      "Servo motors, teach pendants, drives, cables and boards for current and legacy controllers.",
    cta: { label: "Find Spare Parts", href: "/parts" },
  },
  {
    eyebrow: "Service & Integration",
    title: "Installation, Retrofit and AMC Support",
    subtitle:
      "Connect with certified integrators and service engineers for commissioning, programming and maintenance.",
    cta: { label: "Find Service Providers", href: "/services" },
  },
  {
    eyebrow: "Live Auctions",
    title: "Bid on Robots at Real Market Value",
    subtitle: "Transparent, time-bound auctions on surplus and plant-closure inventory.",
    cta: { label: "View Auctions", href: "/auctions" },
  },
  {
    eyebrow: "Logistics & Finance",
    title: "Shipped, Insured and Financed",
    subtitle:
      "Rigging, transport and equipment financing arranged end to end, so the robot lands ready to run.",
    cta: { label: "Explore Financing", href: "/financing" },
  },
];

const SLIDE_MS = 6000;

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

  const reducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const [current, setCurrent] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const timerKey = useRef(0);
  const [tick, setTick] = useState(0);

  const paused = hovered || focusWithin || tabHidden || reducedMotion;

  const goTo = useCallback((index: number) => {
    setCurrent(((index % SLIDES.length) + SLIDES.length) % SLIDES.length);
    timerKey.current += 1;
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    const onVisibility = () => setTabHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    if (paused) return;
    const id = window.setTimeout(() => {
      setCurrent((i) => (i + 1) % SLIDES.length);
    }, SLIDE_MS);
    return () => window.clearTimeout(id);
  }, [paused, current, tick]);

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      goTo(current + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      goTo(current - 1);
    }
  };

  const slide = SLIDES[current];

  return (
    <section
      className="relative flex w-full items-center overflow-hidden min-h-[80vh] pt-24 pb-20 md:min-h-[88vh] lg:min-h-[92vh] lg:pt-28 lg:pb-24"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocusWithin(true)}
      onBlur={() => setFocusWithin(false)}
      onKeyDown={handleKeyDown}
    >
      {/* Full-bleed real-time 3D industrial robot background (never remounts) */}
      <HeroRobotAnimation />

      {/* Readability overlays */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-r from-black/80 via-black/40 to-black/5"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 h-32 bg-gradient-to-t from-background to-transparent"
      />

      <div className="container relative z-20 mx-auto w-full px-4">
        <div className="max-w-2xl">
          <div
            role="region"
            aria-roledescription="carousel"
            aria-label="RobotVerse highlights"
          >
            <div
              aria-live="polite"
              className="min-h-[188px] sm:min-h-[248px] lg:min-h-[300px]"
            >
              {SLIDES.map((s, i) => {
                const active = i === current;
                if (!active) {
                  return <div key={s.title} aria-hidden="true" className="hidden" />;
                }
                return (
                  <div key={s.title} aria-hidden={false}>
                    <p
                      className="rv-slide-in text-xs font-semibold uppercase tracking-[0.18em] text-white/70"
                      style={enter(0)}
                    >
                      {s.eyebrow}
                    </p>
                    <h1
                      className="rv-slide-in mt-3 text-3xl font-bold leading-[1.05] tracking-[-0.03em] text-white sm:text-5xl lg:text-6xl"
                      style={enter(1)}
                    >
                      {s.title}
                    </h1>
                    <p
                      className="rv-slide-in mt-4 max-w-[52ch] text-base leading-[1.55] text-white/80 sm:text-lg lg:text-xl"
                      style={enter(2)}
                    >
                      {s.subtitle}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

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
              <Link to={slide.cta.href}>{slide.cta.label}</Link>
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

          {/* Progress dots */}
          <div className="mt-6 flex items-center gap-2">
            {SLIDES.map((s, i) => {
              const active = i === current;
              return (
                <button
                  key={s.title}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  aria-current={active}
                  className={
                    active
                      ? "relative h-1.5 w-10 overflow-hidden rounded-full bg-white/25"
                      : "h-1.5 w-1.5 rounded-full bg-white/35 transition-colors hover:bg-white/60"
                  }
                >
                  {active && (
                    <span
                      key={`${i}-${tick}`}
                      data-paused={paused}
                      className="rv-dot-fill absolute inset-0 block rounded-full bg-white"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Prev / Next arrows — desktop only, clear of the search panel */}
      <div className="pointer-events-none absolute inset-y-0 right-6 z-20 hidden items-center gap-3 lg:flex">
        <button
          type="button"
          onClick={() => goTo(current - 1)}
          aria-label="Previous slide"
          className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white/80 backdrop-blur-sm transition-colors hover:bg-white/20 hover:text-white"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => goTo(current + 1)}
          aria-label="Next slide"
          className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white/80 backdrop-blur-sm transition-colors hover:bg-white/20 hover:text-white"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </section>
  );
};

export default EnhancedHero;
