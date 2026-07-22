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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
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
  Pencil,
  Calendar,
  Clock,
  IndianRupee,
  Package,
  FileText,
  ShieldCheck,
  Truck,
  Wrench,
  Info,
} from "lucide-react";
import { getAuctionStatus, isBiddable } from "@/utils/auctionStatus";
import { getMinNextBid } from "@/utils/bidIncrements";
import { useIsAdmin } from "@/hooks/useIsAdmin";

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

  const [showTerms, setShowTerms] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);

  const submitBid = () => {
    if (!id || !bidAmount) return;
    placeBid.mutate({ auctionId: id, bidAmount: parseFloat(bidAmount) });
    setBidAmount("");
  };

  const handleBid = () => {
    if (!id || !bidAmount) return;
    const accepted = localStorage.getItem("auction_terms_accepted") === "true";
    if (!accepted) {
      setTermsChecked(false);
      setShowTerms(true);
      return;
    }
    submitBid();
  };

  const handleAcceptTerms = () => {
    localStorage.setItem("auction_terms_accepted", "true");
    setShowTerms(false);
    submitBid();
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

        {/* LIST VIEW LAYOUT - Single Column */}
        <div className="grid grid-cols-1 gap-6">
          {/* TOP SECTION: Key Info Cards in Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Status & ID Card */}
            <Card className="border-border">
              <CardContent className="p-4 flex items-center gap-3">
                <AuctionStatusBadge auction={auction} className="px-3 py-1" />
                <Badge variant="outline" className="bg-background">
                  ID: {auction.id.substring(0, 8).toUpperCase()}
                </Badge>
              </CardContent>
            </Card>

            {/* Location Card */}
            <Card className="border-border">
              <CardContent className="p-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="font-semibold text-sm">
                    {auction.item_location || auction.robots?.location || "-"}
                    {auction.robots?.state ? `, ${auction.robots.state}` : ""}
                    {auction.robots?.pincode ? ` — ${auction.robots.pincode}` : ""}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Auction Type Card */}
            <Card className="border-border">
              <CardContent className="p-4 flex items-center gap-2">
                <Gavel className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Auction Type</p>
                  <p className="font-semibold text-sm capitalize">{auction.auction_type}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Title Card */}
          <Card className="border-border">
            <CardContent className="p-6">
              <h1 className="text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight">
                {auction.auction_title}
              </h1>
            </CardContent>
          </Card>

          {/* Main Image */}
          <Card className="border-border overflow-hidden">
            <CardContent className="p-0">
              <div className="aspect-[16/9] relative bg-muted flex items-center justify-center">
                {img ? (
                  <img src={img} alt={auction.auction_title} className="w-full h-full object-contain p-8" />
                ) : (
                  <Bot className="w-32 h-32 text-muted-foreground/20" />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Price & Countdown Card */}
          <Card className="border-2 border-primary/20 shadow-md">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Current Price</p>
                  <p className="text-3xl font-bold text-primary">
                    {auction.current_highest_bid > 0
                      ? formatPrice(auction.current_highest_bid)
                      : formatPrice(auction.starting_price)}
                  </p>
                </div>
                <div className="flex gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Starting Price</p>
                    <p className="font-semibold">{formatPrice(auction.starting_price)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Min. Increment</p>
                    <p className="font-semibold">{formatPrice(auction.min_increment)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Total Bids</p>
                    <p className="font-semibold flex items-center gap-1">
                      <TrendingUp className="w-4 h-4" />
                      {auction.total_bids || 0}
                    </p>
                  </div>
                </div>
              </div>

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
            </CardContent>
          </Card>

          {/* Technical Specifications - List Style */}
          <Card className="border-border">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                Technical Specifications
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {auction.robots ? (
                <div className="divide-y divide-border">
                  {[
                    ["Manufacturer", auction.robots.brand || "-"],
                    ["Model Name", auction.robots.name || "-"],
                    ["Model Number", auction.robots.model || "-"],
                    ["Robot Type", auction.robots.robot_type || "-"],
                    ["Condition", <span className="capitalize">{auction.robots.condition || "Used"}</span>],
                    ["Year Manufactured", auction.robots.year_manufactured || "-"],
                    [
                      "Payload Capacity",
                      auction.robots.payload_capacity ? `${auction.robots.payload_capacity} kg` : "-",
                    ],
                    ["Reach", auction.robots.reach ? `${auction.robots.reach} mm` : "-"],
                    ["Repeatability", auction.robots.repeatability ? `± ${auction.robots.repeatability} mm` : "-"],
                    [
                      "Power Consumption",
                      auction.robots.power_consumption ? `${auction.robots.power_consumption} kW` : "-",
                    ],
                    ["Controller Type", auction.robots.controller_type || "-"],
                    ["Operating Environment", auction.robots.operating_environment || "-"],
                    ["Warranty (Item)", auction.robots.warranty_info || "-"],
                  ].map(([label, value], idx) => (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-2 p-4 hover:bg-muted/30">
                      <span className="text-sm text-muted-foreground font-medium">{label}</span>
                      <span className="text-sm font-semibold text-foreground md:col-span-2">{value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground p-4">Detailed specifications are currently unavailable.</p>
              )}
            </CardContent>
          </Card>

          {/* Applications */}
          {auction.robots?.applications?.length && (
            <Card className="border-border">
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-primary" />
                  Applications
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-2">
                  {auction.robots.applications.map((a) => (
                    <Badge key={a} variant="secondary" className="text-sm">
                      {a}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Certifications */}
          {auction.robots?.certification_standards?.length && (
            <Card className="border-border">
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                  Certifications & Standards
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-2">
                  {auction.robots.certification_standards.map((c) => (
                    <Badge key={c} variant="outline" className="text-sm">
                      {c}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Included Accessories */}
          {auction.robots?.included_accessories?.length && (
            <Card className="border-border">
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary" />
                  Included Accessories
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <ul className="space-y-2">
                  {auction.robots.included_accessories.map((a, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-foreground">{a}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Item Overview */}
          {auction.robots?.description && (
            <Card className="border-border">
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Info className="w-5 h-5 text-primary" />
                  Item Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <p className="text-sm text-foreground/90 whitespace-pre-line leading-relaxed">
                  {auction.robots.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Auction Description */}
          {auction.description && (
            <Card className="border-border">
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Auction Description
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="p-4 bg-muted/30 rounded-lg border border-border/50 text-foreground leading-relaxed whitespace-pre-line">
                  {auction.description}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Auction Terms & Logistics - List Style */}
          {(auction.inspection_details ||
            auction.payment_terms ||
            auction.delivery_terms ||
            auction.warranty_period ||
            auction.terms_and_conditions) && (
            <Card className="border-border">
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  Auction Terms & Logistics
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {auction.inspection_details && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 p-4 hover:bg-muted/30">
                      <div className="flex items-center gap-2 md:col-span-1">
                        <Eye className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-muted-foreground">Inspection</span>
                      </div>
                      <p className="text-sm text-foreground md:col-span-3">{auction.inspection_details}</p>
                    </div>
                  )}
                  {auction.payment_terms && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 p-4 hover:bg-muted/30">
                      <div className="flex items-center gap-2 md:col-span-1">
                        <IndianRupee className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-muted-foreground">Payment Terms</span>
                      </div>
                      <p className="text-sm text-foreground md:col-span-3">{auction.payment_terms}</p>
                    </div>
                  )}
                  {auction.delivery_terms && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 p-4 hover:bg-muted/30">
                      <div className="flex items-center gap-2 md:col-span-1">
                        <Truck className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-muted-foreground">Delivery / Shipping</span>
                      </div>
                      <p className="text-sm text-foreground md:col-span-3">{auction.delivery_terms}</p>
                    </div>
                  )}
                  {auction.warranty_period && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 p-4 hover:bg-muted/30">
                      <div className="flex items-center gap-2 md:col-span-1">
                        <ShieldCheck className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-muted-foreground">Warranty Period</span>
                      </div>
                      <p className="text-sm text-foreground md:col-span-3">{auction.warranty_period}</p>
                    </div>
                  )}
                  {auction.terms_and_conditions && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 p-4 hover:bg-muted/30">
                      <div className="flex items-center gap-2 md:col-span-1">
                        <FileText className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-muted-foreground">Terms & Conditions</span>
                      </div>
                      <p className="text-sm text-foreground md:col-span-3">{auction.terms_and_conditions}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Extended Auction Alert */}
          {wasExtended && (
            <Card className="border-orange-500/30 bg-orange-500/10">
              <CardContent className="p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-orange-600 dark:text-orange-400">
                    Anti-Sniper Protection Activated
                  </h4>
                  <p className="text-sm text-orange-600/90 dark:text-orange-400/90 mt-1">
                    This auction was extended due to a bid placed in the final minutes to allow all bidders a fair
                    chance.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Bidding Section */}
          <Card className="border-2 border-primary/20 shadow-md">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-lg flex items-center gap-2">
                <Gavel className="w-5 h-5 text-primary" />
                Place Your Bid
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {canBid && !isSeller ? (
                user ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-foreground">Place your max bid</label>
                      <span className="text-sm text-muted-foreground">Min: {formatPrice(minBid)}</span>
                    </div>
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
                  <div className="space-y-4 text-center py-4">
                    <Lock className="w-10 h-10 text-primary/40 mx-auto mb-2" />
                    <h3 className="font-semibold text-lg">Professional Buyers Only</h3>
                    <p className="text-sm text-muted-foreground pb-2">
                      You must be logged in with an approved buyer account to participate in this industrial auction.
                    </p>
                    <Button className="h-12 text-md font-bold" onClick={() => navigate("/auth")}>
                      Sign In / Register to Bid
                    </Button>
                  </div>
                )
              ) : isSeller ? (
                <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg text-center">
                  <CheckCircle2 className="w-8 h-8 text-primary mx-auto mb-2" />
                  <h3 className="font-semibold text-primary">Your Auction Listing</h3>
                  <p className="text-sm text-muted-foreground mt-1">You cannot bid on your own item.</p>
                  {derived === "upcoming" && (auction?.total_bids || 0) === 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 gap-1"
                      onClick={() => navigate(`/auctions/${id}/edit`)}
                    >
                      <Pencil className="w-3.5 h-3.5" /> Edit listing
                    </Button>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">This auction has ended.</p>
              )}
              <AdminEditControl auctionId={id!} />
            </CardContent>
          </Card>

          {/* Bidding History */}
          {user && (
            <Card className="border-border">
              <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Bidding History
                </CardTitle>
                <Badge variant="secondary">{auction.total_bids || 0} Bids</Badge>
              </CardHeader>
              <CardContent className="p-0">
                {bids && bids.length > 0 ? (
                  <div className="divide-y divide-border">
                    {bids.map((bid, idx) => {
                      const isYou = bid.bidder_name === "You";
                      return (
                        <div
                          key={bid.id}
                          className={`grid grid-cols-1 md:grid-cols-4 gap-2 p-4 ${idx === 0 ? "bg-primary/5" : ""}`}
                        >
                          <div className="flex items-center gap-2 md:col-span-2">
                            {idx === 0 && <Award className="w-4 h-4 text-primary" />}
                            <div>
                              <p className={`text-sm font-medium ${isYou ? "text-primary" : "text-foreground"}`}>
                                {isYou ? "You" : isSeller ? bid.bidder_name : "Bidder ***"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(bid.created_at).toLocaleString("en-IN")}
                              </p>
                            </div>
                          </div>
                          <div className="md:col-span-2 flex md:justify-end items-center">
                            <span className="text-lg font-bold">{formatPrice(bid.bid_amount)}</span>
                          </div>
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

          {/* Contact Card */}
          <Card className="border-border">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Key Account Manager
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-3">
                For any questions about this auction, contact your RobotVerse Key Account Manager.
              </p>
              <Button
                variant="outline"
                className="w-full justify-start h-12 gap-3"
                onClick={() => (window.location.href = "tel:+918610925352")}
              >
                <PhoneCall className="w-4 h-4 text-primary" />
                <span className="font-semibold">+91 86109 25352</span>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />

      <Dialog open={showTerms} onOpenChange={setShowTerms}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Auction Terms & Conditions</DialogTitle>
            <DialogDescription>
              Please review and accept the bidding terms before placing your first bid.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-64 overflow-y-auto text-sm text-foreground/90 space-y-2 border rounded-md p-4 bg-muted/30">
            <p>
              1. All bids placed are legally binding. If you win, you commit to purchase the item at the winning bid
              price.
            </p>
            <p>2. Bids cannot be retracted once submitted. Ensure your bid amount is correct before confirming.</p>
            <p>
              3. Winning bids are subject to <strong>admin approval</strong>. On approval, a confirmation email is sent
              to you and to <strong>support@robotverse.in</strong> with all payment details.
            </p>
            <p>
              4. <strong>Total payable = Winning Bid + 2% Platform Fee + 18% GST on the fee.</strong> Payment is routed
              via RobotVerse-mediated escrow / bank details shared by the Key Account Manager (+91 86109 25352).
            </p>
            <p>5. Payment must be completed as per the seller's stated payment terms after admin approval.</p>
            <p>6. Inspection, delivery, and warranty are governed by the terms listed on this auction page.</p>
            <p>
              7. RobotVerse acts as a facilitator; disputes are to be resolved between buyer and seller with platform
              mediation via the Key Account Manager.
            </p>
            <p>8. Anti-sniping: bids placed near close time may extend the auction to allow fair competition.</p>
            <p>9. Cancellation after admin approval attracts full platform fee + GST liability.</p>
            <p>10. Violation of bidding rules may result in account suspension.</p>
          </div>
          <div className="flex items-start gap-2 pt-2">
            <Checkbox id="accept-terms" checked={termsChecked} onCheckedChange={(v) => setTermsChecked(!!v)} />
            <label htmlFor="accept-terms" className="text-sm cursor-pointer">
              I have read and agree to the auction terms and conditions.
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTerms(false)}>
              Cancel
            </Button>
            <Button disabled={!termsChecked} onClick={handleAcceptTerms}>
              Accept & Place Bid
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Admin-only edit shortcut
const AdminEditControl: React.FC<{ auctionId: string }> = ({ auctionId }) => {
  const navigate = useNavigate();
  const { isAdmin } = useIsAdmin();
  if (!isAdmin) return null;
  return (
    <div className="mt-3 border border-amber-500/30 bg-amber-500/5 rounded-lg p-3">
      <p className="text-xs text-amber-500 font-semibold mb-2 flex items-center gap-1">
        <Shield className="w-3.5 h-3.5" /> Admin controls
      </p>
      <Button
        variant="outline"
        size="sm"
        className="w-full gap-1 border-amber-500/40"
        onClick={() => navigate(`/auctions/${auctionId}/edit`)}
      >
        <Pencil className="w-3.5 h-3.5" /> Edit auction (override)
      </Button>
    </div>
  );
};

export default AuctionDetail;
