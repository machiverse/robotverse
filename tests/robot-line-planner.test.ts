import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { INDUSTRY_BLUEPRINTS } from "../src/data/automationStudioIndustries";
import { analyzeDescription, matchTemplateIds, SKILL_LIBRARY } from "../src/utils/processAnalyzer";
import { buildBom } from "../src/features/automation3d/solutionCost";
import { planLine, recommendRobots, isProseDescription, type DirectoryRobot } from "../src/features/automation3d/robotKnowledge";
import { TOOL_ACTIONS } from "../src/features/automation3d/robotSim.js";
import type { SimStep } from "../src/features/automation3d/robotSim";

// Each robot's cycle must be physically consistent and hand the part on.
function assertFlows(steps: SimStep[], context: string, first: boolean, last: boolean) {
  let holding = false;
  let at = "";
  assert.equal(steps[0].action, "pick", `${context}: starts with a pick`);
  assert.equal(steps[0].station, first ? "conveyor" : "in", `${context}: picks from the right belt`);
  for (const s of steps) {
    if (s.action === "pick") {
      assert.ok(!holding, `${context}: pick while holding`);
      holding = true;
    } else if (s.action === "place") {
      assert.ok(holding, `${context}: place with empty gripper`);
      holding = false;
      at = s.station;
    } else if (s.action === "inspect") {
      assert.ok(holding, `${context}: inspect needs the part in the gripper`);
    } else if (s.action === "weld" || s.action === "process") {
      assert.ok(!holding && at === s.station, `${context}: ${s.action} needs the part in the ${s.station}`);
    } else if (TOOL_ACTIONS[s.action]) {
      assert.ok(!holding && at === "table", `${context}: tool step "${s.label}" without a part on the table`);
    }
  }
  const end = steps[steps.length - 1];
  assert.equal(end.action, "place", `${context}: ends with a place`);
  assert.ok(last ? ["pallet", "carton"].includes(end.station) : end.station === "out", `${context}: ends at ${end.station}`);
}

const QUERY =
  "We fabricate steel brackets and frames. Operators load parts from the conveyor into a welding fixture, MIG weld the joints, grind the weld spatter, apply anti-rust coating, inspect the weld quality, and stack finished parts on pallets for dispatch.";

assert.ok(isProseDescription(QUERY));
assert.ok(!isProseDescription("Pick part from conveyor\nWeld seam\nStack on pallet"));

const processes = analyzeDescription(QUERY, null);
assert.deepEqual(
  processes.map((p) => p.name),
  ["Loading & Unloading", "MIG/MAG Welding", "Grinding & Surface Prep", "Painting & Coating", "Quality Inspection", "Palletizing"],
);

const plan = planLine(processes);
assert.deepEqual(
  plan.robots.map((r) => r.tasks.map((t) => t.kind)),
  [["handling", "welding"], ["finishing"], ["coating", "inspection", "palletizing"]],
);
assert.ok(plan.robots[0].multitask && plan.robots[2].multitask && !plan.robots[1].multitask);
plan.robots.forEach((r, i) => assertFlows(r.steps, `welding line ${r.title}`, i === 0, i === plan.robots.length - 1));
assert.equal(plan.sim.cells.length, 3);

// Two light tools share one robot through a tool changer.
const shared = planLine([{ name: "Surface Polishing" }, { name: "Screw Assembly" }, { name: "Case Packing" }]);
assert.equal(shared.robots.length, 1);
assert.ok(shared.robots[0].toolChanger);
assertFlows(shared.robots[0].steps, "tool changer", true, true);
assert.equal(shared.robots[0].steps.at(-1)?.station, "carton");

// Real models from the Directory satisfy every robot's applications and payload.
const catalog: DirectoryRobot[] = JSON.parse(readFileSync("public/directory/robots.json", "utf8"));
for (const r of plan.robots) {
  const recs = recommendRobots(r, catalog);
  assert.ok(recs.length > 0, `${r.title}: no directory robot fits ${r.apps.join(", ")}`);
  for (const m of recs) assert.ok(m.p >= r.minPayload && r.apps.every((a) => m.ap?.includes(a)));
}

// Every industry blueprint plans into consistent robot cycles.
let lines = 0;
for (const industry of INDUSTRY_BLUEPRINTS) {
  const p = planLine(industry.processes);
  p.robots.forEach((r, i) => assertFlows(r.steps, `${industry.key} ${r.title}`, i === 0, i === p.robots.length - 1));
  lines++;
}
// Every skill in the library is understood from a plain sentence and simulates cleanly.
for (const { id, template } of SKILL_LIBRARY) {
  const sentence = `We need robots for ${template.name.toLowerCase()}.`;
  assert.ok(matchTemplateIds(sentence).includes(id), `skill "${template.name}" not recognised from its own name`);
  const p = planLine(analyzeDescription(sentence, null));
  p.robots.forEach((r, i) => assertFlows(r.steps, `${template.name} ${r.title}`, i === 0, i === p.robots.length - 1));
}

// Any kind of automation request gets a plan and a budget.
const REQUESTS = [
  "Our plastics plant runs injection moulding machines. Operators remove the parts, cut the sprue, laser mark a serial number, check the dimensions and pack them into boxes.",
  "We make car door panels. Blanks are loaded into the stamping press, then the panels are hemmed, adhesive is applied, spot welded, and the panels are stacked in racks.",
  "Aluminium die casting: workers extract castings from the die casting machine, trim the flash, wash the parts and put them on pallets.",
  "Warehouse: we unload pallets of cartons, sort the parcels by destination, scan barcodes, and load them into shipping boxes.",
  "Cement plant: 50 kg bags come off the filler and workers stack the bags on pallets.",
  "We assemble electronic boards: insert components, solder the pins, screw the housing, run a function test and label each unit.",
  "Forging shop: hot billets from the furnace are placed in the forging press, then trimmed and cooled.",
];
for (const q of REQUESTS) {
  const p = planLine(analyzeDescription(q, null));
  assert.ok(p.robots.length > 0, q);
  p.robots.forEach((r, i) => assertFlows(r.steps, `${q.slice(0, 30)} ${r.title}`, i === 0, i === p.robots.length - 1));
  const bom = buildBom(p, catalog);
  assert.ok(bom.total[0] > 0 && bom.total[1] >= bom.total[0] && bom.total[0] > bom.hardware[0], `${q}: budget`);
  assert.equal(bom.robots.length, p.robots.length);
}
// Words inside other words do not trigger skills ("capacity", "image", "latest").
assert.deepEqual(matchTemplateIds("our capacity is the latest image of the whole team"), []);

console.log(`robot line planner: ok (${SKILL_LIBRARY.length} skills, ${lines} industry lines)`);
