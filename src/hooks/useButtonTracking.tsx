import { useState } from 'react';
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

  const trackButtonClick = async (data: ButtonTrackingData) => {
    if (!user) return;

    setIsTracking(true);
    try {
      const trackingData = {
        user_id: user.id,
        user_name: user.email || 'Unknown User',
        seller_id: data.sellerId || null,
        seller_name: data.sellerName || null,
        button_name: data.buttonName,
        button_type: data.buttonType,
        page_url: window.location.href,
        item_id: data.itemId || null,
        item_type: data.itemType || null,
        additional_data: data.additionalData || {},
      };

      const { error } = await supabase
        .from('button_interactions')
        .insert([trackingData]);

      if (error) {
        console.error('Error tracking button click:', error);
      }
    } catch (error) {
      console.error('Error tracking button click:', error);
    } finally {
      setIsTracking(false);
    }
  };

  return {
    trackButtonClick,
    isTracking,
  };
};