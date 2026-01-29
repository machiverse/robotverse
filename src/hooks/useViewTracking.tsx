import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface ViewCount {
  robots: number;
  spare_parts: number;
  services: number;
  logistics_services: number;
  loan_products: number;
}

export interface UserViewStats {
  totalViews: number;
  viewsByCategory: ViewCount;
  recentViews: Array<{
    target_type: string;
    target_id: string;
    created_at: string;
    user_id: string;
  }>;
}

export const useViewTracking = () => {
  const { user } = useAuth();
  const [viewStats, setViewStats] = useState<UserViewStats>({
    totalViews: 0,
    viewsByCategory: {
      robots: 0,
      spare_parts: 0,
      services: 0,
      logistics_services: 0,
      loan_products: 0
    },
    recentViews: []
  });
  const [loading, setLoading] = useState(true);

  // Track a view when a user visits a product/service
  const trackView = useCallback(async (targetType: string, targetId: string, viewerId?: string, additionalData?: any) => {
    try {
      if (!viewerId && !user) return; // Don't track if no user
      
      const userId = viewerId || user?.id;
      if (!userId) return;

      // Get user profile for enhanced tracking
      let userProfile = null;
      try {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .single();
        userProfile = data;
      } catch (error) {
        console.log('Could not fetch user profile for view tracking');
      }

      // Insert enhanced view record in button_interactions table as well
      await supabase
        .from('button_interactions')
        .insert({
          user_id: userId,
          user_name: userProfile?.full_name || user?.user_metadata?.full_name || user?.email || 'Unknown User',
          button_name: "Page View",
          button_type: "view",
          page_url: window.location.href,
          item_id: targetId,
          item_type: targetType,
          additional_data: {
            ...additionalData,
            user_details: {
              user_email: user?.email,
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
          }
        });

      // Insert view record in user_interactions table (for backward compatibility)
      const { error } = await supabase
        .from('user_interactions')
        .insert({
          user_id: userId,
          target_type: targetType,
          target_id: targetId,
          interaction_type: 'view'
        });

      if (error) {
        console.error('Error tracking view:', error);
        return;
      }

      console.log(`📊 Tracked view: ${targetType}:${targetId} by ${userId}`);
    } catch (error) {
      console.error('Error in trackView:', error);
    }
  }, [user]);

  // Get view counts for items owned by a specific user (seller's dashboard)
  const fetchUserItemViews = useCallback(async (ownerId: string) => {
    if (!ownerId) return { totalViews: 0, viewsByCategory: { robots: 0, spare_parts: 0, services: 0, logistics_services: 0, loan_products: 0 }, recentViews: [] };

    try {
      setLoading(true);

      // Get all items owned by this user
      const [robotsData, sparePartsData, servicesData, logisticsData, financeData] = await Promise.all([
        supabase.from('robots').select('id').eq('seller_id', ownerId),
        supabase.from('spare_parts').select('id').eq('seller_id', ownerId),
        supabase.from('services').select('id').eq('provider_id', ownerId),
        supabase.from('logistics_services').select('id').eq('provider_id', ownerId),
        supabase.from('loan_products').select('id').eq('provider_id', ownerId)
      ]);

      const robotIds = robotsData.data?.map(r => r.id) || [];
      const sparePartIds = sparePartsData.data?.map(s => s.id) || [];
      const serviceIds = servicesData.data?.map(s => s.id) || [];
      const logisticsIds = logisticsData.data?.map(l => l.id) || [];
      const financeIds = financeData.data?.map(f => f.id) || [];

      // Get view counts from item_view_counts table (aggregated counts)
      const [robotViewCounts, sparePartViewCounts, serviceViewCounts, logisticsViewCounts, financeViewCounts] = await Promise.all([
        robotIds.length > 0 ? supabase
          .from('item_view_counts')
          .select('total_views')
          .eq('item_type', 'robots')
          .in('item_id', robotIds) : { data: [] },
        sparePartIds.length > 0 ? supabase
          .from('item_view_counts')
          .select('total_views')
          .eq('item_type', 'spare_parts')
          .in('item_id', sparePartIds) : { data: [] },
        serviceIds.length > 0 ? supabase
          .from('item_view_counts')
          .select('total_views')
          .eq('item_type', 'services')
          .in('item_id', serviceIds) : { data: [] },
        logisticsIds.length > 0 ? supabase
          .from('item_view_counts')
          .select('total_views')
          .eq('item_type', 'logistics_services')
          .in('item_id', logisticsIds) : { data: [] },
        financeIds.length > 0 ? supabase
          .from('item_view_counts')
          .select('total_views')
          .eq('item_type', 'loan_products')
          .in('item_id', financeIds) : { data: [] }
      ]);

      // Also get counts from user_interactions table as fallback
      const [robotInteractions, sparePartInteractions, serviceInteractions, logisticsInteractions, financeInteractions, recentViewsData] = await Promise.all([
        robotIds.length > 0 ? supabase
          .from('user_interactions')
          .select('id', { count: 'exact', head: true })
          .eq('interaction_type', 'view')
          .eq('target_type', 'robots')
          .in('target_id', robotIds) : { count: 0 },
        sparePartIds.length > 0 ? supabase
          .from('user_interactions')
          .select('id', { count: 'exact', head: true })
          .eq('interaction_type', 'view')
          .eq('target_type', 'spare_parts')
          .in('target_id', sparePartIds) : { count: 0 },
        serviceIds.length > 0 ? supabase
          .from('user_interactions')
          .select('id', { count: 'exact', head: true })
          .eq('interaction_type', 'view')
          .eq('target_type', 'services')
          .in('target_id', serviceIds) : { count: 0 },
        logisticsIds.length > 0 ? supabase
          .from('user_interactions')
          .select('id', { count: 'exact', head: true })
          .eq('interaction_type', 'view')
          .eq('target_type', 'logistics_services')
          .in('target_id', logisticsIds) : { count: 0 },
        financeIds.length > 0 ? supabase
          .from('user_interactions')
          .select('id', { count: 'exact', head: true })
          .eq('interaction_type', 'view')
          .eq('target_type', 'loan_products')
          .in('target_id', financeIds) : { count: 0 },
        (() => {
          const allIds = [...robotIds, ...sparePartIds, ...serviceIds, ...logisticsIds, ...financeIds];
          if (allIds.length === 0) {
            return Promise.resolve({ data: [] });
          }
          return supabase
            .from('user_interactions')
            .select('*')
            .eq('interaction_type', 'view')
            .in('target_id', allIds)
            .order('created_at', { ascending: false })
            .limit(10);
        })()
      ]);

      // Sum up view counts from item_view_counts table
      const sumViewCounts = (data: any[] | null) => 
        (data || []).reduce((sum, item) => sum + (item.total_views || 0), 0);

      const viewCountsFromTable = {
        robots: sumViewCounts(robotViewCounts.data),
        spare_parts: sumViewCounts(sparePartViewCounts.data),
        services: sumViewCounts(serviceViewCounts.data),
        logistics_services: sumViewCounts(logisticsViewCounts.data),
        loan_products: sumViewCounts(financeViewCounts.data)
      };

      // Use the higher count between item_view_counts and user_interactions
      const viewsByCategory = {
        robots: Math.max(viewCountsFromTable.robots, robotInteractions.count || 0),
        spare_parts: Math.max(viewCountsFromTable.spare_parts, sparePartInteractions.count || 0),
        services: Math.max(viewCountsFromTable.services, serviceInteractions.count || 0),
        logistics_services: Math.max(viewCountsFromTable.logistics_services, logisticsInteractions.count || 0),
        loan_products: Math.max(viewCountsFromTable.loan_products, financeInteractions.count || 0)
      };

      const totalViews = Object.values(viewsByCategory).reduce((sum, count) => sum + count, 0);

      const result = {
        totalViews,
        viewsByCategory,
        recentViews: recentViewsData.data || []
      };

      console.log('📊 View tracking result:', result);
      setViewStats(result);
      return result;
    } catch (error) {
      console.error('Error fetching user item views:', error);
      return { totalViews: 0, viewsByCategory: { robots: 0, spare_parts: 0, services: 0, logistics_services: 0, loan_products: 0 }, recentViews: [] };
    } finally {
      setLoading(false);
    }
  }, []);

  // Get view count for a specific item
  const getItemViewCount = useCallback(async (targetType: string, targetId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_interactions')
        .select('*')
        .eq('interaction_type', 'view')
        .eq('target_type', targetType)
        .eq('target_id', targetId);

      if (error) {
        console.error('Error getting item view count:', error);
        return 0;
      }

      return data?.length || 0;
    } catch (error) {
      console.error('Error in getItemViewCount:', error);
      return 0;
    }
  }, []);

  // Set up real-time subscription for view updates
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
    viewStats,
    loading,
    trackView,
    fetchUserItemViews,
    getItemViewCount
  };
};