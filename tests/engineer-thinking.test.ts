import assert from "node:assert/strict";
import { classOf, decisionMatrix, fmeaFor, lineBalance, manualCrew, moveTime, pickPlaceCycle, requiredPL, safetyFunctions, thinkSolution } from "../src/features/automation3d/engineerThinking";
import { engineSolution, extractFacts } from "../src/features/automation3d/solutionEngine";
import { matchTemplateIds, SKILL_LIBRARY } from "../src/utils/processAnalyzer";
import { BLOCKS } from "../src/features/automation3d/ProcessBuilder";
import { CORE_SKILLS, thinkCell } from "../src/features/automation3d/engineerPlaybook";
import { INDUSTRY_RULES } from "../src/features/automation3d/automationKnowledge";

// ISO 13849-1 risk graph: all eight paths.
for (const [s, f, p, pl] of [[1, 1, 1, "a"], [1, 1, 2, "b"], [1, 2, 1, "b"], [1, 2, 2, "c"], [2, 1, 1, "c"], [2, 1, 2, "d"], [2, 2, 1, "d"], [2, 2, 2, "e"]] as const)
  assert.equal(requiredPL(s, f, p), pl, `S${s}F${f}P${p}`);
// Robot safety functions never go below PL d; a press interlock needs PL e.
{
  const fns = safetyFunctions({ kinds: ["machining"], robots: 1, cobots: 0, press: true });
  assert.ok(fns.every((x) => x.required >= "d"));
  assert.equal(fns.find((x) => /press/i.test(x.fn))?.required, "e");
  const cobot = safetyFunctions({ kinds: ["handling"], robots: 1, cobots: 1 });
  assert.equal(cobot.length, 1);
  assert.equal(cobot[0].graph, "b");
  assert.equal(cobot[0].required, "d");
}

// Motion: trapezoid when long, triangle when short; heavier and collaborative robots are slower.
assert.ok(Math.abs(moveTime(1.2, 2.5, 12) - (1.2 / 2.5 + 2.5 / 12)) < 1e-9);
assert.ok(Math.abs(moveTime(0.1, 1, 5) - 2 * Math.sqrt(0.1 / 5)) < 1e-9);
{
  const small = pickPlaceCycle({ travelM: 1.2, partKg: 5, robotPayloadKg: 12, cls: "small", gripper: "parallel" }).total;
  const cobot = pickPlaceCycle({ travelM: 1.2, partKg: 5, robotPayloadKg: 12, cls: "cobot", gripper: "parallel" }).total;
  const heavy = pickPlaceCycle({ travelM: 1.8, partKg: 150, robotPayloadKg: 250, cls: "large", gripper: "fork" }).total;
  const delta = pickPlaceCycle({ travelM: 0.4, partKg: 0.2, robotPayloadKg: 3, cls: "delta", gripper: "vacuum" }).total;
  const loaded = pickPlaceCycle({ travelM: 1.2, partKg: 12, robotPayloadKg: 12, cls: "small", gripper: "parallel" }).total;
  assert.ok(small > 2.5 && small < 5, `small pick and place ${small}`);
  assert.ok(cobot > small, "cobot slower");
  assert.ok(heavy > small && heavy < 15, `heavy ${heavy}`);
  assert.ok(delta < 1.5, `delta ${delta}`);
  assert.ok(loaded > small, "full payload slows the robot");
  assert.equal(classOf(8), "small");
  assert.equal(classOf(25, "Collaborative robot"), "cobot");
  assert.equal(classOf(400), "heavy");
}

// Line balance at 85 % OEE: 600 parts/h is a 6 s takt; a 10 s cycle needs 2 robots.
{
  const b = lineBalance([{ station: "Pick", cycleS: 10 }, { station: "Pack", cycleS: 4 }], 600);
  assert.equal(b.takt, 6);
  assert.deepEqual(b.rows.map((r) => r.robots), [2, 1]);
  assert.equal(b.bottleneck, "Pick");
  assert.ok(b.rows.every((r) => r.utilisation <= 0.85 + 1e-9));
}

// FMEA is ranked by RPN.
{
  const f = fmeaFor(["welding", "handling"]);
  assert.ok(f.every((x, i) => i === 0 || f[i - 1].rpn >= x.rpn));
  assert.equal(f[0].mode, "Seam missed or off-line");
}

// The decision matrix picks the approach an engineer would.
const pick = (brief: string, robots = 1) => {
  const facts = extractFacts(brief);
  const kinds = [...new Set(engineSolution(brief).stations.map(() => "handling" as const))];
  return decisionMatrix(facts, { robots, kinds: /weld/i.test(brief) ? ["welding"] : kinds }).pick;
};
assert.match(pick("Weld 12 kg steel brackets with MIG, 2 shifts"), /Industrial robot/);
assert.match(pick("Pick 2 kg parts with many variants, cobot alongside the operator, 100 parts an hour"), /Cobot/);
assert.match(pick("Fill 3000 bottles an hour of one product"), /Special-purpose/);
assert.match(pick("Move 600 kg press dies"), /Gantry/);
assert.match(pick("Palletize 50 kg bags, 600 bags an hour", 2), /Robot line/);

// The crew a rate needs by hand sets the labour a handling robot saves.
assert.equal(manualCrew(600, 50), 4);
assert.equal(manualCrew(240, 2), 1);
assert.equal(manualCrew(null, 50), 0);
{
  const bags = engineSolution("Palletize 50 kg cement bags coming on a conveyor, 600 bags an hour");
  assert.match(bags.title, /^2 parallel robot cells/);
  assert.equal(bags.thinking!.decision.pick, "2 parallel robot cells");
  assert.ok(bags.thinking!.review.some((r) => r.item === "Payback"));
  const months = Number(/^(\d+)/.exec(bags.roi.payback_months)?.[1]);
  assert.ok(months > 0 && months < 70, `cement bag payback ${bags.roi.payback_months}`);
}

// A working day is the shifts named (or two), not 24 hours.
assert.equal(extractFacts("400 parts a day, 2 shifts").partsPerHour, 25);
assert.equal(extractFacts("480 parts a day").partsPerHour, 30);

// Every plan carries the thinking, and the builder's reasoning uses it.
{
  const s = engineSolution("Palletize 50 kg cement bags coming on a conveyor, 600 bags an hour");
  const t = s.thinking!;
  assert.ok(t.decision.options.length === 5 && t.method.length >= 7);
  assert.ok(t.motion.length && t.balance.rows.length && t.safety.length && t.fmea.length && t.review.length >= 8 && t.sensitivity.length === 4);
  assert.ok(s.reasoning!.some((r) => r.title === "Decision matrix") && s.reasoning!.some((r) => r.title === "Safety level"));
  assert.ok(thinkSolution(s, "Palletize 50 kg cement bags").decision.pick.length > 0);
  const steps = thinkCell({ job: "Loading & Unloading", choice: { robot: { source: "oem", kind: "robot", id: "x", name: "FANUC M-20iD/25", brand: "Fanuc", payload: 25, href: "", score: 0, reasons: [] } }, needKg: 10, fenced: true, cobot: false, cycle: 9, checks: [] }).map((x) => x.step);
  for (const step of ["Motion check", "Safety level", "Failure modes"]) assert.ok(steps.includes(step), step);
}

// New skills for Indian industries, recognised in plain words.
const nameOf = (id: string) => SKILL_LIBRARY.find((s) => s.id === id)?.template.name;
for (const [brief, skill] of [
  ["lift granite slabs onto the polishing line", "Stone Slab Handling"],
  ["polish granite countertop edges", "Stone & Granite Edge Polishing"],
  ["doff yarn cones in a spinning mill", "Textile Bobbin & Cone Handling"],
  ["place empty cement bags on the rotary packer spouts", "Bag Placing on Rotary Packers"],
  ["load rubber compression moulding presses", "Compression Moulding Tending"],
  ["trim blow moulded jerry cans", "Blow Moulding Trimming & Handling"],
  ["load SMT reels and PCB magazines", "SMT Reel & Magazine Handling"],
  ["dip temperature probes into molten steel", "Steel Plant Sampling & Temperature Probing"],
] as const) assert.deepEqual(matchTemplateIds(brief).map(nameOf), brief.startsWith("lift") ? [skill, "Polishing"] : [skill], brief);
assert.ok(!matchTemplateIds("handle coils in a steel rolling mill").map(nameOf).includes("CNC Milling"), "a rolling mill is not a milling machine");
assert.ok(BLOCKS.length >= 65, `jobs: ${BLOCKS.length}`);
for (const industry of ["Stone & granite", "Textile mills", "Cement & bulk materials", "Steel plants"]) assert.ok(INDUSTRY_RULES.some((r) => r.industry === industry), industry);
assert.ok(!INDUSTRY_RULES.find((r) => r.industry === "Construction")!.when.test(" cement packer "), "a cement packer is not construction");
for (const skill of ["Choosing the solution", "Cycle time from motion", "Line balancing", "Safety performance level", "FMEA", "Design review"]) assert.ok(CORE_SKILLS.some((c) => c.name === skill), skill);
console.log("engineer thinking: risk graph, motion, balance, FMEA, decision matrix and new skills verified");
