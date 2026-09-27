import assert from "node:assert/strict";
import { INDUSTRY_BLUEPRINTS } from "../src/data/automationStudioIndustries";
import { analyzeDescription } from "../src/utils/processAnalyzer";
import { processKind } from "../src/features/automation3d/processProfiles";
import { parseProcess, processToText, PRESETS, TOOL_ACTIONS } from "../src/features/automation3d/robotSim.js";

type Step = { action: string; station: string; label: string; auto?: boolean };

// Every step sequence must be physically consistent: pick only with an empty
// gripper, place only while holding, tool work only on a part on the table.
function assertFlows(steps: Step[], context: string) {
  let holding = false;
  let onTable = false;
  for (const s of steps) {
    if (s.action === "pick") {
      assert.ok(!holding, `${context}: pick while holding`);
      holding = true;
      if (s.station === "table") onTable = false;
    } else if (s.action === "place") {
      assert.ok(holding, `${context}: place with empty gripper`);
      holding = false;
      if (s.station === "table") onTable = true;
    } else if (TOOL_ACTIONS[s.action]) {
      assert.ok(!holding && onTable, `${context}: tool step "${s.label}" without a part on the table`);
    }
  }
  assert.ok(!holding && !onTable, `${context}: cycle must end with the part delivered`);
}

// All built-in templates parse without skipped lines and flow correctly.
for (const [name, text] of Object.entries(PRESETS as Record<string, string>)) {
  const { steps, notes } = parseProcess(text);
  assert.ok(steps.length > 0, name);
  assert.equal(notes.filter((n: string) => !n.startsWith("Added")).length, 0, `${name}: ${notes.join("; ")}`);
  assertFlows(steps, name);
}

// Every process detected for every industry produces a runnable robot cell.
let count = 0;
for (const industry of INDUSTRY_BLUEPRINTS) {
  for (const p of analyzeDescription("", industry.key)) {
    const { steps } = parseProcess(processToText(processKind(p), p.name));
    assert.ok(steps.length >= 2, `${industry.key}/${p.name}`);
    assertFlows(steps, `${industry.key}/${p.name}`);
    assert.ok(steps.some((s: Step) => s.label === p.name), `${p.name} should be shown as a step`);
    count++;
  }
}

// Free text: tool words map to tool actions, unknown work still runs.
const kinds = (t: string) => parseProcess(t).steps.filter((s: Step) => !s.auto).map((s: Step) => s.action);
assert.deepEqual(kinds("grind the weld, then paint it blue"), ["finish", "apply"]);
assert.deepEqual(kinds("Fill bottle\nCap bottle\nLabel bottle\nPack into carton"), ["fill", "cap", "label", "place"]);
assert.deepEqual(kinds("Heat treatment of gears"), ["operate"]);
assert.deepEqual(kinds("Pick box from conveyor\nStack on pallet"), ["pick", "place"]);
assert.equal(parseProcess("Pick box from conveyor").steps[0].station, "conveyor");
// "weld" as the object of an inspection is an inspection, not another weld.
assert.deepEqual(kinds("Pick part from conveyor\nInspect weld with camera\nStack on pallet"), ["pick", "inspect", "place"]);
assert.deepEqual(kinds("Check weld quality"), ["inspect", "place"].slice(0, 1));
for (const t of ["grind the weld, then paint it blue, check quality, box it", "Heat treatment of gears", "Screw the lid"]) {
  assertFlows(parseProcess(t).steps, t);
}

console.log(`${Object.keys(PRESETS).length} templates and ${count} industry processes produce consistent robot-cell cycles.`);
