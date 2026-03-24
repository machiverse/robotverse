import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';

export type AIMessage = { role: 'user' | 'assistant'; content: string; timestamp?: number };

export type ResultCounts = {
  robots: number;
  spareParts: number;
  services: number;
  logistics: number;
  loanProducts: number;
  loanSchemes: number;
  sellers: number;
  blogs: number;
};

export type ChatSession = {
  id: string;
  title: string;
  messages: AIMessage[];
  createdAt: number;
  updatedAt: number;
};

const FREE_QUERY_LIMIT = 3;
const STORAGE_KEY = 'robotverse_ai_queries';
const SESSIONS_KEY = 'robotverse_ai_sessions';
const ACTIVE_SESSION_KEY = 'robotverse_ai_active_session';

function getQueryCount(): number {
  try {
    return parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
  } catch { return 0; }
}

function incrementQueryCount(): number {
  const count = getQueryCount() + 1;
  localStorage.setItem(STORAGE_KEY, String(count));
  return count;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function loadSessions(): ChatSession[] {
  try {
    const stored = localStorage.getItem(SESSIONS_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return [];
}

function saveSessions(sessions: ChatSession[]) {
  try {
    // Keep last 20 sessions
    const toSave = sessions.slice(-20);
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(toSave));
  } catch {}
}

function loadActiveSessionId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_SESSION_KEY);
  } catch { return null; }
}

function saveActiveSessionId(id: string) {
  try {
    localStorage.setItem(ACTIVE_SESSION_KEY, id);
  } catch {}
}

interface AIAssistantContextType {
  messages: AIMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (input: string) => Promise<void>;
  clearChat: () => void;
  stopGeneration: () => void;
  canQuery: boolean;
  remainingFree: number;
  isLoggedIn: boolean;
  lastResultCounts: ResultCounts | null;
  lastUserQuery: string;
  // Chat history
  sessions: ChatSession[];
  activeSessionId: string | null;
  startNewChat: () => void;
  switchSession: (id: string) => void;
  deleteSession: (id: string) => void;
}

const AIAssistantContext = createContext<AIAssistantContextType | null>(null);

export const AIAssistantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>(() => loadSessions());
  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => loadActiveSessionId());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResultCounts, setLastResultCounts] = useState<ResultCounts | null>(null);
  const [lastUserQuery, setLastUserQuery] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const queriesUsed = getQueryCount();
  const canQuery = !!user || queriesUsed < FREE_QUERY_LIMIT;
  const remainingFree = Math.max(0, FREE_QUERY_LIMIT - queriesUsed);

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const messages = activeSession?.messages || [];

  const updateSession = useCallback((sessionId: string, updater: (s: ChatSession) => ChatSession) => {
    setSessions(prev => {
      const updated = prev.map(s => s.id === sessionId ? updater(s) : s);
      saveSessions(updated);
      return updated;
    });
  }, []);

  const startNewChat = useCallback(() => {
    const newSession: ChatSession = {
      id: generateId(),
      title: 'New Chat',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setSessions(prev => {
      const updated = [...prev, newSession];
      saveSessions(updated);
      return updated;
    });
    setActiveSessionId(newSession.id);
    saveActiveSessionId(newSession.id);
    setError(null);
  }, []);

  const switchSession = useCallback((id: string) => {
    setActiveSessionId(id);
    saveActiveSessionId(id);
    setError(null);
  }, []);

  const deleteSession = useCallback((id: string) => {
    setSessions(prev => {
      const updated = prev.filter(s => s.id !== id);
      saveSessions(updated);
      return updated;
    });
    if (activeSessionId === id) {
      setActiveSessionId(null);
    }
  }, [activeSessionId]);

  const sendMessage = useCallback(async (input: string) => {
    if (!input.trim()) return;

    if (!user && getQueryCount() >= FREE_QUERY_LIMIT) {
      setError('login_required');
      return;
    }

    // Auto-create session if none active
    let currentSessionId = activeSessionId;
    if (!currentSessionId) {
      const newSession: ChatSession = {
        id: generateId(),
        title: input.slice(0, 40) + (input.length > 40 ? '...' : ''),
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setSessions(prev => {
        const updated = [...prev, newSession];
        saveSessions(updated);
        return updated;
      });
      currentSessionId = newSession.id;
      setActiveSessionId(currentSessionId);
      saveActiveSessionId(currentSessionId);
    }

    const userMsg: AIMessage = { role: 'user', content: input, timestamp: Date.now() };

    // Update title if first message
    updateSession(currentSessionId, s => ({
      ...s,
      title: s.messages.length === 0 ? input.slice(0, 40) + (input.length > 40 ? '...' : '') : s.title,
      messages: [...s.messages, userMsg],
      updatedAt: Date.now(),
    }));

    setIsLoading(true);
    setError(null);
    setLastUserQuery(input);
    setLastResultCounts(null);
    if (!user) incrementQueryCount();

    try {
      abortRef.current = new AbortController();
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/robotverse-ai-assistant`;

      const currentMessages = [...messages, userMsg];

      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: currentMessages.slice(-8),
          userQuery: input,
        }),
        signal: abortRef.current.signal,
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || `Request failed (${resp.status})`);
      }

      const data = await resp.json();
      const content = data.content || data.error || 'No response received';
      const assistantMsg: AIMessage = { role: 'assistant', content, timestamp: Date.now() };

      // Store result counts for "submit request" feature
      if (data.resultCounts) {
        setLastResultCounts(data.resultCounts as ResultCounts);
      }

      updateSession(currentSessionId, s => ({
        ...s,
        messages: [...s.messages, assistantMsg],
        updatedAt: Date.now(),
      }));
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('AI Assistant error:', err);
        setError(err.message || 'Something went wrong');
      }
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [messages, user, activeSessionId, updateSession]);

  const clearChat = useCallback(() => {
    if (activeSessionId) {
      updateSession(activeSessionId, s => ({ ...s, messages: [], updatedAt: Date.now() }));
    }
    setError(null);
  }, [activeSessionId, updateSession]);

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return (
    <AIAssistantContext.Provider value={{
      messages,
      isLoading,
      error,
      sendMessage,
      clearChat,
      stopGeneration,
      canQuery,
      remainingFree,
      isLoggedIn: !!user,
      sessions,
      activeSessionId,
      startNewChat,
      switchSession,
      deleteSession,
    }}>
      {children}
    </AIAssistantContext.Provider>
  );
};

export function useAIAssistantContext() {
  const ctx = useContext(AIAssistantContext);
  if (!ctx) {
    console.warn('useAIAssistantContext called outside AIAssistantProvider, returning defaults');
    return {
      messages: [] as AIMessage[],
      isLoading: false,
      error: null,
      sendMessage: async () => {},
      clearChat: () => {},
      stopGeneration: () => {},
      canQuery: false,
      remainingFree: 0,
      isLoggedIn: false,
      sessions: [] as ChatSession[],
      activeSessionId: null,
      startNewChat: () => {},
      switchSession: () => {},
      deleteSession: () => {},
    } as AIAssistantContextType;
  }
  return ctx;
}
