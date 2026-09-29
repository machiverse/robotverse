import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, EyeOff, ImageOff, Loader2, Pause, Play, RefreshCw, Save, Server, Square } from "lucide-react";
import EnhancedHeader from "@/components/EnhancedHeader";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { cn } from "@/lib/utils";

type Kind = "robots" | "tools" | "axes";
type Counts = Record<string, number>;
type Row = {
  catalog_id: string;
  name: string;
  brand: string;
  status: string;
  thumb_url: string | null;
  image_url: string | null;
  source_page_url: string | null;
  verify_note: string | null;
};
type Job = { status: string; retry: boolean; processed: number; found: number; last_note: string | null; updated_at: string } | null;
type LogLine = { id: string; name: string; status: string; image: string | null; note: string };

const FN = "directory-photo-harvest";
const call = async <T,>(body: Record<string, unknown>): Promise<T> => {
  const { data, error } = await supabase.functions.invoke(FN, { body });
  if (error) {
    let reason = error.message;
    try {
      const ctx = (error as { context?: Response }).context;
      reason = (await ctx?.json())?.error ?? reason;
    } catch {
      /* keep message */
    }
    throw new Error(reason);
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
};

/**
 * Admin: collect real product photos for every Directory item. Runs the
 * harvest function in batches, shows progress, and lets an admin hide a wrong
 * photo or paste a better one.
 */
export default function DirectoryPhotosAdmin() {
  const { user } = useAuth();
  const { isAdmin, isLoading } = useIsAdmin();
  const [kind, setKind] = useState<Kind>("robots");
  const [counts, setCounts] = useState<Counts | null>(null);
  const [running, setRunning] = useState(false);
  const [retry, setRetry] = useState(false);
  const [log, setLog] = useState<LogLine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<{ status: string; rows: Row[] }>({ status: "found", rows: [] });
  const stop = useRef(false);
  const [job, setJob] = useState<Job>(null);
  const jobRunning = job?.status === "running";

  const refresh = useCallback(async () => {
    try {
      setCounts(await call<Counts>({ action: "status", kind }));
      const { rows } = await call<{ rows: Row[] }>({ action: "list", kind, status: review.status, limit: 120 });
      setReview((r) => ({ ...r, rows }));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [kind, review.status]);

  useEffect(() => {
    if (isAdmin) refresh();
  }, [isAdmin, refresh]);

  // Background job on the server: poll its progress while it runs.
  const loadJob = useCallback(async () => {
    try {
      setJob((await call<{ job: Job }>({ action: "job", kind })).job);
    } catch {
      /* ignore */
    }
  }, [kind]);
  useEffect(() => {
    if (!isAdmin) return;
    loadJob();
    const t = setInterval(() => {
      loadJob();
      if (jobRunning) call<Counts>({ action: "status", kind }).then(setCounts).catch(() => {});
    }, 15000);
    return () => clearInterval(t);
  }, [isAdmin, loadJob, jobRunning, kind]);

  const serverJob = async (action: "start" | "stop") => {
    setError(null);
    try {
      await call({ action, kind, retry });
      await loadJob();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const start = async () => {
    stop.current = false;
    setRunning(true);
    setError(null);
    try {
      for (let guard = 0; guard < 2000 && !stop.current; guard++) {
        const res = await call<{ processed: number; remaining: number; results: LogLine[] }>({ action: "run", kind, limit: 3, retry });
        setLog((l) => [...res.results, ...l].slice(0, 300));
        setCounts(await call<Counts>({ action: "status", kind }));
        if (!res.processed || res.remaining === 0) break;
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRunning(false);
      refresh();
    }
  };

  if (!user || isLoading)
    return (
      <Shell>
        <p className="text-muted-foreground">{isLoading ? "Checking access…" : "Please sign in as an admin."}</p>
      </Shell>
    );
  if (!isAdmin)
    return (
      <Shell>
        <p className="text-muted-foreground">This page is for RobotVerse admins.</p>
      </Shell>
    );

  const total = counts?.total ?? 0;
  const done = total - (counts?.pending ?? total);
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <Shell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Directory real photos</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Searches deeply for a real product photo of each catalogue model — the manufacturer's own website first, then Google, Bing, DuckDuckGo and Wikimedia Commons, then the model series — checks it with AI vision, stores it in RobotVerse storage and
            the <code>directory_robot_images</code> table. The Directory shows these photos instead of the CAD renders.
          </p>
        </div>
        <div className="flex overflow-hidden rounded-md border border-border" role="group" aria-label="Catalogue">
          {(["robots", "tools", "axes"] as Kind[]).map((k) => (
            <button
              key={k}
              disabled={running}
              onClick={() => setKind(k)}
              aria-pressed={kind === k}
              className={cn("px-3 py-1.5 text-sm capitalize", kind === k ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      {/* Progress */}
      <section className="mb-6 rounded-lg border border-border p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm">
            <b className="tabular-nums">{done}</b> of <b className="tabular-nums">{total}</b> processed · {pct}%
          </p>
          <div className="flex flex-wrap gap-2 text-xs">
            {["found", "manual", "not_found", "rejected", "error", "pending"].map((s) => (
              <span key={s} className="rounded-full border border-border px-2 py-0.5">
                {s.replace("_", " ")}: <b className="tabular-nums">{counts?.[s] ?? 0}</b>
              </span>
            ))}
          </div>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary transition-[width] duration-300" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {running ? (
            <Button size="sm" variant="outline" onClick={() => (stop.current = true)}>
              <Pause className="mr-1.5 h-4 w-4" /> Pause after this batch
            </Button>
          ) : (
            <Button size="sm" onClick={start} disabled={jobRunning}>
              <Play className="mr-1.5 h-4 w-4" /> {done ? "Continue harvesting" : "Start harvesting"}
            </Button>
          )}
          {jobRunning ? (
            <Button size="sm" variant="outline" onClick={() => serverJob("stop")}>
              <Square className="mr-1.5 h-4 w-4" /> Stop server run
            </Button>
          ) : (
            <Button size="sm" variant="secondary" disabled={running} onClick={() => serverJob("start")}>
              <Server className="mr-1.5 h-4 w-4" /> Run all on server
            </Button>
          )}
          <label className="flex items-center gap-1.5 text-sm">
            <input type="checkbox" checked={retry} disabled={running} onChange={(e) => setRetry(e.target.checked)} />
            Retry models not found / rejected (max 3 tries)
          </label>
          <Button size="sm" variant="ghost" onClick={refresh} disabled={running}>
            <RefreshCw className="mr-1.5 h-4 w-4" /> Refresh
          </Button>
          {running && (
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Deep search, 3 models per batch — keep this tab open.
            </span>
          )}
        </div>
        {job && (
          <p className="mt-2 text-sm text-muted-foreground">
            {jobRunning && <Loader2 className="mr-1 inline h-3.5 w-3.5 animate-spin" />}
            Server run: <b>{job.status}</b>{job.retry ? " (retry pass)" : ""} · {job.processed} searched · {job.found} photos found · last update{" "}
            {new Date(job.updated_at).toLocaleTimeString()}
            {jobRunning ? " — runs by itself, you can close this page." : ""}
            {job.last_note && <span className="block truncate text-xs">{job.last_note}</span>}
          </p>
        )}
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </section>

      {log.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-semibold">Latest results</h2>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {log.slice(0, 30).map((l, i) => (
              <li key={`${l.id}-${i}`} className="flex gap-3 rounded-md border border-border p-2 text-xs">
                <Thumb src={l.image} />
                <span className="min-w-0">
                  <b className="block truncate">{l.name}</b>
                  <Status s={l.status} />
                  <span className="line-clamp-2 text-muted-foreground">{l.note}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Review */}
      <section>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h2 className="mr-2 text-sm font-semibold">Review</h2>
          {["found", "manual", "not_found", "rejected", "error"].map((s) => (
            <button
              key={s}
              onClick={() => setReview({ status: s, rows: [] })}
              className={cn("rounded-full border px-2.5 py-1 text-xs", review.status === s ? "border-primary bg-primary/10 text-primary" : "border-border")}
            >
              {s.replace("_", " ")}
            </button>
          ))}
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {review.rows.map((r) => (
            <ReviewCard key={r.catalog_id} kind={kind} row={r} onChanged={refresh} />
          ))}
          {review.rows.length === 0 && <li className="text-sm text-muted-foreground">Nothing here yet.</li>}
        </ul>
      </section>
    </Shell>
  );
}

function ReviewCard({ kind, row, onChanged }: { kind: Kind; row: Row; onChanged: () => void }) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const act = async (body: Record<string, unknown>) => {
    setBusy(true);
    setMsg(null);
    try {
      await call({ ...body, kind, id: row.catalog_id });
      onChanged();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <li className="rounded-md border border-border p-3 text-xs">
      <div className="flex gap-3">
        <Thumb src={row.thumb_url} big />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{row.name}</p>
          <p className="text-muted-foreground">{row.catalog_id}</p>
          <Status s={row.status} />
          {row.source_page_url && (
            <a href={row.source_page_url} target="_blank" rel="noopener noreferrer" className="block truncate text-primary hover:underline">
              {row.source_page_url}
            </a>
          )}
          {row.verify_note && <p className="line-clamp-2 text-muted-foreground">{row.verify_note}</p>}
        </div>
      </div>
      <div className="mt-2 flex gap-1.5">
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Paste a better image URL" className="h-8 text-xs" />
        <Button size="sm" className="h-8" disabled={busy || !/^https?:\/\//.test(url)} onClick={() => act({ action: "manual", imageUrl: url })}>
          <Save className="h-3.5 w-3.5" />
        </Button>
        {(row.status === "found" || row.status === "manual") && (
          <Button size="sm" variant="outline" className="h-8" disabled={busy} onClick={() => act({ action: "reject" })} title="Hide this photo">
            <EyeOff className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      {msg && <p className="mt-1 text-red-600">{msg}</p>}
    </li>
  );
}

function Thumb({ src, big }: { src: string | null; big?: boolean }) {
  return (
    <div className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded bg-white", big ? "h-20 w-20" : "h-12 w-12")}>
      {src ? <img src={src} alt="" className="h-full w-full object-contain" loading="lazy" /> : <ImageOff className="h-5 w-5 text-muted-foreground" />}
    </div>
  );
}

function Status({ s }: { s: string }) {
  const ok = s === "found" || s === "manual";
  return (
    <span className={cn("inline-flex items-center gap-1 font-medium", ok ? "text-emerald-600" : s === "error" ? "text-red-600" : "text-amber-600")}>
      {ok && <CheckCircle2 className="h-3 w-3" />}
      {s.replace("_", " ")}
    </span>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <EnhancedHeader />
      <main className="container mx-auto px-4 py-8">
        <Link to="/directory" className="mb-4 inline-flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Directory
        </Link>
        {children}
      </main>
      <Footer />
    </div>
  );
}
