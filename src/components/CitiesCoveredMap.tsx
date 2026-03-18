import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, MapPin } from "lucide-react";
import "leaflet/dist/leaflet.css";

// Fix default marker icon issue with bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Known Indian city coordinates
const CITY_COORDS: Record<string, [number, number]> = {
  chennai: [13.0827, 80.2707],
  coimbatore: [11.0168, 76.9558],
  pune: [18.5204, 73.8567],
  mumbai: [19.076, 72.8777],
  delhi: [28.6139, 77.209],
  "delhi ncr": [28.6139, 77.209],
  bangalore: [12.9716, 77.5946],
  bengaluru: [12.9716, 77.5946],
  hyderabad: [17.385, 78.4867],
  ahmedabad: [23.0225, 72.5714],
  gujarat: [23.0225, 72.5714],
  kolkata: [22.5726, 88.3639],
  gurgaon: [28.4595, 77.0266],
  "gurgaon & china": [28.4595, 77.0266],
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
  "uttar pradesh": [26.8467, 80.9462],
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
};

interface CityData {
  name: string;
  coords: [number, number];
  sellerCount: number;
}

const createCustomIcon = (count: number) => {
  const size = count >= 10 ? 40 : count >= 5 ? 34 : 28;
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="
      background: linear-gradient(135deg, hsl(221, 83%, 53%), hsl(221, 83%, 40%));
      color: white;
      border-radius: 50%;
      width: ${size}px;
      height: ${size}px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: ${count >= 10 ? 13 : 11}px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      border: 2px solid white;
    ">${count}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
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

      // Normalize and group locations
      const locationMap: Record<string, number> = {};
      (data || []).forEach((p) => {
        if (!p.location) return;
        const loc = p.location.trim().toLowerCase();
        // Try to match to a known city
        for (const city of Object.keys(CITY_COORDS)) {
          if (loc.includes(city)) {
            locationMap[city] = (locationMap[city] || 0) + 1;
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

  if (loading) {
    return (
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Loading map...</span>
        </div>
      </section>
    );
  }

  if (cityData.length === 0) return null;

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
            <MapPin className="w-4 h-4" />
            Cities Covered
          </div>
          <h2 className="text-4xl font-bold mb-3 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            We're Across India
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            {totalSellers}+ verified sellers across {cityData.length} cities
          </p>
        </div>

        {/* Map */}
        <div className="rounded-2xl overflow-hidden border border-border shadow-lg" style={{ height: 480 }}>
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
              <Marker key={city.name} position={city.coords} icon={createCustomIcon(city.sellerCount)}>
                <Popup>
                  <div className="text-center p-1">
                    <p className="font-bold text-sm">{city.name}</p>
                    <p className="text-xs text-gray-600">{city.sellerCount} seller{city.sellerCount > 1 ? "s" : ""}</p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* City chips */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
          {cityData.slice(0, 12).map((city) => (
            <span
              key={city.name}
              className="px-3 py-1.5 rounded-full bg-card border border-border text-sm font-medium text-foreground"
            >
              {city.name} ({city.sellerCount})
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CitiesCoveredMap;
