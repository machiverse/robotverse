import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Download, ExternalLink, Mail, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { mailto, type CatalogItem } from "./directoryTypes";
import { BOM_GROUPS, bomCsv, buildBom, robotKind, type BomItem } from "./robotBom";

interface PartRow {
  id: string;
  component_type: string;
  brand: string;
  model: string;
  name: string;
  thumb_url: string | null;
  compatible_with: string[];
}

// directory_parts is not in the generated types yet, so it is read through a loose client.
type Q = { select: (c: string) => Q; in: (c: string, v: string[]) => Q; limit: (n: number) => Promise<{ data: unknown[] | null }> };
const loadParts = async (types: string[]): Promise<PartRow[]> => {
  if (!types.length) return [];
  const { data } = await (supabase as unknown as { from: (t: string) => Q })
    .from("directory_parts")
    .select("id, component_type, brand, model, name, thumb_url, compatible_with")
    .in("component_type", types)
    .limit(2000);
  return (data as PartRow[]) ?? [];
};

const norm = (s: string) => s.toLowerCase().split(/\s+/)[0].replace(/[^a-z0-9]/g, "");
const KIND_LABEL = { industrial: "Industrial robot", cobot: "Collaborative robot", scara: "SCARA robot", delta: "Delta robot", palletizer: "Palletizing robot" };

/**
 * "What is inside this robot": every component group with the parts that wear or fail,
 * matching OEM parts from the Parts & Components directory, and quick links to buy or enquire.
 */
export default function RobotComponents({ robot }: { robot: CatalogItem }) {
  const items = useMemo(() => buildBom(robot), [robot]);
  const types = useMemo(() => [...new Set(items.map((i) => i.partType).filter(Boolean) as string[])], [items]);
  const { data: parts = [] } = useQuery({ queryKey: ["directory", "parts-for", types.join("|")], queryFn: () => loadParts(types), staleTime: 5 * 60 * 1000 });

  const brand = norm(robot.b);
  const matchesFor = (i: BomItem) =>
    parts
      .filter((p) => p.component_type === i.partType)
      .map((p) => ({ p, score: (norm(p.brand) === brand ? 2 : 0) + (p.compatible_with?.some((c) => norm(c) === brand) ? 1 : 0) }))
      .sort((a, b) => b.score - a.score || Number(!!b.p.thumb_url) - Number(!!a.p.thumb_url))
      .slice(0, 3)
      .map((x) => x.p);

  const download = () => {
    const url = URL.createObjectURL(new Blob([bomCsv(robot, items)], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${robot.id}-${robot.m.replace(/[^\w.-]+/g, "_")}-components.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const quote = (i: BomItem) =>
    mailto(
      `Spare part enquiry: ${i.name} for ${robot.n} (${robot.id})`,
      `Hello RobotVerse team,\n\nPlease quote the following spare part:\n\nRobot: ${robot.n} (RobotVerse ID ${robot.id})\nPart: ${i.name}\nRobot serial number:\nController type:\nQuantity:\nNew / refurbished / exchange:\n\nName:\nCompany:\nPhone:\n\nThank you.`,
    );

  return (
    <section aria-labelledby="bom-title" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 id="bom-title" className="flex items-center gap-2 text-base font-semibold">
            <Wrench className="h-4 w-4 text-primary" /> Components & spare parts
          </h3>
          <p className="text-xs text-muted-foreground">
            {KIND_LABEL[robotKind(robot)]} · {items.length} components in {BOM_GROUPS.filter((g) => items.some((i) => i.group === g)).length} groups
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={download}>
          <Download className="mr-1.5 h-3.5 w-3.5" /> Download list (CSV)
        </Button>
      </div>

      <div className="divide-y divide-border rounded-lg border border-border">
        {BOM_GROUPS.map((g, gi) => {
          const list = items.filter((i) => i.group === g);
          if (!list.length) return null;
          return (
            <details key={g} open={gi === 0} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-sm font-medium hover:bg-muted/50">
                <span>
                  {g} <span className="text-muted-foreground">({list.length})</span>
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <ul className="space-y-2 px-3 pb-3">
                {list.map((i) => {
                  const m = i.partType ? matchesFor(i) : [];
                  return (
                    <li key={i.name} className="rounded-md border border-border/70 bg-background p-2.5 text-sm">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                        <b>{i.name}</b>
                        <span className="text-xs text-muted-foreground">Qty {i.qty}</span>
                      </div>
                      <p className="mt-0.5 text-muted-foreground">{i.what}</p>
                      {i.spec && <p className="mt-1 text-xs"><span className="text-muted-foreground">Spec:</span> {i.spec}</p>}
                      {i.service && <p className="mt-0.5 text-xs"><span className="text-muted-foreground">Service:</span> {i.service}</p>}
                      {m.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {m.map((p) => (
                            <a
                              key={p.id}
                              href={`/directory?tab=parts&q=${encodeURIComponent(p.model)}`}
                              className="inline-flex max-w-full items-center gap-1.5 rounded border border-border bg-muted/40 px-1.5 py-1 text-xs hover:border-primary"
                            >
                              {p.thumb_url && <img src={p.thumb_url} alt="" className="h-6 w-6 rounded bg-white object-contain" loading="lazy" />}
                              <span className="truncate">{p.name}</span>
                              {norm(p.brand) === brand && <Badge variant="secondary" className="h-4 px-1 text-[9px]">OEM</Badge>}
                            </a>
                          ))}
                        </div>
                      )}
                      <div className="mt-2 flex flex-wrap gap-3 text-xs">
                        <a href={`/parts?search=${encodeURIComponent(i.search)}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                          <ExternalLink className="h-3 w-3" /> Find in spare parts
                        </a>
                        <a href={quote(i)} className="inline-flex items-center gap-1 text-primary hover:underline">
                          <Mail className="h-3 w-3" /> Request a quote
                        </a>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </details>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        Component families and sizes are indicative for this model type. Exact part numbers depend on the robot's serial number and controller —
        send them with your enquiry and we confirm the right part.
      </p>
    </section>
  );
}
