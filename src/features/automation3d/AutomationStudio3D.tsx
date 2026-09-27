import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
// @ts-ignore – plain JS engine shared with the standalone demo
import { createSimulation, parseProcess, PRESETS, ROBOT_SIZES, STATION_NAMES } from "./robotSim.js";

type Step = { action: string; station: string; label: string };
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

export default function AutomationStudio3D({ initialProcess }: { initialProcess?: string }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const simRef = useRef<any>(null);
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
    [state?.lastCycle]
  );

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col bg-background text-foreground">
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
        <div className="mr-auto leading-tight">
          <h1 className="text-base font-semibold tracking-tight">Automation Studio 3D</h1>
          <p className="text-xs text-muted-foreground">Describe a process and watch the robot cell run it</p>
        </div>
        <div className="flex overflow-hidden rounded-lg border border-border" role="group" aria-label="Robot size">
          {Object.values(ROBOT_SIZES as Record<string, any>).map((s: any) => (
            <button
              key={s.key}
              aria-pressed={size === s.key}
              onClick={() => changeSize(s.key)}
              className={`px-3 py-1.5 text-left text-sm leading-tight ${
                size === s.key ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
            >
              {s.label}
              <span className="block text-[11px] opacity-75">
                {s.reach} m, {s.payload} kg
              </span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted"
            onClick={() => (playing ? simRef.current?.pause() : simRef.current?.play())}
          >
            {playing ? "Pause" : "Play"}
          </button>
          <button
            className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted"
            onClick={() => {
              simRef.current?.setSteps(steps);
              simRef.current?.play();
            }}
          >
            Restart
          </button>
          <select
            aria-label="Simulation speed"
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
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

      <div className="grid flex-1 grid-cols-1 lg:grid-cols-[320px_1fr_260px]">
        <aside className="order-2 space-y-5 overflow-auto border-border p-4 lg:order-1 lg:border-r">
          <section>
            <h2 className="mb-1 text-sm font-semibold">Describe the process</h2>
            <p className="mb-2 text-xs text-muted-foreground">One step per line, in the order the robot works.</p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              spellCheck={false}
              className="min-h-[132px] w-full resize-y rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm"
            />
            <div className="my-2 flex flex-wrap gap-1.5">
              {Object.entries(PRESETS as Record<string, string>).map(([name, t]) => (
                <button
                  key={name}
                  className="rounded-full border border-border px-2.5 py-1 text-xs hover:border-primary"
                  onClick={() => {
                    setText(t);
                    build(t);
                  }}
                >
                  {name}
                </button>
              ))}
            </div>
            <button
              className="w-full rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
              onClick={() => build(text)}
            >
              Build simulation
            </button>
            {notes.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs text-destructive">
                {notes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            )}
          </section>
          <section>
            <h2 className="mb-2 text-sm font-semibold">Process steps</h2>
            <ol className="space-y-1">
              {steps.map((s, i) => (
                <li
                  key={i}
                  className={`grid grid-cols-[22px_1fr] gap-2 rounded-md border-l-[3px] px-2 py-1.5 text-sm ${
                    state?.stepIndex === i ? "border-amber-400 bg-amber-400/10" : "border-transparent"
                  }`}
                >
                  <span className="text-xs font-semibold text-muted-foreground">{i + 1}</span>
                  <span>
                    {s.label}
                    <span className="block text-xs text-muted-foreground">{STATION_NAMES[s.station]}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </aside>

        <div className="relative order-1 min-h-[60vh] bg-[#1a2433] lg:order-2 lg:min-h-0">
          <div ref={stageRef} className="absolute inset-0" />
          <div className="absolute left-3 top-3 min-w-[200px] rounded-lg border border-white/10 bg-[#0e1621]/80 px-3 py-2 text-[#e6ecf3] backdrop-blur">
            <span className="text-xs opacity-70">
              {state?.step ? `Step ${state.stepIndex + 1} of ${steps.length}` : "Ready"}
            </span>
            <b className="block text-[15px]">{state?.step?.label || "Build a process to start"}</b>
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
                className={`rounded-md border bg-[#0e1621]/70 px-2.5 py-1 text-xs text-[#e6ecf3] backdrop-blur ${
                  view === k ? "border-[#4a90e2]" : "border-white/15"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          <span className="absolute bottom-3.5 right-3 text-xs text-white/60">Drag to rotate, scroll to zoom</span>
        </div>

        <aside className="order-3 space-y-5 overflow-auto border-border p-4 lg:border-l">
          <section>
            <h2 className="mb-2 text-sm font-semibold">Cycle</h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                [state?.lastCycle ? `${state.lastCycle.toFixed(1)} s` : "–", "Last cycle time"],
                [String(state?.cycles ?? 0), "Parts completed"],
                [`${(state?.currentCycle ?? 0).toFixed(1)} s`, "Current cycle"],
                [perHour ? String(perHour) : "–", "Parts per hour"],
              ].map(([v, l]) => (
                <div key={l} className="rounded-lg border border-border bg-muted/40 p-2.5">
                  <b className="block text-lg tabular-nums">{v}</b>
                  <span className="text-[11px] text-muted-foreground">{l}</span>
                </div>
              ))}
            </div>
          </section>
          <section>
            <h2 className="mb-2 text-sm font-semibold">Reach check</h2>
            <div
              className={`rounded-lg border px-3 py-2 text-sm ${
                unreachable.length ? "border-destructive/50 text-destructive" : "border-green-600/50 text-green-600"
              }`}
            >
              {unreachable.length
                ? `Out of reach: ${unreachable.map((u) => STATION_NAMES[u]).join(", ")}. Choose a larger robot or move these stations closer.`
                : "Every station is within this robot's reach."}
            </div>
          </section>
          <section>
            <h2 className="mb-1 text-sm font-semibold">Joints</h2>
            <p className="mb-2 text-xs text-muted-foreground">
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
          </section>
          <section>
            <h2 className="mb-2 text-sm font-semibold">Events</h2>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {state?.events?.length ? (
                state.events.map((e, i) => (
                  <li key={i}>
                    {e.t.toFixed(0)} s: {e.msg}
                  </li>
                ))
              ) : (
                <li>No events yet.</li>
              )}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
