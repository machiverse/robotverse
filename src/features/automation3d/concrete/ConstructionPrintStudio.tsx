import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, CheckCircle2, CircleAlert, CircleDashed, Info, Loader2, OctagonAlert, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  ConcretePrinterSystem, FAULTS, MODULES, STEP_INFO, fmtTime,
  type Alarm, type FaultKey, type JobConfig, type ModuleKey,
} from "./engine";
import { SHAPES, type Shape } from "./path";
import { createPrinterScene, type ViewName } from "./scene";
import { ALARMS, COMPONENTS, INTERLOCKS, IO_LIST, ST_PROGRAM } from "./plcProgram";

type Tab = "alarms" | "commission" | "plc" | "job" | "components";
type Sample = { t: number; p: number; f: number; h: number };

const SPEEDS = [1, 5, 20, 60];

/**
 * Construction 3D printing cell: 3D view, operator HMI, commissioning
 * (module tests + fault injection) and the PLC program it runs.
 */
export default function ConstructionPrintStudio({ onExit, description }: { onExit?: () => void; description?: string }) {
  const sysRef = useRef<ConcretePrinterSystem | null>(null);
  if (!sysRef.current) sysRef.current = new ConcretePrinterSystem();
  const sys = sysRef.current;
  const stageRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<ReturnType<typeof createPrinterScene> | null>(null);
  const [, setTick] = useState(0);
  const [speed, setSpeed] = useState(20);
  const speedRef = useRef(speed);
  const [view, setView] = useState<ViewName>("iso");
  const [tab, setTab] = useState<Tab>("alarms");
  const trend = useRef<Sample[]>([]);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    if (!stageRef.current) return;
    const scene = createPrinterScene(stageRef.current);
    sceneRef.current = scene;
    let raf = 0;
    let last = performance.now();
    let lastUi = 0;
    let lastSample = -1;
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const s = sysRef.current!;
      s.advance(dt * speedRef.current);
      if (s.t - lastSample >= 1) {
        lastSample = s.t;
        trend.current.push({ t: s.t, p: s.i.pressure, f: s.i.flow, h: s.heightError });
        if (trend.current.length > 180) trend.current.shift();
      }
      scene.update(s, dt);
      if (now - lastUi > 150) {
        lastUi = now;
        setTick((v) => v + 1);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      scene.dispose();
    };
  }, []);

  const act = (fn: () => void) => () => {
    fn();
    setTick((v) => v + 1);
  };
  const changeView = (v: ViewName) => {
    setView(v);
    sceneRef.current?.setView(v);
  };

  const info = STEP_INFO[sys.step];
  const faulted = sys.step === "FAULT" || sys.step === "ESTOP";
  const active = sys.alarmList.filter((a) => a.active);
  const manual = sys.mode === "manual";

  return (
    <div className="flex flex-col bg-background text-foreground">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border bg-card px-4 py-3">
        {onExit && (
          <Button size="sm" variant="ghost" onClick={onExit} className="-ml-2">
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Robot cell
          </Button>
        )}
        <div className="mr-auto min-w-0 leading-tight">
          <h1 className="truncate text-lg font-semibold tracking-tight">Construction 3D Printing Cell</h1>
          <p className="truncate text-xs text-muted-foreground">
            Gantry printer · concrete mixing & pumping · PLC sequence, interlocks, faults & HMI
          </p>
        </div>
        <div className="flex overflow-hidden rounded-md border border-border" role="group" aria-label="Camera view">
          {(["iso", "front", "top", "nozzle"] as ViewName[]).map((v) => (
            <button
              key={v}
              aria-pressed={view === v}
              onClick={() => changeView(v)}
              className={cn("border-r border-border px-2.5 py-1.5 text-xs capitalize last:border-r-0", view === v ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
            >
              {v === "nozzle" ? "Follow nozzle" : v}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Sim speed
          <select
            className="h-8 rounded-md border border-border bg-background px-2 text-sm text-foreground"
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
          >
            {SPEEDS.map((v) => (
              <option key={v} value={v}>
                {v}×
              </option>
            ))}
          </select>
        </label>
      </div>

      {description && (
        <p className="border-b border-border bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Your brief: </span>
          <span className="line-clamp-2">{description}</span>
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_400px]">
        {/* 3D */}
        <div className="relative h-[380px] border-b border-border sm:h-[460px] lg:h-[640px] lg:border-b-0 lg:border-r">
          <div ref={stageRef} className="absolute inset-0" />
          <div className="pointer-events-none absolute left-3 top-3 space-y-1 font-mono text-[11px] text-slate-200">
            <p className="bg-slate-950/70 px-2 py-1">
              STEP {info.code} · {info.label.toUpperCase()}
            </p>
            <p className="bg-slate-950/70 px-2 py-1">
              X {sys.act.x.toFixed(0)} · Y {sys.act.y.toFixed(0)} · Z {sys.act.z.toFixed(1)} mm
            </p>
          </div>
          <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap gap-2 font-mono text-[10px] text-slate-300">
            <Legend color="#8d9096">Fresh layer</Legend>
            <Legend color="#dcd8ce">Cured layer</Legend>
            <Legend color="#b45309">Under-extruded</Legend>
          </div>
        </div>

        {/* HMI */}
        <Hmi sys={sys} act={act} trend={trend.current} />
      </div>

      {/* Lower tabs */}
      <div className="border-t border-border">
        <div className="flex overflow-x-auto border-b border-border bg-card" role="tablist">
          {(
            [
              ["alarms", `Alarms & events${active.length ? ` (${active.length})` : ""}`],
              ["commission", "Commissioning: module tests & faults"],
              ["job", "Job & optimisation"],
              ["plc", "PLC program & I/O"],
              ["components", "System components"],
            ] as [Tab, string][]
          ).map(([k, l]) => (
            <button
              key={k}
              role="tab"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
              className={cn(
                "shrink-0 border-b-2 px-4 py-2.5 text-sm transition-colors duration-150",
                tab === k ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="p-4">
          {tab === "alarms" && <AlarmsTab sys={sys} act={act} />}
          {tab === "commission" && <CommissionTab sys={sys} act={act} manual={manual} />}
          {tab === "job" && <JobTab sys={sys} act={act} />}
          {tab === "plc" && <PlcTab sys={sys} />}
          {tab === "components" && <ComponentsTab />}
        </div>
      </div>
      {faulted && <span className="sr-only" role="alert">{sys.message}</span>}
    </div>
  );
}

/* ================================================================ HMI */

function Hmi({ sys, act, trend }: { sys: ConcretePrinterSystem; act: (fn: () => void) => () => void; trend: Sample[] }) {
  const info = STEP_INFO[sys.step];
  const q = sys.q;
  const i = sys.i;
  const manual = sys.mode === "manual";
  const faulted = sys.step === "FAULT" || sys.step === "ESTOP";
  const running = !["IDLE", "STOPPED", "COMPLETE", "FAULT", "ESTOP", "TEST"].includes(sys.step);
  const banner = faulted
    ? "bg-red-600 text-white"
    : sys.step === "MATERIAL_HOLD" || sys.step === "STOPPED" || sys.step === "STOPPING" || manual
      ? "bg-amber-500 text-black"
      : running
        ? "bg-emerald-600 text-white"
        : sys.step === "COMPLETE"
          ? "bg-sky-600 text-white"
          : "bg-slate-700 text-white";
  const reqFlow = (sys.job.beadWidth * sys.job.layerHeight * sys.speed * sys.feedOverride * 60) / 1e6;
  const active = sys.alarmList.filter((a) => a.active);
  const lamp = (on: boolean, c: string) => (sys.lampTest || on ? c : "bg-slate-800");

  return (
    <section aria-label="HMI control panel" className="bg-[#0b1220] p-3 text-slate-100 lg:h-[640px] lg:overflow-auto">
      <div className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400">
        <span>HMI · PRG_ConcretePrinter</span>
        <span className="flex items-center gap-1" aria-label="Stack light">
          <span className={cn("h-2.5 w-2.5 rounded-full", lamp(q.beaconRed, "bg-red-500"))} />
          <span className={cn("h-2.5 w-2.5 rounded-full", lamp(q.beaconAmber, "bg-amber-400"))} />
          <span className={cn("h-2.5 w-2.5 rounded-full", lamp(q.beaconGreen, "bg-emerald-500"))} />
        </span>
      </div>

      <div className={cn("mb-3 rounded-sm px-3 py-2", banner)}>
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] opacity-90">
          Step {info.code} · {sys.mode.toUpperCase()}
        </p>
        <p className="text-sm font-semibold">{info.label}</p>
        <p className="mt-0.5 line-clamp-2 text-xs opacity-90">{sys.message}</p>
      </div>

      {/* Command buttons */}
      <div className="mb-3 grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
        <HmiButton tone="green" onClick={act(() => sys.start())} disabled={manual || running || faulted}>
          {sys.step === "STOPPED" ? "Resume" : "Start"}
        </HmiButton>
        <HmiButton tone="grey" onClick={act(() => sys.stop())} disabled={!running}>
          Stop
        </HmiButton>
        <HmiButton tone="blue" onClick={act(() => sys.reset())}>
          Reset
        </HmiButton>
        <button
          onClick={act(() => sys.setEstop(!sys.estopPressed))}
          aria-pressed={sys.estopPressed}
          aria-label={sys.estopPressed ? "Release emergency stop" : "Emergency stop"}
          className={cn(
            "row-span-2 flex h-[88px] w-[88px] flex-col items-center justify-center rounded-full border-4 border-yellow-400 font-mono text-[10px] font-bold uppercase leading-tight text-white shadow-inner transition-transform duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
            sys.estopPressed ? "bg-red-800 ring-4 ring-red-500/60" : "bg-red-600 hover:bg-red-500",
          )}
        >
          E-STOP
          <span className="mt-0.5 text-[9px] font-normal opacity-80">{sys.estopPressed ? "pressed" : "push"}</span>
        </button>
        <div className="col-span-3 grid grid-cols-2 gap-2">
          <div className="flex overflow-hidden rounded-sm border border-slate-700" role="group" aria-label="Mode">
            {(["auto", "manual"] as const).map((m) => (
              <button
                key={m}
                aria-pressed={sys.mode === m}
                onClick={act(() => sys.setMode(m))}
                className={cn(
                  "flex-1 py-2 font-mono text-[11px] uppercase tracking-[0.12em]",
                  sys.mode === m ? (m === "auto" ? "bg-emerald-600 text-white" : "bg-amber-500 text-black") : "text-slate-400 hover:bg-slate-800",
                )}
              >
                {m}
              </button>
            ))}
          </div>
          <HmiButton tone="grey" onClick={act(() => sys.ackAlarms())} disabled={!active.some((a) => !a.acked)}>
            Ack alarms
          </HmiButton>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-3 rounded-sm border border-slate-800 p-2.5">
        <div className="flex items-baseline justify-between font-mono text-[11px] uppercase tracking-[0.12em] text-slate-400">
          <span>
            Layer <span className="text-base text-slate-100">{Math.min(sys.job.layers, sys.layersDone + (sys.step === "COMPLETE" || sys.step === "FLUSH" ? 0 : 1))}</span> / {sys.job.layers}
          </span>
          <span className="text-base text-slate-100 tabular-nums">{sys.progress.toFixed(1)} %</span>
        </div>
        <div className="mt-2 h-2 bg-slate-800">
          <div className="h-full bg-emerald-500" style={{ width: `${sys.progress}%` }} />
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2 font-mono text-[10px] uppercase tracking-[0.1em] text-slate-400">
          <span>
            Print time<br />
            <span className="text-sm text-slate-100">{fmtTime(sys.printTime)}</span>
          </span>
          <span>
            Remaining<br />
            <span className="text-sm text-slate-100">{sys.step === "COMPLETE" ? "0:00" : `~${fmtTime(sys.remaining)}`}</span>
          </span>
          <span>
            Material<br />
            <span className="text-sm text-slate-100">{sys.materialUsed.toFixed(1)} L</span>
          </span>
        </div>
      </div>

      {/* Process values */}
      <div className="mb-3 grid grid-cols-2 gap-2">
        <Tile label="Material flow" value={i.flow.toFixed(2)} unit="L/min" sub={`set ${sys.step === "PRINTING" ? reqFlow.toFixed(2) : "—"}`} />
        <Tile
          label="Pump pressure"
          value={i.pressure.toFixed(1)}
          unit="bar"
          tone={i.pressure >= 28 ? "red" : i.pressure > 22 ? "amber" : undefined}
          bar={{ v: i.pressure, max: 35, marks: [22, 28] }}
        />
        <Tile
          label="Nozzle height"
          value={Number.isNaN(i.nozzleHeight) ? "LOST" : i.nozzleHeight.toFixed(1)}
          unit={Number.isNaN(i.nozzleHeight) ? "" : "mm"}
          tone={Number.isNaN(i.nozzleHeight) ? "red" : undefined}
          sub={`target ${sys.job.layerHeight} · trim ${sys.trim >= 0 ? "+" : ""}${sys.trim.toFixed(1)}`}
        />
        <Tile label="Print speed" value={(sys.speed * sys.feedOverride).toFixed(0)} unit="mm/s" sub={`override ${(sys.feedOverride * 100).toFixed(0)} %`} />
      </div>

      {/* Equipment status */}
      <div className="mb-3 grid grid-cols-2 gap-x-3 gap-y-1.5 rounded-sm border border-slate-800 p-2.5 font-mono text-[11px]">
        <Status label="Robot / gantry" ok={i.driveOk && q.axisEnable} text={!i.driveOk ? "DRIVE FAULT" : !q.axisEnable ? "DISABLED" : i.homed ? "READY" : "NOT HOMED"} />
        <Status label="Printing" ok={sys.step === "PRINTING"} text={sys.step === "PRINTING" ? "EXTRUDING" : sys.step === "COMPLETE" ? "DONE" : "OFF"} />
        <Status label="Pump" ok={i.pumpFb} text={i.pumpFb ? `ON ${q.pumpSpeed.toFixed(0)} %` : q.pumpRun ? "NO FB" : "OFF"} warn={q.pumpRun && !i.pumpFb} />
        <Status label="Mixer" ok={i.mixerFb} text={i.mixerFb ? sys.mixer.phase.toUpperCase() : "OFF"} />
        <Status label="Nozzle valve" ok={q.nozzleValve} text={q.nozzleValve ? "OPEN" : "SHUT"} />
        <Status label="Recirculation" ok={q.recircValve} text={q.recircValve ? "OPEN" : "SHUT"} />
        <Status label="Hopper" ok={!i.hopperLSL} warn={i.hopperLSL} text={`${sys.hopper.toFixed(0)} L`} />
        <Status label="Silo" ok={!i.siloLow} warn={i.siloLow} text={`${sys.silo.toFixed(0)} %`} />
        <Status label="Safety" ok={i.safetyRelayOk} warn={!i.safetyRelayOk} text={!i.estopOk ? "E-STOP" : !i.guardClosed ? "GATE OPEN" : i.safetyRelayOk ? "OK" : "RESET REQ"} />
        <Status label="Following err" ok={i.followingError < 2} warn={i.followingError >= 2} text={`${i.followingError.toFixed(2)} mm`} />
      </div>

      {/* Manual controls */}
      {manual && (
        <div className="mb-3 rounded-sm border border-amber-500/50 p-2.5">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-amber-400">Manual / maintenance · 150 mm/s</p>
          <div className="mb-2 grid grid-cols-3 gap-2">
            <HmiButton tone={sys.manual.pump ? "green" : "grey"} onClick={act(() => sys.setManual("pump", !sys.manual.pump))}>
              Pump {sys.manual.pump ? "ON" : "OFF"}
            </HmiButton>
            <HmiButton tone={sys.manual.valve ? "green" : "grey"} onClick={act(() => sys.setManual("valve", !sys.manual.valve))}>
              Valve {sys.manual.valve ? "open" : "shut"}
            </HmiButton>
            <HmiButton tone={sys.manual.mixer ? "green" : "grey"} onClick={act(() => sys.setManual("mixer", !sys.manual.mixer))}>
              Mixer {sys.manual.mixer ? "ON" : "OFF"}
            </HmiButton>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {(["x", "y", "z"] as const).map((ax) => (
              <div key={ax} className="contents">
                <HmiButton tone="grey" onClick={act(() => sys.jog(ax, -100))}>{ax.toUpperCase()}−</HmiButton>
                <HmiButton tone="grey" onClick={act(() => sys.jog(ax, 100))}>{ax.toUpperCase()}+</HmiButton>
              </div>
            ))}
            <HmiButton tone="blue" onClick={act(() => sys.home())} className="col-span-2">
              Home axes
            </HmiButton>
          </div>
        </div>
      )}

      {/* Trends */}
      <div className="mb-3 rounded-sm border border-slate-800 p-2.5">
        <p className="mb-1 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400">
          Trend · last {Math.round((trend[trend.length - 1]?.t ?? 0) - (trend[0]?.t ?? 0))} s
          <span className="text-orange-400">■ pressure</span>
          <span className="text-sky-400">■ flow ×2</span>
        </p>
        <Spark data={trend} />
      </div>

      {/* Alarms on the HMI */}
      <div className="rounded-sm border border-slate-800 p-2.5">
        <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400">Alarms & faults ({active.length} active)</p>
        {active.length === 0 ? (
          <p className="text-xs text-slate-500">No active alarms.</p>
        ) : (
          <ul className="space-y-1">
            {active.slice(0, 5).map((a) => (
              <AlarmRow key={a.id} a={a} dark />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function HmiButton({
  tone, children, onClick, disabled, className,
}: {
  tone: "green" | "grey" | "blue";
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  const tones = {
    green: "bg-emerald-600 hover:bg-emerald-500 text-white",
    grey: "bg-slate-700 hover:bg-slate-600 text-slate-100",
    blue: "bg-sky-700 hover:bg-sky-600 text-white",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "h-10 rounded-sm px-2 font-mono text-[11px] font-medium uppercase tracking-[0.1em] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-35",
        tones[tone],
        className,
      )}
    >
      {children}
    </button>
  );
}

function Tile({
  label, value, unit, sub, tone, bar,
}: {
  label: string;
  value: string;
  unit: string;
  sub?: string;
  tone?: "red" | "amber";
  bar?: { v: number; max: number; marks: number[] };
}) {
  return (
    <div className={cn("rounded-sm border p-2", tone === "red" ? "border-red-500 bg-red-950/40" : tone === "amber" ? "border-amber-500 bg-amber-950/30" : "border-slate-800")}>
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-0.5 font-mono text-xl tabular-nums text-slate-50">
        {value} <span className="text-xs text-slate-400">{unit}</span>
      </p>
      {bar && (
        <div className="relative mt-1 h-1.5 bg-slate-800">
          <div className={cn("h-full", tone === "red" ? "bg-red-500" : tone === "amber" ? "bg-amber-400" : "bg-orange-400")} style={{ width: `${Math.min(100, (bar.v / bar.max) * 100)}%` }} />
          {bar.marks.map((m, k) => (
            <span key={m} className={cn("absolute -top-0.5 h-2.5 w-px", k ? "bg-red-400" : "bg-amber-300")} style={{ left: `${(m / bar.max) * 100}%` }} />
          ))}
        </div>
      )}
      {sub && <p className="mt-0.5 font-mono text-[10px] text-slate-500">{sub}</p>}
    </div>
  );
}

function Status({ label, text, ok, warn }: { label: string; text: string; ok: boolean; warn?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-slate-400">{label}</span>
      <span className={cn("flex items-center gap-1.5 text-right", warn ? "text-amber-300" : ok ? "text-emerald-300" : "text-slate-300")}>
        <span className={cn("h-1.5 w-1.5", warn ? "bg-amber-400" : ok ? "bg-emerald-400" : "bg-slate-600")} />
        {text}
      </span>
    </div>
  );
}

function Spark({ data }: { data: Sample[] }) {
  const w = 360, h = 64;
  if (data.length < 2) return <div className="h-16 bg-slate-900/60" />;
  const t0 = data[0].t, t1 = data[data.length - 1].t || t0 + 1;
  const x = (t: number) => ((t - t0) / Math.max(1, t1 - t0)) * w;
  const y = (v: number) => h - Math.min(1, v / 35) * h;
  const line = (f: (s: Sample) => number) => data.map((s, k) => `${k ? "L" : "M"}${x(s.t).toFixed(1)},${y(f(s)).toFixed(1)}`).join("");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-16 w-full bg-slate-900/60" preserveAspectRatio="none" aria-label="Pressure and flow trend">
      <line x1="0" x2={w} y1={y(22)} y2={y(22)} stroke="#f59e0b" strokeDasharray="3 3" strokeWidth="0.8" />
      <line x1="0" x2={w} y1={y(28)} y2={y(28)} stroke="#ef4444" strokeDasharray="3 3" strokeWidth="0.8" />
      <path d={line((s) => s.p)} fill="none" stroke="#fb923c" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      <path d={line((s) => s.f * 2)} fill="none" stroke="#38bdf8" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Legend({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 bg-slate-950/70 px-2 py-1">
      <span className="h-2 w-2" style={{ background: color }} />
      {children}
    </span>
  );
}

function AlarmRow({ a, dark }: { a: Alarm; dark?: boolean }) {
  const Icon = a.severity === "fault" ? OctagonAlert : a.severity === "warning" ? TriangleAlert : Info;
  const color = a.severity === "fault" ? "text-red-500" : a.severity === "warning" ? "text-amber-500" : "text-sky-500";
  return (
    <li className={cn("flex items-start gap-2 text-xs", !a.active && "opacity-60")}>
      <Icon className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", color)} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className={dark ? "text-slate-100" : "text-foreground"}>{a.text}</span>
        <span className={cn("ml-2 font-mono text-[10px]", dark ? "text-slate-500" : "text-muted-foreground")}>
          {fmtTime(a.at)} · {a.id}
          {a.active && !a.acked ? " · UNACK" : ""}
          {a.count > 1 ? ` · ×${a.count}` : ""}
        </span>
      </span>
    </li>
  );
}

/* =============================================================== tabs */

function AlarmsTab({ sys, act }: { sys: ConcretePrinterSystem; act: (fn: () => void) => () => void }) {
  const list = sys.alarmList;
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Alarm list</h3>
          <Button size="sm" variant="outline" onClick={act(() => sys.ackAlarms())}>
            Acknowledge all
          </Button>
        </div>
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground">No alarms yet. Inject a fault from the Commissioning tab to see detection and recovery.</p>
        ) : (
          <ul className="space-y-1.5">
            {list.map((a) => (
              <AlarmRow key={a.id} a={a} />
            ))}
          </ul>
        )}
      </div>
      <div>
        <h3 className="mb-2 text-sm font-semibold">Event log (PLC steps, faults, recovery)</h3>
        <ol className="max-h-72 space-y-0.5 overflow-auto font-mono text-[11px] text-muted-foreground">
          {sys.events
            .slice()
            .reverse()
            .map((e, k) => (
              <li key={k}>
                <span className="text-foreground/60">{fmtTime(e.t)}</span> {e.msg}
              </li>
            ))}
        </ol>
      </div>
    </div>
  );
}

function CommissionTab({ sys, act, manual }: { sys: ConcretePrinterSystem; act: (fn: () => void) => () => void; manual: boolean }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold">1 · Test each module on its own</h3>
            <p className="text-xs text-muted-foreground">
              Module tests run in MANUAL / maintenance mode. When every module passes, switch to AUTO and press Start to run them together.
            </p>
          </div>
          <div className="flex gap-2">
            {!manual && (
              <Button size="sm" variant="outline" onClick={act(() => sys.setMode("manual"))}>
                Switch to manual
              </Button>
            )}
            <Button size="sm" onClick={act(() => sys.runAllTests())} disabled={!manual || sys.step === "TEST"}>
              Run all tests
            </Button>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {(Object.keys(MODULES) as ModuleKey[]).map((k) => {
            const r = sys.tests[k];
            const Icon = r.status === "pass" ? CheckCircle2 : r.status === "fail" ? CircleAlert : r.status === "running" ? Loader2 : CircleDashed;
            return (
              <div key={k} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <Icon
                      className={cn(
                        "h-4 w-4",
                        r.status === "pass" && "text-emerald-500",
                        r.status === "fail" && "text-red-500",
                        r.status === "running" && "animate-spin text-primary",
                        r.status === "idle" && "text-muted-foreground",
                      )}
                      aria-hidden
                    />
                    {MODULES[k]}
                  </p>
                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={act(() => sys.runTest(k))} disabled={!manual || sys.step === "TEST"}>
                    Test
                  </Button>
                </div>
                {r.lines.length > 0 && (
                  <ul className="mt-2 space-y-0.5 font-mono text-[11px] text-muted-foreground">
                    {r.lines.map((l, n) => (
                      <li key={n} className={l.startsWith("✗") ? "text-red-500" : undefined}>
                        {l}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold">2 · Inject abnormal conditions</h3>
        <p className="mb-3 text-xs text-muted-foreground">
          Trigger a fault while printing to watch the PLC detect it, stop safely and recover. Clear it, then press Reset (and Start to resume).
        </p>
        <div className="space-y-2">
          {(Object.keys(FAULTS) as FaultKey[]).map((k) => {
            const on = sys.injected.has(k);
            return (
              <div key={k} className={cn("flex items-center justify-between gap-3 rounded-md border p-2.5", on ? "border-red-500/60 bg-red-500/5" : "border-border")}>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{FAULTS[k].label}</p>
                  <p className="text-xs text-muted-foreground">{FAULTS[k].note}</p>
                </div>
                <Button size="sm" variant={on ? "default" : "outline"} className="shrink-0" onClick={act(() => sys.inject(k, !on))}>
                  {on ? "Clear" : "Inject"}
                </Button>
              </div>
            );
          })}
          <Button size="sm" variant="outline" onClick={act(() => sys.refillSilo())} className="w-full">
            Operator: refill dry-mix silo
          </Button>
        </div>
      </div>
    </div>
  );
}

function JobTab({ sys, act }: { sys: ConcretePrinterSystem; act: (fn: () => void) => () => void }) {
  const editable = sys.step === "IDLE" || sys.step === "COMPLETE";
  const j = sys.job;
  const num = (key: keyof JobConfig, label: string, min: number, max: number, stepSize: number, unit: string) => (
    <label className="block text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="mt-1 flex items-center gap-2">
        <input
          key={`${key}-${j[key]}`}
          type="number"
          min={min}
          max={max}
          step={stepSize}
          defaultValue={j[key] as number}
          disabled={!editable}
          onBlur={(e) => {
            const v = Number(e.target.value);
            const next = Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : (j[key] as number);
            e.target.value = String(next);
            if (next !== j[key]) act(() => sys.setJob({ [key]: next } as Partial<JobConfig>))();
          }}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          className="h-9 w-24 rounded-md border border-border bg-background px-2 text-sm disabled:opacity-50"
        />
        <span className="text-muted-foreground">{unit}</span>
      </span>
    </label>
  );
  return (
    <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Print job</h3>
        {!editable && <p className="text-xs text-amber-600">Geometry is locked while a job is loaded. Finish or complete the print to change it.</p>}
        <label className="block text-xs">
          <span className="text-muted-foreground">Structure</span>
          <select
            value={j.shape}
            disabled={!editable}
            onChange={(e) => act(() => sys.setJob({ shape: e.target.value as Shape }))()}
            className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2 text-sm disabled:opacity-50"
          >
            {(Object.keys(SHAPES) as Shape[]).map((s) => (
              <option key={s} value={s}>
                {SHAPES[s].label} ({SHAPES[s].note})
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          {num("layers", "Layers", 2, 60, 1, "")}
          {num("layerHeight", "Layer height", 10, 40, 1, "mm")}
          {num("beadWidth", "Bead width", 30, 80, 1, "mm")}
          {num("printSpeed", "Print speed", 40, 150, 5, "mm/s")}
          {num("minLayerTime", "Min layer time", 10, 300, 5, "s")}
        </div>
        <p className="text-xs text-muted-foreground">
          Wall height {(j.layers * j.layerHeight) / 1000} m · path {(sys.layerLen / 1000).toFixed(1)} m per layer · about{" "}
          {((sys.layerLen * j.beadWidth * j.layerHeight * j.layers) / 1e6).toFixed(0)} L of concrete.
        </p>
        <label className="flex items-center justify-between gap-3 text-sm">
          Automatic recovery
          <Switch checked={j.autoRecovery} onCheckedChange={(v) => act(() => sys.setJob({ autoRecovery: v }))()} />
        </label>
        <label className="flex items-center justify-between gap-3 text-sm">
          Layer-by-layer optimiser
          <Switch checked={j.optimize} onCheckedChange={(v) => act(() => sys.setJob({ optimize: v }))()} />
        </label>
      </div>
      <div className="min-w-0 space-y-4">
        <div>
          <h3 className="mb-2 text-sm font-semibold">Repeatability: statistics per layer</h3>
          {sys.layerStats.length === 0 ? (
            <p className="text-sm text-muted-foreground">Appears after the first layer.</p>
          ) : (
            <div className="max-h-64 overflow-auto rounded-md border border-border">
              <table className="w-full text-left font-mono text-xs">
                <thead className="sticky top-0 bg-muted text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                  <tr>
                    {["Layer", "Time s", "Avg bar", "Max bar", "Flow L/min", "Height RMS mm", "Speed mm/s"].map((h) => (
                      <th key={h} className="px-2 py-1.5 font-normal">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sys.layerStats.map((s) => (
                    <tr key={s.layer} className="border-t border-border tabular-nums">
                      <td className="px-2 py-1">{s.layer}</td>
                      <td className="px-2 py-1">{s.time.toFixed(0)}</td>
                      <td className="px-2 py-1">{s.avgPressure.toFixed(1)}</td>
                      <td className="px-2 py-1">{s.maxPressure.toFixed(1)}</td>
                      <td className="px-2 py-1">{s.avgFlow.toFixed(2)}</td>
                      <td className="px-2 py-1">{s.heightRms.toFixed(2)}</td>
                      <td className="px-2 py-1">{s.speed.toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold">Continuous optimisation log</h3>
          {sys.optimizerLog.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              After each layer the optimiser raises the print speed by 5 % when pressure and height are well inside limits, and cuts it by 8 % when pressure nears 22 bar. The minimum layer time is always kept so the layer below can carry the next.
            </p>
          ) : (
            <ul className="space-y-0.5 font-mono text-[11px] text-muted-foreground">
              {sys.optimizerLog.map((l, k) => (
                <li key={k}>{l}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function PlcTab({ sys }: { sys: ConcretePrinterSystem }) {
  const live: Record<string, string> = {
    I_EStop_OK: String(+sys.i.estopOk), I_Gate_Closed: String(+sys.i.guardClosed), I_SafetyRelay_OK: String(+sys.i.safetyRelayOk),
    I_Silo_Low: String(+sys.i.siloLow), I_Hopper_LSH: String(+sys.i.hopperLSH), I_Hopper_LSL: String(+sys.i.hopperLSL),
    I_Hopper_LSLL: String(+sys.i.hopperLSLL), I_Mixer_FB: String(+sys.i.mixerFb), I_Pump_FB: String(+sys.i.pumpFb),
    I_Drive_OK: String(+sys.i.driveOk), AI_Pressure: `${sys.i.pressure.toFixed(1)} bar`, AI_Flow: `${sys.i.flow.toFixed(2)} L/min`,
    AI_Nozzle_Height: Number.isNaN(sys.i.nozzleHeight) ? "NaN" : `${sys.i.nozzleHeight.toFixed(1)} mm`,
    "AI_Axis_X/Y/Z": `${sys.i.x.toFixed(0)} / ${sys.i.y.toFixed(0)} / ${sys.i.z.toFixed(0)}`,
    Q_Axis_Enable: String(+sys.q.axisEnable), Q_Mixer_Run: String(+sys.q.mixerRun), Q_Pump_Run: String(+sys.q.pumpRun),
    AO_Pump_Speed: `${sys.q.pumpSpeed.toFixed(0)} %`, Q_Nozzle_Valve: String(+sys.q.nozzleValve), Q_Recirc_Valve: String(+sys.q.recircValve),
    "Q_Beacon_R/A/G": `${+sys.q.beaconRed}/${+sys.q.beaconAmber}/${+sys.q.beaconGreen}`, Q_Horn: String(+sys.q.horn),
  };
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <div className="min-w-0">
        <h3 className="mb-2 text-sm font-semibold">I/O list (live)</h3>
        <div className="max-h-[420px] overflow-auto rounded-md border border-border">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-muted text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
              <tr>
                <th className="px-2 py-1.5 font-normal">Tag</th>
                <th className="px-2 py-1.5 font-normal">Type</th>
                <th className="px-2 py-1.5 font-normal">Device</th>
                <th className="px-2 py-1.5 font-normal">Value</th>
              </tr>
            </thead>
            <tbody>
              {IO_LIST.map((r) => (
                <tr key={r.tag} className="border-t border-border align-top">
                  <td className="px-2 py-1 font-mono">{r.tag}</td>
                  <td className="px-2 py-1 font-mono">{r.type}</td>
                  <td className="px-2 py-1">
                    {r.device}
                    <span className="block text-muted-foreground">{r.note}</span>
                  </td>
                  <td className="px-2 py-1 font-mono tabular-nums">{live[r.tag] ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h3 className="mb-2 mt-5 text-sm font-semibold">Interlock matrix</h3>
        <ul className="space-y-1.5 text-xs">
          {INTERLOCKS.map((r) => (
            <li key={r.output} className="rounded-md border border-border p-2">
              <span className="font-mono font-medium">{r.output}</span>
              <span className="text-muted-foreground"> needs </span>
              {r.permissive.join(" · ")}
            </li>
          ))}
        </ul>
        <h3 className="mb-2 mt-5 text-sm font-semibold">Alarm & recovery table</h3>
        <div className="overflow-auto rounded-md border border-border">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
              <tr>
                <th className="px-2 py-1.5 font-normal">Alarm</th>
                <th className="px-2 py-1.5 font-normal">Reaction</th>
                <th className="px-2 py-1.5 font-normal">Recovery</th>
              </tr>
            </thead>
            <tbody>
              {ALARMS.map((a) => (
                <tr key={a.id} className="border-t border-border align-top">
                  <td className="px-2 py-1">
                    <span className="font-mono">{a.id}</span> {a.text}
                    <span className={cn("ml-1 font-mono text-[10px] uppercase", a.severity === "fault" ? "text-red-500" : a.severity === "warning" ? "text-amber-600" : "text-sky-600")}>
                      {a.severity}
                    </span>
                  </td>
                  <td className="px-2 py-1">{a.reaction}</td>
                  <td className="px-2 py-1">{a.recovery}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="min-w-0">
        <h3 className="mb-2 text-sm font-semibold">Main sequence (IEC 61131-3 Structured Text)</h3>
        <pre className="max-h-[820px] overflow-auto rounded-md border border-border bg-[#0b1220] p-3 font-mono text-[11px] leading-relaxed text-slate-200">
          {ST_PROGRAM}
        </pre>
      </div>
    </div>
  );
}

function ComponentsTab() {
  return (
    <div className="overflow-auto rounded-md border border-border">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-normal">Component</th>
            <th className="px-3 py-2 font-normal">Specification in this simulation</th>
            <th className="px-3 py-2 font-normal">PLC tags</th>
          </tr>
        </thead>
        <tbody>
          {COMPONENTS.map((c) => (
            <tr key={c.name} className="border-t border-border align-top">
              <td className="px-3 py-2 font-medium">{c.name}</td>
              <td className="px-3 py-2 text-muted-foreground">{c.spec}</td>
              <td className="px-3 py-2 font-mono text-xs">{c.tags}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
