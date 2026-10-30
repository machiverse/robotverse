// Types for the framework-free simulation engine in robotSim.js.
export type SimStep = { action: string; station: string; label: string; auto?: boolean; text?: string; /** Tool to change to (0 = arm tool, 1 = tool-stand tool). */ tool?: number };

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
  /** The real product the line handles, and the gripper it needs. */
  product?: { key: string; label: string; kg: number; size: [number, number, number]; gripper: string } | null;
  /** Every tool the line uses: the gripper and the process tools its steps need. */
  tools?: string[];
  /** How the focused robot travels (track, overhead, gantry, AMR, lift, RGV), its travel and where it is now (m). */
  motion?: SimMotionState;
  /** Picture quality in use (it drops to "standard" by itself when the frame rate cannot keep up). */
  quality?: SimQuality;
}

export type SimQuality = "high" | "standard";
export type SimMotionType = "fixed" | "track" | "overhead" | "gantry" | "amr" | "lift" | "rgv";
export interface SimMotion {
  type: SimMotionType;
  /** Travel in metres (a lift column's is vertical). */
  length?: number;
}
export interface SimMotionState {
  type: SimMotionType;
  length: number;
  travel: number;
  min: number;
  max: number;
}

export interface SimPlan {
  /** stations: equipment to show even when no step uses it (cell builder); startTool: tool in use when a cycle starts. */
  /** motion: how the robot moves between places; stations at the far end of its travel have keys ending in "_2". */
  cells: { title?: string; steps: SimStep[]; stations?: string[]; startTool?: number; motion?: SimMotion | null }[];
  /** The user's own words: a product they name (mangoes, cement bags) is the one the robots handle. */
  brief?: string;
  /** The product, when already known (see workpieces.js productFor). */
  product?: { key: string; variant?: string; coat?: string };
}

export type LineSpacing = "compact" | "clear" | "roomy";
/** Robot `robot` (index) can reach `what` of robot `other`'s cell, `depth` metres inside its reach; or both share space. */
export interface Interference {
  kind: "reach" | "shared";
  robot: number;
  other: number;
  what: string;
  depth: number;
}

export interface Simulation {
  stats(): { drawCalls: number; triangles: number; geometries: number; textures: number; fps: number; pixelRatio: number; quality: SimQuality; rebuilds: number };
  setLabels(mode: "key" | "all" | "off"): void;
  reload(): void;
  setEquipmentAll(list: Parameters<Simulation["setEquipment"]>[1][]): void;
  setSteps(steps: SimStep[]): void;
  setPlan(plan: SimPlan): void;
  setFocus(i: number): void;
  setReference(url: string | null, label?: string): void;
  /** Fence the robot cells (one flag each); neighbours share an enclosure unless `separate`. */
  setFencing(on: boolean | boolean[], opts?: { separate?: boolean }): void;
  /** Which robots are cobots (paint, control box, scanner). Call before setFencing. */
  setCobots(flags: boolean[]): void;
  /** Space between robots: neighbours share space (compact), 0.5 m between reaches (clear), or a metre more (roomy). */
  setSpacing(mode: LineSpacing): void;
  /** Robots that can reach another robot's stations, equipment, base or working space. */
  interference(): Interference[];
  play(): void;
  pause(): void;
  reset(): void;
  setSpeed(v: number): void;
  setRobotSize(key: string): void;
  setView(name: string): void;
  /** Cell index under a screen point; cells.length = the empty slot after the line; -1 = none. */
  cellAt(clientX: number, clientY: number): number;
  /** Ring on the floor marking a drop target (-1 hides it). */
  setHover(i: number): void;
  /** Pixels covered by floating panels, so the line is framed in the free area. */
  setInsets(left: number, right: number): void;
  /** Cell builder: show only the equipment the user chose (no default robot, tool or stations). */
  setBuildMode(on: boolean): void;
  setOverlay(name: "none" | "layout" | "flow"): void;
  /** The picture as it is now, as a PNG data URL (for "Save image"). */
  snapshot(): string;
  /** Frame a shot by hand: camera at `position`, looking at `target` (metres, world axes); `orbit` circles it slowly. */
  setCamera(position: [number, number, number], target: [number, number, number], orbit?: boolean): void;
  setEquipment(
    cell: number,
    eq: {
      robot?: { name: string; brand?: string; reachMm?: number | null; payloadKg?: number | null; collaborative?: boolean };
      eoat?: { name: string; kind?: string };
      /** Tools the robot can use: on the arm first, then on the tool stand (tool changer). */
      tools?: { name: string; kind?: string }[];
      accessories?: ("changer" | "sensor" | "camera")[];
      /** Components the user chose (power source, wire feeder, torch cleaner…): their names label the matching equipment. */
      components?: string[];
    } | null,
  ): void;
  setJoint(i: number, deg: number | string): void;
  /** Move the focused robot along its track, lift or gantry by hand (m); only while paused. */
  setTravel(m: number): void;
  /** "high": cinematic (ambient occlusion, glow on lamps and hot metal, smooth edges); "standard": fast, for phones. */
  setQuality(q: SimQuality): void;
  readonly quality: SimQuality;
  checkReach(steps?: SimStep[]): string[];
  /** Stations, conveyors, robot bases and equipment that stand on each other's floor (none in a good layout). */
  layoutIssues(): string[];
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
  /** three/examples post-processing classes for the cinematic look; without them the picture is "standard". */
  post?: {
    EffectComposer: unknown;
    RenderPass: unknown;
    OutputPass: unknown;
    GTAOPass?: unknown;
    UnrealBloomPass?: unknown;
    ShaderPass?: unknown;
    VignetteShader?: unknown;
  };
  /** Start in this quality; by default high on desktops, standard on phones. */
  quality?: SimQuality;
  container: HTMLElement;
  onUpdate?: (s: SimUpdate) => void;
  onStatus?: (status: "building" | "ready" | "lost") => void;
  onPerformance?: (mode: "smooth") => void;
}): Simulation;
