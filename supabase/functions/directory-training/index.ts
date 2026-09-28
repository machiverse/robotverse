// supabase/functions/directory-training/index.ts
//
// Directory → Training & Workshops: posters and enquiries.
//
//   POST { action: "analyze", image }                 -> details read from a poster (AI vision)
//   POST { action: "submit", image, info, contact }   -> signed-in users add a poster; support is emailed
//   POST { action: "list" }                           -> the 5 newest posters for the carousel
//   POST { action: "get", id }                        -> one poster, for its shareable page
//   POST { action: "enquire", listing, contact, message } -> enquiry emailed to support@robotverse.in
//
// No database tables are read or written. Posters are stored as files in the
// existing public "robot-images" bucket under directory-posters/: an image plus a
// small JSON file with the poster details. Contact details of the person who
// uploads or enquires are only emailed to support, never stored in public files.
// To remove a poster, delete its two files in Storage → robot-images → directory-posters.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const SUPPORT = "support@robotverse.in";
const BUCKET = "robot-images";
const FOLDER = "directory-posters";
const MAX_POSTERS = 5;
const MAX_IMAGE_CHARS = 3_000_000; // ~2.2 MB of JPEG as a data URL

const admin = () => createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const clip = (s: unknown, n = 300) => String(s ?? "").trim().slice(0, n);

interface PosterInfo {
  title: string;
  organizer: string;
  kind: string;
  mode: string;
  location: string;
  dates: string;
  duration: string;
  fee: string;
  topics: string[];
  contact: string;
  registration: string;
  summary: string;
}

function cleanInfo(raw: Record<string, unknown> | null | undefined): PosterInfo {
  const r = raw ?? {};
  const topics = Array.isArray(r.topics) ? r.topics : String(r.topics ?? "").split(",");
  return {
    title: clip(r.title, 160),
    organizer: clip(r.organizer, 120),
    kind: clip(r.kind, 40),
    mode: clip(r.mode, 40),
    location: clip(r.location, 160),
    dates: clip(r.dates, 120),
    duration: clip(r.duration, 80),
    fee: clip(r.fee, 80),
    topics: topics.map((t) => clip(t, 60)).filter(Boolean).slice(0, 8),
    contact: clip(r.contact, 200),
    registration: clip(r.registration, 300),
    summary: clip(r.summary, 400),
  };
}

async function sendEmail(subject: string, html: string, replyTo?: string): Promise<boolean> {
  const client = new SMTPClient({
    connection: {
      hostname: Deno.env.get("SMTP_HOST") || "smtppro.zoho.in",
      port: parseInt(Deno.env.get("SMTP_PORT") || "465"),
      tls: true,
      auth: { username: Deno.env.get("SMTP_USER") || "", password: Deno.env.get("SMTP_PASS") || "" },
    },
  });
  try {
    await client.send({
      from: `"RobotVerse" <${Deno.env.get("SMTP_FROM") || SUPPORT}>`,
      to: SUPPORT,
      replyTo: replyTo && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(replyTo) ? replyTo : undefined,
      subject,
      content: "auto",
      html,
    });
    return true;
  } catch (e) {
    console.error("directory-training email failed", e);
    return false;
  } finally {
    try {
      await client.close();
    } catch {
      /* already closed */
    }
  }
}

const rows = (pairs: [string, unknown][]) =>
  `<table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px">${pairs
    .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== "")
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#64748b;vertical-align:top">${esc(k)}</td><td style="padding:6px 0;color:#0f172a;font-weight:600">${esc(v)}</td></tr>`,
    )
    .join("")}</table>`;

const wrap = (title: string, body: string) =>
  `<div style="max-width:640px;margin:0 auto;font-family:Arial,sans-serif"><h2 style="color:#1e40af;margin:0 0 12px">${esc(title)}</h2>${body}<p style="color:#94a3b8;font-size:12px;margin-top:24px">Sent from the RobotVerse Directory · Training & Workshops</p></div>`;

async function analyze(image: string): Promise<PosterInfo> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      temperature: 0.1,
      max_tokens: 900,
      messages: [
        {
          role: "system",
          content:
            "You read posters and flyers for robotics / automation training courses, programs and workshops. Copy details exactly as printed; never invent. Use an empty string when a detail is not on the poster. Respond ONLY with compact JSON.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Return JSON: {"title":"course or workshop name","organizer":"institute / company","kind":"Workshop | Program | Online Course | OEM Academy","mode":"Online | Classroom | Online + Classroom","location":"venue and city","dates":"dates or start date as printed","duration":"e.g. 3 days, 40 hours","fee":"fee as printed","topics":["up to 8 topics"],"contact":"phone / email printed","registration":"registration link or instruction","summary":"one or two sentences describing the training"}`,
            },
            { type: "image_url", image_url: { url: image } },
          ],
        },
      ],
    }),
  });
  if (!res.ok) {
    console.error("AI gateway", res.status, (await res.text()).slice(0, 300));
    throw new Error(res.status === 429 ? "Too many requests. Please try again in a minute." : `AI service error (${res.status})`);
  }
  const data = await res.json();
  const raw = String(data.choices?.[0]?.message?.content ?? "").replace(/```json|```/g, "");
  const s = raw.indexOf("{");
  const e = raw.lastIndexOf("}");
  return cleanInfo(JSON.parse(s >= 0 && e > s ? raw.slice(s, e + 1) : raw));
}

// Native decoding (fetch on a data: URL) instead of a JS byte loop over megabytes
// of base64 — that loop was exhausting the worker's CPU budget.
async function decodeImage(dataUrl: string): Promise<{ bytes: Uint8Array; type: string; ext: string }> {
  const m = /^data:(image\/(jpeg|png|webp));base64,/.exec(dataUrl.slice(0, 40));
  if (!m) throw new Error("Please upload a JPG, PNG or WebP image.");
  const bytes = new Uint8Array(await (await fetch(dataUrl)).arrayBuffer());
  return { bytes, type: m[1], ext: m[2] === "jpeg" ? "jpg" : m[2] };
}

async function readPoster(sb: ReturnType<typeof admin>, id: string) {
  const { data: blob } = await sb.storage.from(BUCKET).download(`${FOLDER}/${id}.json`);
  if (!blob) return null;
  const meta = JSON.parse(await blob.text());
  const image = sb.storage.from(BUCKET).getPublicUrl(`${FOLDER}/${meta.image}`).data.publicUrl;
  return { id, image, info: cleanInfo(meta.info), submittedAt: meta.submittedAt, company: clip(meta.company, 120) };
}

// Run slow work (SMTP) after the response so it doesn't hold the request open.
const background = (p: Promise<unknown>) => {
  // deno-lint-ignore no-explicit-any
  const rt = (globalThis as any).EdgeRuntime;
  if (rt?.waitUntil) rt.waitUntil(p);
  else p.catch(() => {});
};

async function listPosters() {
  const sb = admin();
  const { data, error } = await sb.storage.from(BUCKET).list(FOLDER, { limit: 200, sortBy: { column: "name", order: "desc" } });
  if (error) throw error;
  const metas = (data ?? []).filter((f) => f.name.endsWith(".json")).slice(0, MAX_POSTERS);
  const out = [];
  for (const f of metas) {
    const { data: blob } = await sb.storage.from(BUCKET).download(`${FOLDER}/${f.name}`);
    if (!blob) continue;
    try {
      const meta = JSON.parse(await blob.text());
      const image = sb.storage.from(BUCKET).getPublicUrl(`${FOLDER}/${meta.image}`).data.publicUrl;
      out.push({ id: f.name.replace(/\.json$/, ""), image, info: cleanInfo(meta.info), submittedAt: meta.submittedAt, company: clip(meta.company, 120) });
    } catch {
      /* skip unreadable entries */
    }
  }
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");

    if (action === "list") {
      return new Response(JSON.stringify({ posters: await listPosters() }), {
        headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=60" },
      });
    }

    if (action === "get") {
      const id = String(body.id || "");
      // Poster ids are "<timestamp>-<8 hex>"; anything else is not a poster.
      if (!/^\d{13}-[0-9a-f]{8}$/.test(id)) return json({ error: "Poster not found." }, 404);
      const poster = await readPoster(admin(), id).catch(() => null);
      if (!poster) return json({ error: "Poster not found." }, 404);
      return new Response(JSON.stringify({ poster }), {
        headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=300" },
      });
    }

    if (action === "analyze") {
      const image = String(body.image || "");
      if (!/^data:image\//.test(image) || image.length > MAX_IMAGE_CHARS) return json({ error: "Please upload a poster image under 2 MB." }, 400);
      return json({ info: await analyze(image) });
    }

    if (action === "submit") {
      // Only signed-in members can publish a poster.
      const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
      const sb = admin();
      const { data: auth } = await sb.auth.getUser(token);
      const user = auth?.user;
      if (!user) return json({ error: "Please sign in to add a poster." }, 401);

      const image = String(body.image || "");
      if (image.length > MAX_IMAGE_CHARS) return json({ error: "Poster image is too large (max 2 MB)." }, 413);
      const { bytes, type, ext } = await decodeImage(image);
      const info = cleanInfo(body.info);
      if (!info.title) return json({ error: "Please add the training title." }, 400);
      const contact = body.contact ?? {};

      const id = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
      const up = await sb.storage.from(BUCKET).upload(`${FOLDER}/${id}.${ext}`, bytes, { contentType: type, upsert: false });
      if (up.error) throw up.error;
      const meta = { image: `${id}.${ext}`, info, submittedAt: new Date().toISOString(), company: clip(contact.company, 120), userId: user.id };
      const upMeta = await sb.storage
        .from(BUCKET)
        .upload(`${FOLDER}/${id}.json`, new TextEncoder().encode(JSON.stringify(meta)), { contentType: "application/json", upsert: false });
      if (upMeta.error) throw upMeta.error;

      const imageUrl = sb.storage.from(BUCKET).getPublicUrl(`${FOLDER}/${id}.${ext}`).data.publicUrl;
      background(sendEmail(
        `New training poster: ${info.title}`,
        wrap(
          "New training poster added to the Directory",
          `<p><img src="${esc(imageUrl)}" alt="Poster" style="max-width:100%;border-radius:8px"/></p>` +
            rows([
              ["Title", info.title],
              ["Organizer", info.organizer],
              ["Type", info.kind],
              ["Mode", info.mode],
              ["Location", info.location],
              ["Dates", info.dates],
              ["Duration", info.duration],
              ["Fee", info.fee],
              ["Topics", info.topics.join(", ")],
              ["Poster contact", info.contact],
              ["Registration", info.registration],
            ]) +
            `<h3 style="margin-top:20px">Added by</h3>` +
            rows([
              ["Name", clip(contact.name, 120)],
              ["Email", user.email ?? clip(contact.email, 160)],
              ["Phone", clip(contact.phone, 40)],
              ["Company", clip(contact.company, 120)],
            ]) +
            `<p style="color:#64748b;font-size:13px">The poster is live in the Directory carousel (newest ${MAX_POSTERS} are shown). To remove it, delete <b>${esc(`${FOLDER}/${id}`)}</b> (.${esc(ext)} and .json) in Supabase Storage → ${BUCKET}.</p>`,
        ),
        user.email ?? undefined,
      ));
      return json({ ok: true, id, image: imageUrl });
    }

    if (action === "enquire") {
      const contact = body.contact ?? {};
      const listing = body.listing ?? {};
      const name = clip(contact.name, 120);
      const email = clip(contact.email, 160);
      const phone = clip(contact.phone, 40);
      if (!name || (!email && !phone)) return json({ error: "Please add your name and an email or phone number." }, 400);
      const title = clip(listing.title, 160) || "Training";
      const sent = await sendEmail(
        `Training enquiry: ${title}${listing.id ? ` (${clip(listing.id, 40)})` : ""}`,
        wrap(
          `Training enquiry: ${title}`,
          rows([
            ["Training", title],
            ["RobotVerse ID", clip(listing.id, 40)],
            ["Provider", clip(listing.provider, 120)],
            ["Dates", clip(listing.dates, 120)],
            ["Location", clip(listing.location, 160)],
          ]) +
            `<h3 style="margin-top:20px">Enquiry from</h3>` +
            rows([
              ["Name", name],
              ["Email", email],
              ["Phone", phone],
              ["Company", clip(contact.company, 120)],
              ["City", clip(contact.city, 80)],
              ["Preferred mode", clip(contact.mode, 40)],
              ["Participants", clip(contact.participants, 20)],
              ["Message", clip(body.message, 2000)],
            ]),
        ),
        email,
      );
      if (!sent) return json({ error: "Could not send the enquiry right now." }, 502);
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("directory-training", e);
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
