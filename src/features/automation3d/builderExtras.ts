// Pro tools for the robot cell builder: starter cells, best-fit suggestions, cycle-time breakdown,
// budget & payback, share links and a printable report.
import { processKind } from "./processProfiles";
import { buildBom, payback, inr, type Bom } from "./solutionCost";
import type { LinePlan } from "./robotKnowledge";
import type { Choice } from "./EquipmentPicker";
import {
  matchMarketRobots, matchMarketTools, matchOemRobots, matchOemTools,
  type DirRobot, type DirTool, type Match, type StationNeed,
} from "./equipmentMatch";

/* ---------------------------------------------------------- starter cells */

export const STARTERS: { id: string; name: string; what: string; jobs: string[] }[] = [
  { id: "weld", name: "Welding cell", what: "MIG/MAG welding on a fixture table", jobs: ["MIG/MAG Welding"] },
  { id: "weld-pal", name: "Weld & palletize", what: "Weld, then stack finished parts", jobs: ["MIG/MAG Welding", "Palletizing"] },
  { id: "cnc", name: "CNC machine tending", what: "Load and unload a CNC machine", jobs: ["CNC Machining"] },
  { id: "pack", name: "Pick & pack", what: "Pick from conveyor, pack into cartons", jobs: ["Loading & Unloading", "Packing & Box Forming"] },
  { id: "pal", name: "End-of-line palletizing", what: "Stack cartons or bags on pallets", jobs: ["Palletizing"] },
  { id: "finish", name: "Grind & polish", what: "Remove weld spatter, then polish", jobs: ["Grinding & Surface Prep", "Polishing"] },
];

/* --------------------------------------------------------- best-fit picks */

export interface Raw {
  dr: DirRobot[];
  dt: DirTool[];
  mr: Record<string, unknown>[];
  mt: Record<string, unknown>[];
}
const CELL_REACH_MM = 1400;
const NOT_ON_ARM = /cleaning|reamer|station|power source|feeder|proportioner|controller/i;

/** The best robot and tool for a job: listed on the marketplace first, else from the Directory. */
export function suggest(job: string, needKg: number, raw: Raw, cobot = false): Choice {
  const kind = processKind({ name: job });
  // The 3D cell's stations sit about 1.4 m from the robot, so suggested arms must reach that far.
  // Payload with a 25% margin for acceleration and inertia, as an integrator sizes it.
  const need: StationNeed = { kind, payload: Math.ceil(needKg * 1.25), reach: CELL_REACH_MM, cobot, robotType: null };
  const robot = matchMarketRobots(need, raw.mr, 1)[0] ?? matchOemRobots(need, raw.dr, 1)[0];
  const tool = [...matchMarketTools(need, raw.mt, job, 3), ...matchOemTools(need, raw.dt, job, 6)].find((t) => !NOT_ON_ARM.test(t.name));
  return { ...(robot ? { robot } : {}), ...(tool ? { tool } : {}) };
}

/* ------------------------------------------------------ cycle breakdown */

export interface StepTime {
  label: string;
  action: string;
  seconds: number;
}
/** Records how long each robot spends on each step of its program, cycle by cycle. */
export class CycleTracker {
  private cur: { idx: number; start: number; times: number[] }[] = [];
  last: (StepTime[] | null)[] = [];
  reset(n: number) {
    this.cur = Array.from({ length: n }, () => ({ idx: -1, start: 0, times: [] }));
    this.last = Array.from({ length: n }, () => null);
  }
  /** Feed one simulator update. Returns true when a cycle finished (breakdown changed). */
  update(simTime: number, cells: { stepIndex: number }[] | undefined, steps: { label: string; action: string }[][]): boolean {
    if (!cells) return false;
    let changed = false;
    cells.forEach((c, i) => {
      const t = this.cur[i];
      if (!t || !steps[i]?.length) return;
      if (t.idx === -1) {
        t.idx = c.stepIndex;
        t.start = simTime;
        return;
      }
      if (c.stepIndex === t.idx) return;
      t.times[t.idx] = (t.times[t.idx] ?? 0) + Math.max(0, simTime - t.start);
      // Wrapped back to the first step: one full cycle measured.
      if (c.stepIndex < t.idx) {
        if (t.times.filter((x) => x != null).length >= Math.min(steps[i].length, 2)) {
          this.last[i] = steps[i].map((s, k) => ({ label: s.label, action: s.action, seconds: t.times[k] ?? 0 }));
          changed = true;
        }
        t.times = [];
      }
      t.idx = c.stepIndex;
      t.start = simTime;
    });
    return changed;
  }
}

/** Step kinds grouped for the breakdown bar. */
export const STEP_GROUP = (action: string): { key: string; label: string; color: string } => {
  if (/pick/.test(action)) return { key: "pick", label: "Pick", color: "#60a5fa" };
  if (/place/.test(action)) return { key: "place", label: "Place", color: "#a78bfa" };
  if (/weld|grind|polish|paint|spray|dispens|glue|process|screw|assemble|fill|cap|label|seal|deburr/.test(action))
    return { key: "work", label: "Process", color: "#f97316" };
  if (/inspect/.test(action)) return { key: "inspect", label: "Inspect", color: "#22c55e" };
  return { key: "move", label: "Move", color: "#94a3b8" };
};

/* ------------------------------------------------------ budget & payback */

export interface Budget {
  bom: Bom;
  /** Marketplace prices the user picked, replacing the estimate for that item. */
  listed: number;
}
/** Indicative budget from the cost model, sized for the robots the user chose. */
export function budgetFor(plan: LinePlan, choices: Choice[]): Budget {
  const sized: LinePlan = {
    ...plan,
    robots: plan.robots.map((r, i) => {
      const p = choices[i]?.robot?.payload;
      return { ...r, minPayload: p && p > 0 ? p : r.minPayload };
    }),
  };
  const bom = buildBom(sized, []);
  const listed = choices.flatMap((c) => Object.values(c).filter(Boolean) as Match[]).filter((m) => m.source === "market" && m.price).reduce((s, m) => s + (m.price ?? 0), 0);
  return { bom, listed };
}

export function roi(total: [number, number], operators: number, shifts: number, monthlyWage: number) {
  const p = payback(total, operators, shifts, monthlyWage);
  const fiveYear = p.annualSaving * 5;
  return { ...p, fiveYear: [fiveYear - total[1], fiveYear - total[0]] as [number, number] };
}

/* ----------------------------------------------------------- share link */

type SharedCell = { j: string; u?: string; f?: boolean; s: Record<string, string> };
/** Compact, URL-safe description of the line (job, safety, and source:id of each part). */
export function encodeLine(cells: { job: string; custom?: string; fenced?: boolean; choice: Choice }[]): string {
  const data: SharedCell[] = cells.map((c) => ({
    j: c.job, u: c.custom, f: c.fenced,
    s: Object.fromEntries(Object.entries(c.choice).filter(([, m]) => m).map(([k, m]) => [k, `${(m as Match).source}:${(m as Match).id}`])),
  }));
  return btoa(unescape(encodeURIComponent(JSON.stringify(data)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export function decodeLine(code: string): SharedCell[] | null {
  try {
    const v = JSON.parse(decodeURIComponent(escape(atob(code.replace(/-/g, "+").replace(/_/g, "/")))));
    return Array.isArray(v) ? v.slice(0, 6) : null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------ printable report */

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export function reportHtml(r: {
  cells: { job: string; choice: Choice; fenced?: boolean; cycle: number | null; checks: { state: string; label: string; detail: string }[]; thoughts?: { step: string; thought: string }[] }[];
  bottleneck: number | null;
  perHour: number | null;
  budget: Budget | null;
  roi: ReturnType<typeof roi> | null;
  inputs: { operators: number; shifts: number; wage: number };
}) {
  const rng = (v: [number, number]) => `${inr(v[0])} – ${inr(v[1])}`;
  const rows = r.cells
    .map(
      (c, i) => `<tr><td>${i + 1}</td><td>${esc(c.job)}</td><td>${esc(c.choice.robot?.name ?? "—")}</td><td>${esc(c.choice.tool?.name ?? "—")}</td>
      <td>${c.fenced === undefined ? "Not chosen" : c.fenced ? "Fenced" : "Open (cobot)"}</td><td>${c.cycle ? c.cycle.toFixed(1) + " s" : "—"}</td>
      <td>${c.checks.filter((x) => x.state !== "ok").map((x) => `${esc(x.label)}: ${esc(x.detail)}`).join("<br>") || "All checks passed"}</td></tr>`,
    )
    .join("");
  const reasoning = r.cells
    .map((c, i) => (c.thoughts?.length ? `<h3>Cell ${i + 1} · ${esc(c.job)}</h3><ol>${c.thoughts.map((t) => `<li><b>${esc(t.step)}.</b> ${esc(t.thought)}</li>`).join("")}</ol>` : ""))
    .join("");
  const bom = r.budget
    ? r.budget.bom.lines.map((l) => `<tr><td>${esc(l.item)}</td><td>${esc(l.scope)}</td><td>${l.qty}</td><td>${rng(l.total)}</td></tr>`).join("")
    : "";
  return `<!doctype html><html><head><meta charset="utf-8"><title>Robot cell report — RobotVerse</title>
<style>body{font:13px/1.5 system-ui,sans-serif;color:#0f172a;margin:32px}h1{font-size:22px;margin:0}h2{font-size:15px;margin:24px 0 8px}
.sub{color:#475569}.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:16px}.kpi{border:1px solid #cbd5e1;border-radius:8px;padding:10px}
.kpi b{display:block;font-size:20px}table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid #e2e8f0;padding:6px;text-align:left;vertical-align:top}
h3{font-size:13px;margin:12px 0 4px}ol{margin:0;padding-left:20px}th{font-size:11px;text-transform:uppercase;color:#475569}.note{color:#64748b;font-size:11px;margin-top:16px}</style></head><body>
<h1>Robot cell report</h1><div class="sub">RobotVerse Automation Studio · ${new Date().toLocaleDateString("en-IN")}</div>
<div class="kpis"><div class="kpi"><b>${r.cells.length}</b>robots</div><div class="kpi"><b>${r.bottleneck ? r.bottleneck.toFixed(1) + " s" : "—"}</b>line cycle</div>
<div class="kpi"><b>${r.perHour ?? "—"}</b>parts / hour</div><div class="kpi"><b>${r.perHour ? r.perHour * 8 : "—"}</b>parts / 8-h shift</div></div>
<h2>Cells</h2><table><tr><th>#</th><th>Job</th><th>Robot</th><th>Tool</th><th>Safety</th><th>Cycle</th><th>Checks</th></tr>${rows}</table>
${reasoning ? `<h2>Engineer's reasoning</h2>${reasoning}` : ""}
${r.budget ? `<h2>Indicative budget</h2><table><tr><th>Item</th><th>For</th><th>Qty</th><th>Estimate</th></tr>${bom}
<tr><th colspan="3">Total</th><th>${rng(r.budget.bom.total)}</th></tr></table>` : ""}
${r.roi ? `<h2>Payback</h2><p>${r.inputs.operators} operator(s) × ${r.inputs.shifts} shift(s) at ${inr(r.inputs.wage)} per month saves about <b>${inr(r.roi.annualSaving)}</b> a year.
Payback <b>${r.roi.months[0].toFixed(0)}–${r.roi.months[1].toFixed(0)} months</b>; ${r.roi.fiveYear[1] <= 0 ? "it does not pay back within five years at these numbers" : `five-year net saving up to ${inr(r.roi.fiveYear[1])}`}.</p>` : ""}
<p class="note">Cycle times come from the 3D simulation; prices are indicative Indian market ranges. Confirm with supplier quotes and a site visit. support@robotverse.in</p>
<script>window.onload=()=>window.print()</script></body></html>`;
}
