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
  city?: string | null;
  country?: string | null;
  lat: number;
  lng: number;
}

const createPinIcon = () => {
  return L.divIcon({
    className: "custom-pin-marker",
    html: `<div style="
      position: relative;
      width: 24px;
      height: 34px;
    ">
      <svg width="24" height="34" viewBox="0 0 24 34" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 22 12 22s12-13 12-22C24 5.373 18.627 0 12 0z" fill="hsl(221, 83%, 53%)"/>
        ircle cx="12" cy="12" r="5" fill="white"/>
      </svg>
    </div>`,
    iconSize: [24, 34],
    iconAnchor: [12, 34],
    popupAnchor: [0, -34],
  });
};

// Helper component to auto-fit bounds to all markers
const FitBoundsToMarkers = ({ locations }: { locations: SellerLocation[] }) => {
  const map = useMap();

  useEffect(() => {
    if (!locations.length) return;

    const bounds = L.latLngBounds(locations.map((loc) => [loc.lat, loc.lng] as [number, number]));

    // Add some padding so markers are not at the edge
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 6 });
  }, [locations, map]);

  return null;
};

const CitiesCoveredMap = () => {
  const [locations, setLocations] = useState<SellerLocation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSellerLocations();
  }, []);

  const fetchSellerLocations = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, city, country, lat, lng")
        .eq("registration_complete", true)
        .not("lat", "is", null)
        .not("lng", "is", null);

      if (error) throw error;

      const cleaned: SellerLocation[] = (data || [])
        .filter((row) => typeof row.lat === "number" && typeof row.lng === "number")
        .map((row) => ({
          id: row.id,
          city: row.city,
          country: row.country,
          lat: row.lat,
          lng: row.lng,
        }));

      setLocations(cleaned);
    } catch (err) {
      console.error("Error fetching seller locations:", err);
    } finally {
      setLoading(false);
    }
  };

  const totalSellers = useMemo(() => locations.length, [locations]);
  const pinIcon = useMemo(() => createPinIcon(), []);

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

  // For the city tags, we can aggregate by city + country
  const cityCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const loc of locations) {
      const cityLabel = loc.city?.trim();
      const countryLabel = loc.country?.trim();
      const key = cityLabel && countryLabel ? `${cityLabel}, ${countryLabel}` : cityLabel || countryLabel || "Unknown";

      map.set(key, (map.get(key) || 0) + 1);
    }

    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [locations]);

  return (
    <section className="py-20 bg-muted/20 relative overflow-hidden">
      {/* Subtle background decoration */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
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

        {/* Stats Row */}
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

        {/* Map */}
        <div className="rounded-2xl overflow-hidden border border-border shadow-xl bg-card" style={{ height: 500 }}>
          <MapContainer
            center={[20, 0]} // fallback world view; FitBoundsToMarkers will override
            zoom={2}
            scrollWheelZoom={false}
            style={{ height: "100%", width: "100%" }}
            className="z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <FitBoundsToMarkers locations={locations} />

            {locations.map((loc) => (
              <Marker key={loc.id} position={[loc.lat, loc.lng]} icon={pinIcon}>
                <Popup>
                  <div className="text-center px-1 py-0.5">
                    <p className="font-bold text-sm text-foreground">{loc.city || "Seller Location"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{loc.country || "Country not specified"}</p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* Top city tags */}
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
