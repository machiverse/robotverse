import { useEffect, useState } from "react";
import { useParams, Link } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import LandingPageLayout from "@/components/landing/LandingPageLayout";
import { Card } from "@/components/ui/card";

const titleCase = (s: string) =>
  s.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function CategoryParts() {
  const { cat = "" } = useParams<{ cat: string }>();
  const catLabel = titleCase(cat);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("spare_parts")
        .select("id, brand, name, category, part_number, images")
        .ilike("category", `%${catLabel}%`)
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
  }, [catLabel]);

  const seo = {
    title: `Robot ${catLabel} — Spare Parts & Replacements | RobotVerse`,
    description: `Industrial robot ${catLabel.toLowerCase()} from verified sellers in India. ${items.length}+ live listings with part numbers, OEM cross-reference, and warranty.`,
    canonical: `/parts/category/${cat.toLowerCase()}`,
    keywords: [`robot ${catLabel}`, `industrial ${catLabel}`, `${catLabel} for sale`, `${catLabel} India`],
    summary: `Browse every ${catLabel.toLowerCase()} listed on RobotVerse across ABB, FANUC, KUKA, Yaskawa, Mitsubishi, and Universal Robots. Search by part number or compatible robot.`,
    highlights: [
      { title: "Selection", text: `${items.length} ${catLabel.toLowerCase()} currently in stock.` },
      { title: "OEM + refurbished", text: "Filter by genuine OEM, OEM-equivalent, or certified refurbished." },
    ],
    faq: [
      {
        question: `What ${catLabel.toLowerCase()} brands does RobotVerse stock?`,
        answer: `ABB, FANUC, KUKA, Yaskawa, Mitsubishi, Kawasaki, and Universal Robots — plus compatible third-party equivalents.`,
      },
      {
        question: `Do ${catLabel.toLowerCase()} listings include warranty?`,
        answer: `Refurbished ${catLabel.toLowerCase()} carry a 6-month standard warranty; genuine OEM parts carry manufacturer warranty.`,
      },
    ],
  };

  return (
    <LandingPageLayout
      seo={seo}
      heroTitle={`Robot ${catLabel}`}
      heroSubtitle={`Genuine and refurbished ${catLabel.toLowerCase()} for industrial robots, with OEM cross-reference and warranty.`}
      loading={loading}
      emptyMessage={items.length === 0 ? `No ${catLabel.toLowerCase()} in stock right now.` : undefined}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((p) => (
          <Link to={`/parts/${p.id}`} key={p.id}>
            <Card className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-square bg-muted overflow-hidden">
                {(p.images?.[0]) && (
                  <img
                    src={(p.images?.[0])}
                    alt={`${p.brand} ${p.name} ${catLabel.toLowerCase()}`}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold truncate">{p.brand} {p.name}</h3>
                <p className="text-sm text-muted-foreground">{p.category}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </LandingPageLayout>
  );
}
