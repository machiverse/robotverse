import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Bot, MessageSquare, Sparkles, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import LeadDialog from "@/components/leads/LeadDialog";
import { pushEvent } from "@/lib/analytics";
import { inr, type AiSolution } from "./aiSolution";
import { engineSolution } from "./solutionEngine";

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

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Sparkles className="h-5 w-5 text-primary" /> Free quick plan — no sign-in
          </h2>
          <p className="text-sm text-muted-foreground">Describe the job: the part, its weight, how many a day. You get the stations, robot types and a budget range at once.</p>
        </div>
        <Textarea rows={3} value={brief} onChange={(e) => setBrief(e.target.value)} placeholder={EXAMPLES[0]} aria-label="Describe the job to automate" />
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => run()} disabled={brief.trim().length < 8}>
            Show my free plan <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          {EXAMPLES.map((x) => (
            <button key={x} type="button" onClick={() => run(x)} className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary">
              {x.split(",")[0]}
            </button>
          ))}
        </div>
        {plan && (
          <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4" aria-live="polite">
            <div className="flex flex-wrap items-center gap-2">
              <b>{plan.title}</b>
              <Badge variant="secondary">Feasibility: {plan.feasibility}</Badge>
              <Badge variant="outline">{plan.stations.length} station{plan.stations.length === 1 ? "" : "s"}</Badge>
            </div>
            <ol className="space-y-2 text-sm">
              {plan.stations.map((s, i) => (
                <li key={`${s.name}-${i}`} className="flex gap-2">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{i + 1}</span>
                  <span>
                    <b>{s.name}</b> — <span className="text-muted-foreground">{s.equipment}</span>
                    <span className="block text-xs text-muted-foreground">
                      <Bot className="mr-1 inline h-3 w-3" />
                      {s.payload_kg ? `${s.payload_kg} kg payload` : "payload to confirm"}
                      {s.reach_mm ? ` · ${s.reach_mm} mm reach` : ""} · <Wrench className="mx-1 inline h-3 w-3" />
                      {s.tooling}
                      {s.cycle_s ? ` · about ${s.cycle_s} s a cycle` : ""}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
            {(plan.budget_inr.low || plan.budget_inr.high) && (
              <p className="text-sm">
                <b>Budget range:</b> {plan.budget_inr.low ? inr(plan.budget_inr.low) : "—"} – {plan.budget_inr.high ? inr(plan.budget_inr.high) : "—"}
                {plan.roi.payback_months ? <span className="text-muted-foreground"> · payback about {plan.roi.payback_months.replace(/\s*months?$/, "")} months</span> : null}
              </p>
            )}
            {plan.provider && (
              <div className="text-sm">
                <p className={plan.provider.pocFirst ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}>{plan.provider.pocWhy}</p>
                {plan.provider.feasibility.filter((x) => x.status !== "ok").length > 0 && (
                  <ul className="mt-1 list-disc pl-5 text-xs text-muted-foreground">
                    {plan.provider.feasibility
                      .filter((x) => x.status !== "ok")
                      .slice(0, 4)
                      .map((x) => (
                        <li key={x.factor}>
                          <b className="text-foreground">{x.factor}:</b> {x.note}
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground">A first plan from RobotVerse's built-in engine — an engineer checks it before any quote.</p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={onSignIn}>
                Sign in for the full plan, layout and 3D cell <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={() => setTalk(true)}>
                <MessageSquare className="mr-2 h-4 w-4" /> Talk to an engineer
              </Button>
              <Button variant="ghost" asChild>
                <Link to="/automation-studio/build">Build the cell yourself</Link>
              </Button>
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
      </CardContent>
    </Card>
  );
}
