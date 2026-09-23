import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import LandingPageLayout from "@/components/landing/LandingPageLayout";
import { Card } from "@/components/ui/card";

const titleCase = (s: string) =>
  s.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// City-only services landing page: /services/{city}
// Multi-service combination URLs (/services/{city}/{service-words}) were removed
// as doorway pages and are no longer routed or generated anywhere.
export default function CityServices() {
  const params = useParams<{ city?: string; id?: string }>();
  const city = params.city ?? params.id ?? "";
  const cityLabel = titleCase(city);
  type ServiceRow = { id: string; name: string; service_type: string; location: string; description: string };
  const [items, setItems] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("services")
        .select("id, name, service_type, location, description")
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
    title: `Industrial Robot Services in ${cityLabel} | RobotVerse`,
    description: `Find verified industrial robot service providers in ${cityLabel} — maintenance, repair, installation, programming and AMC partners with reviews and quote requests.`,
    canonical: `/services/${city.toLowerCase()}`,
    // Thin-content guard: don't index landing pages with fewer than 3 listings
    noIndex: items.length < 3,
    keywords: [
      `robot services ${cityLabel}`,
      `industrial robot maintenance ${cityLabel}`,
      `robot repair ${cityLabel}`,
    ],
    summary: `RobotVerse-verified robot service providers covering ${cityLabel} and surrounding industrial belts. Each provider is rated by buyers and quoted directly through the platform.`,
    highlights: [
      { title: "Coverage", text: `${items.length} service providers in ${cityLabel}.` },
      { title: "Verified", text: "GST, ISO, and OEM certifications validated on profile." },
      { title: "Quotes", text: "Multi-provider RFQ in one click." },
    ],
    faq: [
      {
        question: `Who provides industrial robot services in ${cityLabel}?`,
        answer: `RobotVerse lists certified service partners covering ${cityLabel}. Open any listing for credentials, rate cards, and past projects.`,
      },
      {
        question: `How fast can a service engineer reach my plant in ${cityLabel}?`,
        answer: `Most ${cityLabel}-based providers offer next-day onsite visits, with 24×7 breakdown response on AMC contracts.`,
      },
    ],
  };

  return (
    <LandingPageLayout
      seo={seo}
      heroTitle={`Industrial Robot Services in ${cityLabel}`}
      heroSubtitle={`Verified providers for maintenance, repair, installation and programming of industrial robots, serving ${cityLabel} and nearby industrial zones.`}
      loading={loading}
      emptyMessage={items.length === 0 ? `No service providers listed in ${cityLabel} yet.` : undefined}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((s) => (
          <Link to={`/services/${s.id}`} key={s.id}>
            <Card className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-[4/3] bg-muted flex items-center justify-center text-muted-foreground text-xs">
                {s.service_type}
              </div>
              <div className="p-4">
                <h3 className="font-semibold truncate">{s.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">{s.description}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </LandingPageLayout>
  );
}
