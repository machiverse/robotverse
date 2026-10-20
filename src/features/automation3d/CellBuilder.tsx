import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import {
  AlertTriangle, AppWindow, Bot, Boxes, Brain, PackagePlus, Link2, PanelLeft, PanelRight, Printer, Wand2, Camera, CheckCircle2, CircleDashed, ClipboardList, Download, Cog, Factory, Gauge, GripVertical, Loader2, Mail, Pause, Play, Plus, RotateCcw, Search, ShieldCheck, Store, Trash2, Workflow, Wrench, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { processesFromSkills } from "@/utils/processAnalyzer";
import { createSimulation, eoatKind, STATION_NAMES, type Simulation, type SimUpdate } from "./robotSim.js";
import { planLine, type LinePlan } from "./robotKnowledge";
import { Thumb, type Choice } from "./EquipmentPicker";
import { BLOCKS, findJobs } from "./ProcessBuilder";
import { slotOf } from "./RobotConfigurator";
import { loadDirectoryRobots, loadDirectoryTools, loadMarketRobots, loadMarketTools, type DirRobot, type DirTool, type Match } from "./equipmentMatch";
import LeadDialog from "@/components/leads/LeadDialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cellState, checkCell, type CheckItem, type CheckState } from "./cellCheck";
import { budgetFor, CycleTracker, decodeLine, encodeLine, isCobotMatch, reportHtml, roi, STARTERS, STEP_GROUP, suggest, suggestSwap, type Raw, type StarterCell, type StepTime } from "./builderExtras";
import { inr as inrShort } from "./solutionCost";
import { KIND_JOB, thinkCell, type Thought } from "./engineerPlaybook";
import { attachmentIssues, type FitIssue } from "./attachmentFit";
import { analyzeJob, JOB_EXAMPLES, type JobTask } from "./customJob";
import { processKind } from "./processProfiles";
import { CELL_STATIONS, cellProgram, stationLabel, stationsFor, TOOL_NAMES, type CellProgram, type StationKey } from "./cellProgram";
import { isComponent } from "./jobGear";
import { jobKit, type JobKit } from "./jobKit";
import { providerPlan, understandJob } from "./jobUnderstanding";

/* ------------------------------------------------------------------ data */

type Slot = keyof Choice;
type DragKind = "robot" | "tool" | "job" | "fence" | "station";
interface TouchItem {
  payload: string;
  kind: DragKind;
  slot?: Slot;
  label: string;
}
interface TouchState {
  item: TouchItem;
  x: number;
  y: number;
  active: boolean;
  timer: number;
}
interface Cell {
  id: string;
  /** "" until the user picks a job; a builder job or a skills-library task name. */
  job: string;
  /** The user's own words when they typed the job. */
  custom?: string;
  choice: Choice;
  /** undefined until the user picks safety: fence (true) or open cobot cell (false). */
  fenced?: boolean;
  /** Cell equipment the user placed: conveyors, tables, machine, pallet, camera, tool stand. */
  stations?: StationKey[];
  /** Components the user added: power source, wire feeder, torch cleaner, vacuum generator, adapters… */
  parts?: Match[];
}
type PaletteTab = "robots" | "tools" | "acc" | "layout" | "cell";

const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const firstImage = (v: unknown) => (Array.isArray(v) && typeof v[0] === "string" ? (v[0] as string) : undefined);

const dirRobot = (r: DirRobot): Match => ({
  source: "oem", kind: "robot", id: r.id, name: r.n, brand: r.b, model: r.m, payload: r.p, reach: r.r, axes: r.a, type: r.t,
  file: { img: r.img, th: r.th }, href: `/directory?q=${encodeURIComponent(r.n)}`, score: 0,
  reasons: r.ap?.includes("Collaborative") ? ["Collaborative"] : [],
});
const marketRobot = (r: Record<string, unknown>): Match => ({
  source: "market", kind: "robot", id: str(r.id), name: str(r.name), brand: str(r.brand), model: str(r.model),
  payload: num(r.payload_capacity), reach: num(r.reach), type: str(r.robot_type), price: num(r.price), currency: str(r.currency) || "INR",
  condition: str(r.condition) || null, location: str(r.location) || null, image: firstImage(r.images), href: `/robots/${str(r.id)}`, score: 0, reasons: [],
});
const dirTool = (t: DirTool): Match => ({
  source: "oem", kind: "tool", id: t.id, name: t.n, brand: t.b, model: t.m, type: t.c, file: { img: t.img, th: t.th },
  href: `/directory?tab=tools&q=${encodeURIComponent(t.n)}`, score: 0, reasons: [],
});
const marketTool = (t: Record<string, unknown>): Match => ({
  source: "market", kind: "tool", id: str(t.id), name: str(t.name), brand: str(t.brand), model: str(t.model),
  type: str(t.sub_category || t.category), price: num(t.price), currency: str(t.currency) || "INR",
  condition: str(t.condition) || null, location: str(t.location) || null, image: firstImage(t.images), href: `/parts/${str(t.id)}`, score: 0, reasons: [],
});

// Cell equipment that does not go on the arm (stations, power sources, feeders).
/** A component: not the working tool or an arm accessory (power source, feeder, cleaner, adapter, spare cups). */
const isPart = (m: Match) => m.kind === "tool" && isComponent(m.name, m.type);
/** The slot a catalogue item fills; components have none (they go in the cell's component list). */
const slotFor = (m: Match): Slot | undefined => (m.kind === "robot" ? "robot" : isPart(m) ? undefined : slotOf(m));
const sameItem = (a: Match, b: Match) => a.source === b.source && a.id === b.id;
const isCobot = isCobotMatch;
const ROBOT_TYPES = ["All", "6-Axis", "Cobot", "SCARA", "Delta", "Palletizing", "7-Axis"] as const;
const SLOTS: { key: Slot; label: string; icon: typeof Bot }[] = [
  { key: "robot", label: "Robot arm", icon: Bot },
  { key: "tool", label: "End-of-arm tool", icon: Wrench },
  { key: "changer", label: "Tool changer", icon: Cog },
  { key: "tool2", label: "2nd tool (on the tool stand)", icon: Wrench },
  { key: "sensor", label: "Force / torque sensor", icon: Gauge },
  { key: "camera", label: "Wrist camera", icon: Camera },
];
const jobLabel = (name: string) => (name ? (BLOCKS.find((b) => b.name === name)?.label ?? name) : "No job yet");
const cellLabel = (c?: { job: string; custom?: string }) => (c?.custom ? c.custom : jobLabel(c?.job ?? ""));
const newId = () => Math.random().toString(36).slice(2, 9);
const STORE = "rv-cell-builder";
const inr = (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`;
const STATION_KEYS = new Set<string>(CELL_STATIONS.map((s) => s.key));
const toolKindOf = (m?: Match) => (m ? eoatKind(`${m.name} ${m.type ?? ""}`) : undefined);
/** Cells saved before the user chose the equipment get what their job used to show. */
const withStations = (c: Cell): Cell =>
  Array.isArray(c.stations) ? c : { ...c, stations: c.job ? stationsFor(c.job, [toolKindOf(c.choice?.tool), toolKindOf(c.choice?.tool2)], !!c.choice?.changer) : [] };

/* ------------------------------------------------------------- component */

/**
 * Build-your-own robot cell: drag robots (RobotVerse marketplace or Directory), end-of-arm tools,
 * accessories, a job and safety fencing onto the cells, and the 3D line runs it live.
 */
export default function CellBuilder() {
  const stageRef = useRef<HTMLDivElement>(null);
  const simRef = useRef<Simulation | null>(null);
  const [data, setData] = useState<{ robots: Match[]; tools: Match[] } | null>(null);
  const [tab, setTab] = useState<PaletteTab>("robots");
  const [q, setQ] = useState("");
  const [source, setSource] = useState<"all" | "market" | "oem">("all");
  const [rtype, setRtype] = useState<(typeof ROBOT_TYPES)[number]>("All");
  const [shown, setShown] = useState(40);
  const [cells, setCells] = useState<Cell[]>(() => {
    try {
      const v = JSON.parse(localStorage.getItem(STORE) || "null");
      return Array.isArray(v) ? v.map(withStations) : [];
    } catch {
      return [];
    }
  });
  const [selected, setSelected] = useState(0);
  const [drag, setDrag] = useState<{ kind: DragKind; slot?: Slot } | null>(null);
  const [ghost, setGhost] = useState<{ label: string; x: number; y: number } | null>(null);
  const touchRef = useRef<TouchState | null>(null);
  const tapGuard = useRef(false);
  const stageBoxRef = useRef<HTMLElement>(null);
  const [overStage, setOverStage] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [sim, setSim] = useState<Pick<SimUpdate, "cells" | "currentCycle"> | null>(null);
  const lastEmit = useRef(0);
  const cellCount = useRef(0);
  const [reportOpen, setReportOpen] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [raw, setRaw] = useState<Raw | null>(null);
  const tracker = useRef(new CycleTracker());
  const stepsRef = useRef<{ label: string; action: string }[][]>([]);
  const [breakdown, setBreakdown] = useState<(StepTime[] | null)[]>([]);
  const [roiIn, setRoiIn] = useState({ operators: 0, shifts: 2, wage: 25000 });
  const [copied, setCopied] = useState(false);
  // A job typed in the user's own words, analysed into robot tasks.
  const [jobText, setJobText] = useState("");
  // Ready jobs matching the palette search: every word starts a word of the label, the job or its group.
  const jobBlocks = useMemo(() => findJobs(q), [q]);
  const jobInputRef = useRef<HTMLInputElement>(null);
  const jobTasks = useMemo(() => analyzeJob(jobText), [jobText]);
  // What a solution provider would check before quoting the typed job.
  const jobPlan = useMemo(() => (jobText.trim().length >= 3 ? providerPlan(jobText, understandJob(jobText)) : null), [jobText]);
  const [engineerOpen, setEngineerOpen] = useState(false);
  // Warn the moment something unsuitable is attached: compare each cell's fit issues with the last state.
  const [fitAlert, setFitAlert] = useState<{ cell: number; issues: FitIssue[]; undo: Cell[] } | null>(null);
  const [fitOpen, setFitOpen] = useState(false);
  const seenFit = useRef<Map<string, Set<string>> | null>(null);
  const prevCells = useRef<Cell[]>([]);
  const quietFit = useRef(false);
  // Digital-twin view: floating library and line panels over the 3D stage (desktop), and the drop target under the pointer.
  const [showLib, setShowLib] = useState(true);
  const [showLine, setShowLine] = useState(true);
  const [wide, setWide] = useState(() => typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches);
  const [hover, setHover] = useState(-1);
  const eqKeys = useRef<string[]>([]);
  const fenceKey = useRef("");
  const [unreachable, setUnreachable] = useState<string[]>([]);
  useEffect(() => {
    if (reportOpen) setUnreachable(simRef.current?.checkReach() ?? []);
  }, [reportOpen]);

  // Catalogue: marketplace listings first (they can be bought now), then the OEM directory.
  useEffect(() => {
    let live = true;
    Promise.all([loadMarketRobots(), loadDirectoryRobots(), loadMarketTools(), loadDirectoryTools()]).then(([mr, dr, mt, dt]) => {
      if (!live) return;
      setRaw({ dr, dt, mr, mt });
      setData({
        robots: [...mr.map(marketRobot), ...dr.map(dirRobot)],
        tools: [...mt.map(marketTool), ...dt.filter((t) => !/generic demo/i.test(t.c)).map(dirTool)],
      });
    });
    return () => {
      live = false;
    };
  }, []);

  // 3D stage
  useEffect(() => {
    if (!stageRef.current) return;
    const s = createSimulation({
      THREE, OrbitControls, RoomEnvironment, container: stageRef.current,
      onUpdate: (u: SimUpdate) => {
        if (tracker.current.update(u.simTime, u.cells, stepsRef.current)) setBreakdown([...tracker.current.last]);
        const now = performance.now();
        if (now - lastEmit.current < 250) return;
        lastEmit.current = now;
        setSim({ cells: u.cells, currentCycle: u.currentCycle });
      },
    });
    simRef.current = s;
    s.setBuildMode(true);
    // Click a robot in the 3D view to select its cell (a drag of the camera is not a click).
    const el = stageRef.current;
    let down: [number, number] | null = null;
    const onDown = (e: PointerEvent) => (down = [e.clientX, e.clientY]);
    const onUp = (e: PointerEvent) => {
      if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return;
      const t = s.cellAt(e.clientX, e.clientY);
      if (t >= 0 && t < cellCount.current) setSelected(t);
    };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerup", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", onUp);
      s.dispose();
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORE, JSON.stringify(cells));
    } catch {
      /* private mode */
    }
  }, [cells]);

  // One robot per cell, in order, doing the cell's job.
  const plan: LinePlan | null = useMemo(() => {
    if (!cells.length) return null;
    // Cells without a job are sized as handling robots but get no stations or program until a job is chosen.
    const input = cells.map((c) => processesFromSkills([c.job || "Loading & Unloading"])[0] ?? { name: c.job || "Loading & Unloading" });
    const p = planLine(input, "balanced", { splitBefore: input.map((x) => x.name), robots: cells.length });
    return {
      ...p,
      sim: { ...p.sim, cells: p.sim.cells.map((c, i) => (cells[i]?.job ? c : { ...c, title: `Robot ${i + 1}`, steps: [] })) },
    };
  }, [cells]);

  // Each robot's program, written from the equipment really in its cell (tools, stations, changer).
  const programs: CellProgram[] = useMemo(() => {
    const out: CellProgram[] = [];
    cells.forEach((c, i) => {
      const prev = out[i - 1];
      out.push(
        cellProgram({
          job: c.job,
          tools: [toolKindOf(c.choice.tool), toolKindOf(c.choice.tool2)],
          changer: !!c.choice.changer,
          stations: c.stations ?? [],
          camera: !!c.choice.camera,
          // The previous robot hands parts over on its outfeed conveyor.
          fromPrev: !!prev && !!cells[i - 1]?.choice.robot && prev.steps.some((s) => s.action === "place" && s.station === "out"),
        }),
      );
    });
    return out;
  }, [cells]);
  const simPlan = useMemo(
    () => ({
      cells: cells.map((c, i) => ({
        title: plan?.sim.cells[i]?.title ?? `Robot ${i + 1}`,
        // A cell runs its program once it has a robot.
        steps: c.choice.robot ? programs[i].steps : [],
        stations: c.stations ?? [],
        startTool: programs[i].startTool,
      })),
    }),
    [cells, programs, plan],
  );

  // Push the plan and every cell's equipment into the 3D scene.
  const planKey = JSON.stringify(simPlan.cells.map((c) => [c.title, c.steps.map((s) => `${s.action}@${s.station}${s.tool ?? ""}`), c.stations, c.startTool]));
  useEffect(() => {
    const s = simRef.current;
    if (!s) return;
    if (!cells.length) {
      s.setPlan({ cells: [{ steps: [] }] });
      return;
    }
    s.setPlan(simPlan);
    stepsRef.current = simPlan.cells.map((c) => c.steps.map((st) => ({ label: st.label, action: st.action })));
    tracker.current.reset(simPlan.cells.length);
    setBreakdown([]);
    // The line was rebuilt with planned robots: every cell's equipment and fencing must be applied again.
    eqKeys.current = [];
    fenceKey.current = "";
    if (playing) s.play();
    else s.pause();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planKey]);
  useEffect(() => {
    const s = simRef.current;
    cellCount.current = cells.length;
    if (!s || !plan) return;
    // Only touch what changed: re-applying a robot rebuilds its model and restarts the line.
    const fk = cells.map((c) => (c.fenced ? 1 : 0)).join("");
    if (fk !== fenceKey.current) {
      fenceKey.current = fk;
      s.setFencing(cells.map((c) => !!c.fenced));
    }
    let changed = false;
    cells.forEach((c, i) => {
      const eq = c.choice;
      const key = SLOTS.map((sl) => (eq[sl.key] ? `${eq[sl.key]!.source}:${eq[sl.key]!.id}` : "")).join("|");
      if (eqKeys.current[i] === key) return;
      eqKeys.current[i] = key;
      changed = true;
      const any = eq.robot || eq.tool || eq.tool2 || eq.changer || eq.sensor || eq.camera;
      const tools = [eq.tool, eq.tool2].filter(Boolean).map((m) => ({ name: `${m!.name} ${m!.type ?? ""}` }));
      s.setEquipment(
        i,
        any
          ? {
              robot: eq.robot ? { name: eq.robot.name, brand: eq.robot.brand, reachMm: eq.robot.reach, payloadKg: eq.robot.payload, collaborative: isCobot(eq.robot) } : undefined,
              eoat: tools[0],
              // Arm tool first, then the tool on the stand (the robot swaps them with the tool changer).
              tools: eq.tool ? tools : [{ name: "none", kind: "none" }, ...tools],
              accessories: [eq.changer && "changer", eq.sensor && "sensor", eq.camera && "camera"].filter(Boolean) as ("changer" | "sensor" | "camera")[],
            }
          : null,
      );
    });
    if (!changed) return;
    // Equipment changes restart the line, so the cycle measurement starts again too.
    tracker.current.reset(cells.length);
    setBreakdown([]);
  }, [cells, plan]);
  // Desktop: panels float over the stage, so frame the line in the free middle.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const on = () => setWide(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  useEffect(() => {
    simRef.current?.setInsets(wide && showLib ? 316 : 0, wide && showLine ? 326 : 0);
  }, [wide, showLib, showLine]);
  // The ring on the floor marks the drop target while dragging, otherwise the selected cell.
  useEffect(() => {
    simRef.current?.setHover(drag ? hover : cells.length ? Math.min(selected, cells.length - 1) : -1);
  }, [drag, hover, selected, cells.length, planKey]);
  useEffect(() => {
    if (cells.length) simRef.current?.setFocus(Math.min(selected, cells.length - 1));
  }, [selected, cells.length]);

  useEffect(() => {
    const now = new Map<string, Set<string>>();
    let alert: { cell: number; issues: FitIssue[] } | null = null;
    cells.forEach((c, i) => {
      const issues = attachmentIssues(c.job, c.choice);
      now.set(c.id, new Set(issues.map((f) => f.title)));
      const before = seenFit.current?.get(c.id);
      const fresh = issues.filter((f) => !before?.has(f.title));
      if (!alert && fresh.length && seenFit.current && !quietFit.current) alert = { cell: i, issues: fresh };
    });
    if (alert) {
      setFitAlert({ ...alert, undo: prevCells.current });
      setFitOpen(true);
    }
    seenFit.current = now;
    prevCells.current = cells;
    quietFit.current = false;
  }, [cells]);

  /* ------------------------------------------------------------ actions */

  const addCell = (patch: Partial<Cell> = {}) => {
    if (cells.length >= 6) return;
    // Nothing is assumed: the job and safety stay empty until the user chooses them.
    const cell: Cell = { id: newId(), job: "", choice: {}, stations: [], ...patch };
    setCells((cs) => [...cs, cell]);
    setSelected(cells.length);
  };
  // Payload each job needs, from the same planner the 3D line uses.
  const needsFor = (jobs: string[]) => {
    const input = jobs.map((j) => processesFromSkills([j])[0] ?? { name: j });
    return planLine(input, "balanced", { splitBefore: input.map((x) => x.name), robots: jobs.length }).robots.map((r) => r.minPayload);
  };
  // A ready-made line: robot, tools and cell equipment for each job (the user changes anything after).
  const applyStarter = (jobs: string[], specs?: StarterCell[]) => {
    const needs = needsFor(jobs);
    const next: Cell[] = jobs.map((job, i) => {
      const spec = specs?.[i];
      let choice: Choice = raw ? suggest(job, needs[i] ?? 10, raw) : {};
      // Robots that load their own parts carry a gripper on the tool stand and a tool changer, both for that robot.
      const swap = raw && spec?.swap ? suggestSwap(raw, choice.robot) : {};
      const swapping = !!spec?.swap && !!swap.tool2 && !!swap.changer;
      if (swapping) choice = { ...choice, tool2: swap.tool2, changer: swap.changer };
      const stations = spec && (swapping || !spec.swap) ? spec.stations : stationsFor(job, [toolKindOf(choice.tool), toolKindOf(choice.tool2)], !!choice.changer);
      return { id: newId(), job, choice, fenced: !isCobot(choice.robot), stations };
    });
    quietFit.current = true;
    setCells(next);
    setSelected(0);
  };
  const suggestFor = (i: number) => {
    if (!raw || !cells[i]) return;
    const need = plan?.robots[i]?.minPayload ?? 10;
    // An open (cobot) cell the user chose stays a cobot cell.
    const pick = suggest(cells[i].job, need, raw, cells[i].fenced === false);
    update(i, (c) => ({ ...c, choice: { ...c.choice, ...pick }, fenced: pick.robot ? !isCobot(pick.robot) : c.fenced }));
  };
  const applyTyped = (tasks: JobTask[], target: number | "new") => {
    const custom = tasks.length === 1 && jobText.trim() ? jobText.trim() : undefined;
    if (target === "new") {
      const room = Math.max(0, 6 - cells.length);
      const add = tasks.slice(0, room).map((t) => ({ id: newId(), job: t.name, custom: tasks.length === 1 ? custom : undefined, choice: {}, stations: [] as StationKey[] }));
      if (!add.length) return;
      setCells((cs) => [...cs, ...add]);
      setSelected(cells.length);
    } else update(target, (c) => ({ ...c, job: tasks[0].name, custom }));
    setJobText("");
    // Phones: the 3D view is above the library — bring it back so the new stations are seen.
    if (!wide) window.setTimeout(() => stageBoxRef.current?.scrollIntoView({ block: "start", behavior: "smooth" }), 50);
  };
  const typeJobFor = (i: number) => {
    setSelected(i);
    setTab("cell");
    setShowLib(true);
    window.setTimeout(() => {
      jobInputRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
      jobInputRef.current?.focus();
    }, 60);
  };
  const share = async () => {
    const url = `${window.location.origin}/automation-studio/build#line=${encodeLine(cells)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link", url);
    }
  };
  const update = (i: number, fn: (c: Cell) => Cell) => setCells((cs) => cs.map((c, k) => (k === i ? fn(c) : c)));
  const put = (i: number, m: Match) => {
    if (isPart(m)) return addPart(i, m);
    let slot: Slot = m.kind === "robot" ? "robot" : slotOf(m);
    if (!cells[i]) return addCell({ choice: { [slot]: m } });
    // With a tool changer, a second tool goes on the tool stand instead of replacing the first.
    const c = cells[i];
    if (slot === "tool" && c.choice.tool && c.choice.changer && !c.choice.tool2) slot = "tool2";
    update(i, (x) => ({ ...x, choice: { ...x.choice, [slot]: m } }));
  };
  // Cell equipment: only what the user places is in the cell.
  const addStation = (i: number | "new", k: StationKey) => {
    if (i === "new" || !cells[i]) return addCell({ stations: [k] });
    update(i, (c) => ({ ...c, stations: (c.stations ?? []).includes(k) ? c.stations : [...(c.stations ?? []), k] }));
  };
  const removeStation = (i: number, k: StationKey) => update(i, (c) => ({ ...c, stations: (c.stations ?? []).filter((x) => x !== k) }));
  // Components: beside the robot or between flange and tool, as many as the cell needs.
  const addPart = (i: number | "new", m: Match) => {
    if (i === "new" || !cells[i]) return addCell({ parts: [m] });
    update(i, (c) => ({ ...c, parts: (c.parts ?? []).some((x) => sameItem(x, m)) ? c.parts : [...(c.parts ?? []), m] }));
  };
  const removePart = (i: number, m: Match) => update(i, (c) => ({ ...c, parts: (c.parts ?? []).filter((x) => !sameItem(x, m)) }));
  // Everything the job kit suggests for a cell, in one click: accessories into empty slots, components to the list.
  const addKit = (i: number, kit: JobKit) =>
    update(i, (c) => ({
      ...c,
      choice: { ...Object.fromEntries(kit.accessories.map((a) => [a.slot, a.match])), ...c.choice },
      parts: [...(c.parts ?? []), ...kit.components.map((x) => x.match).filter((m) => !(c.parts ?? []).some((x) => sameItem(x, m)))],
    }));
  // Tap "Add" (touch screens): a robot goes to the selected cell if it has none, else a new cell.
  const add = (m: Match) => {
    if (m.kind === "robot" && (!cells.length || cells[selected]?.choice.robot)) return addCell({ choice: { robot: m } });
    put(selected, m);
  };
  const clear = (i: number, slot: Slot) =>
    update(i, (c) => {
      const choice = { ...c.choice };
      delete choice[slot];
      return { ...c, choice };
    });
  const removeCell = (i: number) => {
    setCells((cs) => cs.filter((_, k) => k !== i));
    setSelected((s) => Math.max(0, Math.min(s, cells.length - 2)));
  };

  /* --------------------------------------------------------- drag & drop */

  const byKey = useMemo(() => {
    const m = new Map<string, Match>();
    data?.robots.forEach((x) => m.set(`${x.source}:${x.id}`, x));
    data?.tools.forEach((x) => m.set(`${x.source}:${x.id}`, x));
    return m;
  }, [data]);
  // Open a job from the engineer's playbook (#job=…) with a suggested robot and tool.
  useEffect(() => {
    if (!raw) return;
    // One job, or a whole line as job|job|job; names outside the builder's list map to their family's job.
    const wanted = decodeURIComponent(window.location.hash.match(/job=([^&]+)/)?.[1] ?? "");
    const jobs = wanted
      .split("|")
      .filter(Boolean)
      .slice(0, 6)
      .map((j) => (BLOCKS.some((b) => b.name === j) ? j : KIND_JOB[processKind({ name: j })]));
    if (!jobs.length) return;
    applyStarter(jobs);
    window.history.replaceState(null, "", window.location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw]);
  // Open a shared line (#line=…) once the catalogue is loaded.
  useEffect(() => {
    if (!data) return;
    const code = window.location.hash.match(/line=([\w-]+)/)?.[1];
    if (!code) return;
    const shared = decodeLine(code);
    if (shared?.length) {
      quietFit.current = true;
      setCells(
        shared.map((c) => ({
          id: newId(),
          job: BLOCKS.some((b) => b.name === c.j) || processesFromSkills([c.j]).length ? c.j : "",
          custom: typeof c.u === "string" ? c.u.slice(0, 120) : undefined,
          fenced: typeof c.f === "boolean" ? c.f : undefined,
          choice: Object.fromEntries(Object.entries(c.s ?? {}).map(([k, key]) => [k, byKey.get(key)]).filter(([, m]) => m)) as Choice,
          stations: Array.isArray(c.t) ? (c.t.filter((k) => STATION_KEYS.has(k)) as StationKey[]) : undefined,
          parts: Array.isArray(c.p) ? c.p.map((k) => byKey.get(k)).filter((m): m is Match => !!m) : undefined,
        })).map(withStations),
      );
      setSelected(0);
    }
    history.replaceState(null, "", window.location.pathname + window.location.search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);
  const onDragStart = (e: React.DragEvent, payload: string, kind: DragKind, slot?: Slot) => {
    e.dataTransfer.setData("text/plain", payload);
    e.dataTransfer.effectAllowed = "copy";
    setDrag({ kind, slot });
  };
  const endDrag = () => {
    setDrag(null);
    setOverStage(false);
    setHover(-1);
  };
  // Where a drop on the 3D stage lands: the cell under the pointer, the empty slot after the line, or (off target) the selected cell.
  const stageTarget = (x: number, y: number) => (cells.length ? (simRef.current?.cellAt(x, y) ?? -1) : -1);
  const stageIndex = (x: number, y: number, kind?: DragKind): number | "new" => {
    const t = stageTarget(x, y);
    if (!cells.length || t >= cells.length || (t < 0 && (kind === "robot" || kind === "fence"))) return "new";
    return t < 0 ? selected : t;
  };
  const applyDrop = (p: string, cellIndex: number | "new") => {
    if (p.startsWith("job:")) {
      const job = p.slice(4);
      return cellIndex === "new" || !cells[cellIndex] ? addCell({ job }) : update(cellIndex, (c) => ({ ...c, job, custom: undefined }));
    }
    if (p.startsWith("station:")) {
      const k = p.slice(8);
      if (STATION_KEYS.has(k)) addStation(cellIndex, k as StationKey);
      return;
    }
    if (p === "fence:on" || p === "fence:off") {
      const fenced = p === "fence:on";
      if (cellIndex === "new") return setCells((cs) => cs.map((c) => ({ ...c, fenced })));
      return update(cellIndex, (c) => ({ ...c, fenced }));
    }
    const m = byKey.get(p);
    if (!m) return;
    if (isPart(m)) return addPart(cellIndex, m);
    if (cellIndex === "new") return addCell({ choice: { [m.kind === "robot" ? "robot" : slotOf(m)]: m } });
    put(cellIndex, m);
  };
  const dropOn = (e: React.DragEvent, cellIndex: number | "new") => {
    e.preventDefault();
    const p = e.dataTransfer.getData("text/plain");
    endDrag();
    applyDrop(p, cellIndex);
  };
  const dropOnStage = (e: React.DragEvent) => dropOn(e, stageIndex(e.clientX, e.clientY, drag?.kind));

  /* --------------------------------------------------- touch drag & drop */

  // Phones have no HTML drag and drop: press and hold an item, then drag it with the finger.
  const inStage = (el: Element | null) => !!el && !!stageBoxRef.current?.contains(el) && !el.closest("aside");
  const touchAt = (x: number, y: number) => {
    const el = document.elementFromPoint(x, y);
    const card = el?.closest<HTMLElement>("[data-cell]");
    if (card?.dataset.cell === "new") {
      setOverStage(false);
      setHover(cells.length);
    } else if (card) {
      setOverStage(false);
      setHover(Number(card.dataset.cell));
      setSelected(Number(card.dataset.cell));
    } else if (inStage(el)) {
      setOverStage(true);
      const t = stageTarget(x, y);
      setHover(t);
    } else {
      setOverStage(false);
      setHover(-1);
    }
  };
  const touchDrop = (x: number, y: number, t: TouchItem) => {
    const el = document.elementFromPoint(x, y);
    const card = el?.closest<HTMLElement>("[data-cell]");
    if (card) applyDrop(t.payload, card.dataset.cell === "new" ? "new" : Number(card.dataset.cell));
    else if (inStage(el)) applyDrop(t.payload, stageIndex(x, y, t.kind));
  };
  const touchFns = useRef({ touchAt, touchDrop });
  touchFns.current = { touchAt, touchDrop };
  useEffect(() => {
    const move = (e: TouchEvent) => {
      const r = touchRef.current;
      if (!r?.active) return;
      e.preventDefault();
      const t = e.touches[0];
      r.x = t.clientX;
      r.y = t.clientY;
      setGhost({ label: r.item.label, x: r.x, y: r.y });
      // Scroll the page when the finger nears the top or bottom edge.
      if (r.y < 70) window.scrollBy(0, -14);
      else if (r.y > window.innerHeight - 70) window.scrollBy(0, 14);
      touchFns.current.touchAt(r.x, r.y);
    };
    const end = (e: TouchEvent) => {
      const r = touchRef.current;
      if (!r?.active) return;
      if (e.type === "touchend") touchFns.current.touchDrop(r.x, r.y, r.item);
      touchRef.current = null;
      setGhost(null);
      setDrag(null);
      setOverStage(false);
      setHover(-1);
    };
    document.addEventListener("touchmove", move, { passive: false });
    document.addEventListener("touchend", end);
    document.addEventListener("touchcancel", end);
    return () => {
      document.removeEventListener("touchmove", move);
      document.removeEventListener("touchend", end);
      document.removeEventListener("touchcancel", end);
    };
  }, []);
  const touchDrag = (item: TouchItem) => ({
    onTouchStart: (e: React.TouchEvent) => {
      const t = e.touches[0];
      // A new touch starts a new gesture: a tap after an earlier drag counts again.
      tapGuard.current = false;
      if (touchRef.current) window.clearTimeout(touchRef.current.timer);
      const r: TouchState = {
        item, x: t.clientX, y: t.clientY, active: false,
        timer: window.setTimeout(() => {
          r.active = true;
          tapGuard.current = true;
          setDrag({ kind: item.kind, slot: item.slot });
          setGhost({ label: item.label, x: r.x, y: r.y });
          navigator.vibrate?.(12);
          // Bring the 3D view on screen so the item can be dropped on a robot.
          const box = stageBoxRef.current?.getBoundingClientRect();
          if (box && (box.top < 0 || box.top > window.innerHeight * 0.3)) window.scrollBy({ top: box.top - 8, behavior: "smooth" });
        }, 280),
      };
      touchRef.current = r;
    },
    onTouchMove: (e: React.TouchEvent) => {
      const r = touchRef.current;
      if (!r || r.active) return;
      const t = e.touches[0];
      // Moving before the hold completes is a scroll, not a drag.
      if (Math.hypot(t.clientX - r.x, t.clientY - r.y) > 8) {
        window.clearTimeout(r.timer);
        touchRef.current = null;
      }
    },
    onTouchEnd: () => {
      const r = touchRef.current;
      if (r && !r.active) {
        window.clearTimeout(r.timer);
        touchRef.current = null;
      }
    },
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });
  // A finished hold-and-drag must not also count as a tap on the item.
  const tapped = (fn: () => void) => () => {
    if (tapGuard.current) {
      tapGuard.current = false;
      return;
    }
    fn();
  };

  /* ------------------------------------------------------------ palette */

  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const matchQ = (m: Match) => words.every((w) => `${m.name} ${m.brand} ${m.model} ${m.type}`.toLowerCase().includes(w));
  const list = useMemo(() => {
    if (!data) return [];
    if (tab === "robots")
      return data.robots.filter(
        (m) =>
          (source === "all" || m.source === source) &&
          matchQ(m) &&
          (rtype === "All" || (rtype === "Cobot" ? isCobot(m) : (m.type ?? "").toLowerCase().includes(rtype.toLowerCase()))),
      );
    const tools = data.tools.filter((m) => (source === "all" || m.source === source) && matchQ(m));
    // Accessories on the arm and the components around it; the EOAT tab holds working tools only.
    return tab === "acc" ? tools.filter((m) => isPart(m) || slotOf(m) !== "tool") : tools.filter((m) => slotOf(m) === "tool" && !isPart(m));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, tab, q, source, rtype]);
  useEffect(() => setShown(40), [tab, q, source, rtype]);

  /* ------------------------------------------------------------ summary */

  const chosen = cells.flatMap((c) => [...(Object.values(c.choice).filter(Boolean) as Match[]), ...(c.parts ?? [])]);
  // Accessories, components, other equipment and software each job needs with the chosen robot and tools.
  const kits: JobKit[] = useMemo(
    () => cells.map((c) => jobKit({ job: c.job, ...c.choice, fenced: c.fenced, stations: c.stations }, data?.tools ?? [])),
    [cells, data],
  );
  const priced = chosen.filter((m) => m.source === "market" && m.price);
  const total = priced.reduce((s, m) => s + (m.price ?? 0), 0);
  // The line as the sales team reads it: every cell's equipment, safety, components and software.
  const quoteLines = cells.map((c, i) =>
    [
      `Cell ${i + 1} — ${cellLabel(c)}${c.fenced === undefined ? " (safety not chosen)" : c.fenced ? " (fenced)" : " (open / collaborative)"}`,
      ...SLOTS.filter((s) => c.choice[s.key]).map((s) => `${s.label}: ${c.choice[s.key]!.name} [${c.choice[s.key]!.source === "market" ? "RobotVerse marketplace" : "Directory / OEM"}]`),
      ...(c.stations?.length ? [`Cell equipment: ${c.stations.map(stationLabel).join(", ")}`] : []),
      ...(c.parts?.length ? [`Components: ${c.parts.map((m) => m.name).join(", ")}`] : []),
      ...(kits[i]?.software.length ? [`Software: ${kits[i].software.map((x) => `${x.maker} ${x.name}`).join(", ")}`] : []),
    ].join(" | "),
  );

  /* ------------------------------------------------------------- analysis */

  const checks: CheckItem[][] = cells.map((c, i) => [
    ...checkCell(c.job, c.choice, plan?.robots[i]?.minPayload, c.fenced, isCobot(c.choice.robot)),
    // What the robot program could not do with the equipment in the cell.
    ...(c.choice.robot
      ? programs[i].notes
          .filter((n) => n.level !== "info")
          .map((n): CheckItem => ({ state: n.level === "stop" ? "missing" : "warn", label: "Program", detail: n.text }))
      : []),
  ]);
  const states: CheckState[] = checks.map(cellState);
  const cycleOf = (i: number) => {
    const v = sim?.cells?.[i]?.lastCycle;
    return typeof v === "number" && v > 0 ? v : null;
  };
  const cycles = cells.map((_, i) => cycleOf(i));
  // A cell that has not finished one cycle while another has done three is stuck (reach, size or wrong job).
  const maxDone = Math.max(0, ...(sim?.cells ?? []).map((c) => c.cycles));
  const stalled = cells.map((_, i) => !cycles[i] && maxDone >= 3);
  stalled.forEach((st, i) => {
    if (st) checks[i].push({ state: "warn", label: "Cycle", detail: "Not completing a cycle — the robot may not reach its stations or is too small for the job" });
  });
  checks.forEach((c, i) => (states[i] = cellState(c)));
  const known = cycles.filter((v): v is number => v != null);
  const bottleneck = known.length === cells.length && known.length ? Math.max(...known) : null;
  const perHour = bottleneck ? Math.floor(3600 / bottleneck) : null;
  // The engineer's reasoning for each cell, with the measured share of each step kind.
  const thoughts: Thought[][] = cells.map((c, i) => {
    const b = breakdown[i];
    const total = b?.reduce((n, x) => n + x.seconds, 0) || 0;
    const split: Record<string, number> = {};
    if (b && total) b.forEach((x) => (split[STEP_GROUP(x.action).label] = (split[STEP_GROUP(x.action).label] ?? 0) + x.seconds / total));
    const program: Thought = {
      step: "Robot program",
      thought: [programs[i].summary, ...programs[i].notes.map((n) => n.text)].join(" "),
      state: programs[i].idle ? "todo" : programs[i].notes.some((n) => n.level !== "info") ? "warn" : "ok",
    };
    return [program, ...thinkCell({ job: c.job, choice: c.choice, needKg: plan?.robots[i]?.minPayload, fenced: c.fenced, cobot: isCobot(c.choice.robot), cycle: cycles[i], checks: checks[i], split, kit: kits[i], parts: c.parts })];
  });
  const onQuote = chosen.filter((m) => !(m.source === "market" && m.price)).length;
  const budget = useMemo(() => (plan ? budgetFor(plan, cells.map((c) => c.choice)) : null), [plan, cells]);
  const operators = roiIn.operators || cells.length;
  const payback = budget ? roi(budget.bom.total, operators, roiIn.shifts, roiIn.wage) : null;
  const printReport = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(
      reportHtml({
        cells: cells.map((c, i) => ({
          job: cellLabel(c), choice: c.choice, fenced: c.fenced, cycle: cycles[i], checks: checks[i], thoughts: thoughts[i],
          parts: (c.parts ?? []).map((m) => m.name), also: kits[i].also, software: kits[i].software,
        })),
        bottleneck, perHour, budget, roi: payback, inputs: { operators, shifts: roiIn.shifts, wage: roiIn.wage },
      }),
    );
    w.document.close();
  };

  // The three steps from the Automation Studio start page.
  const robotsDone = cells.length > 0 && cells.every((c) => c.choice.robot);
  const toolsDone = robotsDone && cells.every((c) => c.choice.tool);
  const jobsDone = toolsDone && cells.every((c) => c.job);
  const layoutDone = jobsDone && cells.every((c, i) => (c.stations?.length ?? 0) > 0 && !programs[i].idle);
  const safetyDone = layoutDone && cells.every((c) => c.fenced !== undefined);
  const runDone = safetyDone && bottleneck != null;
  const STEPS = [
    { n: 1, label: "Robot", done: robotsDone, hint: "Drag a robot onto the empty floor — one per station.", go: () => setTab("robots") },
    { n: 2, label: "Tool", done: toolsDone, hint: "Drop a gripper, torch or other tool on each robot. A tool changer and a 2nd tool let it swap tools.", go: () => setTab("tools") },
    { n: 3, label: "Job", done: jobsDone, hint: "Pick a job or type your own — what the robot should do.", go: () => setTab("cell") },
    { n: 4, label: "Layout", done: layoutDone, hint: "Place the cell equipment: conveyors, tables, machine, pallet, camera, tool stand.", go: () => setTab("layout") },
    { n: 5, label: "Safety", done: safetyDone, hint: "Choose a safety fence or an open cobot cell.", go: () => setTab("layout") },
    { n: 6, label: "Run", done: runDone, hint: "Watch the line run, then open the report for cycle time, checks and cost.", go: () => setReportOpen(true) },
  ];
  const current = STEPS.find((st) => !st.done)?.n ?? 5;

  const reportCsv = () => {
    const q = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = [
      ["Cell", "Job", "Robot", "Tool", "2nd tool", "Accessories", "Components", "Also needed", "Software", "Cell equipment", "Program", "Safety", "Cycle (s)", "Parts / hour", "Status", "Notes"],
      ...cells.map((c, i) => [
        i + 1, cellLabel(c), c.choice.robot?.name, c.choice.tool?.name, c.choice.tool2?.name,
        [c.choice.changer, c.choice.sensor, c.choice.camera].filter(Boolean).map((m) => m!.name).join(" + "),
        (c.parts ?? []).map((m) => m.name).join(" + "), kits[i].also.join("; "), kits[i].software.map((x) => `${x.maker} ${x.name}`).join("; "),
        (c.stations ?? []).map(stationLabel).join(" + "), programs[i].summary,
        c.fenced === undefined ? "Not chosen" : c.fenced ? "Fenced" : "Open (cobot)", cycles[i]?.toFixed(1), cycles[i] ? Math.floor(3600 / cycles[i]!) : "",
        states[i] === "ok" ? "Ready" : states[i] === "warn" ? "Check" : "Incomplete",
        checks[i].filter((x) => x.state !== "ok").map((x) => `${x.label}: ${x.detail}`).join("; "),
      ]),
      [],
      ["Line", "", "", "", "", "", "", "", "", "", "", "", bottleneck?.toFixed(1) ?? "", perHour ?? "", "", `Marketplace total ${total ? inr(total) : "-"}; ${onQuote} item(s) on quotation`],
    ];
    const url = URL.createObjectURL(new Blob([rows.map((r) => r.map(q).join(",")).join("\n")], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "robotverse-robot-cell-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const togglePlay = () => {
    const s = simRef.current;
    if (!s) return;
    if (playing) s.pause();
    else s.play();
    setPlaying(!playing);
  };

  const what = drag?.kind === "robot" ? "robot" : drag?.kind === "job" ? "job" : drag?.kind === "fence" ? "safety" : drag?.kind === "station" ? "equipment" : drag?.slot === "tool" ? "tool" : "accessory";
  const dropHint = !cells.length
    ? "Drop to create your first robot cell"
    : hover >= 0 && hover < cells.length
      ? `Drop on Cell ${hover + 1} · ${cellLabel(cells[hover])} — ${drag?.kind === "robot" && cells[hover].choice.robot ? "replace the robot" : drag?.kind === "station" ? "add it to this cell" : `set the ${what}`}`
      : hover === cells.length
        ? `Drop here to add Cell ${cells.length + 1}`
        : drag?.kind === "robot"
          ? "Drop to add a new robot cell — or point at a robot to replace it"
          : drag?.kind === "fence"
            ? "Drop to apply to every cell — or point at one robot"
            : `Point at a robot — or drop to use Cell ${selected + 1}`;

  /* -------------------------------------------------------------- render */

  return (
    <div className="flex flex-col gap-3 p-3">
      {ghost && (
        <div
          aria-hidden
          className="pointer-events-none fixed z-[100] max-w-[220px] -translate-x-1/2 -translate-y-[130%] truncate rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-xl"
          style={{ left: ghost.x, top: ghost.y }}
        >
          {ghost.label}
        </div>
      )}
    <ol aria-label="Steps" className="grid grid-cols-6 gap-1 sm:gap-2">
      {STEPS.map((st) => {
        const active = st.n === current;
        return (
          <li key={st.n}>
            <button
              type="button"
              onClick={st.go}
              className={cn(
                "flex w-full items-start gap-2 rounded-xl border p-2 text-left sm:gap-3 sm:p-3 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                active ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/50",
              )}
              aria-current={active ? "step" : undefined}
            >
              <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold", st.done ? "bg-emerald-500 text-white" : active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                {st.done ? <CheckCircle2 className="h-4 w-4" /> : st.n}
              </span>
              <span className="min-w-0">
                <b className="block text-xs sm:text-sm">{st.label}</b>
                <span className="hidden text-xs text-muted-foreground sm:block">
                  {st.done ? (st.n === 6 ? `Line runs · ${perHour} parts/hour — open the report` : "Done") : st.n === 6 && safetyDone ? (stalled.some(Boolean) ? "A cell is not completing its cycle — open the report to see why" : "Measuring cycle time… the first full cycle takes a moment") : st.hint}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
    <div className="relative flex flex-col gap-3 lg:block lg:h-[calc(100vh-200px)] lg:min-h-[600px]">
      {/* 3D stage */}
      <section ref={stageBoxRef} aria-label="3D robot cell" className="relative h-[58vh] min-h-[380px] overflow-hidden rounded-xl border border-border bg-slate-900 lg:absolute lg:inset-0 lg:h-auto">
        <div ref={stageRef} className="absolute inset-0" />
        <div
          onDragOver={(e) => {
            if (!drag) return;
            e.preventDefault();
            setOverStage(true);
            const t = stageTarget(e.clientX, e.clientY);
            if (t !== hover) setHover(t);
          }}
          onDragLeave={() => (setOverStage(false), setHover(-1))}
          onDrop={dropOnStage}
          className={cn("absolute inset-0 transition-colors", drag ? "pointer-events-auto" : "pointer-events-none", overStage && "bg-primary/10 ring-4 ring-inset ring-primary/70")}
        >
          {drag && (
            <div className="pointer-events-none absolute inset-x-0 top-14 mx-auto w-fit max-w-[90%] rounded-lg bg-background/95 px-4 py-2 text-center text-sm font-medium shadow-lg">
              {dropHint}
            </div>
          )}
          {/* Phones: the cell cards are further down the page, so offer them as drop targets right here. */}
          {drag && !wide && cells.length > 0 && (
            <div className="absolute inset-x-2 bottom-2 flex gap-1.5 overflow-x-auto rounded-lg bg-background/90 p-1.5 shadow-lg">
              {cells.map((c, i) => (
                <div
                  key={c.id}
                  data-cell={i}
                  onDragOver={(e) => (e.preventDefault(), setSelected(i))}
                  onDrop={(e) => dropOn(e, i)}
                  className={cn(
                    "min-w-[88px] shrink-0 rounded-md border-2 border-dashed px-2 py-1.5 text-center text-[11px]",
                    selected === i ? "border-primary bg-primary/15 text-foreground" : "border-border text-muted-foreground",
                  )}
                >
                  <b className="block">Cell {i + 1}</b>
                  <span className="block truncate">{cellLabel(c)}</span>
                </div>
              ))}
              {cells.length < 6 && (
                <div
                  data-cell="new"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => dropOn(e, "new")}
                  className={cn(
                    "flex min-w-[80px] shrink-0 items-center justify-center rounded-md border-2 border-dashed px-2 py-1.5 text-[11px] font-semibold",
                    hover === cells.length ? "border-emerald-500 bg-emerald-500/15 text-foreground" : "border-border text-muted-foreground",
                  )}
                >
                  + New cell
                </div>
              )}
            </div>
          )}
        </div>
        <div className="absolute inset-x-2 top-2 z-20 flex items-center gap-1.5 overflow-x-auto sm:inset-x-3 sm:top-3 lg:overflow-visible">
          <Button size="sm" variant={showLib ? "default" : "secondary"} className="hidden lg:inline-flex" onClick={() => setShowLib((v) => !v)} aria-pressed={showLib}>
            <PanelLeft className="mr-1 h-3.5 w-3.5" /> Library
          </Button>
          <Button size="sm" variant="secondary" onClick={togglePlay} disabled={!cells.length}>
            {playing ? <Pause className="mr-1 h-3.5 w-3.5" /> : <Play className="mr-1 h-3.5 w-3.5" />} {playing ? "Pause" : "Play"}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => (simRef.current?.reset(), simRef.current?.play(), setPlaying(true), tracker.current.reset(cells.length), setBreakdown([]))} disabled={!cells.length}>
            <RotateCcw className="mr-1 h-3.5 w-3.5" /> Restart
          </Button>
          <select
            value={speed}
            onChange={(e) => {
              const v = Number(e.target.value);
              setSpeed(v);
              simRef.current?.setSpeed(v);
            }}
            aria-label="Simulation speed"
            className="h-8 rounded-md border border-border bg-secondary px-2 text-xs text-secondary-foreground"
          >
            {[0.5, 1, 2, 4].map((v) => (
              <option key={v} value={v}>
                {v}×
              </option>
            ))}
          </select>
          {(["iso", "front", "top"] as const).map((v) => (
            <Button key={v} size="sm" variant="secondary" onClick={() => simRef.current?.setView(v)}>
              {v === "iso" ? "3D" : v[0].toUpperCase() + v.slice(1)}
            </Button>
          ))}
          <Button size="sm" variant={showLine ? "default" : "secondary"} className="ml-auto hidden lg:inline-flex" onClick={() => setShowLine((v) => !v)} aria-pressed={showLine}>
            Your line ({cells.length}) <PanelRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </div>
        {!cells.length && !drag && (
          <div className="absolute inset-0 flex items-center justify-center overflow-y-auto px-3 pb-3 pt-14">
            <div className="w-full max-w-md rounded-xl bg-background/95 p-3 shadow-lg sm:p-5">
              <p className="flex items-center gap-2 font-semibold">
                <Bot className="h-5 w-5 text-primary" /> Drag a robot here — or start from a ready cell
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {STARTERS.map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    disabled={!raw}
                    onClick={() => applyStarter(st.jobs, st.cells)}
                    className="rounded-lg border border-border p-2.5 text-left transition-colors duration-150 hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
                  >
                    <b className="block text-sm">{st.name}</b>
                    <span className="hidden text-[11px] text-muted-foreground sm:block">{st.what}</span>
                  </button>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">Ready cells come with a matching robot and tool from the marketplace or Directory — change anything after.</p>
            </div>
          </div>
        )}
      </section>

      {/* Palette */}
      <aside
        aria-label="Parts"
        className={cn(
          "flex max-h-[70vh] min-h-0 flex-col rounded-xl border border-border bg-card lg:absolute lg:bottom-3 lg:left-3 lg:top-14 lg:z-10 lg:max-h-none lg:w-[300px] lg:bg-card/95 lg:shadow-xl lg:backdrop-blur",
          !showLib && "lg:hidden",
        )}
      >
        <div className="grid grid-cols-5 gap-0.5 border-b border-border p-1 text-[11px]" role="tablist">
          {([["robots", "Robots", Bot], ["tools", "EOAT", Wrench], ["acc", "Accessories", Cog], ["layout", "Layout", Factory], ["cell", "Job", Workflow]] as const).map(([k, label, Icon]) => (
            <button
              key={k}
              role="tab"
              aria-selected={tab === k}
              onClick={() => (setTab(k), setQ(""))}
              className={cn("flex flex-col items-center gap-0.5 rounded-md px-1 py-1.5 font-medium", tab === k ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>
        {tab !== "cell" && tab !== "layout" && (
          <div className="space-y-2 border-b border-border p-2">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={tab === "robots" ? "Search brand, model…" : "Search tools…"}
                className="w-full rounded-md border border-border bg-background py-2 pl-8 pr-2 text-base sm:text-sm"
                aria-label="Search parts"
              />
            </label>
            <div className="flex flex-wrap gap-1 text-[11px]">
              {([["all", "All"], ["market", "Marketplace"], ["oem", "Directory"]] as const).map(([k, label]) => (
                <button key={k} onClick={() => setSource(k)} className={cn("rounded-full border px-2 py-0.5", source === k ? "border-primary bg-primary/10 text-primary" : "border-border")}>
                  {label}
                </button>
              ))}
            </div>
            {tab === "robots" && (
              <div className="flex flex-wrap gap-1 text-[11px]">
                {ROBOT_TYPES.map((t) => (
                  <button key={t} onClick={() => setRtype(t)} className={cn("rounded-full border px-2 py-0.5", rtype === t ? "border-primary bg-primary/10 text-primary" : "border-border")}>
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <p className="border-b border-border px-3 py-1.5 text-[11px] text-muted-foreground">
          <span className="hidden [@media(hover:hover)]:inline">Drag onto a robot in the 3D view, or a cell card — or click <b>Add</b>.</span>
          <span className="[@media(hover:hover)]:hidden">Hold an item, then drag it onto a robot in the 3D view — or tap <b>Add</b>.</span>
        </p>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {tab === "layout" ? (
            <div className="space-y-3 p-2">
              <div>
                <p className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Cell equipment</p>
                <p className="mb-1.5 px-1 text-[11px] text-muted-foreground">
                  Only what you place is in the cell — the robot program uses it. Cell {cells[selected] ? selected + 1 : "—"} is selected.
                </p>
                {CELL_STATIONS.map((st) => {
                  const placed = !!cells[selected]?.stations?.includes(st.key);
                  return (
                    <div
                      key={st.key}
                      draggable
                      onDragStart={(e) => onDragStart(e, `station:${st.key}`, "station")}
                      onDragEnd={endDrag}
                      {...touchDrag({ payload: `station:${st.key}`, kind: "station", label: st.label })}
                      className="mb-1 flex cursor-grab select-none items-center [-webkit-touch-callout:none] gap-2 rounded-md border border-border p-2 text-xs active:cursor-grabbing"
                    >
                      <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1">
                        <b className="block">{st.label}</b>
                        <span className="text-muted-foreground">{st.hint}</span>
                      </span>
                      <button
                        type="button"
                        onClick={tapped(() => (placed ? removeStation(selected, st.key) : addStation(cells[selected] ? selected : "new", st.key)))}
                        className={cn("rounded border px-1.5 py-1 text-[11px]", placed ? "border-emerald-500/60 text-emerald-600 hover:border-red-500 hover:text-red-600" : "border-border hover:border-primary")}
                        aria-label={placed ? `Remove ${st.label} from cell ${selected + 1}` : `Add ${st.label}`}
                      >
                        {placed ? "Added ✓" : "Add"}
                      </button>
                    </div>
                  );
                })}
              </div>
              <div>
                <p className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Safety</p>
                {([["fence:on", "Safety fence + interlocked door", "Industrial robots work behind a fence (ISO 10218-2)"], ["fence:off", "Open collaborative cell", "Cobots next to people, speed & force limited"]] as const).map(([k, label, hint]) => (
                  <div
                    key={k}
                    draggable
                    onDragStart={(e) => onDragStart(e, k, "fence")}
                    onDragEnd={endDrag}
                    {...touchDrag({ payload: k, kind: "fence", label })}
                    className="mb-1 flex cursor-grab select-none items-center [-webkit-touch-callout:none] gap-2 rounded-md border border-border p-2 text-xs active:cursor-grabbing"
                  >
                    <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <ShieldCheck className={cn("h-5 w-5 shrink-0", k === "fence:on" ? "text-amber-500" : "text-emerald-500")} />
                    <span className="min-w-0 flex-1">
                      <b className="block">{label}</b>
                      <span className="text-muted-foreground">{hint}</span>
                    </span>
                    <button
                      type="button"
                      onClick={tapped(() => cells[selected] && update(selected, (c) => ({ ...c, fenced: k === "fence:on" })))}
                      className="rounded border border-border px-1.5 py-1 text-[11px] hover:border-primary"
                    >
                      Apply
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : tab === "cell" ? (
            <div className="space-y-3 p-2">
              <div className="rounded-lg border border-primary/40 bg-primary/5 p-2">
                <label htmlFor="own-job" className="mb-1 block px-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
                  Your own job
                </label>
                <input
                  id="own-job"
                  ref={jobInputRef}
                  value={jobText}
                  onChange={(e) => setJobText(e.target.value)}
                  placeholder="Type any job, e.g. deburr aluminium castings"
                  enterKeyHint="done"
                  className="w-full rounded-md border border-border bg-background px-2 py-2 text-base sm:text-sm"
                />
                {jobText.trim().length < 3 ? (
                  <p className="mt-1.5 px-1 text-[11px] text-muted-foreground">
                    Not in the list? Describe it — we work out the robot, tool and stations.{" "}
                    {JOB_EXAMPLES.slice(0, 3).map((x) => (
                      <button key={x} type="button" onClick={() => setJobText(x)} className="mr-1 text-primary underline-offset-2 hover:underline">
                        “{x}”
                      </button>
                    ))}
                  </p>
                ) : !jobTasks.length ? null : (
                  <div className="mt-2 space-y-2">
                    {jobTasks[0].confidence === "low" ? (
                      <p className="px-1 text-[11px] text-amber-600">
                        We could not find a robot action in this yet, so it starts as a general pick-and-place cell. Add an action word such as weld, pick, pack,
                        stack, grind, paint, glue, screw, inspect, test, cut or load.
                      </p>
                    ) : (
                      <p className="px-1 text-[11px] text-muted-foreground">
                        We understood {jobTasks.length === 1 ? "one robot task" : `${jobTasks.length} robot tasks`}
                        {jobTasks.some((t) => t.confidence === "medium") ? " from your words — an engineer confirms it" : ""}:
                      </p>
                    )}
                    {jobTasks.map((t) => (
                      <div key={t.name} className="rounded-md border border-border bg-background p-2 text-[11px]">
                        <div className="flex items-start justify-between gap-2">
                          <b className="text-xs">{t.name}</b>
                          <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{t.family}</span>
                        </div>
                        <p className="mt-1 text-muted-foreground">{t.does}</p>
                        <ul className="mt-1 space-y-0.5">
                          <li><span className="text-muted-foreground">Tool:</span> {t.tool}</li>
                          <li><span className="text-muted-foreground">Robot:</span> {t.payloadKg} kg payload or more · often used: {t.robot}</li>
                          <li><span className="text-muted-foreground">In 3D:</span> {t.stations.join(", ") || "robot only"}</li>
                          <li><span className="text-muted-foreground">Typical cycle:</span> {t.cycle[0]}–{t.cycle[1]} s</li>
                        </ul>
                        <p className="mt-1 italic text-muted-foreground">{t.key}</p>
                        {t.confidence !== "high" && t.why && <p className="mt-1 text-amber-600">Why this task: {t.why}.</p>}
                        {jobTasks.length > 1 && (
                          <div className="mt-1.5 flex gap-1">
                            {cells[selected] && (
                              <button type="button" onClick={() => applyTyped([t], selected)} className="rounded border border-border px-2 py-1.5 hover:border-primary sm:px-1.5 sm:py-0.5">
                                Use for Cell {selected + 1}
                              </button>
                            )}
                            <button type="button" onClick={() => applyTyped([t], "new")} disabled={cells.length >= 6} className="rounded border border-border px-2 py-1.5 hover:border-primary disabled:opacity-50 sm:px-1.5 sm:py-0.5">
                              + New cell
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    <div className="flex flex-wrap gap-1.5">
                      {jobTasks.length === 1 && cells[selected] && (
                        <Button size="sm" className="h-9 text-xs sm:h-7" onClick={() => applyTyped(jobTasks, selected)}>
                          Use for Cell {selected + 1}
                        </Button>
                      )}
                      <Button size="sm" variant={jobTasks.length === 1 && cells[selected] ? "outline" : "default"} className="h-9 text-xs sm:h-7" disabled={cells.length >= 6} onClick={() => applyTyped(jobTasks, "new")}>
                        {jobTasks.length === 1 ? "+ New cell" : `Add all ${Math.min(jobTasks.length, 6 - cells.length)} as cells`}
                      </Button>
                    </div>
                    {jobPlan && (
                      <details className="rounded-md border border-border bg-background p-2 text-[11px]" open={jobPlan.pocFirst}>
                        <summary className="cursor-pointer font-medium text-primary">What a solution provider checks first</summary>
                        <ul className="mt-1.5 space-y-1">
                          {jobPlan.feasibility.map((x) => (
                            <li key={x.factor} className="flex gap-1.5">
                              <span className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", x.status === "ok" ? "bg-emerald-500" : x.status === "check" ? "bg-amber-500" : "bg-red-500")} aria-label={x.status} />
                              <span>
                                <b>{x.factor}:</b> <span className="text-muted-foreground">{x.note}</span>
                              </span>
                            </li>
                          ))}
                        </ul>
                        <p className={cn("mt-1.5", jobPlan.pocFirst ? "text-amber-600" : "text-muted-foreground")}>{jobPlan.pocWhy}</p>
                        <p className="mt-1.5 font-medium">To quote it, an integrator needs:</p>
                        <ul className="ml-4 list-disc text-muted-foreground">
                          {jobPlan.requirements.slice(0, 6).map((r) => (
                            <li key={r}>{r}</li>
                          ))}
                        </ul>
                        <Button size="sm" variant="outline" className="mt-2 h-8 text-xs" onClick={() => setEngineerOpen(true)}>
                          Have an engineer check this job
                        </Button>
                      </details>
                    )}
                  </div>
                )}
              </div>
              <div>
                <p className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Ready cells</p>
                <div className="grid grid-cols-2 gap-1">
                  {STARTERS.map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      disabled={!raw}
                      onClick={() => applyStarter(st.jobs, st.cells)}
                      title={st.what}
                      className="rounded-md border border-border px-2 py-1.5 text-left text-[11px] font-medium hover:border-primary disabled:opacity-50"
                    >
                      {st.name}
                    </button>
                  ))}
                </div>
                <p className="mt-1 px-1 text-[10px] text-muted-foreground">Replaces the current line.</p>
              </div>
              <label className="relative block">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={`Find a ready job (${BLOCKS.length})…`}
                  className="w-full rounded-md border border-border bg-background py-2 pl-8 pr-2 text-base sm:text-sm"
                  aria-label="Find a ready job"
                />
              </label>
              {jobBlocks.length === 0 && <p className="px-1 text-[11px] text-muted-foreground">No ready job matches — describe it under “Your own job” above.</p>}
              {[...new Set(jobBlocks.map((b) => b.group))].map((g) => (
                <div key={g}>
                  <p className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{g}</p>
                  <div className="flex flex-wrap gap-1">
                    {jobBlocks.filter((b) => b.group === g).map((b) => (
                      <button
                        key={b.name}
                        type="button"
                        draggable
                        onDragStart={(e) => onDragStart(e, `job:${b.name}`, "job")}
                        onDragEnd={endDrag}
                        {...touchDrag({ payload: `job:${b.name}`, kind: "job", label: b.label })}
                        onClick={tapped(() => (cells[selected] ? update(selected, (c) => ({ ...c, job: b.name, custom: undefined })) : addCell({ job: b.name })))}
                        className="cursor-grab select-none rounded-full [-webkit-touch-callout:none] border border-border bg-background px-2 py-1 text-[11px] hover:border-primary hover:text-primary"
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : !data ? (
            <p className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading marketplace and directory…
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {list.length === 0 && <li className="p-4 text-sm text-muted-foreground">Nothing matches.</li>}
              {list.slice(0, shown).map((m) => (
                <li
                  key={`${m.source}:${m.id}`}
                  draggable
                  onDragStart={(e) => onDragStart(e, `${m.source}:${m.id}`, m.kind, slotFor(m))}
                  onDragEnd={endDrag}
                  {...touchDrag({ payload: `${m.source}:${m.id}`, kind: m.kind, slot: slotFor(m), label: m.name })}
                  className="flex cursor-grab select-none items-center gap-2 p-2 active:cursor-grabbing [-webkit-touch-callout:none]"
                >
                  <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <Thumb m={m} size="h-11 w-11" />
                  <span className="min-w-0 flex-1 text-xs">
                    <b className="block truncate text-[13px]">{m.name}</b>
                    <span className="block truncate text-muted-foreground">
                      {[m.type, m.payload != null ? `${m.payload} kg` : "", m.reach ? `${m.reach} mm` : ""].filter(Boolean).join(" · ")}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                      {m.source === "market" ? <Store className="h-3 w-3 text-emerald-500" /> : <Factory className="h-3 w-3 text-sky-500" />}
                      {m.source === "market" ? (m.price ? inr(m.price) : "Marketplace") : "Directory · OEM"}
                    </span>
                  </span>
                  <button type="button" onClick={tapped(() => add(m))} className="inline-flex items-center gap-0.5 rounded border border-border px-1.5 py-1 text-[11px] hover:border-primary">
                    <Plus className="h-3 w-3" /> Add
                  </button>
                </li>
              ))}
              {list.length > shown && (
                <li className="p-2 text-center">
                  <Button variant="ghost" size="sm" onClick={() => setShown((n) => n + 60)}>
                    Show more ({(list.length - shown).toLocaleString()})
                  </Button>
                </li>
              )}
            </ul>
          )}
        </div>
      </aside>

      {/* Cells */}
      <aside
        aria-label="Your robot cells"
        className={cn(
          "flex max-h-[80vh] min-h-0 flex-col rounded-xl border border-border bg-card lg:absolute lg:bottom-3 lg:right-3 lg:top-14 lg:z-10 lg:max-h-none lg:w-[310px] lg:bg-card/95 lg:shadow-xl lg:backdrop-blur",
          !showLine && "lg:hidden",
        )}
      >
        <div className="flex items-center justify-between border-b border-border p-3">
          <p className="text-sm font-semibold">Your line · {cells.length} robot{cells.length === 1 ? "" : "s"}</p>
          <Button size="sm" variant="outline" onClick={() => addCell()} disabled={cells.length >= 6}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Cell
          </Button>
        </div>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
          {cells.map((c, i) => {
            const cellSim = sim?.cells?.[i];
            return (
              <div
                key={c.id}
                data-cell={i}
                onClick={() => setSelected(i)}
                onDragOver={(e) => {
                  if (!drag) return;
                  e.preventDefault();
                  setSelected(i);
                }}
                onDrop={(e) => dropOn(e, i)}
                className={cn("rounded-lg border bg-background p-2.5 transition-colors", selected === i ? "border-primary ring-1 ring-primary" : "border-border", drag && "border-dashed")}
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">{i + 1}</span>
                  <select
                    value={c.job}
                    onChange={(e) => (e.target.value === "__type" ? typeJobFor(i) : update(i, (x) => ({ ...x, job: e.target.value, custom: undefined })))}
                    className="min-w-0 flex-1 rounded border border-border bg-background px-1.5 py-1 text-xs"
                    aria-label={`Job of cell ${i + 1}`}
                  >
                    <option value="" disabled>
                      Choose a job…
                    </option>
                    <option value="__type">✎ Type my own job…</option>
                    {c.job && (c.custom || !BLOCKS.some((b) => b.name === c.job)) && <option value={c.job}>{cellLabel(c)}</option>}
                    {[...new Set(BLOCKS.map((b) => b.group))].map((g) => (
                      <optgroup key={g} label={g}>
                        {BLOCKS.filter((b) => b.group === g).map((b) => (
                          <option key={b.name} value={b.name}>
                            {b.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <button
                    type="button"
                    aria-label={`Suggest robot and tool for cell ${i + 1}`}
                    title="Suggest the best robot and tool for this job"
                    disabled={!raw}
                    onClick={(e) => (e.stopPropagation(), suggestFor(i))}
                    className="rounded p-1 text-primary hover:bg-primary/10 disabled:opacity-40"
                  >
                    <Wand2 className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" aria-label={`Remove cell ${i + 1}`} onClick={(e) => (e.stopPropagation(), removeCell(i))} className="rounded p-1 text-muted-foreground hover:text-red-600">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <ul className="mt-2 space-y-1">
                  {SLOTS.map((s) => {
                    const m = c.choice[s.key];
                    // The 2nd tool belongs on the tool stand: shown once the robot has a tool changer.
                    if (s.key === "tool2" && !m && !c.choice.changer) return null;
                    const dragSlot = drag?.slot === "tool" && c.choice.tool && c.choice.changer && !c.choice.tool2 ? "tool2" : drag?.slot;
                    const target = drag && drag.kind !== "job" && drag.kind !== "fence" && drag.kind !== "station" && dragSlot === s.key;
                    return (
                      <li key={s.key} className={cn("flex items-center gap-2 rounded-md border px-1.5 py-1 text-xs", m ? "border-border" : "border-dashed border-border", target && "border-primary bg-primary/5")}>
                        <s.icon className="h-4 w-4 shrink-0 text-primary" />
                        {m ? (
                          <>
                            <Thumb m={m} size="h-7 w-7" />
                            <span className="min-w-0 flex-1 truncate" title={m.name}>{m.name}</span>
                            <button type="button" aria-label={`Remove ${s.label}`} onClick={(e) => (e.stopPropagation(), clear(i, s.key))} className="rounded p-0.5 hover:text-red-600">
                              <X className="h-3 w-3" />
                            </button>
                          </>
                        ) : (
                          <span className="text-muted-foreground">{target ? "Drop here" : s.label}</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={(e) => (e.stopPropagation(), update(i, (x) => ({ ...x, fenced: x.fenced === undefined ? !isCobot(x.choice.robot) : !x.fenced })))}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5",
                      c.fenced === undefined ? "border-dashed border-border text-muted-foreground" : c.fenced ? "border-amber-500/60 text-amber-600" : "border-emerald-500/60 text-emerald-600",
                    )}
                  >
                    <ShieldCheck className="h-3 w-3" /> {c.fenced === undefined ? "Choose safety" : c.fenced ? "Fenced cell" : "Open (cobot)"}
                  </button>
                  <StateBadge state={states[i]} />
                  {cycles[i] && <span className="ml-auto tabular-nums text-muted-foreground">{cycles[i]!.toFixed(1)} s · {cellSim?.cycles ?? 0} parts</span>}
                </div>
                {(() => {
                  // Cell equipment the user placed, and what this job usually needs (one click to add).
                  const placed = c.stations ?? [];
                  const kinds = [toolKindOf(c.choice.tool), toolKindOf(c.choice.tool2)];
                  const uses = programs[i]?.uses ?? [];
                  // Parts already have somewhere to go, or arrive from the previous robot: no need to suggest more.
                  const DEST = ["out", "pallet", "carton"];
                  const hasDest = placed.some((k) => DEST.includes(k));
                  const fed = programs[i]?.steps.some((st) => st.station === "in");
                  const wanted = (c.job || kinds[0] ? stationsFor(c.job, kinds, !!c.choice.changer) : []).filter(
                    (k) => !placed.includes(k) && !(hasDest && DEST.includes(k)) && !(fed && k === "conveyor"),
                  );
                  return (
                    <div className="mt-2 flex flex-wrap items-center gap-1 text-[11px]">
                      {placed.map((k) => (
                        <span
                          key={k}
                          title={uses.includes(k) ? "Used by the robot program" : "Not used by the robot program"}
                          className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5", uses.includes(k) ? "border-primary/50" : "border-dashed border-border text-muted-foreground")}
                        >
                          {stationLabel(k)}
                          <button type="button" aria-label={`Remove ${stationLabel(k)}`} onClick={(e) => (e.stopPropagation(), removeStation(i, k))} className="rounded hover:text-red-600">
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                      {wanted.map((k) => (
                        <button
                          key={k}
                          type="button"
                          title="Suggested for this job — click to add it"
                          onClick={(e) => (e.stopPropagation(), addStation(i, k))}
                          className="rounded-full border border-dashed border-primary/60 px-2 py-0.5 text-primary hover:bg-primary/10"
                        >
                          + {stationLabel(k)}
                        </button>
                      ))}
                      {!placed.length && !wanted.length && <span className="text-muted-foreground">No cell equipment yet — add it from Layout</span>}
                    </div>
                  );
                })()}
                {(() => {
                  // Accessories and components the user added, what this job and robot still need (one click
                  // each, or all at once), other equipment, and the software to program and run the cell.
                  const kit = kits[i];
                  const parts = c.parts ?? [];
                  const acc = kit.accessories.filter((a) => !c.choice[a.slot]);
                  const comp = kit.components.filter((x) => !parts.some((m) => sameItem(m, x.match)));
                  if (!parts.length && !acc.length && !comp.length && !kit.software.length) return null;
                  return (
                    <div className="mt-2 space-y-1 text-[11px]">
                      {(parts.length > 0 || acc.length > 0 || comp.length > 0) && (
                        <div className="flex flex-wrap items-center gap-1">
                          <Boxes className="h-3 w-3 shrink-0 text-primary" aria-hidden />
                          {parts.map((m) => (
                            <span key={`${m.source}:${m.id}`} title={m.type} className="inline-flex items-center gap-1 rounded-full border border-primary/50 px-2 py-0.5">
                              {m.name}
                              <button type="button" aria-label={`Remove ${m.name}`} onClick={(e) => (e.stopPropagation(), removePart(i, m))} className="rounded hover:text-red-600">
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                          {acc.map((a) => (
                            <button
                              key={`a-${a.slot}`}
                              type="button"
                              title={`${a.why} — click to add`}
                              onClick={(e) => (e.stopPropagation(), update(i, (x) => ({ ...x, choice: { ...x.choice, [a.slot]: a.match } })))}
                              className="rounded-full border border-dashed border-primary/60 px-2 py-0.5 text-primary hover:bg-primary/10"
                            >
                              + {a.match.name}
                            </button>
                          ))}
                          {comp.map((x) => (
                            <button
                              key={`c-${x.match.id}`}
                              type="button"
                              title={`${x.why} — click to add`}
                              onClick={(e) => (e.stopPropagation(), addPart(i, x.match))}
                              className="rounded-full border border-dashed border-primary/60 px-2 py-0.5 text-primary hover:bg-primary/10"
                            >
                              + {x.match.name}
                            </button>
                          ))}
                          {acc.length + comp.length > 1 && (
                            <button
                              type="button"
                              title="Add every suggested accessory and component for this job"
                              onClick={(e) => (e.stopPropagation(), addKit(i, { ...kit, accessories: acc, components: comp }))}
                              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary hover:bg-primary/20"
                            >
                              <PackagePlus className="h-3 w-3" /> Add all
                            </button>
                          )}
                        </div>
                      )}
                      {selected === i && kit.also.length > 0 && (
                        <p className="text-muted-foreground">
                          <b className="font-medium text-foreground">Also needed:</b> {kit.also.join(" · ")}
                        </p>
                      )}
                      {kit.software.length > 0 && (
                        <p className="flex flex-wrap items-center gap-1">
                          <AppWindow className="h-3 w-3 shrink-0 text-primary" aria-label="Software" />
                          {kit.software.map((x) => (
                            <span key={x.name} title={`${x.maker}: ${x.does}`} className="rounded bg-muted px-1.5 py-0.5">
                              {x.name}
                            </span>
                          ))}
                        </p>
                      )}
                    </div>
                  );
                })()}
                {c.choice.robot && programs[i] && (
                  <p className="mt-1.5 flex gap-1 text-[11px]">
                    <Workflow className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                    <span>
                      {programs[i].summary}
                      {(c.choice.tool || c.choice.tool2) && (
                        <span className="text-muted-foreground">
                          {" "}
                          Tools: {[c.choice.tool, c.choice.tool2].filter(Boolean).map((m) => TOOL_NAMES[toolKindOf(m) ?? ""] ?? "tool").join(" + ")}
                          {c.choice.tool2 && !c.choice.changer ? " (no tool changer)" : ""}.
                        </span>
                      )}
                    </span>
                  </p>
                )}
                {checks[i].find((x) => x.state !== "ok") && (
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    {(() => {
                      const x = checks[i].find((y) => y.state !== "ok")!;
                      return `${x.label}: ${x.detail}`;
                    })()}
                  </p>
                )}
                {selected === i && (
                  <details className="mt-2 rounded-md bg-muted/40 px-2 py-1.5 text-[11px]" onClick={(e) => e.stopPropagation()}>
                    <summary className="flex cursor-pointer items-center gap-1 font-medium text-primary">
                      <Brain className="h-3.5 w-3.5" /> How an engineer thinks about this cell
                    </summary>
                    <ThoughtList items={thoughts[i]} />
                  </details>
                )}
              </div>
            );
          })}
          {!cells.length && <p className="p-3 text-sm text-muted-foreground">No robots yet. Drag one from the left, or press “+ Cell”.</p>}
        </div>
        <div className="space-y-2 border-t border-border p-3 text-xs lg:pr-20">
          <p className="text-muted-foreground">
            {chosen.length} item{chosen.length === 1 ? "" : "s"} chosen
            {priced.length > 0 && (
              <>
                {" "}· marketplace total <b className="text-foreground">{inr(total)}</b>
              </>
            )}
          </p>
          <div className="flex gap-2">
            <Button size="sm" className="flex-1" disabled={!chosen.length} onClick={() => setQuoteOpen(true)}>
              <Mail className="mr-1.5 h-3.5 w-3.5" /> Request quote
            </Button>
            {cells.length > 0 && (
              <Button size="sm" variant="outline" onClick={() => setReportOpen(true)}>
                <ClipboardList className="mr-1 h-3.5 w-3.5" /> Report
              </Button>
            )}
            {cells.length > 0 && (
              <Button size="sm" variant="outline" onClick={() => (setCells([]), setSelected(0))}>
                Clear
              </Button>
            )}
          </div>
        </div>
      </aside>
    </div>

      <Dialog open={fitOpen} onOpenChange={setFitOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className={cn("h-5 w-5", fitAlert?.issues.some((f) => f.level === "stop") ? "text-red-500" : "text-amber-500")} />
              {fitAlert?.issues.some((f) => f.level === "stop") ? "This is not suitable" : "Check this choice"}
            </DialogTitle>
            <DialogDescription>Cell {fitAlert ? fitAlert.cell + 1 : ""} · {fitAlert ? cellLabel(fitAlert.undo[fitAlert.cell] ?? cells[fitAlert.cell]) : ""}</DialogDescription>
          </DialogHeader>
          <ul className="space-y-3">
            {fitAlert?.issues.map((f) => (
              <li key={f.title} className={cn("rounded-lg border p-3 text-sm", f.level === "stop" ? "border-red-500/40 bg-red-500/5" : "border-amber-500/40 bg-amber-500/5")}>
                <b className="block">{f.title}</b>
                <span className="text-muted-foreground">{f.detail}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => setFitOpen(false)}>
              Keep anyway
            </Button>
            <Button
              onClick={() => {
                if (fitAlert) {
                  quietFit.current = true;
                  setCells(fitAlert.undo);
                }
                setFitOpen(false);
              }}
            >
              <RotateCcw className="mr-1.5 h-4 w-4" /> Undo
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Line report</DialogTitle>
            <DialogDescription>Your robot cells, checked for the job, with simulated cycle time and the parts to quote.</DialogDescription>
          </DialogHeader>
          {!cells.length ? (
            <p className="text-sm text-muted-foreground">Add a robot first.</p>
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  [String(cells.length), `robot${cells.length === 1 ? "" : "s"} in the line`],
                  [bottleneck ? `${bottleneck.toFixed(1)} s` : "—", "line cycle (slowest cell)"],
                  [perHour ? perHour.toLocaleString("en-IN") : "—", "parts per hour"],
                  [perHour ? (perHour * 8).toLocaleString("en-IN") : "—", "parts per 8-hour shift"],
                ].map(([v, l]) => (
                  <div key={l} className="rounded-xl border border-border p-3">
                    <p className="text-2xl font-bold tabular-nums tracking-tight">{v}</p>
                    <p className="text-xs text-muted-foreground">{l}</p>
                  </div>
                ))}
              </div>
              <ol className="space-y-3">
                {cells.map((c, i) => (
                  <li key={c.id} className="rounded-xl border border-border p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">{i + 1}</span>
                      <b className="text-sm">{cellLabel(c)}</b>
                      <StateBadge state={states[i]} />
                      <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                        {cycles[i] ? `${cycles[i]!.toFixed(1)} s cycle · ${Math.floor(3600 / cycles[i]!)} parts/h` : stalled[i] ? "stalled" : "running…"}
                        {bottleneck && cycles[i] === bottleneck && cells.length > 1 && <b className="ml-1 text-amber-600">bottleneck</b>}
                      </span>
                    </div>
                    <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                      {checks[i].map((x) => (
                        <li key={x.label} className="flex gap-1.5 text-xs">
                          {x.state === "ok" ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" /> : x.state === "warn" ? <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" /> : <CircleDashed className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                          <span><b>{x.label}:</b> <span className="text-muted-foreground">{x.detail}</span></span>
                        </li>
                      ))}
                    </ul>
                    <details className="mt-2 text-xs">
                      <summary className="flex cursor-pointer items-center gap-1 font-medium text-primary">
                        <Brain className="h-3.5 w-3.5" /> Engineer's reasoning, step by step
                      </summary>
                      <ThoughtList items={thoughts[i]} />
                    </details>
                  </li>
                ))}
              </ol>
              <section className="rounded-xl border border-border p-3">
                <p className="text-sm font-semibold">Where the cycle time goes</p>
                <p className="text-xs text-muted-foreground">Measured from the last full cycle of each robot in the 3D simulation.</p>
                <div className="mt-3 space-y-3">
                  {cells.map((c, i) => {
                    const b = breakdown[i];
                    if (!b) return <p key={c.id} className="text-xs text-muted-foreground">Cell {i + 1}: measuring…</p>;
                    const total = b.reduce((n, x) => n + x.seconds, 0) || 1;
                    const groups = new Map<string, { label: string; color: string; seconds: number }>();
                    b.forEach((x) => {
                      const g = STEP_GROUP(x.action);
                      const cur = groups.get(g.key) ?? { label: g.label, color: g.color, seconds: 0 };
                      cur.seconds += x.seconds;
                      groups.set(g.key, cur);
                    });
                    const longest = [...b].sort((x, y) => y.seconds - x.seconds)[0];
                    return (
                      <div key={c.id}>
                        <div className="flex items-baseline justify-between text-xs">
                          <b>Cell {i + 1} · {cellLabel(c)}</b>
                          <span className="tabular-nums text-muted-foreground">{total.toFixed(1)} s</span>
                        </div>
                        <div className="mt-1 flex h-3 overflow-hidden rounded-full bg-muted" role="img" aria-label={[...groups.values()].map((g) => `${g.label} ${g.seconds.toFixed(1)} s`).join(", ")}>
                          {[...groups.values()].map((g) => (
                            <span key={g.label} style={{ width: `${(g.seconds / total) * 100}%`, background: g.color }} />
                          ))}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                          {[...groups.values()].map((g) => (
                            <span key={g.label} className="inline-flex items-center gap-1">
                              <span className="h-2 w-2 rounded-full" style={{ background: g.color }} /> {g.label} {Math.round((g.seconds / total) * 100)}%
                            </span>
                          ))}
                          {longest && <span>Longest step: <b className="text-foreground">{longest.label}</b> ({longest.seconds.toFixed(1)} s)</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {budget && payback && (
                <section className="rounded-xl border border-border p-3">
                  <p className="text-sm font-semibold">Budget & payback</p>
                  <div className="mt-2 grid gap-3 sm:grid-cols-3">
                    {([
                      ["operators", "Operators replaced per shift", 1, 1],
                      ["shifts", "Shifts per day", 1, 1],
                      ["wage", "Cost per operator / month (₹)", 1000, 1000],
                    ] as const).map(([k, label, min, step]) => (
                      <label key={k} className="text-xs">
                        <span className="text-muted-foreground">{label}</span>
                        <input
                          type="number"
                          min={min}
                          step={step}
                          value={k === "operators" ? operators : roiIn[k]}
                          onChange={(e) => setRoiIn((r) => ({ ...r, [k]: Math.max(min, Number(e.target.value) || min) }))}
                          className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm tabular-nums"
                        />
                      </label>
                    ))}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                      [`${inrShort(budget.bom.total[0])} – ${inrShort(budget.bom.total[1])}`, "turnkey budget"],
                      [inrShort(payback.annualSaving), "labour saved per year"],
                      [Number.isFinite(payback.months[0]) ? `${payback.months[0].toFixed(0)}–${payback.months[1].toFixed(0)} mo` : "—", "payback"],
                      [
                        payback.fiveYear[1] <= 0
                          ? "Not within 5 years"
                          : payback.fiveYear[0] <= 0
                            ? `up to ${inrShort(payback.fiveYear[1])}`
                            : `${inrShort(payback.fiveYear[0])} – ${inrShort(payback.fiveYear[1])}`,
                        "5-year net saving",
                      ],
                    ].map(([v, l]) => (
                      <div key={l} className="rounded-lg bg-muted/50 p-2.5">
                        <p className="text-sm font-bold tabular-nums">{v}</p>
                        <p className="text-[11px] text-muted-foreground">{l}</p>
                      </div>
                    ))}
                  </div>
                  <details className="mt-2 text-xs">
                    <summary className="cursor-pointer text-primary">What the budget includes ({budget.bom.lines.length} items)</summary>
                    <ul className="mt-2 divide-y divide-border">
                      {budget.bom.lines.map((l, k) => (
                        <li key={k} className="flex justify-between gap-3 py-1">
                          <span className="min-w-0">{l.item} <span className="text-muted-foreground">· {l.scope}{l.qty > 1 ? ` × ${l.qty}` : ""}</span></span>
                          <span className="shrink-0 tabular-nums text-muted-foreground">{inrShort(l.total[0])} – {inrShort(l.total[1])}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Indicative Indian market ranges, sized for the robots you chose: arm, controller, tooling, safety, conveyors, PLC/HMI, integration and training.
                    {budget.listed > 0 && ` Marketplace items you picked are listed at ${inrShort(budget.listed)}.`}
                  </p>
                </section>
              )}

              {unreachable.length > 0 && (
                <p className="flex gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                  Out of reach: {[...new Set(unreachable.map((u) => STATION_NAMES[u] ?? u))].join(", ")}. Choose a robot with more reach, or move these stations closer.
                </p>
              )}
              <div className="rounded-xl border border-border p-3 text-sm">
                <p className="font-semibold">Bill of equipment</p>
                <ul className="mt-2 divide-y divide-border">
                  {chosen.map((m, k) => (
                    <li key={`${m.source}:${m.id}:${k}`} className="flex items-center gap-2 py-1.5 text-xs">
                      <Thumb m={m} size="h-8 w-8" />
                      <span className="min-w-0 flex-1 truncate">{m.name}</span>
                      <span className="text-muted-foreground">{m.source === "market" ? (m.price ? inr(m.price) : "Marketplace") : "Quote from OEM"}</span>
                    </li>
                  ))}
                  {!chosen.length && <li className="py-1.5 text-xs text-muted-foreground">Nothing chosen yet.</li>}
                </ul>
                <p className="mt-2 text-xs text-muted-foreground">
                  Marketplace total <b className="text-foreground">{total ? inr(total) : "—"}</b> · {onQuote} item{onQuote === 1 ? "" : "s"} on quotation. Integration, fencing and programming are quoted separately.
                </p>
              </div>
              <p className="text-xs text-muted-foreground">Cycle times come from the 3D simulation and are indicative; real times depend on part, tooling and programming.</p>
              <div className="flex flex-wrap gap-2">
                <Button disabled={!chosen.length} onClick={() => (setReportOpen(false), setQuoteOpen(true))}>
                  <Mail className="mr-1.5 h-4 w-4" /> Request quote
                </Button>
                <Button variant="outline" onClick={printReport}>
                  <Printer className="mr-1.5 h-4 w-4" /> Print / save PDF
                </Button>
                <Button variant="outline" onClick={reportCsv}>
                  <Download className="mr-1.5 h-4 w-4" /> CSV
                </Button>
                <Button variant="outline" onClick={share}>
                  <Link2 className="mr-1.5 h-4 w-4" /> {copied ? "Link copied" : "Share link"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <LeadDialog
        open={engineerOpen}
        onOpenChange={setEngineerOpen}
        kind="engineer"
        source="cell-builder-own-job"
        title="Have an engineer check this job"
        intro="An automation engineer looks at your job, asks what is missing and tells you if a robot fits — free."
        item={{ type: "custom_job", name: jobText.trim().slice(0, 120) }}
        details={
          jobPlan
            ? {
                job: jobText.trim(),
                tasks: jobTasks.map((t) => `${t.name} (${t.confidence})`),
                checks: jobPlan.feasibility.filter((x) => x.status !== "ok").map((x) => `${x.factor}: ${x.note}`),
                proofOfConcept: jobPlan.pocFirst ? "yes" : "no",
              }
            : undefined
        }
        action="Request a call"
      />
      <LeadDialog
        open={quoteOpen}
        onOpenChange={setQuoteOpen}
        kind="quote"
        source="cell-builder"
        title="Get a quote for this line"
        intro="Our engineers check the line and come back with robots, tooling, components and an integration price."
        item={{ type: "robot_cell", name: `${cells.length} robot cell${cells.length === 1 ? "" : "s"}: ${cells.map((c) => cellLabel(c)).join(", ")}` }}
        details={{
          cells: quoteLines,
          lineCycle: bottleneck ? `${bottleneck.toFixed(1)} s` : "not measured",
          partsPerHour: perHour ?? "not measured",
          marketplaceTotal: total ? inr(total) : "",
          openLine: typeof window !== "undefined" && cells.length ? `${window.location.origin}/automation-studio/build#line=${encodeLine(cells)}` : "",
        }}
        action="Request quote"
      />
    </div>
  );
}

function ThoughtList({ items }: { items: Thought[] }) {
  return (
    <ol className="mt-1.5 space-y-1.5">
      {items.map((t, k) => (
        <li key={t.step} className="flex gap-2">
          <span
            className={cn(
              "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold",
              t.state === "ok" ? "bg-emerald-500/15 text-emerald-600" : t.state === "warn" ? "bg-amber-500/15 text-amber-600" : "bg-muted text-muted-foreground",
            )}
          >
            {k + 1}
          </span>
          <span>
            <b>{t.step}.</b> <span className="text-muted-foreground">{t.thought}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

function StateBadge({ state }: { state: CheckState }) {
  const map = {
    ok: ["Ready", "border-emerald-500/50 text-emerald-600"],
    warn: ["Check", "border-amber-500/50 text-amber-600"],
    missing: ["Incomplete", "border-border text-muted-foreground"],
  } as const;
  return <Badge variant="outline" className={cn("h-5 px-1.5 text-[10px]", map[state][1])}>{map[state][0]}</Badge>;
}
