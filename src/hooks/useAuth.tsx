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
  
  // Remove all Supabase auth keys from localStorage
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      localStorage.removeItem(key);
      console.log(`🗑️ Removed localStorage key: ${key}`);
    }
  });
  
  // Remove all Supabase auth keys from sessionStorage
  Object.keys(sessionStorage || {}).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      sessionStorage.removeItem(key);
      console.log(`🗑️ Removed sessionStorage key: ${key}`);
    }
  });
  
  // Also remove common auth keys
  const commonKeys = [
    'supabase.auth.token',
    'supabase-auth-token',
    'sb-access-token',
    'sb-refresh-token'
  ];
  
  commonKeys.forEach(key => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
  
  console.log('✅ Auth state cleanup completed');
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🚀 Initializing auth state...');
    let initialSessionResolved = false;
    
    // IMPORTANT: Set up the listener FIRST, then get session
    // This prevents missing auth events that fire between getSession and onAuthStateChange
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔄 Auth state change:', event, session ? 'User logged in' : 'User logged out');
        
        // Skip INITIAL_SESSION if getSession hasn't resolved yet
        // getSession is the source of truth for initial state
        if (event === 'INITIAL_SESSION' && !initialSessionResolved) {
          console.log('⏳ Skipping INITIAL_SESSION, waiting for getSession...');
          return;
        }
        
        // Check if this is a password recovery flow by checking URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const type = urlParams.get('type');
        const isPasswordRecovery = type === 'recovery';
        
        console.log('🔄 Auth event details:', { event, isPasswordRecovery, pathname: window.location.pathname });
        
        if (isPasswordRecovery) {
          console.log('🔐 Password recovery session detected');
          setSession(session);
          setUser(null);
          
          if (window.location.pathname !== '/reset-password' && session) {
            console.log('🔄 Redirecting to reset password page...');
            window.location.href = `/reset-password${window.location.search}`;
          }
        } else {
          setSession(session);
          setUser(session?.user ?? null);
        }
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setLoading(false);
        }
      }
    );

    // getSession restores session from localStorage - this is the source of truth
    supabase.auth.getSession().then(({ data, error }) => {
      initialSessionResolved = true;
      if (error) {
        console.error('❌ Error getting initial session:', error);
      } else {
        console.log('📊 Initial session state:', data.session ? 'Authenticated' : 'Not authenticated');
      }
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

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
        
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth`, // Redirect back to auth page
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
        
        // Clean up any existing auth state before signing in
        cleanupAuthState();
        
        // Attempt global sign out first (in case there's a stuck session)
        try {
          await supabase.auth.signOut({ scope: 'global' });
        } catch (err) {
          // Continue even if this fails
          console.warn('⚠️ Pre-signin cleanup failed, continuing...', err);
        }
        
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
          // Force page reload for clean state
          setTimeout(() => {
            window.location.href = '/';
          }, 100);
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
      console.log('👋 Starting robust sign out process...');
      
      // Step 1: Clean up auth state first
      cleanupAuthState();
      
      // Step 2: Clear local component state
      setUser(null);
      setSession(null);
      
      // Step 3: Attempt global sign out (continue even if this fails)
      try {
        await supabase.auth.signOut({ scope: 'global' });
        console.log('✅ Global sign out successful');
      } catch (signOutError) {
        console.warn('⚠️ Global sign out failed, continuing anyway:', signOutError);
        // Continue with cleanup even if global signout fails
      }
      
      // Step 4: Final cleanup pass
      setTimeout(() => {
        cleanupAuthState();
        console.log('✅ Sign out process completed, redirecting...');
        window.location.href = '/auth';
      }, 100);
      
    } catch (error) {
      console.error('❌ Error during sign out, forcing cleanup and redirect:', error);
      // Force cleanup even on error
      cleanupAuthState();
      setUser(null);
      setSession(null);
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
