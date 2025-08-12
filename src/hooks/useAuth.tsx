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

  // Initialize session state
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

  /**
   * Sign-up: create user and save registration form data locally for post-verification profile creation
   */
  const signUp = useCallback(
    async (email: string, password: string, fullName?: string, profileData?: any) => {
      try {
        cleanupAuthState();
        // Create auth user & send email verification
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName || '' }
          }
        });
        if (error) return { user: null, error };
        // ----
        // Save form data for profile creation after verification
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

  /**
   * Sign-in: normal password login
   */
  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
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

  /**
   * Sign-out: clear token and state
   */
  const signOut = useCallback(async () => {
    cleanupAuthState();
    await supabase.auth.signOut({ scope: 'global' });
    window.location.href = '/auth';
  }, []);

  /**
   * Profile creation after authentication and email confirmation
   * This effect runs on login and email confirmation event
   */
  useEffect(() => {
    async function createProfileIfNeeded() {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser && currentUser.email_confirmed_at) {
        const savedData = localStorage.getItem('robotverse_user_registration_data');
        if (!savedData) return;
        const pendingProfile = JSON.parse(savedData);

        // Check if profile already exists
        const { data: existing } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('user_id', currentUser.id)
          .single();

        // Prepare all registration fields
        const profileInsert = {
          user_id: currentUser.id,
          email: currentUser.email,
          full_name: pendingProfile.fullName,
          company_name: pendingProfile.companyName,
          mobile_number: pendingProfile.mobileNumber,
          phone: pendingProfile.mobileNumber,
          location: pendingProfile.location,
          user_type: pendingProfile.accountType,
          account_type: pendingProfile.accountType,
          registration_complete: true,
          mou_agreed: true,
          mou_agreed_at: new Date().toISOString(),
          seller_roles: pendingProfile.sellerRoles || [],
          user_roles: pendingProfile.sellerRoles || [pendingProfile.accountType],
          primary_role: pendingProfile.sellerRoles?.[0] || pendingProfile.accountType,
          logistics_type: pendingProfile.logisticsType || null,
          logistics_region: pendingProfile.logisticsRegion || null,
          transport_modes: pendingProfile.transportModes || [],
          warehouse_storage: !!pendingProfile.warehouseStorage,
          finance_type: pendingProfile.financeType || [],
          financing_for: pendingProfile.financingFor || [],
          target_audience: pendingProfile.targetAudience || [],
          government_scheme_support: !!pendingProfile.governmentSchemeSupport,
          service_categories: pendingProfile.sellerRoles?.includes('service_provider')
            ? ['maintenance', 'repair', 'installation'] : [],
        };

        if (!existing) {
          await supabase.from('profiles').insert([profileInsert]);
        } else {
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

  // Provide context value
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

// Auth hook
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export { cleanupAuthState };
