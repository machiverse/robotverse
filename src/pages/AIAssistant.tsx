import React, { useState } from 'react';
import { useNavigate } from '@/lib/router-compat';
import { Bot, Plus, Trash2, MessageSquare, Clock, PanelLeftOpen, PanelLeftClose, ArrowLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAIAssistantContext } from '@/contexts/AIAssistantContext';
import { UniversalSEOHead } from '@/components/SEO/UniversalSEOHead';
import AIAssistantChat from '@/components/ai-assistant/AIAssistantChat';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const AIAssistant = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { sessions, activeSessionId, startNewChat, switchSession, deleteSession } = useAIAssistantContext();

  const sortedSessions = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);

  // Group sessions by time
  const today = new Date();
  const todaySessions = sortedSessions.filter(s => {
    const d = new Date(s.updatedAt);
    return d.toDateString() === today.toDateString();
  });
  const yesterdaySessions = sortedSessions.filter(s => {
    const d = new Date(s.updatedAt);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return d.toDateString() === yesterday.toDateString();
  });
  const olderSessions = sortedSessions.filter(s => {
    const d = new Date(s.updatedAt);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return d < yesterday && d.toDateString() !== yesterday.toDateString();
  });

  const SessionGroup = ({ label, items }: { label: string; items: typeof sortedSessions }) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-3 mb-1.5">{label}</p>
        <div className="space-y-0.5">
          {items.map((session) => (
            <button
              key={session.id}
              onClick={() => switchSession(session.id)}
              className={cn(
                "w-full text-left px-3 py-2.5 rounded-xl group/item transition-all duration-150 relative",
                session.id === activeSessionId
                  ? "bg-primary/10 text-foreground"
                  : "hover:bg-muted/60 text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="flex items-center gap-2.5">
                <MessageSquare className={cn("w-3.5 h-3.5 shrink-0", session.id === activeSessionId ? "text-primary" : "text-muted-foreground/50")} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] truncate leading-tight">{session.title || 'New Chat'}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                  className="opacity-0 group-hover/item:opacity-100 text-destructive/50 hover:text-destructive transition-opacity p-1 rounded-md hover:bg-destructive/10"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              {session.id === activeSessionId && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-primary rounded-r-full" />
              )}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      <UniversalSEOHead
        pageType="home"
        title="AI Robot Assistant | RobotVerse"
        description="Use RobotVerse AI to find the perfect industrial robot, spare parts, and system integrators for your needs."
        keywords={['robot assistant', 'find industrial robots', 'robot recommendation', 'AI robot search']}
      />

      {/* Sidebar */}
      <div
        className={cn(
          "h-full flex flex-col border-r border-border/40 bg-muted/20 transition-all duration-300 shrink-0 overflow-hidden",
          sidebarOpen ? "w-72" : "w-0 md:w-16"
        )}
      >
        {/* Sidebar Header */}
        <div className={cn("flex items-center gap-2 p-3 border-b border-border/30", !sidebarOpen && "md:justify-center")}>
          {sidebarOpen ? (
            <>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-xs">
                <Bot className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-bold text-foreground tracking-tight">RobotVerse AI</h2>
                <p className="text-[10px] text-muted-foreground">Industrial Robot Expert</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg hover:bg-muted text-muted-foreground"
                onClick={() => setSidebarOpen(false)}
              >
                <PanelLeftClose className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <div className="hidden md:flex flex-col items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg hover:bg-muted text-muted-foreground"
                onClick={() => setSidebarOpen(true)}
              >
                <PanelLeftOpen className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* New Chat Button */}
        {sidebarOpen && (
          <div className="p-3">
            <Button
              onClick={startNewChat}
              variant="outline"
              className="w-full justify-start gap-2 h-10 rounded-xl text-sm border-dashed border-border/60 hover:border-primary/40 hover:bg-primary/5"
            >
              <Plus className="w-4 h-4" />
              New Chat
            </Button>
          </div>
        )}

        {!sidebarOpen && (
          <div className="hidden md:flex p-2 justify-center">
            <Button
              onClick={startNewChat}
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-lg hover:bg-primary/10 text-primary"
              title="New chat"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Sessions */}
        {sidebarOpen && (
          <ScrollArea className="flex-1 px-2">
            {sortedSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground/50 gap-3">
                <MessageSquare className="w-10 h-10" />
                <p className="text-xs">No conversations yet</p>
                <p className="text-[10px] text-center px-4">Start a new chat to search for robots, parts & services</p>
              </div>
            ) : (
              <div className="py-2">
                <SessionGroup label="Today" items={todaySessions} />
                <SessionGroup label="Yesterday" items={yesterdaySessions} />
                <SessionGroup label="Previous" items={olderSessions} />
              </div>
            )}
          </ScrollArea>
        )}

        {/* Bottom nav */}
        {sidebarOpen && (
          <div className="p-3 border-t border-border/30">
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 h-9 text-xs text-muted-foreground hover:text-foreground rounded-lg"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to RobotVerse
            </Button>
          </div>
        )}
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Mobile sidebar toggle */}
        {!sidebarOpen && (
          <div className="absolute top-3 left-3 z-10 md:hidden">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-lg bg-background/80 backdrop-blur-xs border border-border/40 shadow-xs"
              onClick={() => setSidebarOpen(true)}
            >
              <PanelLeftOpen className="w-4 h-4" />
            </Button>
          </div>
        )}

        <AIAssistantChat
          fullPage
          className="!rounded-none !border-0 !shadow-none !h-full !max-w-none !bg-transparent"
        />
      </div>
    </div>
  );
};

export default AIAssistant;
