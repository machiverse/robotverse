import React, { useState } from "react";
import { Bot, X, Maximize2, Minimize2, PanelLeftOpen, PanelLeftClose, Plus, Trash2, MessageSquare, Sparkles, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAIAssistantContext } from "@/contexts/AIAssistantContext";
import { cn } from "@/lib/utils";
import AIAssistantChat from "./AIAssistantChat";
import { format } from "date-fns";

const AIAssistantWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const navigate = useNavigate();
  const { sessions, activeSessionId, startNewChat, switchSession, deleteSession } = useAIAssistantContext();

  const sortedSessions = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);

  const handleToggleMaximize = () => {
    setIsMaximized(prev => !prev);
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 group"
          aria-label="Open RobotVerse AI Assistant"
        >
          <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 hover:scale-110 flex items-center justify-center">
            <Bot className="w-6 h-6" />
            {/* Pulse ring */}
            <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping" style={{ animationDuration: '3s' }} />
          </div>
          {/* Online indicator */}
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-emerald-400 rounded-full border-[2.5px] border-background shadow-sm" />
          {/* Tooltip */}
          <span className="absolute bottom-full right-0 mb-2 px-3 py-1.5 text-xs font-medium bg-foreground text-background rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg pointer-events-none">
            Ask RobotVerse AI ✨
          </span>
        </button>
      )}

      {/* Chat Popup */}
      {isOpen && (
        <>
          {/* Backdrop for maximized */}
          {isMaximized && (
            <div
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm animate-fade-in"
              onClick={() => setIsMaximized(false)}
            />
          )}

          <div
            className={cn(
              "fixed z-50 transition-all duration-300 ease-out",
              isMaximized
                ? "inset-4 md:inset-8 lg:inset-12"
                : "bottom-6 right-6"
            )}
          >
            <div
              className={cn(
                "flex bg-background/95 backdrop-blur-xl border border-border/50 shadow-2xl overflow-hidden transition-all duration-300",
                isMaximized
                  ? "rounded-2xl w-full h-full"
                  : "rounded-2xl animate-in slide-in-from-bottom-4 fade-in duration-300",
                !isMaximized && "h-[520px]",
                !isMaximized && showSidebar ? "w-[640px]" : !isMaximized ? "w-[400px]" : "",
              )}
            >
              {/* Chat History Sidebar */}
              <div
                className={cn(
                  "flex flex-col border-r border-border/40 bg-muted/30 transition-all duration-300 overflow-hidden shrink-0",
                  showSidebar ? (isMaximized ? "w-72" : "w-56") : "w-0"
                )}
              >
                {showSidebar && (
                  <>
                    {/* Sidebar Header */}
                    <div className="p-3 border-b border-border/30 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs font-semibold text-foreground tracking-tight">Chat History</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-lg hover:bg-primary/10 text-primary"
                        onClick={startNewChat}
                        title="New chat"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    {/* Sessions List */}
                    <div className="flex-1 overflow-y-auto py-1.5 px-1.5 space-y-0.5 scrollbar-thin">
                      {sortedSessions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2 py-8">
                          <MessageSquare className="w-8 h-8 opacity-30" />
                          <p className="text-[11px]">No conversations yet</p>
                        </div>
                      ) : (
                        sortedSessions.map((session) => (
                          <button
                            key={session.id}
                            onClick={() => switchSession(session.id)}
                            className={cn(
                              "w-full text-left px-3 py-2.5 rounded-lg group/item transition-all duration-150 relative",
                              session.id === activeSessionId
                                ? "bg-primary/10 border border-primary/20 text-foreground"
                                : "hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                            )}
                          >
                            <div className="flex items-start justify-between gap-1.5">
                              <div className="flex-1 min-w-0">
                                <p className="text-[12px] font-medium truncate leading-tight">
                                  {session.title || 'New Chat'}
                                </p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  {session.messages.length} msg · {format(new Date(session.updatedAt), 'MMM d')}
                                </p>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteSession(session.id);
                                }}
                                className="opacity-0 group-hover/item:opacity-100 text-destructive/60 hover:text-destructive transition-opacity p-0.5"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                            {session.id === activeSessionId && (
                              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full" />
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Main Chat Area */}
              <div className="flex-1 flex flex-col min-w-0 relative">
                {/* Custom top controls bar */}
                <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-2 py-1.5 bg-gradient-to-b from-background/90 to-transparent pointer-events-none">
                  <div className="flex items-center gap-1 pointer-events-auto">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-lg hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowSidebar(!showSidebar)}
                      title={showSidebar ? "Hide history" : "Show history"}
                    >
                      {showSidebar ? <PanelLeftClose className="w-3.5 h-3.5" /> : <PanelLeftOpen className="w-3.5 h-3.5" />}
                    </Button>
                  </div>

                  <div className="flex items-center gap-1 pointer-events-auto">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-lg hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                      onClick={handleToggleMaximize}
                      title={isMaximized ? "Minimize" : "Maximize"}
                    >
                      {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        setIsOpen(false);
                        setIsMaximized(false);
                        setShowSidebar(false);
                      }}
                      title="Close"
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                <AIAssistantChat
                  fullPage={isMaximized}
                  className={cn(
                    "!rounded-none !border-0 !shadow-none !h-full !w-full",
                    isMaximized ? "!max-w-none" : ""
                  )}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default AIAssistantWidget;
