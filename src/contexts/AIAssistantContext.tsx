import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';

export type AIMessage = { role: 'user' | 'assistant'; content: string; timestamp?: number };

const FREE_QUERY_LIMIT = 3;
const STORAGE_KEY = 'robotverse_ai_queries';
const HISTORY_KEY = 'robotverse_ai_history';

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

function loadHistory(): AIMessage[] {
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return [];
}

function saveHistory(messages: AIMessage[]) {
  try {
    // Keep last 50 messages to avoid storage bloat
    const toSave = messages.slice(-50);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(toSave));
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
}

const AIAssistantContext = createContext<AIAssistantContextType | null>(null);

export const AIAssistantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<AIMessage[]>(() => loadHistory());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const queriesUsed = getQueryCount();
  const canQuery = !!user || queriesUsed < FREE_QUERY_LIMIT;
  const remainingFree = Math.max(0, FREE_QUERY_LIMIT - queriesUsed);

  const sendMessage = useCallback(async (input: string) => {
    if (!input.trim()) return;

    if (!user && getQueryCount() >= FREE_QUERY_LIMIT) {
      setError('login_required');
      return;
    }

    const userMsg: AIMessage = { role: 'user', content: input, timestamp: Date.now() };
    
    setMessages(prev => {
      const updated = [...prev, userMsg];
      saveHistory(updated);
      return updated;
    });
    setIsLoading(true);
    setError(null);

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

      setMessages(prev => {
        const updated = [...prev, assistantMsg];
        saveHistory(updated);
        return updated;
      });
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('AI Assistant error:', err);
        setError(err.message || 'Something went wrong');
      }
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [messages, user]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
    saveHistory([]);
  }, []);

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
    }}>
      {children}
    </AIAssistantContext.Provider>
  );
};

export function useAIAssistantContext() {
  const ctx = useContext(AIAssistantContext);
  if (!ctx) {
    // During HMR or edge cases, return a safe fallback instead of crashing
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
    } as AIAssistantContextType;
  }
  return ctx;
}
