import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { suggest, suggestSwap, isCobotMatch } from "../src/features/automation3d/builderExtras";
import { cellProgram, stationsFor } from "../src/features/automation3d/cellProgram";
import { matchMarketRobots, matchOemTools, toolFamily } from "../src/features/automation3d/equipmentScore";
import { COBOT_EOAT, gearFor, isArcRobot, isLabRobot, isPaintRobot, lockedOut } from "../src/features/automation3d/jobGear";
import { BLOCKS } from "../src/features/automation3d/ProcessBuilder";
import { planLine } from "../src/features/automation3d/robotKnowledge";
import { processesFromSkills } from "../src/utils/processAnalyzer";

const dr = JSON.parse(readFileSync("public/directory/robots.json", "utf8"));
const dt = JSON.parse(readFileSync("public/directory/tools.json", "utf8"));
const raw = { dr, dt, mr: [], mt: [] };
const kgFor = (job: string) => {
  const input = processesFromSkills([job])[0] ?? { name: job };
  return planLine([input], "balanced", { splitBefore: [input.name], robots: 1 }).robots[0]?.minPayload ?? 10;
};
const family = (name: string, type = "") => toolFamily(name, type);

// Every builder job gets a robot and a tool that its own program can use.
for (const b of BLOCKS) {
  const kg = kgFor(b.name);
  const s = suggest(b.name, kg, raw);
  const gear = gearFor(b.name);
  assert.ok(s.robot && s.tool, `${b.name}: robot and tool`);
  const robot = s.robot!;
  const tool = s.tool!;
  assert.ok((robot.payload ?? 0) >= kg, `${b.name}: ${robot.name} ${robot.payload} kg ≥ ${kg} kg`);
  assert.ok(!isLabRobot(robot.name) || !!gear.robot.lab, `${b.name}: laboratory robot only for lab work (${robot.name})`);
  // Spray-booth painting gets a painting robot; site wall painting does not.
  assert.equal(isPaintRobot(robot.name), !!gear.robot.paint, `${b.name}: painting robot only for painting (${robot.name})`);
  const kind = family(tool.name, tool.type);
  assert.ok(kind && gear.tools.includes(kind), `${b.name}: ${tool.name} is a ${kind}, job uses ${gear.tools.join("/")}`);
  assert.ok(!lockedOut(tool.name, `${robot.brand} ${robot.name}`), `${b.name}: ${tool.name} fits ${robot.name}`);
  const p = cellProgram({ job: b.name, tools: [kind!], changer: false, stations: stationsFor(b.name, [kind!]) });
  assert.ok(!p.idle && !p.notes.some((n) => n.level === "stop"), `${b.name} runs with ${tool.name}: ${p.notes.map((n) => n.text).join("; ")}`);
  console.log(`• ${b.name}: ${robot.name} (${robot.payload} kg) + ${tool.name}`);
}

const pick = (job: string, cobot = false) => suggest(job, kgFor(job), raw, cobot);
// Welding: an arc robot with a MIG torch; spot welding a heavy spot robot with a spot gun.
{
  const mig = pick("MIG/MAG Welding");
  assert.ok(isArcRobot(mig.robot!.name) && !/spot/i.test(mig.tool!.name), `${mig.robot!.name} + ${mig.tool!.name}`);
  const spot = pick("Spot Welding");
  assert.ok(/spot/i.test(spot.tool!.name) && (spot.robot!.payload ?? 0) >= 200, `${spot.robot!.name} + ${spot.tool!.name}`);
}
// The job's own tool from the Directory, including the tools added for jobs that had none.
for (const [job, re] of [
  ["Laser Welding", /laser weld/i], ["TIG Welding", /\btig\b/i], ["Ultrasonic Plastic Welding", /ultrason/i], ["Riveting Assembly", /rivet/i],
  ["Laser Cleaning & Surface Prep", /laser clean/i], ["Bag & Sack Palletizing", /sack/i], ["CNC Machining", /dual/i], ["Labeling & Weighing", /label/i],
  ["Capping", /capping/i], ["Filling", /filling/i],
] as const) {
  const t = pick(job).tool!;
  assert.match(t.name, re, `${job}: ${t.name}`);
  assert.ok(!/nearest tool/.test(t.reasons.join(" ")), `${job}: the right tool, not the nearest`);
}
// End of line: palletizers with vacuum or sack grippers.
for (const job of ["Palletizing", "Bag & Sack Palletizing", "Depalletizing"]) {
  const s = pick(job);
  assert.equal(s.robot!.type, "Palletizing", `${job}: ${s.robot!.name}`);
  assert.ok(["vacuum", "fork"].includes(family(s.tool!.name, s.tool!.type)!), `${job}: ${s.tool!.name}`);
}
// Machines and packing: the gripper family each one needs.
for (const [job, fam] of [["Injection Moulding Tending", "vacuum"], ["Press Tending & Stamping", "vacuum"], ["Cartoning (Product into Cartons)", "vacuum"], ["Labeling & Weighing", "vacuum"], ["Screw Driving", "driver"], ["Filling", "nozzle"], ["CNC Machining", "dual"], ["Capping", "driver"]] as const) {
  const s = pick(job);
  assert.equal(family(s.tool!.name, s.tool!.type), fam, `${job}: ${s.tool!.name}`);
}
assert.match(pick("Painting & Coating").tool!.name, /spray|paint/i);
assert.match(pick("Polishing").tool!.name, /sander|polish/i);
assert.match(pick("Grinding & Surface Prep").tool!.name, /grind/i);
// Cobots: the mobile manipulator, and any cell the user made an open (cobot) cell.
for (const s of [pick("Mobile Manipulator Machine Tending"), pick("Loading & Unloading", true)]) {
  assert.ok(isCobotMatch(s.robot), `${s.robot!.name} is a cobot`);
  assert.match(s.tool!.name, COBOT_EOAT, `${s.tool!.name} is made for cobots`);
}

// Tools made for one robot: only on that robot.
{
  const need = { kind: "handling" as const, job: "Loading & Unloading", payload: 2, reach: null, cobot: false, robotType: null };
  assert.ok(!matchOemTools(need, dt, "", 40).some((t) => /preciseflex|yumi|kinova|niryo|ufactory|mecademic|e\.do/i.test(t.name)));
  assert.ok(matchOemTools({ ...need, arm: "Brooks PreciseFlex 400-750" }, dt, "", 40).some((t) => /preciseflex/i.test(t.name)));
}
// Tool changer and stand gripper follow the robot: industrial or cobot.
{
  const industrial = suggestSwap(raw, pick("MIG/MAG Welding").robot);
  assert.match(industrial.changer!.name, /ATI|SCHUNK/);
  assert.ok(industrial.tool2 && family(industrial.tool2.name, industrial.tool2.type) === "parallel");
  const cobot = suggestSwap(raw, pick("Loading & Unloading", true).robot);
  assert.match(cobot.changer!.name, /OnRobot|Zimmer/);
  assert.match(cobot.tool2!.name, COBOT_EOAT);
}
// Marketplace: a painting robot is not offered for handling.
{
  const need = { kind: "handling" as const, job: "Loading & Unloading", payload: 12, reach: 1400, cobot: false, robotType: null };
  const list = [
    { id: "paint", name: "ABB IRB 5510 painting robot", robot_type: "painting", payload_capacity: 13, reach: 2561, price: 900000 },
    { id: "pick", name: "Fanuc M-20iD/25 handling robot", robot_type: "industrial", payload_capacity: 25, reach: 1831, price: 1500000 },
  ];
  assert.deepEqual(matchMarketRobots(need, list).map((m) => m.id), ["pick"]);
}
console.log(`suggestions: ${BLOCKS.length} builder jobs matched to a fitting robot and tool`);
