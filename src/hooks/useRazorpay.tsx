import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Razorpay script loading
const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id?: string;
  subscription_id?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
  handler: (response: RazorpayResponse) => void;
  modal?: {
    ondismiss?: () => void;
  };
}

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_subscription_id?: string;
  razorpay_signature: string;
}

export const useRazorpay = () => {
  const [loading, setLoading] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);

  const openRazorpayCheckout = useCallback(async (options: RazorpayOptions) => {
    const loaded = await loadRazorpayScript();
    if (!loaded) {
      toast.error('Failed to load payment gateway');
      return false;
    }

    const razorpay = new (window as any).Razorpay(options);
    razorpay.open();
    return true;
  }, []);

  // Purchase credits
  const purchaseCredits = useCallback(async (packId: string, credits: number, amount: number, userEmail?: string) => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast.error('Please sign in to purchase credits');
        return { success: false };
      }

      // Create order via edge function
      const { data, error } = await supabase.functions.invoke('razorpay-create-order', {
        body: { pack_id: packId, credits, amount },
      });

      if (error || !data) {
        console.error('Failed to create order:', error);
        toast.error('Failed to initiate payment');
        return { success: false };
      }

      // Open Razorpay checkout
      setProcessingPayment(true);
      
      return new Promise<{ success: boolean; credits?: number }>((resolve) => {
        openRazorpayCheckout({
          key: data.key_id,
          amount: data.amount * 100, // In paise
          currency: data.currency,
          name: 'RobotVerse',
          description: `Purchase ${credits} Credits`,
          order_id: data.order_id,
          prefill: {
            email: userEmail || sessionData.session?.user.email,
          },
          theme: {
            color: '#3b82f6',
          },
          handler: async (response: RazorpayResponse) => {
            try {
              // Verify payment via edge function
              const { data: verifyData, error: verifyError } = await supabase.functions.invoke('razorpay-verify-payment', {
                body: {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                },
              });

              if (verifyError || !verifyData?.success) {
                toast.error('Payment verification failed');
                resolve({ success: false });
              } else {
                toast.success(`Successfully added ${verifyData.credits} credits!`);
                resolve({ success: true, credits: verifyData.credits });
              }
            } catch (err) {
              console.error('Verification error:', err);
              toast.error('Payment verification failed');
              resolve({ success: false });
            } finally {
              setProcessingPayment(false);
            }
          },
          modal: {
            ondismiss: () => {
              setProcessingPayment(false);
              resolve({ success: false });
            },
          },
        });
      });

    } catch (error) {
      console.error('Purchase error:', error);
      toast.error('Payment failed');
      return { success: false };
    } finally {
      setLoading(false);
    }
  }, [openRazorpayCheckout]);

  // Subscribe to a plan
  const subscribeToPlan = useCallback(async (
    planId: string, 
    planType: string, 
    billingCycle: 'monthly' | 'annual',
    userEmail?: string
  ) => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast.error('Please sign in to subscribe');
        return { success: false };
      }

      // Create subscription via edge function
      const { data, error } = await supabase.functions.invoke('razorpay-create-subscription', {
        body: { plan_id: planId, plan_type: planType, billing_cycle: billingCycle },
      });

      if (error || !data) {
        console.error('Failed to create subscription:', error);
        toast.error('Failed to initiate subscription');
        return { success: false };
      }

      // Free plan doesn't need payment
      if (!data.requires_payment) {
        toast.success('Free plan activated!');
        return { success: true };
      }

      // Open Razorpay checkout for subscription
      setProcessingPayment(true);
      
      return new Promise<{ success: boolean }>((resolve) => {
        openRazorpayCheckout({
          key: data.key_id,
          amount: data.amount * 100,
          currency: 'INR',
          name: 'RobotVerse',
          description: `${data.plan_name} Subscription`,
          subscription_id: data.subscription_id,
          prefill: {
            email: userEmail || sessionData.session?.user.email,
          },
          theme: {
            color: '#3b82f6',
          },
          handler: async (response: RazorpayResponse) => {
            // Subscription is handled via webhooks
            toast.success('Subscription activated! Credits will be added shortly.');
            setProcessingPayment(false);
            resolve({ success: true });
          },
          modal: {
            ondismiss: () => {
              setProcessingPayment(false);
              resolve({ success: false });
            },
          },
        });
      });

    } catch (error) {
      console.error('Subscription error:', error);
      toast.error('Subscription failed');
      return { success: false };
    } finally {
      setLoading(false);
    }
  }, [openRazorpayCheckout]);

  return {
    loading,
    processingPayment,
    purchaseCredits,
    subscribeToPlan,
  };
};
