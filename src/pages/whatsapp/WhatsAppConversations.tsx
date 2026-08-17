import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Send, UserCheck, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { callWhatsAppAdmin, INTENT_COLORS, relativeTime, type WaMessage, type WaSession } from "./waTypes";

const WhatsAppConversations = () => {
  const [params, setParams] = useSearchParams();
  const [sessions, setSessions] = useState<WaSession[]>([]);
  const [messages, setMessages] = useState<WaMessage[]>([]);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const activePhone = params.get("phone");
  const active = useMemo(() => sessions.find((s) => s.phone === activePhone) ?? null, [sessions, activePhone]);

  const loadSessions = async () => {
    const [{ data: sess }, { data: msgs }] = await Promise.all([
      supabase.from("whatsapp_sessions").select("*").order("last_seen", { ascending: false }).limit(200),
      supabase.from("whatsapp_messages").select("phone, body").order("created_at", { ascending: false }).limit(400),
    ]);
    const prev: Record<string, string> = {};
    (msgs ?? []).forEach((m: any) => {
      if (!prev[m.phone] && m.body) prev[m.phone] = m.body;
    });
    setSessions((sess ?? []) as WaSession[]);
    setPreviews(prev);
    setLoading(false);
  };

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (!activePhone) {
      setMessages([]);
      return;
    }
    let active = true;
    setLoadingThread(true);
    (async () => {
      const { data } = await supabase
        .from("whatsapp_messages")
        .select("*")
        .eq("phone", activePhone)
        .order("created_at", { ascending: true })
        .limit(500);
      if (!active) return;
      setMessages((data ?? []) as WaMessage[]);
      setLoadingThread(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
    })();
    return () => {
      active = false;
    };
  }, [activePhone]);

  const filtered = sessions.filter(
    (s) =>
      !search.trim() ||
      s.phone.includes(search.trim()) ||
      (s.user_name ?? "").toLowerCase().includes(search.trim().toLowerCase()),
  );

  const toggleHumanMode = async () => {
    if (!active) return;
    const { error } = await supabase
      .from("whatsapp_sessions")
      .update({ human_mode: !active.human_mode })
      .eq("id", active.id);
    if (error) return toast.error(error.message);
    toast.success(active.human_mode ? "Bot re-enabled for this chat" : "Human mode activated");
    loadSessions();
  };

  const endSession = async () => {
    if (!active) return;
    const { error } = await supabase.from("whatsapp_sessions").update({ status: "closed" }).eq("id", active.id);
    if (error) return toast.error(error.message);
    toast.success("Session closed");
    loadSessions();
  };

  const clearSession = async () => {
    if (!active) return;
    const { error } = await supabase.from("whatsapp_sessions").delete().eq("id", active.id);
    if (error) return toast.error(error.message);
    toast.success("Conversation deleted");
    setParams({});
    loadSessions();
  };

  const sendReply = async () => {
    if (!active || !reply.trim()) return;
    setSending(true);
    try {
      await callWhatsAppAdmin("send", { phone: active.phone, message: reply.trim() });
      setReply("");
      const { data } = await supabase
        .from("whatsapp_messages")
        .select("*")
        .eq("phone", active.phone)
        .order("created_at", { ascending: true })
        .limit(500);
      setMessages((data ?? []) as WaMessage[]);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Send failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-10">
      {/* List */}
      <div className="rounded-xl border bg-card shadow-sm lg:col-span-3">
        <div className="border-b p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search phone or name" className="pl-9" />
          </div>
        </div>
        <div className="max-h-[70vh] divide-y overflow-y-auto">
          {loading && <div className="space-y-2 p-3">{[0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded bg-muted" />)}</div>}
          {!loading && filtered.length === 0 && <p className="p-4 text-sm text-muted-foreground">No conversations found.</p>}
          {filtered.map((s) => (
            <button
              key={s.id}
              onClick={() => setParams({ phone: s.phone })}
              className={`w-full px-4 py-3 text-left transition-colors hover:bg-[#25D366]/8 ${
                s.phone === activePhone ? "bg-[#25D366]/12" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="truncate font-medium">+{s.phone}</span>
                {Date.now() - new Date(s.last_seen).getTime() < 3600000 && (
                  <span className="h-2 w-2 shrink-0 rounded-full bg-[#25D366]" />
                )}
                <span className="ml-auto shrink-0 text-xs text-muted-foreground">{relativeTime(s.last_seen)}</span>
              </div>
              <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{previews[s.phone] ?? "—"}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Detail */}
      <div className="flex min-h-[60vh] flex-col rounded-xl border bg-card shadow-sm lg:col-span-7">
        {!active ? (
          <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
            Select a conversation to view the chat.
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 border-b p-4">
              <div className="min-w-0">
                <p className="truncate font-semibold">+{active.phone}</p>
                <p className="text-xs text-muted-foreground">
                  {active.user_name ?? "Unknown"} • {active.message_count} messages
                </p>
              </div>
              <Badge className={`${INTENT_COLORS[active.current_intent ?? "other"] ?? INTENT_COLORS.other}`}>
                {active.current_intent ?? "other"}
              </Badge>
              <div className="ml-auto flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="w-auto min-w-fit whitespace-normal" onClick={toggleHumanMode}>
                  <UserCheck className="mr-2 h-4 w-4" />
                  {active.human_mode ? "Give back to bot" : "Take Over"}
                </Button>
                <Button variant="outline" size="sm" className="w-auto min-w-fit whitespace-normal" onClick={endSession}>
                  <XCircle className="mr-2 h-4 w-4" /> End Session
                </Button>
                <Button variant="ghost" size="sm" className="w-auto min-w-fit whitespace-normal text-destructive" onClick={clearSession}>
                  Delete
                </Button>
              </div>
            </div>

            {active.human_mode && (
              <div className="border-b bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900">
                Human Mode Active — the bot will not auto-reply to this chat.
              </div>
            )}

            <div className="flex-1 space-y-3 overflow-y-auto bg-[#e5ddd5]/50 p-4" style={{ maxHeight: "56vh" }}>
              {loadingThread && <div className="h-16 animate-pulse rounded bg-card/70" />}
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.direction === "out" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] whitespace-pre-line rounded-lg px-3 py-2 text-sm shadow-sm ${
                      m.direction === "out" ? "bg-[#dcf8c6] text-foreground" : "bg-card text-foreground"
                    }`}
                  >
                    {m.body}
                    <span className="mt-1 block text-[10px] text-muted-foreground">
                      {new Date(m.created_at).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <div className="flex items-center gap-2 border-t bg-[#f0f0f0] p-3">
              <Input
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendReply()}
                placeholder="Reply as a human agent..."
                className="bg-card"
              />
              <Button
                onClick={sendReply}
                disabled={sending || !reply.trim()}
                className="w-auto min-w-fit shrink-0 whitespace-normal bg-[#25D366] hover:bg-[#128C7E]"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default WhatsAppConversations;
