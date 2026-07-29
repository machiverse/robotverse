import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from '@/lib/router-compat';
import { useQuery } from '@tanstack/react-query';
import EnhancedHeader from '@/components/EnhancedHeader';
import { useAuth } from '@/hooks/useAuth';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Gavel, Loader2, ShieldCheck, Lock } from 'lucide-react';
import { getAuctionStatus } from '@/utils/auctionStatus';

const toLocalInput = (iso: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const EditAuction: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, isLoading: loadingAdmin } = useIsAdmin();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>(null);

  const { data: auction, isLoading } = useQuery({
    queryKey: ['auction-edit', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('auctions').select('*').eq('id', id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (!auction) return;
    setForm({
      auction_title: auction.auction_title || '',
      description: auction.description || '',
      start_time: toLocalInput(auction.start_time),
      end_time: toLocalInput(auction.end_time),
      starting_price: String(auction.starting_price ?? ''),
      min_increment: String(auction.min_increment ?? '100'),
      has_reserve: !!auction.reserve_price,
      reserve_price: String(auction.reserve_price ?? ''),
      has_buy_now: !!auction.buy_now_price,
      buy_now_price: String(auction.buy_now_price ?? ''),
      auto_extend_minutes: String(auction.auto_extend_minutes ?? '5'),
      item_location: auction.item_location || '',
      inspection_details: auction.inspection_details || '',
      payment_terms: auction.payment_terms || '',
      delivery_terms: auction.delivery_terms || '',
      warranty_period: auction.warranty_period || '',
      terms_and_conditions: auction.terms_and_conditions || '',
    });
  }, [auction]);

  if (!user) { navigate('/auth'); return null; }
  if (isLoading || loadingAdmin || !form) {
    return (
      <div className="min-h-screen bg-background">
        <EnhancedHeader />
        <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      </div>
    );
  }
  if (!auction) {
    return (
      <div className="min-h-screen bg-background">
        <EnhancedHeader />
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground">Auction not found.</p>
        </div>
      </div>
    );
  }

  const derivedStatus = getAuctionStatus(auction as any);
  const isOwner = auction.seller_id === user.id;
  const isEditableBySeller = isOwner && derivedStatus === 'upcoming' && (auction.total_bids || 0) === 0;
  const canEdit = isAdmin || isEditableBySeller;

  if (!canEdit) {
    return (
      <div className="min-h-screen bg-background">
        <EnhancedHeader />
        <div className="container mx-auto px-4 py-12 max-w-2xl">
          <Card className="border border-border">
            <CardContent className="p-8 text-center">
              <Lock className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
              <h2 className="text-lg font-semibold text-foreground mb-1">Editing locked</h2>
              <p className="text-sm text-muted-foreground mb-4">
                {isOwner
                  ? 'Once an auction is live or has received a bid, only an administrator can modify it. Please contact support for changes.'
                  : 'You do not have permission to edit this auction.'}
              </p>
              <Button variant="outline" onClick={() => navigate(`/auctions/${id}`)}>Back to auction</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: string[] = [];
    if (!form.auction_title.trim()) errors.push('Title is required');
    if (!form.starting_price || parseFloat(form.starting_price) <= 0) errors.push('Starting price required');
    if (!form.start_time || !form.end_time) errors.push('Start and end time required');
    const start = new Date(form.start_time);
    const end = new Date(form.end_time);
    if (end <= start) errors.push('End time must be after start time');
    if (form.has_reserve && (!form.reserve_price || parseFloat(form.reserve_price) <= parseFloat(form.starting_price))) {
      errors.push('Reserve must be greater than starting price');
    }
    if (form.has_buy_now && (!form.buy_now_price || parseFloat(form.buy_now_price) <= parseFloat(form.starting_price))) {
      errors.push('Buy Now must be greater than starting price');
    }
    if (errors.length) {
      toast({ title: 'Fix the following', description: errors.join(' • '), variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const patch: any = {
        auction_title: form.auction_title.trim(),
        description: form.description || null,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        starting_price: parseFloat(form.starting_price),
        min_increment: parseFloat(form.min_increment) || 100,
        reserve_price: form.has_reserve && form.reserve_price ? parseFloat(form.reserve_price) : null,
        buy_now_price: form.has_buy_now && form.buy_now_price ? parseFloat(form.buy_now_price) : null,
        auto_extend_minutes: parseInt(form.auto_extend_minutes) || 5,
        item_location: form.item_location.trim() || null,
        inspection_details: form.inspection_details.trim() || null,
        payment_terms: form.payment_terms.trim() || null,
        delivery_terms: form.delivery_terms.trim() || null,
        warranty_period: form.warranty_period.trim() || null,
        terms_and_conditions: form.terms_and_conditions.trim() || null,
      };
      const { error } = await supabase.from('auctions').update(patch).eq('id', id);
      if (error) throw error;
      toast({ title: 'Auction updated', description: 'Your changes have been saved.' });
      navigate(`/auctions/${id}`);
    } catch (err: any) {
      toast({ title: 'Update failed', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  return (
    <div className="min-h-screen bg-background">
      <EnhancedHeader />
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/auctions/${id}`)} className="mb-4 text-muted-foreground">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Auction
        </Button>

        <Card className="border border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Gavel className="w-5 h-5 text-primary" /> Edit Auction
              {isAdmin && (
                <Badge variant="outline" className="ml-2 gap-1 text-amber-500 border-amber-500/40">
                  <ShieldCheck className="w-3 h-3" /> Admin override
                </Badge>
              )}
              <Badge variant="outline" className="ml-auto capitalize">{derivedStatus}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label>Title</Label>
                <Input value={form.auction_title} onChange={(e) => set('auction_title', e.target.value)} />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Start time</Label>
                  <Input type="datetime-local" value={form.start_time} onChange={(e) => set('start_time', e.target.value)} />
                </div>
                <div>
                  <Label>End time</Label>
                  <Input type="datetime-local" value={form.end_time} onChange={(e) => set('end_time', e.target.value)} />
                </div>
                <div>
                  <Label>Starting price (₹)</Label>
                  <Input type="number" value={form.starting_price} onChange={(e) => set('starting_price', e.target.value)} />
                </div>
                <div>
                  <Label>Min. increment (₹)</Label>
                  <Input type="number" value={form.min_increment} onChange={(e) => set('min_increment', e.target.value)} />
                </div>
                <div>
                  <Label>Auto-extend (minutes)</Label>
                  <Input type="number" value={form.auto_extend_minutes} onChange={(e) => set('auto_extend_minutes', e.target.value)} />
                </div>
                <div>
                  <Label>Item location</Label>
                  <Input value={form.item_location} onChange={(e) => set('item_location', e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Reserve price</Label>
                    <Switch checked={form.has_reserve} onCheckedChange={(v) => set('has_reserve', v)} />
                  </div>
                  {form.has_reserve && (
                    <Input type="number" placeholder="Reserve (₹)" value={form.reserve_price} onChange={(e) => set('reserve_price', e.target.value)} />
                  )}
                </div>
                <div className="border border-border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Buy Now price</Label>
                    <Switch checked={form.has_buy_now} onCheckedChange={(v) => set('has_buy_now', v)} />
                  </div>
                  {form.has_buy_now && (
                    <Input type="number" placeholder="Buy Now (₹)" value={form.buy_now_price} onChange={(e) => set('buy_now_price', e.target.value)} />
                  )}
                </div>
              </div>

              <div>
                <Label>Inspection details</Label>
                <Textarea rows={2} value={form.inspection_details} onChange={(e) => set('inspection_details', e.target.value)} />
              </div>
              <div>
                <Label>Payment terms</Label>
                <Textarea rows={2} value={form.payment_terms} onChange={(e) => set('payment_terms', e.target.value)} />
              </div>
              <div>
                <Label>Delivery terms</Label>
                <Textarea rows={2} value={form.delivery_terms} onChange={(e) => set('delivery_terms', e.target.value)} />
              </div>
              <div>
                <Label>Warranty period</Label>
                <Input value={form.warranty_period} onChange={(e) => set('warranty_period', e.target.value)} />
              </div>
              <div>
                <Label>Terms & conditions</Label>
                <Textarea rows={3} value={form.terms_and_conditions} onChange={(e) => set('terms_and_conditions', e.target.value)} />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => navigate(`/auctions/${id}`)}>Cancel</Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save changes
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EditAuction;
