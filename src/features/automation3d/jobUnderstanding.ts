/**
 * Automation Studio — understand any job a user types, the way a solution provider's
 * application engineer reads an enquiry:
 *   1. match the robot skills library (130+ jobs);
 *   2. when the words are new, read the action verbs (attach, join, count, sew, peel, move…)
 *      and map them to the nearest robot task, saying how sure we are;
 *   3. list what is still unknown, so the next question to the customer is obvious.
 * Then `providerPlan` writes what an integrator does with it: feasibility checks,
 * the requirement list (URS), scope of supply, acceptance tests, documents, typical
 * commercial terms and support, and whether to run a proof of concept first.
 */

import { matchTemplateIds, SKILL_LIBRARY } from "@/utils/processAnalyzer";
import { processKind, type ProcessKind } from "./processProfiles";
import { extractFacts, type BriefFacts } from "./solutionEngine";
import { PLAYBOOK } from "./engineerPlaybook";
import { kitGuide } from "./jobKit";

export type Confidence = "high" | "medium" | "low";
export interface UnderstoodTask {
  /** Skills-library task name (plans the cell). */
  name: string;
  kind: ProcessKind;
  confidence: Confidence;
  /** Why the studio chose it. */
  why: string;
}
export interface JobUnderstanding {
  tasks: UnderstoodTask[];
  /** How the tasks were found. */
  source: "library" | "words" | "general";
  facts: BriefFacts;
  /** Facts the brief does not give yet. */
  missing: string[];
}

/** Action words the skills library does not know, and the nearest robot task. Order matters: specific first. */
const WORDS: [RegExp, string, string][] = [
  [/\b(join|joining|fuse|fusing)\b[^.]*\b(steel|metal|plates?|pipes?|tubes?|frames?|brackets?|sheets?)\b/, "MIG/MAG Welding", "joining metal parts is usually done by welding"],
  [/\b(sew|sewing|stitch|stitching)\b/, "Textile & Garment Handling", "robots handle and feed fabric; the sewing head does the stitch"],
  [/\b(peel|peeling|de-?mask|remove (the )?(film|liner|backing|tape))\b/, "Surface Masking & Demasking", "peeling film or liners is a demasking task"],
  [/\b(count|counting|tally)\b/, "Vision Inspection", "a camera counts parts as they pass"],
  [/\b(attach|attaching|fix|fixing|fit|fitting|mount|mounting|connect|connecting|clip|clipping|snap|snapping|join|joining|install|installing|put together|combine)\b/, "Assembly", "fitting one part onto another is an assembly task"],
  [/\b(open|close|turn|rotate|flip|invert|orient|align)\b/, "Loading & Unloading", "turning or orienting parts is a handling task with a regrip"],
  [/\b(take|put|move|moving|carry|carrying|transfer|lift|lifting|place|placing|feed|feeding|bring|shift|shifting|push|pull|hang|hanging|remove|removing)\b/, "Loading & Unloading", "moving parts from one place to another is pick and place"],
  [/\b(heat|bake|baking|cure|curing|dry|drying|cool|cooling)\b/, "Loading & Unloading", "the robot loads and unloads the oven or dryer; the machine does the process"],
];

const nameOf = (id: string) => SKILL_LIBRARY.find((s) => s.id === id)?.template.name ?? id;

/** What the job is, in robot tasks, and how sure the studio is. */
export function understandJob(text: string): JobUnderstanding {
  const brief = text.trim();
  const facts = extractFacts(brief);
  const missing = [
    ...(facts.weightKg == null ? ["part weight"] : []),
    ...(facts.partsPerHour == null ? ["parts per hour or per shift"] : []),
    ...(facts.shifts == null ? ["shifts per day"] : []),
    ...(!/\b(conveyor|tray|pallet|bin|fixture|rack|tote|box|trolley|machine)\b/i.test(brief) ? ["how parts arrive and leave"] : []),
  ];
  if (brief.length < 3) return { tasks: [], source: "general", facts, missing };
  const ids = matchTemplateIds(brief);
  if (ids.length) {
    const tasks = ids.map((id) => {
      const name = nameOf(id);
      return { name, kind: processKind({ name }), confidence: "high" as Confidence, why: "matched in the robot skills library" };
    });
    return { tasks, source: "library", facts, missing };
  }
  const low = ` ${brief.toLowerCase()} `;
  const seen = new Set<string>();
  const tasks: UnderstoodTask[] = [];
  for (const [re, name, why] of WORDS) {
    if (!re.test(low) || seen.has(name)) continue;
    // A sentence that joins metal does not also need a general assembly task for the same words.
    if (name === "Assembly" && seen.has("MIG/MAG Welding")) continue;
    seen.add(name);
    tasks.push({ name, kind: processKind({ name }), confidence: "medium", why });
  }
  if (tasks.length) return { tasks: tasks.slice(0, 4), source: "words", facts, missing };
  return {
    tasks: [{ name: "Loading & Unloading", kind: "handling", confidence: "low", why: "no robot action word found — starting from a general pick-and-place cell" }],
    source: "general",
    facts,
    missing: ["what the robot should do (weld, pick, pack, grind, inspect…)", ...missing],
  };
}

/* ------------------------------------------------------- the solution provider */

export type Check = "ok" | "check" | "risk";
export interface ProviderPlan {
  /** What decides whether the job can be automated, and how this brief scores. */
  feasibility: { factor: string; status: Check; note: string }[];
  /** A proof of concept with the customer's parts comes first. */
  pocFirst: boolean;
  pocWhy: string;
  /** What the customer gives before a firm quote (the URS). */
  requirements: string[];
  /** What the solution provider supplies. */
  scope: string[];
  /** How the cell is proven before payment milestones. */
  acceptance: string[];
  /** Documents handed over with the cell. */
  documents: string[];
  /** Typical commercial terms in India (to agree case by case). */
  commercial: string[];
  /** After-sales support. */
  support: string[];
}

const SOFT = /\b(fabric|textile|garment|cloth|foam|rubber|cable|wire harness|food|meat|chicken|fish|dough|bread|fruit|vegetable|bag|pouch|film|leather|paper)\b/i;
const RANDOM = /\b(bin|loose|random|jumbled|pile|heap|bulk|mixed)\b/i;
const TIGHT = /(±|\+\/-|plus or minus)\s*0?\.\d+\s*mm|\bmicrons?\b|\b\d+\s*µm\b/i;

/** What an integrator does with the job: feasibility, URS, scope, acceptance, documents, terms and support. */
export function providerPlan(brief: string, u: JobUnderstanding, robots = 1, cobots = 0): ProviderPlan {
  const f = u.facts;
  const kinds = [...new Set(u.tasks.map((t) => t.kind))];
  const feasibility: ProviderPlan["feasibility"] = [
    u.source === "library"
      ? { factor: "The task", status: "ok", note: `Known robot task${u.tasks.length > 1 ? "s" : ""}: ${u.tasks.map((t) => t.name).join(", ")}` }
      : u.source === "words"
        ? { factor: "The task", status: "check", note: `Read from your words: ${u.tasks.map((t) => `${t.name} (${t.why})`).join("; ")}. An engineer confirms it on a call.` }
        : { factor: "The task", status: "risk", note: "No robot action found in the description — say what the robot should do." },
    RANDOM.test(brief)
      ? { factor: "Part presentation", status: "check", note: "Loose or mixed parts need a 3D camera and bin-picking software; expect 90–98 % first-pick success." }
      : /\b(conveyor|tray|pallet|fixture|rack|nest|tote|magazine)\b/i.test(brief)
        ? { factor: "Part presentation", status: "ok", note: "Parts arrive in a known place (conveyor, tray, pallet or fixture)." }
        : { factor: "Part presentation", status: "check", note: "Not stated: parts in a fixed position are simplest; loose parts need vision." },
    f.weightKg == null
      ? { factor: "Part weight", status: "check", note: "Not given: it decides the robot size (part + gripper × 1.25)." }
      : f.weightKg > 500
        ? { factor: "Part weight", status: "risk", note: `${f.weightKg} kg is above most robot arms: a gantry, balancer or special handler may fit better.` }
        : { factor: "Part weight", status: "ok", note: `${f.weightKg} kg sizes the robot at about ${Math.ceil(f.weightKg * 1.25 + 5)} kg payload or more.` },
    f.partsPerHour == null
      ? { factor: "Output", status: "check", note: "Rate not given: takt time decides how many robots you need." }
      : { factor: "Output", status: f.partsPerHour > 1200 ? "check" : "ok", note: `${f.partsPerHour} parts/hour = takt ${(3600 / f.partsPerHour).toFixed(1)} s per part${f.partsPerHour > 1200 ? " — high speed: delta robots, multi-pick grippers or a special machine" : ""}.` },
    f.variants
      ? { factor: "Variety", status: "check", note: "Several variants: quick-change tooling, recipes on the HMI and part recognition keep changeovers short." }
      : { factor: "Variety", status: "ok", note: "One part family assumed; confirm the variants and changeover frequency." },
    TIGHT.test(brief)
      ? { factor: "Accuracy", status: "check", note: "Tight tolerance: robots repeat to about ±0.02–0.1 mm but absolute accuracy is worse — use fixtures, vision or force sensing." }
      : { factor: "Accuracy", status: "ok", note: "Standard robot repeatability is enough for most handling and process work." },
    SOFT.test(brief)
      ? { factor: "Part handling", status: "check", note: "Soft or flexible parts (fabric, food, bags, cables) need special grippers — prove them with your samples." }
      : { factor: "Part handling", status: "ok", note: "Rigid parts: standard fingers or vacuum." },
    f.hygienic || f.explosive || f.cleanroom || f.outdoor
      ? {
          factor: "Environment",
          status: "check",
          note: [f.hygienic && "food / pharma: washdown (IP67/69K), food-grade grease", f.explosive && "solvents: ATEX-rated robot and booth", f.cleanroom && "cleanroom / ESD-rated robot", f.outdoor && "outdoor or site: weather and dust protection"].filter(Boolean).join("; "),
        }
      : { factor: "Environment", status: "ok", note: "Normal factory floor." },
    f.cobotWanted && (f.weightKg ?? 0) > 25
      ? { factor: "Working with people", status: "risk", note: `Cobots carry up to about 25–30 kg; ${f.weightKg} kg needs a fenced robot or a cobot with a lift assist.` }
      : { factor: "Working with people", status: "ok", note: f.cobotWanted ? "Cobot cell: a risk assessment to ISO/TS 15066 sets speed and force limits." : "Fenced cell or cobot, decided by the risk assessment (ISO 12100 / ISO 10218)." },
  ];
  const risky = feasibility.filter((x) => x.status === "risk");
  const checks = feasibility.filter((x) => x.status === "check");
  const pocFirst = risky.length > 0 || u.source !== "library" || checks.some((x) => /presentation|handling|accuracy/i.test(x.factor) && x.status === "check" && (RANDOM.test(brief) || SOFT.test(brief) || TIGHT.test(brief)));
  const pocWhy = pocFirst
    ? `Run a proof of concept with your real parts first (1–3 weeks): ${[...risky, ...checks.filter((x) => /task|presentation|handling|accuracy/i.test(x.factor))]
        .slice(0, 3)
        .map((x) => x.factor.toLowerCase())
        .join(", ")} must be proven before the full cell is quoted.`
    : "A standard cell: a site visit and part samples are enough for a firm quote.";

  // The URS: the playbook's questions for these kinds of work, plus what every quote needs.
  const requirements = [
    ...u.missing.map((m) => `Tell us the ${m}`),
    "Part drawings or photos, and 5–10 sample parts for trials",
    ...kinds.flatMap((k) => PLAYBOOK[k].ask.slice(0, 2)),
    "Floor space, ceiling height and where the cell will stand (photos or a layout)",
    "Power (415 V 3-phase), compressed air and network available at the location",
    "Who operates and maintains the cell, and the target start date",
  ];
  const kits = u.tasks.map((t) => kitGuide(t.name));
  const scope = [
    `${robots} robot${robots > 1 ? "s" : ""}${cobots ? ` (${cobots} cobot${cobots > 1 ? "s" : ""})` : ""} with controller, teach pendant and cables`,
    `End-of-arm tooling: ${[...new Set(kits.map((k) => k.tool))].join("; ")}`,
    ...[...new Set(kits.flatMap((k) => k.accessories))].slice(0, 3).map((a) => `Accessory: ${a}`),
    ...[...new Set(kits.flatMap((k) => k.components))].slice(0, 4).map((c) => `Component: ${c}`),
    "Fixtures, conveyors and stations shown in the layout",
    cobots && robots === cobots ? "Collaborative safety: risk assessment, safety scanner where needed" : "Safety: guarding with interlocked door, light curtain or scanner, safety PLC/relay",
    "PLC and HMI with recipes and alarms; interface to your machines",
    `Software: ${[...new Set(kits.flatMap((k) => k.software))].slice(0, 4).join(", ")}`,
    "Simulation and cycle-time study, programming, installation, commissioning and training",
  ];
  const acceptance = [
    "Factory acceptance test (FAT) at the integrator with your parts: the agreed cycle time held for at least 2 hours, or 500 parts",
    "Quality at FAT: first-pass yield at or above the agreed target (for example 98 %)",
    "Site acceptance test (SAT): 3 shifts at rated speed with availability of 90 % or more",
    "Safety validation: every safety function tested and the performance level verified (ISO 13849-2)",
    "Training sign-off for operators and maintenance staff",
  ];
  const documents = [
    "Layout drawing and electrical schematics; pneumatic diagram",
    "I/O list and interface signals to your machines",
    "Backups of robot, PLC and HMI programs (source code)",
    "Risk assessment (ISO 12100) and safety validation report",
    "Operation and maintenance manuals, recommended spare parts list",
    "Declaration of conformity for the machinery (ISO 10218-2 for the robot system)",
  ];
  const commercial = [
    "Typical in India: 30–40 % advance with the order, 50–60 % after FAT / before dispatch, 10 % after SAT (or against a bank guarantee)",
    "Prices usually ex-works; GST 18 % extra; freight, insurance and unloading agreed separately",
    "Delivery about 12–20 weeks after the requirements are signed off, longer for imported robots",
    "Warranty usually 12 months from SAT (or 18 months from dispatch), whichever is earlier",
  ];
  const support = [
    "Annual maintenance contract (AMC) with 2–4 preventive visits a year",
    "Spares kit on site: gripper wear parts or suction cups, cables, fuses, encoder battery",
    "Remote support over a secure connection, and a response time agreed in the AMC",
    "Refresher training when operators change",
  ];
  return { feasibility, pocFirst, pocWhy, requirements: [...new Set(requirements)].slice(0, 10), scope, acceptance, documents, commercial, support };
}
