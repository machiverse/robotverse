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

interface AggregatedView {
  key: string;
  user_id: string | null;
  user_name: string | null;
  user_email: string | null;
  user_company: string | null;
  user_mobile: string | null;
  item_id: string | null;
  item_type: string | null;
  item_name: string;
  view_count: number;
  last_viewed: string;
  first_viewed: string;
  interactions: ProductView[];
}

interface ProductViewsSectionProps {
  sellerId: string;
  itemType?: string;
  onLeadConverted?: () => void;
}

const CONVERT_CREDITS = 10;

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
      setViews(data || []);
    } catch (error) {
      console.error('Error fetching views:', error);
    } finally {
      setLoading(false);
    }
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
      const key = `${view.user_id || 'anonymous'}_${view.item_id || 'unknown'}`;
      
      if (aggregationMap.has(key)) {
        const existing = aggregationMap.get(key)!;
        existing.view_count += 1;
        existing.interactions.push(view);
        if (new Date(view.created_at) > new Date(existing.last_viewed)) {
          existing.last_viewed = view.created_at;
        }
        if (new Date(view.created_at) < new Date(existing.first_viewed)) {
          existing.first_viewed = view.created_at;
        }
      } else {
        aggregationMap.set(key, {
          key,
          user_id: view.user_id,
          user_name: view.user_name,
          user_email: view.user_email,
          user_company: view.user_company,
          user_mobile: view.user_mobile,
          item_id: view.item_id,
          item_type: view.item_type,
          item_name: view.additional_data?.item_name || 'Unknown Product',
          view_count: 1,
          last_viewed: view.created_at,
          first_viewed: view.created_at,
          interactions: [view]
        });
      }
    });

    const aggregated = Array.from(aggregationMap.values()).sort(
      (a, b) => new Date(b.last_viewed).getTime() - new Date(a.last_viewed).getTime()
    );

    setAggregatedViews(aggregated);
  };

  const isAlreadyConverted = (view: AggregatedView): boolean => {
    if (!view.user_id || !view.item_id) return false;
    return convertedLeads.has(`${view.user_id}_${view.item_id}`);
  };

  const handleConvertToLead = async (view: AggregatedView) => {
    // Check credits
    if (!userCredits || userCredits.current_balance < CONVERT_CREDITS) {
      toast({
        variant: "destructive",
        title: "Insufficient Credits",
        description: `⚠️ Insufficient credits. Please recharge to unlock this lead. Required: ${CONVERT_CREDITS}, Available: ${userCredits?.current_balance || 0}`
      });
      return;
    }

    if (!view.user_id || !view.item_id) {
      toast({
        variant: "destructive",
        title: "Cannot Convert",
        description: "This view doesn't have complete user information."
      });
      return;
    }

    setConvertingId(view.key);
    try {
      const newBalance = userCredits.current_balance - CONVERT_CREDITS;

      // Create lead in crm_leads table
      const { data: leadData, error: leadError } = await supabase
        .from('crm_leads' as any)
        .insert({
          seller_id: sellerId,
          buyer_id: view.user_id,
          buyer_name: view.user_name,
          buyer_email: view.user_email,
          buyer_phone: view.user_mobile,
          buyer_company: view.user_company,
          item_id: view.item_id,
          item_type: view.item_type,
          item_name: view.item_name,
          source: 'product_view',
          status: 'new',
          is_unlocked: true,
          priority: 'medium'
        })
        .select('id')
        .single();

      if (leadError) {
        if (leadError.code === '23505') {
          toast({
            title: "Already Converted",
            description: "This view has already been converted to a lead."
          });
          await fetchConvertedLeads();
          return;
        }
        throw leadError;
      }

      const leadId = (leadData as any)?.id;

      // Record credit transaction
      const { error: txError } = await supabase
        .from('credit_transactions')
        .insert({
          seller_id: sellerId,
          transaction_type: 'lead_conversion',
          credits_amount: -CONVERT_CREDITS,
          balance_before: userCredits.current_balance,
          balance_after: newBalance,
          description: `Converted product view to lead for ${view.item_name}`,
          reference_id: leadId,
          reference_type: 'lead'
        });

      if (txError) throw txError;

      // Update credits balance
      const { error: updateError } = await supabase
        .from('seller_credits')
        .update({
          current_balance: newBalance,
          total_spent: userCredits.total_spent + CONVERT_CREDITS,
          updated_at: new Date().toISOString()
        })
        .eq('seller_id', sellerId);

      if (updateError) throw updateError;

      // Add to converted set
      setConvertedLeads(prev => new Set(prev).add(`${view.user_id}_${view.item_id}`));

      await refreshCredits();

      toast({
        title: "Lead Created!",
        description: `Successfully converted to lead. ${CONVERT_CREDITS} credits spent. View details in Leads tab.`
      });

      // Notify parent to refresh leads
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
      'robot': { label: 'Robot', className: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' },
      'robots': { label: 'Robot', className: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' },
      'spare_part': { label: 'Spare Part', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
      'spare_parts': { label: 'Spare Part', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
      'service': { label: 'Service', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
      'services': { label: 'Service', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
      'logistics': { label: 'Logistics', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
      'logistics_services': { label: 'Logistics', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
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

              return (
                <div 
                  key={view.key} 
                  className="p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    {/* Left side - Product info ONLY (no user details) */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        {getItemTypeIcon(view.item_type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-foreground truncate">
                            {view.item_name}
                          </p>
                          {getItemTypeBadge(view.item_type)}
                          {isNew && (
                            <Badge className="bg-primary/10 text-primary border-0 text-xs">New</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <Eye className="w-3.5 h-3.5" />
                          <span className="font-medium text-foreground">{view.view_count} {view.view_count === 1 ? 'View' : 'Views'}</span>
                          <span>•</span>
                          <span title={format(new Date(view.last_viewed), 'PPpp')}>
                            {formatDistanceToNow(new Date(view.last_viewed), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right side - Convert to Lead button */}
                    <div className="flex-shrink-0">
                      <Button
                        size="sm"
                        onClick={() => handleConvertToLead(view)}
                        disabled={convertingId === view.key || !view.user_id}
                        className="flex items-center gap-2"
                      >
                        {convertingId === view.key ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4" />
                            Convert to Lead
                            <span className="text-xs opacity-75">({CONVERT_CREDITS} cr)</span>
                          </>
                        )}
                      </Button>
                    </div>
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
