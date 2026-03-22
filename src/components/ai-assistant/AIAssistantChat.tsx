import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send, Square, Trash2, Bot, User, LogIn, Sparkles } from 'lucide-react';
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
  '🤖 Show me welding robots',
  '📦 Palletizing robot under 20 lakh',
  '🔧 FANUC spare parts',
  '🏭 Service providers in Chennai',
];

const AIAssistantChat: React.FC<AIAssistantChatProps> = ({ fullPage = false, className }) => {
  const { messages, isLoading, error, sendMessage, clearChat, stopGeneration, canQuery, remainingFree, isLoggedIn } = useAIAssistant();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
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
      'flex flex-col bg-card border border-border rounded-xl overflow-hidden',
      fullPage ? 'h-[calc(100vh-12rem)] max-w-5xl mx-auto w-full' : 'h-[480px] w-[380px]',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-primary/10 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <Bot className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-foreground">RobotVerse AI</h3>
            <p className="text-[10px] text-muted-foreground">Find robots, parts & services</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {!isLoggedIn && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {remainingFree} free left
            </Badge>
          )}
          {messages.length > 0 && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={clearChat}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className={cn("flex-1 px-3 py-3", fullPage && "px-6 py-4")} ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 py-8">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-primary" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-foreground text-sm">How can I help you today?</p>
              <p className="text-xs text-muted-foreground mt-1">Ask about robots, spare parts, or services</p>
            </div>
            <div className="grid grid-cols-1 gap-2 w-full max-w-xs">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => { setInput(prompt); sendMessage(prompt); }}
                  className="text-left text-xs px-3 py-2 rounded-lg border border-border bg-background hover:bg-accent/50 transition-colors text-foreground"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg, i) => (
              <MessageBubble key={i} message={msg} />
            ))}
            {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className="flex items-center gap-2 text-muted-foreground text-xs px-2">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                Searching database...
              </div>
            )}
          </div>
        )}

        {/* Error / Login prompt */}
        {error === 'login_required' && (
          <div className="mt-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-center">
            <p className="text-xs text-foreground font-medium mb-2">Free queries exhausted</p>
            <p className="text-[11px] text-muted-foreground mb-3">Sign in for unlimited AI assistance</p>
            <Button size="sm" className="text-xs h-8" onClick={() => navigate('/auth')}>
              <LogIn className="w-3 h-3 mr-1" /> Sign In / Register
            </Button>
          </div>
        )}
        {error && error !== 'login_required' && (
          <div className="mt-3 p-2 rounded-lg bg-destructive/10 text-xs text-destructive">
            {error}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t border-border bg-background">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={canQuery ? 'Ask about robots, parts, services...' : 'Sign in to continue...'}
            disabled={!canQuery || isLoading}
            className="text-sm h-9"
          />
          {isLoading ? (
            <Button size="icon" variant="outline" className="h-9 w-9 shrink-0" onClick={stopGeneration}>
              <Square className="w-3.5 h-3.5" />
            </Button>
          ) : (
            <Button size="icon" className="h-9 w-9 shrink-0" onClick={handleSend} disabled={!input.trim() || !canQuery}>
              <Send className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

const MessageBubble: React.FC<{ message: AIMessage }> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex gap-2', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
          <Bot className="w-3 h-3 text-primary" />
        </div>
      )}
      <div className={cn(
        'max-w-[90%] rounded-lg px-3 py-2 text-sm',
        isUser
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted/60 border border-border text-foreground'
      )}>
        {isUser ? (
          <p>{message.content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none
            text-xs leading-relaxed
            [&>h3]:text-sm [&>h3]:font-bold [&>h3]:mt-3 [&>h3]:mb-1.5 [&>h3]:text-foreground [&>h3]:border-b [&>h3]:border-border/50 [&>h3]:pb-1
            [&>h2]:text-sm [&>h2]:font-bold [&>h2]:mt-3 [&>h2]:mb-1.5
            [&>p]:my-1 [&>p]:text-muted-foreground
            [&>p>strong]:text-foreground
            [&>ul]:pl-4 [&>ul]:my-1.5 [&>ul]:space-y-1
            [&_li]:my-0 [&_li]:text-muted-foreground
            [&_li>strong]:text-foreground [&_li>strong]:font-semibold
            [&>hr]:my-2 [&>hr]:border-border/40
            [&_table]:text-[11px] [&_table]:w-full [&_table]:my-2
            [&_th]:bg-primary/10 [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_th]:font-semibold [&_th]:text-foreground [&_th]:border [&_th]:border-border/30
            [&_td]:px-2 [&_td]:py-1 [&_td]:border [&_td]:border-border/20 [&_td]:text-muted-foreground
            [&_tr:hover]:bg-accent/30
            [&>blockquote]:border-l-2 [&>blockquote]:border-primary/40 [&>blockquote]:pl-3 [&>blockquote]:italic [&>blockquote]:text-muted-foreground
          ">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
      </div>
      {isUser && (
        <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-0.5">
          <User className="w-3 h-3 text-secondary-foreground" />
        </div>
      )}
    </div>
  );
};

export default AIAssistantChat;
