// Enquiries from the site's forms (Automation Studio, cell builder, Directory): the request
// types, and the checks both the form and the lead-capture function apply. No imports, so
// the browser, the edge function and the tests share it.

const clip = (s: unknown, n = 300) => String(s ?? "").trim().slice(0, n);
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Up to 20 short fields of context (the plan, the cell, the model's specs), never the whole page. */
function cleanDetails(raw: unknown): Record<string, unknown> | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>).slice(0, 20)) {
    const key = clip(k, 40);
    if (typeof v === "number" || typeof v === "boolean") out[key] = v;
    else if (Array.isArray(v)) out[key] = v.slice(0, 20).map((x) => clip(typeof x === "object" ? JSON.stringify(x) : x, 200));
    else if (v != null) out[key] = clip(typeof v === "object" ? JSON.stringify(v) : v, 600);
  }
  return out;
}

export const KINDS = {
  engineer: { label: "Talk to an engineer", priority: "urgent" },
  quote: { label: "Quote for a robot cell", priority: "high" },
  enquiry: { label: "Directory enquiry", priority: "high" },
  datasheet: { label: "Datasheet request", priority: "medium" },
  notify: { label: "Notify me when available", priority: "medium" },
  used_price: { label: "Used price request", priority: "medium" },
  sell: { label: "Sell this model", priority: "high" },
  training: { label: "List a training program", priority: "medium" },
  parts: { label: "Parts / components enquiry", priority: "high" },
} as const;
export type LeadKind = keyof typeof KINDS;

/** A WhatsApp-reachable number: 10 Indian digits, or a full international number. */
export function cleanPhone(raw: unknown): string | null {
  const digits = String(raw ?? "").replace(/[^\d+]/g, "");
  const d = digits.replace(/^\+/, "");
  if (/^[6-9]\d{9}$/.test(d)) return `+91${d}`;
  if (/^91[6-9]\d{9}$/.test(d)) return `+${d}`;
  if (/^0[6-9]\d{9}$/.test(d)) return `+91${d.slice(1)}`;
  if (digits.startsWith("+") && /^\d{8,15}$/.test(d)) return `+${d}`;
  return null;
}
const cleanEmail = (raw: unknown) => {
  const e = clip(raw, 160).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) ? e : null;
};

export interface LeadInput {
  kind: LeadKind;
  source: string;
  page?: string;
  item?: { type?: string; id?: string; name?: string; brand?: string; model?: string };
  contact: { name: string; phone?: string; email?: string; company?: string; city?: string };
  message?: string;
  details?: Record<string, unknown>;
  share?: boolean;
  /** Honeypot: people never fill it. */
  website?: string;
}

/** Checks and trims an enquiry; returns the reason it cannot be accepted. */
export type CleanLead = LeadInput & { phone: string | null; email: string | null };
export function validate(body: Partial<LeadInput>): { lead?: CleanLead; error?: string } {
  if (!body || typeof body !== "object") return { error: "Invalid request" };
  if (body.website) return { error: "Invalid request" };
  const kind = body.kind as LeadKind;
  if (!kind || !(kind in KINDS)) return { error: "Unknown request type" };
  const name = clip(body.contact?.name, 80);
  if (name.length < 2) return { error: "Please enter your name" };
  const phone = cleanPhone(body.contact?.phone);
  const email = cleanEmail(body.contact?.email);
  if (!phone && !email) return { error: "Please enter a WhatsApp / phone number or an email address" };
  return {
    lead: {
      kind,
      source: clip(body.source, 60) || "website",
      page: clip(body.page, 300),
      item: body.item
        ? { type: clip(body.item.type, 30), id: clip(body.item.id, 60), name: clip(body.item.name, 200), brand: clip(body.item.brand, 80), model: clip(body.item.model, 120) }
        : undefined,
      contact: { name, company: clip(body.contact?.company, 120), city: clip(body.contact?.city, 80) },
      message: clip(body.message, 2000),
      details: cleanDetails(body.details),
      share: !!body.share,
      phone,
      email,
    },
  };
}

/** The notes stored with the lead: the message, then the details as readable lines. */
export function notesOf(lead: CleanLead): string {
  const lines = [lead.message || ""];
  if (lead.item?.name) lines.push(`Item: ${lead.item.name}${lead.item.id ? ` (${lead.item.id})` : ""}`);
  for (const [k, v] of Object.entries(lead.details ?? {})) {
    const text = Array.isArray(v) ? v.join("; ") : typeof v === "object" && v ? JSON.stringify(v) : String(v ?? "");
    if (text) lines.push(`${k}: ${text.slice(0, 600)}`);
  }
  if (lead.page) lines.push(`Page: ${lead.page}`);
  return lines.filter(Boolean).join("\n").slice(0, 6000);
}

