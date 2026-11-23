/**
 * The automation skills (conveyorAutomation.ts proposeAutomation) reading the AI planner's brief: the application
 * recognised, the robots and their equipment, the process step by step, the handshake signals, every value marked
 * as said, chosen by a rule or assumed, and the questions still open. "Simulate it in 3D" opens the same words in
 * the Builder, where the assumptions are confirmed before the cell is built and run.
 */
import { useMemo, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { ConsoleButton } from "@/components/console/ConsoleUI";
import { cn } from "@/lib/utils";
import { briefQuestion, describeLink, FACT_SOURCE, kgText, planConveyorAutomation, proposeAutomation, STATION_WORDS } from "./conveyorAutomation";
import { Eyebrow, Readouts } from "./StudioKit";

const label = "font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground";
const TONE = { said: "border-success/50 text-success", rule: "border-border text-muted-foreground", assumed: "border-warning/60 text-warning" } as const;

/** A section that opens on demand: the summary says what is inside. */
function Fold({ title, count, children }: { title: string; count: string; children: ReactNode }) {
  return (
    <details className="group border-b border-border">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary [&::-webkit-details-marker]:hidden">
        <span className={label}>{title}</span>
        <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          {count}
          <ChevronDown className="h-3.5 w-3.5 transition-transform duration-150 group-open:rotate-180" aria-hidden />
        </span>
      </summary>
      <div className="pb-3">{children}</div>
    </details>
  );
}

export default function AutomationDesign({ text, onAsk, index, className }: { text: string; onAsk?: (question: string) => void; index?: string; className?: string }) {
  const p = useMemo(() => proposeAutomation(text), [text]);
  const belt = useMemo(() => (p.setup ? planConveyorAutomation({ setup: p.setup, destination: p.destination, robots: p.cells.length }) : null), [p]);
  const assumed = p.facts.filter((f) => f.how === "assumed").length;
  const signals = [...(belt?.io ?? []), ...p.signals];
  // Where the robot picks: a belt that stops each part, a moving belt it follows, or the machine, bin or pallet.
  const from = !p.setup
    ? (p.facts.find((f) => f.label === "Parts come from")?.value ?? "—")
    : p.setup.mode === "track"
      ? "Moving belt, conveyor tracking"
      : `Belt stops each part${belt?.estimate.indexSeconds ? ` · ${belt.estimate.indexSeconds.toFixed(1)} s index` : ""}`;

  return (
    <section aria-label="Automation design from your words" className={className}>
      <Eyebrow index={index} label="Automation design · from your words" />
      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="font-semibold leading-snug">{p.skill.name}</p>
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{p.skill.why.startsWith('"') ? `Recognised from ${p.skill.why}` : p.skill.why}</span>
      </div>

      <ul className="mt-3 border-t border-border">
        {p.cells.map((c, i) => (
          <li key={i} className="grid grid-cols-[2rem_1fr] gap-x-2 border-b border-border py-2.5 text-sm">
            <span className="font-mono text-[11px] tabular-nums text-muted-foreground">R{i + 1}</span>
            <span className="min-w-0">
              <span className="font-medium">{c.job}</span>
              <span className="text-muted-foreground">
                {" "}
                · {c.brand ?? "best-fit maker"}
                {c.cobot ? " · cobot" : ""}
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{c.stations.map((k) => STATION_WORDS[k] ?? k).join(" → ")}</span>
            </span>
          </li>
        ))}
      </ul>

      <Readouts
        // Phones show two columns: the third readout takes the whole row instead of leaving an empty cell.
        className="mt-4 [&>div:last-child:nth-child(odd)]:col-span-2 md:[&>div:last-child:nth-child(odd)]:col-span-1"
        cols={3}
        text
        items={[
          { label: "Robot payload", value: `${kgText(p.needKg * 1.25)} or more` },
          { label: "Gripper", value: p.gripper.pick },
          { label: "Picks from", value: from },
        ]}
      />

      <p className={cn(label, "mt-5")}>The process</p>
      <ol className="mt-2 space-y-1.5 text-sm">
        {p.flow.map((f, i) => (
          <li key={f} className="grid grid-cols-[2rem_1fr] gap-x-2">
            <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
            <span>{f}</span>
          </li>
        ))}
      </ol>

      {signals.length > 0 && (
        <>
          <p className={cn(label, "mt-5")}>Handshake signals</p>
          <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Signals between the conveyor, the robot and the machine">
            {signals.map((s) => (
              <li key={s.tag} title={`${s.from} → ${s.to}: ${s.text}`} className="border border-border px-1.5 py-0.5 font-mono text-[10px] tracking-[0.06em]">
                {s.tag}
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="mt-5 border-t border-border">
        <Fold title="What I understood" count={`${p.facts.length} values · ${assumed} assumed`}>
          <dl className="text-xs">
            {p.facts.map((f) => (
              <div key={f.label} className="grid grid-cols-[7.5rem_1fr_auto] items-baseline gap-2 py-1">
                <dt className="text-muted-foreground">{f.label}</dt>
                <dd className="min-w-0">{f.value}</dd>
                <span className={cn("border px-1 font-mono text-[9px] uppercase tracking-[0.1em]", TONE[f.how])}>{FACT_SOURCE[f.how]}</span>
              </div>
            ))}
          </dl>
        </Fold>
        {signals.length > 0 && (
          <Fold title="Signals, step by step" count={`${signals.length} signals`}>
            <ul className="space-y-1 text-xs">
              {signals.map((s) => (
                <li key={s.tag}>
                  <span className="font-mono text-[11px]">{s.tag}</span>{" "}
                  <span className="text-muted-foreground">
                    {s.from} → {s.to}:
                  </span>{" "}
                  {s.text}
                </li>
              ))}
            </ul>
          </Fold>
        )}
        <Fold title="Engineering rules" count={`${p.rules.length} rules`}>
          <ul className="space-y-1.5 text-xs leading-snug">
            {p.rules.map((r) => (
              <li key={r.rule}>
                <span className="font-medium">{r.rule}.</span> <span className="text-muted-foreground">{r.why}</span>
              </li>
            ))}
          </ul>
        </Fold>
      </div>

      {p.missing.length > 0 && (
        <>
          <p className={cn(label, "mt-5")}>Questions for you</p>
          <ul className="mt-2 space-y-1.5 text-sm">
            {p.missing.map((m) => (
              <li key={m.question} className="flex flex-wrap items-baseline gap-x-2">
                {onAsk ? (
                  <button
                    type="button"
                    onClick={() => onAsk(briefQuestion(m.question))}
                    className="text-left text-foreground underline decoration-border underline-offset-4 transition-colors duration-150 hover:text-primary hover:decoration-primary focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {m.question}
                  </button>
                ) : (
                  <span>{m.question}</span>
                )}
                <span className="text-xs text-muted-foreground">Using: {m.using}.</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
        <ConsoleButton to={describeLink(text)}>Simulate it in 3D</ConsoleButton>
        <p className="max-w-[44ch] text-xs text-muted-foreground">
          Opens the Builder with real robots from the marketplace{p.confirm.length ? ` · you confirm ${p.confirm.length} assumption${p.confirm.length === 1 ? "" : "s"} before it builds` : ""}.
        </p>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">Designed by the studio's automation skills from your words; nothing is invented. A planning tool: the signals are simulated, not a machine program.</p>
    </section>
  );
}
