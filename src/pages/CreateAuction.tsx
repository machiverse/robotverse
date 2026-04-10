import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EnhancedHeader from '@/components/EnhancedHeader';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Gavel, Loader2, Bot, CheckCircle2, MapPin } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

const CreateAuction: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    auction_title: '',
    description: '',
    robot_id: '',
    auction_type: 'open' as 'open' | 'sealed',
    start_time: '',
    end_time: '',
    starting_price: '',
    min_increment: '100',
    reserve_price: '',
    buy_now_price: '',
    auto_extend_minutes: '5',
    has_reserve: false,
    has_buy_now: false,
  });

  // Fetch seller's robots with full details
  const { data: myRobots, isLoading: loadingRobots } = useQuery({
    queryKey: ['my-robots-for-auction', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('robots')
        .select('id, name, model, robot_type, brand, price, currency, images, location, availability')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const selectRobot = (robot: any) => {
    if (form.robot_id === robot.id) {
      // Deselect
      setForm({ ...form, robot_id: '', auction_title: form.auction_title });
    } else {
      setForm({
        ...form,
        robot_id: robot.id,
        auction_title: form.auction_title || `${robot.name} ${robot.model ? '— ' + robot.model : ''}`.trim(),
      });
    }
  };

  const selectedRobot = myRobots?.find((r: any) => r.id === form.robot_id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { navigate('/auth'); return; }

    if (!form.auction_title || !form.starting_price || !form.start_time || !form.end_time) {
      toast({ title: 'Missing fields', description: 'Please fill all required fields.', variant: 'destructive' });
      return;
    }

    if (new Date(form.end_time) <= new Date(form.start_time)) {
      toast({ title: 'Invalid dates', description: 'End time must be after start time.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('auctions').insert({
        seller_id: user.id,
        auction_title: form.auction_title,
        description: form.description || null,
        robot_id: form.robot_id || null,
        auction_type: form.auction_type as any,
        start_time: new Date(form.start_time).toISOString(),
        end_time: new Date(form.end_time).toISOString(),
        starting_price: parseFloat(form.starting_price),
        min_increment: parseFloat(form.min_increment) || 100,
        reserve_price: form.has_reserve && form.reserve_price ? parseFloat(form.reserve_price) : null,
        buy_now_price: form.has_buy_now && form.buy_now_price ? parseFloat(form.buy_now_price) : null,
        auto_extend_minutes: parseInt(form.auto_extend_minutes) || 5,
        images: selectedRobot?.images || null,
        status: new Date(form.start_time) <= new Date() ? 'live' as any : 'upcoming' as any,
      } as any);

      if (error) throw error;
      toast({ title: 'Auction created!', description: 'Your auction has been listed.' });
      navigate('/auctions');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    navigate('/auth');
    return null;
  }

  const formatPrice = (price: number, currency: string) => {
    const sym = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₹';
    return `${sym}${price.toLocaleString('en-IN')}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <EnhancedHeader />
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <Button variant="ghost" size="sm" onClick={() => navigate('/auctions')} className="mb-4 text-muted-foreground">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Auctions
        </Button>

        <Card className="border border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Gavel className="w-5 h-5 text-primary" /> Create New Auction
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Step 1: Select Robot */}
              <div>
                <Label className="text-sm font-semibold mb-3 block">Step 1: Select a Robot from Your Listings</Label>
                {loadingRobots ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : !myRobots?.length ? (
                  <div className="border border-dashed border-border rounded-xl p-6 text-center">
                    <Bot className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground mb-3">You haven't listed any robots yet.</p>
                    <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/robots')}>
                      List a Robot First
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[320px] overflow-y-auto pr-1">
                    {myRobots.map((robot: any) => {
                      const isSelected = form.robot_id === robot.id;
                      return (
                        <div
                          key={robot.id}
                          onClick={() => selectRobot(robot)}
                          className={`relative flex gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-200 ${
                            isSelected
                              ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                              : 'border-border bg-card hover:border-primary/30 hover:bg-muted/30'
                          }`}
                        >
                          {/* Selection indicator */}
                          {isSelected && (
                            <div className="absolute top-2 right-2">
                              <CheckCircle2 className="w-5 h-5 text-primary" />
                            </div>
                          )}

                          {/* Thumbnail */}
                          <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                            {robot.images?.[0] ? (
                              <img src={robot.images[0]} alt={robot.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="flex items-center justify-center w-full h-full">
                                <Bot className="w-6 h-6 text-muted-foreground/40" />
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground text-sm truncate pr-6">{robot.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{robot.robot_type} {robot.brand ? `• ${robot.brand}` : ''}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {robot.price ? (
                                <span className="text-xs font-semibold text-primary">{formatPrice(robot.price, robot.currency || 'INR')}</span>
                              ) : (
                                <span className="text-xs text-muted-foreground">Price on Request</span>
                              )}
                              {robot.location && (
                                <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                  <MapPin className="w-2.5 h-2.5" />{robot.location}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {myRobots && myRobots.length > 0 && !form.robot_id && (
                  <p className="text-xs text-muted-foreground mt-2">Click a robot to link it to this auction. You can also create an auction without linking.</p>
                )}
              </div>

              {/* Step 2: Auction Details */}
              <div className="pt-2 border-t border-border">
                <Label className="text-sm font-semibold mb-3 block">Step 2: Auction Configuration</Label>

                <div className="space-y-4">
                  <div>
                    <Label>Auction Title *</Label>
                    <Input value={form.auction_title} onChange={(e) => setForm({ ...form, auction_title: e.target.value })} placeholder="e.g. FANUC M-20iA — Excellent Condition" className="bg-muted border-border" />
                  </div>

                  <div>
                    <Label>Description</Label>
                    <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe condition, reason for selling..." className="bg-muted border-border" rows={3} />
                  </div>

                  <div>
                    <Label>Auction Type</Label>
                    <Select value={form.auction_type} onValueChange={(v) => setForm({ ...form, auction_type: v as any })}>
                      <SelectTrigger className="bg-muted border-border"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open Auction (visible bids)</SelectItem>
                        <SelectItem value="sealed">Sealed Auction (hidden bids)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Start Date & Time *</Label>
                      <Input type="datetime-local" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} className="bg-muted border-border" />
                    </div>
                    <div>
                      <Label>End Date & Time *</Label>
                      <Input type="datetime-local" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} className="bg-muted border-border" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Starting Price (₹) *</Label>
                      <Input type="number" value={form.starting_price} onChange={(e) => setForm({ ...form, starting_price: e.target.value })} placeholder="50000" className="bg-muted border-border" />
                    </div>
                    <div>
                      <Label>Min Increment (₹)</Label>
                      <Input type="number" value={form.min_increment} onChange={(e) => setForm({ ...form, min_increment: e.target.value })} className="bg-muted border-border" />
                    </div>
                  </div>

                  <div>
                    <Label>Auto-Extend (minutes, if last-minute bid)</Label>
                    <Input type="number" value={form.auto_extend_minutes} onChange={(e) => setForm({ ...form, auto_extend_minutes: e.target.value })} className="bg-muted border-border" />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                    <Label className="cursor-pointer">Set Reserve Price</Label>
                    <Switch checked={form.has_reserve} onCheckedChange={(v) => setForm({ ...form, has_reserve: v })} />
                  </div>
                  {form.has_reserve && (
                    <div>
                      <Label>Reserve Price (₹)</Label>
                      <Input type="number" value={form.reserve_price} onChange={(e) => setForm({ ...form, reserve_price: e.target.value })} placeholder="Minimum price to sell" className="bg-muted border-border" />
                    </div>
                  )}

                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                    <Label className="cursor-pointer">Enable Buy Now Price</Label>
                    <Switch checked={form.has_buy_now} onCheckedChange={(v) => setForm({ ...form, has_buy_now: v })} />
                  </div>
                  {form.has_buy_now && (
                    <div>
                      <Label>Buy Now Price (₹)</Label>
                      <Input type="number" value={form.buy_now_price} onChange={(e) => setForm({ ...form, buy_now_price: e.target.value })} placeholder="Instant purchase price" className="bg-muted border-border" />
                    </div>
                  )}

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Gavel className="w-4 h-4 mr-2" />}
                    Create Auction
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateAuction;
