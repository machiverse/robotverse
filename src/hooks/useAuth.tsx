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
  /** Create an email-password user; returns user and error */
  signUp: (
    email: string,
    password: string,
    fullName?: string
  ) => Promise<{ user: User | null; error: AuthError | null }>;
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
  console.log('🧹 Cleaning up auth caches...');
  // Remove Supabase keys in both localStorage & sessionStorage
  [localStorage, sessionStorage].forEach((store) => {
    if (!store) return;
    Object.keys(store).forEach((k) => {
      if (k.startsWith('supabase.auth.') || k.includes('sb-')) {
        console.log('🗑️ Removing cache key:', k);
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
    console.log('🚀 Initializing auth state...');
    
    // Get initial session snapshot
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error('❌ Error getting initial session:', error);
      } else {
        console.log('📊 Initial session state:', data.session ? 'Authenticated' : 'Not authenticated');
      }
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    // React to all auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log('🔄 Auth state change:', event, newSession ? 'User logged in' : 'User logged out');
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      console.log('🧹 Cleaning up auth subscription');
      subscription.unsubscribe();
    };
  }, []);

  /*───────────────────────────────────────────────────────────────────────
    Auth helpers
  ────────────────────────────────────────────────────────────────────────*/
  const signUp = useCallback(
    async (email: string, password: string, fullName = '') => {
      try {
        console.log('🚀 Starting signup process for:', email);
        purgeSupabaseCaches();

        // Attempt global sign out first to clean state
        try {
          await supabase.auth.signOut({ scope: 'global' });
          console.log('✅ Previous session cleared');
        } catch (err) {
          console.log('⚠️ No previous session to clear');
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            data: { full_name: fullName },
          },
        });

        if (error) {
          console.error('❌ Signup error:', error.message);
          return { user: null, error };
        }

        if (data.user) {
          console.log('✅ User created successfully:', data.user.id);
          console.log('📧 Email confirmation required:', !data.user.email_confirmed_at);
        }

        return { user: data.user, error: null };
      } catch (error) {
        console.error('❌ Signup exception:', error);
        return { user: null, error: error as AuthError };
      }
    },
    []
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        console.log('🔐 Attempting sign in for:', email);
        purgeSupabaseCaches();

        // Attempt global sign out first
        try {
          await supabase.auth.signOut({ scope: 'global' });
        } catch (err) {
          console.log('⚠️ No previous session to clear');
        }

        const { data, error } = await supabase.auth.signInWithPassword({ 
          email, 
          password 
        });

        if (error) {
          console.error('❌ Sign in error:', error.message);
          return error;
        }

        if (data.user) {
          console.log('✅ Sign in successful for user:', data.user.id);
        }

        return null;
      } catch (error) {
        console.error('❌ Sign in exception:', error);
        return error as AuthError;
      }
    },
    []
  );

  const signInWithMagicLink = useCallback(
    async (email: string) => {
      try {
        console.log('📧 Sending magic link to:', email);
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        
        if (error) {
          console.error('❌ Magic link error:', error.message);
        } else {
          console.log('✅ Magic link sent successfully');
        }
        
        return error;
      } catch (error) {
        console.error('❌ Magic link exception:', error);
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
        console.log('🔗 Initiating OAuth with:', provider);
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: { redirectTo: `${window.location.origin}/auth/callback` },
        });
        
        if (error) {
          console.error('❌ OAuth error:', error.message);
        }
        
        return error;
      } catch (error) {
        console.error('❌ OAuth exception:', error);
        return error as AuthError;
      }
    },
    []
  );

  const signOut = useCallback(async () => {
    try {
      console.log('👋 Signing out user...');
      purgeSupabaseCaches();
      await supabase.auth.signOut({ scope: 'global' }).catch(() => {});
      console.log('✅ Sign out successful, redirecting...');
      window.location.replace('/auth');
    } catch (error) {
      console.error('❌ Error signing out:', error);
      // Force redirect even if signOut fails
      window.location.replace('/auth');
    }
  }, []);

  const cleanupAuthState = useCallback(() => {
    console.log('🧹 Manual auth state cleanup requested');
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
