import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { PixelArrow, PixelDot } from "@/components/hero/HeroConsole";

/*
 * Shared pieces for the home page sections, in the same "console" language as
 * the hero: numbered mono eyebrows, uppercase headings, cut-corner frames and
 * pixel-square arrows. Colours come from the theme tokens so light and dark both work.
 */

/** Cut-corner frame. `console` switches to the dark hero palette. */
export function BevelBox({
  children,
  className,
  innerClassName,
  cut,
  console: dark,
}: {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  cut?: number;
  console?: boolean;
}) {
  return (
    <div
      className={cn("rv-bevel", dark && "rv-bevel-console", className)}
      style={cut ? ({ "--cut": `${cut}px` } as React.CSSProperties) : undefined}
    >
      <div className={cn("rv-bevel-in", innerClassName)}>{children}</div>
    </div>
  );
}

/** Section heading: "002 — Label" mono row with a hairline, then an uppercase title. */
export function SectionHead({
  index,
  label,
  title,
  subtitle,
  action,
  tone = "default",
  className,
}: {
  index: string;
  label: string;
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  tone?: "default" | "console";
  className?: string;
}) {
  const dark = tone === "console";
  return (
    <header className={cn("mb-8 md:mb-10", className)}>
      <div
        className={cn(
          "mb-5 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.18em]",
          dark ? "text-[hsl(var(--rv-console-ink)/0.65)]" : "text-muted-foreground",
        )}
      >
        <span className={dark ? "text-[hsl(var(--rv-console-ink))]" : "text-foreground"}>{index}</span>
        <PixelDot className={dark ? "text-[hsl(var(--rv-console-ink)/0.5)]" : "text-primary"} />
        <span>{label}</span>
        <span aria-hidden className={cn("h-px flex-1", dark ? "bg-[hsl(var(--rv-console-line))]" : "bg-border")} />
      </div>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl">
          <h2
            className={cn(
              "text-balance text-3xl font-semibold uppercase leading-[1.02] tracking-[-0.02em] md:text-[44px]",
              dark ? "text-[hsl(var(--rv-console-ink))]" : "text-foreground",
            )}
          >
            {title}
          </h2>
          {subtitle && (
            <p
              className={cn(
                "mt-3 max-w-2xl text-base leading-relaxed md:text-lg",
                dark ? "text-[hsl(var(--rv-console-ink)/0.7)]" : "text-muted-foreground",
              )}
            >
              {subtitle}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </header>
  );
}

const linkFocus =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** Mono uppercase text link with a pixel arrow, e.g. "View all robots". */
export function ConsoleLink({
  to,
  children,
  className,
  tone = "default",
}: {
  to: string;
  children: ReactNode;
  className?: string;
  tone?: "default" | "console";
}) {
  return (
    <Link
      to={to}
      className={cn(
        "group inline-flex items-center gap-2.5 font-mono text-xs uppercase tracking-[0.14em] no-underline transition-colors duration-150",
        tone === "console"
          ? "text-[hsl(var(--rv-console-ink))] hover:text-[hsl(var(--rv-console-ink)/0.75)]"
          : "text-foreground hover:text-primary",
        linkFocus,
        className,
      )}
    >
      {children}
      <PixelArrow />
    </Link>
  );
}

/** Cut-corner button link. `tone` says which background it sits on. */
export function ConsoleButton({
  to,
  children,
  variant = "solid",
  tone = "default",
  className,
}: {
  to: string;
  children: ReactNode;
  variant?: "solid" | "outline";
  tone?: "default" | "console";
  className?: string;
}) {
  const dark = tone === "console";
  const inner =
    variant === "solid"
      ? dark
        ? "bg-[hsl(var(--rv-console-ink))] text-[hsl(var(--rv-console-bg))] group-hover:bg-[hsl(var(--rv-console-ink)/0.88)]"
        : "bg-primary text-primary-foreground group-hover:bg-primary/90"
      : dark
        ? "bg-[hsl(var(--rv-console-bg))] text-[hsl(var(--rv-console-ink))] group-hover:bg-[hsl(222_40%_11%)]"
        : "bg-background text-foreground group-hover:bg-muted";
  return (
    <Link to={to} className={cn("group inline-block no-underline", linkFocus, className)}>
      <span
        className={cn(
          "rv-bevel block",
          variant === "solid" && "[--rv-edge:transparent]",
          dark && variant === "outline" && "[--rv-edge:hsl(var(--rv-console-line))]",
        )}
        style={{ "--cut": "8px" } as React.CSSProperties}
      >
        <span
          className={cn(
            "rv-bevel-in flex h-12 items-center justify-center gap-3 px-6 font-mono text-xs uppercase tracking-[0.16em] transition-colors duration-150",
            inner,
          )}
        >
          <PixelArrow />
          {children}
        </span>
      </span>
    </Link>
  );
}

/** One cell of a mono readout strip: small label over a tabular value. */
export function Readout({
  label,
  value,
  tone = "default",
  className,
}: {
  label: string;
  value: ReactNode;
  tone?: "default" | "console";
  className?: string;
}) {
  const dark = tone === "console";
  return (
    <div className={cn("px-4 py-3.5", className)}>
      <p
        className={cn(
          "font-mono text-[10px] uppercase tracking-[0.16em]",
          dark ? "text-[hsl(var(--rv-console-ink)/0.55)]" : "text-muted-foreground",
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-mono text-lg tabular-nums tracking-tight md:text-xl",
          dark ? "text-[hsl(var(--rv-console-ink))]" : "text-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}

export const pad3 = (n: number) => String(n).padStart(3, "0");
export const pad2 = (n: number) => String(n).padStart(2, "0");
