import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { matchTemplateIds, SKILL_LIBRARY } from "../src/utils/processAnalyzer";
import { processKind } from "../src/features/automation3d/processProfiles";
import { gearFor } from "../src/features/automation3d/jobGear";
import { kitGuide } from "../src/features/automation3d/jobKit";
import { JOB_NOTES } from "../src/features/automation3d/engineerPlaybook";
import { BLOCKS, findJobs } from "../src/features/automation3d/ProcessBuilder";
import { engineSolution } from "../src/features/automation3d/solutionEngine";
import { fmeaFor } from "../src/features/automation3d/engineerThinking";
import { understandJob } from "../src/features/automation3d/jobUnderstanding";
import { INDUSTRY_RULES } from "../src/features/automation3d/automationKnowledge";
import { matchOemRobots, matchOemTools, needOf, type DirRobot, type DirTool } from "../src/features/automation3d/equipmentScore";
import { eoatKind } from "../src/features/automation3d/robotSim.js";

const tools: DirTool[] = JSON.parse(readFileSync("public/directory/tools.json", "utf8"));
const robots: DirRobot[] = JSON.parse(readFileSync("public/directory/robots.json", "utf8"));
assert.equal(new Set(tools.map((t) => t.id)).size, tools.length, "tool ids are unique");

// Jobs whose special device the Directory does not list: the Studio says "nearest tool" honestly.
const UNLISTED = new Set(["pour", "evcharge", "milking"]);

// Every skill, end to end: its name, its tool, its notes, its builder job, its plan, its equipment.
for (const { id, template: t } of SKILL_LIBRARY) {
  const kind = processKind(t);
  assert.equal(matchTemplateIds(t.name)[0], id, `${t.name}: its own name finds it`);
  assert.deepEqual(understandJob(t.name).tasks.map((x) => x.name), [t.name], `${t.name}: understood as itself only`);
  const gear = gearFor(t.name, kind);
  assert.ok(gear.tools.includes(eoatKind(t.eoat[0]) as never), `${t.name}: its own tool "${t.eoat[0]}" is one the job can use (${gear.tools.join("/")})`);
  assert.ok((JOB_NOTES[t.name]?.length ?? 0) >= 3, `${t.name}: engineer notes`);
  assert.ok(BLOCKS.some((b) => b.name === t.name), `${t.name}: a builder job`);
  assert.ok(fmeaFor([kind]).length > 0, `${t.name}: failure modes`);
  assert.ok(kitGuide(t.name).software.length > 0, `${t.name}: software`);

  const plan = engineSolution(t.name);
  const st = plan.stations[0];
  assert.equal(st?.skill, t.name, `${t.name}: the plan's first station is the skill (${plan.stations.map((x) => x.name).join(", ")})`);
  const need = needOf(st);
  const tool = matchOemTools(need, tools, st.tooling, 1)[0];
  assert.ok(tool, `${t.name}: a Directory tool`);
  assert.ok(!/label/i.test(tool.name) || /label/i.test(t.name), `${t.name}: no label applicator (${tool.name})`);
  assert.ok(!/paint sprayer/i.test(tool.name) || /paint|spray|powder|glaze|plaster|coat/i.test(t.name), `${t.name}: no paint gun (${tool.name})`);
  assert.equal(tool.reasons.some((r) => /^No .* listed/.test(r)), UNLISTED.has(id), `${t.name}: ${tool.name} — ${tool.reasons[0]}`);
  const robot = matchOemRobots(need, robots, 1)[0];
  assert.ok(robot && (robot.payload ?? 0) >= (st.payload_kg ?? 0), `${t.name}: a Directory robot for ${st.payload_kg} kg (${robot?.name})`);
}
assert.equal(BLOCKS.length, SKILL_LIBRARY.length, "every skill is a builder job");

// Robots that carry the process head are sized for the head; heavy process tools get heavy robots.
{
  const at = (job: string) => engineSolution(job).stations[0];
  assert.ok(at("Spot Welding").payload_kg! >= 150, "a servo spot gun needs a heavy robot");
  assert.ok(at("Friction Stir Welding").payload_kg! >= 300, "friction stir needs a stiff, heavy robot");
  assert.ok(at("Roller Hemming").payload_kg! >= 150, "roller hemming force");
  assert.ok(at("Semiconductor Wafer Handling").payload_kg! <= 5, "wafers suit small robots");
  assert.ok(at("Blister & Pharma Pack Loading").payload_kg! <= 5, "blisters suit small robots");
  assert.ok(at("Solar Module Assembly").payload_kg! >= 30, "solar glass is carried");
  assert.doesNotMatch(at("Meat Cutting & Deboning").tooling, /soft|finger/i, "a cutting robot carries a blade, not a gripper");
}

// New skills for Indian industries, recognised in plain words.
const nameOf = (id: string) => SKILL_LIBRARY.find((s) => s.id === id)?.template.name;
for (const [brief, skill] of [
  ["dip wax trees in slurry for investment casting", "Investment Shell Building (Wax Tree Dipping)"],
  ["lay CRGO laminations for transformer cores", "Transformer Core Lamination Laying"],
  ["roller hemming of car doors", "Roller Hemming"],
  ["grade eggs and fill egg trays", "Egg Collection, Grading & Tray Loading"],
  ["sort and pack vitrified tiles in Morbi", "Ceramic Tile Sorting & Packing"],
  ["clean solar panels at our solar park without water", "Solar Panel Cleaning"],
  ["test and grade 18650 battery cells by OCV", "Battery Cell Testing & Grading"],
  ["spray plaster and putty on apartment walls", "Wall Plastering & Spray Painting"],
  ["polish gold bangles", "Jewellery Polishing & Finishing"],
  ["sort rough diamonds by size", "Diamond & Gemstone Sorting"],
  ["fit windshields with a urethane bead", "Windshield Urethane Glazing & Fitting"],
  ["stack cotton bales and feed the bale opener", "Cotton & Jute Bale Handling"],
  ["sort blood sample tubes in a pathology lab", "Pathology Sample Tube Sorting"],
] as const) assert.ok(matchTemplateIds(brief).map(nameOf).includes(skill), `${brief} → ${matchTemplateIds(brief).map(nameOf).join(", ")}`);
assert.ok(!matchTemplateIds("polish granite with diamond pads").map(nameOf).includes("Diamond & Gemstone Sorting"), "diamond pads are not diamonds");
assert.ok(!matchTemplateIds("fix plasterboard to the ceiling").map(nameOf).includes("Wall Plastering & Spray Painting"), "plasterboard is drywall");

// Industries, and site painting is not a spray booth.
const industries = (b: string) => INDUSTRY_RULES.filter((r) => r.when.test(` ${b} `)).map((r) => r.industry);
assert.ok(industries("pack vitrified tiles").includes("Ceramics & tiles"));
assert.ok(industries("sort rough diamonds").includes("Jewellery & gems"));
assert.ok(industries("grade eggs at the layer farm").includes("Poultry & eggs"));
assert.ok(industries("lay crgo laminations").includes("Transformers & electrical"));
assert.deepEqual(industries("paint the walls of a tower"), ["Construction"]);
assert.ok(!industries("polish granite with diamond pads").includes("Jewellery & gems"));

// Each job's own equipment reaches the kit.
assert.ok(kitGuide("Meat Cutting & Deboning").also.some((x) => /sterili/i.test(x)));
assert.ok(!kitGuide("Meat Cutting & Deboning").also.some((x) => /chuck|chips/i.test(x)), "no machine-tending kit for a cutting robot");
assert.ok(kitGuide("Waterjet Cutting").also.some((x) => /pump/i.test(x)));
assert.ok(kitGuide("Order Picking").also.some((x) => /camera/i.test(x)));
// Joining without an arc torch gets no MIG kit: friction stir has no wire and no fumes.
for (const job of ["Friction Stir Welding", "Soldering", "Stud Welding"]) {
  const k = kitGuide(job);
  assert.ok(![...k.components, ...k.also].some((x) => /wire feeder \(mig|torch cleaning|power source/i.test(x)), `${job}: ${[...k.components, ...k.also].join("; ")}`);
}
assert.ok(!kitGuide("Friction Stir Welding").also.some((x) => /fume|arc-flash/i.test(x)));
// Finding a job in the builder: words match the start of words ("tile" is not "textile").
assert.deepEqual(findJobs("tile").map((b) => b.name), ["Ceramic Tile Sorting & Packing"]);
assert.ok(findJobs("foundry").length >= 6 && findJobs("weld").length >= 10);
assert.equal(findJobs("").length, BLOCKS.length);
console.log(`skill audit: ${SKILL_LIBRARY.length} skills checked end to end`);
