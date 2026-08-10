import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import LandingPageLayout from "@/components/landing/LandingPageLayout";
import { Card } from "@/components/ui/card";

const titleCase = (s: string) =>
  s.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function UsedBrandRobots() {
  const { brand = "" } = useParams<{ brand: string }>();
  const brandLabel = titleCase(brand);
  const brandSlug = brand.toLowerCase();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("robots")
        .select("id, brand, model, year_manufactured, price, location, payload_capacity, condition, images")
        .ilike("brand", brandLabel)
        .in("condition", ["used", "refurbished", "pre-owned"])
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

  const count = items.length;
  const seo = {
    title: `Used ${brandLabel} Industrial Robots for Sale in India | RobotVerse`,
    description: `Buy used and refurbished ${brandLabel} industrial robots in India. ${count}+ verified pre-owned ${brandLabel} robots with full specs, payload, reach, controller details and direct seller contact.`,
    canonical: `/robots/${brandSlug}/used`,
    // Thin-content guard: don't index landing pages with fewer than 3 listings
    noIndex: count < 3,
    keywords: [
      `used ${brandLabel} robots`,
      `used ${brandLabel} robot India`,
      `second hand ${brandLabel} robot`,
      `refurbished ${brandLabel} robot`,
      `${brandLabel} robot price India`,
      `buy used ${brandLabel} robot`,
    ],
    summary: `Verified pre-owned ${brandLabel} industrial robots available across India. Every listing is fully specced (payload, reach, axes, controller, year, condition) with direct seller contact — no lead fees.`,
    highlights: [
      { title: "Inventory", text: `${count} used ${brandLabel} robots currently listed in India.` },
      { title: "Verified specs", text: `Payload, reach, axes, controller version, and service history documented.` },
      { title: "Pan-India logistics", text: `Pre-arranged logistics partners for safe ${brandLabel} robot transport.` },
    ],
    faq: [
      {
        question: `How much does a used ${brandLabel} robot cost in India?`,
        answer: `Used ${brandLabel} robot prices in India vary by model, payload, year of manufacture, and controller generation. Check the live grid above for current listings and request a quote directly from sellers.`,
      },
      {
        question: `Are used ${brandLabel} robots reliable?`,
        answer: `Yes — ${brandLabel} robots are built for 80,000+ operating hours. Refurbished units listed on RobotVerse are inspected, with spares and service partners available across major Indian industrial hubs.`,
      },
      {
        question: `Can I get installation and AMC for a used ${brandLabel} robot?`,
        answer: `RobotVerse service partners cover installation, programming, integration, and AMC for ${brandLabel} robots in Pune, Chennai, Bengaluru, Delhi NCR, Ahmedabad, and other industrial centres.`,
      },
      {
        question: `Do you offer financing for used ${brandLabel} robots?`,
        answer: `Yes — RobotVerse financing partners offer EMI and leasing options for used ${brandLabel} robot purchases in India.`,
      },
    ],
  };

  return (
    <LandingPageLayout
      seo={seo}
      heroTitle={`Used ${brandLabel} Industrial Robots in India`}
      heroSubtitle={`${count} verified pre-owned ${brandLabel} robots — transparent pricing, full specs, direct seller contact.`}
      loading={loading}
      emptyMessage={count === 0 ? `No used ${brandLabel} robots are currently listed. Browse all ${brandLabel} robots or set up an alert from /robots.` : undefined}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((r) => (
          <Link to={`/robots/${r.id}`} key={r.id}>
            <Card className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-square bg-muted overflow-hidden">
                {r.images?.[0] && (
                  <img
                    src={r.images[0]}
                    alt={`Used ${brandLabel} ${r.model} industrial robot${r.payload_capacity ? ` ${r.payload_capacity}kg payload` : ""} - ${r.year_manufactured}`}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold truncate">
                  Used {r.brand} {r.model}
                  {r.payload_capacity ? ` · ${r.payload_capacity}kg` : ""}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {r.year_manufactured} · {r.location}
                </p>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <nav aria-label="Related searches" className="mt-10 border-t border-border pt-6">
        <h2 className="text-lg font-semibold mb-3">Related {brandLabel} searches</h2>
        <ul className="flex flex-wrap gap-2 text-sm">
          <li>
            <Link to={`/robots/brand/${brandSlug}`} className="px-3 py-1.5 rounded-full border border-border hover:bg-muted">
              All {brandLabel} robots
            </Link>
          </li>
          <li>
            <Link to={`/parts/brand/${brandSlug}`} className="px-3 py-1.5 rounded-full border border-border hover:bg-muted">
              {brandLabel} spare parts
            </Link>
          </li>
          <li>
            <Link to="/robots" className="px-3 py-1.5 rounded-full border border-border hover:bg-muted">
              All used industrial robots
            </Link>
          </li>
          <li>
            <Link to="/services" className="px-3 py-1.5 rounded-full border border-border hover:bg-muted">
              {brandLabel} installation & AMC
            </Link>
          </li>
          <li>
            <Link to="/financing" className="px-3 py-1.5 rounded-full border border-border hover:bg-muted">
              Robot financing & EMI
            </Link>
          </li>
        </ul>
      </nav>
    </LandingPageLayout>
  );
}
