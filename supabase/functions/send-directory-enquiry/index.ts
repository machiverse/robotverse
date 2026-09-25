import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPPORT_EMAIL = "support@robotverse.in";

interface DirectoryEnquiry {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  role?: string;
  interests?: string[];
  section?: string;
  itemName?: string;
  message?: string;
  pageUrl?: string;
  website?: string; // honeypot — must stay empty
}

const escapeHtml = (v: unknown) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const clip = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

async function sendOneEmail(to: string, subject: string, html: string, replyTo?: string): Promise<boolean> {
  const client = new SMTPClient({
    connection: {
      hostname: Deno.env.get("SMTP_HOST") || "smtppro.zoho.in",
      port: parseInt(Deno.env.get("SMTP_PORT") || "465"),
      tls: true,
      auth: {
        username: Deno.env.get("SMTP_USER") || "",
        password: Deno.env.get("SMTP_PASS") || "",
      },
    },
  });
  try {
    await client.send({
      from: `"RobotVerse" <${Deno.env.get("SMTP_FROM") || SUPPORT_EMAIL}>`,
      to,
      replyTo,
      subject,
      content: "auto",
      html,
    });
    return true;
  } catch (e) {
    console.error("Failed to send email to", to, e);
    return false;
  } finally {
    await client.close();
  }
}

const emailWrapper = (content: string) => `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;background-color:#f0f4f8;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;"><div style="max-width:640px;margin:0 auto;padding:32px 16px;"><div style="background:linear-gradient(135deg,#1e40af 0%,#3b82f6 50%,#06b6d4 100%);padding:32px 40px;border-radius:16px 16px 0 0;text-align:center;"><h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;">RobotVerse Directory</h1><p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;letter-spacing:1px;text-transform:uppercase;">Robots · Tools · OEMs · Training</p></div><div style="background:#ffffff;padding:36px 40px;border-radius:0 0 16px 16px;box-shadow:0 4px 24px rgba(0,0,0,0.06);">${content}</div><div style="text-align:center;padding:24px 16px;"><p style="margin:0;color:#94a3b8;font-size:12px;"><a href="https://robotverse.in/directory" style="color:#3b82f6;text-decoration:none;">Browse Directory</a> · <a href="mailto:${SUPPORT_EMAIL}" style="color:#3b82f6;text-decoration:none;">${SUPPORT_EMAIL}</a></p></div></div></body></html>`;

const infoRow = (label: string, value: string) =>
  `<tr><td style="padding:6px 12px 6px 0;color:#64748b;font-size:14px;vertical-align:top;white-space:nowrap;">${label}</td><td style="padding:6px 0;color:#1e293b;font-size:14px;font-weight:600;">${value}</td></tr>`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = (await req.json()) as DirectoryEnquiry;

    // Silently accept bot submissions that filled the honeypot
    if (body.website) {
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = {
      name: clip(body.name, 120),
      email: clip(body.email, 200).toLowerCase(),
      phone: clip(body.phone, 30),
      company: clip(body.company, 160),
      role: clip(body.role, 60),
      interests: Array.isArray(body.interests) ? body.interests.slice(0, 10).map((i) => clip(i, 60)) : [],
      section: clip(body.section, 40),
      itemName: clip(body.itemName, 160),
      message: clip(body.message, 3000),
      pageUrl: clip(body.pageUrl, 300),
    };

    if (!data.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      return new Response(JSON.stringify({ error: "Name and a valid email are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ts = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    const subjectTopic = data.itemName || data.interests[0] || "General";

    const adminHtml = emailWrapper(
      `<h2 style="margin:0 0 20px;color:#1e293b;font-size:22px;">New Directory Enquiry</h2>
      <table style="width:100%;border-collapse:collapse;">
        ${infoRow("Name", escapeHtml(data.name))}
        ${infoRow("Email", `<a href="mailto:${escapeHtml(data.email)}">${escapeHtml(data.email)}</a>`)}
        ${data.phone ? infoRow("Phone", escapeHtml(data.phone)) : ""}
        ${data.company ? infoRow("Company / Institute", escapeHtml(data.company)) : ""}
        ${data.role ? infoRow("I am a", escapeHtml(data.role)) : ""}
        ${data.interests.length ? infoRow("Interested in", escapeHtml(data.interests.join(", "))) : ""}
        ${data.section ? infoRow("Directory section", escapeHtml(data.section)) : ""}
        ${data.itemName ? infoRow("Listing", escapeHtml(data.itemName)) : ""}
      </table>
      ${data.message ? `<div style="margin-top:20px;padding:14px;background:#f8fafc;border-radius:6px;color:#374151;font-size:14px;line-height:1.7;white-space:pre-wrap;">${escapeHtml(data.message)}</div>` : ""}
      <p style="margin:24px 0 0;color:#64748b;font-size:13px;">⏰ ${ts} IST${data.pageUrl ? ` · ${escapeHtml(data.pageUrl)}` : ""}</p>`,
    );

    const userHtml = emailWrapper(
      `<h2 style="margin:0 0 16px;color:#1e293b;font-size:22px;">Thanks, ${escapeHtml(data.name)}!</h2>
      <p style="color:#374151;font-size:15px;line-height:1.7;">We've received your enquiry${data.itemName ? ` about <strong>${escapeHtml(data.itemName)}</strong>` : ""}. The RobotVerse team will get back to you shortly with details and the right contacts.</p>
      <p style="color:#374151;font-size:15px;line-height:1.7;">Need something urgently? Reply to this email or write to <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>`,
    );

    const adminOk = await sendOneEmail(
      SUPPORT_EMAIL,
      `Directory Enquiry: ${subjectTopic} — ${data.name}`,
      adminHtml,
      data.email,
    );
    if (!adminOk) {
      return new Response(JSON.stringify({ error: "Could not send enquiry email" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    await sendOneEmail(data.email, "We received your enquiry — RobotVerse", userHtml);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-directory-enquiry error:", e);
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
