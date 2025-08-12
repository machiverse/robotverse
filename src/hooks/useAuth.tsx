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

// -- Context type
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

// -- Auth Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// -- Helper to clear auth cache
const cleanupAuthState = () => {
  const keysToRemove = ['supabase.auth.token'];
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
};

// -- Auth Provider
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // -- Initial load / subscription
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // -- Sign Up Function: Create auth user and save profile data locally
  const signUp = useCallback(
    async (email: string, password: string, fullName?: string, profileData?: any) => {
      try {
        cleanupAuthState();

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName || '' }
          }
        });

        if (error) return { user: null, error };

        if (data.user) {
          localStorage.setItem(
            'robotverse_user_registration_data',
            JSON.stringify({ ...profileData, fullName, email, userId: data.user.id })
          );
        }
        return { user: data.user, error: null };
      } catch (error) {
        return { user: null, error: error as AuthError };
      }
    },
    []
  );

  // -- Sign In Function
  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) return error;
        if (data.user) {
          setUser(data.user);
          setSession(data.session);
        }
        return null;
      } catch (error) {
        return error as AuthError;
      }
    },
    []
  );

  // -- Sign Out
  const signOut = useCallback(async () => {
    cleanupAuthState();
    await supabase.auth.signOut({ scope: 'global' });
    window.location.href = '/auth';
  }, []);

  // -- Listen for email confirmation and profile creation
  useEffect(() => {
    async function createProfileIfNeeded() {
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser && currentUser.email_confirmed_at) {
        const local = localStorage.getItem('robotverse_user_registration_data');
        if (!local) return;
        const pendingData = JSON.parse(local);

        // Check if profile exists
        const { data: existing } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('user_id', currentUser.id)
          .single();

        // Prepare profileData for insert/update
        const profileInsert: any = {
          user_id: currentUser.id,
          email: currentUser.email,
          full_name: pendingData.fullName,
          company_name: pendingData.companyName,
          mobile_number: pendingData.mobileNumber,
          location: pendingData.location,
          user_type: pendingData.accountType,
          account_type: pendingData.accountType,
          registration_complete: true,
          mou_agreed: true,
          mou_agreed_at: new Date().toISOString(),
          seller_roles: pendingData.sellerRoles || [],
          user_roles: pendingData.sellerRoles || [pendingData.accountType],
          primary_role: pendingData.sellerRoles?.[0] || pendingData.accountType,
          logistics_type: pendingData.logisticsType || null,
          logistics_region: pendingData.logisticsRegion || null,
          transport_modes: pendingData.transportModes || [],
          warehouse_storage: !!pendingData.warehouseStorage,
          finance_type: pendingData.financeType || [],
          financing_for: pendingData.financingFor || [],
          target_audience: pendingData.targetAudience || [],
          government_scheme_support: !!pendingData.governmentSchemeSupport,
          service_categories: pendingData.sellerRoles?.includes('service_provider')
            ? ['maintenance', 'repair', 'installation']
            : [],
        };

        if (!existing) {
          // Insert
          await supabase.from('profiles').insert([profileInsert]);
        } else {
          // Update
          await supabase.from('profiles').update(profileInsert).eq('user_id', currentUser.id);
        }
        localStorage.removeItem('robotverse_user_registration_data');
      }
    }

    createProfileIfNeeded();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session?.user?.email_confirmed_at) {
          createProfileIfNeeded();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // -- Provider value
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

// -- Auth Hook
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export { cleanupAuthState };
