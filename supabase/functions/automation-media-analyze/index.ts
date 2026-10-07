// supabase/functions/automation-media-analyze/index.ts
//
// Automation Studio: reads photos or video frames of a manual process and
// returns the tasks a robot line would take over, using the studio's own
// skill names so the 3D simulator can plan and simulate them.
//
// Body: { images: string[] (data: or https: URLs, max 6), note?: string, skills: string[] }
// Uses the Lovable AI Gateway (Gemini vision) with LOVABLE_API_KEY.
// Reads no tables and writes nothing.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const SYSTEM = `You are an industrial automation engineer. You look at photos or video frames of people doing manual work in a factory, warehouse, lab or plant, and decide how industrial robots would automate it.
Rules:
- Describe only what is visible or clearly implied. Do not invent extra processes.
- Pick the robot tasks ONLY from the SKILLS list, using the exact names, in the order the work flows.
- If handling is needed to move the part between steps, include "Loading & Unloading" first.
- Respond ONLY with compact JSON, no markdown.`;

function schema(skills: string[], note: string) {
  return `SKILLS: ${skills.join(" | ")}
${note ? `User note: ${note}\n` : ""}
Return JSON:
{
  "summary": "one sentence: what manual work is shown",
  "workpiece": { "name": "part or product", "material": "material or unknown", "size": "approx size or unknown", "weight_kg": number or null },
  "manual_steps": ["what the worker does, step by step (max 8)"],
  "tasks": ["exact SKILLS names in flow order (1-8)"],
  "description": "2-3 sentences describing the process in plain words, naming each task, e.g. 'Operators load parts from the conveyor into a welding fixture, MIG weld the joints and stack finished parts on pallets.'",
  "observations": ["safety, ergonomics or quality issues seen (max 5)"],
  "confidence": "high" | "medium" | "low"
}`;
}

function parseJson(raw: string) {
  const text = raw.replace(/```json|```/g, "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  return JSON.parse(start >= 0 && end > start ? text.slice(start, end + 1) : text);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const images: string[] = Array.isArray(body.images)
      ? body.images.filter((u: unknown) => typeof u === "string" && /^(data:image\/|https:\/\/)/.test(u as string)).slice(0, 6)
      : [];
    const note = typeof body.note === "string" ? body.note.slice(0, 1000) : "";
    const skills: string[] = Array.isArray(body.skills)
      ? body.skills.filter((s: unknown) => typeof s === "string").map((s: string) => s.slice(0, 80)).slice(0, 120)
      : [];
    if (!images.length) return json({ error: "Upload at least one image or video." }, 400);
    if (images.some((u) => u.length > 2_500_000)) return json({ error: "Image too large. Please use a smaller photo." }, 413);

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        temperature: 0.2,
        max_tokens: 1500,
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: [
              { type: "text", text: schema(skills, note) },
              ...images.map((url) => ({ type: "image_url", image_url: { url } })),
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error("AI gateway error", res.status, txt.slice(0, 300));
      if (res.status === 429) return json({ error: "Too many requests. Please try again in a minute." }, 429);
      // Out of credits / AI disabled is an expected state: answer 200 with `unavailable`
      // so the page shows a readable note instead of an edge-function failure.
      if (res.status === 402 || res.status === 403) {
        return json({ unavailable: true, reason: res.status === 402 ? "credits" : "blocked", error: "Photo and video analysis is not available right now. Describe the job in words instead." });
      }
      return json({ error: `AI service error (${res.status})` }, 502);
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content ?? "";
    let result;
    try {
      result = parseJson(raw);
    } catch {
      return json({ error: "Could not read the analysis. Please try another photo.", raw: raw.slice(0, 500) }, 502);
    }
    const allowed = new Set(skills.map((s) => s.toLowerCase()));
    const tasks = (Array.isArray(result.tasks) ? result.tasks : [])
      .filter((t: unknown) => typeof t === "string")
      .filter((t: string) => !allowed.size || allowed.has(t.toLowerCase()))
      .slice(0, 8);

    return json({
      summary: String(result.summary || ""),
      workpiece: result.workpiece ?? null,
      manual_steps: Array.isArray(result.manual_steps) ? result.manual_steps.slice(0, 8).map(String) : [],
      tasks,
      description: String(result.description || ""),
      observations: Array.isArray(result.observations) ? result.observations.slice(0, 5).map(String) : [],
      confidence: ["high", "medium", "low"].includes(result.confidence) ? result.confidence : "medium",
    });
  } catch (e) {
    console.error("automation-media-analyze", e);
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
