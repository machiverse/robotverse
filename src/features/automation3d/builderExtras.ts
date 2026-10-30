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
import { eoatKind } from "./robotSim.js";
import type { StationKey } from "./cellProgram";
import { gearFor, isCobotName } from "./jobGear";
import type { AutomationPlan } from "./conveyorAutomation";

/* ---------------------------------------------------------- starter cells */

/** One cell of a ready-made line: its equipment, and whether the robot swaps a gripper and a process tool. */
export interface StarterCell {
  stations: StationKey[];
  /** Gripper on the tool stand + tool changer: the robot loads parts itself, then changes to the process tool. */
  swap?: boolean;
  /** Conveyor automation on the first cell: the product on the belt and how the robot picks it. */
  conveyor?: { product: string; mode: "index" | "track" };
}
export const STARTERS: { id: string; name: string; what: string; jobs: string[]; cells: StarterCell[] }[] = [
  { id: "conveyor", name: "Conveyor pick & place", what: "Photo-eye stops each casting, the robot picks it and stacks it on a pallet", jobs: ["Loading & Unloading"], cells: [{ stations: ["conveyor", "pallet"], conveyor: { product: "casting", mode: "index" } }] },
  { id: "weld", name: "Welding cell", what: "Gripper loads the fixture, tool changer swaps to the MIG torch", jobs: ["MIG/MAG Welding"], cells: [{ stations: ["conveyor", "weld", "pallet", "rack"], swap: true }] },
  { id: "weld-pal", name: "Weld & palletize", what: "Weld, pass on the outfeed, stack on the pallet", jobs: ["MIG/MAG Welding", "Palletizing"], cells: [{ stations: ["conveyor", "weld", "out", "rack"], swap: true }, { stations: ["pallet"] }] },
  { id: "cnc", name: "CNC machine tending", what: "Load and unload a CNC machine", jobs: ["CNC Machining"], cells: [{ stations: ["conveyor", "cnc", "pallet"] }] },
  { id: "pack", name: "Pick & pack", what: "Pick from conveyor, pack into cartons", jobs: ["Loading & Unloading", "Packing & Box Forming"], cells: [{ stations: ["conveyor", "out"] }, { stations: ["carton"] }] },
  { id: "mould", name: "Moulding machine tending", what: "Take parts out when the mould opens, stack them", jobs: ["Injection Moulding Tending"], cells: [{ stations: ["mould", "pallet"] }] },
  { id: "bin", name: "Bin picking", what: "3D camera finds loose parts, robot feeds the outfeed", jobs: ["Bin Picking"], cells: [{ stations: ["bin", "out"] }] },
  { id: "pal", name: "End-of-line palletizing", what: "Stack cartons or bags on pallets", jobs: ["Palletizing"], cells: [{ stations: ["conveyor", "pallet"] }] },
  { id: "finish", name: "Grind & polish", what: "Grind, pass on, polish — gripper and spindle on tool changers", jobs: ["Grinding & Surface Prep", "Polishing"], cells: [{ stations: ["conveyor", "table", "out", "rack"], swap: true }, { stations: ["table", "pallet", "rack"], swap: true }] },
];

/* --------------------------------------------------------- best-fit picks */

export interface Raw {
  dr: DirRobot[];
  dt: DirTool[];
  mr: Record<string, unknown>[];
  mt: Record<string, unknown>[];
}
const CELL_REACH_MM = 1400;
/** A robot is a cobot when its maker lists it as collaborative, or by its well-known name. */
export const isCobotMatch = (m?: Match) => !!m && (m.reasons.includes("Collaborative") || isCobotName(`${m.type} ${m.name}`));
/** Brand, model and class of the robot a tool goes on, so a tool made for one robot is offered only for it. */
const armOf = (m?: Match) => (m ? `${m.brand} ${m.name}${isCobotMatch(m) ? " collaborative" : ""}` : undefined);

/**
 * The best robot and tool for a job: listed on the marketplace first, else from the Directory.
 * The robot is chosen for the job (a spot-welding robot for spot welding, a palletizer for stacking),
 * then the tool for the job and for that robot (the family the job's program uses, sized for the part).
 */
export function suggest(job: string, needKg: number, raw: Raw, cobot = false): Choice {
  const kind = processKind({ name: job });
  // The 3D cell's stations sit about 1.4 m from the robot, so suggested arms must reach that far.
  // Light jobs get a 25% payload margin for acceleration and inertia; heavy jobs (100 kg and up) are
  // already sized as a robot class with the gripper or gun included.
  const payload = needKg >= 100 ? Math.ceil(needKg) : Math.ceil(needKg * 1.25);
  const need: StationNeed = { kind, job, payload, reach: CELL_REACH_MM, cobot: cobot || !!gearFor(job, kind).robot.cobot, robotType: null };
  const robot = matchMarketRobots(need, raw.mr, 1)[0] ?? matchOemRobots(need, raw.dr, 1)[0];
  const onArm = { ...need, arm: armOf(robot), cobot: need.cobot || isCobotMatch(robot) };
  // The job already chose the tool family and head (gearFor); its name is not a hint on top.
  const tool = matchMarketTools(onArm, raw.mt, "", 1)[0] ?? matchOemTools(onArm, raw.dt, "", 1)[0];
  return { ...(robot ? { robot } : {}), ...(tool ? { tool } : {}) };
}

const CHANGER = /tool ?changer|quick ?change|\bqc-?\d|\bqcs?\b/i;
/**
 * A gripper and a tool changer for a robot that loads its own parts and then swaps to its process
 * tool: a gripper sized for the part and made for that robot, and the robot-side half of a changer
 * of its class (cobot plug-and-play or industrial). Marketplace listings first, else the Directory.
 */
export function suggestSwap(raw: Raw, robot?: Match, partKg = 8): { tool2?: Match; changer?: Match } {
  const cobot = isCobotMatch(robot);
  const need: StationNeed = { kind: "handling", job: "Loading & Unloading", payload: Math.ceil(partKg), reach: CELL_REACH_MM, cobot, robotType: null, arm: armOf(robot) };
  const tool2 = [...matchMarketTools(need, raw.mt, "", 6), ...matchOemTools(need, raw.dt, "", 12)].find(
    (t) => ["parallel", "dual"].includes(eoatKind(`${t.name} ${t.type ?? ""}`)),
  );
  // A real tool changer by its name, the half that bolts to the robot; the catalogue's "Tool Changer"
  // group also holds deburring tools.
  const changers = raw.dt.filter((t) => CHANGER.test(t.n) && !/\(tool/i.test(t.n) && !/deburr|spindle|grip|compliance/i.test(t.n));
  const forClass = cobot ? /onrobot|zimmer .*(?:hrc|lwr|match)|robotiq/i : /\bATI\b|SCHUNK|Zimmer WWR/i;
  // A dual changer carries two tools at once; swapping at a tool stand needs a single one.
  const single = (t: DirTool) => (/dual/i.test(t.n) ? 1 : 0);
  const fromDir = changers.filter((t) => forClass.test(t.n)).sort((a, b) => single(a) - single(b))[0] ?? changers[0] ?? raw.dt.find((t) => /tool ?changer/i.test(t.c) && !/deburr|spindle|grip|compliance/i.test(t.n));
  const changer: Match | undefined = fromDir
    ? { source: "oem", kind: "tool", id: fromDir.id, name: fromDir.n, brand: fromDir.b, model: fromDir.m, type: fromDir.c, file: { img: fromDir.img, th: fromDir.th }, href: `/directory?tab=tools&q=${encodeURIComponent(fromDir.n)}`, score: 0, reasons: [cobot ? "For a cobot flange" : "For an industrial robot"] }
    : undefined;
  return { ...(tool2 ? { tool2 } : {}), ...(changer ? { changer } : {}) };
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
  if (/weld|grind|polish|finish|paint|spray|apply|dispens|glue|process|screw|assemble|fill|cap|label|seal|deburr/.test(action))
    return { key: "work", label: "Process", color: "#f97316" };
  if (/inspect|check/.test(action)) return { key: "inspect", label: "Inspect", color: "#22c55e" };
  if (/toolchange/.test(action)) return { key: "change", label: "Tool change", color: "#eab308" };
  if (/manual/.test(action)) return { key: "manual", label: "Operator", color: "#f472b6" };
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

type SharedCell = { j: string; u?: string; f?: boolean; s: Record<string, string>; t?: string[]; p?: string[] };
/** Compact, URL-safe description of the line (job, safety, and source:id of each part). */
export function encodeLine(cells: { job: string; custom?: string; fenced?: boolean; choice: Choice; stations?: string[]; parts?: Match[] }[]): string {
  const data: SharedCell[] = cells.map((c) => ({
    j: c.job, u: c.custom, f: c.fenced, t: c.stations,
    p: c.parts?.length ? c.parts.map((m) => `${m.source}:${m.id}`) : undefined,
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
  cells: {
    job: string; choice: Choice; fenced?: boolean; cycle: number | null; checks: { state: string; label: string; detail: string }[]; thoughts?: { step: string; thought: string }[];
    parts?: string[]; also?: string[]; software?: { name: string; maker: string; does: string }[];
  }[];
  bottleneck: number | null;
  perHour: number | null;
  budget: Budget | null;
  roi: ReturnType<typeof roi> | null;
  inputs: { operators: number; shifts: number; wage: number };
  /** The first cell's conveyor pick and place: settings, sequence and I/O (conveyorAutomation.ts). */
  automation?: { setup: string; plan: AutomationPlan } | null;
}) {
  const rng = (v: [number, number]) => `${inr(v[0])} – ${inr(v[1])}`;
  const auto = r.automation
    ? `<h2>Conveyor automation · cell 1</h2><p>${esc(r.automation.setup)}</p>
<h3>Sequence</h3><ol>${r.automation.plan.sequence.map((s) => `<li><b>${esc(s.stage)} — ${esc(s.title)}.</b> ${esc(s.detail)}${s.signals.length ? ` <i>(${s.signals.map(esc).join(", ")})</i>` : ""}</li>`).join("")}</ol>
<h3>I/O list</h3><table><tr><th>Signal</th><th>From → to</th><th>Device</th><th>Means</th></tr>${r.automation.plan.io
        .map((s) => `<tr><td>${esc(s.tag)}</td><td>${esc(s.from)} → ${esc(s.to)}</td><td>${esc(s.device)}</td><td>${esc(s.text)}</td></tr>`)
        .join("")}</table>${r.automation.plan.issues.length ? `<h3>Checks</h3><ul>${r.automation.plan.issues.map((i) => `<li>${esc(i.text)}</li>`).join("")}</ul>` : ""}
<p class="note">Simulated signals for planning — not a machine program or a certified safety design.</p>`
    : "";
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
  // Accessories, components, other equipment and software of each cell: the integrator's bill of materials.
  const kit = r.cells
    .map((c, i) => {
      const acc = [c.choice.changer, c.choice.sensor, c.choice.camera].filter(Boolean).map((m) => m!.name);
      const rows = [
        acc.length ? `<tr><th>Accessories</th><td>${acc.map(esc).join(", ")}</td></tr>` : "",
        c.parts?.length ? `<tr><th>Components</th><td>${c.parts.map(esc).join(", ")}</td></tr>` : "",
        c.also?.length ? `<tr><th>Also needed</th><td>${c.also.map(esc).join(", ")}</td></tr>` : "",
        c.software?.length ? `<tr><th>Software</th><td>${c.software.map((s) => `<b>${esc(s.name)}</b> (${esc(s.maker)}) — ${esc(s.does)}`).join("<br>")}</td></tr>` : "",
      ].join("");
      return rows ? `<h3>Cell ${i + 1} · ${esc(c.job)}</h3><table>${rows}</table>` : "";
    })
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
${auto}
${kit ? `<h2>Accessories, components and software</h2>${kit}` : ""}
${reasoning ? `<h2>Engineer's reasoning</h2>${reasoning}` : ""}
${r.budget ? `<h2>Indicative budget</h2><table><tr><th>Item</th><th>For</th><th>Qty</th><th>Estimate</th></tr>${bom}
<tr><th colspan="3">Total</th><th>${rng(r.budget.bom.total)}</th></tr></table>` : ""}
${r.roi ? `<h2>Payback</h2><p>${r.inputs.operators} operator(s) × ${r.inputs.shifts} shift(s) at ${inr(r.inputs.wage)} per month saves about <b>${inr(r.roi.annualSaving)}</b> a year.
Payback <b>${r.roi.months[0].toFixed(0)}–${r.roi.months[1].toFixed(0)} months</b>; ${r.roi.fiveYear[1] <= 0 ? "it does not pay back within five years at these numbers" : `five-year net saving up to ${inr(r.roi.fiveYear[1])}`}.</p>` : ""}
<p class="note">Cycle times come from the 3D simulation; prices are indicative Indian market ranges. Confirm with supplier quotes and a site visit. support@robotverse.in</p>
<script>window.onload=()=>window.print()</script></body></html>`;
}
