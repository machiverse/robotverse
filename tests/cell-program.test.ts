import assert from "node:assert/strict";
import { cellProgram, stationsFor, type StationKey } from "../src/features/automation3d/cellProgram";
import { BLOCKS } from "../src/features/automation3d/ProcessBuilder";
import { processKind } from "../src/features/automation3d/processProfiles";

const run = (job: string, tools: (string | undefined)[], stations: StationKey[], changer = false, extra = {}) =>
  cellProgram({ job, tools, changer, stations, ...extra });
const seq = (p: ReturnType<typeof cellProgram>) => p.steps.map((s) => `${s.action}@${s.station}${s.tool != null ? `[${s.tool}]` : ""}`).join(" ");

// A welding torch never picks or places parts.
{
  const p = run("Loading & Unloading", ["torch"], ["conveyor", "pallet"]);
  assert.ok(p.idle);
  assert.ok(!p.steps.some((s) => s.action === "pick" || s.action === "place"));
  assert.ok(p.notes.some((n) => n.level === "stop" && /gripper/.test(n.text) && /torch/.test(n.text)));
}
// Torch only on a welding table: the operator loads, the robot welds.
assert.equal(seq(run("MIG/MAG Welding", ["torch"], ["weld"])), "manual@weld weld@weld");
// Torch with a conveyor it cannot use: still welds, and says why the conveyor is idle.
{
  const p = run("MIG/MAG Welding", ["torch"], ["conveyor", "weld", "pallet"]);
  assert.equal(seq(p), "manual@weld weld@weld");
  assert.ok(p.notes.some((n) => /cannot pick parts/.test(n.text)));
}
// Gripper + torch on a tool changer: load, change to the torch, weld, change back, unload.
{
  const p = run("MIG/MAG Welding", ["parallel", "torch"], ["conveyor", "weld", "pallet", "rack"], true);
  assert.equal(seq(p), "pick@conveyor place@weld toolchange@rack[1] weld@weld toolchange@rack[0] pick@weld place@pallet");
  assert.equal(p.startTool, 0);
  assert.ok(!p.notes.some((n) => n.level !== "info"));
}
// Torch on the arm and the gripper on the stand: the cycle starts with the gripper and ends with it.
{
  const p = run("MIG/MAG Welding", ["torch", "parallel"], ["conveyor", "weld", "pallet", "rack"], true);
  assert.equal(p.startTool, 1);
  assert.equal(p.steps[0].action, "pick");
  assert.equal(p.steps.filter((s) => s.action === "toolchange").length, 2);
}
// A second tool without a tool changer is not used.
{
  const p = run("MIG/MAG Welding", ["parallel", "torch"], ["conveyor", "weld", "pallet"]);
  assert.ok(!p.steps.some((s) => s.action === "toolchange" || s.action === "weld"));
  assert.ok(p.notes.some((n) => /needs a tool changer/.test(n.text)));
}
// Tool changer without a stand: still swaps, and asks for a stand.
assert.ok(run("Grinding & Surface Prep", ["parallel", "spindle"], ["conveyor", "table", "pallet"], true).notes.some((n) => /tool stand/.test(n.text)));
// Machine tending, a line hand-over and packing from the previous robot.
assert.equal(seq(run("CNC Machining", ["dual"], ["conveyor", "cnc", "out"])), "pick@conveyor place@cnc process@cnc pick@cnc place@out");
assert.equal(seq(run("Packing & Box Forming", ["vacuum"], ["carton"], false, { fromPrev: true })), "pick@in place@carton");
// Nothing is assumed: an empty cell does nothing and asks for equipment; programs use only what was placed.
{
  const p = run("Palletizing", ["fork"], []);
  assert.ok(p.idle && p.notes.some((n) => /infeed conveyor/.test(n.text)));
  const q = run("Vision Inspection", ["parallel"], ["conveyor", "vision", "pallet"]);
  assert.ok(q.uses.every((k) => ["conveyor", "vision", "pallet"].includes(k)));
  assert.ok(q.steps.some((s) => s.action === "inspect"));
}
// Suggestions follow the tools: a torch alone needs only its fixture; a changer adds the stand.
assert.deepEqual(stationsFor("MIG/MAG Welding", ["torch"]), ["weld"]);
assert.deepEqual(stationsFor("MIG/MAG Welding", ["parallel", "torch"], true), ["conveyor", "weld", "pallet", "rack"]);

// Every builder job runs with its usual tool and the suggested equipment.
const TOOL: Record<string, string> = { welding: "torch", finishing: "spindle", coating: "nozzle", assembly: "driver", filling: "nozzle", sealing: "driver", labeling: "vacuum" };
for (const b of BLOCKS) {
  const kind = processKind({ name: b.name });
  const process = TOOL[kind];
  // A process tool with a gripper on the changer loads its own parts; handling jobs use a gripper.
  const tools = process ? ["parallel", process] : ["parallel"];
  const p = run(b.name, tools, [...stationsFor(b.name, tools, !!process), ...(process ? (["rack"] as StationKey[]) : [])], !!process);
  assert.ok(!p.idle, `${b.name} runs`);
  assert.ok(!p.notes.some((n) => n.level !== "info"), `${b.name}: ${p.notes.map((n) => n.text).join("; ")}`);
}
console.log(`cell programs: ${BLOCKS.length} builder jobs verified`);
