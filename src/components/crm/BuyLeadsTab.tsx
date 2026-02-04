import { useState, useEffect, useCallback, useMemo } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Search,
  ShoppingCart,
  Lock,
  Package,
  Eye,
  Loader2,
  Clock,
  AlertCircle,
  CreditCard,
  User,
  Filter,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface BuyableLead {
  buyer_id: string | null;
  buyer_first_name: string;
  items: {
    item_id: string;
    item_type: string;
    item_name: string;
    item_image: string | null;
    created_at: string;
  }[];
  latest_activity: string;
  total_credits_required: number;
}

interface BuyLeadsTabProps {
  sellerId: string;
  creditsBalance: number;
  onLeadPurchased: () => void;
  onBuyCredits: () => void;
  /** Force a specific category filter (robot, spare_part, service) */
  forcedCategoryFilter?: 'robot' | 'spare_part' | 'service';
}

const CREDIT_COSTS: Record<string, number> = {
  robot: 10,
  robots: 10,
  spare_part: 5,
  spare_parts: 5,
  service: 5,
  services: 5,
};

const getCreditsForItemType = (itemType: string): number => {
  return CREDIT_COSTS[itemType] || 5;
};

const BuyLeadsTab = ({
  sellerId,
  creditsBalance,
  onLeadPurchased,
  onBuyCredits,
  forcedCategoryFilter,
}: BuyLeadsTabProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

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
      const robotsResult = await supabase
        .from("robots")
        .select("id")
        .eq("seller_id", user.id)
        .limit(1);
      
      const partsResult = await supabase
        .from("spare_parts")
        .select("id")
        .eq("seller_id", user.id)
        .limit(1);
      
      // Use raw SQL-like approach to avoid deep type instantiation error with services table
      const servicesQuery = supabase.from("services" as any);
      const servicesResult = await servicesQuery.select("id").eq("seller_id", user.id).limit(1);

      const categories: string[] = [];
      if (robotsResult.data && robotsResult.data.length > 0) categories.push("robots");
      if (partsResult.data && partsResult.data.length > 0) categories.push("spare_parts");
      if (servicesResult?.data && servicesResult.data.length > 0) categories.push("services");

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

      // Get all product views for this seller's products
      const { data: views, error: viewsError } = await supabase
        .from("button_interactions")
        .select("*")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });

      if (viewsError) throw viewsError;

      // Get already converted leads
      const { data: existingLeads, error: leadsError } = await supabase
        .from("seller_leads")
        .select("buyer_id, item_id")
        .eq("seller_id", user.id);

      if (leadsError) throw leadsError;

      // Create a set of already-converted buyer+item combinations
      const convertedSet = new Set(
        existingLeads?.map((l) => `${l.buyer_id}_${l.item_id}`) || []
      );

      // Filter out views that are already leads and anonymous views
      const availableViews = (views || []).filter(
        (view) =>
          view.user_id && // Must have a user_id (not anonymous)
          view.item_id &&
          !convertedSet.has(`${view.user_id}_${view.item_id}`)
      );

      // Fetch item details (names and images)
      const robotIds = [...new Set(availableViews.filter(v => v.item_type === 'robots' || v.item_type === 'robot').map(v => v.item_id))];
      const partIds = [...new Set(availableViews.filter(v => v.item_type === 'spare_parts' || v.item_type === 'spare_part').map(v => v.item_id))];
      const serviceIds = [...new Set(availableViews.filter(v => v.item_type === 'services' || v.item_type === 'service').map(v => v.item_id))];

      // Fetch item data separately to avoid type issues
      const robotsData = robotIds.length > 0 
        ? await supabase.from('robots').select('id, name, images').in('id', robotIds as string[])
        : { data: [] as { id: string; name: string; images: string[] | null }[] };
      
      const partsData = partIds.length > 0 
        ? await supabase.from('spare_parts').select('id, name, images').in('id', partIds as string[])
        : { data: [] as { id: string; name: string; images: string[] | null }[] };
      
      // Cast services query to avoid deep type error
      const servicesData = serviceIds.length > 0 
        ? await (supabase.from('services').select('id, name, image_url').in('id', serviceIds as string[]) as any)
        : { data: [] as { id: string; name: string; image_url: string | null }[] };

      const itemMap = new Map<string, { name: string; image: string | null }>();
      (robotsData.data || []).forEach((r: any) => itemMap.set(r.id, { name: r.name, image: r.images?.[0] || null }));
      (partsData.data || []).forEach((p: any) => itemMap.set(p.id, { name: p.name, image: p.images?.[0] || null }));
      (servicesData.data || []).forEach((s: any) => itemMap.set(s.id, { name: s.name, image: s.image_url || null }));

      // Group by buyer (deduplicate)
      const buyerMap = new Map<string, BuyableLead>();

      availableViews.forEach((view) => {
        if (!view.user_id) return;

        const itemInfo = itemMap.get(view.item_id);
        if (!itemInfo) return; // Skip if item doesn't exist anymore

        const existing = buyerMap.get(view.user_id);

        if (existing) {
          // Check if this item is already in the list
          const itemExists = existing.items.some(
            (i) => i.item_id === view.item_id
          );

          if (!itemExists) {
            existing.items.push({
              item_id: view.item_id,
              item_type: view.item_type || "robot",
              item_name: itemInfo.name,
              item_image: itemInfo.image,
              created_at: view.created_at,
            });
            existing.total_credits_required += getCreditsForItemType(
              view.item_type || "robot"
            );
          }

          if (new Date(view.created_at) > new Date(existing.latest_activity)) {
            existing.latest_activity = view.created_at;
          }
        } else {
          // Get first name only
          const fullName = view.user_name || "Unknown Buyer";
          const firstName = fullName.split(" ")[0];

          buyerMap.set(view.user_id, {
            buyer_id: view.user_id,
            buyer_first_name: firstName,
            items: [
              {
                item_id: view.item_id,
                item_type: view.item_type || "robot",
                item_name: itemInfo.name,
                item_image: itemInfo.image,
                created_at: view.created_at,
              },
            ],
            latest_activity: view.created_at,
            total_credits_required: getCreditsForItemType(
              view.item_type || "robot"
            ),
          });
        }
      });

      // Convert to array and sort by latest activity
      const leadsArray = Array.from(buyerMap.values()).sort(
        (a, b) =>
          new Date(b.latest_activity).getTime() -
          new Date(a.latest_activity).getTime()
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

  // Helper function to check if item type matches category filter
  const matchesItemCategory = (itemType: string, targetCategory: string): boolean => {
    const normalized = itemType?.toLowerCase() || '';
    const target = targetCategory.toLowerCase();
    
    if (target === 'robot' || target === 'robots') {
      return normalized === 'robot' || normalized === 'robots';
    }
    if (target === 'spare_part' || target === 'spare_parts') {
      return normalized === 'spare_part' || normalized === 'spare_parts';
    }
    if (target === 'service' || target === 'services') {
      return normalized === 'service' || normalized === 'services';
    }
    return false;
  };

  // Filter leads based on seller's categories and search, and filter items within each lead
  const filteredLeads = useMemo(() => {
    return buyableLeads
      .map((lead) => {
        // Filter items within each lead by category
        let filteredItems = lead.items;
        
        if (forcedCategoryFilter) {
          filteredItems = lead.items.filter((item) =>
            matchesItemCategory(item.item_type, forcedCategoryFilter)
          );
        } else if (categoryFilter !== "all") {
          filteredItems = lead.items.filter(
            (item) =>
              item.item_type === categoryFilter ||
              item.item_type === categoryFilter + 's' ||
              item.item_type.replace(/s$/, '') === categoryFilter.replace(/s$/, '')
          );
        } else if (sellerCategories.length > 0) {
          filteredItems = lead.items.filter((item) =>
            sellerCategories.includes(item.item_type) ||
            sellerCategories.includes(item.item_type + 's') ||
            sellerCategories.includes(item.item_type.replace(/s$/, ''))
          );
        }
        
        // Recalculate credits for filtered items only
        const totalCredits = filteredItems.reduce(
          (sum, item) => sum + getCreditsForItemType(item.item_type),
          0
        );
        
        return { ...lead, items: filteredItems, total_credits_required: totalCredits };
      })
      .filter((lead) => {
        // Remove leads with no matching items
        if (lead.items.length === 0) return false;
        
        // Search filter
        const q = searchQuery.toLowerCase();
        const matchesSearch =
          !q ||
          lead.buyer_first_name.toLowerCase().includes(q) ||
          lead.items.some((item) => item.item_name.toLowerCase().includes(q));

        return matchesSearch;
      });
  }, [buyableLeads, categoryFilter, sellerCategories, searchQuery, forcedCategoryFilter]);

  const handleBuyLead = async (lead: BuyableLead) => {
    if (creditsBalance < lead.total_credits_required) {
      setSelectedLeadForPurchase(lead);
      setShowInsufficientCreditsModal(true);
      return;
    }

    setPurchasingId(lead.buyer_id);

    try {
      // Convert each item to a lead
      for (const item of lead.items) {
        // Insert lead directly
        const { error: insertError } = await supabase
          .from("seller_leads")
          .insert({
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

        // Deduct credits manually
        const creditsToDeduct = getCreditsForItemType(item.item_type);
        
        // Get current balance
        const { data: creditData } = await supabase
          .from("seller_credits")
          .select("current_balance, total_spent")
          .eq("seller_id", user?.id)
          .single();

        if (creditData) {
          const newBalance = creditData.current_balance - creditsToDeduct;
          
          // Update credits
          await supabase
            .from("seller_credits")
            .update({
              current_balance: newBalance,
              total_spent: (creditData.total_spent || 0) + creditsToDeduct,
              updated_at: new Date().toISOString(),
            })
            .eq("seller_id", user?.id);

          // Record transaction
          await supabase.from("credit_transactions").insert({
            seller_id: user?.id,
            transaction_type: "lead_unlock",
            credits_amount: -creditsToDeduct,
            balance_before: creditData.current_balance,
            balance_after: newBalance,
            description: `Purchased lead for ${item.item_name}`,
            reference_id: item.item_id,
            reference_type: item.item_type,
          });
        }
      }

      toast({
        title: "Lead Purchased!",
        description: `Successfully purchased lead for ${lead.buyer_first_name}. ${lead.total_credits_required} credits deducted.`,
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
          <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search by name or product…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        {sellerCategories.length > 1 && (
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-44">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {sellerCategories.includes("robots") && (
                <SelectItem value="robots">Robots</SelectItem>
              )}
              {sellerCategories.includes("spare_parts") && (
                <SelectItem value="spare_parts">Spare Parts</SelectItem>
              )}
              {sellerCategories.includes("services") && (
                <SelectItem value="services">Services</SelectItem>
              )}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Info Banner */}
      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
        <CardContent className="flex items-start gap-3 p-4">
          <ShoppingCart className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-blue-900 dark:text-blue-100">
              Buy Leads to Unlock Buyer Details
            </p>
            <p className="text-blue-700 dark:text-blue-300 mt-1">
              Purchase leads to access full buyer contact information. Leads are
              grouped by buyer - you'll unlock all their viewed items at once.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Leads List */}
      {filteredLeads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ShoppingCart className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="font-medium">No leads available to purchase</p>
          <p className="max-w-sm text-sm text-muted-foreground mt-1">
            New leads will appear here when buyers view your products.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLeads.map((lead) => (
            <Card
              key={lead.buyer_id}
              className="overflow-hidden border-border/50 bg-card shadow-sm transition-all hover:shadow-md hover:border-primary/20"
            >
              <div className="flex items-stretch">
                {/* Left accent bar */}
                <div className="w-1 shrink-0 bg-amber-500" />

                <div className="flex-1 p-4">
                  {/* Header: Buyer name + Buy button */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                        <User className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground">
                          {lead.buyer_first_name}
                        </h4>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          {formatDistanceToNow(new Date(lead.latest_activity), {
                            addSuffix: true,
                          })}
                        </div>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handleBuyLead(lead)}
                      disabled={purchasingId === lead.buyer_id}
                      className="h-9 px-4 bg-amber-600 hover:bg-amber-700"
                    >
                      {purchasingId === lead.buyer_id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <ShoppingCart className="mr-2 h-4 w-4" />
                      )}
                      Buy Lead ({lead.total_credits_required} cr)
                    </Button>
                  </div>

                  {/* Items list */}
                  <div className="space-y-2 pl-[52px]">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Items Viewed:
                    </p>
                    {lead.items.map((item, idx) => (
                      <div
                        key={`${item.item_id}_${idx}`}
                        className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                      >
                        {/* Item number */}
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-xs font-medium text-amber-700 shrink-0 dark:bg-amber-900/30">
                          {idx + 1}
                        </span>

                        {/* Item image */}
                        {item.item_image ? (
                          <img
                            src={item.item_image}
                            alt={item.item_name}
                            className="h-10 w-10 rounded object-cover shrink-0"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0">
                            <Package className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}

                        {/* Item name */}
                        <span className="font-medium text-sm text-foreground flex-1 truncate">
                          {item.item_name}
                        </span>

                        {/* Item type badge */}
                        <Badge variant="outline" className="shrink-0 capitalize">
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
      <Dialog
        open={showInsufficientCreditsModal}
        onOpenChange={setShowInsufficientCreditsModal}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Insufficient Credits
            </DialogTitle>
            <DialogDescription>
              You need{" "}
              <strong>{selectedLeadForPurchase?.total_credits_required}</strong>{" "}
              credits to purchase this lead, but you only have{" "}
              <strong>{creditsBalance}</strong> credits.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Please purchase more credits to continue unlocking buyer details.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowInsufficientCreditsModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setShowInsufficientCreditsModal(false);
                onBuyCredits();
              }}
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Buy Credits
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BuyLeadsTab;
