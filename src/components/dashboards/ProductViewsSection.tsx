import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Eye, 
  Activity,
  Loader2,
  Bot,
  Package,
  Wrench,
  Truck,
  CreditCard,
  UserPlus,
  Coins,
  ArrowRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNow } from 'date-fns';
import { useContactUnlock } from '@/hooks/useContactUnlock';

interface ProductView {
  id: string;
  user_id: string | null;
  user_name: string | null;
  user_email: string | null;
  user_company: string | null;
  user_mobile: string | null;
  item_id: string | null;
  item_type: string | null;
  button_type: string;
  button_name: string;
  created_at: string;
  additional_data: any;
}

// ViewedItem - Individual item viewed by a user
interface ViewedItem {
  item_id: string | null;
  item_type: string | null;
  item_name: string;
  view_count: number;
}

// AggregatedView - User details stored internally for conversion only, NEVER displayed
interface AggregatedView {
  key: string;
  // Internal use only - for conversion to lead
  _internal_user_id: string | null;
  _internal_user_name: string | null;
  _internal_user_email: string | null;
  _internal_user_company: string | null;
  _internal_user_mobile: string | null;
  // Display fields - now supports multiple items per user
  items: ViewedItem[];
  total_view_count: number;
  last_viewed: string;
  first_viewed: string;
}

interface ProductViewsSectionProps {
  sellerId: string;
  itemType?: string;
  onLeadConverted?: () => void;
}

// Credit costs based on item type: Robots = 10, Spare Parts = 5, Services = 5
const getCreditsForItemType = (itemType: string | null): number => {
  if (itemType === 'robot' || itemType === 'robots') return 10;
  if (itemType === 'spare_part' || itemType === 'spare_parts') return 5;
  if (itemType === 'service' || itemType === 'services') return 5;
  return 10; // Default for other types
};

const ProductViewsSection = ({ sellerId, itemType, onLeadConverted }: ProductViewsSectionProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { userCredits, refreshCredits } = useContactUnlock();
  const [views, setViews] = useState<ProductView[]>([]);
  const [aggregatedViews, setAggregatedViews] = useState<AggregatedView[]>([]);
  const [loading, setLoading] = useState(true);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [convertedLeads, setConvertedLeads] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (sellerId) {
      fetchViews();
      fetchConvertedLeads();
    }
  }, [sellerId, itemType]);

  useEffect(() => {
    aggregateViews();
  }, [views]);

  const fetchViews = async () => {
    try {
      let query = supabase
        .from('button_interactions')
        .select('*')
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false });

      if (itemType) {
        query = query.eq('item_type', itemType);
      }

      query = query.in('button_type', [
        'view', 'robot_view', 'spare_part_view', 'service_view', 'logistics_view', 'finance_view',
        'details_click', 'specification_view', 'inquiry', 'contact', 
        'chat_start', 'brochure_download', 'price_check', 'availability_check'
      ]);

      const { data, error } = await query;

      if (error) throw error;
      
      // Enrich views with actual product names from database
      const enrichedViews = await enrichViewsWithProductNames(data || []);
      setViews(enrichedViews);
    } catch (error) {
      console.error('Error fetching views:', error);
    } finally {
      setLoading(false);
    }
  };

  const enrichViewsWithProductNames = async (viewsData: ProductView[]): Promise<ProductView[]> => {
    // Get unique item_ids grouped by item_type
    const robotIds = new Set<string>();
    const sparePartIds = new Set<string>();
    const serviceIds = new Set<string>();
    
    viewsData.forEach(view => {
      if (view.item_id) {
        if (view.item_type === 'robot' || view.item_type === 'robots') {
          robotIds.add(view.item_id);
        } else if (view.item_type === 'spare_part' || view.item_type === 'spare_parts') {
          sparePartIds.add(view.item_id);
        } else if (view.item_type === 'service' || view.item_type === 'services') {
          serviceIds.add(view.item_id);
        }
      }
    });

    // Fetch product names in parallel
    const productNameMap = new Map<string, string>();

    const fetchPromises: Promise<void>[] = [];

    if (robotIds.size > 0) {
      const robotPromise = (async () => {
        const { data } = await supabase
          .from('robots')
          .select('id, name')
          .in('id', Array.from(robotIds));
        (data || []).forEach((robot: any) => {
          productNameMap.set(robot.id, robot.name);
        });
      })();
      fetchPromises.push(robotPromise);
    }

    if (sparePartIds.size > 0) {
      const sparePartPromise = (async () => {
        const { data } = await supabase
          .from('spare_parts')
          .select('id, name')
          .in('id', Array.from(sparePartIds));
        (data || []).forEach((part: any) => {
          productNameMap.set(part.id, part.name);
        });
      })();
      fetchPromises.push(sparePartPromise);
    }

    if (serviceIds.size > 0) {
      const servicePromise = (async () => {
        const { data } = await supabase
          .from('services')
          .select('id, name')
          .in('id', Array.from(serviceIds));
        (data || []).forEach((service: any) => {
          productNameMap.set(service.id, service.name);
        });
      })();
      fetchPromises.push(servicePromise);
    }

    await Promise.all(fetchPromises);

    // Enrich views with product names
    return viewsData.map(view => {
      const productName = view.item_id ? productNameMap.get(view.item_id) : null;
      return {
        ...view,
        additional_data: {
          ...view.additional_data,
          item_name: productName || view.additional_data?.item_name || view.button_name || 'Unknown Product'
        }
      };
    });
  };

  const fetchConvertedLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('crm_leads' as any)
        .select('buyer_id, item_id')
        .eq('seller_id', sellerId)
        .eq('source', 'product_view');

      if (error) throw error;
      
      const convertedSet = new Set<string>();
      ((data as any[]) || []).forEach((lead: any) => {
        if (lead.buyer_id && lead.item_id) {
          convertedSet.add(`${lead.buyer_id}_${lead.item_id}`);
        }
      });
      setConvertedLeads(convertedSet);
    } catch (error) {
      console.error('Error fetching converted leads:', error);
    }
  };

  const aggregateViews = () => {
    const aggregationMap = new Map<string, AggregatedView>();

    views.forEach((view) => {
      // Create a unique key for each user:
      // 1. If user_id exists (logged in user), use it
      // 2. If user_email exists, use it as identifier
      // 3. If user_mobile exists, use it as identifier
      // 4. Otherwise, combine user_name + user_company + user_email + user_mobile for uniqueness
      let userKey: string;
      
      if (view.user_id) {
        userKey = view.user_id;
      } else if (view.user_email) {
        userKey = `email_${view.user_email}`;
      } else if (view.user_mobile) {
        userKey = `mobile_${view.user_mobile}`;
      } else {
        // For truly anonymous users, group by name+company combination
        // This prevents one "Anonymous Visitor" entry per view
        const nameKey = view.user_name || 'Anonymous';
        const companyKey = view.user_company || 'Unknown';
        userKey = `anon_${nameKey}_${companyKey}`;
      }
      
      if (aggregationMap.has(userKey)) {
        const existing = aggregationMap.get(userKey)!;
        
        // Check if this item already exists for this user
        const existingItemIndex = existing.items.findIndex(
          i => i.item_id === view.item_id && i.item_type === view.item_type
        );
        
        if (existingItemIndex >= 0) {
          // Increment view count for existing item
          existing.items[existingItemIndex].view_count += 1;
        } else {
          // Add new item to user's viewed items
          existing.items.push({
            item_id: view.item_id,
            item_type: view.item_type,
            item_name: view.additional_data?.item_name || 'Unknown Product',
            view_count: 1
          });
        }
        
        existing.total_view_count += 1;
        if (new Date(view.created_at) > new Date(existing.last_viewed)) {
          existing.last_viewed = view.created_at;
        }
        if (new Date(view.created_at) < new Date(existing.first_viewed)) {
          existing.first_viewed = view.created_at;
        }
      } else {
        aggregationMap.set(userKey, {
          key: userKey,
          // Internal fields - stored for conversion only, NEVER displayed
          _internal_user_id: view.user_id,
          _internal_user_name: view.user_name,
          _internal_user_email: view.user_email,
          _internal_user_company: view.user_company,
          _internal_user_mobile: view.user_mobile,
          // Display fields - multiple items per user
          items: [{
            item_id: view.item_id,
            item_type: view.item_type,
            item_name: view.additional_data?.item_name || 'Unknown Product',
            view_count: 1
          }],
          total_view_count: 1,
          last_viewed: view.created_at,
          first_viewed: view.created_at,
        });
      }
    });

    const aggregated = Array.from(aggregationMap.values()).sort(
      (a, b) => new Date(b.last_viewed).getTime() - new Date(a.last_viewed).getTime()
    );

    setAggregatedViews(aggregated);
  };

  const isAlreadyConverted = (view: AggregatedView): boolean => {
    if (!view._internal_user_id) return false;
    // Check if all items for this user have been converted
    return view.items.every(item => 
      item.item_id && convertedLeads.has(`${view._internal_user_id}_${item.item_id}`)
    );
  };

  // Get the first unconverted item for this user
  const getFirstUnconvertedItem = (view: AggregatedView): ViewedItem | null => {
    return view.items.find(item => 
      !item.item_id || !convertedLeads.has(`${view._internal_user_id}_${item.item_id}`)
    ) || null;
  };

  // Calculate total credits needed to convert all items for a user
  const getTotalCreditsForUser = (view: AggregatedView): number => {
    const unconvertedItems = view.items.filter(item => 
      !item.item_id || !convertedLeads.has(`${view._internal_user_id}_${item.item_id}`)
    );
    return unconvertedItems.reduce((total, item) => total + getCreditsForItemType(item.item_type), 0);
  };

  const handleConvertToLead = async (view: AggregatedView) => {
    const unconvertedItems = view.items.filter(item => 
      !item.item_id || !convertedLeads.has(`${view._internal_user_id}_${item.item_id}`)
    );

    if (unconvertedItems.length === 0) {
      toast({
        title: "Already Converted",
        description: "All items from this viewer have been converted to leads."
      });
      return;
    }

    const totalCreditsRequired = getTotalCreditsForUser(view);
    
    // Check credits ONLY when convert button is clicked
    if (!userCredits || userCredits.current_balance < totalCreditsRequired) {
      toast({
        variant: "destructive",
        title: "Insufficient Credits",
        description: `⚠️ Insufficient credits. Required: ${totalCreditsRequired}, Available: ${userCredits?.current_balance || 0}`
      });
      return;
    }

    if (!view._internal_user_id) {
      toast({
        variant: "destructive",
        title: "Cannot Convert",
        description: "This view doesn't have complete user information."
      });
      return;
    }

    setConvertingId(view.key);
    try {
      let creditsSpent = 0;
      const newConvertedSet = new Set(convertedLeads);

      // Convert all unconverted items for this user
      for (const item of unconvertedItems) {
        if (!item.item_id) continue;
        
        const itemCredits = getCreditsForItemType(item.item_type);
        const newBalance = userCredits.current_balance - creditsSpent - itemCredits;

        // Create lead in crm_leads table using internal user details
        const { data: leadData, error: leadError } = await supabase
          .from('crm_leads' as any)
          .insert({
            seller_id: sellerId,
            buyer_id: view._internal_user_id,
            buyer_name: view._internal_user_name,
            buyer_email: view._internal_user_email,
            buyer_phone: view._internal_user_mobile,
            buyer_company: view._internal_user_company,
            item_id: item.item_id,
            item_type: item.item_type,
            item_name: item.item_name,
            source: 'product_view',
            status: 'new',
            is_unlocked: true,
            priority: 'medium'
          })
          .select('id')
          .single();

        if (leadError) {
          if (leadError.code === '23505') {
            // Already converted, skip
            newConvertedSet.add(`${view._internal_user_id}_${item.item_id}`);
            continue;
          }
          throw leadError;
        }

        const leadId = (leadData as any)?.id;
        creditsSpent += itemCredits;

        // Record credit transaction
        await supabase
          .from('credit_transactions')
          .insert({
            seller_id: sellerId,
            transaction_type: 'lead_conversion',
            credits_amount: -itemCredits,
            balance_before: userCredits.current_balance - creditsSpent + itemCredits,
            balance_after: userCredits.current_balance - creditsSpent,
            description: `Converted product view to lead for ${item.item_name}`,
            reference_id: leadId,
            reference_type: 'lead'
          });

        newConvertedSet.add(`${view._internal_user_id}_${item.item_id}`);
      }

      if (creditsSpent > 0) {
        // Update credits balance
        await supabase
          .from('seller_credits')
          .update({
            current_balance: userCredits.current_balance - creditsSpent,
            total_spent: userCredits.total_spent + creditsSpent,
            updated_at: new Date().toISOString()
          })
          .eq('seller_id', sellerId);
      }

      setConvertedLeads(newConvertedSet);
      await refreshCredits();

      toast({
        title: "Lead Created!",
        description: `Successfully converted ${unconvertedItems.length} item(s) to lead. ${creditsSpent} credits spent.`
      });

      onLeadConverted?.();

    } catch (error) {
      console.error('Error converting to lead:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to convert to lead. Please try again."
      });
    } finally {
      setConvertingId(null);
    }
  };

  const getItemTypeIcon = (type: string | null) => {
    switch (type) {
      case 'robot':
      case 'robots':
        return <Bot className="w-4 h-4" />;
      case 'spare_part':
      case 'spare_parts':
        return <Package className="w-4 h-4" />;
      case 'service':
      case 'services':
        return <Wrench className="w-4 h-4" />;
      case 'logistics':
      case 'logistics_services':
        return <Truck className="w-4 h-4" />;
      case 'finance':
      case 'loan_products':
        return <CreditCard className="w-4 h-4" />;
      default:
        return <Eye className="w-4 h-4" />;
    }
  };

  const getItemTypeBadge = (type: string | null) => {
    if (!type) return null;
    
    const typeLabels: Record<string, { label: string; className: string }> = {
      'robot': { label: 'Robot', className: 'bg-primary/10 text-primary dark:bg-primary/30 dark:text-primary' },
      'robots': { label: 'Robot', className: 'bg-primary/10 text-primary dark:bg-primary/30 dark:text-primary' },
      'spare_part': { label: 'Spare Part', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
      'spare_parts': { label: 'Spare Part', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
      'service': { label: 'Service', className: 'bg-success/10 text-success dark:bg-success/30 dark:text-success' },
      'services': { label: 'Service', className: 'bg-success/10 text-success dark:bg-success/30 dark:text-success' },
      'logistics': { label: 'Logistics', className: 'bg-primary/10 text-primary dark:bg-primary/30 dark:text-primary' },
      'logistics_services': { label: 'Logistics', className: 'bg-primary/10 text-primary dark:bg-primary/30 dark:text-primary' },
      'finance': { label: 'Finance', className: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' },
      'loan_products': { label: 'Finance', className: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' },
    };
    
    const config = typeLabels[type] || { label: type, className: 'bg-muted text-muted-foreground' };
    
    return (
      <Badge className={`${config.className} border-0 text-xs font-medium`}>
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-lg bg-card">
        <CardContent className="flex items-center justify-center h-48">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading product views...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Filter out already converted views
  const unconvertedViews = aggregatedViews.filter(view => !isAlreadyConverted(view));

  return (
    <Card className="border-0 shadow-lg bg-card overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Product Views</CardTitle>
              <CardDescription className="mt-1">
                Anonymous product views • Convert to lead to see user details
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5" />
              {userCredits?.current_balance || 0} Credits
            </Badge>
            <Badge variant="secondary" className="text-sm">
              {unconvertedViews.length} views
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {unconvertedViews.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Eye className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">No product views</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              {aggregatedViews.length > 0 
                ? "All views have been converted to leads. Check the Leads tab."
                : "When users view your products, their activity will appear here."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {unconvertedViews.map((view) => {
              const isNew = new Date(view.last_viewed) > new Date(Date.now() - 24 * 60 * 60 * 1000);
              const unconvertedItems = view.items.filter(item => 
                !item.item_id || !convertedLeads.has(`${view._internal_user_id}_${item.item_id}`)
              );
              const isConverting = convertingId === view.key;
              const totalCredits = getTotalCreditsForUser(view);

              // Format items as inline text: "Item1 (3), Item2 (2)"
              const itemsDisplay = unconvertedItems.map(item => 
                `${item.item_name} (${item.view_count})`
              ).join(', ');

              return (
                <div 
                  key={view.key} 
                  className="p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left side - User info and items */}
                    <div className="flex-1 min-w-0">
                      {/* Header with view count and time */}
                      <div className="flex items-center gap-2 text-sm mb-2">
                        <div className="p-1.5 rounded-md bg-primary/10">
                          <Eye className="w-4 h-4 text-primary" />
                        </div>
                        <span className="font-medium text-foreground">
                          {view.total_view_count} {view.total_view_count === 1 ? 'View' : 'Views'}
                        </span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-muted-foreground" title={format(new Date(view.last_viewed), 'PPpp')}>
                          {formatDistanceToNow(new Date(view.last_viewed), { addSuffix: true })}
                        </span>
                        {isNew && (
                          <Badge className="bg-primary/10 text-primary border-0 text-xs">New</Badge>
                        )}
                      </div>
                      
                      {/* Items viewed - inline display */}
                      <div className="text-sm text-foreground">
                        <span className="text-muted-foreground mr-1">Items:</span>
                        <span className="font-medium">{itemsDisplay}</span>
                      </div>
                      
                      {/* Item type badges */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {unconvertedItems.map((item, idx) => (
                          <Badge 
                            key={`${item.item_id}_${idx}`}
                            variant="outline" 
                            className="text-xs flex items-center gap-1"
                          >
                            {getItemTypeIcon(item.item_type)}
                            {item.item_type === 'robot' || item.item_type === 'robots' ? 'Robot' : 
                             item.item_type === 'spare_part' || item.item_type === 'spare_parts' ? 'Part' : 
                             item.item_type === 'service' || item.item_type === 'services' ? 'Service' : 
                             'Item'}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    {/* Right side - Convert button */}
                    <Button
                      size="sm"
                      onClick={() => handleConvertToLead(view)}
                      disabled={isConverting || !view._internal_user_id}
                      className="flex items-center gap-1.5 whitespace-nowrap"
                    >
                      {isConverting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          Convert to Lead
                          <Badge variant="secondary" className="ml-1 text-xs">
                            {totalCredits} cr
                          </Badge>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProductViewsSection;
