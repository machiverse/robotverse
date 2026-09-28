/**
 * Automation Studio — AI solution engineer.
 *
 * Sends any free-text automation brief to the "automation-solution" edge
 * function and gets back an engineered solution. Its tasks use the studio's
 * skill names, so the same answer drives the report and the 3D line.
 */

import { supabase } from "@/integrations/supabase/client";
import type { ProcessCard } from "@/data/automationStudioIndustries";
import { processesFromSkills, SKILL_LIBRARY } from "@/utils/processAnalyzer";

export interface AiStation {
  name: string;
  skill: string;
  what: string;
  equipment: string;
  payload_kg: number | null;
  reach_mm: number | null;
  tooling: string;
  sensors: string[];
  cycle_s: number | null;
  notes: string;
}

export interface AiSolution {
  /** "engine" = RobotVerse built-in knowledge engine, "ai" = AI engineer. */
  source?: "engine" | "ai";
  title: string;
  understanding: string;
  feasibility: "high" | "medium" | "low";
  automation_level: "full" | "semi" | "assist";
  workpiece: { name: string; material: string; size: string; weight_kg: number | null } | null;
  throughput: { target: string; takt_s: number | null };
  tasks: string[];
  stations: AiStation[];
  architecture: { type: string; why: string; alternatives: { option: string; pros: string; cons: string; when: string }[] };
  material_flow: string;
  controls: { plc: string; hmi: string; communication: string; safety: string[]; interlocks: string[] };
  layout: { footprint_m: string; notes: string[] };
  utilities: string[];
  risks: { risk: string; mitigation: string }[];
  implementation: { phase: string; weeks: string; deliverables: string }[];
  budget_inr: { low: number | null; high: number | null; notes: string };
  roi: { labour_saved: string; quality_gain: string; payback_months: string };
  kpis: string[];
  assumptions: string[];
  questions: string[];
}

const cache = new Map<string, Promise<AiSolution>>();
const key = (brief: string, industry?: string | null) => `${industry ?? ""}::${brief.trim().replace(/\s+/g, " ").toLowerCase()}`;

/** One request per distinct brief; repeated calls share the answer. */
export function requestSolution(brief: string, industry?: string | null): Promise<AiSolution> {
  const k = key(brief, industry);
  const hit = cache.get(k);
  if (hit) return hit;
  const p = (async () => {
    const { data, error } = await supabase.functions.invoke("automation-solution", {
      body: { brief: brief.trim(), industry: industry ?? undefined, skills: SKILL_LIBRARY.map((s) => s.template.name) },
    });
    if (error) {
      // Prefer the function's own reason over the client's generic status text.
      let reason = "";
      try {
        const ctx = (error as { context?: Response }).context;
        reason = ctx ? ((await ctx.json())?.error ?? "") : "";
      } catch {
        /* body was not JSON */
      }
      throw new Error(reason || "the AI service is not reachable");
    }
    if (!data || data.error) throw new Error(data?.error || "No solution returned.");
    return { ...(data as AiSolution), source: "ai" as const };
  })();
  cache.set(k, p);
  p.catch(() => cache.delete(k));
  return p;
}

/** Process cards for the 3D line: the AI's tasks, else its stations matched to the closest skill. */
export function solutionProcesses(s: AiSolution): ProcessCard[] {
  const fromTasks = processesFromSkills(s.tasks);
  if (fromTasks.length) return fromTasks;
  return processesFromSkills(s.stations.map((st) => st.skill || `${st.name} ${st.what}`));
}

export const inr = (v: number | null) =>
  v == null ? "—" : v >= 1e7 ? `₹${(v / 1e7).toFixed(2)} Cr` : v >= 1e5 ? `₹${(v / 1e5).toFixed(1)} L` : `₹${Math.round(v).toLocaleString("en-IN")}`;
