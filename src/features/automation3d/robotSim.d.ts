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
}

export interface Simulation {
  setSteps(steps: SimStep[]): void;
  play(): void;
  pause(): void;
  reset(): void;
  setSpeed(v: number): void;
  setRobotSize(key: string): void;
  setView(name: string): void;
  setJoint(i: number, deg: number | string): void;
  checkReach(steps?: SimStep[]): string[];
  dispose(): void;
}

export const ROBOT_SIZES: Record<string, { key: string; label: string; reach: number; payload: number; scale: number }>;
export const STATION_NAMES: Record<string, string>;
export const TOOL_ACTIONS: Record<string, { label: string; color: number }>;
export const PRESETS: Record<string, string>;
export function stepLabel(step: SimStep): string;
export function parseProcess(text: string): { steps: SimStep[]; notes: string[] };
export function processToText(kind: string, name?: string): string;
export function createSimulation(opts: {
  THREE: typeof import("three");
  OrbitControls: unknown;
  container: HTMLElement;
  onUpdate?: (s: SimUpdate) => void;
}): Simulation;
