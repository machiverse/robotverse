/**
 * Automation Studio — match real robots and end-of-arm tooling to each station.
 *
 * Two sources, so users can choose how to buy:
 *   - RobotVerse marketplace: live listings from sellers (robots table, spare_parts for tooling)
 *   - OEM directory: the catalogue of manufacturer models (public/directory/*.json), bought direct
 * Every match is scored and carries the reasons it fits. Pure functions: the
 * data loaders live in equipmentMatch.ts.
 */

import { processKind, type ProcessKind } from "./processProfiles";
import type { AiStation } from "./aiSolution";
import { eoatKind } from "./robotSim.js";
import {
  COBOT_EOAT, GRIP_FAMILIES, GRIP_PART, INDUSTRIAL_EOAT, SPECIALTY_GRIP, gearFor, gripSize, isArcRobot, isCobotName, isCurrentRobot, isEduRobot,
  isComponent, isLabRobot, isMountVariant, isPaintRobot, lockedOut, sizeFor, type ToolFamily,
} from "./jobGear";

export type Source = "market" | "oem";

export interface Match {
  source: Source;
  kind: "robot" | "tool";
  id: string;
  name: string;
  brand: string;
  model?: string;
  /** Marketplace photo URL. */
  image?: string;
  /** Directory image file names (resolved to our storage by the UI). */
  file?: { img?: string; th?: string };
  payload?: number | null;
  reach?: number | null;
  axes?: number | null;
  type?: string;
  price?: number | null;
  currency?: string | null;
  condition?: string | null;
  location?: string | null;
  href: string;
  score: number;
  reasons: string[];
}

/* ------------------------------------------------------------ needs */

/** Directory application tags a robot for this kind of task should list. */
const ROBOT_APPS: Record<ProcessKind, string[]> = {
  handling: ["Material Handling"], transport: ["Material Handling"], welding: ["Welding"], machining: ["Material Handling"],
  finishing: ["Finishing"], coating: ["Dispensing"], inspection: ["Material Handling"], palletizing: ["Palletizing"],
  packing: ["Material Handling"], assembly: ["Assembly"], filling: ["Dispensing"], sealing: ["Assembly"], labeling: ["Material Handling"],
};
/** Words that mark a marketplace robot as suited to the task. */
const MARKET_WORDS: Record<ProcessKind, RegExp> = {
  handling: /handling|pick|place|loading|material|general|industrial/i,
  transport: /handling|agv|amr|mobile|transport/i,
  welding: /weld|arc|spot/i,
  machining: /tending|handling|machine|cnc|loading/i,
  finishing: /grind|polish|finish|deburr|sanding/i,
  coating: /paint|coat|spray|dispens/i,
  inspection: /inspect|vision|handling/i,
  palletizing: /palletiz|stack/i,
  packing: /pack|pick|handling/i,
  assembly: /assembl|scara|screw/i,
  filling: /fill|dispens|pharma|food/i,
  sealing: /seal|cap|assembl/i,
  labeling: /label|pack|handling/i,
};

/** Directory application tags of tools that suit the task. */
const TOOL_APPS: Record<ProcessKind, string[]> = {
  handling: ["Material Handling"], transport: ["Material Handling"], welding: ["Welding"], machining: ["Material Handling"],
  finishing: ["Grinding", "Sanding", "Deburring", "Milling"], coating: ["Dispensing", "Painting"], inspection: ["Material Handling"],
  palletizing: ["Material Handling"], packing: ["Material Handling"], assembly: ["Screwing", "Material Handling"],
  filling: ["Dispensing"], sealing: ["Screwing", "Material Handling"], labeling: ["Material Handling"],
};
/** Marketplace spare-part words that identify tooling for the task. */
const MARKET_TOOL_WORDS: Record<ProcessKind, RegExp> = {
  handling: /gripper|vacuum|suction|end.?of.?arm|eoat|tool changer/i,
  transport: /gripper|vacuum/i,
  welding: /torch|weld|wire feeder|seam|tcp/i,
  machining: /gripper|jaw|tool changer|eoat/i,
  finishing: /spindle|grind|polish|deburr|sander|compliance/i,
  coating: /spray|gun|dispens|nozzle|applicator/i,
  inspection: /camera|vision|sensor|gripper/i,
  palletizing: /gripper|vacuum|fork|clamp|palletiz/i,
  packing: /gripper|vacuum|suction/i,
  assembly: /screw|driver|nutrunner|gripper/i,
  filling: /nozzle|dosing|fill|gripper/i,
  sealing: /cap|seal|gripper/i,
  labeling: /label|applicator|gripper/i,
};

export interface StationNeed {
  kind: ProcessKind;
  payload: number;
  reach: number | null;
  cobot: boolean;
  robotType: "SCARA" | "Delta" | null;
  /** Job or station name: picks the robot family and tool made for it (spot welding, palletizing, moulding…). */
  job?: string;
  /** The robot the tool goes on (brand and model): tools made for one robot fit only that robot. */
  arm?: string;
}

export function needOf(st: AiStation): StationNeed {
  const kind = processKind({ name: st.skill || st.name });
  const eq = `${st.equipment} ${st.name}`;
  return {
    kind,
    job: st.skill || st.name,
    payload: st.payload_kg ?? 10,
    reach: st.reach_mm ?? null,
    cobot: /collaborative|cobot/i.test(eq),
    robotType: /\bSCARA\b/.test(eq) ? "SCARA" : /\bdelta\b/i.test(eq) ? "Delta" : null,
  };
}

export interface DirRobot { id: string; b: string; m: string; n: string; t: string; a: number; p: number; r: number; ap?: string[]; img?: string; th?: string }
export interface DirTool { id: string; b: string; m: string; n: string; c: string; a?: number; ap?: string[]; img?: string; th?: string }

/* ---------------------------------------------------------- scoring */

const MAJOR = ["ABB", "Fanuc", "FANUC", "KUKA", "Yaskawa Motoman", "Yaskawa", "Kawasaki", "Universal Robots", "Nachi", "Staubli", "Stäubli", "Comau", "Denso", "Epson", "Doosan Robotics", "Mitsubishi"];
const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const firstImage = (v: unknown) => (Array.isArray(v) && typeof v[0] === "string" ? (v[0] as string) : undefined);

function payloadScore(p: number | null, need: number, reasons: string[]) {
  if (p == null) {
    reasons.push("Payload not listed — confirm with seller");
    return 5;
  }
  if (p < need) return -1;
  const margin = p / need;
  reasons.push(`${p} kg payload ≥ ${need} kg needed`);
  // Best when 1–2.5× the need; oversize costs more and is slower.
  return margin <= 2.5 ? 40 : margin <= 5 ? 28 : 15;
}

function reachScore(r: number | null, need: number | null, reasons: string[]) {
  if (need == null || r == null) return 5;
  // The station reach is a guideline from the typical robot for the task, not a hard limit: rank, don't exclude.
  if (r < need * 0.7) return 0;
  if (r >= need * 0.9) reasons.push(`${r} mm reach`);
  return r >= need * 0.9 ? 20 : 10;
}

/** Closer to the payload needed is better: a robot 1–1.6× the need is the right size, not just big enough. */
const sizeBonus = (p: number | null, need: number) => (p == null ? 0 : p / need <= 1.6 ? 8 : p / need <= 2.5 ? 4 : 0);
/** A compact arm for the cell: reach close to what the stations need, not a long-reach special. */
const reachBonus = (r: number | null, need: number | null) => (r == null || need == null ? 0 : r <= need * 1.5 ? 4 : r <= need * 2 ? 2 : 0);
const PALLET_JOB = /pallet|stack|sack|bag/i;

/** Robots never offered for this job: painting robots for handling, lab and classroom arms for a factory cell. */
function wrongRobot(name: string, type: string, apps: string[] | undefined, need: StationNeed, gear: ReturnType<typeof gearFor>) {
  const job = need.job ?? "";
  if (!gear.robot.paint && isPaintRobot(name, apps)) return true;
  if (!gear.robot.lab && isLabRobot(name)) return true;
  if (isEduRobot(name) && !/educat|training|teach|classroom/i.test(job)) return true;
  if (isMountVariant(name) && !/ceiling|wall|shelf/i.test(job)) return true;
  // 4-axis palletizers keep the part level: right for stacking, wrong for anything that tilts the part.
  if (/palletiz/i.test(type) && !(need.kind === "palletizing" || gear.robot.type === "Palletizing" || PALLET_JOB.test(job))) return true;
  return false;
}

export function matchOemRobots(need: StationNeed, catalog: DirRobot[], limit = 6): Match[] {
  const gear = gearFor(need.job ?? "", need.kind);
  const required = ROBOT_APPS[need.kind];
  const apps = [...required, ...(need.cobot ? ["Collaborative"] : [])];
  const rank = (strict: boolean) => {
    const out: Match[] = [];
    for (const r of catalog) {
      const reasons: string[] = [];
      const ps = payloadScore(r.p, need.payload, reasons);
      const rs = reachScore(r.r, need.reach, reasons);
      if (ps < 0 || rs < 0) continue;
      if (wrongRobot(r.n, r.t, r.ap, need, gear)) continue;
      const listed = apps.filter((a) => r.ap?.includes(a));
      // The catalogue tags most robots by brochure, not by job: a job with its own robot family (spot
      // welding, painting) may rank by family when the tag is missing.
      if (strict && listed.length < required.length + (need.cobot ? 1 : 0)) continue;
      if (need.cobot && !r.ap?.includes("Collaborative")) continue;
      if (need.robotType && r.t !== need.robotType) continue;
      if (!need.robotType && /SCARA|Delta/.test(r.t)) continue;
      const family = gear.robot.prefer?.(r.n) || (gear.robot.paint && isPaintRobot(r.n, r.ap));
      const typed = !!gear.robot.type && r.t === gear.robot.type;
      if (listed.length) reasons.unshift(`OEM lists ${listed.join(" + ")}`);
      if (family || typed) reasons.unshift(`A ${gear.robot.why ?? r.t.toLowerCase()}`);
      const collab = !!r.ap?.includes("Collaborative") || isCobotName(r.n);
      if (collab && !reasons.includes("Collaborative")) reasons.push("Collaborative");
      const current = isCurrentRobot(r.n);
      if (current) reasons.push("In the maker's current range");
      const score =
        ps + rs + sizeBonus(r.p, need.payload) + listed.length * 10 + (MAJOR.includes(r.b) ? 10 : 0) + (r.a === 6 || need.robotType || typed ? 5 : 0) +
        (family ? 25 : 0) + (typed ? 20 : 0) + (current ? 6 : 0) + (PALLET_JOB.test(need.job ?? "") ? 0 : reachBonus(r.r, need.reach)) +
        // A hollow-wrist welding arm costs more and gains nothing when the job is not welding.
        (need.kind !== "welding" && isArcRobot(r.n) ? -6 : 0) +
        // A fenced cell: an industrial arm is faster and costs less per kg than a cobot.
        (!need.cobot && !collab ? 3 : 0);
      out.push({
        source: "oem", kind: "robot", id: r.id, name: r.n, brand: r.b, model: r.m, payload: r.p, reach: r.r, axes: r.a, type: r.t,
        file: { img: r.img, th: r.th },
        href: `/directory?q=${encodeURIComponent(r.n)}`, score, reasons,
      });
    }
    return out;
  };
  let out = rank(true);
  if (!out.length && gear.robot.anyApps) out = rank(false);
  // Best score first, one model per brand so the user sees real choice.
  out.sort((a, b) => b.score - a.score || (a.payload ?? 0) - (b.payload ?? 0) || a.name.localeCompare(b.name));
  const seen = new Set<string>();
  return out.filter((m) => (seen.has(m.brand) ? false : (seen.add(m.brand), true))).slice(0, limit);
}

export function matchMarketRobots(need: StationNeed, list: Record<string, unknown>[], limit = 6): Match[] {
  const words = MARKET_WORDS[need.kind];
  const gear = gearFor(need.job ?? "", need.kind);
  const out: Match[] = [];
  for (const r of list) {
    const reasons: string[] = [];
    const p = num(r.payload_capacity);
    const ps = payloadScore(p, need.payload, reasons);
    const rs = reachScore(num(r.reach), need.reach, reasons);
    if (ps < 0 || rs < 0) continue;
    const text = [r.name, r.robot_type, ...(Array.isArray(r.applications) ? r.applications : []), ...(Array.isArray(r.category_tags) ? r.category_tags : [])].map(str).join(" ");
    const fits = words.test(text);
    // Process robots (welding, painting, grinding) must be listed for that work, and a
    // robot 10× bigger than needed is the wrong machine even if it could lift the load.
    if (!fits && ["welding", "coating", "finishing"].includes(need.kind)) continue;
    if (p != null && p > need.payload * 10 && need.kind !== "palletizing") continue;
    if (need.cobot && !/cobot|collaborative|\bur\d|crx|doosan|techman/i.test(text)) continue;
    if (wrongRobot(str(r.name), str(r.robot_type), /paint/i.test(text) ? ["Painting"] : [], need, gear)) continue;
    const family = !!gear.robot.prefer?.(str(r.name));
    if (family) reasons.unshift(`A ${gear.robot.why}`);
    if (fits) reasons.unshift("Listed for this application");
    const cond = str(r.condition);
    if (cond) reasons.push(cond);
    const score = ps + rs + sizeBonus(p, need.payload) + (fits ? 20 : 0) + (family ? 25 : 0) + (num(r.price) ? 5 : 0);
    out.push({
      source: "market", kind: "robot", id: str(r.id), name: str(r.name), brand: str(r.brand), model: str(r.model),
      payload: p, reach: num(r.reach), type: str(r.robot_type), price: num(r.price), currency: str(r.currency) || "INR",
      condition: cond || null, location: str(r.location) || null, image: firstImage(r.images),
      href: `/robots/${str(r.id)}`, score, reasons,
    });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit);
}

const STOP = new Set(["with", "and", "the", "for", "tool", "tools", "robot", "station", "system", "head", "unit", "gripper", "change", "changer", "sensor", "robotic", "process", "part", "parts", "surface", "prep", "handling"]);
/** Words from the station name and its recommended tooling ("MIG torch", "sack gripper") used to rank tools. */
export const toolHints = (hint: string) =>
  [...new Set(hint.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && !STOP.has(w)))];

function hintScore(text: string, hints: string[], reasons: string[]) {
  const t = text.toLowerCase();
  // Stem long words so "palletizing" matches "palletizer" and "grinding" matches "grinder".
  const hit = hints.filter((h) => t.includes(h.length > 6 ? h.slice(0, 6) : h));
  if (hit.length) reasons.push(`Matches “${hit.slice(0, 2).join(", ")}”`);
  // A spot gun for MIG work, or a tool made for another robot, is ruled out by the job (gearFor) and lockedOut.
  return hit.length * 25;
}

/** The tool family of a catalogue tool, or null when it is not a working tool (camera, sensor, component, changer). */
export function toolFamily(name: string, category = ""): ToolFamily | null {
  if (/vision|sensing|calibration|additive|generic demo|taping/i.test(category)) return null;
  if (isComponent(name, category) || /hand-eye|verification|pencil/i.test(name)) return null;
  const kind = eoatKind(`${name} ${category.replace(/tool changer|handling/gi, "")}`) as ToolFamily;
  // The catalogue's "Tool Changer" group also holds deburring tools; a changer itself is not a working tool.
  if (/tool changer|quick.?change/i.test(`${name} ${category}`) && kind === "parallel") return null;
  // Anything that is not named as a gripper and fell through to "parallel" is not one.
  if (kind === "parallel" && !/grip|hand|jaw|finger|erector/i.test(`${name} ${category}`)) return null;
  return kind;
}

const SIZES = ["light", "medium", "heavy"] as const;
/** How well a tool suits the job beyond its family: the right head, size, robot and maker. */
function toolFit(name: string, family: ToolFamily, need: StationNeed, gear: ReturnType<typeof gearFor>, hints: string[], reasons: string[]) {
  const rank = gear.tools.indexOf(family);
  let score = 60 - rank * 15;
  if (gear.prefer?.test(name)) score += 30;
  if (gear.avoid?.test(name)) score -= 60;
  if (GRIP_FAMILIES.includes(family)) {
    const want = SIZES.indexOf(sizeFor(need.payload));
    const size = SIZES.indexOf(gripSize(name));
    // A gripper too small drops the part; one too big is heavy and slow on a small arm.
    if (size === want) {
      score += 15;
      reasons.push(`Sized for ${["small", "medium", "heavy"][want]} parts`);
    } else score -= size > want ? 15 * (size - want) : 10 * (want - size);
    const cobot = need.cobot || /collaborative|cobot/i.test(need.arm ?? "");
    if (cobot ? COBOT_EOAT.test(name) : INDUSTRIAL_EOAT.test(name)) score += 10;
    const wanted = gear.prefer?.test(name) || hints.some((h) => name.toLowerCase().includes(h)) || (family === "magnet" && gear.tools.includes("magnet"));
    if (SPECIALTY_GRIP.test(name) && !wanted) score -= 25;
    if (GRIP_PART.test(name)) score -= 15;
  }
  // CAD states of the same product ("(Closed)", "(Open)") rank after the product itself.
  if (/\((?:closed|open|fully closed|mechanism|example)\)/i.test(name)) score -= 5;
  if (/^generic\b/i.test(name)) score -= 10;
  return score;
}

/** The job's gear from its name and the station's tooling words ("spot welding gun" makes it spot welding). */
const gearOf = (need: StationNeed, hint: string) => gearFor(`${need.job ?? ""} ${hint}`.trim(), need.kind);

export function matchOemTools(need: StationNeed, tools: DirTool[], hint = "", limit = 6): Match[] {
  const gear = gearOf(need, hint);
  const hints = toolHints(hint);
  // A station that names its gripper ("vacuum gripper", "sack gripper") gets that family first.
  const named = hint ? (eoatKind(hint) as ToolFamily) : null;
  const families = named && named !== "parallel" && gear.tools.includes(named) ? [named, ...gear.tools.filter((f) => f !== named)] : gear.tools;
  const ranked = { ...gear, tools: families };
  const out: Match[] = [];
  for (const t of tools) {
    const family = toolFamily(t.n, t.c);
    if (!family || !families.includes(family)) continue;
    if (lockedOut(t.n, need.arm)) continue;
    const apps = TOOL_APPS[need.kind].filter((a) => t.ap?.includes(a));
    const reasons = [`${t.c}`, ...(apps.length ? [`For ${apps.join(", ")}`] : [])];
    const score = toolFit(t.n, family, need, ranked, hints, reasons) + apps.length * 5 + (MAJOR.includes(t.b) ? 5 : 0) + hintScore(`${t.n} ${t.c}`, hints, reasons);
    if (score <= 0) continue;
    out.push({
      source: "oem", kind: "tool", id: t.id, name: t.n, brand: t.b, model: t.m, type: t.c,
      file: { img: t.img, th: t.th },
      href: `/directory?tab=tools&q=${encodeURIComponent(t.n)}`,
      score, reasons,
    });
  }
  out.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  // The job needs a head the catalogue does not list: say the best one is the nearest, not the right one.
  if (gear.special && out[0] && !gear.special[1].test(out[0].name)) out[0].reasons.unshift(`No ${gear.special[0]} listed — nearest tool`);
  return out.slice(0, limit);
}

export function matchMarketTools(need: StationNeed, list: Record<string, unknown>[], hint = "", limit = 6): Match[] {
  const words = MARKET_TOOL_WORDS[need.kind];
  const gear = gearOf(need, hint);
  const hints = toolHints(hint);
  const out: Match[] = [];
  for (const t of list) {
    const text = [t.name, t.category, t.main_category, t.sub_category, t.component_type].map(str).join(" ");
    if (!words.test(text)) continue;
    const family = eoatKind(text) as ToolFamily;
    if (!gear.tools.includes(family) || isComponent(str(t.name)) || lockedOut(text, need.arm)) continue;
    const cond = str(t.condition);
    const reasons = ["Listed on RobotVerse", ...(cond ? [cond] : [])];
    const score = toolFit(str(t.name), family, need, gear, hints, []) + (num(t.price) ? 5 : 0) + hintScore(text, hints, reasons);
    if (score <= 0) continue;
    out.push({
      source: "market", kind: "tool", id: str(t.id), name: str(t.name), brand: str(t.brand), model: str(t.model),
      type: str(t.sub_category || t.category), price: num(t.price), currency: str(t.currency) || "INR",
      condition: cond || null, location: str(t.location) || null, image: firstImage(t.images),
      href: `/parts/${str(t.id)}`, score, reasons,
    });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit);
}
