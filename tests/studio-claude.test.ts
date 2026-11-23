import assert from "node:assert/strict";
import { sceneProcessesFromMedia } from "../src/features/automation3d/machineScene";

const result = sceneProcessesFromMedia({
  summary: "Shafts go through OP10 then OP20", description: "Turn both ends of shafts", manual_steps: [],
  tasks: ["CNC Machine Tending"], workpiece: null, observations: [], confidence: "medium",
  stations: ["OP10", "OP20"].map((name) => ({ name, skill: "CNC Machine Tending", what: "Load, clamp, wait and unload", equipment: "CNC lathe", notes: "Robot-clear before machine-start", tooling: "Dual shaft gripper", payload_kg: 18, reach_mm: 1800, sensors: [], cycle_s: 40 })),
});
assert.equal(result.length, 2);
assert.equal(result[0].scene?.machine?.family, "lathe");
assert.equal(result[1].scene?.machine?.family, "lathe");
assert.notEqual(result[0].scene?.id, result[1].scene?.id);
assert.equal(result[0].scene?.tooling, "Dual shaft gripper");
assert.equal(result[0].scene?.payloadKg, 18);
console.log("Claude media stations retain machine identity, order and tooling");