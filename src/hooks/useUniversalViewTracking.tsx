import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface ViewSession {
  sessionId: string;
  timestamp: number;
}

export type ItemType = 'robots' | 'spare_parts' | 'services' | 'logistics_services' | 'loan_products' | 'community_posts' | 'blogs';

export interface ViewAnalytics {
  itemId: string;
  itemType: ItemType;
  itemName: string;
  itemModel?: string;
  category: string;
  totalViews: number;
  dateRange?: string;
  createdAt: string;
  sellerId?: string;
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

// Throttle view counting - prevent counting same item multiple times within cooldown period
const VIEW_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes cooldown

const shouldCountView = (itemType: ItemType, itemId: string): boolean => {
  const key = `view_${itemType}_${itemId}`;
  const lastViewed = localStorage.getItem(key);
  const now = Date.now();
  
  if (lastViewed) {
    const lastViewTime = parseInt(lastViewed, 10);
    if (now - lastViewTime < VIEW_COOLDOWN_MS) {
      return false; // Too soon since last view
    }
  }
  
  // Mark this item as viewed
  localStorage.setItem(key, now.toString());
  return true;
};

export const useUniversalViewTracking = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Track a view for any item type
  const trackItemView = useCallback(async (
    itemType: ItemType, 
    itemId: string, 
    itemData?: any
  ) => {
    try {
      // Check if we should count this view (prevent spamming)
      if (!shouldCountView(itemType, itemId)) {
        console.log(`📊 View not counted for ${itemType} ${itemId} - too soon since last view`);
        // Still return the current count even if not incrementing
        const { data: currentCount } = await supabase
          .rpc('get_item_view_count', { 
            p_item_id: itemId, 
            p_item_type: itemType 
          });
        return currentCount || 0;
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
        .rpc('increment_item_view_count', { 
          p_item_id: itemId, 
          p_item_type: itemType 
        });

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
          button_name: `${itemType.charAt(0).toUpperCase() + itemType.slice(1)} Page View`,
          button_type: "view",
          page_url: window.location.href,
          item_id: itemId,
          item_type: itemType,
          seller_id: itemData?.seller_id || itemData?.provider_id || null,
          seller_name: itemData?.profiles?.company_name || itemData?.profiles?.full_name || null,
          additional_data: {
            session_id: sessionId,
            item_details: {
              name: itemData?.name,
              model: itemData?.model,
              type: itemData?.type || itemData?.service_type || itemData?.robot_type,
              price: itemData?.price,
              location: itemData?.location
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

      console.log(`📊 ${itemType} view tracked: ${itemId} (New count: ${newCount})`);
      return newCount;

    } catch (error) {
      console.error('Error in trackItemView:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Get view count for any item type
  const getItemViewCount = useCallback(async (itemType: ItemType, itemId: string): Promise<number> => {
    try {
      const { data, error } = await supabase
        .rpc('get_item_view_count', { 
          p_item_id: itemId, 
          p_item_type: itemType 
        });

      if (error) {
        console.error('Error getting item view count:', error);
        return 0;
      }

      return data || 0;
    } catch (error) {
      console.error('Error in getItemViewCount:', error);
      return 0;
    }
  }, []);

  // Get analytics data for seller's items
  const getSellerAnalytics = useCallback(async (sellerId: string, dateRange?: string): Promise<ViewAnalytics[]> => {
    try {
      setLoading(true);
      
      console.log(`📊 Fetching analytics for seller: ${sellerId}`);
      
      // Get all items owned by this seller
      const [robotsQuery, sparePartsQuery, servicesQuery, logisticsQuery, financeQuery] = await Promise.all([
        supabase
          .from('robots')
          .select('id, name, model, robot_type, created_at, seller_id')
          .eq('seller_id', sellerId),
        supabase
          .from('spare_parts')
          .select('id, name, model, category_tags, created_at, seller_id')
          .eq('seller_id', sellerId),
        supabase
          .from('services')
          .select('id, name, service_type, created_at, provider_id')
          .eq('provider_id', sellerId),
        supabase
          .from('logistics_services')
          .select('id, service_name, service_type, created_at, provider_id')
          .eq('provider_id', sellerId),
        supabase
          .from('loan_products')
          .select('id, product_name, loan_type, created_at, provider_id')
          .eq('provider_id', sellerId)
      ]);

      const allItems: ViewAnalytics[] = [];

      // Process robots
      if (robotsQuery.data) {
        console.log(`📊 Processing ${robotsQuery.data.length} robots`);
        for (const robot of robotsQuery.data) {
          const viewCount = await getItemViewCount('robots', robot.id);
          console.log(`📊 Robot ${robot.name}: ${viewCount} views`);
          allItems.push({
            itemId: robot.id,
            itemType: 'robots',
            itemName: robot.name,
            itemModel: robot.model,
            category: robot.robot_type || 'Robot',
            totalViews: viewCount,
            createdAt: robot.created_at,
            sellerId: robot.seller_id
          });
        }
      }

      // Process spare parts
      if (sparePartsQuery.data) {
        console.log(`📊 Processing ${sparePartsQuery.data.length} spare parts`);
        for (const part of sparePartsQuery.data) {
          const viewCount = await getItemViewCount('spare_parts', part.id);
          console.log(`📊 Part ${part.name}: ${viewCount} views`);
          allItems.push({
            itemId: part.id,
            itemType: 'spare_parts',
            itemName: part.name,
            itemModel: part.model,
            category: part.category_tags?.[0] || 'Spare Part',
            totalViews: viewCount,
            createdAt: part.created_at,
            sellerId: part.seller_id
          });
        }
      }

      // Process services
      if (servicesQuery.data) {
        for (const service of servicesQuery.data) {
          const viewCount = await getItemViewCount('services', service.id);
          allItems.push({
            itemId: service.id,
            itemType: 'services',
            itemName: service.name,
            category: service.service_type || 'Service',
            totalViews: viewCount,
            createdAt: service.created_at,
            sellerId: service.provider_id
          });
        }
      }

      // Process logistics services
      if (logisticsQuery.data) {
        for (const logistics of logisticsQuery.data) {
          const viewCount = await getItemViewCount('logistics_services', logistics.id);
          allItems.push({
            itemId: logistics.id,
            itemType: 'logistics_services',
            itemName: logistics.service_name,
            category: logistics.service_type || 'Logistics',
            totalViews: viewCount,
            createdAt: logistics.created_at,
            sellerId: logistics.provider_id
          });
        }
      }

      // Process loan products
      if (financeQuery.data) {
        for (const finance of financeQuery.data) {
          const viewCount = await getItemViewCount('loan_products', finance.id);
          allItems.push({
            itemId: finance.id,
            itemType: 'loan_products',
            itemName: finance.product_name,
            category: Array.isArray(finance.loan_type) ? finance.loan_type[0] : finance.loan_type || 'Finance',
            totalViews: viewCount,
            createdAt: finance.created_at,
            sellerId: finance.provider_id
          });
        }
      }

      // Sort by total views (highest first)
      allItems.sort((a, b) => b.totalViews - a.totalViews);

      console.log(`📊 Total items processed: ${allItems.length}, Total views: ${allItems.reduce((sum, item) => sum + item.totalViews, 0)}`);
      
      return allItems;
    } catch (error) {
      console.error('Error getting seller analytics:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [getItemViewCount]);

  // Get top viewed items across the platform
  const getTopViewedItems = useCallback(async (limit: number = 10, itemType?: ItemType): Promise<ViewAnalytics[]> => {
    try {
      let query = supabase
        .from('item_view_counts')
        .select('*')
        .order('total_views', { ascending: false })
        .limit(limit);

      if (itemType) {
        query = query.eq('item_type', itemType);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error getting top viewed items:', error);
        return [];
      }

      // Get item details for each view count record
      const itemsWithDetails: ViewAnalytics[] = [];
      
      for (const viewCount of data || []) {
        let itemDetails = null;
        // Get item details based on type
        let itemData = null;
        let itemName = 'Unknown';
        let itemModel = undefined;
        let category = viewCount.item_type;
        let sellerId = undefined;

        switch (viewCount.item_type) {
          case 'robots':
            const { data: robotData } = await supabase
              .from('robots')
              .select('id, name, model, robot_type, seller_id')
              .eq('id', viewCount.item_id)
              .single();
            if (robotData) {
              itemName = robotData.name;
              itemModel = robotData.model;
              category = robotData.robot_type || 'Robot';
              sellerId = robotData.seller_id;
            }
            break;
          case 'spare_parts':
            const { data: partData } = await supabase
              .from('spare_parts')
              .select('id, name, model, category_tags, seller_id')
              .eq('id', viewCount.item_id)
              .single();
            if (partData) {
              itemName = partData.name;
              itemModel = partData.model;
              category = partData.category_tags?.[0] || 'Spare Part';
              sellerId = partData.seller_id;
            }
            break;
          case 'services':
            const { data: serviceData } = await supabase
              .from('services')
              .select('id, name, service_type, provider_id')
              .eq('id', viewCount.item_id)
              .single();
            if (serviceData) {
              itemName = serviceData.name;
              category = serviceData.service_type || 'Service';
              sellerId = serviceData.provider_id;
            }
            break;
          case 'logistics_services':
            const { data: logisticsData } = await supabase
              .from('logistics_services')
              .select('id, service_name, service_type, provider_id')
              .eq('id', viewCount.item_id)
              .single();
            if (logisticsData) {
              itemName = logisticsData.service_name;
              category = logisticsData.service_type || 'Logistics';
              sellerId = logisticsData.provider_id;
            }
            break;
          case 'loan_products':
            const { data: financeData } = await supabase
              .from('loan_products')
              .select('id, product_name, loan_type, provider_id')
              .eq('id', viewCount.item_id)
              .single();
            if (financeData) {
              itemName = financeData.product_name;
              category = Array.isArray(financeData.loan_type) ? financeData.loan_type[0] : financeData.loan_type || 'Finance';
              sellerId = financeData.provider_id;
            }
            break;
        }

        if (itemName !== 'Unknown') {
          itemsWithDetails.push({
            itemId: viewCount.item_id,
            itemType: viewCount.item_type as ItemType,
            itemName,
            itemModel,
            category,
            totalViews: viewCount.total_views,
            createdAt: viewCount.created_at,
            sellerId
          });
        }
      }

      return itemsWithDetails;
    } catch (error) {
      console.error('Error in getTopViewedItems:', error);
      return [];
    }
  }, []);

  return {
    trackItemView,
    getItemViewCount,
    getSellerAnalytics,
    getTopViewedItems,
    loading
  };
};