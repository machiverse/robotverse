import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Send, Square, Trash2, Bot, User, LogIn, Sparkles, MessageSquare, Copy, Check, FileSearch, Cpu, Grip, Wrench, Truck, Banknote, Cog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAIAssistantContext, AIMessage } from "@/contexts/AIAssistantContext";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import UserProductRequestModal from "@/components/UserProductRequestModal";

interface AIAssistantChatProps {
  fullPage?: boolean;
  className?: string;
}

const CATEGORY_TABS = [
  {
    id: "robots",
    label: "Robots",
    icon: Bot,
    prompts: [
      { icon: "🤖", text: "Welding robots under ₹25 lakh", query: "Show welding robots under 25 lakh with payload, reach and brand details" },
      { icon: "📦", text: "Palletizing robots comparison", query: "Compare palletizing robots by payload capacity, reach and price" },
      { icon: "🏭", text: "Collaborative robots (Cobots)", query: "List all collaborative robots with safety features and applications" },
      { icon: "🔄", text: "SCARA robots for assembly", query: "Show SCARA robots suitable for pick-and-place and assembly applications" },
    ],
  },
  {
    id: "eoat",
    label: "EOAT",
    icon: Grip,
    prompts: [
      { icon: "🦾", text: "Grippers for welding robots", query: "Show EOAT grippers compatible with welding robots" },
      { icon: "🔩", text: "Vacuum end effectors", query: "List vacuum-based end effectors for palletizing and material handling" },
      { icon: "⚙️", text: "Tool changers & adapters", query: "Show automatic tool changers and EOAT adapters with compatibility info" },
      { icon: "📐", text: "Custom EOAT solutions", query: "Find custom end-of-arm tooling solutions for specific applications" },
    ],
  },
  {
    id: "spares",
    label: "Spare Parts",
    icon: Cpu,
    prompts: [
      { icon: "🔧", text: "FANUC spare parts", query: "Show FANUC spare parts — controllers, teach pendants, servo motors" },
      { icon: "⚡", text: "ABB robot components", query: "List ABB robot spare parts with pricing and availability" },
      { icon: "🎛️", text: "Controllers & drives", query: "Show robot controllers and servo drives across all brands" },
      { icon: "📟", text: "Teach pendants available", query: "List teach pendants for all robot brands with condition and price" },
    ],
  },
  {
    id: "services",
    label: "Services",
    icon: Wrench,
    prompts: [
      { icon: "🏗️", text: "System integrators near me", query: "Find robot system integrators and their specializations by location" },
      { icon: "💻", text: "Robot programmers", query: "Show robot programming service providers — offline, online, PLC integration" },
      { icon: "🔬", text: "Application engineers", query: "List application engineering services for welding, painting, material handling" },
      { icon: "🛠️", text: "Maintenance & repair", query: "Find robot maintenance, repair and annual maintenance contract providers" },
    ],
  },
  {
    id: "logistics",
    label: "Logistics",
    icon: Truck,
    prompts: [
      { icon: "🚛", text: "Heavy equipment transport", query: "Show logistics providers for heavy industrial robot transport" },
      { icon: "📦", text: "Inter-city robot shipping", query: "Find inter-city shipping services for robots and industrial equipment" },
      { icon: "🌍", text: "International shipping", query: "List international shipping and customs clearance for robot imports" },
      { icon: "🏪", text: "Warehousing services", query: "Show warehousing and storage services for industrial automation equipment" },
    ],
  },
  {
    id: "financing",
    label: "Financing",
    icon: Banknote,
    prompts: [
      { icon: "💰", text: "Equipment finance options", query: "Show equipment financing and leasing options for industrial robots" },
      { icon: "🏦", text: "Business loans for automation", query: "List business loan providers for industrial automation projects" },
      { icon: "📊", text: "EMI calculator for robots", query: "Calculate EMI options for robot purchases under different loan tenures" },
      { icon: "🚀", text: "Startup funding schemes", query: "Show startup and MSME funding schemes for robotics and automation" },
    ],
  },
];

const AIAssistantChat: React.FC<AIAssistantChatProps> = ({ fullPage = false, className }) => {
  const { messages, isLoading, error, sendMessage, clearChat, stopGeneration, canQuery, remainingFree, isLoggedIn, lastResultCounts, lastUserQuery } =
    useAIAssistantContext();

  const [input, setInput] = useState("");
  const [showRequestModal, setShowRequestModal] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant')?.content?.toLowerCase() || '';
  const aiSaysNotFound = lastAssistantMsg.match(/no\s+(exact\s+)?match|not\s+(available|found)|cannot\s+find|don'?t\s+have|couldn'?t\s+find|no\s+\w+\s+(robots?|parts?|spare|eoat|services?)\s+(found|available|listed|in)/i);

  const hasLowResults = !isLoading && messages.length > 0 && messages[messages.length - 1]?.role === 'assistant' && (
    (lastResultCounts && (lastResultCounts.robots + lastResultCounts.spareParts + lastResultCounts.services) === 0) ||
    !!aiSaysNotFound
  );

  const detectProductType = (): 'robot' | 'spare_part' | 'service' | undefined => {
    const q = lastUserQuery.toLowerCase();
    if (q.match(/spare|part|eoat|gripper|sensor|controller|component|pendant/)) return 'spare_part';
    if (q.match(/service|maintenance|repair|integrat|program/)) return 'service';
    return 'robot';
  };

  const latestUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content || '';
  const requestQuery = lastUserQuery.trim() || latestUserMessage;
  const lastMessageRole = messages[messages.length - 1]?.role;

  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (scrollEl) {
      const viewport = scrollEl.querySelector("[data-radix-scroll-area-viewport]") as HTMLElement | null;
      if (viewport) viewport.scrollTop = viewport.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = () => {
    if (!input.trim() || isLoading || !canQuery) return;
    sendMessage(input.trim());
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-b from-card to-background shadow-xl",
        fullPage ? "h-[calc(100vh-12rem)] max-w-5xl mx-auto w-full" : "h-[480px] w-full max-w-[380px]",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 sm:px-5 py-3 bg-gradient-to-r from-primary/15 via-primary/10 to-primary/5 border-b border-border/40 backdrop-blur-sm mt-8">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md">
              <Bot className="w-4.5 h-4.5 text-primary-foreground" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-primary rounded-full border-2 border-card" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-foreground tracking-tight">RobotVerse AI</h3>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
              Online • Industrial Robot Expert
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {!isLoggedIn && (
            <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-background/50 border-primary/30 text-primary">
              {remainingFree} free left
            </Badge>
          )}
          {messages.length > 0 && (
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-destructive/10 hover:text-destructive" onClick={clearChat} title="Clear chat">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className={cn("flex-1", fullPage ? "px-3 sm:px-6 py-5" : "px-3 py-3")} ref={scrollRef}>
        {messages.length === 0 ? (
          <EmptyState
            onPromptClick={(query) => {
              setInput(query);
              sendMessage(query);
            }}
            fullPage={fullPage}
          />
        ) : (
          <div className="space-y-5">
            {messages.map((msg, i) => (
              <MessageBubble key={i} message={msg} />
            ))}
            {isLoading && lastMessageRole !== "assistant" && <AssistantThinking />}
          </div>
        )}

        {hasLowResults && (
          <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 border border-primary/20 animate-fade-in">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <FileSearch className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">Can't find what you need?</p>
                <p className="text-xs text-muted-foreground mt-0.5 mb-3">Submit a request and our team will connect you with the right sellers and providers.</p>
                <Button size="sm" className="h-8 text-xs rounded-lg px-4 shadow-sm" onClick={() => setShowRequestModal(true)}>
                  <FileSearch className="w-3.5 h-3.5 mr-1.5" />
                  Submit a Request
                </Button>
              </div>
            </div>
          </div>
        )}

        {error === "login_required" && <LoginRequiredBanner remainingFree={remainingFree} />}
        {error && error !== "login_required" && (
          <div className="mt-3 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive">{error}</div>
        )}
      </ScrollArea>

      <UserProductRequestModal open={showRequestModal} onOpenChange={setShowRequestModal} defaultProductType={detectProductType()} initialQuery={requestQuery} />

      {/* Input */}
      <div className="p-3 border-t border-border/40 bg-background/80 backdrop-blur-sm">
        <div className="flex gap-2 items-center">
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={canQuery ? "Ask about robots, EOAT, integrators, services..." : "Sign in to continue..."}
              disabled={!canQuery || isLoading}
              className="text-sm h-10 rounded-xl border-border/50 bg-muted/30 pr-3 focus:bg-background transition-colors"
            />
          </div>
          {isLoading ? (
            <Button size="icon" variant="outline" className="h-10 w-10 shrink-0 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10" onClick={stopGeneration}>
              <Square className="w-4 h-4" />
            </Button>
          ) : (
            <Button size="icon" className="h-10 w-10 shrink-0 rounded-xl shadow-md" onClick={handleSend} disabled={!input.trim() || !canQuery}>
              <Send className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─── Empty State with Category Tabs ─── */

const EmptyState: React.FC<{
  onPromptClick: (query: string) => void;
  fullPage?: boolean;
}> = ({ onPromptClick, fullPage }) => (
  <div className="flex flex-col items-center gap-4 py-4 sm:py-6 h-full">
    {/* Hero */}
    <div className="text-center space-y-1.5">
      <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20 mb-2">
        <Sparkles className="w-6 h-6 text-primary" />
      </div>
      <p className="font-bold text-foreground text-sm sm:text-base">What are you looking for?</p>
      <p className="text-xs text-muted-foreground">Select a category and click any prompt to get started</p>
    </div>

    {/* Category Tabs */}
    <Tabs defaultValue="robots" className="w-full flex-1 flex flex-col min-h-0">
      <TabsList className="w-full h-auto flex flex-wrap gap-1 bg-muted/50 p-1.5 rounded-xl justify-start">
        {CATEGORY_TABS.map((cat) => {
          const Icon = cat.icon;
          return (
            <TabsTrigger
              key={cat.id}
              value={cat.id}
              className="flex items-center gap-1.5 text-[11px] sm:text-xs px-2.5 sm:px-3 py-1.5 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all"
            >
              <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="hidden xs:inline sm:inline">{cat.label}</span>
              <span className="xs:hidden sm:hidden">{cat.label.slice(0, 4)}</span>
            </TabsTrigger>
          );
        })}
      </TabsList>

      {CATEGORY_TABS.map((cat) => (
        <TabsContent key={cat.id} value={cat.id} className="flex-1 mt-3">
          <div className={cn("grid gap-2", fullPage ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1")}>
            {cat.prompts.map((prompt) => (
              <button
                key={prompt.query}
                onClick={() => onPromptClick(prompt.query)}
                className="flex items-center gap-2.5 text-left text-xs sm:text-sm px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-border/50 bg-card hover:bg-accent/50 hover:border-primary/30 transition-all duration-200 text-foreground group shadow-sm hover:shadow-md"
              >
                <span className="text-base sm:text-lg shrink-0">{prompt.icon}</span>
                <span className="group-hover:text-primary transition-colors leading-snug">{prompt.text}</span>
              </button>
            ))}
          </div>
        </TabsContent>
      ))}
    </Tabs>
  </div>
);

/* ─── Loading / chain state ─── */

const AssistantThinking = () => (
  <div className="flex items-start gap-3">
    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shrink-0 shadow-sm">
      <Bot className="w-4 h-4 text-primary-foreground" />
    </div>
    <div className="bg-card border border-border/40 rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm">
      <div className="flex flex-col gap-2 text-muted-foreground text-xs">
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
          <span className="text-[11px] font-medium">Searching RobotVerse database...</span>
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          <Badge variant="outline" className="h-4 text-[10px] px-1.5">Query intent</Badge>
          <Badge variant="outline" className="h-4 text-[10px] px-1.5">Product & service matching</Badge>
          <Badge variant="outline" className="h-4 text-[10px] px-1.5">Ranking & summary</Badge>
        </div>
      </div>
    </div>
  </div>
);

/* ─── Login Banner ─── */

const LoginRequiredBanner: React.FC<{ remainingFree: number }> = ({ remainingFree }) => {
  const navigate = useNavigate();
  return (
    <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-destructive/10 to-destructive/5 border border-destructive/20 text-center">
      <p className="text-sm text-foreground font-semibold mb-1">Free queries exhausted</p>
      <p className="text-xs text-muted-foreground mb-3">Sign in for unlimited AI assistance</p>
      <Button size="sm" className="text-xs h-9 px-4 rounded-lg" onClick={() => navigate("/auth")}>
        <LogIn className="w-3.5 h-3.5 mr-1.5" /> Sign In / Register
      </Button>
    </div>
  );
};

/* ─── Message Bubble ─── */

const MessageBubble: React.FC<{ message: AIMessage }> = ({ message }) => {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {}
  };

  return (
    <div className={cn("flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shrink-0 mt-1 shadow-sm">
          <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary-foreground" />
        </div>
      )}
      <div
        className={cn(
          "rounded-2xl shadow-sm relative",
          isUser
            ? "max-w-[85%] sm:max-w-[75%] bg-gradient-to-br from-primary to-primary/85 text-primary-foreground px-3 sm:px-4 py-3 rounded-tr-sm"
            : "bg-card border border-border/40 text-foreground px-3 sm:px-5 py-3 sm:py-4 rounded-tl-sm max-w-[95%] sm:max-w-[92%]",
        )}
      >
        {!isUser && (
          <button onClick={handleCopy} className="absolute top-2 right-2 text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            {copied ? (<><Check className="w-3 h-3" />Copied</>) : (<><Copy className="w-3 h-3" />Copy</>)}
          </button>
        )}

        {isUser ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div
            className="prose prose-sm dark:prose-invert max-w-none
            text-[13px] sm:text-[13.5px] leading-[1.7]
            [&>h2]:text-sm [&>h2]:sm:text-base [&>h2]:font-bold [&>h2]:mt-5 [&>h2]:mb-2.5 [&>h2]:text-foreground
            [&>h3]:text-[14px] [&>h3]:sm:text-[15px] [&>h3]:font-bold [&>h3]:mt-5 [&>h3]:mb-2 [&>h3]:text-foreground [&>h3]:border-b [&>h3]:border-primary/20 [&>h3]:pb-2
            [&>p]:my-2 [&>p]:text-muted-foreground [&>p]:leading-relaxed
            [&>p>strong]:text-foreground [&>p>strong]:font-semibold
            [&>ul]:pl-4 [&>ul]:sm:pl-5 [&>ul]:my-2.5 [&>ul]:space-y-2
            [&>ol]:pl-4 [&>ol]:sm:pl-5 [&>ol]:my-2.5 [&>ol]:space-y-2
            [&_li]:my-0 [&_li]:text-muted-foreground [&_li]:leading-relaxed
            [&_li>strong]:text-foreground [&_li>strong]:font-semibold
            [&_li::marker]:text-primary
            [&>hr]:my-4 [&>hr]:border-border/30
            [&_table]:text-xs [&_table]:w-full [&_table]:my-4
            [&_table]:border [&_table]:border-primary/20 [&_table]:shadow-md
            [&_thead]:bg-gradient-to-r [&_thead]:from-primary/15 [&_thead]:to-primary/5
            [&_th]:px-2 [&_th]:sm:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-bold [&_th]:text-foreground
            [&_th]:border-b-2 [&_th]:border-primary/30 [&_th]:text-[10px] [&_th]:sm:text-[11px] [&_th]:uppercase [&_th]:tracking-wider [&_th]:whitespace-nowrap
            [&_td]:px-2 [&_td]:sm:px-3 [&_td]:py-2 [&_td]:border-b [&_td]:border-border/20 [&_td]:text-muted-foreground [&_td]:text-xs
            [&_td>strong]:text-foreground [&_td>strong]:font-semibold
            [&_tr:hover]:bg-primary/5 [&_tr]:transition-colors
            [&_tbody_tr:nth-child(even)]:bg-muted/30
            [&_tbody_tr:nth-child(odd)]:bg-background/50
            [&>blockquote]:border-l-[3px] [&>blockquote]:border-primary/50 [&>blockquote]:pl-4 [&>blockquote]:py-2.5 [&>blockquote]:my-3
            [&>blockquote]:text-muted-foreground [&>blockquote]:bg-primary/5 [&>blockquote]:rounded-r-xl
            [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded-md [&_code]:text-xs [&_code]:font-mono [&_code]:text-primary
            [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:text-primary/80
          "
          >
            <div className="w-full overflow-x-auto">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
      {isUser && (
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-1 border border-primary/20">
          <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
        </div>
      )}
    </div>
  );
};

export default AIAssistantChat;
