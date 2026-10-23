import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { PixelArrow, PixelDot } from "@/components/hero/HeroConsole";

/*
 * Automation Studio pieces in the site's "console" language (see components/console/ConsoleUI):
 * numbered mono eyebrows, hairline readout strips and cut-corner buttons, sized for a working tool
 * rather than a landing page.
 */

/** "02 ■ THE JOB ———" — a numbered mono eyebrow with a hairline. */
export function Eyebrow({ index, label, rule = true, className }: { index?: string; label: ReactNode; rule?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground", className)}>
      {index && <span className="text-foreground">{index}</span>}
      <PixelDot className="text-primary" />
      <span className="min-w-0 truncate">{label}</span>
      {rule && <span aria-hidden className="h-px flex-1 bg-border" />}
    </div>
  );
}

/** Mono label over a value, in a grid divided by hairlines. `text` values wrap at body size. */
export function Readouts({
  items,
  cols = 4,
  text,
  className,
}: {
  items: { label: string; value: ReactNode }[];
  cols?: 2 | 3 | 4 | 6;
  text?: boolean;
  className?: string;
}) {
  const grid = { 2: "grid-cols-2", 3: "grid-cols-2 md:grid-cols-3", 4: "grid-cols-2 md:grid-cols-4", 6: "grid-cols-2 md:grid-cols-3 xl:grid-cols-6" }[cols];
  return (
    <dl className={cn("grid gap-px overflow-hidden border border-border bg-border", grid, className)}>
      {items.map((x) => (
        <div key={x.label} className="min-w-0 bg-card px-4 py-3">
          <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{x.label}</dt>
          <dd className={cn("mt-1 text-foreground", text ? "text-sm font-medium leading-snug" : "font-mono text-lg tabular-nums tracking-tight")}>{x.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** A cut-corner action button (the console button, as a real <button>). */
export function KitButton({
  children,
  onClick,
  disabled,
  variant = "solid",
  size = "md",
  type = "button",
  arrow = variant === "solid",
  className,
  ...aria
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "solid" | "outline";
  size?: "md" | "sm";
  type?: "button" | "submit";
  arrow?: boolean;
  className?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group inline-block text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...aria}
    >
      <span className={cn("rv-bevel block", variant === "solid" && "[--rv-edge:transparent]")} style={{ "--cut": "7px" } as React.CSSProperties}>
        <span
          className={cn(
            "rv-bevel-in flex items-center justify-center gap-2.5 font-mono uppercase tracking-[0.14em] transition-colors duration-150",
            size === "md" ? "h-11 px-5 text-xs" : "h-9 px-3.5 text-[11px]",
            variant === "solid"
              ? "bg-primary text-primary-foreground group-enabled:group-hover:bg-primary/90 group-enabled:group-active:bg-primary/80"
              : "bg-background text-foreground group-enabled:group-hover:bg-muted group-enabled:group-active:bg-muted/70",
          )}
        >
          {arrow && <PixelArrow />}
          {children}
        </span>
      </span>
    </button>
  );
}
