/**
 * Automation Studio — how an automation engineer thinks.
 *
 * The stages a robot system integrator runs a project through, and for each
 * kind of job the questions they ask, the rules of thumb they apply, the
 * equipment around the robot and the mistakes they avoid. thinkCell() walks
 * one builder cell through that reasoning, step by step, with the user's own
 * robot, tool and simulated cycle time.
 */

import { PROCESS_PROFILES, processKind, type ProcessKind } from "./processProfiles";
import { SKILLS } from "./robotKnowledge";
import type { Choice } from "./EquipmentPicker";
import type { CheckItem } from "./cellCheck";
import { attachmentIssues } from "./attachmentFit";
import type { JobKit } from "./jobKit";
import { classOf, fmeaFor, MOTION, pickPlaceCycle, safetyFunctions } from "./engineerThinking";
import type { Match } from "./equipmentScore";

/* ------------------------------------------------------------ project stages */

export interface Stage {
  name: string;
  /** What the engineer works out at this stage. */
  think: string;
  /** What comes out of it. */
  output: string;
  weeks: string;
}

export const PROJECT_STAGES: Stage[] = [
  { name: "Understand the job", think: "Watch the operator. Note every step, part weight, size, variants, takt time and what goes wrong today.", output: "Process sheet and target cycle time", weeks: "1" },
  { name: "Feasibility", think: "Can a robot do it repeatably? Check part presentation, tolerances, reach, payload and the business case before choosing anything.", output: "Go / no-go with payback estimate", weeks: "1–2" },
  { name: "Concept & layout", think: "Decide how parts come in and leave, where the robot stands, where people load, and which stations share one robot.", output: "Cell layout and material flow", weeks: "1–2" },
  { name: "Choose equipment", think: "Size the robot (payload with margin, reach, axes), then the gripper or tool, sensors, vision, fixtures, PLC and safety devices.", output: "Bill of materials and quotation", weeks: "1–2" },
  { name: "Simulate", think: "Prove reach, collisions and cycle time in 3D before cutting steel. Find the bottleneck and fix it on screen.", output: "Verified layout and cycle time", weeks: "1–2" },
  { name: "Safety & risk", think: "Risk assessment for every task, including loading, teaching and fault recovery. Choose fence, light curtain, scanner or collaborative mode.", output: "Risk assessment and safety concept (ISO 12100, ISO 10218)", weeks: "1" },
  { name: "Build & FAT", think: "Build, wire and program the cell at the integrator. Run real parts through the factory acceptance test.", output: "Signed FAT with cycle-time and quality records", weeks: "6–12" },
  { name: "Install, SAT & train", think: "Install on site, connect utilities and line signals, run production parts at rate, train operators and maintenance.", output: "Signed SAT, manuals, spare parts list", weeks: "2–4" },
];

/* ------------------------------------------------------------- per-job playbooks */

export interface Playbook {
  /** The one thing that decides success for this job. */
  key: string;
  ask: string[];
  rules: string[];
  around: string[];
  mistakes: string[];
  /** Typical robot cycle per part, seconds. */
  cycle: [number, number];
}

export const PLAYBOOK: Record<ProcessKind, Playbook> = {
  handling: {
    key: "Parts must arrive in a known place and orientation, or the robot needs vision.",
    ask: ["How do parts arrive: fixed nest, conveyor, tray or loose in a bin?", "Heaviest part with the gripper?", "How many variants, and how fast is changeover?"],
    rules: ["Payload = part + gripper + fingers, plus 25% margin for acceleration and inertia", "Use a part-present sensor in the gripper so a missed pick stops the cycle", "Loose parts in a bin need 3D vision; a fixed nest needs none"],
    around: ["Infeed conveyor or tray stack", "Part-present sensor", "Outfeed conveyor", "Fence or light curtain"],
    mistakes: ["Forgetting the gripper weight in the payload", "No plan for a dropped part"],
    cycle: [4, 10],
  },
  transport: {
    key: "Distance and payload decide between a robot arm, a track, a gantry or a mobile robot.",
    ask: ["How far does the part travel?", "How many stations does one robot serve?", "Must people cross the path?"],
    rules: ["Beyond about 2 m of travel, put the robot on a 7th-axis track or use a gantry", "Between buildings or areas, an AMR is cheaper than conveyors", "Keep transfer heights the same at every station"],
    around: ["Floor track or gantry", "Buffer stations", "Area scanner where people cross"],
    mistakes: ["Robot waiting while parts travel: add a buffer"],
    cycle: [6, 15],
  },
  welding: {
    key: "Weld quality depends on part fit-up and fixture repeatability more than on the robot.",
    ask: ["MIG, TIG or spot? Material and thickness?", "How much do the parts vary — is the gap consistent?", "Can the part be turned so the weld is flat or horizontal?"],
    rules: ["Fixture must locate the part to about ±0.5 mm or add seam tracking / touch sensing", "Use a positioner so the robot welds flat — the best bead and fewest defects", "Two-station table: the operator loads one side while the robot welds the other", "Torch cleaning every few cycles keeps gas flow and contact tips healthy"],
    around: ["Welding power source and wire feeder", "Weld fixture with clamps", "Positioner or two-station turntable", "Torch cleaning and wire-cut station", "Fume extraction", "Arc-flash screens and fence"],
    mistakes: ["Poor fixture causing gaps the robot cannot bridge", "No torch cleaning — spatter blocks the nozzle", "Cables snagging when the torch rotates"],
    cycle: [20, 120],
  },
  machining: {
    key: "Keep the machine cutting: the robot should be ready with the next blank when the door opens.",
    ask: ["Machine cycle time vs. load/unload time?", "How are blanks presented — drawer, tray, conveyor?", "Does the machine have an automatic door and chuck signals?"],
    rules: ["A dual gripper swaps finished and raw parts in one visit — often 40% faster unload/load", "Robot I/O to the CNC: door open, chuck clamp, cycle start, cycle done", "One robot can tend two machines if each machining cycle is longer than two load/unload cycles", "Blow off chips before gripping and before loading"],
    around: ["Dual gripper with soft jaws", "Blank and finished-part drawers or trays", "Air blow-off", "Auto door on the machine", "CNC interface (I/O or fieldbus)"],
    mistakes: ["Single gripper making the machine wait twice", "Chips on the chuck causing bad clamping"],
    cycle: [10, 25],
  },
  finishing: {
    key: "Grinding and polishing need constant contact force, not just an accurate path.",
    ask: ["How much material must come off? Is the surface curved?", "What finish (Ra) is required?", "Do parts vary in size or position?"],
    rules: ["Use a force/torque sensor or active compliance flange to hold constant force", "Pick a stiff robot with payload for spindle + reaction forces (usually 20 kg+)", "Plan automatic abrasive change and dust extraction"],
    around: ["Grinding or polishing spindle", "Force/torque sensor or compliant flange", "Abrasive change station", "Dust extraction"],
    mistakes: ["Position-only path: too much force gouges, too little leaves marks", "Under-sized robot vibrating under load"],
    cycle: [30, 180],
  },
  coating: {
    key: "Even film thickness comes from constant gun distance, speed and overlap.",
    ask: ["Paint, powder, sealant or glue?", "Is the area hazardous (solvent)?", "Target thickness or bead size?"],
    rules: ["Solvent paint needs an explosion-proof (ATEX) painting robot", "Keep the gun at constant distance and 50% pass overlap", "Dispensing needs a metered pump and bead check by vision"],
    around: ["Spray gun or dispensing valve", "Paint booth with airflow and filters", "Colour change and gun cleaning", "Bead inspection camera"],
    mistakes: ["Standard robot in a hazardous zone", "Ignoring cure / open time between steps"],
    cycle: [20, 90],
  },
  inspection: {
    key: "Lighting matters more than the camera: control it and the check becomes repeatable.",
    ask: ["What defect must be found, and how small?", "Is it a pass/fail check or a measurement?", "What happens to a rejected part?"],
    rules: ["Use controlled lighting or an enclosure — sunlight ruins detection", "Measurements need a calibrated 3D sensor or laser profiler", "Log every result with the part's serial number for traceability"],
    around: ["Camera with lighting", "Reject bin or chute", "Code reader for traceability"],
    mistakes: ["Testing only good parts during set-up", "No reject handling"],
    cycle: [3, 10],
  },
  palletizing: {
    key: "Payload with the gripper and the full stack height decide the robot.",
    ask: ["Heaviest case or bag with the gripper?", "Pallet size and stack height?", "Cases per minute, and how many patterns?"],
    rules: ["Payload = product + gripper (often 12–25 kg) plus 15–20% margin", "Reach to the far corner of a 1200 × 1000 pallet at full stack height (up to 2 m)", "Two pallet stations so the line keeps running during a pallet change", "A 4-axis palletizing robot is faster and cheaper than a 6-axis for this job"],
    around: ["Vacuum or fork gripper", "Infeed conveyor with stop", "Two pallet stations", "Pallet and slip-sheet dispenser", "Light curtain or muting at the pallet exit"],
    mistakes: ["Under-rating payload — the most common cause of gearbox failure", "Single pallet station stopping the line"],
    cycle: [5, 10],
  },
  packing: {
    key: "Speed and gentle handling decide between a delta, SCARA or 6-axis robot.",
    ask: ["Products per minute?", "Are products fragile or food?", "Do they arrive randomly on a moving belt?"],
    rules: ["Above about 60 picks per minute use a delta robot with conveyor tracking", "Food contact needs washdown-rated robot and food-grade grippers", "Random positions on a belt need a camera and encoder tracking"],
    around: ["Vacuum or soft gripper", "Camera with conveyor tracking", "Carton erector and sealer"],
    mistakes: ["Stopping the belt for each pick instead of tracking it"],
    cycle: [1, 6],
  },
  assembly: {
    key: "Tolerances: the part and the hole must line up within what the robot and tool can absorb.",
    ask: ["Insertion clearance and force?", "Screws: size, torque and feeding?", "How many variants?"],
    rules: ["Tight fits need compliance or force sensing (search pattern)", "Screwdriving needs an auto-feed screw presenter and torque monitoring", "SCARA is fastest for vertical insertion of small parts"],
    around: ["Screwdriver with feeder", "Part feeders or trays", "Force sensor", "Fixture with locating pins"],
    mistakes: ["Rigid insertion jamming parts", "No torque/angle record for quality"],
    cycle: [5, 20],
  },
  filling: {
    key: "Accurate dosing and no spills at production speed.",
    ask: ["Liquid, paste or powder? Dose volume and accuracy?", "Container size and rate?"],
    rules: ["Weigh-check or flow-meter feedback for dose accuracy", "Hygienic, easy-clean design for food and pharma"],
    around: ["Dosing pump and nozzle", "Check-weigher", "Container infeed"],
    mistakes: ["Dripping nozzles contaminating the line"],
    cycle: [3, 10],
  },
  sealing: {
    key: "Each cap or seal must reach the right torque or pressure, every time.",
    ask: ["Screw cap, press-fit or heat seal?", "Required torque?"],
    rules: ["Use a servo capping head with torque monitoring", "Present caps oriented with a feeder"],
    around: ["Capping head", "Cap feeder and chute", "Torque check"],
    mistakes: ["Cross-threading from misaligned caps"],
    cycle: [2, 6],
  },
  labeling: {
    key: "Label placement repeatability and reading back the code.",
    ask: ["Label size and position tolerance?", "Print-and-apply or pre-printed?"],
    rules: ["Print-and-apply with a code reader to verify every label", "Flat, stable surface at the label position"],
    around: ["Label printer-applicator", "Code reader", "Reject for bad labels"],
    mistakes: ["No read-back — wrong labels ship"],
    cycle: [2, 6],
  },
};

export const playbookFor = (job: string) => {
  const kind = processKind({ name: job });
  return { kind, label: PROCESS_PROFILES[kind].label, skill: SKILLS[kind], book: PLAYBOOK[kind] };
};

/* ------------------------------------------------------- reasoning for one cell */

export type ThoughtState = "ok" | "warn" | "todo";
export interface Thought {
  step: string;
  thought: string;
  state: ThoughtState;
}

const MARGIN = 1.25;
const CELL_REACH_MM = 1400;
const mm = (v: number) => (v < 10 ? v * 1000 : v);

/** Walks one cell through the engineer's reasoning with the user's own choices. */
export function thinkCell(r: {
  job: string;
  choice: Choice;
  needKg?: number;
  fenced?: boolean;
  cobot: boolean;
  cycle: number | null;
  checks: CheckItem[];
  /** Share of the cycle per step group, e.g. { Pick: 0.6 }. */
  split?: Record<string, number>;
  /** Accessories, components, other equipment and software the job needs (jobKit). */
  kit?: JobKit;
  /** Components the user added to the cell. */
  parts?: Match[];
}): Thought[] {
  if (!r.job)
    return [
      { step: "The job", thought: "Choose the job first — what the robot does decides its payload, tool, stations and safety.", state: "todo" },
      ...(r.fenced === undefined ? [{ step: "Safety", thought: "Then choose a safety fence, or an open cell if it is a cobot.", state: "todo" as ThoughtState }] : []),
    ];
  const { kind, label, skill, book } = playbookFor(r.job);
  const out: Thought[] = [];
  const robot = r.choice.robot;
  const check = (l: string) => r.checks.find((c) => c.label === l);

  out.push({ step: "The job", thought: `${label}: ${skill.does} ${book.key}`, state: "ok" });

  if (r.needKg != null) {
    const want = Math.ceil(r.needKg * MARGIN);
    const p = robot?.payload;
    out.push(
      !robot || p == null
        ? { step: "Payload", thought: `Part + tool need about ${r.needKg} kg. With a 25% margin for acceleration and inertia, choose a robot of ${want} kg or more.`, state: "todo" }
        : p >= want
          ? { step: "Payload", thought: `${r.needKg} kg needed + 25% margin = ${want} kg. The ${p} kg robot has headroom.`, state: "ok" }
          : p >= r.needKg
            ? { step: "Payload", thought: `${p} kg covers the ${r.needKg} kg load but not the 25% margin (${want} kg). Fine for slow moves; a bigger robot lasts longer.`, state: "warn" }
            : { step: "Payload", thought: `${p} kg is below the ${r.needKg} kg load. Choose ${want} kg or more.`, state: "warn" },
    );
  }

  const reach = robot?.reach;
  out.push(
    !robot || !reach
      ? { step: "Reach", thought: `The stations sit about ${CELL_REACH_MM / 1000} m from the robot base. Choose at least ${CELL_REACH_MM} mm reach.`, state: "todo" }
      : mm(reach) >= CELL_REACH_MM
        ? { step: "Reach", thought: `${Math.round(mm(reach))} mm reach covers the stations at ${CELL_REACH_MM} mm.`, state: "ok" }
        : { step: "Reach", thought: `${Math.round(mm(reach))} mm is short of the ${CELL_REACH_MM} mm stations. Choose a longer arm, or move the stations closer.`, state: "warn" },
  );

  for (const l of ["Robot type", "Tool"] as const) {
    const c = check(l);
    if (c) out.push({ step: l, thought: c.detail, state: c.state === "ok" ? "ok" : c.state === "warn" ? "warn" : "todo" });
  }

  // Equipment around the robot that this job needs.
  if (kind === "finishing")
    out.push(
      r.choice.sensor
        ? { step: "Force control", thought: `${r.choice.sensor.name} keeps contact force constant.`, state: "ok" }
        : { step: "Force control", thought: "Add a force/torque sensor or compliant flange — grinding needs constant force, not just a path.", state: "warn" },
    );
  if (kind === "inspection")
    out.push(
      r.choice.camera
        ? { step: "Vision", thought: `${r.choice.camera.name} with controlled lighting does the check.`, state: "ok" }
        : { step: "Vision", thought: "Add a camera and lighting for the inspection.", state: "warn" },
    );
  out.push({ step: "Around the robot", thought: book.around.join(", ") + ".", state: "todo" });

  // The rest of the bill of materials: accessories, components, other equipment and software.
  if (r.kit) {
    const lc = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);
    const parts = r.parts ?? [];
    const accLeft = r.kit.accessories.filter((a) => !r.choice[a.slot]);
    const compLeft = r.kit.components.filter((x) => !parts.some((m) => m.source === x.match.source && m.id === x.match.id));
    const have = [r.choice.changer, r.choice.sensor, r.choice.camera, ...parts].filter(Boolean).map((m) => m!.name);
    if (accLeft.length || compLeft.length)
      out.push({ step: "Accessories & components", thought: [...accLeft, ...compLeft].map((x) => `${x.match.name}: ${lc(x.why)}`).join(". ") + ".", state: "todo" });
    else if (have.length) out.push({ step: "Accessories & components", thought: `In the cell: ${have.join(", ")}.`, state: "ok" });
    if (r.kit.also.length) out.push({ step: "Also needed", thought: r.kit.also.join(", ") + ".", state: "todo" });
    if (r.kit.software.length)
      out.push({ step: "Software", thought: r.kit.software.map((x) => `${x.name} (${x.maker}): ${lc(x.does)}`).join(". ") + ".", state: "todo" });
  }

  const safety = check("Safety");
  if (safety) out.push({ step: "Safety", thought: `${safety.detail}. Run a risk assessment (ISO 12100) for loading, teaching and fault recovery.`, state: safety.state === "ok" ? "ok" : "warn" });

  if (r.cycle) {
    const [lo, hi] = book.cycle;
    const pick = r.split?.Pick ?? 0;
    const move = r.split?.Move ?? 0;
    const tip =
      pick > 0.5
        ? kind === "machining"
          ? "Most of the time is picking — a dual gripper or a closer infeed would cut it."
          : "Most of the time is waiting for or picking parts — the cell upstream or the infeed sets the pace."
        : move > 0.4
          ? "Much of the time is travel — move the stations closer or reduce path height."
          : "The process itself sets the pace; for more output add a second robot.";
    out.push({
      step: "Cycle time",
      thought: `${r.cycle.toFixed(1)} s in the simulation; typical for this job is ${lo}–${hi} s. ${tip}`,
      state: r.cycle <= hi * 1.2 ? "ok" : "warn",
    });
  } else out.push({ step: "Cycle time", thought: "Run the 3D line to measure the cycle and find the slowest step.", state: "todo" });

  // Motion check: what the robot's travel alone needs, against the simulated cycle.
  if (robot && ["handling", "transport", "machining", "palletizing", "packing", "inspection"].includes(kind)) {
    const payload = robot.payload ?? 10;
    const cls = classOf(payload, `${robot.type ?? ""} ${robot.name}${r.cobot ? " cobot" : ""}`);
    const est = pickPlaceCycle({ travelM: kind === "palletizing" ? 1.8 : 1.2, partKg: (r.needKg ?? payload) * 0.6, robotPayloadKg: payload, cls, gripper: /vacuum|suction/i.test(r.choice.tool?.name ?? "") ? "vacuum" : "parallel" });
    out.push({
      step: "Motion check",
      thought: `A ${MOTION[cls].label} needs about ${est.total.toFixed(1)} s for one pick and place over 1.2 m (travel ${est.travel.toFixed(1)} s, grip and settle ${(est.grip + est.settle).toFixed(1)} s).${r.cycle ? ` The 3D cycle is ${r.cycle.toFixed(1)} s, so ${r.cycle > est.total * 1.3 ? "the rest is waiting for parts or the machine" : "the robot's motion sets the pace"}.` : ""}`,
      state: "ok",
    });
  }
  // Safety level each safety function must reach (ISO 13849-1 risk graph, ISO 10218 minimum PL d).
  const functions = safetyFunctions({ kinds: [kind], robots: 1, cobots: r.cobot ? 1 : 0, press: /press|stamp|forg/i.test(r.job), mobile: /mobile/i.test(r.job), palletizing: kind === "palletizing" });
  if (functions.length) out.push({ step: "Safety level", thought: functions.map((x) => `${x.fn}: PL ${x.required} (S${x.s} F${x.f} P${x.p})`).join(". ") + ".", state: "todo" });
  // The failure modes to design out first (FMEA, highest severity × occurrence × detection).
  const risks = fmeaFor([kind], 2);
  if (risks.length) out.push({ step: "Failure modes", thought: risks.map((x) => `${x.mode} (RPN ${x.rpn}): ${x.action}`).join(". ") + ".", state: "todo" });

  const fit = attachmentIssues(r.job, r.choice).filter((f) => f.title !== "Tool does not do this job");
  if (fit.length) out.push({ step: "Attachments", thought: fit.map((f) => `${f.title}: ${f.detail}`).join(" "), state: "warn" });
  const notes = JOB_NOTES[r.job];
  if (notes) out.push({ step: `For ${r.job.toLowerCase()}`, thought: notes.join(". ") + ".", state: "todo" });
  out.push({ step: "Avoid", thought: book.mistakes.join(". ") + ".", state: "todo" });
  return out;
}

/** A builder job for each kind, used to open the playbook entry in the cell builder. */
export const KIND_JOB: Record<ProcessKind, string> = {
  handling: "Loading & Unloading", transport: "Material Transport", welding: "MIG/MAG Welding", machining: "CNC Machining",
  finishing: "Grinding & Surface Prep", coating: "Painting & Coating", inspection: "Vision Inspection", palletizing: "Palletizing",
  packing: "Packing & Box Forming", assembly: "Screw Driving", filling: "Filling", sealing: "Capping", labeling: "Labeling & Weighing",
};

/* ------------------------------------------------- job-specific know-how */

/** Extra rules for each builder job, on top of its family playbook. */
export const JOB_NOTES: Record<string, string[]> = {
  "Stone Slab Handling": ["Vacuum lifter with sealed pads, a reserve tank and a non-return valve: a slab must not drop on a power or air cut", "Check slab thickness and cracks before lifting; porous or wet stone needs more cups", "Slabs of 300–1,000 kg: heavy robot or gantry; never let people stand under a lifted slab"],
  "Stone & Granite Edge Polishing": ["Wet polishing: IP67 robot, water-fed spindle and slurry drainage", "Run the grit sequence with a pad changer; force control keeps the finish even", "Scan each piece: natural stone varies in size and edge shape"],
  "Textile Bobbin & Cone Handling": ["Expanding grippers inside the tube; never squeeze the yarn", "Lint builds up: covered robot, regular blow-off and cleaning", "Link ring frames, winders and packing with AGVs or AMRs"],
  "Bag Placing on Rotary Packers": ["One robot keeps pace with one rotary packer; track the spout with an encoder", "Bag magazines for 20–30 minutes of autonomy, with bag-present and double-bag checks", "Dust-tight robot and cabinet; the operator only refills the magazine"],
  "Compression Moulding Tending": ["Weigh each rubber or SMC charge and place it in the same spot", "Heat-resistant fingers and a spray nozzle for mould release", "Interlock with press open, cure time and platen position"],
  "Blow Moulding Trimming & Handling": ["Grip by the neck or handle while the part is still warm", "Trim flash at a fixed trimming station; collect it for regrind", "Leak-test every container before stacking or bagging"],
  "SMT Reel & Magazine Handling": ["Scan every reel barcode against the job before loading", "ESD-safe gripper and grounding", "An AMR brings material; the robot or operator loads the feeder"],
  "Steel Plant Sampling & Temperature Probing": ["Heat shield and cooled jacket; park the robot outside the hot zone between dips", "A magazine of probes and automatic probe change", "Interlock with furnace tilt and crane movements"],
  "Order Picking": ["Vision finds each item in the tote; vacuum picks most items, a gripper the rest", "Measure picks per hour and mis-picks per 1,000 — 500–1,000 picks/h per robot is typical", "Weigh or scan each pick to confirm the order"],
  "Sorting & Classification": ["Decide the sort key first: barcode, colour, size, weight or defect", "Feed parts singulated and spaced on a belt; sort into chutes or bins", "Track each part's position with a conveyor encoder"],
  "Glass Handling": ["Large vacuum frames with soft cups; check deflection of thin sheets", "Edge damage is the main reject: slow down near racks and stops", "Glass over 2 m² usually needs a 200–500 kg robot or a gantry"],
  "Tyre Handling & Loading": ["Grip the bead from inside with an expanding gripper, or clamp the tread", "Green (uncured) tyres deform: support them over a wide area", "Present tyres to the curing press or rack in a fixed orientation"],
  "Coil & Roll Handling": ["A mandrel or C-hook through the core carries the coil", "Coils of 50–500 kg need a heavy robot or a gantry; check the moment on the wrist", "Protect the coil edges and the outer wrap from damage"],
  "Food Handling & Tray Loading": ["Food-grade robot (IP67/IP69K, food-safe grease) and washable, FDA-compliant gripper", "Soft or vacuum grippers for delicate products; delta robots for 60–150 picks/min", "Vision on the belt finds randomly placed products"],
  "Truck & Container Unloading": ["Cartons stack unevenly: a 3D camera plans each pick", "Long-reach arm or a mobile unloader that drives into the container", "Expect 400–1,200 cartons per hour depending on weight"],
  "CNC Turning": ["Double gripper: unload the finished part and load the raw one in one visit", "Auto door, pneumatic chuck and part-flip station for second-side turning", "Blow out chips and coolant from the chuck before each load"],
  "Stud Welding": ["A stud gun with automatic stud feed; the feeder sits beside the robot", "Drawn-arc studs for thick plate, capacitor discharge for thin sheet", "Check each weld (lift, current, time) and log it against the part"],
  "Pipe & Orbital Welding": ["Rotate the pipe on a positioner so the torch stays in the flat position", "Seam tracking for root passes; multi-pass welding for thick walls", "Fit-up and bevel quality decide the result — check them before welding"],
  "Foundry Fettling & Grinding": ["Castings vary: scan each one and adapt the grinding path", "Heavy, rigid robot (60–150 kg) with a spindle or a fixed belt grinder", "Dust and noise: an enclosed cell with extraction"],
  "Deflashing & Surface Finishing": ["Compliant (floating) deburring tools follow edge variation", "Program along the part edges from CAD; check burr size on samples", "Collect flash and dust at the source"],
  "Powder Coating": ["Robots with covers or ATEX rating in the booth; electrostatic gun and grounding of every part", "Program the gun distance (150–300 mm) and overlap; reciprocators may be cheaper for flat parts", "Recover overspray powder; keep colour changes quick"],
  "Battery Module Assembly": ["Cells are live: insulated tooling, ESD control and short-circuit protection", "Vision checks cell polarity; force-controlled insertion into the module frame", "Track every cell's serial number through the build"],
  "Bearing Insertion Assembly": ["Press-fit with force and distance monitoring on every part", "Align with a compliant (floating) gripper or force/torque sensor before pressing", "Reject parts whose force curve leaves the window"],
  "Barcode Scanning & Verification": ["Fixed-mount scanner or camera; the robot presents each code to it", "Grade 1D/2D codes (ISO/IEC 15416 / 15415) where customers require it", "Divert unreadable or mismatched parts to a reject lane"],
  "Wrapping & Packing": ["Stretch-wrap pallets on a turntable; the robot handles products, not the film", "Shrink-wrap or flow-wrap machines need even product spacing on the infeed", "Check the wrap with a sensor before the pallet leaves"],
  "Brick & Block Stacking": ["Clamp grippers grip a whole row; vacuum works only on smooth blocks", "Heavy layers (100–500 kg): palletizing robot or gantry", "Stack patterns interlock rows for stable cubes; check layer height"],
  "Loading & Unloading": ["Standardise trays or nests so every part sits in the same place", "Put a part-present sensor in the gripper and in each nest", "Check part weight × gripper offset against the robot's wrist load diagram"],
  "Bin Picking": ["Mount a 3D camera above the bin; plan collision-free paths to the bin walls", "Expect 90–98% first-pick success — add a re-grip or drop-back routine", "Typical cycle 6–12 s per part including vision"],
  "Material Transport": ["Under 2 m: robot arm; along a line: 7th-axis track; between areas: AMR (ISO 3691-4)", "Add buffers so a stop at one station does not stop the line", "Plan charging, traffic rules and safe speeds wherever people walk"],
  "Injection Moulding Tending": ["Top-entry (sprue picker or 3-axis) or side-entry robot, interfaced by Euromap 67/73", "The robot must enter, grip and leave inside the mould-open time (often 1–3 s)", "Plan degating, insert loading and a cooling conveyor"],
  "CNC Machining": ["Use the machine's door, chuck/vice and cycle-start signals (M-codes or I/O)", "Blow chips off the part and the chuck before every load", "A zero-point or automatic vice makes changeovers fast"],
  "Press Tending & Stamping": ["Detect double blanks before loading (oiled sheets stick together)", "Part-in-die and press-position signals interlock the robot with the press", "Vacuum or magnetic crossbar tooling; tandem lines run 8–15 strokes/min"],
  "MIG/MAG Welding": ["Touch sensing finds the joint; through-arc seam tracking follows it", "Two-station turntable or table so loading overlaps welding", "Clean the torch and cut the wire every few parts so arc starts stay reliable"],
  "TIG Welding": ["Tight fit-up (about ±0.2 mm) — TIG cannot bridge gaps like MIG", "Shield cables against high-frequency arc start interference", "Slow travel (100–300 mm/min); plan tungsten grinding and cold-wire feed"],
  "Spot Welding": ["Servo guns weigh 60–150 kg: robots of 165–270 kg payload are normal", "Tip dressing every 200–300 welds keeps the electrode face clean", "Needs weld controller (MFDC), cooling water and a dress pack along the arm"],
  "Grinding & Surface Prep": ["Compensate abrasive wear in the program or with force control", "Aluminium dust is explosive — use ATEX-rated extraction", "Measure removal on test parts and keep spare abrasives at a change station"],
  "Polishing": ["Decide: robot holds the tool, or robot holds the part against a fixed belt/wheel", "Several grit steps; automatic compound application and wheel wear compensation", "Collect polishing dust and compound with extraction at the wheel"],
  "Painting & Coating": ["Electrostatic bells transfer 80–90% of paint vs 30–60% for air spray", "Simulate film thickness offline before painting real parts", "Explosion-proof (ATEX) robot and booth for solvent paints; plan colour changes"],
  "Adhesive & Sealant Dispensing": ["Flow must follow robot speed (speed-dependent dosing) so the bead stays even in corners", "Temperature-control the material; purge before pot life ends", "Check every bead with vision"],
  "Assembly": ["Chamfers and compliance (or force control) let parts find each other", "Record force/position of every press-fit for traceability", "Present parts the same way every time: feeders, trays or vision"],
  "Screw Driving": ["Blow-feed or pick-from-presenter screw feeding", "Monitor torque and angle on every screw to catch cross-threads and missing screws", "Design for automation: lead-in on holes, one screw head type, all from one direction"],
  "Quality Inspection": ["Gauge R&R: measurement error should be under 10% of the tolerance", "Decide what the robot does with rejects before building", "Run a master part every shift to prove the system still measures right"],
  "Vision Inspection": ["Plan 3–4 pixels across the smallest defect", "Backlight for outlines, dome light for shiny parts, low-angle light for scratches", "Collect good and bad samples before choosing the camera and lighting"],
  "Filling": ["Weigh-check or flow-meter feedback holds dose accuracy", "Hygienic design: no dead corners, easy cleaning", "Drip-free nozzles and a tray under the filler keep the line clean"],
  "Capping": ["Servo capping head with torque monitoring", "Orient caps in a feeder before the robot picks them", "Check cap presence and height after capping"],
  "Labeling & Weighing": ["Verify every label with a code reader", "Checkweighers for sale by weight must meet Legal Metrology rules", "Print-and-apply when the label changes per pack; pre-printed labels when it does not"],
  "Packing & Box Forming": ["Above about 60 picks per minute use a delta robot with conveyor tracking", "Carton erector and sealer set the line pace — size them first", "Pack pattern, product orientation and carton size decide the gripper"],
  "Palletizing": ["Pattern software builds layers and interlocking from case size", "Plan slip sheets, stretch wrapping and pallet quality checks", "Check pallet weight, height and stability against truck and racking limits"],
  "Depalletizing": ["3D vision finds each case when layer patterns vary or cases shift in transit", "Remove slip sheets with a vacuum strip or a second tool", "Single-SKU pallets can use the known pattern; mixed pallets need vision"],
  "Kitting & Sequencing": ["Kit trays with one pocket per part make a missing part obvious", "Check each kit with pick-to-light or vision before it leaves", "Sequence kits to the assembly line's build order (just-in-sequence)"],
  "Mobile Manipulator Machine Tending": ["Docking is only accurate to a few mm: use reference markers or a touch-off at each machine", "Battery and charging time decide how many machines one robot can serve", "Platform safety to ISO 3691-4 and arm safety to ISO 10218 — plan speed limits and scanner fields"],
  "Die Casting Extraction": ["Extract, check the part is complete, quench and trim in one robot cycle", "Heat-resistant jacket and gripper; the same robot can spray die release", "Interlock die-open and ejector signals with the casting machine"],
  "Press Brake Bending": ["The robot follows the sheet as it bends, synchronised with the ram", "Plan a regrip station for parts that need several bends", "Angle measurement and back-gauge keep bends in tolerance"],
  "Sheet Loading & Nested Part Sorting": ["Peel the top sheet and check for double sheets before loading", "Micro-joints keep nested parts in place until the robot sorts them", "Sort by order and destination; plan skeleton removal and scrap handling"],
  "Laser Welding": ["Fit-up gap must be tiny (about 10% of sheet thickness) — fixtures matter most", "Class 4 laser: fully enclosed cell with laser-safe windows and interlocks", "Seam tracking or vision, because the laser spot is under 1 mm"],
  "Ultrasonic Plastic Welding": ["Design energy directors into the parts; the joint design decides the weld", "Weld to energy, time or collapse distance, and log every weld", "The robot either carries the welding stack or loads a fixed welding press"],
  "Potting, Gap Filler & Conformal Coating": ["Meter-mix two-part materials and purge before the pot life ends", "Slow flow or vacuum potting avoids voids", "Mask connectors or use a selective coating valve; inspect under UV light"],
  "Laser Cleaning & Surface Prep": ["Tune pulse energy and overlap for each coating and base metal", "Class 4 laser enclosure and fume extraction are required", "Keep a constant stand-off with the robot path or a distance sensor"],
  "Riveting Assembly": ["Monitor force and stroke on every self-pierce or blind rivet", "Access from both sides, or one side for blind rivets, decides the tool", "C-frame riveting tools are heavy: size the robot for the tool, not the part"],
  "Wire Harness Assembly": ["Routing cables on the board is the hardest step: use dual-arm robots or cable guides", "Test continuity of every circuit at the end", "Start by automating cutting, stripping and crimping"],
  "Dimensional Measurement & Gauging": ["Measurement error should be under 10% of the tolerance (Gauge R&R)", "Temperature changes part size: measure in a stable area or compensate", "Robot-held scanners need a calibrated reference artefact"],
  "Leak Testing": ["Pressure decay for larger leaks; helium or tracer gas for very small leaks", "Temperature and seal wear cause false results — verify daily with a master leak", "Seal fixtures must suit every variant"],
  "Cartoning (Product into Cartons)": ["Count and orient products before the robot picks", "Delta robots with conveyor tracking for high speeds", "The carton erector and closer set the line pace — size them first"],
  "Forging Handling": ["Heat-resistant jaws or tongs, and a foundry jacket on the robot", "Move the billet from furnace to press within a few seconds so it stays hot", "Interlock with the press stroke and spray die lubricant between shots"],
  "Testing & Validation": ["A fixture that contacts or seals every variant the same way", "Log each result against the part serial and divert failed parts to a red bin", "Run a known-good and a known-bad master part every shift"],
  "Laser Marking & Coding": ["Present the part flat and at the laser's focal distance (about ±1 mm)", "Read each code back with a verifier camera and grade it (ISO/IEC 29158)", "Class 1 enclosure and fume extraction around the marker"],
  "Bag & Sack Palletizing": ["Flatten and shape bags before picking for stable stacks", "Fork or claw grippers support the bag from below", "Interlock the layers and check layer height"],
  // Every other skill in the library, so each builder job carries an engineer's notes.
  "Box Forming & Sizing": ["Erect boxes from a blank magazine: vacuum on one face, a fold-up fixture for the flaps", "Right-size boxes to the order to save carton and void fill", "Check the tape or hot-melt seal with a sensor before the box leaves"],
  "Shipping & Dispatch": ["Scan, weigh and label every parcel before it goes to its lane", "Read labels on any side with a camera tunnel; sort by carrier and route", "Size the cell for the peak hour, not the daily average"],
  "Robotic Welding": ["Choose the process first (MIG/MAG, TIG, spot, laser); the robot and torch follow", "Fixtures and part fit-up decide weld quality more than the robot does", "Add seam tracking or touch sensing when gaps vary more than half the wire diameter"],
  "CNC Milling": ["Zero-point clamping or a pallet changer makes every load repeatable", "Blow off chips before each load: one chip under a part ruins the setup", "Size part buffers for the unmanned hours, not one shift"],
  "Drilling": ["A pressure foot clamps the skin and stops burrs; robot stiffness limits hole position", "Measure reference holes with a camera or probe and shift the program", "Extract chips at the drill; watch spindle current for a broken or blunt drill"],
  "Cutting & Sawing": ["The robot carries the cutting head over a fixed part at constant stand-off", "Height control (capacitive or arc voltage) follows warped parts", "Fume extraction and a spark-proof table are part of the cell"],
  "Soldering": ["Set tip temperature, flux and dwell time for each joint", "SCARA or small 6-axis robot with wire feed and tip cleaning between joints", "Check joints by AOI; extract fumes at the tip"],
  "Spray Coating": ["Constant gun distance, speed and about 50 % overlap give even film build", "Measure dry film thickness on the first parts and tune the path", "Explosion-proof robot and booth for solvent-based coatings"],
  "Sealing": ["The sealer or press does the work; the robot presents or places the pack", "Check every seal (leak or vision) before packing", "Washdown-rated equipment where food or pharma is sealed"],
  "Bottling": ["Bottles move on conveyors; robots load crates, cases and pallets", "Neck or vacuum grippers lift many bottles per pick", "Glass breakage detection and a safe clean-up procedure"],
  "Heavy Lifting & Positioning": ["Rated payload includes the gripper; check the load diagram at the real offset", "Slow, smooth moves and safe stops; nobody under a suspended load", "Vacuum with a reserve tank, or clamps that hold when power is lost"],
  "Stacking": ["Interlock layers so stacks stay stable", "Count and height sensors check every layer", "Leave room for stacks to leave by forklift or conveyor"],
  "Part Cleaning & Surface Prep": ["The robot presents the part to wash and blow-off nozzles for repeatable coverage", "Filter and recycle the wash water; check cleanliness with a residue test", "Splash-proof enclosure and a washdown-rated robot cover"],
  "Lab Sample Pipetting & Dosing": ["Lab robot with cleanroom-rated covers; liquid-class settings for each sample type", "Barcode every tube and send results to the LIMS", "Verify accuracy by weighing (gravimetric) before going live"],
  "Wire Arc Additive Manufacturing (Weld Build-up)": ["Layer height and interpass temperature control the shape and the metal", "Robot plus positioner; CAM software slices the part into weld paths", "Leave 1–2 mm stock and machine the part afterwards"],
  "Construction 3D Concrete Printing": ["The mix design sets the open time; each layer must carry the next", "Tune print speed and pump flow together; sensors check layer height", "Place reinforcement and services between layers"],
  "Plasma & Laser Cutting": ["Robots cut 3D parts (pressings, pipes) that flatbed machines cannot", "Height sensing and pierce settings for each material and thickness", "Fume extraction, and a laser-safe enclosure for fibre lasers"],
  "Waterjet Cutting": ["Cold cutting with no heat-affected zone: good for composites and trims", "A catcher cup or tank under the cut; the pump is the big cost", "Robot accuracy limits tolerance; calibrate on the fixture"],
  "CNC Routing & Trimming": ["Robot routing suits large 3D parts at about ±0.2–0.5 mm", "Stiffness matters: a bigger robot, short tools and climb milling", "Dust extraction at the spindle and vacuum fixtures for thin parts"],
  "Shot Blasting & Surface Prep": ["Hold the nozzle (or the part) at a set distance and angle", "Measure surface profile and cleanliness (Sa 2½) on the first parts", "Blast-proof robot jacket, abrasive recovery and dust collection"],
  "Glaze Spraying (Ceramics)": ["Constant distance and speed give even glaze; weigh glazed parts to check", "Painting robot with a hollow wrist; booth with a water curtain", "Programs for each shape: sanitaryware, tableware, tiles"],
  "Thermal Spray & Cladding": ["Gun distance and angle set coating density; turn the part on a positioner", "Measure thickness and hardness; grind or machine to finish", "Sound and dust enclosure; heat shields for the robot"],
  "Icing & Topping Dispensing": ["Vision finds each product; the robot tracks the conveyor", "Food-safe dispensing heads and hygienic design for washdown", "A recipe for pattern and amount per product"],
  "Footwear Sole Adhesive Application": ["Scan the upper in 3D; the robot follows the bonding line", "Primer and adhesive, then heat or UV activation before pressing", "Extract fumes; check bead coverage with vision"],
  "PCB Depaneling & Handling": ["Router or laser depaneling with low stress near components", "ESD-safe gripper: vacuum or edge grip depending on the board", "Extract routing dust; check board edges"],
  "X-Ray & CT Inspection": ["The robot presents the part to the X-ray source at several angles", "Shielded cabinet with interlocks, under a radiation safety licence", "Set reject criteria (porosity, voids) from sample parts"],
  "Aseptic Vial Handling": ["Robot inside an isolator or RABS, decontaminated with VHP", "Sterile-design robot and grippers; no exposed lubricant", "Validate (IQ / OQ / PQ) to GMP before production"],
  "Tray Sealing": ["The robot loads trays into the sealer and takes them out", "Check the seal and label on every tray", "Hygienic, washdown-rated robot and grippers"],
  "Meat Cutting & Deboning": ["3D vision of each carcass sets the cut path", "Sterilize the knife between cuts; hygienic IP69K robot", "Yield and worker safety improve more than speed"],
  "Fruit & Vegetable Picking": ["Vision finds ripe fruit among leaves; soft grippers avoid bruising", "Picking is slow (several seconds per fruit): many arms or long hours", "Plan rows and trellises so robots can reach"],
  "Crate & Tote Handling": ["Clamp grippers hold crates by the rim; full layers need 100 kg+ robots", "Destacker and stacker conveyors feed and take away crates", "Check crate type and damage before it enters the line"],
  "Parcel Induction & Singulation": ["Vision picks one parcel at a time from the pile onto the sorter", "Multi-zone suction grips boxes and poly bags", "Plan around 1,000–1,500 picks an hour per robot"],
  "Textile & Garment Handling": ["Fabric is limp: needle, electro-adhesion or air grippers pick single plies", "Ply separation sensing stops double picks", "Colours and fabrics change every order: keep changeover simple"],
  "Friction Stir Welding": ["Several kN of process force: a heavy, stiff robot or a gantry", "Rigid clamping with a backing bar under the joint", "No filler, no fumes: good for aluminium and EV battery trays"],
  "Multi-Machine Tending on a 7th-Axis Track": [
    "Count machines from cycle times: one robot serves as many machines as fit in one machine's cycle (often 2–4); add more and machines wait for the robot",
    "The track runs as the robot's 7th axis on the same controller, so travel and arm moves are coordinated; rack-and-pinion tracks carry robots up to about 2 t over 12 m or more",
    "Keep the pinion tight and the rack clean and greased: a loose pinion, wrong backlash and chips wear the rack; set acceleration so the robot does not shock-load the track",
  ],
  "Overhead Gantry Machine Loading": [
    "A gantry loads from above, so the floor round the machines stays free for operators, chip carts and maintenance",
    "Size the gantry for the heaviest part plus the gripper, and for the vertical stroke down into each machine",
    "Plan a turnover station when both ends of the part are machined, and a buffer for raw and finished parts",
  ],
  "Multi-Line Palletizing on a 7th-Axis Track": [
    "One robot serves several lines when their combined case rate fits the robot's picks per minute, travel included",
    "Each pallet station needs pallet-present sensing and a light curtain, so full pallets are changed while the robot works the other lines",
    "Run the track along the line ends so travel between lines is short; every metre of travel adds cycle time",
  ],
  "Long-Part Welding on a 7th-Axis Track": [
    "The robot rides the track along the part, so long seams are welded in one pass without restarts or re-clamping",
    "Use touch sensing and through-arc seam tracking: long parts bow and vary along their length",
    "Coordinate the track as the 7th axis so the torch keeps its angle and travel speed while the robot moves",
  ],
  "Heavy Fabrication & Gantry Welding": ["A gantry or track-mounted robot reaches long structures", "Touch sensing and through-arc seam tracking cover large tolerances", "Plan multi-pass welds and interpass temperature"],
  "NDT Inspection (Ultrasonic & Eddy Current)": ["The robot scans with the probe at a set angle and couplant flow", "Path from the CAD model; position encoded for the C-scan", "Calibrate on reference blocks; qualified NDT staff sign off"],
  "Tube & Pipe Bending": ["The robot feeds the bender and turns the tube between bends", "Measure bend angles and springback; correct automatically", "Support long tubes and mind the swing radius"],
  "Induction Hardening & Heat Treatment": ["The robot loads the coil fixture or scans the part through the inductor", "Quench and timing set the hardness; record every cycle", "Heat-resistant fingers and robot protection for hot parts"],
  "Extrusion Line Handling": ["Long, flexible profiles need multi-point grippers or gantries", "Place spacers and fill baskets for the ageing oven", "Synchronise with the saw and run-out table"],
  "Molten Metal Ladling & Pouring": ["Ladle a set amount and pour with a controlled tilt profile", "Foundry-rated robot with a heat jacket", "Keep ladle temperature and dross removal under control"],
  "Sand Core Handling & Setting": ["Grip gently: sand cores break easily (vacuum or soft pads)", "Check core position before the mould closes", "Glue or vent cores at stations the robot visits"],
  "Stator Winding & Hairpin Assembly": ["Hairpins are formed, inserted, twisted and welded in sequence", "Vision and compliant grippers for precise insertion", "Laser-weld the pin ends, then test the insulation"],
  "Solar Module Assembly": ["Glass and modules are large and fragile: area vacuum grippers", "EL testing finds cracked cells after layup and lamination", "Robots load framers and the junction-box gluing station"],
  "Control Cabinet Wiring Assembly": ["Wire data from the electrical CAD drives the robot", "Wires are cut, stripped, crimped and routed by the system", "Pull or continuity test every connection"],
  "Wire Crimping & Terminal Assembly": ["Crimp force monitoring checks every crimp", "A camera checks strip length and terminal position", "Dual-arm or SCARA robots insert wires into housings"],
  "THT Component Insertion Assembly": ["Feed components from tape, tube or tray; vision checks the leads", "Set insertion force and clinching per component", "Wave or selective soldering follows"],
  "Rebar Tying & Mesh Assembly": ["The robot ties bar crossings with a tie-wire tool", "Vision finds crossings, on site or in precast plants", "Engineers set the tie pattern; count ties to check"],
  "Disassembly & Remanufacturing": ["Products vary: vision and flexible tools to unscrew and separate", "Sort parts for reuse, recycling or scrap", "Plan for damaged screws and glued joints"],
  "Surface Masking & Demasking": ["The robot places plugs, caps and tape before coating", "A camera checks masks before painting or plating", "Demask after coating; reuse plugs where possible"],
  "Plating & Dip Coating Line": ["The robot or hoist moves racks through the tanks on time", "Corrosion-protected robot and covers", "Record dwell and drip time for every rack"],
  "Blister & Pharma Pack Loading": ["Delta robots load blisters and leaflets at high speed", "Vision checks every product; GMP documentation", "Validated cleaning and change parts"],
  "Strapping & Bundle Packing": ["Clamp and count bars, profiles or boxes into a bundle", "A strapping head ties it; label after", "Heavy bundles need 100 kg+ robots or gantries"],
  "Pouch & Sachet Pick-and-Place": ["Delta robots with conveyor tracking pick 100+ sachets a minute", "Vacuum cups suit flat pouches; vision finds orientation", "Feed carton or tray loaders directly"],
  "Tray & Cup Denesting": ["Separate nested trays or cups one at a time", "Air knives or separator fingers help release", "Synchronise with the filler or packer"],
  "Bag Opening & Emptying": ["The robot cuts the bag and empties it into the hopper", "Dust extraction and an empty-bag compactor", "Check bag ID and weight before emptying"],
  "ASRS & Goods-to-Person Picking": ["The storage system brings totes to the picking robot", "Vision and flexible grippers handle mixed items", "Compare picks per hour with people before choosing"],
  "Pharmacy & Hospital Order Picking": ["A storage robot stores and picks medicine packs by barcode", "Stock and expiry dates tracked automatically", "Connects to the pharmacy or hospital system"],
  "Automatic EV Charging": ["Vision finds the charge port; the robot plugs in", "Works with fleet and parking systems", "Safe operation around people and vehicles"],
  "Recycling & Waste Sorting": ["AI vision identifies materials on the belt", "Fast suction grippers pick 60+ items a minute", "Robust design for dust and dirt"],
  "Food Portioning & Slicing": ["Vision measures each piece and cuts portions to weight", "Ultrasonic or waterjet blades give clean cuts", "Hygienic design and washdown"],
  "Bakery Pan & Tray Handling": ["Heat-resistant grippers move pans in and out of ovens", "Stack and destack trays", "Food-safe design and easy cleaning"],
  "Robotic Kitchen & Food Preparation": ["Recipes run step by step; dispensers dose the ingredients", "Food-safe robot and quick cleaning", "Throughput and menu variety decide the design"],
  "Greenhouse Seeding & Transplanting": ["A gantry or robot transplants seedlings with needle or finger grippers", "Vision rejects weak plants", "Works with tray conveyors"],
  "Robotic Milking": ["3D vision attaches the teat cups", "Milk-quality sensors and cow ID", "Cows choose when to be milked"],
  "Furniture Panel Handling & Edge Banding": ["Vacuum grippers handle large panels without scratches", "The robot feeds edge banders and drilling machines", "Scan each panel's label for batch-size-one production"],
  "Nailing & Stapling": ["The robot nails pallets, frames and crates with a nail gun", "Nail feeder and nail-present check", "Fixtures hold the boards square"],
  "Screen & Pad Printing": ["The robot loads and unloads the printer", "Dry the ink (UV or IR) before stacking", "Vision checks print quality"],
  "3D Printer Farm Tending": ["The robot removes finished prints and starts the next job", "Flexible build plates release parts easily", "Software schedules prints and robot tasks"],
  "Composite Ply Layup & Fibre Placement": ["Pick and place plies with vacuum or electro-adhesion grippers", "Fibre placement heads lay tows automatically", "Temperature- and humidity-controlled room"],
  "Semiconductor Wafer Handling": ["Cleanroom wafer robots move wafers between FOUPs and tools", "Edge-grip or vacuum end effectors, plus an aligner", "SEMI standards and particle control"],
  "Ceiling Drilling & Drywall Fixing": ["The robot drills ceiling holes at positions from the BIM model", "A total station locates the robot on site", "Dust extraction and safety around site workers"],
  "Investment Shell Building (Wax Tree Dipping)": ["Program dip angle, drain time and spin for each part family", "Slurry viscosity and drying-room humidity decide shell quality", "Size the robot for the heaviest tree plus slurry (often 50–70 kg)"],
  "Transformer Core Lamination Laying": ["Lay laminations in the step-lap pattern; vision checks each step", "Thin CRGO sheets: grippers that separate single sheets without bending them", "Burrs and gaps raise no-load loss; handle flat and gently"],
  "Roller Hemming": ["Two or three roller passes fold the flange (90° → 45° → 0°)", "A hemming bed holds the panel: one bed per model", "Heavy robot for the rolling force; check hem height and roll-in"],
  "Egg Collection, Grading & Tray Loading": ["Soft vacuum cups and gentle moves avoid cracks", "Candling and crack detection reject bad eggs first", "Delta robots keep pace with graders at thousands of eggs an hour"],
  "Ceramic Tile Sorting & Packing": ["Vision grades shade, calibre and defects on every tile", "Robots stack by grade and load boxes; boxes are palletized after", "Tiles are heavy and abrasive: area vacuum grippers with spare pads"],
  "Solar Panel Cleaning": ["Waterless robots brush each row every night", "Transfer shuttles move robots between rows", "Clean on soiling data; check the module warranty allows brushing"],
  "Battery Cell Testing & Grading": ["Measure OCV and internal resistance; sort cells into matched grades", "Insulated, ESD-safe grippers: never short a cell", "Store each cell's data for pack traceability"],
  "Wall Plastering & Spray Painting": ["Scan the wall, then spray plaster, putty or paint in even passes", "Size the pump and nozzle for the material (mortar or paint)", "Best on repetitive floors of towers; people finish corners"],
  "Jewellery Polishing & Finishing": ["The robot holds the piece against buffing wheels on a repeatable path", "Controlled pressure loses less gold; collect the dust for recovery", "Mandrels and chucks for rings, bangles and pendants"],
  "Diamond & Gemstone Sorting": ["Micro vacuum nozzles pick even very small stones", "A camera measures size, colour and clarity class", "Track every stone to its parcel and tray"],
  "Windshield Urethane Glazing & Fitting": ["Prime the glass, then lay a heated urethane bead with a triangular nozzle", "Vision aligns the glass to the body opening before fitting", "Check the bead by camera; urethane open time limits the cycle"],
  "Cotton & Jute Bale Handling": ["Bales of 170–250 kg need clamp grippers and 300 kg-class robots", "Weigh and scan each bale for lot traceability", "Feeding bale openers in a set mix improves yarn quality"],
  "Pathology Sample Tube Sorting": ["Read every barcode and sort tubes to analyser racks by test", "Decap and recap automatically to protect staff", "Connect to the LIS and validate to ISO 15189"],
};

/* ------------------------------------------------------ core engineering skills */

export interface CoreSkill {
  name: string;
  /** What the engineer works out. */
  goal: string;
  steps: string[];
  rule: string;
}

export const CORE_SKILLS: CoreSkill[] = [
  { name: "Takt and cycle time", goal: "How fast each robot must work, and how many robots the line needs.", steps: ["Net time = shift time minus breaks", "Takt = net time ÷ parts needed", "Robots = robot cycle ÷ takt, rounded up"], rule: "Design for about 85% of takt to leave room for faults and changeovers." },
  { name: "Payload and inertia", goal: "A robot that carries the load fast for years.", steps: ["Add part + gripper + fingers + cables", "Add 25% for acceleration and wear", "Check wrist moment (weight × offset) and inertia limits"], rule: "Under-sizing is the main cause of early gearbox failure." },
  { name: "Reach and layout", goal: "Every station inside the robot's comfortable working zone.", steps: ["Keep stations within about 80% of rated reach", "Avoid wrist singularities and positions behind the base", "Place operator loading outside the robot's zone"], rule: "If one robot cannot reach everything, use a track, a second robot or move the stations." },
  { name: "Gripper design", goal: "Hold the part safely at full acceleration.", steps: ["Choose principle: fingers, vacuum, magnet, needles", "Calculate holding force with a safety factor", "Add part-present sensing and a plan for power loss"], rule: "Safety factor 2 for lifting; 4 when vacuum or friction carries the part sideways." },
  { name: "Safety design", goal: "People are protected in every mode: run, teach, maintenance.", steps: ["Risk assessment for every task (ISO 12100)", "Required performance level for each function (ISO 13849)", "Safety distance for guards and light curtains (ISO 13855)"], rule: "Cobots still need a risk assessment; force limits follow ISO/TS 15066." },
  { name: "Choosing the solution", goal: "The right kind of automation, not the first robot that comes to mind.", steps: ["List the options: manual with lift assist, cobot, industrial robot, gantry, special-purpose machine", "Weight the criteria from the brief: output, variety, part weight, hazards, investment, space", "Score each option 1–5, multiply by the weights, and write down why the winner wins"], rule: "If two options are within 5 points, decide with a trial or the customer's priorities, not the score." },
  { name: "Cycle time from motion", goal: "A cycle-time promise you can keep.", steps: ["Split the cycle: approach, grip, travel, place, release, return", "Time each move from the robot's speed and acceleration, slower with a heavy load", "Add grip, settle and process time; compare with the typical cycle and the simulation"], rule: "If motion alone takes more than 85 % of takt, shorten the travel or add a robot before quoting." },
  { name: "Line balancing", goal: "Every robot busy, none overloaded, the line meeting its target.", steps: ["Takt = available time ÷ parts needed", "Robots per station = cycle ÷ (takt × target OEE), rounded up", "Find the bottleneck; add buffers before and after it"], rule: "Design for 85 % of takt: faults, changeovers and slow parts eat the rest." },
  { name: "Safety performance level", goal: "Each safety function as reliable as its risk demands.", steps: ["List hazards and safety functions: door interlock, light curtain, E-stop, muting, cobot force limits", "Rate severity (S), exposure (F) and avoidance (P) and read PLr from the ISO 13849-1 graph", "Use at least PL d / Category 3 for robot safety functions (ISO 10218)"], rule: "Validate every safety function before handover (ISO 13849-2), and redo it after any change." },
  { name: "FMEA", goal: "Find what will go wrong before it does.", steps: ["For each task list failure modes, effects and causes", "Score severity, occurrence and detection 1–10; RPN = S × O × D", "Act on the highest RPN and any severity 9–10 first; re-score after the action"], rule: "A high severity needs action even when the RPN is low." },
  { name: "Design review", goal: "The checks an experienced engineer makes before a quote.", steps: ["Payload margin, cycle against takt, reach within 80 %", "Wrist moment, cable dress, fault recovery, changeover", "Maintenance access, utilities, safety level, spare parts"], rule: "Ask what would change the decision (double output, heavier part, more variants) and price the answer." },
  { name: "Accessories, components and software", goal: "A complete bill of materials, not just a robot and a tool.", steps: ["On the arm: tool changer, force/torque sensor, camera or seam sensor", "Beside the robot: power source, feeders, cleaners, vacuum generator, screw or rivet feeder", "Software: the robot maker's simulation and job package, vision or CAM, PLC and safety configuration"], rule: "List every component with its interface (I/O, fieldbus, air, power) before the quote, or it shows up as an extra later." },
  { name: "Controls and integration", goal: "Robot, machines and line talk reliably.", steps: ["Write the I/O list: ready, start, done, fault, part present", "Choose the fieldbus (PROFINET, EtherNet/IP)", "Define recovery after a fault or power cut"], rule: "Every handshake needs a timeout and a clear alarm text." },
  { name: "Vision", goal: "The camera finds or checks every part, every time.", steps: ["Field of view and smallest feature decide the resolution", "Pick lighting before the camera", "Test with bad parts, not only good ones"], rule: "3–4 pixels across the smallest feature or defect." },
  { name: "Simulation and offline programming", goal: "Prove the cell before buying steel.", steps: ["Check reach and collisions for every point", "Measure cycle time and find the bottleneck", "Generate robot programs offline to shorten commissioning"], rule: "Simulated cycle times are usually within 10% of real ones." },
  { name: "Commissioning and acceptance", goal: "The cell does what was promised, at rate.", steps: ["Agree FAT/SAT criteria at order: cycle, quality, uptime", "Run at rate for several hours with real parts", "Train operators and maintenance; hand over spares list"], rule: "Write acceptance criteria into the purchase order." },
  { name: "OEE and maintenance", goal: "The cell keeps running after hand-over.", steps: ["OEE = availability × performance × quality", "Plan greasing, battery and cable checks", "Keep critical spares: gripper parts, cables, cups, tips"], rule: "World-class OEE is about 85%; most new cells start near 60–70%." },
  { name: "Tool changing", goal: "One robot does several jobs by swapping tools inside the cycle.", steps: ["Fit a tool changer (master plate on the robot, a tool plate on each tool) and a tool stand within reach", "Change only with the gripper empty, and count each change (about 3–6 s) in the cycle time", "Pass air, power and signals through the changer modules and check the tool ID after every change"], rule: "A welding torch or spindle cannot pick parts: pair it with a gripper on a changer, or give each tool its own robot at high rates." },
  { name: "Pneumatics and utilities", goal: "Enough air, vacuum and power for every tool.", steps: ["List every cylinder, gripper and blow-off with its size and cycles", "Air use = cylinder volume × pressure ratio × strokes per minute", "Add 20–30% for leaks and supply dry, filtered air"], rule: "Leaks often waste 20–30% of compressed air: check them at hand-over." },
  { name: "Conveyors and buffers", goal: "Parts reach each robot on time without stopping the line.", steps: ["Belt speed = parts per minute × pitch", "Put buffers before slow or less reliable stations", "Use accumulation or zero-pressure conveyors where parts must not touch"], rule: "A few minutes of buffer stops one fault from stopping the whole line." },
  { name: "Palletizing patterns", goal: "Stable, full pallets at the required rate.", steps: ["Fit cases per layer from pallet and case size", "Interlock alternate layers and add slip sheets", "Check the robot's picks per minute against the case rate"], rule: "No overhang, and keep stack height within truck and racking limits." },
  { name: "Business case and payback", goal: "Show when the robot cell pays for itself.", steps: ["Savings = operators freed × shifts × yearly cost, plus scrap and quality gains", "Cost = robot, tooling, safety, integration and training", "Payback = cost ÷ yearly savings"], rule: "Many projects aim for payback within one to three years." },
];

/* --------------------------------------------------------------- calculators */

const G = 9.81;
export const calc = {
  takt(shiftHours: number, breakMin: number, shifts: number, partsPerDay: number) {
    const net = Math.max(0, (shiftHours * 60 - breakMin) * 60 * shifts);
    return partsPerDay > 0 ? net / partsPerDay : 0;
  },
  robotsFor(cycleS: number, taktS: number) {
    return taktS > 0 ? Math.max(1, Math.ceil(cycleS / (taktS * 0.85))) : 0;
  },
  payload(partKg: number, toolKg: number, offsetMm: number) {
    const total = partKg + toolKg;
    return { total, withMargin: total * 1.25, momentNm: total * G * (offsetMm / 1000) };
  },
  /** Vacuum cups: holding force vs. what the part needs. */
  vacuum(partKg: number, cups: number, cupMm: number, vacuumKPa: number, accel: number, sideways: boolean) {
    const area = Math.PI * (cupMm / 2000) ** 2;
    const hold = vacuumKPa * 1000 * area * cups;
    const sf = sideways ? 4 : 2;
    const mu = sideways ? 0.5 : 1;
    const need = (partKg * (G + accel) * sf) / mu;
    const minCup = cups > 0 && vacuumKPa > 0 ? 2000 * Math.sqrt(need / (vacuumKPa * 1000 * cups * Math.PI)) : 0;
    return { hold, need, ok: hold >= need, minCup };
  },
  /** Friction grip with two or more jaws. */
  gripForce(partKg: number, accel: number, mu: number, jaws: number, sf = 2) {
    return mu > 0 && jaws > 0 ? (partKg * (G + accel) * sf) / (mu * jaws) : 0;
  },
  /** ISO 13855 minimum distance for a light curtain approached at right angles. */
  safetyDistance(stopMs: number, deviceMs: number, resolutionMm: number) {
    const t = (stopMs + deviceMs) / 1000;
    const c = resolutionMm <= 40 ? Math.max(0, 8 * (resolutionMm - 14)) : 850;
    let s = 2000 * t + c;
    if (s > 500) s = Math.max(500, 1600 * t + c);
    return Math.max(100, s);
  },
  /** Camera pixels needed across the field of view. */
  vision(fovMm: number, featureMm: number, pxPerFeature = 4) {
    const px = featureMm > 0 ? Math.ceil((fovMm / featureMm) * pxPerFeature) : 0;
    return { px, mp: (px * px * 0.75) / 1e6 };
  },
  /** OEE = availability × performance × quality, from one shift's numbers. */
  oee(plannedMin: number, downMin: number, idealCycleS: number, totalParts: number, goodParts: number) {
    const runMin = Math.max(0, plannedMin - downMin);
    const availability = plannedMin > 0 ? runMin / plannedMin : 0;
    const performance = runMin > 0 ? Math.min(1, (idealCycleS * totalParts) / (runMin * 60)) : 0;
    const quality = totalParts > 0 ? Math.min(1, goodParts / totalParts) : 0;
    return { availability, performance, quality, oee: availability * performance * quality };
  },
  /** Simple payback: cell cost against the yearly labour freed plus other savings. */
  payback(cellCost: number, operators: number, shifts: number, monthlyCostPerOperator: number, otherMonthly = 0) {
    const monthly = operators * shifts * monthlyCostPerOperator + otherMonthly;
    return { monthly, yearly: monthly * 12, months: monthly > 0 ? cellCost / monthly : Infinity };
  },
  /** Conveyor speed for a part rate at a given pitch, and the gap left between parts. */
  conveyor(partsPerMin: number, pitchMm: number, partLengthMm: number) {
    return { speedMpm: (partsPerMin * pitchMm) / 1000, gapMm: pitchMm - partLengthMm };
  },
  /** Cases per layer (best block or two-block pattern), layers and cases per pallet. */
  pallet(palletL: number, palletW: number, caseL: number, caseW: number, caseH: number, maxStackMm: number) {
    const fit = (L: number, W: number, a: number, b: number) => {
      if (a <= 0 || b <= 0) return 0;
      let best = 0;
      // i rows of a×b cases along L, the rest of L filled with the case turned 90°.
      for (let i = 0; i <= Math.floor(L / a); i++) {
        const n = i * Math.floor(W / b) + Math.floor((L - i * a) / b) * Math.floor(W / a);
        best = Math.max(best, n);
      }
      return best;
    };
    const perLayer = Math.max(fit(palletL, palletW, caseL, caseW), fit(palletW, palletL, caseL, caseW));
    const layers = caseH > 0 ? Math.floor(maxStackMm / caseH) : 0;
    const area = palletL * palletW;
    return { perLayer, layers, total: perLayer * layers, fill: area > 0 ? (perLayer * caseL * caseW) / area : 0 };
  },
  /** Free-air consumption of a pneumatic cylinder, litres per minute. */
  air(boreMm: number, strokeMm: number, bar: number, cyclesPerMin: number, doubleActing: boolean) {
    const litresPerStroke = (Math.PI / 4) * boreMm ** 2 * strokeMm * 1e-6;
    const strokes = doubleActing ? 2 : 1;
    return litresPerStroke * strokes * ((bar + 1.013) / 1.013) * cyclesPerMin;
  },
};
