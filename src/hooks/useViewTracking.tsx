import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ViewCount {
  robots: number;
  spare_parts: number;
  services: number;
  logistics_services: number;
  loan_products: number;
  [key: string]: number;
}

interface RecentView {
  id: string;
  target_type: string;
  target_id: string;
  created_at: string;
  item_name?: string;
}

interface UserViewStats {
  totalViews: number;
  categoryViews: ViewCount;
  viewsByCategory: ViewCount; // Alias for backward compatibility
  recentViews: RecentView[];
}

export const useViewTracking = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [viewStats, setViewStats] = useState<UserViewStats>({
    totalViews: 0,
    categoryViews: {
      robots: 0,
      spare_parts: 0,
      services: 0,
      logistics_services: 0,
      loan_products: 0
    },
    viewsByCategory: {
      robots: 0,
      spare_parts: 0,
      services: 0,
      logistics_services: 0,
      loan_products: 0
    },
    recentViews: []
  });

  // Track view for any user (logged in or anonymous)
  const trackView = async (targetType: string, targetId: string, viewerId?: string, additionalData?: any) => {
    // Generate anonymous viewer ID if no user is logged in
    let userId = viewerId || user?.id;
    let isAnonymous = false;
    
    if (!userId) {
      // Create a persistent anonymous ID for the session
      let anonymousId = sessionStorage.getItem('anonymous_viewer_id');
      if (!anonymousId) {
        anonymousId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem('anonymous_viewer_id', anonymousId);
      }
      userId = anonymousId;
      isAnonymous = true;
    }

    console.log('📊 Starting view tracking for:', targetType, targetId, 'User:', userId, 'Anonymous:', isAnonymous);

    try {
      // Fetch user profile for logged-in users only
      let userProfile = null;
      if (!isAnonymous && user?.id === userId) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (error) {
          console.error('Error fetching user profile:', error);
        } else {
          userProfile = data;
        }
      }

      // For logged-in users, track in user_interactions table
      if (!isAnonymous) {
        const { error: viewError } = await supabase
          .from('user_interactions')
          .insert([{
            user_id: userId,
            target_type: targetType,
            target_id: targetId,
            interaction_type: 'view'
          }]);

        if (viewError) {
          console.error('❌ Error tracking view in user_interactions:', viewError);
        } else {
          console.log('✅ View tracked successfully in user_interactions');
        }
      }

      // Track all views (including anonymous) in button_interactions for overall count
      const trackingData = {
        user_id: isAnonymous ? null : userId, // null for anonymous users
        user_name: isAnonymous ? 'Anonymous Visitor' : (userProfile?.full_name || user?.user_metadata?.full_name || user?.email || 'Unknown User'),
        seller_id: additionalData?.sellerId || null,
        seller_name: additionalData?.sellerName || null,
        button_name: `View ${targetType}`,
        button_type: 'view',
        page_url: window.location.href,
        item_id: targetId,
        item_type: targetType,
        additional_data: {
          ...additionalData,
          is_anonymous: isAnonymous,
          anonymous_id: isAnonymous ? userId : null,
          user_details: !isAnonymous && userProfile ? {
            user_email: user?.email,
            user_company: userProfile?.company_name,
            user_location: userProfile?.location,
            user_phone: userProfile?.mobile_number || userProfile?.phone,
            user_type: userProfile?.user_type,
            account_type: userProfile?.account_type
          } : {},
          timestamp: new Date().toISOString(),
          session_info: {
            user_agent: navigator.userAgent,
            screen_resolution: `${screen.width}x${screen.height}`,
            referrer: document.referrer
          }
        },
      };

      const { error: buttonError } = await supabase
        .from('button_interactions')
        .insert([trackingData]);

      if (buttonError) {
        console.error('❌ Error tracking view in button_interactions:', buttonError);
      } else {
        console.log('✅ View tracked successfully in button_interactions');
      }

    } catch (error) {
      console.error('❌ Exception in view tracking:', error);
    }
  };

  // Fetch user's item views (for logged-in users only)
  const fetchUserItemViews = useCallback(async (ownerId: string): Promise<UserViewStats> => {
    setLoading(true);
    try {
      console.log('📊 Fetching user item views for owner:', ownerId);

      // Get robot IDs first
      const { data: robotIds } = await supabase
        .from('robots')
        .select('id')
        .eq('seller_id', ownerId);

      // Get spare part IDs
      const { data: sparePartIds } = await supabase
        .from('spare_parts')
        .select('id')
        .eq('seller_id', ownerId);

      // Get service IDs
      const { data: serviceIds } = await supabase
        .from('services')
        .select('id')
        .eq('provider_id', ownerId);

      // Get logistics service IDs
      const { data: logisticsIds } = await supabase
        .from('logistics_services')
        .select('id')
        .eq('provider_id', ownerId);

      // Get loan product IDs
      const { data: loanIds } = await supabase
        .from('loan_products')
        .select('id')
        .eq('provider_id', ownerId);

      // Fetch view counts for user's robots
      const robotViewsPromise = robotIds && robotIds.length > 0 ? 
        supabase
          .from('user_interactions')
          .select('*', { count: 'exact', head: true })
          .eq('interaction_type', 'view')
          .eq('target_type', 'robots')
          .in('target_id', robotIds.map(r => r.id)) :
        Promise.resolve({ count: 0, error: null });

      // Fetch view counts for user's spare parts
      const sparePartViewsPromise = sparePartIds && sparePartIds.length > 0 ?
        supabase
          .from('user_interactions')
          .select('*', { count: 'exact', head: true })
          .eq('interaction_type', 'view')
          .eq('target_type', 'spare_parts')
          .in('target_id', sparePartIds.map(sp => sp.id)) :
        Promise.resolve({ count: 0, error: null });

      // Fetch view counts for user's services
      const serviceViewsPromise = serviceIds && serviceIds.length > 0 ?
        supabase
          .from('user_interactions')
          .select('*', { count: 'exact', head: true })
          .eq('interaction_type', 'view')
          .eq('target_type', 'services')
          .in('target_id', serviceIds.map(s => s.id)) :
        Promise.resolve({ count: 0, error: null });

      // Fetch view counts for user's logistics services
      const logisticsViewsPromise = logisticsIds && logisticsIds.length > 0 ?
        supabase
          .from('user_interactions')
          .select('*', { count: 'exact', head: true })
          .eq('interaction_type', 'view')
          .eq('target_type', 'logistics_services')
          .in('target_id', logisticsIds.map(l => l.id)) :
        Promise.resolve({ count: 0, error: null });

      // Fetch view counts for user's loan products
      const loanViewsPromise = loanIds && loanIds.length > 0 ?
        supabase
          .from('user_interactions')
          .select('*', { count: 'exact', head: true })
          .eq('interaction_type', 'view')
          .eq('target_type', 'loan_products')
          .in('target_id', loanIds.map(l => l.id)) :
        Promise.resolve({ count: 0, error: null });

      const [
        { count: robotViews, error: robotError },
        { count: sparePartViews, error: sparePartError },
        { count: serviceViews, error: serviceError },
        { count: logisticsViews, error: logisticsError },
        { count: loanViews, error: loanError }
      ] = await Promise.all([
        robotViewsPromise,
        sparePartViewsPromise,
        serviceViewsPromise,
        logisticsViewsPromise,
        loanViewsPromise
      ]);

      if (robotError) console.error('Error fetching robot views:', robotError);
      if (sparePartError) console.error('Error fetching spare part views:', sparePartError);
      if (serviceError) console.error('Error fetching service views:', serviceError);
      if (logisticsError) console.error('Error fetching logistics views:', logisticsError);
      if (loanError) console.error('Error fetching loan product views:', loanError);

      // Fetch recent views for user's items
      const allIds = [
        ...(robotIds?.map(r => r.id) || []),
        ...(sparePartIds?.map(sp => sp.id) || []),
        ...(serviceIds?.map(s => s.id) || []),
        ...(logisticsIds?.map(l => l.id) || []),
        ...(loanIds?.map(l => l.id) || [])
      ];

      let recentViewsData = [];
      if (allIds.length > 0) {
        const { data, error: recentError } = await supabase
          .from('user_interactions')
          .select('*')
          .eq('interaction_type', 'view')
          .in('target_id', allIds)
          .order('created_at', { ascending: false })
          .limit(10);

        if (recentError) {
          console.error('Error fetching recent views:', recentError);
        } else {
          recentViewsData = data || [];
        }
      }

      const categoryViews = {
        robots: robotViews || 0,
        spare_parts: sparePartViews || 0,
        services: serviceViews || 0,
        logistics_services: logisticsViews || 0,
        loan_products: loanViews || 0
      };

      const totalViews = Object.values(categoryViews).reduce((sum, count) => sum + count, 0);

      const stats = {
        totalViews,
        categoryViews,
        viewsByCategory: categoryViews, // Alias for backward compatibility
        recentViews: recentViewsData
      };

      setViewStats(stats);
      return stats;

    } catch (error) {
      console.error('Error fetching user item views:', error);
      return {
        totalViews: 0,
        categoryViews: {
          robots: 0,
          spare_parts: 0,
          services: 0,
          logistics_services: 0,
          loan_products: 0
        },
        viewsByCategory: {
          robots: 0,
          spare_parts: 0,
          services: 0,
          logistics_services: 0,
          loan_products: 0
        },
        recentViews: []
      };
    } finally {
      setLoading(false);
    }
  }, []);

  // Get total view count for a specific item (includes all views - logged in and anonymous)
  const getItemViewCount = async (targetType: string, targetId: string): Promise<number> => {
    try {
      // Get total view count from button_interactions table (includes all views - logged in and anonymous)
      const { count, error } = await supabase
        .from('button_interactions')
        .select('*', { count: 'exact', head: true })
        .eq('item_type', targetType)
        .eq('item_id', targetId)
        .eq('button_type', 'view');

      if (error) {
        console.error('Error fetching view count from button_interactions:', error);
        
        // Fallback to user_interactions table for logged-in user views only
        const { count: fallbackCount, error: fallbackError } = await supabase
          .from('user_interactions')
          .select('*', { count: 'exact', head: true })
          .eq('target_type', targetType)
          .eq('target_id', targetId)
          .eq('interaction_type', 'view');

        if (fallbackError) {
          console.error('Error fetching fallback view count:', fallbackError);
          return 0;
        }

        return fallbackCount || 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error fetching view count:', error);
      return 0;
    }
  };

  // Set up real-time subscription for view updates (logged-in users only)
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('view-tracking-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_interactions',
          filter: `interaction_type=eq.view`
        },
        (payload) => {
          console.log('📊 Real-time view update:', payload);
          // Refresh view stats when new views are tracked
          if (user.id) {
            fetchUserItemViews(user.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchUserItemViews]);

  return {
    trackView,
    fetchUserItemViews,
    getItemViewCount,
    viewStats,
    loading
  };
};