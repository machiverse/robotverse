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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const cleanupAuthState = () => {
  console.log('🧹 Cleaning up auth caches...');
  const keysToRemove = ['supabase.auth.token'];
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🚀 Initializing auth state...');
    
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔄 Auth state change:', event, session ? 'User logged in' : 'User logged out');
        setSession(session);
        setUser(session?.user ?? null);
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setLoading(false);
        }
      }
    );

    return () => {
      console.log('🧹 Cleaning up auth subscription');
      subscription.unsubscribe();
    };
  }, []);

  // ✅ Modified signUp for email confirmation
  const signUp = useCallback(
    async (email: string, password: string, fullName?: string) => {
      try {
        console.log('🚀 Starting signup with email confirmation for:', email);
        
        // Determine the correct redirect URL based on current domain
        const currentHost = window.location.hostname;
        let redirectUrl = `${window.location.origin}/auth`;
        
        // If we're on www.robotverse.in, use that as the redirect
        if (currentHost === 'www.robotverse.in' || currentHost === 'robotverse.in') {
          redirectUrl = 'https://www.robotverse.in/auth';
        }
        
        console.log('📧 Email confirmation redirect URL:', redirectUrl);
        
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              full_name: fullName || ''
            }
          }
        });

        if (error) {
          console.error('❌ Signup error:', error.message);
          return { user: null, error };
        }

        if (data.user) {
          console.log('✅ User created successfully:', data.user.id);
          console.log('📧 Email confirmation required:', !data.user.email_confirmed_at);
          
          // Don't update local state until email is confirmed
          if (data.user.email_confirmed_at) {
            setUser(data.user);
            setSession(data.session);
          }
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
        
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
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

  const signOut = useCallback(async () => {
    try {
      console.log('👋 Signing out user...');
      cleanupAuthState();
      await supabase.auth.signOut({ scope: 'global' });
      console.log('✅ Sign out successful, redirecting...');
      window.location.href = '/auth';
    } catch (error) {
      console.error('❌ Error signing out:', error);
      window.location.href = '/auth';
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      session,
      loading,
      signUp,
      signIn,
      signOut,
      cleanupAuthState,
    }),
    [user, session, loading, signUp, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export { cleanupAuthState };
