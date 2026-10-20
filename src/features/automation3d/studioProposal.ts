/**
 * Automation Studio — the plan as a printable proposal (Save as PDF from the print dialog).
 * It states plainly what it is: a conceptual plan from the Studio, with example robot models,
 * which an engineer checks before any quote.
 */
import type { IndustryBlueprint, InventoryRow, ProcessCard } from "@/data/automationStudioIndustries";

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export interface ProposalInput {
  brief: string;
  industry: Pick<IndustryBlueprint, "label" | "roi">;
  processes: ProcessCard[];
  inventory: InventoryRow[];
  date?: Date;
}

/** The plan in a few lines, saved with an engineer or quote request. */
export function proposalSummary(p: ProposalInput): Record<string, unknown> {
  return {
    brief: p.brief.slice(0, 600),
    industry: p.industry.label,
    stations: p.processes.map((x, i) => `${p.inventory[i]?.station ?? x.short}: ${x.robot.model} (${x.robot.payload}, ${x.robot.reach}) with ${x.eoat.join(", ")}`),
    robots: p.inventory.map((r) => `${r.qty} × ${r.model}`),
    typicalResults: `Throughput ${p.industry.roi.throughput}, labour saving ${p.industry.roi.labor}, payback ${p.industry.roi.payback}`,
  };
}

export function proposalHtml(p: ProposalInput): string {
  const date = (p.date ?? new Date()).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const stations = p.processes
    .map(
      (x, i) => `<tr><td>${i + 1}</td><td><b>${esc(p.inventory[i]?.station ?? x.short)}</b><br><span class="sub">${esc(x.name)}</span></td>
      <td>${esc(x.robot.model)}<br><span class="sub">${esc(x.robot.payload)} · ${esc(x.robot.reach)} · ${esc(x.robot.controller)}</span></td>
      <td>${x.eoat.map(esc).join(", ")}</td><td>${esc(x.cycleTimeCurrent)} → <b>${esc(x.cycleTimeAutomated)}</b></td><td>${esc(x.safetyRiskCurrent)} → ${esc(x.safetyRiskAutomated)}</td></tr>`,
    )
    .join("");
  const robots = p.inventory.map((r) => `<tr><td>${esc(r.model)}</td><td>${esc(r.controller)}</td><td>${r.qty}</td><td>${esc(r.payload)}</td><td>${esc(r.reach)}</td></tr>`).join("");
  const roi = p.industry.roi;
  return `<!doctype html><html><head><meta charset="utf-8"><title>Automation proposal — RobotVerse</title>
<style>body{font:13px/1.5 system-ui,sans-serif;color:#0f172a;margin:32px}h1{font-size:22px;margin:0}h2{font-size:15px;margin:22px 0 8px}
.sub{color:#64748b;font-size:11px}table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid #e2e8f0;padding:6px;text-align:left;vertical-align:top}
th{font-size:11px;text-transform:uppercase;color:#475569}.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.kpi{border:1px solid #cbd5e1;border-radius:8px;padding:10px}
.kpi b{display:block;font-size:18px}.note{border-left:3px solid #f59e0b;background:#fffbeb;padding:10px 12px;margin-top:18px;font-size:12px}.brief{background:#f8fafc;border-radius:8px;padding:10px 12px;white-space:pre-wrap}</style></head><body>
<h1>Automation proposal</h1><div class="sub">RobotVerse Automation Studio · ${esc(p.industry.label)} · ${date}</div>
<h2>Your process</h2><div class="brief">${esc(p.brief || "—")}</div>
<h2>Stations and robots</h2><table><tr><th>#</th><th>Station</th><th>Example robot</th><th>End-of-arm tooling</th><th>Cycle time</th><th>Safety risk</th></tr>${stations}</table>
<h2>Robots needed</h2><table><tr><th>Model (typical)</th><th>Controller</th><th>Qty</th><th>Payload</th><th>Reach</th></tr>${robots}</table>
<h2>Typical results in this industry</h2><div class="kpis"><div class="kpi"><b>${esc(roi.throughput)}</b>throughput</div><div class="kpi"><b>${esc(roi.labor)}</b>labour saving</div>
<div class="kpi"><b>${esc(roi.payback)}</b>payback</div><div class="kpi"><b>${esc(roi.defect)}</b>defect rate</div></div>
<p class="note"><b>A conceptual plan, not an engineering design.</b> Robot models are typical examples for each station, not stock on hand; live used and new robots are on robotverse.in/robots.
Cycle times and results are industry ranges. A RobotVerse engineer checks every plan against your parts, site and ISO 10218 safety requirements before a quote.</p>
<p class="sub">RobotVerse · support@robotverse.in · WhatsApp +91 86109 25352 · www.robotverse.in</p>
<script>window.onload=()=>window.print()</script></body></html>`;
}
