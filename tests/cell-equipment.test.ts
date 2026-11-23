import assert from "node:assert/strict";
import * as THREE from "three";
import { SKILL_LIBRARY } from "../src/utils/processAnalyzer";
import { areaOf, cellEquipment, chosenProduct, createEquipmentModels, EQUIPMENT_GROUPS, EQUIPMENT_MODELS, jobsOfTitle, lineEquipment } from "../src/features/automation3d/cellEquipment.js";

const models = createEquipmentModels(THREE);
const groups = new Set(EQUIPMENT_GROUPS.map(([g]) => g));
const PLACES = new Set(["outside", "reach", "base", "work", "pallet", "arm", "front", null]);

// Every model the knowledge can ask for builds, stands on the floor and has a real footprint.
for (const key of EQUIPMENT_MODELS) {
  const m = models.buildModel(key, {});
  assert.ok(m, `${key}: builds`);
  const [w, h, d] = m!.size;
  assert.ok(w > 0.05 && h > 0.05 && d > 0.05 && w < 3 && h < 3 && d < 3, `${key}: footprint ${m!.size}`);
  const box = new THREE.Box3().setFromObject(m!.group);
  assert.ok(box.min.y > -0.05, `${key}: stands on the floor (${box.min.y.toFixed(2)})`);
}

// Every job, fenced and as a cobot: the whole set-up, not just the robot.
for (const { template: t } of SKILL_LIBRARY) {
  for (const fenced of [true, false]) {
    const list = cellEquipment([t.name], { fenced });
    const tag = `${t.name}${fenced ? "" : " (cobot)"}`;
    assert.ok(list.some((x) => x.group === "robot" && x.model === (fenced ? "controller" : "cobotBox")), `${tag}: robot controller`);
    assert.ok(list.some((x) => x.group === "safety"), `${tag}: safety`);
    assert.ok(list.some((x) => x.group === "utility" && x.model === "airUnit"), `${tag}: compressed air`);
    assert.ok(list.some((x) => x.group === "process"), `${tag}: process equipment (${list.map((x) => x.name).join("; ")})`);
    assert.equal(new Set(list.map((x) => x.name)).size, list.length, `${tag}: no item twice`);
    for (const x of list) {
      assert.ok(x.name && x.label && x.why, `${tag}: ${x.name} is described`);
      assert.ok(groups.has(x.group), `${tag}: ${x.name} has a group`);
      assert.ok(PLACES.has(x.at), `${tag}: ${x.name} has a place (${x.at})`);
      if (x.model) assert.ok(EQUIPMENT_MODELS.includes(x.model), `${tag}: ${x.name} → model ${x.model} exists`);
    }
    // Industrial cells have a cabinet and a fence; cobots a control box and an area scanner instead.
    assert.equal(list.some((x) => x.model === "scanner"), !fenced, `${tag}: area scanner only without a fence`);
  }
}

const names = (job: string, fenced = true) => cellEquipment([job], { fenced }).map((x) => x.name.toLowerCase());
const has = (job: string, re: RegExp, fenced = true) => names(job, fenced).some((n) => re.test(n));

// Arc welding: the full MIG/MAG set-up.
for (const job of ["MIG/MAG Welding", "Robotic Welding", "Pipe & Orbital Welding", "Heavy Fabrication & Gantry Welding", "Wire Arc Additive Manufacturing (Weld Build-up)"]) {
  for (const re of [/power source/, /wire feeder/, /wire drum/, /shielding-gas/, /torch cleaning/, /fume extraction hood/, /fume extractor/, /welding screens/, /seam/])
    assert.ok(has(job, re), `${job}: ${re}`);
}
// TIG: argon, a water cooler and a cold-wire feeder; no MIG wire drum or reamer.
assert.ok(has("TIG Welding", /argon/) && has("TIG Welding", /water cooler/) && has("TIG Welding", /cold-wire/));
assert.ok(!has("TIG Welding", /wire drum|torch cleaning/), "TIG has no MIG wire drum or reamer");
// Joining without an arc: no MIG kit.
for (const job of ["Spot Welding", "Friction Stir Welding", "Soldering", "Laser Welding", "Ultrasonic Plastic Welding"]) assert.ok(!has(job, /wire drum|shielding-gas|torch cleaning/), `${job}: no MIG kit`);
assert.ok(has("Spot Welding", /tip dresser/) && has("Spot Welding", /weld timer/) && has("Spot Welding", /cooling-water/));
assert.ok(has("Laser Welding", /fibre laser source/) && has("Laser Welding", /chiller/) && cellEquipment(["Laser Welding"]).some((x) => x.enclosure === "laser"));
assert.ok(has("Painting & Coating", /spray booth/) && has("Painting & Coating", /paint supply/) && has("Painting & Coating", /exhaust/));
assert.ok(has("Adhesive & Sealant Dispensing", /dosing unit/));
assert.ok(has("Grinding & Surface Prep", /dust collector/) && has("Grinding & Surface Prep", /disc change/));
assert.ok(has("Assembly", /parts feeder/) && !has("Assembly", /dust collector/), "assembly is not grinding");
assert.ok(has("Palletizing", /light curtain/) && !has("Palletizing", /light curtain/, false), "pallet light curtain only in a fenced cell");
assert.ok(has("Palletizing", /slip-sheet/) && has("Palletizing", /stretch wrapper/) && has("Palletizing", /palletizing gripper/));
assert.ok(has("CNC Machining", /machine interface/) && has("CNC Machining", /air blow-off/) && has("CNC Machining", /dual gripper/));
assert.ok(has("Injection Moulding Tending", /euromap/) && !has("Injection Moulding Tending", /chuck/));
assert.ok(!has("Compression Moulding Tending", /press light curtain/), "compression moulding is not a press");
assert.ok(has("Press Tending & Stamping", /press/));
assert.ok(has("Waterjet Cutting", /intensifier/) && !has("Waterjet Cutting", /spindle/), "waterjet has a pump, not a spindle");
assert.ok(has("Drilling", /spindle drive/) && has("Drilling", /tool rack/));
assert.ok(has("Screw Driving", /screw feeder/) && has("Screw Driving", /tightening controller/));
assert.ok(has("Vision Inspection", /reject/) && has("Vision Inspection", /vision controller/));
assert.ok(has("Packing & Box Forming", /case erector/) && has("Packing & Box Forming", /case sealer/));
assert.ok(has("Strapping & Bundle Packing", /strapping machine/) && !has("Strapping & Bundle Packing", /case erector/));
assert.ok(has("Labeling & Weighing", /labeller/));
assert.ok(has("Meat Cutting & Deboning", /sterilizer/));
// NDT is inspection, not ultrasonic welding.
assert.notEqual(areaOf("NDT Inspection (Ultrasonic & Eddy Current)"), "ultrasonic");
assert.ok(!has("NDT Inspection (Ultrasonic & Eddy Current)", /horn/));

// A robot with two jobs: one controller, each job's equipment once.
{
  const two = cellEquipment(["MIG/MAG Welding", "Palletizing"]);
  assert.equal(two.filter((x) => x.model === "controller").length, 1);
  assert.ok(two.some((x) => /power source/i.test(x.name)) && two.some((x) => /light curtain/i.test(x.name)));
}
// A cell whose jobs are not named: from what its steps do.
assert.ok(cellEquipment([], { steps: [{ action: "pick", station: "conveyor" }, { action: "weld", station: "weld" }] }).some((x) => /power source/i.test(x.name)));
// Titles as the planner writes them.
assert.deepEqual(jobsOfTitle("Robot 2: Painting & Coating + Palletizing"), ["Painting & Coating", "Palletizing"]);
assert.deepEqual(jobsOfTitle("Robot 3"), []);
// The product the user chose labels the matching equipment.
const power = cellEquipment(["MIG/MAG Welding"]).find((x) => x.model === "weldPower")!;
assert.equal(chosenProduct(power, ["Fronius TPS 400i Welding Power Source", "Binzel BRS-CC Torch Cleaning Station"]), "Fronius TPS 400i Welding Power Source");
const cleaner = cellEquipment(["MIG/MAG Welding"]).find((x) => x.model === "torchCleaner")!;
assert.equal(chosenProduct(cleaner, ["Fronius TPS 400i Welding Power Source", "Binzel BRS-CC Torch Cleaning Station"]), "Binzel BRS-CC Torch Cleaning Station");
assert.equal(lineEquipment()[0].model, "hmi");

models.dispose();
console.log(`cell equipment: ${SKILL_LIBRARY.length} jobs, ${EQUIPMENT_MODELS.length} models checked`);
