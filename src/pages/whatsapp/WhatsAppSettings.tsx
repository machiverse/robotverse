import { useEffect, useState } from "react";
import { Copy, Loader2, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WEBHOOK_URL, buildWidgetSnippet, type WaSettings } from "./waTypes";

const MODELS = [
  { id: "google/gemini-3.6-flash", label: "Gemini 3.6 Flash (recommended)" },
  { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro (deeper reasoning)" },
  { id: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite (cheapest)" },
];

const WhatsAppSettings = () => {
  const [settings, setSettings] = useState<WaSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("whatsapp_settings").select("*").maybeSingle();
      if (error) toast.error(error.message);
      setSettings((data ?? null) as WaSettings | null);
      setLoading(false);
    })();
  }, []);

  const patch = (changes: Partial<WaSettings>) => setSettings((s) => (s ? { ...s, ...changes } : s));

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    const { id, ...rest } = settings;
    const { error } = await supabase.from("whatsapp_settings").update(rest).eq("id", true);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Settings saved");
  };

  const copy = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  };

  if (loading) return <div className="h-72 animate-pulse rounded-xl bg-muted" />;
  if (!settings) return <p className="rounded-xl border bg-card p-8 text-sm text-muted-foreground">Settings row not found.</p>;

  return (
    <div className="space-y-4">
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-[#128C7E]" /> Meta WhatsApp connection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="wa-phone">WhatsApp number</Label>
              <Input id="wa-phone" value={settings.phone_number} onChange={(e) => patch({ phone_number: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wa-phone-id">Phone number ID</Label>
              <Input id="wa-phone-id" value={settings.phone_number_id} onChange={(e) => patch({ phone_number_id: e.target.value })} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Webhook callback URL</Label>
            <div className="flex flex-wrap gap-2">
              <Input readOnly value={WEBHOOK_URL} className="min-w-[240px] flex-1 font-mono text-xs" />
              <Button variant="outline" className="w-auto min-w-fit whitespace-normal" onClick={() => copy(WEBHOOK_URL, "Webhook URL")}>
                <Copy className="mr-2 h-4 w-4" /> Copy
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Paste this into Meta App Dashboard → WhatsApp → Configuration, subscribe to the <strong>messages</strong> field, and use your
              verify token. The access token is stored as a project secret, never in the database.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">AI behaviour</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2 md:col-span-1">
              <Label>Model</Label>
              <Select value={settings.model} onValueChange={(v) => patch({ model: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODELS.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="wa-temp">Temperature</Label>
              <Input
                id="wa-temp"
                type="number"
                min={0}
                max={1}
                step={0.1}
                value={settings.temperature}
                onChange={(e) => patch({ temperature: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wa-tokens">Max tokens</Label>
              <Input
                id="wa-tokens"
                type="number"
                min={128}
                max={4096}
                step={64}
                value={settings.max_tokens}
                onChange={(e) => patch({ max_tokens: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="wa-welcome">Welcome message</Label>
            <Textarea id="wa-welcome" rows={5} value={settings.welcome_message} onChange={(e) => patch({ welcome_message: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wa-fallback">Fallback message</Label>
            <Textarea id="wa-fallback" rows={3} value={settings.fallback_message} onChange={(e) => patch({ fallback_message: e.target.value })} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="wa-handoff">Human handoff trigger words</Label>
              <Input id="wa-handoff" value={settings.handoff_trigger} onChange={(e) => patch({ handoff_trigger: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wa-rate">Rate limit (messages / minute / user)</Label>
              <Input
                id="wa-rate"
                type="number"
                min={1}
                max={60}
                value={settings.rate_limit}
                onChange={(e) => patch({ rate_limit: Number(e.target.value) })}
              />
            </div>
          </div>
          <label className="flex items-center gap-3 text-sm">
            <Switch checked={settings.auto_reply} onCheckedChange={(v) => patch({ auto_reply: v })} />
            Auto-reply enabled {settings.auto_reply ? <Badge className="bg-success/10 text-success">on</Badge> : <Badge variant="secondary">off</Badge>}
          </label>

          <Button onClick={save} disabled={saving} className="w-auto min-w-fit whitespace-normal bg-[#25D366] hover:bg-[#128C7E]">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save settings
          </Button>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Website widget embed code</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            The widget is already live inside this app. Use this snippet for any external site or landing page.
          </p>
          <Textarea readOnly rows={8} value={buildWidgetSnippet(settings.phone_number.replace(/\D/g, ""))} className="font-mono text-xs" />
          <Button
            variant="outline"
            className="w-auto min-w-fit whitespace-normal"
            onClick={() => copy(buildWidgetSnippet(settings.phone_number.replace(/\D/g, "")), "Embed code")}
          >
            <Copy className="mr-2 h-4 w-4" /> Copy embed code
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default WhatsAppSettings;
