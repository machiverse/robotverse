/**
 * Admin SEO Dashboard — /dashboard/admin/seo
 * Monitors the SEO generation pipeline: queue depth, coverage %,
 * recent jobs, failures, and a manual regenerate-all action.
 *
 * Guarded by has_role(_, 'admin'). Non-admins see an access-denied state.
 */

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { RefreshCw, PlayCircle } from "lucide-react";

interface JobCounts {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

interface CoverageRow {
  content_type: string;
  total: number;
  with_seo: number;
  pct: number;
}

const CONTENT_TYPES = [
  { type: "robot", table: "robots" },
  { type: "spare_part", table: "spare_parts" },
  { type: "service", table: "services" },
  { type: "blog", table: "blogs" },
  { type: "community_post", table: "community_posts" },
] as const;

export default function SEODashboard() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [jobCounts, setJobCounts] = useState<JobCounts | null>(null);
  const [coverage, setCoverage] = useState<CoverageRow[]>([]);
  const [recent, setRecent] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    (async () => {
      if (!user) return setIsAdmin(false);
      const { data } = await (supabase.rpc as any)("has_role", {
        _user_id: user.id,
        _role: "admin",
      });
      setIsAdmin(!!data);
    })();
  }, [user]);

  const load = async () => {
    setRefreshing(true);
    try {
      // Job counts
      const counts: JobCounts = { pending: 0, processing: 0, completed: 0, failed: 0 };
      await Promise.all(
        (Object.keys(counts) as (keyof JobCounts)[]).map(async (status) => {
          const { count } = await supabase
            .from("seo_jobs")
            .select("*", { count: "exact", head: true })
            .eq("status", status);
          counts[status] = count ?? 0;
        })
      );
      setJobCounts(counts);

      // Coverage per content type
      const rows = await Promise.all(
        CONTENT_TYPES.map(async ({ type, table }) => {
          const [{ count: total }, { count: withSeo }] = await Promise.all([
            supabase.from(table as any).select("*", { count: "exact", head: true }),
            supabase
              .from("seo_metadata")
              .select("*", { count: "exact", head: true })
              .eq("content_type", type)
              .eq("status", "published"),
          ]);
          const t = total ?? 0;
          const w = withSeo ?? 0;
          return { content_type: type, total: t, with_seo: w, pct: t === 0 ? 0 : Math.round((w / t) * 100) };
        })
      );
      setCoverage(rows);

      // Recent jobs
      const { data: recentJobs } = await supabase
        .from("seo_jobs")
        .select("id, content_type, content_id, status, error, created_at, completed_at")
        .order("created_at", { ascending: false })
        .limit(20);
      setRecent(recentJobs ?? []);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  const regenerateAll = async () => {
    toast({ title: "Queuing regenerate…", description: "All published content will be re-queued." });
    // Enqueue jobs for every content type with published SEO metadata.
    const rows: any[] = [];
    for (const { type } of CONTENT_TYPES) {
      const { data } = await supabase
        .from("seo_metadata")
        .select("content_id")
        .eq("content_type", type)
        .eq("status", "published");
      (data ?? []).forEach((r: any) =>
        rows.push({ content_type: type, content_id: r.content_id, status: "pending", source: "admin-regenerate" })
      );
    }
    if (rows.length === 0) {
      toast({ title: "Nothing to queue", description: "No published SEO metadata found." });
      return;
    }
    const { error } = await supabase.from("seo_jobs").insert(rows);
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Queued", description: `${rows.length} jobs queued. Cron drains within a minute.` });
    setTimeout(load, 1500);
  };

  const drainNow = async () => {
    const { error } = await supabase.functions.invoke("seo-generator", {
      body: { source: "manual-drain", batch_size: 20 },
    });
    if (error) toast({ title: "Drain failed", description: error.message, variant: "destructive" });
    else toast({ title: "Drain started", description: "Up to 20 jobs being processed now." });
    setTimeout(load, 2000);
  };

  if (isAdmin === null) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="container mx-auto px-4 py-10 space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-24 w-full" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-semibold mb-2">Admin only</h1>
          <p className="text-muted-foreground">You need the admin role to view the SEO dashboard.</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">SEO Pipeline</h1>
            <p className="text-sm text-muted-foreground">
              Monitor the seo_jobs queue, AI-generated metadata coverage, and recent failures.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={load} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button variant="outline" onClick={drainNow}>
              <PlayCircle className="h-4 w-4 mr-2" /> Drain now
            </Button>
            <Button onClick={regenerateAll}>Regenerate all</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(["pending", "processing", "completed", "failed"] as const).map((k) => (
            <Card key={k} className="p-4">
              <div className="text-xs uppercase text-muted-foreground">{k}</div>
              <div className={`text-3xl font-bold ${k === "failed" ? "text-destructive" : ""}`}>
                {jobCounts?.[k] ?? "—"}
              </div>
            </Card>
          ))}
        </div>

        <Card className="p-4">
          <h2 className="font-semibold mb-3">Coverage by content type</h2>
          <div className="space-y-3">
            {coverage.map((c) => (
              <div key={c.content_type}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium capitalize">{c.content_type.replace("_", " ")}</span>
                  <span className="text-muted-foreground">
                    {c.with_seo} / {c.total} · {c.pct}%
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${c.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="font-semibold mb-3">Recent jobs</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-4">When</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Content ID</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2">Error</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((j) => (
                  <tr key={j.id} className="border-b border-border/60">
                    <td className="py-2 pr-4 whitespace-nowrap">
                      {new Date(j.created_at).toLocaleString()}
                    </td>
                    <td className="py-2 pr-4">{j.content_type}</td>
                    <td className="py-2 pr-4 font-mono text-xs">{String(j.content_id).slice(0, 12)}…</td>
                    <td className="py-2 pr-4">
                      <Badge variant={j.status === "failed" ? "destructive" : j.status === "completed" ? "default" : "secondary"}>
                        {j.status}
                      </Badge>
                    </td>
                    <td className="py-2 text-destructive text-xs max-w-md truncate">{j.error ?? ""}</td>
                  </tr>
                ))}
                {recent.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-muted-foreground">
                      No jobs yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
