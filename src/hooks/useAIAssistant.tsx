import { useState, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';

export type AIMessage = { role: 'user' | 'assistant'; content: string };

const FREE_QUERY_LIMIT = 3;
const STORAGE_KEY = 'robotverse_ai_queries';

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

export function useAIAssistant() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const queriesUsed = getQueryCount();
  const canQuery = !!user || queriesUsed < FREE_QUERY_LIMIT;
  const remainingFree = Math.max(0, FREE_QUERY_LIMIT - queriesUsed);

  const sendMessage = useCallback(async (input: string) => {
    if (!input.trim()) return;

    if (!user && queriesUsed >= FREE_QUERY_LIMIT) {
      setError('login_required');
      return;
    }

    const userMsg: AIMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    setError(null);

    if (!user) incrementQueryCount();

    const allMessages = [...messages, userMsg];
    let assistantSoFar = '';

    try {
      abortRef.current = new AbortController();
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/robotverse-ai-assistant`;

      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: allMessages.slice(-8),
          userQuery: input,
        }),
        signal: abortRef.current.signal,
      });

      if (!resp.ok || !resp.body) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || `Request failed (${resp.status})`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';

      const upsertAssistant = (chunk: string) => {
        assistantSoFar += chunk;
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant') {
            return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
          }
          return [...prev, { role: 'assistant', content: assistantSoFar }];
        });
      };

      let streamDone = false;
      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') { streamDone = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) upsertAssistant(content);
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw || raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) upsertAssistant(content);
          } catch { /* ignore */ }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('AI Assistant error:', err);
        setError(err.message || 'Something went wrong');
      }
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [messages, user, queriesUsed]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearChat,
    stopGeneration,
    canQuery,
    remainingFree,
    isLoggedIn: !!user,
  };
}
