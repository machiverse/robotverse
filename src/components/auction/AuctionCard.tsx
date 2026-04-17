import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Gavel, Users, Bot } from 'lucide-react';
import AuctionCountdown from './AuctionCountdown';
import type { Auction } from '@/hooks/useAuctions';

const statusColors: Record<string, string> = {
  upcoming: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  live: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  ended: 'bg-muted text-muted-foreground border-border',
  sold: 'bg-primary/20 text-primary border-primary/30',
  not_sold: 'bg-destructive/20 text-destructive border-destructive/30',
};

const AuctionCard: React.FC<{ auction: Auction }> = ({ auction }) => {
  const navigate = useNavigate();
  const img = auction.robots?.images?.[0] || auction.images?.[0];

  const formatPrice = (v: number) => `₹${v.toLocaleString('en-IN')}`;

  return (
    <Card
      className="group border border-border hover:border-primary/40 bg-card hover:bg-card/80 transition-all duration-300 cursor-pointer overflow-hidden"
      onClick={() => navigate(`/auctions/${auction.id}`)}
    >
      {/* Image */}
      <div className="aspect-[16/10] bg-muted relative overflow-hidden">
        {img ? (
          <img src={img} alt={auction.auction_title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="flex items-center justify-center w-full h-full"><Bot className="w-12 h-12 text-muted-foreground" /></div>
        )}
        <div className="absolute top-3 left-3 flex gap-2">
          <Badge className={`${statusColors[auction.status]} border text-[10px] uppercase tracking-wider font-semibold`}>
            {auction.status === 'live' ? '🔴 Live' : auction.status}
          </Badge>
          {auction.auction_type === 'sealed' && (
            <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400">Sealed</Badge>
          )}
        </div>
        {auction.status === 'live' || auction.status === 'upcoming' ? (
          <div className="absolute bottom-3 right-3">
            <AuctionCountdown endTime={auction.end_time} startTime={auction.start_time} status={auction.status} compact />
          </div>
        ) : null}
      </div>

      <CardContent className="p-4 space-y-3">
        <h3 className="font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
          {auction.auction_title}
        </h3>
        {auction.robots && (
          <p className="text-xs text-muted-foreground">{auction.robots.robot_type} • {auction.robots.brand || auction.robots.model}</p>
        )}

        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {auction.current_highest_bid > 0 ? 'Current Bid' : 'Starting Price'}
            </p>
            <p className="text-lg font-bold text-primary">
              {formatPrice(auction.current_highest_bid > 0 ? auction.current_highest_bid : auction.starting_price)}
            </p>
          </div>
          {auction.buy_now_price && (
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Buy Now</p>
              <p className="text-sm font-semibold text-emerald-400">{formatPrice(auction.buy_now_price)}</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1 border-t border-border">
          <span className="flex items-center gap-1"><Gavel className="w-3 h-3" />{auction.total_bids} bids</span>
          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{auction.total_bidders} bidders</span>
        </div>

        {(auction.status === 'live' || auction.status === 'upcoming') && (
          <Button size="sm" className="w-full" onClick={(e) => { e.stopPropagation(); navigate(`/auctions/${auction.id}`); }}>
            <Gavel className="w-3.5 h-3.5 mr-1.5" />
            {auction.status === 'live' ? 'Place Bid' : 'View Auction'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default AuctionCard;
