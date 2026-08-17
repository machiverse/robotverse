import { useEffect, useState } from "react";
import { Megaphone, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { callWhatsAppAdmin, relativeTime, type WaBroadcast, type WaSession } from "./waTypes";

const WhatsAppBroadcast = () => {
  const [sessions, setSessions] = useState<WaSession[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<WaBroadcast[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [{ data: sess }, { data: casts }] = await Promise.all([
      supabase.from("whatsapp_sessions").select("*").order("last_seen", { ascending: false }).limit(500),
      supabase.from("whatsapp_broadcasts").select("*").order("created_at", { ascending: false }).limit(20),
    ]);
    setSessions((sess ?? []) as WaSession[]);
    setHistory((casts ?? []) as WaBroadcast[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const allSelected = sessions.length > 0 && selected.length === sessions.length;

  const send = async () => {
    if (!message.trim() || selected.length === 0) {
      toast.error("Pick at least one recipient and write a message");
      return;
    }
    setSending(true);
    try {
      const res = await callWhatsAppAdmin<{ sent: number; failed: number }>("broadcast", {
        message: message.trim(),
        recipients: selected,
      });
      toast.success(`Broadcast sent to ${res.sent} contacts${res.failed ? `, ${res.failed} failed` : ""}`);
      setMessage("");
      setSelected([]);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Broadcast failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="border-border shadow-sm lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Compose broadcast</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            maxLength={1024}
            placeholder="Write your WhatsApp broadcast. *bold*, _italic_ and line breaks are supported."
          />
          <p className="text-xs text-muted-foreground">{message.length}/1024 characters</p>

          <div className="rounded-lg border bg-[#e5ddd5]/40 p-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Preview</p>
            <div className="max-w-sm whitespace-pre-line rounded-lg bg-[#dcf8c6] p-3 text-sm shadow-sm">
              {message || "Your message preview appears here."}
            </div>
          </div>

          <Button
            onClick={send}
            disabled={sending || !message.trim() || selected.length === 0}
            className="w-auto min-w-fit whitespace-normal bg-[#25D366] hover:bg-[#128C7E]"
          >
            {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Megaphone className="mr-2 h-4 w-4" />}
            Send to {selected.length} contact{selected.length === 1 ? "" : "s"}
          </Button>
          <p className="text-xs text-muted-foreground">
            WhatsApp only allows free-form messages within 24 hours of a user's last message. Older contacts need an approved template.
          </p>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" /> Recipients
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="w-auto min-w-fit whitespace-normal"
              onClick={() => setSelected(allSelected ? [] : sessions.map((s) => s.phone))}
            >
              {allSelected ? "Clear" : "Select all"}
            </Button>
          </CardHeader>
          <CardContent className="max-h-72 space-y-2 overflow-y-auto p-4 pt-0">
            {loading && <div className="h-10 animate-pulse rounded bg-muted" />}
            {!loading && sessions.length === 0 && <p className="text-sm text-muted-foreground">No contacts yet.</p>}
            {sessions.map((s) => (
              <label key={s.id} className="flex cursor-pointer items-center gap-3 rounded-md p-2 text-sm hover:bg-muted/60">
                <Checkbox
                  checked={selected.includes(s.phone)}
                  onCheckedChange={(v) =>
                    setSelected((prev) => (v ? [...prev, s.phone] : prev.filter((p) => p !== s.phone)))
                  }
                />
                <span className="min-w-0">
                  <span className="block truncate font-medium">+{s.phone}</span>
                  <span className="block text-xs text-muted-foreground">{relativeTime(s.last_seen)}</span>
                </span>
              </label>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Recent broadcasts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-0">
            {history.length === 0 && <p className="text-sm text-muted-foreground">Nothing sent yet.</p>}
            {history.map((b) => (
              <div key={b.id} className="rounded-lg border p-3">
                <p className="line-clamp-2 text-sm">{b.message}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <Badge variant="secondary">{b.sent_count} sent</Badge>
                  {b.failed_count > 0 && <Badge className="bg-rose-100 text-rose-800">{b.failed_count} failed</Badge>}
                  <span className="text-muted-foreground">{relativeTime(b.created_at)}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WhatsAppBroadcast;
