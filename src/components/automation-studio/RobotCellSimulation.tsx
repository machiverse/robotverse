import { useId } from "react";
import type { VisualMotionProps, VisualStation } from "./visualTypes";

interface RobotCellSimulationProps extends VisualMotionProps {
  station: VisualStation;
}

const DetailTooltip = ({ station }: { station: VisualStation }) => (
  <foreignObject x="565" y="48" width="275" height="126" className="as-cell-tooltip">
    <div className="rounded-md border border-border bg-popover p-3 text-xs text-popover-foreground shadow-lg">
      <p className="font-semibold">{station.model}</p>
      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-muted-foreground">
        <span>Payload</span><span className="text-foreground">{station.payload}</span>
        <span>Reach</span><span className="text-foreground">{station.reach}</span>
        <span>EOAT</span><span className="text-foreground">{station.eoat}</span>
        <span>Cycle</span><span className="text-foreground">{station.cycle}</span>
      </div>
    </div>
  </foreignObject>
);

export default function RobotCellSimulation({ station, playing, speed, active = true }: RobotCellSimulationProps) {
  const uid = useId().replace(/:/g, "");
  const stripeId = `${uid}-cell-stripes`;
  const gridId = `${uid}-cell-grid`;
  const glowId = `${uid}-joint-glow`;
  const isWelding = /weld|torch/i.test(`${station.label} ${station.eoat}`);

  return (
    <div
      className="automation-studio-visuals overflow-x-auto rounded-lg border border-border bg-muted/30"
      data-speed={speed}
      data-paused={!playing || !active ? "true" : "false"}
    >
      <svg viewBox="0 0 900 520" className="h-auto w-full min-w-[760px]" role="img" aria-label={`Animated robot cell for ${station.label}`}>
        <defs>
          <pattern id={gridId} width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M32 0H0V32" fill="none" className="stroke-border" strokeWidth="1" />
          </pattern>
          <pattern id={stripeId} width="28" height="28" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
            <rect width="12" height="28" className="fill-primary/20" />
          </pattern>
          <filter id={glowId} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feFlood floodColor="hsl(var(--primary))" floodOpacity="0.48" />
            <feComposite in2="blur" operator="in" />
            <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <rect width="900" height="520" className="fill-card" />
        <rect width="900" height="520" fill={`url(#${gridId})`} opacity="0.55" />
        <rect x="35" y="28" width="830" height="405" rx="10" fill="none" className="stroke-warning" strokeWidth="3" strokeDasharray="12 9" opacity="0.7" />
        <text x="52" y="54" className="fill-warning" fontSize="11" fontWeight="600">SAFETY FENCE</text>
        <line x1="35" y1="330" x2="35" y2="414" className="stroke-warning as-light-curtain" strokeWidth="7" strokeDasharray="8 7" />
        <line x1="865" y1="330" x2="865" y2="414" className="stroke-warning as-light-curtain" strokeWidth="7" strokeDasharray="8 7" />

        <rect x="66" y="328" width="768" height="102" rx="10" className="fill-muted stroke-border" strokeWidth="2" />
        <rect x="76" y="346" width="748" height="60" rx="5" fill={`url(#${stripeId})`} className="as-conveyor-belt stroke-primary" strokeWidth="2" />
        {Array.from({ length: 12 }, (_, index) => <circle key={index} cx={96 + index * 64} cy="420" r="7" className="fill-border" />)}
        {[0, 1, 2].map((index) => (
          <g key={index} className={`as-cell-part as-cell-part-${index + 1}`}>
            <rect x="86" y="359" width="38" height="30" rx="3" className="fill-primary stroke-primary" strokeWidth="2" />
            <path d="M92 367h26M92 374h20" className="stroke-primary-foreground" strokeWidth="2" opacity="0.75" />
          </g>
        ))}

        <rect x="112" y="270" width="145" height="128" rx="8" className="fill-success/5 stroke-success as-zone-active" strokeWidth="3" strokeDasharray="9 6" />
        <text x="184" y="293" textAnchor="middle" className="fill-success" fontSize="12" fontWeight="700">PICK-UP ZONE</text>
        <rect x="645" y="270" width="145" height="128" rx="8" className="fill-primary/5 stroke-primary as-zone-active" strokeWidth="3" strokeDasharray="9 6" />
        <text x="717" y="293" textAnchor="middle" className="fill-primary" fontSize="12" fontWeight="700">PLACE ZONE</text>

        <ellipse cx="450" cy="364" rx="142" ry="24" className="fill-foreground" opacity="0.1" />
        <g className="as-robot-interactive" tabIndex={0} role="group" aria-label={`${station.model}, ${station.payload} payload, ${station.reach} reach, ${station.eoat}, ${station.cycle} cycle`}>
          <DetailTooltip station={station} />
          <g transform="translate(438 352)">
            <rect x="-52" y="-18" width="104" height="24" rx="5" className="fill-primary stroke-primary" strokeWidth="3" />
            <circle r="38" cy="-20" className="fill-card stroke-primary" strokeWidth="13" filter={`url(#${glowId})`} />
            <g className="as-arm-shoulder">
              <line x1="0" y1="-20" x2="0" y2="-128" className="stroke-primary" strokeWidth="30" strokeLinecap="round" />
              <circle cy="-128" r="20" className="fill-card stroke-primary" strokeWidth="10" filter={`url(#${glowId})`} />
              <g transform="translate(0 -128)" className="as-arm-elbow">
                <line x1="0" y1="0" x2="106" y2="-74" className="stroke-primary" strokeWidth="26" strokeLinecap="round" />
                <circle cx="106" cy="-74" r="18" className="fill-card stroke-primary" strokeWidth="9" filter={`url(#${glowId})`} />
                <g transform="translate(106 -74)" className="as-arm-wrist">
                  <line x1="0" y1="0" x2="82" y2="42" className="stroke-primary" strokeWidth="20" strokeLinecap="round" />
                  <circle cx="82" cy="42" r="14" className="fill-card stroke-primary" strokeWidth="8" filter={`url(#${glowId})`} />
                  <g transform="translate(82 42)" className="as-cell-gripper stroke-primary" strokeWidth="7" strokeLinecap="round">
                    <line x1="0" y1="0" x2="22" y2="11" />
                    <line x1="22" y1="11" x2="34" y2="1" />
                    <line x1="22" y1="11" x2="34" y2="23" />
                  </g>
                  {isWelding && (
                    <g transform="translate(120 55)" className="as-weld-sparks">
                      <circle r="12" className="fill-warning" opacity="0.85" />
                      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
                        <line key={angle} x1="16" y1="0" x2="42" y2="0" transform={`rotate(${angle})`} className="stroke-warning" strokeWidth="4" strokeLinecap="round" />
                      ))}
                    </g>
                  )}
                </g>
              </g>
            </g>
          </g>
        </g>

        <g transform="translate(55 462)">
          <rect width="790" height="42" rx="6" className="fill-popover stroke-border" />
          <circle cx="20" cy="21" r="6" className="fill-success as-status-pulse" />
          <text x="36" y="26" className="fill-popover-foreground" fontSize="13" fontWeight="600">Cycle: 2.5s</text>
          <text x="160" y="26" className="fill-muted-foreground" fontSize="13">|</text>
          <text x="181" y="26" className="fill-popover-foreground" fontSize="13" fontWeight="600">Parts/hr: 1,440</text>
          <text x="335" y="26" className="fill-muted-foreground" fontSize="13">|</text>
          <text x="356" y="26" className="fill-success" fontSize="13" fontWeight="700">Status: {playing ? "Running" : "Paused"}</text>
          <text x="770" y="26" textAnchor="end" className="fill-muted-foreground" fontSize="11">{station.label}</text>
        </g>
      </svg>
    </div>
  );
}