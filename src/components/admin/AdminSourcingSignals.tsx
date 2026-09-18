import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Radar, Download, RefreshCw, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface SourcingSignal {
  id: string;
  user_id: string | null;
  requested_oem: string | null;
  requested_model: string | null;
  required_payload_kg: number | null;
  required_reach_mm: number | null;
  application: string | null;
  budget_min: number | null;
  budget_max: number | null;
  buyer_location: string | null;
  timeline: string | null;
  matched_tier: number | null;
  result_count: number | null;
  source_channel: string | null;
  created_at: string;
}

const isoDaysAgo = (d: number) => {
  const t = new Date();
  t.setDate(t.getDate() - d);
  return t.toISOString().slice(0, 10);
};

const payloadBand = (kg: number | null): string => {
  if (kg == null) return "Unspecified";
  if (kg <= 10) return "0–10 kg";
  if (kg <= 25) return "11–25 kg";
  if (kg <= 60) return "26–60 kg";
  if (kg <= 120) return "61–120 kg";
  if (kg <= 210) return "121–210 kg";
  if (kg <= 400) return "211–400 kg";
  return "400+ kg";
};

const tierLabel: Record<number, string> = {
  0: "No match",
  1: "Own stock",
  2: "Dealer network",
  3: "External only",
};

const isUnfilled = (tier: number | null) => tier === 0 || tier === 3;

const toCsv = (rows: SourcingSignal[]) => {
  const cols: (keyof SourcingSignal)[] = [
    "created_at", "application", "required_payload_kg", "required_reach_mm", "requested_oem", "requested_model",
    "budget_max", "buyer_location", "matched_tier", "result_count", "source_channel", "user_id",
  ];
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
};

const AdminSourcingSignals: React.FC = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<SourcingSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(isoDaysAgo(90));
  const [to, setTo] = useState(isoDaysAgo(0));

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("sourcing_signals")
      .select("*")
      .gte("created_at", `${from}T00:00:00Z`)
      .lte("created_at", `${to}T23:59:59Z`)
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) {
      toast({ title: "Failed to load sourcing signals", description: error.message, variant: "destructive" });
      setRows([]);
    } else {
      setRows((data || []) as SourcingSignal[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  const groups = useMemo(() => {
    const map = new Map<string, { application: string; band: string; count: number; unfilled: number; tiers: Record<number, number> }>();
    for (const r of rows) {
      const app = r.application || "unspecified";
      const band = payloadBand(r.required_payload_kg == null ? null : Number(r.required_payload_kg));
      const key = `${app}||${band}`;
      const g = map.get(key) || { application: app, band, count: 0, unfilled: 0, tiers: {} };
      g.count += 1;
      if (isUnfilled(r.matched_tier)) g.unfilled += 1;
      const t = r.matched_tier ?? -1;
      g.tiers[t] = (g.tiers[t] || 0) + 1;
      map.set(key, g);
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [rows]);

  const stats = useMemo(() => {
    const total = rows.length;
    const unfilled = rows.filter((r) => isUnfilled(r.matched_tier)).length;
    const tier0 = rows.filter((r) => r.matched_tier === 0).length;
    const tier3 = rows.filter((r) => r.matched_tier === 3).length;
    return { total, unfilled, tier0, tier3 };
  }, [rows]);

  const exportCsv = () => {
    const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sourcing-signals_${from}_to_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Sourcing Signals</h2>
          <p className="text-muted-foreground">
            Every procurement request the AI assistant could not fully match is demand data. Tier 0 and Tier 3 rows are demand we could not fill from our own stock.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="block text-[11px] text-muted-foreground mb-1">From</label>
            <Input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="h-9 w-[150px]" />
          </div>
          <div>
            <label className="block text-[11px] text-muted-foreground mb-1">To</label>
            <Input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className="h-9 w-[150px]" />
          </div>
          <Button variant="outline" size="sm" onClick={load} className="h-9 whitespace-normal min-w-fit w-auto">
            <RefreshCw className={cn("w-4 h-4 mr-1", loading && "animate-spin")} /> Refresh
          </Button>
          <Button size="sm" onClick={exportCsv} disabled={rows.length === 0} className="h-9 whitespace-normal min-w-fit w-auto">
            <Download className="w-4 h-4 mr-1" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Signals", value: stats.total, icon: Radar },
          { label: "Unfilled (T0 + T3)", value: stats.unfilled, icon: AlertTriangle, warn: true },
          { label: "Tier 0 — no match", value: stats.tier0, warn: true },
          { label: "Tier 3 — external only", value: stats.tier3, warn: true },
        ].map((s) => (
          <Card key={s.label} className={cn(s.warn && s.value > 0 && "border-amber-500/40 bg-amber-500/5")}>
            <CardContent className="p-4">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{s.label}</div>
              <div className="text-2xl font-bold tabular text-foreground">{loading ? "—" : s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Demand by application and payload band</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-9 w-full" />)}</div>
          ) : groups.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sourcing signals in this date range.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Application</TableHead>
                  <TableHead>Payload band</TableHead>
                  <TableHead className="text-right">Requests</TableHead>
                  <TableHead className="text-right">Unfilled</TableHead>
                  <TableHead>Tier mix</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((g) => (
                  <TableRow key={`${g.application}-${g.band}`} className={cn(g.unfilled > 0 && "bg-amber-500/5")}>
                    <TableCell className="font-medium capitalize">{g.application.replace(/_/g, " ")}</TableCell>
                    <TableCell className="tabular">{g.band}</TableCell>
                    <TableCell className="text-right tabular">{g.count}</TableCell>
                    <TableCell className="text-right tabular">
                      {g.unfilled > 0 ? <span className="font-semibold text-amber-700 dark:text-amber-400">{g.unfilled}</span> : "0"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(g.tiers).sort().map(([t, n]) => (
                          <Badge key={t} variant={isUnfilled(Number(t)) ? "destructive" : "secondary"} className="h-5 text-[10px] px-1.5 rounded-full">
                            T{t}: {n}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Raw signals ({rows.length})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-9 w-full" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Application</TableHead>
                  <TableHead className="text-right">Payload kg</TableHead>
                  <TableHead className="text-right">Reach mm</TableHead>
                  <TableHead>OEM / Model</TableHead>
                  <TableHead className="text-right">Budget max</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead className="text-right">Results</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id} className={cn(isUnfilled(r.matched_tier) && "bg-amber-500/5")}>
                    <TableCell className="whitespace-nowrap tabular text-xs">{new Date(r.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</TableCell>
                    <TableCell className="capitalize">{(r.application || "—").replace(/_/g, " ")}</TableCell>
                    <TableCell className="text-right tabular">{r.required_payload_kg ?? "—"}</TableCell>
                    <TableCell className="text-right tabular">{r.required_reach_mm ?? "—"}</TableCell>
                    <TableCell>{[r.requested_oem, r.requested_model].filter(Boolean).join(" ") || "—"}</TableCell>
                    <TableCell className="text-right tabular">{r.budget_max != null ? `₹${Number(r.budget_max).toLocaleString("en-IN")}` : "—"}</TableCell>
                    <TableCell className="capitalize">{r.buyer_location || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={isUnfilled(r.matched_tier) ? "destructive" : "secondary"} className="h-5 text-[10px] px-1.5 rounded-full whitespace-nowrap">
                        T{r.matched_tier ?? "?"} · {tierLabel[r.matched_tier ?? -1] || "Unknown"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular">{r.result_count ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSourcingSignals;
