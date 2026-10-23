import { useState } from "react";
import { Link } from "react-router-dom";
import { Textarea } from "@/components/ui/textarea";
import { BevelBox } from "@/components/console/ConsoleUI";
import LeadDialog from "@/components/leads/LeadDialog";
import { pushEvent } from "@/lib/analytics";
import { inr, type AiSolution } from "./aiSolution";
import { engineSolution } from "./solutionEngine";
import { Eyebrow, KitButton, Readouts } from "./StudioKit";

const EXAMPLES = [
  "Weld 12 kg steel brackets with MIG, 2 shifts, 400 parts a day",
  "Load and unload a CNC lathe with 5 kg shafts",
  "Palletize 25 kg cartons coming on a conveyor",
];

/**
 * The free plan before any sign-in: type the job, see the stations, robot types and budget
 * range at once from the built-in engine. Signing in unlocks the full plan; an engineer is one
 * click away.
 */
export default function QuickPlan({ onSignIn }: { onSignIn: () => void }) {
  const [brief, setBrief] = useState("");
  const [plan, setPlan] = useState<AiSolution | null>(null);
  const [talk, setTalk] = useState(false);

  const run = (text = brief) => {
    if (text.trim().length < 8) return;
    setBrief(text);
    const solution = engineSolution(text);
    setPlan(solution);
    pushEvent("studio_quick_plan", { stations: solution.stations.length });
  };

  const out = plan?.provider?.feasibility.filter((x) => x.status !== "ok").slice(0, 3) ?? [];

  return (
    <BevelBox cut={14} innerClassName="p-5 sm:p-6">
      <Eyebrow label="Free quick plan · no sign-in" />
      <label htmlFor="quick-plan-brief" className="mt-4 block text-lg font-semibold leading-snug">
        What does the job look like today?
      </label>
      <p className="mt-1 text-sm text-muted-foreground">The part, its weight, the steps and how many a day.</p>
      <Textarea
        id="quick-plan-brief"
        rows={3}
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
        placeholder={EXAMPLES[0]}
        aria-label="Describe the job to automate"
        className="mt-3 resize-none rounded-none text-base sm:text-sm"
      />
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-3">
        <KitButton onClick={() => run()} disabled={brief.trim().length < 8}>
          Show my free plan
        </KitButton>
        <p className="text-xs text-muted-foreground">
          Or try:{" "}
          {EXAMPLES.map((x, i) => (
            <span key={x}>
              {i > 0 && " · "}
              <button type="button" onClick={() => run(x)} className="text-foreground underline decoration-border underline-offset-4 transition-colors duration-150 hover:text-primary hover:decoration-primary focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                {x.split(",")[0]}
              </button>
            </span>
          ))}
        </p>
      </div>

      {plan && (
        <div className="mt-6 border-t border-border pt-5" aria-live="polite">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-semibold leading-snug">{plan.title}</p>
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Feasibility {plan.feasibility}</span>
          </div>
          <Readouts
            className="mt-3"
            cols={3}
            text
            items={[
              { label: "Stations", value: `${plan.stations.length}` },
              { label: "Budget", value: plan.budget_inr.low || plan.budget_inr.high ? `${plan.budget_inr.low ? inr(plan.budget_inr.low) : "—"} – ${plan.budget_inr.high ? inr(plan.budget_inr.high) : "—"}` : "On quotation" },
              { label: "Payback", value: plan.roi.payback_months ? `${plan.roi.payback_months.replace(/\s*months?$/, "")} months` : "—" },
            ]}
          />
          <ol className="mt-4 border-t border-border">
            {plan.stations.map((s, i) => (
              <li key={`${s.name}-${i}`} className="grid grid-cols-[2rem_1fr] gap-x-2 border-b border-border py-2.5 text-sm">
                <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                <span className="min-w-0">
                  <span className="font-medium">{s.name}</span>
                  <span className="text-muted-foreground"> — {s.equipment}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {s.payload_kg ? `${s.payload_kg} kg payload` : "payload to confirm"}
                    {s.reach_mm ? ` · ${s.reach_mm} mm reach` : ""} · {s.tooling}
                    {s.cycle_s ? ` · about ${s.cycle_s} s a cycle` : ""}
                  </span>
                </span>
              </li>
            ))}
          </ol>
          {plan.thinking && (
            <dl className="mt-4 space-y-2 text-sm">
              <div className="grid gap-1 sm:grid-cols-[7.5rem_1fr]">
                <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Best approach</dt>
                <dd>
                  <span className="font-medium">{plan.thinking.decision.pick}</span> <span className="text-muted-foreground">— {plan.thinking.decision.why}</span>
                </dd>
              </div>
              {plan.thinking.fmea[0] && (
                <div className="grid gap-1 sm:grid-cols-[7.5rem_1fr]">
                  <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Biggest risk</dt>
                  <dd>
                    <span className="font-medium">{plan.thinking.fmea[0].mode}</span> <span className="text-muted-foreground">— {plan.thinking.fmea[0].action}</span>
                  </dd>
                </div>
              )}
            </dl>
          )}
          {plan.provider && (
            <div className="mt-4 text-sm">
              <p className={plan.provider.pocFirst ? "text-warning" : "text-muted-foreground"}>{plan.provider.pocWhy}</p>
              {out.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {out.map((x) => (
                    <li key={x.factor} className="flex gap-2">
                      <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 bg-warning" />
                      <span>
                        <span className="text-foreground">{x.factor}:</span> {x.note}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <p className="mt-4 text-xs text-muted-foreground">A first plan from RobotVerse's built-in engine — an engineer checks it before any quote.</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <KitButton onClick={onSignIn}>Sign in for the full plan and 3D line</KitButton>
            <KitButton variant="outline" onClick={() => setTalk(true)}>
              Talk to an engineer
            </KitButton>
            <Link to="/automation-studio/build" className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground underline-offset-4 transition-colors duration-150 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              Build it yourself
            </Link>
          </div>
        </div>
      )}
        <LeadDialog
          open={talk}
          onOpenChange={setTalk}
          kind="engineer"
          source="automation-studio-quick-plan"
          title="Talk to an automation engineer"
          intro="An automation engineer reviews this plan with you on WhatsApp or a call — free."
          item={plan ? { type: "automation_plan", name: plan.title } : undefined}
          details={
            plan
              ? {
                  brief: brief.slice(0, 600),
                  stations: plan.stations.map((s) => `${s.name}: ${s.equipment}, ${s.payload_kg ?? "?"} kg, ${s.tooling}`),
                  budget: `${plan.budget_inr.low ?? "?"} – ${plan.budget_inr.high ?? "?"} INR`,
                }
              : undefined
          }
          action="Request a call"
        />
    </BevelBox>
  );
}
