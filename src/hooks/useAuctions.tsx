import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

export interface Auction {
  id: string;
  seller_id: string;
  robot_id: string | null;
  auction_title: string;
  description: string | null;
  auction_type: 'open' | 'sealed';
  start_time: string;
  end_time: string;
  starting_price: number;
  min_increment: number;
  reserve_price: number | null;
  buy_now_price: number | null;
  auto_extend_minutes: number | null;
  current_highest_bid: number;
  highest_bidder_id: string | null;
  total_bids: number;
  total_bidders: number;
  status: 'upcoming' | 'live' | 'ended' | 'sold' | 'not_sold' | 'cancelled';
  currency: string;
  images: string[] | null;
  is_featured: boolean;
  winner_id: string | null;
  seller_accepted: boolean | null;
  extensions_count?: number;
  original_end_time?: string | null;
  first_bid_at?: string | null;
  admin_status?: string;
  created_at: string;
  updated_at: string;
  robots?: {
    name: string;
    model: string;
    robot_type: string;
    images: string[];
    location: string;
    brand: string;
  } | null;
  seller_profile?: {
    company_name: string | null;
    full_name: string | null;
    location: string | null;
  } | null;
}

export interface AuctionBid {
  id: string;
  auction_id: string;
  bidder_id: string;
  bid_amount: number;
  is_winning_bid: boolean;
  is_auto_bid: boolean;
  created_at: string;
  bidder_name?: string;
  bidder_company?: string;
}

// Helper to fetch profiles for a list of user IDs
async function fetchProfiles(userIds: string[]) {
  if (!userIds.length) return {};
  const unique = [...new Set(userIds)];
  const { data } = await supabase
    .from('profiles')
    .select('user_id, company_name, full_name, location')
    .in('user_id', unique);
  const map: Record<string, any> = {};
  (data || []).forEach((p: any) => { map[p.user_id] = p; });
  return map;
}

// Valid DB enum values for auctions.status — keep in sync with the Postgres enum.
export const VALID_AUCTION_STATUSES = ['upcoming', 'live', 'ended', 'sold', 'not_sold', 'cancelled'] as const;
export type AuctionStatus = typeof VALID_AUCTION_STATUSES[number];

// UI tab -> set of DB enum statuses that tab is allowed to surface.
// Any tab key not listed here falls back to client-side time-based derivation only.
const TAB_STATUS_MAP: Record<string, AuctionStatus[]> = {
  upcoming: ['upcoming'],
  live: ['live'],
  ended: ['ended', 'sold', 'not_sold'],
  sold: ['sold'],
};

export function useAuctions(statusFilter?: string) {
  return useQuery({
    queryKey: ['auctions', statusFilter],
    queryFn: async () => {
      // Always fetch all non-cancelled auctions; we derive status client-side
      // so an auction marked "live" in DB but past end_time is correctly classified.
      const { data, error } = await supabase
        .from('auctions')
        .select('*, robots(name, model, robot_type, images, location, brand)')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const now = Date.now();
      let rows = (data || []) as any[];

      if (statusFilter && statusFilter !== 'all') {
        // Guard: only allow known tab keys or raw valid enum values through.
        const allowedDbStatuses =
          TAB_STATUS_MAP[statusFilter] ??
          (VALID_AUCTION_STATUSES.includes(statusFilter as AuctionStatus)
            ? [statusFilter as AuctionStatus]
            : null);

        if (!allowedDbStatuses) {
          return [] as Auction[];
        }

        rows = rows.filter((a: any) => {
          const start = new Date(a.start_time).getTime();
          const end = new Date(a.end_time).getTime();
          const dbStatus = a.status as AuctionStatus;
          // Only consider rows whose persisted enum status is valid for this tab.
          if (!allowedDbStatuses.includes(dbStatus)) {
            // Time-based fallback for the two time-derived tabs, since DB rows
            // may lag finalization (e.g. still 'live' but past end_time -> ended).
            if (statusFilter === 'live') return dbStatus !== 'cancelled' && now >= start && now < end;
            if (statusFilter === 'upcoming') return dbStatus !== 'cancelled' && now < start;
            if (statusFilter === 'ended') return dbStatus !== 'cancelled' && now >= end;
            return false;
          }
          if (statusFilter === 'live') return now >= start && now < end;
          if (statusFilter === 'upcoming') return now < start;
          if (statusFilter === 'ended') return now >= end || ['sold', 'not_sold', 'ended'].includes(dbStatus);
          return true;
        });
      }

      const sellerIds = rows.map((a: any) => a.seller_id);
      const profiles = await fetchProfiles(sellerIds);
      return rows.map((a: any) => ({ ...a, seller_profile: profiles[a.seller_id] || null })) as Auction[];
    },
    refetchInterval: 30000,
  });
}

export function useFinalizeAuction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (auctionId: string) => {
      const { data, error } = await (supabase.rpc as any)('finalize_auction', { p_auction_id: auctionId });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, auctionId) => {
      qc.invalidateQueries({ queryKey: ['auction', auctionId] });
      qc.invalidateQueries({ queryKey: ['auctions'] });
    },
  });
}

export function useAuctionDetail(auctionId: string | undefined) {
  return useQuery({
    queryKey: ['auction', auctionId],
    queryFn: async () => {
      if (!auctionId) return null;
      const { data, error } = await supabase
        .from('auctions')
        .select('*, robots(name, model, robot_type, images, location, brand, description, payload_capacity, reach, applications, condition)')
        .eq('id', auctionId)
        .single();
      if (error) throw error;

      // Fetch seller profile
      const profiles = await fetchProfiles([data.seller_id]);

      return {
        ...data,
        seller_profile: profiles[data.seller_id] || null,
      } as unknown as Auction;
    },
    enabled: !!auctionId,
    refetchInterval: 10000,
  });
}

export function useAuctionBids(auctionId: string | undefined, sellerId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['auction-bids', auctionId, user?.id],
    queryFn: async () => {
      if (!auctionId) return [];
      const { data, error } = await supabase
        .from('auction_bids')
        .select('*')
        .eq('auction_id', auctionId)
        .order('bid_amount', { ascending: false });
      if (error) throw error;

      const isSeller = user?.id === sellerId;
      const currentUserBidderIds = new Set(
        (data || []).filter((b: any) => b.bidder_id === user?.id).map((b: any) => b.bidder_id)
      );
      const hasPlacedBid = currentUserBidderIds.size > 0;

      // Only fetch full profiles if the current user is the seller
      if (isSeller) {
        const bidderIds = (data || []).map((b: any) => b.bidder_id);
        const profiles = await fetchProfiles(bidderIds);
        return (data || []).map((b: any) => ({
          ...b,
          bidder_name: profiles[b.bidder_id]?.full_name || null,
          bidder_company: profiles[b.bidder_id]?.company_name || null,
        })) as AuctionBid[];
      }

      // For bidders: show "You" for own bids, anonymize others
      // For public/non-bidders: strip all identity
      let anonymousCounter = 0;
      const bidderLabelMap: Record<string, string> = {};

      return (data || []).map((b: any) => {
        const isOwnBid = b.bidder_id === user?.id;

        if (isOwnBid) {
          return { ...b, bidder_name: 'You', bidder_company: null };
        }

        if (!hasPlacedBid) {
          // Public / non-bidder: hide all identity
          return { ...b, bidder_id: 'anonymous', bidder_name: 'Anonymous Bidder', bidder_company: null };
        }

        // Bidder viewing others: consistent anonymous labels
        if (!bidderLabelMap[b.bidder_id]) {
          anonymousCounter++;
          bidderLabelMap[b.bidder_id] = `Bidder ${anonymousCounter}`;
        }
        return { ...b, bidder_id: 'anonymous', bidder_name: bidderLabelMap[b.bidder_id], bidder_company: null };
      }) as AuctionBid[];
    },
    enabled: !!auctionId,
    refetchInterval: 5000,
  });
}

export function usePlaceBid() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ auctionId, bidAmount }: { auctionId: string; bidAmount: number }) => {
      if (!user) throw new Error('Must be logged in');
      const { data, error } = await supabase.rpc('place_auction_bid', {
        p_auction_id: auctionId,
        p_bidder_id: user.id,
        p_bid_amount: bidAmount,
      });
      if (error) throw error;
      const result = data as any;
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['auction', vars.auctionId] });
      queryClient.invalidateQueries({ queryKey: ['auction-bids', vars.auctionId] });
      queryClient.invalidateQueries({ queryKey: ['auctions'] });
      toast({ title: 'Bid placed!', description: 'Your bid was placed successfully.' });
    },
    onError: (err: Error) => {
      toast({ title: 'Bid failed', description: err.message, variant: 'destructive' });
    },
  });
}

export function useMyBids() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-auction-bids', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('auction_bids')
        .select('*, auctions(id, auction_title, status, end_time, current_highest_bid, images, robots(name, images))')
        .eq('bidder_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });
}

export function useMyAuctions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-auctions', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('auctions')
        .select('*, robots(name, model, images)')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Auction[];
    },
    enabled: !!user,
  });
}
