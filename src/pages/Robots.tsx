// src/pages/Robots.tsx
import { useState, useEffect, useMemo } from "react";
import { OemRail, OemDot } from '@/components/oem/OemAccents';
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAuthReady } from "@/hooks/useAuthReady";
import { useUniversalViewTracking } from "@/hooks/useUniversalViewTracking";
import { useButtonTracking } from "@/hooks/useButtonTracking";
import { useRobotComparison } from "@/contexts/RobotComparisonContext";
import {
  Loader2,
  Bot,
  Grid,
  List,
  Search,
  TrendingUp,
  Eye,
  Share2,
  FileText,
  Brain,
  MapPin,
  Building,
  CheckCircle,
  Heart,
  Scale,
  Check,
  Tag,
} from "lucide-react";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import EnhancedHeader from "@/components/EnhancedHeader";
import SellerRobotCarousel from "@/components/SellerRobotCarousel";
import CategoryRobotCarousel from "@/components/CategoryRobotCarousel";
import ViewCountDisplay from "@/components/ViewCountDisplay";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { UniversalSEOHead } from "@/components/SEO/UniversalSEOHead";
import { useDynamicSEOKeywords } from "@/hooks/useDynamicSEOKeywords";
import { generateItemListSchema, generateBreadcrumbSchema } from "@/utils/seo/modernSchemas";
import UserProductRequestModal from "@/components/UserProductRequestModal";
import RobotQuoteModal from "@/components/forms/RobotQuoteModal";
import CopySearchLinkButton from "@/components/CopySearchLinkButton";
import { useUrlParam, useDebouncedUrlParam, useUrlBoolParam } from "@/hooks/useUrlState";

const Robots = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { isReady } = useAuthReady();
  const { toast } = useToast();
  const { getItemViewCount, trackItemView } = useUniversalViewTracking();
  const { trackButtonClick } = useButtonTracking();
  const { addRobot, isSelected, removeRobot } = useRobotComparison();
  const dynamicRobotKeywords = useDynamicSEOKeywords("robots");

  // === URL is the single source of truth for every filter/sort/view state ===
  // Search input is debounced so we don't spam history entries per keystroke.
  const [searchQuery, setSearchQuery] = useDebouncedUrlParam("search", "", 400);
  const [selectedRobotType, setSelectedRobotType] = useUrlParam<string>("type", "all");
  const [selectedManufacturer, setSelectedManufacturer] = useUrlParam<string>("brand", "all");
  const [selectedPayloadRange, setSelectedPayloadRange] = useUrlParam<string>("payload", "all");
  const [selectedCondition, setSelectedCondition] = useUrlParam<string>("condition", "all");
  const [selectedPriceRange, setSelectedPriceRange] = useUrlParam<string>("price", "all");
  const [selectedLocation, setSelectedLocation] = useUrlParam<string>("location", "all");
  const [sortBy, setSortBy] = useUrlParam<
    "views" | "price-low" | "price-high" | "newest" | "name"
  >("sort", "views");
  const [groupBy, setGroupBy] = useUrlParam<"all" | "category">("groupBy", "all");
  const [viewMode, setViewMode] = useUrlParam<"grid" | "list">("view", "grid");
  const [onlyWithOffers, setOnlyWithOffers] = useUrlBoolParam("offers");
  const [robotsWithOffers, setRobotsWithOffers] = useState<Set<string>>(new Set());

  // Watchlist
  const [watchlistItems, setWatchlistItems] = useState<Set<string>>(new Set());
  const [addingToWatchlist, setAddingToWatchlist] = useState<Set<string>>(new Set());

  // Data states
  const [robots, setRobots] = useState<any[]>([]);
  const [robotsWithViews, setRobotsWithViews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // AI Analysis dialog
  const [showAiDialog, setShowAiDialog] = useState(false);
  const [aiDialogLoading, setAiDialogLoading] = useState(false);
  const [aiDialogData, setAiDialogData] = useState<any | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [quoteRobot, setQuoteRobot] = useState<any>(null);

  // Fixed filter options - Business-logical structure
  const [locations, setLocations] = useState<{ value: string; label: string }[]>([
    { value: "all", label: "All Locations" },
  ]);
  const [conditions, setConditions] = useState<{ value: string; label: string }[]>([
    { value: "all", label: "All Conditions" },
  ]);
  const [robotTypes, setRobotTypes] = useState<{ value: string; label: string }[]>([
    { value: "all", label: "All Robot Types" },
  ]);
  const [manufacturers, setManufacturers] = useState<{ value: string; label: string }[]>([
    { value: "all", label: "All Manufacturers" },
  ]);

  // Fixed payload ranges (kg) for industrial robots
  const payloadRanges = [
    { value: "all", label: "All Payloads" },
    { value: "0-50", label: "0-50 kg" },
    { value: "50-100", label: "50-100 kg" },
    { value: "100-500", label: "100-500 kg" },
    { value: "500-1000", label: "500-1000 kg" },
    { value: "1000+", label: "1000+ kg" },
  ];

  // Fixed price ranges
  const priceRanges = [
    { value: "all", label: "All Prices" },
    { value: "under-50k", label: "Under ₹50,000" },
    { value: "50k-200k", label: "₹50,000 - ₹2,00,000" },
    { value: "200k-500k", label: "₹2,00,000 - ₹5,00,000" },
    { value: "500k-1m", label: "₹5,00,000 - ₹10,00,000" },
    { value: "over-1m", label: "Over ₹10,00,000" },
  ];

  // Filter changes are already URL-synced via the useUrl* hooks above.
  const handleRobotTypeChange = (value: string) => {
    setSelectedRobotType(value);
  };

  // Clear all filters — resetting each hook clears its URL param.
  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedRobotType("all");
    setSelectedManufacturer("all");
    setSelectedPayloadRange("all");
    setSelectedCondition("all");
    setSelectedPriceRange("all");
    setSelectedLocation("all");
    setSortBy("views");
    setGroupBy("all");
    setViewMode("grid");
    setOnlyWithOffers(false);
  };

  // Fetch robots and filters
  useEffect(() => {
    if (!isReady) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        const { data, error } = await supabase
          .from("robots")
          .select("*, profiles!robots_seller_id_fkey(user_id, full_name, company_name, phone, mobile_number, email)")
          .eq("availability", "available")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setRobots(data || []);

        // View counts
        const robotsWithViewCounts = await Promise.all(
          (data || []).map(async (robot: any) => {
            const viewCount = await getItemViewCount("robots", robot.id);
            return { ...robot, viewCount };
          }),
        );
        setRobotsWithViews(robotsWithViewCounts);

        // Watchlist for user
        if (user) {
          const { data: watchlistData } = await supabase
            .from("watchlists")
            .select("item_id")
            .eq("user_id", user.id)
            .eq("item_type", "robot");

          if (watchlistData) {
            setWatchlistItems(new Set(watchlistData.map((item: any) => item.item_id)));
          }
        }

        // Extract filter options - Robot Type, Manufacturer, Condition, Location (business-logical filters)
        const uniqueLocations = new Set<string>();
        const uniqueConditions = new Set<string>();
        const uniqueRobotTypes = new Set<string>();
        const uniqueManufacturers = new Set<string>();

        (data || []).forEach((robot: any) => {
          if (robot.robot_type) uniqueRobotTypes.add(robot.robot_type);
          if (robot.brand) uniqueManufacturers.add(robot.brand.trim());
          if (robot.location) uniqueLocations.add(robot.location.trim());
          if (robot.condition) uniqueConditions.add(robot.condition.trim());
        });

        setLocations([
          { value: "all", label: "All Locations" },
          ...Array.from(uniqueLocations)
            .sort()
            .map((loc) => ({
              value: loc.toLowerCase().replace(/ /g, "-"),
              label: loc,
            })),
        ]);

        setConditions([
          { value: "all", label: "All Conditions" },
          ...Array.from(uniqueConditions)
            .sort()
            .map((cond) => ({
              value: cond.toLowerCase().replace(/ /g, "-"),
              label: cond,
            })),
        ]);

        setRobotTypes([
          { value: "all", label: "All Robot Types" },
          ...Array.from(uniqueRobotTypes)
            .sort()
            .map((type) => ({
              value: type, // Use original type name to match URL params
              label: type,
            })),
        ]);

        setManufacturers([
          { value: "all", label: "All Manufacturers" },
          ...Array.from(uniqueManufacturers)
            .sort()
            .map((brand) => ({
              value: brand.toLowerCase().replace(/ /g, "-"),
              label: brand,
            })),
        ]);
      } catch (err: any) {
        setError(err instanceof Error ? err.message : "Failed to load robots");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [getItemViewCount, user, isReady]);

  // Fetch active coupons to know which robots have offers
  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("seller_coupons")
        .select("seller_id, applies_to, applicable_robot_ids")
        .eq("is_active", true)
        .eq("admin_disabled", false)
        .gte("expiry_date", new Date().toISOString());
      if (!data) return;
      const sellersAll = new Set<string>();
      const robotIds = new Set<string>();
      data.forEach((c: any) => {
        if (c.applies_to === "all" || c.applies_to === "categories" || c.applies_to === "brands") {
          sellersAll.add(c.seller_id);
        } else if (c.applies_to === "robots" && Array.isArray(c.applicable_robot_ids)) {
          c.applicable_robot_ids.forEach((id: string) => robotIds.add(id));
        }
      });
      // Mark all robots whose seller has a generic coupon
      setRobotsWithOffers((prev) => {
        const set = new Set<string>(robotIds);
        robots.forEach((r) => {
          if (sellersAll.has(r.seller_id)) set.add(r.id);
        });
        return set;
      });
    })();
  }, [robots]);

  const getLabelFromValue = (arr: { value: string; label: string }[], value: string): string => {
    return arr.find((i) => i.value === value)?.label?.toLowerCase() || value;
  };

  const getFilteredGroups = () => {
    let filteredRobots = [...robotsWithViews];

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filteredRobots = filteredRobots.filter((r) => {
        return (
          r.name?.toLowerCase().includes(q) ||
          r.model?.toLowerCase().includes(q) ||
          r.robot_type?.toLowerCase().includes(q) ||
          r.category_tags?.some((tag: string) => tag.toLowerCase().includes(q))
        );
      });
    }

    // Robot type filter - direct comparison with original type name
    if (selectedRobotType !== "all") {
      filteredRobots = filteredRobots.filter((r) => r.robot_type === selectedRobotType);
    }

    // Manufacturer filter (using brand field)
    if (selectedManufacturer !== "all") {
      const brandLabel = getLabelFromValue(manufacturers, selectedManufacturer);
      filteredRobots = filteredRobots.filter((r) => r.brand?.toLowerCase() === brandLabel);
    }

    // Payload range filter (using payload_capacity field)
    if (selectedPayloadRange !== "all") {
      const payloadRangesMap: Record<string, [number, number]> = {
        "0-50": [0, 50],
        "50-100": [50, 100],
        "100-500": [100, 500],
        "500-1000": [500, 1000],
        "1000+": [1000, Infinity],
      };
      const [minPayload, maxPayload] = payloadRangesMap[selectedPayloadRange] || [0, Infinity];
      filteredRobots = filteredRobots.filter((r) => {
        const payload = r.payload_capacity || 0;
        return payload >= minPayload && payload < maxPayload;
      });
    }

    // Condition filter
    if (selectedCondition !== "all") {
      const condLabel = getLabelFromValue(conditions, selectedCondition);
      filteredRobots = filteredRobots.filter((r) => r.condition?.toLowerCase() === condLabel);
    }

    // Price range filter
    if (selectedPriceRange !== "all") {
      const ranges: Record<string, [number, number]> = {
        "under-50k": [0, 50000],
        "50k-200k": [50000, 200000],
        "200k-500k": [200000, 500000],
        "500k-1m": [500000, 1000000],
        "over-1m": [1000000, Infinity],
      };
      const [min, max] = ranges[selectedPriceRange] || [0, Infinity];
      filteredRobots = filteredRobots.filter((r) => r.price >= min && r.price <= max);
    }

    // Location filter
    if (selectedLocation !== "all") {
      const locLabel = getLabelFromValue(locations, selectedLocation);
      filteredRobots = filteredRobots.filter((r) => r.location?.toLowerCase() === locLabel);
    }

    // Offers filter
    if (onlyWithOffers) {
      filteredRobots = filteredRobots.filter((r) => robotsWithOffers.has(r.id));
    }

    // Sort
    filteredRobots.sort((a, b) => {
      switch (sortBy) {
        case "views":
          return (b.viewCount || 0) - (a.viewCount || 0);
        case "price-low":
          return (a.price || 0) - (b.price || 0);
        case "price-high":
          return (b.price || 0) - (a.price || 0);
        case "newest":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "name":
          return (a.name || "").localeCompare(b.name || "");
        default:
          return (b.viewCount || 0) - (a.viewCount || 0);
      }
    });

    const groups: Record<string, any[]> = {};

    if (groupBy === "category") {
      filteredRobots.forEach((r) => {
        const cat = r.robot_type || "Others";
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(r);
      });
    } else {
      groups["All Robots"] = filteredRobots;
    }

    return groups;
  };

  const filteredGroups = useMemo(
    () => getFilteredGroups(),
    [
      robotsWithViews,
      searchQuery,
      selectedRobotType,
      selectedManufacturer,
      selectedPayloadRange,
      selectedCondition,
      selectedPriceRange,
      selectedLocation,
      sortBy,
      groupBy,
      onlyWithOffers,
      robotsWithOffers,
    ],
  );

  const totalFilteredRobots = Object.values(filteredGroups).reduce((acc, arr) => acc + arr.length, 0);

  const formatPrice = (price?: number, currency = "USD") => {
    if (!price) return "Price on request";
    const symbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : "₹";
    return `${symbol}${price.toLocaleString()}`;
  };

  const handleAddToWatchlist = async (robot: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to add items to your watchlist.",
        variant: "destructive",
      });
      return;
    }
    const isInWatchlist = watchlistItems.has(robot.id);
    setAddingToWatchlist((prev) => {
      const set = new Set(prev);
      set.add(robot.id);
      return set;
    });

    try {
      if (isInWatchlist) {
        const { error } = await supabase
          .from("watchlists")
          .delete()
          .eq("user_id", user.id)
          .eq("item_type", "robot")
          .eq("item_id", robot.id);

        if (error) throw error;

        setWatchlistItems((prev) => {
          const set = new Set(prev);
          set.delete(robot.id);
          return set;
        });

        await trackButtonClick({
          buttonName: "Remove from Watchlist",
          buttonType: "wishlist",
          sellerId: robot.seller_id,
          sellerName: robot.profiles?.company_name || robot.profiles?.full_name,
          itemId: robot.id,
          itemType: "robot",
          additionalData: {
            action: "remove",
            robotName: robot.name,
            robotModel: robot.model,
            robotPrice: robot.price,
            source: "listingpage",
          },
        });

        toast({
          title: "Removed from Watchlist",
          description: `${robot.name} has been removed from your watchlist.`,
        });
      } else {
        const { error } = await supabase.from("watchlists").insert({
          user_id: user.id,
          item_type: "robot",
          item_id: robot.id,
          notes: `${robot.name} - ${robot.model}`,
          priority: "medium",
        });

        if (error) throw error;

        setWatchlistItems((prev) => {
          const set = new Set(prev);
          set.add(robot.id);
          return set;
        });

        await trackButtonClick({
          buttonName: "Add to Watchlist",
          buttonType: "wishlist",
          sellerId: robot.seller_id,
          sellerName: robot.profiles?.company_name || robot.profiles?.full_name,
          itemId: robot.id,
          itemType: "robot",
          additionalData: {
            action: "add",
            robotName: robot.name,
            robotModel: robot.model,
            robotPrice: robot.price,
            source: "listingpage",
          },
        });

        toast({
          title: "Added to Watchlist",
          description: `${robot.name} has been added to your watchlist.`,
        });
      }
    } catch (err) {
      console.error("Error updating watchlist", err);
      toast({
        title: "Failed to Update",
        description: "Could not update watchlist. Please try again.",
        variant: "destructive",
      });
    } finally {
      setAddingToWatchlist((prev) => {
        const set = new Set(prev);
        set.delete(robot.id);
        return set;
      });
    }
  };

  const pageSEO = {
    title: "Industrial Robots Marketplace | RobotVerse",
    description:
      "Browse verified robots from trusted sellers. Find ABB, KUKA, Fanuc, Yaskawa and more with financing, logistics, parts and service support.",
    jsonLd: generateItemListSchema(robotsWithViews.slice(0, 20), "Robots"),
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <EnhancedHeader />
        <main className="flex-grow flex items-center justify-center">
          <Loader2 className="animate-spin w-10 h-10" />
          <p className="ml-4 text-muted-foreground text-lg">Loading robots...</p>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <EnhancedHeader />
        <main className="flex-grow flex flex-col justify-center items-center text-center px-4">
          <Bot className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Failed to load robots</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <UniversalSEOHead
        pageType="robots"
        title="Used Industrial Robots for Sale India | Verified Sellers | RobotVerse"
        description="Browse 150+ used industrial robots from verified sellers. FANUC, ABB, KUKA, Yaskawa robots with warranty. Compare prices, get quotes. Free buyer support."
        keywords={
          dynamicRobotKeywords.length > 0
            ? dynamicRobotKeywords
            : [
                "used industrial robots for sale",
                "refurbished robots India",
                "second hand robots",
                "pre-owned industrial robots",
                "FANUC robots for sale",
                "ABB robots India",
                "KUKA robots price",
                "Yaskawa robots dealers",
                "welding robots India",
                "palletizing robots",
                "material handling robots",
                "robot automation equipment",
              ]
        }
        schemas={[pageSEO.jsonLd]}
      />
      <EnhancedHeader />

      {/* Top title */}
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold mb-2 text-primary">
          {selectedRobotType !== "all" ? `${selectedRobotType} - Industrial Robots` : "Industrial Robots Marketplace"}
        </h1>
        <p className="text-muted-foreground">
          {selectedRobotType !== "all"
            ? `Browse ${selectedRobotType} from verified sellers - with financing, logistics, parts and service support.`
            : "Browse verified robots from trusted sellers - with financing, logistics, parts and service support."}
        </p>
        <div className="mt-3">
          <CopySearchLinkButton />
        </div>
      </div>

      {/* Layout similar to robotmp: left filter, right listing */}
      <div className="container mx-auto px-4 pb-10 flex flex-col lg:flex-row gap-6">
        {/* LEFT FILTER COLUMN (sticky) */}
        <aside className="w-72 flex-shrink-0 hidden lg:block">
          <div className="sticky top-20 space-y-4">
            {/* Active Filters Display */}
            {(selectedRobotType !== "all" || searchQuery) && (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-primary">Active Filters</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                      onClick={handleClearFilters}
                    >
                      Clear All
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedRobotType !== "all" && (
                      <Badge variant="secondary" className="text-xs">
                        {selectedRobotType}
                        <button className="ml-1.5 hover:text-destructive" onClick={() => handleRobotTypeChange("all")}>
                          ×
                        </button>
                      </Badge>
                    )}
                    {searchQuery && (
                      <Badge variant="secondary" className="text-xs">
                        Search: {searchQuery}
                        <button
                          className="ml-1.5 hover:text-destructive"
                          onClick={() => {
                            setSearchQuery("");
                          }}
                        >
                          ×
                        </button>
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  Filter Robots
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search robots..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* 1. Robot Type - First filter */}
                <div>
                  <p className="text-xs font-semibold mb-1">Robot Type</p>
                  <Select value={selectedRobotType} onValueChange={handleRobotTypeChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Robot Types" />
                    </SelectTrigger>
                    <SelectContent>
                      {robotTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 2. Manufacturer - Second filter */}
                <div>
                  <p className="text-xs font-semibold mb-1">Manufacturer</p>
                  <Select value={selectedManufacturer} onValueChange={setSelectedManufacturer}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Manufacturers" />
                    </SelectTrigger>
                    <SelectContent>
                      {manufacturers.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          <span className="flex items-center gap-2">
                            {m.value !== "all" && <OemDot brand={m.label} />}
                            {m.label}
                          </span>
                        </SelectItem>
                      ))}

                    </SelectContent>
                  </Select>
                </div>

                {/* 3. Payload Range - Third filter */}
                <div>
                  <p className="text-xs font-semibold mb-1">Payload Range (kg)</p>
                  <Select value={selectedPayloadRange} onValueChange={setSelectedPayloadRange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Payloads" />
                    </SelectTrigger>
                    <SelectContent>
                      {payloadRanges.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 4. Condition - Fourth filter */}
                <div>
                  <p className="text-xs font-semibold mb-1">Condition</p>
                  <Select value={selectedCondition} onValueChange={setSelectedCondition}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Conditions" />
                    </SelectTrigger>
                    <SelectContent>
                      {conditions.map((cond) => (
                        <SelectItem key={cond.value} value={cond.value}>
                          {cond.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 5. Price Range - Fifth filter */}
                <div>
                  <p className="text-xs font-semibold mb-1">Price Range</p>
                  <Select value={selectedPriceRange} onValueChange={setSelectedPriceRange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Prices" />
                    </SelectTrigger>
                    <SelectContent>
                      {priceRanges.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 6. Location - Sixth filter */}
                <div>
                  <p className="text-xs font-semibold mb-1">Location</p>
                  <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Locations" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((loc) => (
                        <SelectItem key={loc.value} value={loc.value}>
                          {loc.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 7. Available Offers toggle */}
                <div className="pt-2 border-t">
                  <button
                    type="button"
                    onClick={() => setOnlyWithOffers(!onlyWithOffers)}
                    className={`w-full flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                      onlyWithOffers
                        ? "border-success/30 bg-success/10 text-success dark:bg-success/30"
                        : "border-input hover:bg-muted/50"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="inline-flex h-4 w-4 items-center justify-center rounded border bg-background">
                        {onlyWithOffers && <Check className="h-3 w-3" />}
                      </span>
                      Available Offers Only
                    </span>
                    <Badge variant="secondary" className="text-[10px]">
                      {robotsWithOffers.size}
                    </Badge>
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Can't Find CTA - compact in sidebar */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4 text-center">
                <p className="text-sm font-semibold mb-1">Can't find the robot you need?</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Submit your requirement and we'll connect you with sellers.
                </p>
                <Button size="sm" className="w-full" onClick={() => setShowRequestModal(true)}>
                  <Search className="w-3 h-3 mr-1" /> Submit Request
                </Button>
              </CardContent>
            </Card>
          </div>
        </aside>

        {/* RIGHT CONTENT COLUMN */}
        <main className="flex-1 min-w-0 w-full space-y-6">
          {/* Top bar: sort, group, view */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                Robots
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* For mobile: filter + search in a row */}
              <div className="flex flex-col gap-3 lg:hidden">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search robots..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="text-sm text-muted-foreground">
                  Showing <span className="font-semibold">{totalFilteredRobots}</span> robots
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Sort */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">Sort by</span>
                    <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="views">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" />
                            Most Popular
                          </div>
                        </SelectItem>
                        <SelectItem value="newest">Newest</SelectItem>
                        <SelectItem value="price-low">Price Low to High</SelectItem>
                        <SelectItem value="price-high">Price High to Low</SelectItem>
                        <SelectItem value="name">Name A-Z</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Group by */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">Group by</span>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant={groupBy === "all" ? "default" : "outline"}
                        onClick={() => setGroupBy("all")}
                      >
                        All
                      </Button>
                      <Button
                        size="sm"
                        variant={groupBy === "category" ? "default" : "outline"}
                        onClick={() => setGroupBy("category")}
                      >
                        Category
                      </Button>
                    </div>
                  </div>

                  {/* View mode */}
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant={viewMode === "grid" ? "default" : "outline"}
                      onClick={() => setViewMode("grid")}
                    >
                      <Grid className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant={viewMode === "list" ? "default" : "outline"}
                      onClick={() => setViewMode("list")}
                    >
                      <List className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Robots listing */}
          {totalFilteredRobots === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Bot className="w-16 h-16 text-muted-foreground mb-4" />
              <p className="text-lg font-semibold mb-2">No robots match the current filters.</p>
              <p className="text-muted-foreground mb-4">Try clearing some filters or changing the search text.</p>
              <Button onClick={handleClearFilters}>Clear Filters</Button>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(filteredGroups).map(([key, robotsGroup]) => (
                <div key={key} className="space-y-4">
                  {key !== "All Robots" && (
                    <div className="flex items-center justify-between border-b pb-3">
                      <div>
                        <h3 className="text-xl font-semibold">{key}</h3>
                        <p className="text-xs text-muted-foreground">
                          {robotsGroup.length} robot
                          {robotsGroup.length !== 1 ? "s" : ""} available
                        </p>
                      </div>
                      
                    </div>
                  )}

                  {viewMode === "grid" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {robotsGroup.map((robot: any) => (
                        <Card
                          key={robot.id}
                          className="relative overflow-hidden border border-border hover:border-muted-foreground/40 shadow-none transition-colors duration-150 cursor-pointer group"
                          onClick={async () => {
                            await trackItemView("robots", robot.id);
                            navigate(`/robots/${robot.id}`);
                          }}
                        >
                          <OemRail brand={robot.brand} />
                          {/* Image */}
                          <div className="relative overflow-hidden bg-muted border-b border-border dark:shadow-[inset_0_0_0_1px_hsl(var(--border))]">
                            {robot.images && robot.images.length > 0 ? (
                              <ResponsiveImage
                                src={robot.images[0]}
                                alt={robot.name}
                                objectFit="cover"
                                hoverEffect
                                containerClassName="w-full"
                              />
                            ) : (
                              <div className="w-full aspect-[4/3] flex items-center justify-center bg-background">

                                <Bot className="w-12 h-12 text-muted-foreground" />
                              </div>
                            )}

                            {/* Condition */}
                            {robot.condition && (
                              <div className="absolute top-2 left-2">
                                <Badge
                                  variant={robot.condition === "New" ? "default" : "secondary"}
                                  className="text-xs"
                                >
                                  {robot.condition}
                                </Badge>
                              </div>
                            )}

                            {/* Coupon available */}
                            {robotsWithOffers.has(robot.id) && (
                              <div className="absolute bottom-2 left-2">
                                <Badge className="bg-success hover:bg-success text-primary-foreground text-[10px] gap-1">
                                  <Tag className="w-3 h-3" />
                                  Coupon available
                                </Badge>
                              </div>
                            )}

                            {/* View count + share */}
                            <div className="absolute top-2 right-2 flex gap-1">
                              <ViewCountDisplay targetType="robots" targetId={robot.id} />
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 bg-card/80 hover:bg-card"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const url = `${window.location.origin}/robots/${robot.id}`;
                                  if (navigator.share) {
                                    navigator.share({
                                      title: robot.name,
                                      text: `Check out this ${robot.robot_type} ${robot.name} for ${formatPrice(
                                        robot.price,
                                        robot.currency,
                                      )}`,
                                      url,
                                    });
                                  } else {
                                    navigator.clipboard.writeText(url);
                                    toast({
                                      title: "Link copied!",
                                      description: "Robot listing link copied to clipboard.",
                                    });
                                  }
                                }}
                              >
                                <Share2 className="w-4 h-4 text-muted-foreground" />
                              </Button>
                            </div>
                          </div>

                          <CardContent className="p-4 space-y-3">
                            {/* Name */}
                            <div>
                              <h3 className="font-bold text-sm mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                                {robot.name}
                              </h3>
                              <p className="flex items-center gap-1.5 text-xs text-muted-foreground line-clamp-1">
                                <OemDot brand={robot.brand} />
                                {robot.brand || "Unknown Brand"}
                                {robot.model && <span> · {robot.model}</span>}
                              </p>

                            </div>

                            {/* Specs - Payload Capacity */}
                            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                              <div>
                                <p className="font-medium text-foreground tabular">{robot.payload_capacity || "N/A"}</p>
                                <p>kg Payload</p>
                              </div>
                              <div>
                                <p className="font-medium text-foreground tabular">{robot.reach || "N/A"}</p>
                                <p>mm Reach</p>
                              </div>
                            </div>

                            {/* Location + price */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center text-xs text-muted-foreground">
                                <MapPin className="w-3 h-3 mr-1" />
                                <span className="line-clamp-1">{robot.location || "Location not specified"}</span>
                              </div>
                              <div className="text-sm font-bold text-primary tabular">
                                {formatPrice(robot.price, robot.currency)}
                              </div>
                            </div>

                            {/* Availability */}
                            <div className="flex items-center justify-end text-xs text-muted-foreground border-t pt-2">
                              <div className="flex items-center gap-1">
                                <CheckCircle className="w-3 h-3 text-success" />
                                <span>{robot.availability || "Available"}</span>
                              </div>
                            </div>

                            {/* Buttons */}
                            <div className="pt-2 space-y-2">
                              <div className="grid grid-cols-2 gap-2">
                                <Button
                                  variant={isSelected(robot.id) ? "default" : "outline"}
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    if (!user) {
                                      toast({
                                        title: "Sign in required",
                                        description: "Please sign in to compare robots",
                                        variant: "default",
                                      });
                                      navigate("/auth");
                                      return;
                                    }
                                    if (isSelected(robot.id)) {
                                      removeRobot(robot.id);
                                    } else {
                                      addRobot(robot);
                                    }
                                  }}
                                >
                                  {isSelected(robot.id) ? (
                                    <Check className="w-3 h-3 mr-1" />
                                  ) : (
                                    <Scale className="w-3 h-3 mr-1" />
                                  )}
                                  {isSelected(robot.id) ? "Selected" : "Compare"}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    setQuoteRobot(robot);
                                  }}
                                >
                                  <FileText className="w-3 h-3 mr-1" />
                                  Get Quote
                                </Button>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onClick={(e) => handleAddToWatchlist(robot, e)}
                                disabled={addingToWatchlist.has(robot.id)}
                              >
                                {addingToWatchlist.has(robot.id) ? (
                                  <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                                ) : (
                                  <Heart
                                    className={`w-3 h-3 mr-2 ${
                                      watchlistItems.has(robot.id) ? "fill-current text-red-500" : ""
                                    }`}
                                  />
                                )}
                                {watchlistItems.has(robot.id) ? "Remove from Watchlist" : "Add to Watchlist"}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {robotsGroup.map((robot: any) => (
                        <Link
                          key={robot.id}
                          to={`/robots/${robot.id}`}
                          className="block no-underline text-inherit"
                          onClick={async () => {
                            await trackItemView("robots", robot.id);
                          }}
                        >
                        <Card className="group relative overflow-hidden border border-border hover:border-muted-foreground/40 shadow-none transition-colors duration-150 cursor-pointer flex">
                          <OemRail brand={robot.brand} />
                          <div className="w-40 flex-shrink-0 bg-background border-r border-border">
                            {robot.images && robot.images.length > 0 ? (
                              <ResponsiveImage
                                src={robot.images[0]}
                                alt={robot.name}
                                aspectRatio="square"
                                objectFit="cover"
                                hoverEffect
                                containerClassName="w-full"
                              />
                            ) : (
                              <div className="w-full aspect-square flex items-center justify-center bg-background">
                                <Bot className="w-10 h-10 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <CardContent className="flex-1 p-4 flex flex-col justify-between">
                            <div className="flex justify-between gap-4">
                              <div className="space-y-1">
                                <h3 className="font-semibold text-base line-clamp-2">{robot.name}</h3>
                                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <OemDot brand={robot.brand} />
                                  {robot.brand || "Unknown Brand"}
                                  {robot.model && <span> · {robot.model}</span>}
                                </p>

                                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-2">
                                  <span>{robot.robot_type || "Robot"}</span>
                                  <span>· {robot.payload_capacity || "N/A"} kg</span>
                                  <span>· {robot.reach || "N/A"} mm</span>
                                </div>
                                <div className="flex items-center text-xs text-muted-foreground mt-1">
                                  <MapPin className="w-3 h-3 mr-1" />
                                  <span>{robot.location || "Location not specified"}</span>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                {isPriceAvailable(robot.price) ? (
                                  <div className="text-right">
                                    <p className="text-lg font-bold text-primary tabular">
                                      {formatPrice(robot.price, robot.currency)}
                                    </p>
                                    <CardLeadTimeNote condition={robot.condition} leadTime={robot.lead_time} />
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-end gap-1">
                                    <RequestQuotePill
                                      label="Request for Quote"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        setQuoteRobot(robot);
                                      }}
                                    />
                                    <CardLeadTimeNote condition={robot.condition} leadTime={robot.lead_time} />
                                  </div>
                                )}
                                {robot.condition && (
                                  <Badge
                                    variant={robot.condition === "New" ? "default" : "secondary"}
                                    className="text-xs"
                                  >
                                    {robot.condition}
                                  </Badge>
                                )}
                                {robotsWithOffers.has(robot.id) && (
                                  <Badge className="bg-success hover:bg-success text-primary-foreground text-[10px] gap-1">
                                    <Tag className="w-3 h-3" />
                                    Coupon available
                                  </Badge>
                                )}
                                <ViewCountDisplay targetType="robots" targetId={robot.id} />
                              </div>
                            </div>
                            <div className="flex items-center justify-between mt-3">
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      navigate(`/robots/${robot.id}`);
                                    }}
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  Details
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      setQuoteRobot(robot);
                                    }}
                                >
                                  <FileText className="w-3 h-3 mr-1" />
                                  Get Quote
                                </Button>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => handleAddToWatchlist(robot, e)}
                                disabled={addingToWatchlist.has(robot.id)}
                              >
                                {addingToWatchlist.has(robot.id) ? (
                                  <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                                ) : (
                                  <Heart
                                    className={`w-3 h-3 mr-2 ${
                                      watchlistItems.has(robot.id) ? "fill-current text-red-500" : ""
                                    }`}
                                  />
                                )}
                                {watchlistItems.has(robot.id) ? "Remove from Watchlist" : "Add to Watchlist"}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      <UserProductRequestModal open={showRequestModal} onOpenChange={setShowRequestModal} defaultProductType="robot" />
      {quoteRobot && <RobotQuoteModal isOpen={!!quoteRobot} onClose={() => setQuoteRobot(null)} robot={quoteRobot} />}
    </div>
  );
};

export default Robots;
