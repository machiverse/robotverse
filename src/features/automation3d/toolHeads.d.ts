// Types for toolHeads.js (end-of-arm tools as they really look).
export const TOOL_LOOK_NAMES: Record<string, string>;
export const HEAD_FX: Record<string, { color?: number; spread: number; mist?: boolean; beam?: boolean }>;
export function headFor(text: string, action: string): string | null;
export function eoatLook(text: string): string | null;
export function createToolKit(THREE: typeof import("three"), toolLen?: number): unknown;
