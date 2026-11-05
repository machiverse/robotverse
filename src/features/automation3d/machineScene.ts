import type { ProcessCard } from "@/data/automationStudioIndustries";
import { processesFromSkills } from "@/utils/processAnalyzer";
import { processKind, PROCESS_HEAD } from "./processProfiles";
import type { AiSolution } from "./aiSolution";
import type { MediaAnalysis } from "./mediaAnalysis";
import type { MachineFamily, SceneMachine, SceneOperation } from "./machineSceneTypes";

export type SceneProcess = ProcessCard & { scene?: SceneOperation };
export const MACHINERY_REFERENCE = "https://marketing-in.github.io/plant-machinery-portal/";
const FAMILIES: { family: MachineFamily; label: string; pattern: RegExp }[] = [
  { family: "injection", label: "Injection moulding machine", pattern: /injection|moulding|molding|die[- ]?cast/i },
  { family: "thermoform", label: "Thermoforming machine", pattern: /thermoform|vacuum forming/i },
  { family: "foaming", label: "Foaming station", pattern: /foaming|foam inject/i },
  { family: "reflow", label: "Reflow / curing oven", pattern: /reflow|heller|curing oven|furnace/i },
  { family: "laser", label: "Enclosed laser station", pattern: /laser|trulaser/i },
  { family: "press", label: "Forming press", pattern: /press|stamp|blanking|schuler|weingarten|press brake/i },
  { family: "lathe", label: "CNC lathe", pattern: /lathe|turning|turn[- ]?mill/i },
  { family: "mill", label: "CNC machining centre", pattern: /\bcnc\b|\bvmc\b|machining cent|milling/i },
];

/** Identity is never inferred from a photo here: this reads the existing written findings only. */
export function identifySceneMachine(text: string, origin: SceneMachine["origin"] = "description"): SceneMachine | undefined {
  const hit = FAMILIES.find((f) => f.pattern.test(text));
  if (!hit) return undefined;
  return { family: hit.family, label: hit.label, evidence: text.trim().slice(0, 500), origin };
}

function machineForProcess(p: ProcessCard, local: string, brief: string, origin: SceneMachine["origin"]) {
  const kind = processKind(p);
  // A carried drill, torch or coating tool must not silently become a tended machine.
  if (!["machining", "handling", "transport"].includes(kind) || (PROCESS_HEAD.test(p.name) && !/machine|tend|load|unload|sheet/i.test(local))) return undefined;
  const own = identifySceneMachine(local, origin);
  if (own) return own;
  if (kind === "machining" || /machine tending|machine loading/i.test(p.name)) {
    return identifySceneMachine(brief, origin) ?? { family: "unknown" as const, label: "Machine — type unconfirmed", evidence: local, origin };
  }
  return undefined;
}

/** Add scene information without changing the legacy process adapter or template exports. */
export function groundSceneProcesses(processes: SceneProcess[], brief: string): SceneProcess[] {
  return processes.map((p, i) => {
    if (p.scene) return p;
    const clauses = brief.split(/(?:[.;\n]|\bthen\b)/i).filter((s) => s.trim());
    const matching = clauses.find((s) => identifySceneMachine(s) && (processKind(p) === "machining" || /machine tending|machine loading/i.test(p.name)));
    const local = matching ?? p.name;
    return { ...p, scene: { id: `operation-${i + 1}`, skillName: p.name, what: p.short, tooling: p.eoat.join("; "), cycleS: null, payloadKg: null, machine: machineForProcess(p, local, brief, "description") } };
  });
}

/** Station order, repeated skills, tools and payload survive the analysis-to-scene bridge. */
export function sceneProcessesFromSolution(solution: AiSolution, brief: string): SceneProcess[] {
  if (!solution.stations.length) return groundSceneProcesses(solution.tasks.flatMap((name) => processesFromSkills([name])), brief);
  return solution.stations.flatMap((st, i) => {
    const p = processesFromSkills([st.skill || st.name])[0];
    if (!p) return [];
    const local = `${st.name}. ${st.what}`;
    const machine = machineForProcess(p, local, brief, "analysis");
    return [{ ...p, index: String(i + 1).padStart(2, "0"), short: st.name || p.short,
      automated: st.what ? [st.what, ...p.automated.slice(1)] : p.automated,
      eoat: st.tooling ? [st.tooling] : p.eoat,
      robot: { ...p.robot, payload: st.payload_kg != null && st.payload_kg > 0 ? `${st.payload_kg} kg` : p.robot.payload, reach: st.reach_mm != null && st.reach_mm > 0 ? `${st.reach_mm} mm` : p.robot.reach },
      cycleTimeAutomated: st.cycle_s != null && st.cycle_s > 0 ? `${st.cycle_s} sec (estimate)` : p.cycleTimeAutomated,
      scene: { id: `operation-${i + 1}`, skillName: p.name, what: st.what, tooling: st.tooling, cycleS: st.cycle_s, payloadKg: st.payload_kg, machine },
    }];
  });
}

export function sceneProcessesFromMedia(media: MediaAnalysis, note = ""): SceneProcess[] {
  const brief = [note, media.summary, media.description, ...media.manual_steps].filter(Boolean).join(". ");
  return groundSceneProcesses(media.tasks.flatMap((name) => processesFromSkills([name])), brief).map((p) => ({
    ...p, scene: p.scene ? { ...p.scene, machine: p.scene.machine ? { ...p.scene.machine, origin: "analysis" } : undefined } : undefined,
  }));
}