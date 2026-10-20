// supabase/functions/lead-capture/index.ts
//
// One place for every enquiry on the site that used to end in a toast or an email link:
// Automation Studio ("Talk to an engineer", "Get a quote for this cell"), the cell builder,
// and the Directory ("Enquire", datasheet requests, "Notify me when available",
// "Get a used price", "Sell this model", training listings).
//
//   POST { kind, source, page?, item?, contact, message?, details?, share? }
//     -> { ok: true, id }
//
// Each enquiry becomes a row in the existing CRM table `seller_leads`, owned by the
// RobotVerse sales account and unlocked (it is RobotVerse's own lead). A "notify me" or
// "used price" request is also a demand record in the existing `sourcing_signals` table.
// When the buyer ticks "share with sellers who stock this model", sellers with a matching
// listing get the lead the usual way (locked until they unlock it). Sales is alerted by
// email, and on WhatsApp when SALES_WHATSAPP_NUMBER is set. No table is created or changed.
//
// Environment: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SMTP_* (as the other functions),
// optional LEADS_OWNER_ID (the sales account's user id), SALES_ALERT_EMAIL,
// SALES_WHATSAPP_NUMBER, WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID.

import { createClient } from "npm:@supabase/supabase-js@2.99.1";
import { SimpleSMTP } from "../_shared/smtp.ts";
import { KINDS, notesOf, UUID, validate, type LeadInput } from "../_shared/leads.ts";

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const SUPPORT = "support@robotverse.in";
/** The admin accounts named in the database's is_admin() check, used when LEADS_OWNER_ID is not set. */
const ADMIN_EMAILS = ["mynameisrajan@gmail.com", "mark.it@keyleerkorb.com"];

const admin = () => createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

/** The RobotVerse sales account that owns website leads in the CRM. */
async function ownerId(db: ReturnType<typeof admin>): Promise<string | null> {
  const fixed = Deno.env.get("LEADS_OWNER_ID");
  if (fixed && UUID.test(fixed)) return fixed;
  const byType = await db.from("profiles").select("user_id").eq("account_type", "admin").order("created_at", { ascending: true }).limit(1);
  if (byType.data?.[0]?.user_id) return byType.data[0].user_id;
  const byEmail = await db.from("profiles").select("user_id, email").in("email", ADMIN_EMAILS);
  const first = ADMIN_EMAILS.map((e) => byEmail.data?.find((p) => p.email === e)).find(Boolean);
  return first?.user_id ?? null;
}

async function emailSales(subject: string, html: string) {
  const username = Deno.env.get("SMTP_USER") || "";
  const password = Deno.env.get("SMTP_PASS") || "";
  if (!username || !password) return false;
  const client = new SimpleSMTP({ hostname: Deno.env.get("SMTP_HOST") || "smtppro.zoho.in", port: parseInt(Deno.env.get("SMTP_PORT") || "465"), username, password });
  const fromEmail = Deno.env.get("SMTP_FROM") || username || SUPPORT;
  try {
    await client.connect();
    await client.send({ from: `"RobotVerse" <${fromEmail}>`, fromEmail, to: Deno.env.get("SALES_ALERT_EMAIL") || SUPPORT, subject, html });
    return true;
  } catch (e) {
    console.error("lead-capture email failed", e);
    return false;
  } finally {
    await client.close();
  }
}

async function whatsappSales(text: string) {
  const to = (Deno.env.get("SALES_WHATSAPP_NUMBER") ?? "").replace(/[^\d]/g, "");
  const token = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  const phoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  if (!to || !token || !phoneId) return false;
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body: text.slice(0, 4000) } }),
    });
    if (!res.ok) console.error("lead-capture WhatsApp alert failed", res.status, await res.text());
    return res.ok;
  } catch (e) {
    console.error("lead-capture WhatsApp alert failed", e);
    return false;
  }
}

// A few enquiries a minute from one address is plenty; more is a bot.
const recent = new Map<string, number[]>();
function tooMany(key: string) {
  const now = Date.now();
  const hits = (recent.get(key) ?? []).filter((t) => now - t < 60_000);
  hits.push(now);
  recent.set(key, hits);
  return hits.length > 5;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (tooMany(ip)) return json({ error: "Too many requests — please try again in a minute" }, 429);

  let body: Partial<LeadInput>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request" }, 400);
  }
  const { lead, error } = validate(body);
  if (!lead) return json({ error }, 400);

  const db = admin();
  const kind = KINDS[lead.kind];
  const itemName = lead.item?.name || [lead.item?.brand, lead.item?.model].filter(Boolean).join(" ") || kind.label;
  const notes = notesOf(lead);

  // Signed-in visitors are linked to their account.
  let buyerId: string | null = null;
  const auth = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (auth) {
    const { data } = await db.auth.getUser(auth).catch(() => ({ data: { user: null } }));
    buyerId = data?.user?.id ?? null;
  }

  const owner = await ownerId(db);
  if (!owner) console.error("lead-capture: no sales account found; set LEADS_OWNER_ID");
  let id: string | null = null;
  if (owner) {
    const { data, error: dbError } = await db
      .from("seller_leads")
      .insert({
        seller_id: owner,
        buyer_id: buyerId,
        buyer_name: lead.contact.name,
        buyer_email: lead.email,
        buyer_phone: lead.phone,
        buyer_company: lead.contact.company || null,
        buyer_location: lead.contact.city || null,
        item_id: lead.item?.id && UUID.test(lead.item.id) ? lead.item.id : null,
        item_type: lead.item?.type || "general",
        item_name: itemName,
        source: lead.source,
        lead_source: lead.source,
        lead_type: lead.kind,
        product_category: lead.item?.type || null,
        status: "new",
        priority: kind.priority,
        notes,
        tags: ["website", lead.kind, lead.source],
        is_unlocked: true,
      })
      .select("id")
      .single();
    if (dbError) console.error("lead-capture insert failed", dbError);
    id = data?.id ?? null;
  }

  // Demand records: what buyers want that is not on the marketplace yet.
  if (lead.kind === "notify" || lead.kind === "used_price") {
    const d = lead.details ?? {};
    await db
      .from("sourcing_signals")
      .insert({
        user_id: buyerId,
        requested_oem: lead.item?.brand || null,
        requested_model: lead.item?.model || lead.item?.name || null,
        required_payload_kg: typeof d.payloadKg === "number" ? d.payloadKg : null,
        required_reach_mm: typeof d.reachMm === "number" ? Math.round(d.reachMm) : null,
        application: lead.item?.type || null,
        buyer_location: lead.contact.city || null,
        timeline: typeof d.timeline === "string" ? d.timeline.slice(0, 60) : null,
        source_channel: `directory_${lead.kind}`,
      })
      .then(({ error: e }) => e && console.error("sourcing_signals insert failed", e));
  }

  // With the buyer's consent, sellers who list this model get the lead the usual way (locked).
  let shared = 0;
  if (lead.share && lead.item?.model) {
    const { data: stock } = await db
      .from("robots")
      .select("id, seller_id, name")
      .ilike("model", `%${lead.item.model.replace(/[%_]/g, "")}%`)
      .limit(20);
    const sellers = [...new Map((stock ?? []).filter((r) => r.seller_id && r.seller_id !== owner).map((r) => [r.seller_id, r])).values()].slice(0, 5);
    for (const r of sellers) {
      const { error: e } = await db.from("seller_leads").insert({
        seller_id: r.seller_id,
        buyer_id: buyerId,
        buyer_name: lead.contact.name,
        buyer_email: lead.email,
        buyer_phone: lead.phone,
        buyer_company: lead.contact.company || null,
        buyer_location: lead.contact.city || null,
        item_id: r.id,
        item_type: "robot",
        item_name: r.name,
        source: lead.source,
        lead_source: lead.source,
        lead_type: lead.kind,
        status: "new",
        priority: kind.priority,
        notes: lead.message || null,
        tags: ["website", lead.kind],
        is_unlocked: false,
      });
      if (!e) {
        shared++;
        await db.from("notifications").insert({
          user_id: r.seller_id,
          notification_type: "quote_request",
          title: "New enquiry for a model you list",
          message: `A buyer asked about ${itemName}. Open your leads to respond.`,
          reference_id: r.id,
          reference_type: "robot",
          is_read: false,
        });
      }
    }
  }

  const rows: [string, unknown][] = [
    ["Request", kind.label],
    ["Name", lead.contact.name],
    ["WhatsApp / phone", lead.phone],
    ["Email", lead.email],
    ["Company", lead.contact.company],
    ["City", lead.contact.city],
    ["Item", itemName],
    ["Source", lead.source],
    ["Shared with sellers", lead.share ? `${shared} seller(s)` : "No"],
  ];
  const html = `<div style="font-family:Arial,sans-serif;max-width:640px"><h2 style="color:#1e40af">${esc(kind.label)}: ${esc(lead.contact.name)}</h2><table style="font-size:14px">${rows
    .filter(([, v]) => v)
    .map(([k, v]) => `<tr><td style="color:#64748b;padding:4px 12px 4px 0">${esc(k)}</td><td style="font-weight:600">${esc(v)}</td></tr>`)
    .join("")}</table><pre style="white-space:pre-wrap;font-family:inherit;background:#f8fafc;padding:12px;border-radius:8px">${esc(notes)}</pre><p style="color:#94a3b8;font-size:12px">Saved in the CRM (Leads)${id ? ` · ${id}` : ""}.</p></div>`;
  const [mailed, whatsapped] = await Promise.all([
    // Plain ASCII subject: the SMTP helper sends headers unencoded.
    emailSales(`New lead: ${kind.label} - ${lead.contact.name}${lead.contact.city ? `, ${lead.contact.city}` : ""}`.replace(/[^\x20-\x7e]/g, ""), html),
    whatsappSales(`New RobotVerse lead (${kind.label})\n${lead.contact.name}${lead.contact.company ? `, ${lead.contact.company}` : ""}${lead.contact.city ? `, ${lead.contact.city}` : ""}\n${lead.phone ?? lead.email ?? ""}\n${itemName}\n${(lead.message || "").slice(0, 300)}`),
  ]);

  // The lead is safe once it is saved or sales has been told.
  if (!id && !mailed && !whatsapped) return json({ error: "We could not send your request — please WhatsApp or email us" }, 502);
  return json({ ok: true, id, alerted: { email: mailed, whatsapp: whatsapped } });
});
