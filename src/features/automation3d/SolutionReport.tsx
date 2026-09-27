import { useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bot, Download, FileSpreadsheet, Mail, Printer, Repeat, Wrench } from "lucide-react";
import { PROCESS_PROFILES } from "./processProfiles";
import type { DirectoryRobot, LinePlan } from "./robotKnowledge";
import { buildBom, inr, inrRange, type BomLine } from "./solutionCost";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: LinePlan;
  catalog: DirectoryRobot[];
  description?: string;
  /** From the running simulation */
  lastCycle?: number | null;
  unreachable?: string[];
}

const PRINT_CSS = `
@media print {
  html, body { overflow: visible !important; height: auto !important; background: #fff !important; }
  body * { visibility: hidden !important; }
  #rv-solution-report, #rv-solution-report * { visibility: visible !important; }
  #rv-solution-report {
    position: absolute !important; left: 0 !important; top: 0 !important; transform: none !important;
    width: 100% !important; max-width: none !important; max-height: none !important; overflow: visible !important;
    border: 0 !important; box-shadow: none !important; background: #fff !important; color: #111 !important;
  }
  #rv-solution-report .rv-no-print { display: none !important; }
  #rv-solution-report, #rv-solution-report * { color: #111 !important; border-color: #d4d4d8 !important; }
  #rv-solution-report div, #rv-solution-report tr, #rv-solution-report p, #rv-solution-report section { background-color: transparent !important; }
  #rv-solution-report tfoot tr:last-child, #rv-solution-report tbody tr.bg-muted\/40 { background-color: #f1f5f9 !important; }
  #rv-solution-report section { break-inside: avoid; }
}`;

const Section = ({ n, title, children }: { n: number; title: string; children: React.ReactNode }) => (
  <section className="space-y-3">
    <h3 className="flex items-center gap-2 border-b border-border pb-1.5 text-base font-semibold">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">{n}</span>
      {title}
    </h3>
    {children}
  </section>
);

export default function SolutionReport({ open, onOpenChange, plan, catalog, description, lastCycle, unreachable = [] }: Props) {
  const bom = useMemo(() => buildBom(plan, catalog), [plan, catalog]);
  const perHour = lastCycle ? Math.floor(3600 / lastCycle) : null;
  const taskCount = plan.robots.reduce((n, r) => n + r.tasks.length, 0);
  const date = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  const groups = useMemo(() => {
    const m = new Map<string, BomLine[]>();
    bom.lines.forEach((l) => m.set(l.scope, [...(m.get(l.scope) || []), l]));
    return [...m.entries()];
  }, [bom]);

  function downloadExcel() {
    import("xlsx").then((XLSX) => {
      const wb = XLSX.utils.book_new();
      const summary = [
        ["RobotVerse Automation Solution Report", ""],
        ["Date", date],
        ["Requirement", description || plan.robots.flatMap((r) => r.tasks.map((t) => t.name)).join(", ")],
        ["Tasks automated", taskCount],
        ["Robots", plan.robots.length],
        ["Line cycle time (s)", lastCycle ? Number(lastCycle.toFixed(1)) : "Run the 3D simulation"],
        ["Throughput (parts/hour)", perHour ?? "Run the 3D simulation"],
        ["Budget low (INR)", bom.total[0]],
        ["Budget high (INR)", bom.total[1]],
        ["Note", "Indicative ex-works prices before GST. Final price depends on brand, parts and site."],
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), "Summary");
      const robots = bom.robots.map(({ robot, models, eoat, cost }) => ({
        Robot: robot.title,
        Tasks: robot.tasks.map((t) => t.name).join(" + "),
        Multitask: robot.multitask ? "Yes" : "No",
        "Tool changer": robot.toolChanger ? "Yes" : "No",
        "Required payload (kg)": robot.minPayload,
        "Suggested models": models.map((m) => `${m.n} (${m.p} kg, ${m.r} mm)`).join("; "),
        "End-of-arm tooling": eoat.join("; "),
        "Cycle steps": robot.steps.map((s) => s.label).join(" > "),
        "Cost low (INR)": cost[0],
        "Cost high (INR)": cost[1],
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(robots), "Robots");
      const lines: Record<string, string | number>[] = bom.lines.map((l) => ({
        For: l.scope,
        Category: l.category,
        Item: l.item,
        Note: l.note || "",
        Qty: l.qty,
        "Unit low (INR)": l.unit[0],
        "Unit high (INR)": l.unit[1],
        "Total low (INR)": l.total[0],
        "Total high (INR)": l.total[1],
      }));
      lines.push({ Item: "TOTAL", "Total low (INR)": bom.total[0], "Total high (INR)": bom.total[1] });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(lines), "Bill of Materials");
      XLSX.writeFile(wb, "RobotVerse_Automation_Solution.xlsx");
    });
  }

  const mailto = useMemo(() => {
    const body = [
      "Hello RobotVerse team,",
      "",
      "Please send a quotation for this automation solution:",
      description ? `Requirement: ${description}` : "",
      ...bom.robots.map(
        ({ robot, models }) => `${robot.title}: ${robot.tasks.map((t) => t.name).join(" + ")}${models[0] ? ` (e.g. ${models[0].n})` : ""}`,
      ),
      `Indicative budget: ${inrRange(bom.total)}`,
    ]
      .filter(Boolean)
      .join("\n");
    return `mailto:support@robotverse.in?subject=${encodeURIComponent("Automation solution quotation request")}&body=${encodeURIComponent(body)}`;
  }, [bom, description]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent id="rv-solution-report" className="max-h-[92vh] max-w-5xl overflow-y-auto p-0">
        <style>{PRINT_CSS}</style>
        <div className="space-y-6 p-6">
          <DialogHeader className="space-y-1 text-left">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">RobotVerse Automation Studio · {date}</p>
            <DialogTitle className="text-2xl">Automation Solution Report</DialogTitle>
            <DialogDescription>
              Complete robot solution for your process: tasks, robots, end-of-arm tooling, equipment and an indicative budget.
            </DialogDescription>
            <div className="rv-no-print flex flex-wrap gap-2 pt-2">
              <Button size="sm" onClick={() => window.print()}>
                <Printer className="mr-2 h-4 w-4" /> Print / Save as PDF
              </Button>
              <Button size="sm" variant="outline" onClick={downloadExcel}>
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Download Excel
              </Button>
              <Button size="sm" variant="outline" asChild>
                <a href={mailto}>
                  <Mail className="mr-2 h-4 w-4" /> Request quotation
                </a>
              </Button>
            </div>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              [String(taskCount), "Tasks automated"],
              [String(plan.robots.length), plan.robots.length > 1 ? "Robots in the line" : "Robot"],
              [perHour ? `${perHour}/h` : "–", perHour ? `Throughput (${lastCycle!.toFixed(1)} s cycle)` : "Throughput: run the simulation"],
              [`${inr(bom.total[0])}+`, "Indicative budget from"],
            ].map(([v, l]) => (
              <div key={l} className="rounded-lg border border-border bg-muted/30 p-3">
                <b className="block text-xl tabular-nums">{v}</b>
                <span className="text-xs text-muted-foreground">{l}</span>
              </div>
            ))}
          </div>

          {description && (
            <Section n={1} title="Your requirement">
              <p className="rounded-md border-l-4 border-primary bg-muted/30 p-3 text-sm italic">{description}</p>
            </Section>
          )}

          <Section n={description ? 2 : 1} title="Tasks found and how a robot does them">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="py-1.5 pr-3">#</th>
                    <th className="py-1.5 pr-3">Task</th>
                    <th className="py-1.5 pr-3">Type</th>
                    <th className="py-1.5 pr-3">Robot</th>
                    <th className="py-1.5">What the robot does</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.robots.flatMap((r) =>
                    r.tasks.map((t) => ({ r, t })),
                  ).map(({ r, t }, i) => (
                    <tr key={i} className="border-t border-border align-top">
                      <td className="py-1.5 pr-3 tabular-nums text-muted-foreground">{i + 1}</td>
                      <td className="py-1.5 pr-3 font-medium">{t.name}</td>
                      <td className="py-1.5 pr-3">
                        <span className="rounded px-1.5 py-0.5 text-xs" style={{ background: `${PROCESS_PROFILES[t.kind].color}22`, color: PROCESS_PROFILES[t.kind].color }}>
                          {PROCESS_PROFILES[t.kind].label}
                        </span>
                      </td>
                      <td className="whitespace-nowrap py-1.5 pr-3">{r.title}</td>
                      <td className="py-1.5 text-muted-foreground">{t.skill.does}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section n={description ? 3 : 2} title="Robot solution">
            <div className="grid gap-3 md:grid-cols-2">
              {bom.robots.map(({ robot, models, eoat, cost }) => (
                <div key={robot.title} className="space-y-2 rounded-lg border border-border p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Bot className="h-4 w-4 text-primary" />
                    <b>{robot.title}</b>
                    {robot.multitask && (
                      <Badge variant="secondary" className="gap-1 text-[10px]">
                        <Repeat className="h-3 w-3" /> Multitask
                      </Badge>
                    )}
                    {robot.toolChanger && (
                      <Badge variant="outline" className="text-[10px]">
                        Tool changer
                      </Badge>
                    )}
                    <span className="ml-auto text-xs font-semibold tabular-nums">{inrRange(cost)}</span>
                  </div>
                  <p>{robot.tasks.map((t) => t.name).join(" + ")}</p>
                  <p className="text-xs text-muted-foreground">
                    Needs: {robot.apps.join(", ")} · payload ≥ {robot.minPayload} kg
                  </p>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">Suggested robots (from the Directory)</p>
                    {models.length ? (
                      <ul className="list-inside list-disc text-xs">
                        {models.map((m) => (
                          <li key={m.id}>
                            {m.n}: {m.p} kg, {m.r} mm reach
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs">A {robot.minPayload} kg class robot.</p>
                    )}
                  </div>
                  <p className="flex gap-1 text-xs">
                    <Wrench className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                    <span>
                      <span className="font-semibold text-muted-foreground">End-of-arm tooling: </span>
                      {eoat.join(", ")}
                      {robot.toolChanger ? ", automatic tool changer" : ""}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold">Cycle: </span>
                    {robot.steps.map((s) => s.label).join(" → ")}
                  </p>
                </div>
              ))}
            </div>
          </Section>

          <Section n={description ? 4 : 3} title="Bill of materials and approximate price (INR)">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="py-1.5 pr-3">Item</th>
                    <th className="py-1.5 pr-3">Category</th>
                    <th className="py-1.5 pr-3 text-right">Qty</th>
                    <th className="py-1.5 text-right">Approx. price</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map(([scope, lines]) => (
                    <FragmentRows key={scope} scope={scope} lines={lines} />
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border">
                    <td className="py-2 pr-3 font-semibold" colSpan={3}>
                      Equipment subtotal
                    </td>
                    <td className="py-2 text-right tabular-nums">{inrRange(bom.hardware)}</td>
                  </tr>
                  <tr className="bg-primary/10">
                    <td className="px-2 py-2 text-base font-bold" colSpan={3}>
                      Total indicative budget
                    </td>
                    <td className="px-2 py-2 text-right text-base font-bold tabular-nums">{inrRange(bom.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Section>

          <Section n={description ? 5 : 4} title="Simulation check and next steps">
            <ul className="list-inside list-disc space-y-1 text-sm">
              <li>
                3D simulation: {plan.robots.length} robot cell{plan.robots.length > 1 ? "s" : ""} linked by conveyors;{" "}
                {unreachable.length ? `check reach for ${unreachable.join(", ")}` : "every station is within each robot's reach"}.
              </li>
              <li>Prices are indicative ex-works estimates before GST, for planning only. The final price depends on brand, part size, cycle time and site.</li>
              <li>Next steps: site survey and part samples, cycle-time trial, layout drawing and a fixed quotation.</li>
              <li>
                Contact <a className="text-primary underline" href={mailto}>support@robotverse.in</a> to get quotations from verified integrators.
              </li>
            </ul>
          </Section>

          <p className="rv-no-print flex items-center gap-1.5 text-xs text-muted-foreground">
            <Download className="h-3.5 w-3.5" /> Use “Print / Save as PDF” and choose “Save as PDF” to keep a copy.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FragmentRows({ scope, lines }: { scope: string; lines: BomLine[] }) {
  const sub: [number, number] = [lines.reduce((n, l) => n + l.total[0], 0), lines.reduce((n, l) => n + l.total[1], 0)];
  return (
    <>
      <tr className="bg-muted/40">
        <td className="px-2 py-1.5 font-semibold" colSpan={3}>
          {scope === "Line" ? "Line equipment and services" : scope}
        </td>
        <td className="px-2 py-1.5 text-right text-xs font-semibold tabular-nums">{inrRange(sub)}</td>
      </tr>
      {lines.map((l, i) => (
        <tr key={i} className="border-t border-border align-top">
          <td className="py-1.5 pr-3">
            {l.item}
            {l.note && <span className="block text-xs text-muted-foreground">{l.note}</span>}
          </td>
          <td className="py-1.5 pr-3 text-xs text-muted-foreground">{l.category}</td>
          <td className="py-1.5 pr-3 text-right tabular-nums">{l.qty}</td>
          <td className="whitespace-nowrap py-1.5 text-right tabular-nums">{inrRange(l.total)}</td>
        </tr>
      ))}
    </>
  );
}
