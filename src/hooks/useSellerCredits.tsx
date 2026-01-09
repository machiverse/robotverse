import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface SellerCredits {
  id: string;
  seller_id: string;
  current_balance: number;
  total_earned: number;
  total_spent: number;
  subscription_plan_id: string | null;
  subscription_status: string;
  subscription_start_date: string | null;
  subscription_end_date: string | null;
  next_credit_refresh: string | null;
}

interface SubscriptionPlan {
  id: string;
  plan_name: string;
  plan_type: string;
  monthly_price: number;
  annual_price: number | null;
  monthly_credits: number;
  features: string[];
  is_active: boolean;
}

interface CreditPack {
  id: string;
  pack_name: string;
  credits_amount: number;
  price: number;
  bonus_credits: number;
  is_popular: boolean;
  is_active: boolean;
}

interface CreditTransaction {
  id: string;
  transaction_type: string;
  credits_amount: number;
  balance_before: number;
  balance_after: number;
  description: string | null;
  created_at: string;
}

export const useSellerCredits = () => {
  const { user } = useAuth();
  const [credits, setCredits] = useState<SellerCredits | null>(null);
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [creditPacks, setCreditPacks] = useState<CreditPack[]>([]);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCredits = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Fetch or create seller credits
      let { data: creditsData, error } = await supabase
        .from('seller_credits')
        .select('*')
        .eq('seller_id', user.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // No record found, create one
        const { data: newCredits, error: insertError } = await supabase
          .from('seller_credits')
          .insert({ seller_id: user.id, current_balance: 0 })
          .select()
          .single();

        if (insertError) throw insertError;
        creditsData = newCredits;
      } else if (error) {
        throw error;
      }

      setCredits(creditsData);

      // Fetch current plan if subscribed
      if (creditsData?.subscription_plan_id) {
        const { data: planData } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('id', creditsData.subscription_plan_id)
          .single();

        if (planData) {
          setCurrentPlan({
            ...planData,
            features: Array.isArray(planData.features) 
              ? planData.features as string[]
              : JSON.parse(planData.features as string || '[]')
          });
        }
      }
    } catch (error) {
      console.error('Error fetching credits:', error);
    }
  }, [user?.id]);

  const fetchPlans = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('monthly_price', { ascending: true });

      if (error) throw error;
      
      setPlans((data || []).map(plan => ({
        ...plan,
        features: Array.isArray(plan.features) 
          ? plan.features as string[]
          : JSON.parse(plan.features as string || '[]')
      })));
    } catch (error) {
      console.error('Error fetching plans:', error);
    }
  }, []);

  const fetchCreditPacks = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('credit_packs')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (error) throw error;
      setCreditPacks(data || []);
    } catch (error) {
      console.error('Error fetching credit packs:', error);
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  }, [user?.id]);

  const deductCredits = async (amount: number, description: string, referenceId?: string, referenceType?: string) => {
    if (!user?.id || !credits) return false;

    if (credits.current_balance < amount) {
      toast.error('Insufficient credits');
      return false;
    }

    try {
      const newBalance = credits.current_balance - amount;

      // Insert transaction
      const { error: txError } = await supabase
        .from('credit_transactions')
        .insert({
          seller_id: user.id,
          transaction_type: 'lead_unlock',
          credits_amount: -amount,
          balance_before: credits.current_balance,
          balance_after: newBalance,
          description,
          reference_id: referenceId,
          reference_type: referenceType
        });

      if (txError) throw txError;

      // Update balance
      const { error: updateError } = await supabase
        .from('seller_credits')
        .update({
          current_balance: newBalance,
          total_spent: credits.total_spent + amount,
          updated_at: new Date().toISOString()
        })
        .eq('seller_id', user.id);

      if (updateError) throw updateError;

      // Refresh data
      await fetchCredits();
      await fetchTransactions();
      
      return true;
    } catch (error) {
      console.error('Error deducting credits:', error);
      toast.error('Failed to deduct credits');
      return false;
    }
  };

  const addCredits = async (amount: number, description: string, transactionType: string = 'purchase', paymentId?: string) => {
    if (!user?.id || !credits) return false;

    try {
      const newBalance = credits.current_balance + amount;

      // Insert transaction
      const { error: txError } = await supabase
        .from('credit_transactions')
        .insert({
          seller_id: user.id,
          transaction_type: transactionType,
          credits_amount: amount,
          balance_before: credits.current_balance,
          balance_after: newBalance,
          description,
          payment_id: paymentId
        });

      if (txError) throw txError;

      // Update balance
      const { error: updateError } = await supabase
        .from('seller_credits')
        .update({
          current_balance: newBalance,
          total_earned: credits.total_earned + amount,
          updated_at: new Date().toISOString()
        })
        .eq('seller_id', user.id);

      if (updateError) throw updateError;

      // Refresh data
      await fetchCredits();
      await fetchTransactions();
      
      toast.success(`${amount} credits added to your account`);
      return true;
    } catch (error) {
      console.error('Error adding credits:', error);
      toast.error('Failed to add credits');
      return false;
    }
  };

  const checkLeadUnlocked = async (leadId: string): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const { data, error } = await supabase
        .from('unlocked_leads')
        .select('id')
        .eq('seller_id', user.id)
        .eq('lead_id', leadId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return !!data;
    } catch (error) {
      console.error('Error checking lead unlock:', error);
      return false;
    }
  };

  const unlockLead = async (leadId: string, creditsRequired: number): Promise<boolean> => {
    if (!user?.id) return false;

    // Check if already unlocked
    const alreadyUnlocked = await checkLeadUnlocked(leadId);
    if (alreadyUnlocked) {
      toast.info('Lead already unlocked');
      return true;
    }

    // Deduct credits
    const success = await deductCredits(creditsRequired, `Unlocked lead`, leadId, 'lead');
    if (!success) return false;

    // Record unlock
    try {
      const { error } = await supabase
        .from('unlocked_leads')
        .insert({
          seller_id: user.id,
          lead_id: leadId,
          credits_used: creditsRequired
        });

      if (error) throw error;
      toast.success('Lead unlocked successfully');
      return true;
    } catch (error) {
      console.error('Error recording lead unlock:', error);
      return false;
    }
  };

  useEffect(() => {
    if (user?.id) {
      setLoading(true);
      Promise.all([
        fetchCredits(),
        fetchPlans(),
        fetchCreditPacks(),
        fetchTransactions()
      ]).finally(() => setLoading(false));
    }
  }, [user?.id, fetchCredits, fetchPlans, fetchCreditPacks, fetchTransactions]);

  return {
    credits,
    currentPlan,
    plans,
    creditPacks,
    transactions,
    loading,
    deductCredits,
    addCredits,
    unlockLead,
    checkLeadUnlocked,
    refreshCredits: fetchCredits,
    refreshTransactions: fetchTransactions
  };
};
