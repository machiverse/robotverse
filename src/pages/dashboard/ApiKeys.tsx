import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Copy, Key, Trash2, ExternalLink, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import EnhancedHeader from '@/components/EnhancedHeader';

const SCOPES = [
  { id: 'read', label: 'Read', desc: 'Fetch robots, parts, services, categories, search' },
  { id: 'write', label: 'Write', desc: 'Create/update your own listings, submit leads and quotes' },
  { id: 'unlock', label: 'Unlock', desc: 'Reveal seller contacts (spends credits)' },
  { id: 'webhooks', label: 'Webhooks', desc: 'Manage webhook subscriptions' },
];

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  is_partner: boolean;
  partner_name: string | null;
  rate_limit_per_hour: number;
  revoked_at: string | null;
  last_used_at: string | null;
  request_count: number;
  created_at: string;
}

export default function ApiKeys() {
  const { user } = useAuth();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newlyCreated, setNewlyCreated] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', scopes: ['read'] as string[] });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase.from('api_keys').select('*').order('created_at', { ascending: false });
    if (error) toast.error(error.message);
    setKeys((data as ApiKey[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  const create = async () => {
    if (!form.name.trim()) return toast.error('Name required');
    setSaving(true);
    const { data, error } = await supabase.functions.invoke('api-keys-manage', {
      body: { action: 'create', name: form.name, scopes: form.scopes },
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    if (data?.error) return toast.error(data.error);
    setNewlyCreated(data.data.api_key);
    setDialogOpen(false);
    setForm({ name: '', scopes: ['read'] });
    load();
  };

  const revoke = async (id: string) => {
    if (!confirm('Revoke this API key? Integrations using it will stop working immediately.')) return;
    const { data, error } = await supabase.functions.invoke('api-keys-manage', { body: { action: 'revoke', id } });
    if (error || data?.error) return toast.error(error?.message || data?.error);
    toast.success('Key revoked');
    load();
  };

  const copy = (val: string) => {
    navigator.clipboard.writeText(val);
    toast.success('Copied');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <EnhancedHeader />
        <div className="container py-16 text-center">Sign in to manage API keys.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <EnhancedHeader />
      <div className="container mx-auto max-w-5xl px-4 py-8 space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2"><Key className="w-7 h-7" /> API Keys</h1>
            <p className="text-muted-foreground mt-1">
              Programmatic access to RobotVerse. Use these keys to integrate with ERP, CRM, marketplaces, mobile apps, and AI tools.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline"><Link to="/api-docs"><ExternalLink className="w-4 h-4 mr-2" /> API Docs</Link></Button>
            <Button onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4 mr-2" /> Create Key</Button>
          </div>
        </div>

        {loading ? (
          <div className="text-muted-foreground">Loading…</div>
        ) : keys.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">No keys yet. Create one to start using the API.</CardContent></Card>
        ) : (
          <div className="grid gap-3">
            {keys.map((k) => (
              <Card key={k.id} className={k.revoked_at ? 'opacity-60' : ''}>
                <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{k.name}</span>
                      {k.is_partner && <Badge variant="secondary">Partner</Badge>}
                      {k.revoked_at && <Badge variant="destructive">Revoked</Badge>}
                      {k.scopes.map(s => <Badge key={s} variant="outline">{s}</Badge>)}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1 font-mono truncate">{k.key_prefix}••••••••••••</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {k.rate_limit_per_hour}/hr · {k.request_count} requests · last used {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : 'never'}
                    </div>
                  </div>
                  {!k.revoked_at && (
                    <Button variant="ghost" size="sm" onClick={() => revoke(k.id)}><Trash2 className="w-4 h-4 mr-2" /> Revoke</Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>Choose the scopes this key needs. You can revoke it any time.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. My CRM integration" />
            </div>
            <div>
              <Label>Scopes</Label>
              <div className="space-y-2 mt-2">
                {SCOPES.map(s => (
                  <label key={s.id} className="flex items-start gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer">
                    <Checkbox
                      checked={form.scopes.includes(s.id)}
                      onCheckedChange={(v) => setForm(f => ({ ...f, scopes: v ? [...f.scopes, s.id] : f.scopes.filter(x => x !== s.id) }))}
                    />
                    <div>
                      <div className="font-medium">{s.label}</div>
                      <div className="text-xs text-muted-foreground">{s.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={create} disabled={saving}>{saving ? 'Creating…' : 'Create Key'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Show key once */}
      <Dialog open={!!newlyCreated} onOpenChange={(o) => !o && setNewlyCreated(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Your new API key</DialogTitle>
            <DialogDescription>Copy this key now — it will not be shown again.</DialogDescription>
          </DialogHeader>
          <div className="p-3 bg-muted rounded font-mono text-sm break-all">{newlyCreated}</div>
          <DialogFooter>
            <Button onClick={() => newlyCreated && copy(newlyCreated)}><Copy className="w-4 h-4 mr-2" /> Copy</Button>
            <Button variant="outline" onClick={() => setNewlyCreated(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
