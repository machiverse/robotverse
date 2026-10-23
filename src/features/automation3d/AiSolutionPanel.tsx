import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BevelBox } from "@/components/console/ConsoleUI";
import { Eyebrow, KitButton, Readouts } from "./StudioKit";
import { cn } from "@/lib/utils";
import { inr, type AiSolution } from "./aiSolution";
import type { EngineerThinking } from "./engineerThinking";

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
      <div className="flex items-center gap-3 border-l-2 border-primary bg-primary/5 p-4 text-sm">
        <Loader2 className="h-4 w-4 animate-spin text-primary motion-reduce:animate-none" aria-hidden />
        <span>
          <span className="font-medium">AI solution engineer is designing your solution…</span>
          <span className="block text-xs text-muted-foreground">Sizing robots, tooling, safety, layout, budget and payback for your exact brief.</span>
        </span>
      </div>
    );
  if (error && !shown)
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 border-l-2 border-warning bg-warning/5 p-4 text-sm">
        <span className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
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

  const tabs: { key: string; label: string; body: ReactNode }[] = [
    {
      key: "design",
      label: "Design",
      body: (
        <div className={cn("grid gap-x-8 gap-y-6", !compact && "lg:grid-cols-2")}>
          <Block title="Why this architecture">
            <p className="text-sm text-muted-foreground">{s.architecture.why}</p>
            {s.material_flow && (
              <p className="mt-2 text-sm">
                <span className="font-medium">Material flow: </span>
                <span className="text-muted-foreground">{s.material_flow}</span>
              </p>
            )}
            {s.architecture.alternatives.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Alternatives</p>
                <ul className="border-t border-border">
                  {s.architecture.alternatives.map((a, i) => (
                    <li key={i} className="border-b border-border py-2.5 text-xs">
                      <p className="text-sm font-medium text-foreground">{a.option}</p>
                      {a.pros && <p className="mt-1"><span className="font-mono text-success">+</span> <span className="text-muted-foreground">{a.pros}</span></p>}
                      {a.cons && <p><span className="font-mono text-destructive">−</span> <span className="text-muted-foreground">{a.cons}</span></p>}
                      {a.when && <p className="mt-1 text-muted-foreground">Choose when: {a.when}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Block>
          <Block title="Layout & utilities">
            {s.layout.footprint_m && (
              <p className="text-sm">
                <span className="font-medium">Footprint: </span>
                <span className="text-muted-foreground">{s.layout.footprint_m}</span>
              </p>
            )}
            <List items={s.layout.notes} />
            <List title="Utilities" items={s.utilities} />
          </Block>
        </div>
      ),
    },
    {
      key: "safety",
      label: "Safety & controls",
      body: (
        <div className={cn("grid gap-x-8 gap-y-6", !compact && "lg:grid-cols-2")}>
          <Block title="Controls & safety">
            <dl className="space-y-1.5 text-sm">
              {s.controls.plc && <Row k="PLC" v={s.controls.plc} />}
              {s.controls.hmi && <Row k="HMI" v={s.controls.hmi} />}
              {s.controls.communication && <Row k="Network" v={s.controls.communication} />}
            </dl>
            <List title="Safety" items={s.controls.safety} />
            <List title="Interlocks" items={s.controls.interlocks} />
          </Block>
          {((s.standards?.length ?? 0) > 0 || (s.industry_notes?.length ?? 0) > 0) && (
            <Block title="Standards & industry rules applied">
              {(s.standards?.length ?? 0) > 0 && (
                <ul className="flex flex-wrap gap-1.5">
                  {s.standards!.map((x) => (
                    <li key={x} className="border border-border px-2 py-1 text-xs">
                      {x}
                    </li>
                  ))}
                </ul>
              )}
              <List items={s.industry_notes ?? []} />
            </Block>
          )}
        </div>
      ),
    },
    ...(s.thinking ? [{ key: "thinking", label: "Engineer's thinking", body: <ThinkingBlock t={s.thinking} /> }] : []),
    {
      key: "business",
      label: "Business case & risks",
      body: (
        <div className={cn("grid gap-x-8 gap-y-6", !compact && "lg:grid-cols-2")}>
          <Block title="Business case">
            <dl className="space-y-1.5 text-sm">
              <Row k="Budget" v={`${inr(s.budget_inr.low)} – ${inr(s.budget_inr.high)}`} />
              {s.budget_inr.notes && <Row k="Includes" v={s.budget_inr.notes} />}
              {s.roi.labour_saved && <Row k="Labour" v={s.roi.labour_saved} />}
              {s.roi.quality_gain && <Row k="Quality" v={s.roi.quality_gain} />}
              {s.roi.payback_months && <Row k="Payback" v={s.roi.payback_months} />}
            </dl>
            <List title="KPIs to track" items={s.kpis} />
          </Block>
          <Block title="Risks & mitigation">
            <ul className="border-t border-border text-sm">
              {s.risks.map((r, i) => (
                <li key={i} className="border-b border-border py-2.5">
                  <p className="font-medium">{r.risk}</p>
                  <p className="text-muted-foreground">{r.mitigation}</p>
                </li>
              ))}
            </ul>
          </Block>
        </div>
      ),
    },
    {
      key: "delivery",
      label: "Delivery",
      body: (
        <div className="space-y-6">
          <Block title="Implementation plan">
            <ol className="border-t border-border text-sm">
              {s.implementation.map((p, i) => (
                <li key={i} className="grid grid-cols-[2rem_1fr_auto] gap-x-2 border-b border-border py-2.5">
                  <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                  <span>
                    <span className="font-medium">{p.phase}</span>
                    {p.deliverables && <span className="block text-xs text-muted-foreground">{p.deliverables}</span>}
                  </span>
                  {p.weeks && <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{p.weeks} wk</span>}
                </li>
              ))}
            </ol>
          </Block>
          {s.provider && (
            <Block title="How a solution provider takes it forward">
              <ul className="space-y-1.5 text-sm">
                {s.provider.feasibility.map((x) => (
                  <li key={x.factor} className="flex gap-2.5">
                    <span
                      className={cn("mt-1.5 h-1.5 w-1.5 shrink-0", x.status === "ok" ? "bg-success" : x.status === "check" ? "bg-warning" : "bg-destructive")}
                      aria-label={x.status === "ok" ? "fine" : x.status === "check" ? "to check" : "risk"}
                    />
                    <span>
                      <span className="font-medium">{x.factor}:</span> <span className="text-muted-foreground">{x.note}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className={cn("mt-3 text-sm", s.provider.pocFirst ? "text-warning" : "text-muted-foreground")}>{s.provider.pocWhy}</p>
              <div className="mt-1 grid gap-x-8 md:grid-cols-2">
                <List title="To quote it, the integrator needs" items={s.provider.requirements} />
                <List title="Scope of supply" items={s.provider.scope} />
                <List title="Acceptance (FAT / SAT)" items={s.provider.acceptance} />
                <List title="Documents handed over" items={s.provider.documents} />
                <List title="Typical terms in India" items={s.provider.commercial} />
                <List title="After-sales support" items={s.provider.support} />
              </div>
            </Block>
          )}
        </div>
      ),
    },
    ...(s.assumptions.length > 0 || s.questions.length > 0
      ? [
          {
            key: "questions",
            label: `Questions${s.questions.length ? ` (${s.questions.length})` : ""}`,
            body: (
              <Block title="Assumptions & questions that would sharpen the design">
                <List items={s.assumptions} />
                {s.questions.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {s.questions.map((q, i) =>
                      onAsk ? (
                        <button
                          key={i}
                          onClick={() => onAsk(q)}
                          className="border border-primary/40 px-2.5 py-1.5 text-left text-xs text-primary transition-colors duration-150 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          {q}
                        </button>
                      ) : (
                        <span key={i} className="border border-border px-2.5 py-1.5 text-xs text-muted-foreground">
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
            ),
          },
        ]
      : []),
  ];

  return (
    <section aria-label="Automation solution" className="space-y-6">
      {/* The answer: what it is, what it costs, what it pays back. */}
      <BevelBox cut={14} innerClassName="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 max-w-3xl">
            <Eyebrow label={fromAi ? "AI engineered solution" : "RobotVerse solution engine"} rule={false} />
            <h3 className="mt-3 text-xl font-semibold leading-snug tracking-[-0.01em] sm:text-2xl">{s.title || "Automation solution"}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.understanding}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {solution && fallback && (
              <div className="flex border border-border font-mono text-[11px] uppercase tracking-[0.12em]" role="group" aria-label="Solution source">
                {(["ai", "engine"] as const).map((k) => (
                  <button
                    key={k}
                    aria-pressed={(k === "ai") === fromAi}
                    onClick={() => setPrefer(k)}
                    className={cn(
                      "px-3 py-2 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
                      (k === "ai") === fromAi ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {k === "ai" ? "AI refined" : "Built-in"}
                  </button>
                ))}
              </div>
            )}
            {onBuild && s.tasks.length > 0 && (
              <KitButton size="sm" onClick={onBuild}>
                Show this line in 3D
              </KitButton>
            )}
          </div>
        </div>
        {!solution && loading && (
          <p className="mt-3 flex items-center gap-2 text-xs text-primary">
            <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden /> AI engineer is refining this design for your exact brief…
          </p>
        )}
        {!solution && !loading && error && (
          <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <AlertTriangle className="h-3.5 w-3.5 text-warning" aria-hidden /> AI refinement unavailable ({error}). This design is from the built-in engine.
            {onRetry && (
              <button onClick={onRetry} className="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                Retry AI
              </button>
            )}
          </p>
        )}
        <Readouts
          className="mt-5"
          text
          items={[
            { label: "Architecture", value: s.architecture.type || "—" },
            { label: "Throughput", value: s.throughput.target || (s.throughput.takt_s ? `${s.throughput.takt_s} s takt` : "—") },
            { label: "Budget (integrated)", value: s.budget_inr.low || s.budget_inr.high ? `${inr(s.budget_inr.low)} – ${inr(s.budget_inr.high)}` : "—" },
            { label: "Payback", value: s.roi.payback_months ? `${s.roi.payback_months}${/month|yr|year/i.test(s.roi.payback_months) ? "" : " months"}` : "—" },
          ]}
        />
        <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
          <span>
            Feasibility <span className="text-foreground">{s.feasibility}</span>
          </span>
          <span>
            Automation <span className="text-foreground">{s.automation_level}</span>
          </span>
          {s.workpiece?.name && (
            <span>
              Part{" "}
              <span className="text-foreground">
                {s.workpiece.name}
                {s.workpiece.weight_kg ? ` · ${s.workpiece.weight_kg} kg` : ""}
                {s.workpiece.material ? ` · ${s.workpiece.material}` : ""}
              </span>
            </span>
          )}
        </p>
      </BevelBox>

      {/* How it was designed: the first steps, the rest on request. */}
      {(s.reasoning?.length ?? 0) > 0 && <Reasoning steps={s.reasoning!} />}

      {/* Stations */}
      {s.stations.length > 0 && (
        <section aria-label="Stations">
          <Eyebrow index={String(s.stations.length).padStart(2, "0")} label="Stations" />
          <ol className="mt-4 grid gap-px overflow-hidden border border-border bg-border md:grid-cols-2">
            {s.stations.map((st, i) => (
              <li key={i} className={cn("bg-card p-4 text-sm", s.stations.length % 2 === 1 && i === s.stations.length - 1 && "md:col-span-2")}>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-semibold">
                    <span className="mr-2 font-mono text-[11px] font-normal tabular-nums text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                    {st.name}
                  </p>
                  {st.cycle_s != null && <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">{st.cycle_s} s</span>}
                </div>
                {st.what && <p className="mt-1 text-xs text-muted-foreground">{st.what}</p>}
                <dl className="mt-3 space-y-1 text-xs">
                  {st.equipment && <Row k="Equipment" v={st.equipment} />}
                  {(st.payload_kg != null || st.reach_mm != null) && (
                    <Row k="Size" v={[st.payload_kg != null ? `${st.payload_kg} kg payload` : "", st.reach_mm != null ? `${st.reach_mm} mm reach` : ""].filter(Boolean).join(" · ")} />
                  )}
                  {st.tooling && <Row k="Tooling" v={st.tooling} />}
                  {st.sensors.length > 0 && <Row k="Sensors" v={st.sensors.join(", ")} />}
                  {st.notes && <Row k="Note" v={st.notes} />}
                </dl>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Engineering detail, one subject at a time. */}
      <section aria-label="Engineering detail">
        <Eyebrow label="Engineering detail" />
        <Tabs defaultValue="design" className="mt-3">
          <TabsList className="h-auto w-full justify-start gap-0 overflow-x-auto rounded-none border-b border-border bg-transparent p-0">
            {tabs.map((t) => (
              <TabsTrigger
                key={t.key}
                value={t.key}
                className="relative shrink-0 rounded-none px-3 py-2.5 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground transition-colors duration-150 after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-transparent hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:after:bg-primary"
              >
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {tabs.map((t) => (
            <TabsContent key={t.key} value={t.key} className="mt-5">
              {t.body}
            </TabsContent>
          ))}
        </Tabs>
      </section>

      <p className="text-[11px] text-muted-foreground">
        {fromAi ? "AI-generated" : "Rule-based"} engineering proposal. Budgets, cycle times and models are estimates to be confirmed by a site survey and integrator quotation.
      </p>
    </section>
  );
}

/** The design steps: the first four, the rest on request. */
function Reasoning({ steps }: { steps: { title: string; detail?: string }[] }) {
  const [all, setAll] = useState(false);
  const shown = all ? steps : steps.slice(0, 4);
  return (
    <section aria-label="How the studio thought it through">
      <Eyebrow index={String(steps.length).padStart(2, "0")} label="How the studio thought it through" />
      <ol className="mt-4 border-t border-border">
        {shown.map((r, i) => (
          <li key={i} className="grid grid-cols-[2rem_1fr] gap-x-2 border-b border-border py-2.5 text-sm">
            <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
            <span className="min-w-0">
              <span className="font-medium">{r.title}</span>
              {r.detail && <span className="block text-muted-foreground">{r.detail}</span>}
            </span>
          </li>
        ))}
      </ol>
      {steps.length > 4 && (
        <button
          type="button"
          onClick={() => setAll((v) => !v)}
          aria-expanded={all}
          className="mt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {all ? "Show fewer steps" : `Show all ${steps.length} steps`}
        </button>
      )}
    </section>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h4 className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{title}</h4>
      {children}
    </section>
  );
}

/** The engineer's methods applied to this plan, each as a small table or checklist. */
function ThinkingBlock({ t }: { t: EngineerThinking }) {
  const dot = (ok: boolean) => cn("mt-1.5 h-1.5 w-1.5 shrink-0", ok ? "bg-success" : "bg-warning");
  const th = "px-2 py-1 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground";
  const td = "px-2 py-1 align-top";
  return (
    <div>
      <p className="text-xs text-muted-foreground">{t.method.map((m, i) => `${i + 1}. ${m}`).join(" · ")}</p>

      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">1 · Choosing the approach (weighted decision matrix)</p>
      <div className="mt-1 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className={th}>Option</th>
              {t.decision.criteria.map((c) => (
                <th key={c.name} className={th}>
                  {c.name} ×{c.weight}
                </th>
              ))}
              <th className={th}>Score</th>
            </tr>
          </thead>
          <tbody>
            {t.decision.options.map((o) => (
              <tr key={o.name} className={cn("border-t border-border", o.name === t.decision.pick && "bg-primary/10 font-medium")}>
                <td className={td}>{o.name}</td>
                {o.scores.map((x, i) => (
                  <td key={i} className={cn(td, "tabular-nums")}>
                    {x}
                  </td>
                ))}
                <td className={cn(td, "tabular-nums")}>{o.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{t.decision.why}</p>

      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">2 · Cycle from motion, and line balance</p>
      <ul className="mt-1 space-y-1 text-sm">
        {t.motion.map((m) => (
          <li key={m.station}>
            <span className="font-medium">{m.station}</span> <span className="text-muted-foreground">({m.processLed ? "process-led" : m.cls}):</span> {m.note}
          </li>
        ))}
      </ul>
      <p className="mt-1 text-sm">
        {t.balance.takt ? (
          <>
            Takt <b>{t.balance.takt.toFixed(1)} s</b> at {Math.round(t.balance.oee * 100)} % OEE ·{" "}
            {t.balance.rows.map((r) => `${r.station}: ${r.robots} robot${r.robots > 1 ? "s" : ""} at ${Math.round(r.utilisation * 100)} %`).join(" · ")} · bottleneck{" "}
            <b>{t.balance.bottleneck}</b>
          </>
        ) : (
          <>
            No output target given: about <b>{t.balance.capacityPerHour} parts/h</b> at {Math.round(t.balance.oee * 100)} % OEE, bottleneck <b>{t.balance.bottleneck}</b>.
          </>
        )}
      </p>

      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">3 · Safety level of each function (ISO 13849-1 risk graph)</p>
      <div className="mt-1 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className={th}>Safety function</th>
              <th className={th}>S · F · P</th>
              <th className={th}>Graph</th>
              <th className={th}>Required</th>
            </tr>
          </thead>
          <tbody>
            {t.safety.map((x) => (
              <tr key={x.fn} className="border-t border-border" title={x.why}>
                <td className={td}>
                  {x.fn}
                  <span className="block text-xs text-muted-foreground">{x.why}</span>
                </td>
                <td className={cn(td, "whitespace-nowrap")}>
                  S{x.s} F{x.f} P{x.p}
                </td>
                <td className={td}>PL {x.graph}</td>
                <td className={cn(td, "font-medium")}>PL {x.required}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">S1/S2 slight or serious injury · F1/F2 seldom or frequent exposure · P1/P2 possible or scarcely possible to avoid. ISO 10218 asks for at least PL d for robot safety functions.</p>

      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">4 · Highest risks (FMEA: severity × occurrence × detection)</p>
      <ul className="mt-1 space-y-1.5 text-sm">
        {t.fmea.map((m) => (
          <li key={`${m.kind}-${m.mode}`}>
            <span className="font-medium">{m.mode}</span> <span className="text-muted-foreground">({m.kind}, RPN {m.rpn} = {m.s}×{m.o}×{m.d})</span>
            <span className="block text-muted-foreground">
              {m.cause} → {m.effect}. <span className="text-foreground">Action:</span> {m.action}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">5 · Design review</p>
      <ul className="mt-1 space-y-1 text-sm">
        {t.review.map((r) => (
          <li key={r.item} className="flex gap-2">
            <span className={dot(r.status === "ok")} aria-label={r.status === "ok" ? "fine" : "to check"} />
            <span>
              <span className="font-medium">{r.item}:</span> <span className="text-muted-foreground">{r.note}</span>
            </span>
          </li>
        ))}
      </ul>

      <List title="6 · What would change the decision" items={t.sensitivity} />
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
    <div className="mt-4 first:mt-0">
      {title && <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{title}</p>}
      <ul className="list-disc space-y-0.5 pl-4 text-sm text-muted-foreground">
        {items.map((x, i) => (
          <li key={i}>{x}</li>
        ))}
      </ul>
    </div>
  );
}
