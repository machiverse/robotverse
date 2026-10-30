/**
 * Automation Studio — conveyor pick and place, planned the way an integrator plans it.
 *
 * From the conveyor, the product, the feed, the pick mode and the robot and gripper the user chose: check what
 * cannot work, write the sequence (feed → convey → sense → pick → transfer → place → repeat) with the signals each
 * step waits for or sets, list the I/O, and hand the simulator the settings to run it (robotSim setAutomation).
 * Nothing here controls a real machine: the signals are the ones an integrator would wire, simulated.
 * Research and sources: docs/automation-studio-conveyor.md.
 */

import { beltConfig, MODE_SIGNALS, SIGNALS, stopDistance, type BeltOptions } from "./conveyorLogic.js";
import { eoatKind } from "./robotSim.js";
import { productInfo } from "./workpieces.js";
import { brandOf } from "./robotSystem";

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
  stage: "Feed" | "Convey" | "Sense" | "Pick" | "Transfer" | "Place" | "Repeat";
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
const kgText = (kg: number) => (kg >= 1 ? `${round(kg, 1)} kg` : `${Math.round(kg * 1000)} g`);
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
  const sequence: AutomationStep[] = [
    {
      n: 1, stage: "Feed", title: "Feeder releases a part",
      detail: rate > 0 ? `One part every ${round(60 / rate, 1)} s, only when the belt entry is clear by ${mm(gap)}.` : `A part whenever the belt entry is clear by ${mm(gap)}.`,
      signals: ["FEED"],
    },
    {
      n: 2, stage: "Convey", title: "Belt carries it to the robot",
      detail: mode === "index"
        ? `CONV_RUN on: the belt runs at ${speed} m/s (starts at ${accel} m/s², brakes at ${decel} m/s²).`
        : `The belt runs at ${speed} m/s and never stops; the encoder reports belt travel to the robot.`,
      signals: mode === "index" ? ["CONV_RUN", "CONV_RUNNING"] : ["CONV_RUN", "ENC"],
    },
    mode === "index"
      ? { n: 3, stage: "Sense", title: "Photo-eye stops it at the pick position", detail: `PE1 sees the part ${mm(braking + 0.03)} before the pick position; the PLC drops CONV_RUN and the part comes to rest where the robot picks, then PART_READY goes on.`, signals: ["PE1", "CONV_RUN", "PART_READY"] }
      : { n: 3, stage: "Sense", title: "Photo-eye registers it for tracking", detail: "PE1 is the sync switch: each part is queued with the encoder count when it breaks the beam, so the robot knows where it is all along the belt.", signals: ["PE1", "ENC"] },
    mode === "index"
      ? { n: 4, stage: "Pick", title: "Robot picks the part", detail: `The robot waits above the pick position. On PART_READY it moves down (ROBOT_IN_ZONE on: the belt may not move), closes the ${gripName} (GRIP_CMD) and lifts only once the ${sensor} confirms the grip (GRIP_OK). Clear of the belt it sends PICK_DONE and the PLC restarts the conveyor.`, signals: ["ROBOT_IN_ZONE", "GRIP_CMD", "GRIP_OK", "PICK_DONE"] }
      : { n: 4, stage: "Pick", title: "Robot follows and picks the part", detail: `The robot waits at the start of its tracking window. When a part enters it, the robot matches the belt speed, moves down onto the moving part, closes the ${gripName} (GRIP_CMD), waits for the ${sensor} (GRIP_OK) and lifts while still following the belt. A part that leaves the window unpicked runs into the reject bin.`, signals: ["ENC", "GRIP_CMD", "GRIP_OK"] },
    { n: 5, stage: "Transfer", title: `Carries it to the ${destName}`, detail: "The part is fixed to the tool: it moves with the gripper and never floats. GRIP_OK is watched on the way; a lost part stops the robot.", signals: ["GRIP_OK"] },
    { n: 6, stage: "Place", title: `Places it on the ${destName}`, detail: "Straight down onto the place position, GRIP_CMD off, the part is released where it sits, then the robot lifts clear.", signals: ["GRIP_CMD", "GRIP_OK"] },
    { n: 7, stage: "Repeat", title: "Back for the next part", detail: mode === "index" ? "Returns above the pick position and waits for the next PART_READY." : "Returns to the start of the tracking window for the next part.", signals: [] },
  ];

  const io = MODE_SIGNALS[mode].map((tag) => {
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
      belt: { speed: belt.speed, accel, decel, mode, gap: belt.gap, feedRate: belt.feedRate, restartDelay },
      product: { key: info.key, size, kg },
    },
  };
}
