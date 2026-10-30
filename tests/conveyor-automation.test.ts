import assert from "node:assert/strict";
import { CONVEYOR_PRODUCTS, defaultSetup, planConveyorAutomation } from "../src/features/automation3d/conveyorAutomation";
import { PRODUCT_KEYS, productInfo } from "../src/features/automation3d/workpieces.js";

// Every product offered for the belt is a real product of the 3D studio.
for (const k of CONVEYOR_PRODUCTS) assert.ok(PRODUCT_KEYS.includes(k), `${k} is a studio product`);

// A carton on a belt it fits on.
const carton = defaultSetup("carton");
const [, , depth] = productInfo({ key: "carton" }).size;
assert.ok(carton.conveyor.width >= depth + 0.08, "the default belt fits the carton with room for guide rails");
assert.equal(carton.mode, "index");

const robot = { name: "FANUC M-20iD/25", brand: "FANUC", payloadKg: 25, reachMm: 1831 };
const vacuum = { name: "Schmalz FXCB vacuum gripper", type: "Vacuum Gripper" };

// Stop and pick, end to end: no blocking issue, the seven stages in order, the handshake signals.
{
  const plan = planConveyorAutomation({ setup: carton, robot, tool: vacuum, destination: "pallet" });
  assert.ok(plan.ok, JSON.stringify(plan.issues));
  assert.deepEqual(plan.sequence.map((s) => s.stage), ["Feed", "Convey", "Sense", "Pick", "Transfer", "Place", "Repeat"]);
  assert.deepEqual(plan.io.map((s) => s.tag), ["FEED", "CONV_RUN", "CONV_RUNNING", "PE1", "PART_READY", "ROBOT_IN_ZONE", "PICK_DONE", "GRIP_CMD", "GRIP_OK"]);
  assert.match(plan.io.find((s) => s.tag === "GRIP_OK")!.device, /vacuum switch/i, "a vacuum gripper confirms with its vacuum switch");
  assert.match(plan.sequence[3].detail, /PART_READY/);
  assert.ok(plan.estimate.indexSeconds! > 0.25 && plan.estimate.indexSeconds! < 3, `index time ${plan.estimate.indexSeconds}`);
  assert.equal(plan.estimate.brakingMm, 30, "0.3 m/s braking at 1.5 m/s² takes 30 mm");
  assert.equal(plan.sim.belt.mode, "index");
  assert.equal(plan.sim.product.key, "carton");
  assert.ok(plan.sim.infeed.width >= depth);
}

// What cannot work is a stop, with the reason.
{
  const heavy = planConveyorAutomation({ setup: carton, robot: { ...robot, payloadKg: 7 }, tool: vacuum, destination: "pallet" });
  assert.ok(!heavy.ok);
  assert.ok(heavy.issues.some((i) => i.level === "stop" && /Too heavy/.test(i.text)));
  const torch = planConveyorAutomation({ setup: carton, robot, tool: { name: "Binzel ABIROB MIG torch" }, destination: "pallet" });
  assert.ok(torch.issues.some((i) => i.level === "stop" && /not a gripper/.test(i.text)));
  const none = planConveyorAutomation({ setup: carton, robot: null, tool: null, destination: null });
  assert.equal(none.issues.filter((i) => i.level === "stop").length, 3, "robot, gripper and destination are all missing");
  const narrow = planConveyorAutomation({ setup: { ...carton, conveyor: { ...carton.conveyor, width: 0.2 } }, robot, tool: vacuum, destination: "pallet" });
  assert.ok(narrow.issues.some((i) => i.level === "stop" && /too narrow/.test(i.text)));
  const fast = planConveyorAutomation({ setup: { ...carton, conveyor: { ...carton.conveyor, speed: 0.7 } }, robot, tool: vacuum, destination: "pallet" });
  assert.ok(fast.issues.some((i) => i.level === "warn" && /soft stops or conveyor tracking/.test(i.text)));
}

// Conveyor tracking: the maker's option and an encoder; the belt never stops, so no PART_READY handshake.
{
  const plan = planConveyorAutomation({ setup: { ...carton, mode: "track" }, robot, tool: vacuum, destination: "pallet" });
  assert.ok(plan.ok);
  assert.ok(plan.issues.some((i) => /FANUC Line Tracking/.test(i.text)));
  assert.ok(plan.io.some((s) => s.tag === "ENC") && !plan.io.some((s) => s.tag === "PART_READY"));
  assert.equal(plan.estimate.indexSeconds, null);
  const other = planConveyorAutomation({ setup: { ...carton, mode: "track" }, robot: { name: "Acme Arm 10", payloadKg: 20 }, tool: vacuum, destination: "pallet" });
  assert.ok(other.issues.some((i) => i.level === "warn" && /offers conveyor tracking/.test(i.text)));
}

// A feeder faster than the belt can carry is flagged.
{
  const plan = planConveyorAutomation({ setup: { ...carton, feed: { rate: 200, gap: 0.2 } }, robot, tool: vacuum, destination: "pallet" });
  assert.ok(plan.issues.some((i) => /carries at most/.test(i.text)));
}

console.log("conveyor automation ok");
