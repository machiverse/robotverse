import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Info, Pause, Play, RotateCcw, Sparkles } from "lucide-react";
import { createSimulation, parseProcess, PRESETS, ROBOT_SIZES, STATION_NAMES, type Simulation } from "./robotSim.js";

type Step = { action: string; station: string; label: string; auto?: boolean };
type SimState = {
  playing: boolean;
  joints: number[];
  stepIndex: number;
  step: Step | null;
  cycles: number;
  lastCycle: number | null;
  currentCycle: number;
  events: { t: number; msg: string }[];
};

const VIEWS: [string, string][] = [
  ["iso", "3D"],
  ["front", "Front"],
  ["side", "Side"],
  ["top", "Top"],
];

interface Props {
  initialProcess?: string;
  /** Shown in the toolbar, e.g. the user's process name */
  title?: string;
  subtitle?: string;
  /** "page" fills the viewport; "embedded" is a fixed-height panel inside another page */
  variant?: "page" | "embedded";
  /** Hide the process editor (used when the steps come from an analysis) */
  showEditor?: boolean;
}

const Panel = ({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) => (
  <section className={cn("rounded-lg border border-border bg-card p-3", className)}>
    <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
    {children}
  </section>
);

export default function AutomationStudio3D({
  initialProcess,
  title = "Robot Cell Simulator",
  subtitle = "Describe any process and watch a 6-axis robot cell run it in 3D",
  variant = "page",
  showEditor = true,
}: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const simRef = useRef<Simulation | null>(null);
  const [text, setText] = useState<string>(initialProcess || PRESETS["Machine tending"]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [notes, setNotes] = useState<string[]>([]);
  const [size, setSize] = useState("medium");
  const [view, setView] = useState("iso");
  const [speed, setSpeed] = useState(1);
  const [state, setState] = useState<SimState | null>(null);
  const [unreachable, setUnreachable] = useState<string[]>([]);

  useEffect(() => {
    if (!stageRef.current) return;
    const sim = createSimulation({
      THREE,
      OrbitControls,
      container: stageRef.current,
      onUpdate: (s: SimState) => setState(s),
    });
    simRef.current = sim;
    build(text);
    return () => sim.dispose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function build(src: string) {
    const { steps: parsed, notes: n } = parseProcess(src);
    setSteps(parsed as Step[]);
    setNotes(n);
    simRef.current?.setSteps(parsed);
    simRef.current?.play();
    setUnreachable(simRef.current?.checkReach(parsed) || []);
  }

  function changeSize(key: string) {
    setSize(key);
    simRef.current?.setRobotSize(key);
    simRef.current?.setSteps(steps);
    setUnreachable(simRef.current?.checkReach(steps) || []);
  }

  const playing = state?.playing ?? true;
  const perHour = useMemo(
    () => (state?.lastCycle ? Math.floor(3600 / state.lastCycle) : null),
    [state?.lastCycle],
  );
  const warnings = notes.filter((n) => !n.startsWith("Added"));
  const autoAdded = steps.filter((s) => s.auto).length;

  const embedded = variant === "embedded";

  return (
    <div
      className={cn(
        "flex flex-col bg-background text-foreground",
        embedded ? "overflow-hidden rounded-xl border border-border" : "min-h-[calc(100vh-8rem)]",
      )}
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border bg-card px-4 py-3">
        <div className="mr-auto min-w-0 leading-tight">
          <div className="flex items-center gap-2">
            <h1 className={cn("truncate font-semibold tracking-tight", embedded ? "text-sm" : "text-lg")}>{title}</h1>
            <Badge variant="secondary" className="hidden gap-1 text-[10px] sm:inline-flex">
              <Sparkles className="h-3 w-3" /> Live 3D
            </Badge>
          </div>
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        </div>

        <div className="flex overflow-hidden rounded-lg border border-border" role="group" aria-label="Robot size">
          {Object.values(ROBOT_SIZES).map(
            (s) => (
              <button
                key={s.key}
                aria-pressed={size === s.key}
                onClick={() => changeSize(s.key)}
                className={cn(
                  "border-r border-border px-3 py-1.5 text-left text-xs leading-tight last:border-r-0",
                  size === s.key ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                )}
              >
                <span className="font-semibold">{s.label}</span>
                <span className="block text-[10px] opacity-75">
                  {s.reach} m · {s.payload} kg
                </span>
              </button>
            ),
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant={playing ? "outline" : "default"}
            onClick={() => (playing ? simRef.current?.pause() : simRef.current?.play())}
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            <span className="ml-1.5 hidden sm:inline">{playing ? "Pause" : "Play"}</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            aria-label="Restart"
            onClick={() => {
              simRef.current?.setSteps(steps);
              simRef.current?.play();
            }}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <select
            aria-label="Simulation speed"
            className="h-9 rounded-md border border-border bg-background px-2 text-sm"
            value={speed}
            onChange={(e) => {
              const v = Number(e.target.value);
              setSpeed(v);
              simRef.current?.setSpeed(v);
            }}
          >
            {[0.5, 1, 2, 4].map((v) => (
              <option key={v} value={v}>
                {v}×
              </option>
            ))}
          </select>
        </div>
      </div>

      <div
        className={cn(
          "grid flex-1 grid-cols-1",
          showEditor ? "lg:grid-cols-[320px_1fr_270px]" : "lg:grid-cols-[260px_1fr_270px]",
          embedded && "lg:h-[640px]",
        )}
      >
        {/* Left: process */}
        <aside className="order-2 space-y-3 overflow-auto border-border bg-muted/20 p-3 lg:order-1 lg:border-r">
          {showEditor && (
            <Panel title="Describe the process">
              <p className="mb-2 text-xs text-muted-foreground">
                One step per line, in plain words: pick, place, weld, paint, polish, assemble, fill, cap, label, inspect,
                pack, stack…
              </p>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                spellCheck={false}
                rows={6}
                className="bg-background text-sm"
                aria-label="Process steps"
              />
              <Button className="mt-2 w-full" onClick={() => build(text)}>
                <Play className="mr-2 h-4 w-4" /> Build simulation
              </Button>
              <p className="mb-1.5 mt-3 text-[11px] font-semibold text-muted-foreground">Templates</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(PRESETS).map(([name, t]) => (
                  <button
                    key={name}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                      text === t ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary",
                    )}
                    onClick={() => {
                      setText(t);
                      build(t);
                    }}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </Panel>
          )}

          {(warnings.length > 0 || autoAdded > 0) && (
            <div className="space-y-1.5">
              {autoAdded > 0 && (
                <p className="flex gap-1.5 rounded-md border border-primary/30 bg-primary/5 p-2 text-[11px] text-foreground">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  {autoAdded} handling step{autoAdded > 1 ? "s were" : " was"} added so the part flows through the cell
                  (marked “auto”).
                </p>
              )}
              {warnings.map((n, i) => (
                <p key={i} className="flex gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-[11px]">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                  {n}
                </p>
              ))}
            </div>
          )}

          <Panel title={`Process steps (${steps.length})`}>
            <ol className="space-y-1">
              {steps.map((s, i) => (
                <li
                  key={i}
                  className={cn(
                    "grid grid-cols-[22px_1fr] gap-2 rounded-md border-l-[3px] px-2 py-1.5 text-sm transition-colors",
                    state?.stepIndex === i ? "border-amber-400 bg-amber-400/10" : "border-transparent",
                  )}
                >
                  <span className="text-xs font-semibold text-muted-foreground tabular-nums">{i + 1}</span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate">{s.label}</span>
                      {s.auto && (
                        <Badge variant="outline" className="h-4 px-1 text-[9px] font-normal text-muted-foreground">
                          auto
                        </Badge>
                      )}
                    </span>
                    <span className="block text-xs text-muted-foreground">{STATION_NAMES[s.station]}</span>
                  </span>
                </li>
              ))}
            </ol>
          </Panel>
        </aside>

        {/* Center: 3D stage */}
        <div className="relative order-1 min-h-[60vh] bg-[#1a2433] lg:order-2 lg:min-h-0">
          <div ref={stageRef} className="absolute inset-0" />
          <div className="absolute left-3 top-3 max-w-[70%] min-w-[200px] rounded-lg border border-white/10 bg-[#0e1621]/85 px-3 py-2 text-[#e6ecf3] backdrop-blur">
            <span className="text-[11px] uppercase tracking-wide opacity-70">
              {state?.step ? `Step ${state.stepIndex + 1} of ${steps.length}` : "Ready"}
            </span>
            <b className="block truncate text-[15px]">{state?.step?.label || "Build a process to start"}</b>
          </div>
          <div className="absolute right-3 top-3 hidden rounded-lg border border-white/10 bg-[#0e1621]/85 px-3 py-2 text-right text-[#e6ecf3] backdrop-blur sm:block">
            <span className="text-[11px] uppercase tracking-wide opacity-70">Cycle</span>
            <b className="block text-[15px] tabular-nums">
              {state?.lastCycle ? `${state.lastCycle.toFixed(1)} s` : `${(state?.currentCycle ?? 0).toFixed(1)} s`}
            </b>
          </div>
          <div className="absolute bottom-3 left-3 flex gap-1.5">
            {VIEWS.map(([k, l]) => (
              <button
                key={k}
                aria-pressed={view === k}
                onClick={() => {
                  setView(k);
                  simRef.current?.setView(k);
                }}
                className={cn(
                  "rounded-md border bg-[#0e1621]/70 px-2.5 py-1 text-xs text-[#e6ecf3] backdrop-blur",
                  view === k ? "border-[#4a90e2]" : "border-white/15",
                )}
              >
                {l}
              </button>
            ))}
          </div>
          <span className="absolute bottom-3.5 right-3 hidden text-xs text-white/60 sm:inline">
            Drag to rotate · scroll to zoom
          </span>
        </div>

        {/* Right: metrics */}
        <aside className="order-3 space-y-3 overflow-auto border-border bg-muted/20 p-3 lg:border-l">
          <Panel title="Cycle performance">
            <div className="grid grid-cols-2 gap-2">
              {[
                [state?.lastCycle ? `${state.lastCycle.toFixed(1)} s` : "–", "Last cycle"],
                [perHour ? String(perHour) : "–", "Parts / hour"],
                [`${(state?.currentCycle ?? 0).toFixed(1)} s`, "Current cycle"],
                [String(state?.cycles ?? 0), "Parts done"],
              ].map(([v, l]) => (
                <div key={l} className="rounded-md border border-border bg-background p-2.5">
                  <b className="block text-lg tabular-nums">{v}</b>
                  <span className="text-[11px] text-muted-foreground">{l}</span>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Reach check">
            <div
              className={cn(
                "flex gap-2 rounded-md border px-2.5 py-2 text-xs",
                unreachable.length ? "border-destructive/50 text-destructive" : "border-green-600/50 text-green-600",
              )}
            >
              {unreachable.length ? (
                <AlertTriangle className="h-4 w-4 shrink-0" />
              ) : (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              )}
              <span>
                {unreachable.length
                  ? `Out of reach: ${unreachable.map((u) => STATION_NAMES[u]).join(", ")}. Choose a larger robot or move these stations closer.`
                  : "Every station is within this robot's reach."}
              </span>
            </div>
          </Panel>
          <Panel title="Joints">
            <p className="mb-2 text-[11px] text-muted-foreground">
              {playing ? "Pause to move joints by hand." : "Drag a slider to move that joint."}
            </p>
            {(state?.joints || [0, 0, 0, 0, 0, 0]).map((v, i) => (
              <div key={i} className="mb-1.5 grid grid-cols-[28px_1fr_56px] items-center gap-2 text-xs">
                <label htmlFor={`j${i}`} className="font-semibold text-muted-foreground">
                  J{i + 1}
                </label>
                <input
                  id={`j${i}`}
                  type="range"
                  min={-180}
                  max={180}
                  step={0.5}
                  value={v}
                  disabled={playing}
                  onChange={(e) => simRef.current?.setJoint(i, e.target.value)}
                  className="w-full accent-primary"
                />
                <output className="text-right font-semibold tabular-nums">{v.toFixed(1)}°</output>
              </div>
            ))}
          </Panel>
          <Panel title="Events">
            <ul className="space-y-1 text-xs text-muted-foreground">
              {state?.events?.length ? (
                state.events.map((e, i) => (
                  <li key={i}>
                    <span className="tabular-nums">{e.t.toFixed(0)} s</span> · {e.msg}
                  </li>
                ))
              ) : (
                <li>No events yet.</li>
              )}
            </ul>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
