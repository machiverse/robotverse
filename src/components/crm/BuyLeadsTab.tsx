import { useState, useEffect, useCallback, useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import { Search, ShoppingCart, Loader2, Clock, AlertCircle, CreditCard, User, Filter, Package } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface BuyableLeadItem {
  item_id: string;
  item_type: string;
  item_name: string;
  item_image: string | null;
  created_at: string;
}

interface BuyableLead {
  buyer_id: string | null;
  buyer_first_name: string;
  items: BuyableLeadItem[];
  latest_activity: string;
  total_credits_required: number;
}

interface BuyLeadsTabProps {
  sellerId: string;
  creditsBalance: number;
  onLeadPurchased: () => void;
  onBuyCredits: () => void;
  /** Force a specific category filter (robot, spare_part, service) */
  forcedCategoryFilter?: "robot" | "spare_part" | "service";
  /** Commission sellers bypass credit checks */
  isCommissionSeller?: boolean;
}

const USER_CREDIT_COSTS: Record<string, number> = {
  robot: 10,
  robots: 10,
  spare_part: 5,
  spare_parts: 5,
  service: 5,
  services: 5,
};

const getCreditsForCategory = (category: string): number => {
  const normalized = category?.toLowerCase() || "";
  return USER_CREDIT_COSTS[normalized] || 5;
};

const matchesItemCategory = (itemType: string, targetCategory: string): boolean => {
  const normalized = itemType?.toLowerCase() || "";
  const target = targetCategory.toLowerCase();

  if (target === "robot" || target === "robots") {
    return normalized === "robot" || normalized === "robots";
  }
  if (target === "spare_part" || target === "spare_parts") {
    return normalized === "spare_part" || normalized === "spare_parts";
  }
  if (target === "service" || target === "services") {
    return normalized === "service" || normalized === "services";
  }
  return false;
};

const BuyLeadsTab = ({
  sellerId,
  creditsBalance,
  onLeadPurchased,
  onBuyCredits,
  forcedCategoryFilter,
  isCommissionSeller,
}: BuyLeadsTabProps) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [buyableLeads, setBuyableLeads] = useState<BuyableLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sellerCategories, setSellerCategories] = useState<string[]>([]);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [showInsufficientCreditsModal, setShowInsufficientCreditsModal] = useState(false);
  const [selectedLeadForPurchase, setSelectedLeadForPurchase] = useState<BuyableLead | null>(null);

  // Fetch seller's product categories to filter leads
  const fetchSellerCategories = useCallback(async () => {
    if (!user?.id) return;

    try {
      const robotsResult = await supabase.from("robots").select("id").eq("seller_id", user.id).limit(1);

      const partsResult = await supabase.from("spare_parts").select("id").eq("seller_id", user.id).limit(1);

      const servicesQuery = supabase.from("services" as any);
      const servicesResult = await servicesQuery.select("id").eq("provider_id", user.id).limit(1);

      const categories: string[] = [];
      if (robotsResult.data && robotsResult.data.length > 0) {
        categories.push("robots");
      }
      if (partsResult.data && partsResult.data.length > 0) {
        categories.push("spare_parts");
      }
      if (servicesResult?.data && servicesResult.data.length > 0) {
        categories.push("services");
      }

      setSellerCategories(categories);
    } catch (error) {
      console.error("Error fetching seller categories:", error);
    }
  }, [user?.id]);

  // Fetch buyable leads (views that haven't been converted to leads yet)
  const fetchBuyableLeads = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      const { data: views, error: viewsError } = await supabase
        .from("button_interactions")
        .select("*")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });

      if (viewsError) throw viewsError;

      const { data: existingLeads, error: leadsError } = await supabase
        .from("seller_leads")
        .select("buyer_id, item_id")
        .eq("seller_id", user.id);

      if (leadsError) throw leadsError;

      const convertedSet = new Set(existingLeads?.map((l) => `${l.buyer_id}_${l.item_id}`) || []);

      const availableViews = (views || []).filter(
        (view) => view.user_id && view.item_id && !convertedSet.has(`${view.user_id}_${view.item_id}`),
      );

      const robotIds = [
        ...new Set(
          availableViews.filter((v) => v.item_type === "robots" || v.item_type === "robot").map((v) => v.item_id),
        ),
      ];
      const partIds = [
        ...new Set(
          availableViews
            .filter((v) => v.item_type === "spare_parts" || v.item_type === "spare_part")
            .map((v) => v.item_id),
        ),
      ];
      const serviceIds = [
        ...new Set(
          availableViews.filter((v) => v.item_type === "services" || v.item_type === "service").map((v) => v.item_id),
        ),
      ];

      const robotsData =
        robotIds.length > 0
          ? await supabase
              .from("robots")
              .select("id, name, images")
              .in("id", robotIds as string[])
          : {
              data: [] as { id: string; name: string; images: string[] | null }[],
            };

      const partsData =
        partIds.length > 0
          ? await supabase
              .from("spare_parts")
              .select("id, name, images")
              .in("id", partIds as string[])
          : {
              data: [] as { id: string; name: string; images: string[] | null }[],
            };

      const servicesData =
        serviceIds.length > 0
          ? ((await supabase
              .from("services")
              .select("id, name")
              .in("id", serviceIds as string[])) as any)
          : {
              data: [] as { id: string; name: string }[],
            };

      const itemMap = new Map<string, { name: string; image: string | null }>();

      (robotsData.data || []).forEach((r: any) =>
        itemMap.set(r.id, {
          name: r.name,
          image: r.images?.[0] || null,
        }),
      );
      (partsData.data || []).forEach((p: any) =>
        itemMap.set(p.id, {
          name: p.name,
          image: p.images?.[0] || null,
        }),
      );
      (servicesData.data || []).forEach((s: any) =>
        itemMap.set(s.id, {
          name: s.name,
          image: null,
        }),
      );

      const buyerMap = new Map<string, BuyableLead>();

      availableViews.forEach((view) => {
        if (!view.user_id) return;

        const itemInfo = itemMap.get(view.item_id);
        if (!itemInfo) return;

        const existing = buyerMap.get(view.user_id);

        const item: BuyableLeadItem = {
          item_id: view.item_id,
          item_type: view.item_type || "robot",
          item_name: itemInfo.name,
          item_image: itemInfo.image,
          created_at: view.created_at,
        };

        if (existing) {
          const itemExists = existing.items.some((i) => i.item_id === view.item_id);

          if (!itemExists) {
            existing.items.push(item);
          }

          if (new Date(view.created_at) > new Date(existing.latest_activity)) {
            existing.latest_activity = view.created_at;
          }
        } else {
          const fullName = view.user_name || "Unknown Buyer";
          const firstName = fullName.split(" ")[0];

          buyerMap.set(view.user_id, {
            buyer_id: view.user_id,
            buyer_first_name: firstName,
            items: [item],
            latest_activity: view.created_at,
            total_credits_required: 0,
          });
        }
      });

      const leadsArray = Array.from(buyerMap.values()).sort(
        (a, b) => new Date(b.latest_activity).getTime() - new Date(a.latest_activity).getTime(),
      );

      setBuyableLeads(leadsArray);
    } catch (error) {
      console.error("Error fetching buyable leads:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load available leads",
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id, toast]);

  useEffect(() => {
    fetchSellerCategories();
    fetchBuyableLeads();
  }, [fetchSellerCategories, fetchBuyableLeads]);

  const sellerPrimaryCategory = useMemo(() => {
    if (forcedCategoryFilter) return forcedCategoryFilter;
    if (sellerCategories.includes("robots")) return "robots";
    if (sellerCategories.includes("spare_parts")) return "spare_parts";
    if (sellerCategories.includes("services")) return "services";
    return "robots";
  }, [forcedCategoryFilter, sellerCategories]);

  const creditsPerUser = getCreditsForCategory(sellerPrimaryCategory);

  const filteredLeads = useMemo(() => {
    return buyableLeads
      .map((lead) => {
        let filteredItems = lead.items;

        if (forcedCategoryFilter) {
          filteredItems = lead.items.filter((item) => matchesItemCategory(item.item_type, forcedCategoryFilter));
        } else if (categoryFilter !== "all") {
          filteredItems = lead.items.filter(
            (item) =>
              item.item_type === categoryFilter ||
              item.item_type === `${categoryFilter}s` ||
              item.item_type.replace(/s$/, "") === categoryFilter.replace(/s$/, ""),
          );
        } else if (sellerCategories.length > 0) {
          filteredItems = lead.items.filter(
            (item) =>
              sellerCategories.includes(item.item_type) ||
              sellerCategories.includes(`${item.item_type}s`) ||
              sellerCategories.includes(item.item_type.replace(/s$/, "")),
          );
        }

        return {
          ...lead,
          items: filteredItems,
          total_credits_required: creditsPerUser,
        };
      })
      .filter((lead) => {
        if (lead.items.length === 0) return false;

        const q = searchQuery.toLowerCase().trim();
        const matchesSearch =
          !q ||
          lead.buyer_first_name.toLowerCase().includes(q) ||
          lead.items.some((item) => item.item_name.toLowerCase().includes(q));

        return matchesSearch;
      });
  }, [buyableLeads, categoryFilter, sellerCategories, searchQuery, forcedCategoryFilter, creditsPerUser]);

  const handleBuyLead = async (lead: BuyableLead) => {
    const creditsToDeduct = creditsPerUser;

    if (!isCommissionSeller && creditsBalance < creditsToDeduct) {
      setSelectedLeadForPurchase(lead);
      setShowInsufficientCreditsModal(true);
      return;
    }

    setPurchasingId(lead.buyer_id);

    try {
      // Insert leads for all items
      for (const item of lead.items) {
        const { error: insertError } = await supabase.from("seller_leads").insert({
          seller_id: user?.id,
          buyer_id: lead.buyer_id,
          item_id: item.item_id,
          item_type: item.item_type,
          item_name: item.item_name,
          source: "product_view",
          status: "new",
          priority: "medium",
          is_unlocked: true,
        });

        if (insertError) {
          console.error("Error inserting lead:", insertError);
          throw insertError;
        }
      }

      // Only deduct credits for non-commission sellers
      if (!isCommissionSeller) {
        const { data: creditData } = await supabase
          .from("seller_credits")
          .select("current_balance, total_spent")
          .eq("seller_id", user?.id)
          .single();

        if (!creditData) {
          throw new Error("Could not fetch credit balance");
        }

        const newBalance = creditData.current_balance - creditsToDeduct;

        await supabase
          .from("seller_credits")
          .update({
            current_balance: newBalance,
            total_spent: (creditData.total_spent || 0) + creditsToDeduct,
            updated_at: new Date().toISOString(),
          })
          .eq("seller_id", user?.id);

        await supabase.from("credit_transactions").insert({
          seller_id: user?.id,
          transaction_type: "lead_unlock",
          credits_amount: -creditsToDeduct,
          balance_before: creditData.current_balance,
          balance_after: newBalance,
          description: `Purchased lead for buyer ${lead.buyer_first_name} (${lead.items.length} item${
            lead.items.length > 1 ? "s" : ""
          })`,
          reference_id: lead.buyer_id,
          reference_type: sellerPrimaryCategory,
        });
      }

      toast({
        title: isCommissionSeller ? "Lead converted" : "Lead purchased",
        description: isCommissionSeller
          ? `Successfully converted lead for ${lead.buyer_first_name}. No credits deducted.`
          : `Successfully purchased lead for ${lead.buyer_first_name}. ${creditsToDeduct} credits deducted.`,
      });

      onLeadPurchased();
      fetchBuyableLeads();
    } catch (error) {
      console.error("Error purchasing lead:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to purchase lead. Please try again.",
      });
    } finally {
      setPurchasingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or product…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        {sellerCategories.length > 1 && !forcedCategoryFilter && (
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-44">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {sellerCategories.includes("robots") && <SelectItem value="robots">Robots</SelectItem>}
              {sellerCategories.includes("spare_parts") && <SelectItem value="spare_parts">Spare parts</SelectItem>}
              {sellerCategories.includes("services") && <SelectItem value="services">Services</SelectItem>}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Info Banner */}
      <Card className="border-primary/20 bg-primary/5 dark:border-primary/30 dark:bg-primary/10">
        <CardContent className="flex items-start gap-3 p-4">
          <ShoppingCart className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="text-sm">
            {isCommissionSeller ? (
              <>
                <p className="font-medium text-foreground">Convert leads — Free for commission sellers</p>
                <p className="mt-1 text-muted-foreground">
                  As a commission-based seller, you can convert all leads for free. No credits are deducted.
                </p>
              </>
            ) : (
              <>
                <p className="font-medium text-foreground">Buy leads – {creditsPerUser} credits per buyer</p>
                <p className="mt-1 text-muted-foreground">
                  Purchase a lead to unlock full buyer contact information. All items viewed by the same buyer are included,
                  so you pay once per user, not per item.
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Leads List */}
      {filteredLeads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ShoppingCart className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="font-medium">No leads available to purchase</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            New leads will appear here when buyers view your products.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLeads.map((lead) => (
            <Card
              key={lead.buyer_id ?? Math.random().toString(36)}
              className="overflow-hidden border-border/50 bg-card shadow-sm transition-all hover:border-primary/20 hover:shadow-md"
            >
              <div className="flex items-stretch">
                <div className="w-1 shrink-0 bg-amber-500" />
                <div className="flex-1 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30">
                        <User className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="truncate text-sm font-semibold text-foreground">{lead.buyer_first_name}</h4>
                        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{formatDistanceToNow(new Date(lead.latest_activity), { addSuffix: true })}</span>
                        </div>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handleBuyLead(lead)}
                      disabled={purchasingId === lead.buyer_id}
                      className={`h-9 px-4 text-xs font-medium ${isCommissionSeller ? 'bg-green-600 hover:bg-green-700' : 'bg-amber-600 hover:bg-amber-700'}`}
                    >
                      {purchasingId === lead.buyer_id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <ShoppingCart className="mr-2 h-4 w-4" />
                      )}
                      {isCommissionSeller ? 'Convert lead (Free)' : `Buy lead (${lead.total_credits_required} cr)`}
                    </Button>
                  </div>

                  <div className="space-y-2 pl-[52px]">
                    <p className="mb-2 text-xs font-medium text-muted-foreground">Items viewed</p>
                    {lead.items.map((item, idx) => (
                      <div
                        key={`${item.item_id}_${idx}`}
                        className="flex items-center gap-3 rounded-lg bg-muted/50 p-2"
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-medium text-amber-700 dark:bg-amber-900/30">
                          {idx + 1}
                        </span>

                        {item.item_image ? (
                          <img
                            src={item.item_image}
                            alt={item.item_name}
                            className="h-10 w-10 shrink-0 rounded object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-muted">
                            <Package className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}

                        <span className="flex-1 truncate text-sm font-medium text-foreground">{item.item_name}</span>

                        <Badge variant="outline" className="shrink-0 capitalize text-xs">
                          {item.item_type.replace(/_/g, " ").replace(/s$/, "")}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Insufficient Credits Modal */}
      <Dialog open={showInsufficientCreditsModal} onOpenChange={setShowInsufficientCreditsModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Insufficient credits
            </DialogTitle>
            <DialogDescription>
              You need <span className="font-semibold">{selectedLeadForPurchase?.total_credits_required}</span> credits
              to purchase this lead, but you only have <span className="font-semibold">{creditsBalance}</span> credits.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Please purchase more credits to continue unlocking buyer details.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInsufficientCreditsModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setShowInsufficientCreditsModal(false);
                onBuyCredits();
              }}
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Buy credits
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BuyLeadsTab;
