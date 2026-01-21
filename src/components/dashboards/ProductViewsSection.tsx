import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Eye, 
  Lock, 
  Unlock, 
  Clock, 
  CheckCircle, 
  XCircle,
  Activity,
  Loader2,
  Bot,
  Package,
  Wrench,
  Truck,
  CreditCard,
  UserPlus,
  Coins
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
}

const UNLOCK_CREDITS = 10;

const ProductViewsSection = ({ sellerId, itemType }: ProductViewsSectionProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isContactUnlocked, userCredits, refreshCredits } = useContactUnlock();
  const [views, setViews] = useState<ProductView[]>([]);
  const [aggregatedViews, setAggregatedViews] = useState<AggregatedView[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);

  useEffect(() => {
    if (sellerId) {
      fetchViews();
    }
  }, [sellerId, itemType]);

  useEffect(() => {
    // Aggregate views by user + product
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

      // Include all view and interaction types
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

  const aggregateViews = () => {
    const aggregationMap = new Map<string, AggregatedView>();

    views.forEach((view) => {
      // Create a unique key based on user_id + item_id
      const key = `${view.user_id || 'anonymous'}_${view.item_id || 'unknown'}`;
      
      if (aggregationMap.has(key)) {
        const existing = aggregationMap.get(key)!;
        existing.view_count += 1;
        existing.interactions.push(view);
        // Update last_viewed if this view is more recent
        if (new Date(view.created_at) > new Date(existing.last_viewed)) {
          existing.last_viewed = view.created_at;
        }
        // Update first_viewed if this view is older
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

    // Convert map to array and sort by last_viewed
    const aggregated = Array.from(aggregationMap.values()).sort(
      (a, b) => new Date(b.last_viewed).getTime() - new Date(a.last_viewed).getTime()
    );

    setAggregatedViews(aggregated);
  };

  const isViewUnlocked = (view: AggregatedView): boolean => {
    if (!view.user_id || !view.item_id) return false;
    return isContactUnlocked(view.user_id, view.item_id, 'product_view');
  };

  const handleUnlockContact = async (view: AggregatedView) => {
    if (!userCredits || userCredits.current_balance < UNLOCK_CREDITS) {
      toast({
        variant: "destructive",
        title: "Insufficient Credits",
        description: `You need ${UNLOCK_CREDITS} credits to unlock buyer details. Current balance: ${userCredits?.current_balance || 0}`
      });
      return;
    }

    if (!view.user_id || !view.item_id) {
      toast({
        variant: "destructive",
        title: "Cannot Unlock",
        description: "This view doesn't have complete user information."
      });
      return;
    }

    setUnlockingId(view.key);
    try {
      const newBalance = userCredits.current_balance - UNLOCK_CREDITS;

      // Insert unlock record
      const { error: unlockError } = await supabase
        .from('unlocked_contacts')
        .insert({
          user_id: sellerId,
          seller_id: view.user_id,
          item_id: view.item_id,
          item_type: 'product_view',
          credits_used: UNLOCK_CREDITS
        });

      if (unlockError) {
        if (unlockError.code === '23505') {
          toast({
            title: "Already Unlocked",
            description: "You have already unlocked this contact."
          });
          await refreshCredits();
          return;
        }
        throw unlockError;
      }

      // Record transaction
      const { error: txError } = await supabase
        .from('credit_transactions')
        .insert({
          seller_id: sellerId,
          transaction_type: 'product_view_unlock',
          credits_amount: -UNLOCK_CREDITS,
          balance_before: userCredits.current_balance,
          balance_after: newBalance,
          description: `Unlocked product view from ${view.user_name || 'Unknown User'} for ${view.item_name}`,
          reference_id: view.item_id,
          reference_type: 'product_view'
        });

      if (txError) throw txError;

      // Update credits balance
      const { error: updateError } = await supabase
        .from('seller_credits')
        .update({
          current_balance: newBalance,
          total_spent: userCredits.total_spent + UNLOCK_CREDITS,
          updated_at: new Date().toISOString()
        })
        .eq('seller_id', sellerId);

      if (updateError) throw updateError;

      await refreshCredits();

      toast({
        title: "Contact Unlocked!",
        description: `You spent ${UNLOCK_CREDITS} credits to view buyer details.`
      });
    } catch (error) {
      console.error('Error unlocking contact:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to unlock contact. Please try again."
      });
    } finally {
      setUnlockingId(null);
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
                Users who viewed your products • Unlock to see their details
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5" />
              {userCredits?.current_balance || 0} Credits
            </Badge>
            <Badge variant="secondary" className="text-sm">
              {aggregatedViews.length} viewers
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {aggregatedViews.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Eye className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">No views yet</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              When users view your products, their activity will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {aggregatedViews.map((view) => {
              const isUnlocked = isViewUnlocked(view);
              const isNew = new Date(view.last_viewed) > new Date(Date.now() - 24 * 60 * 60 * 1000);

              return (
                <div 
                  key={view.key} 
                  className="p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left side - Product info only (user details hidden until unlocked) */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          {getItemTypeIcon(view.item_type)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-foreground">
                              {view.item_name}
                            </p>
                            {getItemTypeBadge(view.item_type)}
                            {isNew && (
                              <Badge className="bg-primary/10 text-primary border-0 text-xs">New</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                            <Eye className="w-3.5 h-3.5" />
                            <span>{view.view_count} {view.view_count === 1 ? 'view' : 'views'} by 1 user</span>
                            <span>•</span>
                            <span title={format(new Date(view.last_viewed), 'PPpp')}>
                              {formatDistanceToNow(new Date(view.last_viewed), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* User details - ONLY show if unlocked */}
                      {isUnlocked && (
                        <div className="ml-13 mt-3 p-3 rounded-lg bg-accent/50 border border-border">
                          <div className="flex items-center gap-2 mb-2">
                            <Unlock className="w-4 h-4 text-primary" />
                            <span className="text-sm font-medium text-foreground">Buyer Details</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Name: </span>
                              <span className="font-medium">{view.user_name || 'Not provided'}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Company: </span>
                              <span className="font-medium">{view.user_company || 'Not provided'}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Email: </span>
                              <span className="font-medium">{view.user_email || 'Not provided'}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Mobile: </span>
                              <span className="font-medium">{view.user_mobile || 'Not provided'}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right side - Unlock button */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      {isUnlocked ? (
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-0 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Unlocked
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleUnlockContact(view)}
                          disabled={unlockingId === view.key || !view.user_id}
                          className="flex items-center gap-2"
                        >
                          {unlockingId === view.key ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Unlock className="w-4 h-4" />
                              Unlock ({UNLOCK_CREDITS} credits)
                            </>
                          )}
                        </Button>
                      )}
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
