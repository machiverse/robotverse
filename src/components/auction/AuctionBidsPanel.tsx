import React, { useState } from 'react';
import { useAuctionBids } from '@/hooks/useAuctions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Users, Loader2 } from 'lucide-react';

interface Props {
  auctionId: string;
  sellerId: string;
  totalBids?: number;
}

// Seller-only panel: shows real bidder names + amounts for the seller's own auction.
// useAuctionBids already returns full profile data when the current user is the seller.
const AuctionBidsPanel: React.FC<Props> = ({ auctionId, sellerId, totalBids }) => {
  const [open, setOpen] = useState(false);
  const { data: bids, isLoading } = useAuctionBids(open ? auctionId : undefined, sellerId);

  return (
    <div className="mt-3 pt-3 border-t border-border/60">
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-between h-8 px-2 text-xs"
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
      >
        <span className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-primary" />
          View bidders {typeof totalBids === 'number' && <Badge variant="outline" className="ml-1 text-[10px]">{totalBids}</Badge>}
        </span>
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </Button>

      {open && (
        <div className="mt-2 space-y-1.5">
          {isLoading ? (
            <div className="flex justify-center py-3"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>
          ) : !bids?.length ? (
            <p className="text-xs text-muted-foreground text-center py-2">No bids yet.</p>
          ) : (
            bids.map((b, i) => (
              <div key={b.id} className="flex items-center justify-between text-xs bg-muted/30 rounded px-2 py-1.5">
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {b.bidder_name || 'Bidder'}
                    {i === 0 && <Badge className="ml-1.5 bg-success/20 text-success border-success/30 text-[9px]">Highest</Badge>}
                  </p>
                  {b.bidder_company && <p className="text-muted-foreground truncate">{b.bidder_company}</p>}
                </div>
                <span className="font-semibold text-primary whitespace-nowrap">
                  ₹{Number(b.bid_amount).toLocaleString('en-IN')}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default AuctionBidsPanel;
