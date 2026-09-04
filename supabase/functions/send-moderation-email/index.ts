// send-moderation-email
// ------------------------------------------------------------------
// Admin-only. Given a user_moderation record id this function:
//   1. verifies the caller is an admin (public.is_admin RPC)
//   2. (optional, enforce=true) applies the account consequences with the
//      service role: disables listings, closes active enquiries, and on
//      reinstatement restores previously disabled listings
//   3. sends the notification email via the existing Zoho SMTP transport
//   4. records email_sent_at on success
//
// LANGUAGE RULES FOR EVERY TEMPLATE IN THIS FILE (enforced in review):
//   - Never use "fraudulent", "dishonest", "untrustworthy" or any judgement
//     about the person. Describe the ACCOUNT ACTION and the POLICY concerned,
//     never the character of the user.
//   - Always include the case reference and the appeal route.
//   - Never copy any third party. Never mention publicising the decision.
//   - No emojis in subject lines.
// ------------------------------------------------------------------
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SimpleSMTP } from "../_shared/smtp.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const SUPPORT_EMAIL = "support@robotverse.in";
const PRIVACY_EMAIL = "privacy@robotverse.in";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }) + " IST";

interface TemplateInput {
  name: string;
  email: string;
  reasonLabel: string;
  caseId: string;
  date: string;
  suspensionUntil?: string | null;
}

// Shared paragraphs — identical structure across all three templates.
const closing = (caseRef: string) => `
<p>If you believe this decision is incorrect, you may appeal within 14 days by replying to this email with your case reference (${esc(caseRef)}) and any supporting information. Appeals are reviewed by a member of our team who was not involved in the original decision.</p>
<p>Data held about your account will be retained and handled in accordance with our Privacy Policy and applicable Indian data protection law. You may request details of the data we hold by writing to ${PRIVACY_EMAIL}.</p>
<p>Regards,<br/>RobotVerse Trust &amp; Safety<br/>${SUPPORT_EMAIL}</p>`;

const header = (t: TemplateInput) => `
<p>Dear ${esc(t.name)},</p>`;

const facts = (t: TemplateInput) => `
<p><strong>Reason:</strong> ${esc(t.reasonLabel)}<br/>
<strong>Reference:</strong> ${esc(t.caseId)}<br/>
<strong>Date of decision:</strong> ${esc(t.date)}</p>`;

function permanentBlockTemplate(t: TemplateInput) {
  return {
    subject: "Your RobotVerse account has been permanently closed",
    html: `${header(t)}
<p>Your RobotVerse account (${esc(t.email)}) has been permanently closed following a review of activity on the platform.</p>
${facts(t)}
<p><strong>What this means:</strong></p>
<ul>
  <li>Your account and listings are no longer accessible</li>
  <li>Any active enquiries or quotes have been closed</li>
  <li>Creating a new account will result in that account also being closed</li>
</ul>
${closing(t.caseId)}`,
  };
}

function suspensionTemplate(t: TemplateInput) {
  const until = t.suspensionUntil ? fmtDateTime(t.suspensionUntil) : "further notice";
  return {
    subject: "Your RobotVerse account has been temporarily suspended",
    html: `${header(t)}
<p>Your RobotVerse account (${esc(t.email)}) has been temporarily suspended following a review of activity on the platform.</p>
${facts(t)}
<p>Your account is suspended until ${esc(until)}. Access will be restored automatically on that date provided no further issues arise.</p>
${closing(t.caseId)}`,
  };
}

function warningTemplate(t: TemplateInput) {
  return {
    subject: "A notice regarding your RobotVerse account",
    html: `${header(t)}
<p>We are writing regarding your RobotVerse account (${esc(t.email)}) following a review of activity on the platform.</p>
${facts(t)}
<p>This notice concerns the conduct policy above. No restriction has been applied to your account at this time. Please review the policy concerned so that further action is not required.</p>
${closing(t.caseId)}`,
  };
}

function reinstatedTemplate(t: TemplateInput) {
  return {
    subject: "Your RobotVerse account has been reinstated",
    html: `${header(t)}
<p>Following a review, your RobotVerse account (${esc(t.email)}) has been reinstated and full access has been restored.</p>
<p><strong>Reference:</strong> ${esc(t.caseId)}<br/>
<strong>Date of decision:</strong> ${esc(t.date)}</p>
<p>Previously paused listings have been made available again. If anything is missing, reply to this email quoting your reference.</p>
<p>Regards,<br/>RobotVerse Trust &amp; Safety<br/>${SUPPORT_EMAIL}</p>`,
  };
}

const wrap = (inner: string) => `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;background:#f4f6f8;padding:24px">
  <div style="background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e3e8ee">
    <div style="background:#1b3a5f;color:#ffffff;padding:18px 24px;font-size:16px;font-weight:600">RobotVerse Trust &amp; Safety</div>
    <div style="padding:24px;color:#1f2937;font-size:14px;line-height:1.6">${inner}</div>
  </div>
</div>`;

// ---- Enforcement helpers (service role) ----
async function enforce(admin: any, rec: any) {
  const uid = rec.user_id as string;
  const disabled: string[] = [];

  if (rec.action === "suspension" || rec.action === "permanent_block") {
    // Disable listings: robots -> availability 'unavailable' (remember ids for reversal)
    const { data: robots } = await admin.from("robots").select("id").eq("seller_id", uid).eq("availability", "available");
    const ids = (robots || []).map((r: any) => r.id);
    if (ids.length) {
      await admin.from("robots").update({ availability: "unavailable" }).in("id", ids);
      disabled.push(...ids);
    }
    // Close active enquiries / leads
    await admin.from("user_requests").update({ status: "closed" }).eq("user_id", uid).in("status", ["pending", "responded", "unlocked"]);
    await admin.from("user_requests").update({ status: "closed" }).eq("seller_id", uid).in("status", ["pending", "responded", "unlocked"]);
    await admin.from("seller_leads").update({ status: "closed_lost" }).eq("seller_id", uid).in("status", ["new", "contacted", "quoted", "negotiating"]);

    if (disabled.length) {
      const merged = Array.from(new Set([...(rec.related_listing_ids || []), ...disabled]));
      await admin.from("user_moderation").update({ related_listing_ids: merged }).eq("id", rec.id);
    }
  }

  if (rec.action === "reinstated") {
    // Restore listings that were paused by the original (now inactive) record(s)
    const { data: prior } = await admin.from("user_moderation").select("related_listing_ids")
      .eq("user_id", uid).eq("is_active", false).in("action", ["suspension", "permanent_block"]);
    const ids = Array.from(new Set((prior || []).flatMap((p: any) => p.related_listing_ids || [])));
    if (ids.length) await admin.from("robots").update({ availability: "available" }).in("id", ids).eq("seller_id", uid);
  }
  return disabled.length;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) return json({ error: "Unauthorized" }, 401);
    const { data: isAdmin } = await callerClient.rpc("is_admin");
    if (!isAdmin) return json({ error: "Forbidden: admin access required" }, 403);

    const body = await req.json().catch(() => ({}));
    const moderationId = typeof body?.moderation_id === "string" ? body.moderation_id : null;
    const doEnforce = body?.enforce !== false; // default true
    const sendEmail = body?.send_email !== false; // default true
    if (!moderationId || !/^[0-9a-f-]{36}$/i.test(moderationId)) return json({ error: "moderation_id (uuid) required" }, 400);

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: rec, error: recErr } = await admin
      .from("user_moderation")
      .select("id, user_id, action, reason_code, suspension_until, actioned_at, related_listing_ids, email_sent_at, block_reasons(label)")
      .eq("id", moderationId).single();
    if (recErr || !rec) return json({ error: recErr?.message || "Record not found" }, 404);

    let disabledCount = 0;
    if (doEnforce) disabledCount = await enforce(admin, rec);

    if (!sendEmail) return json({ ok: true, enforced: doEnforce, disabled_listings: disabledCount, email: "skipped" });

    // Resolve recipient
    const { data: profile } = await admin.from("profiles").select("full_name, company_name, email").eq("user_id", rec.user_id).maybeSingle();
    let email = profile?.email as string | undefined;
    if (!email) {
      const { data: au } = await admin.auth.admin.getUserById(rec.user_id);
      email = au?.user?.email ?? undefined;
    }
    if (!email) return json({ ok: true, enforced: doEnforce, disabled_listings: disabledCount, email: "no_address" });

    const t: TemplateInput = {
      name: profile?.full_name || profile?.company_name || "RobotVerse member",
      email,
      reasonLabel: (rec as any).block_reasons?.label || "Platform policy",
      caseId: `RV-${String(rec.id).slice(0, 8).toUpperCase()}`,
      date: fmtDate(rec.actioned_at),
      suspensionUntil: rec.suspension_until,
    };
    const tpl =
      rec.action === "permanent_block" ? permanentBlockTemplate(t)
      : rec.action === "suspension" ? suspensionTemplate(t)
      : rec.action === "reinstated" ? reinstatedTemplate(t)
      : warningTemplate(t);

    const smtpHost = Deno.env.get("SMTP_HOST") || "smtppro.zoho.in";
    const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "465");
    const smtpUser = Deno.env.get("SMTP_USER") || "";
    const smtpPass = Deno.env.get("SMTP_PASS") || "";
    const fromEmail = Deno.env.get("SMTP_FROM") || smtpUser || SUPPORT_EMAIL;
    if (!smtpUser || !smtpPass) return json({ ok: true, enforced: doEnforce, disabled_listings: disabledCount, email: "smtp_not_configured" });

    const client = new SimpleSMTP({ hostname: smtpHost, port: smtpPort, username: smtpUser, password: smtpPass });
    try {
      await client.connect();
      await client.send({ from: `"RobotVerse Trust & Safety" <${fromEmail}>`, fromEmail, to: email, subject: tpl.subject, html: wrap(tpl.html) });
    } finally {
      await client.close();
    }
    const sentAt = new Date().toISOString();
    await admin.from("user_moderation").update({ email_sent_at: sentAt }).eq("id", rec.id);

    return json({ ok: true, enforced: doEnforce, disabled_listings: disabledCount, email: "sent", email_sent_at: sentAt });
  } catch (e) {
    console.error("send-moderation-email error:", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
