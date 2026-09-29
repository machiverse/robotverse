import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bot, Check, ExternalLink, Factory, Loader2, Mail, Store, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AiStation } from "./aiSolution";
import { inr } from "./aiSolution";
import { imageCandidates } from "@/components/directory/directoryTypes";
import {
  loadDirectoryRobots, loadDirectoryTools, loadMarketRobots, loadMarketTools,
  matchMarketRobots, matchMarketTools, matchOemRobots, matchOemTools, needOf,
  type Match, type Source,
} from "./equipmentMatch";

export type Choice = { robot?: Match; tool?: Match };
type Data = {
  oemRobots: Awaited<ReturnType<typeof loadDirectoryRobots>>;
  oemTools: Awaited<ReturnType<typeof loadDirectoryTools>>;
  marketRobots: Record<string, unknown>[];
  marketTools: Record<string, unknown>[];
};

const STORE = "rv-studio-equipment:";

/**
 * Lets the user choose, for every station, the robot and the end-of-arm tool:
 * from RobotVerse marketplace listings or direct from the OEM directory.
 * Matches are sized to the station (payload, reach, application, cobot/SCARA/delta).
 */
export default function EquipmentPicker({
  stations,
  briefKey,
  onChange,
}: {
  stations: AiStation[];
  briefKey: string;
  /** Called with the current choices per station index (e.g. to show them in 3D). */
  onChange?: (choices: Record<number, Choice>) => void;
}) {
  const [data, setData] = useState<Data | null>(null);
  const key = STORE + briefKey.slice(0, 200);
  const [choices, setChoices] = useState<Record<number, Choice>>(() => {
    try {
      return JSON.parse(localStorage.getItem(key) || "{}");
    } catch {
      return {};
    }
  });

  useEffect(() => {
    let live = true;
    Promise.all([loadDirectoryRobots(), loadDirectoryTools(), loadMarketRobots(), loadMarketTools()]).then(([oemRobots, oemTools, marketRobots, marketTools]) => {
      if (live) setData({ oemRobots, oemTools, marketRobots, marketTools });
    });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(choices));
    } catch {
      /* private mode */
    }
    onChange?.(choices);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, choices]);

  const matches = useMemo(() => {
    if (!data) return null;
    return stations.map((st) => {
      const need = needOf(st);
      return {
        need,
        robots: { market: matchMarketRobots(need, data.marketRobots), oem: matchOemRobots(need, data.oemRobots) },
        tools: {
          market: matchMarketTools(need, data.marketTools, `${st.name} ${st.tooling}`),
          oem: matchOemTools(need, data.oemTools, `${st.name} ${st.tooling}`),
        },
      };
    });
  }, [data, stations]);

  const choose = (i: number, part: "robot" | "tool", m: Match) =>
    setChoices((c) => ({ ...c, [i]: { ...c[i], [part]: c[i]?.[part]?.id === m.id ? undefined : m } }));

  const picked = Object.values(choices).flatMap((c) => [c.robot, c.tool]).filter(Boolean) as Match[];
  const priced = picked.filter((m) => m.source === "market" && m.price);
  const total = priced.reduce((n, m) => n + (m.price ?? 0), 0);
  const quotes = picked.filter((m) => m.source === "oem" || !m.price).length;

  const mailto = () => {
    const lines = stations.map((st, i) => {
      const c = choices[i] ?? {};
      const fmt = (m?: Match) => (m ? `${m.name} (${m.source === "market" ? "RobotVerse listing" : "OEM"}${m.price ? `, ${inr(m.price)}` : ""})` : "not chosen");
      return `${String(i + 1).padStart(2, "0")} ${st.name}\n   Robot: ${fmt(c.robot)}\n   EOAT: ${fmt(c.tool)}`;
    });
    const body = `Please quote the following automation equipment chosen in RobotVerse Automation Studio:\n\n${lines.join("\n\n")}\n\nThank you.`;
    return `mailto:support@robotverse.in?subject=${encodeURIComponent("Automation Studio equipment selection")}&body=${encodeURIComponent(body)}`;
  };

  return (
    <section aria-label="Choose robots and tooling" className="rounded-lg border border-border">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-border p-4">
        <div>
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <Bot className="h-4 w-4 text-primary" aria-hidden /> Choose your robots & tooling
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Every option is matched to the station: payload with margin, reach, application and robot type. Buy from a RobotVerse seller, or direct from the OEM.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Store className="h-3.5 w-3.5 text-emerald-500" aria-hidden /> RobotVerse marketplace</span>
          <span className="inline-flex items-center gap-1"><Factory className="h-3.5 w-3.5 text-sky-500" aria-hidden /> Direct from OEM</span>
        </div>
      </header>

      {!matches ? (
        <p className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Matching robots and tooling from the marketplace and the OEM directory…
        </p>
      ) : (
        <ol className="divide-y divide-border">
          {stations.map((st, i) => {
            const m = matches[i];
            return (
              <li key={i} className="p-4">
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium">
                    <span className="mr-1.5 font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                    {st.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Needs ≥ {m.need.payload} kg{m.need.reach ? ` · ~${m.need.reach} mm reach` : ""}
                    {m.need.cobot ? " · cobot" : ""}
                    {m.need.robotType ? ` · ${m.need.robotType}` : ""}
                  </p>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <Column
                    icon={<Bot className="h-3.5 w-3.5" aria-hidden />}
                    title="Robot"
                    options={m.robots}
                    chosen={choices[i]?.robot}
                    onChoose={(x) => choose(i, "robot", x)}
                    emptyMarket={`/robots?search=${encodeURIComponent(st.name.split(" ")[0])}`}
                  />
                  <div className="min-w-0 space-y-2">
                  {m.need.payload > 30 && ["handling", "palletizing", "machining", "transport", "packing"].includes(m.need.kind) && (
                    <p className="rounded-md border border-amber-500/40 bg-amber-500/5 p-2 text-xs text-muted-foreground">
                      Heavy load: most catalogue grippers are rated below 20–25 kg. A heavy-duty
                      {st.tooling ? ` ${st.tooling.split(/[,(]/)[0].trim().toLowerCase()}` : " gripper"} is usually built to order by the integrator — the options below suit lighter parts.
                    </p>
                  )}
                  <Column
                    icon={<Wrench className="h-3.5 w-3.5" aria-hidden />}
                    title={`End-of-arm tool${st.tooling ? ` · recommended: ${st.tooling.split(",")[0]}` : ""}`}
                    options={m.tools}
                    chosen={choices[i]?.tool}
                    onChoose={(x) => choose(i, "tool", x)}
                    emptyMarket="/parts"
                  />
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/30 p-4">
        <p className="text-sm">
          <span className="font-medium">Your selection: </span>
          {picked.length === 0 ? (
            <span className="text-muted-foreground">nothing chosen yet</span>
          ) : (
            <span className="text-muted-foreground">
              {picked.filter((p) => p.kind === "robot").length} robot(s), {picked.filter((p) => p.kind === "tool").length} tool(s)
              {priced.length > 0 && <> · marketplace total <span className="font-medium text-foreground">{inr(total)}</span></>}
              {quotes > 0 && <> · {quotes} item(s) on quotation</>}
            </span>
          )}
        </p>
        <div className="flex gap-2">
          {picked.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => setChoices({})}>
              Clear
            </Button>
          )}
          <Button size="sm" asChild disabled={!picked.length}>
            <a href={picked.length ? mailto() : undefined} aria-disabled={!picked.length}>
              <Mail className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Request quotes for my selection
            </a>
          </Button>
        </div>
      </footer>
    </section>
  );
}

function Column({
  icon, title, options, chosen, onChoose, emptyMarket,
}: {
  icon: React.ReactNode;
  title: string;
  options: Record<Source, Match[]>;
  chosen?: Match;
  onChoose: (m: Match) => void;
  emptyMarket: string;
}) {
  const [tab, setTab] = useState<Source>(options.market.length ? "market" : "oem");
  const list = options[tab];
  return (
    <div className="min-w-0 rounded-md border border-border">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
        <p className="flex min-w-0 items-center gap-1.5 text-xs font-medium">
          {icon}
          <span className="truncate">{title}</span>
        </p>
        <div className="flex overflow-hidden rounded border border-border text-[11px]" role="tablist">
          {(["market", "oem"] as Source[]).map((s) => (
            <button
              key={s}
              role="tab"
              aria-selected={tab === s}
              onClick={() => setTab(s)}
              className={cn("px-2 py-1", tab === s ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
            >
              {s === "market" ? `Marketplace (${options.market.length})` : `OEM (${options.oem.length})`}
            </button>
          ))}
        </div>
      </div>
      {list.length === 0 ? (
        <p className="p-3 text-xs text-muted-foreground">
          {tab === "market" ? (
            <>
              No marketplace listing fits this station yet.{" "}
              <button className="text-primary hover:underline" onClick={() => setTab("oem")}>
                See OEM options
              </button>{" "}
              or <Link to={emptyMarket} className="text-primary hover:underline">browse listings</Link>.
            </>
          ) : (
            "No OEM model in the directory matches this need."
          )}
        </p>
      ) : (
        <ul className="max-h-80 divide-y divide-border overflow-auto">
          {list.map((m) => {
            const on = chosen?.id === m.id && chosen.source === m.source;
            return (
              <li key={`${m.source}-${m.id}`} className={cn("flex gap-3 p-2.5", on && "bg-primary/5")}>
                <Thumb m={m} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{m.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[m.brand, m.type, m.payload != null ? `${m.payload} kg` : "", m.reach ? `${m.reach} mm` : "", m.axes ? `${m.axes}-axis` : ""].filter(Boolean).join(" · ")}
                  </p>
                  <p className="mt-0.5 flex flex-wrap gap-x-2 text-[11px] text-emerald-600 dark:text-emerald-400">
                    {m.reasons.slice(0, 2).map((r) => (
                      <span key={r}>✓ {r}</span>
                    ))}
                  </p>
                  <p className="mt-0.5 text-xs">
                    {m.source === "market" ? (
                      m.price ? <span className="font-medium">{inr(m.price)}</span> : <span className="text-muted-foreground">Ask seller for price</span>
                    ) : (
                      <span className="text-muted-foreground">Quotation from OEM / distributor</span>
                    )}
                    {m.location && <span className="text-muted-foreground"> · {m.location}</span>}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Button size="sm" variant={on ? "default" : "outline"} className="h-7 px-2 text-xs" onClick={() => onChoose(m)} aria-pressed={on}>
                    {on ? <><Check className="mr-1 h-3 w-3" /> Chosen</> : "Choose"}
                  </Button>
                  <Link to={m.href} target="_blank" className="inline-flex items-center gap-0.5 text-[11px] text-primary hover:underline">
                    View <ExternalLink className="h-3 w-3" aria-hidden />
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Thumb({ m }: { m: Match }) {
  // Marketplace photo, or the directory image from our storage (copied on demand as a fallback).
  const [primary, fallback] = m.file
    ? imageCandidates(m.kind === "robot" ? "robots" : "tools", { id: m.id, ...m.file } as never, undefined, false)
    : [m.image, undefined];
  const [src, setSrc] = useState(primary);
  const Icon = m.kind === "robot" ? Bot : Wrench;
  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
      {src ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          className="h-full w-full object-contain"
          onError={() => setSrc(src === primary && fallback ? fallback : undefined)}
        />
      ) : (
        <Icon className="h-6 w-6 text-muted-foreground" aria-hidden />
      )}
    </div>
  );
}
