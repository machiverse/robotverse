import assert from "node:assert/strict";
import { engineSolution, extractFacts } from "../src/features/automation3d/solutionEngine";

// Facts are read from the brief.
{
  const f = extractFacts("We weld 12 kg steel brackets, 240 parts per hour, 3 shifts with 4 operators, many variants");
  assert.equal(f.weightKg, 12);
  assert.equal(f.partsPerHour, 240);
  assert.equal(f.shifts, 3);
  assert.equal(f.operators, 4);
  assert.equal(f.material, "steel");
  assert.equal(f.variants, true);
  assert.equal(extractFacts("cycle time 30 s").partsPerHour, 120);
  assert.equal(extractFacts("2 tons coil").weightKg, 2000);
}

const briefs = [
  "Pick parts from the conveyor, weld the bracket, inspect the weld with a camera and stack finished parts on pallets. 12 kg steel, 240 parts per hour, 2 shifts, 3 operators.",
  "Automate packing of biscuits into cartons and palletize the cartons, 1500 packs per hour, food grade",
  "Our operators deburr aluminium castings by hand, it is dusty and slow",
  "I want to automate my factory",
  "Load and unload a CNC lathe with 5 kg shafts, cobot next to operator",
  "Design and simulate a complete automated 3D printing system for construction depositing concrete layer by layer",
];
for (const b of briefs) {
  const s = engineSolution(b);
  assert.ok(s.title && s.understanding, b);
  assert.ok(s.stations.length >= 1, `stations for: ${b}`);
  assert.ok(s.tasks.length >= 1);
  assert.ok((s.budget_inr.low ?? 0) > 0 && (s.budget_inr.high ?? 0) >= (s.budget_inr.low ?? 0), `budget for: ${b}`);
  assert.ok(s.controls.safety.length >= 2 && s.controls.interlocks.length >= 3);
  assert.ok(s.implementation.length === 6 && s.risks.length >= 2 && s.kpis.length >= 3);
  assert.ok(s.architecture.alternatives.length >= 2);
  console.log(`• ${s.title}\n  ${s.throughput.target} · ${s.budget_inr.low?.toLocaleString("en-IN")}–${s.budget_inr.high?.toLocaleString("en-IN")} · payback ${s.roi.payback_months} · ${s.stations.map((x) => `${x.name} (${x.payload_kg} kg)`).join(", ")}\n  Q: ${s.questions.join(" | ")}`);
}
// A heavy part sizes the robot up; a cobot request chooses cobots.
assert.ok((engineSolution("palletize 40 kg sacks").stations.at(-1)?.payload_kg ?? 0) >= 56);
assert.match(engineSolution("Load and unload a CNC lathe with 5 kg shafts, cobot next to operator").architecture.type, /cobot/i);
// Unmatched briefs still get a usable answer that asks for details.
assert.equal(engineSolution("I want to automate my factory").feasibility, "medium");
// Knowledge base: grippers, vision, robot type, industry standards and a visible reasoning trace.
{
  const sacks = engineSolution("Palletize 50 kg cement bags coming on a conveyor, 400 bags per hour");
  assert.match(sacks.stations.map((s) => s.tooling).join(" "), /sack gripper/i);
  assert.ok(!sacks.industry_notes!.some((x) => /Construction/.test(x)), "cement bags are not construction");
  const bin = engineSolution("Pick random steel shafts from a bin and load a CNC lathe");
  assert.match(bin.stations.flatMap((s) => s.sensors).join(" "), /3D vision/i);
  const food = engineSolution("Pack chocolate bars into cartons, food grade, 2 shifts");
  assert.ok(food.standards!.some((x) => /FSSAI/.test(x)), "food standards");
  assert.ok(food.industry_notes!.some((x) => /IP69K|washdown/i.test(x)));
  const scara = engineSolution("Screw small PCB assemblies with 4 screws each");
  assert.match(scara.stations.map((s) => s.equipment).join(" "), /SCARA/);
  for (const r of [sacks, bin, food, scara]) {
    assert.ok((r.reasoning?.length ?? 0) >= 6, "reasoning trace");
    assert.ok(r.standards!.some((x) => /ISO 10218/.test(x)));
  }
}
console.log("solution engine: ok");
