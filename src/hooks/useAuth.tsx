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
  /** Passwordless "magic-link" sign-in; returns any Supabase error */
  signInWithMagicLink: (email: string) => Promise<AuthError | null>;
  /** OAuth sign-in; provider example: 'google' | 'github' */
  signInWithOAuth: (provider: Parameters<typeof supabase.auth.signInWithOAuth>[0]['provider']) => Promise<AuthError | null>;
  /** Global sign-out (removes all local storage artefacts) */
  signOut: () => Promise<void>;
  /** Manual cleanup function */
  cleanupAuthState: () => void;
}

/*───────────────────────────────────────────────────────────────────────────
  Utilities
───────────────────────────────────────────────────────────────────────────*/
const purgeSupabaseCaches = () => {
  // Remove Supabase keys in both localStorage & sessionStorage
  [localStorage, sessionStorage].forEach((store) => {
    if (!store) return;
    Object.keys(store).forEach((k) => {
      if (k.startsWith('supabase.auth.') || k.includes('sb-')) {
        store.removeItem(k);
      }
    });
  });
};

/*───────────────────────────────────────────────────────────────────────────
  Context
───────────────────────────────────────────────────────────────────────────*/
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
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
      try {
        purgeSupabaseCaches();

        // Attempt global sign out first
        try {
          await supabase.auth.signOut({ scope: 'global' });
        } catch (err) {
          // Continue even if this fails
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            data: { full_name: fullName },
          },
        });
        return error;
      } catch (error) {
        return error as AuthError;
      }
    },
    []
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        purgeSupabaseCaches();

        // Attempt global sign out first
        try {
          await supabase.auth.signOut({ scope: 'global' });
        } catch (err) {
          // Continue even if this fails
        }

        const { error } = await supabase.auth.signInWithPassword({ 
          email, 
          password 
        });
        return error;
      } catch (error) {
        return error as AuthError;
      }
    },
    []
  );

  const signInWithMagicLink = useCallback(
    async (email: string) => {
      try {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        return error;
      } catch (error) {
        return error as AuthError;
      }
    },
    []
  );

  const signInWithOAuth = useCallback(
    async (
      provider: Parameters<typeof supabase.auth.signInWithOAuth>[0]['provider']
    ) => {
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: { redirectTo: `${window.location.origin}/auth/callback` },
        });
        return error;
      } catch (error) {
        return error as AuthError;
      }
    },
    []
  );

  const signOut = useCallback(async () => {
    try {
      purgeSupabaseCaches();
      await supabase.auth.signOut({ scope: 'global' }).catch(() => {});
      window.location.replace('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
      // Force redirect even if signOut fails
      window.location.replace('/auth');
    }
  }, []);

  const cleanupAuthState = useCallback(() => {
    purgeSupabaseCaches();
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
      cleanupAuthState,
    }),
    [user, session, loading, signUp, signIn, signInWithMagicLink, signInWithOAuth, signOut, cleanupAuthState]
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

// Export cleanup function for external use
export const cleanupAuthState = purgeSupabaseCaches;
