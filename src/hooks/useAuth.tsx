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

// --- Types ---
interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    fullName?: string,
    profileData?: any
  ) => Promise<{ user: User | null; error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<AuthError | null>;
  signOut: () => Promise<void>;
  cleanupAuthState: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- Clears Supabase & browser auth tokens ---
const cleanupAuthState = () => {
  console.log('🧹 Cleaning up auth caches...');
  const keysToRemove = ['supabase.auth.token'];
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
};

// ---- Auth Provider ----
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // --- Initial session setup & Supabase auth state listening ---
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

  // ---- Signup with optional full profile data ----
  const signUp = useCallback(
    async (email: string, password: string, fullName?: string, profileData?: any) => {
      try {
        console.log('🚀 Starting signup for:', email);

        // Clean up any existing auth state first
        cleanupAuthState();

        // Determine redirect URL for email confirmation
        const currentHost = window.location.hostname;
        let redirectUrl = `${window.location.origin}/auth`;
        if (currentHost === 'www.robotverse.in' || currentHost === 'robotverse.in') {
          redirectUrl = 'https://www.robotverse.in/auth';
        }

        // Supabase sign up - triggers confirmation email
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

          // --- (Optional) Immediately create profile (if RLS and workflow allow) ---
          if (profileData) {
            try {
              console.log('💾 Creating complete profile for user:', data.user.id);

              // Example: calling an RPC for profile creation, but be sure your DB and RLS allow this!
              const { data: profileResult, error: profileError } = await supabase.rpc(
                'create_complete_user_profile',
                {
                  p_user_id: data.user.id,
                  p_email: data.user.email || '',
                  p_full_name: fullName || '',
                  p_company_name: profileData.companyName || null,
                  p_mobile_number: profileData.mobileNumber || null,
                  p_location: profileData.location || null,
                  p_user_type: profileData.accountType || 'buyer',
                  p_account_type: profileData.accountType || 'buyer',
                  p_seller_roles: Array.isArray(profileData.sellerRoles) ? profileData.sellerRoles : [],
                  p_logistics_type: profileData.logisticsType || null,
                  p_logistics_region: profileData.logisticsRegion || null,
                  p_transport_modes: Array.isArray(profileData.transportModes) ? profileData.transportModes : [],
                  p_warehouse_storage: Boolean(profileData.warehouseStorage),
                  p_finance_type: Array.isArray(profileData.financeType) ? profileData.financeType : [],
                  p_financing_for: Array.isArray(profileData.financingFor) ? profileData.financingFor : [],
                  p_target_audience: Array.isArray(profileData.targetAudience) ? profileData.targetAudience : [],
                  p_government_scheme_support: Boolean(profileData.governmentSchemeSupport)
                }
              );

              if (profileError) {
                console.error('❌ Profile creation failed:', profileError);
                return { user: null, error: {
                  message: profileError.message,
                  name: 'ProfileCreationError',
                  code: 'profile_creation_failed',
                  status: 400,
                  __isAuthError: true
                } as unknown as AuthError };
              } else {
                console.log('✅ Complete profile created successfully');
                setUser(data.user);
                setSession(data.session);
              }
            } catch (profileError: any) {
              console.error('❌ Error creating profile:', profileError);
              return { user: null, error: {
                message: profileError.message || 'Profile creation failed',
                name: 'ProfileCreationError',
                code: 'profile_creation_failed',
                status: 400,
                __isAuthError: true
              } as unknown as AuthError };
            }
          } else {
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

  // ---- Signin ----
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

  // ---- Signout ----
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

  // ---- Context Value ----
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

// ---- Hook for consumer components ----
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export { cleanupAuthState };
