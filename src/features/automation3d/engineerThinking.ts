/**
 * Automation Studio — how an automation engineer thinks a solution through, as methods
 * the studio runs on every plan instead of fixed rules of thumb:
 *
 *   1. Choose the approach with a weighted decision matrix (manual + assist, cobot,
 *      industrial robot, gantry, special-purpose machine), weights set by the brief.
 *   2. Check each robot's cycle from its motion (trapezoidal speed profile, payload
 *      derating, approach / grip / settle), not only from a typical number.
 *   3. Balance the line against takt at a target OEE: robots per station, utilisation,
 *      bottleneck and buffers.
 *   4. Set the required performance level of each safety function from the ISO 13849-1
 *      risk graph (severity, frequency, avoidance) and the ISO 10218 minimum.
 *   5. Run an FMEA: failure modes per task with severity × occurrence × detection.
 *   6. Review the design against the checks an experienced engineer makes before a quote.
 *   7. Say what would change the decision (output, weight, variants, shifts).
 *
 * Pure functions with figures an engineer would use for a first design; every result is
 * a starting point to confirm with simulation, trials and the robot maker's data.
 */

import { PROCESS_HEAD, processKind, type ProcessKind } from "./processProfiles";
import { extractFacts, type BriefFacts } from "./solutionEngine";
import type { AiSolution } from "./aiSolution";

/* ------------------------------------------------------------------ motion */

export type RobotClass = "delta" | "scara" | "cobot" | "small" | "medium" | "large" | "heavy";
/**
 * Practical pick-and-place figures by robot class: TCP speed (m/s), acceleration (m/s²), speed of the
 * short vertical approach / depart moves, settling time per stop (s) and how fast its grippers act.
 */
export const MOTION: Record<RobotClass, { v: number; a: number; vz: number; settle: number; gripScale: number; label: string }> = {
  delta: { v: 6, a: 50, vz: 6, settle: 0.02, gripScale: 0.25, label: "delta robot" },
  scara: { v: 4, a: 25, vz: 2, settle: 0.05, gripScale: 0.5, label: "SCARA" },
  cobot: { v: 1, a: 3, vz: 0.5, settle: 0.12, gripScale: 1, label: "cobot (collaborative speed)" },
  small: { v: 2.5, a: 12, vz: 1, settle: 0.12, gripScale: 1, label: "6-axis up to 12 kg" },
  medium: { v: 2, a: 7, vz: 1, settle: 0.12, gripScale: 1, label: "6-axis 13–60 kg" },
  large: { v: 1.6, a: 4, vz: 0.8, settle: 0.25, gripScale: 1, label: "6-axis 61–250 kg" },
  heavy: { v: 1.2, a: 2.5, vz: 0.6, settle: 0.25, gripScale: 1, label: "6-axis over 250 kg" },
};
export const classOf = (payloadKg: number, text = ""): RobotClass =>
  /delta|flexpicker|m-[23]ia|mpp3/i.test(text) ? "delta" : /scara/i.test(text) ? "scara" : /cobot|collaborative/i.test(text) ? "cobot"
    : payloadKg <= 12 ? "small" : payloadKg <= 60 ? "medium" : payloadKg <= 250 ? "large" : "heavy";

/** Time for one point-to-point move of `metres`: trapezoidal profile, or triangular when short. */
export function moveTime(metres: number, v: number, a: number) {
  const d = Math.max(0, metres);
  return d >= (v * v) / a ? d / v + v / a : 2 * Math.sqrt(d / a);
}

export interface PickPlace {
  travelM: number;
  partKg: number;
  robotPayloadKg: number;
  cls: RobotClass;
  gripper?: "vacuum" | "parallel" | "magnet" | "fork";
  processS?: number;
}
/** One pick-and-place cycle: approach, grip, depart, travel, place, release, return. */
export function pickPlaceCycle(p: PickPlace) {
  const m = MOTION[p.cls];
  // A heavier load lowers the usable acceleration (to about half at full payload).
  const ratio = Math.min(1, Math.max(0, p.partKg / Math.max(1, p.robotPayloadKg)));
  const a = m.a * (1 - 0.5 * ratio);
  const vertical = 0.1; // 100 mm approach and depart at each end
  const grip = (p.gripper === "vacuum" ? 0.2 : p.gripper === "magnet" ? 0.3 : p.gripper === "fork" ? 0.6 : 0.4) * m.gripScale;
  const settle = m.settle;
  const verticals = 4 * moveTime(vertical, m.vz, a);
  const travel = 2 * moveTime(p.travelM, m.v, a);
  const total = verticals + travel + 2 * grip + 4 * settle + (p.processS ?? 0);
  return { total, travel, verticals, grip: 2 * grip, settle: 4 * settle, a };
}

/* ------------------------------------------------------------ line balance */

export interface BalanceRow { station: string; cycleS: number; robots: number; utilisation: number }
/** Robots per station so each works within `oee` × takt; the bottleneck sets the line rate. */
export function lineBalance(stations: { station: string; cycleS: number }[], partsPerHour: number | null, oee = 0.85) {
  const takt = partsPerHour ? 3600 / partsPerHour : null;
  const rows: BalanceRow[] = stations.map((s) => {
    const robots = takt ? Math.max(1, Math.ceil(s.cycleS / (takt * oee))) : 1;
    return { station: s.station, cycleS: s.cycleS, robots, utilisation: takt ? s.cycleS / (robots * takt) : 1 };
  });
  const effective = rows.map((r) => r.cycleS / r.robots);
  const slowest = Math.max(...effective, 0.1);
  const bottleneck = rows[effective.indexOf(slowest)]?.station ?? "";
  return { takt, oee, rows, bottleneck, capacityPerHour: Math.floor((3600 * oee) / slowest) };
}

/* ------------------------------------------------------- safety (ISO 13849-1) */

export type PL = "a" | "b" | "c" | "d" | "e";
const PLS: PL[] = ["a", "b", "c", "d", "e"];
/**
 * Required performance level from the ISO 13849-1 risk graph:
 * S1 slight / S2 serious injury, F1 seldom / F2 frequent exposure, P1 possible / P2 scarcely possible to avoid.
 */
export function requiredPL(s: 1 | 2, f: 1 | 2, p: 1 | 2): PL {
  const score = (s - 1) * 4 + (f - 1) * 2 + (p - 1); // 0..7
  return (["a", "b", "b", "c", "c", "d", "d", "e"] as PL[])[score];
}
const maxPL = (a: PL, b: PL) => (PLS.indexOf(a) >= PLS.indexOf(b) ? a : b);

export interface SafetyFunction { fn: string; s: 1 | 2; f: 1 | 2; p: 1 | 2; graph: PL; required: PL; why: string }
/** The main safety functions of a cell and the PL each needs (risk graph, then the ISO 10218 minimum of PL d). */
export function safetyFunctions(o: { kinds: ProcessKind[]; cobots: number; robots: number; press?: boolean; mobile?: boolean; palletizing?: boolean }): SafetyFunction[] {
  const out: SafetyFunction[] = [];
  const add = (fn: string, s: 1 | 2, f: 1 | 2, p: 1 | 2, why: string, minimum: PL = "d") => {
    const graph = requiredPL(s, f, p);
    out.push({ fn, s, f, p, graph, required: maxPL(graph, minimum), why });
  };
  if (o.robots > o.cobots) {
    add("Guard door interlock stops the robot", 2, 1, 2, "Serious injury possible; doors are opened for maintenance and faults, not every cycle; a moving robot cannot be avoided");
    add("Light curtain / scanner at the operator load station", 2, 2, 1, "Operator loads every cycle (frequent), but the robot works on the far side or at reduced speed, so the hazard can be avoided");
    add("Emergency stop at every station", 2, 1, 2, "Complementary measure; designed to at least the level of the functions it backs up");
  }
  if (o.cobots) add("Collaborative power and force limiting (ISO/TS 15066)", 1, 2, 1, "Contact is frequent but limited to transient forces below body-region limits; ISO 10218 still asks for PL d");
  if (o.palletizing) add("Pallet-change zone: light-curtain muting while the robot stacks elsewhere", 2, 1, 2, "A pallet is changed a few times an hour; a robot entering the zone cannot be avoided");
  if (o.press) add("Press and robot interlock (no stroke with the robot in the die)", 2, 2, 2, "A press stroke can kill and happens every cycle; press safety usually needs PL e");
  if (o.mobile) add("Mobile base personnel detection (ISO 3691-4)", 2, 2, 1, "People share the aisles; speed and scanner fields let the AMR stop in time");
  if (o.kinds.includes("welding")) add("Arc-on only with the welding area closed", 2, 2, 1, "Arc flash and fumes; screens and interlocks keep people out while welding");
  return out;
}

/* ------------------------------------------------------------------- FMEA */

export interface FailureMode { mode: string; effect: string; cause: string; s: number; o: number; d: number; action: string }
/** Typical failure modes per kind of task, with severity, occurrence and detection (1–10). */
export const FMEA: Record<ProcessKind, FailureMode[]> = {
  handling: [
    { mode: "Part dropped", effect: "Damaged part, line stop, injury risk", cause: "Grip lost at high acceleration or air drop", s: 7, o: 4, d: 4, action: "Size grip force with safety factor 2; non-return valves; part-present sensor checked during the move" },
    { mode: "Wrong pick position", effect: "Missed pick, collision", cause: "Parts not where expected", s: 5, o: 5, d: 3, action: "Nests or fixtures with locating pins, or vision; slow approach with check" },
    { mode: "Double pick", effect: "Jam, damaged parts", cause: "Parts stick together (oil, film)", s: 6, o: 3, d: 5, action: "Separation step and a double-part sensor or weight check" },
  ],
  transport: [
    { mode: "Collision in the shared path", effect: "Damage, injury", cause: "People or forklifts in the path", s: 8, o: 3, d: 3, action: "Safety scanners, marked aisles, speed zones" },
    { mode: "Transfer stops", effect: "Line starved", cause: "No buffer between stations", s: 4, o: 5, d: 2, action: "Buffers sized for 5–10 minutes" },
  ],
  welding: [
    { mode: "Seam missed or off-line", effect: "Weak weld, rework or scrap", cause: "Fit-up gaps, part or fixture variation", s: 8, o: 5, d: 5, action: "Accurate fixtures, touch sensing and seam tracking; control cutting upstream" },
    { mode: "Burn-back / wire stick", effect: "Stop, torch damage", cause: "Worn contact tip, wire feed problems", s: 5, o: 6, d: 3, action: "Tip change schedule, wire-stick detection, torch cleaning every cycle or few cycles" },
    { mode: "Porosity", effect: "Weak weld found late", cause: "Gas coverage lost, spatter in the nozzle", s: 7, o: 4, d: 6, action: "Gas flow monitoring, nozzle cleaning, sample cut-and-etch checks" },
  ],
  machining: [
    { mode: "Part not seated in chuck or vice", effect: "Scrap, tool or machine crash", cause: "Chips on the locating faces", s: 9, o: 4, d: 4, action: "Air blow-off before loading; part-seated air gauge; chuck-closed signal" },
    { mode: "Robot enters while the machine is not ready", effect: "Crash", cause: "Missing or wrong interlock", s: 9, o: 2, d: 3, action: "Door-open and cycle-complete handshake with timeouts" },
    { mode: "Gripper picks the wrong side", effect: "Wrong orientation, scrap", cause: "Double gripper sequence error", s: 6, o: 3, d: 4, action: "Sensors on both gripper sides; recipe-based sequence" },
  ],
  finishing: [
    { mode: "Uneven finish", effect: "Rework, reject", cause: "Part variation, abrasive wear", s: 6, o: 6, d: 4, action: "Force control or compliant tool; abrasive wear compensation; part scan" },
    { mode: "Gouge or burn", effect: "Scrap", cause: "Too much force or dwell", s: 7, o: 3, d: 5, action: "Force limit, constant feed, tested recipes per part" },
    { mode: "Dust build-up", effect: "Fire or explosion (aluminium), robot wear", cause: "Weak extraction", s: 9, o: 3, d: 4, action: "ATEX-rated extraction where needed; covers and cleaning plan" },
  ],
  coating: [
    { mode: "Runs, sags or thin spots", effect: "Rework", cause: "Wrong gun distance, speed or overlap", s: 6, o: 5, d: 4, action: "Recipes per part; flow and pressure monitoring; film thickness checks" },
    { mode: "Gun or valve blocked", effect: "Missing coating", cause: "Material curing in the nozzle", s: 7, o: 4, d: 3, action: "Cleaning cycle and purge; flow-loss alarm" },
    { mode: "Fire in the booth", effect: "Plant damage", cause: "Solvent vapour and ignition", s: 10, o: 2, d: 3, action: "ATEX-rated robot and booth, grounding, fire detection and suppression" },
  ],
  inspection: [
    { mode: "False reject", effect: "Good parts scrapped", cause: "Lighting or position changes", s: 4, o: 6, d: 3, action: "Enclosed lighting, fixed presentation, golden-sample checks each shift" },
    { mode: "Missed defect", effect: "Bad part reaches the customer", cause: "Resolution or recipe not tuned", s: 8, o: 3, d: 7, action: "Size the camera for the smallest defect; test with known-bad parts" },
  ],
  palletizing: [
    { mode: "Unstable stack", effect: "Collapse in transport", cause: "Wrong pattern, poor cartons", s: 7, o: 4, d: 4, action: "Interlocked patterns, slip sheets, layer height check, stretch wrap" },
    { mode: "Carton dropped", effect: "Product damage", cause: "Vacuum leak on dusty or porous cartons", s: 6, o: 4, d: 3, action: "Vacuum level monitoring; foam pads; clamp or fork grippers for bags" },
  ],
  packing: [
    { mode: "Product misplaced in the box", effect: "Short or damaged pack", cause: "Product position varies on the belt", s: 6, o: 5, d: 4, action: "Vision on the belt with conveyor tracking; count check before closing" },
    { mode: "Carton not formed", effect: "Line stop", cause: "Carton blank quality", s: 4, o: 5, d: 2, action: "Carton magazine checks; operator alerts before running out" },
  ],
  assembly: [
    { mode: "Part jams on insertion", effect: "Damaged parts, stop", cause: "Tolerance stack, misalignment", s: 6, o: 5, d: 4, action: "Chamfers, compliance or force control, vision alignment" },
    { mode: "Wrong or missing part", effect: "Faulty product", cause: "Feeder mix-up", s: 8, o: 3, d: 4, action: "Part-present and part-type checks; poka-yoke nests" },
    { mode: "Screw not tightened right", effect: "Loose joint in the field", cause: "Cross-thread, wrong torque", s: 8, o: 4, d: 3, action: "Torque-angle monitoring and reject on bad curve" },
  ],
  filling: [
    { mode: "Over- or under-fill", effect: "Giveaway or legal short weight", cause: "Dosing drift, foam", s: 7, o: 4, d: 3, action: "Check-weigher feedback to dosing; recipe per product" },
    { mode: "Spill", effect: "Contamination, cleaning stop", cause: "Container not under the nozzle", s: 5, o: 4, d: 3, action: "Container-present sensor; drip-free valves" },
  ],
  sealing: [
    { mode: "Cap loose or cross-threaded", effect: "Leaks, returns", cause: "Torque or alignment", s: 7, o: 4, d: 3, action: "Torque monitoring; cap orientation check" },
  ],
  labeling: [
    { mode: "Label wrong or crooked", effect: "Rejects, compliance issue", cause: "Wrong job data, product position", s: 6, o: 4, d: 3, action: "Print-and-verify camera; data from the MES / WMS" },
  ],
};
export const fmeaFor = (kinds: ProcessKind[], n = 6) =>
  kinds
    .flatMap((k) => FMEA[k].map((m) => ({ ...m, kind: k, rpn: m.s * m.o * m.d })))
    .sort((a, b) => b.rpn - a.rpn)
    .slice(0, n);

/* ------------------------------------------------------------ decision matrix */

export interface Option { name: string; scores: number[]; total: number }
/** Approaches compared on weighted criteria; weights follow the brief (volume, variety, weight, hazards). */
export function decisionMatrix(f: BriefFacts, o: { robots: number; robotLabel?: string; kinds: ProcessKind[] }) {
  const rate = f.partsPerHour ?? 0;
  const kg = f.weightKg ?? 10;
  const hazardous = f.explosive || o.kinds.some((k) => ["welding", "coating", "finishing"].includes(k));
  const criteria = [
    { name: "Investment", weight: 2 },
    { name: "Output", weight: rate > 1200 ? 4 : rate > 600 ? 3 : 2 },
    { name: "Flexibility", weight: f.variants ? 3 : 1 },
    { name: "Payload fit", weight: kg > 25 ? 3 : 1 },
    { name: "Safety & ergonomics", weight: hazardous || kg > 20 ? 3 : 2 },
    { name: "Floor space", weight: 1 },
  ];
  const robotName = o.robotLabel ?? (o.robots > 1 ? `Robot line (${o.robots} robots)` : "Industrial robot cell");
  // Scores 1–5 per criterion, in the order above.
  const options: Omit<Option, "total">[] = [
    { name: "Manual with lift assist and fixtures", scores: [5, 1, 5, kg > 23 ? 2 : 4, hazardous || kg > 20 ? 1 : 3, 4] },
    { name: "Cobot cell", scores: [4, rate > 300 ? 1 : 2, 5, kg <= 12 ? 5 : kg <= 25 ? 3 : 1, 4, 5] },
    { name: robotName, scores: [3, rate > 1500 ? 3 : 4, 4, kg <= 500 ? 5 : kg <= 1000 ? 3 : 1, 5, 3] },
    { name: "Gantry / linear robot", scores: [2, 3, 3, kg > 500 ? 5 : 3, 5, 4] },
    { name: "Special-purpose machine", scores: [2, rate > 1200 ? 5 : 4, 1, 4, 5, 3] },
  ];
  const sumW = criteria.reduce((n, c) => n + c.weight, 0);
  const ranked = options
    .map((x) => ({ ...x, total: Math.round((x.scores.reduce((n, s, i) => n + s * criteria[i].weight, 0) / (sumW * 5)) * 100) }))
    .sort((a, b) => b.total - a.total);
  const [best, next] = ranked;
  const lead = criteria
    .map((c, i) => ({ c: c.name, gain: (best.scores[i] - next.scores[i]) * c.weight }))
    .filter((x) => x.gain > 0)
    .sort((a, b) => b.gain - a.gain)
    .slice(0, 2)
    .map((x) => x.c.toLowerCase());
  const why = `${best.name} scores ${best.total}/100 against ${next.name} at ${next.total}${lead.length ? `, mainly on ${lead.join(" and ")}` : ""}. Heavier weights: ${criteria
    .filter((c) => c.weight >= 3)
    .map((c) => c.name.toLowerCase())
    .join(", ") || "none — a balanced brief"}.`;
  return { criteria, options: ranked, pick: best.name, why };
}

/* ------------------------------------------------------------- the review */

export interface ReviewItem { item: string; status: "ok" | "check"; note: string }

export interface EngineerThinking {
  method: string[];
  decision: ReturnType<typeof decisionMatrix>;
  /** processLed: the process (weld, grind, coat…) sets the time, not robot travel. */
  motion: { station: string; ruleS: number | null; motionS: number; cls: string; note: string; processLed: boolean }[];
  balance: ReturnType<typeof lineBalance>;
  safety: SafetyFunction[];
  fmea: (FailureMode & { kind: ProcessKind; rpn: number })[];
  review: ReviewItem[];
  sensitivity: string[];
}

const CARRIES: ProcessKind[] = ["handling", "transport", "machining", "palletizing", "packing", "inspection"];
const TRAVEL: Partial<Record<ProcessKind, number>> = { palletizing: 1.8, transport: 2, machining: 1.4 };
const gripperOf = (tooling: string): PickPlace["gripper"] =>
  /vacuum|suction|cup/i.test(tooling) ? "vacuum" : /magnet/i.test(tooling) ? "magnet" : /fork|sack|bag|clamp/i.test(tooling) ? "fork" : "parallel";

/**
 * People a rate needs by hand: with breaks, one loader moves about 150 heavy (over 20 kg),
 * 300 medium (over 5 kg) or 600 light parts an hour. This is the crew a handling robot replaces.
 */
export function manualCrew(partsPerHour: number | null, kg: number | null): number {
  if (!partsPerHour) return 0;
  const pace = (kg ?? 0) > 20 ? 150 : (kg ?? 0) > 5 ? 300 : 600;
  return Math.ceil(partsPerHour / pace);
}

/** Payback against what Indian plants usually accept: under 3 years is easy to approve, over 5 years needs a reason. */
function paybackReview(text: string): ReviewItem {
  // The middle of the range, so a wide range is not judged on its best case.
  const nums = (text ?? "").match(/\d+(?:\.\d+)?/g)?.slice(0, 2).map(Number) ?? [];
  const mid = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : NaN;
  const months = /year/i.test(text ?? "") ? mid * 12 : mid;
  if (!Number.isFinite(months) || months <= 0) return { item: "Payback", status: "check", note: "Set the operators per shift and shifts a day to work out payback" };
  if (months <= 36) return { item: "Payback", status: "ok", note: `About ${Math.round(months)} months on average — within the 3 years most plants approve` };
  if (months <= 60) return { item: "Payback", status: "check", note: `About ${Math.round(months)} months on average — justify with quality, safety and output, not labour alone` };
  return {
    item: "Payback",
    status: "check",
    note: `Over 5 years on labour alone — confirm the operators replaced per shift, add a shift, start with the bottleneck station, or consider a refurbished robot`,
  };
}

/** The engineer's thinking for a plan (built-in or AI): decision, motion check, balance, safety, FMEA, review, sensitivity. */
export function thinkSolution(s: AiSolution, brief: string, extra: { robots?: number; cobots?: number } = {}): EngineerThinking {
  const f = extractFacts(brief);
  const kinds = [...new Set(s.stations.map((st) => processKind({ name: st.skill || st.name })))];
  const robots = extra.robots ?? Math.max(1, s.stations.length);
  const cobots = extra.cobots ?? s.stations.filter((st) => /cobot|collaborative/i.test(st.equipment)).length;

  // One station doubled up to reach the rate is parallel cells, not a line.
  const robotLabel = s.stations.length === 1 && robots > 1 ? `${robots} parallel robot cells` : undefined;
  const decision = decisionMatrix(f, { robots, robotLabel, kinds });

  // Motion check: the typical cycle against a cycle worked out from the robot's motion.
  const motion = s.stations.map((st) => {
    const kind = processKind({ name: st.skill || st.name });
    const payload = st.payload_kg ?? 10;
    const cls = classOf(payload, st.equipment);
    if (!CARRIES.includes(kind) || (kind === "machining" && PROCESS_HEAD.test(st.skill || st.name)))
      return { station: st.name, ruleS: st.cycle_s, motionS: st.cycle_s ?? 0, cls: MOTION[cls].label, processLed: true, note: "Process time (weld, grind, coat, assemble) sets this cycle, not robot travel — time it from the path length and process speed" };
    const est = pickPlaceCycle({
      travelM: TRAVEL[kind] ?? 1.2,
      partKg: f.weightKg ?? payload * 0.6,
      robotPayloadKg: payload,
      cls,
      gripper: gripperOf(st.tooling),
      processS: kind === "machining" ? 4 : kind === "inspection" ? 1 : 0,
    });
    const rule = st.cycle_s;
    const gap = rule ? est.total / rule : 1;
    const note =
      !rule ? `About ${est.total.toFixed(1)} s from motion` : gap > 1.25
        ? `Motion needs ${est.total.toFixed(1)} s, more than the ${rule} s planned — shorten travel, use a faster robot class or add a robot`
        : gap < 0.6
          ? `Motion needs only ${est.total.toFixed(1)} s; the ${rule} s planned includes waiting for parts or the machine`
          : `Motion (${est.total.toFixed(1)} s) agrees with the ${rule} s planned`;
    return { station: st.name, ruleS: rule, motionS: Math.round(est.total * 10) / 10, cls: MOTION[cls].label, processLed: false, note };
  });

  const cycles = motion.map((m, i) => ({ station: m.station, cycleS: Math.max(m.ruleS ?? 0, m.motionS, 0.5) || s.stations[i].cycle_s || 10 }));
  const balance = lineBalance(cycles, f.partsPerHour);

  const safety = safetyFunctions({
    kinds,
    robots,
    cobots,
    press: /press|stamp|forg/i.test(brief + s.tasks.join(" ")),
    mobile: /mobile|amr|agv/i.test(brief + s.tasks.join(" ")),
    palletizing: kinds.includes("palletizing"),
  });
  const fmea = fmeaFor(kinds);

  const payloadOk = s.stations.every((st) => st.payload_kg == null || f.weightKg == null || !CARRIES.includes(processKind({ name: st.skill || st.name })) || st.payload_kg >= f.weightKg * 1.25);
  const cycleOk = !balance.takt || balance.rows.every((r) => r.utilisation <= 0.85 + 1e-9);
  const review: ReviewItem[] = [
    { item: "Payload margin (part + tool × 1.25)", status: payloadOk ? "ok" : "check", note: payloadOk ? "Every part-carrying robot has 25 % or more headroom" : "A robot is under 125 % of part + tool — choose the next size" },
    {
      item: "Cycle against takt (design to 85 %)",
      status: cycleOk ? "ok" : "check",
      note: balance.takt ? `Takt ${balance.takt.toFixed(1)} s; ${balance.rows.map((r) => `${r.station} ${Math.round(r.utilisation * 100)} %`).join(", ")}` : "No output target given — set one to size the line",
    },
    { item: "Reach and layout", status: "check", note: "Keep every station within about 80 % of rated reach and away from wrist singularities; check in the 3D layout" },
    { item: "Wrist moment and inertia", status: (f.weightKg ?? 0) > 25 ? "check" : "ok", note: (f.weightKg ?? 0) > 25 ? "Heavy part: check the wrist moment (weight × offset) and inertia in the robot maker's load diagram" : "Light part: wrist load normally within limits" },
    { item: "Cables and dress pack", status: kinds.some((k) => ["welding", "coating", "finishing"].includes(k)) ? "check" : "ok", note: "Continuous paths need a hollow wrist or a dress pack that cannot snag" },
    { item: "Fault recovery", status: "check", note: "Home routine from any step, clear alarms, and restart after a power cut without manual jogging" },
    { item: "Changeover", status: f.variants ? "check" : "ok", note: f.variants ? "Quick-change tooling, recipes and part recognition; target changeover under 10 minutes" : "One part family — keep a spare gripper set" },
    { item: "Maintenance access", status: "check", note: "Door and space to reach the gripper, cables and robot base; lockout point outside the fence" },
    paybackReview(s.roi.payback_months),
    { item: "Safety level", status: "ok", note: `${safety.length} safety function${safety.length === 1 ? "" : "s"}; highest PLr ${safety.reduce<PL>((m, x) => maxPL(m, x.required), "a")}` },
  ];

  const kg = f.weightKg;
  const robotsNow = balance.rows.reduce((n, r) => n + r.robots, 0);
  const robotsDouble = f.partsPerHour ? lineBalance(cycles, f.partsPerHour * 2).rows.reduce((n, r) => n + r.robots, 0) : 0;
  const classNow = kg != null ? classOf(Math.ceil(kg * 1.25 + 5)) : null;
  const classHeavy = kg != null ? classOf(Math.ceil(kg * 1.5 * 1.25 + 5)) : null;
  const sensitivity = [
    f.partsPerHour
      ? robotsDouble > robotsNow
        ? `If output doubles to ${f.partsPerHour * 2}/h, the line needs ${robotsDouble} robots instead of ${robotsNow}.`
        : `Output can double to ${f.partsPerHour * 2}/h with the same ${robotsNow} robot${robotsNow === 1 ? "" : "s"} — there is spare capacity.`
      : `At the planned cycles the line makes about ${balance.capacityPerHour} parts/h at ${Math.round(balance.oee * 100)} % OEE; above that, add a robot at ${balance.bottleneck}.`,
    kg != null && classNow && classHeavy
      ? classHeavy !== classNow
        ? `If the part is 50 % heavier (${Math.round(kg * 1.5)} kg), the robot moves up from a ${MOTION[classNow].label} to a ${MOTION[classHeavy].label}.`
        : `A part up to 50 % heavier (${Math.round(kg * 1.5)} kg) still fits a ${MOTION[classNow].label}.`
      : "The part weight decides the robot class — confirm it before ordering.",
    f.variants ? "With more variants, quick-change tooling and vision cost about 10–15 % more but keep changeovers short." : "If variants are added later, plan a tool changer and recipe selection now (small cost now, large later).",
    f.cobotWanted && (kg ?? 0) > 20 ? "Above about 25 kg a cobot no longer fits: the decision changes to a fenced robot." : "A third shift shortens payback by about a third, because the same cell replaces more operator hours.",
  ];

  const method = [
    "Read the brief and list the facts and gaps",
    "Choose the approach with a weighted decision matrix",
    "Size each robot: part + tool × 1.25, then reach",
    "Check every cycle from the robot's motion",
    "Balance the line against takt at 85 % OEE",
    "Set the safety level of each safety function (ISO 13849-1)",
    "Run an FMEA and act on the highest risks",
    "Review the design and test what would change it",
  ];
  return { method, decision, motion, balance, safety, fmea, review, sensitivity };
}
