/**
 * Automation Studio — industrial robot knowledge base and line planner.
 *
 * SKILLS records what an industrial robot needs to perform each kind of
 * process: the end-of-arm tool, whether that tool can share a robot with
 * others through a tool changer, which Directory application tags a robot
 * must carry, and a minimum payload. planLine() uses it to split a user's
 * described process into robots (one robot multitasks where tools allow)
 * and builds the step list each robot runs in the 3D simulation.
 */

import type { ProcessCard } from "@/data/automationStudioIndustries";
import { processKind, type ProcessKind } from "./processProfiles";
import { stepLabel, type SimPlan, type SimStep } from "./robotSim";

export interface RobotSkill {
  /** End-of-arm tool family, or null when the gripper does the work. */
  tool: string | null;
  toolName: string;
  /** A dedicated tool (torch, spray gun) cannot share a robot with another process tool. */
  dedicated?: boolean;
  /** How the robot performs it in the simulation. */
  sim: "handling" | "weld" | "cnc" | "inspect" | "output" | "finish" | "apply" | "assemble" | "fill" | "cap" | "label";
  /** Directory application tags a suitable robot must list. */
  apps: string[];
  /** Minimum payload in kg (tool plus part). */
  minPayload: number;
  /** What the robot does, in plain words. */
  does: string;
}

export const SKILLS: Record<ProcessKind, RobotSkill> = {
  handling: { tool: null, toolName: "Parallel / vacuum gripper", sim: "handling", apps: ["Material Handling"], minPayload: 10, does: "Picks parts from the conveyor and moves them between stations." },
  transport: { tool: null, toolName: "Parallel / vacuum gripper", sim: "handling", apps: ["Material Handling"], minPayload: 10, does: "Transfers parts between stations." },
  welding: { tool: "torch", toolName: "MIG/TIG welding torch + wire feeder", dedicated: true, sim: "weld", apps: ["Welding"], minPayload: 6, does: "Positions the part in the weld fixture and follows the seam path with the torch." },
  machining: { tool: null, toolName: "Dual gripper (machine tending)", sim: "cnc", apps: ["Material Handling"], minPayload: 10, does: "Loads the machine, waits for the cycle, and unloads the part." },
  finishing: { tool: "spindle", toolName: "Grinding / polishing spindle with force control", sim: "finish", apps: ["Finishing"], minPayload: 20, does: "Sweeps a grinding or polishing tool over the surface with constant force." },
  coating: { tool: "spray", toolName: "Spray gun / dispensing valve", dedicated: true, sim: "apply", apps: ["Dispensing"], minPayload: 5, does: "Follows the part surface with a spray gun or bead dispenser." },
  inspection: { tool: null, toolName: "Gripper + vision camera", sim: "inspect", apps: ["Material Handling"], minPayload: 3, does: "Presents the part to a camera and sorts out rejects." },
  palletizing: { tool: null, toolName: "Vacuum / fork palletizing gripper", sim: "output", apps: ["Palletizing"], minPayload: 20, does: "Stacks finished parts on the pallet in layers." },
  packing: { tool: null, toolName: "Vacuum gripper", sim: "output", apps: ["Material Handling"], minPayload: 5, does: "Places products into cartons." },
  assembly: { tool: "driver", toolName: "Screwdriver / insertion tool", sim: "assemble", apps: ["Assembly"], minPayload: 5, does: "Locates components and fastens or inserts them." },
  filling: { tool: "filler", toolName: "Dosing nozzle", sim: "fill", apps: ["Dispensing"], minPayload: 5, does: "Doses product into the container." },
  sealing: { tool: "capper", toolName: "Capping head", sim: "cap", apps: ["Assembly"], minPayload: 5, does: "Places and torques caps or seals." },
  labeling: { tool: "labeler", toolName: "Label applicator", sim: "label", apps: ["Material Handling"], minPayload: 3, does: "Applies labels to the product." },
};

export type Strategy = "economy" | "balanced" | "throughput";

/**
 * Solution options. Each sets how many process tools one robot may carry
 * (through a tool changer) and how many value-adding tasks it takes on
 * (machine tending, welding, tool work), which trades robots against cycle time.
 */
export const STRATEGIES: Record<Strategy, { label: string; maxTools: number; maxWork: number; cobot: boolean; bestFor: string }> = {
  economy: {
    label: "Economy (cobots)",
    maxTools: 3,
    maxWork: 5,
    cobot: true,
    bestFor: "Lowest investment and floor space, small batches, people working alongside the robots",
  },
  balanced: {
    label: "Balanced",
    maxTools: 2,
    maxWork: 3,
    cobot: false,
    bestFor: "Good mix of investment and output for most plants",
  },
  throughput: {
    label: "High throughput",
    maxTools: 1,
    maxWork: 1,
    cobot: false,
    bestFor: "Maximum output with the shortest cycle, two or three shifts",
  },
};

/** Work a collaborative robot should not do: spray booths, heavy or hot parts, blasting. */
const NOT_FOR_COBOTS = /paint|powder|spray|glaze|thermal|blast|fettl|forg|die cast|press|tyre|glass|brick|truck|bag|sack/i;
const isWork = (t: PlannedTask) => !!t.skill.tool || t.skill.sim === "cnc" || t.skill.sim === "weld";

export interface PlannedTask {
  name: string;
  kind: ProcessKind;
  skill: RobotSkill;
  /** End-of-arm tooling named for this task by the analysis, if any. */
  eoat?: string[];
  /** Payload this task needs, in kg. */
  payload: number;
}

/** Tasks whose parts are heavy: size the robot from the analysed template, not the skill minimum. */
const HEAVY = /forg|bag|sack|depallet|press|stamp|die cast|heavy|lift|spot weld|bend/i;
const kg = (v?: string) => {
  const n = parseFloat(String(v || "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

export interface PlannedRobot {
  title: string;
  tasks: PlannedTask[];
  tools: string[];
  toolChanger: boolean;
  multitask: boolean;
  apps: string[];
  minPayload: number;
  steps: SimStep[];
  /** A collaborative robot (cobot): no fencing, works next to people. */
  collaborative: boolean;
}

export interface LinePlan {
  robots: PlannedRobot[];
  sim: SimPlan;
  strategy: Strategy;
}

const step = (action: string, station: string, label?: string): SimStep => {
  const s = { action, station, label: "" } as SimStep;
  s.label = label || stepLabel(s);
  return s;
};

function buildSteps(tasks: PlannedTask[], first: boolean, last: boolean): SimStep[] {
  const steps: SimStep[] = [];
  const handling = tasks.find((t) => t.skill.sim === "handling");
  steps.push(first ? step("pick", "conveyor", handling ? "Load part from conveyor" : undefined) : step("pick", "in", "Pick from transfer conveyor"));
  let onTable = false;
  const offTable = () => {
    if (onTable) steps.push(step("pick", "table"));
    onTable = false;
  };
  let output: PlannedTask | undefined;

  for (const t of tasks) {
    switch (t.skill.sim) {
      case "handling":
        break;
      case "weld":
        offTable();
        steps.push(step("place", "weld", "Load welding fixture"), step("weld", "weld", t.name), step("pick", "weld", "Unload welding fixture"));
        break;
      case "cnc":
        offTable();
        steps.push(step("place", "cnc"), step("process", "cnc", t.name), step("pick", "cnc"));
        break;
      case "inspect":
        offTable();
        steps.push(step("inspect", "vision", t.name));
        break;
      case "output":
        output = t;
        break;
      default:
        if (!onTable) steps.push(step("place", "table"));
        onTable = true;
        steps.push({ action: t.skill.sim, station: "table", label: t.name, text: t.name });
    }
  }
  offTable();
  if (!last) steps.push(step("place", "out", "Pass to next robot"));
  else if (output?.kind === "packing") steps.push(step("place", "carton", "Pack into carton"));
  else steps.push(step("place", "pallet", undefined));
  return steps;
}

/**
 * Split an analysed process line into robots. A robot takes on consecutive
 * tasks until a new process tool would not fit: a dedicated tool (torch,
 * spray gun) works alone, and others share up to MAX_TOOLS_PER_ROBOT tools
 * on a tool changer. Handling, inspection and palletizing join the robot
 * that already holds the part.
 */
type TaskInput = Pick<ProcessCard, "name"> & Partial<Pick<ProcessCard, "eoat" | "robot">>;

export interface PlanOptions {
  /** Task names that must start a new robot (the user chose a separate robot for that station). */
  splitBefore?: string[];
  /** Exact number of robots the user wants in the line (1 … number of tasks). */
  robots?: number;
}

export function planLine(processes: TaskInput[], strategy: Strategy = "balanced", opts: PlanOptions = {}): LinePlan {
  const { maxTools: MAX_TOOLS_PER_ROBOT, maxWork: MAX_WORK_PER_ROBOT, cobot } = STRATEGIES[strategy];
  const groups: PlannedTask[][] = [];
  let cur: PlannedTask[] | null = null;

  const forced = new Set((opts.splitBefore ?? []).map((n) => n.toLowerCase()));
  const starts = new Set<PlannedTask[]>();
  for (const p of processes) {
    const kind = processKind(p);
    const skill = SKILLS[kind];
    const payload = HEAVY.test(p.name) ? Math.max(skill.minPayload, kg(p.robot?.payload)) : skill.minPayload;
    const task: PlannedTask = { name: p.name, kind, skill, eoat: p.eoat, payload };
    if (!cur || forced.has(p.name.toLowerCase())) {
      cur = [task];
      groups.push(cur);
      if (forced.has(p.name.toLowerCase())) starts.add(cur);
      continue;
    }
    // High throughput: palletizing / packing gets its own robot once the current one does value-adding work.
    const ownOutput = strategy === "throughput" && task.skill.sim === "output" && cur.some(isWork);
    if (ownOutput || (isWork(task) && cur.filter(isWork).length >= MAX_WORK_PER_ROBOT)) {
      cur = [task];
      groups.push(cur);
      continue;
    }
    if (task.skill.tool) {
      // Distinct tools: grinding then polishing reuses the same spindle.
      const tools = [...new Set(cur.filter((t) => t.skill.tool).map((t) => t.skill))];
      // A cobot line swaps even the welding torch on a tool changer; spray booths stay dedicated.
      const dedicated = (sk: RobotSkill) => !!sk.dedicated && !(cobot && sk.tool === "torch");
      if (tools.includes(task.skill) && !dedicated(task.skill)) {
        cur.push(task);
        continue;
      }
      const full =
        tools.some(dedicated) ||
        (dedicated(task.skill) && tools.length > 0) ||
        tools.length >= MAX_TOOLS_PER_ROBOT ||
        // Tools come after the part is out of the output stage.
        cur.some((t) => t.skill.sim === "output");
      if (full) {
        cur = [task];
        groups.push(cur);
        continue;
      }
    }
    cur.push(task);
  }

  // The user asked for an exact robot count: split the busiest robots, or merge the lightest neighbours.
  const want = opts.robots ? Math.max(1, Math.min(processes.length, Math.round(opts.robots))) : 0;
  const work = (g: PlannedTask[]) => g.filter(isWork).length * 2 + g.length;
  while (want && groups.length < want) {
    let at = -1;
    groups.forEach((g, i) => g.length > 1 && (at < 0 || work(g) > work(groups[at])) && (at = i));
    if (at < 0) break;
    const g = groups[at];
    // Cut before the second value-adding task, else in the middle.
    const w = g.findIndex((t, k) => k > 0 && isWork(t));
    const cut = w > 0 ? w : Math.ceil(g.length / 2);
    const tail = g.slice(cut);
    groups.splice(at, 1, g.slice(0, cut), tail);
  }
  while (want && groups.length > want) {
    const pick = (keepChosen: boolean) => {
      let at = -1;
      for (let i = 0; i + 1 < groups.length; i++) {
        // Keep the robots the user chose separately apart where possible.
        if (keepChosen && starts.has(groups[i + 1])) continue;
        if (at < 0 || work(groups[i]) + work(groups[i + 1]) < work(groups[at]) + work(groups[at + 1])) at = i;
      }
      return at;
    };
    const at = Math.max(0, pick(true) >= 0 ? pick(true) : pick(false));
    groups.splice(at, 2, [...groups[at], ...groups[at + 1]]);
  }

  const robots: PlannedRobot[] = groups.map((tasks, i) => {
    // One end-of-arm tool per family; handling-type tasks share the gripper.
    const byFamily = new Map<string, string>();
    for (const t of tasks) if (!byFamily.has(t.skill.tool ?? "gripper")) byFamily.set(t.skill.tool ?? "gripper", t.skill.toolName);
    const tools = [...byFamily.values()];
    const apps = [...new Set(tasks.flatMap((t) => t.skill.apps))];
    const minPayload = Math.max(...tasks.map((t) => t.payload));
    return {
      title: `Robot ${i + 1}`,
      tasks,
      tools,
      // Swapping between a gripper and a process tool (or two process tools) needs a tool changer.
      toolChanger: tools.length > 1,
      multitask: tasks.length > 1,
      apps,
      minPayload,
      steps: buildSteps(tasks, i === 0, i === groups.length - 1),
      collaborative: cobot && minPayload <= 25 && !tasks.some((t) => NOT_FOR_COBOTS.test(t.name)),
    };
  });

  return {
    robots,
    strategy,
    sim: { cells: robots.map((r) => ({ title: `${r.title}: ${r.tasks.map((t) => t.name).join(" + ")}`, steps: r.steps })) },
  };
}

/* ------------------------- robot recommendations ------------------------- */

/** Compact record from public/directory/robots.json. */
export interface DirectoryRobot {
  id: string;
  b: string;
  m: string;
  n: string;
  t: string;
  a: number;
  p: number;
  r: number;
  ap?: string[];
  th?: string;
  img?: string;
}

/** Widely supported industrial robot brands, listed first. */
const MAJOR_BRANDS = ["ABB", "Fanuc", "KUKA", "Yaskawa Motoman", "Kawasaki", "Universal Robots", "Nachi", "Staubli", "Comau", "Denso", "Epson", "OTC Daihen", "Mitsubishi", "Doosan Robotics", "Hyundai Robotics"];
const brandRank = (b: string) => {
  const i = MAJOR_BRANDS.indexOf(b);
  return i === -1 ? MAJOR_BRANDS.length : i;
};

/**
 * Real robot models from the Directory that list every application the
 * robot's tasks need and carry at least the required payload. One model per
 * brand, smallest suitable payload first.
 */
export function recommendRobots(
  robot: Pick<PlannedRobot, "apps" | "minPayload"> & { collaborative?: boolean },
  catalog: DirectoryRobot[],
  limit = 3,
): DirectoryRobot[] {
  // A cobot plan asks for collaborative models first and falls back to any suitable robot.
  if (robot.collaborative) {
    const cobots = recommendRobots({ apps: [...robot.apps, "Collaborative"], minPayload: robot.minPayload }, catalog, limit);
    if (cobots.length) return cobots;
  }
  const fits = catalog
    .filter((r) => r.p >= robot.minPayload && robot.apps.every((a) => r.ap?.includes(a)))
    .sort((x, y) => Number(y.a === 6) - Number(x.a === 6) || brandRank(x.b) - brandRank(y.b) || x.p - y.p || y.r - x.r);
  const seen = new Set<string>();
  const out: DirectoryRobot[] = [];
  for (const r of fits) {
    if (seen.has(r.b)) continue;
    seen.add(r.b);
    out.push(r);
    if (out.length >= limit) break;
  }
  return out;
}

/** A description reads as prose (not a list of robot steps) when it is one long sentence block. */
export function isProseDescription(text: string): boolean {
  const t = String(text || "").trim();
  return !t.includes("\n") && t.split(/\s+/).length > 14;
}
