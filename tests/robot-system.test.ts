import assert from "node:assert/strict";
import { SKILL_LIBRARY } from "../src/utils/processAnalyzer";
import { brandOf, robotSystem } from "../src/features/automation3d/robotSystem";

for (const { template } of SKILL_LIBRARY) {
  const s = robotSystem(template.name);
  const n = template.name;
  assert.ok(s.howItWorks.length >= 5, `${n}: steps`);
  if (s.isArm) {
    assert.ok(!/polyscope|dart|in-sight/i.test(s.controller), `${n}: controller is software (${s.controller})`);
    assert.ok(s.pendant, `${n}: pendant`);
  }
  assert.ok(s.cables.length >= 6, `${n}: cables`);
  for (const k of ["arm", "pendant", "safety", "fieldbus"]) assert.ok(s.cables.some((c) => c.kind === k), `${n}: ${k} cable`);
  assert.ok(s.eoat.length >= 1, `${n}: eoat`);
  assert.ok(s.consumables.length >= 2, `${n}: wear parts`);
}
assert.equal(brandOf("Staubli TX2-90"), brandOf("Stäubli TX2-90"));
assert.equal(brandOf("Staubli TX2-90"), "Stäubli");

const has = (list: { name: string }[] | string[], re: RegExp) => list.some((x) => re.test(typeof x === "string" ? x : x.name));
const mig = robotSystem("MIG/MAG Welding");
assert.ok(has(mig.consumables, /contact tip/i));
assert.ok(has(mig.cables, /work return/i));
assert.ok(has(mig.signals, /arc on/i));
const spot = robotSystem("Spot Welding");
assert.ok(has(spot.consumables, /electrode cap/i));
assert.ok(has(spot.eoat, /tip dresser/i));
const pal = robotSystem("Palletizing");
assert.ok(has(pal.consumables, /suction cup/i));
assert.ok(has(pal.signals, /pallet full/i));
const cnc = robotSystem("CNC Machining");
assert.ok(has(cnc.signals, /door/i));
assert.ok(has(cnc.signals, /chuck/i));
const ur = robotSystem("Pick & Place", { robot: { name: "UR10e", brand: "Universal Robots" } });
assert.ok(ur.cables.some((c) => c.kind === "pendant" && /4\.5 m/.test(c.carries)));
assert.ok(ur.cables.some((c) => c.kind === "arm" && /6 m/.test(c.carries)));
assert.equal(ur.controller, "Control Box CB 5.5");
console.log("robot-system: ok");
