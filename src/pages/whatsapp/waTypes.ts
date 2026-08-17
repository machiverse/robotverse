import { supabase } from "@/integrations/supabase/client";

export interface WaSession {
  id: string;
  phone: string;
  user_name: string | null;
  first_seen: string;
  last_seen: string;
  message_count: number;
  current_intent: string | null;
  human_mode: boolean;
  status: string;
}

export interface WaMessage {
  id: string;
  session_id: string | null;
  phone: string;
  direction: "in" | "out" | string;
  body: string | null;
  msg_type: string;
  intent: string | null;
  created_at: string;
}

export interface WaKbEntry {
  id: string;
  entry_key: string;
  category: string;
  title: string;
  content: string;
  keywords: string[];
  is_active: boolean;
  updated_at: string;
}

export interface WaBroadcast {
  id: string;
  message: string;
  message_type: string;
  recipients: string[];
  sent_count: number;
  failed_count: number;
  status: string;
  created_at: string;
}

export interface WaSettings {
  id: boolean;
  phone_number: string;
  phone_number_id: string;
  model: string;
  temperature: number;
  max_tokens: number;
  welcome_message: string;
  fallback_message: string;
  auto_reply: boolean;
  handoff_trigger: string;
  rate_limit: number;
}

export const KB_CATEGORIES = ["general", "product", "feature", "integration", "pricing", "company", "how_to"] as const;

export const WEBHOOK_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook`;

/** Calls the whatsapp-admin edge function with the current session token. */
export async function callWhatsAppAdmin<T = any>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke("whatsapp-admin", {
    body: { action, ...body },
  });
  if (error) {
    let details = error.message;
    try {
      const ctx = (error as any).context;
      if (ctx?.text) details = await ctx.text();
    } catch {
      /* ignore */
    }
    throw new Error(details || "Request failed");
  }
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as T;
}

export function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export const INTENT_COLORS: Record<string, string> = {
  pricing: "bg-warning/10 text-warning",
  features: "bg-primary/10 text-primary",
  demo: "bg-primary/10 text-primary",
  support: "bg-destructive/10 text-destructive",
  integration: "bg-primary/10 text-primary",
  comparison: "bg-primary/10 text-primary",
  greeting: "bg-success/10 text-success",
  product: "bg-success/10 text-success",
  how_it_works: "bg-primary/10 text-primary",
  marketplace: "bg-[#25D366]/15 text-[#128C7E]",
  other: "bg-muted text-muted-foreground",
};

export function buildWidgetSnippet(phone = "917639841220") {
  return `<!-- RobotVerse WhatsApp Widget -->
<div id="rv-wa-widget"></div>
<style>
#rv-wa-fab{position:fixed;bottom:24px;right:24px;z-index:99999;width:60px;height:60px;border:0;border-radius:50%;background:#25D366;box-shadow:0 8px 24px rgba(37,211,102,.45);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:transform .2s ease}
#rv-wa-fab:hover{transform:scale(1.08)}
#rv-wa-badge{position:absolute;top:-4px;right:-4px;min-width:20px;height:20px;border-radius:10px;background:#ef4444;color:#fff;font:600 11px/20px system-ui,sans-serif;text-align:center;animation:rv-pulse 1.8s infinite}
@keyframes rv-pulse{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,.6)}50%{box-shadow:0 0 0 8px rgba(239,68,68,0)}}
#rv-wa-pop{position:fixed;bottom:100px;right:24px;z-index:99999;width:360px;max-width:calc(100vw - 48px);border-radius:16px;overflow:hidden;box-shadow:0 20px 50px rgba(15,23,42,.28);background:#fff;font-family:system-ui,-apple-system,Segoe UI,sans-serif;opacity:0;transform:scale(.9) translateY(12px);pointer-events:none;transition:opacity .22s ease,transform .22s ease}
#rv-wa-pop.rv-open{opacity:1;transform:scale(1) translateY(0);pointer-events:auto}
#rv-wa-head{background:linear-gradient(135deg,#25D366,#128C7E);color:#fff;padding:14px 16px;display:flex;align-items:center;gap:12px}
#rv-wa-head .rv-av{width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,.22);display:flex;align-items:center;justify-content:center;font-weight:700}
#rv-wa-head b{display:block;font-size:15px}
#rv-wa-head span{font-size:12px;opacity:.9}
#rv-wa-close{margin-left:auto;background:none;border:0;color:#fff;font-size:20px;cursor:pointer;line-height:1}
#rv-wa-body{background:#e5ddd5;padding:18px 16px;min-height:150px}
#rv-wa-msg{background:#fff;border-radius:0 12px 12px 12px;padding:12px 14px;font-size:14px;line-height:1.55;color:#111b21;white-space:pre-line;box-shadow:0 1px 2px rgba(0,0,0,.12)}
#rv-wa-foot{background:#f0f0f0;padding:10px;display:flex;gap:8px}
#rv-wa-input{flex:1;border:1px solid #d9d9d9;border-radius:22px;padding:10px 14px;font-size:14px;outline:none}
#rv-wa-send{width:42px;height:42px;border:0;border-radius:50%;background:#25D366;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center}
@media(max-width:480px){#rv-wa-pop{right:24px;left:24px;width:auto}}
</style>
<script>
(function(){
  var PHONE="${phone}";
  var w=document.getElementById("rv-wa-widget");
  w.innerHTML=''
   +'<button id="rv-wa-fab" aria-label="Chat on WhatsApp"><span id="rv-wa-badge">1</span>'
   +'<svg width="32" height="32" viewBox="0 0 24 24" fill="#fff"><path d="M17.47 14.38c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.65.07-.3-.15-1.12-.41-2.13-1.32-.79-.7-1.32-1.57-1.47-1.87-.15-.3-.02-.47.13-.62.15-.15.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.68-1.62-.93-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.47 0 1.45 1.06 2.85 1.21 3.05.15.2 2.09 3.2 5.07 4.37 2.98 1.17 3.32.94 3.92.89.6-.05 1.94-.79 2.21-1.56.27-.77.27-1.42.19-1.56-.08-.15-.28-.22-.58-.37z"/><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.28-1.38a9.86 9.86 0 0 0 4.75 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm0 18.13a8.2 8.2 0 0 1-4.18-1.14l-.3-.18-3.11.81.83-3.04-.2-.31a8.19 8.19 0 0 1-1.25-4.36c0-4.54 3.7-8.23 8.23-8.23 4.53 0 8.22 3.69 8.22 8.23s-3.69 8.22-8.24 8.22z"/></svg></button>'
   +'<div id="rv-wa-pop" role="dialog" aria-label="RobotVerse AI chat">'
   +'<div id="rv-wa-head"><div class="rv-av">RV</div><div><b>RobotVerse AI</b><span>Online • Typically replies instantly</span></div><button id="rv-wa-close" aria-label="Close">&times;</button></div>'
   +'<div id="rv-wa-body"><div id="rv-wa-msg">\\ud83d\\udc4b Hello! I\\u2019m RobotVerse AI Assistant.\\n\\nI can help you with:\\n\\u2022 Robots &amp; cobots\\n\\u2022 Spare parts &amp; EOAT\\n\\u2022 Services &amp; integrators\\n\\u2022 Auctions, logistics &amp; finance\\n\\nHow can I help you today?</div></div>'
   +'<div id="rv-wa-foot"><input id="rv-wa-input" placeholder="Type a message..." /><button id="rv-wa-send" aria-label="Send"><svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg></button></div>'
   +'</div>';
  var fab=document.getElementById("rv-wa-fab"),pop=document.getElementById("rv-wa-pop"),
      badge=document.getElementById("rv-wa-badge"),input=document.getElementById("rv-wa-input");
  function open(){pop.classList.add("rv-open");badge.style.display="none";setTimeout(function(){input.focus();},220);}
  function close(){pop.classList.remove("rv-open");}
  fab.addEventListener("click",function(e){e.stopPropagation();pop.classList.contains("rv-open")?close():open();});
  document.getElementById("rv-wa-close").addEventListener("click",close);
  document.addEventListener("click",function(e){if(pop.classList.contains("rv-open")&&!pop.contains(e.target)&&e.target!==fab)close();});
  function send(){var t=input.value.trim();if(!t)return;window.open("https://wa.me/"+PHONE+"?text="+encodeURIComponent(t),"_blank","noopener");input.value="";}
  document.getElementById("rv-wa-send").addEventListener("click",send);
  input.addEventListener("keydown",function(e){if(e.key==="Enter")send();});
  setTimeout(function(){if(!pop.classList.contains("rv-open"))open();},5000);
})();
</script>
<!-- End RobotVerse WhatsApp Widget -->`;
}
