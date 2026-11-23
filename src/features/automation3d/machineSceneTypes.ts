/** Optional evidence-linked stations; legacy skill-only plans remain unchanged. */
export type MachineFamily = "lathe" | "mill" | "injection" | "press" | "laser" | "reflow" | "thermoform" | "foaming" | "unknown";
export interface SceneMachine {
  family: MachineFamily;
  label: string;
  evidence: string;
  origin: "description" | "analysis";
}
export interface SceneOperation {
  id: string;
  skillName: string;
  what: string;
  tooling: string;
  cycleS: number | null;
  payloadKg: number | null;
  machine?: SceneMachine;
}
export interface MachineBinding extends SceneMachine {
  key: string;
  operation: string;
}