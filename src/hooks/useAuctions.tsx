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
  status: 'upcoming' | 'live' | 'ended' | 'sold' | 'not_sold';
  currency: string;
  images: string[] | null;
  is_featured: boolean;
  winner_id: string | null;
  seller_accepted: boolean | null;
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
  profiles?: {
    company_name: string | null;
    full_name: string | null;
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
  profiles?: {
    company_name: string | null;
    full_name: string | null;
  } | null;
}

export function useAuctions(statusFilter?: string) {
  return useQuery({
    queryKey: ['auctions', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('auctions')
        .select('*, robots(name, model, robot_type, images, location, brand), profiles!auctions_seller_id_fkey(company_name, full_name)')
        .order('created_at', { ascending: false });

      if (statusFilter && statusFilter !== 'all') {
        if (statusFilter === 'live') {
          query = query.in('status', ['live', 'upcoming']).lte('start_time', new Date().toISOString());
        } else {
          query = query.eq('status', statusFilter);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as Auction[];
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
        .select('*, robots(name, model, robot_type, images, location, brand, description, payload_capacity, reach, applications, condition), profiles!auctions_seller_id_fkey(company_name, full_name, location)')
        .eq('id', auctionId)
        .single();
      if (error) throw error;
      return data as unknown as Auction;
    },
    enabled: !!auctionId,
    refetchInterval: 10000, // refresh every 10s for live updates
  });
}

export function useAuctionBids(auctionId: string | undefined) {
  return useQuery({
    queryKey: ['auction-bids', auctionId],
    queryFn: async () => {
      if (!auctionId) return [];
      const { data, error } = await supabase
        .from('auction_bids')
        .select('*, profiles!auction_bids_bidder_id_fkey(company_name, full_name)')
        .eq('auction_id', auctionId)
        .order('bid_amount', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as AuctionBid[];
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
