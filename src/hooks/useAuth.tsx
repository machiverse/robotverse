/* src/hooks/useAuth.tsx */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
  useMemo,
} from 'react';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

/*───────────────────────────────────────────────────────────────────────────
  Types
───────────────────────────────────────────────────────────────────────────*/
interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  /** Create an email-password user; returns any Supabase error */
  signUp: (
    email: string,
    password: string,
    fullName?: string
  ) => Promise<AuthError | null>;
  /** Traditional email-password sign-in; returns any Supabase error */
  signIn: (email: string, password: string) => Promise<AuthError | null>;
  /** Passwordless “magic-link” sign-in; returns any Supabase error */
  signInWithMagicLink: (email: string) => Promise<AuthError | null>;
  /** OAuth sign-in; provider example: 'google' | 'github' */
  signInWithOAuth: (provider: Parameters<typeof supabase.auth.signInWithOAuth>[0]['provider']) => Promise<AuthError | null>;
  /** Global sign-out (removes all local storage artefacts) */
  signOut: () => Promise<void>;
}

/*───────────────────────────────────────────────────────────────────────────
  Utilities
───────────────────────────────────────────────────────────────────────────*/
const purgeSupabaseCaches = () => {
  // Remove Supabase keys in both localStorage & sessionStorage
  [localStorage, sessionStorage].forEach((store) => {
    if (!store) return;
    Object.keys(store).forEach((k) => {
      if (k.startsWith('supabase.auth.') || k.includes('sb-')) store.removeItem(k);
    });
  });
};

/*───────────────────────────────────────────────────────────────────────────
  Context
───────────────────────────────────────────────────────────────────────────*/
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser]       = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  /* ───── Establish one-time listener ───── */
  useEffect(() => {
    // Get initial session snapshot
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    // React to all auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  /*───────────────────────────────────────────────────────────────────────
    Auth helpers
  ────────────────────────────────────────────────────────────────────────*/
  const signUp = useCallback(
    async (email: string, password: string, fullName = '') => {
      purgeSupabaseCaches();

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: { full_name: fullName },
        },
      });
      return error;
    },
    []
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      purgeSupabaseCaches();

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return error;
    },
    []
  );

  const signInWithMagicLink = useCallback(
    async (email: string) => {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      return error;
    },
    []
  );

  const signInWithOAuth = useCallback(
    async (
      provider: Parameters<typeof supabase.auth.signInWithOAuth>[0]['provider']
    ) => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      return error;
    },
    []
  );

  const signOut = useCallback(async () => {
    purgeSupabaseCaches();
    await supabase.auth.signOut({ scope: 'global' }).catch(() => {});
    window.location.replace('/auth');
  }, []);

  /*───────────────────────────────────────────────────────────────────────
    Memoized context value
  ────────────────────────────────────────────────────────────────────────*/
  const value: AuthContextType = useMemo(
    () => ({
      user,
      session,
      loading,
      signUp,
      signIn,
      signInWithMagicLink,
      signInWithOAuth,
      signOut,
    }),
    [user, session, loading, signUp, signIn, signInWithMagicLink, signInWithOAuth, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/*───────────────────────────────────────────────────────────────────────────
  Hook
───────────────────────────────────────────────────────────────────────────*/
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
