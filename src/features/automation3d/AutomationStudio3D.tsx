import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { AlertTriangle, BookOpen, Bot, Camera, CheckCircle2, FileText, Info, Loader2, Maximize2, Minimize2, Minus, Pause, Play, Plus, Repeat, RotateCcw, Shield, Sparkles, Trash2, Wrench, X } from "lucide-react";
import type { ProcessCard } from "@/data/automationStudioIndustries";
import { analyzeDescription, matchTemplateIds, processesFromSkills, SKILL_LIBRARY } from "@/utils/processAnalyzer";
import { createSimulation, parseProcess, PRESETS, ROBOT_SIZES, STATION_NAMES, type Interference, type LineSpacing, type Simulation, type SimQuality } from "./robotSim.js";
import { addJob, baseJob, isShare, removeTasks, shareJob, suggestJobs } from "./lineEdit";
import { CINEMATIC_POST } from "./cinematicPost";
import CellEquipmentList from "./CellEquipmentList";
import RobotSystemSheet from "./RobotSystemSheet";
import RobotBaseControl, { type MotionChoice } from "./RobotBaseControl";
import { PROCESS_PROFILES, processKind, type ProcessKind } from "./processProfiles";
import { planLine, recommendRobots, STRATEGIES, type DirectoryRobot, type LinePlan, type Strategy } from "./robotKnowledge";
import { buildBom, compareOptions, inrRange } from "./solutionCost";
import type { MotionType } from "./robotMotion";

type LineInput = Parameters<typeof planLine>[0];
import SolutionReport from "./SolutionReport";
import SkillsLibrary from "./SkillsLibrary";
import MediaAnalyzer from "./MediaAnalyzer";
import type { MediaAnalysis } from "./mediaAnalysis";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AiSolutionPanel from "./AiSolutionPanel";
import EquipmentPicker, { Thumb, type Choice } from "./EquipmentPicker";
import RobotConfigurator from "./RobotConfigurator";
import ProcessBuilder from "./ProcessBuilder";
import { imageFunctionUrl, storedImageUrl } from "@/components/directory/directoryTypes";
import type { AiStation } from "./aiSolution";
import { requestSolution, solutionProcesses, type AiSolution } from "./aiSolution";
import { engineSolution } from "./solutionEngine";

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
  cells?: { title: string; stepIndex: number; step: Step | null; cycles: number; lastCycle?: number | null }[];
  product?: { label: string; kg: number; size: [number, number, number]; gripper: string } | null;
  tools?: string[];
  quality?: SimQuality;
};

/** "300 × 240 × 220 mm" (length × width × height). */
const mmSize = ([w, h, d]: [number, number, number]) => `${Math.round(w * 1000)} × ${Math.round(d * 1000)} × ${Math.round(h * 1000)} mm`;
const weight = (kg: number) => (kg >= 1 ? `${+kg.toFixed(1)} kg` : `${Math.round(kg * 1000)} g`);

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
  ["cinematic", "Cinematic"],
  ["product", "Close-up"],
  ["front", "Front"],
  ["side", "Side"],
  ["top", "Top"],
];

interface Props {
  initialProcess?: string;
  /** Same live line shown as a factory plan ("layout") or with the material path ("flow"). */
  overlay?: "none" | "layout" | "flow";
  /** Camera to start from: iso, front, top or side. */
  initialView?: string;
  /** How the line's robots move when the user has not chosen (e.g. "overhead" from a ?motion= link). */
  motion?: MotionType | null;
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

/** Safety fence: by robot type (industrial fenced, cobots open), round the whole line, round each robot, or none. */
type FenceMode = "auto" | "line" | "each" | "off";
const FENCE_MODES: [FenceMode, string, string][] = [
  ["auto", "Auto", "Industrial robots behind a fence; cobots work open with area scanners."],
  ["line", "Whole line", "One fence round the whole line, with interlocked doors."],
  ["each", "Each robot", "A fence round each robot, with a walkway between them."],
  ["off", "None", "No fence: industrial robots are guarded by safety laser scanners instead."],
];
const SPACINGS: [LineSpacing, string, string][] = [
  ["compact", "Compact", "Cells 3.6 m apart: neighbouring robots share space, so their moves must be interlocked."],
  ["clear", "Clear", "0.5 m free between every robot's reach: no robot can touch another robot's equipment."],
  ["roomy", "Roomy", "A metre more between robots for maintenance and walkways."],
];
/** The work a robot does that another robot can share: its welding, machining or tool work, else its first job. */
const mainTask = (r: LinePlan["robots"][number]) => r.tasks.find((t) => t.skill.tool || t.skill.sim === "weld" || t.skill.sim === "cnc") ?? r.tasks[0];
const clashText = (h: Interference) =>
  h.kind === "shared"
    ? `Robots ${h.robot + 1} and ${h.other + 1} can reach the same ${h.depth} m of floor`
    : `Robot ${h.robot + 1} can reach Robot ${h.other + 1}'s ${h.what.toLowerCase()} (${h.depth} m inside its reach)`;

const Panel = ({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) => (
  <section className={cn("rounded-lg border border-border bg-card p-3", className)}>
    <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
    {children}
  </section>
);

export default function AutomationStudio3D({
  initialProcess,
  overlay = "none",
  initialView = "iso",
  motion = null,
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
  const stageWrapRef = useRef<HTMLDivElement>(null);
  /** How each robot is mounted and moves (fixed, 7th-axis track…), by its first task: the user's choice. */
  const [motions, setMotions] = useState<Record<string, MotionChoice>>({});
  const [fullscreen, setFullscreen] = useState(false);
  const canFullscreen = typeof document !== "undefined" && !!document.fullscreenEnabled;
  const simRef = useRef<Simulation | null>(null);
  const [sceneStatus, setSceneStatus] = useState<"building" | "ready" | "lost">("building");
  const [labels, setLabels] = useState<"key" | "all" | "off">("key");
  const [smoothNotice, setSmoothNotice] = useState(false);
  const [text, setText] = useState<string>(initialProcess || PRESETS["Machine tending"]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [notes, setNotes] = useState<string[]>([]);
  const [size, setSize] = useState("medium");
  const [view, setView] = useState(initialView);
  const [speed, setSpeed] = useState(1);
  const [state, setState] = useState<SimState | null>(null);
  const [unreachable, setUnreachable] = useState<string[]>([]);
  /** Stations, cabinets and stands that stand on each other's floor (none in a good layout). */
  const [overlaps, setOverlaps] = useState<string[]>([]);
  const [plan, setPlan] = useState<LinePlan | null>(null);
  // The tasks the current plan was made from, so another solution option can re-plan them.
  const [lineInput, setLineInput] = useState<LineInput | null>(null);
  const [strategy, setStrategy] = useState<Strategy>("balanced");
  const [focus, setFocus] = useState(0);
  const [catalog, setCatalog] = useState<DirectoryRobot[]>([]);
  const [description, setDescription] = useState<string | undefined>(initialDescription);
  // The user's own words, for the 3D line's real product (mangoes, cement bags…). A ref as well, because a line is
  // planned in the same handler that sets the brief.
  const briefRef = useRef<string | undefined>(initialDescription);
  const setBrief = (d: string | undefined) => {
    briefRef.current = d;
    setDescription(d);
  };
  const [reportOpen, setReportOpen] = useState(false);
  const [skillsOpen, setSkillsOpen] = useState(false);
  const [allTemplates, setAllTemplates] = useState(false);
  const [reference, setReference] = useState<string | undefined>(referenceImage);
  const [media, setMedia] = useState<MediaAnalysis | null>(mediaAnalysis ?? null);
  const [special, setSpecial] = useState(false);
  // Solution for the current brief: built-in engine instantly, AI engineer refines it.
  const [solutionOpen, setSolutionOpen] = useState(false);
  // Equipment the user chose per solution station; shown on the matching robot cell in 3D.
  const [equipment, setEquipment] = useState<{ brief: string; stations: string[]; choices: Record<number, Choice> } | null>(null);
  // Robot / tool the user picked directly for a robot cell (from the robot list); wins over the station choices.
  // Keyed by the robot's first task ("task:<name>") so a pick stays on its job when the line is re-split.
  const [cellPicks, setCellPicks] = useState<Record<string, Choice>>({});
  // Robots the user asked for (null = let the planner decide from the solution option).
  const [robotCount, setRobotCount] = useState<number | null>(null);
  // Robots the user added: a job shared with another robot ("MIG/MAG Welding (2nd robot)"), or a robot for a new job.
  const [added, setAdded] = useState<string[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [addJobName, setAddJobName] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  // Safety fence for the line, and the user's own choice per robot (by its first task).
  const [fenceMode, setFenceMode] = useState<FenceMode>("auto");
  const [fenceOwn, setFenceOwn] = useState<Record<string, boolean>>({});
  // Space between robots, and where a robot can still reach another robot's equipment or space.
  const [spacing, setSpacing] = useState<LineSpacing>("clear");
  const [clearance, setClearance] = useState<Interference[]>([]);
  const [pickFor, setPickFor] = useState<number | null>(null);
  const [inputMode, setInputMode] = useState<"blocks" | "words">("blocks");
  const [ai, setAi] = useState<{ brief: string; solution: AiSolution | null; loading: boolean; error: string | null }>({
    brief: "", solution: null, loading: false, error: null,
  });
  const genericLine = useRef(false);
  const engine = useMemo(() => (description && description.length >= 8 ? engineSolution(description) : null), [description]);
  const runAi = (brief: string) => {
    setAi({ brief, solution: null, loading: true, error: null });
    requestSolution(brief).then(
      (solution) => {
        setAi((cur) => (cur.brief === brief ? { brief, solution, loading: false, error: null } : cur));
        // The keywords found nothing: build the line the AI engineer designed instead of the generic cell.
        if (genericLine.current) {
          const procs = solutionProcesses(solution);
          if (procs.length) {
            genericLine.current = false;
            runLine(procs);
          }
        }
      },
      (e: Error) => setAi((cur) => (cur.brief === brief ? { brief, solution: null, loading: false, error: e.message } : cur)),
    );
  };
  // The line task each solution station stands for: same name, else the same kind of work, else its position.
  const stationTasks = useMemo(() => {
    // Choices made for another brief never land on this line.
    if (!equipment || !lineInput || equipment.brief !== (description ?? "")) return [] as (string | null)[];
    const used = new Set<string>();
    return equipment.stations.map((name, i) => {
      const lower = name.toLowerCase();
      const kind = processKind({ name });
      const hit =
        lineInput.find((t) => !used.has(t.name) && t.name.toLowerCase() === lower) ??
        lineInput.find((t) => !used.has(t.name) && processKind(t) === kind) ??
        (equipment.stations.length === lineInput.length ? lineInput[i] : undefined);
      if (!hit) return null;
      used.add(hit.name);
      return hit.name;
    });
  }, [equipment, lineInput, description]);
  // Every station the user gave its own robot starts a robot cell of its own.
  const splitBefore = useMemo(
    () => stationTasks.filter((t, i): t is string => !!t && !!equipment?.choices[i]?.robot),
    [stationTasks, equipment],
  );
  // Every robot the user added starts a cell of its own too.
  const splits = useMemo(
    () => [...splitBefore, ...added.filter((n) => lineInput?.some((t) => t.name === n))],
    [splitBefore, added, lineInput],
  );
  const cellOf = (p: LinePlan, task: string) => p.robots.findIndex((r) => r.tasks.some((t) => t.name === task));
  const pickKey = (r: LinePlan["robots"][number]) => `task:${r.tasks[0]?.name ?? ""}`;
  // What goes on each robot cell: the station choices, then the robot built in the configurator (wins).
  const perCell = useMemo(() => {
    const map = new Map<number, Choice>();
    if (!plan) return map;
    equipment?.stations.forEach((_, i) => {
      const c = equipment!.choices[i];
      const task = stationTasks[i];
      if ((!c?.robot && !c?.tool) || !task) return;
      const idx = cellOf(plan, task);
      if (idx < 0) return;
      const prev = map.get(idx) ?? {};
      map.set(idx, { robot: prev.robot ?? c.robot, tool: prev.tool ?? c.tool });
    });
    plan.robots.forEach((r, idx) => {
      const c = cellPicks[pickKey(r)];
      // The configurator holds the whole build for this robot.
      if (c && Object.values(c).some(Boolean)) map.set(idx, { ...(map.get(idx) ?? {}), ...c });
    });
    return map;
  }, [equipment, plan, cellPicks, stationTasks]);

  useEffect(() => {
    const sim = simRef.current;
    if (!sim || !plan) return;
    sim.setEquipmentAll(plan.robots.map((r, i) => {
      const eq = perCell.get(i);
      return (
        eq
          ? {
              robot: eq.robot
                ? { name: eq.robot.name, brand: eq.robot.brand, reachMm: eq.robot.reach, payloadKg: eq.robot.payload, collaborative: r.collaborative || /cobot|collaborative/i.test(`${eq.robot.type} ${eq.robot.name}`) }
                : undefined,
              eoat: eq.tool ? { name: `${eq.tool.name} ${eq.tool.type ?? ""}` } : undefined,
              accessories: [eq.changer && "changer", eq.sensor && "sensor", eq.camera && "camera"].filter(Boolean) as ("changer" | "sensor" | "camera")[],
            }
          : null
      );
    }));
    recheck();
  }, [perCell, plan]);

  // Fences: the user's choice per robot, else the line's setting. Applied after the robots and equipment above.
  const fenced = useMemo(
    () => (plan ? plan.robots.map((r) => fenceOwn[pickKey(r)] ?? (fenceMode === "auto" ? !r.collaborative : fenceMode !== "off")) : []),
    [plan, fenceMode, fenceOwn],
  );
  useEffect(() => {
    const sim = simRef.current;
    if (!sim || !plan) return;
    sim.setCobots(plan.robots.map((r) => r.collaborative));
    sim.setFencing(fenced, { separate: fenceMode === "each" });
    recheck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fenced, fenceMode]);
  useEffect(() => {
    simRef.current?.setSpacing(spacing);
    recheck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spacing]);

  // Per-cell picks are saved per brief too.
  const cellKey = "rv-studio-cells:" + (description ?? "").slice(0, 200);
  useEffect(() => {
    try {
      setCellPicks(JSON.parse(localStorage.getItem(cellKey) || "{}"));
    } catch {
      setCellPicks({});
    }
  }, [cellKey]);
  const setCellPick = (key: string, c: Choice) =>
    setCellPicks((cur) => {
      const next = { ...cur, [key]: c };
      try {
        localStorage.setItem(cellKey, JSON.stringify(next));
      } catch {
        /* private mode */
      }
      return next;
    });

  // Restore choices saved for this brief (the picker stores them per brief) without opening the dialog.
  useEffect(() => {
    if (!engine || !description) return setEquipment(null);
    try {
      const saved = JSON.parse(localStorage.getItem("rv-studio-equipment:" + description.slice(0, 200)) || "null");
      // Choices belong to one brief: a new brief starts clean unless it has its own saved choices.
      setEquipment(saved && typeof saved === "object" ? { brief: description, stations: engine.stations.map((s) => s.skill || s.name), choices: saved } : null);
    } catch {
      setEquipment(null);
    }
  }, [engine, description]);

  useEffect(() => {
    if (description && description.length >= 8 && ai.brief !== description) runAi(description);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [description]);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === stageWrapRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else stageWrapRef.current?.requestFullscreen?.().catch(() => {});
  }

  function saveImage() {
    const url = simRef.current?.snapshot();
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(title || "robot-cell").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "robot-cell"}.png`;
    a.click();
  }

  function openSpecial(desc?: string) {
    simRef.current?.pause();
    if (desc) setBrief(desc);
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
      RoomEnvironment,
      post: CINEMATIC_POST,
      container: stageRef.current,
      onUpdate: (s: SimState) => setState(s),
      onStatus: (status) => { setSceneStatus(status); if (status === "ready") recheck(); },
      onPerformance: () => setSmoothNotice(true),
    });
    simRef.current = sim;
    if (reference) sim.setReference(reference, "Your reference: manual process today");
    if (processes?.length) runLine(processes);
    else build(text);
    sim.setOverlay(overlay);
    if (initialView !== "iso") sim.setView(initialView);
    return () => sim.dispose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function runLine(input: LineInput, planNotes: string[] = [], option: Strategy = strategy) {
    if (input.some((p) => p.name === CONCRETE_PRINTING)) return openSpecial();
    setLineInput(input);
    setRobotCount(null);
    setMotions({});
    setAdded([]);
    setFenceOwn({});
    setAddOpen(false);
    runPlan(planLine(input, option, { motion }), planNotes);
  }

  /**
   * One more robot: on robot `at`'s job (the robots share the work), or for another job after it. Palletizing
   * and packing robots go to the end of the line.
   */
  function addRobot(job?: string, at = focus) {
    if (!lineInput || !plan) return;
    const r = plan.robots[at];
    if (!r) return;
    let res: { input: LineInput; added: string };
    if (job) {
      const card = processesFromSkills([job])[0];
      if (!card) return setAddError(`No job called "${job}" in the skills library`);
      res = addJob(lineInput, card.name, r.tasks[r.tasks.length - 1]?.name);
    } else res = shareJob(lineInput, mainTask(r).name);
    const nextAdded = [...added, res.added];
    setLineInput(res.input);
    setAdded(nextAdded);
    setRobotCount(null);
    setAddOpen(false);
    setAddJobName("");
    setAddError(null);
    const p = planLine(res.input, strategy, { splitBefore: [...splitBefore, ...nextAdded], motion, motions });
    runPlan(p, notes, Math.max(0, cellOf(p, res.added)));
  }

  /** Take a robot the user added off the line again. */
  function removeRobot(i: number) {
    if (!lineInput || !plan) return;
    const mine = plan.robots[i].tasks.map((t) => t.name).filter((n) => added.includes(n));
    if (!mine.length) return;
    const input = removeTasks(lineInput, mine);
    const nextAdded = added.filter((n) => !mine.includes(n));
    setLineInput(input);
    setAdded(nextAdded);
    setRobotCount(null);
    runPlan(planLine(input, strategy, { splitBefore: [...splitBefore, ...nextAdded], motion, motions }), notes, Math.max(0, i - 1));
  }

  /** Reach, floor space and free space between robots for the line as it stands now. */
  function recheck() {
    const sim = simRef.current;
    if (!sim) return;
    setUnreachable((plan ? sim.checkReach() : sim.checkReach(steps)) || []);
    setOverlaps(sim.layoutIssues());
    setClearance(sim.interference());
  }

  /** Put a robot on a track, a gantry, a mobile base… or back on a fixed base, and re-plan the line. */
  function chooseMotion(i: number, m: MotionChoice) {
    if (!lineInput || !plan) return;
    const key = plan.robots[i]?.tasks[0]?.name;
    if (!key) return;
    const next = { ...motions, [key]: m };
    setMotions(next);
    runPlan(planLine(lineInput, strategy, { splitBefore: splits, robots: robotCount ?? undefined, motion, motions: next }), notes, i);
  }

  function chooseOption(option: Strategy) {
    setStrategy(option);
    setRobotCount(null);
    if (lineInput) runPlan(planLine(lineInput, option, { splitBefore: splits, motion, motions }), notes);
  }

  function chooseRobotCount(n: number) {
    if (!lineInput) return;
    setRobotCount(n);
    runPlan(planLine(lineInput, strategy, { splitBefore: splits, robots: n, motion, motions }), notes);
  }

  // A robot chosen for a station that shares a cell with another robot: give it a cell of its own.
  // Runs when the choices or the line change, not on every re-plan, so a robot count the user sets later is kept.
  useEffect(() => {
    if (!plan || !lineInput || !splitBefore.length) return;
    const clash = splitBefore.some((t) => {
      const i = cellOf(plan, t);
      return i >= 0 && plan.robots[i].tasks[0]?.name !== t;
    });
    if (!clash) return;
    setRobotCount(null);
    runPlan(planLine(lineInput, strategy, { splitBefore: splits, motion, motions }), notes, focus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [splitBefore.join("|"), lineInput]);

  function runPlan(p: LinePlan, planNotes: string[] = [], keepFocus = 0) {
    const f = Math.min(keepFocus, p.robots.length - 1);
    setPlan(p);
    setFocus(f);
    setAllTemplates(false);
    setSteps(p.robots[f]?.steps || []);
    setNotes(planNotes);
    simRef.current?.setPlan({ ...p.sim, brief: briefRef.current });
    // Cobots in cobot paint; fences as the user set them (the fence effect applies later changes).
    simRef.current?.setCobots(p.robots.map((r) => r.collaborative));
    simRef.current?.setFencing(
      p.robots.map((r) => fenceOwn[pickKey(r)] ?? (fenceMode === "auto" ? !r.collaborative : fenceMode !== "off")),
      { separate: fenceMode === "each" },
    );
    simRef.current?.setFocus(f);
    simRef.current?.play();
    recheck();
  }

  function restart() {
    if (plan) {
      simRef.current?.setPlan({ ...plan.sim, brief: briefRef.current });
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
      setBrief(src.trim());
      if (matchTemplateIds(src).includes("concrete3dp")) openSpecial(src.trim());
      else if (matchTemplateIds(src).length > 0) runLine(analyzeDescription(src, null));
      else {
        // Every request still gets a solution: a general pick-and-place cell until the AI engineer answers.
        genericLine.current = true;
        runLine([{ name: "Pick & Place Handling" }], [
          "No specific process was recognised yet, so this starts as a general pick-and-place cell. The AI solution engineer is reading your brief and will rebuild the line it designs; open Solution for the full engineering proposal.",
        ]);
      }
      return;
    }
    setBrief(undefined);
    setPlan(null);
    setLineInput(null);
    simRef.current?.setFencing(false);
    setFocus(0);
    const { steps: parsed, notes: n } = parseProcess(src);
    setSteps(parsed as Step[]);
    setNotes(n);
    simRef.current?.setSteps(parsed);
    simRef.current?.play();
    recheck();
  }

  // Photos / video analysed by AI: plan exactly the tasks it found and show the photo in 3D.
  function applyMedia(r: MediaAnalysis, frames: string[]) {
    setMedia(r);
    setReference(frames[0]);
    const words = r.description || r.summary;
    if (words) setText(words);
    setBrief(words || undefined);
    const procs = processesFromSkills(r.tasks);
    if (procs.length) runLine(procs);
    else build(words || "pick and place");
  }

  // Point-and-click builder: the chosen jobs, in order, become the robot line.
  function buildFromBlocks(names: string[]) {
    const sentence = `Robot line: ${names.join(", then ")}.`;
    setText(sentence);
    setDescription(sentence);
    // Built from job blocks, not the user's words: the jobs name the product.
    briefRef.current = undefined;
    const procs = processesFromSkills(names);
    if (procs.length) runLine(procs);
  }

  function changeSize(key: string) {
    setSize(key);
    simRef.current?.setRobotSize(key);
    restart();
    setUnreachable((plan ? simRef.current?.checkReach() : simRef.current?.checkReach(steps)) || []);
    setOverlaps(simRef.current?.layoutIssues() || []);
    setClearance(simRef.current?.interference() || []);
  }

  const playing = state?.playing ?? true;
  const perHour = useMemo(
    () => (state?.lastCycle ? Math.floor(3600 / state.lastCycle) : null),
    [state?.lastCycle],
  );
  const warnings = notes.filter((n) => !n.startsWith("Added"));
  const autoAdded = steps.filter((s) => s.auto).length;

  const embedded = variant === "embedded";

  // Picture tools: realistic picture, save image, full screen (top right on phones, bottom right on wider screens).
  const pictureTools = (
    <div role="group" aria-label="Picture" className="flex shrink-0 items-center rounded-md border border-white/10 bg-[#0c121b]/80 p-0.5 text-[#e6ecf3] backdrop-blur">
      <button
        type="button"
        aria-pressed={state?.quality === "high"}
        aria-label="Realistic picture"
        title="Realistic picture: soft contact shadows, glowing lamps and arcs. Turn it off for a faster picture on slow devices."
        onClick={() => simRef.current?.setQuality(state?.quality === "high" ? "standard" : "high")}
        className={cn(
          "flex h-7 items-center gap-1.5 rounded-[4px] px-2 text-xs transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a90e2]",
          state?.quality === "high" ? "bg-[#4a90e2]/25 text-white" : "text-white/65 hover:bg-white/5 hover:text-white",
        )}
      >
        <Sparkles className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Realistic</span>
      </button>
      <button
        type="button"
        aria-label="Save image"
        title="Save this view as an image"
        onClick={saveImage}
        className="flex h-7 w-7 items-center justify-center rounded-[4px] text-white/65 transition-colors duration-150 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a90e2]"
      >
        <Camera className="h-3.5 w-3.5" />
      </button>
      {canFullscreen && (
        <button
          type="button"
          aria-label={fullscreen ? "Exit full screen" : "Full screen"}
          title={fullscreen ? "Exit full screen" : "Full screen"}
          onClick={toggleFullscreen}
          className="flex h-7 w-7 items-center justify-center rounded-[4px] text-white/65 transition-colors duration-150 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a90e2]"
        >
          {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        </button>
      )}
    </div>
  );

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
          {engine && (
            <Button size="sm" variant="outline" onClick={() => setSolutionOpen(true)} aria-label="Engineered solution">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="ml-1.5">Solution</span>
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
            <Panel title="Build your process">
              <div className="mb-3 grid grid-cols-2 overflow-hidden rounded-md border border-border text-xs" role="tablist" aria-label="How to build">
                {(["blocks", "words"] as const).map((m) => (
                  <button
                    key={m}
                    role="tab"
                    aria-selected={inputMode === m}
                    onClick={() => setInputMode(m)}
                    className={cn("px-2 py-1.5 font-medium", inputMode === m ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
                  >
                    {m === "blocks" ? "Tap jobs (easy)" : "Describe in words"}
                  </button>
                ))}
              </div>
              {inputMode === "blocks" ? (
                <ProcessBuilder onBuild={buildFromBlocks} />
              ) : (
              <>
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
              </>
              )}
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
              {lineInput && taskCount > 1 && (
                <div className="mb-2 flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5">
                  <span className="min-w-0 flex-1 text-[11px] leading-tight">
                    <b className="block">Robots in line</b>
                    <span className="text-muted-foreground">{robotCount ? "Your choice" : splitBefore.length ? "One cell per robot you chose" : "Set by the solution option"} · 1–{taskCount}</span>
                  </span>
                  <button
                    type="button"
                    aria-label="Fewer robots"
                    disabled={plan.robots.length <= 1}
                    onClick={() => chooseRobotCount(plan.robots.length - 1)}
                    className="rounded border border-border p-1 hover:border-primary disabled:opacity-40"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <b className="w-5 text-center text-sm tabular-nums" aria-live="polite" aria-label="Robots in line">
                    {plan.robots.length}
                  </b>
                  <button
                    type="button"
                    aria-label="More robots"
                    disabled={plan.robots.length >= taskCount}
                    onClick={() => chooseRobotCount(plan.robots.length + 1)}
                    className="rounded border border-border p-1 hover:border-primary disabled:opacity-40"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              <div className="mb-2 space-y-1.5 rounded-md border border-border bg-background px-2 py-1.5 text-[11px]">
                <div>
                  <span className="mb-1 flex items-center gap-1 font-semibold">
                    <Shield className="h-3.5 w-3.5 text-amber-500" /> Safety fence
                  </span>
                  <span className="grid grid-cols-4 gap-0.5 rounded-md border border-border p-0.5" role="group" aria-label="Safety fence">
                    {FENCE_MODES.map(([k, label]) => (
                      <button
                        key={k}
                        type="button"
                        aria-pressed={fenceMode === k && !Object.keys(fenceOwn).length}
                        onClick={() => {
                          setFenceMode(k);
                          setFenceOwn({});
                        }}
                        className={cn(
                          "rounded px-1 py-0.5 leading-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                          fenceMode === k && !Object.keys(fenceOwn).length ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </span>
                </div>
                {plan.robots.length > 1 && (
                  <div>
                    <span className="mb-1 block font-semibold">Space between robots</span>
                    <span className="grid grid-cols-3 gap-0.5 rounded-md border border-border p-0.5" role="group" aria-label="Space between robots">
                      {SPACINGS.map(([k, label]) => (
                        <button
                          key={k}
                          type="button"
                          aria-pressed={spacing === k}
                          onClick={() => setSpacing(k)}
                          className={cn(
                            "rounded px-1 py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                            spacing === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </span>
                  </div>
                )}
                <p className="leading-snug text-muted-foreground">
                  {Object.keys(fenceOwn).length ? "Your choice per robot (set on each robot below)." : FENCE_MODES.find(([k]) => k === fenceMode)?.[2]}
                  {plan.robots.length > 1 ? ` ${SPACINGS.find(([k]) => k === spacing)?.[2]}` : ""}
                </p>
              </div>
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
              {engine && (
                <Button size="sm" variant="outline" className="mb-2 w-full" onClick={() => setSolutionOpen(true)}>
                  <Bot className="mr-1.5 h-3.5 w-3.5" /> Choose robots & tools (marketplace / OEM)
                </Button>
              )}
              <div className="space-y-2">
                {plan.robots.map((r, i) => {
                  const recs = recommendRobots(r, catalog);
                  const chosen = perCell.get(i);
                  const cell = state?.cells?.[i];
                  return (
                    <div key={i} className="space-y-1">
                    <button
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
                        {r.tasks.some((t) => isShare(t.name)) && (
                          <Badge variant="outline" className="h-4 border-sky-500/60 px-1 text-[9px] text-sky-600">
                            Shares the job
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
                      {chosen?.robot || chosen?.tool || chosen?.changer || chosen?.sensor || chosen?.camera ? (
                        <span className="mt-2 grid w-full min-w-0 gap-1.5">
                          {chosen.robot && (
                            <span className="flex min-w-0 items-center gap-2 overflow-hidden rounded-md bg-primary/10 p-1.5">
                              <Thumb m={chosen.robot} size="h-12 w-12" />
                              <span className="min-w-0 flex-1 text-[11px] leading-tight">
                                <span className="block text-[9px] uppercase tracking-wide text-muted-foreground">Robot</span>
                                <b className="block truncate">{chosen.robot.name}</b>
                                <span className="text-muted-foreground">
                                  {chosen.robot.source === "market" ? "RobotVerse marketplace" : "Directory · OEM"}
                                  {chosen.robot.payload ? ` · ${chosen.robot.payload} kg` : ""}
                                </span>
                              </span>
                            </span>
                          )}
                          {chosen.tool && (
                            <span className="flex min-w-0 items-center gap-2 overflow-hidden rounded-md bg-muted/60 p-1.5">
                              <Thumb m={chosen.tool} size="h-12 w-12" />
                              <span className="min-w-0 flex-1 text-[11px] leading-tight">
                                <span className="block text-[9px] uppercase tracking-wide text-muted-foreground">Tool (EOAT)</span>
                                <b className="block truncate">{chosen.tool.name}</b>
                                <span className="text-muted-foreground">{chosen.tool.source === "market" ? "RobotVerse marketplace" : "Directory · OEM"}</span>
                              </span>
                            </span>
                          )}
                          {(chosen.changer || chosen.sensor || chosen.camera) && (
                            <span className="flex flex-wrap gap-1 text-[10px]">
                              {[chosen.changer, chosen.sensor, chosen.camera].filter(Boolean).map((a) => (
                                <span key={a!.id} className="max-w-full truncate rounded bg-muted px-1.5 py-0.5">+ {a!.name}</span>
                              ))}
                            </span>
                          )}
                        </span>
                      ) : (
                        recs.length > 0 && (
                          <span className="mt-2 block">
                            <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">Suitable robots</span>
                            <span className="mt-1 grid grid-cols-3 gap-1">
                              {recs.map((m) => (
                                <span key={m.id} className="min-w-0 rounded border border-border bg-white p-0.5 text-center">
                                  <SuggestImg id={m.id} img={m.img} th={m.th} />
                                  <span className="block truncate px-0.5 text-[9px] text-slate-700">{m.n}</span>
                                </span>
                              ))}
                            </span>
                          </span>
                        )
                      )}
                      {cell?.step && focus !== i && (
                        <span className="mt-1 block truncate text-[11px] text-amber-600">Now: {cell.step.label}</span>
                      )}
                    </button>
                    <RobotBaseControl value={r.motion} onChange={(m) => chooseMotion(i, m)} />
                    <Button size="sm" variant={chosen?.robot ? "secondary" : "outline"} className="h-7 w-full text-xs" onClick={() => setPickFor(i)}>
                      <Bot className="mr-1.5 h-3.5 w-3.5" /> {chosen?.robot ? "Change robot, tool & accessories" : "Build robot: drag robot, tool & accessories"}
                    </Button>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        aria-pressed={!!fenced[i]}
                        onClick={() => setFenceOwn({ ...fenceOwn, [pickKey(r)]: !fenced[i] })}
                        className={cn(
                          "inline-flex h-7 flex-1 items-center justify-center gap-1 rounded-md border px-2 text-[11px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                          fenced[i] ? "border-amber-500/60 bg-amber-500/10 text-amber-700 dark:text-amber-400" : "border-border text-muted-foreground hover:border-primary/60",
                        )}
                        title={fenced[i] ? "Take the fence away from this robot" : "Put a safety fence round this robot"}
                      >
                        <Shield className="h-3.5 w-3.5" /> {fenced[i] ? "Fenced" : "No fence"}
                      </button>
                      {r.tasks.some((t) => added.includes(t.name)) && (
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive" onClick={() => removeRobot(i)}>
                          <Trash2 className="mr-1 h-3.5 w-3.5" /> Remove
                        </Button>
                      )}
                    </div>
                    {!fenced[i] && !r.collaborative && (
                      <p className="text-[11px] leading-snug text-amber-600">
                        Industrial robot without a fence: safety laser scanners stop it when a person comes in (risk assessment to ISO 10218-2).
                      </p>
                    )}
                    </div>
                  );
                })}
              </div>
              {lineInput && (
                <div className="mt-2">
                  {!addOpen ? (
                    <Button size="sm" variant="outline" className="h-8 w-full border-dashed text-xs" onClick={() => setAddOpen(true)}>
                      <Plus className="mr-1.5 h-3.5 w-3.5" /> Add robot
                    </Button>
                  ) : (
                    (() => {
                      const r = plan.robots[focus];
                      const job = r ? baseJob(mainTask(r).name) : "";
                      const n = lineInput.filter((t) => baseJob(t.name) === job).length + 1;
                      return (
                        <div className="rounded-md border border-primary/40 bg-background p-2 text-xs">
                          <div className="mb-1.5 flex items-center justify-between gap-2">
                            <b>Add a robot to the line</b>
                            <button
                              type="button"
                              onClick={() => setAddOpen(false)}
                              aria-label="Close"
                              className="rounded p-0.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          {job && (
                            <button
                              type="button"
                              onClick={() => addRobot()}
                              className="mb-2 w-full rounded-md border border-border p-2 text-left hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            >
                              <b className="block">
                                {n} robots on {job}
                              </b>
                              <span className="text-muted-foreground">
                                {r?.title} shares its job: each robot does 1/{n} of the work, so the line makes about {n}× the parts per hour.
                              </span>
                            </button>
                          )}
                          <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Or a robot for another job</p>
                          <div className="flex flex-wrap gap-1">
                            {suggestJobs(lineInput).map((j) => (
                              <button
                                key={j}
                                type="button"
                                onClick={() => addRobot(j)}
                                className="rounded-full border border-border px-2 py-0.5 hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                              >
                                + {j}
                              </button>
                            ))}
                          </div>
                          <form
                            className="mt-2 flex gap-1"
                            onSubmit={(e) => {
                              e.preventDefault();
                              if (addJobName.trim()) addRobot(addJobName.trim());
                            }}
                          >
                            <input
                              list="studio-add-jobs"
                              value={addJobName}
                              onChange={(e) => {
                                setAddJobName(e.target.value);
                                setAddError(null);
                              }}
                              placeholder="Any job, e.g. Spot Welding"
                              aria-label="Job for the new robot"
                              className="h-7 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            />
                            <datalist id="studio-add-jobs">
                              {SKILL_LIBRARY.map((x) => (
                                <option key={x.id} value={x.template.name} />
                              ))}
                            </datalist>
                            <Button type="submit" size="sm" className="h-7 px-2 text-xs" disabled={!addJobName.trim()}>
                              Add
                            </Button>
                          </form>
                          {addError && <p className="mt-1 text-[11px] text-destructive">{addError}</p>}
                          <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
                            The new robot gets its own cell, tools and equipment; parts pass between robots on a transfer belt.
                          </p>
                        </div>
                      );
                    })()
                  )}
                </div>
              )}
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
        <div ref={stageWrapRef} className="relative order-1 min-h-[60vh] bg-[#1a2433] lg:order-2 lg:min-h-0">
          <div ref={stageRef} className="absolute inset-0" />
          {sceneStatus !== "ready" && <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/90" role="status">
            {sceneStatus === "lost" ? <Button variant="outline" onClick={() => simRef.current?.reload()}>3D view paused by the browser — tap to reload the view</Button> : <span className="flex items-center gap-2 text-foreground"><Loader2 className="h-5 w-5 animate-spin" />Building your line…</span>}
          </div>}
          {smoothNotice && <div role="status" className="absolute left-3 top-28 z-20 flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground">Switched to smooth mode for this device<Button variant="ghost" size="icon" aria-label="Dismiss smooth mode notice" onClick={() => setSmoothNotice(false)}><X className="h-3 w-3" /></Button></div>}
          <div className="absolute left-3 top-3 max-w-[70%] min-w-[200px] rounded-md border border-white/10 bg-[#0c121b]/80 px-3 py-2 text-[#e6ecf3] backdrop-blur">
            <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-white/60">
              <span className={cn("h-1.5 w-1.5 rounded-full", state?.playing ? "bg-emerald-400" : "bg-white/40")} />
              {state?.playing ? "Running" : "Paused"}
              {!(plan && state?.cells) && state?.step && <span className="tabular-nums">· Step {state.stepIndex + 1} of {steps.length}</span>}
            </span>
            {plan && state?.cells ? (
              <ul className="mt-1 space-y-0.5">
                {state.cells.map((c, i) => (
                  <li key={i} className={cn("truncate text-[12px]", i === focus ? "font-semibold" : "opacity-75")}>
                    <span className="text-amber-300">R{i + 1}</span> · {c.step?.label || "Waiting"}
                  </li>
                ))}
              </ul>
            ) : (
              <b className="mt-0.5 block truncate text-[15px] font-semibold">{state?.step?.label || "Build a process to start"}</b>
            )}
          </div>
          <div className="absolute right-3 top-3 sm:hidden">{pictureTools}</div>
          <div className="absolute right-3 top-3 hidden rounded-md border border-white/10 bg-[#0c121b]/80 px-3 py-2 text-right text-[#e6ecf3] backdrop-blur sm:block">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/60">{plan ? "Line cycle" : "Cycle"}</span>
            <b className="block text-[15px] font-semibold tabular-nums">
              {state?.lastCycle ? `${state.lastCycle.toFixed(1)} s` : `${(state?.currentCycle ?? 0).toFixed(1)} s`}
            </b>
          </div>
          {reference && (
            <figure className="absolute bottom-14 right-3 hidden w-36 overflow-hidden rounded-md border border-amber-400/60 bg-[#0c121b]/85 sm:block">
              <img src={reference} alt="Your manual process" className="h-20 w-full object-cover" />
              <figcaption className="px-2 py-1 text-[10px] text-amber-300">Before: manual work · After: robots</figcaption>
            </figure>
          )}
          <div className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-2">
            <div role="group" aria-label="Camera view" className="flex min-w-0 overflow-x-auto rounded-md border border-white/10 bg-[#0c121b]/80 p-0.5 backdrop-blur [scrollbar-width:none]">
              <Button variant="secondary" size="sm" className="shrink-0 text-xs" onClick={() => { const next = labels === "key" ? "all" : labels === "all" ? "off" : "key"; setLabels(next); simRef.current?.setLabels(next); }}>Labels: {labels === "key" ? "Key" : labels === "all" ? "All" : "Off"}</Button>
              {VIEWS.map(([k, l]) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={view === k}
                  onClick={() => {
                    setView(k);
                    simRef.current?.setView(k);
                  }}
                  className={cn(
                    "shrink-0 rounded-[4px] px-2 py-1 text-[11px] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a90e2] sm:px-2.5 sm:text-xs",
                    view === k ? "bg-[#4a90e2]/25 text-white" : "text-white/65 hover:bg-white/5 hover:text-white",
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
            <span className="hidden pb-1.5 text-[11px] text-white/45 xl:inline">Drag to rotate · scroll to zoom</span>
            <div className="hidden sm:block">{pictureTools}</div>
          </div>
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
          {state?.product && (
            <Panel title="Workpiece & tools">
              <dl className="divide-y divide-border text-[13px]">
                {[
                  ["Product", state.product.label],
                  ["Size", mmSize(state.product.size)],
                  ["Weight", weight(state.product.kg)],
                  ["Gripper", state.product.gripper],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-baseline justify-between gap-3 py-1.5">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="text-right font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
              {(state.tools?.length ?? 0) > 1 && (
                <>
                  <p className="mt-2 text-[11px] text-muted-foreground">Process tools in this line</p>
                  <ul className="mt-1 flex flex-wrap gap-1">
                    {state.tools!.slice(1).map((t) => (
                      <li key={t} className="rounded border border-border bg-background px-1.5 py-0.5 text-[11px]">
                        {t}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <button
                type="button"
                onClick={() => {
                  setView("product");
                  simRef.current?.setView("product");
                }}
                className="mt-2 text-xs font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                See it close up
              </button>
            </Panel>
          )}
          <Panel title={plan && plan.robots.length > 1 ? `Cell equipment: Robot ${focus + 1}` : "Cell equipment"}>
            <CellEquipmentList
              jobs={plan ? (plan.robots[focus]?.tasks ?? []).map((t) => t.name) : []}
              fenced={plan ? !plan.robots[focus]?.collaborative : false}
              steps={steps}
            />
          </Panel>
          {plan && plan.robots[focus]?.tasks[0]?.name && (
            <Panel title="Robot system & cables">
              <RobotSystemSheet
                compact
                job={plan.robots[focus].tasks[0].name}
                fenced={!plan.robots[focus].collaborative}
                robot={perCell.get(focus)?.robot}
              />
            </Panel>
          )}
          <Panel title={plan && plan.robots.length > 1 ? "Line check" : "Reach check"}>
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
            <div
              className={cn(
                "mt-1.5 flex gap-2 rounded-md border px-2.5 py-2 text-xs",
                overlaps.length ? "border-amber-500/50 text-amber-600" : "border-green-600/50 text-green-600",
              )}
            >
              {overlaps.length ? <AlertTriangle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
              <span>
                {overlaps.length
                  ? `Too close: ${overlaps.slice(0, 3).join("; ")}${overlaps.length > 3 ? ` and ${overlaps.length - 3} more` : ""}. Give them more floor.`
                  : "Floor space: every station, cabinet and stand has its own floor."}
              </span>
            </div>
            {plan && plan.robots.length > 1 && (
              <div
                className={cn(
                  "mt-1.5 flex gap-2 rounded-md border px-2.5 py-2 text-xs",
                  clearance.length ? "border-amber-500/50 text-amber-600" : "border-green-600/50 text-green-600",
                )}
              >
                {clearance.length ? <AlertTriangle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
                <span className="min-w-0">
                  {clearance.length ? (
                    <>
                      {clearance.slice(0, 3).map(clashText).join("; ")}
                      {clearance.length > 3 ? ` and ${clearance.length - 3} more` : ""}.{" "}
                      {spacing !== "roomy" ? (
                        <button
                          type="button"
                          onClick={() => setSpacing(spacing === "compact" ? "clear" : "roomy")}
                          className="font-semibold underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          Give free space
                        </button>
                      ) : (
                        "Choose a smaller robot, or put one on a track."
                      )}
                    </>
                  ) : (
                    `Free space: every robot moves clear of the other robots' reach and equipment${spacing === "compact" ? "" : " (0.5 m or more between them)"}.`
                  )}
                </span>
              </div>
            )}
            {plan && (
              (() => {
                const open = plan.robots.map((r, i) => (!fenced[i] && !r.collaborative ? i + 1 : 0)).filter(Boolean);
                return (
                  <div
                    className={cn(
                      "mt-1.5 flex gap-2 rounded-md border px-2.5 py-2 text-xs",
                      open.length ? "border-amber-500/50 text-amber-600" : "border-green-600/50 text-green-600",
                    )}
                  >
                    {open.length ? <AlertTriangle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
                    <span>
                      {open.length
                        ? `Robot ${open.join(", ")} works without a fence: safety laser scanners must stop it before a person reaches it (risk assessment to ISO 10218-2).`
                        : fenced.some(Boolean)
                          ? `Safety: ${fenced.every(Boolean) ? "every robot is fenced" : "industrial robots fenced; cobots guarded by area scanners"}.`
                          : "Safety: cobots guarded by area scanners and force limits (ISO/TS 15066)."}
                    </span>
                  </div>
                );
              })()
            )}
            {plan && plan.robots.length > 1 && (() => {
              const times = (state?.cells ?? []).map((c) => c.lastCycle ?? null);
              if (times.length !== plan.robots.length || times.some((t) => !t)) return null;
              const ts = times as number[];
              const max = Math.max(...ts), min = Math.min(...ts);
              const slow = ts.indexOf(max);
              const ok = max <= min * 1.35;
              return (
                <div className={cn("mt-1.5 flex gap-2 rounded-md border px-2.5 py-2 text-xs", ok ? "border-green-600/50 text-green-600" : "border-amber-500/50 text-amber-600")}>
                  {ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
                  <span>
                    {ok ? (
                      `Balanced: every robot takes ${min.toFixed(1)}–${max.toFixed(1)} s per part.`
                    ) : (
                      <>
                        Robot {slow + 1} is the slowest: {max.toFixed(1)} s per part (fastest {min.toFixed(1)} s).{" "}
                        <button
                          type="button"
                          onClick={() => addRobot(undefined, slow)}
                          className="font-semibold underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          Add a robot to share its job
                        </button>
                      </>
                    )}
                  </span>
                </div>
              );
            })()}
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
      <Dialog open={solutionOpen} onOpenChange={setSolutionOpen}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Engineered solution</DialogTitle>
            <DialogDescription className="line-clamp-2">{description}</DialogDescription>
            <p className="text-xs text-primary">Robots and tools you choose below replace the robots in the 3D view — close this window to see them.</p>
          </DialogHeader>
          <AiSolutionPanel
            solution={ai.brief === description ? ai.solution : null}
            fallback={engine}
            loading={ai.brief === description && ai.loading}
            error={ai.brief === description ? ai.error : null}
            onRetry={() => description && runAi(description)}
            onBuild={() => {
              const sol = (ai.brief === description && ai.solution) || engine;
              if (sol) runLine(solutionProcesses(sol));
              setSolutionOpen(false);
            }}
            onAsk={
              showEditor
                ? (q) => {
                    setText((t) => `${t.trim()} ${q} Answer: `);
                    setSolutionOpen(false);
                  }
                : undefined
            }
            compact
          />
          {(((ai.brief === description && ai.solution) || engine)?.stations.length ?? 0) > 0 && (
            <EquipmentPicker
              key={description}
              stations={((ai.brief === description && ai.solution) || engine)!.stations}
              briefKey={description ?? ""}
              onChange={(choices) =>
                setEquipment({ brief: description ?? "", stations: ((ai.brief === description && ai.solution) || engine)!.stations.map((s) => s.skill || s.name), choices })
              }
            />
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={pickFor !== null} onOpenChange={(o) => !o && setPickFor(null)}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
          {pickFor !== null && plan?.robots[pickFor] && (
            <>
              <DialogHeader>
                <DialogTitle>Build the robot for: {plan.robots[pickFor].title}</DialogTitle>
                <DialogDescription>
                  Job: {plan.robots[pickFor].tasks.map((t) => t.name).join(", ")}. Drag a robot arm, an end-of-arm tool and any accessories onto your robot — from the
                  RobotVerse marketplace or the Directory. Each part appears on this robot in the 3D cell right away.
                </DialogDescription>
              </DialogHeader>
              <RobotConfigurator
                key={`${description}-${pickFor}`}
                station={cellStation(plan.robots[pickFor])}
                value={cellPicks[pickKey(plan.robots[pickFor])] ?? perCell.get(pickFor) ?? {}}
                onChange={(c) => setCellPick(pickKey(plan.robots[pickFor]), c)}
              />
              <div className="flex justify-end">
                <Button size="sm" onClick={() => setPickFor(null)}>Show in 3D</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
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

/** The job one robot cell does, in the shape the equipment matcher expects. */
function cellStation(r: LinePlan["robots"][number]): AiStation {
  const t = r.tasks[0];
  return {
    name: r.tasks.map((x) => x.name).join(" + "),
    skill: String(t.kind),
    what: r.tasks.map((x) => x.name).join(", "),
    equipment: r.collaborative ? "collaborative robot" : "",
    payload_kg: r.minPayload,
    reach_mm: null,
    tooling: r.tools.length ? r.tools.join(", ") : t.skill.toolName,
    sensors: [],
    cycle_s: null,
    notes: "",
  };
}

/** Small Directory robot picture for the suggestions on a robot card. */
function SuggestImg({ id, img, th }: { id: string; img?: string; th?: string }) {
  const item = { id, img, th } as never;
  const srcs = [storedImageUrl("robots", id, true), imageFunctionUrl("robots", item, true)];
  const [i, setI] = useState(0);
  return srcs[i] ? (
    <img src={srcs[i]} alt="" loading="lazy" onError={() => setI((n) => n + 1)} className="mx-auto h-10 w-full object-contain" />
  ) : (
    <Bot className="mx-auto h-10 w-6 text-muted-foreground" aria-hidden />
  );
}
