import { useEffect, useId, useState } from "react";
import { cn } from "@/lib/utils";
import { MOTION_ORDER, MOTION_SYSTEMS, travelSeconds, type MotionType } from "./robotMotion";

export interface MotionChoice {
  type: MotionType;
  length: number;
}

/**
 * How a robot is mounted and moves between places: bolted down, riding a 7th-axis floor track, hanging from an
 * overhead track, in a gantry, on a mobile base, a lift column or a rail cart — and how far it travels.
 * The travel slider re-plans when the user lets go, so dragging stays smooth.
 */
export default function RobotBaseControl({ value, onChange, className }: { value: MotionChoice; onChange: (m: MotionChoice) => void; className?: string }) {
  const sys = MOTION_SYSTEMS[value.type];
  const [draft, setDraft] = useState(value.length);
  useEffect(() => setDraft(value.length), [value.length, value.type]);
  const moving = value.type !== "fixed";
  const commit = () => draft !== value.length && onChange({ type: value.type, length: draft });
  const step = value.type === "lift" ? 0.1 : 0.5;
  const id = useId();
  return (
    <div className={cn("rounded-md border border-border bg-background/60 p-2 text-[11px]", className)}>
      <label htmlFor={id} className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Robot base</span>
        <select
          id={id}
          value={value.type}
          onChange={(e) => {
            const type = e.target.value as MotionType;
            onChange({ type, length: MOTION_SYSTEMS[type].length.def });
          }}
          className="h-7 min-w-0 max-w-[62%] rounded-md border border-border bg-background px-1.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {MOTION_ORDER.map((t) => (
            <option key={t} value={t}>
              {MOTION_SYSTEMS[t].name}
            </option>
          ))}
        </select>
      </label>
      {moving && (
        <div className="mt-2">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-muted-foreground">{value.type === "lift" ? "Lift" : "Travel"}</span>
            <span className="tabular-nums text-foreground">
              {draft.toFixed(1)} m · {travelSeconds(value.type, draft).toFixed(1)} s each way
            </span>
          </div>
          <input
            type="range"
            min={sys.length.min}
            max={sys.length.max}
            step={step}
            value={draft}
            aria-label={value.type === "lift" ? "Lift height in metres" : "Travel length in metres"}
            onChange={(e) => setDraft(Number(e.target.value))}
            onPointerUp={commit}
            onKeyUp={commit}
            onBlur={commit}
            className="mt-1 w-full accent-primary"
          />
        </div>
      )}
      <p className="mt-1.5 leading-snug text-muted-foreground">{moving ? sys.when[0] : "Bolted down: everything it serves stands within its reach."}</p>
    </div>
  );
}
