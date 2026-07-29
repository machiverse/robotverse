import { useEffect, useState } from "react";
import { useParams, Link } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import LandingPageLayout from "@/components/landing/LandingPageLayout";
import { Card } from "@/components/ui/card";

const titleCase = (s: string) =>
  s.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function CityServices() {
  const { city = "", type = "" } = useParams<{ city: string; type: string }>();
  const cityLabel = titleCase(city);
  const typeLabel = titleCase(type);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("services")
        .select("id, name, service_type, location, description")
        .ilike("service_type", `%${typeLabel}%`)
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
  }, [cityLabel, typeLabel]);

  const seo = {
    title: `${typeLabel} for Industrial Robots in ${cityLabel} | RobotVerse`,
    description: `Find verified ${typeLabel.toLowerCase()} providers for industrial robots in ${cityLabel}. ${items.length}+ certified partners with reviews and quote-request workflow.`,
    canonical: `/services/${city.toLowerCase()}/${type.toLowerCase()}`,
    keywords: [
      `${typeLabel} ${cityLabel}`,
      `robot ${typeLabel.toLowerCase()} ${cityLabel}`,
      `industrial robot service ${cityLabel}`,
    ],
    summary: `RobotVerse-verified ${typeLabel.toLowerCase()} providers covering ${cityLabel} and surrounding industrial belts. Each provider is rated by buyers and quoted directly through the platform.`,
    highlights: [
      { title: "Coverage", text: `${items.length} ${typeLabel.toLowerCase()} providers in ${cityLabel}.` },
      { title: "Verified", text: "GST, ISO, and OEM certifications validated on profile." },
      { title: "Quotes", text: "Multi-provider RFQ in one click." },
    ],
    faq: [
      {
        question: `Who provides ${typeLabel.toLowerCase()} services for robots in ${cityLabel}?`,
        answer: `RobotVerse lists certified ${typeLabel.toLowerCase()} partners covering ${cityLabel}. Open any listing for credentials, rate cards, and past projects.`,
      },
      {
        question: `How fast can a ${typeLabel.toLowerCase()} engineer reach my plant?`,
        answer: `Most ${cityLabel}-based providers offer next-day onsite visits, with 24×7 breakdown response on AMC contracts.`,
      },
    ],
  };

  return (
    <LandingPageLayout
      seo={seo}
      heroTitle={`${typeLabel} in ${cityLabel}`}
      heroSubtitle={`Verified providers for ${typeLabel.toLowerCase()} on industrial robots, serving ${cityLabel} and nearby industrial zones.`}
      loading={loading}
      emptyMessage={items.length === 0 ? `No ${typeLabel.toLowerCase()} providers listed in ${cityLabel} yet.` : undefined}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((s) => (
          <Link to={`/services/${s.id}`} key={s.id}>
            <Card className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-video bg-muted flex items-center justify-center text-muted-foreground text-xs">
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
