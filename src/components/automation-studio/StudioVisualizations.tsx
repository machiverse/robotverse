import { useEffect, useId, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { VisualMotionProps, VisualStation } from "./visualTypes";

const placeStations = (stations: VisualStation[]) => stations.slice(0, 6).map((station, index) => ({
  ...station,
  x: 40 + (index % 3) * 270,
  y: index < 3 ? 70 : 260,
}));

const StationTooltip = ({ station, x, y }: { station: VisualStation; x: number; y: number }) => (
  <foreignObject x={x} y={y} width="218" height="128" className="as-station-tooltip">
    <div className="rounded-md border border-border bg-popover p-2.5 text-[10px] text-popover-foreground shadow-lg">
      <p className="font-semibold">{station.model}</p>
      <div className="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-0.5 text-muted-foreground">
        <span>Payload</span><span className="text-foreground">{station.payload}</span>
        <span>Reach</span><span className="text-foreground">{station.reach}</span>
        <span>EOAT</span><span className="text-foreground">{station.eoat}</span>
        <span>Cycle</span><span className="text-foreground">{station.cycle}</span>
      </div>
    </div>
  </foreignObject>
);

const RobotArmSymbol = ({ x, y }: { x: number; y: number }) => (
  <g transform={`translate(${x} ${y})`} className="stroke-primary" fill="none" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 34h40M10 34V23h25v11M22 23l9-15" />
    <circle cx="31" cy="8" r="4" className="fill-card" />
    <g className="as-layout-wrist" transform="translate(31 8)">
      <path d="M0 0l17 10 13-10" />
      <circle cx="17" cy="10" r="4" className="fill-card" />
      <path d="M30 0l8-5M30 0l8 6" strokeWidth="3" />
    </g>
  </g>
);

export function FactoryLayoutSvg({ stations, playing, speed, active = true }: { stations: VisualStation[] } & VisualMotionProps) {
  const placed = placeStations(stations);
  const uid = useId().replace(/:/g, "");
  const [hovered, setHovered] = useState<number | null>(null);
  const gridId = `${uid}-factory-grid`;
  const arrowId = `${uid}-factory-arrow`;
  const paths = placed.slice(1).map((station, index) => {
    const previous = placed[index];
    return previous.y === station.y
      ? `M${previous.x + 210},${previous.y + 64} L${station.x},${station.y + 64}`
      : `M${previous.x + 105},${previous.y + 128} C${previous.x + 105},${station.y - 25} ${station.x + 105},${previous.y + 155} ${station.x + 105},${station.y}`;
  });

  return (
    <div className="automation-studio-visuals overflow-hidden rounded-lg border border-border" data-speed={speed} data-paused={!playing || !active ? "true" : "false"}>
      <svg viewBox="0 0 900 470" className="h-auto min-h-[340px] w-full" role="img" aria-label="Animated factory layout preview">
        <defs>
          <pattern id={gridId} width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" className="stroke-border" strokeWidth="1.2" /></pattern>
          <marker id={arrowId} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" className="fill-accent-foreground" /></marker>
        </defs>
        <rect width="900" height="470" className="fill-muted" />
        <rect width="900" height="470" fill={`url(#${gridId})`} opacity="0.95" />
        <g className={cn("as-flow-network", hovered !== null && "is-focused")} fill="none">
          {paths.map((path, index) => (
            <g key={path} className={cn("as-flow-connection", hovered !== null && (index === hovered || index + 1 === hovered) && "is-connected")}>
              <path d={path} className="as-dashflow stroke-accent-foreground" strokeWidth="3" strokeDasharray="8 6" markerEnd={`url(#${arrowId})`} />
              {[0, 1].map((dot) => <circle key={dot} r="4" className="fill-primary as-layout-flow-dot" style={{ offsetPath: `path('${path}')`, animationDelay: `${-(index * 0.7 + dot * 1.4)}s` }} />)}
            </g>
          ))}
        </g>
        {placed.map((station, index) => (
          <g
            key={station.label}
            className="as-station-group cursor-pointer"
            tabIndex={0}
            role="group"
            aria-label={`${station.model}, ${station.payload} payload, ${station.reach} reach, ${station.eoat}, ${station.cycle} cycle`}
            onMouseEnter={() => setHovered(index)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(index)}
            onBlur={() => setHovered(null)}
          >
            <rect x={station.x - 10} y={station.y - 10} width="230" height="148" rx="12" className={station.automation === "full" ? "fill-success/10 stroke-success" : "fill-warning/10 stroke-warning"} strokeWidth="1.5" strokeDasharray="7 5" />
            <rect x={station.x} y={station.y} width="210" height="128" rx="7" className={station.automation === "full" ? "fill-card stroke-success" : "fill-card stroke-warning"} strokeWidth="2" />
            <RobotArmSymbol x={station.x + 15} y={station.y + 17} />
            <circle cx={station.x + 75} cy={station.y + 23} r="5" className="fill-success as-activity-dot" />
            <text x={station.x + 92} y={station.y + 28} className="fill-muted-foreground" fontSize="10">{station.eoat}</text>
            <text x={station.x + 14} y={station.y + 92} className="fill-foreground" fontSize="12" fontWeight="600">{station.label}</text>
            <text x={station.x + 14} y={station.y + 112} className="fill-muted-foreground" fontSize="10">Cycle: {station.cycle}</text>
            <StationTooltip station={station} x={Math.min(station.x + 14, 660)} y={station.y < 150 ? station.y + 132 : station.y - 130} />
          </g>
        ))}
        <g transform="translate(40 420)"><rect width="470" height="34" rx="5" className="fill-card stroke-border" /><rect x="16" y="11" width="14" height="12" className="fill-success/10 stroke-success" /><text x="38" y="22" className="fill-muted-foreground" fontSize="10">Safety envelope</text><circle cx="165" cy="17" r="5" className="fill-success" /><text x="177" y="22" className="fill-muted-foreground" fontSize="10">Active robot</text><line x1="273" y1="17" x2="306" y2="17" className="stroke-primary" strokeDasharray="6 4" /><text x="316" y="22" className="fill-muted-foreground" fontSize="10">Material flow</text></g>
      </svg>
    </div>
  );
}

export function MaterialFlowSvg({ stations, playing, speed, active = true }: { stations: VisualStation[] } & VisualMotionProps) {
  const placed = placeStations(stations);
  const uid = useId().replace(/:/g, "");
  const [counts, setCounts] = useState(() => stations.slice(0, 6).map(() => 0));
  const [throughput, setThroughput] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);
  const paths = useMemo(() => placed.slice(1).map((station, index) => {
    const previous = placed[index];
    return previous.y === station.y
      ? `M${previous.x + 210},${previous.y + 64} L${station.x},${station.y + 64}`
      : `M${previous.x + 105},${previous.y + 128} C${previous.x + 105},${station.y - 20} ${station.x + 105},${previous.y + 160} ${station.x + 105},${station.y}`;
  }), [placed]);

  useEffect(() => {
    if (!playing || !active) return;
    const multiplier = speed === "2" ? 2 : speed === "0.5" ? 0.5 : 1;
    const timer = window.setInterval(() => {
      setCounts((current) => current.map((count, index) => count + (index % 2 === 0 ? 1 : 2)));
      setThroughput((value) => Math.min(47, value + 1));
    }, 700 / multiplier);
    return () => window.clearInterval(timer);
  }, [active, playing, speed]);

  return (
    <div className="automation-studio-visuals overflow-hidden rounded-lg border border-border bg-muted/30" data-speed={speed} data-paused={!playing || !active ? "true" : "false"}>
      <svg viewBox="0 0 900 475" className="h-auto min-h-[340px] w-full" role="img" aria-label="Animated material flow">
        <defs><pattern id={`${uid}-flow-grid`} width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" className="stroke-border" strokeWidth="1" /></pattern><pattern id={`${uid}-conveyor`} width="18" height="18" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="7" height="18" className="fill-primary/20" /></pattern><filter id={`${uid}-part-glow`} x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="6" result="blur"/><feFlood floodColor="hsl(var(--primary))" floodOpacity="0.45"/><feComposite in2="blur" operator="in"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
        <rect width="900" height="475" className="fill-muted" /><rect width="900" height="475" fill={`url(#${uid}-flow-grid)`} />
        <g className={cn("as-flow-network", hovered !== null && "is-focused")}>
          {paths.map((path, index) => (
            <g key={path} className={cn("as-flow-connection", hovered !== null && (index === hovered || index + 1 === hovered) && "is-connected")}>
              <path d={path} fill="none" className="stroke-border" strokeWidth="18" strokeLinecap="round" />
              <path d={path} fill="none" stroke={`url(#${uid}-conveyor)`} strokeWidth="13" className="as-conveyor-line" />
              {[0, 1].map((dot) => <g key={dot}><circle r="12" className="fill-primary" opacity="0.18" style={{ offsetPath: `path('${path}')`, animationDelay: `${-(index + dot * 1.2)}s` }} /><circle r="8" className="fill-primary as-flow-part" filter={`url(#${uid}-part-glow)`} style={{ offsetPath: `path('${path}')`, animationDelay: `${-(index + dot * 1.2)}s` }} /></g>)}
            </g>
          ))}
        </g>
        {placed.map((station, index) => (
          <g key={station.label} className="as-station-group cursor-pointer" tabIndex={0} role="group" aria-label={`${station.model}, ${station.payload} payload, ${station.reach} reach, ${station.eoat}, ${station.cycle} cycle`} onMouseEnter={() => setHovered(index)} onMouseLeave={() => setHovered(null)} onFocus={() => setHovered(index)} onBlur={() => setHovered(null)}>
            <rect x={station.x + 6} y={station.y + 7} width="210" height="128" rx="7" className="fill-border" opacity="0.75" />
            <rect x={station.x} y={station.y} width="210" height="128" rx="7" className={station.automation === "full" ? "fill-card stroke-success" : "fill-card stroke-warning"} strokeWidth="2" />
            <rect x={station.x + 23} y={station.y - 22} width="164" height="28" rx="5" className="fill-popover stroke-border" />
            <text x={station.x + 105} y={station.y - 4} textAnchor="middle" className="fill-popover-foreground" fontSize="10" fontWeight="600">{counts[index] ?? 0} parts processed</text>
            <text x={station.x + 105} y={station.y + 53} textAnchor="middle" className="fill-foreground" fontSize="12" fontWeight="600">{station.label}</text>
            <text x={station.x + 105} y={station.y + 76} textAnchor="middle" className="fill-primary" fontSize="11">{station.cycle}/cycle</text>
            <text x={station.x + 105} y={station.y + 99} textAnchor="middle" className="fill-muted-foreground" fontSize="9">{station.model}</text>
            {index < placed.length - 1 && <rect x={station.x + 218} y={station.y + 51} width="20" height="26" rx="3" className="fill-warning" opacity="0.85" />}
            <StationTooltip station={station} x={Math.min(station.x + 14, 660)} y={station.y < 150 ? station.y + 132 : station.y - 130} />
          </g>
        ))}
      </svg>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-card px-4 py-3 text-sm"><span className="text-muted-foreground">Live buffers and station output</span><span className="font-semibold text-primary tabular-nums">Estimated: {throughput} parts/hour</span></div>
    </div>
  );
}