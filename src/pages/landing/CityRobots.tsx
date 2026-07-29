import { useEffect, useState } from "react";
import { useParams, Link } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import LandingPageLayout from "@/components/landing/LandingPageLayout";
import { Card } from "@/components/ui/card";

const titleCase = (s: string) =>
  s.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function CityRobots() {
  const { city = "" } = useParams<{ city: string }>();
  const cityLabel = titleCase(city);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("robots")
        .select("id, brand, model, year_manufactured, price, location, images")
        .ilike("location", `%${cityLabel}%`)
        .order("updated_at", { ascending: false })
        .limit(60);
      if (!cancelled) {
        setItems(data ?? []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cityLabel]);

  const seo = {
    title: `Industrial Robots for Sale in ${cityLabel} | RobotVerse`,
    description: `Buy and sell used industrial robots in ${cityLabel}. Browse ${items.length}+ verified listings from local sellers — ABB, FANUC, KUKA, Yaskawa and more.`,
    canonical: `/robots/city/${city.toLowerCase()}`,
    keywords: [
      `industrial robots ${cityLabel}`,
      `used robots ${cityLabel}`,
      `robot dealers in ${cityLabel}`,
      `buy robot ${cityLabel}`,
      "ABB FANUC KUKA",
    ],
    summary: `RobotVerse lists verified used and refurbished industrial robots available in ${cityLabel}. Filter by brand, payload, reach, and price; talk to sellers directly through the platform.`,
    highlights: [
      { title: "Local inventory", text: `${items.length} robots currently listed in ${cityLabel}.` },
      { title: "Verified sellers", text: "Every listing is matched to a verified seller profile." },
      { title: "Financing & logistics", text: "EMI partners and pan-India movers integrated into checkout." },
    ],
    faq: [
      {
        question: `Where can I buy a used industrial robot in ${cityLabel}?`,
        answer: `RobotVerse aggregates verified robot listings located in or shipping to ${cityLabel}. Browse the grid above, open any robot for full specs, and request a quote directly from the seller.`,
      },
      {
        question: `What brands are available in ${cityLabel}?`,
        answer: `Most ${cityLabel} listings are ABB, FANUC, KUKA, Yaskawa, Mitsubishi, and Universal Robots. Use the filters on /robots to narrow by brand, payload, and reach.`,
      },
      {
        question: "Does RobotVerse handle delivery?",
        answer: "Yes — our logistics partners ship robots across India with rigging, insurance, and installation handled end-to-end.",
      },
    ],
  };

  return (
    <LandingPageLayout
      seo={seo}
      heroTitle={`Industrial Robots in ${cityLabel}`}
      heroSubtitle={`Verified listings from local sellers in ${cityLabel}. Compare specs, request quotes, and arrange delivery on one platform.`}
      loading={loading}
      emptyMessage={items.length === 0 ? `No robots are currently listed in ${cityLabel}. Browse all robots while we onboard more local sellers.` : undefined}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((r) => (
          <Link to={`/robots/${r.id}`} key={r.id}>
            <Card className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-square bg-muted overflow-hidden">
                {(r.images?.[0]) && (
                  <img
                    src={(r.images?.[0])}
                    alt={`${r.brand} ${r.model} industrial robot for sale in ${cityLabel}`}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold truncate">{r.brand} {r.model}</h3>
                <p className="text-sm text-muted-foreground">{r.year_manufactured} · {r.location}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </LandingPageLayout>
  );
}
