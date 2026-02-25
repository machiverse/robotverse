import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// Grandfathered user cutoff date - users registered before this date have unlimited access
const GRANDFATHER_CUTOFF_DATE = new Date('2026-02-01T00:00:00Z');

interface ListingLimits {
  robots: number;
  spareParts: number;
  services: number;
}

interface ListingUsage {
  robots: number;
  spareParts: number;
  services: number;
}

interface SubscriptionPlan {
  id: string;
  plan_name: string;
  plan_type: string;
  robot_limit: number;
  spare_part_limit: number;
  service_limit: number;
  has_lead_manager_access: boolean;
  has_advanced_analytics: boolean;
  support_level: string;
  monthly_credits: number;
  features: string[];
}

interface SubscriptionLimitsData {
  isGrandfathered: boolean;
  registrationDate: Date | null;
  currentPlan: SubscriptionPlan | null;
  limits: ListingLimits;
  usage: ListingUsage;
  remaining: ListingLimits;
  hasLeadManagerAccess: boolean;
  hasAdvancedAnalytics: boolean;
  supportLevel: string;
  canCreateListing: (type: 'robot' | 'sparePart' | 'service') => boolean;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

// Default free plan limits
const FREE_LIMITS: ListingLimits = {
  robots: 2,
  spareParts: 5,
  services: 1
};

export const useSubscriptionLimits = (): SubscriptionLimitsData => {
  const { user } = useAuth();
  const [isGrandfathered, setIsGrandfathered] = useState(false);
  const [registrationDate, setRegistrationDate] = useState<Date | null>(null);
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan | null>(null);
  const [usage, setUsage] = useState<ListingUsage>({ robots: 0, spareParts: 0, services: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch user profile to get registration date
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('created_at')
        .eq('user_id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      const regDate = profile?.created_at ? new Date(profile.created_at) : null;
      setRegistrationDate(regDate);

      // Check if user is grandfathered (registered before Feb 1, 2026)
      const grandfathered = regDate ? regDate < GRANDFATHER_CUTOFF_DATE : false;
      setIsGrandfathered(grandfathered);

      // Fetch current subscription and plan
      const { data: sellerCredits, error: creditsError } = await supabase
        .from('seller_credits')
        .select('subscription_plan_id, subscription_status')
        .eq('seller_id', user.id)
        .single();

      if (creditsError && creditsError.code !== 'PGRST116') {
        throw creditsError;
      }

      let plan: SubscriptionPlan | null = null;

      if (sellerCredits?.subscription_plan_id && sellerCredits.subscription_status === 'active') {
        // Fetch the subscribed plan
        const { data: planData, error: planError } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('id', sellerCredits.subscription_plan_id)
          .single();

        if (planError) throw planError;
        
        plan = {
          ...planData,
          features: Array.isArray(planData.features) 
            ? planData.features as string[]
            : JSON.parse(planData.features as string || '[]')
        };
      } else {
        // Default to free plan
        const { data: freePlan, error: freeError } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('plan_type', 'free')
          .single();

        if (!freeError && freePlan) {
          plan = {
            ...freePlan,
            features: Array.isArray(freePlan.features) 
              ? freePlan.features as string[]
              : JSON.parse(freePlan.features as string || '[]')
          };
        }
      }

      setCurrentPlan(plan);

      // Fetch listing counts only if not grandfathered
      if (!grandfathered) {
        const [robotsResult, partsResult, servicesResult] = await Promise.all([
          supabase.from('robots').select('id', { count: 'exact', head: true }).eq('seller_id', user.id),
          supabase.from('spare_parts').select('id', { count: 'exact', head: true }).eq('seller_id', user.id),
          supabase.from('services').select('id', { count: 'exact', head: true }).eq('provider_id', user.id)
        ]);

        setUsage({
          robots: robotsResult.count || 0,
          spareParts: partsResult.count || 0,
          services: servicesResult.count || 0
        });
      }

    } catch (err) {
      console.error('Error fetching subscription limits:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch subscription data');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate limits based on grandfathered status and plan
  const limits: ListingLimits = isGrandfathered 
    ? { robots: -1, spareParts: -1, services: -1 } // -1 means unlimited
    : {
        robots: currentPlan?.robot_limit ?? FREE_LIMITS.robots,
        spareParts: currentPlan?.spare_part_limit ?? FREE_LIMITS.spareParts,
        services: currentPlan?.service_limit ?? FREE_LIMITS.services
      };

  // Calculate remaining listings
  const remaining: ListingLimits = isGrandfathered
    ? { robots: -1, spareParts: -1, services: -1 }
    : {
        robots: limits.robots === -1 ? -1 : Math.max(0, limits.robots - usage.robots),
        spareParts: limits.spareParts === -1 ? -1 : Math.max(0, limits.spareParts - usage.spareParts),
        services: limits.services === -1 ? -1 : Math.max(0, limits.services - usage.services)
      };

  // Check if user can create a listing
  const canCreateListing = (type: 'robot' | 'sparePart' | 'service'): boolean => {
    if (isGrandfathered) return true;
    
    switch (type) {
      case 'robot':
        return limits.robots === -1 || usage.robots < limits.robots;
      case 'sparePart':
        return limits.spareParts === -1 || usage.spareParts < limits.spareParts;
      case 'service':
        return limits.services === -1 || usage.services < limits.services;
      default:
        return false;
    }
  };

  // Determine access levels
  const hasLeadManagerAccess = isGrandfathered || (currentPlan?.has_lead_manager_access ?? false);
  const hasAdvancedAnalytics = isGrandfathered || (currentPlan?.has_advanced_analytics ?? false);
  const supportLevel = currentPlan?.support_level ?? 'none';

  return {
    isGrandfathered,
    registrationDate,
    currentPlan,
    limits,
    usage,
    remaining,
    hasLeadManagerAccess,
    hasAdvancedAnalytics,
    supportLevel,
    canCreateListing,
    loading,
    error,
    refresh: fetchData
  };
};
