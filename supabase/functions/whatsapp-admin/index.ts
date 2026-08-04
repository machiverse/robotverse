// RobotVerse WhatsApp admin API: health, conversations, broadcast, test-bot, session control.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  analyzeMessage,
  callWebsiteAssistant,
  generateResponse,
  searchKnowledge,
  sendButtons,
  sendList,
  sendTextMessage,
  type KbEntry,
  type WaConfig,
} from "../_shared/wa-engine.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const admin = createClient(SUPABASE_URL, SERVICE_KEY);
const START = Date.now();

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function requireAdmin(req: Request) {
  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace("Bearer ", "").trim();
  if (!jwt) return { ok: false as const, error: "Missing authorization header" };

  const { data: userData, error } = await admin.auth.getUser(jwt);
  if (error || !userData?.user) return { ok: false as const, error: "Invalid session" };

  const { data: profile } = await admin
    .from("profiles")
    .select("account_type, user_roles, email")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  const isAdmin =
    profile?.account_type === "admin" ||
    (Array.isArray(profile?.user_roles) && profile!.user_roles!.includes("admin"));

  if (!isAdmin) return { ok: false as const, error: "Admin access required" };
  return { ok: true as const, userId: userData.user.id };
}

function waConfig(): WaConfig | null {
  const token = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  if (!token || !phoneNumberId) return null;
  return { token, phoneNumberId };
}

async function getSettings() {
  const { data } = await admin.from("whatsapp_settings").select("*").eq("id", true).maybeSingle();
  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let action = "health";
  let payload: any = {};
  if (req.method === "POST") {
    try {
      payload = await req.json();
    } catch {
      payload = {};
    }
    action = payload.action ?? "health";
  } else {
    action = new URL(req.url).searchParams.get("action") ?? "health";
  }

  try {
    // --- public health ---
    if (action === "health") {
      const { count: sessions } = await admin
        .from("whatsapp_sessions")
        .select("id", { count: "exact", head: true })
        .eq("status", "active");
      const { count: messages } = await admin.from("whatsapp_messages").select("id", { count: "exact", head: true });
      return json({
        status: "ok",
        uptime_seconds: Math.round((Date.now() - START) / 1000),
        activeSessions: sessions ?? 0,
        totalMessages: messages ?? 0,
        whatsappConfigured: !!waConfig(),
        verifyTokenConfigured: !!Deno.env.get("WHATSAPP_VERIFY_TOKEN"),
      });
    }

    const auth = await requireAdmin(req);
    if (!auth.ok) return json({ error: auth.error }, 401);

    // --- test the bot brain without WhatsApp ---
    if (action === "test") {
      const text: string = payload.message ?? "";
      if (!text.trim()) return json({ error: "message is required" }, 400);

      const settings = await getSettings();
      const key = Deno.env.get("LOVABLE_API_KEY");
      const analysis = await analyzeMessage(text, key);

      let reply: string | null = null;
      if (["marketplace", "product", "comparison"].includes(analysis.intent) || analysis.specificProduct) {
        reply = await callWebsiteAssistant(SUPABASE_URL, SERVICE_KEY, [{ role: "user", content: text }]);
      }
      if (!reply) {
        const { data: kb } = await admin
          .from("whatsapp_kb")
          .select("entry_key, category, title, content, keywords")
          .eq("is_active", true);
        const matched = searchKnowledge((kb ?? []) as KbEntry[], analysis.intent, analysis.keywords);
        reply = await generateResponse({
          userMessage: text,
          analysis,
          knowledgeContext: matched.map((m) => `• ${m.title} [${m.category}]: ${m.content}`).join("\n"),
          conversationHistory: [],
          apiKey: key,
          model: settings?.model ?? "google/gemini-3.6-flash",
          temperature: Number(settings?.temperature ?? 0.7),
          maxTokens: settings?.max_tokens ?? 800,
        });
      }
      return json({ analysis, reply });
    }

    // --- broadcast ---
    if (action === "broadcast") {
      const cfg = waConfig();
      if (!cfg) return json({ error: "WhatsApp credentials are not configured" }, 400);

      const message: string = payload.message ?? "";
      const recipients: string[] = (payload.recipients ?? []).map((r: string) => String(r).replace(/\D/g, "")).filter(Boolean);
      const messageType: string = payload.messageType ?? "text";
      if (!message.trim()) return json({ error: "message is required" }, 400);
      if (!recipients.length) return json({ error: "at least one recipient is required" }, 400);

      const { data: record } = await admin
        .from("whatsapp_broadcasts")
        .insert({
          message,
          message_type: messageType,
          payload: payload.extra ?? null,
          recipients,
          status: "sending",
          created_by: auth.userId,
        })
        .select("id")
        .single();

      let sent = 0;
      let failed = 0;
      for (const to of recipients) {
        try {
          if (messageType === "buttons" && Array.isArray(payload.extra?.buttons) && payload.extra.buttons.length) {
            await sendButtons(cfg, to, message, payload.extra.buttons);
          } else if (messageType === "list" && Array.isArray(payload.extra?.sections) && payload.extra.sections.length) {
            await sendList(cfg, to, message, payload.extra.sections, payload.extra.buttonLabel ?? "Open Menu");
          } else {
            await sendTextMessage(cfg, to, message);
          }
          sent++;
          const { data: session } = await admin.from("whatsapp_sessions").select("id").eq("phone", to).maybeSingle();
          await admin.from("whatsapp_messages").insert({
            session_id: session?.id ?? null,
            phone: to,
            direction: "out",
            body: message,
            msg_type: messageType === "text" ? "text" : "interactive",
          });
        } catch (err) {
          failed++;
          console.error(`broadcast to ${to} failed:`, err);
        }
      }

      if (record?.id) {
        await admin
          .from("whatsapp_broadcasts")
          .update({ sent_count: sent, failed_count: failed, status: failed === 0 ? "sent" : sent === 0 ? "failed" : "partial" })
          .eq("id", record.id);
      }
      return json({ sent, failed, total: recipients.length });
    }

    // --- send a single manual message (human takeover replies) ---
    if (action === "send") {
      const cfg = waConfig();
      if (!cfg) return json({ error: "WhatsApp credentials are not configured" }, 400);
      const to = String(payload.phone ?? "").replace(/\D/g, "");
      const message: string = payload.message ?? "";
      if (!to || !message.trim()) return json({ error: "phone and message are required" }, 400);

      await sendTextMessage(cfg, to, message);
      const { data: session } = await admin.from("whatsapp_sessions").select("id").eq("phone", to).maybeSingle();
      await admin.from("whatsapp_messages").insert({
        session_id: session?.id ?? null,
        phone: to,
        direction: "out",
        body: message,
        msg_type: "text",
      });
      return json({ sent: true });
    }

    // --- connection test against the Graph API ---
    if (action === "test_connection") {
      const cfg = waConfig();
      if (!cfg) return json({ ok: false, error: "WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID not configured" }, 400);
      const res = await fetch(`https://graph.facebook.com/v18.0/${cfg.phoneNumberId}?fields=display_phone_number,verified_name,quality_rating`, {
        headers: { Authorization: `Bearer ${cfg.token}` },
      });
      const body = await res.text();
      if (!res.ok) return json({ ok: false, status: res.status, details: body }, res.status);
      return json({ ok: true, number: JSON.parse(body) });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    console.error("whatsapp-admin error:", err);
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
