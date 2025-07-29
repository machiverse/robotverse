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

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    fullName?: string
  ) => Promise<{ user: User | null; error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<AuthError | null>;
  signOut: () => Promise<void>;
  cleanupAuthState: () => void;
}

const purgeSupabaseCaches = () => {
  [localStorage, sessionStorage].forEach((store) => {
    if (!store) return;
    Object.keys(store).forEach((k) => {
      if (k.startsWith('supabase.auth.') || k.includes('sb-')) {
        store.removeItem(k);
      }
    });
  });
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data }) => {
      console.log('Initial session:', data.session);
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log('Auth state change:', event, newSession);
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ✅ Updated signUp to return both user and error
  const signUp = useCallback(
    async (email: string, password: string, fullName = '') => {
      try {
        console.log('🚀 Starting signup process...');
        purgeSupabaseCaches();

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            data: { full_name: fullName },
          },
        });

        console.log('Signup response:', { data, error });

        if (error) {
          console.error('❌ Signup error:', error);
          return { user: null, error };
        }

        // Return the user from signup response
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
        purgeSupabaseCaches();
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

  const signOut = useCallback(async () => {
    try {
      purgeSupabaseCaches();
      await supabase.auth.signOut({ scope: 'global' });
      window.location.replace('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
      window.location.replace('/auth');
    }
  }, []);

  const cleanupAuthState = useCallback(() => {
    purgeSupabaseCaches();
  }, []);

  const value: AuthContextType = useMemo(
    () => ({
      user,
      session,
      loading,
      signUp,
      signIn,
      signOut,
      cleanupAuthState,
    }),
    [user, session, loading, signUp, signIn, signOut, cleanupAuthState]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

export const cleanupAuthState = purgeSupabaseCaches;
