// supabase/functions/automation-solution/index.ts
//
// Automation Studio: AI solution engineer. Reads ANY free-text automation
// brief (a process, a factory, a problem) and returns an engineered solution:
// stations with robots, tooling, sensors and cycle times, the architecture and
// alternatives, controls and safety, layout, risks, phases, budget and ROI.
// Tasks are returned with the studio's own skill names so the 3D simulator
// can build the line.
//
// Body: { brief: string, skills: string[], industry?: string }
// Uses the Lovable AI Gateway with LOVABLE_API_KEY. Reads no tables, writes nothing.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const SYSTEM = `You are a senior industrial automation and robotics solutions engineer (system integrator) with deep knowledge of industrial robots (FANUC, ABB, KUKA, Yaskawa, Kawasaki, Universal Robots, Doosan, Epson, Stäubli), cobots, gantries, AMR/AGV, conveyors, vision, end-of-arm tooling, PLC/HMI (Siemens, Rockwell, Mitsubishi), functional safety (ISO 10218, ISO 13849, ISO/TS 15066) and the Indian manufacturing market.
Given any automation brief — even vague, unusual or non-manufacturing — design the most practical, safe and cost-effective solution a good integrator would propose.
Rules:
- Solve the user's actual problem. Do not add processes they did not ask for, except the handling needed to connect steps.
- Prefer the simplest architecture that meets the need; explain why, and give real alternatives (e.g. cobot vs industrial robot vs gantry vs dedicated machine vs semi-automation).
- Size robots by payload (part + tool, with margin), reach and cycle time. Name example robot models that fit.
- Be specific about tooling, sensors, safety devices, PLC/HMI, interlocks and utilities.
- Give realistic Indian-market budget ranges in INR (integrated, including tooling, safety, commissioning). If unsure, give a wide range and say so.
- Map each station to the closest name from SKILLS for the 3D simulator (exact spelling). If none fits, use "".
- State assumptions and ask up to 4 short clarifying questions that would change the design.
- Respond ONLY with compact JSON, no markdown.`;

function schema(brief: string, skills: string[], industry: string) {
  return `SKILLS: ${skills.join(" | ")}
${industry ? `Industry: ${industry}\n` : ""}BRIEF:
"""${brief}"""

Return JSON:
{
  "title": "short name of the solution",
  "understanding": "2-3 sentences: what the user needs, in plain words",
  "feasibility": "high" | "medium" | "low",
  "automation_level": "full" | "semi" | "assist",
  "workpiece": { "name": "", "material": "", "size": "", "weight_kg": number or null },
  "throughput": { "target": "e.g. 120 parts/hour or unknown", "takt_s": number or null },
  "tasks": ["SKILLS names in flow order, for the 3D line (1-10)"],
  "stations": [
    { "name": "station name", "skill": "exact SKILLS name or ''", "what": "what happens here",
      "equipment": "robot / machine type and 2-3 example models", "payload_kg": number or null, "reach_mm": number or null,
      "tooling": "end-of-arm tool / fixture", "sensors": ["..."], "cycle_s": number or null, "notes": "" }
  ],
  "architecture": { "type": "e.g. single robot cell / multi-robot line / cobot station / gantry / AMR + cell / special machine",
    "why": "why this is the best fit",
    "alternatives": [ { "option": "", "pros": "", "cons": "", "when": "when to choose it" } ] },
  "material_flow": "how parts enter, move and leave (1-3 sentences)",
  "controls": { "plc": "", "hmi": "", "communication": "e.g. PROFINET / EtherNet/IP / OPC UA / MES link",
    "safety": ["fencing, light curtains, scanners, interlocked doors, E-stops, PL rating"],
    "interlocks": ["key interlocks and permissives"] },
  "layout": { "footprint_m": "approx L x W", "notes": ["aisle, operator position, utilities, infeed/outfeed"] },
  "utilities": ["power, compressed air, water, extraction, network"],
  "risks": [ { "risk": "", "mitigation": "" } ],
  "implementation": [ { "phase": "", "weeks": "e.g. 2-3", "deliverables": "" } ],
  "budget_inr": { "low": number, "high": number, "notes": "what is included" },
  "roi": { "labour_saved": "", "quality_gain": "", "payback_months": "" },
  "kpis": ["how to measure success"],
  "assumptions": ["..."],
  "questions": ["clarifying questions (max 4)"]
}`;
}

function parseJson(raw: string) {
  const text = raw.replace(/```json|```/g, "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  return JSON.parse(start >= 0 && end > start ? text.slice(start, end + 1) : text);
}

const str = (v: unknown, max = 600) => (typeof v === "string" ? v.slice(0, max) : v == null ? "" : String(v).slice(0, max));
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const strs = (v: unknown, n: number, max = 300) => (Array.isArray(v) ? v.filter((x) => x != null).slice(0, n).map((x) => str(x, max)) : []);
const pick = <T extends string>(v: unknown, allowed: T[], d: T): T => (allowed.includes(v as T) ? (v as T) : d);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const brief = typeof body.brief === "string" ? body.brief.trim().slice(0, 6000) : "";
    const industry = typeof body.industry === "string" ? body.industry.slice(0, 80) : "";
    const skills: string[] = Array.isArray(body.skills)
      ? body.skills.filter((s: unknown) => typeof s === "string").map((s: string) => s.slice(0, 80)).slice(0, 150)
      : [];
    if (brief.length < 8) return json({ error: "Describe the work you want to automate." }, 400);

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        temperature: 0.25,
        max_tokens: 6000,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: schema(brief, skills, industry) },
        ],
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error("AI gateway error", res.status, txt.slice(0, 300));
      if (res.status === 429) return json({ error: "Too many requests. Please try again in a minute." }, 429);
      if (res.status === 402) return json({ error: "AI credits exhausted." }, 402);
      return json({ error: `AI service error (${res.status})` }, 502);
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content ?? "";
    let r;
    try {
      r = parseJson(raw);
    } catch {
      return json({ error: "Could not read the solution. Please try again." }, 502);
    }

    const allowed = new Map(skills.map((s) => [s.toLowerCase(), s]));
    const skillName = (v: unknown) => allowed.get(str(v, 80).toLowerCase()) ?? "";
    const stations = (Array.isArray(r.stations) ? r.stations : []).slice(0, 12).map((s: Record<string, unknown>) => ({
      name: str(s?.name, 120),
      skill: skillName(s?.skill),
      what: str(s?.what),
      equipment: str(s?.equipment),
      payload_kg: num(s?.payload_kg),
      reach_mm: num(s?.reach_mm),
      tooling: str(s?.tooling),
      sensors: strs(s?.sensors, 6, 120),
      cycle_s: num(s?.cycle_s),
      notes: str(s?.notes),
    }));
    let tasks = (Array.isArray(r.tasks) ? r.tasks : []).map(skillName).filter(Boolean);
    if (!tasks.length) tasks = stations.map((s: { skill: string }) => s.skill).filter(Boolean);
    tasks = [...new Set(tasks)].slice(0, 10);

    const arch = r.architecture ?? {};
    const controls = r.controls ?? {};
    const layout = r.layout ?? {};
    const budget = r.budget_inr ?? {};
    const roi = r.roi ?? {};

    return json({
      title: str(r.title, 140),
      understanding: str(r.understanding, 900),
      feasibility: pick(r.feasibility, ["high", "medium", "low"], "medium"),
      automation_level: pick(r.automation_level, ["full", "semi", "assist"], "semi"),
      workpiece: r.workpiece
        ? { name: str(r.workpiece.name, 120), material: str(r.workpiece.material, 120), size: str(r.workpiece.size, 120), weight_kg: num(r.workpiece.weight_kg) }
        : null,
      throughput: { target: str(r.throughput?.target, 120), takt_s: num(r.throughput?.takt_s) },
      tasks,
      stations,
      architecture: {
        type: str(arch.type, 160),
        why: str(arch.why, 900),
        alternatives: (Array.isArray(arch.alternatives) ? arch.alternatives : []).slice(0, 4).map((a: Record<string, unknown>) => ({
          option: str(a?.option, 160), pros: str(a?.pros), cons: str(a?.cons), when: str(a?.when),
        })),
      },
      material_flow: str(r.material_flow, 900),
      controls: {
        plc: str(controls.plc, 300), hmi: str(controls.hmi, 300), communication: str(controls.communication, 300),
        safety: strs(controls.safety, 8), interlocks: strs(controls.interlocks, 8),
      },
      layout: { footprint_m: str(layout.footprint_m, 80), notes: strs(layout.notes, 6) },
      utilities: strs(r.utilities, 8),
      risks: (Array.isArray(r.risks) ? r.risks : []).slice(0, 6).map((x: Record<string, unknown>) => ({ risk: str(x?.risk), mitigation: str(x?.mitigation) })),
      implementation: (Array.isArray(r.implementation) ? r.implementation : []).slice(0, 8).map((x: Record<string, unknown>) => ({
        phase: str(x?.phase, 160), weeks: str(x?.weeks, 40), deliverables: str(x?.deliverables),
      })),
      budget_inr: { low: num(budget.low), high: num(budget.high), notes: str(budget.notes) },
      roi: { labour_saved: str(roi.labour_saved), quality_gain: str(roi.quality_gain), payback_months: str(roi.payback_months, 80) },
      kpis: strs(r.kpis, 6),
      assumptions: strs(r.assumptions, 6),
      questions: strs(r.questions, 4),
    });
  } catch (e) {
    console.error("automation-solution", e);
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
