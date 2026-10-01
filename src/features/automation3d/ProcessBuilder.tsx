import { useState } from "react";
import { ArrowDown, ArrowUp, Play, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Common robot jobs, named exactly like the studio's process templates. */
export const BLOCKS: { name: string; label: string; group: string }[] = [
  { name: "Loading & Unloading", label: "Pick & place / load", group: "Handling" },
  { name: "Bin Picking", label: "Bin picking", group: "Handling" },
  { name: "Material Transport", label: "Transfer / transport", group: "Handling" },
  { name: "Injection Moulding Tending", label: "Moulding machine tending", group: "Machine tending" },
  { name: "CNC Machining", label: "CNC machine tending", group: "Machine tending" },
  { name: "Press Tending & Stamping", label: "Press tending", group: "Machine tending" },
  { name: "MIG/MAG Welding", label: "MIG/MAG welding", group: "Welding" },
  { name: "TIG Welding", label: "TIG welding", group: "Welding" },
  { name: "Spot Welding", label: "Spot welding", group: "Welding" },
  { name: "Grinding & Surface Prep", label: "Grinding", group: "Finishing" },
  { name: "Polishing", label: "Polishing", group: "Finishing" },
  { name: "Painting & Coating", label: "Painting / coating", group: "Finishing" },
  { name: "Adhesive & Sealant Dispensing", label: "Glue / sealant dispensing", group: "Finishing" },
  { name: "Assembly", label: "Assembly", group: "Assembly" },
  { name: "Screw Driving", label: "Screw driving", group: "Assembly" },
  { name: "Quality Inspection", label: "Quality inspection", group: "Quality" },
  { name: "Vision Inspection", label: "Vision inspection", group: "Quality" },
  { name: "Filling", label: "Filling", group: "Packing" },
  { name: "Capping", label: "Capping", group: "Packing" },
  { name: "Labeling & Weighing", label: "Labeling", group: "Packing" },
  { name: "Packing & Box Forming", label: "Packing in boxes", group: "Packing" },
  { name: "Palletizing", label: "Palletizing", group: "Packing" },
];
const GROUPS = [...new Set(BLOCKS.map((b) => b.group))];
const MAX = 8;

/**
 * Point-and-click line builder: tap the jobs in order, reorder them, and build the robot cell.
 * Each block is a studio process template, so the plan, robots and 3D follow exactly.
 */
export default function ProcessBuilder({ onBuild }: { onBuild: (names: string[]) => void }) {
  const [line, setLine] = useState<string[]>([]);
  const label = (n: string) => BLOCKS.find((b) => b.name === n)?.label ?? n;
  const add = (n: string) => setLine((l) => (l.length >= MAX ? l : [...l, n]));
  const move = (i: number, d: -1 | 1) =>
    setLine((l) => {
      const j = i + d;
      if (j < 0 || j >= l.length) return l;
      const next = [...l];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1.5 text-[11px] font-semibold text-muted-foreground">1. Tap the jobs in the order they happen</p>
        <div className="space-y-1.5">
          {GROUPS.map((g) => (
            <div key={g}>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{g}</p>
              <div className="mt-0.5 flex flex-wrap gap-1">
                {BLOCKS.filter((b) => b.group === g).map((b) => (
                  <button
                    key={b.name}
                    type="button"
                    onClick={() => add(b.name)}
                    disabled={line.length >= MAX}
                    className="inline-flex items-center gap-0.5 rounded-full border border-border bg-background px-2 py-0.5 text-[11px] transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
                  >
                    <Plus className="h-3 w-3" aria-hidden /> {b.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-[11px] font-semibold text-muted-foreground">
          2. Your process ({line.length}/{MAX})
        </p>
        {line.length === 0 ? (
          <p className="rounded-md border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
            No jobs yet — tap a job above to add it.
          </p>
        ) : (
          <ol className="space-y-1">
            {line.map((n, i) => (
              <li key={`${n}-${i}`} className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-xs">
                <span className="w-4 font-mono text-[10px] text-muted-foreground">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate">{label(n)}</span>
                <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className="rounded p-0.5 hover:bg-muted disabled:opacity-30">
                  <ArrowUp className="h-3 w-3" />
                </button>
                <button type="button" aria-label="Move down" disabled={i === line.length - 1} onClick={() => move(i, 1)} className="rounded p-0.5 hover:bg-muted disabled:opacity-30">
                  <ArrowDown className="h-3 w-3" />
                </button>
                <button type="button" aria-label={`Remove ${label(n)}`} onClick={() => setLine((l) => l.filter((_, k) => k !== i))} className={cn("rounded p-0.5 hover:bg-muted hover:text-red-600")}>
                  <X className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>

      <Button className="w-full" disabled={!line.length} onClick={() => onBuild(line)}>
        <Play className="mr-2 h-4 w-4" /> 3. Build simulation
      </Button>
      <p className="text-[11px] text-muted-foreground">Then choose the robot and tool for each job in the robot list — they appear in the 3D cell.</p>
    </div>
  );
}
