import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowLeft, ArrowRight, CircleHelp, Cog, Lightbulb, Timer } from "lucide-react";
import EnhancedHeader from "@/components/EnhancedHeader";
import Footer from "@/components/Footer";
import { cn } from "@/lib/utils";
import { PROCESS_PROFILES, type ProcessKind } from "@/features/automation3d/processProfiles";
import { SKILLS } from "@/features/automation3d/robotKnowledge";
import { KIND_JOB, PLAYBOOK, PROJECT_STAGES } from "@/features/automation3d/engineerPlaybook";

const KINDS = Object.keys(PLAYBOOK) as ProcessKind[];

/** How an automation engineer thinks: project stages, and the reasoning for every kind of robot job. */
export default function AutomationPlaybookPage() {
  const [kind, setKind] = useState<ProcessKind>("welding");
  const book = PLAYBOOK[kind];
  const prof = PROCESS_PROFILES[kind];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Robot Automation Engineer's Playbook | Automation Studio | RobotVerse</title>
        <meta
          name="description"
          content="How automation engineers plan an industrial robot cell: the eight project stages, and for welding, machine tending, palletizing, grinding, painting, assembly and more — the questions, rules of thumb, equipment and mistakes to avoid."
        />
        <link rel="canonical" href="https://www.robotverse.in/automation-studio/playbook" />
      </Helmet>
      <EnhancedHeader />
      <main className="container mx-auto max-w-6xl px-4 pb-16">
        <Link to="/automation-studio" className="mt-6 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-3.5 w-3.5" /> Automation Studio
        </Link>
        <header className="pb-8 pt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Engineer's playbook</p>
          <h1 className="mt-2 max-w-[24ch] text-3xl font-bold leading-tight tracking-tight sm:text-4xl">How an automation engineer thinks</h1>
          <p className="mt-2 max-w-[60ch] text-muted-foreground">
            The way robot integrators plan a cell — from watching the job to signing it off on site. The builder uses the same reasoning for every cell you make.
          </p>
        </header>

        <section aria-labelledby="stages">
          <h2 id="stages" className="text-lg font-semibold">Eight stages of a robot project</h2>
          <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {PROJECT_STAGES.map((s, i) => (
              <li key={s.name} className="relative rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{i + 1}</span>
                  <b className="text-sm">{s.name}</b>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{s.think}</p>
                <p className="mt-3 border-t border-border pt-2 text-[11px]">
                  <span className="text-muted-foreground">Result:</span> {s.output}
                  <span className="float-right tabular-nums text-muted-foreground">{s.weeks} wk</span>
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="jobs" className="mt-12">
          <h2 id="jobs" className="text-lg font-semibold">Thinking through each job</h2>
          <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Robot job">
            {KINDS.map((k) => (
              <button
                key={k}
                role="tab"
                aria-selected={k === kind}
                onClick={() => setKind(k)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  k === kind ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:border-primary/50",
                )}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: PROCESS_PROFILES[k].color }} />
                {PROCESS_PROFILES[k].label}
              </button>
            ))}
          </div>

          <article className="mt-5 rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="max-w-[62ch]">
                <h3 className="flex items-center gap-2 text-xl font-semibold">
                  <span className="h-3 w-3 rounded-full" style={{ background: prof.color }} /> {prof.label}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">{SKILLS[kind].does} Tool: {SKILLS[kind].toolName}.</p>
                <p className="mt-3 rounded-lg bg-primary/10 px-3 py-2 text-sm font-medium">{book.key}</p>
              </div>
              <div className="rounded-xl border border-border px-4 py-3 text-center">
                <Timer className="mx-auto h-4 w-4 text-primary" />
                <p className="mt-1 text-lg font-bold tabular-nums">{book.cycle[0]}–{book.cycle[1]} s</p>
                <p className="text-[11px] text-muted-foreground">typical cycle per part</p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {(
                [
                  [CircleHelp, "Questions to ask first", book.ask],
                  [Lightbulb, "Rules of thumb", book.rules],
                  [Cog, "Equipment around the robot", book.around],
                  [AlertTriangle, "Mistakes to avoid", book.mistakes],
                ] as const
              ).map(([Icon, title, items]) => (
                <div key={title} className="rounded-xl bg-muted/40 p-4">
                  <p className="flex items-center gap-1.5 text-sm font-semibold">
                    <Icon className={cn("h-4 w-4", title.startsWith("Mistakes") ? "text-amber-500" : "text-primary")} /> {title}
                  </p>
                  <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                    {items.map((x) => (
                      <li key={x} className="flex gap-2">
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-current" />
                        {x}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <Link
              to={`/automation-studio/build#job=${encodeURIComponent(KIND_JOB[kind])}`}
              className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Build a {prof.label.toLowerCase()} cell <ArrowRight className="h-4 w-4" />
            </Link>
          </article>
        </section>

        <p className="mt-10 text-xs text-muted-foreground">
          Based on published integrator practice and standards (ISO 10218, ISO 12100, ISO 13849). Every cell is different — confirm with a site visit and a risk assessment.
        </p>
      </main>
      <Footer />
    </div>
  );
}
