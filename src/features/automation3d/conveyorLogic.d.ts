// Types for conveyorLogic.js (conveyor-to-robot control on a fixed clock).
export type BeltMode = "index" | "track" | "flow";
export type BeltSource = "feeder" | "upstream" | "none";
export type SignalTag = "FEED" | "CONV_RUN" | "CONV_RUNNING" | "PE1" | "VISION_OK" | "VISION_NG" | "PART_READY" | "ROBOT_IN_ZONE" | "PICK_DONE" | "GRIP_CMD" | "GRIP_OK" | "ENC";

export interface BeltOptions {
  /** Useful length (m): from where parts are put on (s = 0) to the pick end (s = length). */
  length?: number;
  /** Product length along the belt (m). */
  partLength?: number;
  /** Belt speed (m/s), acceleration and braking (m/s²). */
  speed?: number;
  accel?: number;
  decel?: number;
  /** Belt beyond the pick end, to the end roller (m). */
  overrun?: number;
  mode?: BeltMode;
  source?: BeltSource;
  /** Index: where the part comes to rest (part centre, m). */
  pickAt?: number;
  /** Track: the part centres the robot can pick between (m). */
  window?: [number, number];
  /** Track: the photo-eye (sync switch) position (m). */
  detectAt?: number;
  /** Feeder: minimum gap between parts (m), and parts per minute (0 = whenever the gap allows). */
  gap?: number;
  feedRate?: number;
  /** Index: seconds between PICK_DONE and the belt starting again. */
  restartDelay?: number;
  pulsesPerMetre?: number;
  /** Share of parts the camera rejects (0 = no inspection); rejected parts run into the reject bin. */
  rejectRate?: number;
  /** Where the camera checks each part (part centre, m); upstream of the pick sensor by default. */
  inspectAt?: number;
}
export interface BeltConfig extends Required<Omit<BeltOptions, "window">> {
  window: [number, number];
  /** Index: where the photo-eye beam crosses the belt (m). */
  peAt: number;
  /** A camera checks every part. */
  inspect: boolean;
}
export interface BeltPart {
  id: number;
  s: number;
  claimed: boolean;
  missed: boolean;
  /** The camera failed it: it is not picked, it runs into the reject bin. */
  reject: boolean;
}
export interface BeltCounters {
  fed: number;
  picked: number;
  missed: number;
  binned: number;
  exited: number;
  gripFaults: number;
  /** Parts the camera checked, and those it failed. */
  inspected: number;
  rejected: number;
}
export interface BeltTimers {
  running: number;
  stopped: number;
  /** Index: a part waited at the pick position for the robot. */
  partWaiting: number;
  /** The robot waited for a part. */
  robotWaiting: number;
  /** The feeder had a part due but no room on the belt. */
  feederBlocked: number;
}
export interface BeltSnapshotTimers extends BeltTimers {
  /** Seconds since the first pick: the waiting times above count from then. */
  measured: number;
}
export interface BeltSnapshot {
  t: number;
  mode: BeltMode;
  state: "RUN" | "BRAKE" | "READY" | "RESTART";
  speed: number;
  velocity: number;
  encoder: number;
  pickAt: number;
  beam: number;
  inspect: boolean;
  inspectAt: number;
  window: [number, number];
  length: number;
  io: Record<Exclude<SignalTag, "ENC">, boolean>;
  since: Record<Exclude<SignalTag, "ENC">, number>;
  parts: BeltPart[];
  counters: BeltCounters & { onBelt: number };
  timers: BeltSnapshotTimers;
  events: { t: number; msg: string }[];
}
export interface BeltLogic {
  readonly config: BeltConfig;
  readonly time: number;
  readonly velocity: number;
  readonly state: BeltSnapshot["state"];
  readonly parts: (BeltPart & { prev: number; at: number; queuedAt: number | null; inspected: boolean })[];
  readonly io: BeltSnapshot["io"];
  readonly counters: BeltCounters;
  readonly events: { t: number; msg: string }[];
  configure(o: BeltOptions): void;
  reset(): void;
  setFeeder(on: boolean): void;
  step(dt: number): void;
  partAt(id: number): number | null;
  partReady(): BeltPart | null;
  inWindow(): BeltPart | null;
  trackable(id: number): boolean;
  claim(id: number): boolean;
  abandon(id: number): void;
  take(id: number): boolean;
  robotInZone(on: boolean): void;
  setGrip(cmd: boolean, ok: boolean): void;
  gripFault(msg?: string): void;
  waiting(on: boolean, dt?: number): void;
  canAccept(): boolean;
  push(): number;
  drain(): { id: number; how: "bin" | "exit" }[];
  snapshot(): BeltSnapshot;
}

export const TICK: number;
export const BELT_MODES: BeltMode[];
export const SIGNALS: { tag: SignalTag; from: string; to: string; device: string; text: string }[];
export const MODE_SIGNALS: Record<BeltMode, SignalTag[]>;
export function signalsFor(mode: BeltMode, inspect?: boolean): SignalTag[];
export function stopDistance(speed: number, decel: number): number;
export function beltConfig(o?: BeltOptions): BeltConfig;
export function createBeltLogic(o?: BeltOptions): BeltLogic;
export function bottleneck(snap: BeltSnapshot | null | undefined): { by: "robot" | "feed" | "balanced"; text: string } | null;
