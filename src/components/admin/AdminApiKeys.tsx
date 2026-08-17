import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Check, X, Key } from 'lucide-react';

interface Row {
  id: string;
  name: string;
  scopes: string[];
  is_partner: boolean;
  partner_name: string | null;
  rate_limit_per_hour: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  approved_at: string | null;
  rejection_reason: string | null;
  user_id: string;
  key_prefix: string | null;
  revoked_at: string | null;
  requester?: { full_name: string | null; email: string | null; company_name: string | null } | null;
}

export default function AdminApiKeys() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('api_keys')
      .select('id, name, scopes, is_partner, partner_name, rate_limit_per_hour, status, created_at, approved_at, rejection_reason, user_id, key_prefix, revoked_at')
      .order('created_at', { ascending: false });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    const list = (data as Row[]) || [];
    const userIds = Array.from(new Set(list.map(r => r.user_id).filter(Boolean)));
    if (userIds.length) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, company_name')
        .in('user_id', userIds);
      const map = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      list.forEach(r => { r.requester = map.get(r.user_id) || null; });
    }
    setRows(list);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const approve = async (id: string) => {
    setBusy(id);
    const { data, error } = await supabase.functions.invoke('api-keys-manage', { body: { action: 'approve', id } });
    setBusy(null);
    if (error || data?.error) return toast.error(error?.message || data?.error);
    toast.success('API key approved and generated');
    load();
  };

  const reject = async (id: string) => {
    setBusy(id);
    const { data, error } = await supabase.functions.invoke('api-keys-manage', { body: { action: 'reject', id, reason } });
    setBusy(null);
    if (error || data?.error) return toast.error(error?.message || data?.error);
    toast.success('Request rejected');
    setRejecting(null);
    setReason('');
    load();
  };

  const pending = rows.filter(r => r.status === 'pending');
  const decided = rows.filter(r => r.status !== 'pending');

  const renderRow = (r: Row) => (
    <Card key={r.id}>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold">{r.name}</span>
              {r.status === 'pending' && <Badge variant="outline" className="border-amber-500 text-amber-600">Pending</Badge>}
              {r.status === 'approved' && <Badge className="bg-success hover:bg-success">Approved</Badge>}
              {r.status === 'rejected' && <Badge variant="destructive">Rejected</Badge>}
              {r.is_partner && <Badge variant="secondary">Partner{r.partner_name ? ` · ${r.partner_name}` : ''}</Badge>}
              {r.revoked_at && <Badge variant="destructive">Revoked</Badge>}
              {r.scopes.map(s => <Badge key={s} variant="outline">{s}</Badge>)}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {r.requester?.full_name || 'Unknown user'} · {r.requester?.email || '—'}{r.requester?.company_name ? ` · ${r.requester.company_name}` : ''}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Requested {new Date(r.created_at).toLocaleString()} · {r.rate_limit_per_hour}/hr
              {r.key_prefix && <> · <span className="font-mono">{r.key_prefix}••••</span></>}
              {r.rejection_reason && <> · Reason: {r.rejection_reason}</>}
            </div>
          </div>
          {r.status === 'pending' && (
            <div className="flex gap-2">
              <Button size="sm" onClick={() => approve(r.id)} disabled={busy === r.id}>
                <Check className="w-4 h-4 mr-1" /> Approve
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setRejecting(r.id); setReason(''); }} disabled={busy === r.id}>
                <X className="w-4 h-4 mr-1" /> Reject
              </Button>
            </div>
          )}
        </div>
        {rejecting === r.id && (
          <div className="flex gap-2 pt-2">
            <Input placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
            <Button size="sm" variant="destructive" onClick={() => reject(r.id)} disabled={busy === r.id}>Confirm</Button>
            <Button size="sm" variant="ghost" onClick={() => setRejecting(null)}>Cancel</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Key className="w-5 h-5" /> API Key Requests</CardTitle>
        <CardDescription>Users cannot use an API key until you approve their request. Approving generates the key and makes it available for a one-time reveal in their dashboard.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-muted-foreground">Loading…</div>
        ) : (
          <Tabs defaultValue="pending">
            <TabsList>
              <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
              <TabsTrigger value="all">All ({rows.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="pending" className="space-y-3 mt-4">
              {pending.length === 0 ? <div className="text-muted-foreground text-sm">No pending requests.</div> : pending.map(renderRow)}
            </TabsContent>
            <TabsContent value="all" className="space-y-3 mt-4">
              {[...pending, ...decided].map(renderRow)}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
