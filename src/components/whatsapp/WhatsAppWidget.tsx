import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";

const WA_PHONE = "918825515952";

const QUICK_REPLIES = ["Browse robots", "Spare parts", "Book a service", "Talk to a human"];

const WELCOME = `👋 Hello! I'm the RobotVerse AI Assistant.

I can help you with:
• Industrial robots & cobots
• Spare parts & end-effectors
• Service providers & integrators
• Auctions, logistics & finance

How can I help you today?`;

const WhatsAppWidget = () => {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(true);
  const [input, setInput] = useState("");
  const panelRef = useRef<HTMLDivElement | null>(null);
  const fabRef = useRef<HTMLButtonElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Auto-open once after 5s per browser session
  useEffect(() => {
    if (sessionStorage.getItem("rv_wa_autoshown")) return;
    const t = setTimeout(() => {
      sessionStorage.setItem("rv_wa_autoshown", "1");
      setOpen(true);
    }, 5000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!open) return;
    setUnread(false);
    inputRef.current?.focus();
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target) || fabRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const openWhatsApp = (text: string) => {
    const message = text.trim() || "Hi RobotVerse, I need help with industrial robots.";
    window.open(`https://wa.me/${WA_PHONE}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
    setInput("");
  };

  return (
    <>
      {/* Popup */}
      <div
        ref={panelRef}
        role="dialog"
        aria-label="Chat with RobotVerse on WhatsApp"
        aria-hidden={!open}
        className={`fixed bottom-[104px] right-4 z-[9998] w-[calc(100vw-2rem)] max-w-[360px] overflow-hidden rounded-2xl bg-background shadow-2xl transition-all duration-200 sm:right-6 ${
          open ? "pointer-events-auto scale-100 opacity-100" : "pointer-events-none translate-y-3 scale-95 opacity-0"
        }`}
      >
        <div className="flex items-center gap-3 bg-gradient-to-br from-[#25D366] to-[#128C7E] px-4 py-3 text-white">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 font-bold">RV</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">RobotVerse AI</p>
            <p className="flex items-center gap-1.5 text-xs text-white/90">
              <span className="h-2 w-2 rounded-full bg-white" /> Online • replies instantly
            </p>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close chat"
            className="ml-auto rounded-full p-1 transition-colors hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 bg-[#e5ddd5] p-4">
          <div className="max-w-[92%] whitespace-pre-line rounded-lg rounded-tl-none bg-background px-3.5 py-2.5 text-sm leading-relaxed shadow-sm">
            {WELCOME}
          </div>
          <div className="flex flex-wrap gap-2">
            {QUICK_REPLIES.map((q) => (
              <button
                key={q}
                onClick={() => openWhatsApp(q)}
                className="w-auto min-w-fit whitespace-normal rounded-full border border-[#128C7E]/30 bg-background px-3 py-1.5 text-xs font-medium text-[#128C7E] shadow-sm transition-colors hover:bg-[#25D366]/10"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 bg-muted p-3">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && openWhatsApp(input)}
            placeholder="Type a message..."
            aria-label="Message"
            className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[#25D366]/40"
          />
          <button
            onClick={() => openWhatsApp(input)}
            aria-label="Send on WhatsApp"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white transition-colors hover:bg-[#128C7E]"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Floating button */}
      <button
        ref={fabRef}
        onClick={() => setOpen((v) => !v)}
        aria-label="Chat on WhatsApp"
        aria-expanded={open}
        className="fixed bottom-6 right-4 z-[9999] flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_8px_24px_rgba(37,211,102,0.45)] transition-transform hover:scale-110 sm:right-6"
      >
        {unread && !open && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 animate-pulse items-center justify-center rounded-full bg-destructive text-[11px] font-bold text-destructive-foreground">
            1
          </span>
        )}
        <MessageCircle className="h-7 w-7" />
      </button>
    </>
  );
};

export default WhatsAppWidget;
