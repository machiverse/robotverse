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
  // ✅ Fixed: signUp now returns both user and error as expected by Auth.tsx
  signUp: (
    email: string,
    password: string,
    fullName?: string
  ) => Promise<{ user: User | null; error: AuthError | null }>;
  // ✅ Fixed: signIn returns error directly as expected by Auth.tsx  
  signIn: (email: string, password: string) => Promise<AuthError | null>;
  signOut: () => Promise<void>;
  cleanupAuthState: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const cleanupAuthState = () => {
  console.log('🧹 Cleaning up auth caches...');
  // Remove standard auth tokens
  localStorage.removeItem('supabase.auth.token');
  
  // Remove all Supabase auth keys from localStorage
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      console.log('🗑️ Removing cache key:', key);
      localStorage.removeItem(key);
    }
  });
  
  // Remove from sessionStorage if in use
  Object.keys(sessionStorage || {}).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      sessionStorage.removeItem(key);
      sessionStorage.removeItem(key);
    }
  });
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🚀 Initializing auth state...');
    
    // Get initial session first
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

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔄 Auth state change:', event, session ? 'User logged in' : 'User logged out');
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
      console.log('🧹 Cleaning up auth subscription');
      subscription.unsubscribe();
    };
  }, []);

  // ✅ Updated signUp to return both user and error as expected by Auth.tsx
  const signUp = useCallback(
    async (email: string, password: string, fullName?: string) => {
      try {
        console.log('🚀 Starting signup process for:', email);
        // Clean up existing state
        cleanupAuthState();
        
        // Attempt global sign out
        try {
          await supabase.auth.signOut({ scope: 'global' });
          console.log('✅ Previous session cleared');
        } catch (err) {
          console.log('⚠️ No previous session to clear');
        }

        const redirectUrl = `${window.location.origin}/auth/callback`;
        
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
        }

        // ✅ Return both user and error as expected by Auth.tsx
        return { user: data.user, error: null };
      } catch (error) {
        console.error('❌ Signup exception:', error);
        return { user: null, error: error as AuthError };
      }
    },
    []
  );

  // ✅ Updated signIn to return error directly (not wrapped in object)
  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        console.log('🔐 Attempting sign in for:', email);
        // Clean up existing state
        cleanupAuthState();
        
        // Attempt global sign out
        try {
          await supabase.auth.signOut({ scope: 'global' });
        } catch (err) {
          console.log('⚠️ No previous session to clear');
        }
        
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) {
          console.error('❌ Sign in error:', error.message);
          return error; // Return error directly
        }
        
        if (data.user) {
          console.log('✅ Sign in successful for user:', data.user.id);
          // Don't force page reload here - let the auth state change handle it
        }
        
        return null; // Return null for success
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
      // Clean up auth state
      cleanupAuthState();
      
      // Attempt global sign out
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        console.log('⚠️ Sign out error ignored');
      }
      
      console.log('✅ Sign out successful, redirecting...');
      // Force page reload for a clean state
      window.location.href = '/auth';
    } catch (error) {
      console.error('❌ Error signing out:', error);
      // Force redirect even if signOut fails
      window.location.href = '/auth';
    }
  }, []);

  // Memoize the context value to prevent unnecessary re-renders
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
