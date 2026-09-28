/**
 * Automation Studio — built-in solution engine.
 *
 * RobotVerse's own engineering knowledge, no external service: it reads any
 * automation brief, extracts the facts it contains (part weight, throughput,
 * shifts, operators, material, environment, variety), matches the processes
 * from the skills library, plans the robots, prices the line and writes the
 * same full solution the AI engineer returns: stations, architecture and
 * alternatives, controls and safety, layout, utilities, risks, plan, budget,
 * ROI, KPIs, assumptions and the questions that would sharpen the design.
 *
 * It answers instantly and offline; the AI engineer, when available, refines it.
 */

import type { ProcessCard } from "@/data/automationStudioIndustries";
import { analyzeDescription, matchTemplateIds, processesFromSkills } from "@/utils/processAnalyzer";
import { processKind, type ProcessKind } from "./processProfiles";
import { planLine, STRATEGIES, type Strategy } from "./robotKnowledge";
import { buildBom, compareOptions, payback } from "./solutionCost";
import type { AiSolution, AiStation } from "./aiSolution";

/* ---------------------------------------------------------------- facts */

export interface BriefFacts {
  weightKg: number | null;
  partsPerHour: number | null;
  shifts: number | null;
  operators: number | null;
  material: string | null;
  size: string | null;
  variants: boolean;
  cobotWanted: boolean;
  hygienic: boolean;
  explosive: boolean;
  cleanroom: boolean;
  outdoor: boolean;
}

const MATERIALS: [RegExp, string][] = [
  [/\bstainless\b/, "stainless steel"],
  [/\b(steel|ms plate|mild steel|iron)\b/, "steel"],
  [/\balumin(i)?um\b/, "aluminium"],
  [/\b(plastic|polymer|pp|abs|pvc|moulded)\b/, "plastic"],
  [/\b(wood|timber|plywood|mdf)\b/, "wood"],
  [/\bglass\b/, "glass"],
  [/\b(concrete|cement|mortar)\b/, "concrete"],
  [/\b(carton|cardboard|corrugated|box(es)?)\b/, "cartons"],
  [/\b(fabric|textile|garment)\b/, "textile"],
  [/\b(food|meat|bakery|dairy|fruit|vegetable|chocolate|snack)\b/, "food"],
  [/\b(tablet|syringe|vial|pharma|medicine)\b/, "pharma"],
  [/\b(pcb|electronic|circuit)\b/, "electronics"],
];

const PER: Record<string, number> = { s: 3600, sec: 3600, second: 3600, min: 60, minute: 60, h: 1, hr: 1, hour: 1, shift: 1 / 8, day: 1 / 24 };

export function extractFacts(brief: string): BriefFacts {
  const t = ` ${brief.toLowerCase().replace(/\s+/g, " ")} `;
  let weightKg: number | null = null;
  const w = t.match(/(\d+(?:\.\d+)?)\s*(kg|kgs|kilo(?:gram)?s?|tons?|tonnes?|t\b|g\b|grams?)/);
  if (w) {
    const v = parseFloat(w[1]);
    weightKg = /^t/.test(w[2]) ? v * 1000 : /^g/.test(w[2]) ? v / 1000 : v;
  }
  let partsPerHour: number | null = null;
  const r = t.match(/(\d[\d,]*(?:\.\d+)?)\s*(?:[a-z]+\s){0,2}?(?:\/|per|an|a|every|each)\s*(s|sec|second|min|minute|h|hr|hour|shift|day)\b/);
  if (r) partsPerHour = Math.round(parseFloat(r[1].replace(/,/g, "")) * (PER[r[2]] ?? 1));
  const cyc = t.match(/cycle(?: time)?(?: of| is|:)?\s*(\d+(?:\.\d+)?)\s*(s|sec|seconds|min|minutes)\b/);
  if (!partsPerHour && cyc) {
    const sec = parseFloat(cyc[1]) * (/^m/.test(cyc[2]) ? 60 : 1);
    if (sec > 0) partsPerHour = Math.round(3600 / sec);
  }
  const sh = t.match(/(\d|one|two|three)\s*shifts?/);
  const shifts = sh ? ({ one: 1, two: 2, three: 3 } as Record<string, number>)[sh[1]] ?? parseInt(sh[1], 10) : /24\s*(x|\/)\s*7|round the clock/.test(t) ? 3 : null;
  const op = t.match(/(\d+)\s*(operators?|workers?|people|persons?|labou?rs?|men|women|staff|manpower)/);
  const size = t.match(/(\d+(?:\.\d+)?\s*(?:mm|cm|m)?\s*[x×]\s*\d+(?:\.\d+)?(?:\s*[x×]\s*\d+(?:\.\d+)?)?\s*(?:mm|cm|m)?)/);
  return {
    weightKg,
    partsPerHour,
    shifts,
    operators: op ? parseInt(op[1], 10) : null,
    material: MATERIALS.find(([re]) => re.test(t))?.[1] ?? null,
    size: size ? size[1].trim() : null,
    variants: /\b(variant|variants|models|sku|skus|mixed|different sizes|changeover|high mix|many parts|family)\b/.test(t),
    cobotWanted: /\b(cobot|collaborative|alongside (the )?(operator|worker)|no fenc|without fenc|human[- ]robot)\b/.test(t),
    hygienic: /\b(food|meat|dairy|bakery|pharma|hygien|washdown|gmp|sterile|aseptic)\b/.test(t),
    explosive: /\b(atex|explosive|solvent|flammable|paint booth|hazardous area)\b/.test(t),
    cleanroom: /\b(clean ?room|iso class|esd)\b/.test(t),
    outdoor: /\b(outdoor|site|construction site|field|yard)\b/.test(t),
  };
}

/* ------------------------------------------------------------ knowledge */

const SENSORS: Record<ProcessKind, string[]> = {
  handling: ["Part-present sensor on gripper", "Vacuum / grip-force switch", "Conveyor end-of-belt photo-eye"],
  transport: ["Photo-eyes at transfer points", "Zone presence sensors"],
  welding: ["Through-arc or laser seam tracking", "Wire / gas flow monitoring", "Fixture clamp-closed switches"],
  machining: ["Chuck / vice clamp confirmation", "Machine door position switches", "Part seated air-gauge"],
  finishing: ["Force / torque sensor", "Tool-wear or current monitoring", "Part-present sensor"],
  coating: ["Flow meter at the gun", "Pressure transducer", "Fixture presence sensor"],
  inspection: ["Industrial camera + lighting", "Encoder trigger", "Reject confirmation sensor"],
  palletizing: ["Pallet-present sensor", "Layer / height check", "Case orientation photo-eye"],
  packing: ["Carton-present sensor", "Checkweigher", "Product count sensor"],
  assembly: ["Torque / angle feedback", "Component-present sensors", "Vision for part location"],
  filling: ["Level / weight check", "Container-present sensor", "Flow meter"],
  sealing: ["Cap-present sensor", "Torque check", "Seal integrity check"],
  labeling: ["Label-present sensor", "Print verify camera", "Product position photo-eye"],
};

const UTILITIES: Partial<Record<ProcessKind, string[]>> = {
  welding: ["Welding power source (3-phase 415 V)", "Shielding gas supply", "Fume extraction 1,500–2,500 m³/h"],
  coating: ["Spray booth ventilation / filtration", "Compressed air 6 bar, dry and oil-free"],
  finishing: ["Dust extraction", "Compressed air 6 bar"],
  machining: ["Machine I/O or robot interface kit", "Coolant / chip handling access"],
  filling: ["Product supply line", "Clean compressed air"],
};

const RISKS: Partial<Record<ProcessKind, { risk: string; mitigation: string }[]>> = {
  welding: [{ risk: "Poor part fit-up makes the seam wander", mitigation: "Accurate fixtures plus seam tracking; control upstream cutting and bending" }],
  machining: [{ risk: "Machine not ready for robot loading", mitigation: "Automatic door, pneumatic chuck and robot interface kit on the machine" }],
  finishing: [{ risk: "Inconsistent finish from part-to-part variation", mitigation: "Force-controlled tool and part-location vision" }],
  coating: [{ risk: "Overspray and fire risk", mitigation: "Certified booth, ATEX-rated equipment where solvents are used" }],
  inspection: [{ risk: "False rejects from lighting changes", mitigation: "Enclosed, controlled lighting and a golden-sample recipe" }],
  palletizing: [{ risk: "Unstable stacks", mitigation: "Proven stacking patterns, slip sheets and pallet-quality checks" }],
  assembly: [{ risk: "Component tolerance causes jams", mitigation: "Compliant tooling, vision location and part-feeder validation" }],
};

/** Typical robot time per part for each kind of task, in seconds (integrator rules of thumb). */
const CYCLE: Record<ProcessKind, number> = {
  handling: 8, transport: 10, welding: 60, machining: 20, finishing: 45, coating: 30, inspection: 4,
  palletizing: 7, packing: 6, assembly: 20, filling: 5, sealing: 4, labeling: 4,
};
/** Typical end-of-arm tool weight per kind, in kg. */
const TOOL_KG: Record<ProcessKind, number> = {
  handling: 3, transport: 3, welding: 5, machining: 4, finishing: 8, coating: 3, inspection: 2,
  palletizing: 15, packing: 4, assembly: 3, filling: 3, sealing: 3, labeling: 2,
};

const OUTPUT_TYPES: Partial<Record<ProcessKind, string>> = { palletizing: "pallet", packing: "carton" };

const secs = (v: string) => {
  const n = parseFloat(v.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n)) return null;
  return /min/.test(v) ? Math.round(n * 60) : Math.round(n);
};
const kg = (v: string) => {
  const n = parseFloat(String(v).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : null;
};

function robotExamples(payload: number, cobot: boolean) {
  if (cobot) {
    if (payload <= 5) return "Universal Robots UR5e, Doosan M0609, FANUC CRX-5iA";
    if (payload <= 12) return "Universal Robots UR10e, Doosan M1013, FANUC CRX-10iA";
    return "Universal Robots UR20, FANUC CRX-25iA, Doosan H2017";
  }
  if (payload <= 8) return "FANUC LR Mate 200iD, ABB IRB 1200, Yaskawa GP8";
  if (payload <= 25) return "FANUC M-20iD/25, ABB IRB 2600, Yaskawa GP25, KUKA KR 20";
  if (payload <= 70) return "FANUC M-710iC/50, ABB IRB 4600-60, KUKA KR 60";
  if (payload <= 180) return "FANUC R-2000iC/165F, ABB IRB 6700-150, KUKA KR 150";
  return "FANUC M-900iB/400L, ABB IRB 7600-400, KUKA KR 500";
}

/* --------------------------------------------------------------- engine */

export function engineSolution(brief: string, industry: string | null = null, strategyHint?: Strategy): AiSolution & { source: "engine" } {
  const facts = extractFacts(brief);
  const matched = matchTemplateIds(brief).length > 0;
  // Only what the brief names; a vague brief starts from a general handling cell, not a stock blueprint.
  const generic = () => processesFromSkills(["Loading & Unloading"]);
  let processes: ProcessCard[] = matched ? analyzeDescription(brief, industry) : industry ? analyzeDescription("", industry) : generic();
  if (!processes.length) processes = generic();
  const concrete = processes.some((p) => /concrete printing/i.test(p.name));
  const briefCycle = (() => {
    const c = brief.toLowerCase().match(/cycle(?: time)?(?: of| is|:)?\s*(\d+(?:\.\d+)?)\s*(s|sec|seconds|min|minutes)\b/);
    return c ? parseFloat(c[1]) * (/^m/.test(c[2]) ? 60 : 1) : null;
  })();

  // High-speed small products (food, pharma, consumer packs): delta robots with multi-pick grippers,
  // and palletizing counts cases, not products (assume 12 products per case).
  const highSpeed = (facts.partsPerHour ?? 0) > 600 && processes.some((p) => /pack|food|pick|sort|tray|carton|bottle|fruit/i.test(p.name));
  const cycleOf = (name: string) => {
    const kind = processKind({ name });
    if (highSpeed && (kind === "packing" || kind === "handling" || kind === "inspection")) return 1.2;
    if (highSpeed && kind === "palletizing") return 7 / 12;
    return CYCLE[kind];
  };
  const robotCycle = (r: { tasks: { name: string }[] }) => r.tasks.reduce((n, t) => n + cycleOf(t.name), 0) + 3 * Math.max(0, r.tasks.length - 1);
  const makePlan = (st: Strategy) => {
    const pl = planLine(processes, st);
    const cycles = pl.robots.map(robotCycle);
    const bottleneck = Math.max(...cycles, 1);
    return { plan: pl, cycles, bottleneck, capacity: Math.floor(3600 / bottleneck) };
  };

  let strategy: Strategy =
    strategyHint ?? (facts.cobotWanted ? "economy" : (facts.shifts ?? 0) >= 3 ? "throughput" : "balanced");
  let planned = makePlan(strategy);
  // Not fast enough for the target: split tasks over more robots before adding parallel cells.
  if (!strategyHint && facts.partsPerHour && facts.partsPerHour > planned.capacity && strategy !== "throughput" && !facts.cobotWanted) {
    strategy = "throughput";
    planned = makePlan(strategy);
  }
  const { plan, cycles, bottleneck, capacity } = planned;
  const bom = buildBom(plan);
  const options = compareOptions(processes);
  const cobots = plan.robots.filter((r) => r.collaborative).length;
  const kinds = new Set(processes.map((p) => processKind(p)));

  // Stations sized from the part weight in the brief (part + tool, 25 % margin).
  const stations: AiStation[] = processes.map((p) => {
    const kind = processKind(p);
    const robot = plan.robots.find((r) => r.tasks.some((t) => t.name === p.name));
    const need = facts.weightKg != null ? Math.ceil((facts.weightKg + TOOL_KG[kind]) * 1.25) : null;
    const payload = concrete ? 150 : need ?? robot?.minPayload ?? kg(p.robot.payload);
    const cobot = !!robot?.collaborative;
    return {
      name: p.name,
      skill: p.name,
      what: p.automated.join(". "),
      equipment: concrete
        ? "3-axis gantry printer or 6-axis robot on a track with concrete pump system"
        : highSpeed && kind !== "palletizing"
          ? "Delta / high-speed picker with multi-pick gripper; fits: ABB IRB 360 FlexPicker, FANUC M-2iA / M-3iA, Yaskawa MPP3H"
        : `${cobot ? "Collaborative robot" : "Industrial robot"}; fits: ${robotExamples(payload ?? 10, cobot)}`,
      payload_kg: payload,
      reach_mm: kg(p.robot.reach),
      tooling: p.eoat.join(", "),
      sensors: SENSORS[kind],
      cycle_s: briefCycle ?? Math.round(cycleOf(p.name) * 10) / 10,
      notes: p.integrationNote,
    };
  });

  // Throughput: the busiest robot sets the takt; only that robot is duplicated to hit a higher target.
  const takt = Math.round((briefCycle ?? bottleneck) * 10) / 10;
  const cap = briefCycle ? Math.floor(3600 / briefCycle) : capacity;
  const cellsNeeded = facts.partsPerHour ? Math.max(1, Math.ceil(facts.partsPerHour / cap)) : 1;
  const extraRobots = Math.min(cellsNeeded - 1, 8);
  const busiest = cycles.indexOf(Math.max(...cycles));
  let throughputNote = `≈ ${cap} parts/hour (bottleneck robot ${takt} s per part)`;
  if (facts.partsPerHour)
    throughputNote =
      cellsNeeded <= 1
        ? `${facts.partsPerHour} parts/hour required · line capacity ≈ ${cap}/hour`
        : `${facts.partsPerHour} parts/hour required · ${cellsNeeded} robots in parallel at the bottleneck (${plan.robots[busiest]?.title ?? "robot"}) give ≈ ${cap * cellsNeeded}/hour`;
  if (concrete) throughputNote = "≈ 0.4–0.8 m² of wall per hour at 100–150 mm/s print speed (50 mm bead, 20 mm layers)";

  // Budget from the priced bill of materials plus the extra bottleneck robots.
  const busiestCost = bom.robots[busiest]?.cost ?? [0, 0];
  const low = Math.round(bom.total[0] + extraRobots * busiestCost[0] * 1.3);
  const high = Math.round(bom.total[1] + extraRobots * busiestCost[1] * 1.3);
  const shifts = facts.shifts ?? 2;
  // Fully loaded operator cost (salary + PF/ESI + benefits), Indian plants.
  const LABOUR = 32000;
  const operators = facts.operators ?? Math.max(2, Math.min(processes.length, plan.robots.length + extraRobots + 1));
  const pb = payback([low, high], operators, shifts, LABOUR);
  const months = pb.months.every(Number.isFinite) ? `${Math.round(pb.months[0])}–${Math.round(pb.months[1])} months` : "";

  const industrial = plan.robots.length - cobots;
  const archType =
    plan.robots.length === 1
      ? cobots ? "Single cobot station" : "Single robot cell"
      : `${plan.robots.length}-robot line${cobots ? ` (${cobots} cobot${cobots > 1 ? "s" : ""})` : ""} with transfer conveyors`;
  const heavy = (facts.weightKg ?? 0) > 25;

  const safety = [
    ...(industrial
      ? [
          "Perimeter guarding 2 m high (ISO 14120) with interlocked access door (ISO 14119)",
          "Light curtain or area scanner at the operator load / unload point",
          "Dual-channel E-stops at HMI and every access point, safety relay or safety PLC, PL d / Cat 3 (ISO 13849-1)",
        ]
      : []),
    ...(cobots ? ["Collaborative risk assessment to ISO/TS 15066 · speed & separation monitoring with a safety laser scanner"] : []),
    ...(kinds.has("welding") ? ["Welding screens / curtains and fume extraction at the torch"] : []),
    ...(kinds.has("coating") || facts.explosive ? ["ATEX-rated booth and equipment where solvents are present"] : []),
    "Risk assessment to ISO 12100 and robot system safety to ISO 10218-2 before handover",
  ];
  const interlocks = [
    "Robot runs in AUTO only with guards closed and safety circuit reset",
    "Robot enters a machine or fixture only when it reports ready (door open, clamps released)",
    "Process starts only when part-present and clamp-closed sensors confirm",
    ...(kinds.has("coating") || kinds.has("filling") ? ["Gun / dosing valve opens only with flow and pressure in range"] : []),
    ...(kinds.has("palletizing") ? ["Stacking pauses when the pallet is missing or full; pallet swap zone muted by light curtain"] : []),
    "Any fault: controlled stop, tool off, clear HMI message, restart from the interrupted step",
  ];

  const bigLine = plan.robots.length > 2;
  const alternatives = options
    .filter((o) => o.strategy !== strategy)
    .map((o) => ({
      option: `${o.label}: ${o.robots} robot${o.robots > 1 ? "s" : ""}${o.cobots ? ` (${o.cobots} cobot)` : ""}`,
      pros: o.strategy === "economy" ? "Lowest investment and floor space; can work next to people" : "Shortest cycle, more output per shift",
      cons: o.strategy === "economy" ? `Output ≈ ${o.relativeOutput}× balanced; limited payload and speed` : `Higher investment, more floor space (output ≈ ${o.relativeOutput}×)`,
      when: STRATEGIES[o.strategy].bestFor,
    }));
  alternatives.push({
    option: "Semi-automation (lift assist, fixtures, poka-yoke) first",
    pros: "Very low cost and fast; improves ergonomics and quality now",
    cons: "Still needs operators every shift; limited output gain",
    when: "Volumes are low or part variety is very high",
  });
  if ((facts.partsPerHour ?? 0) > 1200)
    alternatives.push({
      option: "Dedicated special-purpose machine",
      pros: "Highest speed for one fixed product",
      cons: "Little flexibility for new variants; long lead time",
      when: "Very high, stable volume of one part",
    });

  const assumptions = [
    facts.weightKg != null ? `Part weight ${facts.weightKg} kg (from your brief)` : "Part weight up to about 10 kg",
    facts.partsPerHour != null ? `Throughput target ${facts.partsPerHour} parts/hour` : `Throughput set by the slowest station (≈ ${capacity}/hour)`,
    `${shifts} shift${shifts > 1 ? "s" : ""} per day, ${operators} operator${operators > 1 ? "s" : ""} per shift today at ₹32,000/month fully loaded`,
    "Parts arrive in a known orientation on a conveyor or in trays",
    "Budget is integrated (robot, tooling, safety, controls, installation) at Indian market rates",
  ];
  const questions = concrete ? [
    "What wall size and height do you need to print (and any openings)?",
    "Will you print on site or in a precast yard / factory?",
    "Which mix will you use (ready 3D-printing mortar or site-batched)?",
    "Do you need reinforcement or insulation inserted during printing?",
  ] : [
    ...(facts.weightKg == null ? ["What is the heaviest part weight and size?"] : []),
    ...(facts.partsPerHour == null ? ["How many parts per hour (or per shift) do you need?"] : []),
    ...(!facts.variants ? ["How many different part variants run on this line, and how often do you change over?"] : []),
    ...(facts.shifts == null ? ["How many shifts per day, and how many operators do this work now?"] : []),
    "How do parts arrive today (loose in bins, trays, conveyor, pallets)?",
  ].slice(0, 4);

  const utilities = [
    "3-phase 415 V power for robots and controls",
    "Compressed air 6 bar for grippers and valves",
    "Ethernet to the plant network for monitoring / MES",
    ...[...kinds].flatMap((k) => UTILITIES[k] ?? []),
  ];
  const risks = [
    ...[...kinds].flatMap((k) => RISKS[k] ?? []),
    ...(facts.variants ? [{ risk: "Many variants slow changeovers", mitigation: "Quick-change tooling, recipe selection on the HMI, vision-based part recognition" }] : []),
    ...(heavy && !concrete ? [{ risk: `Heavy part (${facts.weightKg} kg) limits robot choice`, mitigation: "Size the robot at 125 % of part + tool weight; check inertia at full speed" }] : []),
    ...(pb.months[0] > 48
      ? [{ risk: `Long payback (${months}) on labour savings alone`, mitigation: "Confirm the operators and shifts this replaces; count quality, scrap and capacity gains; or start with the Economy (cobot) option or semi-automation" }]
      : []),
    { risk: "Cycle time not met in production", mitigation: "Offline simulation (this 3D model) and a timed trial at the integrator before shipping" },
    { risk: "Operators unfamiliar with the robot", mitigation: "Operator and maintenance training, clear HMI screens and a spare-parts kit" },
  ].slice(0, 6);

  const buildWeeks = 3 + plan.robots.length;
  const implementation = [
    { phase: "Site survey, part study & requirement sign-off", weeks: "1–2", deliverables: "Process data, part samples, layout constraints, URS" },
    { phase: "Concept design & 3D simulation", weeks: "2–3", deliverables: "Layout, cycle-time study, safety concept, final budget" },
    { phase: "Procurement (robots, tooling, safety, controls)", weeks: "6–10", deliverables: "Robots, EOAT, guarding, PLC/HMI, conveyors" },
    { phase: "Build, programming & FAT at integrator", weeks: `${buildWeeks}–${buildWeeks + 2}`, deliverables: "Assembled cell, robot programs, factory acceptance test with your parts" },
    { phase: "Installation, commissioning & SAT", weeks: bigLine ? "3–4" : "2–3", deliverables: "Running line, safety validation, site acceptance test" },
    { phase: "Training & production ramp-up", weeks: "2–4", deliverables: "Trained operators and maintenance, OEE baseline" },
  ];

  const matchedNames = processes.map((p) => p.name);
  const understanding = matched
    ? `You want to automate: ${matchedNames.join(", ")}. ${facts.weightKg != null ? `Parts weigh about ${facts.weightKg} kg. ` : ""}${facts.partsPerHour != null ? `Target ${facts.partsPerHour} parts/hour. ` : ""}The line below plans the robots, tooling, safety and controls for exactly these tasks.`
    : "The brief does not name a specific process, so this starts from a general robotic handling cell. Name the tasks (weld, grind, paint, assemble, pack, palletize…) or answer the questions below for a precise design.";

  return {
    source: "engine",
    title: `${archType} for ${matchedNames.slice(0, 3).join(", ")}${matchedNames.length > 3 ? "…" : ""}`,
    understanding,
    feasibility: !matched ? "medium" : facts.variants || heavy ? "medium" : "high",
    automation_level: processes.every((p) => p.automation === "full") ? "full" : "semi",
    workpiece: facts.weightKg != null || facts.material || facts.size
      ? { name: "Workpiece", material: facts.material ?? "", size: facts.size ?? "", weight_kg: facts.weightKg }
      : null,
    throughput: { target: throughputNote, takt_s: takt },
    tasks: matchedNames,
    stations,
    architecture: {
      type: archType,
      why: `${STRATEGIES[strategy].label}: ${STRATEGIES[strategy].bestFor.toLowerCase()}. ${plan.robots.length} robot${plan.robots.length > 1 ? "s" : ""} cover ${processes.length} task${processes.length > 1 ? "s" : ""}${plan.robots.some((r) => r.toolChanger) ? " using tool changers so one robot does several jobs" : ""}.${cobots ? " Cobots work next to people without full fencing." : ""}${extraRobots ? ` To reach your rate, the bottleneck robot is doubled up (${extraRobots + 1} in parallel).` : ""}`,
      alternatives,
    },
    material_flow: `Raw parts enter on the infeed conveyor${processes.length > 1 ? `, pass through ${processes.length} stations${plan.robots.length > 1 ? " over transfer conveyors between robots" : ""}` : ""} and leave on ${OUTPUT_TYPES[[...kinds].find((k) => OUTPUT_TYPES[k]) as ProcessKind] ? `a ${OUTPUT_TYPES[[...kinds].find((k) => OUTPUT_TYPES[k]) as ProcessKind]}` : "the outfeed"}. Rejects are diverted to a separate bin.`,
    controls: {
      plc: bigLine ? "Siemens S7-1500F / Rockwell GuardLogix safety PLC as line master" : "Siemens S7-1200F / Mitsubishi iQ-R with safety relay or safety PLC",
      hmi: bigLine ? '15" touch HMI with recipes, alarms, OEE and step status' : '7–10" touch HMI with start/stop, recipes and alarms',
      communication: "PROFINET or EtherNet/IP between PLC and robots · OPC UA / MQTT to MES and dashboards",
      safety,
      interlocks,
    },
    layout: {
      footprint_m: concrete ? "≈ 6 × 5 m (3.2 × 2.6 m build area + material plant)" : `${(plan.robots.length * 3.6 + 1.5 + extraRobots * 3.6).toFixed(1)} × ${facts.outdoor ? "8.0" : "6.5"} m`,
      notes: [
        "Infeed at one end, finished goods out at the other",
        "1.2 m operator / forklift aisle along the front",
        "Operator load-unload point outside the fence with light curtain",
        "Maintenance access door and electrical cabinet outside the guarded area",
      ],
    },
    utilities,
    risks,
    implementation,
    budget_inr: { low, high, notes: `Robots${cobots ? " / cobots" : ""}, EOAT, peripherals, conveyors, guarding, PLC/HMI, programming, installation and training${extraRobots ? ` · ${extraRobots} extra robot${extraRobots > 1 ? "s" : ""} at the bottleneck` : ""}` },
    roi: {
      labour_saved: `${operators} operator${operators > 1 ? "s" : ""} × ${shifts} shift${shifts > 1 ? "s" : ""} ≈ ₹${Math.round(pb.annualSaving / 1e5)} L per year`,
      quality_gain: "Repeatable process, fewer rejects and rework, traceable cycle data",
      payback_months: months,
    },
    kpis: ["OEE ≥ 80 %", `Cycle time ≤ ${takt} s at the bottleneck`, "First-pass yield ≥ 98 %", "MTBF / MTTR of each robot", "Zero safety incidents"],
    assumptions,
    questions,
  };
}
