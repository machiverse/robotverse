import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, MapPin, Building2, Users } from "lucide-react";
import "leaflet/dist/leaflet.css";

// Fix default marker icon issue with bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface SellerLocation {
  id: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
}

const createPinIcon = () =>
  L.divIcon({
    className: "custom-pin-marker",
    html: `<div style="position:relative;width:24px;height:34px">
      <svg width="24" height="34" viewBox="0 0 24 34" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 22 12 22s12-13 12-22C24 5.373 18.627 0 12 0z" fill="hsl(221,83%,53%)"/>
        <circle cx="12" cy="12" r="5" fill="white"/>
      </svg>
    </div>`,
    iconSize: [24, 34],
    iconAnchor: [12, 34],
    popupAnchor: [0, -34],
  });

const FitBoundsToMarkers = ({ locations }: { locations: SellerLocation[] }) => {
  const map = useMap();
  useEffect(() => {
    if (!locations.length) return;
    const bounds = L.latLngBounds(locations.map((l) => [l.lat, l.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 6 });
  }, [locations, map]);
  return null;
};

// ── City coordinates & aliases ──────────────────────────────────────────────

const CITY_COORDS: Record<string, { lat: number; lng: number; country: string }> = {
  bangalore: { lat: 12.9716, lng: 77.5946, country: "India" },
  chennai: { lat: 13.0827, lng: 80.2707, country: "India" },
  mumbai: { lat: 19.076, lng: 72.8777, country: "India" },
  delhi: { lat: 28.6139, lng: 77.209, country: "India" },
  pune: { lat: 18.5204, lng: 73.8567, country: "India" },
  hyderabad: { lat: 17.385, lng: 78.4867, country: "India" },
  ahmedabad: { lat: 23.0225, lng: 72.5714, country: "India" },
  coimbatore: { lat: 11.0168, lng: 76.9558, country: "India" },
  kolkata: { lat: 22.5726, lng: 88.3639, country: "India" },
  jaipur: { lat: 26.9124, lng: 75.7873, country: "India" },
  lucknow: { lat: 26.8467, lng: 80.9462, country: "India" },
  chandigarh: { lat: 30.7333, lng: 76.7794, country: "India" },
  noida: { lat: 28.5355, lng: 77.391, country: "India" },
  gurgaon: { lat: 28.4595, lng: 77.0266, country: "India" },
  ghaziabad: { lat: 28.6692, lng: 77.4538, country: "India" },
  indore: { lat: 22.7196, lng: 75.8577, country: "India" },
  nagpur: { lat: 21.1458, lng: 79.0882, country: "India" },
  rajkot: { lat: 22.3039, lng: 70.8022, country: "India" },
  vadodara: { lat: 22.3072, lng: 73.1812, country: "India" },
  surat: { lat: 21.1702, lng: 72.8311, country: "India" },
  nashik: { lat: 19.9975, lng: 73.7898, country: "India" },
  madurai: { lat: 9.9252, lng: 78.1198, country: "India" },
  salem: { lat: 11.6643, lng: 78.146, country: "India" },
  pondicherry: { lat: 11.9416, lng: 79.8083, country: "India" },
  mohali: { lat: 30.7046, lng: 76.7179, country: "India" },
  jalandhar: { lat: 31.326, lng: 75.5762, country: "India" },
  dharwad: { lat: 15.4589, lng: 75.0078, country: "India" },
  krishnagiri: { lat: 12.5186, lng: 78.213, country: "India" },
  kumbakonam: { lat: 10.9617, lng: 79.3881, country: "India" },
  mayiladuthurai: { lat: 11.1018, lng: 79.6491, country: "India" },
  bhavnagar: { lat: 21.7645, lng: 72.1519, country: "India" },
  burdwan: { lat: 23.2324, lng: 87.8615, country: "India" },
  auroville: { lat: 12.0053, lng: 79.8094, country: "India" },
  // Germany
  berlin: { lat: 52.52, lng: 13.405, country: "Germany" },
  munich: { lat: 48.1351, lng: 11.582, country: "Germany" },
  frankfurt: { lat: 50.1109, lng: 8.6821, country: "Germany" },
  stuttgart: { lat: 48.7758, lng: 9.1829, country: "Germany" },
  // China
  shanghai: { lat: 31.2304, lng: 121.4737, country: "China" },
  beijing: { lat: 39.9042, lng: 116.4074, country: "China" },
  shenzhen: { lat: 22.5431, lng: 114.0579, country: "China" },
  // Romania
  bucharest: { lat: 44.4268, lng: 26.1025, country: "Romania" },
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
  "chengalpattu dist": "chennai",
  "uttar pradesh": "noida",
  "madhya pradesh": "indore",
  haryana: "gurgaon",
  kerala: "bangalore",
  "gurgaon & china": "gurgaon",
  "europe romania bucharest": "bucharest",
  germany: "berlin",
  india: "delhi",
  "malegaon, nashik, maharashtra, ind": "nashik",
};

const resolveCity = (location: string): string | null => {
  const loc = location.toLowerCase().trim();
  if (CITY_COORDS[loc]) return loc;
  if (LOCATION_ALIASES[loc]) return LOCATION_ALIASES[loc];
  for (const city of Object.keys(CITY_COORDS)) {
    if (loc.includes(city)) return city;
  }
  for (const [alias, canonical] of Object.entries(LOCATION_ALIASES)) {
    if (loc.includes(alias)) return canonical;
  }
  return null;
};

// ── Component ───────────────────────────────────────────────────────────────

const CitiesCoveredMap = () => {
  const [locations, setLocations] = useState<SellerLocation[]>([]);
  const [loading, setLoading] = useState(true);

  const totalSellers = useMemo(() => locations.length, [locations]);
  const pinIcon = useMemo(() => createPinIcon(), []);
  const cityCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const loc of locations) {
      const key = `${loc.city}, ${loc.country}`;
      m.set(key, (m.get(key) || 0) + 1);
    }
    return Array.from(m.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [locations]);

  useEffect(() => {
    const fetchSellerLocations = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("user_id, location")
          .eq("registration_complete", true)
          .not("location", "is", null);

        if (error) throw error;

        const cityMap = new Map<string, { count: number; ids: string[] }>();
        for (const row of data || []) {
          if (!row.location) continue;
          const city = resolveCity(row.location);
          if (!city) continue;
          const existing = cityMap.get(city);
          if (existing) {
            existing.count++;
            existing.ids.push(row.user_id);
          } else {
            cityMap.set(city, { count: 1, ids: [row.user_id] });
          }
        }

        const cleaned: SellerLocation[] = [];
        for (const [city, info] of cityMap) {
          const coords = CITY_COORDS[city];
          if (!coords) continue;
          cleaned.push({
            id: info.ids[0],
            city: city.charAt(0).toUpperCase() + city.slice(1),
            country: coords.country,
            lat: coords.lat,
            lng: coords.lng,
          });
        }
        setLocations(cleaned);
      } catch (err) {
        console.error("Error fetching seller locations:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSellerLocations();
  }, []);

  if (loading) {
    return (
      <section className="py-20 bg-muted/20">
        <div className="container mx-auto px-4 flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground font-medium">Loading coverage map...</span>
        </div>
      </section>
    );
  }

  if (!locations.length) return null;

  return (
    <section className="py-20 bg-muted/20 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 text-primary text-sm font-semibold mb-5 tracking-wide uppercase">
            <MapPin className="w-4 h-4" />
            Global Coverage
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-foreground">
            Serving Industrial Hubs{" "}
            <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Across the Globe
            </span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
            Connecting buyers and sellers of industrial robots in key manufacturing regions worldwide
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-8 mb-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{cityCounts.length}+</p>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Cities</p>
            </div>
          </div>
          <div className="w-px h-10 bg-border hidden sm:block" />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalSellers}+</p>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Verified Sellers</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden border border-border shadow-xl bg-card" style={{ height: 500 }}>
          <MapContainer center={[20, 0]} zoom={2} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }} className="z-0">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitBoundsToMarkers locations={locations} />
            {locations.map((loc) => (
              <Marker key={loc.id} position={[loc.lat, loc.lng]} icon={pinIcon}>
                <Popup>
                  <div className="text-center px-1 py-0.5">
                    <p className="font-bold text-sm text-foreground">{loc.city}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{loc.country}</p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 mt-8">
          {cityCounts.slice(0, 14).map((city) => (
            <span
              key={city.name}
              className="px-4 py-2 rounded-full bg-card border border-border text-sm font-medium text-foreground hover:border-primary/40 hover:bg-primary/5 transition-colors cursor-default"
            >
              <MapPin className="w-3 h-3 inline-block mr-1.5 text-primary -mt-0.5" />
              {city.name} • {city.count}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CitiesCoveredMap;
