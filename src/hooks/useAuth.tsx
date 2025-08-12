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
    fullName?: string,
    profileData?: any
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

  const signUp = useCallback(
    async (email: string, password: string, fullName?: string, profileData?: any) => {
      try {
        console.log('🚀 Starting signup for:', email);
        
        // Clean up any existing auth state first
        cleanupAuthState();
        
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
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
          
          // Create profile immediately after successful signup
          if (profileData) {
            try {
              console.log('💾 Creating complete profile for user:', data.user.id);
              
              // Use direct insert with proper error handling
              const { error: profileError } = await supabase
                .from('profiles')
                .insert({
                  user_id: data.user.id,
                  email: data.user.email || '',
                  full_name: fullName || '',
                  company_name: profileData.companyName || null,
                  mobile_number: profileData.mobileNumber || null,
                  phone: profileData.mobileNumber || null,
                  location: profileData.location || null,
                  user_type: profileData.accountType || 'buyer',
                  account_type: profileData.accountType || 'buyer',
                  user_roles: profileData.sellerRoles?.length > 0 ? profileData.sellerRoles : ['buyer'],
                  seller_roles: profileData.accountType === 'seller' ? 
                    (profileData.sellerRoles?.length > 0 ? profileData.sellerRoles : ['robot_seller']) : [],
                  logistics_type: profileData.logisticsType || null,
                  logistics_region: profileData.logisticsRegion || null,
                  transport_modes: profileData.transportModes?.length > 0 ? profileData.transportModes : [],
                  warehouse_storage: profileData.warehouseStorage || false,
                  finance_type: profileData.financeType?.length > 0 ? profileData.financeType : [],
                  financing_for: profileData.financingFor?.length > 0 ? profileData.financingFor : [],
                  target_audience: profileData.targetAudience?.length > 0 ? profileData.targetAudience : [],
                  government_scheme_support: profileData.governmentSchemeSupport || false,
                  primary_role: profileData.accountType === 'seller' ? 'robot_seller' :
                    profileData.accountType === 'logistics' ? 'logistics_provider' :
                    profileData.accountType === 'finance' ? 'finance_provider' : 'buyer',
                  service_categories: profileData.accountType === 'seller' && 
                    profileData.sellerRoles?.includes('service_provider') ? 
                    ['maintenance', 'repair', 'installation'] : [],
                  registration_complete: true,
                  mou_agreed: true,
                  mou_agreed_at: new Date().toISOString()
                });

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
                // Set auth state immediately since profile was created
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
            // No profile data, just basic signup
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
