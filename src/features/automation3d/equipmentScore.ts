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

/** Directory tool categories and application tags that suit the task. */
const TOOL_NEEDS: Record<ProcessKind, { cats: RegExp; apps: string[] }> = {
  handling: { cats: /gripper|handling|tool changer/i, apps: ["Material Handling"] },
  transport: { cats: /gripper|handling/i, apps: ["Material Handling"] },
  welding: { cats: /weld/i, apps: ["Welding"] },
  machining: { cats: /gripper|handling|tool changer/i, apps: ["Material Handling", "Tool Changing"] },
  finishing: { cats: /machining|finishing/i, apps: ["Grinding", "Sanding", "Deburring", "Milling"] },
  coating: { cats: /dispens|paint/i, apps: ["Dispensing", "Painting"] },
  inspection: { cats: /vision|sensing|gripper/i, apps: ["Inspection", "Material Handling"] },
  palletizing: { cats: /gripper|handling/i, apps: ["Material Handling"] },
  packing: { cats: /gripper|handling|taping/i, apps: ["Material Handling", "Taping"] },
  assembly: { cats: /screw|gripper|tool changer/i, apps: ["Screwing", "Material Handling"] },
  filling: { cats: /dispens|gripper/i, apps: ["Dispensing", "Material Handling"] },
  sealing: { cats: /gripper|screw/i, apps: ["Screwing", "Material Handling"] },
  labeling: { cats: /gripper|taping|handling/i, apps: ["Taping", "Material Handling"] },
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
}

export function needOf(st: AiStation): StationNeed {
  const kind = processKind({ name: st.skill || st.name });
  const eq = `${st.equipment} ${st.name}`;
  return {
    kind,
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

export function matchOemRobots(need: StationNeed, catalog: DirRobot[], limit = 6): Match[] {
  const apps = [...ROBOT_APPS[need.kind], ...(need.cobot ? ["Collaborative"] : [])];
  const out: Match[] = [];
  for (const r of catalog) {
    const reasons: string[] = [];
    const ps = payloadScore(r.p, need.payload, reasons);
    const rs = reachScore(r.r, need.reach, reasons);
    if (ps < 0 || rs < 0) continue;
    const listed = apps.filter((a) => r.ap?.includes(a));
    if (listed.length < ROBOT_APPS[need.kind].length) continue;
    if (need.cobot && !r.ap?.includes("Collaborative")) continue;
    if (need.robotType && r.t !== need.robotType) continue;
    if (!need.robotType && need.kind !== "palletizing" && /SCARA|Delta/.test(r.t)) continue;
    reasons.unshift(`OEM lists ${listed.join(" + ")}`);
    const score = ps + rs + listed.length * 10 + (MAJOR.includes(r.b) ? 10 : 0) + (r.a === 6 || need.robotType ? 5 : 0);
    out.push({
      source: "oem", kind: "robot", id: r.id, name: r.n, brand: r.b, model: r.m, payload: r.p, reach: r.r, axes: r.a, type: r.t,
      file: { img: r.img, th: r.th },
      href: `/directory?q=${encodeURIComponent(r.n)}`, score, reasons,
    });
  }
  // Best score first, one model per brand so the user sees real choice.
  out.sort((a, b) => b.score - a.score || (a.payload ?? 0) - (b.payload ?? 0));
  const seen = new Set<string>();
  return out.filter((m) => (seen.has(m.brand) ? false : (seen.add(m.brand), true))).slice(0, limit);
}

export function matchMarketRobots(need: StationNeed, list: Record<string, unknown>[], limit = 6): Match[] {
  const words = MARKET_WORDS[need.kind];
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
    if (fits) reasons.unshift("Listed for this application");
    const cond = str(r.condition);
    if (cond) reasons.push(cond);
    const score = ps + rs + (fits ? 20 : 0) + (num(r.price) ? 5 : 0);
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
  let score = hit.length * 25;
  // A spot-welding gun is not a MIG/TIG torch (and the other way round).
  if (/spot/.test(t) !== hints.includes("spot") && /weld/.test(t)) score -= 40;
  // Tools made for one small robot model only.
  if (/yumi|e\.do/.test(t) && !hints.some((h) => /yumi|edo/.test(h))) score -= 30;
  return score;
}

export function matchOemTools(need: StationNeed, tools: DirTool[], hint = "", limit = 6): Match[] {
  const want = TOOL_NEEDS[need.kind];
  const hints = toolHints(hint);
  const out: Match[] = [];
  for (const t of tools) {
    const apps = want.apps.filter((a) => t.ap?.includes(a));
    const catOk = want.cats.test(t.c);
    if (!apps.length && !catOk) continue;
    if (/generic demo/i.test(t.c)) continue;
    const reasons = [`${t.c}`, ...(apps.length ? [`For ${apps.join(", ")}`] : [])];
    const primary = t.ap?.includes(want.apps[0]) ? 40 : 0;
    const score = primary + (apps.length - (primary ? 1 : 0)) * 10 + (catOk ? 15 : 0) + (MAJOR.includes(t.b) ? 5 : 0) + hintScore(`${t.n} ${t.c}`, hints, reasons);
    if (score <= 0) continue;
    out.push({
      source: "oem", kind: "tool", id: t.id, name: t.n, brand: t.b, model: t.m, type: t.c,
      file: { img: t.img, th: t.th },
      href: `/directory?tab=tools&q=${encodeURIComponent(t.n)}`,
      score, reasons,
    });
  }
  out.sort((a, b) => b.score - a.score);
  return out.slice(0, limit);
}

export function matchMarketTools(need: StationNeed, list: Record<string, unknown>[], hint = "", limit = 6): Match[] {
  const words = MARKET_TOOL_WORDS[need.kind];
  const hints = toolHints(hint);
  const out: Match[] = [];
  for (const t of list) {
    const text = [t.name, t.category, t.main_category, t.sub_category, t.component_type].map(str).join(" ");
    if (!words.test(text)) continue;
    const cond = str(t.condition);
    const reasons = ["Listed on RobotVerse", ...(cond ? [cond] : [])];
    const score = 20 + (num(t.price) ? 5 : 0) + hintScore(text, hints, reasons);
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
