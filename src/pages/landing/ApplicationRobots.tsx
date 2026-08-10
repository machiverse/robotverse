import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import LandingPageLayout from "@/components/landing/LandingPageLayout";
import { Card } from "@/components/ui/card";

const titleCase = (s: string) =>
  s.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// Map URL slug -> search terms used against robots table (name, application, robot_type, description)
const APPLICATION_MAP: Record<string, { label: string; terms: string[] }> = {
  welding: { label: "Welding", terms: ["welding", "weld", "arc", "mig", "tig", "spot"] },
  painting: { label: "Painting", terms: ["painting", "paint", "spray", "coating"] },
  palletizing: { label: "Palletizing", terms: ["palletizing", "palletiser", "palletizer", "pallet"] },
  assembly: { label: "Assembly", terms: ["assembly", "assemble"] },
  "pick-and-place": { label: "Pick & Place", terms: ["pick", "place", "pick-and-place", "pick and place"] },
  "material-handling": { label: "Material Handling", terms: ["material handling", "handling", "loading", "unloading"] },
  inspection: { label: "Inspection", terms: ["inspection", "vision", "quality"] },
  machine_tending: { label: "Machine Tending", terms: ["machine tending", "tending", "cnc"] },
  cutting: { label: "Cutting", terms: ["cutting", "laser cut", "plasma"] },
  packaging: { label: "Packaging", terms: ["packaging", "packing"] },
};

export default function ApplicationRobots() {
  const { application = "" } = useParams<{ application: string }>();
  const slug = application.toLowerCase();
  const cfg = APPLICATION_MAP[slug] ?? { label: titleCase(slug), terms: [slug.replace(/-/g, " ")] };
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      // OR across multiple ilike conditions on common searchable text fields
      const orClauses = cfg.terms.flatMap((t) => {
        const v = `%${t}%`;
        return [`name.ilike.${v}`, `description.ilike.${v}`, `robot_type.ilike.${v}`];
      }).join(",");

      const { data } = await supabase
        .from("robots")
        .select("id, brand, model, name, year_manufactured, price, location, images, robot_type")
        .or(orClauses)
        .eq("availability", "available")
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
  }, [slug]);

  const label = cfg.label;
  const seo = {
    title: `${label} Robots for Sale in India | Industrial ${label} Robots | RobotVerse`,
    description: `Buy ${label.toLowerCase()} industrial robots in India. Compare ${items.length}+ verified ${label.toLowerCase()} robot listings — FANUC, ABB, KUKA, Yaskawa and more, with full specs and direct seller contact.`,
    canonical: `/robots/application/${slug}`,
    // Thin-content guard: don't index landing pages with fewer than 3 listings
    noIndex: items.length < 3,
    keywords: [
      `${label} robots`,
      `${label} robot India`,
      `industrial ${label} robot`,
      `${label} robot price`,
      `buy ${label} robot`,
      `used ${label} robot`,
    ],
    summary: `Every ${label.toLowerCase()}-capable industrial robot listed on RobotVerse, across brands. Filter by payload, reach, brand, and condition — request a quote directly from the seller.`,
    highlights: [
      { title: "Application focus", text: `Curated listings suited for ${label.toLowerCase()} duty cycles.` },
      { title: "All major brands", text: "FANUC, ABB, KUKA, Yaskawa, Universal Robots, Kawasaki and more." },
      { title: "Direct contact", text: "No middlemen — message the seller through RobotVerse." },
    ],
    faq: [
      {
        question: `Which brands make the best ${label.toLowerCase()} robots in India?`,
        answer: `FANUC, ABB, KUKA, Yaskawa and Kawasaki all offer proven ${label.toLowerCase()} robots widely deployed across Indian manufacturing. Browse the listings above to compare current options.`,
      },
      {
        question: `What payload and reach do I need for ${label.toLowerCase()}?`,
        answer: `Payload and reach depend on the part size, cycle time, and fixture. Most ${label.toLowerCase()} applications use 6-20 kg payload and 1.4-2.0 m reach — see each listing for exact specs.`,
      },
      {
        question: `Can I get installation and programming support?`,
        answer: `Yes — RobotVerse service partners cover installation, ${label.toLowerCase()} programming, and AMC in major Indian industrial hubs.`,
      },
    ],
  };

  return (
    <LandingPageLayout
      seo={seo}
      heroTitle={`${label} Industrial Robots`}
      heroSubtitle={`Verified ${label.toLowerCase()} robot listings on RobotVerse — across FANUC, ABB, KUKA, Yaskawa and more.`}
      loading={loading}
      emptyMessage={items.length === 0 ? `No ${label.toLowerCase()} robots are currently listed. Browse all robots at /robots or set up an alert.` : undefined}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((r) => (
          <Link to={`/robots/${r.id}`} key={r.id}>
            <Card className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-square bg-muted overflow-hidden">
                {r.images?.[0] && (
                  <img
                    src={r.images[0]}
                    alt={`${r.brand ?? ""} ${r.model ?? r.name} ${label} robot`.trim()}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold truncate">{r.brand} {r.model ?? r.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {r.year_manufactured ? `${r.year_manufactured} · ` : ""}{r.location}
                </p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </LandingPageLayout>
  );
}
