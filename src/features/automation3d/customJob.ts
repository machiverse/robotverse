/**
 * Automation Studio — understand a job the user types in their own words.
 *
 * The text is matched against the robot skills library (the same matcher the
 * "Describe my job" path uses). Each recognised task comes back with what the
 * robot does, the tool, a typical robot, the stations that appear in 3D and the
 * engineer's key point, so the builder can place it on a cell.
 */

import { processesFromSkills } from "@/utils/processAnalyzer";
import { PROCESS_PROFILES, processKind, type ProcessKind } from "./processProfiles";
import { planLine, SKILLS } from "./robotKnowledge";
import { STATION_NAMES } from "./robotSim.js";
import { PLAYBOOK } from "./engineerPlaybook";
import { understandJob, type Confidence } from "./jobUnderstanding";

export interface JobTask {
  /** Skills-library task name, used to plan the cell. */
  name: string;
  kind: ProcessKind;
  family: string;
  does: string;
  tool: string;
  tools: string[];
  robot: string;
  payloadKg: number;
  stations: string[];
  cycle: [number, number];
  key: string;
  /** How sure the studio is: matched in the library, read from the action words, or a general start. */
  confidence: Confidence;
  why: string;
}

export function analyzeJob(text: string): JobTask[] {
  const words = text.trim();
  if (words.length < 3) return [];
  // Any wording: the skills library first, then the action words, then a general handling start.
  const understood = understandJob(words);
  const byName = new Map(understood.tasks.map((t) => [t.name, t]));
  return processesFromSkills(understood.tasks.map((t) => t.name))
    .slice(0, 6)
    .map((card) => {
      const kind = processKind(card);
      const plan = planLine([card], "balanced", { robots: 1 });
      const steps = plan.sim.cells[0]?.steps ?? [];
      const stations = [...new Set(steps.map((s) => STATION_NAMES[s.station] ?? s.station))].filter(Boolean);
      return {
        name: card.name,
        kind,
        family: PROCESS_PROFILES[kind].label,
        does: SKILLS[kind].does,
        tool: card.eoat[0] ?? SKILLS[kind].toolName,
        tools: card.eoat,
        robot: `${card.robot.model} (${card.robot.payload}, ${card.robot.reach})`,
        payloadKg: plan.robots[0]?.minPayload ?? SKILLS[kind].minPayload,
        stations,
        cycle: PLAYBOOK[kind].cycle,
        key: PLAYBOOK[kind].key,
        confidence: byName.get(card.name)?.confidence ?? "medium",
        why: byName.get(card.name)?.why ?? "",
      };
    });
}

export const JOB_EXAMPLES = ["deburr aluminium castings", "load parts into a press brake", "pick parcels and sort them", "glue windscreens", "cut fabric", "test mobile phones"];
