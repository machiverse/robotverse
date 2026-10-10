import { useCallback, useEffect, useState } from "react";
import { FileText, Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { callDatasheets } from "./datasheetClient";

type Kind = "robots" | "tools" | "axes" | "parts";
type Status = { withDatasheet: number; total: number; counts: { not_found: number; unsupported: number; error: number }; job?: { done: number; total: number; running: boolean; updatedAt: string; last_error: string | null } | null };

/** Admin: how many Directory models have a datasheet, and a button to find them for every model. */
export default function DatasheetAdminPanel() {
  const [status, setStatus] = useState<Partial<Record<Kind, Status>>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [starting, setStarting] = useState<Kind | null>(null);

  const refresh = useCallback(async () => {
    const out: Partial<Record<Kind, Status>> = {};
    const results = await Promise.allSettled((["robots", "tools", "axes", "parts"] as Kind[]).map(async (kind) => {
      out[kind] = await callDatasheets<Status>({ action: "status", kind });
    }));
    if (results.some((result) => result.status === "rejected")) setMsg("Some datasheet counts could not load. Check connectivity and datasheet storage access, then retry.");
    setStatus(out);
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 15000);
    return () => clearInterval(t);
  }, [refresh]);

  const start = async (kind: Kind, redo = false) => {
    setMsg(null);
    setStarting(kind);
    try {
      const data = await callDatasheets<{ from: number }>({ action: "start", kind, redo });
      setMsg(`Collecting official ${kind} datasheets${data.from ? ` from model ${data.from + 1}` : ""}. Counts update every 15 seconds.`);
      await refresh();
    } catch (error) { setMsg(error instanceof Error ? error.message : "Could not start collection"); }
    finally { setStarting(null); }
  };

  return (
    <section className="mb-8 rounded-xl border border-border bg-card p-4">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <FileText className="h-5 w-5 text-primary" /> Datasheets (PDF)
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Finds matching datasheets and brochures on approved manufacturer websites, checks the PDF content, and saves the links in datasheet files.
        Found datasheets appear as a “Datasheet (PDF)” button in the Directory and on model pages. Visitors' clicks also find datasheets one by one.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(["robots", "tools", "axes", "parts"] as Kind[]).map((k) => {
          const s = status[k];
          const running = !!s?.job?.running && Date.now() - new Date(s.job.updatedAt).getTime() < 5 * 60_000;
          return (
            <div key={k} className="rounded-lg border border-border p-3">
              <p className="text-sm font-medium capitalize">{k}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">
                {s ? s.withDatasheet.toLocaleString("en-IN") : "—"}
                <span className="text-sm font-normal text-muted-foreground"> / {s?.total?.toLocaleString("en-IN") ?? "—"} with a datasheet</span>
              </p>
              {running && (
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> Searching… {s?.job?.done}/{s?.job?.total}
                </p>
              )}
              {s?.counts && <p className="mt-1 text-xs text-muted-foreground">{s.counts.not_found} not found · {s.counts.unsupported} need manufacturer review · {s.counts.error} failed lookups</p>}
              {s?.job && !running && s.job.done < s.job.total && <p className="mt-1 text-xs text-muted-foreground">Paused at {s.job.done}/{s.job.total}. Resume collection to continue.</p>}
              {s?.job?.last_error && <p className="mt-1 text-xs text-destructive" role="alert">{s.job.last_error}</p>}
              <div className="mt-2 flex gap-2">
                <Button size="sm" onClick={() => start(k)} disabled={running || starting !== null}>
                  <Play className="mr-1 h-3.5 w-3.5" /> {s?.job && s.job.done < s.job.total ? "Resume" : "Find all"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => start(k, true)} disabled={running || starting !== null}>
                  Search again
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      {msg && <p className="mt-2 text-sm" role="status">{msg}</p>}
    </section>
  );
}
