/**
 * /compare/:slug — slug shape "<brand-a-model-a>-vs-<brand-b-model-b>"
 * Loads two robots by best-effort brand/model match, renders a side-by-side
 * comparison and AEO block.
 */

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import LandingPageLayout from "@/components/landing/LandingPageLayout";
import { Card } from "@/components/ui/card";

const titleCase = (s: string) =>
  s.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

async function findRobot(query: string) {
  const tokens = query.split(/[-\s]+/).filter(Boolean);
  if (tokens.length === 0) return null;
  const brand = tokens[0];
  const model = tokens.slice(1).join(" ");
  const q = supabase
    .from("robots")
    .select("id, brand, model, year_manufactured, payload, reach, axes, controller_type, price, images, location")
    .ilike("brand", `%${brand}%`)
    .order("updated_at", { ascending: false })
    .limit(1);
  const { data } = model ? await q.ilike("model", `%${model}%`) : await q;
  return data?.[0] ?? null;
}

export default function CompareRobots() {
  const { slug = "" } = useParams<{ slug: string }>();
  const [a, setA] = useState<any | null>(null);
  const [b, setB] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const [leftRaw, rightRaw] = slug.split(/-vs-/i);
  const leftLabel = titleCase(leftRaw ?? "");
  const rightLabel = titleCase(rightRaw ?? "");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [ra, rb] = await Promise.all([findRobot(leftRaw ?? ""), findRobot(rightRaw ?? "")]);
      if (!cancelled) {
        setA(ra);
        setB(rb);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [leftRaw, rightRaw]);

  const title = `${leftLabel} vs ${rightLabel} — Industrial Robot Comparison`;
  const seo = {
    title: `${title} | RobotVerse`,
    description: `Side-by-side comparison of ${leftLabel} and ${rightLabel} industrial robots: payload, reach, axes, controller, price in India, and availability.`,
    canonical: `/compare/${slug.toLowerCase()}`,
    keywords: [
      `${leftLabel} vs ${rightLabel}`,
      `${leftLabel} comparison`,
      `${rightLabel} comparison`,
      `${leftLabel} or ${rightLabel}`,
    ],
    summary: `Compare ${leftLabel} and ${rightLabel} on payload, reach, axes, controller, footprint, and live India pricing. RobotVerse pulls specs from verified seller listings.`,
    highlights: [
      a && { title: leftLabel, text: `${a.payload ?? "—"} kg payload · ${a.reach ?? "—"} mm reach · ${a.axes ?? "—"} axes` },
      b && { title: rightLabel, text: `${b.payload ?? "—"} kg payload · ${b.reach ?? "—"} mm reach · ${b.axes ?? "—"} axes` },
    ].filter(Boolean) as any[],
    faq: [
      {
        question: `Which is better: ${leftLabel} or ${rightLabel}?`,
        answer: `It depends on payload, reach, and integrator support in your region. The table above lists live India listings for both — pick the one whose specs match your application and whose seller is closest to your plant.`,
      },
      {
        question: `What is the price difference between ${leftLabel} and ${rightLabel} in India?`,
        answer: a?.price && b?.price
          ? `Current RobotVerse listings: ${leftLabel} at ₹${a.price.toLocaleString()} and ${rightLabel} at ₹${b.price.toLocaleString()}. Prices vary by year, condition, and accessories.`
          : `Live prices vary by year and condition — open the listings above for current quotes.`,
      },
    ],
  };

  const Row = ({ label, l, r }: { label: string; l: any; r: any }) => (
    <tr className="border-b border-border">
      <td className="py-2 pr-4 font-medium text-muted-foreground">{label}</td>
      <td className="py-2 pr-4">{l ?? "—"}</td>
      <td className="py-2">{r ?? "—"}</td>
    </tr>
  );

  return (
    <LandingPageLayout
      seo={seo}
      heroTitle={title}
      heroSubtitle="Specs, pricing, and availability — pulled from live RobotVerse seller listings."
      loading={loading}
      emptyMessage={!a && !b ? `Could not find a robot matching "${leftLabel}" or "${rightLabel}". Try the format brand-model-vs-brand-model.` : undefined}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {[a, b].map((r, i) => (
          <Card key={i} className="p-4">
            <h2 className="font-semibold mb-2">{i === 0 ? leftLabel : rightLabel}</h2>
            {r ? (
              <div className="flex gap-4">
                {r.images?.[0] && (
                  <img src={r.images?.[0]} alt={`${r.brand} ${r.model}`} className="w-32 h-32 object-cover rounded" loading="lazy" />
                )}
                <div className="text-sm text-muted-foreground">
                  <div>{r.brand} {r.model}</div>
                  <div>Year: {r.year_manufactured}</div>
                  <div>Location: {r.location}</div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No live listing matched this query.</p>
            )}
          </Card>
        ))}
      </div>

      <Card className="p-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 pr-4">Spec</th>
              <th className="text-left py-2 pr-4">{leftLabel}</th>
              <th className="text-left py-2">{rightLabel}</th>
            </tr>
          </thead>
          <tbody>
            <Row label="Payload (kg)" l={a?.payload} r={b?.payload} />
            <Row label="Reach (mm)" l={a?.reach} r={b?.reach} />
            <Row label="Axes" l={a?.axes} r={b?.axes} />
            <Row label="Controller" l={a?.controller_type} r={b?.controller_type} />
            <Row label="Year" l={a?.year_manufactured} r={b?.year_manufactured} />
            <Row label="Price (₹)" l={a?.price?.toLocaleString()} r={b?.price?.toLocaleString()} />
          </tbody>
        </table>
      </Card>
    </LandingPageLayout>
  );
}
