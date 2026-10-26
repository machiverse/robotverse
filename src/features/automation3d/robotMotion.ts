/**
 * Automation Studio — how a robot gets from one place to another.
 *
 * A robot arm reaches about 0.5–3.5 m around its base. When the work is spread wider (a row of machines, several
 * pallets, a long weld, a high stack, another bay), the robot itself has to move, or a different kind of robot
 * does the job. These are the motion systems an integrator chooses from, with what each is good for, how far
 * and fast it travels, how accurate it is, what it costs and what it needs around it.
 *
 * Plain data and functions: the 3D cell, the cell builder, the planner and the engineer's notes all read it.
 */

export type MotionType = "fixed" | "track" | "overhead" | "gantry" | "amr" | "lift" | "rgv";

export interface MotionSystem {
  type: MotionType;
  name: string;
  /** In a sentence: "the robot rides a 6 m floor track". */
  short: string;
  what: string;
  /** When an engineer chooses it. */
  when: string[];
  /** When it is the wrong answer. */
  avoid: string[];
  travel: string;
  speed: string;
  accuracy: string;
  payload: string;
  /** Real products. */
  models: string[];
  /** Indicative price of the motion system alone, ₹ lakh (robot excluded). */
  costLakh: [number, number];
  components: string[];
  safety: string[];
  notes: string[];
  /** Travel the 3D cell uses by default, and its limits (m). Lift columns travel vertically. */
  length: { def: number; min: number; max: number };
  /** Travel speed and acceleration for cycle estimates (m/s, m/s²). */
  v: number;
  a: number;
}

export const MOTION_SYSTEMS: Record<MotionType, MotionSystem> = {
  fixed: {
    type: "fixed",
    name: "Fixed base",
    short: "the robot stands on a fixed base",
    what: "The robot is bolted to the floor, a pedestal or a riser and everything it serves is placed within its reach.",
    when: ["All stations fit within about 80% of the robot's reach", "Highest accuracy and lowest cost", "Short cycle times with no travel"],
    avoid: ["Machines or pallets spread more than about 2 m apart", "Parts longer than the robot can reach along"],
    travel: "None — reach 0.5–3.5 m depending on the robot",
    speed: "No travel time",
    accuracy: "Robot repeatability only (±0.02–0.1 mm)",
    payload: "As the robot",
    models: ["Pedestal or riser sized to bring the work to the robot's best zone"],
    costLakh: [0.5, 2],
    components: ["Base plate or pedestal", "Chemical anchors and grout", "Riser where the work is high"],
    safety: ["Fence, light curtains or area scanners around the reach envelope"],
    notes: ["Check reach with the gripper and part included, not the catalogue reach alone"],
    length: { def: 0, min: 0, max: 0 },
    v: 0,
    a: 1,
  },
  track: {
    type: "track",
    name: "Floor track (7th axis)",
    short: "the robot rides a floor track",
    what:
      "A servo carriage carries the robot along a rail on the floor. The controller drives it as the robot's 7th axis, so travel and arm motion are planned together.",
    when: [
      "One robot serves 2–6 machines in a row (CNC, press, moulding)",
      "Palletizing to several pallets or lines from one robot",
      "Welding or sealing long parts: beams, chassis, trailers, tanks",
      "Picking along long racks or shelving",
    ],
    avoid: [
      "Machines that all need loading at the same moment: travel adds to every cycle",
      "Floors that cannot be levelled or anchored (the rail needs a flat, stiff base)",
    ],
    travel: "2–30 m and more, in modular rail sections",
    speed: "1–2.5 m/s typical, 1 m/s² or more acceleration",
    accuracy: "±0.05–0.1 mm repeatability (rack and pinion with backlash-free drive)",
    payload: "Carriages for robots from 10 kg to over 1,000 kg payload",
    models: [
      "ABB IRBT 2005 / 4004 / 6004 / 7004",
      "FANUC Robot Transfer Unit (RTU)",
      "KUKA KL 1000 / KL 4000 linear units",
      "Yaskawa Motoman TSL track series",
      "Güdel TrackMotion floor (TMF)",
      "Rollon Seventh Axis",
      "igus drylin 7th axis (cobots)",
    ],
    costLakh: [8, 45],
    components: [
      "Rail and rack on a levelled, grouted base",
      "Servo motor and gearbox, run as robot axis 7",
      "Energy chain for power, signals, air and coolant",
      "Carriage plate with robot riser",
      "End stops with shock absorbers",
      "Covers over the rack and chain",
    ],
    safety: [
      "Fence or area scanners along the whole travel, with doors where people cross",
      "Safe zones that move with the robot (ABB SafeMove, FANUC DCS, KUKA SafeOperation)",
      "Hard stops at both ends; nobody stands at the end of the track",
    ],
    notes: [
      "Every metre of travel costs about 0.5–1 s each way: put the busiest stations closest together",
      "Level the rail to a fraction of a millimetre; a twisted rail shows up as path error at the tool",
      "Buffer each machine with a part ready so the robot never waits at one end",
    ],
    length: { def: 4, min: 2, max: 8 },
    v: 1.6,
    a: 1.5,
  },
  overhead: {
    type: "overhead",
    name: "Overhead track (inverted robot)",
    short: "the robot hangs from an overhead track",
    what:
      "The robot hangs upside down from a carriage on an overhead beam carried by columns. The floor stays free for machines, people and forklifts, and the robot reaches into machines from above.",
    when: [
      "Top-loading lathes, presses and machining centres in a row",
      "Foundries and forges where the floor is busy or hot",
      "Welding large structures from above",
      "Where floor space is the constraint",
    ],
    avoid: ["Low roof or overhead cranes in the way", "Robots not rated for ceiling mounting (check the model)"],
    travel: "3–40 m",
    speed: "1–3 m/s",
    accuracy: "±0.05–0.1 mm repeatability",
    payload: "Robots from 10 kg to about 500 kg payload",
    models: ["Güdel TrackMotion overhead (TMO)", "ABB robots on overhead linear axes", "FANUC top-mount transfer units", "KUKA KL overhead variants"],
    costLakh: [15, 70],
    components: ["Steel columns on foundations", "Overhead beam with rail and rack", "Carriage with inverted robot mount", "Energy chain along the beam", "Maintenance platform or lift access"],
    safety: ["Fence the floor area under the travel", "Load-rated columns and anchors (check the robot's dynamic loads)", "Drop protection where parts pass over walkways"],
    notes: ["Check the robot allows inverted mounting and adjust the payload chart", "Columns need foundations: plan them with the machine layout", "Service the robot from a platform; plan the access early"],
    length: { def: 4, min: 2, max: 8 },
    v: 1.6,
    a: 1.5,
  },
  gantry: {
    type: "gantry",
    name: "Cartesian gantry (linear robot)",
    short: "a gantry robot moves along X, Y and Z",
    what:
      "Two to four linear axes on a portal frame: X along the frame, Y across it, Z up and down, sometimes a rotation. It covers a large rectangle at high speed and lifts heavy loads.",
    when: [
      "Loading machining lines from the top",
      "Palletizing over a large floor area or many pallets",
      "Heavy parts, sheets, plates and coils",
      "Simple pick-and-place paths where a 6-axis arm's dexterity is not needed",
    ],
    avoid: ["Parts that must be turned and tilted in many directions", "Low headroom", "Work outside the portal's rectangle"],
    travel: "X up to 30 m and more, Y 1–6 m, Z 0.5–3 m",
    speed: "2–4 m/s on the long axis",
    accuracy: "±0.05–0.1 mm",
    payload: "5 kg to 2,000 kg and more",
    models: ["Güdel FP / ZP gantry robots", "Liebherr LP linear gantries", "Fibro linear gantries", "Bosch Rexroth / Festo linear modules (light gantries)"],
    costLakh: [12, 80],
    components: ["Portal frame and columns", "X, Y, Z linear axes with servo drives", "Motion controller or robot controller", "Gripper with rotation (C axis) if needed", "Energy chains on each axis"],
    safety: ["Fence the area under the gantry", "Safe speed when people are near the frame", "Vertical axis brake and counterbalance for heavy Z loads"],
    notes: ["A gantry is stiffer and faster for straight moves; a 6-axis arm is better for complex paths", "Size the frame for the dynamic loads of the heaviest move", "Keep the Z stroke as short as the work allows: long Z axes flex"],
    length: { def: 3.5, min: 2, max: 7 },
    v: 2.5,
    a: 2.5,
  },
  amr: {
    type: "amr",
    name: "Mobile manipulator (arm on an AMR)",
    short: "an arm on a mobile robot drives between stations",
    what:
      "A cobot or small robot on an autonomous mobile robot. It drives itself between machines or areas, docks, and works at each one in turn.",
    when: [
      "Many machines with small batches, each needing a few minutes of attention",
      "Stations far apart or in different bays",
      "Labs and electronics lines that change often",
    ],
    avoid: ["Heavy parts (cobot payloads are 5–20 kg)", "High rates at one station: a fixed robot is faster", "Rough or sloping floors"],
    travel: "The whole floor, along routes the fleet manager plans",
    speed: "1–2 m/s driving, slower near people",
    accuracy: "Docking ±5–10 mm; markers or touch-off at each station bring it to ±0.1–0.5 mm",
    payload: "Arm 5–20 kg; platform 250–1,500 kg",
    models: ["KUKA KMR iiwa", "Omron MoMa (LD/HD AMR with TM cobot)", "MiR250 / MiR600 with Universal Robots", "FANUC CRX on an AMR", "Addverb / GreyOrange AMRs (India)"],
    costLakh: [25, 90],
    components: ["AMR with safety laser scanners", "Cobot with controller and battery supply", "Docking markers or reference plates at each station", "Charging station", "Fleet manager software"],
    safety: ["Mobile robot safety to ISO 3691-4", "Speed and separation monitoring near people", "Marked aisles and docking areas"],
    notes: ["Re-find each station with a marker or a touch-off: docking alone is not precise enough", "Battery time and charging breaks decide how many machines one unit can serve", "Keep aisles clear: blocked routes stop the robot"],
    length: { def: 4, min: 2, max: 8 },
    v: 1.0,
    a: 0.6,
  },
  lift: {
    type: "lift",
    name: "Lift column (vertical axis)",
    short: "the robot rides a lift column",
    what: "A servo column raises and lowers the robot so a small robot or cobot can reach tall pallet stacks or several rack levels.",
    when: ["Cobot palletizing to 1.8–2.2 m stacks", "Machines or racks at several heights", "Small robots doing tall work"],
    avoid: ["Heavy payloads (columns are sized for cobots and small robots)", "Work that is also spread sideways: use a track"],
    travel: "0.5–2 m vertical",
    speed: "0.1–0.5 m/s",
    accuracy: "±0.1 mm",
    payload: "Cobots and small robots up to about 20–30 kg payload",
    models: ["Ewellix LIFTKIT for cobots", "Robotiq palletizing solution with lift", "igus drylin vertical axes"],
    costLakh: [3, 12],
    components: ["Lift column with servo and brake", "Robot adapter plate", "Controller plug-in for the cobot"],
    safety: ["Brake holds the load on power loss", "Pinch points under the moving robot guarded"],
    notes: ["Raise the robot only for the top layers: lifting costs time", "Check the column's moment rating with the arm fully stretched"],
    length: { def: 1.2, min: 0.6, max: 2 },
    v: 0.3,
    a: 0.5,
  },
  rgv: {
    type: "rgv",
    name: "Rail-guided vehicle (RGV)",
    short: "the robot rides a rail-guided cart",
    what: "A powered cart on floor rails carries a robot or loads between fixed stations. It is faster than a mobile robot and simpler than a precision track, but only goes where the rails go.",
    when: ["Long straight or loop routes between fixed stations", "Foundries, warehouses and long lines", "Heavy loads at speed along one route"],
    avoid: ["Routes that change", "Precision work while moving (stop and lock first)"],
    travel: "10–100 m and more, straight or loop",
    speed: "1–3 m/s",
    accuracy: "Positioned to ±1–2 mm; locating pins at stations for precise work",
    payload: "500 kg to several tonnes",
    models: ["Rail-guided shuttles (Daifuku / Murata class)", "Custom RGV carts with a robot on top"],
    costLakh: [10, 60],
    components: ["Floor rails flush with the floor", "Drive cart with position encoder", "Power rail or onboard battery", "Locating pins or clamps at each station"],
    safety: ["Fenced route or scanners on the cart", "Crossing points marked and interlocked"],
    notes: ["Lock the cart at each station before precise work", "Rails set in the floor are easy to cross; raised rails are a trip hazard"],
    length: { def: 5, min: 3, max: 8 },
    v: 2,
    a: 1,
  },
};

export const MOTION_ORDER: MotionType[] = ["fixed", "track", "overhead", "gantry", "amr", "lift", "rgv"];

/** The motion system a job uses by its nature (a robot on a track for multi-machine tending…). */
const JOB_MOTION: [RegExp, MotionType][] = [
  [/linear track|7th[- ]axis|robot transfer unit/i, "track"],
  [/overhead track|inverted|heavy fabrication|gantry weld/i, "overhead"],
  [/gantry|cartesian|rebar tying|greenhouse/i, "gantry"],
  [/lift column|8th[- ]axis|high stacking/i, "lift"],
  [/rail-guided|\brgv\b/i, "rgv"],
  [/mobile manipulator|material transport|truck & container/i, "amr"],
];
export const motionForJob = (job: string): MotionType => (JOB_MOTION.find(([re]) => re.test(job)) || [])[1] ?? "fixed";

/** A motion system the user names in their own words, or null. */
const BRIEF_MOTION: [RegExp, MotionType][] = [
  [/\b(overhead (track|rail|gantry robot)|inverted robot|ceiling[- ]mounted robot|robot hangs?)\b/i, "overhead"],
  [/\b(7th[- ]axis|seventh axis|linear track|floor track|robot (on|rides) (a )?(track|rail)|robot transfer unit|rtu)\b/i, "track"],
  [/\b(cartesian|gantry robot|gantry)\b/i, "gantry"],
  [/\b(mobile manipulator|(cobot|robot|arm) on (an? )?(amr|agv|mobile robot)|amr|agv|mobile robot)\b/i, "amr"],
  [/\b(lift column|vertical axis|8th[- ]axis|tall stacks?|high stack\w*)\b/i, "lift"],
  [/\b(rgv|rail[- ]guided|shuttle cart|rail cart)\b/i, "rgv"],
  [/\b(row of (machines|cnc\w*|presses)|several machines|many machines|(two|three|four|five|six|2|3|4|5|6) (cnc|machines|lathes|presses))\b/i, "track"],
];
export function motionFromBrief(text: string): MotionType | null {
  return (BRIEF_MOTION.find(([re]) => re.test(String(text || ""))) || [])[1] ?? null;
}

/** Seconds to travel `m` metres on a motion system (accelerate, cruise, brake). */
export function travelSeconds(type: MotionType, m: number): number {
  const s = MOTION_SYSTEMS[type];
  if (!s.v || m <= 0) return 0;
  const accelDist = (s.v * s.v) / s.a;
  return m >= accelDist ? m / s.v + s.v / s.a : 2 * Math.sqrt(m / s.a);
}

/** One line for the plan: "Floor track (7th axis), 4 m: about 3.2 s each way." */
export function motionSummary(type: MotionType, m: number): string {
  const s = MOTION_SYSTEMS[type];
  if (type === "fixed") return `${s.name}: no travel.`;
  return `${s.name}, ${+m.toFixed(1)} m${type === "lift" ? " lift" : ""}: about ${travelSeconds(type, m).toFixed(1)} s each way.`;
}
