import { useState } from "react";
import { ArrowDown, ArrowUp, Play, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Common robot jobs, named exactly like the studio's process templates. */
export const BLOCKS: { name: string; label: string; group: string }[] = [
  { name: "Loading & Unloading", label: "Pick & place / load", group: "Handling" },
  { name: "Bin Picking", label: "Bin picking", group: "Handling" },
  { name: "Material Transport", label: "Transfer / transport", group: "Handling" },
  { name: "Depalletizing", label: "Depalletizing", group: "Handling" },
  { name: "Kitting & Sequencing", label: "Kitting", group: "Handling" },
  { name: "Mobile Manipulator Machine Tending", label: "Mobile robot tending", group: "Handling" },
  { name: "Order Picking", label: "Order picking", group: "Handling" },
  { name: "Sorting & Classification", label: "Sorting", group: "Handling" },
  { name: "Glass Handling", label: "Glass / panel handling", group: "Handling" },
  { name: "Tyre Handling & Loading", label: "Tyre / wheel handling", group: "Handling" },
  { name: "Coil & Roll Handling", label: "Coil / roll handling", group: "Handling" },
  { name: "Food Handling & Tray Loading", label: "Food pick & place", group: "Handling" },
  { name: "Truck & Container Unloading", label: "Truck unloading", group: "Handling" },
  { name: "Injection Moulding Tending", label: "Moulding machine tending", group: "Machine tending" },
  { name: "CNC Machining", label: "CNC machine tending", group: "Machine tending" },
  { name: "CNC Turning", label: "CNC lathe tending", group: "Machine tending" },
  { name: "Press Tending & Stamping", label: "Press tending", group: "Machine tending" },
  { name: "Die Casting Extraction", label: "Die casting extraction", group: "Machine tending" },
  { name: "Press Brake Bending", label: "Press brake bending", group: "Machine tending" },
  { name: "Forging Handling", label: "Forging press tending", group: "Machine tending" },
  { name: "Sheet Loading & Nested Part Sorting", label: "Laser / punch sheet loading", group: "Machine tending" },
  { name: "MIG/MAG Welding", label: "MIG/MAG welding", group: "Welding" },
  { name: "TIG Welding", label: "TIG welding", group: "Welding" },
  { name: "Spot Welding", label: "Spot welding", group: "Welding" },
  { name: "Laser Welding", label: "Laser welding", group: "Welding" },
  { name: "Ultrasonic Plastic Welding", label: "Ultrasonic plastic welding", group: "Welding" },
  { name: "Stud Welding", label: "Stud welding", group: "Welding" },
  { name: "Pipe & Orbital Welding", label: "Pipe welding", group: "Welding" },
  { name: "Grinding & Surface Prep", label: "Grinding", group: "Finishing" },
  { name: "Polishing", label: "Polishing", group: "Finishing" },
  { name: "Foundry Fettling & Grinding", label: "Foundry fettling", group: "Finishing" },
  { name: "Deflashing & Surface Finishing", label: "Deflashing / deburring", group: "Finishing" },
  { name: "Painting & Coating", label: "Painting / coating", group: "Finishing" },
  { name: "Powder Coating", label: "Powder coating", group: "Finishing" },
  { name: "Adhesive & Sealant Dispensing", label: "Glue / sealant dispensing", group: "Finishing" },
  { name: "Potting, Gap Filler & Conformal Coating", label: "Potting / conformal coating", group: "Finishing" },
  { name: "Laser Cleaning & Surface Prep", label: "Laser cleaning", group: "Finishing" },
  { name: "Assembly", label: "Assembly", group: "Assembly" },
  { name: "Screw Driving", label: "Screw driving", group: "Assembly" },
  { name: "Riveting Assembly", label: "Riveting", group: "Assembly" },
  { name: "Wire Harness Assembly", label: "Wire harness", group: "Assembly" },
  { name: "Battery Module Assembly", label: "EV battery module", group: "Assembly" },
  { name: "Bearing Insertion Assembly", label: "Bearing / press-fit insertion", group: "Assembly" },
  { name: "Quality Inspection", label: "Quality inspection", group: "Quality" },
  { name: "Vision Inspection", label: "Vision inspection", group: "Quality" },
  { name: "Dimensional Measurement & Gauging", label: "Measuring / gauging", group: "Quality" },
  { name: "Leak Testing", label: "Leak testing", group: "Quality" },
  { name: "Testing & Validation", label: "Function testing", group: "Quality" },
  { name: "Laser Marking & Coding", label: "Laser marking / coding", group: "Quality" },
  { name: "Barcode Scanning & Verification", label: "Barcode scanning", group: "Quality" },
  { name: "Filling", label: "Filling", group: "Packing" },
  { name: "Capping", label: "Capping", group: "Packing" },
  { name: "Labeling & Weighing", label: "Labeling", group: "Packing" },
  { name: "Packing & Box Forming", label: "Packing in boxes", group: "Packing" },
  { name: "Wrapping & Packing", label: "Wrapping", group: "Packing" },
  { name: "Palletizing", label: "Palletizing", group: "Packing" },
  { name: "Cartoning (Product into Cartons)", label: "Cartoning", group: "Packing" },
  { name: "Bag & Sack Palletizing", label: "Bag / sack palletizing", group: "Packing" },
  { name: "Brick & Block Stacking", label: "Brick / block stacking", group: "Packing" },
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
