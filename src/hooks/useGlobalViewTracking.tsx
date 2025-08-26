import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface ViewSession {
  sessionId: string;
  timestamp: number;
}

// Generate a persistent session ID for anonymous users
const getSessionId = (): string => {
  const key = 'roboverse_session_id';
  let sessionId = localStorage.getItem(key);
  
  if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    localStorage.setItem(key, sessionId);
  }
  
  return sessionId;
};

// Check if view should be counted (prevent duplicate counts in same session)
const shouldCountView = (robotId: string): boolean => {
  const key = `viewed_robot_${robotId}`;
  const lastView = localStorage.getItem(key);
  const now = Date.now();
  const threshold = 30 * 60 * 1000; // 30 minutes
  
  if (!lastView || (now - parseInt(lastView)) > threshold) {
    localStorage.setItem(key, now.toString());
    return true;
  }
  
  return false;
};

export const useGlobalViewTracking = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Track a robot view globally
  const trackRobotView = useCallback(async (robotId: string, robotData?: any) => {
    try {
      // Check if we should count this view (prevent spamming)
      if (!shouldCountView(robotId)) {
        console.log(`📊 View not counted for robot ${robotId} - too soon since last view`);
        return;
      }

      setLoading(true);
      
      // Get session information
      const sessionId = getSessionId();
      const userAgent = navigator.userAgent;
      const screenResolution = `${screen.width}x${screen.height}`;
      const referrer = document.referrer;
      const timestamp = new Date().toISOString();

      // Get user profile if logged in
      let userProfile = null;
      if (user) {
        try {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();
          userProfile = data;
        } catch (error) {
          console.log('Could not fetch user profile for view tracking');
        }
      }

      // Increment the global view count using database function
      const { data: newCount, error: countError } = await supabase
        .rpc('increment_robot_view_count', { p_robot_id: robotId });

      if (countError) {
        console.error('Error incrementing view count:', countError);
        return;
      }

      // Store detailed view interaction data
      const { error: interactionError } = await supabase
        .from('button_interactions')
        .insert({
          user_id: user?.id || null,
          user_name: user ? (userProfile?.full_name || user?.user_metadata?.full_name || user?.email || 'Unknown User') : 'Anonymous',
          button_name: "Robot Page View",
          button_type: "view",
          page_url: window.location.href,
          item_id: robotId,
          item_type: "robot",
          seller_id: robotData?.seller_id || null,
          seller_name: robotData?.profiles?.company_name || robotData?.profiles?.full_name || null,
          additional_data: {
            session_id: sessionId,
            robot_details: {
              name: robotData?.name,
              model: robotData?.model,
              robot_type: robotData?.robot_type,
              price: robotData?.price,
              location: robotData?.location
            },
            user_details: user ? {
              user_email: user.email,
              user_company: userProfile?.company_name,
              user_location: userProfile?.location,
              user_phone: userProfile?.mobile_number || userProfile?.phone,
              user_type: userProfile?.user_type,
              account_type: userProfile?.account_type
            } : {
              anonymous: true,
              session_id: sessionId
            },
            session_info: {
              user_agent: userAgent,
              screen_resolution: screenResolution,
              referrer: referrer,
              timestamp: timestamp,
              is_authenticated: !!user
            },
            view_count_after: newCount
          }
        });

      if (interactionError) {
        console.error('Error storing interaction data:', interactionError);
      }

      console.log(`📊 Robot view tracked: ${robotId} (New count: ${newCount})`);
      return newCount;

    } catch (error) {
      console.error('Error in trackRobotView:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Get global view count for a robot
  const getRobotViewCount = useCallback(async (robotId: string): Promise<number> => {
    try {
      const { data, error } = await supabase
        .rpc('get_robot_view_count', { p_robot_id: robotId });

      if (error) {
        console.error('Error getting robot view count:', error);
        return 0;
      }

      return data || 0;
    } catch (error) {
      console.error('Error in getRobotViewCount:', error);
      return 0;
    }
  }, []);

  // Get top viewed robots for admin dashboard
  const getTopViewedRobots = useCallback(async (limit: number = 10) => {
    try {
      const { data, error } = await supabase
        .from('robot_view_counts')
        .select(`
          robot_id,
          total_views,
          robots (
            id,
            name,
            model,
            robot_type,
            price,
            currency,
            location,
            profiles!seller_id (
              full_name,
              company_name
            )
          )
        `)
        .order('total_views', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error getting top viewed robots:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getTopViewedRobots:', error);
      return [];
    }
  }, []);

  return {
    trackRobotView,
    getRobotViewCount,
    getTopViewedRobots,
    loading
  };
};