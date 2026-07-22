import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import EnhancedHeader from '@/components/EnhancedHeader';
import Footer from '@/components/Footer';
import { useAuctions, useMyBids, useMyAuctions } from '@/hooks/useAuctions';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import AuctionCard from '@/components/auction/AuctionCard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Gavel, Plus, Zap, Clock, Trophy, ArrowRight, Bot, Package, Pencil } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { useUrlParam } from '@/hooks/useUrlState';
import CopySearchLinkButton from '@/components/CopySearchLinkButton';
import AuctionBidsPanel from '@/components/auction/AuctionBidsPanel';
import { getAuctionStatus } from '@/utils/auctionStatus';

const Auctions: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useUrlParam<string>('tab', 'live');

  // Periodically finalize any expired auctions (every 2 minutes while page is open)
  useEffect(() => {
    const tick = async () => {
      try {
        const { error } = await (supabase as any).rpc('finalize_due_auctions');
        if (error && error.code !== 'PGRST202' && !String(error.message || '').includes('Could not find the function')) {
          console.warn('finalize_due_auctions:', error.message);
        }
      } catch {}
    };
    tick();
    const i = setInterval(tick, 120000);
    return () => clearInterval(i);
  }, []);

  const { data: liveAuctions, isLoading: loadingLive } = useAuctions('live');
  const { data: upcomingAuctions, isLoading: loadingUpcoming } = useAuctions('upcoming');
  const { data: closedAuctions, isLoading: loadingClosed } = useAuctions('ended');
  const { data: myBids, isLoading: loadingBids } = useMyBids();
  const { data: myAuctions, isLoading: loadingMyAuctions } = useMyAuctions();

  // Group my auctions by batch_id (single-unit auctions get their own group).
  const myAuctionBatches = React.useMemo(() => {
    const groups = new Map<string, any[]>();
    (myAuctions || []).forEach((a: any) => {
      const key = a.batch_id || a.id;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(a);
    });
    return Array.from(groups.entries()).map(([key, items]) => ({
      key,
      items: items.sort((x, y) => (x.unit_number || 0) - (y.unit_number || 0)),
    }));
  }, [myAuctions]);

  const stats = [
    { label: 'Live Auctions', value: liveAuctions?.length || 0, icon: Zap, color: 'text-emerald-400' },
    { label: 'Upcoming', value: upcomingAuctions?.length || 0, icon: Clock, color: 'text-blue-400' },
    { label: 'Completed', value: closedAuctions?.length || 0, icon: Trophy, color: 'text-amber-400' },
  ];

  const renderGrid = (auctions: any[] | undefined, loading: boolean) => {
    if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    if (!auctions?.length) return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Gavel className="w-16 h-16 text-muted-foreground/30 mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-1">No auctions found</h3>
        <p className="text-sm text-muted-foreground">Check back later for new listings.</p>
      </div>
    );
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {auctions.map((a) => <AuctionCard key={a.id} auction={a} />)}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <EnhancedHeader />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border" style={{ background: 'var(--gradient-hero)' }}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(200_100%_50%/0.06),transparent_50%)]" />
        <div className="container mx-auto px-4 py-10 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Badge className="bg-primary/10 text-primary border border-primary/20 text-xs">NEW MODULE</Badge>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Robot Auction</span>
              </h1>
              <p className="text-muted-foreground max-w-lg">
                India's first B2B auction platform for industrial robots, automation equipment, and bulk inventory.
              </p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <CopySearchLinkButton />
              {user && (
                <Button onClick={() => navigate('/auctions/create')} className="gap-2">
                  <Plus className="w-4 h-4" /> Create Auction
                </Button>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-8 max-w-lg">
            {stats.map((s) => (
              <div key={s.label} className="bg-card/50 border border-border rounded-lg p-3 text-center">
                <s.icon className={`w-5 h-5 mx-auto mb-1 ${s.color}`} />
                <p className="text-xl font-bold text-foreground">{s.value}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-card border border-border mb-6">
            <TabsTrigger value="live" className="gap-1.5"><Zap className="w-3.5 h-3.5" />Live Auctions</TabsTrigger>
            <TabsTrigger value="upcoming" className="gap-1.5"><Clock className="w-3.5 h-3.5" />Upcoming</TabsTrigger>
            <TabsTrigger value="closed" className="gap-1.5"><Trophy className="w-3.5 h-3.5" />Closed</TabsTrigger>
            {user && <TabsTrigger value="myauctions" className="gap-1.5"><Package className="w-3.5 h-3.5" />My Auctions</TabsTrigger>}
            {user && <TabsTrigger value="mybids" className="gap-1.5"><Gavel className="w-3.5 h-3.5" />My Bids</TabsTrigger>}
          </TabsList>

          <TabsContent value="live">{renderGrid(liveAuctions, loadingLive)}</TabsContent>
          <TabsContent value="upcoming">{renderGrid(upcomingAuctions, loadingUpcoming)}</TabsContent>
          <TabsContent value="closed">{renderGrid(closedAuctions, loadingClosed)}</TabsContent>
          {user && (
            <TabsContent value="myauctions">
              {loadingMyAuctions ? (
                <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
              ) : !myAuctionBatches.length ? (
                <div className="flex flex-col items-center py-16">
                  <Package className="w-16 h-16 text-muted-foreground/30 mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-1">No auctions yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">Create an auction to see it listed here.</p>
                  <Button variant="outline" onClick={() => navigate('/auctions/create')}>Create Auction</Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {myAuctionBatches.map(({ key, items }) => {
                    const isBatch = items.length > 1 || (items[0]?.batch_size || 1) > 1;
                    const first = items[0];
                    return (
                      <div key={key} className="border border-border rounded-xl bg-card/40 p-4">
                        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            {isBatch ? (
                              <>
                                <Package className="w-4 h-4 text-primary" />
                                <span className="font-semibold text-foreground text-sm">
                                  Batch — {items.length} units
                                </span>
                                <Badge variant="outline" className="text-[10px] font-mono">
                                  Batch ID: {String(key).slice(0, 8)}
                                </Badge>
                              </>
                            ) : (
                              <span className="font-semibold text-foreground text-sm">{first?.auction_title}</span>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {items.map((a: any) => {
                            const derived = getAuctionStatus(a);
                            const canSellerEdit = derived === 'upcoming' && (a.total_bids || 0) === 0;
                            return (
                            <Card
                              key={a.id}
                              className="border border-border hover:border-primary/40 transition-colors"
                            >
                              <CardContent className="p-3">
                                <div
                                  className="flex items-center gap-3 cursor-pointer"
                                  onClick={() => navigate(`/auctions/${a.id}`)}
                                >
                                  <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                                    {(a.robots?.images?.[0] || a.images?.[0]) ? (
                                      <img src={a.robots?.images?.[0] || a.images?.[0]} className="w-full h-full object-cover" alt="" />
                                    ) : <Bot className="w-5 h-5 text-muted-foreground m-auto mt-3.5" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">
                                      {isBatch ? `Unit ${a.unit_number || '?'} of ${a.batch_size || items.length}` : a.auction_title}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">
                                      ₹{Number(a.current_highest_bid || a.starting_price || 0).toLocaleString('en-IN')} • {a.total_bids || 0} bids
                                    </p>
                                  </div>
                                  <Badge variant="outline" className="capitalize text-[10px]">{derived}</Badge>
                                </div>
                                {canSellerEdit && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full mt-2 h-7 text-xs gap-1"
                                    onClick={(e) => { e.stopPropagation(); navigate(`/auctions/${a.id}/edit`); }}
                                  >
                                    <Pencil className="w-3 h-3" /> Edit listing
                                  </Button>
                                )}
                                <AuctionBidsPanel auctionId={a.id} sellerId={a.seller_id} totalBids={a.total_bids} />
                              </CardContent>
                            </Card>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          )}
          {user && (
            <TabsContent value="mybids">
              {loadingBids ? (
                <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
              ) : !myBids?.length ? (
                <div className="flex flex-col items-center py-16">
                  <Gavel className="w-16 h-16 text-muted-foreground/30 mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-1">No bids yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">Browse live auctions to start bidding.</p>
                  <Button variant="outline" onClick={() => setTab('live')}>View Live Auctions</Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {myBids.map((bid: any) => (
                    <Card key={bid.id} className="border border-border bg-card hover:border-primary/30 transition-colors cursor-pointer" onClick={() => navigate(`/auctions/${bid.auction_id}`)}>
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                            {bid.auctions?.robots?.images?.[0] || bid.auctions?.images?.[0] ? (
                              <img src={bid.auctions?.robots?.images?.[0] || bid.auctions?.images?.[0]} className="w-full h-full object-cover" alt="" />
                            ) : <Bot className="w-6 h-6 text-muted-foreground m-auto mt-4" />}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{bid.auctions?.auction_title || 'Auction'}</p>
                            <p className="text-sm text-muted-foreground">Your bid: <span className="text-primary font-semibold">₹{bid.bid_amount?.toLocaleString('en-IN')}</span></p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {bid.is_winning_bid && <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Winning</Badge>}
                          <Badge variant="outline" className="capitalize">{bid.auctions?.status}</Badge>
                          <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </main>

      <Footer />
    </div>
  );
};

export default Auctions;
