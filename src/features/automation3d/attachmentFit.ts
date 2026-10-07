/**
 * Automation Studio — does this attachment suit this robot and this job?
 *
 * The checks an integrator makes before bolting a tool to a robot: tool weight
 * against payload, the wrist the tool needs, flange size, tools made for one
 * robot brand, and accessories that do not belong in the process. Used by the
 * cell builder to warn the moment something unsuitable is added.
 */

import { eoatKind } from "./robotSim.js";
import { processKind, type ProcessKind } from "./processProfiles";
import type { Choice } from "./EquipmentPicker";
import type { Match } from "./equipmentScore";

export type FitLevel = "stop" | "warn";
export interface FitIssue {
  level: FitLevel;
  /** Which part of the cell the issue is about. */
  slot: "robot" | "tool" | "changer" | "sensor" | "camera";
  title: string;
  detail: string;
}

const text = (m?: Match) => (m ? `${m.name} ${m.brand ?? ""} ${m.model ?? ""} ${m.type ?? ""}`.toLowerCase() : "");

/** Typical weight of a tool or accessory, from what it is (listings rarely give it). */
export function toolWeightKg(m: Match, slot: "tool" | "changer" | "sensor" | "camera"): number {
  const t = text(m);
  if (slot === "camera") return 0.4;
  if (slot === "sensor") return /\b(omega|theta|delta)\b/.test(t) ? 2.5 : 0.8;
  if (slot === "changer") return /\b(qc-?[1-9]\d{2,}|heavy|large)\b/.test(t) ? 6 : 1.2;
  if (/spot|servo gun|x-gun|c-gun/.test(t)) return 90;
  if (/layer|full.?layer/.test(t)) return 120;
  const k = eoatKind(t);
  if (k === "fork") return 25;
  if (k === "spindle") return /belt|large|heavy/.test(t) ? 15 : 7;
  if (k === "magnet") return 6;
  if (k === "vacuum") return /palletiz|carton|case|large|zoned|foam/.test(t) ? 12 : 1.5;
  if (k === "torch") return /tig/.test(t) ? 1.2 : 2;
  if (k === "driver") return 2.5;
  if (k === "nozzle") return /bell|paint/.test(t) ? 5 : 2;
  if (k === "dual") return 3.5;
  return /large|heavy|long.?stroke/.test(t) ? 5 : 1.2;
}

const ROBOT_BRANDS: [RegExp, string][] = [
  [/\bfanuc\b|\bcrx\b/, "FANUC"],
  [/\babb\b|\byumi\b|\bgofa\b|\bswifti\b/, "ABB"],
  [/\bkuka\b|\blbr\b|\biiwa\b/, "KUKA"],
  [/\byaskawa\b|\bmotoman\b/, "Yaskawa"],
  [/universal robots|\bur ?(3|5|10|16|20|30)e?\b|\be-series\b/, "Universal Robots"],
  [/\bdoosan\b/, "Doosan"],
  [/\btechman\b|\btm ?(5|12|14|25)\b/, "Techman"],
  [/\bkawasaki\b/, "Kawasaki"],
  [/\bepson\b/, "Epson"],
  [/\bdenso\b/, "Denso"],
  [/\bst[aä]ubli\b/, "Stäubli"],
  [/\bnachi\b/, "Nachi"],
  [/\bomron\b/, "Omron"],
];
const brandOf = (t: string) => ROBOT_BRANDS.find(([re]) => re.test(t))?.[1] ?? null;
/** Tools from these makers are sold for many robots; their own name is not a robot brand. */
const UNIVERSAL_TOOL_MAKERS = /onrobot|robotiq|schunk|zimmer|schmalz|piab|festo|ati industrial|ati\b|binzel|fronius|tregaskiss|lincoln|esab|kemppi|atlas copco|desoutter|nordson|graco|sames|d[uü]rr|3m\b|ferrobotics/;

const isCobot = (r: Match) => /cobot|collaborative|\bur\d|crx|techman|doosan|gofa|crb\s?1|iisy|yumi|lbr/.test(text(r)) || r.reasons?.includes("Collaborative");
const NEEDS_TILT = new Set(["torch", "spindle", "nozzle", "driver"]);

/** Everything about the cell's attachments that does not fit the robot or the job. */
export function attachmentIssues(job: string, c: Choice): FitIssue[] {
  const out: FitIssue[] = [];
  const r = c.robot;
  const kind: ProcessKind | null = job ? processKind({ name: job }) : null;
  const rt = text(r);
  const tool = c.tool;
  const tt = text(tool);
  const tk = tool ? eoatKind(tt) : null;

  // 1. Weight at the wrist against the robot's payload.
  if (r?.payload) {
    const parts = (["tool", "changer", "sensor", "camera"] as const).filter((s) => c[s]);
    const kg = parts.reduce((n, s) => n + toolWeightKg(c[s]!, s), 0);
    if (kg > 0 && kg >= r.payload)
      out.push({
        level: "stop", slot: tool ? "tool" : parts[0],
        title: "Too heavy for this robot",
        detail: `The attachments weigh about ${kg.toFixed(1)} kg — the ${r.payload} kg robot cannot carry them plus a part. Choose a robot of at least ${Math.ceil(kg * 1.25 + 2)} kg or a lighter tool.`,
      });
    else if (kg > r.payload * 0.6)
      out.push({
        level: "warn", slot: tool ? "tool" : parts[0],
        title: "Little payload left for the part",
        detail: `About ${kg.toFixed(1)} kg of tooling leaves only ${(r.payload - kg).toFixed(1)} kg of the robot's ${r.payload} kg for the part and acceleration.`,
      });
  }

  // 2. The wrist the tool needs.
  if (r && tool && tk) {
    const rType = `${r.type ?? ""} ${r.name}`.toLowerCase();
    const limited = /delta|parallel link|spider|flexpicker/.test(rType) ? "delta" : /scara/.test(rType) ? "SCARA" : /palletiz|4.?axis|\b4 axes\b/.test(rType) || r.axes === 4 ? "4-axis palletizing" : null;
    if (limited && NEEDS_TILT.has(tk))
      out.push({
        level: "stop", slot: "tool",
        title: `A ${limited} robot cannot tilt this tool`,
        detail: `${tool.name} has to be angled to the work (torch, spindle, gun or driver at an angle). A ${limited} robot keeps the tool pointing straight down — use a 6-axis robot.`,
      });
    if (limited === "delta" && (tk === "fork" || tk === "magnet"))
      out.push({ level: "warn", slot: "tool", title: "Heavy gripper on a delta robot", detail: "Delta robots carry a few kilograms at high speed — use a light vacuum or finger gripper." });
  }

  // 3. Tool size against robot size (flange and grip force).
  if (r?.payload && tool) {
    const cobotTool = /onrobot|robotiq|co-act|for cobots|cobot/.test(tt);
    if (cobotTool && r.payload >= 50)
      out.push({
        level: "warn", slot: "tool",
        title: "Cobot-size tool on a large robot",
        detail: `${tool.name} is made for small collaborative robots (ISO 9409-1-50 flange). On a ${r.payload} kg robot it needs a flange adapter, and its grip force suits parts of a few kilograms only.`,
      });
    if (tk === "fork" && r.payload < 20)
      out.push({ level: "warn", slot: "tool", title: "Palletizing gripper on a small robot", detail: "Fork, sack and layer grippers weigh 15–30 kg on their own — they need a palletizing robot of 100 kg or more." });
  }

  // 4. Tools made for one robot brand.
  if (r && tool) {
    const yumi = /\byumi\b/.test(tt);
    if (yumi && !/\byumi\b|irb 14000|irb 14050/.test(rt))
      out.push({ level: "stop", slot: "tool", title: "Made for ABB YuMi only", detail: `${tool.name} fits the YuMi arm's own flange and electrics — it does not fit ${r.name}.` });
    else {
      const tb = UNIVERSAL_TOOL_MAKERS.test(tt) ? null : brandOf(tt);
      const rb = brandOf(rt) ?? brandOf((r.brand ?? "").toLowerCase());
      if (tb && rb && tb !== rb)
        out.push({ level: "warn", slot: "tool", title: `Made for ${tb} robots`, detail: `${tool.name} is built for ${tb}; on a ${rb} robot check the flange, cabling and software plug-in before buying.` });
    }
  }

  // 5. Accessories that do not belong in this process.
  if (kind) {
    if (c.camera && kind === "coating")
      out.push({ level: "warn", slot: "camera", title: "Camera inside a paint booth", detail: "Paint mist coats the lens and solvent zones need explosion-proof devices — mount the camera outside the booth or use an ATEX-rated, purged camera." });
    if (c.camera && kind === "welding")
      out.push({ level: "warn", slot: "camera", title: "Camera next to the arc", detail: "Spatter and arc glare blind a normal wrist camera — use a laser seam tracker or a shielded camera mounted away from the torch." });
    if (c.sensor && kind === "welding")
      out.push({ level: "warn", slot: "sensor", title: "Force sensor is not used for arc welding", detail: "Welding uses a torch collision sensor and seam tracking; a force/torque sensor would only take heat and spatter." });
    if (c.sensor && (kind === "palletizing" || kind === "transport"))
      out.push({ level: "warn", slot: "sensor", title: "Force sensor not needed here", detail: "Palletizing and transfer do not need force control — it adds cost and weight without benefit." });
    if (c.changer && tk === "torch")
      out.push({ level: "warn", slot: "changer", title: "Tool changer with a welding torch", detail: "Torches usually mount directly with a collision sensor and a through-arm cable. Use a changer only to swap torches or to switch to a gripper." });
    if (c.changer && kind === "coating")
      out.push({ level: "warn", slot: "changer", title: "Tool changer in a paint cell", detail: "Paint lines and colour-change valves run to the gun; a changer needs paint and air passages and an explosion-proof rating." });
  }

  // 6. Tool against the job (only when both are chosen).
  if (kind && tool && tk) {
    const grip = ["parallel", "dual", "vacuum", "magnet", "fork"];
    const fits: Record<ProcessKind, string[]> = {
      handling: grip, transport: grip, machining: grip, palletizing: ["vacuum", "fork", "parallel", "magnet"], packing: grip,
      welding: ["torch"], coating: ["nozzle"], finishing: ["spindle"], assembly: ["parallel", "dual", "driver", "vacuum"],
      inspection: [...grip], filling: ["nozzle", "parallel", "vacuum"], sealing: ["nozzle", "parallel", "driver"], labeling: ["vacuum", "parallel", "nozzle"],
    };
    if (!fits[kind].includes(tk)) {
      const name: Record<string, string> = { torch: "a welding torch", spindle: "a grinding spindle", nozzle: "a spray/dispense nozzle", driver: "a screwdriver", fork: "a palletizing fork gripper", magnet: "a magnetic gripper", vacuum: "a vacuum gripper", parallel: "a finger gripper", dual: "a dual gripper" };
      out.push({ level: "stop", slot: "tool", title: "Tool does not do this job", detail: `${tool.name} looks like ${name[tk] ?? "another tool"}; ${job.toLowerCase()} needs ${name[fits[kind][0]] ?? "a different tool"}.` });
    }
  }

  // 7. Collaborative robot with a dangerous tool.
  if (r && tool && isCobot(r) && (tk === "spindle" || /cutter|knife|blade|laser|plasma/.test(tt)))
    out.push({ level: "warn", slot: "tool", title: "Sharp or spinning tool on a cobot", detail: "A cobot is only safe next to people if the tool is too. Grinding, cutting or laser tools need a fence or scanner even on a cobot (ISO/TS 15066 risk assessment)." });

  return out;
}

/** Plain-language rules, shown in the engineer's playbook. */
export const ATTACHMENT_RULES: { rule: string; why: string }[] = [
  { rule: "Tool + accessories + part must stay under the robot's payload, with 25% margin", why: "The wrist and gearboxes are sized for the rated load; overloading shortens their life and stretches stops." },
  { rule: "Torches, spindles, guns and screwdrivers need a 6-axis wrist", why: "SCARA, delta and 4-axis palletizers keep the tool pointing down and cannot angle it to the work." },
  { rule: "Match the flange: ISO 9409-1-50 on cobots, 80–160 mm on large robots", why: "A small cobot gripper on a large robot needs an adapter and has too little grip force." },
  { rule: "Brand-specific tools fit only their own robot", why: "Some grippers (e.g. ABB YuMi fingers) use the arm's own flange, power and software." },
  { rule: "Palletizing fork, sack and layer grippers weigh 15–120 kg", why: "They belong on 100 kg+ palletizing robots, not small arms." },
  { rule: "No wrist camera in a paint booth or next to a welding arc", why: "Paint mist, spatter and glare blind it — use ATEX cameras or laser seam trackers mounted away." },
  { rule: "Force/torque sensors for grinding, polishing and fine assembly — not for welding or palletizing", why: "They control contact force; elsewhere they only add weight and cost." },
  { rule: "Welding torches mount directly with a collision sensor", why: "A tool changer is only worth it when the robot swaps torches or switches to a gripper." },
  { rule: "Cutting, grinding or laser tools need guarding even on a cobot", why: "Collaborative operation is judged on the whole application, including the tool (ISO/TS 15066)." },
];
