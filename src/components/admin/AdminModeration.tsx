import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { ShieldAlert, Search, RefreshCw, BadgeCheck, Building2, Receipt, Handshake, Gavel, Undo2, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// ---------- types ----------
interface BlockReason {
  code: string; label: string; category: string; severity: "warning" | "suspension" | "permanent";
  requires_evidence: boolean; description: string | null; sort_order: number;
}
interface ModerationRecord {
  id: string; user_id: string; user_role: string | null;
  action: "warning" | "suspension" | "permanent_block" | "reinstated";
  reason_code: string | null; reason_notes: string; evidence_urls: string[] | null;
  related_listing_ids: string[] | null; suspension_until: string | null; is_active: boolean;
  appeal_status: "none" | "submitted" | "under_review" | "upheld" | "overturned";
  appeal_submitted_at: string | null; appeal_text: string | null; appeal_decided_at: string | null;
  appeal_decision_notes: string | null; actioned_by: string; actioned_at: string;
  reversed_by: string | null; reversed_at: string | null; reversal_reason: string | null; email_sent_at: string | null;
}
interface ProfileRow {
  user_id: string; full_name: string | null; email: string | null; company_name: string | null;
  user_type: string | null; account_type: string | null; primary_user_type: string | null; user_roles: string[] | null;
  avatar_url: string | null; created_at: string; city: string | null; completed_sales: number | null;
}
interface TrustRow {
  user_id: string; kyc_verified: boolean; gst_verified: boolean; company_verified: boolean;
  completed_transactions: number; trust_tier: string; listings_verified: number; disputes_raised: number; disputes_upheld: number;
}
type ActionType = "warning" | "suspension" | "permanent_block";

const caseRef = (id: string) => `RV-${id.slice(0, 8).toUpperCase()}`;
const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—");
const isRestricting = (r: ModerationRecord) =>
  r.is_active && (r.action === "permanent_block" || (r.action === "suspension" && (!r.suspension_until || new Date(r.suspension_until) > new Date())));

const rolesOf = (p: ProfileRow) =>
  [...new Set([p.user_type, p.account_type, p.primary_user_type, ...(p.user_roles || [])].filter(Boolean))] as string[];

const CATEGORY_LABEL: Record<string, string> = { fraud: "Fraud", conduct: "Conduct", quality: "Quality", compliance: "Compliance", inactive: "Inactive" };
const ROLE_FILTERS = [
  { value: "all", label: "All roles" }, { value: "buyer", label: "Buyer" }, { value: "seller", label: "Seller" },
  { value: "service_provider", label: "Service provider" }, { value: "logistics", label: "Logistics" }, { value: "finance", label: "Financier" },
];
const roleMatches = (p: ProfileRow, f: string) => {
  if (f === "all") return true;
  const r = rolesOf(p).join(" ").toLowerCase();
  if (f === "seller") return /seller/.test(r);
  return r.includes(f);
};

const StatusBadge: React.FC<{ rec?: ModerationRecord | null }> = ({ rec }) => {
  if (!rec) return <Badge variant="outline" className="font-normal">Good standing</Badge>;
  if (rec.action === "permanent_block") return <Badge variant="destructive">Permanently blocked</Badge>;
  if (rec.action === "suspension") return <Badge variant="secondary">Suspended until {fmt(rec.suspension_until)}</Badge>;
  if (rec.action === "warning") return <Badge variant="secondary">Warning on file</Badge>;
  return <Badge variant="outline">Reinstated</Badge>;
};

// ============================================================
const AdminModeration: React.FC = () => {
  const { toast } = useToast();
  const { user: adminUser } = useAuth();

  const [reasons, setReasons] = useState<BlockReason[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [activeByUser, setActiveByUser] = useState<Record<string, ModerationRecord>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selected, setSelected] = useState<ProfileRow | null>(null);

  const load = async () => {
    setLoading(true);
    const [r, p, m] = await Promise.all([
      (supabase as any).from("block_reasons").select("*").order("sort_order"),
      (supabase as any).from("profiles")
        .select("user_id, full_name, email, company_name, user_type, account_type, primary_user_type, user_roles, avatar_url, created_at, city, completed_sales")
        .order("created_at", { ascending: false }).limit(1000),
      (supabase as any).from("user_moderation").select("*").eq("is_active", true).order("actioned_at", { ascending: false }),
    ]);
    if (r.error || p.error || m.error) {
      toast({ title: "Failed to load moderation data", description: r.error?.message || p.error?.message || m.error?.message, variant: "destructive" });
    }
    setReasons(r.data ?? []);
    setProfiles(p.data ?? []);
    const map: Record<string, ModerationRecord> = {};
    for (const rec of (m.data ?? []) as ModerationRecord[]) {
      // keep the most severe active record per user
      const cur = map[rec.user_id];
      if (!cur || (isRestricting(rec) && !isRestricting(cur))) map[rec.user_id] = rec;
    }
    setActiveByUser(map);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return profiles.filter((p) => roleMatches(p, roleFilter) && (!q ||
      p.full_name?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q) ||
      p.company_name?.toLowerCase().includes(q) || p.user_id.toLowerCase().includes(q)));
  }, [profiles, search, roleFilter]);

  const restrictedCount = Object.values(activeByUser).filter(isRestricting).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2"><ShieldAlert className="h-6 w-6 text-primary" /> User Moderation &amp; Trust</h1>
          <p className="text-sm text-muted-foreground">Admin-only enforcement records. Nothing here is visible on the public site.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="appeals">Appeals</TabsTrigger>
          <TabsTrigger value="log">Action log</TabsTrigger>
        </TabsList>

        {/* ---------------- USERS ---------------- */}
        <TabsContent value="users" className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Users</p><p className="text-2xl font-semibold tabular-nums">{profiles.length}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Currently restricted</p><p className="text-2xl font-semibold tabular-nums">{restrictedCount}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Warnings on file</p><p className="text-2xl font-semibold tabular-nums">{Object.values(activeByUser).filter((r) => r.action === "warning").length}</p></CardContent></Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-8" placeholder="Search name, email, company or user id" value={search} onChange={(e) => setSearch(e.target.value)} />
                  </div>
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
                    <SelectContent>{ROLE_FILTERS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="p-0 max-h-[70vh] overflow-auto">
                {loading ? (
                  <div className="p-4 space-y-2">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                ) : (
                  <ul className="divide-y">
                    {filtered.slice(0, 300).map((p) => (
                      <li key={p.user_id}>
                        <button
                          onClick={() => setSelected(p)}
                          className={cn("w-full text-left px-4 py-3 hover:bg-muted/60 flex items-center gap-3 transition-colors", selected?.user_id === p.user_id && "bg-muted")}
                        >
                          <Avatar className="h-8 w-8"><AvatarImage src={p.avatar_url ?? undefined} /><AvatarFallback className="text-xs">{(p.full_name || p.email || "?").slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{p.full_name || p.company_name || "Unnamed"}</p>
                            <p className="text-xs text-muted-foreground truncate">{p.email} · {rolesOf(p).slice(0, 2).join(", ") || "no role"}</p>
                          </div>
                          <StatusBadge rec={activeByUser[p.user_id]} />
                        </button>
                      </li>
                    ))}
                    {filtered.length === 0 && <li className="p-6 text-sm text-muted-foreground text-center">No users match.</li>}
                  </ul>
                )}
              </CardContent>
            </Card>

            {selected ? (
              <UserDetailPanel key={selected.user_id} profile={selected} reasons={reasons} active={activeByUser[selected.user_id]} adminId={adminUser?.id ?? ""} onChanged={load} />
            ) : (
              <Card className="flex items-center justify-center min-h-[300px]"><p className="text-sm text-muted-foreground">Select a user to view their profile, trust signals and moderation history.</p></Card>
            )}
          </div>
        </TabsContent>

        {/* ---------------- APPEALS ---------------- */}
        <TabsContent value="appeals">
          <AppealsTab reasons={reasons} profiles={profiles} adminId={adminUser?.id ?? ""} onChanged={load} />
        </TabsContent>

        {/* ---------------- LOG ---------------- */}
        <TabsContent value="log">
          <ActionLog reasons={reasons} profiles={profiles} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// ============================================================
// Detail panel
// ============================================================
const UserDetailPanel: React.FC<{
  profile: ProfileRow; reasons: BlockReason[]; active?: ModerationRecord; adminId: string; onChanged: () => void;
}> = ({ profile, reasons, active, adminId, onChanged }) => {
  const { toast } = useToast();
  const [trust, setTrust] = useState<TrustRow | null>(null);
  const [counts, setCounts] = useState({ robots: 0, parts: 0, services: 0 });
  const [deals, setDeals] = useState<any[]>([]);
  const [history, setHistory] = useState<ModerationRecord[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [reverseOpen, setReverseOpen] = useState(false);

  const uid = profile.user_id;
  const loadDetail = async () => {
    const [t, r, sp, sv, d, h, tk] = await Promise.all([
      (supabase as any).from("user_trust").select("*").eq("user_id", uid).maybeSingle(),
      (supabase as any).from("robots").select("id", { count: "exact", head: true }).eq("seller_id", uid),
      (supabase as any).from("spare_parts").select("id", { count: "exact", head: true }).eq("seller_id", uid),
      (supabase as any).from("services").select("id", { count: "exact", head: true }).eq("provider_id", uid),
      (supabase as any).from("deals").select("id, status, created_at, seller_id, buyer_id, deal_value, final_amount, amount").or(`seller_id.eq.${uid},buyer_id.eq.${uid}`).order("created_at", { ascending: false }).limit(10),
      (supabase as any).from("user_moderation").select("*").eq("user_id", uid).order("actioned_at", { ascending: false }),
      (supabase as any).from("support_tickets").select("id, ticket_id, subject, status, created_at").eq("user_id", uid).neq("status", "closed").neq("status", "resolved").order("created_at", { ascending: false }).limit(10),
    ]);
    setTrust(t.data ?? null);
    setCounts({ robots: r.count ?? 0, parts: sp.count ?? 0, services: sv.count ?? 0 });
    setDeals(d.data ?? []);
    setHistory(h.data ?? []);
    setTickets(tk.data ?? []);
  };
  useEffect(() => { loadDetail(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [uid]);

  const setTrustFlag = async (patch: Partial<TrustRow>) => {
    setBusy(true);
    const row = { user_id: uid, ...(trust ?? {}), ...patch, member_since: new Date(profile.created_at).toISOString().slice(0, 10) };
    delete (row as any).updated_at;
    const { error } = await (supabase as any).from("user_trust").upsert(row, { onConflict: "user_id" });
    setBusy(false);
    if (error) return toast({ title: "Trust update failed", description: error.message, variant: "destructive" });
    loadDetail();
  };

  const restricted = active ? isRestricting(active) : false;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-12 w-12"><AvatarImage src={profile.avatar_url ?? undefined} /><AvatarFallback>{(profile.full_name || profile.email || "?").slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
            <div className="min-w-0">
              <CardTitle className="text-lg truncate">{profile.full_name || "Unnamed"}</CardTitle>
              <CardDescription className="truncate">{profile.company_name ? `${profile.company_name} · ` : ""}{profile.email}</CardDescription>
              <div className="flex flex-wrap gap-1 mt-1">{rolesOf(profile).map((r) => <Badge key={r} variant="outline" className="text-[10px] font-normal">{r}</Badge>)}</div>
            </div>
          </div>
          <StatusBadge rec={active} />
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
          <Stat label="Robots" value={counts.robots} /><Stat label="Parts" value={counts.parts} /><Stat label="Services" value={counts.services} /><Stat label="Member since" value={fmt(profile.created_at)} />
        </div>

        {/* Trust signals (public-facing, positive only) */}
        <section>
          <h3 className="text-sm font-semibold mb-2">Trust signals <span className="text-xs font-normal text-muted-foreground">(shown publicly — positive only)</span></h3>
          <div className="grid sm:grid-cols-2 gap-2">
            <TrustToggle icon={<Building2 className="h-4 w-4" />} label="Verified Company" checked={!!trust?.company_verified} disabled={busy} onChange={(v) => setTrustFlag({ company_verified: v })} />
            <TrustToggle icon={<Receipt className="h-4 w-4" />} label="GST Verified" checked={!!trust?.gst_verified} disabled={busy} onChange={(v) => setTrustFlag({ gst_verified: v })} />
            <TrustToggle icon={<BadgeCheck className="h-4 w-4" />} label="KYC Verified" checked={!!trust?.kyc_verified} disabled={busy} onChange={(v) => setTrustFlag({ kyc_verified: v })} />
            <div className="flex items-center justify-between rounded-md border p-2.5">
              <span className="flex items-center gap-2 text-sm"><Handshake className="h-4 w-4" />Completed transactions</span>
              <Input type="number" min={0} className="w-20 h-8" value={trust?.completed_transactions ?? 0} disabled={busy}
                onChange={(e) => setTrustFlag({ completed_transactions: Math.max(0, parseInt(e.target.value || "0", 10)) })} />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Trust tier</span>
            <Select value={trust?.trust_tier ?? "unverified"} onValueChange={(v) => setTrustFlag({ trust_tier: v })} disabled={busy}>
              <SelectTrigger className="w-40 h-8"><SelectValue /></SelectTrigger>
              <SelectContent>{["unverified", "basic", "verified", "premium"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </section>

        {/* Transactions */}
        <section>
          <h3 className="text-sm font-semibold mb-2">Recent transactions</h3>
          {deals.length === 0 ? <p className="text-xs text-muted-foreground">No deals recorded.</p> : (
            <ul className="text-xs divide-y rounded-md border">
              {deals.map((d) => (
                <li key={d.id} className="flex justify-between px-3 py-1.5"><span>{d.seller_id === uid ? "Sold" : "Bought"} · {fmt(d.created_at)}</span><Badge variant="outline" className="font-normal">{d.status}</Badge></li>
              ))}
            </ul>
          )}
        </section>

        {/* Open disputes */}
        <section>
          <h3 className="text-sm font-semibold mb-2">Open support tickets / disputes</h3>
          {tickets.length === 0 ? <p className="text-xs text-muted-foreground">None open.</p> : (
            <ul className="text-xs divide-y rounded-md border">
              {tickets.map((t) => <li key={t.id} className="flex justify-between px-3 py-1.5"><span className="truncate">{t.ticket_id ? `${t.ticket_id} · ` : ""}{t.subject}</span><Badge variant="outline" className="font-normal">{t.status}</Badge></li>)}
            </ul>
          )}
        </section>

        {/* Moderation history */}
        <section>
          <h3 className="text-sm font-semibold mb-2">Moderation history</h3>
          {history.length === 0 ? <p className="text-xs text-muted-foreground">No actions on record.</p> : (
            <ul className="space-y-2">
              {history.map((h) => (
                <li key={h.id} className={cn("rounded-md border p-2.5 text-xs space-y-1", !h.is_active && "opacity-70")}>
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <span className="font-medium">{h.action.replace("_", " ")} · {reasons.find((r) => r.code === h.reason_code)?.label ?? "—"}</span>
                    <span className="tabular-nums text-muted-foreground">{caseRef(h.id)} · {fmt(h.actioned_at)}</span>
                  </div>
                  <p className="text-muted-foreground whitespace-pre-wrap">{h.reason_notes}</p>
                  {h.evidence_urls?.length ? <p>Evidence: {h.evidence_urls.map((u, i) => <a key={i} href={u} target="_blank" rel="noopener noreferrer" className="underline mr-2">[{i + 1}]</a>)}</p> : null}
                  <div className="flex flex-wrap gap-1">
                    {!h.is_active && <Badge variant="outline" className="font-normal">inactive{h.reversed_at ? ` · reversed ${fmt(h.reversed_at)}` : ""}</Badge>}
                    {h.appeal_status !== "none" && <Badge variant="outline" className="font-normal">appeal: {h.appeal_status}</Badge>}
                    <Badge variant="outline" className="font-normal flex items-center gap-1"><Mail className="h-3 w-3" />{h.email_sent_at ? `emailed ${fmt(h.email_sent_at)}` : "email not sent"}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="flex flex-wrap gap-2 pt-2 border-t">
          <Button variant="destructive" onClick={() => setBlockOpen(true)}><Gavel className="h-4 w-4 mr-2" />Take action</Button>
          {active && active.action !== "reinstated" && (
            <Button variant="outline" onClick={() => setReverseOpen(true)}><Undo2 className="h-4 w-4 mr-2" />{restricted ? "Reinstate" : "Withdraw warning"}</Button>
          )}
        </div>
      </CardContent>

      <ActionDialog open={blockOpen} onOpenChange={setBlockOpen} profile={profile} reasons={reasons} adminId={adminId}
        onDone={() => { setBlockOpen(false); loadDetail(); onChanged(); }} />
      {active && (
        <ReverseDialog open={reverseOpen} onOpenChange={setReverseOpen} record={active} adminId={adminId}
          onDone={() => { setReverseOpen(false); loadDetail(); onChanged(); }} />
      )}
    </Card>
  );
};

const Stat: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="rounded-md border p-2"><p className="text-[11px] text-muted-foreground">{label}</p><p className="font-semibold tabular-nums">{value}</p></div>
);
const TrustToggle: React.FC<{ icon: React.ReactNode; label: string; checked: boolean; disabled?: boolean; onChange: (v: boolean) => void }> = ({ icon, label, checked, disabled, onChange }) => (
  <div className="flex items-center justify-between rounded-md border p-2.5">
    <span className="flex items-center gap-2 text-sm">{icon}{label}</span>
    <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} />
  </div>
);

// ============================================================
// Take-action dialog — confirm stays disabled until all gates pass
// ============================================================
const ActionDialog: React.FC<{
  open: boolean; onOpenChange: (v: boolean) => void; profile: ProfileRow; reasons: BlockReason[]; adminId: string; onDone: () => void;
}> = ({ open, onOpenChange, profile, reasons, adminId, onDone }) => {
  const { toast } = useToast();
  const [reasonCode, setReasonCode] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [evidence, setEvidence] = useState("");
  const [listingIds, setListingIds] = useState("");
  const [ticketIds, setTicketIds] = useState("");
  const [action, setAction] = useState<ActionType | "">("");
  const [until, setUntil] = useState("");
  const [emailConfirm, setEmailConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) { setReasonCode(""); setNotes(""); setEvidence(""); setListingIds(""); setTicketIds(""); setAction(""); setUntil(""); setEmailConfirm(""); }
  }, [open]);

  const reason = reasons.find((r) => r.code === reasonCode);
  const grouped = useMemo(() => {
    const g: Record<string, BlockReason[]> = {};
    for (const r of reasons) (g[r.category] ||= []).push(r);
    return g;
  }, [reasons]);

  const parseList = (s: string) => s.split(/[\n,\s]+/).map((x) => x.trim()).filter(Boolean);
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const evidenceUrls = parseList(evidence).filter((u) => /^https?:\/\//i.test(u));
  const listingUuids = parseList(listingIds).filter((x) => UUID.test(x));
  const ticketUuids = parseList(ticketIds).filter((x) => UUID.test(x));

  // ----- gates -----
  const gate1 = !!reason;
  const gate2 = notes.trim().length >= 50;
  const gate3 = !reason?.requires_evidence || evidenceUrls.length > 0 || listingUuids.length > 0;
  const gate4 = action === "warning" || action === "permanent_block" || (action === "suspension" && !!until && new Date(until) > new Date());
  const gate5 = action !== "permanent_block" || (!!profile.email && emailConfirm.trim().toLowerCase() === profile.email.trim().toLowerCase());
  const canConfirm = gate1 && gate2 && gate3 && gate4 && gate5 && !submitting;

  const submit = async () => {
    if (!canConfirm || !action) return;
    setSubmitting(true);
    const { data: inserted, error } = await (supabase as any).from("user_moderation").insert({
      user_id: profile.user_id,
      user_role: rolesOf(profile)[0] ?? null,
      action,
      reason_code: reasonCode,
      reason_notes: notes.trim(),
      evidence_urls: evidenceUrls.length ? evidenceUrls : null,
      related_listing_ids: listingUuids.length ? listingUuids : null,
      related_ticket_ids: ticketUuids.length ? ticketUuids : null,
      suspension_until: action === "suspension" ? new Date(until).toISOString() : null,
      actioned_by: adminId,
    }).select("id").single();
    if (error || !inserted) {
      setSubmitting(false);
      return toast({ title: "Could not record action", description: error?.message, variant: "destructive" });
    }
    // Enforce (listings/enquiries) + notify via the admin-verified edge function
    const { data: fnRes, error: fnErr } = await supabase.functions.invoke("send-moderation-email", {
      body: { moderation_id: inserted.id, enforce: action !== "warning" },
    });
    setSubmitting(false);
    if (fnErr || fnRes?.error) {
      toast({ title: "Action recorded, but enforcement/email failed", description: fnErr?.message || fnRes?.error, variant: "destructive" });
    } else {
      toast({ title: `Action recorded — ${caseRef(inserted.id)}`, description: `Email: ${fnRes?.email ?? "unknown"}${fnRes?.disabled_listings ? ` · ${fnRes.disabled_listings} listing(s) paused` : ""}` });
    }
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Moderation action — {profile.full_name || profile.email}</DialogTitle>
          <DialogDescription>Every action is recorded permanently with your admin id and timestamp. The user is emailed a case reference and appeal route.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Field n={1} ok={gate1} label="Reason (from controlled list)">
            <Select value={reasonCode} onValueChange={setReasonCode}>
              <SelectTrigger><SelectValue placeholder="Select a reason" /></SelectTrigger>
              <SelectContent>
                {Object.entries(grouped).map(([cat, list]) => (
                  <SelectGroup key={cat}>
                    <SelectLabel>{CATEGORY_LABEL[cat] ?? cat}</SelectLabel>
                    {list.map((r) => (
                      <SelectItem key={r.code} value={r.code}>
                        <span className="flex items-center gap-2">{r.label}<Badge variant="outline" className="text-[10px] font-normal">{r.severity}</Badge></span>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
            {reason && <p className="text-xs text-muted-foreground mt-1">{reason.description}{reason.requires_evidence ? " · Evidence required." : ""}</p>}
          </Field>

          <Field n={2} ok={gate2} label={`Internal notes (min 50 chars — ${notes.trim().length}/50)`}>
            <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Describe the account activity and policy concerned. Internal — never shown to the user. Describe actions and facts, not the person's character." />
          </Field>

          <Field n={3} ok={gate3} label={`Evidence${reason?.requires_evidence ? " (required for this reason)" : " (optional)"}`}>
            <div className="grid sm:grid-cols-2 gap-2">
              <div><Label className="text-xs">Evidence URLs (one per line)</Label><Textarea rows={3} value={evidence} onChange={(e) => setEvidence(e.target.value)} placeholder="https://…" /></div>
              <div><Label className="text-xs">Related listing IDs (uuid, one per line)</Label><Textarea rows={3} value={listingIds} onChange={(e) => setListingIds(e.target.value)} /></div>
            </div>
            <div className="mt-2"><Label className="text-xs">Related ticket IDs (uuid, optional)</Label><Input value={ticketIds} onChange={(e) => setTicketIds(e.target.value)} /></div>
          </Field>

          <Field n={4} ok={gate4} label="Action">
            <div className="flex flex-wrap gap-2">
              {(["warning", "suspension", "permanent_block"] as ActionType[]).map((a) => (
                <Button key={a} type="button" size="sm" variant={action === a ? "default" : "outline"} onClick={() => setAction(a)}>
                  {a === "warning" ? "Warning" : a === "suspension" ? "Suspension" : "Permanent block"}
                </Button>
              ))}
            </div>
            {reason && action && action !== ({ warning: "warning", suspension: "suspension", permanent: "permanent_block" } as Record<string, string>)[reason.severity] && (
              <p className="text-xs text-muted-foreground mt-1">Note: the selected reason's default severity is "{reason.severity}".</p>
            )}
            {action === "suspension" && (
              <div className="mt-2"><Label className="text-xs">Suspended until</Label><Input type="datetime-local" value={until} onChange={(e) => setUntil(e.target.value)} className="w-full sm:w-64" /></div>
            )}
          </Field>

          {action === "permanent_block" && (
            <Field n={5} ok={gate5} label={`Type the user's email to confirm a permanent block (${profile.email ?? "no email on file"})`}>
              <Input value={emailConfirm} onChange={(e) => setEmailConfirm(e.target.value)} placeholder={profile.email ?? ""} autoComplete="off" />
            </Field>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button variant="destructive" onClick={submit} disabled={!canConfirm}>{submitting ? "Applying…" : "Confirm action"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Field: React.FC<{ n: number; ok: boolean; label: string; children: React.ReactNode }> = ({ n, ok, label, children }) => (
  <div>
    <Label className="flex items-center gap-2 mb-1.5">
      <span className={cn("inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold border", ok ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground")}>{n}</span>
      {label}
    </Label>
    {children}
  </div>
);

// ============================================================
// Reverse / reinstate dialog — never deletes; sets is_active=false
// ============================================================
async function reverseRecord(record: ModerationRecord, adminId: string, reason: string, opts?: { appealDecision?: boolean }) {
  const now = new Date().toISOString();
  const patch: Partial<ModerationRecord> = { is_active: false, reversed_by: adminId, reversed_at: now, reversal_reason: reason };
  if (opts?.appealDecision) Object.assign(patch, { appeal_status: "overturned", appeal_decided_at: now, appeal_decided_by: adminId, appeal_decision_notes: reason });
  const { error } = await (supabase as any).from("user_moderation").update(patch).eq("id", record.id);
  if (error) throw error;
  const wasRestricting = record.action === "suspension" || record.action === "permanent_block";
  if (!wasRestricting) return null;
  const { data: rein, error: insErr } = await (supabase as any).from("user_moderation").insert({
    user_id: record.user_id, user_role: record.user_role, action: "reinstated", reason_code: record.reason_code,
    reason_notes: `Reinstated. Original case ${caseRef(record.id)}. ${reason}`, actioned_by: adminId, is_active: false,
  }).select("id").single();
  if (insErr) throw insErr;
  await supabase.functions.invoke("send-moderation-email", { body: { moderation_id: rein.id, enforce: true } });
  return rein.id as string;
}

const ReverseDialog: React.FC<{ open: boolean; onOpenChange: (v: boolean) => void; record: ModerationRecord; adminId: string; onDone: () => void }> = ({ open, onOpenChange, record, adminId, onDone }) => {
  const { toast } = useToast();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (!open) setReason(""); }, [open]);
  const go = async () => {
    setBusy(true);
    try {
      await reverseRecord(record, adminId, reason.trim());
      toast({ title: "Record reversed", description: `${caseRef(record.id)} is now inactive.` });
      onDone();
    } catch (e: any) {
      toast({ title: "Reversal failed", description: e?.message, variant: "destructive" });
    } finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Reverse {caseRef(record.id)}</DialogTitle><DialogDescription>The record is kept for audit and marked inactive. Paused listings are restored and the user is notified.</DialogDescription></DialogHeader>
        <Label>Reversal reason (min 20 chars)</Label>
        <Textarea rows={4} value={reason} onChange={(e) => setReason(e.target.value)} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={go} disabled={busy || reason.trim().length < 20}>{busy ? "Working…" : "Confirm reversal"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ============================================================
// Appeals tab
// ============================================================
const AppealsTab: React.FC<{ reasons: BlockReason[]; profiles: ProfileRow[]; adminId: string; onChanged: () => void }> = ({ reasons, profiles, adminId, onChanged }) => {
  const { toast } = useToast();
  const [rows, setRows] = useState<ModerationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [decide, setDecide] = useState<{ rec: ModerationRecord; verdict: "upheld" | "overturned" } | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any).from("user_moderation").select("*").in("appeal_status", ["submitted", "under_review"]).order("appeal_submitted_at", { ascending: true });
    setRows(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const profileOf = (uid: string) => profiles.find((p) => p.user_id === uid);
  const markUnderReview = async (rec: ModerationRecord) => {
    await (supabase as any).from("user_moderation").update({ appeal_status: "under_review" }).eq("id", rec.id);
    load();
  };
  const submitDecision = async () => {
    if (!decide) return;
    setBusy(true);
    try {
      if (decide.verdict === "upheld") {
        const { error } = await (supabase as any).from("user_moderation").update({
          appeal_status: "upheld", appeal_decided_at: new Date().toISOString(), appeal_decided_by: adminId, appeal_decision_notes: notes.trim(),
        }).eq("id", decide.rec.id);
        if (error) throw error;
      } else {
        await reverseRecord(decide.rec, adminId, notes.trim(), { appealDecision: true });
      }
      toast({ title: `Appeal ${decide.verdict}`, description: caseRef(decide.rec.id) });
      setDecide(null); setNotes(""); load(); onChanged();
    } catch (e: any) {
      toast({ title: "Decision failed", description: e?.message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">Open appeals</CardTitle><CardDescription>Decisions should be made by an admin not involved in the original action. Decision notes are mandatory.</CardDescription></CardHeader>
      <CardContent className="space-y-3">
        {loading ? <Skeleton className="h-24 w-full" /> : rows.length === 0 ? <p className="text-sm text-muted-foreground">No open appeals.</p> : rows.map((r) => {
          const p = profileOf(r.user_id);
          return (
            <div key={r.id} className="rounded-md border p-3 space-y-2 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div><span className="font-medium">{p?.full_name || p?.email || r.user_id}</span> <span className="text-muted-foreground">· {caseRef(r.id)} · {r.action.replace("_", " ")} · {reasons.find((x) => x.code === r.reason_code)?.label}</span></div>
                <Badge variant="outline">{r.appeal_status.replace("_", " ")}</Badge>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div><p className="text-xs text-muted-foreground mb-1">User's appeal · {fmt(r.appeal_submitted_at)}</p><p className="whitespace-pre-wrap rounded bg-muted/50 p-2 text-xs">{r.appeal_text}</p></div>
                <div><p className="text-xs text-muted-foreground mb-1">Original internal notes · actioned {fmt(r.actioned_at)}{r.actioned_by === adminId ? " · by you" : ""}</p><p className="whitespace-pre-wrap rounded bg-muted/50 p-2 text-xs">{r.reason_notes}</p></div>
              </div>
              <div className="flex flex-wrap gap-2">
                {r.appeal_status === "submitted" && <Button size="sm" variant="outline" onClick={() => markUnderReview(r)}>Mark under review</Button>}
                <Button size="sm" variant="secondary" onClick={() => setDecide({ rec: r, verdict: "upheld" })}>Uphold decision</Button>
                <Button size="sm" onClick={() => setDecide({ rec: r, verdict: "overturned" })}>Overturn &amp; reinstate</Button>
              </div>
            </div>
          );
        })}
      </CardContent>

      <Dialog open={!!decide} onOpenChange={(v) => { if (!v) { setDecide(null); setNotes(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{decide?.verdict === "upheld" ? "Uphold original decision" : "Overturn and reinstate"}</DialogTitle>
            <DialogDescription>{decide?.verdict === "overturned" ? "The original record stays on file (inactive). Listings are restored and the user is notified." : "The restriction remains in place. The user can see the outcome on their status page."}</DialogDescription>
          </DialogHeader>
          <Label>Decision notes (mandatory, min 20 chars)</Label>
          <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDecide(null)} disabled={busy}>Cancel</Button>
            <Button onClick={submitDecision} disabled={busy || notes.trim().length < 20}>{busy ? "Saving…" : "Confirm"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

// ============================================================
// Action log
// ============================================================
const ActionLog: React.FC<{ reasons: BlockReason[]; profiles: ProfileRow[] }> = ({ reasons, profiles }) => {
  const [rows, setRows] = useState<ModerationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any).from("user_moderation").select("*").order("actioned_at", { ascending: false }).limit(200);
      setRows(data ?? []); setLoading(false);
    })();
  }, []);
  const name = (uid: string) => { const p = profiles.find((x) => x.user_id === uid); return p?.full_name || p?.email || uid.slice(0, 8); };
  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">Audit log</CardTitle><CardDescription>Last 200 actions. Records are never deleted.</CardDescription></CardHeader>
      <CardContent className="p-0 overflow-auto">
        {loading ? <div className="p-4"><Skeleton className="h-24 w-full" /></div> : (
          <Table>
            <TableHeader><TableRow><TableHead>Case</TableHead><TableHead>User</TableHead><TableHead>Action</TableHead><TableHead>Reason</TableHead><TableHead>By</TableHead><TableHead>Date</TableHead><TableHead>State</TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="tabular-nums text-xs">{caseRef(r.id)}</TableCell>
                  <TableCell className="text-xs">{name(r.user_id)}</TableCell>
                  <TableCell className="text-xs">{r.action.replace("_", " ")}</TableCell>
                  <TableCell className="text-xs">{reasons.find((x) => x.code === r.reason_code)?.label ?? "—"}</TableCell>
                  <TableCell className="text-xs">{name(r.actioned_by)}</TableCell>
                  <TableCell className="text-xs">{fmt(r.actioned_at)}</TableCell>
                  <TableCell className="text-xs">{r.is_active ? <Badge variant="secondary">active</Badge> : <Badge variant="outline">inactive</Badge>}{r.appeal_status !== "none" && <span className="ml-1 text-muted-foreground">appeal {r.appeal_status}</span>}</TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-6">No actions recorded yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminModeration;
