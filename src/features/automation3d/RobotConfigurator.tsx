import { useEffect, useMemo, useState } from "react";
import { Bot, Camera, Cog, Factory, GripVertical, Loader2, Plus, Store, Wrench, X, Gauge } from "lucide-react";
import { cn } from "@/lib/utils";
import { Thumb, type Choice } from "./EquipmentPicker";
import type { AiStation } from "./aiSolution";
import {
  loadDirectoryRobots, loadDirectoryTools, loadMarketRobots, loadMarketTools,
  matchMarketRobots, matchMarketTools, matchOemRobots, matchOemTools, needOf,
  type DirTool, type Match,
} from "./equipmentMatch";

type Slot = keyof Choice;
const SLOTS: { key: Slot; label: string; hint: string; icon: typeof Bot; optional?: boolean }[] = [
  { key: "robot", label: "Robot arm", hint: "Drop a robot here", icon: Bot },
  { key: "changer", label: "Tool changer", hint: "Optional — swap tools automatically", icon: Cog, optional: true },
  { key: "sensor", label: "Force / torque sensor", hint: "Optional — for polishing, assembly, hand-guiding", icon: Gauge, optional: true },
  { key: "camera", label: "Wrist camera", hint: "Optional — vision-guided picking and inspection", icon: Camera, optional: true },
  { key: "tool", label: "End-of-arm tool", hint: "Drop a gripper, torch, spindle, nozzle…", icon: Wrench },
];
const PALETTE: { key: Slot | "acc"; label: string }[] = [
  { key: "robot", label: "Robots" },
  { key: "tool", label: "End-of-arm tools" },
  { key: "acc", label: "Accessories" },
];

const oemMatch = (t: DirTool, reason: string): Match => ({
  source: "oem", kind: "tool", id: t.id, name: t.n, brand: t.b, model: t.m, type: t.c,
  file: { img: t.img, th: t.th }, href: `/directory?tab=tools&q=${encodeURIComponent(t.n)}`, score: 1, reasons: [reason],
});
export const slotOf = (m: Match): Slot => {
  if (m.kind === "robot") return "robot";
  const t = `${m.type ?? ""} ${m.name}`;
  const n = m.name;
  // Decide from the product name first (catalogue categories can be broad), then the category.
  if (/deburr|gripper|spindle|torch|screw|dispens/i.test(n)) return "tool";
  if (/changer|\bqc-?\d|quick ?change|\bqcs?\b/i.test(n)) return "changer";
  if (/force|torque|\bf\/t\b|\bft[- ]?\d|\bbft|axia|\bhex-|\bfts\b|\bsens\b/i.test(n)) return "sensor";
  if (/camera|vision|scan|eyes|3d sensor|profil/i.test(n)) return "camera";
  if (/tool ?changer/i.test(t)) return "changer";
  if (/force|torque/i.test(t)) return "sensor";
  if (/camera|vision/i.test(t)) return "camera";
  return "tool";
};

/**
 * Drag-and-drop robot builder for one robot cell: drag a robot, an end-of-arm tool and optional
 * accessories (tool changer, force/torque sensor, wrist camera) from the parts list onto the robot.
 * Every drop updates the 3D cell. Tap "Add" does the same on touch screens.
 */
export default function RobotConfigurator({ station, value, onChange }: { station: AiStation; value: Choice; onChange: (c: Choice) => void }) {
  const [data, setData] = useState<{ oemRobots: Awaited<ReturnType<typeof loadDirectoryRobots>>; oemTools: DirTool[]; marketRobots: Record<string, unknown>[]; marketTools: Record<string, unknown>[] } | null>(null);
  const [tab, setTab] = useState<Slot | "acc">("robot");
  const [dragging, setDragging] = useState<Slot | null>(null);
  const [over, setOver] = useState<Slot | null>(null);

  useEffect(() => {
    let live = true;
    Promise.all([loadDirectoryRobots(), loadDirectoryTools(), loadMarketRobots(), loadMarketTools()]).then(([oemRobots, oemTools, marketRobots, marketTools]) => {
      if (live) setData({ oemRobots, oemTools, marketRobots, marketTools });
    });
    return () => {
      live = false;
    };
  }, []);

  const lists = useMemo(() => {
    if (!data) return null;
    const need = needOf(station);
    const words = `${station.name} ${station.tooling}`;
    const acc = [
      ...data.oemTools
        .filter((t) => /tool changer|vision|sensing/i.test(t.c) && !/mount|extender|field-of-view|calibration plate/i.test(t.n))
        .map((t) => oemMatch(t, t.c))
        .filter((m) => slotOf(m) !== "tool")
        .slice(0, 24),
      ...data.marketTools
        .filter((t) => /changer|force|torque|camera|vision/i.test(`${t.name} ${t.category} ${t.sub_category} ${t.component_type}`))
        .slice(0, 8)
        .map((t) => ({
          source: "market" as const, kind: "tool" as const, id: String(t.id), name: String(t.name), brand: String(t.brand ?? ""),
          type: String(t.sub_category || t.category || ""), price: typeof t.price === "number" ? t.price : null,
          image: Array.isArray(t.images) ? (t.images[0] as string) : undefined, href: `/parts/${String(t.id)}`, score: 1, reasons: ["Listed on RobotVerse"],
        })),
    ];
    return {
      need,
      robot: [...matchMarketRobots(need, data.marketRobots, 8), ...matchOemRobots(need, data.oemRobots, 12)],
      tool: [...matchMarketTools(need, data.marketTools, words, 8), ...matchOemTools(need, data.oemTools, words, 12)],
      acc,
    };
  }, [data, station]);

  const place = (m: Match, slot = slotOf(m)) => onChange({ ...value, [slot]: m });
  const clear = (slot: Slot) => {
    const next = { ...value };
    delete next[slot];
    onChange(next);
  };
  const byKey = new Map<string, Match>();
  if (lists) [...lists.robot, ...lists.tool, ...lists.acc].forEach((m) => byKey.set(`${m.source}:${m.id}`, m));

  const drop = (slot: Slot, e: React.DragEvent) => {
    e.preventDefault();
    setOver(null);
    setDragging(null);
    const m = byKey.get(e.dataTransfer.getData("text/plain"));
    if (m && slotOf(m) === slot) place(m, slot);
  };

  if (!lists)
    return (
      <p className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading robots, tools and accessories…
      </p>
    );

  const shown = lists[tab];
  const payload = value.robot?.payload;
  return (
    <div className="grid gap-4 md:grid-cols-[1fr_1.1fr]">
      {/* Parts */}
      <section aria-label="Parts" className="min-w-0 rounded-lg border border-border">
        <div className="grid grid-cols-3 border-b border-border text-xs" role="tablist">
          {PALETTE.map((p) => (
            <button key={p.key} role="tab" aria-selected={tab === p.key} onClick={() => setTab(p.key)} className={cn("px-2 py-2 font-medium", tab === p.key ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
              {p.label} ({lists[p.key].length})
            </button>
          ))}
        </div>
        <p className="border-b border-border px-3 py-1.5 text-[11px] text-muted-foreground">
          Drag a part onto the robot on the right (or tap <b>Add</b>). Only parts that suit this job are listed.
        </p>
        <ul className="max-h-[420px] divide-y divide-border overflow-auto">
          {shown.length === 0 && <li className="p-3 text-xs text-muted-foreground">Nothing matches this job yet.</li>}
          {shown.map((m) => {
            const slot = slotOf(m);
            const used = value[slot]?.id === m.id && value[slot]?.source === m.source;
            return (
              <li
                key={`${m.source}:${m.id}`}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", `${m.source}:${m.id}`);
                  e.dataTransfer.effectAllowed = "copy";
                  setDragging(slot);
                }}
                onDragEnd={() => {
                  setDragging(null);
                  setOver(null);
                }}
                className={cn("flex cursor-grab items-center gap-2 p-2 active:cursor-grabbing", used && "bg-primary/5")}
              >
                <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <Thumb m={m} size="h-11 w-11" />
                <span className="min-w-0 flex-1 text-xs">
                  <b className="block truncate text-sm">{m.name}</b>
                  <span className="block truncate text-muted-foreground">
                    {[m.type, m.payload != null ? `${m.payload} kg` : "", m.reach ? `${m.reach} mm` : ""].filter(Boolean).join(" · ")}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                    {m.source === "market" ? <Store className="h-3 w-3 text-emerald-500" /> : <Factory className="h-3 w-3 text-sky-500" />}
                    {m.source === "market" ? "RobotVerse marketplace" : "Directory · OEM"}
                    {tab === "acc" && <b className="ml-1 text-primary">→ {SLOTS.find((x) => x.key === slot)?.label}</b>}
                  </span>
                </span>
                <button type="button" onClick={() => place(m)} className={cn("inline-flex items-center gap-0.5 rounded border px-1.5 py-1 text-[11px]", used ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary")}>
                  {used ? "Added" : <><Plus className="h-3 w-3" /> Add</>}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* The robot being built */}
      <section aria-label="Your robot" className="rounded-lg border border-border bg-muted/20 p-3">
        <p className="mb-2 text-sm font-semibold">Your robot</p>
        <ol className="space-y-1.5">
          {SLOTS.map((s, i) => {
            const m = value[s.key];
            const target = dragging === s.key;
            return (
              <li key={s.key} className="relative">
                {i > 0 && <span className="absolute -top-1.5 left-6 h-1.5 w-0.5 bg-border" aria-hidden />}
                <div
                  onDragOver={(e) => {
                    if (dragging !== s.key) return;
                    e.preventDefault();
                    setOver(s.key);
                  }}
                  onDragLeave={() => setOver((o) => (o === s.key ? null : o))}
                  onDrop={(e) => drop(s.key, e)}
                  className={cn(
                    "flex items-center gap-2 rounded-md border-2 p-2 transition-colors",
                    m ? "border-solid border-border bg-background" : "border-dashed border-border",
                    target && "border-primary bg-primary/5",
                    over === s.key && "ring-2 ring-primary",
                  )}
                >
                  <s.icon className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                  {m ? (
                    <>
                      <Thumb m={m} size="h-10 w-10" />
                      <span className="min-w-0 flex-1 text-xs">
                        <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">{s.label}</span>
                        <b className="block truncate">{m.name}</b>
                      </span>
                      <button type="button" aria-label={`Remove ${s.label}`} onClick={() => clear(s.key)} className="rounded p-1 hover:bg-muted hover:text-red-600">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : (
                    <span className="text-xs">
                      <b className="block">{s.label}</b>
                      <span className="text-muted-foreground">{target ? "Drop here" : s.hint}</span>
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
        <div className="mt-3 space-y-1 text-xs">
          {payload != null && (
            <p className={payload >= lists.need.payload ? "text-emerald-600" : "text-amber-600"}>
              {payload >= lists.need.payload ? "✓" : "!"} Robot payload {payload} kg · this job needs ≥ {lists.need.payload} kg
              {(value.changer || value.sensor || value.camera) && " (accessories add weight — keep a margin)"}
            </p>
          )}
          {!value.robot && <p className="text-muted-foreground">Start by dropping a robot arm, then its tool.</p>}
          <p className="text-muted-foreground">Everything you add appears on this robot in the 3D cell.</p>
        </div>
      </section>
    </div>
  );
}
