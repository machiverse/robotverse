// Types for the framework-free simulation engine in robotSim.js.
export type SimStep = { action: string; station: string; label: string; auto?: boolean; text?: string };

export interface SimUpdate {
  playing: boolean;
  speed: number;
  joints: number[];
  stepIndex: number;
  step: SimStep | null;
  cycles: number;
  lastCycle: number | null;
  currentCycle: number;
  simTime: number;
  holding: boolean;
  unreachable: string[];
  events: { t: number; msg: string }[];
  /** Index of the robot whose joints/step are reported (multi-robot lines). */
  focus?: number;
  cells?: { title: string; stepIndex: number; step: SimStep | null; cycles: number; lastCycle?: number | null }[];
}

export interface SimPlan {
  cells: { title?: string; steps: SimStep[] }[];
}

export interface Simulation {
  setSteps(steps: SimStep[]): void;
  setPlan(plan: SimPlan): void;
  setFocus(i: number): void;
  setReference(url: string | null, label?: string): void;
  setFencing(on: boolean | boolean[]): void;
  play(): void;
  pause(): void;
  reset(): void;
  setSpeed(v: number): void;
  setRobotSize(key: string): void;
  setView(name: string): void;
  setOverlay(name: "none" | "layout" | "flow"): void;
  setEquipment(
    cell: number,
    eq: {
      robot?: { name: string; brand?: string; reachMm?: number | null; payloadKg?: number | null; collaborative?: boolean };
      eoat?: { name: string; kind?: string };
      accessories?: ("changer" | "sensor" | "camera")[];
    } | null,
  ): void;
  setJoint(i: number, deg: number | string): void;
  checkReach(steps?: SimStep[]): string[];
  dispose(): void;
}

export const ROBOT_SIZES: Record<string, { key: string; label: string; reach: number; payload: number; scale: number }>;
export const STATION_NAMES: Record<string, string>;
export const TOOL_ACTIONS: Record<string, { label: string; color: number }>;
export const PRESETS: Record<string, string>;
export function stepLabel(step: SimStep): string;
export function brandPaint(brand: string, collaborative?: boolean): [number, number];
export function eoatKind(text: string): string;
export function parseProcess(text: string): { steps: SimStep[]; notes: string[] };
export function processToText(kind: string, name?: string): string;
export function createSimulation(opts: {
  THREE: typeof import("three");
  OrbitControls: unknown;
  RoomEnvironment?: unknown;
  container: HTMLElement;
  onUpdate?: (s: SimUpdate) => void;
}): Simulation;
