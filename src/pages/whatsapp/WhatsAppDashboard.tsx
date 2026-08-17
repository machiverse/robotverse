import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, MessageSquare, Send, Users, Loader2, Megaphone, Bot, Globe } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { callWhatsAppAdmin, INTENT_COLORS, relativeTime, type WaSession } from "./waTypes";

interface Health {
  status: string;
  uptime_seconds: number;
  activeSessions: number;
  totalMessages: number;
  whatsappConfigured: boolean;
  verifyTokenConfigured: boolean;
}

const WhatsAppDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<Health | null>(null);
  const [sessions, setSessions] = useState<WaSession[]>([]);
  const [lastMessages, setLastMessages] = useState<Record<string, string>>({});
  const [todayCount, setTodayCount] = useState(0);
  const [testOpen, setTestOpen] = useState(false);
  const [testInput, setTestInput] = useState("");
  const [testReply, setTestReply] = useState<{ reply: string; analysis: any } | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [{ data: sess }, { data: msgs }] = await Promise.all([
          supabase.from("whatsapp_sessions").select("*").order("last_seen", { ascending: false }).limit(10),
          supabase.from("whatsapp_messages").select("phone, body, created_at, direction").order("created_at", { ascending: false }).limit(200),
        ]);
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const { count } = await supabase
          .from("whatsapp_messages")
          .select("id", { count: "exact", head: true })
          .gte("created_at", startOfDay.toISOString());

        const previews: Record<string, string> = {};
        (msgs ?? []).forEach((m: any) => {
          if (!previews[m.phone] && m.body) previews[m.phone] = m.body;
        });

        const healthData = await callWhatsAppAdmin<Health>("health").catch(() => null);
        if (!active) return;
        setSessions((sess ?? []) as WaSession[]);
        setLastMessages(previews);
        setTodayCount(count ?? 0);
        setHealth(healthData);
      } catch (err) {
        console.error(err);
        toast.error("Could not load bot statistics");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const runTest = async () => {
    if (!testInput.trim()) return;
    setTesting(true);
    setTestReply(null);
    try {
      const res = await callWhatsAppAdmin<{ reply: string; analysis: any }>("test", { message: testInput });
      setTestReply(res);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Test failed");
    } finally {
      setTesting(false);
    }
  };

  const stats = [
    { label: "Total Conversations", value: sessions.length ? String(health?.activeSessions ?? sessions.length) : "0", icon: MessageSquare, trend: "live" },
    { label: "Active Users (60m)", value: String(sessions.filter((s) => Date.now() - new Date(s.last_seen).getTime() < 3600000).length), icon: Users, trend: "now" },
    { label: "Messages Today", value: String(todayCount), icon: Send, trend: "today" },
    {
      label: "Bot Status",
      value: health?.whatsappConfigured ? "Online" : "Setup", 
      icon: Clock,
      trend: health ? `${Math.round((health.uptime_seconds ?? 0) / 60)}m warm` : "—",
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!health?.whatsappConfigured && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>Almost there.</strong> Add your Meta <em>WHATSAPP_ACCESS_TOKEN</em> so the bot can send replies, then set the
          webhook URL in the Meta app. See the Settings page for both values.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, trend }) => (
          <Card key={label} className="border-slate-200 shadow-sm">
            <CardContent className="flex items-center justify-between p-5">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
                <p className="mt-1 text-xs text-success">▲ {trend}</p>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#25D366]/12">
                <Icon className="h-5 w-5 text-[#128C7E]" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base">Quick Actions</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="w-auto min-w-fit whitespace-normal">
              <Link to="/whatsapp-bot/broadcast">
                <Megaphone className="mr-2 h-4 w-4" /> Send Broadcast
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-auto min-w-fit whitespace-normal">
              <Link to="/whatsapp-bot/knowledge-base">
                <Globe className="mr-2 h-4 w-4" /> Knowledge Base
              </Link>
            </Button>
            <Button className="w-auto min-w-fit whitespace-normal bg-[#25D366] hover:bg-[#128C7E]" onClick={() => setTestOpen(true)}>
              <Bot className="mr-2 h-4 w-4" /> Test Bot
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Recent Conversations</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {sessions.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              No conversations yet. Send a WhatsApp message to the connected number to start one.
            </p>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3">Phone</th>
                      <th className="px-5 py-3">Last Message</th>
                      <th className="px-5 py-3">Intent</th>
                      <th className="px-5 py-3">Time</th>
                      <th className="px-5 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((s) => (
                      <tr key={s.id} className="border-t hover:bg-slate-50/70">
                        <td className="px-5 py-3 font-medium">
                          <Link to={`/whatsapp-bot/conversations?phone=${s.phone}`} className="hover:underline">
                            +{s.phone}
                          </Link>
                          {s.user_name && <span className="block text-xs text-muted-foreground">{s.user_name}</span>}
                        </td>
                        <td className="max-w-xs truncate px-5 py-3 text-muted-foreground">{lastMessages[s.phone] ?? "—"}</td>
                        <td className="px-5 py-3">
                          <Badge className={INTENT_COLORS[s.current_intent ?? "other"] ?? INTENT_COLORS.other}>
                            {s.current_intent ?? "other"}
                          </Badge>
                        </td>
                        <td className="px-5 py-3 text-muted-foreground">{relativeTime(s.last_seen)}</td>
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center gap-2">
                            <span
                              className={`h-2.5 w-2.5 rounded-full ${
                                Date.now() - new Date(s.last_seen).getTime() < 3600000 ? "bg-success" : "bg-slate-300"
                              }`}
                            />
                            {s.human_mode ? "human" : s.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="divide-y md:hidden">
                {sessions.map((s) => (
                  <Link key={s.id} to={`/whatsapp-bot/conversations?phone=${s.phone}`} className="block p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">+{s.phone}</span>
                      <span className="text-xs text-muted-foreground">{relativeTime(s.last_seen)}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{lastMessages[s.phone] ?? "—"}</p>
                    <Badge className={`mt-2 ${INTENT_COLORS[s.current_intent ?? "other"] ?? INTENT_COLORS.other}`}>
                      {s.current_intent ?? "other"}
                    </Badge>
                  </Link>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={testOpen} onOpenChange={setTestOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Test the bot brain</DialogTitle>
          </DialogHeader>
          <Textarea
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
            placeholder='e.g. "used FANUC welding robot 20kg near Chennai under 12 lakh"'
            rows={3}
          />
          <Button
            onClick={runTest}
            disabled={testing || !testInput.trim()}
            className="w-auto min-w-fit whitespace-normal bg-[#25D366] hover:bg-[#128C7E]"
          >
            {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Run test
          </Button>
          {testReply && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge className={INTENT_COLORS[testReply.analysis?.intent] ?? INTENT_COLORS.other}>
                  intent: {testReply.analysis?.intent}
                </Badge>
                <Badge variant="secondary">sentiment: {testReply.analysis?.sentiment}</Badge>
                <Badge variant="secondary">lang: {testReply.analysis?.language}</Badge>
              </div>
              <div className="max-h-72 overflow-y-auto whitespace-pre-line rounded-lg bg-[#dcf8c6] p-4 text-sm">
                {testReply.reply}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WhatsAppDashboard;
