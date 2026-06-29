// SEO Generator — drains seo_jobs queue, calls Lovable AI Gateway,
// writes seo_metadata. Service-role only. Invoked by pg_cron or manually.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") ?? "";

const PROMPT_VERSION = 1;
const DEFAULT_MODEL = "google/gemini-3-flash-preview";
const SITE_ORIGIN = "https://robotverse.in";

type Job = {
  id: string;
  content_type: string;
  content_id: string;
  action: string;
  attempts: number;
  payload: Record<string, unknown>;
};

// ── source loaders ────────────────────────────────────────────────────────
const SOURCE: Record<
  string,
  { table: string; select: string; pk?: string; pathFor: (row: any) => string }
> = {
  robot: {
    table: "robots",
    select: "*",
    pathFor: (r) => `/robots/${r.id}`,
  },
  spare_part: {
    table: "spare_parts",
    select: "*",
    pathFor: (r) => `/spare-parts/${r.id}`,
  },
  service: {
    table: "services",
    select: "*",
    pathFor: (r) => `/services/${r.id}`,
  },
  blog: {
    table: "blogs",
    select: "*",
    pathFor: (r) => `/robobook/${r.slug ?? r.id}`,
  },
  profile: {
    table: "profiles",
    select: "id, full_name, company_name, bio, location, city, country, role, avatar_url, company_logo",
    pk: "user_id",
    pathFor: (r) => `/seller/${r.user_id ?? r.id}`,
  },
  community_post: {
    table: "community_posts",
    select: "*",
    pathFor: (r) => `/community/${r.id}`,
  },
};

async function loadSource(
  admin: ReturnType<typeof createClient>,
  contentType: string,
  contentId: string,
) {
  const cfg = SOURCE[contentType];
  if (!cfg) return null;
  const pk = cfg.pk ?? "id";
  const { data, error } = await admin
    .from(cfg.table)
    .select(cfg.select)
    .eq(pk, contentId)
    .maybeSingle();
  if (error) throw new Error(`load ${contentType} ${contentId}: ${error.message}`);
  return data ? { row: data, path: cfg.pathFor(data) } : null;
}

// ── content hash for smart-diff ───────────────────────────────────────────
async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hashableSlice(contentType: string, row: any): string {
  const pickers: Record<string, (r: any) => unknown> = {
    robot: (r) => ({
      t: r.title, b: r.brand, m: r.model, c: r.category, s: r.subcategory,
      d: r.description, sp: r.specifications, app: r.applications,
      i: r.industry, img: r.images, p: r.price, cond: r.condition, year: r.year_manufactured,
    }),
    spare_part: (r) => ({
      t: r.title, b: r.brand, c: r.category, comp: r.compatibility,
      d: r.description, s: r.specifications, img: r.images, p: r.price, cond: r.condition,
    }),
    service: (r) => ({
      t: r.title, c: r.category, d: r.description, area: r.service_area,
      p: r.price, img: r.images,
    }),
    blog: (r) => ({
      t: r.title, slug: r.slug, e: r.excerpt, c: r.content, cat: r.category,
      tags: r.tags, img: r.cover_image, pub: r.published_at,
    }),
    profile: (r) => ({
      n: r.full_name, c: r.company_name, b: r.bio, loc: r.location, city: r.city, role: r.role,
    }),
    community_post: (r) => ({
      t: r.title, c: r.content, tags: r.tags, img: r.images, cat: r.category,
    }),
  };
  const pick = pickers[contentType] ?? ((r) => r);
  return JSON.stringify(pick(row));
}

// ── prompt ────────────────────────────────────────────────────────────────
function buildPrompt(contentType: string, row: any, canonicalUrl: string) {
  return `You are the SEO/AEO/GEO engine for RobotVerse (${SITE_ORIGIN}), India's marketplace for industrial robots, spare parts, automation services, and related content.

Generate STRICT JSON SEO metadata for this ${contentType} optimized for:
- Google Search (classic SEO)
- Google Discover, News
- AI search engines (ChatGPT, Perplexity, Gemini, Claude) — AEO
- Geographic relevance for India — GEO

Canonical URL: ${canonicalUrl}
Source content (JSON):
${JSON.stringify(row, null, 2).slice(0, 12000)}

Rules:
- Title: 50–60 chars, includes primary keyword + brand/model when relevant.
- meta_description: 140–160 chars, action-oriented, includes city/India if applicable.
- focus_keyword: single primary keyword phrase.
- keywords: 8–15 long-tail + semantic variants.
- summary: 2–3 sentence plain-language overview (used for AEO answer boxes).
- highlights: 4–8 short bullet strings (key selling points).
- faq: 4–8 Q/A pairs grounded in the source content; no hallucination.
- ai_blocks: include applications[], industries[], pros[], cons[], use_cases[], buying_guide (string), maintenance (string when relevant), comparison (string when relevant).
- jsonld: array of one or more schema.org JSON-LD objects appropriate for content type (Product / Article / Service / Person / Organization). Include @context and @type. Use the canonical URL.
- og_*, twitter_*: derived from title/description/image.
- og_image / twitter_image: first usable image from source, else empty string.
- slug: URL-safe slug derived from title.
- breadcrumb: array of {name,url} from "Home" → category → item.
- rich_description: 250–600 words, helpful, factual, no fluff.
- Never invent specs, prices, certifications, or contact details not in the source.
- Output ONLY valid JSON, no markdown, no commentary.

Return JSON with EXACTLY these keys:
{
  "slug": string,
  "title": string,
  "meta_title": string,
  "meta_description": string,
  "focus_keyword": string,
  "keywords": string[],
  "og_title": string,
  "og_description": string,
  "og_image": string,
  "og_type": string,
  "twitter_title": string,
  "twitter_description": string,
  "twitter_image": string,
  "twitter_card": string,
  "jsonld": object[],
  "breadcrumb": {"name": string, "url": string}[],
  "faq": {"question": string, "answer": string}[],
  "summary": string,
  "highlights": string[],
  "ai_blocks": object,
  "tags": string[],
  "rich_description": string
}`;
}

async function callGateway(prompt: string, model: string) {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": LOVABLE_API_KEY,
      "X-Lovable-AIG-SDK": "raw-fetch",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: "You output strict JSON only. No prose, no markdown." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`gateway ${res.status}: ${text.slice(0, 500)}`);
  }
  const data = await res.json();
  const content: string = data?.choices?.[0]?.message?.content ?? "";
  if (!content) throw new Error("gateway returned empty content");
  try {
    return JSON.parse(content);
  } catch {
    // strip code fences if any
    const cleaned = content.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    return JSON.parse(cleaned);
  }
}

// ── job processor ─────────────────────────────────────────────────────────
async function processJob(admin: ReturnType<typeof createClient>, job: Job) {
  if (job.action === "delete") {
    await admin.from("seo_metadata")
      .delete()
      .eq("content_type", job.content_type)
      .eq("content_id", job.content_id);
    return { status: "completed" as const };
  }

  const source = await loadSource(admin, job.content_type, job.content_id);
  if (!source) {
    // source row gone — soft-delete metadata, skip
    await admin.from("seo_metadata")
      .delete()
      .eq("content_type", job.content_type)
      .eq("content_id", job.content_id);
    return { status: "skipped" as const, note: "source missing" };
  }

  const canonical = `${SITE_ORIGIN}${source.path}`;
  const hashInput = `${PROMPT_VERSION}|${hashableSlice(job.content_type, source.row)}`;
  const content_hash = await sha256(hashInput);

  // smart-diff: skip when nothing relevant changed and we already have completed metadata
  if (job.action !== "regenerate") {
    const { data: existing } = await admin
      .from("seo_metadata")
      .select("id, content_hash, status")
      .eq("content_type", job.content_type)
      .eq("content_id", job.content_id)
      .maybeSingle();
    if (existing && existing.status === "completed" && existing.content_hash === content_hash) {
      return { status: "skipped" as const, note: "unchanged" };
    }
  }

  const prompt = buildPrompt(job.content_type, source.row, canonical);
  const ai = await callGateway(prompt, DEFAULT_MODEL);

  const row = {
    content_type: job.content_type,
    content_id: job.content_id,
    lang: "en",
    slug: ai.slug ?? null,
    title: ai.title ?? null,
    meta_title: ai.meta_title ?? ai.title ?? null,
    meta_description: ai.meta_description ?? null,
    focus_keyword: ai.focus_keyword ?? null,
    keywords: Array.isArray(ai.keywords) ? ai.keywords : [],
    canonical_url: canonical,
    og_title: ai.og_title ?? ai.title ?? null,
    og_description: ai.og_description ?? ai.meta_description ?? null,
    og_image: ai.og_image ?? null,
    og_type: ai.og_type ?? (job.content_type === "blog" ? "article" : "website"),
    twitter_title: ai.twitter_title ?? ai.title ?? null,
    twitter_description: ai.twitter_description ?? ai.meta_description ?? null,
    twitter_image: ai.twitter_image ?? ai.og_image ?? null,
    twitter_card: ai.twitter_card ?? "summary_large_image",
    jsonld: Array.isArray(ai.jsonld) ? ai.jsonld : (ai.jsonld ? [ai.jsonld] : []),
    breadcrumb: Array.isArray(ai.breadcrumb) ? ai.breadcrumb : [],
    faq: Array.isArray(ai.faq) ? ai.faq : [],
    summary: ai.summary ?? null,
    highlights: Array.isArray(ai.highlights) ? ai.highlights : [],
    ai_blocks: ai.ai_blocks && typeof ai.ai_blocks === "object" ? ai.ai_blocks : {},
    tags: Array.isArray(ai.tags) ? ai.tags : [],
    rich_description: ai.rich_description ?? null,
    content_hash,
    model: DEFAULT_MODEL,
    prompt_version: PROMPT_VERSION,
    status: "completed",
    generated_at: new Date().toISOString(),
  };

  const { error: upErr } = await admin
    .from("seo_metadata")
    .upsert(row, { onConflict: "content_type,content_id,lang" });
  if (upErr) throw new Error(`upsert seo_metadata: ${upErr.message}`);

  return { status: "completed" as const };
}

// ── queue drain ───────────────────────────────────────────────────────────
async function claimJobs(admin: ReturnType<typeof createClient>, limit: number): Promise<Job[]> {
  // claim pending (and stale failed with attempts < 3) jobs
  const { data: pending } = await admin
    .from("seo_jobs")
    .select("id")
    .in("status", ["pending", "failed"])
    .lt("attempts", 3)
    .order("priority", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(limit);

  const ids = (pending ?? []).map((r) => r.id);
  if (ids.length === 0) return [];

  const { data: claimed, error } = await admin
    .from("seo_jobs")
    .update({ status: "processing", started_at: new Date().toISOString() })
    .in("id", ids)
    .eq("status", "pending") // only ones still pending; failed → handled below
    .select("id, content_type, content_id, action, attempts, payload");

  // also re-claim 'failed' rows separately to bump attempts
  const { data: reclaimed } = await admin
    .from("seo_jobs")
    .update({ status: "processing", started_at: new Date().toISOString() })
    .in("id", ids)
    .eq("status", "failed")
    .select("id, content_type, content_id, action, attempts, payload");

  if (error) throw new Error(`claim jobs: ${error.message}`);
  return [...(claimed ?? []), ...(reclaimed ?? [])] as Job[];
}

async function finalize(
  admin: ReturnType<typeof createClient>,
  job: Job,
  outcome: { status: "completed" | "skipped" } | { status: "failed"; error: string },
) {
  const patch: Record<string, unknown> = {
    status: outcome.status,
    finished_at: new Date().toISOString(),
    attempts: job.attempts + 1,
  };
  if (outcome.status === "failed") patch.last_error = (outcome as any).error.slice(0, 1000);
  await admin.from("seo_jobs").update(patch).eq("id", job.id);
}

// ── HTTP entrypoint ───────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  let body: any = {};
  try { body = await req.json(); } catch { /* empty body is fine */ }
  const batchSize = Math.max(1, Math.min(Number(body.batch_size) || 5, 20));

  // Optional: targeted single-job mode { content_type, content_id, force }
  if (body.content_type && body.content_id) {
    try {
      const fakeJob: Job = {
        id: "inline",
        content_type: body.content_type,
        content_id: String(body.content_id),
        action: body.force ? "regenerate" : "generate",
        attempts: 0,
        payload: {},
      };
      const result = await processJob(admin, fakeJob);
      return new Response(JSON.stringify({ ok: true, mode: "inline", result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (e) {
      return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  const jobs = await claimJobs(admin, batchSize);
  const results: any[] = [];

  for (const job of jobs) {
    try {
      const r = await processJob(admin, job);
      await finalize(admin, job, r);
      results.push({ id: job.id, type: job.content_type, status: r.status });
    } catch (e) {
      const msg = (e as Error).message ?? String(e);
      console.error(`[seo-generator] job ${job.id} failed:`, msg);
      await finalize(admin, job, { status: "failed", error: msg });
      results.push({ id: job.id, type: job.content_type, status: "failed", error: msg });
    }
  }

  return new Response(JSON.stringify({ ok: true, processed: results.length, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
