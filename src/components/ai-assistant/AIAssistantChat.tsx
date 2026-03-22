import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send, Square, Trash2, Bot, User, LogIn, Sparkles, Clock, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAIAssistant, AIMessage } from '@/hooks/useAIAssistant';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface AIAssistantChatProps {
  fullPage?: boolean;
  className?: string;
}

const QUICK_PROMPTS = [
  { icon: '🤖', text: 'Show me welding robots', query: 'Show me welding robots' },
  { icon: '📦', text: 'Palletizing robot under 20 lakh', query: 'Palletizing robot under 20 lakh' },
  { icon: '🔧', text: 'FANUC spare parts', query: 'FANUC spare parts' },
  { icon: '🏭', text: 'Service providers in Chennai', query: 'Service providers in Chennai' },
];

const AIAssistantChat: React.FC<AIAssistantChatProps> = ({ fullPage = false, className }) => {
  const { messages, isLoading, error, sendMessage, clearChat, stopGeneration, canQuery, remainingFree, isLoggedIn } = useAIAssistant();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (scrollEl) {
      const viewport = scrollEl.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [messages, isLoading]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    sendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={cn(
      'flex flex-col overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-b from-card to-background shadow-xl',
      fullPage ? 'h-[calc(100vh-12rem)] max-w-5xl mx-auto w-full' : 'h-[480px] w-[380px]',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-primary/15 via-primary/10 to-primary/5 border-b border-border/40 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md">
              <Bot className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-primary rounded-full border-2 border-card" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-foreground tracking-tight">RobotVerse AI</h3>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
              Online • Industrial Robot Expert
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isLoggedIn && (
            <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-background/50 border-primary/30 text-primary">
              {remainingFree} free left
            </Badge>
          )}
          {messages.length > 0 && (
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive" onClick={clearChat} title="Clear chat">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className={cn("flex-1", fullPage ? "px-6 py-5" : "px-3 py-3")} ref={scrollRef}>
        {messages.length === 0 ? (
          <EmptyState onPromptClick={(query) => { setInput(query); sendMessage(query); }} fullPage={fullPage} />
        ) : (
          <div className="space-y-5">
            {messages.map((msg, i) => (
              <MessageBubble key={i} message={msg} index={i} fullPage={fullPage} />
            ))}
            {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shrink-0 shadow-sm">
                  <Bot className="w-4 h-4 text-primary-foreground" />
                </div>
                <div className="bg-card border border-border/40 rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm">
                  <div className="flex items-center gap-3 text-muted-foreground text-sm">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-xs font-medium">Searching database...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error / Login prompt */}
        {error === 'login_required' && (
          <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-destructive/10 to-destructive/5 border border-destructive/20 text-center">
            <p className="text-sm text-foreground font-semibold mb-1">Free queries exhausted</p>
            <p className="text-xs text-muted-foreground mb-3">Sign in for unlimited AI assistance</p>
            <Button size="sm" className="text-xs h-9 px-4 rounded-lg" onClick={() => navigate('/auth')}>
              <LogIn className="w-3.5 h-3.5 mr-1.5" /> Sign In / Register
            </Button>
          </div>
        )}
        {error && error !== 'login_required' && (
          <div className="mt-3 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive">
            {error}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t border-border/40 bg-background/80 backdrop-blur-sm">
        <div className="flex gap-2 items-center">
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={canQuery ? 'Ask about robots, parts, services...' : 'Sign in to continue...'}
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

/* ─── Empty State ─── */
const EmptyState: React.FC<{ onPromptClick: (query: string) => void; fullPage?: boolean }> = ({ onPromptClick, fullPage }) => (
  <div className="flex flex-col items-center justify-center h-full gap-5 py-10">
    <div className="relative">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20">
        <Sparkles className="w-8 h-8 text-primary" />
      </div>
      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-green-500 border-2 border-card flex items-center justify-center">
        <MessageSquare className="w-2.5 h-2.5 text-white" />
      </div>
    </div>
    <div className="text-center space-y-1.5">
      <p className="font-bold text-foreground text-base">How can I help you today?</p>
      <p className="text-sm text-muted-foreground">Ask about robots, spare parts, or services</p>
    </div>
    <div className={cn("grid gap-2.5 w-full", fullPage ? "grid-cols-2 max-w-lg" : "grid-cols-1 max-w-xs")}>
      {QUICK_PROMPTS.map((prompt) => (
        <button
          key={prompt.query}
          onClick={() => onPromptClick(prompt.query)}
          className="flex items-center gap-2.5 text-left text-sm px-4 py-3 rounded-xl border border-border/50 bg-card hover:bg-accent/50 hover:border-primary/30 transition-all duration-200 text-foreground group shadow-sm hover:shadow-md"
        >
          <span className="text-lg">{prompt.icon}</span>
          <span className="group-hover:text-primary transition-colors">{prompt.text}</span>
        </button>
      ))}
    </div>
  </div>
);

/* ─── Message Bubble ─── */
const MessageBubble: React.FC<{ message: AIMessage; index: number; fullPage?: boolean }> = ({ message, index, fullPage }) => {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shrink-0 mt-1 shadow-sm">
          <Bot className="w-4 h-4 text-primary-foreground" />
        </div>
      )}
      <div className={cn(
        'rounded-2xl shadow-sm',
        isUser
          ? 'max-w-[75%] bg-gradient-to-br from-primary to-primary/85 text-primary-foreground px-4 py-3 rounded-tr-sm'
          : cn('bg-card border border-border/40 text-foreground px-5 py-4 rounded-tl-sm', fullPage ? 'max-w-[88%]' : 'max-w-[92%]')
      )}>
        {isUser ? (
          <p className="text-sm leading-relaxed">{message.content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none
            text-[13.5px] leading-[1.7]

            [&>h2]:text-base [&>h2]:font-bold [&>h2]:mt-5 [&>h2]:mb-2.5 [&>h2]:text-foreground [&>h2]:flex [&>h2]:items-center [&>h2]:gap-2

            [&>h3]:text-[15px] [&>h3]:font-bold [&>h3]:mt-5 [&>h3]:mb-2 [&>h3]:text-foreground
            [&>h3]:border-b [&>h3]:border-primary/20 [&>h3]:pb-2

            [&>p]:my-2 [&>p]:text-muted-foreground [&>p]:leading-relaxed
            [&>p>strong]:text-foreground [&>p>strong]:font-semibold

            [&>ul]:pl-5 [&>ul]:my-2.5 [&>ul]:space-y-2
            [&>ol]:pl-5 [&>ol]:my-2.5 [&>ol]:space-y-2
            [&_li]:my-0 [&_li]:text-muted-foreground [&_li]:leading-relaxed
            [&_li>strong]:text-foreground [&_li>strong]:font-semibold
            [&_li::marker]:text-primary

            [&>hr]:my-4 [&>hr]:border-border/20

            [&_table]:text-xs [&_table]:w-full [&_table]:my-4 [&_table]:rounded-xl [&_table]:overflow-hidden
            [&_table]:border [&_table]:border-border/30 [&_table]:shadow-sm
            [&_thead]:bg-primary/10
            [&_th]:px-3 [&_th]:py-2.5 [&_th]:text-left [&_th]:font-semibold [&_th]:text-foreground
            [&_th]:border-b [&_th]:border-border/30 [&_th]:text-xs [&_th]:uppercase [&_th]:tracking-wider
            [&_td]:px-3 [&_td]:py-2.5 [&_td]:border-b [&_td]:border-border/10 [&_td]:text-muted-foreground [&_td]:text-xs
            [&_tr:hover]:bg-accent/30 [&_tr]:transition-colors [&_tr:last-child_td]:border-b-0
            [&_tbody_tr:nth-child(even)]:bg-muted/20

            [&>blockquote]:border-l-[3px] [&>blockquote]:border-primary/50 [&>blockquote]:pl-4 [&>blockquote]:py-2 [&>blockquote]:my-3
            [&>blockquote]:italic [&>blockquote]:text-muted-foreground [&>blockquote]:bg-primary/5 [&>blockquote]:rounded-r-xl

            [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded-md [&_code]:text-xs [&_code]:font-mono [&_code]:text-primary

            [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:text-primary/80
          ">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
      </div>
      {isUser && (
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-1 border border-primary/20">
          <User className="w-4 h-4 text-primary" />
        </div>
      )}
    </div>
  );
};

export default AIAssistantChat;
