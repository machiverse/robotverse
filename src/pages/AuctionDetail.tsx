import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import EnhancedHeader from "@/components/EnhancedHeader";
import Footer from "@/components/Footer";
import { useAuctionDetail, useAuctionBids, usePlaceBid, useFinalizeAuction } from "@/hooks/useAuctions";
import { useAuth } from "@/hooks/useAuth";
import AuctionCountdown from "@/components/auction/AuctionCountdown";
import AuctionStatusBadge from "@/components/auction/AuctionStatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Gavel,
  ArrowLeft,
  Bot,
  MapPin,
  Users,
  TrendingUp,
  Shield,
  Building,
  User,
  Loader2,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Award,
  PhoneCall,
  Mail,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import { getAuctionStatus, isBiddable } from "@/utils/auctionStatus";
import { getMinNextBid } from "@/utils/bidIncrements";

const AuctionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: auction, isLoading } = useAuctionDetail(id);
  const { data: bids } = useAuctionBids(id, auction?.seller_id);
  const placeBid = usePlaceBid();
  const finalize = useFinalizeAuction();
  const [bidAmount, setBidAmount] = useState("");

  const formatPrice = (v: number) => `₹${v.toLocaleString("en-IN")}`;
  const derived = auction ? getAuctionStatus(auction) : "ended";
  const canBid = auction ? isBiddable(auction) : false;
  const isSeller = user?.id === auction?.seller_id;
  const minBid = auction
    ? getMinNextBid(auction.current_highest_bid || 0, auction.starting_price, auction.min_increment)
    : 0;
  const wasExtended = !!(auction as any)?.original_end_time && ((auction as any)?.extensions_count || 0) > 0;

  const userHasBid = bids?.some((b) => b.bidder_name === "You") || false;
  const userBids = bids?.filter((b) => b.bidder_name === "You") || [];
  const isHighestBidder = bids?.[0]?.bidder_name === "You";

  const handleBid = () => {
    if (!id || !bidAmount) return;
    placeBid.mutate({ auctionId: id, bidAmount: parseFloat(bidAmount) });
    setBidAmount("");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <EnhancedHeader />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <EnhancedHeader />
        <div className="flex-1 container mx-auto px-4 flex flex-col items-center justify-center text-center">
          <Gavel className="w-20 h-20 text-muted-foreground/30 mb-6" />
          <h2 className="text-2xl font-bold text-foreground mb-4">Auction not found or unavailable</h2>
          <Button size="lg" onClick={() => navigate("/auctions")}>
            Return to Marketplace
          </Button>
        </div>
      </div>
    );
  }

  const img = auction.robots?.images?.[0] || auction.images?.[0];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <EnhancedHeader />

      <div className="container mx-auto px-4 py-8 flex-1">
        {/* Breadcrumb / Back Navigation */}
        <nav className="flex items-center text-sm text-muted-foreground mb-6">
          <button onClick={() => navigate("/auctions")} className="hover:text-primary transition-colors">
            Auctions
          </button>
          <ChevronRight className="w-4 h-4 mx-2" />
          <span className="capitalize">{auction.auction_type}</span>
          <ChevronRight className="w-4 h-4 mx-2" />
          <span className="text-foreground font-medium truncate max-w-[200px]">{auction.auction_title}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT COLUMN: Media & Specs (Machineseeker style) */}
          <div className="lg:col-span-8 space-y-8">
            {/* Header Section */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <AuctionStatusBadge auction={auction} className="px-3 py-1 text-sm rounded-md" />
                <Badge variant="outline" className="px-3 py-1 text-sm bg-background">
                  ID: {auction.id.substring(0, 8).toUpperCase()}
                </Badge>
              </div>
              <h1 className="text-3xl lg:text-4xl font-extrabold text-foreground tracking-tight mb-4">
                {auction.auction_title}
              </h1>
              {(auction.item_location || auction.robots?.location) && (
                <div className="flex items-center text-muted-foreground mb-4">
                  <MapPin className="w-5 h-5 mr-2 text-primary" />
                  <span className="text-lg">
                    Location: {auction.item_location || auction.robots?.location}
                    {auction.robots?.state ? `, ${auction.robots.state}` : ''}
                    {auction.robots?.pincode ? ` — ${auction.robots.pincode}` : ''}
                  </span>
                </div>
              )}
            </div>

            {/* Main Image Gallery */}
            <div className="bg-white dark:bg-card border border-border rounded-xl overflow-hidden shadow-sm">
              <div className="aspect-[4/3] md:aspect-[16/9] relative bg-muted flex items-center justify-center">
                {img ? (
                  <img src={img} alt={auction.auction_title} className="w-full h-full object-contain p-4" />
                ) : (
                  <Bot className="w-32 h-32 text-muted-foreground/20" />
                )}
              </div>
            </div>

            {/* Technical Specifications */}
            <div className="space-y-6">
              <h3 className="text-2xl font-bold border-b border-border pb-3">Technical Specifications</h3>

              {auction.robots ? (
                (() => {
                  const r = auction.robots!;
                  const rows: Array<[string, React.ReactNode]> = [
                    ['Manufacturer', r.brand || '-'],
                    ['Model Name', r.name || '-'],
                    ['Model Number', r.model || '-'],
                    ['Robot Type', r.robot_type || '-'],
                    ['Condition', <span className="capitalize">{r.condition || 'Used'}</span>],
                    ['Year Manufactured', r.year_manufactured || '-'],
                    ['Payload Capacity', r.payload_capacity ? `${r.payload_capacity} kg` : '-'],
                    ['Reach', r.reach ? `${r.reach} mm` : '-'],
                    ['Repeatability', r.repeatability ? `± ${r.repeatability} mm` : '-'],
                    ['Power Consumption', r.power_consumption ? `${r.power_consumption} kW` : '-'],
                    ['Controller Type', r.controller_type || '-'],
                    ['Operating Environment', r.operating_environment || '-'],
                    ['Warranty (Item)', r.warranty_info || '-'],
                  ];
                  return (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-1">
                        {rows.map(([k, v]) => (
                          <div key={k} className="flex justify-between py-2 border-b border-border/50 text-sm">
                            <span className="text-muted-foreground">{k}</span>
                            <span className="font-semibold text-right">{v}</span>
                          </div>
                        ))}
                      </div>

                      {r.applications?.length ? (
                        <div>
                          <h4 className="text-base font-semibold mb-2">Applications</h4>
                          <div className="flex flex-wrap gap-2">
                            {r.applications.map((a) => (
                              <Badge key={a} variant="secondary" className="text-xs">{a}</Badge>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {r.certification_standards?.length ? (
                        <div>
                          <h4 className="text-base font-semibold mb-2">Certifications & Standards</h4>
                          <div className="flex flex-wrap gap-2">
                            {r.certification_standards.map((c) => (
                              <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {r.included_accessories?.length ? (
                        <div>
                          <h4 className="text-base font-semibold mb-2">Included Accessories</h4>
                          <ul className="list-disc list-inside text-sm text-foreground/90 space-y-1">
                            {r.included_accessories.map((a) => <li key={a}>{a}</li>)}
                          </ul>
                        </div>
                      ) : null}

                      {r.description && (
                        <div>
                          <h4 className="text-base font-semibold mb-2">Item Overview</h4>
                          <p className="text-sm text-foreground/90 whitespace-pre-line leading-relaxed">{r.description}</p>
                        </div>
                      )}
                    </>
                  );
                })()
              ) : (
                <p className="text-muted-foreground">Detailed specifications are currently unavailable.</p>
              )}

              {auction.description && (
                <div className="mt-8">
                  <h4 className="text-lg font-semibold mb-3">Auction Description</h4>
                  <div className="p-6 bg-muted/30 rounded-lg border border-border/50 text-foreground leading-relaxed whitespace-pre-line">
                    {auction.description}
                  </div>
                </div>
              )}

              {/* Auction-specific commercial details */}
              {(auction.inspection_details || auction.payment_terms || auction.delivery_terms || auction.warranty_period || auction.terms_and_conditions) && (
                <div className="mt-8 space-y-4">
                  <h3 className="text-2xl font-bold border-b border-border pb-3">Auction Terms & Logistics</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {auction.inspection_details && (
                      <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Inspection</p>
                        <p className="text-sm whitespace-pre-line">{auction.inspection_details}</p>
                      </div>
                    )}
                    {auction.payment_terms && (
                      <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Payment Terms</p>
                        <p className="text-sm whitespace-pre-line">{auction.payment_terms}</p>
                      </div>
                    )}
                    {auction.delivery_terms && (
                      <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Delivery / Shipping</p>
                        <p className="text-sm whitespace-pre-line">{auction.delivery_terms}</p>
                      </div>
                    )}
                    {auction.warranty_period && (
                      <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Warranty Period</p>
                        <p className="text-sm whitespace-pre-line">{auction.warranty_period}</p>
                      </div>
                    )}
                  </div>
                  {auction.terms_and_conditions && (
                    <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Terms & Conditions</p>
                      <p className="text-sm whitespace-pre-line">{auction.terms_and_conditions}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Extended Auction Alert */}
            {wasExtended && (
              <div className="flex items-start gap-3 rounded-lg border border-orange-500/30 bg-orange-500/10 p-4 text-orange-600 dark:text-orange-400">
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold">Anti-Sniper Protection Activated</h4>
                  <p className="text-sm mt-1">
                    This auction was extended due to a bid placed in the final minutes to allow all bidders a fair
                    chance.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Sticky Bidding Panel & Contact */}
          <div className="lg:col-span-4 space-y-6">
            <div className="sticky top-24 space-y-6">
              {/* Main Action Card */}
              <Card className="border-2 border-primary/20 shadow-lg">
                <CardHeader className="bg-muted/30 border-b border-border pb-4">
                  <CardTitle className="text-lg flex justify-between items-center">
                    <span>Current Price</span>
                    <span className="text-2xl font-bold text-primary">
                      {auction.current_highest_bid > 0
                        ? formatPrice(auction.current_highest_bid)
                        : formatPrice(auction.starting_price)}
                    </span>
                  </CardTitle>
                </CardHeader>

                <CardContent className="p-6 space-y-6">
                  {/* Countdown Timer */}
                  {(derived === "live" || derived === "ending_soon" || derived === "upcoming") && (
                    <div className="bg-background rounded-lg border border-border p-4">
                      <AuctionCountdown
                        endTime={auction.end_time}
                        startTime={auction.start_time}
                        status={derived === "upcoming" ? "upcoming" : "live"}
                        onComplete={() => id && finalize.mutate(id)}
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 text-sm bg-muted/20 p-4 rounded-lg">
                    <div>
                      <p className="text-muted-foreground mb-1">Starting Price</p>
                      <p className="font-medium">{formatPrice(auction.starting_price)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">Min. Increment</p>
                      <p className="font-medium">{formatPrice(auction.min_increment)}</p>
                    </div>
                  </div>

                  {/* Bidding Logic */}
                  {canBid && !isSeller ? (
                    user ? (
                      <div className="space-y-4 pt-2 border-t border-border">
                        <label className="text-sm font-semibold text-foreground flex items-center justify-between">
                          <span>Place your max bid</span>
                          <span className="text-muted-foreground font-normal">Min: {formatPrice(minBid)}</span>
                        </label>
                        <div className="flex gap-3">
                          <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                              ₹
                            </span>
                            <Input
                              type="number"
                              placeholder={minBid.toString()}
                              value={bidAmount}
                              onChange={(e) => setBidAmount(e.target.value)}
                              className="pl-8 text-lg font-semibold h-12"
                              min={minBid}
                            />
                          </div>
                          <Button
                            size="lg"
                            className="h-12 px-8 text-md font-bold"
                            onClick={handleBid}
                            disabled={placeBid.isPending || !bidAmount || parseFloat(bidAmount) < minBid}
                          >
                            {placeBid.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "BID NOW"}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground text-center">
                          By clicking Bid Now, you commit to buy this item if you are the winning bidder.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4 pt-4 border-t border-border text-center">
                        <Lock className="w-10 h-10 text-primary/40 mx-auto mb-2" />
                        <h3 className="font-semibold text-lg">Professional Buyers Only</h3>
                        <p className="text-sm text-muted-foreground pb-2">
                          You must be logged in with an approved buyer account to participate in this industrial
                          auction.
                        </p>
                        <Button className="w-full h-12 text-md font-bold" onClick={() => navigate("/auth")}>
                          Sign In / Register to Bid
                        </Button>
                      </div>
                    )
                  ) : null}

                  {isSeller && (
                    <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg text-center">
                      <CheckCircle2 className="w-8 h-8 text-primary mx-auto mb-2" />
                      <h3 className="font-semibold text-primary">Your Auction Listing</h3>
                      <p className="text-sm text-muted-foreground mt-1">You cannot bid on your own item.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Seller / Contact Box */}
              <Card className="border border-border shadow-sm">
                <CardHeader className="pb-3 border-b border-border/50">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Building className="w-5 h-5 text-primary" />
                    Supplier Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  <div className="mb-4">
                    <p className="font-bold text-lg text-foreground">
                      {auction.seller_profile?.company_name ||
                        auction.seller_profile?.full_name ||
                        'Industrial Supplier'}
                    </p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Verified Seller
                    </p>
                    {(auction.item_location || auction.seller_profile?.location) && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-2">
                        <MapPin className="w-3.5 h-3.5" />
                        {auction.item_location || auction.seller_profile?.location}
                      </p>
                    )}
                  </div>


                  <Separator />

                  <div className="space-y-3 pt-2">
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      Have a question about this machine?
                    </p>

                    <div className="flex items-center gap-3 text-sm">
                      <div className="bg-primary/10 p-2 rounded-full">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">
                          {auction.seller_profile?.company_name || auction.seller_profile?.full_name || 'RobotVerse Supplier'}
                        </p>
                        <p className="text-muted-foreground">Verified Account Manager</p>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      className="w-full justify-start h-12 mt-2 gap-3"
                      onClick={() => (window.location.href = "tel:+918610925352")}
                    >
                      <PhoneCall className="w-4 h-4 text-primary" />
                      <span className="font-semibold">+91 8610925352</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Bidding History (Simplified for Sidebar) */}
              {user && (
                <Card className="border border-border shadow-sm">
                  <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" /> Bid History
                    </CardTitle>
                    <Badge variant="secondary">{auction.total_bids || 0} Bids</Badge>
                  </CardHeader>
                  <CardContent className="px-0 pb-0 max-h-60 overflow-y-auto">
                    {bids && bids.length > 0 ? (
                      <div className="divide-y divide-border">
                        {bids.map((bid, i) => {
                          const isYou = bid.bidder_name === "You";
                          return (
                            <div
                              key={bid.id}
                              className={`p-4 flex justify-between items-center ${i === 0 ? "bg-primary/5" : ""}`}
                            >
                              <div className="flex items-center gap-2">
                                {i === 0 && <Award className="w-4 h-4 text-primary" />}
                                <div>
                                  <p className={`text-sm font-medium ${isYou ? "text-primary" : "text-foreground"}`}>
                                    {isYou ? "You" : isSeller ? bid.bidder_name : "Bidder ***"}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {new Date(bid.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <span className="font-bold">{formatPrice(bid.bid_amount)}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center p-6">No bids yet.</p>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default AuctionDetail;
