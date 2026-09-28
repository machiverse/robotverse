import { AlertTriangle, Boxes, Cpu, Gauge, HelpCircle, Layers, Loader2, Play, RefreshCw, ShieldCheck, Sparkles, Wrench } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { inr, type AiSolution } from "./aiSolution";

/**
 * The AI solution engineer's answer for any automation brief: what it
 * understood, the stations, architecture and alternatives, controls and
 * safety, layout, risks, plan, budget and ROI.
 */
export default function AiSolutionPanel({
  solution,
  fallback,
  loading,
  error,
  onRetry,
  onBuild,
  onAsk,
  compact,
}: {
  /** The AI engineer's answer, when it has arrived. */
  solution: AiSolution | null;
  /** RobotVerse built-in engine answer: shown instantly and whenever the AI is unavailable. */
  fallback?: AiSolution | null;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  /** Build / rebuild the 3D line from this solution. */
  onBuild?: () => void;
  /** Add a clarifying answer to the brief. */
  onAsk?: (question: string) => void;
  compact?: boolean;
}) {
  const [prefer, setPrefer] = useState<"ai" | "engine">("ai");
  const shown = (prefer === "engine" && fallback) || solution || fallback || null;
  if (loading && !shown)
    return (
      <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
        <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
        <span>
          <span className="font-medium">AI solution engineer is designing your solution…</span>
          <span className="block text-xs text-muted-foreground">Sizing robots, tooling, safety, layout, budget and payback for your exact brief.</span>
        </span>
      </div>
    );
  if (error && !shown)
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/40 bg-amber-500/5 p-4 text-sm">
        <span className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden />
          <span>
            <span className="font-medium">AI solution not available right now.</span>
            <span className="block text-xs text-muted-foreground">{error} The plan below comes from the built-in skills library.</span>
          </span>
        </span>
        {onRetry && (
          <Button size="sm" variant="outline" onClick={onRetry}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Retry
          </Button>
        )}
      </div>
    );
  if (!shown) return null;
  const s = shown;
  const fromAi = s.source === "ai";

  return (
    <section aria-label="AI engineered solution" className="space-y-4">
      {/* Header */}
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-primary">
              <Sparkles className="h-3.5 w-3.5" aria-hidden /> {fromAi ? "AI engineered solution" : "RobotVerse solution engine"}
            </p>
            <h3 className="mt-1 text-lg font-semibold leading-tight">{s.title || "Automation solution"}</h3>
            <p className="mt-1.5 max-w-3xl text-sm text-muted-foreground">{s.understanding}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {solution && fallback && (
              <div className="flex overflow-hidden rounded-md border border-border text-xs" role="group" aria-label="Solution source">
                {(["ai", "engine"] as const).map((k) => (
                  <button
                    key={k}
                    aria-pressed={(k === "ai") === fromAi}
                    onClick={() => setPrefer(k)}
                    className={cn("px-2.5 py-1.5", (k === "ai") === fromAi ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
                  >
                    {k === "ai" ? "AI refined" : "Built-in engine"}
                  </button>
                ))}
              </div>
            )}
            {onBuild && s.tasks.length > 0 && (
              <Button size="sm" onClick={onBuild}>
                <Play className="mr-1.5 h-3.5 w-3.5" /> Show this line in 3D
              </Button>
            )}
          </div>
        </div>
        {!solution && loading && (
          <p className="mt-2 flex items-center gap-2 text-xs text-primary">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> AI engineer is refining this design for your exact brief…
          </p>
        )}
        {!solution && !loading && error && (
          <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" aria-hidden /> AI refinement unavailable ({error}). This design is from the built-in engine.
            {onRetry && (
              <button onClick={onRetry} className="text-primary hover:underline">
                Retry AI
              </button>
            )}
          </p>
        )}
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Fact label="Architecture" value={s.architecture.type || "—"} />
          <Fact label="Throughput" value={s.throughput.target || (s.throughput.takt_s ? `${s.throughput.takt_s} s takt` : "—")} />
          <Fact label="Budget (integrated)" value={s.budget_inr.low || s.budget_inr.high ? `${inr(s.budget_inr.low)} – ${inr(s.budget_inr.high)}` : "—"} />
          <Fact label="Payback" value={s.roi.payback_months ? `${s.roi.payback_months}${/month|yr|year/i.test(s.roi.payback_months) ? "" : " months"}` : "—"} />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge variant="secondary">Feasibility: {s.feasibility}</Badge>
          <Badge variant="secondary">Automation: {s.automation_level}</Badge>
          {s.workpiece?.name && (
            <Badge variant="outline">
              {s.workpiece.name}
              {s.workpiece.weight_kg ? ` · ${s.workpiece.weight_kg} kg` : ""}
              {s.workpiece.material ? ` · ${s.workpiece.material}` : ""}
            </Badge>
          )}
        </div>
      </div>

      {/* Stations */}
      {s.stations.length > 0 && (
        <Block icon={<Boxes className="h-4 w-4" />} title={`Stations (${s.stations.length})`}>
          <ol className="grid gap-2 md:grid-cols-2">
            {s.stations.map((st, i) => (
              <li key={i} className="rounded-md border border-border p-3 text-sm">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-medium">
                    <span className="mr-1.5 font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                    {st.name}
                  </p>
                  {st.cycle_s != null && <span className="shrink-0 font-mono text-xs text-muted-foreground">{st.cycle_s} s</span>}
                </div>
                {st.what && <p className="mt-1 text-xs text-muted-foreground">{st.what}</p>}
                <dl className="mt-2 space-y-1 text-xs">
                  {st.equipment && <Row k="Equipment" v={st.equipment} />}
                  {(st.payload_kg != null || st.reach_mm != null) && (
                    <Row k="Size" v={[st.payload_kg != null ? `${st.payload_kg} kg payload` : "", st.reach_mm != null ? `${st.reach_mm} mm reach` : ""].filter(Boolean).join(" · ")} />
                  )}
                  {st.tooling && <Row k="Tooling" v={st.tooling} />}
                  {st.sensors.length > 0 && <Row k="Sensors" v={st.sensors.join(", ")} />}
                  {st.notes && <Row k="Note" v={st.notes} />}
                </dl>
                {st.skill && <p className="mt-2 text-[11px] text-primary">3D skill: {st.skill}</p>}
              </li>
            ))}
          </ol>
        </Block>
      )}

      <div className={cn("grid gap-4", !compact && "lg:grid-cols-2")}>
        {/* Architecture + alternatives */}
        <Block icon={<Layers className="h-4 w-4" />} title="Why this architecture">
          <p className="text-sm text-muted-foreground">{s.architecture.why}</p>
          {s.material_flow && (
            <p className="mt-2 text-sm">
              <span className="font-medium">Material flow: </span>
              <span className="text-muted-foreground">{s.material_flow}</span>
            </p>
          )}
          {s.architecture.alternatives.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Alternatives</p>
              {s.architecture.alternatives.map((a, i) => (
                <div key={i} className="rounded-md border border-border p-2.5 text-xs">
                  <p className="font-medium text-foreground">{a.option}</p>
                  {a.pros && <p className="mt-1 text-emerald-600 dark:text-emerald-400">+ {a.pros}</p>}
                  {a.cons && <p className="text-red-600 dark:text-red-400">− {a.cons}</p>}
                  {a.when && <p className="mt-1 text-muted-foreground">Choose when: {a.when}</p>}
                </div>
              ))}
            </div>
          )}
        </Block>

        {/* Controls & safety */}
        <Block icon={<ShieldCheck className="h-4 w-4" />} title="Controls & safety">
          <dl className="space-y-1.5 text-sm">
            {s.controls.plc && <Row k="PLC" v={s.controls.plc} />}
            {s.controls.hmi && <Row k="HMI" v={s.controls.hmi} />}
            {s.controls.communication && <Row k="Network" v={s.controls.communication} />}
          </dl>
          <List title="Safety" items={s.controls.safety} />
          <List title="Interlocks" items={s.controls.interlocks} />
        </Block>

        {/* Layout & utilities */}
        <Block icon={<Cpu className="h-4 w-4" />} title="Layout & utilities">
          {s.layout.footprint_m && (
            <p className="text-sm">
              <span className="font-medium">Footprint: </span>
              <span className="text-muted-foreground">{s.layout.footprint_m}</span>
            </p>
          )}
          <List items={s.layout.notes} />
          <List title="Utilities" items={s.utilities} />
        </Block>

        {/* Risks */}
        <Block icon={<AlertTriangle className="h-4 w-4" />} title="Risks & mitigation">
          <ul className="space-y-2 text-sm">
            {s.risks.map((r, i) => (
              <li key={i}>
                <p className="font-medium">{r.risk}</p>
                <p className="text-muted-foreground">{r.mitigation}</p>
              </li>
            ))}
          </ul>
        </Block>

        {/* Plan */}
        <Block icon={<Wrench className="h-4 w-4" />} title="Implementation plan">
          <ol className="space-y-2 text-sm">
            {s.implementation.map((p, i) => (
              <li key={i} className="grid grid-cols-[1.5rem_1fr] gap-2">
                <span className="font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                <span>
                  <span className="font-medium">{p.phase}</span>
                  {p.weeks && <span className="text-muted-foreground"> · {p.weeks} weeks</span>}
                  {p.deliverables && <span className="block text-xs text-muted-foreground">{p.deliverables}</span>}
                </span>
              </li>
            ))}
          </ol>
        </Block>

        {/* Business case */}
        <Block icon={<Gauge className="h-4 w-4" />} title="Business case">
          <dl className="space-y-1.5 text-sm">
            <Row k="Budget" v={`${inr(s.budget_inr.low)} – ${inr(s.budget_inr.high)}`} />
            {s.budget_inr.notes && <Row k="Includes" v={s.budget_inr.notes} />}
            {s.roi.labour_saved && <Row k="Labour" v={s.roi.labour_saved} />}
            {s.roi.quality_gain && <Row k="Quality" v={s.roi.quality_gain} />}
            {s.roi.payback_months && <Row k="Payback" v={s.roi.payback_months} />}
          </dl>
          <List title="KPIs to track" items={s.kpis} />
        </Block>
      </div>

      {(s.assumptions.length > 0 || s.questions.length > 0) && (
        <Block icon={<HelpCircle className="h-4 w-4" />} title="Assumptions & questions that would sharpen the design">
          <List items={s.assumptions} />
          {s.questions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {s.questions.map((q, i) =>
                onAsk ? (
                  <button
                    key={i}
                    onClick={() => onAsk(q)}
                    className="rounded-full border border-primary/40 px-2.5 py-1 text-left text-xs text-primary transition-colors duration-150 hover:bg-primary/10"
                  >
                    {q}
                  </button>
                ) : (
                  <span key={i} className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
                    {q}
                  </span>
                ),
              )}
            </div>
          )}
          {onAsk && s.questions.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">Click a question to add your answer to the brief, then run it again.</p>
          )}
        </Block>
      )}
      <p className="text-[11px] text-muted-foreground">
        {fromAi ? "AI-generated" : "Rule-based"} engineering proposal. Budgets, cycle times and models are estimates to be confirmed by a site survey and integrator quotation.
      </p>
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background/60 p-2">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium leading-snug">{value}</p>
    </div>
  );
}

function Block({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <span className="text-primary">{icon}</span>
        {title}
      </h4>
      {children}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="grid grid-cols-[5.5rem_1fr] gap-2">
      <dt className="text-muted-foreground">{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}

function List({ title, items }: { title?: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="mt-2">
      {title && <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>}
      <ul className="list-disc space-y-0.5 pl-4 text-sm text-muted-foreground">
        {items.map((x, i) => (
          <li key={i}>{x}</li>
        ))}
      </ul>
    </div>
  );
}
