// RobotVerse WhatsApp bot via WasenderAPI (number +91 88255 15952)
// Receives WasenderAPI webhooks, runs the SAME RobotVerse AI assistant brain, replies on WhatsApp.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  analyzeMessage,
  callWebsiteAssistant,
  FALLBACK_RESPONSES,
  generateResponse,
  searchKnowledge,
  splitLongMessage,
  type KbEntry,
} from "../_shared/wa-engine.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-signature",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const WASENDER_API_KEY = Deno.env.get("WASENDER_API_KEY") ?? "";
const WASENDER_URL = "https://wasenderapi.com/api/send-message";
const admin = createClient(SUPABASE_URL, SERVICE_KEY);
const SESSION_TTL_MIN = 60;

async function sendWhatsApp(to: string, text: string) {
  if (!WASENDER_API_KEY) throw new Error("WASENDER_API_KEY not configured");
  for (const chunk of splitLongMessage(text)) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await fetch(WASENDER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${WASENDER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ to, text: chunk }),
      });
      if (res.ok) break;
      const raw = await res.text();
      // Free/trial plans rate-limit sends (1 msg/min) — wait and retry instead of dropping the reply
      if (res.status === 429 && attempt < 2) {
        let wait = 45;
        try {
          wait = Number(JSON.parse(raw)?.retry_after) || 45;
        } catch { /* keep default */ }
        console.log(`wasender rate limited, retrying in ${wait}s`);
        await new Promise((r) => setTimeout(r, (wait + 2) * 1000));
        continue;
      }
      console.error("wasender send failed", res.status, raw);
      throw new Error(`wasender send failed (${res.status})`);
    }
  }
}


async function getSettings() {
  const { data } = await admin.from("whatsapp_settings").select("*").eq("id", true).maybeSingle();
  return {
    model: data?.model ?? "google/gemini-3.6-flash",
    temperature: Number(data?.temperature ?? 0.7),
    max_tokens: data?.max_tokens ?? 800,
    welcome_message:
      data?.welcome_message ??
      "👋 Welcome to RobotVerse! I'm your AI assistant — ask me about robots, spare parts, services or pricing.",
    fallback_message: data?.fallback_message ?? FALLBACK_RESPONSES.other,
    auto_reply: data?.auto_reply ?? true,
    handoff_trigger: data?.handoff_trigger ?? "negative_sentiment",
    rate_limit: data?.rate_limit ?? 20,
  };
}

/** Extracts phone + text from the various WasenderAPI webhook shapes. */
function parseIncoming(body: any): { phone: string; text: string; name?: string; id?: string; fromMe: boolean } | null {
  const d = body?.data ?? body;
  const msg = d?.messages ?? d?.message ?? d;
  if (!msg) return null;

  const key = msg.key ?? d.key ?? {};
  const fromMe = !!(key.fromMe ?? msg.fromMe);
  const jid: string = key.remoteJid ?? msg.remoteJid ?? msg.from ?? d.from ?? "";
  if (!jid || jid.includes("@g.us") || jid.includes("status@")) return null; // skip groups/status
  const phone = String(jid).split("@")[0].replace(/\D/g, "");
  if (!phone) return null;

  const m = msg.message ?? msg;
  const text: string =
    m?.conversation ??
    m?.extendedTextMessage?.text ??
    m?.imageMessage?.caption ??
    m?.videoMessage?.caption ??
    m?.buttonsResponseMessage?.selectedDisplayText ??
    m?.listResponseMessage?.title ??
    (typeof msg.text === "string" ? msg.text : "") ??
    "";

  return { phone, text: String(text || "").trim(), name: msg.pushName ?? d.pushName, id: key.id ?? msg.id, fromMe };
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
    return { session: data, isNew: true, expired: false };
  }
  const expired = Date.now() - new Date(existing.last_seen).getTime() > SESSION_TTL_MIN * 60 * 1000;
  return { session: existing, isNew: false, expired };
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

async function handle(incoming: { phone: string; text: string; name?: string; id?: string }) {
  const { phone, text, name } = incoming;
  const settings = await getSettings();
  const { session, isNew, expired } = await upsertSession(phone, name);
  if (!session) return;

  await admin.from("whatsapp_messages").insert({
    session_id: session.id,
    phone,
    direction: "in",
    body: text,
    msg_type: "text",
    wa_message_id: incoming.id ?? null,
  });

  await admin
    .from("whatsapp_sessions")
    .update({
      last_seen: new Date().toISOString(),
      message_count: (session.message_count ?? 0) + 1,
      status: "active",
      ...(name ? { user_name: name } : {}),
    })
    .eq("id", session.id);

  const send = async (body: string) => {
    try {
      await sendWhatsApp(phone, body);
    } catch (err) {
      console.error("send failed:", err);
    }
    await admin
      .from("whatsapp_messages")
      .insert({ session_id: session.id, phone, direction: "out", body, msg_type: "text" });
  };

  if (session.human_mode) {
    console.log(`${phone} is in human mode — no auto reply`);
    return;
  }
  if (!settings.auto_reply) return;
  if (await overRateLimit(phone, settings.rate_limit)) {
    await send("⏳ You're sending messages very quickly. Give me a few seconds and try again 🙏");
    return;
  }

  const bareGreeting = /^(hi+|hey+|hello+|namaste|start|menu|hii|good (morning|afternoon|evening))[\s!.]*$/i.test(text);
  const askRequirement =
    `${settings.welcome_message}\n\n*What is your requirement?*\n\n1️⃣ Robot (new / used)\n2️⃣ Spare parts\n3️⃣ Service / AMC / integration\n4️⃣ Pricing, selling or something else\n\nJust reply in your own words — e.g. "used FANUC welding robot in Chennai".`;

  // Bot only ever replies to an inbound message — never sends on its own.
  if (bareGreeting) {
    await send(askRequirement);
    return;
  }

  const history = await recentHistory(phone);
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const analysis = await analyzeMessage(text, LOVABLE_API_KEY);
  await admin.from("whatsapp_sessions").update({ current_intent: analysis.intent }).eq("id", session.id);

  // Requirement gathering — combine everything the user has told us in this session
  const CLARIFY_MARK = "🔎 Got it";
  const priorUserText = history.filter((h) => h.role === "user").map((h) => h.content).join(" ");
  const combined = `${priorUserText} ${text}`.toLowerCase();

  const category =
    /spare|part|gripper|servo|motor|cable|teach pendant|controller board/.test(combined) ? "spare parts"
    : /service|amc|repair|maintenance|install|integrat|program/.test(combined) ? "service"
    : /robot|cobot|arm|palletiz|weld|paint|pick|assembly|cnc|machine tend/.test(combined) ? "robot"
    : null;

  const hasBrand = /fanuc|abb|kuka|yaskawa|motoman|universal robots|ur\d|denso|kawasaki|nachi|staubli|epson|mitsubishi|omron|doosan|hyundai|techman|estun|dobot/.test(combined);
  const hasModel = /\b(irb|m-?\d|r-?\d|lr mate|ur\d{1,2}|gp\d|hc\d|kr\s?\d)/.test(combined);
  const hasApplication = /weld|palletiz|paint|pick|pack|assembly|handling|machine tend|deburr|dispens|inspect|cnc|inject/.test(combined);
  const hasLocation = /\b(chennai|bangalore|bengaluru|pune|mumbai|delhi|ncr|noida|gurgaon|hyderabad|coimbatore|ahmedabad|kolkata|jaipur|nashik|rajkot|india|tamil nadu|karnataka|maharashtra|gujarat)\b/.test(combined);
  const hasBudget = /(budget|lakh|lac|crore|₹|rs\.?\s?\d|\d+\s?(k|lakh))/.test(combined);
  const hasPayload = /\d+\s?kg/.test(combined);
  const detailCount = [hasBrand || hasModel, hasApplication, hasLocation, hasBudget || hasPayload].filter(Boolean).length;

  const alreadyClarified = history.some((h) => h.role === "assistant" && h.content.includes(CLARIFY_MARK));
  const platformIntent = ["pricing", "selling", "support", "company", "account"].includes(analysis.intent);

  // Step 1 — no clear category yet: ask what they need
  if (!category && !platformIntent && !analysis.specificProduct && text.length < 25) {
    await send(askRequirement);
    return;
  }

  // Step 2 — category known but too vague: ask ONE round of qualifying questions
  if (category && !platformIntent && detailCount < 2 && !alreadyClarified) {
    const questions =
      category === "spare parts"
        ? "• Robot brand & model (e.g. ABB IRB 6640)\n• Which part do you need?\n• Your city\n• New or refurbished?"
        : category === "service"
          ? "• Type of service (installation / AMC / repair / programming)\n• Robot brand & model\n• Your city / plant location"
          : "• Brand preference (FANUC, ABB, KUKA, Yaskawa…)\n• Application (welding, palletizing, machine tending…)\n• Payload & reach (e.g. 20 kg)\n• Your city and budget range";
    await send(`${CLARIFY_MARK} — you're looking for *${category}*.\n\nTo pull the exact matches from our database, please share:\n${questions}\n\nYou can send it all in one message.`);
    return;
  }

  // Step 3 — enough detail: analyse the database and answer
  let reply: string | null = null;
  const requirement = priorUserText ? `${priorUserText}\n${text}`.trim() : text;

  if (category || ["marketplace", "product", "comparison"].includes(analysis.intent) || analysis.specificProduct) {
    reply = await callWebsiteAssistant(SUPABASE_URL, SERVICE_KEY, [...history, { role: "user", content: requirement }]);
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
      conversationHistory: history,
      apiKey: LOVABLE_API_KEY,
      model: settings.model,
      temperature: settings.temperature,
      maxTokens: settings.max_tokens,
    });
  }

  await send(reply || settings.fallback_message);



  const shouldHandoff =
    settings.handoff_trigger === "always_on_request"
      ? /human|agent|person|call me|talk to (someone|team)/i.test(text)
      : settings.handoff_trigger === "negative_sentiment"
        ? analysis.sentiment === "negative" || analysis.sentiment === "urgent"
        : false;

  if (shouldHandoff) {
    await admin.from("whatsapp_sessions").update({ human_mode: true }).eq("id", session.id);
    await send("🙋 I've flagged this chat for our team — a RobotVerse specialist will reply shortly. Urgent: +91 86109 25352");
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method === "GET") {
    return new Response(JSON.stringify({ status: "ok", provider: "wasenderapi", configured: !!WASENDER_API_KEY }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const work = (async () => {
    try {
      const event: string = body?.event ?? "";
      if (event && !/messages?[.\-_]?(upsert|received|new)/i.test(event)) {
        console.log("ignoring event:", event);
        return;
      }
      const incoming = parseIncoming(body);
      if (!incoming || incoming.fromMe || !incoming.text) {
        console.log("nothing to handle", JSON.stringify(body)?.slice(0, 400));
        return;
      }
      await handle(incoming);
    } catch (err) {
      console.error("wasender webhook processing failed:", err);
    }
  })();

  // @ts-ignore EdgeRuntime exists in Supabase Edge Functions
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
