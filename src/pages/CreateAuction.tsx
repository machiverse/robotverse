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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Gavel, Loader2 } from 'lucide-react';
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

  // Fetch seller's robots
  const { data: myRobots } = useQuery({
    queryKey: ['my-robots-for-auction', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from('robots').select('id, name, model, images').eq('seller_id', user.id);
      return data || [];
    },
    enabled: !!user,
  });

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
      const selectedRobot = myRobots?.find((r: any) => r.id === form.robot_id);
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

  return (
    <div className="min-h-screen bg-background">
      <EnhancedHeader />
      <div className="container mx-auto px-4 py-6 max-w-2xl">
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
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label>Auction Title *</Label>
                <Input value={form.auction_title} onChange={(e) => setForm({ ...form, auction_title: e.target.value })} placeholder="e.g. FANUC M-20iA — Excellent Condition" className="bg-muted border-border" />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the robot, condition, reason for selling..." className="bg-muted border-border" rows={3} />
              </div>

              <div>
                <Label>Link to Robot Listing (optional)</Label>
                <Select value={form.robot_id} onValueChange={(v) => setForm({ ...form, robot_id: v })}>
                  <SelectTrigger className="bg-muted border-border"><SelectValue placeholder="Select a robot..." /></SelectTrigger>
                  <SelectContent>
                    {myRobots?.map((r: any) => (
                      <SelectItem key={r.id} value={r.id}>{r.name} — {r.model}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateAuction;
