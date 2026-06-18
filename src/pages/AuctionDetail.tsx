import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import EnhancedHeader from '@/components/EnhancedHeader';
import Footer from '@/components/Footer';
import { useAuctionDetail, useAuctionBids, usePlaceBid, useFinalizeAuction } from '@/hooks/useAuctions';
import { useAuth } from '@/hooks/useAuth';
import AuctionCountdown from '@/components/auction/AuctionCountdown';
import AuctionStatusBadge from '@/components/auction/AuctionStatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Gavel, ArrowLeft, Bot, MapPin, Users, TrendingUp, Shield, Building, User, Loader2, Lock, Eye, EyeOff, AlertCircle, Award } from 'lucide-react';
import { getAuctionStatus, isBiddable } from '@/utils/auctionStatus';
import { getMinNextBid } from '@/utils/bidIncrements';

const AuctionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: auction, isLoading } = useAuctionDetail(id);
  const { data: bids } = useAuctionBids(id, auction?.seller_id);
  const placeBid = usePlaceBid();
  const finalize = useFinalizeAuction();
  const [bidAmount, setBidAmount] = useState('');

  const formatPrice = (v: number) => `₹${v.toLocaleString('en-IN')}`;
  const derived = auction ? getAuctionStatus(auction) : 'ended';
  const canBid = auction ? isBiddable(auction) : false;
  const isSeller = user?.id === auction?.seller_id;
  const minBid = auction ? getMinNextBid(auction.current_highest_bid || 0, auction.starting_price, auction.min_increment) : 0;
  const wasExtended = !!(auction as any)?.original_end_time && ((auction as any)?.extensions_count || 0) > 0;

  // Determine if current user has placed a bid
  const userHasBid = bids?.some((b) => b.bidder_name === 'You') || false;
  // Determine user's bid status
  const userBids = bids?.filter((b) => b.bidder_name === 'You') || [];
  const isHighestBidder = bids?.[0]?.bidder_name === 'You';

  const handleBid = () => {
    if (!id || !bidAmount) return;
    placeBid.mutate({ auctionId: id, bidAmount: parseFloat(bidAmount) });
    setBidAmount('');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <EnhancedHeader />
        <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="min-h-screen bg-background">
        <EnhancedHeader />
        <div className="container mx-auto px-4 py-16 text-center">
          <Gavel className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Auction not found</h2>
          <Button variant="outline" onClick={() => navigate('/auctions')}>Back to Auctions</Button>
        </div>
      </div>
    );
  }

  const img = auction.robots?.images?.[0] || auction.images?.[0];

  return (
    <div className="min-h-screen bg-background">
      <EnhancedHeader />

      <div className="container mx-auto px-4 py-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/auctions')} className="mb-4 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Auctions
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left - Images & Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image */}
            <div className="aspect-video rounded-xl overflow-hidden bg-muted border border-border">
              {img ? (
                <img src={img} alt={auction.auction_title} className="w-full h-full object-cover" />
              ) : (
                <div className="flex items-center justify-center w-full h-full"><Bot className="w-20 h-20 text-muted-foreground/30" /></div>
              )}
            </div>

            {/* Title & Status */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <AuctionStatusBadge auction={auction} className="text-xs" />
                <Badge variant="outline" className="text-xs capitalize">{auction.auction_type} Auction</Badge>
              </div>
              {wasExtended && (
                <div className="mt-2 flex items-start gap-2 rounded-lg border border-orange-500/30 bg-orange-500/5 p-2.5 text-xs text-orange-300">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span>Auction extended due to last-minute bidding ({(auction as any).extensions_count} {((auction as any).extensions_count === 1) ? 'time' : 'times'}).</span>
                </div>
              )}
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">{auction.auction_title}</h1>
              {auction.description && <p className="text-muted-foreground mt-2">{auction.description}</p>}
            </div>

            {/* Robot Info */}
            {auction.robots && (
              <Card className="border border-border bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">Robot Specifications</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Name:</span> <span className="text-foreground font-medium">{(auction.robots as any).name}</span></div>
                  <div><span className="text-muted-foreground">Type:</span> <span className="text-foreground font-medium">{(auction.robots as any).robot_type}</span></div>
                  {(auction.robots as any).brand && <div><span className="text-muted-foreground">Brand:</span> <span className="text-foreground font-medium">{(auction.robots as any).brand}</span></div>}
                  {(auction.robots as any).location && <div className="flex items-center gap-1 text-muted-foreground"><MapPin className="w-3 h-3" />{(auction.robots as any).location}</div>}
                </CardContent>
              </Card>
            )}

            {/* Bidder Status Banner */}
            {user && !isSeller && userHasBid && (
              <Card className={`border ${isHighestBidder ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
                <CardContent className="p-4 flex items-center gap-3">
                  {isHighestBidder ? (
                    <>
                      <Trophy className="w-5 h-5 text-emerald-400" />
                      <div>
                        <p className="font-semibold text-emerald-400 text-sm">You are the highest bidder!</p>
                        <p className="text-xs text-muted-foreground">Your bid: {formatPrice(userBids[0]?.bid_amount || 0)}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <TrendingUp className="w-5 h-5 text-amber-400" />
                      <div>
                        <p className="font-semibold text-amber-400 text-sm">You have been outbid</p>
                        <p className="text-xs text-muted-foreground">Your highest bid: {formatPrice(userBids[0]?.bid_amount || 0)} • Current highest: {formatPrice(auction.current_highest_bid || 0)}</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Bid History */}
            <Card className="border border-border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> Bid History ({bids?.length || 0})
                  {!isSeller && (
                    <Badge variant="outline" className="text-[10px] ml-auto flex items-center gap-1">
                      <EyeOff className="w-3 h-3" /> {isSeller ? 'Full Access' : userHasBid ? 'Anonymized' : 'Limited'}
                    </Badge>
                  )}
                  {isSeller && (
                    <Badge variant="outline" className="text-[10px] ml-auto flex items-center gap-1 border-primary/30 text-primary">
                      <Eye className="w-3 h-3" /> Seller View
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!user && (
                  <div className="text-center py-6 space-y-3">
                    <Lock className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                    <p className="text-sm text-muted-foreground">Login to participate in bidding and view bid activity</p>
                    <Button size="sm" onClick={() => navigate('/auth')}>Sign In</Button>
                  </div>
                )}

                {user && !bids?.length && (
                  <p className="text-sm text-muted-foreground text-center py-4">No bids yet. Be the first!</p>
                )}

                {user && bids && bids.length > 0 && (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {bids.map((bid, i) => {
                      const isYou = bid.bidder_name === 'You';
                      return (
                        <div key={bid.id} className={`flex items-center justify-between p-3 rounded-lg ${
                          i === 0 ? 'bg-primary/5 border border-primary/20' : 'bg-muted/50'
                        } ${isYou ? 'ring-1 ring-primary/30' : ''}`}>
                          <div className="flex items-center gap-2">
                            {i === 0 && <Trophy className="w-4 h-4 text-primary" />}
                            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                              {isYou ? (
                                <User className="w-3 h-3 text-primary" />
                              ) : isSeller ? (
                                <User className="w-3 h-3 text-muted-foreground" />
                              ) : (
                                <EyeOff className="w-3 h-3 text-muted-foreground" />
                              )}
                            </div>
                            <div>
                              <span className={`text-sm ${isYou ? 'text-primary font-semibold' : 'text-foreground'}`}>
                                {isYou ? 'You' : (bid.bidder_company || bid.bidder_name || 'Anonymous Bidder')}
                              </span>
                              {isYou && <Badge className="ml-2 bg-primary/10 text-primary border-primary/20 text-[10px]">Your Bid</Badge>}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-semibold text-foreground">{formatPrice(bid.bid_amount)}</span>
                            <p className="text-[10px] text-muted-foreground">{new Date(bid.created_at).toLocaleString('en-IN')}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right - Bidding Panel */}
          <div className="space-y-5">
            {/* Countdown */}
            {(auction.status === 'live' || auction.status === 'upcoming') && (
              <AuctionCountdown endTime={auction.end_time} startTime={auction.start_time} status={auction.status} />
            )}

            {/* Pricing */}
            <Card className="border border-border bg-card">
              <CardContent className="p-5 space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Current Highest Bid</p>
                  <p className="text-3xl font-bold text-primary">
                    {auction.current_highest_bid > 0 ? formatPrice(auction.current_highest_bid) : 'No bids yet'}
                  </p>
                </div>
                <Separator className="bg-border" />
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Starting Price</p>
                    <p className="font-semibold text-foreground">{formatPrice(auction.starting_price)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Min Increment</p>
                    <p className="font-semibold text-foreground">{formatPrice(auction.min_increment)}</p>
                  </div>
                  {auction.reserve_price && (
                    <div>
                      <p className="text-muted-foreground text-xs">Reserve Price</p>
                      <p className="font-semibold text-foreground flex items-center gap-1"><Shield className="w-3 h-3" />Set</p>
                    </div>
                  )}
                  {auction.buy_now_price && (
                    <div>
                      <p className="text-muted-foreground text-xs">Buy Now</p>
                      <p className="font-semibold text-emerald-400">{formatPrice(auction.buy_now_price)}</p>
                    </div>
                  )}
                </div>
                <Separator className="bg-border" />
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><Gavel className="w-3.5 h-3.5" />{auction.total_bids} bids</span>
                  <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{auction.total_bidders} bidders</span>
                </div>
              </CardContent>
            </Card>

            {/* Place Bid */}
            {isLive && !isSeller && user && (
              <Card className="border border-primary/30 bg-card">
                <CardContent className="p-5 space-y-3">
                  <h3 className="font-semibold text-foreground flex items-center gap-2"><Gavel className="w-4 h-4 text-primary" />Place Your Bid</h3>
                  <p className="text-xs text-muted-foreground">Minimum bid: {formatPrice(minBid)}</p>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder={`₹${minBid.toLocaleString('en-IN')}`}
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      className="bg-muted border-border"
                      min={minBid}
                    />
                    <Button onClick={handleBid} disabled={placeBid.isPending || !bidAmount || parseFloat(bidAmount) < minBid}>
                      {placeBid.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Bid'}
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    {[minBid, Math.round(minBid * 1.1), Math.round(minBid * 1.25)].map((v) => (
                      <Button key={v} variant="outline" size="sm" className="flex-1 text-xs" onClick={() => setBidAmount(v.toString())}>
                        {formatPrice(v)}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {!user && isLive && (
              <Card className="border border-border bg-card">
                <CardContent className="p-5 text-center space-y-3">
                  <Lock className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                  <p className="text-sm text-muted-foreground">Login to participate in bidding</p>
                  <Button className="w-full" onClick={() => navigate('/auth')}>Sign in to Bid</Button>
                </CardContent>
              </Card>
            )}

            {isSeller && (
              <Card className="border border-primary/20 bg-primary/5">
                <CardContent className="p-5 text-center space-y-1">
                  <Eye className="w-5 h-5 text-primary mx-auto" />
                  <p className="text-sm font-medium text-primary">Seller View</p>
                  <p className="text-xs text-muted-foreground">You can see all bidder details</p>
                </CardContent>
              </Card>
            )}

            {/* Seller Info */}
            {auction.seller_profile && (
              <Card className="border border-border bg-card">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    {auction.seller_profile.company_name ? <Building className="w-5 h-5 text-muted-foreground" /> : <User className="w-5 h-5 text-muted-foreground" />}
                  </div>
                  <div>
                    <p className="font-medium text-foreground text-sm">{auction.seller_profile.company_name || auction.seller_profile.full_name}</p>
                    <p className="text-xs text-muted-foreground">Auction Seller</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

const Trophy: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
  </svg>
);

export default AuctionDetail;