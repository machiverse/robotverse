import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import EnhancedHeader from "@/components/EnhancedHeader";
import Footer from "@/components/Footer";
import { useAuctions } from "@/hooks/useAuctions";
import { useAuth } from "@/hooks/useAuth";
import AuctionStatusBadge from "@/components/auction/AuctionStatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Gavel,
  Bot,
  MapPin,
  TrendingUp,
  Loader2,
  Search,
  Filter,
  Grid,
  List,
  ArrowUpDown,
  Calendar,
  Clock,
  IndianRupee,
  Eye,
  ChevronRight,
  Settings,
  SlidersHorizontal,
} from "lucide-react";
import { getAuctionStatus } from "@/utils/auctionStatus";

const AuctionsList: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, isLoading } = useAuctions();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("ending_soon");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  const formatPrice = (v: number) => `₹${v.toLocaleString("en-IN")}`;

  // Filter and sort auctions
  const filteredAuctions = data?.filter((auction) => {
    const matchesSearch =
      auction.auction_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      auction.robots?.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      auction.robots?.name?.toLowerCase().includes(searchQuery.toLowerCase());

    const status = getAuctionStatus(auction);
    const matchesStatus = statusFilter === "all" || status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const sortedAuctions = filteredAuctions?.sort((a, b) => {
    const statusA = getAuctionStatus(a);
    const statusB = getAuctionStatus(b);

    switch (sortBy) {
      case "ending_soon":
        return new Date(a.end_time).getTime() - new Date(b.end_time).getTime();
      case "price_low":
        return (a.current_highest_bid || a.starting_price) - (b.current_highest_bid || b.starting_price);
      case "price_high":
        return (b.current_highest_bid || b.starting_price) - (a.current_highest_bid || a.starting_price);
      case "newest":
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case "most_bids":
        return (b.total_bids || 0) - (a.total_bids || 0);
      default:
        return 0;
    }
  });

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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <EnhancedHeader />

      <div className="container mx-auto px-4 py-8 flex-1">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-extrabold text-foreground tracking-tight mb-2">Industrial Robot Auctions</h1>
          <p className="text-muted-foreground text-lg">
            Browse and bid on verified industrial robots from trusted sellers
          </p>
        </div>

        {/* Filters & Search Bar */}
        <Card className="mb-6 border-border shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              {/* Search */}
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by robot name, brand, or model..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11"
                />
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[180px] h-11">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="live">Live</SelectItem>
                  <SelectItem value="ending_soon">Ending Soon</SelectItem>
                  <SelectItem value="ended">Ended</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort By */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full md:w-[180px] h-11">
                  <ArrowUpDown className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ending_soon">Ending Soon</SelectItem>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="price_low">Price: Low to High</SelectItem>
                  <SelectItem value="price_high">Price: High to Low</SelectItem>
                  <SelectItem value="most_bids">Most Bids</SelectItem>
                </SelectContent>
              </Select>

              {/* View Toggle */}
              <div className="flex border border-border rounded-md overflow-hidden">
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  className="h-11 px-3"
                  onClick={() => setViewMode("list")}
                >
                  <List className="w-4 h-4" />
                  <span className="ml-2 hidden md:inline">List</span>
                </Button>
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  className="h-11 px-3 border-l border-border"
                  onClick={() => setViewMode("grid")}
                >
                  <Grid className="w-4 h-4" />
                  <span className="ml-2 hidden md:inline">Grid</span>
                </Button>
              </div>
            </div>

            {/* Results Count */}
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Showing {filteredAuctions?.length || 0} of {data?.length || 0} auctions
              </span>
              <Button variant="ghost" size="sm" className="h-8 gap-1">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                More Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* No Results */}
        {!filteredAuctions?.length && (
          <Card className="border-border">
            <CardContent className="py-16 flex flex-col items-center justify-center text-center">
              <Gavel className="w-16 h-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No auctions found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your search or filters to find what you're looking for.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                }}
              >
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        )}

        {/* List View */}
        {viewMode === "list" && filteredAuctions?.length > 0 && (
          <div className="space-y-4">
            {sortedAuctions.map((auction) => {
              const status = getAuctionStatus(auction);
              const img = auction.robots?.images?.[0] || auction.images?.[0];
              const currentPrice = auction.current_highest_bid || auction.starting_price;

              return (
                <Card
                  key={auction.id}
                  className="border-border hover:border-primary/50 transition-colors cursor-pointer group"
                  onClick={() => navigate(`/auctions/${auction.id}`)}
                >
                  <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row gap-0 md:gap-6">
                      {/* Image Section */}
                      <div className="md:w-64 h-48 md:h-auto relative bg-muted flex-shrink-0">
                        {img ? (
                          <img src={img} alt={auction.auction_title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Bot className="w-16 h-16 text-muted-foreground/30" />
                          </div>
                        )}
                        <div className="absolute top-2 left-2">
                          <AuctionStatusBadge auction={auction} className="text-xs" />
                        </div>
                      </div>

                      {/* Content Section */}
                      <div className="flex-1 p-4 md:p-6 flex flex-col">
                        {/* Title & ID */}
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex-1">
                            <h2 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors mb-1">
                              {auction.auction_title}
                            </h2>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Badge variant="outline" className="text-[10px]">
                                ID: {auction.id.substring(0, 8).toUpperCase()}
                              </Badge>
                              <span>•</span>
                              <span className="capitalize">{auction.auction_type}</span>
                            </div>
                          </div>
                        </div>

                        {/* Key Specs */}
                        {auction.robots && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                            <div className="flex items-center gap-2 text-xs">
                              <Bot className="w-3.5 h-3.5 text-muted-foreground" />
                              <div>
                                <p className="text-muted-foreground">Brand</p>
                                <p className="font-semibold text-foreground">{auction.robots.brand || "-"}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <Settings className="w-3.5 h-3.5 text-muted-foreground" />
                              <div>
                                <p className="text-muted-foreground">Model</p>
                                <p className="font-semibold text-foreground">{auction.robots.name || "-"}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <IndianRupee className="w-3.5 h-3.5 text-muted-foreground" />
                              <div>
                                <p className="text-muted-foreground">Payload</p>
                                <p className="font-semibold text-foreground">
                                  {auction.robots.payload_capacity ? `${auction.robots.payload_capacity} kg` : "-"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                              <div>
                                <p className="text-muted-foreground">Location</p>
                                <p className="font-semibold text-foreground truncate max-w-[100px]">
                                  {auction.robots.location || auction.item_location || "-"}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Bottom Row: Price, Bids, Time, CTA */}
                        <div className="mt-auto pt-4 border-t border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                          {/* Price & Bids */}
                          <div className="flex items-center gap-6">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Current Price</p>
                              <p className="text-2xl font-bold text-primary">{formatPrice(currentPrice)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Bids</p>
                              <p className="text-lg font-semibold text-foreground flex items-center gap-1">
                                <TrendingUp className="w-4 h-4" />
                                {auction.total_bids || 0}
                              </p>
                            </div>
                          </div>

                          {/* Time */}
                          <div className="flex items-center gap-4">
                            {(status === "live" || status === "ending_soon" || status === "upcoming") && (
                              <div className="flex items-center gap-2 text-sm">
                                <Clock className="w-4 h-4 text-muted-foreground" />
                                <div>
                                  <p className="text-xs text-muted-foreground">
                                    {status === "upcoming" ? "Starts in" : "Ends in"}
                                  </p>
                                  <p className="font-semibold text-foreground">
                                    {new Date(
                                      status === "upcoming" ? auction.start_time : auction.end_time,
                                    ).toLocaleString("en-IN", {
                                      day: "numeric",
                                      month: "short",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </p>
                                </div>
                              </div>
                            )}

                            <Button
                              className="gap-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/auctions/${auction.id}`);
                              }}
                            >
                              <Eye className="w-4 h-4" />
                              View Details
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Grid View */}
        {viewMode === "grid" && filteredAuctions?.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedAuctions.map((auction) => {
              const status = getAuctionStatus(auction);
              const img = auction.robots?.images?.[0] || auction.images?.[0];
              const currentPrice = auction.current_highest_bid || auction.starting_price;

              return (
                <Card
                  key={auction.id}
                  className="border-border hover:border-primary/50 transition-all hover:shadow-lg cursor-pointer group"
                  onClick={() => navigate(`/auctions/${auction.id}`)}
                >
                  <CardContent className="p-0">
                    {/* Image */}
                    <div className="aspect-[4/3] relative bg-muted overflow-hidden">
                      {img ? (
                        <img
                          src={img}
                          alt={auction.auction_title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Bot className="w-16 h-16 text-muted-foreground/30" />
                        </div>
                      )}
                      <div className="absolute top-2 left-2">
                        <AuctionStatusBadge auction={auction} />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 space-y-3">
                      <h3 className="font-bold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                        {auction.auction_title}
                      </h3>

                      {auction.robots && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="secondary" className="text-[10px]">
                            {auction.robots.brand}
                          </Badge>
                          <span className="truncate">{auction.robots.name}</span>
                        </div>
                      )}

                      <Separator />

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Current Price</p>
                          <p className="text-lg font-bold text-primary">{formatPrice(currentPrice)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Bids</p>
                          <p className="text-sm font-semibold flex items-center gap-1">
                            <TrendingUp className="w-3.5 h-3.5" />
                            {auction.total_bids || 0}
                          </p>
                        </div>
                      </div>

                      <Button className="w-full gap-2" variant="outline">
                        <Eye className="w-4 h-4" />
                        View Auction
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default AuctionsList;
