import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import LandingPageLayout from "@/components/landing/LandingPageLayout";
import { Card } from "@/components/ui/card";
import { brandFaq, type FaqItem } from "@/lib/seo/seoText";

const titleCase = (s: string) =>
  s.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function BrandRobots() {
  const { brand = "" } = useParams<{ brand: string }>();
  const brandLabel = titleCase(brand);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [faq, setFaq] = useState<FaqItem[]>([]);

  // FAQ is built only from real active listings (same builder as seo-render).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("robots")
        .select("brand, model, location, payload_capacity, condition, updated_at")
        .eq("availability", "available")
        .order("updated_at", { ascending: false })
        .limit(500);
      if (cancelled) return;
      const slugOf = (v: unknown) =>
        String(v ?? "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      const rows = (data ?? []).filter((r: any) => slugOf(r.brand) === slugOf(brand));
      setFaq(brandFaq(String(rows[0]?.brand || brandLabel), rows as any));
    })();
    return () => {
      cancelled = true;
    };
  }, [brand, brandLabel]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("robots")
        .select("id, brand, model, year_manufactured, price, location, images")
        .ilike("brand", brandLabel)
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
  }, [brandLabel]);

  const seo = {
    title: `${brandLabel} Industrial Robots for Sale in India | RobotVerse`,
    description: `Buy used and refurbished ${brandLabel} industrial robots in India. Compare ${items.length}+ verified ${brandLabel} listings with full specs, photos, and seller details.`,
    canonical: `/robots/brand/${brand.toLowerCase()}`,
    // Thin-content guard: don't index landing pages with fewer than 3 listings
    noIndex: items.length < 3,
    keywords: [
      `${brandLabel} robots`,
      `used ${brandLabel} robots`,
      `${brandLabel} robot price India`,
      `buy ${brandLabel} robot`,
    ],
    summary: `Browse every verified ${brandLabel} industrial robot listed on RobotVerse. Each listing includes payload, reach, controller, condition, and a direct quote-request channel to the seller.`,
    highlights: [
      { title: "Inventory", text: `${items.length} ${brandLabel} robots currently listed.` },
      { title: "Full specs", text: "Payload, reach, axes, controller, year, and condition documented." },
      { title: "Direct contact", text: "Request a quote without paying for leads." },
    ],
    faq,
  };

  return (
    <LandingPageLayout
      seo={seo}
      heroTitle={`${brandLabel} Industrial Robots`}
      heroSubtitle={`Verified ${brandLabel} listings on RobotVerse — full specs, transparent pricing, direct seller contact.`}
      loading={loading}
      emptyMessage={items.length === 0 ? `No ${brandLabel} robots are currently listed. Set up an alert from /robots to be notified.` : undefined}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((r) => (
          <Link to={`/robots/${r.id}`} key={r.id}>
            <Card className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-square bg-muted overflow-hidden">
                {(r.images?.[0]) && (
                  <img
                    src={(r.images?.[0])}
                    alt={`${brandLabel} ${r.model} industrial robot - ${r.year_manufactured}`}
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
