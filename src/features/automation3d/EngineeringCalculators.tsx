import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { calc } from "./engineerPlaybook";
import { MOTION, pickPlaceCycle, requiredPL, type RobotClass } from "./engineerThinking";

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
  const [o, setO] = useState({ planned: 450, down: 45, ideal: 30, total: 760, good: 740 });
  const [r, setR] = useState({ cost: 2500000, operators: 2, shifts: 2, wage: 32000, other: 0 });
  const [cv, setCv] = useState({ rate: 30, pitch: 300, length: 200 });
  const [pl, setPl] = useState({ L: 1200, W: 1000, l: 400, w: 300, h: 250, max: 1500 });
  const [a, setA] = useState({ bore: 32, stroke: 100, bar: 6, cycles: 10, double: 1 });
  const [sf, setSf] = useState<{ s: 1 | 2; f: 1 | 2; p: 1 | 2 }>({ s: 2, f: 2, p: 1 });
  const [mo, setMo] = useState<{ travel: number; part: number; payload: number; cls: RobotClass; gripper: "vacuum" | "parallel" }>({ travel: 1200, part: 6, payload: 12, cls: "small", gripper: "parallel" });

  const takt = calc.takt(t.hours, t.breaks, t.shifts, t.parts);
  const robots = calc.robotsFor(t.cycle, takt);
  const pay = calc.payload(p.part, p.tool, p.offset);
  const vac = calc.vacuum(v.part, v.cups, v.cup, v.kpa, v.accel, !!v.side);
  const grip = calc.gripForce(g.part, g.accel, g.mu, g.jaws);
  const dist = calc.safetyDistance(s.stop, s.device, s.res);
  const cam = calc.vision(c.fov, c.feature);
  const oee = calc.oee(o.planned, o.down, o.ideal, o.total, o.good);
  const pb = calc.payback(r.cost, r.operators, r.shifts, r.wage, r.other);
  const belt = calc.conveyor(cv.rate, cv.pitch, cv.length);
  const pal = calc.pallet(pl.L, pl.W, pl.l, pl.w, pl.h, pl.max);
  const air = calc.air(a.bore, a.stroke, a.bar, a.cycles, !!a.double);
  const pct = (v: number) => `${f1(v * 100)}%`;
  const plr = requiredPL(sf.s, sf.f, sf.p);
  const pp = pickPlaceCycle({ travelM: mo.travel / 1000, partKg: mo.part, robotPayloadKg: mo.payload, cls: mo.cls, gripper: mo.gripper });
  const sel = "mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm";

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

      <Card
        title="OEE"
        why="Overall equipment effectiveness: availability × performance × quality."
        ok={oee.oee >= 0.85}
        result={
          <>
            OEE <b>{pct(oee.oee)}</b> · availability {pct(oee.availability)} · performance {pct(oee.performance)} · quality {pct(oee.quality)}
            {oee.oee >= 0.85 ? " — world class" : " — world class is about 85%"}
          </>
        }
      >
        <Num label="Planned time" unit="min" value={o.planned} onChange={(x) => setO({ ...o, planned: x })} step={10} />
        <Num label="Downtime" unit="min" value={o.down} onChange={(x) => setO({ ...o, down: x })} step={5} />
        <Num label="Ideal cycle" unit="s" value={o.ideal} onChange={(x) => setO({ ...o, ideal: x })} step={0.5} />
        <Num label="Parts made" value={o.total} onChange={(x) => setO({ ...o, total: x })} step={10} />
        <Num label="Good parts" value={o.good} onChange={(x) => setO({ ...o, good: x })} step={10} />
      </Card>

      <Card
        title="Payback"
        why="Months until the cell pays for itself from labour freed and other savings."
        ok={pb.months <= 36}
        result={
          <>
            Saves <b>₹{f0(pb.yearly)}</b> a year · payback <b>{Number.isFinite(pb.months) ? `${f1(pb.months)} months` : "—"}</b>
          </>
        }
      >
        <Num label="Cell cost" unit="₹" value={r.cost} onChange={(x) => setR({ ...r, cost: x })} step={100000} />
        <Num label="Operators per shift freed" value={r.operators} onChange={(x) => setR({ ...r, operators: x })} step={0.5} />
        <Num label="Shifts per day" value={r.shifts} onChange={(x) => setR({ ...r, shifts: x })} min={1} />
        <Num label="Cost per operator" unit="₹/month" value={r.wage} onChange={(x) => setR({ ...r, wage: x })} step={1000} />
        <Num label="Other savings" unit="₹/month" value={r.other} onChange={(x) => setR({ ...r, other: x })} step={5000} />
      </Card>

      <Card
        title="Conveyor speed"
        why="Belt speed for the part rate at a fixed pitch, and the gap between parts."
        ok={belt.gapMm > 0}
        result={
          <>
            Belt speed <b>{f1(belt.speedMpm)} m/min</b> · gap <b>{f0(belt.gapMm)} mm</b>
            {belt.gapMm > 0 ? "" : " — pitch must be longer than the part"}
          </>
        }
      >
        <Num label="Parts per minute" value={cv.rate} onChange={(x) => setCv({ ...cv, rate: x })} />
        <Num label="Pitch (part to part)" unit="mm" value={cv.pitch} onChange={(x) => setCv({ ...cv, pitch: x })} step={10} />
        <Num label="Part length" unit="mm" value={cv.length} onChange={(x) => setCv({ ...cv, length: x })} step={10} />
      </Card>

      <Card
        title="Pallet pattern"
        why="Cases per layer (block or two-block pattern), layers and cases per pallet."
        result={
          <>
            <b>{pal.perLayer}</b> cases per layer × <b>{pal.layers}</b> layers = <b>{pal.total}</b> cases · {pct(pal.fill)} of the pallet area used
          </>
        }
      >
        <Num label="Pallet length" unit="mm" value={pl.L} onChange={(x) => setPl({ ...pl, L: x })} step={10} />
        <Num label="Pallet width" unit="mm" value={pl.W} onChange={(x) => setPl({ ...pl, W: x })} step={10} />
        <Num label="Case length" unit="mm" value={pl.l} onChange={(x) => setPl({ ...pl, l: x })} step={5} />
        <Num label="Case width" unit="mm" value={pl.w} onChange={(x) => setPl({ ...pl, w: x })} step={5} />
        <Num label="Case height" unit="mm" value={pl.h} onChange={(x) => setPl({ ...pl, h: x })} step={5} />
        <Num label="Max stack height" unit="mm" value={pl.max} onChange={(x) => setPl({ ...pl, max: x })} step={50} />
      </Card>

      <Card
        title="Safety performance level (PLr)"
        why="The level a safety function must reach, from the ISO 13849-1 risk graph. Robot safety functions need at least PL d (ISO 10218)."
        result={
          <>
            Required <b>PL {plr}</b>
            {plr < "d" ? <> from the graph · use <b>PL d</b> for robot safety functions</> : null}
          </>
        }
        ok={plr <= "d"}
      >
        <label className="text-xs">
          <span className="text-muted-foreground">Severity</span>
          <select value={sf.s} onChange={(e) => setSf({ ...sf, s: Number(e.target.value) as 1 | 2 })} className={sel}>
            <option value={1}>S1 slight, reversible</option>
            <option value={2}>S2 serious or fatal</option>
          </select>
        </label>
        <label className="text-xs">
          <span className="text-muted-foreground">Exposure</span>
          <select value={sf.f} onChange={(e) => setSf({ ...sf, f: Number(e.target.value) as 1 | 2 })} className={sel}>
            <option value={1}>F1 seldom or short</option>
            <option value={2}>F2 frequent or long</option>
          </select>
        </label>
        <label className="text-xs">
          <span className="text-muted-foreground">Avoiding the hazard</span>
          <select value={sf.p} onChange={(e) => setSf({ ...sf, p: Number(e.target.value) as 1 | 2 })} className={sel}>
            <option value={1}>P1 possible</option>
            <option value={2}>P2 scarcely possible</option>
          </select>
        </label>
      </Card>

      <Card
        title="Pick-and-place cycle from motion"
        why="Approach, grip, travel, place and return, from the robot's speed and acceleration — the check behind every cycle-time promise."
        result={
          <>
            About <b>{f1(pp.total)} s</b> per part · <b>{f0((3600 * 0.85) / pp.total)} parts/h</b> at 85 % OEE · travel {f1(pp.travel)} s, grip and settle {f1(pp.grip + pp.settle)} s
          </>
        }
      >
        <Num label="Travel" unit="mm" value={mo.travel} onChange={(x) => setMo({ ...mo, travel: x })} step={100} />
        <Num label="Part weight" unit="kg" value={mo.part} onChange={(x) => setMo({ ...mo, part: x })} />
        <Num label="Robot payload" unit="kg" value={mo.payload} onChange={(x) => setMo({ ...mo, payload: x })} min={1} />
        <label className="text-xs">
          <span className="text-muted-foreground">Robot</span>
          <select value={mo.cls} onChange={(e) => setMo({ ...mo, cls: e.target.value as RobotClass })} className={sel}>
            {(Object.keys(MOTION) as RobotClass[]).map((k) => (
              <option key={k} value={k}>
                {MOTION[k].label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          <span className="text-muted-foreground">Gripper</span>
          <select value={mo.gripper} onChange={(e) => setMo({ ...mo, gripper: e.target.value as "vacuum" | "parallel" })} className={sel}>
            <option value="parallel">Fingers</option>
            <option value="vacuum">Vacuum</option>
          </select>
        </label>
      </Card>

      <Card title="Cylinder air use" why="Free air a pneumatic cylinder uses — add 20–30% for leaks when sizing the compressor." result={<>About <b>{f1(air)} L/min</b> free air · <b>{f1((air * 60) / 1000)} m³/h</b></>}>
        <Num label="Bore" unit="mm" value={a.bore} onChange={(x) => setA({ ...a, bore: x })} step={2} />
        <Num label="Stroke" unit="mm" value={a.stroke} onChange={(x) => setA({ ...a, stroke: x })} step={10} />
        <Num label="Pressure" unit="bar" value={a.bar} onChange={(x) => setA({ ...a, bar: x })} step={0.5} />
        <Num label="Cycles per minute" value={a.cycles} onChange={(x) => setA({ ...a, cycles: x })} />
        <label className="text-xs">
          <span className="text-muted-foreground">Type</span>
          <select value={a.double} onChange={(e) => setA({ ...a, double: Number(e.target.value) })} className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm">
            <option value={1}>Double acting</option>
            <option value={0}>Single acting</option>
          </select>
        </label>
      </Card>
    </div>
  );
}
