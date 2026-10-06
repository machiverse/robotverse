import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { calc } from "./engineerPlaybook";

/** The everyday sums of an automation engineer, as small live calculators. */

function Num({ label, value, onChange, step = 1, min = 0, unit }: { label: string; value: number; onChange: (v: number) => void; step?: number; min?: number; unit?: string }) {
  return (
    <label className="text-xs">
      <span className="text-muted-foreground">
        {label}
        {unit ? ` (${unit})` : ""}
      </span>
      <input
        type="number"
        inputMode="decimal"
        min={min}
        step={step}
        value={Number.isFinite(value) ? value : ""}
        onChange={(e) => onChange(Math.max(min, Number(e.target.value) || 0))}
        className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm tabular-nums"
      />
    </label>
  );
}

function Card({ title, why, children, result, ok }: { title: string; why: string; children: ReactNode; result: ReactNode; ok?: boolean }) {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card p-4">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{why}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">{children}</div>
      <div
        className={cn(
          "mt-3 rounded-lg px-3 py-2 text-sm",
          ok === undefined ? "bg-muted/60" : ok ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/10 text-amber-700 dark:text-amber-300",
        )}
        aria-live="polite"
      >
        {result}
      </div>
    </div>
  );
}

const f1 = (v: number) => (Number.isFinite(v) ? v.toLocaleString("en-IN", { maximumFractionDigits: 1 }) : "—");
const f0 = (v: number) => (Number.isFinite(v) ? Math.round(v).toLocaleString("en-IN") : "—");

export default function EngineeringCalculators() {
  const [t, setT] = useState({ hours: 8, breaks: 60, shifts: 2, parts: 600, cycle: 45 });
  const [p, setP] = useState({ part: 6, tool: 3, offset: 120 });
  const [v, setV] = useState({ part: 4, cups: 4, cup: 40, kpa: 60, accel: 5, side: 0 });
  const [g, setG] = useState({ part: 3, accel: 5, mu: 0.2, jaws: 2 });
  const [s, setS] = useState({ stop: 300, device: 20, res: 14 });
  const [c, setC] = useState({ fov: 200, feature: 0.5 });

  const takt = calc.takt(t.hours, t.breaks, t.shifts, t.parts);
  const robots = calc.robotsFor(t.cycle, takt);
  const pay = calc.payload(p.part, p.tool, p.offset);
  const vac = calc.vacuum(v.part, v.cups, v.cup, v.kpa, v.accel, !!v.side);
  const grip = calc.gripForce(g.part, g.accel, g.mu, g.jaws);
  const dist = calc.safetyDistance(s.stop, s.device, s.res);
  const cam = calc.vision(c.fov, c.feature);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <Card
        title="Takt time and robot count"
        why="How fast the line must run, and how many robots share the work."
        result={
          <>
            Takt <b>{f1(takt)} s</b> per part · <b>{robots}</b> robot{robots === 1 ? "" : "s"} for a {t.cycle} s robot cycle (at 85% loading)
          </>
        }
      >
        <Num label="Shift length" unit="h" value={t.hours} onChange={(x) => setT({ ...t, hours: x })} step={0.5} />
        <Num label="Breaks per shift" unit="min" value={t.breaks} onChange={(x) => setT({ ...t, breaks: x })} step={5} />
        <Num label="Shifts per day" value={t.shifts} onChange={(x) => setT({ ...t, shifts: x })} min={1} />
        <Num label="Parts per day" value={t.parts} onChange={(x) => setT({ ...t, parts: x })} step={10} min={1} />
        <Num label="Robot cycle for all tasks" unit="s" value={t.cycle} onChange={(x) => setT({ ...t, cycle: x })} />
      </Card>

      <Card title="Robot payload" why="Part and tool at the wrist, with margin, and the twisting load on the wrist." result={<>Choose a robot of at least <b>{f1(pay.withMargin)} kg</b> · wrist moment <b>{f1(pay.momentNm)} N·m</b> — check it against the robot's allowable moment</>}>
        <Num label="Heaviest part" unit="kg" value={p.part} onChange={(x) => setP({ ...p, part: x })} step={0.5} />
        <Num label="Gripper / tool" unit="kg" value={p.tool} onChange={(x) => setP({ ...p, tool: x })} step={0.5} />
        <Num label="Load centre from flange" unit="mm" value={p.offset} onChange={(x) => setP({ ...p, offset: x })} step={10} />
      </Card>

      <Card
        title="Vacuum gripper"
        why="Do the suction cups hold the part at full acceleration?"
        ok={vac.ok}
        result={
          <>
            Holds <b>{f0(vac.hold)} N</b>, needs <b>{f0(vac.need)} N</b> — {vac.ok ? "OK" : `too weak: use cups of about ${f0(vac.minCup)} mm or more cups`}
          </>
        }
      >
        <Num label="Part" unit="kg" value={v.part} onChange={(x) => setV({ ...v, part: x })} step={0.5} />
        <Num label="Number of cups" value={v.cups} onChange={(x) => setV({ ...v, cups: x })} min={1} />
        <Num label="Cup diameter" unit="mm" value={v.cup} onChange={(x) => setV({ ...v, cup: x })} step={5} />
        <Num label="Vacuum" unit="kPa" value={v.kpa} onChange={(x) => setV({ ...v, kpa: x })} step={5} />
        <Num label="Acceleration" unit="m/s²" value={v.accel} onChange={(x) => setV({ ...v, accel: x })} />
        <label className="text-xs">
          <span className="text-muted-foreground">Cups face</span>
          <select value={v.side} onChange={(e) => setV({ ...v, side: Number(e.target.value) })} className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm">
            <option value={0}>Down (lift)</option>
            <option value={1}>Sideways (shear)</option>
          </select>
        </label>
      </Card>

      <Card title="Finger grip force" why="Clamping force a friction gripper needs, safety factor 2." result={<>Each jaw must press with at least <b>{f0(grip)} N</b></>}>
        <Num label="Part" unit="kg" value={g.part} onChange={(x) => setG({ ...g, part: x })} step={0.5} />
        <Num label="Acceleration" unit="m/s²" value={g.accel} onChange={(x) => setG({ ...g, accel: x })} />
        <Num label="Friction (steel on steel ≈ 0.2)" value={g.mu} onChange={(x) => setG({ ...g, mu: x })} step={0.05} />
        <Num label="Jaws" value={g.jaws} onChange={(x) => setG({ ...g, jaws: x })} min={1} />
      </Card>

      <Card title="Light-curtain safety distance" why="How far the curtain must be from the danger zone (ISO 13855)." result={<>Mount the light curtain at least <b>{f0(dist)} mm</b> from the nearest hazard</>}>
        <Num label="Robot stopping time" unit="ms" value={s.stop} onChange={(x) => setS({ ...s, stop: x })} step={10} />
        <Num label="Curtain response" unit="ms" value={s.device} onChange={(x) => setS({ ...s, device: x })} />
        <Num label="Curtain resolution" unit="mm" value={s.res} onChange={(x) => setS({ ...s, res: x })} min={14} />
      </Card>

      <Card title="Camera resolution" why="Pixels needed to see the smallest feature reliably (4 px across it)." result={<>At least <b>{f0(cam.px)} px</b> across the view · about <b>{f1(cam.mp)} MP</b> camera</>}>
        <Num label="Field of view" unit="mm" value={c.fov} onChange={(x) => setC({ ...c, fov: x })} step={10} />
        <Num label="Smallest feature / defect" unit="mm" value={c.feature} onChange={(x) => setC({ ...c, feature: x })} step={0.1} />
      </Card>
    </div>
  );
}
