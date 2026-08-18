import React from "react";
import { getOemColor } from "@/lib/oemColors";

/**
 * OEM colour is only ever a shape: a 3px rail or a 7px dot.
 * See src/lib/oemColors.ts for the governing rule.
 */

interface OemProps {
  brand?: string | null;
  className?: string;
}

/**
 * Full-height 3px rail pinned to the LEFT edge of a card.
 * Must be placed inside a `relative overflow-hidden` container so the
 * card's border radius is preserved (never use border-left).
 */
export const OemRail: React.FC<OemProps> = ({ brand, className = "" }) => (
  <span
    aria-hidden="true"
    className={`pointer-events-none absolute left-0 top-0 bottom-0 z-10 w-[3px] group-hover:w-[4px] transition-[width] duration-150 ${className}`}
    style={{ backgroundColor: getOemColor(brand) }}
  />
);

/** 7px dot placed immediately before a brand name. */
export const OemDot: React.FC<OemProps> = ({ brand, className = "" }) => (
  <span
    aria-hidden="true"
    className={`inline-block h-[7px] w-[7px] shrink-0 rounded-full ${className}`}
    style={{ backgroundColor: getOemColor(brand) }}
  />
);
