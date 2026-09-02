import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Bot, Package, Wrench, Lock, Unlock, CreditCard, Send, Eye,
  Loader2, Clock, User, Mail, Phone, MapPin, IndianRupee, Hash,
  FileText, Calendar, Building, RefreshCw, Inbox, Sparkles, CheckCircle, ShoppingBag
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface UserRequestsMarketplaceProps {
  categoryFilter?: 'robot' | 'spare_part' | 'service';
  isCommissionSeller?: boolean;
}

const TYPE_CONFIG = {
  robot: { icon: Bot, label: 'Robot', color: 'text-primary', bg: 'bg-primary/10 dark:bg-primary/30', border: 'border-l-blue-500' },
  spare_part: { icon: Package, label: 'Spare Part', color: 'text-success', bg: 'bg-success/10 dark:bg-success/30', border: 'border-l-emerald-500' },
  service: { icon: Wrench, label: 'Service', color: 'text-primary', bg: 'bg-primary/10 dark:bg-primary/30', border: 'border-l-purple-500' },
};

const getCreditsNeeded = (productType: string): number => {
  return productType === 'robot' ? 10 : 5;
};

const UserRequestsMarketplace = ({ categoryFilter, isCommissionSeller }: UserRequestsMarketplaceProps) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [requests, setRequests] = useState<any[]>([]);
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState<string | null>(null);
  const [creditsBalance, setCreditsBalance] = useState(0);
  const [activeTab, setActiveTab] = useState('available');

  // Quote response modal
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [sellerProducts, setSellerProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [quoteForm, setQuoteForm] = useState({
    quotation_amount: '',
    quotation_details: '',
    product_details: '',
    seller_notes: '',
    selected_product_id: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchCredits = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('seller_credits')
      .select('current_balance')
      .eq('seller_id', user.id)
      .single();
    if (data) setCreditsBalance(data.current_balance || 0);
  }, [user]);

  const fetchRequests = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      let query = supabase
        .from('user_product_requests')
        .select('*')
        .in('status', ['new_request', 'seller_assigned', 'in_review', 'quote_submitted', 'in_progress'])
        .neq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (categoryFilter) {
        query = query.eq('product_type', categoryFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setRequests((data || []) as any[]);

      // Check which requests this seller has already unlocked (has an assignment)
      const { data: assignments } = await supabase
        .from('request_assignments')
        .select('request_id')
        .eq('seller_id', user.id);

      if (assignments) {
        setUnlockedIds(new Set(assignments.map((a: any) => a.request_id)));
      }
    } catch (err) {
      console.error('Error fetching user requests:', err);
    } finally {
      setLoading(false);
    }
  }, [user, categoryFilter]);

  useEffect(() => {
    fetchRequests();
    fetchCredits();
  }, [fetchRequests, fetchCredits]);

  // Fetch seller's own products based on request product_type
  const fetchSellerProducts = useCallback(async (productType: string) => {
    if (!user) return;
    setLoadingProducts(true);
    try {
      let products: any[] = [];
      if (productType === 'robot') {
        const { data } = await supabase
          .from('robots')
          .select('id, name, brand, price')
          .eq('seller_id', user.id)
          .order('created_at', { ascending: false });
        products = (data || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          brand: p.brand,
          price: p.price,
          type: 'robot',
          label: `${p.name}${p.brand ? ` - ${p.brand}` : ''}${p.price ? ` (₹${Number(p.price).toLocaleString()})` : ''}`,
        }));
      } else if (productType === 'spare_part') {
        const { data } = await supabase
          .from('spare_parts')
          .select('id, name, brand, price')
          .eq('seller_id', user.id)
          .order('created_at', { ascending: false });
        products = (data || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          brand: p.brand,
          price: p.price,
          type: 'spare_part',
          label: `${p.name}${p.brand ? ` - ${p.brand}` : ''}${p.price ? ` (₹${Number(p.price).toLocaleString()})` : ''}`,
        }));
      } else if (productType === 'service') {
        const { data } = await supabase
          .from('services')
          .select('id, name, service_type, price_range')
          .eq('provider_id', user.id)
          .order('created_at', { ascending: false });
        products = (data || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          brand: p.service_type,
          price: null,
          type: 'service',
          label: `${p.name}${p.service_type ? ` (${p.service_type})` : ''}${p.price_range ? ` - ${p.price_range}` : ''}`,
        }));
      }
      setSellerProducts(products);
    } catch (err) {
      console.error('Error fetching seller products:', err);
    } finally {
      setLoadingProducts(false);
    }
  }, [user]);

  const handleUnlock = async (request: any) => {
    if (!user) return;
    const creditsNeeded = getCreditsNeeded(request.product_type);

    if (!isCommissionSeller && creditsBalance < creditsNeeded) {
      toast({
        title: 'Insufficient Credits',
        description: `You need ${creditsNeeded} credits to unlock this request. Current balance: ${creditsBalance}`,
        variant: 'destructive',
      });
      return;
    }

    setUnlocking(request.id);
    try {
      // Create assignment for this seller
      const { error: assignError } = await supabase
        .from('request_assignments')
        .insert({
          request_id: request.id,
          seller_id: user.id,
          assigned_by: user.id,
          status: 'pending',
        } as any);

      if (assignError) {
        if (assignError.code === '23505') {
          toast({ title: 'Already Unlocked', description: 'You have already unlocked this request.' });
          setUnlockedIds(prev => new Set(prev).add(request.id));
          return;
        }
        throw assignError;
      }

      // Deduct credits (skip for commission sellers)
      if (!isCommissionSeller) {
        const newBalance = creditsBalance - creditsNeeded;
        await supabase
          .from('seller_credits')
          .update({
            current_balance: newBalance,
            total_spent: creditsBalance - newBalance,
            updated_at: new Date().toISOString(),
          } as any)
          .eq('seller_id', user.id);

        await supabase.from('credit_transactions').insert({
          seller_id: user.id,
          transaction_type: 'lead_unlock',
          credits_amount: -creditsNeeded,
          balance_before: creditsBalance,
          balance_after: newBalance,
          description: `Unlocked user request: ${request.product_name}`,
          reference_id: request.id,
          reference_type: 'user_request',
        });

        setCreditsBalance(newBalance);
      }

      setUnlockedIds(prev => new Set(prev).add(request.id));
      toast({
        title: 'Request Unlocked!',
        description: isCommissionSeller
          ? 'Contact details revealed. You can now submit a quote.'
          : `Contact details revealed. ${creditsNeeded} credits deducted.`,
      });
    } catch (err: any) {
      console.error('Error unlocking request:', err);
      toast({ title: 'Unlock Failed', description: err.message, variant: 'destructive' });
    } finally {
      setUnlocking(null);
    }
  };

  const openQuoteModal = (request: any) => {
    setSelectedRequest(request);
    setQuoteForm({ quotation_amount: '', quotation_details: '', product_details: '', seller_notes: '', selected_product_id: '' });
    setShowQuoteModal(true);
    fetchSellerProducts(request.product_type);
  };

  const handleProductSelect = (productId: string) => {
    setQuoteForm(prev => ({ ...prev, selected_product_id: productId }));
    const product = sellerProducts.find(p => p.id === productId);
    if (product) {
      setQuoteForm(prev => ({
        ...prev,
        selected_product_id: productId,
        product_details: `Product: ${product.name}${product.brand ? `\nBrand: ${product.brand}` : ''}${product.price ? `\nList Price: ₹${Number(product.price).toLocaleString()}` : ''}`,
        quotation_amount: product.price ? String(product.price) : prev.quotation_amount,
      }));
    }
  };

  const handleSubmitQuote = async () => {
    if (!selectedRequest || !user) return;
    setSubmitting(true);
    try {
      // Update the assignment with quote details
      const { error } = await supabase
        .from('request_assignments')
        .update({
          status: 'quote_submitted',
          quotation_amount: parseFloat(quoteForm.quotation_amount) || null,
          quotation_details: quoteForm.quotation_details || null,
          product_details: quoteForm.product_details || null,
          seller_notes: quoteForm.seller_notes || null,
          response_at: new Date().toISOString(),
        } as any)
        .eq('request_id', selectedRequest.id)
        .eq('seller_id', user.id);

      if (error) throw error;

      // Notify the requesting user
      await supabase.from('notifications').insert({
        user_id: selectedRequest.user_id,
        notification_type: 'quote_received',
        title: 'Quote Received for Your Request',
        message: `A seller has submitted a quotation for "${selectedRequest.product_name}".`,
        reference_id: selectedRequest.id,
        reference_type: 'user_product_request',
        is_read: false,
      });

      toast({ title: 'Quote Submitted!', description: 'The user has been notified about your quote.' });
      setShowQuoteModal(false);
      fetchRequests();
    } catch (err: any) {
      toast({ title: 'Failed to submit', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const availableRequests = requests.filter(r => !unlockedIds.has(r.id));
  const myUnlockedRequests = requests.filter(r => unlockedIds.has(r.id));

  const displayedRequests = activeTab === 'available' ? availableRequests : myUnlockedRequests;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading user requests…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            User Requests
          </h2>
          <p className="text-sm text-muted-foreground">
            Users looking for products/services. Unlock to see contact details and submit a quote.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isCommissionSeller && (
            <div className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-1.5 text-xs">
              <CreditCard className="h-4 w-4 text-amber-600" />
              <span className="font-medium">{creditsBalance} credits</span>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={() => { fetchRequests(); fetchCredits(); }}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="available" className="flex items-center gap-2">
            <Inbox className="h-4 w-4" />
            Available
            {availableRequests.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[11px]">{availableRequests.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="unlocked" className="flex items-center gap-2">
            <Unlock className="h-4 w-4" />
            My Unlocked
            {myUnlockedRequests.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[11px]">{myUnlockedRequests.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Request cards */}
      {displayedRequests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Inbox className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-medium">
            {activeTab === 'available' ? 'No new requests' : 'No unlocked requests yet'}
          </h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            {activeTab === 'available'
              ? 'No matching user requests at the moment. Check back later.'
              : 'Unlock requests from the "Available" tab to see them here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedRequests.map(r => {
            const typeConf = TYPE_CONFIG[r.product_type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.robot;
            const TypeIcon = typeConf.icon;
            const isUnlocked = unlockedIds.has(r.id);
            const creditsNeeded = getCreditsNeeded(r.product_type);

            return (
              <Card key={r.id} className={`border-l-4 ${typeConf.border} border-muted/60 hover:shadow-md transition-shadow`}>
                <CardContent className="p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    {/* Left: Request info */}
                    <div className="flex-1 min-w-0 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-foreground">{r.product_name}</h3>
                        <Badge variant="outline" className={`flex items-center gap-1 text-xs ${typeConf.color}`}>
                          <TypeIcon className="w-3 h-3" />
                          {typeConf.label}
                        </Badge>
                        {r.quantity > 1 && (
                          <Badge variant="secondary" className="text-xs">
                            <Hash className="w-3 h-3 mr-1" /> Qty: {r.quantity}
                          </Badge>
                        )}
                      </div>

                      {/* Contact & Details */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <User className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{isUnlocked ? (r.contact_name || 'Not provided') : '••••••'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate text-xs italic">Hidden for privacy</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="w-3.5 h-3.5 shrink-0" />
                          <span className="text-xs italic">Hidden for privacy</span>
                        </div>
                        {r.location && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{r.location}</span>
                          </div>
                        )}
                        {r.brand && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Building className="w-3.5 h-3.5 shrink-0" />
                            <span>Brand: {r.brand}</span>
                          </div>
                        )}
                        {r.budget && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <IndianRupee className="w-3.5 h-3.5 shrink-0" />
                            <span>{r.budget}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="w-3.5 h-3.5 shrink-0" />
                          <span>{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</span>
                        </div>
                      </div>

                      {r.specifications && (
                        <p className="text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2 line-clamp-2">
                          <FileText className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
                          {r.specifications}
                        </p>
                      )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex flex-wrap items-center gap-2 lg:flex-col lg:items-end shrink-0">
                      {!isUnlocked ? (
                        <Button
                          size="sm"
                          onClick={() => handleUnlock(r)}
                          disabled={unlocking === r.id || (!isCommissionSeller && creditsBalance < creditsNeeded)}
                        >
                          {unlocking === r.id ? (
                            <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                          ) : (
                            <Lock className="w-3.5 h-3.5 mr-1" />
                          )}
                          {isCommissionSeller
                            ? 'Unlock Free'
                            : `Unlock (${creditsNeeded} credits)`}
                        </Button>
                      ) : (
                        <>
                          <Badge variant="outline" className="text-xs border-success/30 text-success">
                            <Unlock className="w-3 h-3 mr-1" /> Unlocked
                          </Badge>
                          <Button size="sm" onClick={() => openQuoteModal(r)}>
                            <Send className="w-3.5 h-3.5 mr-1" /> Submit Quote
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Quote Response Modal with Product Selector */}
      <Dialog open={showQuoteModal} onOpenChange={setShowQuoteModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" />
              Submit Quote for {selectedRequest?.product_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Product Selector */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                {selectedRequest?.product_type === 'robot' && <Bot className="w-4 h-4" />}
                {selectedRequest?.product_type === 'spare_part' && <Package className="w-4 h-4" />}
                {selectedRequest?.product_type === 'service' && <Wrench className="w-4 h-4" />}
                Select Your {selectedRequest?.product_type === 'robot' ? 'Robot' : selectedRequest?.product_type === 'spare_part' ? 'Spare Part' : 'Service'}
              </Label>
              {loadingProducts ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading your listings...
                </div>
              ) : sellerProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3">
                  No {selectedRequest?.product_type === 'robot' ? 'robots' : selectedRequest?.product_type === 'spare_part' ? 'spare parts' : 'services'} listed yet. You can still type product details manually below.
                </p>
              ) : (
                <Select value={quoteForm.selected_product_id} onValueChange={handleProductSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder={`Choose from your ${sellerProducts.length} listed ${selectedRequest?.product_type === 'robot' ? 'robots' : selectedRequest?.product_type === 'spare_part' ? 'spare parts' : 'services'}...`} />
                  </SelectTrigger>
                  <SelectContent>
                    {sellerProducts.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label>Quotation Amount (₹)</Label>
              <Input
                type="number"
                placeholder="Enter your quoted price"
                value={quoteForm.quotation_amount}
                onChange={e => setQuoteForm(prev => ({ ...prev, quotation_amount: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Product / Solution Details</Label>
              <Textarea
                placeholder="Describe the product or solution you can offer…"
                value={quoteForm.product_details}
                onChange={e => setQuoteForm(prev => ({ ...prev, product_details: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Quotation Details</Label>
              <Textarea
                placeholder="Include pricing breakdown, delivery timeline, etc."
                value={quoteForm.quotation_details}
                onChange={e => setQuoteForm(prev => ({ ...prev, quotation_details: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Additional Notes</Label>
              <Textarea
                placeholder="Any additional information for the buyer…"
                value={quoteForm.seller_notes}
                onChange={e => setQuoteForm(prev => ({ ...prev, seller_notes: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuoteModal(false)}>Cancel</Button>
            <Button onClick={handleSubmitQuote} disabled={submitting || !quoteForm.quotation_amount}>
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Submit Quote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserRequestsMarketplace;
