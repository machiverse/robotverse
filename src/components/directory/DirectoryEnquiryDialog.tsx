import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ENQUIRY_INTERESTS, type DirectoryItem } from "@/data/directoryData";

interface DirectoryEnquiryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: DirectoryItem | null;
  defaultInterest?: string;
}

const ROLES = ["Manufacturer / End User", "System Integrator", "Dealer / Reseller", "OEM", "Training Institute", "Student / Job Seeker", "Other"];

const SECTION_TO_INTEREST: Record<string, string> = {
  "robot-types": "Buying a robot",
  tools: "Tools & equipment",
  oems: "OEM / brand partnership",
  training: "Training program",
};

const emptyForm = { name: "", email: "", phone: "", company: "", role: "", message: "", website: "" };

const DirectoryEnquiryDialog = ({ open, onOpenChange, item, defaultInterest }: DirectoryEnquiryDialogProps) => {
  const { toast } = useToast();
  const [form, setForm] = useState(emptyForm);
  const [interests, setInterests] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    const initial = defaultInterest || (item ? SECTION_TO_INTEREST[item.section] : undefined);
    setInterests(initial ? [initial] : []);
    setForm((f) => ({ ...f, message: item ? `I'm interested in ${item.name}. Please share more details.` : "" }));
  }, [open, item, defaultInterest]);

  const update = (key: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const toggleInterest = (interest: string, checked: boolean) =>
    setInterests((prev) => (checked ? [...prev, interest] : prev.filter((i) => i !== interest)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast({ title: "Please add your name and email", variant: "destructive" });
      return;
    }
    if (interests.length === 0) {
      toast({ title: "Select at least one interest", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-directory-enquiry", {
        body: {
          ...form,
          interests,
          section: item?.section,
          itemName: item?.name,
          pageUrl: window.location.href,
        },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      toast({
        title: "Enquiry sent",
        description: "The RobotVerse team at support@robotverse.in will contact you shortly.",
      });
      setForm(emptyForm);
      onOpenChange(false);
    } catch (err) {
      console.error("Directory enquiry failed:", err);
      toast({
        title: "Could not send enquiry",
        description: "Please try again or email support@robotverse.in directly.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            {item ? `Enquire: ${item.name}` : "Get in touch"}
          </DialogTitle>
          <DialogDescription>
            Tell us what you're interested in. Your enquiry goes to support@robotverse.in and we'll connect you with the
            right sellers, OEMs or trainers.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Honeypot: hidden from people, bots fill it */}
          <input
            type="text"
            name="website"
            value={form.website}
            onChange={update("website")}
            tabIndex={-1}
            autoComplete="off"
            className="hidden"
            aria-hidden="true"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="dir-name">Name *</Label>
              <Input id="dir-name" value={form.name} onChange={update("name")} maxLength={120} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dir-email">Email *</Label>
              <Input id="dir-email" type="email" value={form.email} onChange={update("email")} maxLength={200} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dir-phone">Phone</Label>
              <Input id="dir-phone" type="tel" value={form.phone} onChange={update("phone")} maxLength={30} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dir-company">Company / Institute</Label>
              <Input id="dir-company" value={form.company} onChange={update("company")} maxLength={160} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>I am a</Label>
            <Select value={form.role} onValueChange={(role) => setForm((f) => ({ ...f, role }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select your role" />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Interested in *</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ENQUIRY_INTERESTS.map((interest) => (
                <label key={interest} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={interests.includes(interest)}
                    onCheckedChange={(c) => toggleInterest(interest, c === true)}
                  />
                  {interest}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dir-message">Message</Label>
            <Textarea id="dir-message" rows={4} value={form.message} onChange={update("message")} maxLength={3000} />
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
            {submitting ? "Sending..." : "Send enquiry"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DirectoryEnquiryDialog;
