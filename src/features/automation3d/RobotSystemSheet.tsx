import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { robotSystem, type ChosenRobot } from "./robotSystem";

const H = ({ children }: { children: React.ReactNode }) => (
  <h4 className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{children}</h4>
);

/** The complete robot system for one job: process steps, robot, controller, pendant, tool, cables, signals, wear parts. */
export default function RobotSystemSheet({
  job,
  robot,
  fenced,
  compact = false,
  className,
}: {
  job: string;
  robot?: ChosenRobot;
  fenced?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const s = useMemo(() => robotSystem(job, { robot, fenced }), [job, robot?.name, robot?.brand, robot?.payload, robot?.reach, fenced]); // eslint-disable-line react-hooks/exhaustive-deps
  const [more, setMore] = useState(!compact);
  const row = (a: React.ReactNode, b?: React.ReactNode, k?: string | number) => (
    <li key={k} className="py-0.5">
      <span className="block text-[13px] leading-snug">{a}</span>
      {b && <span className="block text-[11px] leading-snug text-muted-foreground">{b}</span>}
    </li>
  );
  return (
    <div className={cn("space-y-2 text-foreground", className)}>
      <section>
        <H>How it works</H>
        <ol className="mt-0.5 list-decimal space-y-0.5 pl-4 text-[13px] leading-snug">
          {s.howItWorks.map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ol>
      </section>
      <section>
        <H>Robot & controller</H>
        <ul className="mt-0.5">
          {row(s.robot.model, [s.robot.payload, s.robot.reach].filter(Boolean).join(" · ") || undefined, "r")}
          {row(`Controller: ${s.controller}`, s.controllerNote, "c")}
          {s.isArm && row(`Teach pendant: ${s.pendant}`, `Cable ${s.pendantCable}`, "p")}
          {s.software.length > 0 && row(`Software: ${s.software.join(" · ")}`, undefined, "s")}
          {s.isArm && row(`Safety: ${s.safety}`, `Fieldbus: ${s.fieldbus} · Flange: ${s.flange}`, "f")}
        </ul>
      </section>
      {compact && (
        <button
          type="button"
          onClick={() => setMore((v) => !v)}
          className="text-xs font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {more ? "Hide cables, signals and wear parts" : "Show cables, signals and wear parts"}
        </button>
      )}
      {more && (
        <>
          <section>
            <H>End-of-arm tool</H>
            <ul className="mt-0.5">{s.eoat.map((x, i) => row(x.name, [x.examples, x.what].filter(Boolean).join(" — ") || undefined, i))}</ul>
            <p className="mt-1 text-[11px] text-muted-foreground">On the flange: {s.onArm.join(" · ")}</p>
          </section>
          <section>
            <H>Cables & hoses</H>
            <ul className="mt-0.5">{s.cables.map((x, i) => row(x.name, `${x.from} → ${x.to} · ${x.carries}`, i))}</ul>
          </section>
          <section>
            <H>Signals robot ⇄ machine</H>
            <p className="mt-1 flex flex-wrap gap-1">
              {s.signals.map((x) => (
                <span key={x} className="rounded bg-muted px-1.5 py-0.5 text-[11px]">
                  {x}
                </span>
              ))}
            </p>
          </section>
          <section>
            <H>Small parts & wear items</H>
            <ul className="mt-0.5">{s.consumables.map((x, i) => row(x.name, `replace: ${x.replace}`, i))}</ul>
          </section>
        </>
      )}
      <p className="border-t border-border pt-2 text-[11px] text-muted-foreground">Typical models — confirm exact part numbers with the OEM</p>
    </div>
  );
}
