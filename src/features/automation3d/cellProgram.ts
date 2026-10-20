/**
 * Automation Studio — the robot program of one builder cell, written the way an
 * integrator writes it: from the equipment that is really in the cell.
 *
 * The user chooses everything (robot, tools, tool changer, conveyors, tables,
 * machines, pallet, camera, tool stand); nothing is added for them. The program
 * then follows what that equipment can physically do:
 *   - a gripper picks and places, a torch welds, a spindle grinds, a nozzle
 *     dispenses — a welding torch never "picks" a part;
 *   - with a tool changer the robot swaps between the tool on its arm and the
 *     one on the tool stand inside the cycle (gripper → torch → gripper);
 *   - whatever the job needs but the cell lacks is reported, and the robot
 *     does only what the chosen equipment allows.
 */

import { PROCESS_HEAD, processKind, type ProcessKind } from "./processProfiles";
import { stepLabel, type SimStep } from "./robotSim.js";

export type StationKey = "conveyor" | "out" | "table" | "weld" | "cnc" | "press" | "mould" | "test" | "marker" | "bin" | "pallet" | "vision" | "carton" | "rack";

/** The cell equipment a user can place around a robot. */
export const CELL_STATIONS: { key: StationKey; label: string; hint: string }[] = [
  { key: "conveyor", label: "Infeed conveyor", hint: "Brings raw parts to the robot" },
  { key: "out", label: "Outfeed conveyor", hint: "Takes finished parts away, or on to the next robot" },
  { key: "table", label: "Work table / fixture", hint: "Holds the part while a tool works on it" },
  { key: "weld", label: "Welding table", hint: "Welding fixture with clamps" },
  { key: "cnc", label: "CNC machine", hint: "A machine tool the robot loads and unloads" },
  { key: "press", label: "Press / press brake", hint: "Stamping press, press brake or forging press the robot loads" },
  { key: "mould", label: "Moulding / die-casting machine", hint: "The robot takes the part out each time the mould opens" },
  { key: "test", label: "Test / gauging station", hint: "Leak, function or dimensional test of every part" },
  { key: "marker", label: "Laser marking station", hint: "Marks a code or serial number on each part" },
  { key: "bin", label: "Parts bin + 3D camera", hint: "Loose, jumbled parts the robot finds with a 3D camera" },
  { key: "pallet", label: "Pallet", hint: "Stacks finished parts, or supplies raw parts" },
  { key: "vision", label: "Vision camera station", hint: "Fixed camera that checks every part" },
  { key: "carton", label: "Packing carton", hint: "Cartons the robot packs products into" },
  { key: "rack", label: "Tool stand", hint: "Holds the second tool for the tool changer" },
];
export const stationLabel = (k: string) => (k === "in" ? "Transfer conveyor" : CELL_STATIONS.find((s) => s.key === k)?.label ?? k);
/** A station's name inside a sentence. */
const lower = (k: string) => stationLabel(k).toLowerCase().replace(/\b3d\b/g, "3D");

/** End-of-arm tool families (see eoatKind in robotSim.js). */
export const GRIP_TOOLS = ["parallel", "dual", "vacuum", "magnet", "fork"];
export const TOOL_NAMES: Record<string, string> = {
  parallel: "gripper", dual: "dual gripper", vacuum: "vacuum gripper", magnet: "magnetic gripper", fork: "fork / sack gripper",
  torch: "welding torch", spindle: "grinding / polishing spindle", driver: "screwdriver", nozzle: "dispensing / spray nozzle",
};
const toolName = (k?: string) => (k ? TOOL_NAMES[k] ?? "tool" : "tool");

type ToolWork = { action: "weld" | "finish" | "apply" | "assemble" | "fill" | "cap" | "label"; at: "weld" | "table"; tools: string[] };
type Work = ToolWork | { action: "process"; at: "cnc" } | { action: "inspect" } | null;

/** What the robot does for each kind of job, and which tool families can do it. */
const WORK: Record<ProcessKind, Work> = {
  welding: { action: "weld", at: "weld", tools: ["torch"] },
  // Washing and blasting work with a nozzle.
  finishing: { action: "finish", at: "table", tools: ["spindle", "nozzle"] },
  coating: { action: "apply", at: "table", tools: ["nozzle"] },
  assembly: { action: "assemble", at: "table", tools: ["driver", "parallel", "dual", "vacuum"] },
  filling: { action: "fill", at: "table", tools: ["nozzle"] },
  sealing: { action: "cap", at: "table", tools: ["driver", "parallel", "nozzle"] },
  labeling: { action: "label", at: "table", tools: ["vacuum", "parallel", "nozzle"] },
  machining: { action: "process", at: "cnc" },
  inspection: { action: "inspect" },
  handling: null,
  transport: null,
  palletizing: null,
  packing: null,
};
/** Machining where the robot carries the head (drill, router, cutting head, blade, hemming roller) over a fixtured part. */
const HEAD_WORK: ToolWork = { action: "finish", at: "table", tools: ["spindle", "torch", "nozzle"] };
/**
 * The work a job really is for its program: masking places plugs and tape (assembly work), a plating line
 * moves racks (handling), concrete printing lays beads from a nozzle (coating), panel cleaning brushes (finishing),
 * nailing drives nails into a fixtured frame (assembly).
 */
const workKind = (job: string, kind: ProcessKind): ProcessKind =>
  /concrete/i.test(job) ? "coating" : /panel clean|solar clean/i.test(job) ? "finishing" : /nail|stapl/i.test(job) ? "assembly"
    : kind !== "coating" ? kind : /mask/i.test(job) ? "assembly" : /plating|dip coat|galvani|anodi/i.test(job) ? "handling" : kind;
const isHead = (job: string, kind: ProcessKind) => kind === "machining" && PROCESS_HEAD.test(job);
const headWord = (job: string) =>
  /hemm/i.test(job) ? "rolls the hem" : /drill/i.test(job) ? "drills the holes" : /rout/i.test(job) ? "routs and trims the part" : /meat|debon/i.test(job) ? "cuts the meat" : "cuts the part";
const PROCESS_KIND: Record<string, ProcessKind> = { torch: "welding", spindle: "finishing", nozzle: "coating", driver: "assembly" };
const WORD: Record<string, string> = { weld: "welds the seam", finish: "grinds / polishes the part", apply: "applies the coating or bead", assemble: "assembles the part", fill: "fills the container", cap: "caps and seals it", label: "applies the label" };

/** The machine a job's robot tends, from the job name: moulding is not machining is not pressing. */
const MACHINES: [RegExp, StationKey][] = [
  [/mould|mold|die ?cast/i, "mould"],
  [/press|stamp|bend|brake|forg/i, "press"],
  [/leak|test|measur|gaug/i, "test"],
  [/laser mark|marking|engrav|coding/i, "marker"],
  [/cnc|machin|mill|turning|lathe|sheet load|tending/i, "cnc"],
];
export const machineFor = (job: string, kind: ProcessKind): StationKey | null =>
  isHead(job, kind) ? null : MACHINES.find(([re]) => re.test(job))?.[1] ?? (kind === "machining" ? "cnc" : null);
const MACHINE_DO: Partial<Record<StationKey, [string, string, string]>> = {
  // [load label, cycle label, unload label]
  cnc: ["Load the CNC machine", "Run the machining cycle", "Unload the CNC machine"],
  press: ["Load the press", "Press stroke", "Unload the press"],
  test: ["Place in the test station", "Run the test", "Take out of the test station"],
  marker: ["Place under the laser marker", "Laser mark the part", "Take out of the marker"],
};

export interface ProgramNote {
  level: "info" | "warn" | "stop";
  text: string;
}
export interface CellProgram {
  steps: SimStep[];
  notes: ProgramNote[];
  /** Stations the program really uses. */
  uses: StationKey[];
  /** The program in one sentence. */
  summary: string;
  /** The robot has nothing it can do with this equipment. */
  idle: boolean;
  /** The job kind the program was written for (from the job, else from the tool). */
  kind: ProcessKind;
  /** Tool in use when the cycle starts (0 = arm, 1 = stand); the cycle ends with it again. */
  startTool: number;
}

export interface ProgramInput {
  /** Job name (builder job or skills-library task); "" when none is chosen. */
  job: string;
  /** Tool families: the tool on the arm first, then the tool on the stand. */
  tools: (string | undefined)[];
  /** A tool changer is fitted, so the second tool can be used. */
  changer: boolean;
  /** Equipment the user placed in this cell. */
  stations: StationKey[];
  /** A camera on the robot's wrist. */
  camera?: boolean;
  /** The previous robot passes parts to this one on its outfeed conveyor. */
  fromPrev?: boolean;
}

const putOn = (k: string) => (k === "pallet" ? "stacks it on the pallet" : k === "carton" ? "packs it into the carton" : `puts it on the ${lower(k)}`);
const step = (action: string, station: string, label?: string, extra: Partial<SimStep> = {}): SimStep => {
  const s = { action, station, label: "", ...extra } as SimStep;
  s.label = label || stepLabel(s);
  return s;
};

export function cellProgram(p: ProgramInput): CellProgram {
  const has = new Set(p.stations);
  const notes: ProgramNote[] = [];
  const steps: SimStep[] = [];
  const uses = new Set<StationKey>();
  const arm = p.tools[0];
  const stand = p.tools[1];
  // Tools the robot can use in this cycle: the stand tool only through a tool changer.
  const usable: (string | undefined)[] = [arm, p.changer ? stand : undefined];
  if (stand && !p.changer) notes.push({ level: "warn", text: `The ${toolName(stand)} on the tool stand needs a tool changer on the robot — without one only the ${toolName(arm)} is used` });
  if (p.changer && stand && !has.has("rack")) notes.push({ level: "warn", text: "Add a tool stand: the tool changer needs a place to park the second tool" });
  if (p.changer && !stand) notes.push({ level: "info", text: "The tool changer is fitted but there is no second tool — add one to swap tools in the cycle" });

  // No job chosen: the robot does what its process tool is for, else pick and place.
  const kind: ProcessKind = p.job ? processKind({ name: p.job }) : PROCESS_KIND[usable.find((k) => !!k && !!PROCESS_KIND[k]) ?? ""] ?? "handling";
  const find = (families: string[]) => usable.findIndex((k) => !!k && families.includes(k));
  const grip = find(GRIP_TOOLS);

  if (!arm && !stand) {
    return { steps: [{ ...step("idle", "", "Waiting for a tool") }], notes: [{ level: "stop", text: "Put a tool on the robot: a gripper to move parts, or a process tool such as a welding torch" }], uses: [], summary: "No tool yet.", idle: true, kind, startTool: 0 };
  }

  // Where raw parts come from and where finished parts go, from the equipment the user placed.
  const head = isHead(p.job, kind);
  const work = head ? HEAD_WORK : WORK[workKind(p.job, kind)];
  const workAt: StationKey | null = work && "at" in work ? work.at : null;
  const depal = /depallet/i.test(p.job);
  const kitting = /kit/i.test(p.job);
  const destOrder: StationKey[] =
    kind === "packing" || kitting ? ["carton", "out", "pallet"] : kind === "palletizing" ? ["pallet", "out", "carton"] : depal ? ["out", "carton", "table"] : ["out", "pallet", "carton"];
  // Raw parts: from the previous robot, a parts bin (bin picking), the infeed, or a pallet (depalletizing).
  let source: string | null = p.fromPrev ? "in" : /bin pick/i.test(p.job) && has.has("bin") ? "bin" : depal && has.has("pallet") ? "pallet" : has.has("conveyor") ? "conveyor" : has.has("bin") ? "bin" : null;
  let dest: StationKey | null = destOrder.find((k) => has.has(k) && k !== source) ?? null;
  // A pallet with no other source supplies the parts (depalletizing).
  if (!source && has.has("pallet") && dest !== "pallet") source = "pallet";
  if (!dest && has.has("table") && workAt !== "table" && source !== "table") dest = "table";
  if (!source && has.has("table") && workAt !== "table" && dest !== "table") source = "table";

  // The cycle starts with whichever tool its first move needs, and ends holding it again.
  let cur = -1;
  let start = -1;
  const holdTool = (i: number) => {
    if (i < 0 || i === cur) return;
    if (cur < 0) {
      cur = start = i;
      return;
    }
    steps.push(step("toolchange", has.has("rack") ? "rack" : "", `Tool change → ${toolName(usable[i])}`, { tool: i }));
    if (has.has("rack")) uses.add("rack");
    cur = i;
  };
  const at = (k: string) => k !== "in" && uses.add(k as StationKey);
  const pickFrom = (k: string, label?: string) => {
    // Loose parts in a bin: the 3D camera finds one first.
    if (k === "bin") steps.push(step("scan", "bin", "Find a part with the 3D camera"));
    at(k);
    steps.push(step("pick", k, label));
  };
  const placeOn = (k: string, label?: string) => (at(k), steps.push(step("place", k, label)));
  const finishPart = () => {
    if (has.has("vision")) {
      uses.add("vision");
      steps.push(step("inspect", "vision", "Check the part with the camera"));
    }
    if (dest) placeOn(dest, dest === "out" ? "Place on outfeed conveyor" : dest === "carton" && kitting ? "Place in the kit tray" : undefined);
  };
  const say: string[] = [];

  const machine = machineFor(p.job, kind);
  /* Machine tending: load, run the machine, unload — or take parts out of a moulding machine. */
  if (machine && (kind === "machining" || has.has(machine))) {
    const M = machine;
    const name = lower(M);
    const extract = M === "mould";
    if (grip < 0) notes.push({ level: "stop", text: `${p.job || "Machine tending"} needs a gripper — a ${toolName(arm)} cannot ${extract ? "take parts out of" : "load"} the ${name}` });
    else if (!has.has(M)) notes.push({ level: "stop", text: `Add a ${name} for the robot to tend` });
    else if (!extract && !source) notes.push({ level: "stop", text: `Add an infeed conveyor, a pallet or a parts bin with parts for the ${name}` });
    else if (extract && !dest) notes.push({ level: "stop", text: "Add a pallet, carton or outfeed conveyor for the moulded parts" });
    if (grip >= 0 && has.has(M) && (extract ? !!dest : !!source)) {
      holdTool(grip);
      uses.add(M);
      if (extract) {
        steps.push(step("process", M, /die ?cast/i.test(p.job) ? "Die-casting shot" : "Moulding cycle"));
        pickFrom(M, "Take the part out of the open mould");
        say.push(`waits for the ${name} to open`, "takes the part out");
      } else {
        const [load, cycle, unload] = MACHINE_DO[M] ?? MACHINE_DO.cnc!;
        pickFrom(source!);
        placeOn(M, load);
        steps.push(step("process", M, cycle));
        pickFrom(M, unload);
        say.push(`loads the ${name} from the ${lower(source!)}`, `waits for the ${M === "test" ? "test" : M === "marker" ? "marking" : "cycle"}`, "unloads it");
      }
      if (dest) {
        finishPart();
        say.push(putOn(dest));
      } else {
        notes.push({ level: "warn", text: `Add a pallet, carton or outfeed conveyor for the finished parts` });
        placeOn(M, "Return the part to the machine");
      }
    }
  } else if (work && "tools" in work) {
    /* A tool works on the part: weld, grind, coat, assemble, fill, cap or label. */
    const W = work.at;
    // The working tool: a process tool first; a gripper only where it can do the work itself.
    const proc = find(work.tools.filter((t) => !GRIP_TOOLS.includes(t))) >= 0 ? find(work.tools.filter((t) => !GRIP_TOOLS.includes(t))) : find(work.tools);
    if (proc < 0) {
      notes.push({ level: "stop", text: `${p.job || "This job"} needs a ${head ? "cutting, drilling or hemming head" : toolName(work.tools[0])} — ${usable.filter(Boolean).length ? `a ${toolName(arm)} cannot do it` : "add one"}${grip >= 0 ? ". The robot only moves the parts" : ""}` });
    } else if (!has.has(W)) {
      notes.push({ level: "stop", text: `Add a ${lower(W)} — the ${toolName(usable[proc])} works on a part held there` });
    }
    if (proc >= 0 && has.has(W)) {
      uses.add(W);
      const loads = grip >= 0 && !!source;
      if (loads) {
        holdTool(grip);
        pickFrom(source!);
        placeOn(W, W === "weld" ? "Load welding fixture" : "Place on work table");
        say.push(`picks from the ${lower(source!)} with the ${toolName(usable[grip])}`, `loads the ${lower(W)}`);
      } else {
        // Nobody loads the fixture: an operator does it each cycle.
        steps.push(step("manual", W, "Operator loads a part"));
        if (grip < 0 && (has.has("conveyor") || has.has("pallet") || p.fromPrev))
          notes.push({ level: "warn", text: `A ${toolName(usable[proc])} cannot pick parts — the operator loads the ${lower(W)}. Add a gripper on a tool changer to load it automatically` });
        else if (grip >= 0 && !source) notes.push({ level: "warn", text: "Add an infeed conveyor or a pallet so the robot can load parts itself — until then the operator loads them" });
        say.push(`waits while the operator loads the ${lower(W)}`);
      }
      if (cur >= 0 && proc !== cur) say.push(`changes to the ${toolName(usable[proc])}`);
      holdTool(proc);
      steps.push(work.action === "weld" ? step("weld", "weld", p.job || "Weld seam") : { action: work.action, station: "table", label: p.job || stepLabel({ action: work.action, station: "table", label: "" }), text: p.job || undefined });
      say.push(head ? headWord(p.job) : WORD[work.action]);
      if (loads && dest) {
        if (grip !== cur) say.push(`changes back to the ${toolName(usable[grip])}`);
        holdTool(grip);
        pickFrom(W, W === "weld" ? "Unload welding fixture" : "Pick from work table");
        finishPart();
        say.push(putOn(dest));
      } else if (loads) {
        notes.push({ level: "warn", text: "Add a pallet, carton or outfeed conveyor for finished parts — until then the operator takes them off" });
      }
      if (!loads || !dest) say.push("then the operator unloads the finished part");
    } else if (grip >= 0 && source && dest) {
      holdTool(grip);
      pickFrom(source);
      finishPart();
      say.push(`only moves parts from the ${lower(source)} to the ${lower(dest)}`);
    }
  } else {
    /* Pick and place: handling, transport, palletizing, packing and inspection. */
    if (grip < 0) {
      notes.push({ level: "stop", text: `${p.job || "Pick and place"} needs a gripper — a ${toolName(arm)} cannot hold parts${p.changer ? "; put a gripper on the tool stand" : ""}` });
    } else {
      if (!source) notes.push({ level: "stop", text: `Add ${depal ? "a pallet with the incoming load" : /bin pick/i.test(p.job) ? "a parts bin with a 3D camera" : "an infeed conveyor, a parts bin or a pallet"}: the robot has nothing to pick` });
      if (!dest) notes.push({ level: "stop", text: `Add ${kind === "packing" ? "a packing carton" : kind === "palletizing" ? "a pallet" : "a pallet, carton or outfeed conveyor"} to put the parts on` });
      if (kind === "inspection" && !has.has("vision") && !p.camera)
        notes.push({ level: "warn", text: machine ? `Add a ${lower(machine)} to test every part` : "Add a vision camera station or a wrist camera to inspect the parts" });
    }
    if (grip >= 0 && source && dest) {
      holdTool(grip);
      pickFrom(source);
      say.push(`picks from the ${lower(source)}`);
      if (kind === "inspection" && !has.has("vision") && p.camera) {
        steps.push(step("check", "", "Check the part with the wrist camera"));
        say.push("checks it with the wrist camera");
      } else if (has.has("vision")) say.push("checks it at the camera");
      finishPart();
      say.push(putOn(dest));
    }
  }

  // Back to the starting tool, so every cycle is the same.
  if (start >= 0) holdTool(start);
  const idle = steps.length === 0;
  if (idle) steps.push(step("idle", "", "Waiting — see the cell checks"));
  for (const k of has) if (!uses.has(k)) notes.push({ level: "info", text: `${stationLabel(k)} is in the cell but this program does not use it` });
  const summary = idle ? "The robot waits: the cell is missing what this job needs." : `The robot ${say.join(", ")}.`.replace(/, ([^,]*)\.$/, " and $1.");
  return { steps, notes, uses: [...uses], summary, idle, kind, startTool: Math.max(0, start) };
}

/**
 * The equipment a job usually needs with these tools — offered to the user as suggestions
 * (and used for ready-made cells), never added on its own.
 */
export function stationsFor(job: string, tools: (string | undefined)[], changer = false): StationKey[] {
  const usable = [tools[0], changer ? tools[1] : undefined].filter((k): k is string => !!k);
  const kind: ProcessKind = job ? processKind({ name: job }) : PROCESS_KIND[usable.find((k) => !!PROCESS_KIND[k]) ?? ""] ?? "handling";
  const grip = usable.some((k) => GRIP_TOOLS.includes(k));
  const work = isHead(job, kind) ? HEAD_WORK : WORK[workKind(job, kind)];
  const out: StationKey[] = [];
  const machine = machineFor(job, kind);
  if (machine === "mould") out.push("mould", "pallet");
  else if (machine && /sheet/i.test(job)) out.push("pallet", "cnc", "out");
  else if (machine) out.push("conveyor", machine, "pallet");
  else if (/bin pick/i.test(job)) out.push("bin", "pallet");
  else if (/depallet/i.test(job)) out.push("pallet", "out");
  else if (/kit/i.test(job)) out.push("conveyor", "carton");
  else if (work && "tools" in work) {
    if (grip) out.push("conveyor");
    out.push(work.at);
    if (grip) out.push("pallet");
  } else if (work && work.action === "process") out.push("conveyor", "cnc", "pallet");
  else if (work && work.action === "inspect") out.push("conveyor", "vision", "pallet");
  else out.push("conveyor", kind === "packing" ? "carton" : "pallet");
  if (changer && tools[1]) out.push("rack");
  return out;
}
