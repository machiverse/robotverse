import assert from "node:assert/strict";
import { mediaSceneInput } from "../src/features/automation3d/machineScene";
import { productFor } from "../src/features/automation3d/workpieces.js";
import type { MediaAnalysis } from "../src/features/automation3d/mediaAnalysis";

const result: MediaAnalysis = {
  summary: "Load and unload the machine", description: "Load, process and unload parts",
  tasks: ["CNC Machine Tending"], manual_steps: ["Load", "Clamp", "Turn", "Unload"],
  observations: [], confidence: "medium", workpiece: { name: "shaft", material: "steel", output: "machined shaft", finish: "polished" },
  stations: [{ name: "CNC lathe", skill: "CNC Machine Tending", what: "Load and turn shafts", equipment: "CNC lathe", notes: "Robot clear before start", tooling: "Shaft gripper", sensors: [], payload_kg: 5, reach_mm: 1500, cycle_s: 40 }],
};
const shaft = mediaSceneInput(result, "The operator handles 5 kg steel shafts");
assert.equal(shaft.processes[0].scene?.machine?.family, "lathe");
assert.equal(shaft.workpiece?.output, "machined shaft");
assert.ok(shaft.brief.includes("polished machined shaft"));
assert.ok(shaft.brief.includes("5 kg steel shafts"));
assert.equal(productFor(shaft.brief, result.tasks).key, "shaft");
const bottle = mediaSceneInput({ ...result, workpiece: { name: "glass bottle", material: "glass", output: "finished glass bottle" } });
assert.equal(productFor(bottle.brief, result.tasks).key, "bottle");
assert.notEqual(shaft.brief, bottle.brief);
console.log("Uploaded process preserves machine, note, raw item and finished output; same job can change item");