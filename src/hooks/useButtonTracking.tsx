import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// Extended interface with full seller details fields
interface ButtonTrackingData {
  buttonName: string;
  buttonType: string;
  sellerId?: string;
  sellerName?: string;
  sellerCompany?: string;
  sellerEmail?: string;
  sellerMobile?: string;
  sellerLocation?: string;
  itemId?: string;
  itemType?: string;
  additionalData?: Record<string, any>;
}

// Custom hook to track button interactions with seller/user details
export const useButtonTracking = () => {
  const { user } = useAuth();

  // User profile info fetched from profiles table
  const [userProfile, setUserProfile] = useState<any>(null);
  // Loading state for tracking in progress
  const [isTracking, setIsTracking] = useState(false);

  // Fetch user profile when user changes
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
        console.error('Unexpected error fetching user profile:', error);
      }
    };

    fetchUserProfile();
  }, [user]);

  // Function to track button click event
  const trackButtonClick = async (data: ButtonTrackingData) => {
    if (!user) {
      console.warn('No authenticated user, skipping tracking');
      return;
    }

    setIsTracking(true);

    try {
      // Prepare tracking payload with full seller & user details
      const trackingPayload = {
        user_id: user.id,
        user_name: userProfile?.full_name || user.user_metadata?.full_name || user.email || 'Unknown User',
        user_email: user.email || 'No Email',
        user_mobile: userProfile?.mobile_number || userProfile?.phone || 'No Mobile',
        user_location: userProfile?.location || 'No Location',
        user_company: userProfile?.company_name || 'No Company',

        seller_id: data.sellerId || null,
        seller_name: data.sellerName || null,
        seller_company: data.sellerCompany || null,
        seller_email: data.sellerEmail || null,
        seller_mobile: data.sellerMobile || null,
        seller_location: data.sellerLocation || null,

        button_name: data.buttonName,
        button_type: data.buttonType,
        page_url: window.location.href,
        item_id: data.itemId || null,
        item_type: data.itemType || null,

        additional_data: {
          ...data.additionalData,
          timestamp: new Date().toISOString(),
          session_info: {
            user_agent: navigator.userAgent,
            screen_resolution: `${window.screen.width}x${window.screen.height}`,
            referrer: document.referrer,
          },
          user_profile_complete: {
            has_name: !!userProfile?.full_name,
            has_mobile: !!(userProfile?.mobile_number || userProfile?.phone),
            has_location: !!userProfile?.location,
            has_company: !!userProfile?.company_name,
            account_type: userProfile?.account_type || null,
            user_type: userProfile?.user_type || null,
          },
        },
      };

      console.log('🔍 Button tracking payload:', {
        user_details: {
          user_email: trackingPayload.user_email,
          user_mobile: trackingPayload.user_mobile,
          user_location: trackingPayload.user_location,
          user_company: trackingPayload.user_company
        },
        seller_details: {
          seller_email: trackingPayload.seller_email,
          seller_mobile: trackingPayload.seller_mobile,
          seller_location: trackingPayload.seller_location,
          seller_company: trackingPayload.seller_company
        }
      });

      // Insert into Supabase 
      const { data: insertedData, error } = await supabase
        .from('button_interactions')
        .insert([trackingPayload])
        .select('id, user_email, user_mobile, seller_email, seller_mobile');

      if (error) {
        console.error('❌ Error inserting button interaction:', error);
      } else {
        console.log('✅ Button interaction tracked successfully:', insertedData?.[0]);
      }
    } catch (error) {
      console.error('Unexpected error tracking button click:', error);
    } finally {
      setIsTracking(false);
    }
  };

  return {
    trackButtonClick,
    isTracking,
  };
};
