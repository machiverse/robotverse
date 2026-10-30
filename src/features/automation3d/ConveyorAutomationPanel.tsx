/**
 * Automation Studio — set up a conveyor pick and place, and watch its signals while it runs.
 *
 * ConveyorAutomationDialog: the pick mode, the conveyor (length, width, height, speed, side), the product (size,
 * weight), the feed (rate, gap) and where the part goes. "Generate automation" checks it against the robot and
 * gripper in the cell and writes the sequence and the I/O list; "Start simulation" runs it in the 3D cell.
 * AutomationIO: the PLC's and the robot's signals live, with counts, the measured cycle and what sets the pace.
 * The signals are simulated: this is a planning tool, not a machine program or a certified safety design.
 */
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, Info, Pause, Play, SkipForward, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { CONVEYOR_PRODUCTS, defaultSetup, planConveyorAutomation, type AutomationPlan, type ConveyorSetup } from "./conveyorAutomation";
import { MODE_SIGNALS } from "./conveyorLogic.js";
import { productInfo } from "./workpieces.js";
import type { AutomationState } from "./robotSim.js";
import type { Match } from "./equipmentScore";

/** Where a conveyor pick can put the part, as cell stations. */
export const AUTOMATION_DESTINATIONS = [
  { key: "pallet", label: "Pallet" },
  { key: "carton", label: "Packing carton" },
  { key: "out", label: "Outfeed conveyor" },
  { key: "table", label: "Work table" },
] as const;

const eyebrow = "font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground";
const inputCls =
  "h-8 w-full min-w-0 rounded-md border border-border bg-background px-2 text-xs tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50";

function Num(props: { label: string; unit: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; disabled?: boolean }) {
  const { label, unit, value, min, max, step, onChange, disabled } = props;
  return (
    <label className="flex min-w-0 flex-col gap-1 text-[11px] text-muted-foreground">
      <span className="truncate">
        {label} <span className="text-muted-foreground/70">({unit})</span>
      </span>
      <input
        type="number"
        inputMode="decimal"
        className={inputCls}
        value={Number.isFinite(value) ? value : ""}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v)) onChange(Math.max(min, Math.min(max, v)));
        }}
      />
    </label>
  );
}

function Segmented<T extends string>(props: { value: T; options: { key: T; label: string; hint?: string; disabled?: boolean }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={props.label} className="grid grid-cols-2 gap-1.5">
      {props.options.map((o) => (
        <button
          key={o.key}
          type="button"
          role="radio"
          aria-checked={props.value === o.key}
          disabled={o.disabled}
          onClick={() => props.onChange(o.key)}
          className={cn(
            "rounded-md border px-2.5 py-2 text-left text-xs transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50",
            props.value === o.key ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground hover:border-primary/50",
          )}
        >
          <b className="block font-medium text-foreground">{o.label}</b>
          {o.hint && <span className="mt-0.5 block text-[11px] leading-snug">{o.hint}</span>}
        </button>
      ))}
    </div>
  );
}

const ISSUE_ICON = { stop: XCircle, warn: AlertTriangle, info: Info } as const;
const ISSUE_TONE = { stop: "text-red-600", warn: "text-amber-600", info: "text-muted-foreground" } as const;

function PlanView({ plan }: { plan: AutomationPlan }) {
  const e = plan.estimate;
  return (
    <div className="space-y-4">
      {plan.issues.length > 0 && (
        <ul className="space-y-1.5" aria-label="Checks">
          {plan.issues.map((it, i) => {
            const Icon = ISSUE_ICON[it.level];
            return (
              <li key={i} className="flex gap-2 text-xs leading-snug">
                <Icon className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", ISSUE_TONE[it.level])} aria-label={it.level} />
                <span>{it.text}</span>
              </li>
            );
          })}
        </ul>
      )}
      <div>
        <p className={eyebrow}>Sequence</p>
        <ol className="mt-2 space-y-2">
          {plan.sequence.map((s) => (
            <li key={s.n} className="grid grid-cols-[6rem_1fr] gap-x-3 text-xs">
              <span className="pt-px font-mono text-[10px] uppercase tracking-[0.12em] text-primary">
                {s.n} · {s.stage}
              </span>
              <div className="min-w-0">
                <b className="font-medium">{s.title}</b>
                <p className="mt-0.5 leading-snug text-muted-foreground">{s.detail}</p>
                {s.signals.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {s.signals.map((g) => (
                      <span key={g} className="rounded border border-border px-1 font-mono text-[10px] text-foreground/80">
                        {g}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
      <div>
        <p className={eyebrow}>I/O list</p>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-[11px]">
            <thead className="text-muted-foreground">
              <tr>
                <th className="py-1 pr-2 font-normal">Signal</th>
                <th className="py-1 pr-2 font-normal">From → to</th>
                <th className="py-1 pr-2 font-normal">Device</th>
                <th className="py-1 font-normal">Means</th>
              </tr>
            </thead>
            <tbody>
              {plan.io.map((s) => (
                <tr key={s.tag} className="border-t border-border align-top">
                  <td className="py-1 pr-2 font-mono">{s.tag}</td>
                  <td className="whitespace-nowrap py-1 pr-2">
                    {s.from} → {s.to}
                  </td>
                  <td className="py-1 pr-2 text-muted-foreground">{s.device}</td>
                  <td className="py-1">{s.text}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-[11px] leading-snug text-muted-foreground">
        Part pitch {Math.round(e.pitch * 1000)} mm · the belt carries up to {Math.floor(e.beltMaxPerMin)} parts a minute
        {e.indexSeconds !== null && <> · next part at rest {e.indexSeconds} s after PICK_DONE · braking {e.brakingMm} mm</>}
        {e.feedInterval !== null && <> · one part from the feeder every {e.feedInterval} s</>}. The cycle time and parts per hour come from the simulation once it runs.
      </p>
    </div>
  );
}

export function ConveyorAutomationDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The cell's saved setup; else one is made for the line's product. */
  setup?: ConveyorSetup;
  productKey?: string;
  robot?: Match;
  tool?: Match;
  /** Where the cell's program places the part now. */
  destination: string | null;
  robots: number;
  onStart: (setup: ConveyorSetup, destination: string) => void;
}) {
  const { open, setup, productKey, robot, tool, destination, robots } = props;
  const [draft, setDraft] = useState<ConveyorSetup>(() => setup ?? defaultSetup(productKey && CONVEYOR_PRODUCTS.includes(productKey) ? productKey : "carton"));
  const [dest, setDest] = useState<string>(destination ?? "pallet");
  const [plan, setPlan] = useState<AutomationPlan | null>(null);
  useEffect(() => {
    if (!open) return;
    setDraft(setup ?? defaultSetup(productKey && CONVEYOR_PRODUCTS.includes(productKey) ? productKey : "carton"));
    setDest(destination ?? "pallet");
    setPlan(null);
    // Each time the dialog opens it starts from the cell as it is.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const edit = (fn: (d: ConveyorSetup) => ConveyorSetup) => {
    setDraft((d) => fn(d));
    setPlan(null);
  };
  const info = useMemo(() => productInfo({ key: draft.product.key }), [draft.product.key]);
  const size = draft.product.size ?? info.size;
  const generate = () =>
    setPlan(
      planConveyorAutomation({
        setup: draft,
        robot: robot ? { name: robot.name, brand: robot.brand, payloadKg: robot.payload, reachMm: robot.reach } : null,
        tool: tool ? { name: tool.name, type: tool.type } : null,
        destination: dest,
        robots,
      }),
    );
  const products = useMemo(() => CONVEYOR_PRODUCTS.map((k) => ({ key: k, label: productInfo({ key: k }).label })), []);

  return (
    <Dialog open={open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Conveyor automation</DialogTitle>
          <DialogDescription>
            Parts come down the belt, a photo-eye and the line PLC hand each one to the robot, it picks, carries and places it. Simulated signals for
            planning — not a machine program or a certified safety design.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-4">
            <section className="space-y-2">
              <p className={eyebrow}>How the robot picks</p>
              <Segmented
                label="Pick mode"
                value={draft.mode}
                onChange={(mode) => edit((d) => ({ ...d, mode, conveyor: { ...d.conveyor, length: mode === "track" ? Math.max(d.conveyor.length, 3.4) : d.conveyor.length } }))}
                options={[
                  { key: "index", label: "Stop and pick", hint: "The belt stops each part at the pick position." },
                  { key: "track", label: "Conveyor tracking", hint: "The belt keeps running; the robot follows each part." },
                ]}
              />
            </section>
            <section className="space-y-2">
              <p className={eyebrow}>Conveyor</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Num label="Length" unit="m" value={draft.conveyor.length} min={1} max={12} step={0.1} onChange={(v) => edit((d) => ({ ...d, conveyor: { ...d.conveyor, length: v } }))} />
                <Num label="Width" unit="mm" value={Math.round(draft.conveyor.width * 1000)} min={150} max={1500} step={10} onChange={(v) => edit((d) => ({ ...d, conveyor: { ...d.conveyor, width: v / 1000 } }))} />
                <Num label="Height" unit="mm" value={Math.round(draft.conveyor.height * 1000)} min={400} max={1300} step={10} onChange={(v) => edit((d) => ({ ...d, conveyor: { ...d.conveyor, height: v / 1000 } }))} />
                <Num label="Speed" unit="m/s" value={draft.conveyor.speed} min={0.05} max={1.5} step={0.05} onChange={(v) => edit((d) => ({ ...d, conveyor: { ...d.conveyor, speed: v } }))} />
              </div>
              <Segmented
                label="Conveyor side"
                value={robots > 1 ? "left" : draft.conveyor.side}
                onChange={(side) => edit((d) => ({ ...d, conveyor: { ...d.conveyor, side } }))}
                options={[
                  { key: "left", label: "From the left", hint: "Parts flow left to right." },
                  { key: "right", label: "From the right", hint: robots > 1 ? "Only with one robot: a line flows left to right." : "Parts flow right to left.", disabled: robots > 1 },
                ]}
              />
            </section>
            <section className="space-y-2">
              <p className={eyebrow}>Product</p>
              <select
                aria-label="Product"
                className={inputCls}
                value={draft.product.key}
                onChange={(e) => {
                  const p = productInfo({ key: e.target.value });
                  edit((d) => ({ ...d, product: { key: p.key, size: p.size, kg: p.kg }, conveyor: { ...d.conveyor, width: Math.max(d.conveyor.width, Math.ceil((p.size[2] + 0.08) * 20) / 20) } }));
                }}
              >
                {products.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Num label="Length" unit="mm" value={Math.round(size[0] * 1000)} min={10} max={1500} step={5} onChange={(v) => edit((d) => ({ ...d, product: { ...d.product, size: [v / 1000, size[1], size[2]] } }))} />
                <Num label="Height" unit="mm" value={Math.round(size[1] * 1000)} min={5} max={1000} step={5} onChange={(v) => edit((d) => ({ ...d, product: { ...d.product, size: [size[0], v / 1000, size[2]] } }))} />
                <Num label="Width" unit="mm" value={Math.round(size[2] * 1000)} min={10} max={1200} step={5} onChange={(v) => edit((d) => ({ ...d, product: { ...d.product, size: [size[0], size[1], v / 1000] } }))} />
                <Num label="Weight" unit="kg" value={draft.product.kg ?? info.kg} min={0.01} max={500} step={0.1} onChange={(v) => edit((d) => ({ ...d, product: { ...d.product, kg: v } }))} />
              </div>
            </section>
            <section className="space-y-2">
              <p className={eyebrow}>Feed and destination</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <Num label="Feed" unit="parts/min · 0 = nonstop" value={draft.feed.rate} min={0} max={300} step={1} onChange={(v) => edit((d) => ({ ...d, feed: { ...d.feed, rate: v } }))} />
                <Num label="Gap" unit="mm" value={Math.round(draft.feed.gap * 1000)} min={5} max={3000} step={5} onChange={(v) => edit((d) => ({ ...d, feed: { ...d.feed, gap: v / 1000 } }))} />
                <label className="col-span-2 flex min-w-0 flex-col gap-1 text-[11px] text-muted-foreground sm:col-span-1">
                  Place on
                  <select aria-label="Destination" className={inputCls} value={dest} onChange={(e) => (setDest(e.target.value), setPlan(null))}>
                    {AUTOMATION_DESTINATIONS.map((d) => (
                      <option key={d.key} value={d.key}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>
            <section className="rounded-md border border-border p-2.5 text-xs leading-relaxed">
              <p>
                <span className="text-muted-foreground">Robot:</span>{" "}
                {robot ? (
                  <>
                    {robot.name}
                    {robot.payload ? ` · ${robot.payload} kg` : ""}
                    {robot.reach ? ` · ${robot.reach} mm reach` : ""}
                  </>
                ) : (
                  "none yet — drag one onto the floor"
                )}
              </p>
              <p>
                <span className="text-muted-foreground">Gripper:</span> {tool ? tool.name : "none yet — drop a gripper on the robot"}
              </p>
            </section>
          </div>

          <div className="min-w-0 md:border-l md:border-border md:pl-5">
            {plan ? (
              <PlanView plan={plan} />
            ) : (
              <div className="flex h-full min-h-[160px] flex-col justify-center gap-2 rounded-md border border-dashed border-border p-4 text-xs text-muted-foreground">
                <b className="text-sm font-medium text-foreground">Generate the automation</b>
                <p>Checks the robot's payload, the gripper, the belt and the feed, then writes the sequence — feed, convey, sense, pick, transfer, place, repeat — and the signals each step waits for.</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={generate}>
            Generate automation
          </Button>
          <Button disabled={!plan || !plan.ok} onClick={() => plan && props.onStart(draft, dest)} title={!plan ? "Generate the automation first" : !plan.ok ? "Fix the red items first" : undefined}>
            <Play className="mr-1 h-3.5 w-3.5" /> Start simulation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const STATE_TEXT: Record<string, string> = {
  RUN: "Belt running",
  BRAKE: "Braking to the pick position",
  READY: "Part ready for the robot",
  RESTART: "Belt restarting",
};

/** The conveyor pick's signals, live: lamps, PLC state, the robot, counts and the measured pace. */
export function AutomationIO(props: { state: AutomationState; playing: boolean; onPlay: () => void; onPause: () => void; onStep: () => void }) {
  const { state: a, playing } = props;
  // Open on a wide screen; on a phone just the header, so the cell stays in view.
  const [open, setOpen] = useState(() => typeof window === "undefined" || window.matchMedia("(min-width: 640px)").matches);
  const tags = MODE_SIGNALS[a.mode].filter((t) => t !== "ENC") as (keyof AutomationState["io"])[];
  const perHour = a.robot.lastCycle ? Math.floor(3600 / a.robot.lastCycle) : null;
  const lead = a.parts[0];
  return (
    <section aria-label="Conveyor automation signals" className="pointer-events-auto w-full max-w-3xl rounded-lg border border-border bg-background/95 text-xs shadow-lg backdrop-blur">
      <div className="px-3 py-2">
        <div className="flex items-center gap-2">
          <b className="shrink-0 font-medium">{a.mode === "track" ? "Conveyor tracking" : "Stop and pick"}</b>
          <span className="min-w-0 truncate rounded bg-muted px-1.5 py-0.5 text-[11px]">{a.mode === "track" ? "Belt never stops" : STATE_TEXT[a.state] ?? a.state}</span>
          <div className="ml-auto flex shrink-0 items-center">
            {playing ? (
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={props.onPause} aria-label="Pause">
                <Pause className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <>
                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={props.onStep} title="Run to the next event">
                  <SkipForward className="mr-1 h-3.5 w-3.5" /> Step
                </Button>
                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={props.onPlay} aria-label="Resume">
                  <Play className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label={open ? "Hide signals" : "Show signals"}>
              {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
        <p className="mt-0.5 truncate text-muted-foreground" title={a.robot.phase}>
          Robot: {a.robot.phase || "starting"}
        </p>
      </div>
      {open && (
        <div className="space-y-2 border-t border-border px-3 py-2">
          <ul className="flex flex-wrap gap-x-3 gap-y-1" aria-label="Signals">
            {tags.map((t) => (
              <li key={t} className="flex items-center gap-1.5 font-mono text-[10px]">
                <span aria-hidden className={cn("h-2 w-2 rounded-full", a.io[t] ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)]" : "bg-muted-foreground/25")} />
                <span className={a.io[t] ? "text-foreground" : "text-muted-foreground"}>{t}</span>
                <span className="sr-only">{a.io[t] ? "on" : "off"}</span>
              </li>
            ))}
            {a.mode === "track" && <li className="font-mono text-[10px] text-muted-foreground">ENC {a.encoder.toLocaleString("en-IN")}</li>}
          </ul>
          <p className="tabular-nums text-muted-foreground">
            Belt {a.velocity.toFixed(2)} / {a.speed.toFixed(2)} m/s · on belt {a.counters.onBelt}
            {lead && a.mode === "index" && <> · lead part {Math.max(0, Math.round((a.pickAt - lead.s) * 1000))} mm from pick</>} · fed {a.counters.fed} · picked{" "}
            {a.counters.picked} · placed {a.robot.placed}
            {a.mode === "track" && <> · missed {a.counters.missed}</>}
            {a.counters.gripFaults > 0 && <> · grip faults {a.counters.gripFaults}</>}
            {a.robot.lastCycle ? (
              <>
                {" "}
                · cycle <b className="font-medium text-foreground">{a.robot.lastCycle.toFixed(1)} s</b> · <b className="font-medium text-foreground">{perHour}</b> parts/h
              </>
            ) : (
              " · measuring the first cycle…"
            )}
          </p>
          {a.bottleneck && <p className={cn(a.bottleneck.by === "balanced" ? "text-muted-foreground" : "text-amber-700 dark:text-amber-400")}>{a.bottleneck.text}</p>}
          {a.events[0] && (
            <p className="truncate text-muted-foreground" title={a.events[0].msg}>
              <span className="font-mono tabular-nums">{a.events[0].t.toFixed(1)} s</span> {a.events[0].msg}
            </p>
          )}
          <p className="text-[10px] text-muted-foreground/80">Simulated signals for planning — not machine control or a certified safety design.</p>
        </div>
      )}
    </section>
  );
}
