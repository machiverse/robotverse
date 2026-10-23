// Types for workpieces.js (the real product of each job, built in 3D).
export interface ProductPick {
  key: string;
  variant?: string;
  /** Paint colour the brief asks for. */
  coat?: string;
}
export interface ProductInfo {
  key: string;
  variant?: string;
  label: string;
  /** Size in metres: [w, h, d]. */
  size: [number, number, number];
  kg: number;
  /** Gripper family (eoatKind) and its look. */
  grip: string;
  look: string;
  half?: number;
  supply: string;
  output: string;
}
export const PRODUCT_KEYS: string[];
export const PRODUCE: Record<string, { label: string; kg: number }>;
export function productFor(brief: string, jobs?: string[] | string): ProductPick;
export function productInfo(pick: ProductPick): ProductInfo;
export function createWorkpieces(THREE: typeof import("three"), pick: ProductPick, opts?: { stages?: string[] }): unknown;
