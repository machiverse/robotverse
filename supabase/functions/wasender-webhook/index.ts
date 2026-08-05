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

/** Valid E.164-ish WhatsApp MSISDN: 8–15 digits. */
function isValidPhone(p: string): boolean {
  return /^\d{8,15}$/.test(p);
}

/** Extracts phone + text from the various WasenderAPI webhook shapes. */
function parseIncoming(body: any): { phone: string; text: string; name?: string; id?: string; fromMe: boolean } | null {
  const d = body?.data ?? body;
  // `messages` can be an object OR an array (Baileys upsert) — always take the first entry
  let msg = d?.messages ?? d?.message ?? d;
  if (Array.isArray(msg)) msg = msg[0];
  if (!msg || typeof msg !== "object") return null;

  const key = msg.key ?? d.key ?? {};
  const fromMe = !!(key.fromMe ?? msg.fromMe);

  // Prefer the REAL phone-number JID. `remoteJid` can be a privacy LID
  // (e.g. "123456789@lid") which is NOT a phone number — sending to it would
  // deliver the reply to a completely different/unknown chat.
  const candidates = [
    key.senderPn,
    key.remoteJidAlt,
    msg.senderPn,
    msg.remoteJidAlt,
    key.remoteJid,
    msg.remoteJid,
    msg.from,
    d.from,
  ].filter((v) => typeof v === "string" && v.length > 0) as string[];

  const jid = candidates.find((c) => !c.includes("@lid")) ?? candidates[0] ?? "";
  if (!jid || jid.includes("@g.us") || jid.includes("@broadcast") || jid.includes("status@")) return null;

  const phone = String(jid).split(/[@:]/)[0].replace(/\D/g, "");
  if (!isValidPhone(phone)) {
    console.error("rejecting message — unusable sender id:", jid, "candidates:", JSON.stringify(candidates));
    return null;
  }

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
    `${settings.welcome_message}\n\n*What is your requirement?*\n\n1️⃣ Robot (new / used)\n2️⃣ Spare parts\n3️⃣ Service / AMC / integration\n4️⃣ Pricing, selling or something else\n\nReply with a number, or type it in your own words — e.g. "used FANUC welding robot in Chennai".`;

  // ---- Quick-reply menus: numbered options the user can answer with just a digit ----
  const MENUS: Record<string, { mark: string; title: string; options: string[] }> = {
    main: {
      mark: "*What is your requirement?*",
      title: "",
      options: ["robot", "spare parts", "service AMC integration", "pricing selling other"],
    },
    type: {
      mark: "🤖 *Robot type?*",
      title: "🤖 *Robot type?*",
      options: [
        "articulated industrial robot",
        "collaborative robot (cobot)",
        "SCARA robot",
        "delta / pick and place robot",
        "AMR / AGV mobile robot",
        "not sure — suggest for me",
      ],
    },
    application: {
      mark: "🎯 *Application?*",
      title: "🎯 *Application?*",
      options: [
        "welding",
        "material handling / palletizing",
        "machine tending / CNC",
        "pick and place / packaging",
        "painting / dispensing",
        "assembly / inspection",
      ],
    },
    city: {
      mark: "📍 *Your city?*",
      title: "📍 *Your city?*",
      options: ["Chennai", "Bangalore", "Pune", "Mumbai", "Delhi NCR", "Hyderabad", "Coimbatore", "other city in India"],
    },
    budget: {
      mark: "💰 *Budget range?*",
      title: "💰 *Budget range?*",
      options: [
        "budget under 5 lakh",
        "budget 5 to 15 lakh",
        "budget 15 to 30 lakh",
        "budget 30 lakh to 1 crore",
        "budget above 1 crore",
        "budget not decided yet",
      ],
    },
  };

  const renderMenu = (key: keyof typeof MENUS, lead?: string) => {
    const m = MENUS[key];
    const digits = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣"];
    const list = m.options.map((o, i) => `${digits[i]} ${o}`).join("\n");
    return `${lead ? `${lead}\n\n` : ""}${m.title}\n${list}\n\n_Reply with just the number — or type your own answer._`;
  };

  const history = await recentHistory(phone);

  // Expand a bare digit reply into the option text of the menu we last sent
  let userText = text;
  const numeric = text.trim().match(/^([1-8])[\s.)]*$/);
  if (numeric) {
    const lastMenu = [...history].reverse().find(
      (h) => h.role === "assistant" && Object.values(MENUS).some((m) => h.content.includes(m.mark)),
    );
    const menu = lastMenu
      ? Object.values(MENUS).find((m) => lastMenu.content.includes(m.mark))
      : MENUS.main;
    const picked = menu?.options[Number(numeric[1]) - 1];
    if (picked) userText = picked;
  }

  // Bot only ever replies to an inbound message — never sends on its own.
  if (bareGreeting) {
    await send(askRequirement);
    return;
  }

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const analysis = await analyzeMessage(userText, LOVABLE_API_KEY);
  await admin.from("whatsapp_sessions").update({ current_intent: analysis.intent }).eq("id", session.id);

  // Requirement gathering — combine everything the user has told us in this session
  const priorUserText = history.filter((h) => h.role === "user").map((h) => h.content).join(" ");
  const combined = `${priorUserText} ${userText}`.toLowerCase();

  const category =
    /spare|part|gripper|servo|motor|cable|teach pendant|controller board/.test(combined) ? "spare parts"
    : /service|amc|repair|maintenance|install|integrat|program/.test(combined) ? "service"
    : /robot|cobot|arm|palletiz|weld|paint|pick|assembly|cnc|machine tend|scara|delta|amr|agv/.test(combined) ? "robot"
    : null;

  const hasBrand = /fanuc|abb|kuka|yaskawa|motoman|universal robots|ur\d|denso|kawasaki|nachi|staubli|epson|mitsubishi|omron|doosan|hyundai|techman|estun|dobot/.test(combined);
  const hasModel = /\b(irb|m-?\d|r-?\d|lr mate|ur\d{1,2}|gp\d|hc\d|kr\s?\d)/.test(combined);
  const hasType = /articulated|cobot|collaborative|scara|delta|amr|agv|mobile robot|suggest for me/.test(combined);
  const hasApplication = /weld|palletiz|paint|pick|pack|assembly|handling|machine tend|deburr|dispens|inspect|cnc|inject/.test(combined);
  const hasLocation = /\b(chennai|bangalore|bengaluru|pune|mumbai|delhi|ncr|noida|gurgaon|hyderabad|coimbatore|ahmedabad|kolkata|jaipur|nashik|rajkot|india|tamil nadu|karnataka|maharashtra|gujarat|other city)\b/.test(combined);
  const hasBudget = /(budget|lakh|lac|crore|₹|rs\.?\s?\d|\d+\s?(k|lakh)|not decided)/.test(combined);
  const hasPayload = /\d+\s?kg/.test(combined);
  const detailCount = [hasBrand || hasModel || hasType, hasApplication, hasLocation, hasBudget || hasPayload].filter(Boolean).length;

  const platformIntent = ["pricing", "selling", "support", "company", "account"].includes(analysis.intent);
  const alreadyAsked = (key: keyof typeof MENUS) =>
    history.some((h) => h.role === "assistant" && h.content.includes(MENUS[key].mark));

  // Step 1 — no clear category yet: ask what they need
  if (!category && !platformIntent && !analysis.specificProduct && userText.length < 25) {
    await send(askRequirement);
    return;
  }

  // Step 2 — category known but too vague: ask ONE slot at a time with quick-reply buttons
  if (category && !platformIntent && detailCount < 3) {
    if (category === "robot") {
      if (!hasType && !hasBrand && !hasModel && !alreadyAsked("type")) {
        await send(renderMenu("type", "🔎 Got it — you're looking for a *robot*."));
        return;
      }
      if (!hasApplication && !alreadyAsked("application")) {
        await send(renderMenu("application"));
        return;
      }
      if (!hasLocation && !alreadyAsked("city")) {
        await send(renderMenu("city"));
        return;
      }
      if (!hasBudget && !hasPayload && !alreadyAsked("budget")) {
        await send(renderMenu("budget"));
        return;
      }
    } else {
      const slotQuestions =
        category === "spare parts"
          ? "• Robot brand & model (e.g. ABB IRB 6640)\n• Which part do you need?\n• New or refurbished?"
          : "• Type of service (installation / AMC / repair / programming)\n• Robot brand & model";
      if (!alreadyAsked("city")) {
        await send(renderMenu("city", `🔎 Got it — *${category}*.\n\nPlease share:\n${slotQuestions}`));
        return;
      }
    }
  }


  // Step 3 — enough detail: analyse the database and answer
  let reply: string | null = null;
  const requirement = priorUserText ? `${priorUserText}\n${userText}`.trim() : userText;


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
      userMessage: userText,
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
