import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { AlertTriangle, BookOpen, Bot, CheckCircle2, FileText, Info, Pause, Play, Repeat, RotateCcw, Sparkles, Wrench } from "lucide-react";
import type { ProcessCard } from "@/data/automationStudioIndustries";
import { analyzeDescription, matchTemplateIds, processesFromSkills } from "@/utils/processAnalyzer";
import { createSimulation, parseProcess, PRESETS, ROBOT_SIZES, STATION_NAMES, type Simulation } from "./robotSim.js";
import { PROCESS_PROFILES, type ProcessKind } from "./processProfiles";
import { planLine, recommendRobots, STRATEGIES, type DirectoryRobot, type LinePlan, type Strategy } from "./robotKnowledge";
import { buildBom, compareOptions, inrRange } from "./solutionCost";

type LineInput = Parameters<typeof planLine>[0];
import SolutionReport from "./SolutionReport";
import SkillsLibrary from "./SkillsLibrary";
import MediaAnalyzer from "./MediaAnalyzer";
import type { MediaAnalysis } from "./mediaAnalysis";

// Construction 3D concrete printing is a whole system (printer, material plant, PLC, HMI),
// not a robot station, so it opens its own simulator.
const ConstructionPrintStudio = lazy(() => import("./concrete/ConstructionPrintStudio"));
const CONCRETE_PRINTING = "Construction 3D Concrete Printing";

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
  focus?: number;
  cells?: { title: string; stepIndex: number; step: Step | null; cycles: number }[];
};

/** Whole-factory descriptions: the planner splits them into several robots. */
const LINE_EXAMPLES: Record<string, string> = {
  "Fabrication line":
    "We fabricate steel brackets and frames. Operators load parts from the conveyor into a welding fixture, MIG weld the joints, grind the weld spatter, apply anti-rust coating, inspect the weld quality, and stack finished parts on pallets for dispatch.",
  "Packaging line":
    "We make cosmetic creams. Workers pick jars from the conveyor, fill the cream, cap the jars, apply the product label, inspect the fill level and pack the jars into cartons.",
  "Machine shop":
    "We machine aluminium housings. Operators load raw blanks from the conveyor into the CNC machine, deburr and polish the edges, assemble the cover with screws, check the dimensions and stack the housings on pallets.",
};

/** Process families each built-in template shows, so only related templates are offered. */
const PRESET_KINDS: Record<string, ProcessKind[]> = {
  "Machine tending": ["machining", "handling", "inspection"],
  Palletizing: ["palletizing", "transport"],
  "Pick and place": ["handling", "transport"],
  Welding: ["welding"],
  Painting: ["coating"],
  Dispensing: ["coating"],
  Polishing: ["finishing"],
  Assembly: ["assembly"],
  "Filling & capping": ["filling", "sealing"],
  Labeling: ["labeling"],
  Packing: ["packing"],
};

let catalogPromise: Promise<DirectoryRobot[]> | null = null;
const loadCatalog = () =>
  (catalogPromise ??= fetch("/directory/robots.json")
    .then((r) => (r.ok ? r.json() : []))
    .catch(() => []));

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
  /** Analysed process line: simulated as a multi-robot line instead of one cell */
  processes?: Pick<ProcessCard, "name" | "eoat" | "robot">[] | Pick<ProcessCard, "name">[];
  /** The user's own words, quoted in the solution report */
  description?: string;
  /** Photo (or video frame) of the manual work, shown in the 3D scene and the report */
  referenceImage?: string;
  /** AI reading of the user's photos / video */
  mediaAnalysis?: MediaAnalysis | null;
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
  processes,
  description: initialDescription,
  referenceImage,
  mediaAnalysis,
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
  const [plan, setPlan] = useState<LinePlan | null>(null);
  // The tasks the current plan was made from, so another solution option can re-plan them.
  const [lineInput, setLineInput] = useState<LineInput | null>(null);
  const [strategy, setStrategy] = useState<Strategy>("balanced");
  const [focus, setFocus] = useState(0);
  const [catalog, setCatalog] = useState<DirectoryRobot[]>([]);
  const [description, setDescription] = useState<string | undefined>(initialDescription);
  const [reportOpen, setReportOpen] = useState(false);
  const [skillsOpen, setSkillsOpen] = useState(false);
  const [allTemplates, setAllTemplates] = useState(false);
  const [reference, setReference] = useState<string | undefined>(referenceImage);
  const [media, setMedia] = useState<MediaAnalysis | null>(mediaAnalysis ?? null);
  const [special, setSpecial] = useState(false);

  function openSpecial(desc?: string) {
    simRef.current?.pause();
    if (desc) setDescription(desc);
    setSpecial(true);
  }

  useEffect(() => {
    simRef.current?.setReference(reference ?? null, "Your reference: manual process today");
  }, [reference]);

  useEffect(() => {
    let live = true;
    loadCatalog().then((c) => live && setCatalog(c));
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (!stageRef.current) return;
    const sim = createSimulation({
      THREE,
      OrbitControls,
      container: stageRef.current,
      onUpdate: (s: SimState) => setState(s),
    });
    simRef.current = sim;
    if (reference) sim.setReference(reference, "Your reference: manual process today");
    if (processes?.length) runLine(processes);
    else build(text);
    return () => sim.dispose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function runLine(input: LineInput, planNotes: string[] = [], option: Strategy = strategy) {
    if (input.some((p) => p.name === CONCRETE_PRINTING)) return openSpecial();
    setLineInput(input);
    runPlan(planLine(input, option), planNotes);
  }

  function chooseOption(option: Strategy) {
    setStrategy(option);
    if (lineInput) runPlan(planLine(lineInput, option), notes);
  }

  function runPlan(p: LinePlan, planNotes: string[] = []) {
    setPlan(p);
    setFocus(0);
    setAllTemplates(false);
    setSteps(p.robots[0]?.steps || []);
    setNotes(planNotes);
    simRef.current?.setPlan(p.sim);
    // Industrial robots work behind a fence; a cobot-only line does not need one.
    simRef.current?.setFencing(p.robots.map((r) => !r.collaborative));
    simRef.current?.setFocus(0);
    simRef.current?.play();
    setUnreachable(simRef.current?.checkReach() || []);
  }

  function restart() {
    if (plan) {
      simRef.current?.setPlan(plan.sim);
      simRef.current?.setFocus(focus);
    } else simRef.current?.setSteps(steps);
    simRef.current?.play();
  }

  function focusRobot(i: number) {
    if (!plan) return;
    setFocus(i);
    setSteps(plan.robots[i].steps);
    simRef.current?.setFocus(i);
  }

  function build(src: string) {
    // Any request written as sentences (not one step per line) is analysed:
    // only the tasks it names are extracted and a robot line is planned for them.
    const isStepList = /\n|->|→/.test(src.trim());
    if (!isStepList && src.trim()) {
      setDescription(src.trim());
      if (matchTemplateIds(src).includes("concrete3dp")) openSpecial(src.trim());
      else if (matchTemplateIds(src).length > 0) runLine(analyzeDescription(src, null));
      else
        // Every request still gets a solution: a general pick-and-place cell.
        runLine([{ name: "Pick & Place Handling" }], [
          "No specific process was recognised, so this is a general pick-and-place robot cell. Name the tasks (weld, grind, paint, glue, assemble, screw, machine tending, press, moulding, inspect, measure, label, pack, palletize…) or open the Skills library for a detailed plan.",
        ]);
      return;
    }
    setDescription(undefined);
    setPlan(null);
    setLineInput(null);
    simRef.current?.setFencing(false);
    setFocus(0);
    const { steps: parsed, notes: n } = parseProcess(src);
    setSteps(parsed as Step[]);
    setNotes(n);
    simRef.current?.setSteps(parsed);
    simRef.current?.play();
    setUnreachable(simRef.current?.checkReach(parsed) || []);
  }

  // Photos / video analysed by AI: plan exactly the tasks it found and show the photo in 3D.
  function applyMedia(r: MediaAnalysis, frames: string[]) {
    setMedia(r);
    setReference(frames[0]);
    const words = r.description || r.summary;
    if (words) setText(words);
    setDescription(words || undefined);
    const procs = processesFromSkills(r.tasks);
    if (procs.length) runLine(procs);
    else build(words || "pick and place");
  }

  function changeSize(key: string) {
    setSize(key);
    simRef.current?.setRobotSize(key);
    restart();
    setUnreachable((plan ? simRef.current?.checkReach() : simRef.current?.checkReach(steps)) || []);
  }

  const playing = state?.playing ?? true;
  const perHour = useMemo(
    () => (state?.lastCycle ? Math.floor(3600 / state.lastCycle) : null),
    [state?.lastCycle],
  );
  const warnings = notes.filter((n) => !n.startsWith("Added"));
  const autoAdded = steps.filter((s) => s.auto).length;

  const embedded = variant === "embedded";

  // With a plan, offer only the templates for the process families it uses.
  const taskCount = plan?.robots.reduce((n, r) => n + r.tasks.length, 0) ?? 0;
  const planKinds = new Set(plan?.robots.flatMap((r) => r.tasks.map((t) => t.kind)) || []);
  const relatedPresets = Object.entries(PRESETS).filter(([name]) => (PRESET_KINDS[name] || []).some((k) => planKinds.has(k)));
  const related = !!plan && relatedPresets.length > 0;
  const presets = related && !allTemplates ? relatedPresets : Object.entries(PRESETS);
  const budget = useMemo(() => (plan ? buildBom(plan, catalog).total : null), [plan, catalog]);
  const options = useMemo(() => (lineInput ? compareOptions(lineInput, catalog) : []), [lineInput, catalog]);

  return (
    <>
    {special && (
      <div className={cn(embedded && "overflow-hidden rounded-xl border border-border")}>
        <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading the construction printing cell…</div>}>
          <ConstructionPrintStudio
            description={description}
            onExit={() => {
              setSpecial(false);
              simRef.current?.play();
            }}
          />
        </Suspense>
      </div>
    )}
    <div
      className={cn(
        "flex flex-col bg-background text-foreground",
        embedded ? "overflow-hidden rounded-xl border border-border" : "min-h-[calc(100vh-8rem)]",
        special && "hidden",
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
          {plan && (
            <Button size="sm" onClick={() => setReportOpen(true)} className="bg-amber-500 text-black hover:bg-amber-400">
              <FileText className="h-4 w-4" />
              <span className="ml-1.5">Solution report</span>
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setSkillsOpen(true)} aria-label="Skills library">
            <BookOpen className="h-4 w-4" />
            <span className="ml-1.5 hidden xl:inline">Skills library</span>
          </Button>
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
            onClick={restart}
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
          "grid flex-1 grid-cols-1 lg:grid-rows-[minmax(0,1fr)]",
          showEditor || plan ? "lg:grid-cols-[320px_1fr_270px]" : "lg:grid-cols-[260px_1fr_270px]",
          embedded ? "lg:h-[640px] lg:flex-none" : "lg:h-[calc(100vh-8.5rem)] lg:min-h-[620px] lg:flex-none",
        )}
      >
        {/* Left: process */}
        <aside className="order-2 space-y-3 overflow-auto border-border bg-muted/20 p-3 lg:order-1 lg:border-r">
          {showEditor && (
            <Panel title="Describe the process">
              <p className="mb-2 text-xs text-muted-foreground">
                Describe your whole factory in a sentence or two and the studio picks out only the tasks you name, plans
                the robots and shows the line. Or write one robot step per line: pick, place, weld, paint, polish,
                assemble, fill, cap, label, inspect, pack, stack…
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
              <p className="mb-1.5 mt-3 text-[11px] font-semibold text-muted-foreground">
                Or show us the manual work (AI photo / video analysis)
              </p>
              <MediaAnalyzer onResult={applyMedia} />
              <p className="mb-1.5 mt-3 flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                {related ? "Templates related to your process" : "Templates"}
                {related && (
                  <button className="font-normal text-primary hover:underline" onClick={() => setAllTemplates((v) => !v)}>
                    {allTemplates ? "Show related" : `Show all (${Object.keys(PRESETS).length})`}
                  </button>
                )}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {presets.map(([name, t]) => (
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
              <p className="mb-1.5 mt-3 text-[11px] font-semibold text-muted-foreground">Whole-factory examples (multi-robot)</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(LINE_EXAMPLES).map(([name, t]) => (
                  <button
                    key={name}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                      text === t ? "border-amber-500 bg-amber-500/10 text-amber-600" : "border-border hover:border-amber-500",
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

          {plan && (
            <Panel title={`Robot plan: ${plan.robots.length} robot${plan.robots.length > 1 ? "s" : ""}, ${taskCount} task${taskCount === 1 ? "" : "s"}`}>
              <p className="mb-2 text-[11px] text-muted-foreground">
                Only the tasks in your description are simulated. A robot takes on several tasks when its tools allow;
                parts move between robots on transfer conveyors. Select a robot to follow it.
              </p>
              {options.length > 0 && (
                <div className="mb-2" role="radiogroup" aria-label="Solution option">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Solution option</p>
                  <div className="grid grid-cols-3 gap-1">
                    {options.map((o) => (
                      <button
                        key={o.strategy}
                        role="radio"
                        aria-checked={strategy === o.strategy}
                        onClick={() => chooseOption(o.strategy)}
                        title={STRATEGIES[o.strategy].bestFor}
                        className={cn(
                          "rounded-md border px-1.5 py-1.5 text-left text-[10px] leading-tight transition-colors",
                          strategy === o.strategy ? "border-primary bg-primary/10" : "border-border hover:border-primary/50",
                        )}
                      >
                        <b className="block text-[11px]">{o.label.replace(" (cobots)", "")}</b>
                        <span className="block text-muted-foreground">
                          {o.robots} robot{o.robots > 1 ? "s" : ""}
                          {o.cobots ? ` · ${o.cobots} cobot${o.cobots > 1 ? "s" : ""}` : ""}
                        </span>
                        <span className="block text-muted-foreground">{o.relativeOutput}× output</span>
                      </button>
                    ))}
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground">{STRATEGIES[strategy].bestFor}.</p>
                </div>
              )}
              {budget && (
                <button
                  onClick={() => setReportOpen(true)}
                  className="mb-2 flex w-full items-center justify-between gap-2 rounded-md border border-amber-500/50 bg-amber-500/10 px-2.5 py-2 text-left text-xs"
                >
                  <span>
                    <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">Indicative budget</span>
                    <b className="tabular-nums">{inrRange(budget)}</b>
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-amber-600">
                    <FileText className="h-3.5 w-3.5" /> Full report
                  </span>
                </button>
              )}
              <div className="space-y-2">
                {plan.robots.map((r, i) => {
                  const recs = recommendRobots(r, catalog);
                  const cell = state?.cells?.[i];
                  return (
                    <button
                      key={i}
                      onClick={() => focusRobot(i)}
                      aria-pressed={focus === i}
                      className={cn(
                        "w-full rounded-md border bg-background p-2.5 text-left transition-colors",
                        focus === i ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/60",
                      )}
                    >
                      <span className="flex flex-wrap items-center gap-1.5">
                        <Bot className="h-4 w-4 text-primary" />
                        <b className="whitespace-nowrap text-sm">{r.title}</b>
                        {r.multitask && (
                          <Badge variant="secondary" className="h-4 gap-0.5 px-1 text-[9px]">
                            <Repeat className="h-2.5 w-2.5" /> Multitask
                          </Badge>
                        )}
                        {r.collaborative && (
                          <Badge variant="outline" className="h-4 border-emerald-500/60 px-1 text-[9px] text-emerald-600">
                            Cobot
                          </Badge>
                        )}
                        {r.toolChanger && (
                          <Badge variant="outline" className="h-4 px-1 text-[9px]">
                            Tool changer
                          </Badge>
                        )}
                        <span className="ml-auto whitespace-nowrap text-[10px] tabular-nums text-muted-foreground">
                          {cell ? `${cell.cycles} parts` : ""}
                        </span>
                      </span>
                      <span className="mt-1.5 flex flex-wrap gap-1">
                        {r.tasks.map((t, k) => (
                          <span
                            key={k}
                            className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                            style={{ background: `${PROCESS_PROFILES[t.kind].color}22`, color: PROCESS_PROFILES[t.kind].color }}
                          >
                            {t.name}
                          </span>
                        ))}
                      </span>
                      <span className="mt-1.5 flex items-start gap-1 text-[11px] text-muted-foreground">
                        <Wrench className="mt-0.5 h-3 w-3 shrink-0" />
                        {r.tools.length ? r.tools.join(" + ") : r.tasks[0].skill.toolName}
                        {" · "}min {r.minPayload} kg
                      </span>
                      {recs.length > 0 && (
                        <span className="mt-1 block text-[11px] text-muted-foreground">
                          Suitable: <span className="text-foreground">{recs.map((m) => m.n).join(", ")}</span>
                        </span>
                      )}
                      {cell?.step && focus !== i && (
                        <span className="mt-1 block truncate text-[11px] text-amber-600">Now: {cell.step.label}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </Panel>
          )}

          <Panel title={plan ? `${plan.robots[focus]?.title ?? "Robot"} steps (${steps.length})` : `Process steps (${steps.length})`}>
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
            {plan && state?.cells ? (
              <ul className="space-y-0.5">
                {state.cells.map((c, i) => (
                  <li key={i} className={cn("truncate text-[12px]", i === focus ? "font-semibold" : "opacity-75")}>
                    <span className="text-amber-300">R{i + 1}</span> · {c.step?.label || "Waiting"}
                  </li>
                ))}
              </ul>
            ) : (
              <>
                <span className="text-[11px] uppercase tracking-wide opacity-70">
                  {state?.step ? `Step ${state.stepIndex + 1} of ${steps.length}` : "Ready"}
                </span>
                <b className="block truncate text-[15px]">{state?.step?.label || "Build a process to start"}</b>
              </>
            )}
          </div>
          <div className="absolute right-3 top-3 hidden rounded-lg border border-white/10 bg-[#0e1621]/85 px-3 py-2 text-right text-[#e6ecf3] backdrop-blur sm:block">
            <span className="text-[11px] uppercase tracking-wide opacity-70">{plan ? "Line cycle" : "Cycle"}</span>
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
          {reference && (
            <figure className="absolute bottom-10 right-3 hidden w-36 overflow-hidden rounded-lg border border-amber-400/60 bg-[#0e1621]/85 sm:block">
              <img src={reference} alt="Your manual process" className="h-20 w-full object-cover" />
              <figcaption className="px-2 py-1 text-[10px] text-amber-300">Before: manual work · After: robots</figcaption>
            </figure>
          )}
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
                  : plan
                    ? "Every station is within each robot's reach."
                    : "Every station is within this robot's reach."}
              </span>
            </div>
          </Panel>
          <Panel title={plan ? `Joints: ${plan.robots[focus]?.title ?? ""}` : "Joints"}>
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
      {plan && (
        <SolutionReport
          open={reportOpen}
          onOpenChange={setReportOpen}
          plan={plan}
          catalog={catalog}
          description={description}
          lastCycle={state?.lastCycle}
          unreachable={unreachable.map((u) => STATION_NAMES[u] || u)}
          referenceImage={reference}
          media={media}
          options={options}
        />
      )}
      <SkillsLibrary
        open={skillsOpen}
        onOpenChange={setSkillsOpen}
        onTry={(t) => {
          setText(t);
          build(t);
        }}
      />
    </div>
    </>
  );
}
