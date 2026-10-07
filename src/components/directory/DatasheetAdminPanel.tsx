import { useCallback, useEffect, useState } from "react";
import { FileText, Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type Kind = "robots" | "tools" | "axes" | "parts";
type Status = { withDatasheet: number; total: number; job?: { done: number; total: number; running: boolean; updatedAt: string } | null };

/** Admin: how many Directory models have a datasheet, and a button to find them for every model. */
export default function DatasheetAdminPanel() {
  const [status, setStatus] = useState<Partial<Record<Kind, Status>>>({});
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const out: Partial<Record<Kind, Status>> = {};
    for (const kind of ["robots", "tools", "axes", "parts"] as Kind[]) {
      const { data } = await supabase.functions.invoke("directory-datasheet", { body: { action: "status", kind } });
      if (data && typeof data.total === "number") out[kind] = data as Status;
    }
    setStatus(out);
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 15000);
    return () => clearInterval(t);
  }, [refresh]);

  const start = async (kind: Kind, redo = false) => {
    setMsg(null);
    const { data, error } = await supabase.functions.invoke("directory-datasheet", { body: { action: "start", kind, redo } });
    setMsg(error || data?.error ? `Could not start: ${data?.error ?? error?.message}` : `Finding ${kind} datasheets in the background — counts update every 15 s.`);
    refresh();
  };

  return (
    <section className="mb-8 rounded-xl border border-border bg-card p-4">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <FileText className="h-5 w-5 text-primary" /> Datasheets (PDF)
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Finds each model's official datasheet or brochure — manufacturer websites first, then the web — and checks that the link really is a PDF.
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
              <div className="mt-2 flex gap-2">
                <Button size="sm" onClick={() => start(k)} disabled={running}>
                  <Play className="mr-1 h-3.5 w-3.5" /> Find all
                </Button>
                <Button size="sm" variant="outline" onClick={() => start(k, true)} disabled={running}>
                  Search again
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      {msg && <p className="mt-2 text-sm">{msg}</p>}
    </section>
  );
}
