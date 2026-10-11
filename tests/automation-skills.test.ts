import assert from "node:assert/strict";
import { SKILL_LIBRARY, matchTemplateIds, processesFromSkills } from "../src/utils/processAnalyzer";
import { processKind } from "../src/features/automation3d/processProfiles";
import { BLOCKS } from "../src/features/automation3d/ProcessBuilder";
import { calc, JOB_NOTES } from "../src/features/automation3d/engineerPlaybook";
import { engineSolution } from "../src/features/automation3d/solutionEngine";

// Every skill in the library is reached by its own "Simulate" sentence and its own keywords.
assert.ok(SKILL_LIBRARY.length >= 130, `skills: ${SKILL_LIBRARY.length}`);
for (const s of SKILL_LIBRARY) {
  assert.ok(matchTemplateIds(`We need robots for ${s.template.name.toLowerCase()}.`).includes(s.id), `simulate ${s.id}`);
}
for (const s of SKILL_LIBRARY.filter((x) => x.id !== "food")) {
  for (const k of s.keywords) assert.ok(matchTemplateIds(`we need ${k} here`).includes(s.id), `keyword ${k} -> ${s.id}`);
}

// New skills: a typical brief finds the specific skill, not its generic parent.
for (const [brief, ids] of Object.entries({
  "Ultrasonic welding of plastic housings": ["ultrasonic"],
  "Friction stir welding of aluminium cooling plates": ["fsw"],
  "Ultrasonic testing of composite panels with phased array": ["ndt"],
  "Load sheets into the laser and sort nested parts": ["sheetload"],
  "Load steel coils onto the decoiler": ["coil"],
  "Robot on an AMR to tend three CNC machines": ["mobman"],
  "Remove rust with a laser cleaning robot": ["laserclean"],
  "Recycling plant waste sorting with AI": ["recycle"],
  "Bakery bread pans loading into oven": ["bakery"],
  "Potting and conformal coating of PCBs": ["potting", "pcb"],
  "Strapping bundles of pipes": ["strap"],
  "Seedling transplanting in a greenhouse": ["greenhouse"],
  "Rebar tying for precast slabs": ["rebar"],
  "Load silicon wafers from FOUP into the tool in a cleanroom": ["wafer"],
  "wire harness assembly with crimped terminals": ["harness", "crimp"],
})) assert.deepEqual(matchTemplateIds(brief), ids, brief);

// Ordinary words do not add stations by accident.
for (const [brief, ids] of Object.entries({
  "Pack chocolate bars into cartons, food grade, 2 shifts": ["pack"],
  "We spray paint galvanised steel frames and then pack them": ["spray", "pack"],
  "MIG weld hardened steel brackets then grind spatter": ["mig", "grind"],
  "Fill cooking oil bottles, cap them and label": ["fill", "bottle", "cap", "label"],
  "Cut aluminium extrusions to length and drill holes": ["cut", "drill"],
  "A portion of the line is manual: operators pick totes and place them on a conveyor": ["pick", "crate"],
  "Hospital beds frame welding and powder coating": ["weld", "powdercoat"],
})) assert.deepEqual(matchTemplateIds(brief), ids, brief);

// Motion families of the new skills.
for (const [name, kind] of Object.entries({
  "Ultrasonic Plastic Welding": "welding", "NDT Inspection (Ultrasonic & Eddy Current)": "inspection",
  "Tube & Pipe Bending": "machining", "Stator Winding & Hairpin Assembly": "assembly",
  "Potting, Gap Filler & Conformal Coating": "coating", "Surface Masking & Demasking": "coating",
  "Laser Cleaning & Surface Prep": "finishing", "Cartoning (Product into Cartons)": "packing",
  "Recycling & Waste Sorting": "handling", "Ceiling Drilling & Drywall Fixing": "machining",
})) assert.equal(processKind({ name }), kind, name);

// Every builder job is a studio skill with its own engineering notes.
for (const b of BLOCKS) {
  assert.equal(processesFromSkills([b.name])[0]?.name, b.name, b.name);
  assert.ok(JOB_NOTES[b.name]?.length, `notes for ${b.name}`);
}

// Knowledge rules reach the solution.
{
  const coil = engineSolution("Load steel coils onto the decoiler");
  assert.match(coil.stations[0].tooling, /mandrel/i);
  const lab = engineSolution("Pick test tubes and pipette samples in the pathology lab");
  assert.ok(lab.standards!.some((x) => /ISO 15189/.test(x)));
  const moma = engineSolution("Cobot on an AMR to tend three CNC machines with 4 kg parts");
  assert.ok(moma.reasoning!.some((r) => /Mobile manipulator/.test(r.detail)));
  const wings = engineSolution("Pack chicken wings into trays, we ship 500 boxes a day");
  assert.ok(!wings.industry_notes!.some((x) => /Aerospace/.test(x)), "chicken wings are not aerospace");
}

// Calculators.
{
  const o = calc.oee(450, 45, 30, 760, 740);
  assert.ok(Math.abs(o.oee - 0.822) < 0.001);
  assert.ok(Math.abs(calc.payback(2500000, 2, 2, 32000).months - 19.53) < 0.01);
  assert.deepEqual(calc.conveyor(30, 300, 200), { speedMpm: 9, gapMm: 100 });
  assert.equal(calc.pallet(1200, 800, 400, 300, 250, 1500).perLayer, 8);
  assert.equal(calc.pallet(1200, 1000, 400, 300, 250, 1500).total, 60);
  assert.ok(Math.abs(calc.air(32, 100, 6, 10, true) - 11.14) < 0.01);
}
console.log(`automation skills: ${SKILL_LIBRARY.length} skills, ${BLOCKS.length} builder jobs verified`);
