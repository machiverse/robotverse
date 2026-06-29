import React from 'react';
import { Badge } from '@/components/ui/badge';
import { getAuctionStatus, STATUS_LABEL, STATUS_CLASSES } from '@/utils/auctionStatus';

interface Props {
  auction: { status: string; start_time: string; end_time: string };
  className?: string;
}

const AuctionStatusBadge: React.FC<Props> = ({ auction, className }) => {
  const s = getAuctionStatus(auction);
  return (
    <Badge className={`${STATUS_CLASSES[s]} border text-[10px] uppercase tracking-wider font-semibold ${className || ''}`}>
      {s === 'live' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />}
      {STATUS_LABEL[s]}
    </Badge>
  );
};

export default AuctionStatusBadge;
