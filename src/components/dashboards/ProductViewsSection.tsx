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
  AlertCircle,
  Activity,
  Send,
  Loader2,
  MousePointer,
  FileText,
  MessageSquare,
  Truck,
  CreditCard,
  Wrench,
  Package,
  Bot,
  Sparkles
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNow } from 'date-fns';

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

interface ProductViewsSectionProps {
  sellerId: string;
  itemType?: string;
}

const ProductViewsSection = ({ sellerId, itemType }: ProductViewsSectionProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [views, setViews] = useState<ProductView[]>([]);
  const [accessRequests, setAccessRequests] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [requestingAccess, setRequestingAccess] = useState<string | null>(null);
  const [viewedItems, setViewedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (sellerId) {
      fetchViews();
      fetchAccessRequests();
    }
  }, [sellerId, itemType]);

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
        'details_click', 'specification_view', 'inquiry', 'contact', 'quote_request', 
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

  const fetchAccessRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('buyer_access_requests')
        .select('*')
        .eq('seller_id', sellerId);

      if (error) throw error;

      const requestMap: Record<string, any> = {};
      (data || []).forEach(request => {
        requestMap[request.inquiry_id] = request;
      });
      setAccessRequests(requestMap);
    } catch (error) {
      console.error('Error fetching access requests:', error);
    }
  };

  const requestBuyerAccess = async (view: ProductView) => {
    if (!user) return;

    setRequestingAccess(view.id);
    try {
      const { error: insertError } = await supabase
        .from('buyer_access_requests')
        .insert({
          seller_id: sellerId,
          buyer_id: view.user_id,
          inquiry_id: view.id,
          inquiry_type: view.item_type || 'general',
          item_id: view.item_id,
          item_name: view.additional_data?.item_name || 'Unknown Item',
          status: 'pending'
        });

      if (insertError) {
        if (insertError.code === '23505') {
          toast({
            title: "Request Already Sent",
            description: "You have already requested access for this visitor.",
            variant: "default"
          });
        } else {
          throw insertError;
        }
      } else {
        await supabase
          .from('notifications')
          .insert({
            user_id: sellerId,
            notification_type: 'buyer_access_request',
            title: 'New Visitor Access Request',
            message: `A seller has requested access to view visitor details for ${view.additional_data?.item_name || 'an item'}.`,
            reference_id: view.id,
            reference_type: 'buyer_access_request'
          });

        toast({
          title: "Access Request Sent",
          description: "Your request has been sent to the admin for approval.",
        });

        fetchAccessRequests();
      }
    } catch (error) {
      console.error('Error requesting access:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send access request. Please try again."
      });
    } finally {
      setRequestingAccess(null);
    }
  };

  const markAsViewed = (viewId: string) => {
    setViewedItems(prev => new Set([...prev, viewId]));
  };

  const getAccessStatus = (viewId: string): 'none' | 'pending' | 'approved' | 'rejected' => {
    const request = accessRequests[viewId];
    if (!request) return 'none';
    return request.status;
  };

  const getMaskedValue = (value: string | null, hasAccess: boolean): string => {
    if (hasAccess && value) return value;
    return 'XXXXX';
  };

  const getActionIcon = (buttonType: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      'view': <Eye className="w-4 h-4" />,
      'robot_view': <Bot className="w-4 h-4" />,
      'spare_part_view': <Package className="w-4 h-4" />,
      'service_view': <Wrench className="w-4 h-4" />,
      'logistics_view': <Truck className="w-4 h-4" />,
      'finance_view': <CreditCard className="w-4 h-4" />,
      'details_click': <MousePointer className="w-4 h-4" />,
      'specification_view': <FileText className="w-4 h-4" />,
      'inquiry': <MessageSquare className="w-4 h-4" />,
      'contact': <MessageSquare className="w-4 h-4" />,
      'quote_request': <FileText className="w-4 h-4" />,
      'chat_start': <MessageSquare className="w-4 h-4" />,
    };
    return iconMap[buttonType] || <Eye className="w-4 h-4" />;
  };

  const getActionBadge = (buttonType: string) => {
    const config: Record<string, { bg: string; text: string; label: string }> = {
      'view': { bg: 'bg-sky-100 dark:bg-sky-900/30', text: 'text-sky-700 dark:text-sky-300', label: 'Page View' },
      'robot_view': { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-300', label: 'Robot View' },
      'spare_part_view': { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', label: 'Part View' },
      'service_view': { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', label: 'Service View' },
      'logistics_view': { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', label: 'Logistics View' },
      'finance_view': { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-700 dark:text-rose-300', label: 'Finance View' },
      'details_click': { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', label: 'Details Opened' },
      'specification_view': { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-700 dark:text-cyan-300', label: 'Specs Viewed' },
      'inquiry': { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', label: 'Inquiry' },
      'contact': { bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-700 dark:text-teal-300', label: 'Contact' },
      'quote_request': { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', label: 'Quote Request' },
      'chat_start': { bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-700 dark:text-pink-300', label: 'Chat Started' },
    };

    const style = config[buttonType] || { bg: 'bg-muted', text: 'text-muted-foreground', label: buttonType };
    
    return (
      <Badge className={`${style.bg} ${style.text} border-0 flex items-center gap-1.5 font-medium`}>
        {getActionIcon(buttonType)}
        {style.label}
      </Badge>
    );
  };

  const getItemTypeBadge = (type: string | null) => {
    if (!type) return null;
    
    const typeLabels: Record<string, string> = {
      'robots': 'Robot',
      'spare_parts': 'Spare Part',
      'services': 'Service',
      'logistics': 'Logistics',
      'finance': 'Finance',
    };
    
    return (
      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
        {typeLabels[type] || type}
      </span>
    );
  };

  const getViewStatus = (viewId: string, createdAt: string) => {
    const isNew = new Date(createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000);
    const isViewed = viewedItems.has(viewId);
    
    if (!isViewed && isNew) {
      return <Badge className="bg-primary/10 text-primary border-0 text-xs">New</Badge>;
    }
    if (isViewed) {
      return <Badge variant="secondary" className="text-xs">Viewed</Badge>;
    }
    return <Badge variant="outline" className="text-xs">Follow-up</Badge>;
  };

  const getAccessStatusBadge = (status: 'none' | 'pending' | 'approved' | 'rejected') => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="secondary" className="flex items-center gap-1 text-xs">
            <Clock className="w-3 h-3" /> Pending
          </Badge>
        );
      case 'approved':
        return (
          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-0 flex items-center gap-1 text-xs">
            <CheckCircle className="w-3 h-3" /> Approved
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive" className="flex items-center gap-1 text-xs">
            <XCircle className="w-3 h-3" /> Rejected
          </Badge>
        );
      default:
        return null;
    }
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
                Track how users interact with your listings
              </CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className="text-sm">
            {views.length} interactions
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {views.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Eye className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">No views yet</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              When users view or interact with your products, services, or listings, their activity will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {views.map((view) => {
              const accessStatus = getAccessStatus(view.id);
              const hasAccess = accessStatus === 'approved';

              return (
                <div 
                  key={view.id} 
                  className="p-4 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => markAsViewed(view.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left side - User info and product */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          {hasAccess ? (
                            <Unlock className="w-4 h-4 text-green-600" />
                          ) : (
                            <Lock className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {getMaskedValue(view.user_name, hasAccess)}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {getMaskedValue(view.user_company, hasAccess)}
                          </p>
                        </div>
                        {getViewStatus(view.id, view.created_at)}
                      </div>
                      
                      <div className="ml-10 space-y-2">
                        {/* Product info */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-foreground">
                            {view.additional_data?.item_name || 'Unknown Product'}
                          </span>
                          {getItemTypeBadge(view.item_type)}
                        </div>
                        
                        {/* Contact info (masked) */}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>📱 {getMaskedValue(view.user_mobile, hasAccess)}</span>
                          <span>✉️ {getMaskedValue(view.user_email, hasAccess)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right side - Action, time, and buttons */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      {getActionBadge(view.button_type)}
                      
                      <div className="text-xs text-muted-foreground text-right">
                        <span title={format(new Date(view.created_at), 'PPpp')}>
                          {formatDistanceToNow(new Date(view.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-1">
                        {getAccessStatusBadge(accessStatus)}
                        
                        {accessStatus === 'none' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              requestBuyerAccess(view);
                            }}
                            disabled={requestingAccess === view.id}
                            className="h-7 text-xs"
                          >
                            {requestingAccess === view.id ? (
                              <Loader2 className="w-3 h-3 animate-spin mr-1" />
                            ) : (
                              <Send className="w-3 h-3 mr-1" />
                            )}
                            Request Access
                          </Button>
                        )}
                        
                        {accessStatus === 'pending' && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Awaiting Admin
                          </span>
                        )}
                        
                        {accessStatus === 'approved' && hasAccess && (
                          <Button size="sm" className="h-7 text-xs">
                            <MessageSquare className="w-3 h-3 mr-1" />
                            Start Chat
                          </Button>
                        )}
                      </div>
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
