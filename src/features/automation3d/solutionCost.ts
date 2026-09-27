/**
 * Automation Studio — equipment knowledge and approximate budget.
 *
 * For every kind of robot task this lists the end-of-arm tooling (EOAT) and
 * cell peripherals a real installation needs, with indicative Indian market
 * price ranges (INR, ex-works, before GST). buildBom() turns a planned robot
 * line into a bill of materials with a low / high budget.
 *
 * Prices are planning estimates only; a quotation depends on brand, part,
 * cycle time and site conditions.
 */

import type { ProcessKind } from "./processProfiles";
import { recommendRobots, SKILLS, type DirectoryRobot, type LinePlan, type PlannedRobot } from "./robotKnowledge";

const GRIPPER_PRIORITY: ProcessKind[] = ["palletizing", "machining", "packing", "handling", "transport", "inspection"];

/** [item, min INR, max INR] */
type Priced = [string, number, number];

const L = 100000; // one lakh

export const EQUIPMENT: Record<ProcessKind, { eoat: Priced[]; peripherals: Priced[] }> = {
  handling: {
    eoat: [["Parallel / vacuum gripper with sensors", 0.6 * L, 2 * L]],
    peripherals: [["Part locating fixture / nest", 0.5 * L, 1.5 * L]],
  },
  transport: {
    eoat: [["Parallel / vacuum gripper with sensors", 0.6 * L, 2 * L]],
    peripherals: [],
  },
  welding: {
    eoat: [
      ["Robotic MIG/TIG torch package with anti-collision", 2.5 * L, 4 * L],
      ["Seam finding / tracking sensor", 2 * L, 4.5 * L],
    ],
    peripherals: [
      ["Robotic welding power source + wire feeder", 4 * L, 8 * L],
      ["Torch cleaning & wire cutting station", 2 * L, 3.5 * L],
      ["Welding fixture with clamps", 1.5 * L, 4 * L],
      ["Fume extraction unit", 1.5 * L, 3 * L],
      ["Arc-flash curtains / screens", 0.8 * L, 1.5 * L],
    ],
  },
  machining: {
    eoat: [["Dual gripper for machine tending", 1.5 * L, 3 * L]],
    peripherals: [
      ["Machine interface (auto door, I/O, fixture clamp signals)", 1 * L, 2.5 * L],
      ["Raw / finished part buffer (drawer or grid)", 1 * L, 3 * L],
    ],
  },
  finishing: {
    eoat: [
      ["Grinding / polishing / deburring spindle", 3 * L, 6 * L],
      ["Active force-control compliance unit", 4 * L, 8 * L],
    ],
    peripherals: [
      ["Abrasive / disc changing station", 1 * L, 2 * L],
      ["Dust extraction & enclosure", 1.5 * L, 3 * L],
    ],
  },
  coating: {
    eoat: [["Spray gun / dispensing valve with regulator", 1.5 * L, 3.5 * L]],
    peripherals: [
      ["Paint / material supply & metering pump", 2 * L, 5 * L],
      ["Spray booth with extraction", 5 * L, 12 * L],
      ["Robot protective cover (jacket)", 0.3 * L, 0.6 * L],
    ],
  },
  inspection: {
    eoat: [["Gripper for part presentation", 0.6 * L, 1.5 * L]],
    peripherals: [
      ["Industrial vision camera + lighting", 1.5 * L, 4 * L],
      ["Vision / measurement software licence", 1 * L, 2.5 * L],
      ["Reject chute with sensor", 0.3 * L, 0.8 * L],
    ],
  },
  palletizing: {
    eoat: [["Palletizing gripper (vacuum / fork / clamp)", 2 * L, 5 * L]],
    peripherals: [
      ["Pallet station with presence sensors", 1 * L, 2.5 * L],
      ["Palletizing pattern software", 0.8 * L, 1.5 * L],
    ],
  },
  packing: {
    eoat: [["Vacuum packing gripper", 0.8 * L, 2 * L]],
    peripherals: [["Carton infeed / positioning station", 1 * L, 3 * L]],
  },
  assembly: {
    eoat: [["Screwdriving / insertion tool", 3 * L, 7 * L]],
    peripherals: [
      ["Screw / component feeder", 2 * L, 5 * L],
      ["Assembly fixture", 1 * L, 3 * L],
    ],
  },
  filling: {
    eoat: [["Dosing nozzle with gripper", 1 * L, 2.5 * L]],
    peripherals: [
      ["Dosing pump / filler unit", 2 * L, 5 * L],
      ["Container locating fixture", 0.5 * L, 1.5 * L],
    ],
  },
  sealing: {
    eoat: [["Servo capping / sealing head", 2.5 * L, 5 * L]],
    peripherals: [["Cap feeder & orientation unit", 2 * L, 4 * L]],
  },
  labeling: {
    eoat: [["Label / marking applicator", 3 * L, 6 * L]],
    peripherals: [["Code verification reader", 0.8 * L, 1.5 * L]],
  },
};

/** Robot arm + controller + teach pendant, by payload class (INR). */
export function robotPrice(payloadKg: number): [number, number] {
  if (payloadKg <= 7) return [8 * L, 14 * L];
  if (payloadKg <= 12) return [11 * L, 18 * L];
  if (payloadKg <= 25) return [14 * L, 24 * L];
  if (payloadKg <= 60) return [22 * L, 35 * L];
  if (payloadKg <= 130) return [30 * L, 48 * L];
  if (payloadKg <= 250) return [40 * L, 65 * L];
  return [55 * L, 95 * L];
}

export type BomCategory = "Robot" | "EOAT" | "Peripheral" | "Line" | "Safety" | "Controls" | "Services";

export interface BomLine {
  item: string;
  category: BomCategory;
  /** Robot title this belongs to, or "Line" for shared equipment. */
  scope: string;
  qty: number;
  unit: [number, number];
  total: [number, number];
  note?: string;
}

export interface RobotSolution {
  robot: PlannedRobot;
  models: DirectoryRobot[];
  /** Payload the price is based on (the suggested model, else the requirement). */
  payload: number;
  eoat: string[];
  cost: [number, number];
}

export interface Bom {
  lines: BomLine[];
  robots: RobotSolution[];
  hardware: [number, number];
  total: [number, number];
}

const line = (item: string, category: BomCategory, scope: string, qty: number, unit: [number, number], note?: string): BomLine => ({
  item,
  category,
  scope,
  qty,
  unit,
  total: [unit[0] * qty, unit[1] * qty],
  note,
});

/** Bill of materials with an indicative budget for a planned robot line. */
export function buildBom(plan: LinePlan, catalog: DirectoryRobot[] = []): Bom {
  const lines: BomLine[] = [];
  const robots: RobotSolution[] = plan.robots.map((r) => {
    const start = lines.length;
    const models = recommendRobots(r, catalog);
    const payload = models[0]?.p ?? r.minPayload;
    const model = models[0] ? `${models[0].n} (${models[0].p} kg, ${models[0].r} mm)` : `${r.minPayload} kg class`;
    lines.push(line(`6-axis industrial robot: ${model}`, "Robot", r.title, 1, robotPrice(payload), "Arm, controller and teach pendant"));
    lines.push(line("Robot riser / base plate", "Robot", r.title, 1, [0.5 * L, 1.2 * L]));

    // EOAT and peripherals once per kind of task on this robot.
    const kinds = [...new Set(r.tasks.map((t) => t.kind))];
    const eoat: string[] = [];
    // Gripper-type tasks share one gripper: take the most demanding one.
    const gripper = GRIPPER_PRIORITY.find((k) => kinds.includes(k));
    for (const k of kinds) {
      const task = r.tasks.find((t) => t.kind === k)!;
      const ownsEoat = SKILLS[k].tool !== null || k === gripper;
      (ownsEoat ? EQUIPMENT[k].eoat : []).forEach(([item, min, max], i) => {
        // The analysis names the specific tooling for the task (e.g. "MIG Torch Package").
        const named = i === 0 ? task.eoat?.[0] : undefined;
        eoat.push(item);
        lines.push(line(item, "EOAT", r.title, 1, [min, max], named ? `${task.name} · ${named}` : task.name));
      });
      for (const [item, min, max] of EQUIPMENT[k].peripherals) {
        lines.push(line(item, "Peripheral", r.title, 1, [min, max], task.name));
      }
    }
    if (r.toolChanger) {
      lines.push(line("Automatic tool changer + tool stands", "EOAT", r.title, 1, [2 * L, 4 * L], "Lets this robot switch between its tasks"));
    }
    lines.push(line("Safety fencing with interlocked door", "Safety", r.title, 1, [1.5 * L, 3 * L]));
    lines.push(line("Area scanner / light curtain", "Safety", r.title, 1, [0.8 * L, 2 * L]));

    const mine = lines.slice(start);
    return {
      robot: r,
      models,
      payload,
      eoat,
      cost: [mine.reduce((n, l) => n + l.total[0], 0), mine.reduce((n, l) => n + l.total[1], 0)],
    };
  });

  const n = plan.robots.length;
  lines.push(line("Infeed conveyor", "Line", "Line", 1, [1.5 * L, 3 * L]));
  if (n > 1) lines.push(line("Transfer conveyor between robots", "Line", "Line", n - 1, [1.2 * L, 2.5 * L]));
  lines.push(line("Line PLC + HMI panel", "Controls", "Line", 1, [2.5 * L, 5 * L]));
  lines.push(line("Offline programming & 3D simulation", "Services", "Line", 1, [1 * L, 2.5 * L]));

  const hardware: [number, number] = [lines.reduce((s, l) => s + l.total[0], 0), lines.reduce((s, l) => s + l.total[1], 0)];
  lines.push(
    line("Installation, integration & commissioning", "Services", "Line", 1, [Math.round(hardware[0] * 0.15), Math.round(hardware[1] * 0.2)], "15-20% of equipment"),
  );
  lines.push(line("Operator & maintenance training", "Services", "Line", 1, [0.5 * L, 1.5 * L]));
  const total: [number, number] = [lines.reduce((s, l) => s + l.total[0], 0), lines.reduce((s, l) => s + l.total[1], 0)];
  return { lines, robots, hardware, total };
}

/** ₹ in lakhs / crores, e.g. "₹ 12.5 L", "₹ 1.25 Cr". */
export function inr(v: number): string {
  if (v >= 100 * L) return `₹ ${(v / (100 * L)).toFixed(2)} Cr`;
  return `₹ ${(v / L).toFixed(1)} L`;
}

export const inrRange = ([a, b]: [number, number]) => `${inr(a)} – ${inr(b)}`;
