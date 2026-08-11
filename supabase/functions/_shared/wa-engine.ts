// ============================================================================
// RobotVerse WhatsApp AI Engine
// Mirrors the website chatbot: same brain (robotverse-ai-assistant + Lovable AI
// Gateway), same knowledge, same conversation flow — delivered over WhatsApp.
// ============================================================================

export const GRAPH_VERSION = "v18.0";
export const SITE = "https://robotverse.in";

export interface Analysis {
  intent:
    | "pricing"
    | "features"
    | "demo"
    | "support"
    | "integration"
    | "comparison"
    | "greeting"
    | "product"
    | "how_it_works"
    | "marketplace"
    | "other";
  keywords: string[];
  sentiment: "positive" | "neutral" | "negative" | "urgent";
  isQuestion: boolean;
  specificProduct: string | null;
  urgency: "high" | "medium" | "low";
  language: "en" | "hi" | "mixed";
}

export interface KbEntry {
  entry_key: string;
  category: string;
  title: string;
  content: string;
  keywords: string[];
}

// ---------------------------------------------------------------------------
// STEP 1 — message analysis
// ---------------------------------------------------------------------------

const INTENT_KEYWORDS: Record<Analysis["intent"], string[]> = {
  pricing: ["price", "cost", "plan", "pricing", "subscription", "how much", "rate", "fee", "budget", "affordable", "credits", "दाम", "कीमत", "₹"],
  features: ["feature", "capability", "what can", "function", "offer", "provide", "what do you"],
  demo: ["demo", "trial", "test", "try", "sample", "walkthrough", "show me", "डेमो"],
  support: ["help", "support", "issue", "problem", "bug", "error", "fix", "not working", "assist", "complaint", "मदद"],
  integration: ["integrate", "connect", "api", "webhook", "crm", "zapier", "erp", "plugin", "third party"],
  comparison: ["compare", "vs", "versus", "difference", "alternative", "better", "competitor"],
  greeting: ["hi", "hello", "hey", "good morning", "good evening", "namaste", "नमस्ते", "हैलो"],
  product: ["chatbot", "bot", "ai", "automation", "platform", "चैटबॉट"],
  how_it_works: ["how does", "how do", "how it works", "process", "workflow", "setup", "कैसे"],
  marketplace: [
    "robot", "cobot", "fanuc", "abb", "kuka", "yaskawa", "universal robots", "mitsubishi", "epson", "kawasaki", "doosan",
    "spare", "part", "gripper", "eoat", "sensor", "controller", "teach pendant", "servo",
    "welding", "palletizing", "pick and place", "painting", "assembly", "machine tending", "scara", "delta", "agv", "amr",
    "service", "integrator", "maintenance", "amc", "auction", "bid", "logistics", "shipping", "finance", "loan", "emi",
    "payload", "reach", "kg", "lakh", "used", "second hand", "buy", "sell", "quote", "quotation", "robobook", "talent", "job",
  ],
  other: [],
};

const HINDI_RE = /[\u0900-\u097F]/;
const HINGLISH = ["kya", "hai", "kaise", "kitna", "chahiye", "batao", "karo", "mujhe", "aap", "nahi", "haan"];

export function fallbackAnalyze(text: string): Analysis {
  const q = (text || "").toLowerCase();
  const keywords = q.split(/\s+/).filter((w) => w.length > 2).slice(0, 12);

  let intent: Analysis["intent"] = "other";
  let best = 0;
  for (const [key, words] of Object.entries(INTENT_KEYWORDS) as [Analysis["intent"], string[]][]) {
    const hits = words.filter((w) => q.includes(w)).length;
    if (hits > best) {
      best = hits;
      intent = key;
    }
  }
  if (best === 0 && q.trim().length <= 12 && INTENT_KEYWORDS.greeting.some((g) => q.includes(g))) intent = "greeting";

  const negative = ["not working", "bad", "worst", "angry", "refund", "cheat", "fraud", "complaint", "problem", "issue", "delay"];
  const urgentWords = ["urgent", "asap", "immediately", "emergency", "today", "turant"];
  const positive = ["thanks", "thank you", "great", "good", "awesome", "nice", "perfect"];

  const sentiment: Analysis["sentiment"] = urgentWords.some((w) => q.includes(w))
    ? "urgent"
    : negative.some((w) => q.includes(w))
      ? "negative"
      : positive.some((w) => q.includes(w))
        ? "positive"
        : "neutral";

  const hasHindiScript = HINDI_RE.test(text || "");
  const hasHinglish = HINGLISH.some((w) => q.split(/\s+/).includes(w));
  const language: Analysis["language"] = hasHindiScript && /[a-z]/i.test(text) ? "mixed" : hasHindiScript || hasHinglish ? "hi" : "en";

  return {
    intent,
    keywords,
    sentiment,
    isQuestion: /\?|^(what|how|when|where|which|who|why|can|do|does|is|are|kya|kaise|kitna)/i.test(q.trim()),
    specificProduct: INTENT_KEYWORDS.marketplace.find((k) => q.includes(k)) ?? null,
    urgency: sentiment === "urgent" ? "high" : sentiment === "negative" ? "medium" : "low",
    language,
  };
}

export async function analyzeMessage(text: string, apiKey: string | undefined): Promise<Analysis> {
  const fallback = fallbackAnalyze(text);
  if (!apiKey) return fallback;

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-lite",
        temperature: 0.1,
        max_tokens: 300,
        messages: [
          {
            role: "system",
            content: "You analyse customer messages for RobotVerse, an industrial robotics marketplace in India. Return ONLY valid JSON, no markdown fences.",
          },
          {
            role: "user",
            content:
              `Analyse this message. Extract intent, keywords, sentiment, whether it is a question, any specific product mentioned, urgency and language (en/hi/mixed). ` +
              `intent must be one of: pricing, features, demo, support, integration, comparison, greeting, product, how_it_works, marketplace, other. ` +
              `Use "marketplace" when the user is looking for robots, spare parts, services, auctions, logistics or financing listings. ` +
              `Return JSON with keys: intent, keywords (array), sentiment (positive|neutral|negative|urgent), isQuestion (bool), specificProduct (string|null), urgency (high|medium|low), language (en|hi|mixed).\n\nMessage: ${text}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      console.error("analyzeMessage gateway error", res.status, await res.text());
      return fallback;
    }
    const data = await res.json();
    const raw = (data.choices?.[0]?.message?.content ?? "").replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(raw);
    return {
      intent: (parsed.intent ?? fallback.intent) as Analysis["intent"],
      keywords: Array.isArray(parsed.keywords) && parsed.keywords.length ? parsed.keywords : fallback.keywords,
      sentiment: parsed.sentiment ?? fallback.sentiment,
      isQuestion: typeof parsed.isQuestion === "boolean" ? parsed.isQuestion : fallback.isQuestion,
      specificProduct: parsed.specificProduct ?? fallback.specificProduct,
      urgency: parsed.urgency ?? fallback.urgency,
      language: parsed.language ?? fallback.language,
    };
  } catch (err) {
    console.error("analyzeMessage failed, using fallback:", err);
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// STEP 2 — knowledge base search
// ---------------------------------------------------------------------------

const CATEGORY_FOR_INTENT: Record<string, string[]> = {
  pricing: ["pricing"],
  features: ["feature"],
  demo: ["company"],
  support: ["company"],
  integration: ["integration"],
  comparison: ["general", "feature"],
  greeting: ["general"],
  product: ["product"],
  how_it_works: ["how_to"],
  marketplace: ["product"],
  other: ["general"],
};

export function searchKnowledge(entries: KbEntry[], intent: string, keywords: string[]): KbEntry[] {
  const cats = CATEGORY_FOR_INTENT[intent] ?? ["general"];
  const kws = keywords.map((k) => k.toLowerCase());

  const scored = entries.map((item) => {
    let score = 0;
    if (cats.includes(item.category)) score += 10;
    for (const kw of kws) {
      if (!kw) continue;
      if ((item.keywords ?? []).some((k) => k.toLowerCase().includes(kw) || kw.includes(k.toLowerCase()))) score += 5;
      const text = `${item.title} ${item.content}`.toLowerCase();
      if (text.includes(kw)) score += 3;
    }
    return { item, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((s) => s.item);
}

// ---------------------------------------------------------------------------
// STEP 3 — response generation (same personality as the website chatbot)
// ---------------------------------------------------------------------------

export function systemPrompt(knowledgeContext: string, analysis: Analysis) {
  return `You are the official AI assistant for RobotVerse (robotverse.in). You are the EXACT same AI that powers the RobotVerse website chatbot — your personality, knowledge and response style must be identical, only formatted for WhatsApp.

ABOUT ROBOTVERSE:
RobotVerse is India's industrial robotics marketplace. Buyers find new and used industrial robots and cobots, spare parts and EOAT, system integrators and maintenance services, live robot auctions, logistics partners and equipment financing. Sellers list items, receive quote requests and manage leads in a built-in CRM. RoboBook is the content and community hub, and Robot Talent covers robotics jobs and training.

WHAT YOU CAN HELP WITH:
• 🤖 Robots & cobots — brand, payload, reach, application, condition, city, budget
• 🔧 Spare parts & EOAT — grippers, sensors, controllers, servo motors, teach pendants
• 🏭 Services — system integrators, programming, installation, AMC & maintenance
• 🔨 Auctions — live and upcoming robot auctions, bidding rules
• 🚚 Logistics & 💰 Financing — transport, insurance, loans, EMI, subsidy schemes
• 📰 RoboBook articles and 🎯 Robot Talent jobs/training
• 📋 Quotes, credits and contact unlocks, seller onboarding, plans and pricing

HARD RULES:
- NEVER invent robots, parts, sellers, prices, specs or availability. Only use listings supplied in the context below or the knowledge base. If nothing matches, say so honestly and offer to post a requirement or connect the team.
- Seller and provider contact details are private on RobotVerse. Never share seller phone numbers or emails; direct users to request a quote or unlock contact with credits.
- Prices in ₹ with Indian formatting (e.g. ₹12,50,000).

WHATSAPP RESPONSE RULES:
- Talk like a friendly, knowledgeable teammate — warm, casual, and approachable. Avoid corporate-speak or template-sounding language.
- Use emojis naturally, the way a real person texts — sprinkle them in, don't overdo it. Never start every line with an emoji.
- Vary your sentence structure. Mix short punchy lines with longer ones. Don't always start with "I can help you with" or "Here's what I found".
- Use conversational openers like "Oh nice!", "Great question!", "Ah, I know just the thing", "Let me check...", "So here's the deal —" etc.
- Use bullet points (•) sparingly — only for listing 3+ items. For 1-2 things, just write naturally.
- *single asterisks* for bold (WhatsApp formatting). Never use markdown headings, tables or #.
- Keep replies under 200 words. Shorter is better. Nobody wants to read a wall of text on WhatsApp.
- Show at most 3-4 listings, best match first. Quality over quantity.
- Share links naturally in sentences, not as standalone items.
- If the user's requirement is vague, ask ONE casual clarifying question — like "What kind of application are you thinking? Welding, palletizing, something else?"
- End with a natural next step, not a formal "How can I assist you further?" — something like "Want me to dig deeper?" or "Should I find you some options near Chennai?"
- Match the user's vibe: if they're brief, be brief. If they're chatty, match that energy.
- Match the user's language: reply in Hindi/Hinglish if they write that way. Detected language: ${analysis.language}.
- ${analysis.sentiment === "negative" || analysis.sentiment === "urgent" ? "The user sounds frustrated or in a hurry — acknowledge it genuinely (not with a corporate apology), empathize briefly, and get straight to helping. Offer human support if needed: support@robotverse.in / +91 86109 25352." : "Keep it light and helpful."}

RETRIEVED KNOWLEDGE BASE CONTEXT:
${knowledgeContext || "(no specific knowledge entry matched)"}`;
}

export const FALLBACK_RESPONSES: Record<string, string> = {
  greeting:
    "👋 Welcome to RobotVerse! I'm the same AI assistant that powers our website chatbot — now on WhatsApp!\n\nI can help you with:\n• 🤖 Robots & cobots\n• 🔧 Spare parts & EOAT\n• 🏭 Services & integrators\n• 🔨 Live auctions\n• 🚚 Logistics & 💰 financing\n• 📋 Quotes, plans & pricing\n\nWhat are you looking for?",
  pricing:
    "💰 *RobotVerse Pricing*\n\n• *Browsing & quotes* — free for buyers\n• *Credits* — unlock hidden contact details (10 for robots, 5 for spare parts)\n• *Seller subscriptions* — tiered listing limits and features\n• *Commission model* — 6% on closed deals instead of a subscription\n\nSee live plans: " + SITE + "/pricing\n\nAre you buying or selling? I'll point you to the right plan 🎯",
export const FALLBACK_RESPONSES: Record<string, string> = {
  greeting:
    "Hey there! 👋 Welcome to RobotVerse!\n\nI'm your go-to person for anything industrial robots — whether you're looking to buy, sell, find parts, or get a service done.\n\nSo what brings you here today?",
  pricing:
    "Great question on pricing! 💰\n\nBrowsing and requesting quotes is totally free for buyers. If you want to unlock seller contact details, that uses credits — 10 for robots, 5 for spare parts.\n\nSellers can pick a subscription plan or go with our 6% commission model — whatever works better for your business.\n\nCheck out the details here: " + SITE + "/pricing\n\nAre you looking to buy or sell? I'll point you the right way 😊",
  features:
    "So here's what RobotVerse is all about —\n\nWe've got new and used robots from all the big names (FANUC, ABB, KUKA, UR, you name it), plus spare parts, verified integrators, live auctions, logistics, and even financing options. All in one place.\n\nSellers get a full dashboard with leads, CRM, and quotation tools.\n\nWhat part of this sounds most useful to you?",
  product:
    "We've got quite a lineup! 🤖\n\nYou can browse robots (articulated, SCARA, cobots, delta — the works) at " + SITE + "/robots, spare parts at " + SITE + "/parts, services at " + SITE + "/services, and live auctions at " + SITE + "/auctions.\n\nTell me what you're after — the application, rough payload, and your city — and I'll find you the best matches.",
  demo:
    "Absolutely, happy to set up a walkthrough for you! 🎯\n\nJust share your name, company, and what you're looking to do (buy, sell, automate something specific?) — and our team will arrange a personalised session.\n\nWe're available Mon–Sat, 10am–7pm IST.",
  integration:
    "We've got a REST API and webhooks if you want to plug RobotVerse into your ERP, CRM, or any automation setup. 🔗\n\nAPI keys are created from your dashboard — just needs a quick admin approval.\n\nDocs are here: " + SITE + "/api-docs\n\nWhat system are you trying to connect?",
  support:
    "No worries, I'm here to help! 🙌\n\nTell me what's going on and I'll sort it out. Or if you'd rather talk to a human:\n\n📧 support@robotverse.in\n📞 +91 86109 25352\n\nWe usually get back within a couple of hours.",
  comparison:
    "Good thinking — here's why people pick RobotVerse:\n\nIt's built specifically for Indian manufacturing, supports English, Hindi and Hinglish, and puts robots, parts, services, auctions, logistics AND financing under one roof. Plus everything's verified and contact details are privacy-first.\n\nWant me to compare specific robots or brands for you? 🤔",
  how_it_works:
    "It's pretty straightforward!\n\nSign up at " + SITE + "/auth, search for what you need (or just ask me!), request a quote or unlock contacts with credits, and add logistics/financing from the same platform.\n\nSellers can list items and manage everything from a built-in CRM.\n\nWhat would you like to do first?",
  marketplace:
    "I can search our live listings for you right now! 🔎\n\nJust tell me:\n• What's the application? (welding, palletizing, pick & place…)\n• Payload you need (in kg)\n• Your city\n• Budget range (if you have one)\n\nOr just describe it naturally — like \"used welding robot 20kg near Chennai under 10 lakh\"",
  other:
    "Thanks for reaching out! 😊\n\nI can help you find robots, spare parts, services, check out auctions, or figure out logistics and financing.\n\nWhat are you looking for?",
};

/** Converts the website assistant's markdown into WhatsApp-friendly text. */
export function toWhatsAppText(markdown: string): string {
  let t = markdown ?? "";
  t = t.replace(/\r/g, "");
  t = t.replace(/^\s*#{1,6}\s*/gm, "");
  t = t.replace(/^\s*>\s?/gm, "");
  t = t.replace(/^\s*---+\s*$/gm, "");
  // links: [text](/robots/id) -> text: https://robotverse.in/robots/id
  t = t.replace(/\[([^\]]+)\]\((\/[^)\s]+)\)/g, (_m, label, path) => `${String(label).replace(/\s*→\s*$/, "").trim()}: ${SITE}${path}`);
  t = t.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (_m, label, url) => `${String(label).replace(/\s*→\s*$/, "").trim()}: ${url}`);
  // bold ** -> *
  t = t.replace(/\*\*\*([^*]+)\*\*\*/g, "*$1*");
  t = t.replace(/\*\*([^*]+)\*\*/g, "*$1*");
  // bullets
  t = t.replace(/^\s*[-*]\s+/gm, "• ");
  t = t.replace(/\n{3,}/g, "\n\n");
  return t.trim();
}

/** Calls the SAME website assistant function for marketplace queries. */
export async function callWebsiteAssistant(
  supabaseUrl: string,
  serviceKey: string,
  messages: { role: string; content: string }[],
): Promise<string | null> {
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/robotverse-ai-assistant`, {
      method: "POST",
      headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });
    if (!res.ok) {
      console.error("website assistant error", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    const content = data?.content;
    if (!content) return null;
    return toWhatsAppText(content);
  } catch (err) {
    console.error("callWebsiteAssistant failed:", err);
    return null;
  }
}

export async function generateResponse(opts: {
  userMessage: string;
  analysis: Analysis;
  knowledgeContext: string;
  conversationHistory: { role: string; content: string }[];
  apiKey: string | undefined;
  model: string;
  temperature: number;
  maxTokens: number;
}): Promise<string> {
  const { userMessage, analysis, knowledgeContext, conversationHistory, apiKey, model, temperature, maxTokens } = opts;
  if (!apiKey) return FALLBACK_RESPONSES[analysis.intent] ?? FALLBACK_RESPONSES.other;

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        temperature,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: systemPrompt(knowledgeContext, analysis) },
          ...conversationHistory.slice(-5).map((m) => ({
            role: m.role === "user" ? "user" : "assistant",
            content: m.content,
          })),
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("generateResponse gateway error", res.status, body);
      if (res.status === 429) return "⏳ I'm handling a lot of chats right now. Please send that again in a moment 🙏";
      if (res.status === 402) return "⚠️ Our AI service is temporarily unavailable. Please email support@robotverse.in and our team will help you right away 🙏";
      return FALLBACK_RESPONSES[analysis.intent] ?? FALLBACK_RESPONSES.other;
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content;
    return text ? toWhatsAppText(text) : FALLBACK_RESPONSES[analysis.intent] ?? FALLBACK_RESPONSES.other;
  } catch (err) {
    console.error("generateResponse failed:", err);
    return FALLBACK_RESPONSES[analysis.intent] ?? FALLBACK_RESPONSES.other;
  }
}

// ---------------------------------------------------------------------------
// WhatsApp Cloud API senders
// ---------------------------------------------------------------------------

export interface WaConfig {
  token: string;
  phoneNumberId: string;
}

async function waPost(cfg: WaConfig, payload: Record<string, unknown>) {
  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${cfg.phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", ...payload }),
  });
  const body = await res.text();
  if (!res.ok) {
    console.error(`WhatsApp send failed [${res.status}]: ${body}`);
    throw new Error(`WhatsApp send failed [${res.status}]: ${body}`);
  }
  try {
    return JSON.parse(body);
  } catch {
    return { raw: body };
  }
}

export function splitLongMessage(text: string, limit = 4096): string[] {
  const clean = text ?? "";
  if (clean.length <= limit) return [clean];
  const chunks: string[] = [];
  let current = "";
  for (const line of clean.split("\n")) {
    if ((current + line + "\n").length > limit) {
      if (current.trim()) chunks.push(current.trim());
      if (line.length > limit) {
        for (let i = 0; i < line.length; i += limit) chunks.push(line.slice(i, i + limit));
        current = "";
        continue;
      }
      current = line + "\n";
    } else {
      current += line + "\n";
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

export async function sendTextMessage(cfg: WaConfig, to: string, text: string) {
  const results = [];
  for (const chunk of splitLongMessage(text, 4096)) {
    results.push(await waPost(cfg, { to, type: "text", text: { preview_url: true, body: chunk } }));
  }
  return results;
}

export async function sendButtons(
  cfg: WaConfig,
  to: string,
  bodyText: string,
  buttons: { id: string; title: string }[],
) {
  return waPost(cfg, {
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: bodyText.slice(0, 1024) },
      action: {
        buttons: buttons.slice(0, 3).map((b) => ({
          type: "reply",
          reply: { id: b.id, title: b.title.slice(0, 20) },
        })),
      },
    },
  });
}

export async function sendList(
  cfg: WaConfig,
  to: string,
  bodyText: string,
  sections: { title: string; rows: { id: string; title: string; description?: string }[] }[],
  buttonLabel = "Open Menu",
) {
  return waPost(cfg, {
    to,
    type: "interactive",
    interactive: {
      type: "list",
      body: { text: bodyText.slice(0, 1024) },
      footer: { text: "RobotVerse • robotverse.in" },
      action: {
        button: buttonLabel.slice(0, 20),
        sections: sections.map((s) => ({
          title: s.title.slice(0, 24),
          rows: s.rows.slice(0, 10).map((r) => ({
            id: r.id,
            title: r.title.slice(0, 24),
            ...(r.description ? { description: r.description.slice(0, 72) } : {}),
          })),
        })),
      },
    },
  });
}

export async function sendMedia(
  cfg: WaConfig,
  to: string,
  type: "image" | "document" | "video",
  url: string,
  caption?: string,
) {
  return waPost(cfg, { to, type, [type]: { link: url, ...(caption ? { caption } : {}) } });
}

// Main menu shown to new users / on "menu"
export const MAIN_MENU_SECTIONS = [
  {
    title: "🤖 Marketplace",
    rows: [
      { id: "menu_robots", title: "Robots & Cobots", description: "New & used industrial robots" },
      { id: "menu_parts", title: "Spare Parts & EOAT", description: "Grippers, sensors, controllers" },
      { id: "menu_services", title: "Services", description: "Integrators & maintenance" },
      { id: "menu_auctions", title: "Live Auctions", description: "Bid on robots" },
    ],
  },
  {
    title: "📋 Quick Actions",
    rows: [
      { id: "menu_pricing", title: "Plans & Pricing", description: "Credits, plans, commission" },
      { id: "menu_features", title: "What We Offer", description: "Platform capabilities" },
      { id: "menu_finance", title: "Logistics & Finance", description: "Transport, loans, EMI" },
      { id: "menu_demo", title: "Book a Demo", description: "Personalised walkthrough" },
      { id: "menu_support", title: "Get Support", description: "Talk to our team" },
    ],
  },
];

export const MENU_PROMPTS: Record<string, string> = {
  menu_robots: "Show me robots available on RobotVerse",
  menu_parts: "I'm looking for robot spare parts and EOAT",
  menu_services: "I need a system integrator or maintenance service",
  menu_auctions: "Tell me about the live robot auctions",
  menu_pricing: "What are your plans and pricing?",
  menu_features: "What can RobotVerse do? What features do you offer?",
  menu_finance: "Tell me about logistics and financing options",
  menu_demo: "I want to book a demo",
  menu_support: "I need support",
};
