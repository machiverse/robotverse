// RobotVerse WhatsApp Business webhook (Meta WhatsApp Cloud API v18.0)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  analyzeMessage,
  callWebsiteAssistant,
  FALLBACK_RESPONSES,
  generateResponse,
  MAIN_MENU_SECTIONS,
  MENU_PROMPTS,
  searchKnowledge,
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

const SESSION_TTL_MIN = 60;

async function getSettings() {
  const { data } = await admin.from("whatsapp_settings").select("*").eq("id", true).maybeSingle();
  return {
    model: data?.model ?? "google/gemini-3.6-flash",
    temperature: Number(data?.temperature ?? 0.7),
    max_tokens: data?.max_tokens ?? 800,
    welcome_message:
      data?.welcome_message ??
      "👋 Welcome to RobotVerse! I'm your AI assistant — the same one that powers our website chatbot, now on WhatsApp!",
    fallback_message: data?.fallback_message ?? FALLBACK_RESPONSES.other,
    auto_reply: data?.auto_reply ?? true,
    handoff_trigger: data?.handoff_trigger ?? "negative_sentiment",
    rate_limit: data?.rate_limit ?? 20,
    phone_number_id: Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") ?? data?.phone_number_id ?? "",
  };
}

interface SessionRow {
  id: string;
  phone: string;
  user_name: string | null;
  last_seen: string;
  message_count: number;
  human_mode: boolean;
  status: string;
}

async function upsertSession(phone: string, name?: string) {
  const { data: existing } = await admin
    .from("whatsapp_sessions")
    .select("id, phone, user_name, last_seen, message_count, human_mode, status")
    .eq("phone", phone)
    .maybeSingle();

  if (!existing) {
    const { data } = await admin
      .from("whatsapp_sessions")
      .insert({ phone, user_name: name ?? null, message_count: 0, status: "active" })
      .select("id, phone, user_name, last_seen, message_count, human_mode, status")
      .single();
    return { session: data as SessionRow, isNew: true, expired: false };
  }

  const expired = Date.now() - new Date(existing.last_seen).getTime() > SESSION_TTL_MIN * 60 * 1000;
  return { session: existing as SessionRow, isNew: false, expired };
}

async function logMessage(row: Record<string, unknown>) {
  const { error } = await admin.from("whatsapp_messages").insert(row);
  if (error) console.error("whatsapp_messages insert failed:", error.message);
}

async function recentHistory(phone: string) {
  const { data } = await admin
    .from("whatsapp_messages")
    .select("direction, body")
    .eq("phone", phone)
    .order("created_at", { ascending: false })
    .limit(10);
  return (data ?? [])
    .reverse()
    .filter((m) => m.body)
    .map((m) => ({ role: m.direction === "in" ? "user" : "assistant", content: m.body as string }));
}

// Simple per-phone rate guard using stored message rows
async function overRateLimit(phone: string, limit: number) {
  const since = new Date(Date.now() - 60_000).toISOString();
  const { count } = await admin
    .from("whatsapp_messages")
    .select("id", { count: "exact", head: true })
    .eq("phone", phone)
    .eq("direction", "in")
    .gte("created_at", since);
  return (count ?? 0) > limit;
}

async function handleIncoming(msg: any, contactName: string | undefined, cfg: WaConfig) {
  const from: string = msg.from;
  const settings = await getSettings();
  const { session, isNew, expired } = await upsertSession(from, contactName);
  if (!session) return;

  // Extract text from the supported message types
  let text = "";
  let msgType = msg.type as string;
  if (msg.type === "text") {
    text = msg.text?.body ?? "";
  } else if (msg.type === "interactive") {
    const reply = msg.interactive?.button_reply ?? msg.interactive?.list_reply;
    const id = reply?.id ?? "";
    text = MENU_PROMPTS[id] ?? reply?.title ?? "";
  } else if (msg.type === "button") {
    text = msg.button?.text ?? "";
  }

  await logMessage({
    session_id: session.id,
    phone: from,
    direction: "in",
    body: text || `[${msgType}]`,
    msg_type: msgType,
    wa_message_id: msg.id ?? null,
  });

  await admin
    .from("whatsapp_sessions")
    .update({
      last_seen: new Date().toISOString(),
      message_count: (session.message_count ?? 0) + 1,
      status: "active",
      ...(contactName ? { user_name: contactName } : {}),
    })
    .eq("id", session.id);

  const send = async (body: string, type = "text") => {
    try {
      await sendTextMessage(cfg, from, body);
    } catch (err) {
      console.error("sendTextMessage failed:", err);
    }
    await logMessage({ session_id: session.id, phone: from, direction: "out", body, msg_type: type });
  };

  // Media / unsupported types
  if (!["text", "interactive", "button"].includes(msgType)) {
    await send("I can process text messages best. Could you type your question? 😊");
    return;
  }

  if (!text.trim()) return;

  // Human takeover — log only, no auto reply
  if (session.human_mode) {
    console.log(`Session ${from} is in human mode — skipping auto reply`);
    return;
  }

  if (!settings.auto_reply) {
    console.log("Auto-reply disabled in settings");
    return;
  }

  if (await overRateLimit(from, settings.rate_limit)) {
    await send("⏳ You're sending messages very quickly. Give me a few seconds and try again 🙏");
    return;
  }

  // Welcome flow for new / expired sessions
  if (isNew || expired) {
    await send(settings.welcome_message);
    try {
      await sendList(cfg, from, "Pick a topic below, or just type your question 👇", MAIN_MENU_SECTIONS, "Open Menu");
      await logMessage({ session_id: session.id, phone: from, direction: "out", body: "[main menu list]", msg_type: "interactive" });
    } catch (err) {
      console.error("menu list failed:", err);
    }
    if (isNew && !MENU_PROMPTS[msg.interactive?.list_reply?.id ?? ""]) return;
  }

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const analysis = await analyzeMessage(text, LOVABLE_API_KEY);
  await admin.from("whatsapp_sessions").update({ current_intent: analysis.intent }).eq("id", session.id);
  await admin
    .from("whatsapp_messages")
    .update({ intent: analysis.intent })
    .eq("phone", from)
    .eq("direction", "in")
    .order("created_at", { ascending: false })
    .limit(1);

  const history = await recentHistory(from);

  let reply: string | null = null;

  // Marketplace / product intents go through the SAME website assistant brain
  if (["marketplace", "product", "comparison"].includes(analysis.intent) || analysis.specificProduct) {
    reply = await callWebsiteAssistant(SUPABASE_URL, SERVICE_KEY, [...history, { role: "user", content: text }]);
  }

  // Platform questions (and any assistant failure) use the KB + gateway
  if (!reply) {
    const { data: kb } = await admin
      .from("whatsapp_kb")
      .select("entry_key, category, title, content, keywords")
      .eq("is_active", true);
    const matched = searchKnowledge((kb ?? []) as KbEntry[], analysis.intent, analysis.keywords);
    const knowledgeContext = matched
      .map((m) => `• ${m.title} [${m.category}]: ${m.content}`)
      .join("\n");

    reply = await generateResponse({
      userMessage: text,
      analysis,
      knowledgeContext,
      conversationHistory: history,
      apiKey: LOVABLE_API_KEY,
      model: settings.model,
      temperature: settings.temperature,
      maxTokens: settings.max_tokens,
    });
  }

  await send(reply || settings.fallback_message, "text");

  // Human handoff
  const shouldHandoff =
    settings.handoff_trigger === "always_on_request"
      ? /human|agent|person|call me|talk to (someone|team)/i.test(text)
      : settings.handoff_trigger === "negative_sentiment"
        ? analysis.sentiment === "negative" || analysis.sentiment === "urgent"
        : false;

  if (shouldHandoff) {
    await admin.from("whatsapp_sessions").update({ human_mode: true }).eq("id", session.id);
    await send("🙋 I've flagged this chat for our team — a RobotVerse specialist will reply here shortly. For anything urgent: +91 86109 25352");
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);

  // --- Meta webhook verification ---
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    const expected = Deno.env.get("WHATSAPP_VERIFY_TOKEN");

    if (mode === "subscribe" && token && expected && token === expected) {
      console.log("Webhook verified by Meta");
      return new Response(challenge ?? "", { status: 200, headers: { ...corsHeaders, "Content-Type": "text/plain" } });
    }
    console.warn("Webhook verification failed");
    return new Response("Forbidden", { status: 403, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const token = Deno.env.get("WHATSAPP_ACCESS_TOKEN");

  // Always ACK Meta immediately; process in the background.
  const work = (async () => {
    try {
      const entries = body?.entry ?? [];
      for (const entry of entries) {
        for (const change of entry?.changes ?? []) {
          const value = change?.value;
          const phoneNumberId = value?.metadata?.phone_number_id ?? Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") ?? "";
          const botNumber = value?.metadata?.display_phone_number;
          const messages = value?.messages ?? [];
          if (!messages.length) continue;
          if (!token || !phoneNumberId) {
            console.error("WHATSAPP_ACCESS_TOKEN or phone_number_id missing — cannot reply");
            continue;
          }
          const cfg: WaConfig = { token, phoneNumberId };
          const contactName = value?.contacts?.[0]?.profile?.name;

          for (const msg of messages) {
            if (!msg?.from) continue;
            if (botNumber && msg.from === String(botNumber).replace(/\D/g, "")) continue; // never reply to self
            try {
              await handleIncoming(msg, contactName, cfg);
            } catch (err) {
              console.error("handleIncoming failed:", err);
            }
          }
        }
      }
    } catch (err) {
      console.error("webhook processing failed:", err);
    }
  })();

  // @ts-ignore EdgeRuntime is available in Supabase Edge Functions
  if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
    // @ts-ignore
    EdgeRuntime.waitUntil(work);
  } else {
    await work;
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
