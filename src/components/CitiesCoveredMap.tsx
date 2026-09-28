import { useEffect, useState, useMemo, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, MapPin, Building2, Filter } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Toggle } from "@/components/ui/toggle";
import "leaflet/dist/leaflet.css";
import { CornerMarks } from "@/components/hero/HeroConsole";
import { BevelBox, Readout, SectionHead } from "@/components/console/ConsoleUI";

// Fix default marker icon issue with bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

type CategoryKey = "robot_seller" | "spare_parts_eoat" | "integrator_service";

interface CategoryConfig {
  key: CategoryKey;
  label: string;
  color: string;
  hsl: string;
}

const CATEGORIES: CategoryConfig[] = [
  { key: "robot_seller", label: "Robot Seller", color: "#ef4444", hsl: "hsl(0,84%,60%)" },
  { key: "spare_parts_eoat", label: "Spare Parts + EOAT", color: "#3b82f6", hsl: "hsl(217,91%,60%)" },
  { key: "integrator_service", label: "Integrator + Service", color: "#22c55e", hsl: "hsl(142,71%,45%)" },
];

interface CityCategoryData {
  city: string;
  lat: number;
  lng: number;
  robot_seller: number;
  spare_parts_eoat: number;
  integrator_service: number;
  total: number;
}

const createCategoryPinIcon = (color: string) =>
  L.divIcon({
    className: "custom-pin-marker",
    html: `<div style="position:relative;width:24px;height:34px">
      <svg width="24" height="34" viewBox="0 0 24 34" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 22 12 22s12-13 12-22C24 5.373 18.627 0 12 0z" fill="${color}"/>
        <circle cx="12" cy="12" r="5" fill="white"/>
      </svg>
    </div>`,
    iconSize: [24, 34],
    iconAnchor: [12, 34],
    popupAnchor: [0, -34],
  });

const PIN_ICONS: Record<CategoryKey, L.DivIcon> = {
  robot_seller: createCategoryPinIcon("#ef4444"),
  spare_parts_eoat: createCategoryPinIcon("#3b82f6"),
  integrator_service: createCategoryPinIcon("#22c55e"),
};

// Offset positions so multiple pins at the same city don't stack
const PIN_OFFSETS: Record<number, { lat: number; lng: number }[]> = {
  1: [{ lat: 0, lng: 0 }],
  2: [{ lat: 0.08, lng: -0.08 }, { lat: -0.08, lng: 0.08 }],
  3: [{ lat: 0.1, lng: 0 }, { lat: -0.05, lng: -0.09 }, { lat: -0.05, lng: 0.09 }],
};

const FitBoundsToMarkers = ({ locations }: { locations: CityCategoryData[] }) => {
  const map = useMap();
  useEffect(() => {
    if (!locations.length) return;
    const bounds = L.latLngBounds(locations.map((l) => [l.lat, l.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 6 });
  }, [locations, map]);
  return null;
};

// India-only city coordinates
const INDIA_CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  bangalore: { lat: 12.9716, lng: 77.5946 },
  chennai: { lat: 13.0827, lng: 80.2707 },
  mumbai: { lat: 19.076, lng: 72.8777 },
  delhi: { lat: 28.6139, lng: 77.209 },
  pune: { lat: 18.5204, lng: 73.8567 },
  hyderabad: { lat: 17.385, lng: 78.4867 },
  ahmedabad: { lat: 23.0225, lng: 72.5714 },
  coimbatore: { lat: 11.0168, lng: 76.9558 },
  kolkata: { lat: 22.5726, lng: 88.3639 },
  jaipur: { lat: 26.9124, lng: 75.7873 },
  lucknow: { lat: 26.8467, lng: 80.9462 },
  chandigarh: { lat: 30.7333, lng: 76.7794 },
  noida: { lat: 28.5355, lng: 77.391 },
  gurgaon: { lat: 28.4595, lng: 77.0266 },
  ghaziabad: { lat: 28.6692, lng: 77.4538 },
  indore: { lat: 22.7196, lng: 75.8577 },
  nagpur: { lat: 21.1458, lng: 79.0882 },
  rajkot: { lat: 22.3039, lng: 70.8022 },
  vadodara: { lat: 22.3072, lng: 73.1812 },
  surat: { lat: 21.1702, lng: 72.8311 },
  nashik: { lat: 19.9975, lng: 73.7898 },
  madurai: { lat: 9.9252, lng: 78.1198 },
  salem: { lat: 11.6643, lng: 78.146 },
  pondicherry: { lat: 11.9416, lng: 79.8083 },
  mohali: { lat: 30.7046, lng: 76.7179 },
  jalandhar: { lat: 31.326, lng: 75.5762 },
  dharwad: { lat: 15.4589, lng: 75.0078 },
  krishnagiri: { lat: 12.5186, lng: 78.213 },
  kumbakonam: { lat: 10.9617, lng: 79.3881 },
  mayiladuthurai: { lat: 11.1018, lng: 79.6491 },
  bhavnagar: { lat: 21.7645, lng: 72.1519 },
  burdwan: { lat: 23.2324, lng: 87.8615 },
  auroville: { lat: 12.0053, lng: 79.8094 },
  visakhapatnam: { lat: 17.6868, lng: 83.2185 },
  thiruvananthapuram: { lat: 8.5241, lng: 76.9366 },
  kochi: { lat: 9.9312, lng: 76.2673 },
  bhopal: { lat: 23.2599, lng: 77.4126 },
  patna: { lat: 25.6093, lng: 85.1376 },
  ranchi: { lat: 23.3441, lng: 85.3096 },
  ludhiana: { lat: 30.901, lng: 75.8573 },
  agra: { lat: 27.1767, lng: 78.0081 },
  varanasi: { lat: 25.3176, lng: 82.9739 },
  mangalore: { lat: 12.9141, lng: 74.856 },
  mysore: { lat: 12.2958, lng: 76.6394 },
  tiruchirappalli: { lat: 10.7905, lng: 78.7047 },
  erode: { lat: 11.341, lng: 77.7172 },
  hosur: { lat: 12.7409, lng: 77.8253 },
  chengalpattu: { lat: 12.6819, lng: 79.9888 },
};

const LOCATION_ALIASES: Record<string, string> = {
  bengaluru: "bangalore",
  "delhi ncr": "delhi",
  "new delhi": "delhi",
  gujarat: "ahmedabad",
  maharashtra: "mumbai",
  "pune india": "pune",
  peenya: "bangalore",
  "j.p. nagar": "bangalore",
  pomdy: "pondicherry",
  pondy: "pondicherry",
  puducherry: "pondicherry",
  pudicherry: "pondicherry",
  "kurali, punjab": "mohali",
  "jalandhar punjab": "jalandhar",
  "rajkot , gujarat": "rajkot",
  "chengalpattu dist": "chengalpattu",
  "uttar pradesh": "noida",
  "madhya pradesh": "indore",
  haryana: "gurgaon",
  kerala: "kochi",
  "gurgaon & china": "gurgaon",
  india: "delhi",
  "malegaon, nashik, maharashtra, ind": "nashik",
  trichy: "tiruchirappalli",
};

const resolveCity = (location: string): string | null => {
  const loc = location.toLowerCase().trim();
  if (INDIA_CITY_COORDS[loc]) return loc;
  if (LOCATION_ALIASES[loc]) return LOCATION_ALIASES[loc];
  for (const city of Object.keys(INDIA_CITY_COORDS)) {
    if (loc.includes(city)) return city;
  }
  for (const [alias, canonical] of Object.entries(LOCATION_ALIASES)) {
    if (loc.includes(alias)) return canonical;
  }
  return null;
};

const classifyRoles = (roles: string[]): Set<CategoryKey> => {
  const cats = new Set<CategoryKey>();
  for (const role of roles) {
    if (role === "robot_seller") cats.add("robot_seller");
    if (role === "spare_parts_seller") cats.add("spare_parts_eoat");
    if (role === "service_provider" || role === "integrator") cats.add("integrator_service");
  }
  return cats;
};

const CitiesCoveredMap = () => {
  const [cityData, setCityData] = useState<CityCategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilters, setActiveFilters] = useState<Set<CategoryKey>>(
    new Set(["robot_seller", "spare_parts_eoat", "integrator_service"])
  );

  const toggleFilter = useCallback((key: CategoryKey) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const totals = useMemo(() => {
    const t = { robot_seller: 0, spare_parts_eoat: 0, integrator_service: 0 };
    for (const c of cityData) {
      t.robot_seller += c.robot_seller;
      t.spare_parts_eoat += c.spare_parts_eoat;
      t.integrator_service += c.integrator_service;
    }
    return t;
  }, [cityData]);

  useEffect(() => {
    const fetchCities = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("user_id, location, city, user_type, user_roles")
          .eq("registration_complete", true);

        if (error) throw error;

        const cityMap = new Map<string, { robot_seller: number; spare_parts_eoat: number; integrator_service: number }>();

        for (const row of data || []) {
          let cityKey: string | null = null;
          if (row.city && row.city.trim()) {
            cityKey = row.city.trim().toLowerCase();
          } else if (row.location) {
            cityKey = resolveCity(row.location);
          }
          if (!cityKey) continue;
          const canonical = LOCATION_ALIASES[cityKey] || cityKey;
          if (!INDIA_CITY_COORDS[canonical]) continue;

          const roles: string[] = (row.user_roles as string[]) || [];
          const categories = classifyRoles(roles);
          if (categories.size === 0) continue;

          const existing = cityMap.get(canonical) || { robot_seller: 0, spare_parts_eoat: 0, integrator_service: 0 };
          if (categories.has("robot_seller")) existing.robot_seller += 1;
          if (categories.has("spare_parts_eoat")) existing.spare_parts_eoat += 1;
          if (categories.has("integrator_service")) existing.integrator_service += 1;
          cityMap.set(canonical, existing);
        }

        const result: CityCategoryData[] = [];
        for (const [key, counts] of cityMap) {
          const coords = INDIA_CITY_COORDS[key];
          result.push({
            city: key.charAt(0).toUpperCase() + key.slice(1),
            lat: coords.lat,
            lng: coords.lng,
            ...counts,
            total: counts.robot_seller + counts.spare_parts_eoat + counts.integrator_service,
          });
        }
        result.sort((a, b) => b.total - a.total);
        setCityData(result);
      } catch (err) {
        console.error("Error fetching seller locations:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCities();
  }, []);

  // Generate individual pin markers for each category per city
  const markers = useMemo(() => {
    const pins: { city: string; lat: number; lng: number; category: CategoryKey; count: number }[] = [];

    for (const city of cityData) {
      const activeCategories: { key: CategoryKey; count: number }[] = [];
      for (const cat of CATEGORIES) {
        if (activeFilters.has(cat.key) && city[cat.key] > 0) {
          activeCategories.push({ key: cat.key, count: city[cat.key] });
        }
      }
      const n = activeCategories.length;
      if (n === 0) continue;
      const offsets = PIN_OFFSETS[n] || PIN_OFFSETS[3];
      activeCategories.forEach((ac, i) => {
        const offset = offsets[i] || { lat: 0, lng: 0 };
        pins.push({
          city: city.city,
          lat: city.lat + offset.lat,
          lng: city.lng + offset.lng,
          category: ac.key,
          count: ac.count,
        });
      });
    }
    return pins;
  }, [cityData, activeFilters]);

  if (loading) {
    return (
      <section className="py-10 md:py-14 bg-background">
        <div className="container mx-auto px-4 flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground font-medium">Loading coverage map...</span>
        </div>
      </section>
    );
  }

  if (!cityData.length) return null;

  const getCategoryLabel = (key: CategoryKey) => CATEGORIES.find((c) => c.key === key)?.label || key;

  return (
    <section className="relative overflow-hidden border-t border-border bg-muted/30 py-14 md:py-20">
      <div className="container relative z-10 mx-auto px-4">
        <SectionHead
          index="004"
          label="India coverage"
          title="Serving industrial hubs across India"
          subtitle="Robot sellers, spare parts suppliers and service providers, city by city."
        />

        {/* Stats readout */}
        <BevelBox className="mb-6" innerClassName="grid grid-cols-2 gap-px bg-border md:grid-cols-4 [&>*]:bg-card">
          <Readout label="Cities" value={`${cityData.length}+`} />
          {CATEGORIES.map((cat) => (
            <Readout
              key={cat.key}
              label={cat.label}
              value={
                <span className="inline-flex items-center gap-2">
                  <span aria-hidden className="h-2 w-2" style={{ backgroundColor: cat.color }} />
                  {totals[cat.key]}+
                </span>
              }
            />
          ))}
        </BevelBox>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="mr-2 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            <Filter className="h-3.5 w-3.5" aria-hidden />
            Filter
          </span>
          {CATEGORIES.map((cat) => (
            <Toggle
              key={cat.key}
              pressed={activeFilters.has(cat.key)}
              onPressedChange={() => toggleFilter(cat.key)}
              className="h-9 gap-2 rounded-none border border-border bg-background px-3 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground data-[state=on]:border-foreground/40 data-[state=on]:bg-card data-[state=on]:text-foreground"
            >
              <span aria-hidden className="inline-block h-2 w-2" style={{ backgroundColor: cat.color }} />
              {cat.label}
            </Toggle>
          ))}
        </div>

        {/* Map + Table */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Map */}
          <div className="relative overflow-hidden border border-border bg-card lg:col-span-3" style={{ height: 500 }}>
            <CornerMarks inset={8} className="z-[500] [&>span]:bg-foreground/70" />
            <MapContainer
              center={[22.5, 78.9]}
              zoom={5}
              scrollWheelZoom={false}
              style={{ height: "100%", width: "100%" }}
              className="z-0"
              maxBounds={[[6, 68], [37, 98]]}
              minZoom={4}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <FitBoundsToMarkers locations={cityData} />
              {markers.map((pin, idx) => (
                <Marker
                  key={`${pin.city}-${pin.category}-${idx}`}
                  position={[pin.lat, pin.lng]}
                  icon={PIN_ICONS[pin.category]}
                >
                  <Popup>
                    <div className="text-center px-2 py-1 min-w-[140px]">
                      <p className="font-bold text-sm text-foreground">{pin.city}</p>
                      <div
                        className="mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold text-primary-foreground"
                        style={{ backgroundColor: CATEGORIES.find((c) => c.key === pin.category)?.color }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-card/60 inline-block" />
                        {getCategoryLabel(pin.category)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {pin.count} {pin.count > 1 ? "providers" : "provider"}
                      </p>
                      <p className="text-[10px] text-muted-foreground/70 mt-1.5 italic">
                        Login to view details
                      </p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          {/* Table */}
          <div className="overflow-hidden border border-border bg-card lg:col-span-2" style={{ height: 500 }}>
            <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
              <h3 className="text-sm font-semibold uppercase tracking-[0.02em] text-foreground">Cities covered</h3>
              <span className="font-mono text-xs tabular-nums text-muted-foreground">{String(cityData.length).padStart(3, "0")}</span>
            </div>
            <div className="overflow-auto" style={{ height: "calc(500px - 50px)" }}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-mono text-[10px] font-normal uppercase tracking-[0.14em]">#</TableHead>
                    <TableHead className="font-mono text-[10px] font-normal uppercase tracking-[0.14em]">City</TableHead>
                    <TableHead className="text-center font-mono text-[10px] font-normal uppercase tracking-[0.14em]">
                      <span aria-hidden className="mr-1.5 inline-block h-2 w-2" style={{ backgroundColor: CATEGORIES[0].color }} />RS
                    </TableHead>
                    <TableHead className="text-center font-mono text-[10px] font-normal uppercase tracking-[0.14em]">
                      <span aria-hidden className="mr-1.5 inline-block h-2 w-2" style={{ backgroundColor: CATEGORIES[1].color }} />SP
                    </TableHead>
                    <TableHead className="text-center font-mono text-[10px] font-normal uppercase tracking-[0.14em]">
                      <span aria-hidden className="mr-1.5 inline-block h-2 w-2" style={{ backgroundColor: CATEGORIES[2].color }} />IS
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cityData.map((city, index) => (
                    <TableRow key={city.city} className="hover:bg-muted/50">
                      <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">{String(index + 1).padStart(2, "0")}</TableCell>
                      <TableCell className="text-sm font-medium text-foreground">{city.city}</TableCell>
                      <TableCell className="text-center">
                        <span className="font-mono text-sm tabular-nums text-foreground">
                          {city.robot_seller}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-mono text-sm tabular-nums text-foreground">
                          {city.spare_parts_eoat}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-mono text-sm tabular-nums text-foreground">
                          {city.integrator_service}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CitiesCoveredMap;
