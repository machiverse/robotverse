import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
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

// Canonical city entries — each unique city appears once.
// CITY_ALIASES maps alternate spellings to the canonical name.
const CITY_COORDS: Record<string, [number, number]> = {
  // India
  chennai: [13.0827, 80.2707],
  coimbatore: [11.0168, 76.9558],
  pune: [18.5204, 73.8567],
  mumbai: [19.076, 72.8777],
  delhi: [28.6139, 77.209],
  bangalore: [12.9716, 77.5946],
  hyderabad: [17.385, 78.4867],
  ahmedabad: [23.0225, 72.5714],
  kolkata: [22.5726, 88.3639],
  gurgaon: [28.4595, 77.0266],
  noida: [28.5355, 77.391],
  jaipur: [26.9124, 75.7873],
  lucknow: [26.8467, 80.9462],
  chandigarh: [30.7333, 76.7794],
  indore: [22.7196, 75.8577],
  salem: [11.6643, 78.146],
  pondicherry: [11.9416, 79.8083],
  kerala: [10.8505, 76.2711],
  haryana: [29.0588, 76.0856],
  maharashtra: [19.7515, 75.7139],
  bhavnagar: [21.7645, 72.1519],
  burdwan: [23.2324, 87.8615],
  dharwad: [15.4589, 75.0078],
  auroville: [12.0053, 79.8108],
  chengalpattu: [12.6819, 79.976],
  mysore: [12.2958, 76.6394],
  vadodara: [22.3072, 73.1812],
  rajkot: [22.3039, 70.8022],
  surat: [21.1702, 72.8311],
  nagpur: [21.1458, 79.0882],
  visakhapatnam: [17.6868, 83.2185],
  madurai: [9.9252, 78.1198],
  trichy: [10.7905, 78.7047],
  // Germany
  berlin: [52.52, 13.405],
  munich: [48.1351, 11.582],
  frankfurt: [50.1109, 8.6821],
  hamburg: [53.5511, 9.9937],
  stuttgart: [48.7758, 9.1829],
  dusseldorf: [51.2277, 6.7735],
  cologne: [50.9375, 6.9603],
  nuremberg: [49.4521, 11.0767],
  // China
  shanghai: [31.2304, 121.4737],
  beijing: [39.9042, 116.4074],
  shenzhen: [22.5431, 114.0579],
  guangzhou: [23.1291, 113.2644],
  dongguan: [23.0489, 113.7447],
  suzhou: [31.2989, 120.5853],
  hangzhou: [30.2741, 120.1551],
  chengdu: [30.5728, 104.0668],
  tianjin: [39.3434, 117.3616],
  wuhan: [30.5928, 114.3055],
};

const CITY_ALIASES: Record<string, string> = {
  bengaluru: "bangalore",
  "delhi ncr": "delhi",
  gujarat: "ahmedabad",
  "gurgaon & china": "gurgaon",
  "uttar pradesh": "lucknow",
  köln: "cologne",
  münchen: "munich",
  nürnberg: "nuremberg",
  "guangdong": "guangzhou",
};

interface CityData {
  name: string;
  coords: [number, number];
  sellerCount: number;
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
        <circle cx="12" cy="12" r="5" fill="white"/>
      </svg>
    </div>`,
    iconSize: [24, 34],
    iconAnchor: [12, 34],
    popupAnchor: [0, -34],
  });
};

const CitiesCoveredMap = () => {
  const [cityData, setCityData] = useState<CityData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSellerLocations();
  }, []);

  const fetchSellerLocations = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("location")
        .not("location", "is", null)
        .eq("registration_complete", true);

      if (error) throw error;

      const locationMap: Record<string, number> = {};
      const allKeys = [...Object.keys(CITY_COORDS), ...Object.keys(CITY_ALIASES)];
      (data || []).forEach((p) => {
        if (!p.location) return;
        const loc = p.location.trim().toLowerCase();
        for (const key of allKeys) {
          if (loc.includes(key)) {
            const canonical = CITY_ALIASES[key] || key;
            locationMap[canonical] = (locationMap[canonical] || 0) + 1;
            return;
          }
        }
      });

      const cities: CityData[] = Object.entries(locationMap).map(([name, count]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        coords: CITY_COORDS[name],
        sellerCount: count,
      }));

      setCityData(cities.sort((a, b) => b.sellerCount - a.sellerCount));
    } catch (err) {
      console.error("Error fetching seller locations:", err);
    } finally {
      setLoading(false);
    }
  };

  const totalSellers = useMemo(() => cityData.reduce((s, c) => s + c.sellerCount, 0), [cityData]);
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

  if (cityData.length === 0) return null;

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
            Serving Across{" "}
            <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              India, Germany & China
            </span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
            Connecting buyers and sellers of industrial robots in major industrial hubs worldwide
          </p>
        </div>

        {/* Stats Row */}
        <div className="flex flex-wrap items-center justify-center gap-8 mb-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{cityData.length}+</p>
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
            center={[20.5937, 78.9629]}
            zoom={5}
            scrollWheelZoom={false}
            style={{ height: "100%", width: "100%" }}
            className="z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {cityData.map((city) => (
              <Marker key={city.name} position={city.coords} icon={pinIcon}>
                <Popup>
                  <div className="text-center px-1 py-0.5">
                    <p className="font-bold text-sm text-foreground">{city.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {city.sellerCount} verified seller{city.sellerCount > 1 ? "s" : ""}
                    </p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* City tags */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-8">
          {cityData.slice(0, 14).map((city) => (
            <span
              key={city.name}
              className="px-4 py-2 rounded-full bg-card border border-border text-sm font-medium text-foreground hover:border-primary/40 hover:bg-primary/5 transition-colors cursor-default"
            >
              <MapPin className="w-3 h-3 inline-block mr-1.5 text-primary -mt-0.5" />
              {city.name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CitiesCoveredMap;
