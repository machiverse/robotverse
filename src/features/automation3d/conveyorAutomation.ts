/**
 * Automation Studio — conveyor pick and place, planned the way an integrator plans it.
 *
 * From the conveyor, the product, the feed, the pick mode and the robot and gripper the user chose: check what
 * cannot work, write the sequence (feed → convey → sense → pick → transfer → place → repeat) with the signals each
 * step waits for or sets, list the I/O, and hand the simulator the settings to run it (robotSim setAutomation).
 * Nothing here controls a real machine: the signals are the ones an integrator would wire, simulated.
 * Research and sources: docs/automation-studio-conveyor.md.
 */

import { beltConfig, SIGNALS, signalsFor, stopDistance, type BeltOptions } from "./conveyorLogic.js";
import { eoatKind } from "./robotSim.js";
import { productFor, productInfo } from "./workpieces.js";
import { brandOf } from "./robotSystem";
import { extractFacts } from "./solutionEngine";
import { GRIPPER_RULES, matchAll, matchFirst, ROBOT_TYPE_RULES, VISION_RULES } from "./automationKnowledge";
import type { StationKey } from "./cellProgram";

export type PickMode = "index" | "track";
export type InfeedSide = "left" | "right";

/** What the user sets up: the conveyor, the product on it, how parts come and how the robot picks them. */
export interface ConveyorSetup {
  conveyor: {
    /** Belt length end to end (m). */
    length: number;
    /** Belt width (m). */
    width: number;
    /** Height of the belt top above the floor (m). */
    height: number;
    /** Belt speed (m/s). */
    speed: number;
    /** Which side of the robot the belt comes from; parts flow towards the robot. */
    side: InfeedSide;
  };
  product: {
    key: string;
    /** [length along the belt, height, width across] in m; defaults to the product's own size. */
    size?: [number, number, number];
    kg?: number;
  };
  feed: {
    /** Parts per minute from the feeder; 0 = as fast as the gap allows. */
    rate: number;
    /** Minimum gap between parts (m). */
    gap: number;
  };
  mode: PickMode;
  /** Vision inspection: the share of parts the camera fails (simulated), 0 = no camera. Failed parts go to the reject bin. */
  rejectRate?: number;
}

export interface AutomationInput {
  setup: ConveyorSetup;
  robot?: { name: string; brand?: string; payloadKg?: number | null; reachMm?: number | null } | null;
  tool?: { name: string; type?: string | null } | null;
  /** Typical weight of the gripper (kg), when the caller knows it better (attachmentFit.toolWeightKg). */
  toolKg?: number;
  /** Where the robot puts the part: pallet, carton, outfeed, table, machine… */
  destination?: string | null;
  /** Robots on the line: the infeed can come from the right only with one. */
  robots?: number;
}

export interface AutomationIssue {
  level: "stop" | "warn" | "info";
  text: string;
}
export interface AutomationStep {
  n: number;
  stage: "Feed" | "Convey" | "Inspect" | "Sense" | "Pick" | "Transfer" | "Place" | "Repeat";
  title: string;
  detail: string;
  signals: string[];
}
export interface AutomationPlan {
  ok: boolean;
  mode: PickMode;
  issues: AutomationIssue[];
  sequence: AutomationStep[];
  io: { tag: string; from: string; to: string; device: string; text: string }[];
  estimate: {
    /** Product pitch on the belt (m), and the most parts a minute the belt can carry at this speed. */
    pitch: number;
    beltMaxPerMin: number;
    /** Stop and pick: seconds from PICK_DONE until the next part is at rest at the pick position. */
    indexSeconds: number | null;
    brakingMm: number;
    /** Seconds between parts from the feeder; null = continuous. */
    feedInterval: number | null;
  };
  /** Settings for the simulator (robotSim setAutomation). */
  sim: {
    infeed: { length: number; width: number; height: number; side: InfeedSide };
    belt: BeltOptions;
    product: { key: string; size: [number, number, number]; kg: number };
  };
}

/** Products that travel on a belt conveyor, for the setup's product list. */
export const CONVEYOR_PRODUCTS = [
  "carton", "parcel", "tote", "block", "casting", "housing", "bracket", "gear", "bearing", "valve", "elbow",
  "moulded", "module", "can", "jar", "bottle", "pack", "pouch", "mealtray", "brick",
];

const GRIP = ["parallel", "dual", "vacuum", "magnet", "fork"];
const GRIP_NAME: Record<string, string> = { parallel: "finger gripper", dual: "dual gripper", vacuum: "vacuum gripper", magnet: "magnetic gripper", fork: "fork / clamp gripper" };
/** How the robot knows it holds the part, per gripper family. */
const GRIP_SENSOR: Record<string, string> = {
  vacuum: "vacuum switch on the vacuum generator",
  magnet: "part-present sensor in the magnet face",
  parallel: "jaw position sensors (jaws stopped on the part, not fully closed)",
  dual: "jaw position sensors (jaws stopped on the part, not fully closed)",
  fork: "clamp position sensors and a part-present sensor",
};
/** The conveyor tracking option of each robot maker. */
const TRACKING: Record<string, string> = {
  FANUC: "FANUC Line Tracking with iRPickTool",
  ABB: "ABB Conveyor Tracking with PickMaster",
  KUKA: "KUKA.ConveyorTech",
  Yaskawa: "Yaskawa conveyor tracking (conveyor synchronization)",
  "Universal Robots": "conveyor tracking in UR PolyScope",
  Kawasaki: "Kawasaki conveyor synchronization",
  Epson: "Epson RC+ conveyor tracking",
  DENSO: "DENSO conveyor tracking",
  "Stäubli": "Stäubli conveyor tracking",
  "Mitsubishi Electric": "Mitsubishi conveyor tracking",
};

const round = (v: number, d = 2) => Math.round(v * 10 ** d) / 10 ** d;
const mm = (m: number) => `${Math.round(m * 1000)} mm`;
export const kgText = (kg: number) => (kg >= 1 ? `${round(kg, 1)} kg` : `${Math.round(kg * 1000)} g`);
const clampN = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** Seconds to move a belt `d` metres from rest to rest. */
function moveTime(d: number, v: number, a: number, b: number) {
  if (d <= 0) return 0;
  const ramps = (v * v) / (2 * a) + (v * v) / (2 * b);
  if (d >= ramps) return d / v + v / (2 * a) + v / (2 * b);
  const vp = Math.sqrt((2 * d * a * b) / (a + b));
  return vp / a + vp / b;
}

/** A good starting setup for a product: a belt it fits on, a calm speed and a gap the photo-eye can see. */
export function defaultSetup(productKey = "carton"): ConveyorSetup {
  const info = productInfo({ key: productKey });
  const [w, , d] = info.size;
  return {
    conveyor: { length: 2, width: Math.max(0.3, Math.ceil((d + 0.08) * 20) / 20), height: 0.78, speed: info.kg > 20 ? 0.2 : 0.3, side: "left" },
    product: { key: info.key, size: info.size, kg: info.kg },
    feed: { rate: 0, gap: round(clampN(w * 0.6, 0.08, 0.3)) },
    mode: "index",
  };
}

/** Check the setup, write the sequence and the I/O, and the simulator's settings. */
export function planConveyorAutomation(input: AutomationInput): AutomationPlan {
  const { setup } = input;
  const issues: AutomationIssue[] = [];
  const info = productInfo({ key: setup.product.key });
  const size: [number, number, number] = setup.product.size?.every((v) => v > 0) ? setup.product.size : info.size;
  const kg = setup.product.kg && setup.product.kg > 0 ? setup.product.kg : info.kg;
  const [pl, ph, pd] = size;
  const cv = setup.conveyor;
  const mode = setup.mode;
  const speed = clampN(cv.speed, 0.02, 2);
  const gap = clampN(setup.feed.gap, 0.005, 5);
  const rate = Math.max(0, setup.feed.rate || 0);
  const decel = 1.5;
  const accel = 1.2;

  // The robot and its gripper.
  const robot = input.robot;
  const toolText = input.tool ? `${input.tool.name} ${input.tool.type ?? ""}` : "";
  const grip = input.tool ? eoatKind(toolText) : null;
  const gripName = grip ? GRIP_NAME[grip] ?? "tool" : "gripper";
  if (!robot) issues.push({ level: "stop", text: "Add a robot to the cell: drag one from the library onto the floor." });
  if (!input.tool) issues.push({ level: "stop", text: `Put a gripper on the robot: a ${GRIP_NAME[info.grip] ?? "gripper"} suits the ${info.label.toLowerCase()}.` });
  else if (!grip || !GRIP.includes(grip)) issues.push({ level: "stop", text: `${input.tool.name} is not a gripper: the robot needs a vacuum, finger or magnetic gripper to pick from the belt.` });
  else if (info.grip !== grip && !(info.grip === "parallel" && grip === "dual")) issues.push({ level: "warn", text: `The ${info.label.toLowerCase()} is usually picked with a ${GRIP_NAME[info.grip] ?? info.grip}; check that the ${gripName} holds it.` });

  const toolKg = input.toolKg ?? (grip === "fork" ? 25 : grip === "magnet" ? 6 : grip === "vacuum" ? 1.5 : 1.2);
  const payload = robot?.payloadKg ?? null;
  if (robot && payload) {
    const load = kg + toolKg;
    if (load > payload) issues.push({ level: "stop", text: `Too heavy for the robot: part ${kgText(kg)} + gripper about ${kgText(toolKg)} = ${kgText(load)}, the ${robot.name} carries ${kgText(payload)}.` });
    else if (load > payload * 0.8) issues.push({ level: "warn", text: `Part and gripper use ${Math.round((100 * load) / payload)}% of the robot's ${kgText(payload)} payload; leave about 20% for fast moves.` });
  } else if (robot) issues.push({ level: "info", text: `The ${robot.name}'s payload is not listed: confirm it carries ${kgText(kg + toolKg)} (part + gripper).` });

  // The belt.
  if (cv.width < pd + 0.04) issues.push({ level: "stop", text: `The belt is too narrow: the part is ${mm(pd)} wide and needs at least ${mm(pd + 0.04)} between the guide rails.` });
  if (cv.height < 0.5 || cv.height > 1.1) issues.push({ level: "warn", text: `A belt top at ${mm(cv.height)} is outside the usual 500–1100 mm; check the robot's reach and the operators' work height.` });
  const useful = cv.length - 0.26;
  if (useful < pl + gap + 0.1) issues.push({ level: "stop", text: `The belt is too short for this part: make it at least ${round(pl + gap + 0.36, 2)} m long.` });
  if (mode === "index" && speed > 0.5) issues.push({ level: "warn", text: `Stopping a belt from ${speed} m/s at every part shakes the product; above 0.5 m/s use soft stops or conveyor tracking.` });
  if (mode === "track" && speed > 0.8) issues.push({ level: "warn", text: `At ${speed} m/s the robot must follow the belt fast; check the robot's tracking speed with its maker.` });
  if (gap < 0.02) issues.push({ level: "warn", text: `A ${mm(gap)} gap is too small for the photo-eye to see the parts apart; leave at least 20 mm.` });
  if (setup.conveyor.side === "right" && (input.robots ?? 1) > 1) issues.push({ level: "info", text: "With more than one robot the line flows left to right: the infeed comes from the left." });

  const pitch = pl + gap;
  const beltMaxPerMin = (60 * speed) / pitch;
  if (rate > beltMaxPerMin) issues.push({ level: "warn", text: `The belt carries at most ${Math.floor(beltMaxPerMin)} parts a minute at ${speed} m/s with a ${mm(gap)} gap; the feeder will wait.` });
  const restartDelay = 0.25;
  const indexSeconds = mode === "index" ? round(restartDelay + moveTime(pitch, speed, accel, decel), 2) : null;

  // Conveyor tracking needs the robot maker's option and an encoder on the belt.
  if (mode === "track") {
    const brand = brandOf(`${robot?.brand ?? ""} ${robot?.name ?? ""}`);
    const opt = TRACKING[brand];
    if (opt) issues.push({ level: "info", text: `Conveyor tracking needs ${opt} on the robot controller and an encoder on the belt drive.` });
    else issues.push({ level: "warn", text: "Check that this robot's controller offers conveyor tracking; if not, use stop and pick." });
  }

  const dest = input.destination ?? null;
  if (!dest) issues.push({ level: "stop", text: "Choose where the robot puts the part: a pallet, a carton, an outfeed conveyor, a table or a machine." });
  const destName = !dest ? "destination" : ({ pallet: "pallet", carton: "carton", out: "outfeed conveyor", table: "work table", cnc: "CNC machine", press: "press", mould: "moulding machine", test: "test station", marker: "laser marker", vision: "vision station", weld: "welding fixture" } as Record<string, string>)[dest.replace(/_\d+$/, "")] ?? dest;

  const sensor = GRIP_SENSOR[grip ?? info.grip] ?? "grip sensor";
  const braking = stopDistance(speed, decel);
  const rejectRate = Math.max(0, Math.min(0.9, setup.rejectRate ?? 0));
  if (rejectRate > 0)
    issues.push({ level: "info", text: `A camera checks every part; about ${Math.round(rejectRate * 100)}% fail in this simulation (an assumption, not a measurement) and run past the robot into the reject bin.` });
  const steps: Omit<AutomationStep, "n">[] = [
    {
      stage: "Feed", title: "Feeder releases a part",
      detail: rate > 0 ? `One part every ${round(60 / rate, 1)} s, only when the belt entry is clear by ${mm(gap)}.` : `A part whenever the belt entry is clear by ${mm(gap)}.`,
      signals: ["FEED"],
    },
    {
      stage: "Convey", title: "Belt carries it to the robot",
      detail: mode === "index"
        ? `CONV_RUN on: the belt runs at ${speed} m/s (starts at ${accel} m/s², brakes at ${decel} m/s²).`
        : `The belt runs at ${speed} m/s and never stops; the encoder reports belt travel to the robot.`,
      signals: mode === "index" ? ["CONV_RUN", "CONV_RUNNING"] : ["CONV_RUN", "ENC"],
    },
    ...(rejectRate > 0
      ? [{ stage: "Inspect" as const, title: "Camera checks every part", detail: "The vision camera passes or fails each part as it goes by (VISION_OK / VISION_NG). The PLC keeps the verdict with the part: a failed part is never offered to the robot and runs off the end of the belt into the reject bin.", signals: ["VISION_OK", "VISION_NG"] }]
      : []),
    mode === "index"
      ? { stage: "Sense", title: "Photo-eye stops it at the pick position", detail: `PE1 sees the part ${mm(braking + 0.03)} before the pick position; the PLC drops CONV_RUN and the part comes to rest where the robot picks, then PART_READY goes on.`, signals: ["PE1", "CONV_RUN", "PART_READY"] }
      : { stage: "Sense", title: "Photo-eye registers it for tracking", detail: "PE1 is the sync switch: each part is queued with the encoder count when it breaks the beam, so the robot knows where it is all along the belt.", signals: ["PE1", "ENC"] },
    mode === "index"
      ? { stage: "Pick", title: "Robot picks the part", detail: `The robot waits above the pick position. On PART_READY it moves down (ROBOT_IN_ZONE on: the belt may not move), closes the ${gripName} (GRIP_CMD) and lifts only once the ${sensor} confirms the grip (GRIP_OK). Clear of the belt it sends PICK_DONE and the PLC restarts the conveyor.`, signals: ["ROBOT_IN_ZONE", "GRIP_CMD", "GRIP_OK", "PICK_DONE"] }
      : { stage: "Pick", title: "Robot follows and picks the part", detail: `The robot waits at the start of its tracking window. When a part enters it, the robot matches the belt speed, moves down onto the moving part, closes the ${gripName} (GRIP_CMD), waits for the ${sensor} (GRIP_OK) and lifts while still following the belt. A part that leaves the window unpicked runs into the reject bin.`, signals: ["ENC", "GRIP_CMD", "GRIP_OK"] },
    { stage: "Transfer", title: `Carries it to the ${destName}`, detail: "The part is fixed to the tool: it moves with the gripper and never floats. GRIP_OK is watched on the way; a lost part stops the robot.", signals: ["GRIP_OK"] },
    { stage: "Place", title: `Places it on the ${destName}`, detail: "Straight down onto the place position, GRIP_CMD off, the part is released where it sits, then the robot lifts clear.", signals: ["GRIP_CMD", "GRIP_OK"] },
    { stage: "Repeat", title: "Back for the next part", detail: mode === "index" ? "Returns above the pick position and waits for the next PART_READY." : "Returns to the start of the tracking window for the next part.", signals: [] },
  ];
  const sequence: AutomationStep[] = steps.map((x, i) => ({ ...x, n: i + 1 }));

  const io = signalsFor(mode, rejectRate > 0).map((tag) => {
    const s = SIGNALS.find((x) => x.tag === tag)!;
    if (tag === "GRIP_OK") return { ...s, device: sensor[0].toUpperCase() + sensor.slice(1) };
    if (tag === "PE1") return { ...s, device: mode === "index" ? "Photo-eye at the pick position (retro-reflective, polarised for shiny parts)" : "Photo-eye upstream of the robot, the sync switch for tracking" };
    return s;
  });

  const belt = beltConfig({ length: useful, partLength: pl, speed, accel, decel, mode, gap, feedRate: rate, restartDelay });
  return {
    ok: !issues.some((i) => i.level === "stop"),
    mode,
    issues,
    sequence,
    io,
    estimate: { pitch: round(pitch, 3), beltMaxPerMin: round(beltMaxPerMin, 1), indexSeconds, brakingMm: Math.round(braking * 1000), feedInterval: rate > 0 ? round(60 / rate, 2) : null },
    sim: {
      infeed: { length: round(cv.length, 3), width: round(Math.max(cv.width, pd + 0.02), 3), height: round(clampN(cv.height, 0.4, 1.3), 3), side: (input.robots ?? 1) > 1 ? "left" : cv.side },
      belt: { speed: belt.speed, accel, decel, mode, gap: belt.gap, feedRate: belt.feedRate, restartDelay, rejectRate },
      product: { key: info.key, size, kg },
    },
  };
}

/* ------------------------------------------------------- from the user's words */

type Signal = { tag: string; from: string; to: string; device: string; text: string };
type Rule = { rule: string; why: string };

/**
 * An automation application the studio can build from a description: how it is recognised, the robot's job
 * (skills-library name), the machine it works with, where parts come from and go by default, the product's path
 * from arrival to output, the machine's own handshake beyond the conveyor's signals, and the integrator's rules.
 */
export interface AutomationSkill {
  id: string;
  name: string;
  when: RegExp;
  job: string;
  machine?: StationKey;
  source: "conveyor" | "bin" | "pallet" | "machine";
  destination: StationKey;
  flow: string[];
  signals: Signal[];
  rules: Rule[];
}

const S = (tag: string, from: string, to: string, device: string, text: string): Signal => ({ tag, from, to, device, text });

/** Specific applications first; plain pick and place last. */
export const AUTOMATION_SKILLS: AutomationSkill[] = [
  {
    id: "moulding",
    name: "Injection moulding machine tending",
    when: /\b(injection[- ]mou?ld\w*|mou?lding machines?|imm\b|die[- ]?cast\w*|plastic mou?ld\w*)/,
    job: "Injection Moulding Tending",
    machine: "mould",
    source: "machine",
    destination: "pallet",
    flow: [
      "The mould opens and the machine tells the robot it may enter",
      "The robot goes in, grips the moulded part, confirms the grip and leaves the mould area",
      "The machine closes the mould for the next shot while the robot drops the sprue and places the part",
    ],
    signals: [
      S("MOULD_OPEN", "Moulding machine", "Robot", "Euromap 67 interface", "Mould fully open: the robot may enter"),
      S("EJECTOR_FWD", "Robot", "Moulding machine", "Euromap 67 interface", "Robot in place: push the part out"),
      S("ROBOT_CLEAR", "Robot", "Moulding machine", "Euromap 67 interface", "Robot out of the mould area: the mould may close"),
    ],
    rules: [
      { rule: "Use the machine's robot interface (Euromap 67): the robot enters only when the mould is open and leaves before it may close", why: "The mould closes with tonnes of force; the interlock is what keeps the robot safe." },
      { rule: "Keep the take-out short: grip, confirm and leave in a second or two", why: "Every second the robot spends in the mould adds to the moulding cycle." },
    ],
  },
  {
    id: "cnc",
    name: "CNC machine tending",
    when: /\b(cnc|vmc|hmc|lathes?|turning (cent(er|re)|machine)|machining cent(er|re)|milling machine|machine tools?)\b/,
    job: "CNC Machining",
    machine: "cnc",
    source: "conveyor",
    destination: "pallet",
    flow: [
      "Raw blanks arrive on the infeed conveyor; the photo-eye stops each one at the pick position",
      "The robot picks a blank and waits for MACHINE_READY with the door open",
      "It unloads the finished part, loads the blank, waits for the chuck to clamp and leaves the machine",
      "It starts the machining cycle (CYCLE_START) and places the finished part on the pallet while the machine runs",
    ],
    signals: [
      S("MACHINE_READY", "CNC machine", "Robot", "Machine interface (robot I/O kit)", "Cycle finished, door open: the robot may enter"),
      S("CHUCK_CLAMP", "Robot", "CNC machine", "Machine interface", "Part in place: close the chuck or vice"),
      S("CHUCK_CLAMPED", "CNC machine", "Robot", "Chuck pressure switch", "Part held: the robot may let go"),
      S("CYCLE_START", "Robot", "CNC machine", "Machine interface", "Robot clear: close the door and machine the part"),
    ],
    rules: [
      { rule: "The machine needs an automatic door, a pneumatic chuck or vice and a robot interface kit", why: "The robot cannot open doors or tighten a manual vice; the interface gives the handshake." },
      { rule: "A dual gripper swaps the finished part and the blank in one visit", why: "One trip into the machine instead of two cuts the machine's idle time." },
      { rule: "Blow chips off the chuck before loading and check the part is seated", why: "A chip under the part scraps it or crashes the tool." },
    ],
  },
  {
    id: "press",
    name: "Press tending",
    when: /\b(power press|stamping|press brake|bending press|forging press|press (shop|line|tending)|presses)\b/,
    job: "Press Tending & Stamping",
    machine: "press",
    source: "conveyor",
    destination: "pallet",
    flow: [
      "Blanks arrive on the conveyor; the robot picks one and waits for the press at the top of its stroke",
      "It loads the die and leaves; the press makes one stroke",
      "The robot unloads the formed part and stacks it",
    ],
    signals: [
      S("PRESS_TOP", "Press", "Robot", "Press control (crank at top dead centre)", "Ram at the top, single-stroke mode: the robot may enter"),
      S("STROKE", "Robot", "Press", "Press control", "Robot clear: make one stroke"),
    ],
    rules: [
      { rule: "Run the press in single-stroke mode and load only at the top of the stroke", why: "A press that strokes with the robot inside destroys the tool and the robot." },
      { rule: "Check for two blanks stuck together before loading", why: "Oiled sheets stick; two blanks in the die break it." },
    ],
  },
  {
    id: "weld",
    name: "Welding cell fed by a conveyor",
    when: /\bweld\w*/,
    job: "MIG/MAG Welding",
    machine: "weld",
    source: "conveyor",
    destination: "pallet",
    flow: [
      "Parts arrive on the conveyor; the robot loads them into the welding fixture",
      "The clamps close and the robot welds the seams",
      "The clamps open and the robot unloads the welded part",
    ],
    signals: [
      S("CLAMPS_CLOSED", "Welding fixture", "Robot", "Clamp position sensors", "Part clamped: the robot may weld"),
      S("ARC_OK", "Welding power source", "Robot", "Power source interface", "Arc established"),
    ],
    rules: [
      { rule: "Accurate fixtures plus seam tracking", why: "Part fit-up varies; the seam has to be found, not assumed." },
      { rule: "A torch-cleaning station every few parts", why: "Spatter builds up in the nozzle and spoils the gas shield." },
    ],
  },
  {
    id: "assembly",
    name: "Assembly from a conveyor",
    when: /\b(assembl\w*|screw\w*|fasten\w*|press[- ]fit\w*|rivet\w*)\b/,
    job: "Assembly",
    machine: "table",
    source: "conveyor",
    destination: "out",
    flow: ["Parts arrive on the conveyor; the robot places them in the assembly fixture", "It fits or screws the components", "It passes the assembly on"],
    signals: [S("PART_SEATED", "Fixture", "Robot", "Part-present sensor in the fixture", "Part seated correctly"), S("TORQUE_OK", "Screwdriver", "Robot", "Nutrunner controller", "Screw tightened to torque and angle")],
    rules: [{ rule: "Compliant tooling and vision location for tight fits", why: "Part tolerances add up; a stiff robot alone jams the parts." }],
  },
  {
    id: "depalletizing",
    name: "Depalletizing onto a conveyor",
    when: /\b(depalleti[sz]\w*|de-?stack\w*|unstack\w*|from (a |the )?pallets?)\b/,
    job: "Depalletizing",
    source: "pallet",
    destination: "out",
    flow: ["A full pallet is brought in", "The robot takes the boxes layer by layer and puts them on the outfeed conveyor", "The empty pallet is taken away"],
    signals: [S("PALLET_PRESENT", "Pallet station", "PLC", "Pallet sensor", "Pallet in place")],
    rules: [{ rule: "Use a camera or the pallet pattern to find each box; remove slip sheets between layers", why: "Real pallets are not stacked perfectly." }],
  },
  {
    id: "sorting",
    name: "Vision sorting with reject",
    when: /\b(sort\w*|inspect\w*|reject\w*|defect\w*|quality (check|control)|vision check|bad (parts?|ones|pieces?)|good (parts?|ones|pieces?))\b/,
    job: "Loading & Unloading",
    source: "conveyor",
    destination: "pallet",
    flow: ["Parts arrive on the conveyor", "A camera checks each part; the PLC keeps the result with the part", "The robot picks the good parts; failed parts run on into the reject bin"],
    signals: [],
    rules: [
      { rule: "Put the camera upstream and track each verdict to the pick position", why: "The robot must know which part failed when it gets there." },
      { rule: "Enclose the camera with its own lighting", why: "Changing daylight causes false rejects." },
    ],
  },
  {
    id: "palletizing",
    name: "End-of-line palletizing",
    when: /\b(palleti[sz]\w*|stack\w*\b[^.]*\bpallets?)\b/,
    job: "Palletizing",
    source: "conveyor",
    destination: "pallet",
    flow: ["Cases arrive on the conveyor and stop at the photo-eye", "The robot stacks them in an interlocked pattern, layer by layer", "The full pallet goes out and an empty one comes in"],
    signals: [S("PALLET_PRESENT", "Pallet station", "PLC", "Pallet sensor", "Empty pallet in place"), S("PALLET_FULL", "Robot", "PLC", "Robot output", "Last case placed: take the pallet out")],
    rules: [
      { rule: "Interlock the layers and use slip sheets", why: "An interlocked stack does not fall apart in transport." },
      { rule: "Two pallet stations keep the robot working while a full pallet is changed", why: "With one station the line stops for every pallet change." },
    ],
  },
  {
    id: "packing",
    name: "Case packing",
    when: /\b(pack\w*\b[^.]*\b(cartons?|boxes|cases|trays?)|case[- ]packing|cartoning|into (cartons?|boxes|cases|trays?))\b/,
    job: "Packing & Box Forming",
    source: "conveyor",
    destination: "carton",
    flow: ["Products arrive on the conveyor", "The robot packs them into the open carton in the set pattern", "The full carton is closed and sent on"],
    signals: [S("CARTON_PRESENT", "Carton station", "PLC", "Carton sensor", "Open carton in place"), S("CARTON_FULL", "Robot", "PLC", "Robot output", "Pattern complete: close the carton")],
    rules: [{ rule: "Count every product before the carton closes", why: "A short carton is a customer complaint." }],
  },
  {
    id: "pick-place",
    name: "Conveyor pick and place",
    when: /\b(pick\w*|place\w*|transfer\w*|load\w*|move\w*|take\w*)\b/,
    job: "Loading & Unloading",
    source: "conveyor",
    destination: "pallet",
    flow: ["Parts arrive on the conveyor and stop at the photo-eye", "The robot picks each one, confirms the grip and places it", "It returns for the next part"],
    signals: [],
    rules: [],
  },
];

/** Robot makers as the Directory spells them, from the name a user writes. */
const MAKER_NAME: Record<string, string> = { FANUC: "Fanuc", ABB: "ABB", KUKA: "KUKA", Yaskawa: "Yaskawa", Kawasaki: "Kawasaki", "Universal Robots": "Universal Robots", Epson: "Epson", DENSO: "Denso", Nachi: "Nachi", Comau: "Comau", "Doosan Robotics": "Doosan", "Mitsubishi Electric": "Mitsubishi" };
/** Typical weight of a gripper of each family (kg), for the payload a robot needs. */
const GRIP_KG: Record<string, number> = { parallel: 1.5, dual: 3.5, vacuum: 1.5, magnet: 6, fork: 25 };

export interface AutomationProposal {
  skill: { id: string; name: string; why: string };
  /** The robots to build: each one's job, its equipment, and the maker asked for. */
  cells: { job: string; stations: StationKey[]; brand?: string; cobot?: boolean }[];
  /** The first robot's conveyor automation; null when it does not pick from a conveyor. */
  setup: ConveyorSetup | null;
  destination: StationKey;
  /** What the studio read: said in the words, chosen by a rule, or assumed. */
  facts: { label: string; value: string; how: "said" | "rule" | "assumed" }[];
  /** What the words do not say: the question, and the value used meanwhile. */
  missing: { question: string; using: string }[];
  /** Assumptions that change the design: confirm each before the cell is built. */
  confirm: string[];
  flow: string[];
  signals: Signal[];
  rules: Rule[];
  /** Payload the robot needs: the part and a typical gripper of the family chosen. */
  needKg: number;
  gripper: { family: string; pick: string; why: string };
}

const num = (s: string | undefined) => (s ? parseFloat(s) : NaN);
/** "300 x 200 x 150 mm" (length × width × height) → [length, height, width] in metres. */
function sizeOf(text: string): [number, number, number] | null {
  const m = text.match(/(\d+(?:\.\d+)?)\s*(mm|cm|m)?\s*[x×]\s*(\d+(?:\.\d+)?)\s*(mm|cm|m)?(?:\s*[x×]\s*(\d+(?:\.\d+)?))?\s*(mm|cm|m)\b/);
  if (!m) return null;
  const unit = m[6] === "m" ? 1 : m[6] === "cm" ? 0.01 : 0.001;
  const [l, w, h] = [num(m[1]), num(m[3]), num(m[5])].map((v) => (Number.isFinite(v) ? v * unit : NaN));
  if (!(l > 0 && w > 0)) return null;
  return [l, Number.isFinite(h) && h > 0 ? h : NaN, w];
}

/**
 * Read a description of the automation ("I have a conveyor carrying 5 kg metal parts; a FANUC robot should load
 * them into a CNC machine") and propose the cell: the application, the robots and their equipment, the conveyor
 * automation, what was understood and how, what is missing, what to confirm, and the rules behind each choice.
 * Rules only: nothing is invented; every value says whether it was said, chosen by a rule or assumed.
 */
export function proposeAutomation(text: string): AutomationProposal {
  const t = ` ${text.toLowerCase().replace(/\s+/g, " ")} `;
  const facts = extractFacts(text);
  const said: AutomationProposal["facts"] = [];
  const missing: AutomationProposal["missing"] = [];
  const confirm: string[] = [];
  const rules: Rule[] = [];

  // The application: the first skill whose words appear; plain pick and place otherwise.
  const skill = AUTOMATION_SKILLS.find((s) => s.when.test(t)) ?? AUTOMATION_SKILLS[AUTOMATION_SKILLS.length - 1];
  const hit = t.match(skill.when)?.[0]?.trim();
  rules.push(...skill.rules);

  // Where parts come from and go: "puts them on a conveyor" is where they go, "parts on the conveyor" where they come from.
  const PLACE_ON_BELT = /\b(put|puts|putting|place|places|placing|drop|drops|set|sets|send|sends|pass|passes|passing|transfer|transfers)\b[^.]{0,40}?\b(on|onto|to|into)\s+(a |an |the |another |the next |a second )?(outfeed |take-?away |second |next )?(conveyor|belt)\b/g;
  const toConveyor = PLACE_ON_BELT.test(t);
  const rest = t.replace(PLACE_ON_BELT, " ");
  const conveyorWord = /\b(conveyors?|belts?|infeed)\b/.test(rest);
  const fromConveyor = /\b(from|off|on|along) (a |an |the )?(\w+ )?(conveyor|belt)\b|\b(conveyor|belt|infeed)\b[^.]{0,30}?\b(brings?|carr(y|ies|ying)|feeds?|deliver\w*|moves?|with)\b/.test(rest);
  let source = skill.source;
  if (/\b(bins?|jumbled|random(ly)?|bulk|loose parts?|pile)\b/.test(t) && !fromConveyor) source = "bin";
  else if (skill.source === "machine" && (fromConveyor || /\binserts?\b/.test(t))) source = "conveyor";
  else if (skill.source === "conveyor" && !conveyorWord && /\bpallets?\b/.test(t) && skill.id !== "palletizing") source = "pallet";
  let destination: StationKey = skill.destination;
  let destSaid = false;
  const D: [RegExp, StationKey][] = [
    [/\b(on|onto|in|into|to)\s+(a |the )?pallets?\b|\bpalleti[sz]/, "pallet"],
    [/\b(on|onto|in|into|to)\s+(a |the )?(cartons?|boxes|cases|trays?)\b|\bpack\w*/, "carton"],
    [/\b(on|onto|in|into|to)\s+(a |the )?(table|fixture|jig|bench|workbench)\b/, "table"],
  ];
  for (const [re, k] of D)
    if (re.test(t)) {
      destination = k;
      destSaid = true;
      break;
    }
  if (toConveyor && (source !== "conveyor" || /\b(another|next|second|outfeed|take-?away)\b/.test(t))) {
    destination = "out";
    destSaid = true;
  }
  if (skill.id === "depalletizing") {
    destination = "out";
    destSaid = destSaid || toConveyor;
  }

  // The robots: two when the words say so (a transfer belt between them), else one.
  const two = /\b(two|2) robots?\b|\bsecond robot\b|\banother robot\b|\brobot 2\b|\bboth robots\b/.test(t);
  const maker = brandOf(text);
  const brand = maker !== "Other" ? MAKER_NAME[maker] ?? maker : undefined;
  const cobot = facts.cobotWanted;

  // The product, its size and weight: as said, else the studio's product and its typical size and weight.
  const pick = productFor(text, [skill.job]);
  const info = productInfo(pick);
  const dims = sizeOf(t);
  const size: [number, number, number] = dims ? [dims[0], Number.isFinite(dims[1]) ? dims[1] : info.size[1], dims[2]] : info.size;
  const kg = facts.weightKg ?? info.kg;
  const rate = facts.partsPerHour ? round(facts.partsPerHour / 60, 1) : 0;

  // The gripper: by what is handled (the studio's gripper rules), else the product's own family.
  const gr = matchFirst(GRIPPER_RULES, t);
  const family = /\bvacuum|suction\b/.test(t) ? "vacuum" : /\bmagnet/.test(t) ? "magnet" : /\b(fingers?|jaws?|parallel gripper)\b/.test(t) ? "parallel" : info.grip;
  const dual = skill.id === "cnc" || (gr && /dual/i.test(gr.pick) && skill.machine);
  const gripFamily = dual && (family === "parallel" || family === "dual") ? "dual" : family;
  const gripper =
    gr && eoatKind(gr.pick) === family
      ? { family: gripFamily, pick: gr.pick, why: gr.why }
      : {
          family: gripFamily,
          pick: (GRIP_NAME[gripFamily] ?? "gripper").replace(/^./, (c) => c.toUpperCase()),
          why: gripFamily === "dual" ? "Two sets of jaws: the finished part comes out and the next blank goes in on one visit to the machine." : `The ${info.label.toLowerCase()} is usually handled with a ${GRIP_NAME[info.grip] ?? info.grip}.`,
        };
  // Area vacuum grippers for cases and layers weigh far more than a single cup.
  const gripKg = gripFamily === "vacuum" && (skill.id === "palletizing" || skill.id === "depalletizing") ? 12 : GRIP_KG[gripFamily] ?? 2;
  const needKg = round(kg + gripKg, 1);

  // How the robot picks from the belt: tracking when the words say so, or for light parts at a high rate.
  const trackWords = /\b(moving (belt|conveyor)|on the move|without stopping|non-?stop|conveyor tracking|line tracking|continuous(ly)? moving)\b/.test(t);
  const fast = rate >= 40 && kg <= 2;
  let mode: PickMode = trackWords || fast ? "track" : "index";
  if (mode === "track" && (two || destination === "out")) mode = "index";
  // A camera: when the words ask for inspection or sorting.
  const inspect = skill.id === "sorting" || (!skill.machine && /\b(camera|vision|inspect\w*|reject\w*|defect\w*)\b/.test(t));
  // "5% are rejected", "a reject rate of 3%", "rejects the bad ones, about 5%".
  const pct = t.match(/(\d+(?:\.\d+)?)\s*%[^.%]{0,30}?\b(?:reject\w*|defect\w*|bad|scrap\w*|ng|fail\w*)|\b(?:reject|defect|scrap|fail|bad)\w*[^.%\d]{0,30}?(\d+(?:\.\d+)?)\s*%/);
  const rejectRate = inspect ? (pct ? clampN(num(pct[1] ?? pct[2]) / 100, 0.01, 0.9) : 0.05) : 0;

  // The conveyor itself: what the words give, else a belt that fits the product.
  const speedMs = t.match(/(\d+(?:\.\d+)?)\s*m\s*\/\s*s\b|(\d+(?:\.\d+)?)\s*(?:m\s*\/\s*min|mpm|metres? per minute|meters? per minute)\b/);
  const speed = speedMs ? (speedMs[1] ? num(speedMs[1]) : num(speedMs[2]) / 60) : NaN;
  const lenM = t.match(/(\d+(?:\.\d+)?)\s*m(?:etres?|eters?)?\s+(?:long\s+)?(?:conveyor|belt)|(?:conveyor|belt)\s+(?:is\s+|of\s+)?(\d+(?:\.\d+)?)\s*m(?:etres?|eters?)?\s+long/);
  const widthMm = t.match(/(\d{2,4})\s*mm\s+wide\s+(?:conveyor|belt)|(?:belt|conveyor)\s+width\s+(?:of\s+|is\s+)?(\d{2,4})\s*mm/);
  const heightMm = t.match(/(?:belt|conveyor|working)\s+height\s+(?:of\s+|is\s+)?(\d{3,4})\s*mm/);
  const gapMm = t.match(/(\d{1,4})\s*mm\s+(?:gap|apart|spacing)|(?:gap|spacing)\s+(?:of\s+)?(\d{1,4})\s*mm/);
  const base = defaultSetup(info.key);
  const setup: ConveyorSetup | null =
    source === "conveyor"
      ? {
          conveyor: {
            length: lenM ? clampN(num(lenM[1] ?? lenM[2]), 1, 12) : mode === "track" ? 3.4 : base.conveyor.length,
            width: widthMm ? clampN(num(widthMm[1] ?? widthMm[2]) / 1000, 0.15, 1.5) : Math.max(base.conveyor.width, Math.ceil((size[2] + 0.08) * 20) / 20),
            height: heightMm ? clampN(num(heightMm[1]) / 1000, 0.4, 1.3) : base.conveyor.height,
            speed: Number.isFinite(speed) ? clampN(round(speed, 2), 0.05, 1.5) : kg > 20 ? 0.2 : 0.3,
            side: "left",
          },
          product: { key: info.key, size, kg },
          feed: { rate, gap: gapMm ? num(gapMm[1] ?? gapMm[2]) / 1000 : round(clampN(size[0] * 0.6, 0.08, 0.3)) },
          mode,
          rejectRate,
        }
      : null;

  // The cells: one robot; or the first picks (and works the machine) and passes parts on a transfer belt to the
  // second, which places them where they go.
  const st0: StationKey[] = [...(source === "conveyor" ? (["conveyor"] as StationKey[]) : source === "bin" ? (["bin"] as StationKey[]) : source === "pallet" ? (["pallet"] as StationKey[]) : []), ...(skill.machine ? [skill.machine] : [])];
  const job0 = source === "bin" && skill.id === "pick-place" ? "Bin Picking" : skill.job;
  const cells: AutomationProposal["cells"] = two
    ? [
        { job: skill.machine ? job0 : "Loading & Unloading", stations: [...st0, "out"], brand, cobot },
        { job: destination === "pallet" ? "Palletizing" : destination === "carton" ? "Packing & Box Forming" : "Loading & Unloading", stations: [destination === "out" ? "pallet" : destination], brand, cobot },
      ]
    : [{ job: job0, stations: [...new Set<StationKey>([...st0, destination])], brand, cobot }];

  // What was understood, and how.
  said.push({ label: "Application", value: skill.name, how: hit && skill.id !== "pick-place" ? "said" : "rule" });
  said.push({ label: "Product", value: info.label, how: pick.key === "block" && !/\b(machined|block|metal part)/.test(t) ? "assumed" : "said" });
  said.push({ label: "Weight", value: kgText(kg), how: facts.weightKg != null ? "said" : "assumed" });
  said.push({ label: "Size (L × W × H)", value: `${Math.round(size[0] * 1000)} × ${Math.round(size[2] * 1000)} × ${Math.round(size[1] * 1000)} mm`, how: dims ? "said" : "assumed" });
  said.push({ label: "Rate", value: rate ? `${rate} parts a minute (${facts.partsPerHour} an hour)` : "As fast as the robot takes them", how: rate ? "said" : "assumed" });
  said.push({ label: "Parts come from", value: source === "conveyor" ? "Infeed conveyor" : source === "bin" ? "A bin (3D camera)" : source === "pallet" ? "A pallet" : "The machine", how: source === "conveyor" && !conveyorWord ? "assumed" : "said" });
  if (skill.machine) said.push({ label: "Machine", value: skill.name.replace(/ tending| fed by a conveyor| from a conveyor/, ""), how: "said" });
  said.push({ label: "Parts go to", value: AUTOMATION_PLACES[destination] ?? destination, how: destSaid ? "said" : "assumed" });
  said.push({ label: "Robots", value: two ? "Two, with a transfer belt between them" : "One", how: two ? "said" : "rule" });
  said.push({ label: "Robot maker", value: brand ? maker : "Best fit from the marketplace and the Directory", how: brand ? "said" : "rule" });
  said.push({ label: "Robot type", value: cobot ? "Collaborative robot, no fence" : "Industrial robot in a fenced cell", how: cobot ? "said" : "rule" });
  said.push({ label: "Gripper", value: gripper.pick, how: /\bvacuum|suction|magnet|gripper|fingers?\b/.test(t) ? "said" : "rule" });
  if (setup) said.push({ label: "Pick", value: mode === "track" ? "Conveyor tracking: the belt keeps running" : "Stop and pick: the belt stops each part", how: trackWords ? "said" : "rule" });
  if (inspect) said.push({ label: "Inspection", value: `Camera; ${Math.round(rejectRate * 100)}% of parts fail`, how: pct ? "said" : "assumed" });

  // What is missing, the value used meanwhile, and what the user must confirm.
  if (facts.weightKg == null) {
    missing.push({ question: "How much does one part weigh?", using: `${kgText(kg)}, typical for a ${info.label.toLowerCase()}` });
    confirm.push(`Part weight ${kgText(kg)} (the robot is sized for ${kgText(needKg)} with the gripper)`);
  }
  if (!rate) {
    missing.push({ question: "How many parts a minute or an hour?", using: "the robot's own pace" });
    confirm.push("No target rate: the simulation measures the parts per hour the cell can do");
  }
  if (!dims) missing.push({ question: "What size is the part (length × width × height)?", using: `${Math.round(size[0] * 1000)} × ${Math.round(size[2] * 1000)} × ${Math.round(size[1] * 1000)} mm` });
  if (!destSaid) {
    missing.push({ question: "Where do the finished parts go?", using: AUTOMATION_PLACES[destination] ?? destination });
    confirm.push(`Parts go to the ${(AUTOMATION_PLACES[destination] ?? destination).toLowerCase()}`);
  }
  if (!brand) missing.push({ question: "Do you prefer a robot maker (FANUC, ABB, KUKA, Yaskawa…)?", using: "the best fit from the marketplace and the Directory" });
  if (inspect && !pct) confirm.push(`About ${Math.round(rejectRate * 100)}% of parts fail inspection (a simulation assumption)`);
  if (setup && mode === "track") confirm.push("Conveyor tracking: the robot needs its maker's tracking option and an encoder on the belt");
  if (facts.shifts == null) missing.push({ question: "How many shifts a day?", using: "two, for the payback" });

  // The rules behind the choices.
  rules.push({ rule: `${gripper.pick}`, why: gripper.why });
  rules.push({ rule: `Robot payload at least ${kgText(needKg * 1.25)}: part, gripper and about 20% margin`, why: "Fast moves load the wrist beyond the static weight." });
  if (setup && mode === "index") rules.push({ rule: "A photo-eye stops each part at the pick position; the robot waits for PART_READY and the belt waits for PICK_DONE", why: "Stopping the part makes the pick position certain without a camera." });
  if (setup && mode === "track") rules.push({ rule: "Conveyor tracking: an encoder and a sync photo-eye follow each part; the robot picks inside its tracking window", why: trackWords ? "The words ask for a belt that never stops." : "At this rate stopping the belt for every light part costs more time than the pick." });
  const typ = matchFirst(ROBOT_TYPE_RULES, t);
  if (typ) rules.push({ rule: typ.pick, why: `${typ.why} (the 3D cell shows a six-axis arm)` });
  for (const v of matchAll(VISION_RULES, t)) rules.push({ rule: v.pick, why: v.why });
  if (two) rules.push({ rule: "A transfer belt between the two robots", why: "It buffers parts, so each robot works at its own pace; the slower one sets the line's rate." });
  if (rate > 20)
    rules.push({ rule: `${rate} parts a minute is more than one articulated arm usually picks and places (about 10–20 a minute): plan several robots, or delta robots for light parts`, why: "The simulation measures what one robot really does and shows the parts it misses." });

  const signals = [...skill.signals];
  return {
    skill: { id: skill.id, name: skill.name, why: hit && skill.id !== "pick-place" ? `"${hit}" in your words` : "Picking parts from a conveyor and placing them" },
    cells,
    setup,
    destination,
    facts: said,
    missing,
    confirm,
    flow: skill.flow,
    signals,
    rules,
    needKg,
    gripper,
  };
}

/** Where a part can go, in words. */
export const AUTOMATION_PLACES: Partial<Record<StationKey, string>> = { pallet: "Pallet", carton: "Packing carton", out: "Outfeed conveyor", table: "Work table" };
/** A cell's equipment, in words. */
export const STATION_WORDS: Partial<Record<StationKey, string>> = { conveyor: "infeed conveyor", out: "outfeed conveyor", pallet: "pallet", carton: "carton", table: "work table", cnc: "CNC machine", press: "press", mould: "moulding machine", weld: "welding table", bin: "parts bin" };
/** Where each understood value came from, in words. */
export const FACT_SOURCE: Record<AutomationProposal["facts"][number]["how"], string> = { said: "your words", rule: "rule", assumed: "assumed" };

/** A question to add to the user's brief for them to answer: without the examples in brackets, which would read as said ("(FANUC, ABB…)" as the maker). */
export const briefQuestion = (question: string) => question.replace(/\s*\([^)]*\)/g, "");

/** Longest description a Builder link carries. */
const DESCRIBE_MAX = 1200;
const tidy = (text: string) => text.replace(/\s+/g, " ").trim().slice(0, DESCRIBE_MAX);
/** The Builder link that opens a description in "what I understood", ready to confirm, build and simulate. */
export const describeLink = (text: string) => `/automation-studio/build#describe=${encodeURIComponent(tidy(text))}`;
/** The description a Builder link carries (#describe=…), or null. */
export function describedIn(hash: string): string | null {
  const m = hash.match(/(?:^#?|[#&])describe=([^&]*)/);
  if (!m) return null;
  try {
    const text = tidy(decodeURIComponent(m[1]));
    return text.length >= 8 ? text : null;
  } catch {
    return null;
  }
}
