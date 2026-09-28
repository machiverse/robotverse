import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { sendEnquiry, type EnquiryContact } from "./trainingApi";
import { mailto } from "./directoryTypes";

export interface EnquiryListing {
  id?: string;
  title: string;
  provider?: string;
  dates?: string;
  location?: string;
}

interface Props {
  listing: EnquiryListing | null;
  onOpenChange: (open: boolean) => void;
}

const EMPTY: EnquiryContact = { name: "", email: "", phone: "", company: "", city: "", mode: "", participants: "1" };

// Enquiry form for a training listing or poster. Signed-in members get their
// details filled in from their profile; the request is emailed to support@robotverse.in.
export default function TrainingEnquiryDialog({ listing, onOpenChange }: Props) {
  const { user } = useAuth();
  const [contact, setContact] = useState<EnquiryContact>(EMPTY);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!listing) return;
    setSent(false);
    setError(null);
    setMessage(`I'm interested in "${listing.title}". Please share the next batch dates, fees and how to register.`);
    setContact((c) => ({ ...c, email: c.email || user?.email || "" }));
    if (!user) return;
    let live = true;
    supabase
      .from("profiles")
      .select("full_name, email, mobile_number, phone, company_name, city, location")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!live || !data) return;
        setContact((c) => ({
          ...c,
          name: c.name || data.full_name || "",
          email: c.email || data.email || user.email || "",
          phone: c.phone || data.mobile_number || data.phone || "",
          company: c.company || data.company_name || "",
          city: c.city || data.city || data.location || "",
        }));
      });
    return () => {
      live = false;
    };
  }, [listing, user]);

  const set = (k: keyof EnquiryContact) => (e: React.ChangeEvent<HTMLInputElement>) => setContact((c) => ({ ...c, [k]: e.target.value }));
  const valid = contact.name.trim() && (contact.email.trim() || contact.phone.trim());

  async function submit() {
    if (!listing || !valid) return;
    setBusy(true);
    setError(null);
    try {
      await sendEnquiry(listing, contact, message);
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const fallback = listing
    ? mailto(
        `Training enquiry: ${listing.title}${listing.id ? ` (${listing.id})` : ""}`,
        `${message}\n\nName: ${contact.name}\nEmail: ${contact.email}\nPhone: ${contact.phone}\nCompany: ${contact.company}\nCity: ${contact.city}`,
      )
    : "#";

  return (
    <Dialog open={!!listing} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Enquire: {listing?.title}</DialogTitle>
          <DialogDescription>
            {listing?.provider ? `${listing.provider} · ` : ""}Your request goes to the RobotVerse team at support@robotverse.in, who
            will connect you with the trainer.
          </DialogDescription>
        </DialogHeader>

        {sent ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            <p className="font-semibold">Enquiry sent</p>
            <p className="text-sm text-muted-foreground">We'll get back to you at {contact.email || contact.phone} shortly.</p>
            <Button className="mt-2" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        ) : (
          <>
            {user ? (
              <p className="rounded-md bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
                Your details are filled in from your RobotVerse profile. Check them before sending.
              </p>
            ) : (
              <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                Sign in to have your details filled in automatically.
              </p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="enq-name">Name *</Label>
                <Input id="enq-name" value={contact.name} onChange={set("name")} autoComplete="name" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="enq-email">Email</Label>
                <Input id="enq-email" type="email" value={contact.email} onChange={set("email")} autoComplete="email" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="enq-phone">Phone</Label>
                <Input id="enq-phone" value={contact.phone} onChange={set("phone")} autoComplete="tel" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="enq-company">Company / college</Label>
                <Input id="enq-company" value={contact.company} onChange={set("company")} autoComplete="organization" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="enq-city">City</Label>
                <Input id="enq-city" value={contact.city} onChange={set("city")} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="enq-mode">Preferred mode</Label>
                <Input id="enq-mode" value={contact.mode} onChange={set("mode")} placeholder="Online / classroom" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="enq-people">Participants</Label>
                <Input id="enq-people" inputMode="numeric" value={contact.participants} onChange={set("participants")} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="enq-msg">Message</Label>
                <Textarea id="enq-msg" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
              </div>
            </div>
            {error && (
              <p className="text-sm text-destructive">
                {error}{" "}
                <a className="underline" href={fallback}>
                  Send by email instead
                </a>
              </p>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={submit} disabled={!valid || busy}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Send enquiry
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
