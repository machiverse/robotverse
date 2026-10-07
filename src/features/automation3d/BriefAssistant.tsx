import { useMemo } from "react";
import { CheckCircle2, CircleDashed, Lightbulb, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { analyzeDescription, matchTemplateIds } from "@/utils/processAnalyzer";
import { extractFacts } from "./solutionEngine";

const EXAMPLES: { label: string; text: string }[] = [
  {
    label: "Welding line",
    text: "We weld 12 kg mild-steel brackets by hand (MIG). Parts come on a conveyor, are welded in a fixture, inspected with a camera and stacked on pallets. We need 60 parts per hour, 2 shifts, 3 welders per shift.",
  },
  {
    label: "CNC machine tending",
    text: "Load and unload two CNC lathes with 5 kg steel shafts from trays. Cycle time 90 s per part, 3 shifts, 2 operators per shift. A cobot next to the operator is preferred.",
  },
  {
    label: "Food packing & palletizing",
    text: "Pack biscuit packets into cartons and palletize the cartons at the end of the line, 1500 packets per hour, food grade, 2 shifts with 6 people.",
  },
  {
    label: "Casting deburring",
    text: "Our operators deburr 4 kg aluminium castings by hand; it is dusty and slow. 60 parts per hour, 2 shifts, 2 operators per shift, 3 casting variants.",
  },
];

/**
 * Live help while the user writes the brief: what the studio understood so far,
 * how complete the brief is, one-click additions for missing facts, and examples.
 */
export default function BriefAssistant({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const facts = useMemo(() => extractFacts(value), [value]);
  const processes = useMemo(() => (matchTemplateIds(value).length ? analyzeDescription(value, null) : []), [value]);
  const arrives = /\b(conveyor|tray|trays|bin|bins|pallet|pallets|rack|by hand|loose|magazine|feeder)\b/i.test(value);

  const checks = [
    { ok: processes.length > 0, label: "Process named", weight: 40, add: "" },
    { ok: facts.weightKg != null, label: "Part weight", weight: 15, add: " Parts weigh about __ kg." },
    { ok: facts.partsPerHour != null, label: "Rate / cycle time", weight: 15, add: " We need __ parts per hour." },
    { ok: facts.shifts != null || facts.operators != null, label: "Shifts & operators", weight: 10, add: " We run __ shifts with __ operators per shift." },
    { ok: arrives, label: "How parts arrive", weight: 10, add: " Parts arrive on a conveyor / in trays / in bins." },
    { ok: facts.variants || /\b(one|single) (part|product|variant)\b/i.test(value), label: "Variants", weight: 10, add: " We run __ part variants." },
  ];
  const score = checks.reduce((n, c) => n + (c.ok ? c.weight : 0), 0);
  const level = score >= 80 ? "Detailed" : score >= 55 ? "Good" : score >= 40 ? "Basic" : "Too vague";

  const add = (text: string) => onChange(`${value.trim()}${text}`.trimStart());

  if (!value.trim())
    return (
      <div className="mt-3 rounded-lg border border-dashed border-border p-3">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Lightbulb className="h-3.5 w-3.5 text-amber-500" aria-hidden /> Start from an example
        </p>
        <div className="flex flex-wrap gap-1.5">
          {EXAMPLES.map((e) => (
            <button
              key={e.label}
              type="button"
              onClick={() => onChange(e.text)}
              className="rounded-full border border-border px-2.5 py-1 text-xs transition-colors duration-150 hover:border-primary hover:text-primary"
            >
              {e.label}
            </button>
          ))}
        </div>
      </div>
    );

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-border bg-muted/20 p-3" aria-live="polite">
      <div>
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="font-medium">Brief strength</span>
          <span className={cn("font-medium", score >= 55 ? "text-emerald-600 dark:text-emerald-400" : score >= 40 ? "text-amber-600" : "text-red-600")}>
            {level} · {score}%
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full transition-[width] duration-300", score >= 55 ? "bg-emerald-500" : score >= 40 ? "bg-amber-500" : "bg-red-500")}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">The studio understood</p>
        <div className="flex flex-wrap gap-1.5">
          {processes.map((p) => (
            <span key={p.name} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
              {p.name}
            </span>
          ))}
          {facts.weightKg != null && <Fact>{facts.weightKg} kg part</Fact>}
          {facts.partsPerHour != null && <Fact>{facts.partsPerHour} parts/h</Fact>}
          {facts.shifts != null && <Fact>{facts.shifts} shifts</Fact>}
          {facts.operators != null && <Fact>{facts.operators} operators</Fact>}
          {facts.material && <Fact>{facts.material}</Fact>}
          {facts.cobotWanted && <Fact>cobot preferred</Fact>}
          {facts.hygienic && <Fact>hygienic / GMP</Fact>}
          {facts.variants && <Fact>several variants</Fact>}
          {processes.length === 0 && <span className="text-xs text-muted-foreground">No process yet — name the work, e.g. weld, grind, pack, palletize, load a CNC.</span>}
        </div>
      </div>

      <ul className="grid gap-1 sm:grid-cols-2">
        {checks.map((c) => (
          <li key={c.label} className="flex items-center justify-between gap-2 text-xs">
            <span className="flex items-center gap-1.5">
              {c.ok ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" aria-hidden /> : <CircleDashed className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />}
              <span className={c.ok ? "text-foreground" : "text-muted-foreground"}>{c.label}</span>
            </span>
            {!c.ok && c.add && (
              <button type="button" onClick={() => add(c.add)} className="inline-flex items-center gap-0.5 text-primary hover:underline">
                <Plus className="h-3 w-3" aria-hidden /> Add
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Fact({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-border bg-background px-2 py-0.5 text-xs">{children}</span>;
}
