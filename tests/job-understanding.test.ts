import assert from "node:assert/strict";
import { analyzeJob } from "../src/features/automation3d/customJob";
import { providerPlan, understandJob } from "../src/features/automation3d/jobUnderstanding";
import { engineSolution } from "../src/features/automation3d/solutionEngine";
import { BLOCKS } from "../src/features/automation3d/ProcessBuilder";
import { JOB_NOTES } from "../src/features/automation3d/engineerPlaybook";

// Words the skills library does not know are still understood, with a reason and a confidence.
for (const [text, task] of [
  ["attach handles to doors", "Assembly"],
  ["fix clips onto panels", "Assembly"],
  ["join two steel plates", "MIG/MAG Welding"],
  ["count parts on the belt", "Vision Inspection"],
  ["sew seat covers", "Textile & Garment Handling"],
  ["peel protective film", "Surface Masking & Demasking"],
]) {
  const u = understandJob(text);
  assert.equal(u.source, "words", text);
  assert.equal(u.tasks[0].name, task, text);
  assert.equal(u.tasks[0].confidence, "medium");
  assert.ok(u.tasks[0].why.length > 10);
  const typed = analyzeJob(text);
  assert.equal(typed[0]?.name, task, `builder: ${text}`);
}
// The library still comes first, and fixed phrasing goes to the right job.
assert.equal(understandJob("weld steel brackets").source, "library");
assert.deepEqual(understandJob("unload a truck").tasks.map((t) => t.name), ["Truck & Container Unloading"]);
assert.ok(!understandJob("inspect welds").tasks.some((t) => t.kind === "welding"), "checking welds is not welding");
assert.ok(understandJob("take parts from the machine and put them in a box").tasks.some((t) => t.name === "Loading & Unloading"));
// No action at all: a general start, flagged as such, and the first question is what the robot should do.
{
  const u = understandJob("our factory in Hosur");
  assert.equal(u.source, "general");
  assert.equal(u.tasks[0].confidence, "low");
  assert.match(u.missing[0], /what the robot should do/);
}
// Every builder job is a known library task.
for (const b of BLOCKS) {
  const t = analyzeJob(b.name);
  assert.ok(t.length && t[0].confidence === "high", b.name);
  assert.ok(JOB_NOTES[b.name]?.length, `notes for ${b.name}`);
}
assert.ok(BLOCKS.length >= 59, `jobs: ${BLOCKS.length}`);

// The solution provider's view.
{
  const heavy = providerPlan("move 600 kg dies", understandJob("move 600 kg dies"));
  assert.equal(heavy.feasibility.find((x) => x.factor === "Part weight")?.status, "risk");
  assert.ok(heavy.pocFirst);
  const cobot = providerPlan("cobot next to the operator to load 40 kg castings into a CNC", understandJob("cobot next to the operator to load 40 kg castings into a CNC"));
  assert.equal(cobot.feasibility.find((x) => x.factor === "Working with people")?.status, "risk");
  const bin = providerPlan("pick loose bolts from a bin and place them in a fixture", understandJob("pick loose bolts from a bin and place them in a fixture"));
  assert.equal(bin.feasibility.find((x) => x.factor === "Part presentation")?.status, "check");
  assert.ok(bin.pocFirst);
  const tight = providerPlan("insert pins into holes ±0.02 mm", understandJob("insert pins into holes ±0.02 mm"));
  assert.equal(tight.feasibility.find((x) => x.factor === "Accuracy")?.status, "check");
  const food = providerPlan("pack chicken pieces into trays", understandJob("pack chicken pieces into trays"));
  assert.equal(food.feasibility.find((x) => x.factor === "Environment")?.status, "check");
  const std = providerPlan("weld 8 kg steel brackets on a fixture, 60 parts an hour, 2 shifts", understandJob("weld 8 kg steel brackets on a fixture, 60 parts an hour, 2 shifts"));
  assert.ok(!std.pocFirst, std.pocWhy);
  assert.ok(std.scope.some((x) => /welding torch/.test(x)) && std.scope.some((x) => /Software:/.test(x)));
  assert.ok(std.acceptance.some((x) => /FAT/.test(x)) && std.acceptance.some((x) => /SAT/.test(x)));
  assert.ok(std.commercial.some((x) => /GST/.test(x)) && std.documents.some((x) => /ISO 12100/.test(x)));
  assert.ok(std.requirements.some((x) => /sample parts/.test(x)));
}
// The built-in engine plans new wording and carries the provider plan.
{
  const s = engineSolution("attach handles to doors, 200 doors a shift");
  assert.ok(s.tasks.includes("Assembly"), s.tasks.join());
  assert.ok(s.reasoning!.some((r) => r.title === "Understood from your words"));
  assert.equal(s.feasibility, "medium");
  assert.ok(s.provider && s.provider.feasibility.length >= 8);
}
console.log("job understanding and solution provider plan: ok");
