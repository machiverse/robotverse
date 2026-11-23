import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { cellEquipment, chosenProduct, EQUIPMENT_GROUPS, lineEquipment, type CellItem, type CellStep } from "./cellEquipment.js";

/**
 * Everything one robot cell needs, grouped the way an integrator quotes it: robot system, process
 * equipment, safety and utilities. The same list the 3D cell is built from, so a dot marks what the
 * scene shows and "on the arm" what is mounted on the robot.
 */
export default function CellEquipmentList({
  jobs,
  fenced,
  steps,
  products,
  compact = false,
  withLine = true,
  className,
}: {
  jobs: string[];
  /** An industrial (fenced) cell, or a cobot cell. */
  fenced: boolean;
  /** The robot's steps, for a cell whose jobs are not named. */
  steps?: CellStep[];
  /** Product names the user chose, shown on the equipment they match. */
  products?: string[];
  /** Names only (reasons on hover), for narrow panels. */
  compact?: boolean;
  /** Also list what the whole line shares (the line PLC and operator panel). */
  withLine?: boolean;
  className?: string;
}) {
  const items = useMemo(() => cellEquipment(jobs, { fenced, steps }), [jobs, fenced, steps]);
  const line = withLine ? lineEquipment() : [];
  const row = (x: CellItem) => {
    const product = chosenProduct(x, products);
    return (
      <li key={x.name} title={x.why} className="flex items-start gap-2 py-1">
        <span
          aria-hidden
          className={cn("mt-[0.45em] h-1.5 w-1.5 shrink-0 rounded-full", x.model && x.at !== "arm" ? "bg-primary" : x.at === "arm" ? "bg-amber-500" : "bg-muted-foreground/30")}
        />
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] leading-snug">
            {product ?? x.name}
            {x.at === "arm" && <span className="text-muted-foreground"> · on the arm</span>}
          </span>
          {!compact && <span className="block text-[11px] leading-snug text-muted-foreground">{product ? x.name : x.why}</span>}
        </span>
      </li>
    );
  };
  return (
    <div className={cn("text-foreground", className)}>
      {EQUIPMENT_GROUPS.map(([group, title]) => {
        const list = items.filter((x) => x.group === group);
        if (!list.length) return null;
        return (
          <section key={group} className="mt-2 first:mt-0">
            <h4 className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{title}</h4>
            <ul className="mt-0.5">{list.map(row)}</ul>
          </section>
        );
      })}
      {line.length > 0 && (
        <section className="mt-2">
          <h4 className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Shared by the line</h4>
          <ul className="mt-0.5">{line.map(row)}</ul>
        </section>
      )}
      <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 border-t border-border pt-2 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-primary" /> In the 3D cell
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-amber-500" /> On the robot
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" /> In the quote
        </span>
      </p>
    </div>
  );
}
