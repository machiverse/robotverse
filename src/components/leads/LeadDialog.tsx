import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { pushEvent } from "@/lib/analytics";
import { KINDS, validate, type LeadInput, type LeadKind } from "../../../supabase/functions/_shared/leads";

/** RobotVerse's WhatsApp and email, for when the form cannot be sent. */
const SALES_WHATSAPP = "918610925352";
const SUPPORT_EMAIL = "support@robotverse.in";
const SAVED = "rv-lead-contact";

export interface LeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: LeadKind;
  /** Where the request comes from, e.g. "automation-studio", "cell-builder", "directory". */
  source: string;
  title?: string;
  intro?: string;
  item?: LeadInput["item"];
  /** Context saved with the lead: the plan, the cell, the model's specs. */
  details?: Record<string, unknown>;
  /** Offer to send the enquiry to sellers who list this model too. */
  canShare?: boolean;
  defaultMessage?: string;
  /** Text of the send button. */
  action?: string;
}

type Contact = { name: string; phone: string; email: string; company: string; city: string };
const empty: Contact = { name: "", phone: "", email: "", company: "", city: "" };
const loadSaved = (): Contact => {
  try {
    return { ...empty, ...JSON.parse(localStorage.getItem(SAVED) ?? "{}") };
  } catch {
    return empty;
  }
};

/**
 * One enquiry form for the whole site: the request is saved in the RobotVerse CRM and sales is
 * alerted (lead-capture function). If sending fails, the visitor gets WhatsApp and email with
 * the same message, so the lead is never lost.
 */
export default function LeadDialog({ open, onOpenChange, kind, source, title, intro, item, details, canShare, defaultMessage, action }: LeadDialogProps) {
  const { user } = useAuth();
  const [contact, setContact] = useState<Contact>(empty);
  const [message, setMessage] = useState("");
  const [share, setShare] = useState(false);
  const [website, setWebsite] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open) return;
    const saved = loadSaved();
    setContact({ ...saved, email: saved.email || user?.email || "" });
    setMessage(defaultMessage ?? "");
    setShare(false);
    setError(null);
    setFailed(false);
    setDone(false);
  }, [open, defaultMessage, user?.email]);

  const label = title ?? KINDS[kind].label;
  const set = (k: keyof Contact) => (e: React.ChangeEvent<HTMLInputElement>) => setContact((c) => ({ ...c, [k]: e.target.value }));
  const body: LeadInput = {
    kind,
    source,
    page: typeof window !== "undefined" ? window.location.href : undefined,
    item,
    contact,
    message,
    details,
    share: canShare ? share : false,
    website,
  };
  const fallbackText = [`${label}${item?.name ? `: ${item.name}` : ""}`, message, `${contact.name}${contact.company ? `, ${contact.company}` : ""}${contact.city ? `, ${contact.city}` : ""}`, contact.phone || contact.email]
    .filter(Boolean)
    .join("\n");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const check = validate(body);
    if (check.error) return setError(check.error);
    setSending(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("lead-capture", { body });
      if (fnError || !data?.ok) throw new Error(data?.error || fnError?.message || "Not sent");
      try {
        localStorage.setItem(SAVED, JSON.stringify(contact));
      } catch {
        /* storage blocked: nothing to remember */
      }
      pushEvent("generate_lead", { lead_type: kind, lead_source: source, item_name: item?.name, item_id: item?.id });
      setDone(true);
    } catch {
      setFailed(true);
      setError("We could not send this right now. Please send it on WhatsApp or by email — the message is ready.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>{intro ?? "Leave your details and the RobotVerse team will contact you on WhatsApp or phone."}</DialogDescription>
        </DialogHeader>
        {done ? (
          <div className="space-y-3 py-2 text-sm">
            <p className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <span>
                Thank you, {contact.name.split(" ")[0]}. Your request is with our team and we will contact you on {contact.phone ? "WhatsApp or phone" : "email"} soon.
              </span>
            </p>
            <Button className="w-full" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            {item?.name && <p className="rounded-md bg-muted px-3 py-2 text-xs">{item.name}</p>}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="lead-name">Your name *</Label>
                <Input id="lead-name" autoComplete="name" value={contact.name} onChange={set("name")} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="lead-phone">WhatsApp number *</Label>
                <Input id="lead-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="98765 43210" value={contact.phone} onChange={set("phone")} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="lead-email">Email</Label>
                <Input id="lead-email" type="email" autoComplete="email" value={contact.email} onChange={set("email")} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="lead-company">Company</Label>
                <Input id="lead-company" autoComplete="organization" value={contact.company} onChange={set("company")} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="lead-city">City</Label>
                <Input id="lead-city" autoComplete="address-level2" value={contact.city} onChange={set("city")} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="lead-message">Message</Label>
                <Textarea id="lead-message" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
              </div>
            </div>
            {/* Honeypot for bots: hidden from people and screen readers. */}
            <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" value={website} onChange={(e) => setWebsite(e.target.value)} name="website" />
            {canShare && (
              <label className="flex items-start gap-2 text-xs text-muted-foreground">
                <Checkbox checked={share} onCheckedChange={(v) => setShare(v === true)} className="mt-0.5" />
                <span>Also send my enquiry to sellers who list this model. They see my contact details when they reply.</span>
              </label>
            )}
            <p className="text-[11px] text-muted-foreground">We use these details only to answer this request. A WhatsApp number or an email is needed.</p>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {failed && (
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <a href={`https://wa.me/${SALES_WHATSAPP}?text=${encodeURIComponent(fallbackText)}`} target="_blank" rel="noreferrer">
                    <MessageCircle className="mr-1.5 h-4 w-4" /> WhatsApp
                  </a>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <a href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(label)}&body=${encodeURIComponent(fallbackText)}`}>
                    <Mail className="mr-1.5 h-4 w-4" /> Email
                  </a>
                </Button>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={sending}>
              {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {action ?? "Send request"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
