import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import LandingPageLayout from "@/components/landing/LandingPageLayout";
import { Card } from "@/components/ui/card";

const titleCase = (s: string) =>
  s.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function BrandParts() {
  const { brand = "" } = useParams<{ brand: string }>();
  const brandLabel = titleCase(brand);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("spare_parts")
        .select("id, brand, name, part_number, price, images")
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
    title: `${brandLabel} Robot Spare Parts in India | RobotVerse`,
    description: `Buy genuine and refurbished ${brandLabel} robot spare parts. Servo motors, encoders, controllers, teach pendants, and cables — ${items.length}+ live listings.`,
    canonical: `/parts/brand/${brand.toLowerCase()}`,
    keywords: [`${brandLabel} spare parts`, `${brandLabel} servo motor`, `${brandLabel} controller`, `${brandLabel} teach pendant`],
    summary: `RobotVerse aggregates ${brandLabel} robot spare parts from verified sellers across India — controllers, motors, drives, cables, and consumables with part-number search.`,
    highlights: [
      { title: "Catalog", text: `${items.length} ${brandLabel} parts currently in stock.` },
      { title: "Cross-reference", text: "Part numbers checked against OEM catalogs." },
      { title: "Logistics", text: "Same-week dispatch in metro cities." },
    ],
    faq: [
      {
        question: `Where to buy genuine ${brandLabel} spare parts in India?`,
        answer: `RobotVerse lists ${brandLabel} parts from authorised resellers and refurbishment specialists. Filter by part number, condition, and seller location.`,
      },
      {
        question: `Do you support refurbished ${brandLabel} servo motors?`,
        answer: `Yes — refurbished servo motors come with a 6-month warranty by default, extendable to 12 months on most listings.`,
      },
      {
        question: `Can I get cross-reference help for an obsolete ${brandLabel} part?`,
        answer: `Post a request on the parts board and verified sellers will quote alternatives within 24 hours.`,
      },
    ],
  };

  return (
    <LandingPageLayout
      seo={seo}
      heroTitle={`${brandLabel} Robot Spare Parts`}
      heroSubtitle={`Find genuine and refurbished ${brandLabel} parts with part-number search and verified seller warranty.`}
      loading={loading}
      emptyMessage={items.length === 0 ? `No ${brandLabel} parts in stock right now. Post a request on /parts.` : undefined}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((p) => (
          <Link to={`/parts/${p.id}`} key={p.id}>
            <Card className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-square bg-muted overflow-hidden">
                {(p.images?.[0]) && (
                  <img
                    src={(p.images?.[0])}
                    alt={`${brandLabel} ${p.name} spare part ${p.part_number ?? ""}`}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold truncate">{p.brand} {p.name}</h3>
                <p className="text-sm text-muted-foreground">P/N: {p.part_number ?? "—"}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </LandingPageLayout>
  );
}
