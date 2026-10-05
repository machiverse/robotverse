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
  /** The design decisions in order, with the rule or reason behind each. */
  reasoning?: { title: string; detail: string }[];
  /** Standards the design follows. */
  standards?: string[];
  /** Industry-specific design rules that apply. */
  industry_notes?: string[];
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

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
const cache = new Map<string, Promise<AiSolution>>();
const key = (brief: string, industry?: string | null) => `${industry ?? ""}::${brief.trim().replace(/\s+/g, " ").toLowerCase()}`;

/** One request per distinct brief; repeated calls share the answer. */
export function requestSolution(brief: string, industry?: string | null): Promise<AiSolution> {
  const k = key(brief, industry);
  const hit = cache.get(k);
  if (hit) return hit;
  const p = (async () => {
    // Plain fetch: an AI refusal (e.g. 402 out of credits) is an expected answer the
    // page handles by showing the built-in design, not an unhandled client error.
    let data: { error?: string } | null = null;
    try {
      const { data: s } = await supabase.auth.getSession();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/automation-solution`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${s.session?.access_token ?? SUPABASE_KEY}`,
        },
        body: JSON.stringify({ brief: brief.trim(), industry: industry ?? undefined, skills: SKILL_LIBRARY.map((x) => x.template.name) }),
      });
      data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `the AI service answered ${res.status}`);
    } catch (e) {
      throw new Error(e instanceof Error && e.message ? e.message : "the AI service is not reachable");
    }
    if (!data || data.error) throw new Error(data?.error || "No solution returned.");
    return normalize(data);
  })();
  cache.set(k, p);
  p.catch(() => cache.delete(k));
  return p;
}

const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

/** Accept only a real solution, with every list present, so the UI never reads a missing field. */
function normalize(data: unknown): AiSolution {
  const d = obj(data);
  const stations = arr<Record<string, unknown>>(d.stations).filter((x) => x && typeof x === "object");
  if (!stations.length && !arr(d.tasks).length) throw new Error("the AI answer had no stations");
  const arch = obj(d.architecture);
  const controls = obj(d.controls);
  const layout = obj(d.layout);
  const budget = obj(d.budget_inr);
  const roi = obj(d.roi);
  const text = (v: unknown) => (typeof v === "string" ? v : "");
  const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  return {
    source: "ai",
    reasoning: arr<{ title: string; detail: string }>(d.reasoning),
    standards: arr<string>(d.standards),
    industry_notes: arr<string>(d.industry_notes),
    title: text(d.title),
    understanding: text(d.understanding),
    feasibility: (["high", "medium", "low"].includes(d.feasibility as string) ? d.feasibility : "medium") as AiSolution["feasibility"],
    automation_level: (["full", "semi", "assist"].includes(d.automation_level as string) ? d.automation_level : "semi") as AiSolution["automation_level"],
    workpiece: d.workpiece ? (d.workpiece as AiSolution["workpiece"]) : null,
    throughput: { target: text(obj(d.throughput).target), takt_s: n(obj(d.throughput).takt_s) },
    tasks: arr<string>(d.tasks),
    stations: stations.map((x) => ({
      name: text(x.name), skill: text(x.skill), what: text(x.what), equipment: text(x.equipment),
      payload_kg: n(x.payload_kg), reach_mm: n(x.reach_mm), tooling: text(x.tooling),
      sensors: arr<string>(x.sensors), cycle_s: n(x.cycle_s), notes: text(x.notes),
    })),
    architecture: { type: text(arch.type), why: text(arch.why), alternatives: arr(arch.alternatives) },
    material_flow: text(d.material_flow),
    controls: { plc: text(controls.plc), hmi: text(controls.hmi), communication: text(controls.communication), safety: arr(controls.safety), interlocks: arr(controls.interlocks) },
    layout: { footprint_m: text(layout.footprint_m), notes: arr(layout.notes) },
    utilities: arr(d.utilities),
    risks: arr(d.risks),
    implementation: arr(d.implementation),
    budget_inr: { low: n(budget.low), high: n(budget.high), notes: text(budget.notes) },
    roi: { labour_saved: text(roi.labour_saved), quality_gain: text(roi.quality_gain), payback_months: text(roi.payback_months) },
    kpis: arr(d.kpis),
    assumptions: arr(d.assumptions),
    questions: arr(d.questions),
  };
}

/** Process cards for the 3D line: the AI's tasks, else its stations matched to the closest skill. */
export function solutionProcesses(s: AiSolution): ProcessCard[] {
  const fromTasks = processesFromSkills(s.tasks);
  if (fromTasks.length) return fromTasks;
  return processesFromSkills(s.stations.map((st) => st.skill || `${st.name} ${st.what}`));
}

export const inr = (v: number | null) =>
  v == null ? "—" : v >= 1e7 ? `₹${(v / 1e7).toFixed(2)} Cr` : v >= 1e5 ? `₹${(v / 1e5).toFixed(1)} L` : `₹${Math.round(v).toLocaleString("en-IN")}`;
