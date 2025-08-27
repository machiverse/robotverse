import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ButtonTrackingData {
  buttonName: string;
  buttonType: string;
  sellerId?: string;
  sellerName?: string;
  itemId?: string;
  itemType?: string;
  additionalData?: Record<string, any>;
}

export const useButtonTracking = () => {
  const { user } = useAuth();
  const [isTracking, setIsTracking] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Fetch user profile details when user changes
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) {
        setUserProfile(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user profile:', error);
          return;
        }

        setUserProfile(data);
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };

    fetchUserProfile();
  }, [user]);

  const trackButtonClick = async (data: ButtonTrackingData) => {
    if (!user) {
      console.log('🚫 Button tracking skipped: No user logged in');
      return;
    }

    setIsTracking(true);
    console.log('📊 Starting button tracking for:', data.buttonName, 'Type:', data.buttonType);
    
    try {
      // Enhanced tracking data with complete user and seller details
      const trackingData = {
        user_id: user.id,
        user_name: userProfile?.full_name || user.user_metadata?.full_name || user.email || 'Unknown User',
        seller_id: data.sellerId || null,
        seller_name: data.sellerName || null,
        button_name: data.buttonName,
        button_type: data.buttonType,
        page_url: window.location.href,
        item_id: data.itemId || null,
        item_type: data.itemType || null,
        additional_data: {
          ...data.additionalData,
          user_details: {
            user_email: user.email,
            user_company: userProfile?.company_name,
            user_location: userProfile?.location,
            user_phone: userProfile?.mobile_number || userProfile?.phone,
            user_type: userProfile?.user_type,
            account_type: userProfile?.account_type
          },
          timestamp: new Date().toISOString(),
          session_info: {
            user_agent: navigator.userAgent,
            screen_resolution: `${screen.width}x${screen.height}`,
            referrer: document.referrer
          }
        },
      };

      console.log('📊 Tracking data prepared:', trackingData);

      const { data: insertedData, error } = await supabase
        .from('button_interactions')
        .insert([trackingData])
        .select();

      if (error) {
        console.error('❌ Error tracking button click:', error);
        console.error('❌ Full error details:', JSON.stringify(error, null, 2));
      } else {
        console.log('✅ Button interaction tracked successfully:', insertedData);
      }
    } catch (error) {
      console.error('❌ Exception in button tracking:', error);
    } finally {
      setIsTracking(false);
    }
  };

  return {
    trackButtonClick,
    isTracking,
  };
};