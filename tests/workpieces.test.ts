import assert from "node:assert/strict";
import { PRODUCT_KEYS, productFor, productInfo } from "../src/features/automation3d/workpieces.js";
import { eoatLook, headFor, TOOL_LOOK_NAMES } from "../src/features/automation3d/toolHeads.js";
import { BLOCKS } from "../src/features/automation3d/ProcessBuilder";
import { GRIP_TOOLS } from "../src/features/automation3d/cellProgram";
import { planLine } from "../src/features/automation3d/robotKnowledge";
import { processesFromSkills } from "../src/utils/processAnalyzer";
import { TOOL_ACTIONS } from "../src/features/automation3d/robotSim.js";

// Every job in the builder shows a real product at a real size, held by a gripper the robot program knows.
for (const b of BLOCKS) {
  const pick = productFor("", [b.name]);
  const info = productInfo(pick);
  assert.ok(PRODUCT_KEYS.includes(info.key), `${b.name}: unknown product ${info.key}`);
  assert.ok(info.size.every((x) => x > 0 && x <= 0.6), `${b.name}: size ${info.size}`);
  assert.ok(info.kg > 0, `${b.name}: weight`);
  assert.ok(GRIP_TOOLS.includes(info.grip), `${b.name}: grip family ${info.grip}`);
  assert.ok(TOOL_LOOK_NAMES[info.look], `${b.name}: gripper look ${info.look}`);
  // The tools the robots really use for each step of the job's line.
  const procs = processesFromSkills([b.name]);
  const plan = planLine(procs.length ? procs : [{ name: b.name }]);
  for (const s of plan.sim.cells.flatMap((c) => c.steps)) {
    if (s.action !== "weld" && !TOOL_ACTIONS[s.action]) continue;
    const look = headFor(s.text || s.label, s.action);
    if (s.action === "assemble" && look === null) continue;
    assert.ok(look && TOOL_LOOK_NAMES[look], `${b.name}: no tool for "${s.label}" (${s.action})`);
  }
}

// The product each kind of job really handles.
const JOB: [string, string, string?][] = [
  ["Fruit & Vegetable Picking", "produce", "apple"],
  ["Egg Collection, Grading & Tray Loading", "egg"],
  ["Bag & Sack Palletizing", "sack", "cement"],
  ["Bag Placing on Rotary Packers", "sack", "empty"],
  ["Glass Handling", "glass"],
  ["Tyre Handling & Loading", "tyre"],
  ["Coil & Roll Handling", "coil", "steel"],
  ["Stone Slab Handling", "slab"],
  ["Brick & Block Stacking", "brick", "clay"],
  ["Bottling", "bottle"],
  ["Filling", "bottle"],
  ["Palletizing", "carton"],
  ["Truck & Container Unloading", "carton"],
  ["Crate & Tote Handling", "tote"],
  ["Parcel Induction & Singulation", "parcel"],
  ["Meat Cutting & Deboning", "meat"],
  ["Food Portioning & Slicing", "slices"],
  ["Icing & Topping Dispensing", "cake"],
  ["Bakery Pan & Tray Handling", "bakery"],
  ["Aseptic Vial Handling", "vial"],
  ["Pathology Sample Tube Sorting", "sampletube"],
  ["Semiconductor Wafer Handling", "wafer"],
  ["Soldering", "pcb"],
  ["Battery Cell Testing & Grading", "cell"],
  ["Battery Module Assembly", "module"],
  ["Solar Panel Cleaning", "solar"],
  ["Greenhouse Seeding & Transplanting", "seedling"],
  ["Robotic Milking", "teatcup"],
  ["Automatic EV Charging", "plug"],
  ["CNC Turning", "shaft"],
  ["Press Brake Bending", "sheet", "bent"],
  ["Press Tending & Stamping", "sheet", "stamped"],
  ["Sheet Loading & Nested Part Sorting", "sheet", "nested"],
  ["Tube & Pipe Bending", "pipe", "bent"],
  ["Blow Moulding Trimming & Handling", "blowmould"],
  ["MIG/MAG Welding", "bracket"],
  ["Spot Welding", "sheetpair", "spot"],
  ["Friction Stir Welding", "sheetpair", "fsw"],
  ["Painting & Coating", "door"],
  ["Polishing", "faucet"],
  ["Stone & Granite Edge Polishing", "slab"],
  ["Jewellery Polishing & Finishing", "jewellery"],
  ["Shot Blasting & Surface Prep", "plate", "rust"],
  ["Windshield Urethane Glazing & Fitting", "windshield"],
  ["Recycling & Waste Sorting", "waste"],
  ["Diamond & Gemstone Sorting", "gem"],
];
for (const [job, key, variant] of JOB) {
  const p = productFor("", [job]);
  assert.equal(p.key, key, `${job} → ${p.key}`);
  if (variant) assert.equal(p.variant, variant, `${job} variant → ${p.variant}`);
}

// The user's own words name the product; a job's usual product comes second.
const BRIEF: [string, string[], string, string?][] = [
  ["palletize 50 kg cement bags", ["Palletizing"], "sack", "cement"],
  ["stack rice bags on pallets", ["Palletizing"], "sack", "rice"],
  ["pick mangoes and pack them in crates", ["Fruit & Vegetable Picking"], "produce", "mango"],
  ["harvest tomatoes in the greenhouse", ["Fruit & Vegetable Picking"], "produce", "tomato"],
  ["fill juice bottles and cap them", ["Filling", "Capping"], "bottle", "juice"],
  ["fill and seal milk bottles", ["Filling"], "bottle", "milk"],
  ["load brown eggs into trays", ["Egg Collection, Grading & Tray Loading"], "egg", "brown"],
  // Container words do not beat a job that names its product.
  ["weld steel brackets and pack them into boxes", ["MIG/MAG Welding", "Packing & Box Forming"], "bracket"],
  ["palletize boxes", ["Palletizing"], "carton"],
];
for (const [brief, jobs, key, variant] of BRIEF) {
  const p = productFor(brief, jobs);
  assert.equal(p.key, key, `"${brief}" → ${p.key}`);
  if (variant) assert.equal(p.variant, variant, `"${brief}" variant → ${p.variant}`);
}
// A colour is a paint colour, not a fruit; "can" the verb is not a can.
assert.equal(productFor("spray paint the door panels orange", ["Painting & Coating"]).key, "door");
assert.equal(productFor("spray paint the door panels orange", ["Painting & Coating"]).coat, "#ea6a12");
assert.equal(productFor("the robot can pick the parts from the conveyor", ["Loading & Unloading"]).key, "block");
// Milking is not milk bottles.
assert.equal(productFor("robotic milking of cows", ["Robotic Milking"]).key, "teatcup");

// The process tool each step really uses.
const HEADS: [string, string, string | null][] = [
  ["MIG/MAG Welding", "weld", "torch"],
  ["Laser Welding", "weld", "laser"],
  ["Spot Welding", "weld", "spotgun"],
  ["Stud Welding", "weld", "studgun"],
  ["Ultrasonic Plastic Welding", "weld", "sonotrode"],
  ["Friction Stir Welding", "weld", "fsw"],
  ["Soldering", "weld", "iron"],
  ["Painting & Coating", "apply", "spraygun"],
  ["Powder Coating", "apply", "powdergun"],
  ["Adhesive & Sealant Dispensing", "apply", "nozzle"],
  ["Icing & Topping Dispensing", "apply", "nozzle"],
  ["Polishing", "finish", "polisher"],
  ["Grinding & Surface Prep", "finish", "grinder"],
  ["Laser Cleaning & Surface Prep", "finish", "laser"],
  ["Solar Panel Cleaning", "finish", "brush"],
  ["Shot Blasting & Surface Prep", "finish", "blaster"],
  ["Meat Cutting & Deboning", "finish", "blade"],
  ["Drilling", "finish", "drill"],
  ["CNC Routing & Trimming", "finish", "router"],
  ["Roller Hemming", "finish", "roller"],
  ["Screw Driving", "assemble", "driver"],
  ["Riveting Assembly", "assemble", "riveter"],
  ["Nailing & Stapling", "assemble", "nailer"],
  ["Rebar Tying & Mesh Assembly", "assemble", "tier"],
  ["Assembly", "assemble", null],
  ["Filling", "fill", "fillnozzle"],
  ["Lab Sample Pipetting & Dosing", "fill", "pipette"],
  ["Capping", "cap", "capper"],
  ["Tray Sealing", "cap", "sealhead"],
  ["Labeling & Weighing", "label", "labeler"],
  ["Laser Marking & Coding", "label", "laser"],
];
for (const [job, action, look] of HEADS) assert.equal(headFor(job, action), look, `${job} (${action})`);

// The look of a tool the user chose from the Directory.
assert.equal(eoatLook("OnRobot Soft Gripper food grade"), "soft");
assert.equal(eoatLook("Schmalz vacuum lifting frame for glass"), "frame");
assert.equal(eoatLook("Graco robotic spray gun"), "spraygun");
assert.equal(eoatLook("Fronius MIG torch"), null);

// Machining jobs get their real machine: a press, a moulding machine, or a head the robot carries.
const stationsOf = (job: string) => planLine(processesFromSkills([job])).sim.cells.flatMap((c) => c.steps.map((s) => `${s.action}@${s.station}`));
assert.ok(stationsOf("Press Tending & Stamping").includes("process@press"));
assert.ok(stationsOf("Injection Moulding Tending").includes("process@mould"));
assert.ok(stationsOf("CNC Machining").includes("process@cnc"));
assert.ok(stationsOf("Drilling").includes("finish@table"));
assert.ok(stationsOf("Meat Cutting & Deboning").includes("finish@table"));

console.log("workpieces: ok");
