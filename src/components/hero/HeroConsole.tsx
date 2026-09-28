import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/*
 * "Console" graphic language for the home hero: chamfered frames, pixel-square
 * icons, crosshair corner markers and monospace labels that decode into place.
 */

/** Frame with cut corners. `cut` is the corner size in px; the 1px edge is drawn with a second clipped layer. */
export function Bevel({
  children,
  cut = 12,
  className,
  edge = "hsl(var(--rv-console-line))",
  fill = "transparent",
}: {
  children: ReactNode;
  cut?: number;
  className?: string;
  edge?: string;
  fill?: string;
}) {
  const clip = (c: number) =>
    `polygon(${c}px 0, calc(100% - ${c}px) 0, 100% ${c}px, 100% calc(100% - ${c}px), calc(100% - ${c}px) 100%, ${c}px 100%, 0 calc(100% - ${c}px), 0 ${c}px)`;
  return (
    <div className={cn("relative p-px", className)} style={{ clipPath: clip(cut), background: edge }}>
      <div className="h-full w-full" style={{ clipPath: clip(Math.max(0, cut - 0.5)), background: fill }}>
        {children}
      </div>
    </div>
  );
}

/** 2x3 grid of squares shaped as an arrow; the missing squares fill in on hover. */
export function PixelArrow({ className }: { className?: string }) {
  const on = "opacity-100";
  const off = "opacity-0 transition-opacity duration-150 group-hover:opacity-100";
  return (
    <span aria-hidden className={cn("relative inline-block h-3 w-2", className)}>
      <span className={cn("absolute left-0 top-0 h-1 w-1 bg-current", on)} />
      <span className={cn("absolute right-0 top-0 h-1 w-1 bg-current", off)} />
      <span className={cn("absolute left-0 top-1/2 h-1 w-1 -translate-y-1/2 bg-current", off)} />
      <span className={cn("absolute right-0 top-1/2 h-1 w-1 -translate-y-1/2 bg-current", on)} />
      <span className={cn("absolute bottom-0 left-0 h-1 w-1 bg-current", on)} />
      <span className={cn("absolute bottom-0 right-0 h-1 w-1 bg-current", off)} />
    </span>
  );
}

/** Small square used as a bullet / status light. */
export const PixelDot = ({ className }: { className?: string }) => (
  <span aria-hidden className={cn("inline-block h-1.5 w-1.5 bg-current", className)} />
);

/** Crosshair marks at the four corners of the nearest positioned parent. */
export function CornerMarks({ inset = 12, className }: { inset?: number; className?: string }) {
  const mark = "absolute h-2 w-2 bg-[hsl(var(--rv-console-ink))]";
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0", className)}>
      <span className={mark} style={{ left: inset, top: inset }} />
      <span className={mark} style={{ right: inset, top: inset }} />
      <span className={mark} style={{ left: inset, bottom: inset }} />
      <span className={mark} style={{ right: inset, bottom: inset }} />
    </div>
  );
}

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/#-";

/**
 * Monospace label that decodes into place when `text` changes: random glyphs
 * resolve left to right in about 360ms. Reduced motion shows the text at once.
 */
export function DecodeText({ text, className }: { text: string; className?: string }) {
  const [shown, setShown] = useState(text);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(text);
      return;
    }
    const start = performance.now();
    const dur = 360;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      const fixed = Math.floor(p * text.length);
      setShown(
        text
          .split("")
          .map((ch, i) => (i < fixed || ch === " " ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]))
          .join(""),
      );
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text]);

  return (
    <span className={cn("font-mono", className)} aria-label={text}>
      <span aria-hidden>{shown}</span>
    </span>
  );
}
