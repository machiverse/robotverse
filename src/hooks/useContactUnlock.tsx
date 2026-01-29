import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface UnlockedContact {
  id: string;
  user_id: string;
  seller_id: string;
  item_id: string;
  item_type: string;
  credits_used: number;
  unlocked_at: string;
}

interface SellerContact {
  company_name?: string;
  mobile_number?: string;
  phone?: string;
  email?: string;
  full_name?: string;
  location?: string;
}

interface UserCredits {
  current_balance: number;
  total_earned: number;
  total_spent: number;
}

const CREDITS_PER_UNLOCK = 5; // Credits required to unlock a contact

export const useContactUnlock = () => {
  const { user } = useAuth();
  const [unlockedContacts, setUnlockedContacts] = useState<UnlockedContact[]>([]);
  const [userCredits, setUserCredits] = useState<UserCredits | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user's credits
  const fetchUserCredits = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('seller_credits')
        .select('current_balance, total_earned, total_spent')
        .eq('seller_id', user.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // Create credits record if doesn't exist - give 100 free credits to new users
        const { data: newData, error: insertError } = await supabase
          .from('seller_credits')
          .insert({ seller_id: user.id, current_balance: 100, total_earned: 100 })
          .select('current_balance, total_earned, total_spent')
          .single();
        
        if (insertError) throw insertError;
        setUserCredits(newData);
        return;
      } else if (error) {
        throw error;
      }

      setUserCredits(data);
    } catch (error) {
      console.error('Error fetching user credits:', error);
    }
  }, [user?.id]);

  // Fetch all contacts unlocked by this user using raw SQL
  const fetchUnlockedContacts = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Use raw SQL query since the types aren't generated yet
      const { data, error } = await supabase
        .rpc('get_user_unlocked_contacts' as any, { user_id_input: user.id });

      if (error) {
        // Fallback: direct table query with type casting
        const response = await fetch(
          `${(supabase as any).supabaseUrl}/rest/v1/unlocked_contacts?user_id=eq.${user.id}`,
          {
            headers: {
              'apikey': (supabase as any).supabaseKey,
              'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (response.ok) {
          const jsonData = await response.json();
          setUnlockedContacts(jsonData as UnlockedContact[]);
        }
        return;
      }

      setUnlockedContacts((data as unknown as UnlockedContact[]) || []);
    } catch (error) {
      console.error('Error fetching unlocked contacts:', error);
    }
  }, [user?.id]);

  // Check if a specific contact is unlocked
  const isContactUnlocked = useCallback((sellerId: string, itemId: string, itemType: string): boolean => {
    // Self-contact is always unlocked
    if (user?.id === sellerId) return true;
    
    return unlockedContacts.some(
      (contact) => 
        contact.seller_id === sellerId && 
        contact.item_id === itemId && 
        contact.item_type === itemType
    );
  }, [unlockedContacts, user?.id]);

  // Unlock a contact by spending credits
  const unlockContact = async (
    sellerId: string,
    itemId: string,
    itemType: string,
    itemName: string
  ): Promise<boolean> => {
    if (!user?.id) {
      toast.error('Please login to unlock contact details');
      return false;
    }

    // Check if already unlocked
    if (isContactUnlocked(sellerId, itemId, itemType)) {
      toast.info('Contact already unlocked');
      return true;
    }

    // Check if user has enough credits
    if (!userCredits || userCredits.current_balance < CREDITS_PER_UNLOCK) {
      toast.error(`Insufficient credits. You need ${CREDITS_PER_UNLOCK} credits to unlock.`);
      return false;
    }

    try {
      const newBalance = userCredits.current_balance - CREDITS_PER_UNLOCK;
      const session = await supabase.auth.getSession();

      // Insert unlock record using REST API
      const unlockResponse = await fetch(
        `${(supabase as any).supabaseUrl}/rest/v1/unlocked_contacts`,
        {
          method: 'POST',
          headers: {
            'apikey': (supabase as any).supabaseKey,
            'Authorization': `Bearer ${session.data.session?.access_token}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            user_id: user.id,
            seller_id: sellerId,
            item_id: itemId,
            item_type: itemType,
            credits_used: CREDITS_PER_UNLOCK
          })
        }
      );

      if (!unlockResponse.ok) {
        throw new Error('Failed to unlock contact');
      }

      // Record transaction
      const { error: txError } = await supabase
        .from('credit_transactions')
        .insert({
          seller_id: user.id,
          transaction_type: 'contact_unlock',
          credits_amount: -CREDITS_PER_UNLOCK,
          balance_before: userCredits.current_balance,
          balance_after: newBalance,
          description: `Unlocked contact for ${itemType}: ${itemName}`,
          reference_id: itemId,
          reference_type: itemType
        });

      if (txError) throw txError;

      // Update user credits
      const { error: updateError } = await supabase
        .from('seller_credits')
        .update({
          current_balance: newBalance,
          total_spent: userCredits.total_spent + CREDITS_PER_UNLOCK,
          updated_at: new Date().toISOString()
        })
        .eq('seller_id', user.id);

      if (updateError) throw updateError;

      // Refresh data
      await fetchUserCredits();
      await fetchUnlockedContacts();

      toast.success('Contact unlocked successfully!');
      return true;
    } catch (error) {
      console.error('Error unlocking contact:', error);
      toast.error('Failed to unlock contact');
      return false;
    }
  };

  // Get masked contact info for locked state
  const getMaskedContact = (contact: SellerContact): SellerContact => {
    return {
      company_name: contact.company_name ? '••••••••' : undefined,
      mobile_number: contact.mobile_number ? '•••••-•••••' : undefined,
      phone: contact.phone ? '•••••-•••••' : undefined,
      email: contact.email ? '•••••@••••.•••' : undefined,
      full_name: contact.full_name,
      location: contact.location
    };
  };

  // Initialize
  useEffect(() => {
    if (user?.id) {
      setLoading(true);
      Promise.all([fetchUserCredits(), fetchUnlockedContacts()])
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user?.id, fetchUserCredits, fetchUnlockedContacts]);

  return {
    isContactUnlocked,
    unlockContact,
    getMaskedContact,
    userCredits,
    creditsRequired: CREDITS_PER_UNLOCK,
    loading,
    refreshCredits: fetchUserCredits,
    refreshUnlockedContacts: fetchUnlockedContacts
  };
};
