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
import HeroImageSlider, { useHeroSlides } from "@/components/hero/HeroImageSlider";
import HeroWeldSparks from "@/components/hero/HeroWeldSparks";
import HeroEmbers from "@/components/hero/HeroEmbers";
import HeroDepthSlider from "@/components/hero/HeroDepthSlider";
import { Bevel, CornerMarks, DecodeText, PixelArrow, PixelDot } from "@/components/hero/HeroConsole";
import { HERO_SLIDE_MS } from "@/components/hero/HeroImageSlider";

const HERO_TITLE = "Your Complete Robotics Solution";
const HERO_SUBTITLE =
  "Buy Industrial Robots with Spare Parts, Services, Logistics & Finance – All in One Platform";

/** What each hero photograph shows, for the console labels and readout. */
const SLIDE_META = [
  { name: "Arc Welding", code: "WLD", payload: "6–25 kg", reach: "1.4–2.0 m", axes: "6-axis" },
  { name: "Pick & Place", code: "PNP", payload: "3–20 kg", reach: "0.9–1.8 m", axes: "6-axis / Delta" },
  { name: "Palletizing", code: "PAL", payload: "100–800 kg", reach: "2.4–3.2 m", axes: "4 / 6-axis" },
  { name: "Assembly Line", code: "ASM", payload: "10–210 kg", reach: "1.4–2.7 m", axes: "6-axis" },
  { name: "Machine Tending", code: "MTD", payload: "7–35 kg", reach: "0.9–1.8 m", axes: "6-axis" },
] as const;

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

  const meta = SLIDE_META[slideIndex % SLIDE_META.length];
  const pad = (n: number) => String(n).padStart(2, "0");
  const field =
    "h-11 rounded-none border-[hsl(var(--rv-console-line))] bg-[hsl(var(--rv-console-bg)/0.55)] text-sm text-[hsl(var(--rv-console-ink))] placeholder:text-[hsl(var(--rv-console-ink)/0.5)] focus-visible:ring-1 focus-visible:ring-[hsl(var(--rv-console-ink)/0.6)] focus-visible:ring-offset-0";
  const label = "mb-1.5 block font-mono text-[10px] uppercase tracking-[0.16em] text-[hsl(var(--rv-console-ink)/0.6)]";

  return (
    <section className="relative bg-[hsl(var(--rv-console-bg))] p-2.5 md:p-4" aria-label="RobotVerse industrial robot marketplace">
      {/* Console window: the photographs sit inside a cut-corner frame */}
      <div
        className="relative isolate flex min-h-[86vh] flex-col overflow-hidden text-[hsl(var(--rv-console-ink))] md:min-h-[88vh]"
        style={{
          clipPath:
            "polygon(20px 0, calc(100% - 20px) 0, 100% 20px, 100% calc(100% - 20px), calc(100% - 20px) 100%, 20px 100%, 0 calc(100% - 20px), 0 20px)",
        }}
      >
        <HeroImageSlider index={slideIndex} reducedMotion={reducedMotion} />
        {!reducedMotion && <HeroDepthSlider index={slideIndex} />}

        {/* Readability: navy tint rather than black, stronger on the copy side */}
        <div aria-hidden className="pointer-events-none absolute inset-0 z-10 bg-[hsl(222_47%_6%/0.62)] lg:hidden" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 hidden bg-gradient-to-r from-[hsl(222_47%_6%/0.9)] via-[hsl(222_47%_6%/0.45)] to-[hsl(222_47%_6%/0.05)] lg:block"
        />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-40 bg-gradient-to-t from-[hsl(222_47%_6%/0.85)] to-transparent" />

        <HeroWeldSparks active={!reducedMotion && slideIndex === 0} />
        <HeroEmbers />
        <CornerMarks inset={14} className="z-20" />

        {/* Top telemetry line */}
        <div className="relative z-20 flex items-center justify-between gap-4 px-7 pt-7 font-mono text-[11px] uppercase tracking-[0.16em] md:px-10 md:pt-9">
          <span className="flex shrink-0 items-center gap-2 whitespace-nowrap text-[hsl(var(--rv-console-ink)/0.7)]">
            <PixelDot className="text-emerald-400" />
            <span className="hidden sm:inline">RV/Live · </span>{pad(slideIndex + 1)} / {pad(SLIDE_META.length)}
          </span>
          <DecodeText text={`${meta.code} · ${meta.name}`} className="truncate whitespace-nowrap text-[hsl(var(--rv-console-ink))]" />
        </div>

        {/* Copy, search and actions */}
        <div className="relative z-20 flex flex-1 items-center">
          <div className="container mx-auto grid w-full gap-10 px-6 pb-28 pt-10 md:px-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-end lg:pb-32">
            <div className="max-w-3xl">
              <p className="rv-hero-enter mb-5 flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-[hsl(var(--rv-console-ink)/0.75)]" style={enter(0)}>
                <PixelDot />
                India&apos;s industrial robot marketplace
              </p>
              <h1
                className="rv-hero-enter text-[34px] font-semibold uppercase leading-[1.02] tracking-[-0.01em] text-[hsl(var(--rv-console-ink))] sm:text-5xl lg:text-[64px]"
                style={enter(1)}
              >
                {HERO_TITLE}
              </h1>
              <p
                className="rv-hero-enter mt-5 max-w-[56ch] text-base font-light leading-relaxed text-[hsl(var(--rv-console-ink)/0.7)] sm:text-lg"
                style={enter(2)}
              >
                {HERO_SUBTITLE}
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSearch();
                }}
                className="rv-hero-enter mt-8"
                style={enter(3)}
              >
                <Bevel cut={10} fill="hsl(var(--rv-console-bg) / 0.6)" className="backdrop-blur-md">
                  <div className="grid gap-3 p-4 sm:p-5">
                    <div>
                      <label htmlFor="hero-search" className={label}>
                        Search
                      </label>
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--rv-console-ink)/0.55)]" />
                        <Input
                          id="hero-search"
                          aria-label="Search robots, parts, and services"
                          placeholder="Robot model, brand, spare part, service…"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className={`${field} pl-9`}
                        />
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                      <div className="min-w-0">
                        <span className={label}>Category</span>
                        <Select value={selectedCategory} onValueChange={setSelectedCategory} disabled={loading}>
                          <SelectTrigger aria-label="Select category" className={`${field} w-full min-w-0 disabled:opacity-60`}>
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
                      </div>
                      <div className="min-w-0">
                        <span className={label}>Location</span>
                        <Select value={selectedLocation} onValueChange={setSelectedLocation} disabled={loading}>
                          <SelectTrigger aria-label="Select location" className={`${field} w-full min-w-0 disabled:opacity-60`}>
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
                      <Button
                        type="submit"
                        aria-label="Perform search"
                        className="group h-11 rounded-none px-6 font-mono text-xs uppercase tracking-[0.16em] active:scale-[0.98]"
                      >
                        <Search className="mr-2 h-4 w-4" /> Search
                      </Button>
                    </div>
                  </div>
                </Bevel>
              </form>

              <div className="rv-hero-enter mt-6 flex flex-col gap-3 sm:flex-row" style={enter(4)}>
                <Link
                  to="/robots"
                  className="group rounded-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--rv-console-ink))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--rv-console-bg))]"
                >
                  <Bevel cut={8} edge="hsl(var(--rv-console-ink))" fill="hsl(var(--rv-console-ink))">
                    <span className="flex items-center justify-center gap-3 px-7 py-4 font-mono text-xs font-medium uppercase tracking-[0.16em] text-[hsl(var(--rv-console-bg))] transition-opacity duration-150 group-hover:opacity-90 group-active:scale-[0.98]">
                      <PixelArrow /> Explore robots
                    </span>
                  </Bevel>
                </Link>
                <Link
                  to="/auth"
                  className="group rounded-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--rv-console-ink))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--rv-console-bg))]"
                >
                  <Bevel cut={8} fill="hsl(var(--rv-console-bg) / 0.35)" className="backdrop-blur-sm">
                    <span className="flex items-center justify-center gap-3 px-7 py-4 font-mono text-xs font-medium uppercase tracking-[0.16em] text-[hsl(var(--rv-console-ink))] transition-colors duration-150 group-hover:bg-[hsl(var(--rv-console-ink)/0.08)]">
                      <PixelArrow /> Start selling
                    </span>
                  </Bevel>
                </Link>
              </div>
            </div>

            {/* Readout for the robot application in the current photograph */}
            <aside className="hidden lg:block" aria-label="Application shown">
              <Bevel cut={10} fill="hsl(var(--rv-console-bg) / 0.55)" className="backdrop-blur-md">
                <dl className="divide-y divide-[hsl(var(--rv-console-line))] font-mono text-[11px] uppercase tracking-[0.14em]">
                  <div className="flex items-center justify-between px-4 py-3">
                    <dt className="text-[hsl(var(--rv-console-ink)/0.55)]">Application</dt>
                    <dd>
                      <DecodeText text={meta.name} />
                    </dd>
                  </div>
                  {(
                    [
                      ["Typical payload", meta.payload],
                      ["Typical reach", meta.reach],
                      ["Robot type", meta.axes],
                    ] as const
                  ).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between px-4 py-3">
                      <dt className="text-[hsl(var(--rv-console-ink)/0.55)]">{k}</dt>
                      <dd className="tabular-nums">
                        <DecodeText text={v} />
                      </dd>
                    </div>
                  ))}
                  <Link
                    to={`/robots?search=${encodeURIComponent(meta.name.split(" ")[0])}`}
                    className="group flex items-center justify-between px-4 py-3 text-[hsl(var(--rv-console-ink))] transition-colors duration-150 hover:bg-[hsl(var(--rv-console-ink)/0.06)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[hsl(var(--rv-console-ink))]"
                  >
                    Browse {meta.name.toLowerCase()} robots <PixelArrow />
                  </Link>
                </dl>
              </Bevel>
            </aside>
          </div>
        </div>

        {/* Console bar: numbered chapters with the current slide's progress */}
        <nav aria-label="Hero slides" className="absolute inset-x-0 bottom-0 z-20 border-t border-[hsl(var(--rv-console-line))]">
          <ol className="hidden grid-cols-5 md:grid">
            {SLIDE_META.map((m, i) => {
              const on = i === slideIndex;
              return (
                <li key={m.code} className="relative border-l border-[hsl(var(--rv-console-line))] first:border-l-0">
                  <button
                    type="button"
                    onClick={() => setSlideIndex(i)}
                    aria-current={on ? "true" : undefined}
                    className={`flex w-full items-center gap-3 px-5 py-5 text-left font-mono text-[11px] uppercase tracking-[0.16em] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[hsl(var(--rv-console-ink))] ${
                      on ? "text-[hsl(var(--rv-console-ink))]" : "text-[hsl(var(--rv-console-ink)/0.45)] hover:text-[hsl(var(--rv-console-ink)/0.8)]"
                    }`}
                  >
                    <span className="tabular-nums">{pad(i + 1)}</span>
                    <span className="truncate">{m.name}</span>
                  </button>
                  {on && (
                    <span
                      key={slideIndex}
                      aria-hidden
                      className="absolute inset-x-0 bottom-0 h-[2px] origin-left bg-[hsl(var(--rv-console-ink))]"
                      style={reducedMotion ? undefined : { animation: `rv-console-fill ${HERO_SLIDE_MS}ms linear forwards` }}
                    />
                  )}
                </li>
              );
            })}
          </ol>
          {/* Phones: compact counter and square steps */}
          <div className="flex items-center justify-between px-6 py-4 font-mono text-[11px] uppercase tracking-[0.16em] md:hidden">
            <span className="tabular-nums">
              {pad(slideIndex + 1)} / {pad(SLIDE_META.length)} · {meta.name}
            </span>
            <span className="flex gap-1.5">
              {SLIDE_META.map((m, i) => (
                <button
                  key={m.code}
                  type="button"
                  aria-label={`Show slide ${i + 1}: ${m.name}`}
                  aria-current={i === slideIndex ? "true" : undefined}
                  onClick={() => setSlideIndex(i)}
                  className={`h-2 w-2 transition-colors duration-150 ${i === slideIndex ? "bg-[hsl(var(--rv-console-ink))]" : "bg-[hsl(var(--rv-console-ink)/0.25)]"}`}
                />
              ))}
            </span>
          </div>
        </nav>
      </div>
    </section>
  );
};

export default EnhancedHero;
