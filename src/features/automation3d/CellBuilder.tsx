import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import {
  Bot, Camera, Cog, Factory, Gauge, GripVertical, Loader2, Mail, Pause, Play, Plus, RotateCcw, Search, ShieldCheck, Store, Trash2, Workflow, Wrench, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { processesFromSkills } from "@/utils/processAnalyzer";
import { createSimulation, type Simulation, type SimUpdate } from "./robotSim.js";
import { planLine, type LinePlan } from "./robotKnowledge";
import { Thumb, type Choice } from "./EquipmentPicker";
import { BLOCKS } from "./ProcessBuilder";
import { slotOf } from "./RobotConfigurator";
import { loadDirectoryRobots, loadDirectoryTools, loadMarketRobots, loadMarketTools, type DirRobot, type DirTool, type Match } from "./equipmentMatch";
import { mailto } from "@/components/directory/directoryTypes";

/* ------------------------------------------------------------------ data */

type Slot = keyof Choice;
interface Cell {
  id: string;
  job: string;
  choice: Choice;
  fenced: boolean;
}
type PaletteTab = "robots" | "tools" | "acc" | "cell";

const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const firstImage = (v: unknown) => (Array.isArray(v) && typeof v[0] === "string" ? (v[0] as string) : undefined);

const dirRobot = (r: DirRobot): Match => ({
  source: "oem", kind: "robot", id: r.id, name: r.n, brand: r.b, model: r.m, payload: r.p, reach: r.r, axes: r.a, type: r.t,
  file: { img: r.img, th: r.th }, href: `/directory?q=${encodeURIComponent(r.n)}`, score: 0,
  reasons: r.ap?.includes("Collaborative") ? ["Collaborative"] : [],
});
const marketRobot = (r: Record<string, unknown>): Match => ({
  source: "market", kind: "robot", id: str(r.id), name: str(r.name), brand: str(r.brand), model: str(r.model),
  payload: num(r.payload_capacity), reach: num(r.reach), type: str(r.robot_type), price: num(r.price), currency: str(r.currency) || "INR",
  condition: str(r.condition) || null, location: str(r.location) || null, image: firstImage(r.images), href: `/robots/${str(r.id)}`, score: 0, reasons: [],
});
const dirTool = (t: DirTool): Match => ({
  source: "oem", kind: "tool", id: t.id, name: t.n, brand: t.b, model: t.m, type: t.c, file: { img: t.img, th: t.th },
  href: `/directory?tab=tools&q=${encodeURIComponent(t.n)}`, score: 0, reasons: [],
});
const marketTool = (t: Record<string, unknown>): Match => ({
  source: "market", kind: "tool", id: str(t.id), name: str(t.name), brand: str(t.brand), model: str(t.model),
  type: str(t.sub_category || t.category), price: num(t.price), currency: str(t.currency) || "INR",
  condition: str(t.condition) || null, location: str(t.location) || null, image: firstImage(t.images), href: `/parts/${str(t.id)}`, score: 0, reasons: [],
});

// Cell equipment that does not go on the arm (stations, power sources, feeders).
const NOT_ON_ARM = /cleaning|reamer|station|power source|wire feeder|feeder|proportioner|controller/i;
const isCobot = (m?: Match) => !!m && (m.reasons.includes("Collaborative") || /cobot|collaborative|\bur\d|crx|techman|doosan|gofa|iisy/i.test(`${m.type} ${m.name}`));
const ROBOT_TYPES = ["All", "6-Axis", "Cobot", "SCARA", "Delta", "Palletizing", "7-Axis"] as const;
const SLOTS: { key: Slot; label: string; icon: typeof Bot }[] = [
  { key: "robot", label: "Robot arm", icon: Bot },
  { key: "tool", label: "End-of-arm tool", icon: Wrench },
  { key: "changer", label: "Tool changer", icon: Cog },
  { key: "sensor", label: "Force / torque sensor", icon: Gauge },
  { key: "camera", label: "Wrist camera", icon: Camera },
];
const jobLabel = (name: string) => BLOCKS.find((b) => b.name === name)?.label ?? name;
const newId = () => Math.random().toString(36).slice(2, 9);
const STORE = "rv-cell-builder";
const inr = (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`;

/* ------------------------------------------------------------- component */

/**
 * Build-your-own robot cell: drag robots (RobotVerse marketplace or Directory), end-of-arm tools,
 * accessories, a job and safety fencing onto the cells, and the 3D line runs it live.
 */
export default function CellBuilder() {
  const stageRef = useRef<HTMLDivElement>(null);
  const simRef = useRef<Simulation | null>(null);
  const [data, setData] = useState<{ robots: Match[]; tools: Match[] } | null>(null);
  const [tab, setTab] = useState<PaletteTab>("robots");
  const [q, setQ] = useState("");
  const [source, setSource] = useState<"all" | "market" | "oem">("all");
  const [rtype, setRtype] = useState<(typeof ROBOT_TYPES)[number]>("All");
  const [shown, setShown] = useState(40);
  const [cells, setCells] = useState<Cell[]>(() => {
    try {
      const v = JSON.parse(localStorage.getItem(STORE) || "null");
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  });
  const [selected, setSelected] = useState(0);
  const [drag, setDrag] = useState<{ kind: "robot" | "tool" | "job" | "fence"; slot?: Slot } | null>(null);
  const [overStage, setOverStage] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [sim, setSim] = useState<Pick<SimUpdate, "cells" | "currentCycle"> | null>(null);
  const lastEmit = useRef(0);

  // Catalogue: marketplace listings first (they can be bought now), then the OEM directory.
  useEffect(() => {
    let live = true;
    Promise.all([loadMarketRobots(), loadDirectoryRobots(), loadMarketTools(), loadDirectoryTools()]).then(([mr, dr, mt, dt]) => {
      if (!live) return;
      setData({
        robots: [...mr.map(marketRobot), ...dr.map(dirRobot)],
        tools: [...mt.map(marketTool), ...dt.filter((t) => !/generic demo/i.test(t.c)).map(dirTool)],
      });
    });
    return () => {
      live = false;
    };
  }, []);

  // 3D stage
  useEffect(() => {
    if (!stageRef.current) return;
    const s = createSimulation({
      THREE, OrbitControls, RoomEnvironment, container: stageRef.current,
      onUpdate: (u: SimUpdate) => {
        const now = performance.now();
        if (now - lastEmit.current < 250) return;
        lastEmit.current = now;
        setSim({ cells: u.cells, currentCycle: u.currentCycle });
      },
    });
    simRef.current = s;
    return () => s.dispose();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORE, JSON.stringify(cells));
    } catch {
      /* private mode */
    }
  }, [cells]);

  // One robot per cell, in order, doing the cell's job.
  const plan: LinePlan | null = useMemo(() => {
    if (!cells.length) return null;
    const input = cells.map((c) => processesFromSkills([c.job])[0] ?? { name: c.job });
    return planLine(input, "balanced", { splitBefore: input.map((p) => p.name), robots: cells.length });
  }, [cells]);

  // Push the plan and every cell's equipment into the 3D scene.
  const planKey = cells.map((c) => c.job).join("|");
  useEffect(() => {
    const s = simRef.current;
    if (!s) return;
    if (!plan) {
      s.setPlan({ cells: [{ steps: [] }] });
      return;
    }
    s.setPlan(plan.sim);
    if (playing) s.play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planKey]);
  useEffect(() => {
    const s = simRef.current;
    if (!s || !plan) return;
    s.setFencing(cells.map((c) => c.fenced));
    cells.forEach((c, i) => {
      const eq = c.choice;
      const any = eq.robot || eq.tool || eq.changer || eq.sensor || eq.camera;
      s.setEquipment(
        i,
        any
          ? {
              robot: eq.robot ? { name: eq.robot.name, brand: eq.robot.brand, reachMm: eq.robot.reach, payloadKg: eq.robot.payload, collaborative: isCobot(eq.robot) } : undefined,
              eoat: eq.tool ? { name: `${eq.tool.name} ${eq.tool.type ?? ""}` } : undefined,
              accessories: [eq.changer && "changer", eq.sensor && "sensor", eq.camera && "camera"].filter(Boolean) as ("changer" | "sensor" | "camera")[],
            }
          : null,
      );
    });
    s.setFocus(Math.min(selected, cells.length - 1));
  }, [cells, plan, selected]);

  /* ------------------------------------------------------------ actions */

  const addCell = (patch: Partial<Cell> = {}) => {
    if (cells.length >= 6) return;
    const cell: Cell = { id: newId(), job: "Loading & Unloading", choice: {}, fenced: true, ...patch };
    if (cell.choice.robot && isCobot(cell.choice.robot) && patch.fenced === undefined) cell.fenced = false;
    setCells((cs) => [...cs, cell]);
    setSelected(cells.length);
  };
  const update = (i: number, fn: (c: Cell) => Cell) => setCells((cs) => cs.map((c, k) => (k === i ? fn(c) : c)));
  const put = (i: number, m: Match) => {
    const slot: Slot = m.kind === "robot" ? "robot" : slotOf(m);
    if (!cells[i]) return addCell({ choice: { [slot]: m } });
    update(i, (c) => ({ ...c, choice: { ...c.choice, [slot]: m }, fenced: slot === "robot" ? !isCobot(m) : c.fenced }));
  };
  // Tap "Add" (touch screens): a robot goes to the selected cell if it has none, else a new cell.
  const add = (m: Match) => {
    if (m.kind === "robot" && (!cells.length || cells[selected]?.choice.robot)) return addCell({ choice: { robot: m }, fenced: !isCobot(m) });
    put(selected, m);
  };
  const clear = (i: number, slot: Slot) =>
    update(i, (c) => {
      const choice = { ...c.choice };
      delete choice[slot];
      return { ...c, choice };
    });
  const removeCell = (i: number) => {
    setCells((cs) => cs.filter((_, k) => k !== i));
    setSelected((s) => Math.max(0, Math.min(s, cells.length - 2)));
  };

  /* --------------------------------------------------------- drag & drop */

  const byKey = useMemo(() => {
    const m = new Map<string, Match>();
    data?.robots.forEach((x) => m.set(`${x.source}:${x.id}`, x));
    data?.tools.forEach((x) => m.set(`${x.source}:${x.id}`, x));
    return m;
  }, [data]);
  const onDragStart = (e: React.DragEvent, payload: string, kind: "robot" | "tool" | "job" | "fence", slot?: Slot) => {
    e.dataTransfer.setData("text/plain", payload);
    e.dataTransfer.effectAllowed = "copy";
    setDrag({ kind, slot });
  };
  const endDrag = () => {
    setDrag(null);
    setOverStage(false);
  };
  const dropOn = (e: React.DragEvent, cellIndex: number | "new") => {
    e.preventDefault();
    const p = e.dataTransfer.getData("text/plain");
    endDrag();
    if (p.startsWith("job:")) {
      const job = p.slice(4);
      return cellIndex === "new" || !cells[cellIndex] ? addCell({ job }) : update(cellIndex, (c) => ({ ...c, job }));
    }
    if (p === "fence:on" || p === "fence:off") {
      const fenced = p === "fence:on";
      if (cellIndex === "new") return setCells((cs) => cs.map((c) => ({ ...c, fenced })));
      return update(cellIndex, (c) => ({ ...c, fenced }));
    }
    const m = byKey.get(p);
    if (!m) return;
    if (cellIndex === "new") return m.kind === "robot" ? addCell({ choice: { robot: m }, fenced: !isCobot(m) }) : put(selected, m);
    put(cellIndex, m);
  };

  /* ------------------------------------------------------------ palette */

  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const matchQ = (m: Match) => words.every((w) => `${m.name} ${m.brand} ${m.model} ${m.type}`.toLowerCase().includes(w));
  const list = useMemo(() => {
    if (!data) return [];
    if (tab === "robots")
      return data.robots.filter(
        (m) =>
          (source === "all" || m.source === source) &&
          matchQ(m) &&
          (rtype === "All" || (rtype === "Cobot" ? isCobot(m) : (m.type ?? "").toLowerCase().includes(rtype.toLowerCase()))),
      );
    const tools = data.tools.filter((m) => (source === "all" || m.source === source) && matchQ(m));
    return tab === "acc" ? tools.filter((m) => slotOf(m) !== "tool") : tools.filter((m) => slotOf(m) === "tool" && !NOT_ON_ARM.test(m.name));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, tab, q, source, rtype]);
  useEffect(() => setShown(40), [tab, q, source, rtype]);

  /* ------------------------------------------------------------ summary */

  const chosen = cells.flatMap((c) => Object.values(c.choice).filter(Boolean) as Match[]);
  const priced = chosen.filter((m) => m.source === "market" && m.price);
  const total = priced.reduce((s, m) => s + (m.price ?? 0), 0);
  const quote = mailto(
    "Quote request: my robot cell (Automation Studio)",
    [
      "Hello RobotVerse team,",
      "",
      "Please quote the robot cell I built in Automation Studio:",
      "",
      ...cells.map((c, i) =>
        [`Cell ${i + 1} — ${jobLabel(c.job)}${c.fenced ? " (fenced)" : " (open / collaborative)"}`, ...SLOTS.filter((s) => c.choice[s.key]).map((s) => `  ${s.label}: ${c.choice[s.key]!.name} [${c.choice[s.key]!.source === "market" ? "RobotVerse marketplace" : "Directory / OEM"}]`)].join("\n"),
      ),
      "",
      "Name:",
      "Company:",
      "Phone:",
      "",
      "Thank you.",
    ].join("\n"),
  );

  const togglePlay = () => {
    const s = simRef.current;
    if (!s) return;
    if (playing) s.pause();
    else s.play();
    setPlaying(!playing);
  };

  /* -------------------------------------------------------------- render */

  return (
    <div className="grid gap-3 p-3 lg:h-[calc(100vh-150px)] lg:grid-cols-[320px_1fr_330px]">
      {/* Palette */}
      <aside aria-label="Parts" className="flex min-h-0 flex-col rounded-xl border border-border bg-card">
        <div className="grid grid-cols-4 gap-0.5 border-b border-border p-1 text-[11px]" role="tablist">
          {([["robots", "Robots", Bot], ["tools", "EOAT", Wrench], ["acc", "Accessories", Cog], ["cell", "Job & safety", Workflow]] as const).map(([k, label, Icon]) => (
            <button
              key={k}
              role="tab"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
              className={cn("flex flex-col items-center gap-0.5 rounded-md px-1 py-1.5 font-medium", tab === k ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>
        {tab !== "cell" && (
          <div className="space-y-2 border-b border-border p-2">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={tab === "robots" ? "Search brand, model…" : "Search tools…"}
                className="w-full rounded-md border border-border bg-background py-2 pl-8 pr-2 text-sm"
                aria-label="Search parts"
              />
            </label>
            <div className="flex flex-wrap gap-1 text-[11px]">
              {([["all", "All"], ["market", "Marketplace"], ["oem", "Directory"]] as const).map(([k, label]) => (
                <button key={k} onClick={() => setSource(k)} className={cn("rounded-full border px-2 py-0.5", source === k ? "border-primary bg-primary/10 text-primary" : "border-border")}>
                  {label}
                </button>
              ))}
            </div>
            {tab === "robots" && (
              <div className="flex flex-wrap gap-1 text-[11px]">
                {ROBOT_TYPES.map((t) => (
                  <button key={t} onClick={() => setRtype(t)} className={cn("rounded-full border px-2 py-0.5", rtype === t ? "border-primary bg-primary/10 text-primary" : "border-border")}>
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <p className="border-b border-border px-3 py-1.5 text-[11px] text-muted-foreground">
          Drag onto the 3D cell or a cell card — or tap <b>Add</b>.
        </p>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {tab === "cell" ? (
            <div className="space-y-3 p-2">
              <div>
                <p className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Safety</p>
                {([["fence:on", "Safety fence + interlocked door", "Industrial robots work behind a fence (ISO 10218-2)"], ["fence:off", "Open collaborative cell", "Cobots next to people, speed & force limited"]] as const).map(([k, label, hint]) => (
                  <div
                    key={k}
                    draggable
                    onDragStart={(e) => onDragStart(e, k, "fence")}
                    onDragEnd={endDrag}
                    className="mb-1 flex cursor-grab items-center gap-2 rounded-md border border-border p-2 text-xs active:cursor-grabbing"
                  >
                    <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <ShieldCheck className={cn("h-5 w-5 shrink-0", k === "fence:on" ? "text-amber-500" : "text-emerald-500")} />
                    <span className="min-w-0 flex-1">
                      <b className="block">{label}</b>
                      <span className="text-muted-foreground">{hint}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => cells[selected] && update(selected, (c) => ({ ...c, fenced: k === "fence:on" }))}
                      className="rounded border border-border px-1.5 py-1 text-[11px] hover:border-primary"
                    >
                      Apply
                    </button>
                  </div>
                ))}
              </div>
              {[...new Set(BLOCKS.map((b) => b.group))].map((g) => (
                <div key={g}>
                  <p className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{g}</p>
                  <div className="flex flex-wrap gap-1">
                    {BLOCKS.filter((b) => b.group === g).map((b) => (
                      <button
                        key={b.name}
                        type="button"
                        draggable
                        onDragStart={(e) => onDragStart(e, `job:${b.name}`, "job")}
                        onDragEnd={endDrag}
                        onClick={() => (cells[selected] ? update(selected, (c) => ({ ...c, job: b.name })) : addCell({ job: b.name }))}
                        className="cursor-grab rounded-full border border-border bg-background px-2 py-1 text-[11px] hover:border-primary hover:text-primary"
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : !data ? (
            <p className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading marketplace and directory…
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {list.length === 0 && <li className="p-4 text-sm text-muted-foreground">Nothing matches.</li>}
              {list.slice(0, shown).map((m) => (
                <li
                  key={`${m.source}:${m.id}`}
                  draggable
                  onDragStart={(e) => onDragStart(e, `${m.source}:${m.id}`, m.kind, m.kind === "robot" ? "robot" : slotOf(m))}
                  onDragEnd={endDrag}
                  className="flex cursor-grab items-center gap-2 p-2 active:cursor-grabbing"
                >
                  <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <Thumb m={m} size="h-11 w-11" />
                  <span className="min-w-0 flex-1 text-xs">
                    <b className="block truncate text-[13px]">{m.name}</b>
                    <span className="block truncate text-muted-foreground">
                      {[m.type, m.payload != null ? `${m.payload} kg` : "", m.reach ? `${m.reach} mm` : ""].filter(Boolean).join(" · ")}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                      {m.source === "market" ? <Store className="h-3 w-3 text-emerald-500" /> : <Factory className="h-3 w-3 text-sky-500" />}
                      {m.source === "market" ? (m.price ? inr(m.price) : "Marketplace") : "Directory · OEM"}
                    </span>
                  </span>
                  <button type="button" onClick={() => add(m)} className="inline-flex items-center gap-0.5 rounded border border-border px-1.5 py-1 text-[11px] hover:border-primary">
                    <Plus className="h-3 w-3" /> Add
                  </button>
                </li>
              ))}
              {list.length > shown && (
                <li className="p-2 text-center">
                  <Button variant="ghost" size="sm" onClick={() => setShown((n) => n + 60)}>
                    Show more ({(list.length - shown).toLocaleString()})
                  </Button>
                </li>
              )}
            </ul>
          )}
        </div>
      </aside>

      {/* 3D stage */}
      <section aria-label="3D robot cell" className="relative min-h-[420px] overflow-hidden rounded-xl border border-border bg-slate-900">
        <div ref={stageRef} className="absolute inset-0" />
        <div
          onDragOver={(e) => {
            if (!drag) return;
            e.preventDefault();
            setOverStage(true);
          }}
          onDragLeave={() => setOverStage(false)}
          onDrop={(e) => dropOn(e, drag?.kind === "robot" ? "new" : selected)}
          className={cn("absolute inset-0 transition-colors", drag ? "pointer-events-auto" : "pointer-events-none", overStage && "bg-primary/15 ring-4 ring-inset ring-primary")}
        >
          {drag && (
            <div className="pointer-events-none absolute inset-x-0 top-1/2 mx-auto w-fit -translate-y-1/2 rounded-lg bg-background/90 px-4 py-2 text-sm font-medium shadow">
              {drag.kind === "robot" ? "Drop to add a robot cell" : drag.kind === "fence" ? "Drop to apply to every cell" : `Drop on Cell ${selected + 1}`}
            </div>
          )}
        </div>
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <Button size="sm" variant="secondary" onClick={togglePlay} disabled={!cells.length}>
            {playing ? <Pause className="mr-1 h-3.5 w-3.5" /> : <Play className="mr-1 h-3.5 w-3.5" />} {playing ? "Pause" : "Play"}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => plan && (simRef.current?.setPlan(plan.sim), simRef.current?.play(), setPlaying(true))} disabled={!cells.length}>
            <RotateCcw className="mr-1 h-3.5 w-3.5" /> Restart
          </Button>
          {(["iso", "front", "top"] as const).map((v) => (
            <Button key={v} size="sm" variant="secondary" onClick={() => simRef.current?.setView(v)}>
              {v === "iso" ? "3D" : v[0].toUpperCase() + v.slice(1)}
            </Button>
          ))}
        </div>
        {!cells.length && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
            <div className="max-w-sm rounded-xl bg-background/90 p-5 text-center shadow-lg">
              <Bot className="mx-auto mb-2 h-8 w-8 text-primary" />
              <p className="font-semibold">Drag a robot here to start</p>
              <p className="mt-1 text-sm text-muted-foreground">Then drop its gripper or tool, pick the job and the safety type. Add up to 6 robots for a full line.</p>
            </div>
          </div>
        )}
      </section>

      {/* Cells */}
      <aside aria-label="Your robot cells" className="flex min-h-0 flex-col rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border p-3">
          <p className="text-sm font-semibold">Your line · {cells.length} robot{cells.length === 1 ? "" : "s"}</p>
          <Button size="sm" variant="outline" onClick={() => addCell()} disabled={cells.length >= 6}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Cell
          </Button>
        </div>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
          {cells.map((c, i) => {
            const cellSim = sim?.cells?.[i];
            const need = plan?.robots[i]?.minPayload;
            const payload = c.choice.robot?.payload;
            return (
              <div
                key={c.id}
                onClick={() => setSelected(i)}
                onDragOver={(e) => {
                  if (!drag) return;
                  e.preventDefault();
                  setSelected(i);
                }}
                onDrop={(e) => dropOn(e, i)}
                className={cn("rounded-lg border bg-background p-2.5 transition-colors", selected === i ? "border-primary ring-1 ring-primary" : "border-border", drag && "border-dashed")}
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">{i + 1}</span>
                  <select
                    value={c.job}
                    onChange={(e) => update(i, (x) => ({ ...x, job: e.target.value }))}
                    className="min-w-0 flex-1 rounded border border-border bg-background px-1.5 py-1 text-xs"
                    aria-label={`Job of cell ${i + 1}`}
                  >
                    {BLOCKS.map((b) => (
                      <option key={b.name} value={b.name}>
                        {b.label}
                      </option>
                    ))}
                  </select>
                  <button type="button" aria-label={`Remove cell ${i + 1}`} onClick={(e) => (e.stopPropagation(), removeCell(i))} className="rounded p-1 text-muted-foreground hover:text-red-600">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <ul className="mt-2 space-y-1">
                  {SLOTS.map((s) => {
                    const m = c.choice[s.key];
                    const target = drag && drag.kind !== "job" && drag.kind !== "fence" && drag.slot === s.key;
                    return (
                      <li key={s.key} className={cn("flex items-center gap-2 rounded-md border px-1.5 py-1 text-xs", m ? "border-border" : "border-dashed border-border", target && "border-primary bg-primary/5")}>
                        <s.icon className="h-4 w-4 shrink-0 text-primary" />
                        {m ? (
                          <>
                            <Thumb m={m} size="h-7 w-7" />
                            <span className="min-w-0 flex-1 truncate" title={m.name}>{m.name}</span>
                            <button type="button" aria-label={`Remove ${s.label}`} onClick={(e) => (e.stopPropagation(), clear(i, s.key))} className="rounded p-0.5 hover:text-red-600">
                              <X className="h-3 w-3" />
                            </button>
                          </>
                        ) : (
                          <span className="text-muted-foreground">{target ? "Drop here" : s.label}</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={(e) => (e.stopPropagation(), update(i, (x) => ({ ...x, fenced: !x.fenced })))}
                    className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5", c.fenced ? "border-amber-500/60 text-amber-600" : "border-emerald-500/60 text-emerald-600")}
                  >
                    <ShieldCheck className="h-3 w-3" /> {c.fenced ? "Fenced cell" : "Open (cobot)"}
                  </button>
                  {payload != null && need != null && (
                    <Badge variant="outline" className={cn("h-5 px-1.5 text-[10px]", payload >= need ? "text-emerald-600" : "text-amber-600")}>
                      {payload >= need ? "✓" : "!"} {payload} kg / needs {need} kg
                    </Badge>
                  )}
                  {cellSim && <span className="ml-auto tabular-nums text-muted-foreground">{cellSim.cycles} parts</span>}
                </div>
              </div>
            );
          })}
          {!cells.length && <p className="p-3 text-sm text-muted-foreground">No robots yet. Drag one from the left, or press “+ Cell”.</p>}
        </div>
        <div className="space-y-2 border-t border-border p-3 text-xs lg:pr-20">
          <p className="text-muted-foreground">
            {chosen.length} item{chosen.length === 1 ? "" : "s"} chosen
            {priced.length > 0 && (
              <>
                {" "}· marketplace total <b className="text-foreground">{inr(total)}</b>
              </>
            )}
          </p>
          <div className="flex gap-2">
            <Button size="sm" className="flex-1" asChild disabled={!chosen.length}>
              <a href={chosen.length ? quote : undefined} aria-disabled={!chosen.length}>
                <Mail className="mr-1.5 h-3.5 w-3.5" /> Request quote
              </a>
            </Button>
            {cells.length > 0 && (
              <Button size="sm" variant="outline" onClick={() => (setCells([]), setSelected(0))}>
                Clear
              </Button>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
