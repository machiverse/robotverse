import type * as THREE_NS from "three";
import type { ProcessKind } from "./processProfiles";

export type Area =
  | "arc" | "spot" | "laserweld" | "ultrasonic" | "solder" | "fsw" | "stud" | "laserclean" | "pallet" | "paint" | "dispense"
  | "pick" | "bin" | "force" | "vision" | "screw" | "rivet" | "tend" | "head" | "mark" | "label" | "mobile";
export type EquipmentGroup = "robot" | "process" | "safety" | "utility";
/** Where an item goes: behind the fence, inside the robot's reach, by the base, at the work table, at the pallet, on the arm, at the front. */
export type EquipmentPlace = "outside" | "reach" | "base" | "work" | "pallet" | "arm" | "front" | null;
export interface CellItem {
  name: string;
  /** Short name for the 3D label. */
  label: string;
  why: string;
  group: EquipmentGroup;
  /** The 3D model, or null when the item is listed but not drawn. */
  model: string | null;
  at: EquipmentPlace;
  /** The job that needs it (null for the robot system and utilities). */
  job?: string | null;
  tint?: "grey" | "blue" | "red" | "green";
  single?: boolean;
  small?: boolean;
  fencedOnly?: boolean;
  /** "laser": the cell needs a laser-safe enclosure instead of a mesh fence. */
  enclosure?: "laser";
}
export interface CellStep { action: string; station?: string; text?: string; label?: string }

export function areaOf(job: string, kind?: ProcessKind): Area;
export const JOB_ALSO: [RegExp, string[]][];
export function jobsOfTitle(title: string | undefined | null): string[];
export function cellEquipment(jobs: string[], opts?: { fenced?: boolean; steps?: CellStep[] }): CellItem[];
export function lineEquipment(): CellItem[];
/** The product the user chose for an item, matched by name, if any. */
export function chosenProduct(item: CellItem, names: string[] | undefined): string | null;
export const EQUIPMENT_GROUPS: [EquipmentGroup, string][];
export const EQUIPMENT_MODELS: string[];
export function createEquipmentModels(THREE: typeof THREE_NS): {
  buildModel(key: string, opts?: Partial<CellItem> & { width?: number; left?: boolean; right?: boolean }): { group: THREE_NS.Group; size: [number, number, number] } | null;
  has(key: string): boolean;
  dispose(): void;
};
